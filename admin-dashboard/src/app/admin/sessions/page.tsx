// (use ONE of these paths depending on your setup)
// app/admin/sessions/page.tsx
// src/app/admin/sessions/page.tsx

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type Photo = {
  id: number;
  path: string;
  index: number | null;
  mime: string | null;
};
type Session = {
  id: string;
  createdAt: string;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: "PENDING" | "REVIEWED" | "APPROVED" | "REJECTED";
  photos: Photo[];
};

async function getSessions(): Promise<Session[]> {
  const res = await fetch(`${API}/admin/sessions`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load sessions (${res.status}): ${text}`);
  }
  return res.json();
}

export default async function SessionsPage() {
  const sessions = await getSessions();
  return (
    <div>
      <h1>All Sessions</h1>
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}
      >
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
              Title
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Brand/Model
            </th>
            <th
              style={{
                textAlign: "left",
                borderBottom: "1px solid #eee",
                padding: 8,
              }}
            >
              Status
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
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                <a
                  href={`/admin/sessions/${s.id}`}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                  }}
                >
                  Edit
                </a>
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                {s.id}
              </td>
              <td
                style={{ padding: 8, borderBottom: "1px solid " + "#f2f2f2" }}
              >
                {s.title ?? "—"}
              </td>
              <td
                style={{ padding: 8, borderBottom: "1px solid " + "#f2f2f2" }}
              >
                {(s.brand ?? "—") + " / " + (s.model ?? "—")}
              </td>
              <td
                style={{ padding: 8, borderBottom: "1px solid " + "#f2f2f2" }}
              >
                {s.status ?? "PENDING"}
              </td>
              <td
                style={{ padding: 8, borderBottom: "1px solid " + "#f2f2f2" }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  {s.photos?.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={`${API}${p.path.startsWith("/") ? "" : "/"}${
                        p.path
                      }`}
                      width={64}
                      height={64}
                      style={{
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #eee",
                      }}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16 }}>
                <em>No sessions yet.</em>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
