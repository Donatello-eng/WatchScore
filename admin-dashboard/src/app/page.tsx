// src/app/admin/watches/page.tsx — fix hydration mismatch by rendering UTC times deterministically
import type { JSX, ReactNode } from "react";
import { revalidatePath } from "next/cache";
import DeleteWatchForm from "./admin/watches/DeleteWatchForm";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// Types
type Photo = {
  id: number;
  path: string;
  index?: number | null;
  mime?: string | null;
};
type Watch = {
  id: number;
  name?: string | null;
  subtitle?: string | null;
  brand?: string | null;
  model?: string | null;
  overallLetter?: string | null;
  overallNumeric?: number | null;
  createdAt?: string | null;
  photos: Photo[];
  ai?: any;
};

// Data
async function getWatches(
  search?: string
): Promise<{ total: number; count: number; items: Watch[] }> {
  const url = new URL(`${API}/watches`);
  url.searchParams.set("take", "50");
  if (search) url.searchParams.set("q", search);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Server action: delete + refresh list (adds x_api_key header from env X_API_KEY)
export async function deleteWatchAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  const key = process.env.X_API_KEY;
  if (!key) {
    throw new Error(
      "Missing X_API_KEY env variable required for admin delete."
    );
  }

  const res = await fetch(`${API}/admin/watches/${id}`, {
    method: "DELETE",
    headers: { "x-api-key": key },
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath("/admin/watches");
}

// UI helpers
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

/**
 * Ensure deterministic (SSR=CSR) time rendering by formatting in UTC.
 * If the backend timestamp has no timezone, assume UTC.
 */
function toISO(s?: string | null): string | undefined {
  if (!s) return undefined;
  const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
  const d = new Date(hasTZ ? s : `${s}Z`);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString(); // always UTC
}
function fmtUTC_YMD_HM(s?: string | null): string {
  const iso = toISO(s);
  if (!iso) return "—";
  // 2025-10-19T14:37:12.345Z -> "2025-10-19 14:37"
  return iso.slice(0, 16).replace("T", " ");
}

function Btn({
  as = "button",
  href,
  children,
  variant = "ghost",
  className,
  ...rest
}: any): JSX.Element {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
      : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60";

  if (as === "a") {
    return (
      <a href={href} className={cls(base, styles, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls(base, styles, className)} {...rest}>
      {children}
    </button>
  );
}

export default async function WatchesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams?.q;
  const { items } = await getWatches(q);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 pt-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Watches
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Manage and browse your catalog.
            </p>
          </div>
          <form action="/admin/watches" className="flex items-center gap-2">
            <input
              name="q"
              placeholder="Search brand/model/name"
              defaultValue={q ?? ""}
              className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/70 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
            />
            <Btn variant="primary" type="submit">
              Search
            </Btn>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left align-middle">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-sm">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {/* Photos moved to the first column */}
                  <th className="px-4 py-3 font-medium w-[210px]">Photos</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Brand / Model</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((w) => {
                  const iso = toISO(w.createdAt);
                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      {/* Photos */}
                      <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-800 w-[210px]">
                        <div className="flex gap-2">
                          {w.photos?.slice(0, 3).map((p) => (
                            <img
                              key={p.id}
                              src={`${API}${p.path.startsWith("/") ? "" : "/"}${
                                p.path
                              }`}
                              width={56}
                              height={56}
                              className="h-14 w-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              alt=""
                            />
                          ))}
                        </div>
                      </td>
                      {/* ID */}
                      <td className="px-4 py-3 pl-6 text-slate-700 dark:text-slate-300">
                        {w.id}
                      </td>
                      {/* Created (UTC to avoid hydration mismatch) */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <time
                          dateTime={iso}
                          title={iso}
                          suppressHydrationWarning
                        >
                          {fmtUTC_YMD_HM(w.createdAt)}
                        </time>
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[320px]">
                          {w.name ?? "—"}
                        </div>
                        {w.subtitle && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[320px]">
                            {w.subtitle}
                          </div>
                        )}
                      </td>
                      {/* Brand / Model */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {(w.brand ?? "—") + " / " + (w.model ?? "—")}
                      </td>
                      {/* Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge>{w.overallLetter ?? "—"}</Badge>
                          <span className="text-slate-600 dark:text-slate-400 text-sm">
                            {w.overallNumeric ?? "—"}
                          </span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Btn
                          as="a"
                          href={`/admin/watches/${w.id}`}
                          className="mr-2"
                        >
                          View
                        </Btn>
                        <DeleteWatchForm id={w.id} action={deleteWatchAction} />
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                      colSpan={7}
                    >
                      <em>No watches yet.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Showing up to 50 results.
        </p>
      </div>
    </div>
  );
}
