"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE!;

export default function SessionForm({ session }: { session: any }) {
  const [form, setForm] = useState({
    title: session.title ?? "",
    brand: session.brand ?? "",
    model: session.model ?? "",
    year: session.year ?? "",
    condition: session.condition ?? "",
    price: session.price ?? "",
    status: session.status ?? "PENDING",
    notes: session.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: any = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        price: form.price ? Number(form.price) : undefined,
      };
      Object.keys(payload).forEach((k) =>
        payload[k] === "" ? delete payload[k] : null
      );

      const res = await fetch(`${API}/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Saved ✓");
    } catch (err: any) {
      setMsg(`Error: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 12, maxWidth: 520 }}
    >
      <label>
        Title <input name="title" value={form.title} onChange={onChange} />
      </label>
      <label>
        Brand <input name="brand" value={form.brand} onChange={onChange} />
      </label>
      <label>
        Model <input name="model" value={form.model} onChange={onChange} />
      </label>
      <label>
        Year{" "}
        <input
          name="year"
          value={form.year}
          onChange={onChange}
          inputMode="numeric"
        />
      </label>
      <label>
        Condition{" "}
        <input name="condition" value={form.condition} onChange={onChange} />
      </label>
      <label>
        Price (integer){" "}
        <input
          name="price"
          value={form.price}
          onChange={onChange}
          inputMode="numeric"
        />
      </label>
      <label>
        Status
        <select name="status" value={form.status} onChange={onChange}>
          <option value="PENDING">PENDING</option>
          <option value="REVIEWED">REVIEWED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </label>
      <label>
        Notes
        <textarea
          name="notes"
          rows={4}
          value={form.notes}
          onChange={onChange}
        />
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="submit" disabled={saving} style={{ padding: "8px 14px" }}>
          {saving ? "Saving..." : "Save"}
        </button>
        {msg && <span>{msg}</span>}
      </div>
    </form>
  );
}
