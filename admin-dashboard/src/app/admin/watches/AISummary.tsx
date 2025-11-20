// src/app/components/AISummary.tsx
"use client";

import React from "react";

/** ===== Types (Unchanged) ===== */
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

/** ===== Helpers ===== */

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

const NUM_LOCALE = "en-US";
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

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// --- UI Components ---

function GradeBadge({ score }: { score?: Score }) {
  if (!score?.letter) return <span className="text-slate-500 text-sm font-mono">—</span>;
  
  const g = score.letter.toUpperCase();
  let colorClass = "bg-slate-800/50 text-slate-400 border-slate-700";
  
  if (g.startsWith("A")) colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_-2px_rgba(16,185,129,0.3)]";
  else if (g.startsWith("B")) colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_-2px_rgba(59,130,246,0.3)]";
  else if (g.startsWith("C")) colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  else if (g.startsWith("D") || g.startsWith("F")) colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";

  return (
    <div className="flex items-center gap-2">
      <span className={cls("inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded border", colorClass)}>
        {g}
      </span>
      {score.numeric && (
        <span className="text-xs font-mono text-slate-500">
          {score.numeric}/100
        </span>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cls("text-sm text-slate-200 text-right", mono ? "font-mono" : "")}>
        {orDash(value)}
      </div>
    </div>
  );
}

function Section({ title, icon, children, score }: { title: string; icon?: React.ReactNode; children: React.ReactNode; score?: Score }) {
  return (
    <div className="flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-900/60 transition-colors">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          {icon}
          {title}
        </div>
        <GradeBadge score={score} />
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

// --- Icons ---
const GaugeIcon = () => <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const CubeIcon = () => <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const WrenchIcon = () => <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CashIcon = () => <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

/** ===== Component ===== */
export default function AISummary({ ai }: { ai: AI }) {
  if (!ai || typeof ai !== "object") return (
    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
      No AI analysis available.
    </div>
  );

  const qf = ai.quick_facts;
  const overall = ai.overall;
  const mv = ai.movement_quality;
  const mb = ai.materials_build;
  const mr = ai.maintenance_risks;
  const vfm = ai.value_for_money;

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* --- Header --- */}
      {(qf?.name || qf?.subtitle) && (
        <div className="pb-4 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white tracking-tight">{qf?.name}</h2>
          {qf?.subtitle && <div className="text-sm text-slate-400 mt-1">{qf.subtitle}</div>}
          
          {/* Overall Conclusion Box */}
          {overall?.conclusion && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm text-blue-100 leading-relaxed">
              <span className="font-semibold text-blue-400 mr-2">Verdict:</span>
              {overall.conclusion}
            </div>
          )}
        </div>
      )}

      {/* --- Grid Layout --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Movement */}
        <Section title="Movement" icon={<GaugeIcon />} score={mv?.score}>
          <Row label="Type" value={mv?.type} />
          <Row label="Accuracy" value={fmtValueUnit(mv?.accuracy)} mono />
          <Row label="Reliability" value={mv?.reliability?.label} />
        </Section>

        {/* Materials */}
        <Section title="Materials & Build" icon={<CubeIcon />} score={mb?.score}>
          <Row label="Case" value={mb?.case_material?.raw ?? mb?.case_material?.material} />
          <Row label="Crystal" value={mb?.crystal?.raw ?? mb?.crystal?.material} />
          <Row label="Water Res." value={fmtValueUnit(mb?.water_resistance)} mono />
          <Row label="Quality" value={mb?.build_quality?.label} />
        </Section>

        {/* Maintenance */}
        <Section title="Maintenance & Risks" icon={<WrenchIcon />} score={mr?.score}>
          <Row label="Interval" value={fmtRangeUnit(mr?.service_interval)} mono />
          <Row label="Est. Cost" value={fmtMoneyRange(mr?.service_cost)} mono />
          <Row label="Parts" value={mr?.parts_availability?.label} />
          {Array.isArray(mr?.known_weak_points) && mr!.known_weak_points!.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Weak Points</div>
              <div className="text-xs text-rose-300/80 leading-snug">
                {mr!.known_weak_points!.join(" • ")}
              </div>
            </div>
          )}
        </Section>

        {/* Value */}
        <Section title="Value for Money" icon={<CashIcon />} score={vfm?.score}>
          <Row label="List Price" value={fmtMoney(vfm?.list_price)} mono />
          <Row label="Resale Avg" value={fmtMoney(vfm?.resale_average)} mono />
          <Row label="Liquidity" value={vfm?.market_liquidity?.label} />
          <Row label="Holding" value={vfm?.holding_value?.label} />
        </Section>
      </div>

      {/* --- Alternatives Footer --- */}
      {Array.isArray(ai.alternatives) && ai.alternatives.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Competitors & Alternatives
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ai.alternatives.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-300">{orDash(a.model)}</span>
                  {a.movement && <span className="text-xs text-slate-500">{a.movement}</span>}
                </div>
                {a.price && (
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    {fmtMoney(a.price)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}