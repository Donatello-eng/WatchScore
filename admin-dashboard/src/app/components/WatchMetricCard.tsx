import SparklineInteractive from "./SparklineInteractive";

// --- TYPES ---
export type MetricPoint = { date: string; count: number };

export type WatchStats = {
    scans24h: number;
    scans7d: MetricPoint[];
    athDaily: number; 
};

// --- UTILS ---
function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

function toISO(s?: string | null): string | undefined {
    if (!s) return undefined;
    const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
    const d = new Date(hasTZ ? s : `${s}Z`);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// --- LOGIC FUNCTIONS ---

export function buildWatchStats(items: { createdAt?: string | null }[]): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, 0);
    }
    let scans24h = 0;
    const dailyTotals = new Map<string, number>();
    for (const w of items) {
        const iso = toISO(w.createdAt);
        if (!iso) continue;
        const d = new Date(iso);
        const diff = now.getTime() - d.getTime();
        const key = iso.slice(0, 10);
        if (diff >= 0 && diff <= MS_DAY) scans24h++;
        dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + 1);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const scans7d: MetricPoint[] = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
    const athDaily = dailyTotals.size > 0 ? Math.max(...dailyTotals.values()) : scans24h;
    return { scans24h, scans7d, athDaily };
}

export function buildUniqueUserStats(items: { createdAt?: string | null; userId?: number | null }[]): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;
    const buckets = new Map<string, Set<number>>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, new Set());
    }
    const users24h = new Set<number>();
    const dailyAll = new Map<string, Set<number>>();
    for (const w of items) {
        const iso = toISO(w.createdAt);
        const uid = w.userId ?? null;
        if (!iso || uid == null) continue;
        const d = new Date(iso);
        const diff = now.getTime() - d.getTime();
        const key = iso.slice(0, 10);
        if (diff >= 0 && diff <= MS_DAY) users24h.add(uid);
        if (!dailyAll.has(key)) dailyAll.set(key, new Set());
        dailyAll.get(key)!.add(uid);
        const bucket = buckets.get(key);
        if (bucket) bucket.add(uid);
    }
    const scans7d: MetricPoint[] = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, set]) => ({ date, count: set.size }));
    let athDaily = 0;
    for (const set of dailyAll.values()) {
        if (set.size > athDaily) athDaily = set.size;
    }
    if (athDaily === 0) athDaily = users24h.size;
    return { scans24h: users24h.size, scans7d, athDaily };
}

export function buildMeanScansPerUserStats(items: { createdAt?: string | null; userId?: number | null }[]): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;
    const last7 = new Map<string, { scans: number; users: Set<number> }>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10);
        last7.set(key, { scans: 0, users: new Set() });
    }
    const scansPerDayAll = new Map<string, number>();
    const usersPerDayAll = new Map<string, Set<number>>();
    let scans24hRaw = 0;
    const users24h = new Set<number>();
    for (const w of items) {
        const iso = toISO(w.createdAt);
        const uid = w.userId ?? null;
        if (!iso || uid == null) continue;
        const d = new Date(iso);
        const diff = now.getTime() - d.getTime();
        const key = iso.slice(0, 10);
        if (diff >= 0 && diff <= MS_DAY) {
            scans24hRaw++;
            users24h.add(uid);
        }
        scansPerDayAll.set(key, (scansPerDayAll.get(key) ?? 0) + 1);
        if (!usersPerDayAll.has(key)) usersPerDayAll.set(key, new Set());
        usersPerDayAll.get(key)!.add(uid);
        const slot = last7.get(key);
        if (slot) {
            slot.scans++;
            slot.users.add(uid);
        }
    }
    const mean24hRaw = users24h.size > 0 ? scans24hRaw / users24h.size : 0;
    const mean24h = Math.round(mean24hRaw * 10) / 10;
    const scans7d: MetricPoint[] = Array.from(last7.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { scans, users }]) => {
            const mean = users.size > 0 ? scans / users.size : 0;
            return { date, count: Math.round(mean * 10) / 10 };
        });
    
    // Recalculated 'means' to fix the "Cannot find name 'means'" error
    const means: number[] = [];
    for (const [day, scans] of scansPerDayAll.entries()) {
        const uSet = usersPerDayAll.get(day);
        const uniq = uSet?.size ?? 0;
        if (uniq > 0) {
            const m = Math.round((scans / uniq) * 10) / 10;
            means.push(m);
        }
    }

    const athDaily = means.length > 0 ? Math.max(...means) : mean24h;
    return { scans24h: mean24h, scans7d, athDaily };
}

// --- UI COMPONENTS ---

function ModernRadial({ current, ath }: { current: number; ath: number }) {
    const safeAth = ath > 0 ? ath : Math.max(current, 1);
    const progress = Math.max(0, Math.min(1, current / safeAth));
    const percent = Math.round(progress * 100);

    const r = 20;
    const c = 2 * Math.PI * r;
    const dashArray = c;
    const dashOffset = c * (1 - progress);

    // Dynamic color based on saturation
    let strokeColor = "#f43f5e"; // Rose (Low)
    if (percent >= 75) strokeColor = "#22c55e"; // Green (High)
    else if (percent >= 40) strokeColor = "#f59e0b"; // Amber (Med)

    return (
        <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
            <svg 
                className="block w-full h-full -rotate-90 drop-shadow-md" 
                viewBox="0 0 48 48"
                preserveAspectRatio="xMidYMid meet"
            >
                <circle
                    cx="24"
                    cy="24"
                    r={r}
                    strokeWidth={3}
                    className="stroke-slate-700 fill-none" 
                />
                <circle
                    cx="24"
                    cy="24"
                    r={r}
                    strokeWidth={3}
                    stroke={strokeColor}
                    fill="none"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                   {percent}%
               </span>
            </div>
        </div>
    );
}

type MetricCardProps = {
    title: string;
    stats: WatchStats;
    tooltipLabel?: string;
};

export function WatchMetricCard({ title, stats, tooltipLabel }: MetricCardProps) {
    const points = stats.scans7d;
    const values = points.map((p) => p.count);
    const last = values.at(-1) ?? 0;
    const prev = values.at(-2) ?? 0;
    const diff = last - prev;
    const diffPct = prev > 0 ? Math.round((diff / prev) * 100) : null;
    const trendPositive = diff >= 0;

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-xl transition-all hover:border-blue-700/50 hover:shadow-blue-500/10">
            {/* Inner Glow Effect */}
            <div className="absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%+100px)] h-[calc(100%+100px)] bg-blue-500/5 blur-[80px] rounded-full pointer-events-none -z-10" />
            
            {/* --- TOP SECTION --- */}
            <div className="relative z-10 flex items-start justify-between p-5 pb-0">
                <div className="flex flex-col min-w-0">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate group-hover:text-blue-400 transition-colors">
                        {title}
                    </h2>
                    
                    <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                        <span className="text-4xl font-bold tracking-tight text-white tabular-nums">
                            {stats.scans24h.toLocaleString()}
                        </span>

                        {diffPct !== null && (
                            <span
                                className={cls(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset whitespace-nowrap",
                                    trendPositive
                                        ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                                )}
                            >
                                {trendPositive ? "▲" : "▼"} {Math.abs(diffPct)}%
                            </span>
                        )}
                    </div>
                    
                    <div className="mt-1 text-[11px] text-slate-500 font-medium">
                        vs. previous 24h
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <ModernRadial current={stats.scans24h} ath={stats.athDaily} />
                    <span className="text-[9px] uppercase font-medium tracking-wider text-slate-500 whitespace-nowrap">
                        OF ATH
                    </span>
                </div>
            </div>

            {/* --- CHART SECTION --- */}
            <div className="relative z-10 mt-4 h-20 w-full px-2 pb-2">
                {/* By NOT passing lineColor/fillColor, the component will use 
                    its internal logic: Green (#10b981) for rising, Red (#f43f5e) for falling.
                */}
                <SparklineInteractive
                    points={points}
                    label={tooltipLabel ?? title}
                />
            </div>
        </div>
    );
}

export default WatchMetricCard;