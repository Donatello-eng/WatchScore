// src/app/admin/watches/[id]/page.tsx

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import AISummary from "../AISummary"; // Assumes this is the modernized version
import { headers } from "next/headers";
import { JsonViewer } from "@/app/components/JsonViewer";

const API = process.env.NEXT_PUBLIC_API_BASE;

/* =========================
   Types
   ========================= */

export type PhotoItem = {
  id: number;
  key: string;
  url?: string | null;
  path?: string | null;
  mime?: string | null;
  index?: number | null;
  createdAt?: string | null;
};

export type Money = { amount?: number; currency?: string; raw?: string };
export type WatchScore = { letter?: string; numeric?: number };

export type MovementQuality = {
  type?: string;
  accuracy?: { value?: number; unit?: string; raw?: string };
  reliability?: { label?: string };
  score?: WatchScore;
};
export type MovementType = "automatic" | "manual" | "quartz" | "spring-drive" | "—";

export type QuickFacts = {
  name?: string;
  subtitle?: string;
  movement_type?: MovementType;
  release_year?: number | null;
  list_price?: Money;
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

type Watch = {
  id: number;
  createdAt?: string | null;
  photos: PhotoItem[];
  name?: string | null;
  subtitle?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  overallLetter?: string | null;
  overallNumeric?: number | null;
  ai?: WatchAI | string | null;
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
   Actions
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
   UI Primitives
   ========================= */

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({ children, className, title, icon }: { children: ReactNode; className?: string; title?: string; icon?: ReactNode }) {
  return (
    <div
      className={cls(
        "relative rounded-2xl border border-slate-800 bg-[#0B1121]/60 backdrop-blur-xl shadow-xl overflow-hidden",
        className
      )}
    >
      {/* Inner Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

      {title && (
        <div className="relative px-6 py-4 border-b border-slate-800/80 flex items-center gap-3">
          {icon && <span className="text-blue-400">{icon}</span>}
          <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>
        </div>
      )}

      <div className="relative p-6">
        {children}
      </div>
    </div>
  );
}

/* =========================
   Icons
   ========================= */
const BackArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PhotoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

/* =========================
   Page Component
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
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* --- Navigation & Title --- */}
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <a
              href="/"
              className="group inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <span className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700 group-hover:bg-slate-800 group-hover:border-slate-600 transition-all">
                <BackArrowIcon />
              </span>
              Back to Dashboard
            </a>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {w.name || "Unknown Model"}
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-mono">
                Scan ID: <span className="text-blue-400">{w.id}</span>
              </p>
            </div>
            <div className="hidden md:block">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "No Date"}
              </span>
            </div>
          </div>
        </div>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Photos (Fixed width on large screens) */}
          <div className="lg:col-span-4 space-y-6">
            <Card title="Gallery" icon={<PhotoIcon />}>
              <div className="space-y-4">
                {(w.photos ?? []).length > 0 ? (
                  (w.photos ?? []).map((p, idx) => {
                    const src =
                      p.url ??
                      (p.path ? `${API}${p.path.startsWith("/") ? "" : "/"}${p.path}` : undefined);
                    return (
                      <div
                        key={p.id}
                        className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50 shadow-lg"
                      >
                        <div className="">
                          <img
                            src={src || "/placeholder.png"}
                            alt={`Watch view ${idx + 1}`}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-mono text-slate-300 uppercase">
                            IMG_{p.id}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    <PhotoIcon />
                    <span className="text-sm mt-2">No photos available</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Data Analysis */}
          <div className="lg:col-span-8 space-y-8">

            {/* AI Summary (Using your modernized component) */}
            <Card title="AI Analysis" icon={<BrainIcon />}>
              <AISummary ai={ai} />
            </Card>

            {/* Raw JSON Debugger (Collapsible-style look) */}
            <Card title="Raw Data Object" icon={<CodeIcon />}>
              {/* Remove the old <pre> block and use the new component */}
              <JsonViewer data={w.ai ?? {}} />
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}