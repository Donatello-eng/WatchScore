// src/app/page.tsx
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import DeleteWatchForm from "./admin/watches/DeleteWatchForm";
import { headers } from "next/headers";
import WatchMetricCard, {
  buildMeanScansPerUserStats,
  buildUniqueUserStats,
  buildWatchStats,
} from "./components/WatchMetricCard";
import { PhotoWithPreview } from "./components/PhotoWithPreview";
import LocalTime from "./components/LocalTime"; // <--- 1. NEW IMPORT

// --- TYPES ---
type Photo = { id: number; url?: string | null };
type Watch = {
  id: number;
  userId?: number | null;
  createdAt?: string | null;
  photos: Photo[];
  name?: string | null;
  year?: number | null;
  overallLetter?: string | null;
  overallNumeric?: number | null;
  price?: { amount?: number | null; currency?: string | null } | null;
};

// --- UTILS ---
function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function getGradeBadge(grade?: string | null) {
  if (!grade) return <span className="text-slate-600 dark:text-slate-600">—</span>;
  
  const g = grade.toUpperCase();
  // Modern Neon-Pastel Palette
  let colorClass = "bg-slate-800/50 text-slate-400 border-slate-700";
  
  if (g.startsWith("A")) colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]";
  else if (g.startsWith("B")) colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_-3px_rgba(59,130,246,0.3)]";
  else if (g.startsWith("C")) colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  else if (g.startsWith("D") || g.startsWith("F")) colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";

  return (
    <span className={cls("inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-lg border backdrop-blur-sm transition-all hover:scale-105 cursor-default", colorClass)}>
      {grade}
    </span>
  );
}

function toISO(s?: string | null): string | undefined {
  if (!s) return undefined;
  const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
  const d = new Date(hasTZ ? s : `${s}Z`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function fmtPrice(p?: { amount?: number | null; currency?: string | null } | null) {
  if (!p || p.amount == null || !p.currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: p.currency!,
      maximumFractionDigits: 0,
    }).format(p.amount as number);
  } catch {
    return `${p.amount} ${p.currency}`;
  }
}

// --- ICONS ---
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// --- DATA FETCHING ---
async function getWatches(limit = 50, cursor?: string | null) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Missing Host header");

  const url = new URL(`/api/ws/watches`, `${proto}://${host}`);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ items: Watch[]; nextCursor?: number | null }>;
}

export async function deleteWatchAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const key = process.env.X_API_KEY;
  const API = process.env.NEXT_PUBLIC_API_BASE;
  const res = await fetch(`${API}/admin/watches/${id}`, {
    method: "DELETE",
    headers: { "x-api-key": key! },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath("/");
}

// --- MAIN COMPONENT ---
export default async function WatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const sp = await searchParams;
  const cursor = sp?.cursor ?? undefined;
  const { items, nextCursor } = await getWatches(50, cursor ?? null);
  
  const scanStats = buildWatchStats(items);
  const userStats = buildUniqueUserStats(items);
  const meansStats = buildMeanScansPerUserStats(items);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        
        {/* METRICS */}
        <div className="grid gap-6 md:grid-cols-3">
          <WatchMetricCard title="Scans" stats={scanStats} tooltipLabel="Scans" /> 
          <WatchMetricCard title="Unique Users" stats={userStats} tooltipLabel="Unique users" />
          <WatchMetricCard title="Avg Scans / User" stats={meansStats} tooltipLabel="Mean scans" />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Watches
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Live feed of authenticated luxury timepieces.
            </p>
          </div>

          <form action="/" className="relative group w-full md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-blue-400">
              <SearchIcon />
            </div>
            <input
              name="q"
              placeholder="Search functionality locked..."
              className="w-full md:w-80 rounded-xl border border-slate-800 bg-slate-900/50 pl-11 pr-4 py-3 text-sm text-white shadow-inner placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-slate-900/80"
              disabled
            />
          </form>
        </div>

        {/* TABLE */}
        <div className="relative rounded-2xl border border-slate-800 bg-[#0B1121]/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Subtle inner glow for table */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

          <div className="relative overflow-x-auto">
            <table className="min-w-full text-left align-middle border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  {/* HYDRATION FIX: No comments between th tags */}
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[180px]">Photos</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Details</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detected</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-right text-slate-500 uppercase tracking-widest w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((w) => (
                  <tr 
                    key={w.id} 
                    className="group hover:bg-blue-500/[0.02] transition-colors duration-300"
                  >
                    {/* PHOTOS */}
                    <td className="px-6 py-5">
                      <div className="flex items-center -space-x-3 pl-2">
                        {(w.photos ?? []).length > 0 ? (
                          (w.photos ?? []).slice(0, 3).map((p, i) => (
                            <PhotoWithPreview 
                              key={p.id} 
                              src={p.url || "/placeholder.png"} 
                              alt={`Watch ${i}`}
                              style={{ zIndex: 10 - i }} 
                              className="w-12 h-12 rounded-full ring-4 ring-[#0B1121] group-hover:ring-[#0e1529] transition-all shadow-lg"
                            />
                          ))
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-900 ring-4 ring-[#0B1121] flex items-center justify-center text-[10px] text-slate-600">
                            N/A
                          </div>
                        )}
                      </div>
                    </td>

                    {/* DETAILS */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-200 text-sm truncate max-w-[200px] group-hover:text-blue-300 transition-colors">
                          {w.name ?? "Unknown Model"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono tracking-tight flex items-center gap-2">
                          ID: {w.id}
                          {w.year && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{w.year}</span>}
                        </span>
                      </div>
                    </td>

                    {/* SCORE */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {getGradeBadge(w.overallLetter)}
                        {w.overallNumeric && (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-300 tabular-nums">
                              {w.overallNumeric}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PRICE */}
                    <td className="px-6 py-5">
                      <span className="font-mono text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                        {fmtPrice(w.price ?? null)}
                      </span>
                    </td>

                    {/* DETECTED */}
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-500">
                        {/* 2. REPLACED: fmtUTC_Smart with LocalTime component */}
                        <LocalTime date={toISO(w.createdAt)} />
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`/admin/watches/${w.id}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        >
                          <ExternalLinkIcon />
                        </a>
                        <DeleteWatchForm id={w.id} action={deleteWatchAction} />
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-6 py-24 text-center" colSpan={6}>
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                          <SearchIcon />
                        </div>
                        <p className="text-slate-400 text-sm">No watches detected yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-center pt-2 pb-16">
          {nextCursor ? (
            <a
              href={`/?cursor=${nextCursor}`}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-full hover:text-white hover:border-slate-600 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>Load Older Scans</span>
              <span className="text-slate-500 group-hover:translate-y-0.5 transition-transform">↓</span>
            </a>
          ) : (
             <div className="flex items-center gap-2 text-xs font-medium text-slate-700 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-slate-800" />
                End of List
                <span className="w-2 h-2 rounded-full bg-slate-800" />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}