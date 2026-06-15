"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Trend, TrendCategory, Region, ResourceType } from "@/types/trend";
import { discoverTrendsClient } from "@/lib/discover-client";
import { fetchCompetitorsClient } from "@/lib/competitors-client";
import type { CompetitorRef } from "@/lib/competitors-client";

// ============ Types ============

// CompetitorRef imported from lib/competitors-client

type MainTab = "trends" | "competitors";

// ============ Constants ============

const CATEGORY_LABELS: Record<TrendCategory, string> = {
  meme: "🔥 网络热梗",
  film_tv: "🎬 爆火影视",
  festival: "🎊 节日假期",
  culture: "🌏 文化特色",
  big_event: "📢 巨大事件",
  pop_element: "✨ 流行元素",
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  character_skin: "角色皮肤",
  weapon_skin: "枪皮",
  weapon_charm: "挂件",
  finisher: "处决动作",
  emote: "表情/动作",
  spray: "喷漆",
  lobby_theme: "大厅主题",
  event_bundle: "活动礼包",
  parachute_skin: "降落伞",
  vehicle_skin: "载具皮肤",
  playpal: "盘盘",
};

const SCORE_LABELS = ["品类亲和", "改造成本", "手游适配", "受众匹配", "新鲜度", "市场热度"] as const;

const GAME_COLORS: Record<CompetitorRef["game"], string> = {
  "Free Fire": "#FF6B00",
  "PUBG Mobile": "#F2A900",
  "CODM": "#1B1B1B",
  "Apex Legends": "#DA292A",
};

// ============ Helpers ============

function formatNum(n?: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function scoreColor(score: number): string {
  if (score >= 4) return "bg-emerald-500";
  if (score >= 3) return "bg-amber-400";
  return "bg-red-400";
}

function scoreTextColor(score: number): string {
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-red-500";
}

function totalBadgeClass(total: number): string {
  if (total >= 24) return "text-emerald-700 bg-emerald-100 border-emerald-300";
  if (total >= 20) return "text-amber-700 bg-amber-100 border-amber-300";
  return "text-orange-700 bg-orange-100 border-orange-300";
}

function categoryIcon(cat: TrendCategory): string {
  const m: Record<TrendCategory, string> = {
    meme: "🔥", film_tv: "🎬", festival: "🎊", culture: "🌏", big_event: "📢", pop_element: "✨",
  };
  return m[cat] || "🔥";
}

// ============ Main Component ============

export function TrendDashboard() {
  const [mainTab, setMainTab] = useState<MainTab>("trends");
  const [region, setRegion] = useState<Region>("SEA");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [compLoading, setCompLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compError, setCompError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<TrendCategory | "all">("all");
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  // Fetch trends (client-side)
  const fetchTrends = useCallback(async (r: Region) => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverTrendsClient(r);
      setTrends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch competitors (client-side)
  const fetchCompetitors = useCallback(async (r: Region) => {
    setCompLoading(true);
    setCompError(null);
    try {
      const data = await fetchCompetitorsClient(r);
      setCompetitors(data);
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setCompLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "trends") {
      fetchTrends(region);
    } else {
      fetchCompetitors(region);
    }
  }, [region, mainTab, fetchTrends, fetchCompetitors]);

  const filtered = filterCat === "all" ? trends : trends.filter((t) => t.category === filterCat);

  // Export handler (client-side markdown generation)
  const handleExport = (trend: Trend) => {
    const md = generateExportMarkdown(trend);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trend.title.slice(0, 25).replace(/[/\\?%*:|"<>]/g, "_")}_创意文档.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            <span className="text-orange-500">Bloodstrike</span> 热梗资源雷达
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            自动抓取全网热梗 → 合规评估 → 智能评分 → 一键生成创意文档（含 AI 生图 Prompt）
          </p>
        </header>

        {/* Main tabs */}
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3">
          <button
            onClick={() => setMainTab("trends")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${mainTab === "trends" ? "bg-orange-500 text-white shadow" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"}`}
          >
            🔥 热梗雷达
          </button>
          <button
            onClick={() => setMainTab("competitors")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${mainTab === "competitors" ? "bg-orange-500 text-white shadow" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"}`}
          >
            🎮 竞品参考
          </button>

          {/* Region switch (shared) */}
          <div className="ml-auto flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setRegion("SEA")}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${region === "SEA" ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              🌏 东南亚
            </button>
            <button
              onClick={() => setRegion("LATAM")}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${region === "LATAM" ? "bg-orange-500 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              🌎 拉美
            </button>
          </div>
        </div>

        {/* ====== TRENDS TAB ====== */}
        {mainTab === "trends" && (
          <>
            {/* Category filter + refresh */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterCat("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterCat === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}
              >
                全部
              </button>
              {(Object.entries(CATEGORY_LABELS) as [TrendCategory, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterCat(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterCat === key ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => fetchTrends(region)}
                disabled={loading}
                className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {loading ? "⏳ 抓取中..." : "🔄 刷新数据"}
              </button>
            </div>

            {/* Stats */}
            {!loading && trends.length > 0 && (
              <p className="mb-4 text-sm text-gray-500">
                共发现 <span className="font-bold text-gray-900">{trends.length}</span> 条热梗
                {filterCat !== "all" && <span>，当前筛选 <span className="font-bold">{filtered.length}</span> 条</span>}
              </p>
            )}

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton />}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                ⚠️ {error}
                <button onClick={() => fetchTrends(region)} className="ml-3 underline">重试</button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                <p className="text-4xl mb-2">🔍</p>
                <p>暂无符合条件的热梗数据</p>
              </div>
            )}

            {/* Card grid */}
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((trend) => (
                  <TrendCard
                    key={trend.id}
                    trend={trend}
                    onClick={() => setSelectedTrend(trend)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ====== COMPETITORS TAB ====== */}
        {mainTab === "competitors" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              竞品射击游戏中参考了流行热梗/文化的活跃资源案例（Free Fire / PUBG Mobile / CODM / Apex Legends）
            </p>

            {compLoading && <LoadingSkeleton />}

            {compError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                ⚠️ {compError}
                <button onClick={() => fetchCompetitors(region)} className="ml-3 underline">重试</button>
              </div>
            )}

            {!compLoading && !compError && competitors.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                <p className="text-4xl mb-2">🎮</p>
                <p>暂无竞品参考数据</p>
              </div>
            )}

            {!compLoading && competitors.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {competitors.map((comp) => (
                  <CompetitorCard key={comp.id} data={comp} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrend && (
        <TrendDetailModal
          trend={selectedTrend}
          onClose={() => setSelectedTrend(null)}
          onExport={() => handleExport(selectedTrend)}
        />
      )}
    </div>
  );
}

// ============ Trend Card ============

function TrendCard({ trend, onClick }: { trend: Trend; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const hasImg = !imgErr && !!trend.thumbnailUrl;

  return (
    <div
      onClick={onClick}
      className="group flex flex-col rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-200 transition cursor-pointer overflow-hidden"
    >
      {/* Image area */}
      <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
        {hasImg ? (
          <img
            src={trend.thumbnailUrl}
            alt={trend.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600">
            <span className="text-5xl opacity-80">{categoryIcon(trend.category)}</span>
          </div>
        )}
        {/* Overlays */}
        <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white font-medium">
          {trend.platform === "youtube" ? "▶ YouTube" : trend.platform === "tiktok" ? "♪ TikTok" : trend.platform === "reddit" ? "💬 Reddit" : "📰 News"}
        </div>
        <div className={`absolute top-2 right-2 rounded border px-2 py-0.5 text-xs font-bold ${totalBadgeClass(trend.scores.total)}`}>
          {trend.scores.total}/30
        </div>
        <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
          {CATEGORY_LABELS[trend.category]}
        </div>
        {trend.complianceNote && (
          <div className="absolute bottom-2 right-2 rounded bg-yellow-400/90 px-1.5 py-0.5 text-xs font-bold" title={trend.complianceNote}>
            ⚠️
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors">
          {trend.title}
        </h3>

        {/* Summary - show 3-4 lines */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">
          {trend.summary}
        </p>
        <p className="text-[11px] text-orange-500 font-medium">
          点击查看完整分析 →
        </p>

        {/* Resource suggestion */}
        <p className="text-xs font-semibold text-orange-600 mt-auto pt-1 border-t border-gray-50">
          💡 {trend.resourceSuggestion}
        </p>

        {/* Engagement */}
        {trend.engagement?.views && (
          <p className="text-[10px] text-gray-400">
            👁 {formatNum(trend.engagement.views)} 观看
            {trend.engagement.likes ? ` · ❤️ ${formatNum(trend.engagement.likes)}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ============ Detail Modal ============

function TrendDetailModal({
  trend,
  onClose,
  onExport,
}: {
  trend: Trend;
  onClose: () => void;
  onExport: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [imgErr, setImgErr] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const dimValues = [
    trend.scores.categoryAffinity,
    trend.scores.adaptationCost,
    trend.scores.mobileFit,
    trend.scores.audienceMatch,
    trend.scores.freshness,
    trend.scores.marketHeat,
  ];

  const hasImg = !imgErr && !!trend.thumbnailUrl;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/50 hover:bg-black/70 text-white w-8 h-8 flex items-center justify-center text-lg transition"
        >
          ✕
        </button>

        {/* Hero image */}
        <div className="relative w-full aspect-video bg-gray-100">
          {hasImg ? (
            <img
              src={trend.thumbnailUrl}
              alt={trend.title}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600">
              <span className="text-7xl opacity-80">{categoryIcon(trend.category)}</span>
            </div>
          )}
          {/* Score overlay */}
          <div className={`absolute bottom-3 right-3 rounded-lg border px-3 py-1 text-sm font-bold ${totalBadgeClass(trend.scores.total)}`}>
            综合评分 {trend.scores.total}/30
          </div>
          {/* Category + Platform */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
              {CATEGORY_LABELS[trend.category]}
            </span>
            <span className="rounded bg-black/70 px-2 py-0.5 text-xs text-white font-medium">
              {trend.platform === "youtube" ? "▶ YouTube" : trend.platform === "tiktok" ? "♪ TikTok" : trend.platform === "reddit" ? "💬 Reddit" : "📰 News"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{trend.title}</h2>

          {/* Compliance warning */}
          {trend.complianceNote && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              <span className="font-bold">⚠️ 合规提示：</span> {trend.complianceNote}
            </div>
          )}

          {/* Full summary - NO TRUNCATION */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">📝 热点分析</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{trend.summary}</p>
          </div>

          {/* 6-dimension scores */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">📊 六维评分</h3>
            <div className="grid grid-cols-2 gap-3">
              {SCORE_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${scoreColor(dimValues[i])} transition-all`} style={{ width: `${dimValues[i] * 20}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${scoreTextColor(dimValues[i])}`}>{dimValues[i]}/5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resource suggestion */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">💡 资源转化建议</h3>
            <p className="text-sm text-orange-600 font-semibold">{trend.resourceSuggestion}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {trend.suggestedResourceTypes.map((rt) => (
                <span key={rt} className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-medium">
                  {RESOURCE_LABELS[rt] || rt}
                </span>
              ))}
            </div>
          </div>

          {/* Engagement */}
          {trend.engagement && (trend.engagement.views || trend.engagement.likes) && (
            <div className="flex gap-4 text-xs text-gray-500">
              {trend.engagement.views && <span>👁 {formatNum(trend.engagement.views)} 观看</span>}
              {trend.engagement.likes && <span>❤️ {formatNum(trend.engagement.likes)} 点赞</span>}
              {trend.engagement.shares && <span>🔁 {formatNum(trend.engagement.shares)} 分享</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition shadow-sm"
            >
              📄 生成创意文档
            </button>
            <a
              href={trend.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-400 transition"
            >
              查看原文 ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Competitor Card ============

function CompetitorCard({ data }: { data: CompetitorRef }) {
  const [imgErr, setImgErr] = useState(false);
  const color = GAME_COLORS[data.game] || "#666";

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
        {!imgErr && data.thumbnailUrl ? (
          <img
            src={data.thumbnailUrl}
            alt={data.title}
            className="h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
            <span className="text-4xl opacity-60">🎮</span>
          </div>
        )}
        {/* Game badge */}
        <div
          className="absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {data.game}
        </div>
        {/* Resource type */}
        <div className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
          {data.resourceType}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{data.title}</h3>
        <p className="text-xs italic text-purple-600">参考了: {data.trendReference}</p>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{data.description}</p>

        {data.publishedAt && (
          <p className="text-[10px] text-gray-400 mt-auto">
            {new Date(data.publishedAt).toLocaleDateString("zh-CN")}
          </p>
        )}

        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-xs text-orange-500 hover:text-orange-700 font-medium"
        >
          查看来源 ↗
        </a>
      </div>
    </div>
  );
}

// ============ Loading Skeleton ============

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-white p-0 shadow-sm overflow-hidden">
          <div className="aspect-video w-full bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Export Markdown Generator ============

const RT_LABELS: Record<ResourceType, string> = {
  character_skin: "角色皮肤",
  weapon_skin: "枪皮",
  weapon_charm: "挂件",
  finisher: "处决动作",
  emote: "表情/动作",
  spray: "喷漆",
  lobby_theme: "大厅主题",
  event_bundle: "活动礼包",
  parachute_skin: "降落伞皮肤",
  vehicle_skin: "载具皮肤",
  playpal: "盘盘(PlayPal)",
};

function generateExportMarkdown(trend: Trend): string {
  const lines: string[] = [];
  lines.push(`# \uD83C\uDFAF ${trend.title}`);
  lines.push("");
  lines.push(`> **平台**: ${trend.platform} | **地区**: ${trend.region === "SEA" ? "东南亚" : "拉美"} | **分类**: ${trend.category}`);
  if (trend.publishedAt) {
    lines.push(`> **时间**: ${new Date(trend.publishedAt).toLocaleDateString("zh-CN")}`);
  }
  lines.push("");
  lines.push("## \uD83D\uDCDD 热点简介");
  lines.push("");
  lines.push(trend.summary || trend.title);
  lines.push("");
  if (trend.thumbnailUrl) {
    lines.push("## \uD83D\uDDBC\uFE0F 参考图片");
    lines.push("");
    lines.push(`![${trend.title}](${trend.thumbnailUrl})`);
    lines.push("");
  }
  lines.push(`## \uD83D\uDCCA 评分（总分: ${trend.scores.total}/30）`);
  lines.push("");
  lines.push("| 维度 | 分数 |");
  lines.push("|------|------|");
  lines.push(`| 品类亲和度 | ${trend.scores.categoryAffinity}/5 |`);
  lines.push(`| 改造成本 | ${trend.scores.adaptationCost}/5 |`);
  lines.push(`| 手游适配性 | ${trend.scores.mobileFit}/5 |`);
  lines.push(`| 受众匹配 | ${trend.scores.audienceMatch}/5 |`);
  lines.push(`| 新鲜度 | ${trend.scores.freshness}/5 |`);
  lines.push(`| 市场热度 | ${trend.scores.marketHeat}/5 |`);
  lines.push("");
  lines.push("## \uD83C\uDFAE 资源推荐");
  lines.push("");
  lines.push(`**${trend.resourceSuggestion}**`);
  lines.push("");
  for (const rt of trend.suggestedResourceTypes) {
    lines.push(`- ${RT_LABELS[rt] || rt}`);
  }
  lines.push("");
  if (trend.complianceNote) {
    lines.push("## \u26A0\uFE0F 合规提示");
    lines.push("");
    lines.push(trend.complianceNote);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(`**原文链接**: [${trend.sourceUrl}](${trend.sourceUrl})`);
  lines.push("");
  lines.push(`*由 Bloodstrike 热梗资源雷达生成 | ${new Date().toLocaleString("zh-CN")}*`);
  return lines.join("\n");
}
