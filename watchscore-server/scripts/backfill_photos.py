# scripts/backfill_photos.py
#
# Phase 1 backfill:
# - Fill Photo.url from legacy Photo.path
# - Ensure Photo.watchId is set (create placeholder Watch per sessionId if needed)

import asyncio
from prisma import Prisma

# If your FastAPI serves local files (StaticFiles at /uploads)
# and 'path' looks like "uploads/sessions/xyz/photo_1.jpg",
# this base will create URLs like: http://localhost:8000/uploads/...
API_BASE = "http://localhost:8000"  # change to your ngrok URL if using a tunnel

async def main():
    db = Prisma()
    await db.connect()

    # 1) Backfill url from path where url is NULL and path is not NULL
    photos_needing_url = await db.photo.find_many(
        where={"url": None}
    )

    updated_url = 0
    for p in photos_needing_url:
        # Some rows may not have path; skip those
        path = getattr(p, "path", None)
        if not path:
            continue

        # Normalize and build URL
        path_norm = path.lstrip("/")
        url = f"{API_BASE}/{path_norm}"

        await db.photo.update(
            where={"id": p.id},
            data={"url": url},
        )
        updated_url += 1

    print(f"[Backfill] Updated url for {updated_url} photos from legacy path.")

    # 2) Ensure every photo has a watchId
    # Strategy:
    # - If watchId is NULL and sessionId exists -> create 1 Watch per sessionId and attach photos
    # - If BOTH watchId and sessionId are NULL -> create 1 Watch per such photo (fallback)

    # Gather photos missing watchId
    orphan_photos = await db.photo.find_many(
        where={"watchId": None}
    )

    # First pass: group by sessionId
    by_session = {}
    singles = []
    for p in orphan_photos:
        sid = getattr(p, "sessionId", None)
        if sid:
            by_session.setdefault(sid, []).append(p)
        else:
            singles.append(p)

    # Create a placeholder watch per sessionId
    created_for_session = {}
    for sid, plist in by_session.items():
        w = await db.watch.create(
            data={"name": f"Imported {sid}"}
        )
        created_for_session[sid] = w.id
        for p in plist:
            await db.photo.update(
                where={"id": p.id},
                data={"watchId": w.id}
            )

    # Fallback: create a watch per single orphan photo
    for p in singles:
        w = await db.watch.create(
            data={"name": "Imported (no session)"}
        )
        await db.photo.update(
            where={"id": p.id},
            data={"watchId": w.id}
        )

    total_fixed = len(orphan_photos)
    print(f"[Backfill] Set watchId for {total_fixed} photos.")

    await db.disconnect()
    print("[Backfill] Done.")

if __name__ == "__main__":
    asyncio.run(main())
