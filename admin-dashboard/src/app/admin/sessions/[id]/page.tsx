const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function getSession(id: string) {
  const res = await fetch(`${API}/admin/sessions/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSession(params.id);
  return (
    <div>
      <a href="/admin/sessions" style={{ color: "#555" }}>
        ← Back
      </a>
      <h1 style={{ marginTop: 8 }}>Session {data.id}</h1>
      {data.watchId ? (
        <p style={{ marginTop: 8 }}>
          Linked watch:{" "}
          <a href={`/admin/watches/${data.watchId}`}>#{data.watchId}</a>
        </p>
      ) : (
        <p style={{ marginTop: 8, color: "#888" }}>
          No linked watch yet {data.status ? `(status: ${data.status})` : ""}.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 24,
          marginTop: 16,
        }}
      >
        <div>
          <h3>Photos</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {data.photos?.map((p: any) => (
              <img
                key={p.id}
                src={`${API}${p.path.startsWith("/") ? "" : "/"}${p.path}`}
                alt=""
                style={{
                  width: "100%",
                  maxWidth: 340,
                  borderRadius: 8,
                  border: "1px solid #eee",
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <h3>Details</h3>
          {/* inline form to keep it minimal */}
          <SessionForm session={data} />
        </div>
      </div>
    </div>
  );
}

function SessionForm({ session }: { session: any }) {
  // client-side form kept inline for brevity:
  return (
    <form
      action={async (formData) => {
        "use server";
        const payload: any = Object.fromEntries(formData);
        if (payload.year === "") delete payload.year;
        if (payload.price === "") delete payload.price;
        await fetch(`${API}/admin/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            year: payload.year ? Number(payload.year) : undefined,
            price: payload.price ? Number(payload.price) : undefined,
          }),
          cache: "no-store",
        });
      }}
      style={{ display: "grid", gap: 12, maxWidth: 520 }}
    >
      <label>
        Title <input name="title" defaultValue={session.title ?? ""} />
      </label>
      <label>
        Brand <input name="brand" defaultValue={session.brand ?? ""} />
      </label>
      <label>
        Model <input name="model" defaultValue={session.model ?? ""} />
      </label>
      <label>
        Year{" "}
        <input
          name="year"
          inputMode="numeric"
          defaultValue={session.year ?? ""}
        />
      </label>
      <label>
        Condition{" "}
        <input name="condition" defaultValue={session.condition ?? ""} />
      </label>
      <label>
        Price{" "}
        <input
          name="price"
          inputMode="numeric"
          defaultValue={session.price ?? ""}
        />
      </label>
      <label>
        Status
        <select name="status" defaultValue={session.status ?? "PENDING"}>
          <option value="PENDING">PENDING</option>
          <option value="REVIEWED">REVIEWED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </label>
      <label>
        Notes
        <textarea name="notes" rows={4} defaultValue={session.notes ?? ""} />
      </label>
      <button type="submit" style={{ padding: "8px 14px" }}>
        Save
      </button>
    </form>
  );
}
