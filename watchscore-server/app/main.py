# app/main.py
from __future__ import annotations

import os
import json
import mimetypes
import uuid
import boto3
import time
import asyncio, random
from pathlib import Path
from typing import List, Optional, Dict, Any
from prisma import Prisma
from fastapi import FastAPI, HTTPException, Depends, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prisma.engine.errors import AlreadyConnectedError, NotConnectedError
from dotenv import load_dotenv
from botocore.config import Config
from fastapi.responses import StreamingResponse
from fastapi import BackgroundTasks
from openai import AsyncOpenAI
from fastapi import Query

# -----------------------------------------------------------------------------
# Env & setup
# -----------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
# Use a VISION-CAPABLE model by default
AI_MODEL = "gpt-4.1"


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

oclient = AsyncOpenAI()            # reuse one async client
OAI_SEM = asyncio.Semaphore(10)
DB_WRITE_LOCK = asyncio.Lock()  
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

# -----------------------------------------------------------------------------
# Server Lifecycle
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    try:
        await db.connect()
        # Use query_raw for PRAGMAs (they return a row)
        await db.query_raw("PRAGMA journal_mode=WAL;")
        await db.query_raw("PRAGMA synchronous=NORMAL;")
        # optional but useful:
        await db.query_raw("PRAGMA busy_timeout=5000;")    # 5s lock wait
        # await db.query_raw("PRAGMA temp_store=MEMORY;")  # keep temps in RAM
        # await db.query_raw("PRAGMA cache_size=-20000;")  # ~20 MB page cache
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

@app.on_event("shutdown")
async def on_shutdown():
    try:
        await db.disconnect()
    except NotConnectedError:
        pass

# -----------------------------------------------------------------------------
# S3 Helpers
# -----------------------------------------------------------------------------
def _guess_ext(name: str | None, content_type: str | None) -> str:
    if name and "." in name:
        return "." + name.split(".")[-1].split("?")[0].lower()
    if content_type:
        ext = mimetypes.guess_extension(content_type)
        if ext:
            return ext
    return ".jpg"

def _serialize_watch(record: Any) -> Dict[str, Any]:
    if record is None:
        return {}

    try:
        raw = record.model_dump()
    except Exception:
        try:
            raw = record.dict()
        except Exception:
            raw = {}

    return {
        "id": raw.get("id"),
        "photos": [
            {
                "id": p.get("id"),
                "key": p.get("key"),
                "url": p.get("url"),
                "mime": p.get("mime"),
                "index": p.get("index"),
                "createdAt": p.get("createdAt"),
            }
            for p in (raw.get("photos") or [])
        ],
    }

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
# APP Prompt builder
# -----------------------------------------------------------------------------
def build_ai_prompt() -> str:
    return (
        "You are a watch expert. Analyze the provided photos and return a STRICT JSON with the exact schema below.\n"
        "Return ONLY JSON (no commentary). If unsure about any field, use the string \"—\" or numeric 0. Be realistic and consistent.\n"
        "\n"
        "SCORING RULES (apply to ALL \"score\" objects):\n"
        "- score.numeric MUST be an INTEGER in the range 0–100 (not a string).\n"
        "- Allowed letters (best→worst): A, B, C, D.\n"
        "- Map numeric→letter using bins: A: 90–100, B: 75–89, C: 60–74, D: 0–59.\n"
        "- score.letter MUST match the bin containing score.numeric.\n"
        "- If a numeric would fall outside 0–100, clamp it to 0 or 100 BEFORE setting the letter.\n"
        "- Do NOT use any +/- modifiers for letters.\n"
        "\n"
        "FIELD CONSTRAINTS:\n"
        "- brand_reputation.type: 1–2 words, lowercase (e.g., \"horology\", \"microbrand\").\n"
        "- brand_reputation.legacy: ONLY value (number) and unit (\"years\").\n"
        "- movement_quality.type: ONE word (e.g., \"automatic\", \"manual\", \"quartz\", \"spring-drive\").\n"
        "- movement_quality.reliability.label: one of {\"very low\",\"low\",\"medium\",\"high\",\"very high\"}.\n"
        "- Keep all other units as specified (e.g., sec/day, g, m, USD). Do NOT add extra keys. Fill every field.\n"
        "- Arrays must be present; if unknown, put a single placeholder like [\"—\"].\n"
        "\n"
        "{\n"
        "  \"quick_facts\": {\n"
        "    \"name\": \"string\",\n"
        "    \"subtitle\": \"string\",\n"
        "    \"movement_type\": \"automatic|manual|quartz|spring-drive|—\",\n"
        "    \"release_year\": 0,\n"
        "    \"list_price\": { \"amount\": 0, \"currency\": \"USD\" }\n"
        "  },\n"
        "  \"name\": \"string\",\n"
        "  \"subtitle\": \"string\",\n"
        "  \"overall\": {\n"
        "    \"conclusion\": \"string\",\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"brand_reputation\": {\n"
        "    \"type\": \"string\",\n"
        "    \"legacy\": { \"value\": 0, \"unit\": \"years\" },\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"movement_quality\": {\n"
        "    \"type\": \"string\",\n"
        "    \"accuracy\": { \"value\": 0, \"unit\": \"sec/day\"},\n"
        "    \"reliability\": { \"label\": \"string\"},\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"materials_build\": {\n"
        "    \"total_weight\": { \"value\": 0, \"unit\": \"g\"},\n"
        "    \"case_material\": {\"material\": \"string\"},\n"
        "    \"crystal\": {\"material\": \"string\"},\n"
        "    \"build_quality\": { \"label\": \"string\"},\n"
        "    \"water_resistance\": { \"value\": 0, \"unit\": \"m\"},\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"maintenance_risks\": {\n"
        "    \"service_interval\": { \"min\": 0, \"max\": 0, \"unit\": \"y\"},\n"
        "    \"service_cost\": { \"min\": 0, \"max\": 0, \"currency\": \"USD\"},\n"
        "    \"parts_availability\": { \"label\": \"string\"},\n"
        "    \"serviceability\": { \"raw\": \"string\"},\n"
        "    \"known_weak_points\": [\"string\"],\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"value_for_money\": {\n"
        "    \"list_price\": { \"amount\": 0, \"currency\": \"USD\"},\n"
        "    \"resale_average\": { \"amount\": 0, \"currency\": \"USD\"},\n"
        "    \"market_liquidity\": { \"label\": \"string\"},\n"
        "    \"holding_value\": { \"label\": \"string\", \"note\": \"string\" },\n"
        "    \"value_for_wearer\": { \"label\": \"string\"},\n"
        "    \"value_for_collector\": { \"label\": \"string\"},\n"
        "    \"spec_efficiency_note\": { \"label\": \"string\", \"note\": \"string\" },\n"
        "    \"score\": { \"letter\": \"A|B|C|D\", \"numeric\": 0 }\n"
        "  },\n"
        "  \"alternatives\": [\n"
        "    { \"model\": \"string\", \"movement\": \"string\", \"price\": { \"amount\": 0, \"currency\": \"USD\"} }\n"
        "  ],\n"
        "}\n"
    )

SECTIONS = [
    "quick_facts", "overall", "brand_reputation", "movement_quality",
    "materials_build", "maintenance_risks", "value_for_money", "alternatives", "meta",
]

def _extract_finished_section(buf: str, key: str, start: int = 0):
    # Find `"key"` then the first `{` or `[` after `:`
    key_pat = f'"{key}"'
    i = buf.find(key_pat, start)
    if i == -1:
        return None, start
    j = buf.find(":", i + len(key_pat))
    if j == -1:
        return None, start
    # skip spaces
    k = j + 1
    while k < len(buf) and buf[k] in " \n\r\t":
        k += 1
    if k >= len(buf) or buf[k] not in "{[":
        return None, start

    # match braces
    open_ch = buf[k]
    close_ch = "}" if open_ch == "{" else "]"
    depth = 0
    m = k
    in_str = False
    esc = False
    while m < len(buf):
        ch = buf[m]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    # completed object/array
                    block = buf[k:m+1]
                    try:
                        parsed = json.loads(block)
                    except Exception:
                        return None, start  # not yet valid JSON
                    return parsed, m + 1
        m += 1
    return None, start

async def _merge_analysis_json(watch_id: int, fragment: Dict[str, Any]) -> None:
    """Shallow-merge `fragment` into WatchAnalysis.aiJsonStr for watch_id."""
    async with DB_WRITE_LOCK:
        existing = await db.watchanalysis.find_unique(where={"watchId": watch_id})
        base: Dict[str, Any] = {}
        if existing and getattr(existing, "aiJsonStr", None):
            try:
                base = json.loads(existing.aiJsonStr)
            except Exception:
                base = {}

        # shallow merge: top-level keys overwrite
        for k, v in fragment.items():
            base[k] = v

        payload_str = json.dumps(base, ensure_ascii=False)

        if existing:
            await db.watchanalysis.update(
                where={"watchId": watch_id},
                data={"aiJsonStr": payload_str},
            )
        else:
            await db.watchanalysis.create(
                data={"watchId": watch_id, "aiJsonStr": payload_str},
            )
# -----------------------------------------------------------------------------
# APP Routes
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


async def _run_ai_analysis_strict(watch_id: int, keys: list[str]):
    try:
        if not keys:
            print("[bg-analyze] no keys"); return

        vision_urls = [_presign_get(k, expires=60*30) for k in keys if k]
        if not vision_urls:
            print("[bg-analyze] no presigned urls"); return

        content = [{"type": "text", "text": build_ai_prompt()}]
        for u in vision_urls:
            content.append({"type": "image_url", "image_url": {"url": u}})

        messages = [
            {"role": "system", "content": "Return ONLY the strict JSON that matches the schema. No extra keys, no commentary."},
            {"role": "user", "content": content},
        ]

        # stream tokens
        stream = await oclient.chat.completions.create(
            model=AI_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            stream=True,
            **({"temperature": 0.2} if AI_MODEL in {"gpt-4o","gpt-4o-mini","gpt-4.1"} else {}),
        )

        buf = ""
        emitted: set[str] = set()
        scan_ptr = 0

        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if not delta:
                continue
            buf += delta

            # try to extract any not-yet-emitted sections
            progress = True
            while progress:
                progress = False
                for sec in SECTIONS:
                    if sec in emitted:
                        continue
                    parsed, scan_ptr_new = _extract_finished_section(buf, sec, scan_ptr)
                    if parsed is not None:
                        # persist this section immediately
                        await _merge_analysis_json(watch_id, {sec: parsed})
                        emitted.add(sec)
                        scan_ptr = scan_ptr_new
                        print(f"[bg-analyze] emitted section '{sec}' for", watch_id)
                        progress = True

        # end of stream → try to write the full JSON (best effort)
        try:
            full = json.loads(buf)
            await _merge_analysis_json(watch_id, full)
            print("[bg-analyze] full JSON saved for", watch_id)
        except Exception as e:
            print("[bg-analyze] final parse error (saving partials already done):", e)

    except Exception as e:
        print("[bg-analyze] error:", e)

@app.post("/watches/{watch_id}/finalize")
async def finalize_watch(
    watch_id: int,
    payload: FinalizePayload,
    background: BackgroundTasks,        # <-- inject BackgroundTasks
):
    w = await db.watch.find_unique(where={"id": watch_id})
    if not w:
        raise HTTPException(404, "Watch not found")

    # 1) Save photo keys
    saved, keys = 0, []
    for idx, p in enumerate(payload.photos, start=1):
        k = p.get("key")
        if not k:
            continue
        await db.photo.create(data={"watchId": watch_id, "key": k, "index": idx})
        keys.append(k)
        saved += 1
    if saved == 0:
        raise HTTPException(400, "No photos to analyze")

    # 2) Kick off AI asynchronously; return immediately
    background.add_task(_run_ai_analysis_strict, watch_id, keys)

    # 3) Load & return record + short-lived signed photo URLs
    full = await db.watch.find_unique(where={"id": watch_id}, include={"photos": True})
    out = _serialize_watch(full)

    signed = []
    for p in out.get("photos", []):
        k = p.get("key")
        if k:
            try:
                url = _presign_get(k, expires=60 * 20)
                signed.append({**p, "url": url})
            except Exception as e:
                print("[finalize] presign failed:", k, e)
                signed.append(p)
        else:
            signed.append(p)
    out["photos"] = signed
    return out

def sse(event: str, data: Dict[str, Any]) -> str:
    """Format an SSE frame. `data` must be JSON-serializable."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"

def _order_sections(sections_param: Optional[str]) -> List[str]:
    all_sections = [
        "quick_facts", "overall", "brand_reputation", "movement_quality",
        "materials_build", "maintenance_risks", "value_for_money", "alternatives",
    ]
    if not sections_param:
        return all_sections
    wanted = [s.strip() for s in sections_param.split(",") if s.strip() in all_sections]
    if "quick_facts" in wanted:
        return ["quick_facts"] + [s for s in wanted if s != "quick_facts"]
    return wanted

@app.get("/watches/{watch_id}/analyze-stream")
async def analyze_stream(
    watch_id: int,
    sections: Optional[str] = None,
    wait: int = Query(0, ge=0, le=1),
    timeout: int = Query(30, ge=1, le=120),
):
    wanted = _order_sections(sections)
    sent: set[str] = set()
    start = time.perf_counter()

    async def event_generator():
        yield sse("start", {"watchId": watch_id, "sections": wanted})
        while True:
            wa = await db.watchanalysis.find_unique(where={"watchId": watch_id})
            cached = {}
            if wa and getattr(wa, "aiJsonStr", None):
                try:
                    cached = json.loads(wa.aiJsonStr)
                except Exception:
                    cached = {}

            # emit any newly available sections
            for sec in wanted:
                if sec in sent:
                    continue
                data_obj = cached.get(sec)
                if data_obj:
                    yield sse("section", {"section": sec, "data": {sec: data_obj}})
                    sent.add(sec)

            # exit conditions
            if wait == 0:
                break
            if len(sent) == len(wanted):
                break
            if (time.perf_counter() - start) >= timeout:
                break

            # small sleep before next poll
            yield sse("progress", {"pending": [s for s in wanted if s not in sent]})
            await asyncio.sleep(0.5)

        yield sse("done", {"ok": True})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"},
    )

# -----------------------------------------------------------------------------
# Web application
# -----------------------------------------------------------------------------

@app.get("/watches")
async def list_watches(take: int = 20, skip: int = 0, q: Optional[str] = None):
    take = max(1, min(take, 100))
    skip = max(0, skip)

    where: Optional[Dict[str, Any]] = None
    if q and q.strip():
        where = {"OR": [{"name": {"contains": q}}, {"brand": {"contains": q}}, {"model": {"contains": q}}]}

    items = await db.watch.find_many(
        where=where,
        include={"photos": True},
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
        include={"photos": True},
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
        include={"photos": True},
    )
    return _serialize_watch(full)

@app.delete("/admin/watches/{watch_id}", dependencies=[Depends(require_admin)])
async def admin_delete_watch(watch_id: int):
    try:
        await db.watch.delete(where={"id": watch_id})
    except Exception:
        raise HTTPException(404, "Watch not found")
    return {"ok": True}