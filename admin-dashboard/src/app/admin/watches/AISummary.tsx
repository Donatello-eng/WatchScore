"use client";

type AI = any;

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <div style={{ width: 180, color: "#666" }}>{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}

export default function AISummary({ ai }: { ai: AI }) {
  if (!ai) return <em>No AI summary yet.</em>;

  const overall = ai?.overall?.score;
  const movement = ai?.movement_quality;
  const materials = ai?.materials_build;
  const risks = ai?.maintenance_risks;
  const value = ai?.value_for_money;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Overall</div>
        <Row label="Conclusion" value={ai?.overall?.conclusion} />
        <Row
          label="Score"
          value={`${overall?.letter ?? "—"} (${overall?.numeric ?? "—"})`}
        />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Movement</div>
        <Row label="Type" value={movement?.type} />
        <Row label="Accuracy" value={movement?.accuracy?.raw} />
        <Row label="Reliability" value={movement?.reliability?.label} />
        <Row
          label="Score"
          value={`${movement?.score?.letter ?? "—"} (${
            movement?.score?.numeric ?? "—"
          })`}
        />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Materials & Build
        </div>
        <Row label="Case" value={materials?.case_material?.raw} />
        <Row label="Crystal" value={materials?.crystal?.raw} />
        <Row label="WR" value={materials?.water_resistance?.raw} />
        <Row label="Build Quality" value={materials?.build_quality?.label} />
        <Row
          label="Score"
          value={`${materials?.score?.letter ?? "—"} (${
            materials?.score?.numeric ?? "—"
          })`}
        />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Maintenance / Risks
        </div>
        <Row label="Service interval" value={risks?.service_interval?.raw} />
        <Row label="Service cost" value={risks?.service_cost?.raw} />
        <Row
          label="Parts availability"
          value={risks?.parts_availability?.label}
        />
        <Row
          label="Known weak points"
          value={
            Array.isArray(risks?.known_weak_points)
              ? risks.known_weak_points.join(" • ")
              : undefined
          }
        />
        <Row
          label="Score"
          value={`${risks?.score?.letter ?? "—"} (${
            risks?.score?.numeric ?? "—"
          })`}
        />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Value for Money</div>
        <Row label="List price" value={value?.list_price?.raw} />
        <Row label="Resale avg." value={value?.resale_average?.raw} />
        <Row label="Liquidity" value={value?.market_liquidity?.label} />
        <Row label="Holding value" value={value?.holding_value?.label} />
        <Row
          label="Score"
          value={`${value?.score?.letter ?? "—"} (${
            value?.score?.numeric ?? "—"
          })`}
        />
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Alternatives</div>
        {Array.isArray(ai?.alternatives) && ai.alternatives.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {ai.alternatives.map((a: any, i: number) => (
              <li key={i}>
                {a.model ?? "—"} {a.movement ? `· ${a.movement}` : ""}{" "}
                {a.price?.raw ? `· ${a.price.raw}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <em>—</em>
        )}
      </div>
    </div>
  );
}
