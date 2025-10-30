"use client";

import React from "react";

/** ===== Types matching your new schema (kept local to component) ===== */
type Money = { amount?: number; currency?: string; raw?: string };
type Score = { letter?: string; numeric?: number };
type MovementQuality = {
  type?: string;
  accuracy?: { value?: number; unit?: string; raw?: string };
  reliability?: { label?: string };
  score?: Score;
};
type MaterialsBuild = {
  case_material?: { material?: string; raw?: string };
  crystal?: { material?: string; raw?: string };
  water_resistance?: { value?: number; unit?: string; raw?: string };
  build_quality?: { label?: string };
  total_weight?: { value?: number; unit?: string };
  score?: Score;
};
type MaintenanceRisks = {
  service_interval?: { min?: number; max?: number; unit?: string; raw?: string };
  service_cost?: { min?: number; max?: number; currency?: string; raw?: string };
  parts_availability?: { label?: string };
  serviceability?: { raw?: string };
  known_weak_points?: string[];
  score?: Score;
};
type ValueForMoney = {
  list_price?: Money;
  resale_average?: Money;
  market_liquidity?: { label?: string };
  holding_value?: { label?: string; note?: string };
  value_for_wearer?: { label?: string };
  value_for_collector?: { label?: string };
  spec_efficiency_note?: { label?: string; note?: string };
  score?: Score;
};
type QuickFacts = {
  name?: string;
  subtitle?: string;
  movement_type?: string;
  release_year?: number | null;
  list_price?: Money;
};
type AI = {
  quick_facts?: QuickFacts;
  overall?: { conclusion?: string; score?: Score };
  movement_quality?: MovementQuality;
  materials_build?: MaterialsBuild;
  maintenance_risks?: MaintenanceRisks;
  value_for_money?: ValueForMoney;
  alternatives?: Array<{ model?: string; movement?: string; price?: Money }>;
};

/** ===== Helpers to normalize both the old `.raw` and the new structured fields ===== */

function fmtValueUnit(x?: { value?: number; unit?: string; raw?: string }): string | undefined {
  if (!x) return undefined;
  if (x.raw) return x.raw;
  if (x.value != null && x.unit) return `${x.value} ${x.unit}`;
  if (x.value != null) return String(x.value);
  return undefined;
}
function fmtRangeUnit(x?: { min?: number; max?: number; unit?: string; raw?: string }): string | undefined {
  if (!x) return undefined;
  if (x.raw) return x.raw;
  const a = x.min, b = x.max;
  if (a != null && b != null) return `${a}–${b}${x.unit ? ` ${x.unit}` : ""}`;
  if (a != null) return `${a}${x.unit ? ` ${x.unit}` : ""}`;
  if (b != null) return `${b}${x.unit ? ` ${x.unit}` : ""}`;
  return undefined;
}

const NUM_LOCALE = "en-US";                 // fixed => same on server/client
const nf0 = new Intl.NumberFormat(NUM_LOCALE, { maximumFractionDigits: 0 });
const USD = "$";

function fmtUSD(n?: number | null): string | undefined {
  return typeof n === "number" ? `${USD}${nf0.format(n)}` : undefined;
}

function fmtMoney(m?: { amount?: number | null }): string | undefined {
  if (!m) return undefined;
  return fmtUSD(m.amount ?? undefined);
}

function fmtMoneyRange(x?: { min?: number | null; max?: number | null }): string | undefined {
  if (!x) return undefined;
  const { min, max } = x;
  if (typeof min === "number" && typeof max === "number") {
    return `${USD}${nf0.format(min)}–${USD}${nf0.format(max)}`;
  }
  if (typeof min === "number") return `${USD}${nf0.format(min)}+`;
  if (typeof max === "number") return `≤ ${USD}${nf0.format(max)}`;
  return undefined;
}
function orDash(v?: string | number | null) {
  return v == null || v === "" ? "—" : v;
}
function scoreText(s?: Score) {
  return s?.letter || s?.numeric != null ? `${s?.letter ?? "—"} (${s?.numeric ?? "—"})` : "—";
}

/** ===== Small UI primitives ===== */
function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <div style={{ width: 180, color: "#9AA0A6" }}>{label}</div>
      <div>{orDash(value)}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #2A2F3A", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/** ===== Component ===== */
export default function AISummary({ ai }: { ai: AI }) {
  if (!ai || typeof ai !== "object") return <em>No AI summary yet.</em>;

  const qf = ai.quick_facts;
  const overall = ai.overall;
  const mv = ai.movement_quality;
  const mb = ai.materials_build;
  const mr = ai.maintenance_risks;
  const vfm = ai.value_for_money;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Optional header with name/subtitle like your first screenshot */}
      {(qf?.name || qf?.subtitle) && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>{qf?.name}</div>
          {qf?.subtitle && <div style={{ color: "#9AA0A6" }}>{qf.subtitle}</div>}
        </div>
      )}

      <Section title="Overall">
        <Row label="Conclusion" value={overall?.conclusion} />
        <Row label="Score" value={scoreText(overall?.score)} />
      </Section>

      <Section title="Movement">
        <Row label="Type" value={mv?.type} />
        <Row label="Accuracy" value={fmtValueUnit(mv?.accuracy)} />
        <Row label="Reliability" value={mv?.reliability?.label} />
        <Row label="Score" value={scoreText(mv?.score)} />
      </Section>

      <Section title="Materials & Build">
        <Row label="Case" value={mb?.case_material?.raw ?? mb?.case_material?.material} />
        <Row label="Crystal" value={mb?.crystal?.raw ?? mb?.crystal?.material} />
        <Row label="WR" value={fmtValueUnit(mb?.water_resistance)} />
        <Row label="Build Quality" value={mb?.build_quality?.label} />
        <Row label="Score" value={scoreText(mb?.score)} />
      </Section>

      <Section title="Maintenance / Risks">
        <Row label="Service interval" value={fmtRangeUnit(mr?.service_interval)} />
        <Row label="Service cost" value={fmtMoneyRange(mr?.service_cost)} />
        <Row label="Parts availability" value={mr?.parts_availability?.label} />
        <Row
          label="Known weak points"
          value={
            Array.isArray(mr?.known_weak_points) && mr!.known_weak_points!.length > 0
              ? mr!.known_weak_points!.join(" • ")
              : undefined
          }
        />
        <Row label="Score" value={scoreText(mr?.score)} />
      </Section>

      <Section title="Value for Money">
        <Row label="List price" value={fmtMoney(vfm?.list_price)} />
        <Row label="Resale avg." value={fmtMoney(vfm?.resale_average)} />
        <Row label="Liquidity" value={vfm?.market_liquidity?.label} />
        <Row label="Holding value" value={vfm?.holding_value?.label} />
        <Row label="Score" value={scoreText(vfm?.score)} />
      </Section>

      <Section title="Alternatives">
        {Array.isArray(ai.alternatives) && ai.alternatives.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {ai.alternatives.map((a, i) => (
              <li key={i}>
                {orDash(a.model)} {a.movement ? `· ${a.movement}` : ""}{" "}
                {a.price ? `· ${fmtMoney(a.price) ?? ""}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <em>—</em>
        )}
      </Section>
    </div>
  );
}