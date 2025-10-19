import { revalidatePath } from "next/cache";
import DeleteWatchForm from "./DeleteWatchForm";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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
  photos: Photo[];
  ai?: any;
};

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

// Server action to delete and refresh list
async function deleteWatchAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const res = await fetch(`${API}/admin/watches/${id}`, {
    method: "DELETE",
    // headers: { "x-api-key": "dev-secret" }, // add if you secure admin APIs
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath("/admin/watches");
}

export default async function WatchesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams?.q;
  const { items } = await getWatches(q);

  return (
    <div>
      <h1>Watches</h1>

      <form action="/admin/watches" style={{ marginTop: 12, marginBottom: 16 }}>
        <input
          name="q"
          placeholder="Search brand/model/name"
          defaultValue={q ?? ""}
          style={{ padding: 8, width: 260, marginRight: 8 }}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>
          Search
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              ID
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Name
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Brand / Model
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Score
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Photos
            </th>
            <th style={{ borderBottom: "1px solid #eee", padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                {w.id}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                {w.name ?? "—"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                {(w.brand ?? "—") + " / " + (w.model ?? "—")}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                {(w.overallLetter ?? "—") +
                  " (" +
                  (w.overallNumeric ?? "—") +
                  ")"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {w.photos?.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={`${API}${p.path.startsWith("/") ? "" : "/"}${
                        p.path
                      }`}
                      width={56}
                      height={56}
                      style={{
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #eee",
                      }}
                      alt=""
                    />
                  ))}
                </div>
              </td>
              <td
                style={{
                  padding: 8,
                  borderBottom: "1px solid #f2f2f2",
                  whiteSpace: "nowrap",
                }}
              >
                <a
                  href={`/admin/watches/${w.id}`}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  View
                </a>
                <DeleteWatchForm id={w.id} action={deleteWatchAction} />
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16 }}>
                <em>No watches yet.</em>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
