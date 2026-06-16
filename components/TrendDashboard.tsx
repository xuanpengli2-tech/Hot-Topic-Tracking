"use client";

import { useEffect, useState } from "react";

interface Scores {
  categoryAffinity: number;
  adaptationCost: number;
  mobileFit: number;
  audienceMatch: number;
  freshness: number;
  marketHeat: number;
  total: number;
}

interface PromptSet {
  type: string;
  label: string;
  prompt: string;
}

interface Report {
  id: string;
  date: string;
  category?: string;
  game?: string;
  title: string;
  memeIntro?: string;
  highlights: string;
  summary: string;
  sourceUrl: string;
  imageUrl?: string;
  resourceImageUrl?: string;
  sourceMetric?: string;
  scores?: Scores;
  resourceTypes?: string[];
  imagePrompt?: string;
  promptSets?: PromptSet[];
}

interface ReportData {
  trends: { SEA: Report[]; LATAM: Report[] };
  competitors: { SEA: Report[]; LATAM: Report[] };
  meta: { lastUpdate: string; totalTrends: number; totalCompetitors: number };
}

type MainTab = "trends" | "competitors";

const SCORE_LABELS: Record<keyof Scores, string> = {
  categoryAffinity: "品类契合",
  adaptationCost: "改编成本",
  mobileFit: "移动适配",
  audienceMatch: "受众匹配",
  freshness: "新鲜度",
  marketHeat: "市场热度",
  total: "综合分",
};

const RESOURCE_LABELS: Record<string, string> = {
  character_skin: "角色皮肤",
  weapon_skin: "枪械皮肤",
  weapon_charm: "武器挂饰",
  finisher: "终结技",
  emote: "表情动作",
  spray: "喷漆",
  lobby_theme: "大厅主题",
  event_bundle: "活动礼包",
  parachute_skin: "降落伞",
  vehicle_skin: "载具皮肤",
  playpal: "战斗伙伴",
};

function getCoverLabel(report: Report) {
  if (report.sourceUrl.includes("tiktok.com")) return "TikTok";
  if (report.sourceUrl.includes("youtube.com") || report.sourceUrl.includes("youtu.be")) return "YouTube";
  if (report.sourceUrl.includes("reddit.com")) return "Reddit";
  return "Trend Source";
}

function getAssetSrc(url?: string) {
  if (!url) return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return url.startsWith("/") ? `${basePath}${url}` : url;
}

function getPromptSets(report: Report): PromptSet[] {
  if (report.promptSets?.length) return report.promptSets;
  if (!report.imagePrompt) return [];
  return [{ type: "legacy", label: "AI绘图提示词", prompt: report.imagePrompt }];
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value * 10, 100);
  const color = value >= 8 ? "#4ade80" : value >= 6 ? "#fbbf24" : "#f87171";
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-value">{value}</span>
    </div>
  );
}

export default function TrendDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("trends");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/data/reports.json?v=${Date.now()}`);
      const json: ReportData = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt(reportId: string, promptType: string, prompt: string) {
    const key = `${reportId}:${promptType}`;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  }

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载数据中...</p>
      </div>
    );
  }

  const seaReports: Report[] = data[mainTab].SEA || [];
  const latamReports: Report[] = data[mainTab].LATAM || [];

  function renderCard(report: Report) {
    const isExpanded = expandedId === report.id;
    const promptSets = getPromptSets(report);

    return (
      <div key={report.id} className="report-card">
        <div className="card-header">
          <span className="card-date">{report.date}</span>
          {report.category && <span className="card-tag cat">{report.category}</span>}
          {report.game && <span className="card-tag game">{report.game}</span>}
          {report.scores && <span className="card-tag score-tag">★ {report.scores.total.toFixed(1)}</span>}
          {report.sourceMetric && <span className="card-tag heat-tag">{report.sourceMetric}</span>}
        </div>

        {report.imageUrl && (
          <div className="source-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAssetSrc(report.imageUrl)} alt={`${report.title} 来源封面`} loading="lazy" />
            <span>{getCoverLabel(report)}</span>
          </div>
        )}

        <h3 className="card-title">{report.title}</h3>

        <div className="card-highlights">
          <strong>梗介绍</strong>
          <p>{report.memeIntro || report.highlights}</p>
          {report.memeIntro && (
            <div className="resource-observation">
              <strong>资源观察</strong>
              <p>{report.highlights}</p>
            </div>
          )}
        </div>

        {report.resourceImageUrl && (
          <div className="resource-preview">
            <div className="resource-preview-header">
              <strong>资源参考图</strong>
              <span>{report.resourceTypes?.slice(0, 2).map((rt) => RESOURCE_LABELS[rt] || rt).join(" / ")}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getAssetSrc(report.resourceImageUrl)} alt={`${report.title} 资源参考图`} loading="lazy" />
          </div>
        )}

        {report.scores && isExpanded && (
          <div className="card-scores">
            <strong>评分维度</strong>
            {Object.entries(SCORE_LABELS)
              .filter(([key]) => key !== "total")
              .map(([key, label]) => (
                <ScoreBar key={key} label={label} value={report.scores?.[key as keyof Scores] || 0} />
              ))}
          </div>
        )}

        {report.resourceTypes && isExpanded && (
          <div className="card-resources">
            <strong>建议资源类型</strong>
            <div className="resource-tags">
              {report.resourceTypes.map((rt) => (
                <span key={rt} className="resource-tag">
                  {RESOURCE_LABELS[rt] || rt}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className={`card-summary ${isExpanded ? "expanded" : ""}`}>
          <strong>深度分析 & BS资源启示</strong>
          <p>{report.summary}</p>
        </div>

        {promptSets.length > 0 && isExpanded && (
          <div className="prompt-panel">
            <div className="prompt-panel-title">可一键复制的AI绘图提示词</div>
            <div className="prompt-grid">
              {promptSets.map((item) => {
                const key = `${report.id}:${item.type}`;
                return (
                  <div className="prompt-card" key={key}>
                    <div className="prompt-card-head">
                      <strong>{item.label}</strong>
                      <button className="copy-prompt-btn" onClick={() => copyPrompt(report.id, item.type, item.prompt)}>
                        {copiedKey === key ? "已复制" : "复制"}
                      </button>
                    </div>
                    <p>{item.prompt}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card-actions">
          <button className="expand-btn" onClick={() => setExpandedId(isExpanded ? null : report.id)}>
            {isExpanded ? "收起" : "展开详情"}
          </button>
          <a className="source-link" href={report.sourceUrl} target="_blank" rel="noopener noreferrer">
            来源
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Bloodstrike 热点资源雷达</h1>
        <p className="subtitle">AI深度分析 · 热点追踪 & 竞品监控 · 东南亚 & 拉美双市场</p>
        <p className="update-info">
          更新: {data.meta.lastUpdate} · 热点 {data.meta.totalTrends} 条 · 竞品 {data.meta.totalCompetitors} 条
        </p>
      </header>

      <div className="main-tabs">
        <button className={`main-tab ${mainTab === "trends" ? "active" : ""}`} onClick={() => setMainTab("trends")}>
          热点追踪
        </button>
        <button className={`main-tab ${mainTab === "competitors" ? "active" : ""}`} onClick={() => setMainTab("competitors")}>
          竞品分析
        </button>
      </div>

      <div className="two-column">
        <div className="column">
          <div className="column-header">
            <span>东南亚 (SEA)</span>
            <span className="column-count">{seaReports.length}</span>
          </div>
          <div className="column-cards">
            {seaReports.map(renderCard)}
            {seaReports.length === 0 && <p className="empty-state">暂无数据</p>}
          </div>
        </div>

        <div className="column">
          <div className="column-header">
            <span>拉美 (LATAM)</span>
            <span className="column-count">{latamReports.length}</span>
          </div>
          <div className="column-cards">
            {latamReports.map(renderCard)}
            {latamReports.length === 0 && <p className="empty-state">暂无数据</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
