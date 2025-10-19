# app/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from pathlib import Path
import os
import aiofiles

from prisma import Prisma

from pydantic import BaseModel
from typing import Optional

import traceback
app = FastAPI(title="RN Upload Backend")
db = Prisma()

import json
import asyncio
from typing import Dict, Any, Optional

from fastapi import Header, Depends

from dotenv import load_dotenv
import os
from openai import OpenAI

import base64
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parents[1]  # points to watchscore-server/
load_dotenv(ROOT / ".env")  # <— explicitly load the correct file

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# --- CORS (loose for dev; tighten in production) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # e.g. ["http://localhost:19006", "exp://127.0.0.1:19000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_ROOT = Path("uploads")  # relative to project root

class WatchUpdate(BaseModel):
    name: Optional[str] = None
    subtitle: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    overallLetter: Optional[str] = None
    overallNumeric: Optional[int] = None

def read_image_as_data_url(path: str) -> str:
    """Read a local image and return a data URL (base64) for OpenAI Vision."""
    p = Path(path)
    suffix = (p.suffix or ".jpg").lower()
    # best-guess mime
    mime = "image/jpeg"
    if suffix in [".png"]:
        mime = "image/png"
    elif suffix in [".webp"]:
        mime = "image/webp"
    elif suffix in [".heic", ".heif"]:
        mime = "image/heic"

    data = Path(path).read_bytes()
    b64 = base64.b64encode(data).decode("utf-8")
    return f"data:{mime};base64,{b64}"

def require_admin(x_api_key: str = Header(default="")):
  if x_api_key != "dev-secret":  # TODO: use env
    raise HTTPException(401, "Unauthorized")

# --- Lifecycle ---
@app.on_event("startup")
async def on_startup():
    await db.connect()
    os.makedirs(UPLOAD_ROOT, exist_ok=True)

@app.on_event("shutdown")
async def on_shutdown():
    await db.disconnect()

# --- Health ---
@app.get("/health")
async def health():
    return {"ok": True}

# --- Serve uploaded files so you can open them in the browser ---
# Access like: http://localhost:8000/uploads/sessions/<sessionId>/photo_1.jpg
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

# --- Upload 1..3 photos for a session ---
@app.post("/sessions/{session_id}/upload")
async def upload_session_photos(
    session_id: str,
    files: List[UploadFile] = File(...),       # field name must be "files"
    sessionId: str | None = Form(None),        # optional echo from client
):
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 3:
        raise HTTPException(400, "Too many files (max 3)")

    # Ensure Session exists (create if missing)
    sess = await db.session.find_unique(where={"id": session_id})
    if not sess:
        await db.session.create(data={"id": session_id})

    target_dir = UPLOAD_ROOT / "sessions" / session_id
    os.makedirs(target_dir, exist_ok=True)

    saved = []
    for idx, uf in enumerate(files, start=1):
        # keep client extension if present, default to .jpg
        ext = Path(uf.filename).suffix or ".jpg"
        fname = f"photo_{idx}{ext}"
        dest = target_dir / fname

        # stream to disk
        async with aiofiles.open(dest, "wb") as out:
            while True:
                chunk = await uf.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                await out.write(chunk)

        # record in DB
        await db.photo.create(
            data={
                "sessionId": session_id,
                "path": dest.as_posix(),                 # filesystem path (or later serve a URL)
                "mime": uf.content_type or None,
                "index": idx,                            # 1..3
            }
        )
        saved.append({"index": idx, "path": dest.as_posix()})

    return {"ok": True, "sessionId": session_id, "saved": saved}

# --- Read helpers to verify things are saved ---
@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    sess = await db.session.find_unique(
        where={"id": session_id},
        include={"photos": True},
    )
    if not sess:
        raise HTTPException(404, "Session not found")
    return sess

@app.get("/sessions")
async def list_sessions():
    return await db.session.find_many(include={"photos": True})
    
@app.get("/", include_in_schema=False)
def index():
    return {"status": "ok", "docs": "/docs", "health": "/health"}


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    condition: Optional[str] = None
    price: Optional[int] = None
    status: Optional[str] = None  # "PENDING" | "REVIEWED" | "APPROVED" | "REJECTED"
    notes: Optional[str] = None


@app.get("/admin/sessions")
async def admin_list_sessions():
    return await db.session.find_many(include={"photos": True})


@app.get("/admin/sessions/{session_id}")
async def admin_get_session(session_id: str):
    sess = await db.session.find_unique(
        where={"id": session_id},
        include={"photos": True},
    )
    if not sess:
        raise HTTPException(404, "Session not found")
    return sess

@app.patch("/admin/sessions/{session_id}")
async def admin_update_session(session_id: str, payload: SessionUpdate):
    # validate status if provided
    data = payload.model_dump(exclude_none=True)
    if "status" in data:
        allowed = {"PENDING","REVIEWED","APPROVED","REJECTED"}
        if data["status"] not in allowed:
            raise HTTPException(400, "Invalid status")

    sess = await db.session.update(
        where={"id": session_id},
        data=data
    )
    return sess

@app.post("/sessions/{session_id}/analyze")
async def analyze_session(session_id: str):
    # 1) Load session + photos
    sess = await db.session.find_unique(
        where={"id": session_id},
        include={"photos": True},
    )
    if not sess:
        raise HTTPException(404, "Session not found")
    if not sess.photos:
        raise HTTPException(400, "No photos to analyze")

    # 2) Mark analyzing
    await db.session.update(where={"id": session_id}, data={"status": "ANALYZING"})

    try:
        if not OPENAI_API_KEY:
            raise HTTPException(500, "OPENAI_API_KEY not set")

        # 3) Prepare base64 images as data URLs
        data_urls: List[str] = []
        for p in sess.photos:
            try:
                data_urls.append(read_image_as_data_url(p.path))
            except Exception as e:
                raise HTTPException(500, f"Failed to read image {p.path}: {e}")

        # 4) Build messages (system + user with mixed content)
        system_msg = {"role": "system", "content": build_ai_prompt()}

        user_parts = [{"type": "text", "text": "Analyze this watch from these photos and return ONLY the strict JSON."}]
        for url in data_urls:
            user_parts.append({"type": "image_url", "image_url": {"url": url}})

        user_msg = {"role": "user", "content": user_parts}

        # 5) Call OpenAI in JSON mode
        resp = client.chat.completions.create(
            model="gpt-5",
            messages=[system_msg, user_msg],
            
            response_format={"type": "json_object"},
        )
        text = resp.choices[0].message.content
        ai_result = json.loads(text)  # should be valid JSON due to JSON mode

        # 6) Find-or-create Watch
        fields = extract_watch_fields(ai_result)
        where_clause = None
        if fields["brand"] and fields["model"] and fields["year"] is not None:
            where_clause = {
                "brand": fields["brand"],
                "model": fields["model"],
                "year": fields["year"],
            }
        watch = await db.watch.find_first(where=where_clause) if where_clause else None
        if watch is None:
            watch = await db.watch.create(data=fields)

        # 7) Link photos to watch
        for p in sess.photos:
            await db.photo.update(where={"id": p.id}, data={"watchId": watch.id})

        # 8) Upsert raw AI JSON
        await db.watchanalysis.upsert(
            where={"watchId": watch.id},
            data={
                "create": {"watchId": watch.id, "aiJsonStr": json.dumps(ai_result)},
                "update": {"aiJsonStr": json.dumps(ai_result)},
            },
        )

        # 9) Mark done + link
        await db.session.update(
            where={"id": session_id},
            data={"status": "DONE", "watchId": watch.id},
        )

        # 10) Return payload; your GET /watches/{id} already parses aiJsonStr to ai
        watch_full = await db.watch.find_unique(
            where={"id": watch.id},
            include={"analysis": True, "photos": True},
        )
        return {"status": "DONE", "sessionId": session_id, "watch": watch_full, "ai": ai_result}

    except HTTPException:
        # re-raise HTTP errors as-is
        raise
    except Exception as e:
        # mark error and bubble up
        await db.session.update(where={"id": session_id}, data={"status": "ERROR"})
        raise HTTPException(500, f"Analysis failed: {e}")


def build_ai_prompt() -> str:
    return (
        "You are a watch expert. Analyze the provided photos and return a STRICT JSON with the exact schema below.\n"
        "Return ONLY JSON (no commentary). If unsure about any field, use the string \"—\" or numeric 0. Be realistic and consistent.\n"
        "\n"
        "SCORING RULES (apply to ALL \"score\" objects):\n"
        "- Allowed letters (best→worst): A++, A+, A, A-, B+, B, B-, C+, C, C-\n"
        "- Map numeric (0–100) to letters using these bins:\n"
        "  A++:97–100, A+:93–96, A:90–92, A-:87–89, B+:83–86, B:80–82, B-:77–79, C+:73–76, C:70–72, C-:65–69\n"
        "- score.letter MUST match the bin containing score.numeric. Use the same scale label \"letter_0_100\" everywhere.\n"
        "- If evidence indicates <65, cap at C- with numeric 65.\n"
        "\n"
        "FIELD CONSTRAINTS:\n"
        "- brand_reputation.type: 1–2 words, lowercase (e.g., \"horology\", \"microbrand\").\n"
        "- brand_reputation.legacy: include ONLY value (number) and unit (\"years\"); no raw field.\n"
        "- movement_quality.type: ONE word (e.g., \"automatic\", \"manual\", \"quartz\", \"spring-drive\").\n"
        "- movement_quality.reliability.label: one of {\"very low\",\"low\",\"medium\",\"high\",\"very high\"};\n"
        "  reliability.level must map to label: very low=1, low=2, medium=3, high=4, very high=5 (scale=\"ordinal_1_5\").\n"
        "- Keep all other units as specified (e.g., s_per_day, g, m, USD).\n"
        "- Do NOT add extra keys. Fill every field.\n"
        "\n"
        "{\n"
        "  \"name\": \"string\",\n"
        "  \"subtitle\": \"string\",\n"
        "  \"overall\": {\n"
        "    \"conclusion\": \"string\",\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"brand_reputation\": {\n"
        "    \"type\": \"string\",\n"
        "    \"legacy\": { \"value\": 0, \"unit\": \"years\" },\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"movement_quality\": {\n"
        "    \"type\": \"string\",\n"
        "    \"accuracy\": { \"value\": 0, \"unit\": \"s_per_day\", \"raw\": \"string\" },\n"
        "    \"reliability\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"materials_build\": {\n"
        "    \"total_weight\": { \"value\": 0, \"unit\": \"g\", \"raw\": \"string\" },\n"
        "    \"case_material\": { \"raw\": \"string\", \"material\": \"string\", \"grade\": \"string\" },\n"
        "    \"crystal\": { \"raw\": \"string\", \"material\": \"string\", \"coating\": \"string\" },\n"
        "    \"build_quality\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"water_resistance\": { \"value\": 0, \"unit\": \"m\", \"raw\": \"string\" },\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"maintenance_risks\": {\n"
        "    \"service_interval\": { \"min\": 0, \"max\": 0, \"unit\": \"y\", \"raw\": \"string\" },\n"
        "    \"service_cost\": { \"min\": 0, \"max\": 0, \"currency\": \"USD\", \"raw\": \"string\" },\n"
        "    \"parts_availability\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"serviceability\": { \"raw\": \"string\", \"restricted_to_authorized\": false },\n"
        "    \"known_weak_points\": [\"string\"],\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"value_for_money\": {\n"
        "    \"list_price\": { \"amount\": 0, \"currency\": \"USD\", \"approx\": true, \"raw\": \"string\" },\n"
        "    \"resale_average\": { \"amount\": 0, \"currency\": \"USD\", \"approx\": true, \"raw\": \"string\" },\n"
        "    \"market_liquidity\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"holding_value\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\", \"note\": \"string\" },\n"
        "    \"value_for_wearer\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"value_for_collector\": { \"label\": \"string\", \"level\": 1, \"scale\": \"ordinal_1_5\" },\n"
        "    \"spec_efficiency_note\": { \"label\": \"string\", \"note\": \"string\" },\n"
        "    \"score\": { \"letter\": \"A++|A+|A|A-|B+|B|B-|C+|C|C-\", \"numeric\": 0, \"scale\": \"letter_0_100\" }\n"
        "  },\n"
        "  \"alternatives\": [\n"
        "    { \"model\": \"string\", \"movement\": \"string\", \"price\": { \"amount\": 0, \"currency\": \"USD\", \"raw\": \"string\" } }\n"
        "  ],\n"
        "  \"meta\": { \"schema_version\": \"1.1.0\", \"units_system\": \"SI\", \"release_year\": 0 }\n"
        "}\n"
    )

#trebuie sa opresi si sa pornesti iar sv nu dar am schimbat in
def extract_watch_fields(ai: dict) -> dict:
    # maps AI JSON to your Watch columns
    return {
        "name": ai.get("name"),
        "subtitle": ai.get("subtitle"),
        "brand": ai.get("brand") or (ai.get("name") or "").split(" ")[0] or None,
        "model": ai.get("model") or ai.get("name"),
        "year": (ai.get("meta") or {}).get("release_year"),
        "overallLetter": (ai.get("overall") or {}).get("score", {}).get("letter"),
        "overallNumeric": (ai.get("overall") or {}).get("score", {}).get("numeric"),
    }

@app.post("/sessions/{session_id}/analyze")
async def analyze_session(session_id: str):
    # 1) Load session + photos
    sess = await db.session.find_unique(
        where={"id": session_id},
        include={"photos": True},
    )
    if not sess:
        raise HTTPException(404, "Session not found")
    if not sess.photos or len(sess.photos) == 0:
        raise HTTPException(400, "No photos to analyze")

    # Fast path: already done
    if (sess.status or "").upper() == "DONE" and sess.watchId is not None:
        watch = await db.watch.find_unique(
            where={"id": sess.watchId},
            include={"analysis": True, "photos": True},
        )
        ai_json = None
        if watch and watch.analysis and watch.analysis.aiJsonStr:
            try:
                ai_json = json.loads(watch.analysis.aiJsonStr)
            except Exception:
                ai_json = None
        return {"status": "DONE", "sessionId": session_id, "watch": watch, "ai": ai_json}

    # 2) Mark analyzing
    await db.session.update(where={"id": session_id}, data={"status": "ANALYZING"})

    try:
        # 3) Call AI (stub)
        photo_paths = [p.path for p in sess.photos if p.path]
        ai_result = await analyze_images_with_ai_stub(photo_paths)

        # 4) Dedup / find or create watch
        fields = extract_watch_fields(ai_result)
        where_clause = None
        if fields["brand"] and fields["model"] and fields["year"] is not None:
            where_clause = {
                "brand": fields["brand"],
                "model": fields["model"],
                "year": fields["year"],
            }
        watch = await db.watch.find_first(where=where_clause) if where_clause else None
        if watch is None:
            watch = await db.watch.create(data=fields)

        # 5) Link photos to watch
        for p in sess.photos:
            await db.photo.update(where={"id": p.id}, data={"watchId": watch.id})

        # 6) Store raw AI JSON in WatchAnalysis (UPsert)  ⬇️ THIS IS THE NEW PART
        await db.watchanalysis.upsert(
            where={"watchId": watch.id},
            data={
                "create": {"watchId": watch.id, "aiJsonStr": json.dumps(ai_result)},
                "update": {"aiJsonStr": json.dumps(ai_result)},
            },
        )

        # 7) Link session to watch + mark done
        await db.session.update(
            where={"id": session_id},
            data={"watchId": watch.id, "status": "DONE"},
        )

        # 8) Return
        watch_full = await db.watch.find_unique(
            where={"id": watch.id},
            include={"analysis": True, "photos": True},
        )
        return {"status": "DONE", "sessionId": session_id, "watch": watch_full, "ai": ai_result}

    except Exception as e:
        await db.session.update(where={"id": session_id}, data={"status": "ERROR"})
        raise HTTPException(500, f"Analysis failed: {e}")


def serialize_watch(record: Any) -> Dict[str, Any]:
    """
    Convert a Prisma result (dict or model object) to a plain dict and
    add `ai` parsed from analysis.aiJsonStr. Works for dicts or objects.
    """
    if record is None:
        return None

    # Normalize top-level to a dict
    out: Dict[str, Any]
    if isinstance(record, dict):
        out = dict(record)
    else:
        # Try Pydantic v2 / Prisma model .model_dump(), then .dict(), then last-resort getattr
        try:
            out = record.model_dump()  # pydantic v2 style
        except Exception:
            try:
                out = record.dict()  # pydantic v1 style
            except Exception:
                out = {}
                for name in dir(record):
                    if not name.startswith("_"):
                        try:
                            out[name] = getattr(record, name)
                        except Exception:
                            pass

    # Extract aiJsonStr from analysis whether it's dict or object
    ai_json = None
    analysis = out.get("analysis")
    s = None
    if isinstance(analysis, dict):
        s = analysis.get("aiJsonStr")
    elif analysis is not None:
        s = getattr(analysis, "aiJsonStr", None)

    if isinstance(s, str):
        try:
            ai_json = json.loads(s)
        except Exception:
            ai_json = None

    out["ai"] = ai_json
    return out

@app.get("/watches")
async def list_watches(q: Optional[str] = None, take: int = 20, skip: int = 0):
    """Public list of watches with photos and parsed AI JSON."""
    take = max(1, min(take, 100))
    skip = max(0, skip)

    where = None
    if q and q.strip():
        # remove 'mode: "insensitive"' for SQLite compatibility
        where = {
            "OR": [
                {"name":  {"contains": q}},
                {"brand": {"contains": q}},
                {"model": {"contains": q}},
            ]
        }

    try:
        items = await db.watch.find_many(
            where=where,
            include={"photos": True, "analysis": True},
            # If your client errors on 'order', comment it out or use the list form:
            # order=[{"createdAt": "desc"}],
            # or remove ordering entirely:
            # (uncomment the next line if the above works for you)
            # order={"createdAt": "desc"},
            skip=skip,
            take=take,
        )
        total = await db.watch.count(where=where)
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "list_watches failed")

    data = [serialize_watch(w) for w in items]
    return {"total": total, "count": len(data), "items": data}


@app.get("/watches/{watch_id}")
async def get_watch(watch_id: int):
    try:
        w = await db.watch.find_unique(
            where={"id": watch_id},
            include={"photos": True, "analysis": True},
        )
        if not w:
            raise HTTPException(404, "Watch not found")
        return serialize_watch(w)
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "get_watch failed")

@app.delete("/admin/watches/{watch_id}", tags=["admin"], dependencies=[Depends(require_admin)])
async def admin_delete_watch(watch_id: int):
    w = await db.watch.find_unique(where={"id": watch_id})
    if not w:
        raise HTTPException(404, "Watch not found")

    # Unlink sessions & photos (safety for SQLite FK behavior)
    await db.session.update_many(where={"watchId": watch_id}, data={"watchId": None})
    await db.photo.update_many(where={"watchId": watch_id}, data={"watchId": None})
    await db.watchanalysis.delete_many(where={"watchId": watch_id})
    await db.watch.delete(where={"id": watch_id})
    return {"ok": True}

@app.patch("/admin/watches/{watch_id}", tags=["admin"], dependencies=[Depends(require_admin)])
async def admin_update_watch(watch_id: int, payload: WatchUpdate):
    data = payload.model_dump(exclude_none=True)
    # You may hit UNIQUE constraint (brand,model,year). Let it bubble or handle explicitly.
    w = await db.watch.update(where={"id": watch_id}, data=data)
    w_full = await db.watch.find_unique(
        where={"id": w.id},
        include={"photos": True, "analysis": True},
    )
    return serialize_watch(w_full)