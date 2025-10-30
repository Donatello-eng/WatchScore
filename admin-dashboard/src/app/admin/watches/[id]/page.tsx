// src/app/admin/watches/[id]/page.tsx

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import AISummary from "../AISummary";
import { headers } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_BASE;

/* =========================
   Types (updated)
   ========================= */

export type PhotoItem = {
  id: number;
  key: string;
  url?: string | null;   // signed GET (preferred)
  path?: string | null;  // legacy
  mime?: string | null;
  index?: number | null;
  createdAt?: string | null;
};

export type Money = { amount?: number; currency?: string; raw?: string };
export type WatchScore = { letter?: string; numeric?: number };

// movement quality
export type MovementQuality = {
  type?: string;
  accuracy?: { value?: number; unit?: string; raw?: string };
  reliability?: { label?: string };
  score?: WatchScore;
};
export type MovementType = "automatic" | "manual" | "quartz" | "spring-drive" | "—";

export type QuickFacts = {
  name?: string;                 // e.g., "Rolex Submariner"
  subtitle?: string;             // e.g., "Luxury Diver Watch"
  movement_type?: MovementType;  // ONE word per spec
  release_year?: number | null;
  list_price?: Money;            // { amount, currency }
};

export type WatchAI = {
  quick_facts?: QuickFacts;
  overall?: { conclusion?: string; score?: WatchScore };
  brand_reputation?: unknown;
  movement_quality?: MovementQuality;
  materials_build?: unknown;
  maintenance_risks?: unknown;
  value_for_money?: { list_price?: Money } & Record<string, any>;
  alternatives?: unknown[];
};

/** Full watch payload this page expects (proxy enriches with extracted fields) */
type Watch = {
  id: number;
  createdAt?: string | null;

  // photos from backend
  photos: PhotoItem[];

  // extracted/surfaced fields (backend `_extract(...)`)
  name?: string | null;
  subtitle?: string | null;
  brand?: string | null;          // may be absent → keep optional
  model?: string | null;          // may be absent → keep optional
  year?: number | null;           // (from quick_facts.release_year)
  overallLetter?: string | null;  // (from overall.score.letter)
  overallNumeric?: number | null; // (from overall.score.numeric)

  // AI blob
  ai?: WatchAI | string | null;   // tolerate stringified JSON for safety
};

export const dynamic = "force-dynamic";

/* =========================
   Data
   ========================= */

async function getWatch(id: string): Promise<Watch> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const url = new URL(`/api/ws/watches/${id}`, `${proto}://${host}`);

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* =========================
   Admin PATCH action (unchanged)
   ========================= */

export async function updateWatchJsonAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const raw = String(formData.get("payload") || "").trim();

  if (!id) throw new Error("Missing watch id");
  if (!raw) throw new Error("Empty JSON payload");

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e?.message ?? e}`);
  }

  if (typeof payload?.year === "string" && payload.year !== "") {
    const n = Number(payload.year);
    if (!Number.isNaN(n)) payload.year = n;
  }
  if (typeof payload?.overallNumeric === "string" && payload.overallNumeric !== "") {
    const n = Number(payload.overallNumeric);
    if (!Number.isNaN(n)) payload.overallNumeric = n;
  }

  const adminKey = process.env.X_API_KEY;
  if (!adminKey) throw new Error("Missing X_API_KEY env variable for admin edits.");

  const res = await fetch(`${API}/admin/watches/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": adminKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  revalidatePath(`/admin/watches/${id}`);
}

/* =========================
   UI primitives
   ========================= */

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cls(
        "rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm",
        "dark:bg-slate-900/60 dark:border-slate-800",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}
function prettyJson(x: unknown): string {
  if (typeof x === "string") {
    try {
      return JSON.stringify(JSON.parse(x), null, 2);
    } catch {
      return x;
    }
  }
  try {
    return JSON.stringify(x, getCircularReplacer(), 2);
  } catch {
    return String(x);
  }
}

/* =========================
   Page
   ========================= */

export default async function WatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await getWatch(id);
  const ai =
    typeof w.ai === "string"
      ? (() => { try { return JSON.parse(w.ai); } catch { return null; } })()
      : (w.ai ?? null);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="pt-4">
          <a href="/" className="text-slate-500 hover:text-slate-700">
            ← Back
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Photos */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader title="Photos" />
              <CardBody>
                <div className="grid gap-3">
                  {(w.photos ?? []).map((p) => {
                    const src =
                      p.url ??
                      (p.path ? `${API}${p.path.startsWith("/") ? "" : "/"}${p.path}` : undefined);
                    return (
                      <img
                        key={p.id}
                        src={src || "/placeholder.png"}
                        alt=""
                        className="w-full max-w-[360px] rounded-xl border border-slate-200 dark:border-slate-800"
                      />
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right column: AI + JSON preview (inline) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader title="AI Summary" />
              <CardBody>
                <AISummary ai={ai} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="AI JSON (debug)" />
              <CardBody>
                <pre
                  className={cls(
                    "text-sm leading-relaxed overflow-x-auto rounded-xl border border-slate-200",
                    "bg-slate-50 p-4 whitespace-pre-wrap",
                    "dark:border-slate-800 dark:bg-slate-900/40"
                  )}
                >
                  {prettyJson(w.ai ?? {})}
                </pre>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}