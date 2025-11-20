"use client";

import { useMemo, useState, useId } from "react";

export type MetricPoint = { date: string; count: number };

type Props = {
  points: MetricPoint[];
  label?: string;
  lineColor?: string; // Optional prop for custom line color
  fillColor?: string; // Optional prop for custom fill color
};

// --- HELPER: Smoothing Logic ---
function getSmoothPath(points: { x: number; y: number }[], smoothing = 0.2) {
  const line = (pointA: { x: number; y: number }, pointB: { x: number; y: number }) => {
    const lengthX = pointB.x - pointA.x;
    const lengthY = pointB.y - pointA.y;
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX),
    };
  };

  const controlPoint = (
    current: { x: number; y: number },
    previous: { x: number; y: number },
    next: { x: number; y: number },
    reverse?: boolean
  ) => {
    const p = previous || current;
    const n = next || current;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current.x + Math.cos(angle) * length;
    const y = current.y + Math.sin(angle) * length;
    return { x, y };
  };

  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const cps = controlPoint(a[i - 1], a[i - 2], point);
    const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
  }, "");
}

export default function SparklineInteractive({ 
  points, 
  label = "Scans", 
  lineColor, 
  fillColor 
}: Props) {
  // Generate unique IDs for SVG filters/gradients to prevent conflicts between multiple cards
  const gradientId = useId();
  const filterId = useId();

  if (!points || points.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">No Data</span>
      </div>
    );
  }

  // Internal coordinate system
  const width = 200; 
  const height = 60;

  const { segments, pathD, fillD, computedColor } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const values = sorted.map((p) => p.count);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const paddingY = height * 0.15;
    const availableHeight = height - (paddingY * 2);

    const segs = sorted.map((p, i) => {
      const x = (i / Math.max(sorted.length - 1, 1)) * width;
      const norm = (p.count - minVal) / range;
      const y = (height - paddingY) - (norm * availableHeight);
      return { x, y, point: p };
    });

    const linePath = getSmoothPath(segs, 0.15);
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
    
    // Determine default color based on trend if no lineColor is provided
    const isRising = segs[segs.length - 1].point.count >= segs[0].point.count;
    const defaultColor = isRising ? "#10b981" : "#f43f5e"; 

    return { 
      segments: segs, 
      pathD: linePath, 
      fillD: areaPath, 
      computedColor: lineColor ?? defaultColor 
    };
  }, [points, lineColor]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active =
    activeIndex != null && activeIndex >= 0 && activeIndex < segments.length
      ? segments[activeIndex]
      : null;

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

  const dateLabel = active && new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(active.point.date));

  // Calculated Positions for HTML elements (Percentage based)
  const xPct = active ? (active.x / width) * 100 : 0;
  const yPct = active ? (active.y / height) * 100 : 0;
  
  // Tooltip clamping
  const clampedLeft = Math.max(10, Math.min(90, xPct));

  return (
    <div
      className="relative w-full h-full cursor-crosshair touch-none select-none group"
      onMouseLeave={() => setActiveIndex(null)}
      onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.getBoundingClientRect())}
      onTouchStart={(e) => e.touches[0] && handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
      onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
    >
      {/* The SVG Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible block"
        preserveAspectRatio="none"
      >
        <defs>
          {/* If fillColor is provided, we don't necessarily need the gradient, 
             but we keep it as a fallback if fillColor is null.
          */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={computedColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={computedColor} stopOpacity={0} />
          </linearGradient>
          
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area Fill: Use provided fillColor OR the gradient */}
        <path 
          d={fillD} 
          fill={fillColor ?? `url(#${gradientId})`} 
          stroke="none" 
        />
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={computedColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />
      </svg>

      {/* --- HTML OVERLAY FOR INTERACTIVITY --- */}
      {active && (
        <>
            {/* Vertical Line */}
            <div 
                className="absolute top-0 bottom-0 border-l border-dashed border-white/30 pointer-events-none"
                style={{ left: `${xPct}%` }}
            />

            {/* The Dot (HTML div = perfect circle) */}
            <div 
                className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{ left: `${xPct}%`, top: `${yPct}%`, backgroundColor: computedColor }}
            >
                <div className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
                <div className="absolute inset-0.5 rounded-full bg-zinc-900 border border-white/50" />
            </div>

            {/* Tooltip */}
            <div
                className="absolute top-0 pointer-events-none z-20"
                style={{ left: `${clampedLeft}%`, transform: 'translate(-50%, -120%)' }}
            >
                <div className="
                    flex flex-col items-center justify-center 
                    px-3 py-2 rounded-xl
                    bg-zinc-800/95 backdrop-blur-md 
                    border border-white/20 
                    shadow-[0_8px_20px_rgba(0,0,0,0.5)] 
                    min-w-[80px] whitespace-nowrap
                ">
                    <div className="text-sm font-bold text-white leading-none tabular-nums mb-1">
                        {active.point.count.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 font-semibold leading-none uppercase tracking-wide">
                            {label}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-none">
                            {dateLabel}
                        </span>
                    </div>
                </div>
                
                {/* Tooltip Arrow */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-800/95 mx-auto relative -top-[1px]" />
            </div>
        </>
      )}
    </div>
  );
}