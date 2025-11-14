// src/app/page.tsx
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import DeleteWatchForm from "./admin/watches/DeleteWatchForm";
import { headers } from "next/headers";

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
type ListResp = { items: Watch[]; nextCursor?: number | null };
import SparklineInteractive from "./components/SparklineInteractive";

import WatchMetricCard, {
  buildMeanScansPerUserStats,
  buildUniqueUserStats,
  buildWatchStats,
  type WatchStats,
} from "./components/WatchMetricCard";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700">
      {children}
    </span>
  );
}
function toISO(s?: string | null): string | undefined {
  if (!s) return undefined;
  const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
  const d = new Date(hasTZ ? s : `${s}Z`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
function fmtUTC_YMD_HM(s?: string | null): string {
  const iso = toISO(s);
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
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
// via local proxy (handles auth + aggregation)

async function getWatches(limit = 50, cursor?: string | null) {
  const h = await headers();                        // <-- await here
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
// unchanged admin delete
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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <WatchMetricCard title="Scans" stats={scanStats} tooltipLabel="Scans" />
          <WatchMetricCard title="Unique users" stats={userStats} tooltipLabel="Unique users" />
          <WatchMetricCard title="Mean scans/user" stats={meansStats} tooltipLabel="Mean scans per users" />
        </div>

        <div className="flex items-end justify-between gap-4 pt-4">

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Watches</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage and browse your scans.</p>
          </div>


          <form action="/" className="flex items-center gap-2">
            <input
              name="q"
              placeholder="Search disabled (coming soon)"
              className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/70 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              disabled
            />
            <button
              className={cls(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                "bg-slate-300 text-white border-slate-300 cursor-not-allowed"
              )}
              type="button"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left align-middle">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-sm">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium w-[210px]">Photos</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((w) => {
                  const iso = toISO(w.createdAt);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 w-[210px]">
                        <div className="flex gap-2">
                          {(w.photos ?? []).slice(0, 3).map((p) => (
                            <img
                              key={p.id}
                              src={p.url || "/placeholder.png"}
                              width={56}
                              height={56}
                              className="h-14 w-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              alt=""
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 pl-6 text-slate-700 dark:text-slate-300">{w.id}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <time dateTime={iso} title={iso} suppressHydrationWarning>
                          {fmtUTC_YMD_HM(w.createdAt)}
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[320px]">
                          {w.name ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{w.year ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge>{w.overallLetter ?? "—"}</Badge>
                          <span className="text-slate-600 dark:text-slate-400 text-sm">{w.overallNumeric ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{fmtPrice(w.price ?? null)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <a
                          href={`/admin/watches/${w.id}`}
                          className={cls(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                            "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60",
                            "mr-2"
                          )}
                        >
                          View
                        </a>
                        <DeleteWatchForm id={w.id} action={deleteWatchAction} />
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={8}>
                      <em>No watches yet.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Showing up to 50 results.</p>
          {nextCursor ? (
            <a
              href={`/?cursor=${nextCursor}`}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
            >
              Older →
            </a>
          ) : (
            <span className="text-xs text-slate-400">End</span>
          )}
        </div>
      </div>
    </div>
  );
}