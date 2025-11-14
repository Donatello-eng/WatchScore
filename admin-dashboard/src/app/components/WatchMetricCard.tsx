// src/app/components/WatchMetricCard.tsx
import SparklineInteractive from "./SparklineInteractive";

export type MetricPoint = { date: string; count: number };

export type WatchStats = {
    scans24h: number;
    scans7d: MetricPoint[];
    athDaily: number; // all-time high daily scans
};

// local cls util so this file is self-contained
function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

// local toISO so we don't depend on page.tsx
function toISO(s?: string | null): string | undefined {
    if (!s) return undefined;
    const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(s);
    const d = new Date(hasTZ ? s : `${s}Z`);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Build stats from createdAt:
// - scans24h: last 24h
// - scans7d: last 7 days (for chart)
// - athDaily: max scans in a single day across all items
export function buildWatchStats(
    items: { createdAt?: string | null }[]
): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;

    // Pre-create 7 buckets: today-6 … today
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        buckets.set(key, 0);
    }

    let scans24h = 0;

    // For ATH we keep totals per day for all days we see
    const dailyTotals = new Map<string, number>();

    for (const w of items) {
        const iso = toISO(w.createdAt);
        if (!iso) continue;

        const d = new Date(iso);
        const diff = now.getTime() - d.getTime();
        const key = iso.slice(0, 10); // YYYY-MM-DD

        // last 24h
        if (diff >= 0 && diff <= MS_DAY) {
            scans24h++;
        }

        // all-time daily totals (for ATH)
        dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + 1);

        // last 7 days buckets (for chart)
        if (buckets.has(key)) {
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
    }

    const scans7d: MetricPoint[] = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    const athDaily =
        dailyTotals.size > 0
            ? Math.max(...dailyTotals.values())
            : scans24h; // fallback

    return { scans24h, scans7d, athDaily };
}

// count UNIQUE userIds per day
export function buildUniqueUserStats(
    items: { createdAt?: string | null; userId?: number | null }[]
): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;

    // last 7 days buckets: key -> Set<userId>
    const buckets = new Map<string, Set<number>>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, new Set());
    }

    const users24h = new Set<number>();

    // for ATH across all days we see
    const dailyAll = new Map<string, Set<number>>();

    for (const w of items) {
        const iso = toISO(w.createdAt);
        const uid = w.userId ?? null;
        if (!iso || uid == null) continue;

        const d = new Date(iso);
        const diff = now.getTime() - d.getTime();
        const key = iso.slice(0, 10);

        // last 24h unique users
        if (diff >= 0 && diff <= MS_DAY) {
            users24h.add(uid);
        }

        // all days, for ATH
        if (!dailyAll.has(key)) dailyAll.set(key, new Set());
        dailyAll.get(key)!.add(uid);

        // last 7 days buckets for chart
        const bucket = buckets.get(key);
        if (bucket) bucket.add(uid);
    }

    const scans7d: MetricPoint[] = Array.from(buckets.entries())
        .sort(([a, _aSet], [b, _bSet]) => a.localeCompare(b))
        .map(([date, set]) => ({ date, count: set.size }));

    let athDaily = 0;
    for (const set of dailyAll.values()) {
        if (set.size > athDaily) athDaily = set.size;
    }
    if (athDaily === 0) athDaily = users24h.size;

    return {
        scans24h: users24h.size, // here "scans24h" == unique users 24h
        scans7d,
        athDaily,
    };
}

export function buildMeanScansPerUserStats(
    items: { createdAt?: string | null; userId?: number | null }[]
): WatchStats {
    const now = new Date();
    const MS_DAY = 24 * 60 * 60 * 1000;

    // For last 7 days (chart)
    const last7 = new Map<string, { scans: number; users: Set<number> }>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * MS_DAY);
        const key = d.toISOString().slice(0, 10);
        last7.set(key, { scans: 0, users: new Set() });
    }

    // For all days (ATH)
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

        // last 24h
        if (diff >= 0 && diff <= MS_DAY) {
            scans24hRaw++;
            users24h.add(uid);
        }

        // all days (for ATH)
        scansPerDayAll.set(key, (scansPerDayAll.get(key) ?? 0) + 1);
        if (!usersPerDayAll.has(key)) usersPerDayAll.set(key, new Set());
        usersPerDayAll.get(key)!.add(uid);

        // last 7 days buckets
        const slot = last7.get(key);
        if (slot) {
            slot.scans++;
            slot.users.add(uid);
        }
    }

    // 24h mean
    const mean24hRaw =
        users24h.size > 0 ? scans24hRaw / users24h.size : 0;
    const mean24h = Math.round(mean24hRaw * 10) / 10;

    // last 7 days means
    const scans7d: MetricPoint[] = Array.from(last7.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { scans, users }]) => {
            const mean =
                users.size > 0 ? scans / users.size : 0;
            return {
                date,
                count: Math.round(mean * 10) / 10,
            };
        });

    // ATH mean over all days
    const means: number[] = [];
    for (const [day, scans] of scansPerDayAll.entries()) {
        const uSet = usersPerDayAll.get(day);
        const uniq = uSet?.size ?? 0;
        if (uniq > 0) {
            const m = Math.round((scans / uniq) * 10) / 10;
            means.push(m);
        }
    }
    const athDaily =
        means.length > 0 ? Math.max(...means) : mean24h;

    return {
        scans24h: mean24h,
        scans7d,
        athDaily,
    };
}

function RadialProgress({
    current,
    ath,
}: {
    current: number;
    ath: number;
}) {
    const safeAth = ath > 0 ? ath : Math.max(current, 1);
    const progress = Math.max(0, Math.min(1, current / safeAth));
    const percent = Math.round(progress * 100);

    const r = 16;
    const c = 2 * Math.PI * r;
    const dashArray = c;
    const dashOffset = c * (1 - progress);

    // explicit colors (no currentColor, no relying on text-*)
    let strokeColor = "#ef4444"; // red-500
    if (percent >= 70) strokeColor = "#22c55e"; // emerald-400
    else if (percent >= 40) strokeColor = "#facc15"; // yellow-400

    const trackColor = "#47556933"; // slate-500/20

    return (
        <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-16 h-16" aria-hidden="true">
                {/* track */}
                <circle
                    cx="20"
                    cy="20"
                    r={r}
                    strokeWidth={4}
                    stroke={trackColor}
                    fill="none"
                />
                {/* progress */}
                <circle
                    cx="20"
                    cy="20"
                    r={r}
                    strokeWidth={4}
                    stroke={strokeColor}
                    fill="none"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 20 20)"
                />
            </svg>
            <div className="mt-1 text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {current.toLocaleString()}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Today • {percent}% of ATH
                </div>
                <div className="text-[10px] text-slate-500/80">
                    ATH {safeAth.toLocaleString()} scans
                </div>
            </div>
        </div>
    );
}
type MetricCardProps = {
    title: string;
    stats: WatchStats;
    tooltipLabel?: string;
};

export function WatchMetricCard({
    title,
    stats,
    tooltipLabel,
}: MetricCardProps) {
    const points = stats.scans7d;
    const values = points.map((p) => p.count);
    const last = values.at(-1) ?? 0;
    const prev = values.at(-2) ?? 0;
    const diff = last - prev;
    const diffPct = prev > 0 ? Math.round((diff / prev) * 100) : null;
    const trendPositive = diff > 0;
    const ath = stats.athDaily;

    return (
        <div className="flex flex-col md:flex-row gap-4 items-stretch rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/80 text-slate-50 px-5 py-4">
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium text-slate-200">
                            {title}
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Last 24h
                        </span>
                    </div>
                </div>

                <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                        Last 7 days
                    </p>
                    <div className="rounded-xl bg-slate-900/60 border border-slate-700/70 px-2 py-1.5">
                        <SparklineInteractive
                            points={points}
                            label={tooltipLabel ?? title}
                        />
                    </div>
                </div>

                {diffPct !== null && (
                    <div className="mt-1 text-xs flex items-center gap-1">
                        <span
                            className={cls(
                                "inline-flex items-center gap-0.5",
                                trendPositive ? "text-emerald-400" : "text-red-400"
                            )}
                        >
                            {trendPositive ? "▲" : "▼"} {Math.abs(diffPct)}%
                        </span>
                        <span className="text-slate-500">vs previous day</span>
                    </div>
                )}
            </div>

            <div className="md:w-40 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4">
                <RadialProgress
                    current={stats.scans24h}
                    ath={ath}
                />
            </div>
        </div>
    );
}

export default WatchMetricCard;
