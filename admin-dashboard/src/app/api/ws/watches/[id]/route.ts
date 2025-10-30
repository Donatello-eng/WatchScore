// src/app/api/ws/admin/watches/[id]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_BASE!;
const ADMIN_KEY = process.env.X_API_KEY!;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const upstream = new URL(`/admin/watches/${encodeURIComponent(id)}`, API);
  const r = await fetch(upstream, {
    cache: "no-store",
    headers: { "x-api-key": ADMIN_KEY },
  });

  const text = await r.text().catch(() => "");
  const ct = r.headers.get("content-type") ?? "application/json";
  return new NextResponse(text, { status: r.status, headers: { "content-type": ct } });
}