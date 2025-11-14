// src/app/components/SparklineInteractive.tsx
"use client";

import { useMemo, useState } from "react";

export type MetricPoint = { date: string; count: number };

type Props = {
  points: MetricPoint[];
  label?: string; // "Scans", "Searches", etc.
};

export default function SparklineInteractive({ points, label = "Scans" }: Props) {
  if (!points || points.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-slate-500/70">
        No data
      </div>
    );
  }

  const width = 100;
  const height = 30;

  const { segments, rising } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const values = sorted.map((p) => p.count);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const segs = sorted.map((p, i) => {
      const x = (i / Math.max(sorted.length - 1, 1)) * width;
      const norm = (p.count - minVal) / range;
      const y = height - norm * height;
      return { x, y, point: p };
    });

    const isRising = segs[segs.length - 1].point.count >= segs[0].point.count;
    return { segments: segs, rising: isRising };
  }, [points]);

  // null = no hover => no tooltip / vertical line
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active =
    activeIndex != null && activeIndex >= 0 && activeIndex < segments.length
      ? segments[activeIndex]
      : null;

  const strokeColor = rising ? "#22c55e" : "#f97373";

  const path = segments
    .map((seg, i) => `${i === 0 ? "M" : "L"} ${seg.x.toFixed(2)} ${seg.y.toFixed(2)}`)
    .join(" ");

  const handleMove = (clientX: number, rect: DOMRect) => {
    const relX = ((clientX - rect.left) / rect.width) * width;
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    segments.forEach((seg, i) => {
      const d = Math.abs(seg.x - relX);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    });
    setActiveIndex(bestIndex);
  };

  const dateLabel =
    active &&
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
    }).format(new Date(active.point.date + "T00:00:00Z"));

  // Position tooltip; if no active, nothing is rendered anyway
  const rawLeft = active ? (active.x / width) * 100 : 50;
  const clampedLeft = Math.max(8, Math.min(92, rawLeft));

  return (
    <div
      className="relative w-full h-16"
      onMouseLeave={() => setActiveIndex(null)}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        handleMove(e.clientX, rect);
      }}
      onMouseEnter={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        handleMove(e.clientX, rect);
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        handleMove(touch.clientX, rect);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        handleMove(touch.clientX, rect);
      }}
      onTouchEnd={() => {
        // hide after lifting finger; comment this out if you want it to stay
        setActiveIndex(null);
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rising ? "#22c55e33" : "#f9737333"} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* area + line */}
        <path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#spark-fill)"
        />
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* vertical hover line + point */}
        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={0}
              y2={height}
              stroke="#facc15"
              strokeWidth={0.8}
              strokeDasharray="2 2"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={1.8}
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth={0.9}
            />
          </>
        )}
      </svg>

      {/* tooltip – only when active */}
      {active && dateLabel && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-full mb-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] text-slate-900 shadow-md text-left"
          style={{ left: `${clampedLeft}%` }}
        >
          <div className="font-semibold">
            {active.point.count.toLocaleString()} {label}
          </div>
          <div className="text-[10px] text-slate-500">{dateLabel}</div>
        </div>
      )}
    </div>
  );
}
