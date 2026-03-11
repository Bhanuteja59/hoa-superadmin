"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPostJson } from "@/lib/api";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
    Building2, Users, Plus, ArrowUpRight, Loader2, ShieldAlert,
    Search, MapPin, ArrowRight, TrendingUp, Activity, Globe,
    HeartPulse, Layers, BarChart2, Eye, MousePointer, Zap,
    Settings, ArrowUpDown, Filter, Clock, Radio, RefreshCw,
    ExternalLink, Monitor, Smartphone, Tablet, User, Wifi,
    ChevronRight, Hash,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { Label } from "@/components/ui/label";

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

function LiveDot({ color = "emerald" }: { color?: string }) {
    const cls = color === "red" ? "bg-red-400" : "bg-emerald-400";
    const clsS = color === "red" ? "bg-red-500" : "bg-emerald-500";
    return (
        <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${clsS}`} />
        </span>
    );
}

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
    const [display, setDisplay] = useState(0);
    const prev = useRef(0);
    const startTime = useRef<number | null>(null);
    useEffect(() => {
        const from = prev.current;
        startTime.current = null;
        const step = (ts: number) => {
            if (!startTime.current) startTime.current = ts;
            const p = Math.min((ts - startTime.current) / duration, 1);
            const e = 1 - (1 - p) ** 3;
            setDisplay(Math.round(from + (value - from) * e));
            if (p < 1) requestAnimationFrame(step);
            else prev.current = value;
        };
        requestAnimationFrame(step);
    }, [value]);
    return <>{display.toLocaleString()}</>;
}

function CommunityRow({ t }: { t: any }) {
    const now = new Date();
    const createdAt = t.created_at ? new Date(t.created_at) : null;
    const isNew = createdAt ? (now.getTime() - createdAt.getTime()) < 7 * 86400_000 : false;
    const fmtDate = (d: Date) => {
        const m = Math.floor((now.getTime() - d.getTime()) / 60000);
        if (m < 1) return "Just now";
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const days = Math.floor(h / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };
    return (
        <div className="group flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {t.community_type === "OWN_HOUSES" ? <MapPin className="h-5 w-5 text-violet-500" /> : <Building2 className="h-5 w-5 text-violet-500" />}
                    {isNew && <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full uppercase leading-none">NEW</span>}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                        <span className="uppercase tracking-wider">{t.community_type?.replace("_", " ")} · /{t.slug}</span>
                        {createdAt && <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{fmtDate(createdAt)}</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="hidden sm:flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Users className="h-3 w-3" /> {t.users || 0}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${t.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"}`}>{t.status}</span>
                </div>
                <Link href={`/admin/tenants/${t.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-black uppercase hover:bg-violet-500 transition-all active:scale-95 shadow-sm shadow-violet-500/20">
                    <Settings className="h-3 w-3" /> Manage
                </Link>
            </div>
        </div>
    );
}

/* ═══════════════════════════  REALTIME PANEL  ═══════════════════════════ */

function DeviceIcon({ device }: { device: string }) {
    if (device === "mobile") return <Smartphone className="h-3.5 w-3.5 text-blue-400" />;
    if (device === "tablet") return <Tablet className="h-3.5 w-3.5 text-purple-400" />;
    return <Monitor className="h-3.5 w-3.5 text-slate-400" />;
}

function timeAgo(seconds: number): string {
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}

function RealtimePanel() {
    const [activeTab, setActiveTab] = useState<"pages" | "feed" | "communities">("pages");
    const [tickSec, setTickSec] = useState(0);
    const prevActive = useRef(0);
    const [activeTrend, setActiveTrend] = useState<"up" | "down" | "same">("same");

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["admin", "realtime"],
        queryFn: () => apiGet<any>("/platform/stats/realtime"),
        refetchInterval: 10_000,
        staleTime: 8_000,
    });

    // Tick every second to animate relative timestamps
    useEffect(() => {
        const id = setInterval(() => setTickSec(s => s + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const active = data?.active_users ?? 0;
    useEffect(() => {
        if (active > prevActive.current) setActiveTrend("up");
        else if (active < prevActive.current) setActiveTrend("down");
        else setActiveTrend("same");
        prevActive.current = active;
    }, [active]);

    const rolling: any[] = data?.rolling_30min ?? [];
    const topPages: any[] = data?.top_pages_now ?? [];
    const liveFeed: any[] = data?.live_feed ?? [];
    const communities: any[] = data?.community_breakdown ?? [];
    const asOf = data?.as_of ? new Date(data.as_of).toLocaleTimeString() : "--:--";

    const maxRolling = Math.max(...rolling.map((r: any) => r.visitors), 1);
    const maxPage = Math.max(...topPages.map((p: any) => p.unique_visitors), 1);
    const maxCommunity = Math.max(...communities.map((c: any) => c.active), 1);

    const TABS = [
        { id: "pages", label: "Pages", count: topPages.length },
        { id: "feed", label: "Live Feed", count: liveFeed.length },
        { id: "communities", label: "Communities", count: communities.length },
    ] as const;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0f4c2a] via-[#0d6e40] to-[#117a4a]">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Radio className="h-5 w-5 text-white" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]" />
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-white tracking-tight">Real-Time</h2>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30 px-2 py-0.5 rounded-full">LIVE</span>
                        </div>
                        <p className="text-[11px] text-white/60 font-semibold mt-0.5">
                            Tracking all pages on{" "}
                            <a href={FRONTEND_URL} target="_blank" className="text-[#4ade80] hover:underline font-bold">{FRONTEND_URL}/**</a>
                            {" "}· auto-refresh every 10s
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-[10px] text-white/40 font-bold">Updated {asOf}</span>
                    <button onClick={() => refetch()} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <RefreshCw className={`h-4 w-4 text-white ${isFetching ? "animate-spin" : ""}`} />
                    </button>
                    <a href={FRONTEND_URL} target="_blank" className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <ExternalLink className="h-4 w-4 text-white" />
                    </a>
                </div>
            </div>

            {/* ── ACTIVE USERS HERO ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4">
                {/* Big Number */}
                <div className="flex flex-col items-center justify-center py-8 px-6 bg-gradient-to-b from-[#0f4c2a]/5 to-transparent dark:from-[#0f4c2a]/20 border-r border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Users Right Now</p>
                    <div className="relative flex items-center gap-1">
                        <div className="text-7xl font-black tabular-nums leading-none" style={{ color: activeTrend === "up" ? "#22c55e" : activeTrend === "down" ? "#f97316" : "#22c55e" }}>
                            <AnimatedNumber value={active} />
                        </div>
                        {activeTrend !== "same" && (
                            <span className={`text-2xl font-black ${activeTrend === "up" ? "text-emerald-400" : "text-orange-400"}`}>
                                {activeTrend === "up" ? "↑" : "↓"}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-2 text-center">in the last 5 minutes</p>
                    <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <Wifi className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                    </div>
                </div>

                {/* 30-min Sparkline */}
                <div className="col-span-1 lg:col-span-3 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs font-black text-slate-700 dark:text-white">Visitors per minute — last 30 minutes</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Unique by user ID or IP · Admin excluded</p>
                        </div>
                    </div>
                    {/* Custom sparkline bars */}
                    <div className="flex items-end gap-0.5 h-20 w-full">
                        {rolling.map((r: any, i: number) => {
                            const h = maxRolling > 0 ? Math.max(4, Math.round((r.visitors / maxRolling) * 100)) : 4;
                            const isCurrent = i === rolling.length - 1;
                            return (
                                <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                                    <div
                                        className={`w-full rounded-t transition-all duration-300 ${isCurrent ? "bg-emerald-400" : "bg-emerald-600/50 hover:bg-emerald-500/70"}`}
                                        style={{ height: `${h}%` }}
                                    />
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                                        <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
                                            {r.time} — {r.visitors} visitor{r.visitors !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                        <span>{rolling[0]?.time}</span>
                        <span>{rolling[Math.floor(rolling.length / 2)]?.time}</span>
                        <span>Now</span>
                    </div>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="border-t border-slate-200 dark:border-slate-700">
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
                                activeTab === tab.id
                                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === tab.id ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TAB: PAGES ── */}
                {activeTab === "pages" && (
                    <div className="p-0">
                        {topPages.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-slate-300">
                                <MousePointer className="h-8 w-8" />
                                <p className="text-sm font-medium">No page views in the last 30 minutes</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-5 py-2.5 text-left">#</th>
                                            <th className="px-5 py-2.5 text-left">Page Path</th>
                                            <th className="px-5 py-2.5 text-right">Unique Visitors</th>
                                            <th className="px-5 py-2.5 text-right">Total Views</th>
                                            <th className="px-5 py-2.5 w-40">Distribution</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topPages.map((p: any, i: number) => {
                                            const pct = Math.round((p.unique_visitors / maxPage) * 100);
                                            return (
                                                <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-5 py-3">
                                                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">#{i + 1}</span>
                                                    </td>
                                                    <td className="px-5 py-3 max-w-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-5 w-5 rounded bg-emerald-500/10 items-center justify-center shrink-0">
                                                                <Hash className="h-2.5 w-2.5 text-emerald-500" />
                                                            </span>
                                                            <a
                                                                href={`${FRONTEND_URL}${p.path}`}
                                                                target="_blank"
                                                                className="font-mono text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group-hover:underline decoration-dashed underline-offset-2"
                                                            >
                                                                {p.path}
                                                            </a>
                                                            <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{p.unique_visitors.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{p.views.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: LIVE FEED ── */}
                {activeTab === "feed" && (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/50 max-h-96 overflow-y-auto">
                        {liveFeed.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-slate-300">
                                <Activity className="h-8 w-8" />
                                <p className="text-sm font-medium">No recent activity</p>
                            </div>
                        ) : liveFeed.map((ev: any) => {
                            const secAgo = ev.seconds_ago + tickSec; // ticks up client-side
                            return (
                                <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    {/* Device */}
                                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <DeviceIcon device={ev.device} />
                                    </div>
                                    {/* Path */}
                                    <div className="flex-1 min-w-0">
                                        <a
                                            href={`${FRONTEND_URL}${ev.path}`}
                                            target="_blank"
                                            className="font-mono text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 truncate block group-hover:underline decoration-dashed underline-offset-2"
                                        >
                                            {ev.path}
                                        </a>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {ev.is_authenticated ? (
                                                <span className="flex items-center gap-1 text-[10px] text-violet-500 font-bold">
                                                    <User className="h-2.5 w-2.5" />
                                                    {ev.user_name || "Member"}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium">Anonymous · {ev.ip}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Time */}
                                    <div className="text-right shrink-0">
                                        <span className={`text-[10px] font-bold ${
                                            secAgo < 30 ? "text-emerald-500" : "text-slate-400"
                                        }`}>
                                            {timeAgo(secAgo)}
                                        </span>
                                    </div>
                                    {/* Live indicator for very recent */}
                                    {secAgo < 15 && (
                                        <span className="relative flex h-2 w-2 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TAB: COMMUNITIES ── */}
                {activeTab === "communities" && (
                    <div className="p-5">
                        {communities.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-slate-300">
                                <Building2 className="h-8 w-8" />
                                <p className="text-sm font-medium">No community activity in last 5 minutes</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {communities.map((c: any, i: number) => {
                                    const pct = Math.round((c.active / maxCommunity) * 100);
                                    return (
                                        <div key={c.tenant_id || i} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-600 font-black">{c.active}</span>
                                                    <span className="text-slate-400 font-medium">active</span>
                                                </div>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                    Tracking: all subpaths of <code className="font-mono text-emerald-600 dark:text-emerald-400">{FRONTEND_URL}/**</code> · Platform admins excluded
                </span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {asOf}
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════  HISTORICAL ANALYTICS  ═══════════════════════════ */
function HistoricalAnalytics() {
    const [days, setDays] = useState<7 | 14 | 30 | 90>(7);

    const { data: analytics, isLoading } = useQuery({
        queryKey: ["admin", "analytics", days],
        queryFn: () => apiGet<any>(`/platform/stats/analytics?days=${days}`),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    const timeline: any[] = analytics?.timeline ?? [];
    const totalVisitors = analytics?.total_visitors ?? 0;
    const avgDaily = timeline.length > 0 ? Math.round(totalVisitors / timeline.length) : 0;
    const peakDay = timeline.reduce((b: any, t: any) => (!b || t.visitors > b.visitors ? t : b), null);
    const totalPageViews = analytics?.top_pages?.reduce((s: number, p: any) => s + p.count, 0) ?? 0;

    const DATE_RANGES = [{ label: "7D", value: 7 }, { label: "14D", value: 14 }, { label: "30D", value: 30 }, { label: "90D", value: 90 }] as const;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg shadow-black/20">
                        <BarChart2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Website Analytics</h2>
                        <p className="text-[11px] text-white/70 font-semibold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-white" /></span>
                            Historical · {FRONTEND_URL}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/15 backdrop-blur-sm">
                    {DATE_RANGES.map((r) => (
                        <button key={r.value} onClick={() => setDays(r.value as any)}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${days === r.value ? "bg-white text-violet-700 shadow-lg" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200 dark:border-slate-700">
                {[
                    { icon: Eye, label: "Unique Visitors", value: totalVisitors, sub: `Last ${days} days`, color: "from-violet-500 to-indigo-500", text: "text-violet-600 dark:text-violet-400" },
                    { icon: TrendingUp, label: "Avg. Per Day", value: avgDaily, sub: "Daily average", color: "from-blue-500 to-cyan-500", text: "text-blue-600 dark:text-blue-400" },
                    { icon: Activity, label: "Peak Day", value: peakDay?.visitors ?? 0, sub: peakDay ? new Date(peakDay.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No data", color: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-400" },
                    { icon: MousePointer, label: "Total Page Views", value: totalPageViews, sub: "Tracked paths", color: "from-amber-500 to-orange-500", text: "text-amber-600 dark:text-amber-400" },
                ].map((kpi, i) => (
                    <div key={i} className="flex items-center gap-3 p-5 border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shrink-0 shadow-md`}>
                            <kpi.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{kpi.label}</p>
                            <div className={`text-2xl font-black leading-tight ${kpi.text}`}>
                                {isLoading ? <Skeleton className="h-7 w-14 mt-0.5" /> : <AnimatedNumber value={kpi.value} />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{kpi.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart + breakdown */}
            <div className="p-6">
                <div className="h-72 w-full">
                    {isLoading ? (
                        <div className="h-full w-full flex items-end gap-2 pb-8 px-4">
                            {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-violet-200 to-violet-100 dark:from-violet-900/40 dark:to-violet-800/20 rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
                                    tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-US", days <= 14 ? { weekday: "short", day: "numeric" } : { month: "short", day: "numeric" })}
                                    interval={days === 7 ? 0 : days === 14 ? 1 : 4}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} width={30} />
                                <Tooltip
                                    cursor={{ stroke: "#7c3aed", strokeWidth: 1.5, strokeDasharray: "4 3" }}
                                    contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "14px", color: "#fff", fontSize: "13px", fontWeight: "bold", padding: "10px 16px" }}
                                    itemStyle={{ color: "#a78bfa" }}
                                    labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                                    formatter={(v: any) => [`${Number(v).toLocaleString()} unique visitors`, ""]}
                                />
                                <Area type="monotone" dataKey="visitors" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#vGrad)"
                                    dot={(props: any) => <circle key={`d-${props.cx}`} cx={props.cx} cy={props.cy} r={3} fill="#7c3aed" opacity={0.8} />}
                                    activeDot={{ r: 7, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2.5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <p className="text-center text-[10px] text-slate-400 font-semibold mt-2">
                    Unique visitors per day · Super-admin excluded · Tracking: <a href={FRONTEND_URL} target="_blank" className="text-violet-500 hover:underline">{FRONTEND_URL}</a>
                </p>
            </div>

            {/* Top pages + Geo */}
            <div className="grid sm:grid-cols-2 border-t border-slate-200 dark:border-slate-700">
                <div className="p-6 border-r border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MousePointer className="h-4 w-4 text-violet-500" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Top Pages</h3>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5 rounded-full">Unique Visitors</span>
                    </div>
                    <div className="overflow-y-auto max-h-48 space-y-2">
                        {isLoading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />) :
                            analytics?.top_pages?.length > 0 ? analytics.top_pages.map((page: any, idx: number) => {
                                const maxC = analytics.top_pages[0]?.count || 1;
                                const pct = Math.round((page.count / maxC) * 100);
                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs min-w-0">
                                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                                <span className="text-[10px] font-black text-slate-300 w-4 shrink-0">#{idx + 1}</span>
                                                <a href={`${FRONTEND_URL}${page.path}`} target="_blank" className="truncate font-bold text-slate-700 dark:text-slate-200 font-mono text-[11px] hover:text-violet-600 transition-colors">{page.path}</a>
                                            </div>
                                            <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 font-black ml-2 shrink-0">{page.count}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-xs text-slate-400 text-center py-8">No page data for this period</p>
                        }
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-indigo-500" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Geographic</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{analytics?.locations?.length ?? 0} regions</span>
                    </div>
                    <div className="overflow-y-auto max-h-48 space-y-4">
                        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />) :
                            analytics?.locations?.length > 0 ? analytics.locations.map((loc: any, idx: number) => {
                                const pct = totalVisitors > 0 ? Math.round((loc.value / totalVisitors) * 100) : 0;
                                const gColors = ["from-violet-500 to-indigo-500", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500"];
                                const name = loc.name === "Local Network" ? "India (Local)" : loc.name;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-200">{name}</span></div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-slate-600 dark:text-slate-300">{loc.value.toLocaleString()}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-black text-slate-500">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div className={`h-full bg-gradient-to-r ${gColors[idx % gColors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-xs text-slate-400 text-center py-8">Locations appear as visitors arrive</p>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════  MAIN DASHBOARD  ═══════════════════════════ */
export default function AdminDashboardPage() {
    const qc = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
    const [provisionForm, setProvisionForm] = useState<any>({ name: "", admin_email: "", admin_name: "", admin_password: "", community_type: "APARTMENTS" });
    const [provisionError, setProvisionError] = useState("");
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);

    const { data: statsData, isLoading: isStatsLoading } = useQuery({
        queryKey: ["admin", "stats", "overview"],
        queryFn: () => apiGet<any>("/platform/stats/overview"),
        refetchInterval: 30_000,
        staleTime: 20_000,
    });
    const { data: detailedData, isLoading: isDetailedLoading } = useQuery({
        queryKey: ["admin", "stats", "detailed"],
        queryFn: () => apiGet<any>("/platform/stats/detailed"),
        refetchInterval: 30_000,
        staleTime: 20_000,
    });
    const { data: tenants, isLoading: isTenantsLoading } = useQuery({
        queryKey: ["admin", "tenants"],
        queryFn: () => apiGet<any[]>("/platform/tenants"),
        refetchInterval: 30_000,
        staleTime: 20_000,
    });

    const stats = statsData || { total_communities: 0, active_communities: 0, total_users: 0, total_buildings: 0 };
    const detailed = detailedData?.communities || [];
    const totalMaintenance = detailed.reduce((a: number, c: any) => a + (c.maintenance || 0), 0);
    const totalViolations = detailed.reduce((a: number, c: any) => a + (c.violations || 0), 0);
    const totalARC = detailed.reduce((a: number, c: any) => a + (c.arc || 0), 0);
    const maxVal = Math.max(totalMaintenance, totalViolations, totalARC) || 1;

    const now = new Date();
    const newThisWeek = (tenants || []).filter((t: any) => t.created_at && new Date(t.created_at) >= new Date(now.getTime() - 7 * 86400_000)).length;

    const filtered = (tenants || []).filter((t: any) => {
        const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchSearch) return false;
        if (dateFilter !== "all" && t.created_at) {
            const created = new Date(t.created_at);
            if (dateFilter === "today") { const s = new Date(now); s.setHours(0, 0, 0, 0); if (created < s) return false; }
            else if (dateFilter === "week") { if (created < new Date(now.getTime() - 7 * 86400_000)) return false; }
            else if (dateFilter === "month") { if (created < new Date(now.getTime() - 30 * 86400_000)) return false; }
        }
        return true;
    }).map((t: any) => {
        const d = detailed.find((c: any) => c.id === t.id) || {};
        return { ...t, ...d };
    }).sort((a: any, b: any) => {
        if (sortBy === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        if (sortBy === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        if (sortBy === "az") return a.name.localeCompare(b.name);
        return b.name.localeCompare(a.name);
    });

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisionError("");
        setIsProvisioning(true);
        try {
            await apiPostJson("/platform/tenants", provisionForm);
            qc.invalidateQueries({ queryKey: ["admin", "tenants"] });
            qc.invalidateQueries({ queryKey: ["admin", "stats", "overview"] });
            setProvisionDialogOpen(false);
            setProvisionForm({ name: "", admin_email: "", admin_name: "", admin_password: "", community_type: "APARTMENTS" });
        } catch (err: any) {
            setProvisionError(err.message || "Failed to provision community");
        } finally {
            setIsProvisioning(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 min-h-screen" id="admin-dashboard">

            {/* ── REAL-TIME PANEL ── */}
            <RealtimePanel />

            {/* ── HISTORICAL ANALYTICS ── */}
            <HistoricalAnalytics />

            {/* ── PLATFORM CONTROL HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Platform Control</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-violet-400" /> Global infrastructure monitoring
                    </p>
                </div>
                <Dialog open={provisionDialogOpen} onOpenChange={setProvisionDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold shadow-xl shadow-violet-500/20 transition-all hover:scale-105">
                            <Plus className="h-4 w-4" /> Provision Community
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 sm:max-w-md shadow-2xl p-0 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-700">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Provision Community</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Create a new tenant instance</DialogDescription>
                            </DialogHeader>
                        </div>
                        <form onSubmit={handleProvision} className="p-6 space-y-4">
                            {[
                                { label: "Community Name", field: "name", type: "text", placeholder: "e.g. Sunset Heights" },
                                { label: "Admin Email", field: "admin_email", type: "email", placeholder: "admin@example.com" },
                                { label: "Admin Full Name", field: "admin_name", type: "text", placeholder: "Full Name" },
                                { label: "Admin Password", field: "admin_password", type: "password", placeholder: "••••••••" },
                            ].map((f) => (
                                <div key={f.field} className="space-y-1.5">
                                    <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">{f.label}</Label>
                                    <input required type={f.type} placeholder={f.placeholder}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 ring-violet-500/20 outline-none transition-all"
                                        value={provisionForm[f.field]}
                                        onChange={(e) => setProvisionForm({ ...provisionForm, [f.field]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Community Type</Label>
                                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold outline-none"
                                    value={provisionForm.community_type}
                                    onChange={(e) => setProvisionForm({ ...provisionForm, community_type: e.target.value })}>
                                    <option value="APARTMENTS">Apartments</option>
                                    <option value="OWN_HOUSES">Houses</option>
                                </select>
                            </div>
                            {provisionError && <p className="text-xs text-rose-600 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{provisionError}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setProvisionDialogOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                                <button disabled={isProvisioning} type="submit" className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-500/20 transition-all disabled:opacity-50">
                                    {isProvisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deploy"}
                                </button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── PLATFORM STAT CARDS ── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Total Communities", value: stats.total_communities, sub: "Across all tenants", icon: Building2, href: "/admin/communities", from: "from-violet-600", to: "to-indigo-600" },
                    { label: "Community Health", value: `${stats.active_communities}/${stats.total_communities}`, sub: "Active instances", icon: HeartPulse, href: "/admin/health", from: "from-rose-500", to: "to-pink-600" },
                    { label: "Platform Users", value: stats.total_users, sub: "Global registered users", icon: Users, href: "/admin/users", from: "from-blue-600", to: "to-cyan-600" },
                    { label: "Buildings", value: stats.total_buildings, sub: "Registered structures", icon: Layers, href: "/admin/buildings", from: "from-amber-500", to: "to-orange-600" },
                ].map((card, i) => (
                    <Link key={i} href={card.href} className="group block">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-sm cursor-pointer">
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.from} ${card.to} opacity-0 dark:opacity-90 transition-opacity`} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.from} ${card.to} flex items-center justify-center shadow-lg`}>
                                        <card.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                {isStatsLoading ? <Skeleton className="h-10 w-20 mb-2" /> : <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{card.value}</div>}
                                <p className="text-xs text-slate-700 dark:text-white font-bold opacity-80">{card.label}</p>
                                <p className="text-[10px] text-slate-400 dark:text-white/60 font-semibold mt-0.5 uppercase tracking-wide">{card.sub}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* ── SYSTEM DYNAMICS + QUICK LINKS + STATUS ── */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">System Dynamics</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Global Cluster Status</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                    </div>
                    {isDetailedLoading ? <div className="space-y-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : (
                        <div className="space-y-5">
                            {[
                                { label: "Maintenance Backlog", value: totalMaintenance, color: "bg-blue-500" },
                                { label: "Policy Violations", value: totalViolations, color: "bg-amber-500" },
                                { label: "Structure Requests", value: totalARC, color: "bg-emerald-500" },
                            ].map((s) => (
                                <div key={s.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">{s.label}</span>
                                        <span className="text-slate-900 dark:text-white font-bold">{s.value}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${maxVal > 0 ? Math.round((s.value / maxVal) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/admin/health" className="flex items-center gap-2 group w-fit">
                        <span className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Health Registry</span>
                        <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-sm">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Direct Access</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Jump to Operational Nodes</p>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: "Analytics Center", sub: "Flow & Graphs", href: "/admin/analytics", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border-blue-200 dark:border-blue-800/40" },
                            { label: "Community Status", sub: "Health Monitoring", href: "/admin/health", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 border-rose-200 dark:border-rose-800/40" },
                            { label: "Structure Registry", sub: "Buildings & Units", href: "/admin/buildings", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 border-amber-200 dark:border-amber-800/40" },
                            { label: "Personnel Hub", sub: "User Management", href: "/admin/users", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800/40" },
                        ].map((l) => (
                            <Link key={l.href} href={l.href} className={`flex items-center justify-between p-3 rounded-xl border ${l.bg} transition-all group`}>
                                <div>
                                    <div className={`text-sm font-semibold ${l.color}`}>{l.label}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{l.sub}</div>
                                </div>
                                <ArrowRight className={`h-4 w-4 ${l.color} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">System Status</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Live platform health</p>
                        </div>
                        <Globe className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: "API Gateway", status: "Operational", ok: true },
                            { label: "Database", status: statsData ? "Operational" : "Checking…", ok: !!statsData },
                            { label: "Auth Service", status: "Operational", ok: true },
                            { label: "File Storage", status: "Operational", ok: true },
                            { label: "Communities", status: statsData ? `${statsData.active_communities ?? 0} active` : "Checking…", ok: !!statsData && statsData.active_communities > 0 },
                            { label: "Frontend App", status: "Running", ok: true },
                        ].map((s) => (
                            <div key={s.label} className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                                    <span className={`text-xs font-semibold ${s.ok ? "text-emerald-500" : "text-amber-500"}`}>{s.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <a href={FRONTEND_URL} target="_blank" className="flex items-center gap-1.5 text-[10px] text-violet-500 hover:underline font-bold">
                            <ExternalLink className="h-3 w-3" /> Open Frontend App
                        </a>
                    </div>
                </div>
            </div>

            {/* ── COMMUNITY REGISTRY ── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Community Registry</h3>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                All provisioned tenant environments
                                {newThisWeek > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">+{newThisWeek} new this week</span>}
                            </p>
                        </div>
                        <div className="relative w-full sm:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search communities…"
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ring-violet-500/20 transition-all" />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
                            {(["all", "today", "week", "month"] as const).map((df) => (
                                <button key={df} onClick={() => setDateFilter(df)}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all ${dateFilter === df ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                                    {df === "all" ? "All Time" : df === "today" ? "Today" : df === "week" ? "This Week" : "This Month"}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-1.5">
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort:</span>
                            {(["newest", "oldest", "az", "za"] as const).map((s) => (
                                <button key={s} onClick={() => setSortBy(s)}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all ${sortBy === s ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                                    {s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : s === "az" ? "A→Z" : "Z→A"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {isTenantsLoading || isDetailedLoading ? (
                        <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
                                <Skeleton className="h-8 w-20 rounded-lg" />
                            </div>
                        ))}</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 flex flex-col items-center gap-3 text-slate-300 dark:text-slate-600">
                            <Building2 className="h-10 w-10" />
                            <p className="text-sm font-medium text-slate-400">No communities found</p>
                        </div>
                    ) : filtered.map((t: any) => <CommunityRow key={t.id} t={t} />)}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">{filtered.length} communities shown</span>
                    <Link href="/admin/communities" className="text-xs text-violet-600 font-black hover:underline flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
                </div>
            </div>
        </div>
    );
}
