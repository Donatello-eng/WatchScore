# app/main.py
from __future__ import annotations

import os
import json
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from prisma import Prisma

# --- Optional: AI + S3 support ---
from dotenv import load_dotenv
from openai import OpenAI

try:
    import boto3
    from botocore.exceptions import BotoCoreError, NoCredentialsError
except Exception:  # boto3 optional
    boto3 = None
    BotoCoreError = NoCredentialsError = Exception  # type: ignore

# -----------------------------------------------------------------------------
# Env & setup
# -----------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5")

# S3 (leave unset to use local /uploads dev fallback)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
S3_ENABLED = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET and boto3)

S3_BASE_URL = (
    f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com" if S3_ENABLED else None
)
s3 = boto3.client("s3", region_name=AWS_REGION) if S3_ENABLED else None  # type: ignore

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

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

# Local static (dev fallback) – public at http://localhost:8000/uploads/...
UPLOAD_ROOT = Path("uploads")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

# -----------------------------------------------------------------------------
# Security helper (simple admin key header)
# -----------------------------------------------------------------------------
def require_admin(x_api_key: str = Header(default="")):
    # For dev: a hardcoded key. In prod, read from env & use proper auth.
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

# -----------------------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.connect()
    os.makedirs(UPLOAD_ROOT, exist_ok=True)
    print(
        f"[startup] db connected | OpenAI={bool(OPENAI_API_KEY)} | S3={S3_ENABLED} "
        f"| AI_MODEL={AI_MODEL}"
    )

@app.on_event("shutdown")
async def on_shutdown():
    await db.disconnect()

# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"ok": True}

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
async def _save_local(files: List[UploadFile], watch_id: int) -> List[str]:
    """
    Dev fallback: save images to /uploads/watches/<watch_id>/photo_N.ext and
    return absolute HTTP URLs for direct <img src>.
    """
    target = UPLOAD_ROOT / "watches" / str(watch_id)
    os.makedirs(target, exist_ok=True)

    urls: List[str] = []
    for idx, uf in enumerate(files, start=1):
        ext = Path(uf.filename or "").suffix or ".jpg"
        dest = target / f"photo_{idx}{ext}"
        # stream to disk
        with dest.open("wb") as out:
            while True:
                chunk = await uf.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        urls.append(f"http://localhost:8000/uploads/watches/{watch_id}/{dest.name}")
    return urls

async def _save_s3(files: List[UploadFile], watch_id: int) -> List[str]:
    """
    Upload to S3 and return public HTTPS URLs.
    """
    if not (S3_ENABLED and s3 and S3_BASE_URL):
        raise HTTPException(500, "S3 not configured")

    urls: List[str] = []
    for idx, uf in enumerate(files, start=1):
        ext = Path(uf.filename or "").suffix or ".jpg"
        key = f"watches/{watch_id}/photo_{idx}{ext}"
        try:
            s3.upload_fileobj(
                uf.file, AWS_S3_BUCKET, key,  # type: ignore[arg-type]
                ExtraArgs={
                    "ACL": "public-read",
                    "ContentType": uf.content_type or "image/jpeg",
                },
            )
        except (BotoCoreError, NoCredentialsError) as e:
            raise HTTPException(500, f"S3 upload failed: {e}")
        urls.append(f"{S3_BASE_URL}/{key}")
    return urls

def _extract_watch_fields(ai: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map AI JSON to Watch columns. Adjust this mapping to your JSON.
    """
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
    # prune Nones so we don't overwrite with nulls
    return {k: v for k, v in out.items() if v is not None}

def _serialize_watch(record: Any) -> Dict[str, Any]:
    """
    Convert a Prisma result (dict or model) to a plain dict and include parsed `ai`.
    """
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

# -----------------------------------------------------------------------------
# Routes (watches-first, no sessions)
# -----------------------------------------------------------------------------
@app.post("/watches")
async def create_watch(files: List[UploadFile] = File(...)):
    """
    Create a Watch from 1..3 uploaded images:
      1) create empty Watch (to get id)
      2) save images (S3 or local) → URLs
      3) insert Photo rows (url)
      4) call AI → JSON
      5) save JSON to WatchAnalysis + update Watch fields
      6) return the full watch (with photos & analysis)
    """
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 3:
        raise HTTPException(400, "Max 3 files")

    # 1) create a bare watch so we have the id
    watch = await db.watch.create(data={})

    # 2) save images
    urls = await (_save_s3(files, watch.id) if S3_ENABLED else _save_local(files, watch.id))

    # 3) photo rows
    for idx, url in enumerate(urls, start=1):
        await db.photo.create(
            data={"watchId": watch.id, "url": url, "index": idx}
        )

    # 4) AI call (skip if no OPENAI_API_KEY)
    ai_data: Dict[str, Any] = {}
    if client:
        system_msg = {"role": "system", "content": "Return ONLY a valid JSON object summarizing the watch."}
        user_msg = {
            "role": "user",
            "content": "Analyze these watch photos and return JSON per the agreed schema:\n" + "\n".join(urls),
        }

        kwargs = {
            "model": AI_MODEL,
            "messages": [system_msg, user_msg],
            "response_format": {"type": "json_object"},
        }
        # only pass temperature for models that accept it
        if AI_MODEL in {"gpt-4o-mini", "gpt-4o", "gpt-4.1"}:
            kwargs["temperature"] = 0.2  # type: ignore

        try:
            resp = client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
            ai_text = resp.choices[0].message.content or "{}"
            ai_data = json.loads(ai_text)
        except Exception as e:
            # log-only in dev; don't fail the whole request
            print("[AI] error:", e)
            ai_data = {}

    # 5) save AI JSON & update watch summary fields
    if ai_data:
        await db.watchanalysis.create(data={
            "watchId": watch.id,
            "aiJsonStr": json.dumps(ai_data, ensure_ascii=False),
        })
        fields = _extract_watch_fields(ai_data)
        if fields:
            watch = await db.watch.update(where={"id": watch.id}, data=fields)

    # 6) return full watch
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
        where = {
            "OR": [
                {"name":  {"contains": q}},
                {"brand": {"contains": q}},
                {"model": {"contains": q}},
            ]
        }

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
    w = await db.watch.find_unique(
        where={"id": watch_id},
        include={"photos": True, "analysis": True},
    )
    if not w:
        raise HTTPException(404, "Watch not found")
    return _serialize_watch(w)

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
    w = await db.watch.find_unique(
        where={"id": watch_id},
        include={"photos": True},
    )
    if not w:
        raise HTTPException(404, "Watch not found")
    urls = [p.url for p in w.photos if p.url]
    if not urls:
        raise HTTPException(400, "No photos to analyze")

    if not client:
        raise HTTPException(500, "OPENAI_API_KEY not set")

    system_msg = {"role": "system", "content": "Return ONLY a valid JSON object summarizing the watch."}
    user_msg = {"role": "user", "content": "Analyze these watch photos:\n" + "\n".join(urls)}

    kwargs = {
        "model": AI_MODEL,
        "messages": [system_msg, user_msg],
        "response_format": {"type": "json_object"},
    }
    if AI_MODEL in {"gpt-4o-mini", "gpt-4o", "gpt-4.1"}:
        kwargs["temperature"] = 0.2  # type: ignore

    resp = client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
    ai_text = resp.choices[0].message.content or "{}"
    ai_data = json.loads(ai_text)

    # upsert analysis + update watch summary fields
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

    fields = _extract_watch_fields(ai_data)
    if fields:
        await db.watch.update(where={"id": watch_id}, data=fields)

    return {"ok": True, "watchId": watch_id, "ai": ai_data}
