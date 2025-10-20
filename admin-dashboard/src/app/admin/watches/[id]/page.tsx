// src/app/admin/watches/[id]/page.tsx (self-contained)

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import AISummary from "../AISummary";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function getWatch(id: string) {
  const res = await fetch(`${API}/watches/${id}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- SERVER ACTION: update watch using RAW JSON ---
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

  // Gentle coercions for common numeric fields
  if (typeof payload?.year === "string" && payload.year !== "") {
    const n = Number(payload.year);
    if (!Number.isNaN(n)) payload.year = n;
  }
  if (
    typeof payload?.overallNumeric === "string" &&
    payload.overallNumeric !== ""
  ) {
    const n = Number(payload.overallNumeric);
    if (!Number.isNaN(n)) payload.overallNumeric = n;
  }

  const res = await fetch(`${API}/admin/watches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  revalidatePath(`/admin/watches/${id}`);
}

// --- UI PRIMITIVES ---------------------------------------------------------
function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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

function CardHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

// --- PREVIEW + EDIT (no client hooks, fully SSR-friendly) ------------------
function JSONEditorCard({ id, initial }: { id: string; initial: any }) {
  const preview = JSON.stringify(initial, null, 2);
  const formId = `json-edit-${id}`;
  const toggleId = `toggle-${id}`;

  return (
    <Card>
      {/* Hidden checkbox controls mode; must precede BOTH blocks and share the same parent */}
      <input id={toggleId} type="checkbox" className="peer sr-only" />

      {/* VIEW MODE (visible when NOT checked) */}
      <div className="peer-checked:hidden">
        <CardHeader
          title="Details JSON"
          actions={
            <label
              htmlFor={toggleId}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5",
                "text-sm font-medium text-slate-700 hover:text-slate-900 hover:border-slate-400 transition",
                "dark:border-slate-700 dark:text-slate-200 cursor-pointer"
              )}
            >
              Edit
            </label>
          }
        />
        <CardBody>
          <pre
            className={cls(
              "text-sm leading-relaxed overflow-x-auto rounded-xl border border-slate-200",
              "bg-slate-50 p-4 whitespace-pre-wrap",
              "dark:border-slate-800 dark:bg-slate-900/40"
            )}
          >
            {preview}
          </pre>
        </CardBody>
      </div>

      {/* EDIT MODE (visible when checked) */}
      <div className="hidden peer-checked:block">
        <CardHeader
          title="Edit JSON"
          actions={
            <div className="flex gap-2">
              <button
                form={formId}
                type="submit"
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold",
                  "bg-slate-900 text-white hover:bg-slate-800 transition",
                  "dark:bg-slate-100 dark:text-slate-900"
                )}
              >
                Save
              </button>
              <button
                form={formId}
                type="reset"
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium",
                  "text-slate-700 hover:bg-slate-50",
                  "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                )}
              >
                Reset
              </button>
              <label
                htmlFor={toggleId}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer",
                  "text-slate-700 hover:bg-slate-50",
                  "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                )}
              >
                Cancel
              </label>
            </div>
          }
        />
        <CardBody>
          <form
            id={formId}
            action={updateWatchJsonAction}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={id} />
            <textarea
              name="payload"
              defaultValue={preview}
              spellCheck={false}
              className={cls(
                "w-full min-h-[360px] font-mono text-sm leading-relaxed p-4 rounded-xl",
                "border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400/70 focus:border-slate-400",
                "bg-white dark:bg-slate-950 dark:border-slate-700"
              )}
            />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tip: Only include fields you want to update.
            </div>
          </form>
        </CardBody>
      </div>
    </Card>
  );
}

// --- PAGE ------------------------------------------------------------------
export default async function WatchDetail({
  params,
}: {
  params: { id: string };
}) {
  const w = await getWatch(params.id);

  const starter: any = {
    name: w.name ?? "",
    subtitle: w.subtitle ?? "",
    brand: w.brand ?? "",
    model: w.model ?? "",
    year: w.year ?? "",
    overallLetter: w.overallLetter ?? "",
    overallNumeric: w.overallNumeric ?? "",
    ai: w.ai ?? {},
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="pt-4">
          <a href="/" className="text-slate-500 hover:text-slate-700">
            ← Back
          </a>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {w.name ?? `Watch #${w.id}`}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {w.brand ?? "—"} / {w.model ?? "—"}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Photos */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader title="Photos" />
              <CardBody>
                <div className="grid gap-3">
                  {w.photos?.map((p: any) => (
                    <img
                      key={p.id}
                      src={`${API}${p.path.startsWith("/") ? "" : "/"}${
                        p.path
                      }`}
                      alt=""
                      className="w-full max-w-[360px] rounded-xl border border-slate-200 dark:border-slate-800"
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right column: AI + JSON editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader title="AI Summary" />
              <CardBody>
                <AISummary ai={w.ai} />
              </CardBody>
            </Card>

            <JSONEditorCard id={w.id} initial={starter} />
          </div>
        </div>
      </div>
    </div>
  );
}
