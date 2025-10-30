import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = process.env.NEXT_PUBLIC_API_BASE!;  // e.g. http://api.watchscore.bump.games
const ADMIN_KEY = process.env.X_API_KEY!;       // FastAPI admin key

function withTimeout(ms: number) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, clear: () => clearTimeout(id) };
}

export async function GET(req: Request) {
  try {
    // 0) create throwaway principal (satisfy auth_principal no matter what)
    const { signal: sSig, clear: sClr } = withTimeout(8000);
    const sRes = await fetch(new URL("/session/anon", API), {
      method: "POST",
      cache: "no-store",
      signal: sSig,
    }).catch((e) => {
      throw new Error(`session/anon network error: ${String(e?.message || e)}`);
    });
    sClr();
    const sText = await sRes.text().catch(() => "");
    if (!sRes.ok) {
      return NextResponse.json(
        { step: "session/anon", status: sRes.status, body: sText.slice(0, 600) },
        { status: 502 }
      );
    }
    let creds: { clientId: string; apiKey: string };
    try {
      creds = JSON.parse(sText);
    } catch {
      return NextResponse.json(
        { step: "session/anon", error: "invalid JSON", body: sText.slice(0, 600) },
        { status: 502 }
      );
    }

    // 1) build upstream
    const inUrl = new URL(req.url);
    const upstream = new URL("/watches", API);
    const limit = inUrl.searchParams.get("limit");
    const cursor = inUrl.searchParams.get("cursor");
    if (limit) upstream.searchParams.set("limit", limit);
    if (cursor) upstream.searchParams.set("cursor", cursor);

    // 2) call FastAPI with admin+session headers
    const { signal: uSig, clear: uClr } = withTimeout(8000);
    const r = await fetch(upstream, {
      cache: "no-store",
      headers: new Headers({
        "x-api-key": ADMIN_KEY,
        "X-Client-Id": String(creds.clientId),
        Authorization: `Bearer ${String(creds.apiKey)}`,
      }),
      signal: uSig,
    }).catch((e) => {
      throw new Error(`upstream /watches network error: ${String(e?.message || e)}`);
    });
    uClr();

    const text = await r.text().catch(() => "");
    const ct = r.headers.get("content-type") ?? "application/json";
    if (!r.ok) {
      // Echo upstream body so your page sees something useful
      return new NextResponse(
        JSON.stringify({
          step: "upstream /watches",
          status: r.status,
          body: text.slice(0, 1200),
        }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    // Validate JSON once to catch silent HTML/errors
    try {
      JSON.parse(text);
    } catch {
      return NextResponse.json(
        { step: "upstream /watches", error: "invalid JSON", body: text.slice(0, 1200) },
        { status: 502 }
      );
    }
    return new NextResponse(text, { status: 200, headers: { "content-type": ct } });
  } catch (e: any) {
    return NextResponse.json({ step: "proxy", error: String(e?.message || e) }, { status: 500 });
  }
}