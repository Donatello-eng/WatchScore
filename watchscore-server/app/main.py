# app/main.py
from __future__ import annotations

import os
import json
import mimetypes
import uuid
import urllib.request
from pathlib import Path
from typing import List, Optional, Dict, Any, cast

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Body
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from prisma import Prisma
from prisma.engine.errors import AlreadyConnectedError, NotConnectedError

# --- Optional: AI + S3 support ---
from dotenv import load_dotenv
from openai import OpenAI
import asyncio

import time

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import BotoCoreError, NoCredentialsError
except Exception:  # boto3 optional
    boto3 = None
    Config = None  # type: ignore
    BotoCoreError = NoCredentialsError = Exception  # type: ignore

# -----------------------------------------------------------------------------
# Env & setup
# -----------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# Use a VISION-CAPABLE model by default
AI_MODEL = "gpt-5"

client: Optional[OpenAI] = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)

# S3 (leave unset to use local /uploads dev fallback)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

# Server-side encryption settings
S3_REQUIRE_SSE = os.getenv("S3_REQUIRE_SSE", "AES256")  # "AES256" or "aws:kms"
S3_KMS_KEY_ID = os.getenv("S3_KMS_KEY_ID")  # only if aws:kms

S3_ENABLED = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET and boto3)

s3 = (
    boto3.client(  # type: ignore[attr-defined]
        "s3",
        region_name=AWS_REGION,
        config=Config(  # type: ignore[name-defined]
            signature_version="s3v4",
            s3={"addressing_style": "virtual"},
        ),
    )
    if S3_ENABLED
    else None
)

# -----------------------------------------------------------------------------
# FastAPI app
# -----------------------------------------------------------------------------
app = FastAPI(title="Watch API")
db = Prisma()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Security helper (simple admin key header)
# -----------------------------------------------------------------------------
def require_admin(x_api_key: str = Header(default="")):
    if x_api_key != os.getenv("ADMIN_API_KEY", "dev-secret"):
        raise HTTPException(401, "Unauthorized")

# -----------------------------------------------------------------------------
# Models (pydantic)
# -----------------------------------------------------------------------------
class WatchUpdate(BaseModel):
    name: Optional[str] = None
    subtitle: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    overallLetter: Optional[str] = None
    overallNumeric: Optional[int] = None

class FinalizePayload(BaseModel):
    photos: List[Dict[str, str]]  # [{ "key": "watches/.../photo_x.jpg" }]
    analyze: Optional[bool] = True

# -----------------------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    try:
        await db.connect()
    except AlreadyConnectedError:
        pass

    if S3_ENABLED and boto3:
        try:
            sts = boto3.client("sts", region_name=AWS_REGION)  # type: ignore
            ident = sts.get_caller_identity()
            print("[startup] S3_ENABLED=", S3_ENABLED, "bucket=", AWS_S3_BUCKET, "region=", AWS_REGION)
            print("[startup] STS caller identity:", ident)
        except Exception as e:
            print("[startup] STS check failed:", e)

    print(f"[startup] db connected | OpenAI={bool(client)} | S3={S3_ENABLED} | AI_MODEL={AI_MODEL}")

@app.on_event("shutdown")
async def on_shutdown():
    try:
        await db.disconnect()
    except NotConnectedError:
        pass

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def _guess_ext(name: str | None, content_type: str | None) -> str:
    if name and "." in name:
        return "." + name.split(".")[-1].split("?")[0].lower()
    if content_type:
        ext = mimetypes.guess_extension(content_type)
        if ext:
            return ext
    return ".jpg"

def _head_ok(url: str) -> bool:
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except Exception:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return 200 <= resp.status < 300
        except Exception as e:
            print("[vision] URL not reachable:", url, "| error:", e)
            return False

def _sse_extra_args() -> Dict[str, Any]:
    if S3_REQUIRE_SSE == "aws:kms":
        extra: Dict[str, Any] = {"ServerSideEncryption": "aws:kms"}
        if S3_KMS_KEY_ID:
            extra["SSEKMSKeyId"] = S3_KMS_KEY_ID
        return extra
    return {"ServerSideEncryption": "AES256"}


async def _save_s3(files: List[UploadFile], watch_id: int) -> List[str]:
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise HTTPException(500, "S3 not configured")
    sse_args = _sse_extra_args()
    keys: List[str] = []
    for idx, uf in enumerate(files, start=1):
        ext = Path(uf.filename or "").suffix or ".jpg"
        key = f"watches/{watch_id}/photo_{idx}{ext}"
        try:
            s3.upload_fileobj(  # type: ignore[union-attr]
                uf.file,
                AWS_S3_BUCKET,  # type: ignore[arg-type]
                key,
                ExtraArgs={"ContentType": uf.content_type or "image/jpeg", **sse_args},
            )
        except (BotoCoreError, NoCredentialsError) as e:  # type: ignore[misc]
            raise HTTPException(500, f"S3 upload failed: {e}")
        keys.append(key)
    return keys

def _extract_watch_fields(ai: Dict[str, Any]) -> Dict[str, Any]:
    def g(*path, default=None):
        cur = ai
        for k in path:
            if not isinstance(cur, dict) or k not in cur:
                return default
            cur = cur[k]
        return cur
    out = {
        "name": g("name"),
        "subtitle": g("subtitle"),
        "brand": g("brand") or g("brand_reputation", "type") or None,
        "model": g("model"),
        "year": g("meta", "release_year"),
        "overallLetter": g("overall", "score", "letter"),
        "overallNumeric": g("overall", "score", "numeric"),
    }
    return {k: v for k, v in out.items() if v is not None}

def _serialize_watch(record: Any) -> Dict[str, Any]:
    if record is None:
        return {}
    if isinstance(record, dict):
        out = dict(record)
    else:
        try:
            out = record.model_dump()
        except Exception:
            try:
                out = record.dict()
            except Exception:
                out = {}
    ai = None
    analysis = out.get("analysis")
    s = analysis.get("aiJsonStr") if isinstance(analysis, dict) else None
    if isinstance(s, str):
        try:
            ai = json.loads(s)
        except Exception:
            ai = None
    out["ai"] = ai
    return out

def _presign_get(key: str, expires: int = 300) -> str:
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise RuntimeError("S3 not configured")
    return s3.generate_presigned_url(  # type: ignore[union-attr]
        ClientMethod="get_object",
        Params={"Bucket": AWS_S3_BUCKET, "Key": key},
        ExpiresIn=expires,
    )

def _presign_put(key: str, content_type: str, expires: int = 900) -> str:
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise RuntimeError("S3 not configured")
    params: Dict[str, Any] = {"Bucket": AWS_S3_BUCKET, "Key": key, "ContentType": content_type}
    if S3_REQUIRE_SSE == "aws:kms":
        params["ServerSideEncryption"] = "aws:kms"
        if S3_KMS_KEY_ID:
            params["SSEKMSKeyId"] = S3_KMS_KEY_ID
    else:
        params["ServerSideEncryption"] = "AES256"
    return s3.generate_presigned_url(  # type: ignore[union-attr]
        ClientMethod="put_object",
        Params=params,
        ExpiresIn=expires,
    )

# -----------------------------------------------------------------------------
# Prompt builder (strict schema)
# -----------------------------------------------------------------------------
def build_ai_prompt() -> str:
    return (
        "You are a watch expert. Analyze the provided photos and return a STRICT JSON with the exact schema below.\n"
        "Return ONLY JSON (no commentary). If unsure about any field, use the string \"—\" or numeric 0. Be realistic and consistent.\n"
        "\n"
        "SCORING RULES (apply to ALL \"score\" objects):\n"
        "- Allowed letters (best→worst): A, B, C, D\n"
        "- Map numeric (0–100) to letters:\n"
        "  A: 90–100, B: 75–89, C: 60–74, D: 0–59\n"
        "- score.letter MUST match the bin containing score.numeric. Use the same scale label \"letter_0_100\" everywhere.\n"
        "- Do NOT use any +/- modifiers.\n"
        "\n"
        "FIELD CONSTRAINTS:\n"
        "- brand_reputation.type: 1–2 words, lowercase (e.g., \"horology\", \"microbrand\").\n"
        "- brand_reputation.legacy: ONLY value (number) and unit (\"years\").\n"
        "- movement_quality.type: ONE word (e.g., \"automatic\", \"manual\", \"quartz\", \"spring-drive\").\n"
        "- movement_quality.reliability.label: one of {\"very low\",\"low\",\"medium\",\"high\",\"very high\"};\n"
        "  reliability.level must map to label: very low=1, low=2, medium=3, high=4, very high=5 (scale=\"ordinal_1_5\").\n"
        "- Keep all other units as specified (e.g., s_per_day, g, m, USD). Do NOT add extra keys. Fill every field.\n"
        "\n"
         "{\n"
        "  \"name\": \"string\",\n"
        "  \"subtitle\": \"string\",\n"
        "  \"overall\": {\n"
        "    \"conclusion\": \"string\",\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"brand_reputation\": {\n"
        "    \"type\": \"string\",\n"
        "    \"legacy\": { \"value\": 0, \"unit\": \"years\" },\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"movement_quality\": {\n"
        "    \"type\": \"string\",\n"
        "    \"accuracy\": { \"value\": 2, \"unit\": \"sec/day\"},\n"
        "    \"reliability\": { \"label\": \"string\"},\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"materials_build\": {\n"
        "    \"total_weight\": { \"value\": 0, \"unit\": \"g\"},\n"
        "    \"case_material\": {\"material\": \"string\"},\n"
        "    \"crystal\": {\"material\": \"string\"},\n"
        "    \"build_quality\": { \"label\": \"string\"},\n"
        "    \"water_resistance\": { \"value\": 0, \"unit\": \"m\"},\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"maintenance_risks\": {\n"
        "    \"service_interval\": { \"min\": 0, \"max\": 0, \"unit\": \"y\"},\n"
        "    \"service_cost\": { \"min\": 0, \"max\": 0, \"currency\": \"USD\"},\n"
        "    \"parts_availability\": { \"label\": \"string\"},\n"
        "    \"serviceability\": { \"raw\": \"string\"},\n"
        "    \"known_weak_points\": [\"string\"],\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"value_for_money\": {\n"
        "    \"list_price\": { \"amount\": 0, \"currency\": \"USD\"},\n"
        "    \"resale_average\": { \"amount\": 0, \"currency\": \"USD\"},\n"
        "    \"market_liquidity\": { \"label\": \"string\"},\n"
        "    \"holding_value\": { \"label\": \"string\",\"note\": \"string\" },\n"
        "    \"value_for_wearer\": { \"label\": \"string\"},\n"
        "    \"value_for_collector\": { \"label\": \"string\"},\n"
        "    \"spec_efficiency_note\": { \"label\": \"string\", \"note\": \"string\" },\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": \"letter_0_100\"}\n"
        "  },\n"
        "  \"alternatives\": [\n"
        "    { \"model\": \"string\", \"movement\": \"string\", \"price\": { \"amount\": 0, \"currency\": \"USD\"} }\n"
        "  ],\n"
        "  \"meta\": { \"schema_version\": \"1.2.0\", \"units_system\": \"SI\", \"release_year\": 0 }\n"
        "}\n"
    )

def build_single_image_prompt() -> str:
    """
    Lightweight per-image extraction. Keep it small so each parallel call is fast.
    The aggregator will merge these into the full schema defined in build_ai_prompt().
    """
    return (
        "You are a watch expert. Analyze ONE photo of a watch and return STRICT JSON with this schema:\n"
        "{\n"
        '  "observations": {\n'
        '    "name": "string",\n'
        '    "subtitle": "string",\n'
        '    "brand": "string",\n'
        '    "model": "string",\n'
        '    "meta": { "release_year": 0 }\n'
        "  }\n"
        "}\n"
        "Rules:\n"
        '- If unsure, use "—" or 0. No commentary. Return ONLY JSON.\n'
    )

async def _gpt_json(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,  # kept for call-compatibility; ignored
) -> Dict[str, Any]:
    """
    Run a chat completion that MUST return JSON.
    Compatible with gpt-5: no temperature, no token-limit args.
    Executes in a thread so it won't block the event loop.
    """
    model_choice = model or AI_MODEL
    kwargs: Dict[str, Any] = {
        "model": model_choice,
        "messages": messages,
        "response_format": {"type": "json_object"},
        # NOTE: do NOT set temperature/max_tokens/max_completion_tokens for gpt-5
    }
    resp = await asyncio.to_thread(client.chat.completions.create, **kwargs)  # type: ignore[arg-type]
    text = (resp.choices[0].message.content or "{}").strip()
    try:
        return json.loads(text)
    except Exception:
        return {}


# -----------------------------------------------------------------------------
# Routes (watches-first, no sessions)
# -----------------------------------------------------------------------------
@app.post("/watches/init")
async def init_watch_presign(
    count: int = Body(embed=True),
    contentTypes: Optional[List[str]] = Body(default=None, embed=True),
):
    if count < 1 or count > 3:
        raise HTTPException(400, "count must be 1..3")
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise HTTPException(500, "S3 not configured")

    watch = await db.watch.create(data={})
    items = []

    for i in range(count):
        ct = (contentTypes[i] if contentTypes and i < len(contentTypes) else "image/jpeg")
        ext = _guess_ext(None, ct)
        key = f"watches/{watch.id}/photo_{i+1}_{uuid.uuid4().hex}{ext}"

        upload_url = _presign_put(key, ct, expires=15 * 60)
        headers = {"Content-Type": ct}
        if S3_REQUIRE_SSE == "aws:kms":
            headers["x-amz-server-side-encryption"] = "aws:kms"
            if S3_KMS_KEY_ID:
                headers["x-amz-server-side-encryption-aws-kms-key-id"] = S3_KMS_KEY_ID
        else:
            headers["x-amz-server-side-encryption"] = "AES256"

        items.append({"key": key, "uploadUrl": upload_url, "headers": headers})

        print("[presign]", {"bucket": AWS_S3_BUCKET, "region": AWS_REGION, "key": key, "ct": ct, "sse": headers.get("x-amz-server-side-encryption")})

    return {"watchId": watch.id, "uploads": items}

@app.post("/watches/{watch_id}/finalize")
async def finalize_watch(watch_id: int, payload: FinalizePayload):
    w = await db.watch.find_unique(where={"id": watch_id})
    if not w:
        raise HTTPException(404, "Watch not found")

    # Save keys
    for idx, p in enumerate(payload.photos, start=1):
        key = p.get("key")
        if not key:
            continue
        await db.photo.create(data={"watchId": watch_id, "key": key, "index": idx})

    ai_data: Dict[str, Any] = {}
    if payload.analyze and client:
        ai_t0 = time.perf_counter()
        vision_urls: List[str] = []
        for p in payload.photos:
            k = p.get("key")
            if k:
                vision_urls.append(_presign_get(k, expires=60 * 30))
        
        ai_t1 = time.perf_counter()

        if vision_urls:
            content: List[Dict[str, Any]] = [{"type": "text", "text": build_ai_prompt()}]
            for u in vision_urls:
                content.append({"type": "image_url", "image_url": {"url": u}})

            messages = [
                {"role": "system", "content": "Return ONLY the strict JSON that matches the schema. No extra keys, no commentary."},
                {"role": "user", "content": content},
            ]

            kwargs: Dict[str, Any] = {
                "model": AI_MODEL,
                "messages": messages,
                "response_format": {"type": "json_object"},
            }
            if AI_MODEL in {"gpt-4o-mini", "gpt-4o", "gpt-4.1"}:
                kwargs["temperature"] = 0.2  # type: ignore

            ai_t2 = ai_t1
            try:
                resp = client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
                ai_text = resp.choices[0].message.content or "{}"
                ai_data = json.loads(ai_text)

                ai_t3 = time.perf_counter()

                await db.watchanalysis.create(
                    data={"watchId": watch_id, "aiJsonStr": json.dumps(ai_data, ensure_ascii=False)}
                )
                fields = _extract_watch_fields(cast(Dict[str, Any], ai_data))
                if fields:
                    await db.watch.update(where={"id": watch_id}, data=fields)

                ai_t4 = time.perf_counter()
                print({
                    "where": "finalize_watch",
                    "watch_id": watch_id,
                    "presign_ms": int((ai_t1 - ai_t0) * 1000),
                    "precheck_ms": int((ai_t2 - ai_t1) * 1000),
                    "openai_ms": int((ai_t3 - ai_t2) * 1000),
                    "db_ms": int((ai_t4 - ai_t3) * 1000),
                })
            except Exception as e:
                print("[AI finalize_watch] error:", e)

    full = await db.watch.find_unique(
        where={"id": watch_id},
        include={"photos": True, "analysis": True},
    )
    return _serialize_watch(full)
@app.post("/watches")
async def create_watch(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 3:
        raise HTTPException(400, "Max 3 files")
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise HTTPException(500, "S3 not configured")

    watch = await db.watch.create(data={})

    # Upload directly to S3 and store KEYS only
    keys = await _save_s3(files, watch.id)
    for idx, key in enumerate(keys, start=1):
        await db.photo.create(data={"watchId": watch.id, "key": key, "index": idx})

    ai_data: Dict[str, Any] = {}
    if client:
        # Presign each key for vision analysis
        vision_urls = [_presign_get(k, expires=60 * 30) for k in keys]
        print("[vision][create_watch] presigned URLs:", vision_urls)
        bad = [u for u in vision_urls if not _head_ok(u)]
        if bad:
            print("[vision][create_watch] BAD presigned URLs:", bad)
            raise HTTPException(500, "Presigned image URL(s) are not reachable. Check AWS_REGION, bucket policy, and expiry.")

        content: List[Dict[str, Any]] = [{"type": "text", "text": build_ai_prompt()}]
        for u in vision_urls:
            content.append({"type": "image_url", "image_url": {"url": u}})

        messages = [
            {"role": "system", "content": "Return ONLY the strict JSON that matches the schema. No extra keys, no commentary."},
            {"role": "user", "content": content},
        ]

        kwargs: Dict[str, Any] = {
            "model": AI_MODEL,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }
        if AI_MODEL in {"gpt-4o-mini", "gpt-4o", "gpt-4.1"}:
            kwargs["temperature"] = 0.2  # type: ignore

        try:
            resp = client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
            ai_text = resp.choices[0].message.content or "{}"
            ai_data = json.loads(ai_text)
        except Exception as e:
            print("[AI create_watch] error:", e)
            ai_data = {}

    if ai_data:
        await db.watchanalysis.create(data={
            "watchId": watch.id,
            "aiJsonStr": json.dumps(ai_data, ensure_ascii=False),
        })
        fields = _extract_watch_fields(ai_data)
        if fields:
            watch = await db.watch.update(where={"id": watch.id}, data=fields)

    full = await db.watch.find_unique(
        where={"id": watch.id},
        include={"photos": True, "analysis": True},
    )
    return _serialize_watch(full)


@app.get("/watches")
async def list_watches(take: int = 20, skip: int = 0, q: Optional[str] = None):
    take = max(1, min(take, 100))
    skip = max(0, skip)

    where: Optional[Dict[str, Any]] = None
    if q and q.strip():
        where = {"OR": [{"name": {"contains": q}}, {"brand": {"contains": q}}, {"model": {"contains": q}}]}

    items = await db.watch.find_many(
        where=where,
        include={"photos": True, "analysis": True},
        skip=skip,
        take=take,
    )
    total = await db.watch.count(where=where)
    return {"total": total, "count": len(items), "items": [_serialize_watch(w) for w in items]}

@app.get("/watches/{watch_id}")
async def get_watch(watch_id: int):
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise HTTPException(500, "S3 not configured")

    w = await db.watch.find_unique(
        where={"id": watch_id},
        include={"photos": True, "analysis": True},
    )
    if not w:
        raise HTTPException(404, "Watch not found")

    out = _serialize_watch(w)

    # Always presign S3 keys for client access
    signed_photos = []
    for p in out.get("photos", []):
        key = p.get("key") or None
        if key:
            signed = _presign_get(key, expires=60 * 5)
            signed_photos.append({**p, "url": signed})
        else:
            signed_photos.append({**p})
    out["photos"] = signed_photos

    return out

@app.patch("/admin/watches/{watch_id}", dependencies=[Depends(require_admin)])
async def admin_update_watch(watch_id: int, payload: WatchUpdate):
    data = payload.model_dump(exclude_none=True)
    w = await db.watch.update(where={"id": watch_id}, data=data)
    full = await db.watch.find_unique(
        where={"id": w.id},
        include={"photos": True, "analysis": True},
    )
    return _serialize_watch(full)

@app.delete("/admin/watches/{watch_id}", dependencies=[Depends(require_admin)])
async def admin_delete_watch(watch_id: int):
    try:
        await db.watch.delete(where={"id": watch_id})
    except Exception:
        raise HTTPException(404, "Watch not found")
    return {"ok": True}
@app.post("/watches/{watch_id}/reanalyze", dependencies=[Depends(require_admin)])
async def reanalyze_watch(watch_id: int):
    """
    Requires the helper functions:
      - build_single_image_prompt()
      - _gpt_json(messages, model=None, max_tokens=400)
    """
    if not (S3_ENABLED and s3 and AWS_S3_BUCKET):
        raise HTTPException(500, "S3 not configured")
    if not client:
        raise HTTPException(500, "OPENAI_API_KEY not set")

    # Load photos for this watch
    w = await db.watch.find_unique(where={"id": watch_id}, include={"photos": True})
    if not w:
        raise HTTPException(404, "Watch not found")

    # Build presigned URLs for all photos
    vision_urls: List[str] = []
    for p in w.photos:
        if getattr(p, "key", None):
            vision_urls.append(_presign_get(p.key, expires=60 * 30))  # 30 min

    if not vision_urls:
        raise HTTPException(400, "No photos to analyze")

    # --- 1) PARALLEL per-image analysis (small JSON per photo) ---
    single_prompt = build_single_image_prompt()
    sys_msg = {"role": "system", "content": "Return ONLY strict JSON. No extra keys. No commentary."}

    async def analyze_one(url: str) -> Dict[str, Any]:
        user_content: List[Dict[str, Any]] = [
            {"type": "text", "text": single_prompt},
            {"type": "image_url", "image_url": {"url": url, "detail": "low"}},
        ]
        msgs = [sys_msg, {"role": "user", "content": user_content}]
        return await _gpt_json(msgs, model=os.getenv("AI_MODEL", AI_MODEL))

    partials: List[Dict[str, Any]] = await asyncio.gather(*(analyze_one(u) for u in vision_urls))

    # --- 2) AGGREGATE all partials into ONE strict-schema JSON ---
    merge_instructions = (
        "You are a watch expert. The following JSON objects are observations from multiple photos of the SAME watch. "
        "Merge them into ONE final result that matches EXACTLY the schema below. Resolve conflicts by majority/clarity; "
        "if still unsure use \"—\" or 0. Keep all constraints and scoring rules. Return ONLY JSON."
    )
    schema = build_ai_prompt()
    merge_text = (
        merge_instructions
        + "\n\nPARTIALS:\n"
        + json.dumps(partials, ensure_ascii=False)
        + "\n\nSCHEMA:\n"
        + schema
    )

    merge_msgs = [
        {"role": "system", "content": "Return ONLY the strict JSON that matches the schema. No commentary."},
        {"role": "user", "content": [{"type": "text", "text": merge_text}]},
    ]
    ai_data = await _gpt_json(merge_msgs, model=os.getenv("AI_MODEL", AI_MODEL), max_tokens=900)

    # Persist full JSON (remove this block if you don't store aiJsonStr)
    exists = await db.watchanalysis.find_unique(where={"watchId": watch_id})
    if exists:
        await db.watchanalysis.update(
            where={"watchId": watch_id},
            data={"aiJsonStr": json.dumps(ai_data, ensure_ascii=False)},
        )
    else:
        await db.watchanalysis.create(
            data={"watchId": watch_id, "aiJsonStr": json.dumps(ai_data, ensure_ascii=False)},
        )

    # Update core fields on Watch
    fields = _extract_watch_fields(ai_data)
    if fields:
        await db.watch.update(where={"id": watch_id}, data=fields)

    return {"ok": True, "watchId": watch_id, "ai": ai_data}
