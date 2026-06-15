"use client";

import { useState, useEffect } from "react";

// ============ Types ============
interface Scores {
  categoryAffinity: number;
  adaptationCost: number;
  mobileFit: number;
  audienceMatch: number;
  freshness: number;
  marketHeat: number;
  total: number;
}

interface Report {
  id: string;
  date: string;
  category?: string;
  game?: string;
  title: string;
  highlights: string;
  summary: string;
  sourceUrl: string;
  scores?: Scores;
  resourceTypes?: string[];
}

interface ReportData {
  trends: { SEA: Report[]; LATAM: Report[] };
  competitors: { SEA: Report[]; LATAM: Report[] };
  meta: { lastUpdate: string; totalTrends: number; totalCompetitors: number; analyst: string };
}

type MainTab = "trends" | "competitors";

// ============ Score Labels ============
const SCORE_LABELS: Record<string, string> = {
  categoryAffinity: "品类契合",
  adaptationCost: "改编成本",
  mobileFit: "移动适配",
  audienceMatch: "受众匹配",
  freshness: "新鲜度",
  marketHeat: "市场热度",
};

const RESOURCE_LABELS: Record<string, string> = {
  character_skin: "角色皮肤",
  weapon_skin: "武器皮肤",
  weapon_charm: "武器挂件",
  finisher: "终结技",
  emote: "表情动作",
  spray: "喷漆",
  lobby_theme: "大厅主题",
  event_bundle: "活动礼包",
  parachute_skin: "降落伞",
  vehicle_skin: "载具皮肤",
  playpal: "盘盘伴侣",
};

// ============ Score Bar ============
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value * 10, 100);
  const color =
    value >= 8 ? "#4ade80" : value >= 6 ? "#fbbf24" : "#f87171";
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

// ============ Component ============
export default function TrendDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("trends");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

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

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载数据中...</p>
      </div>
    );
  }

  const seaReports: Report[] = data[mainTab]["SEA"] || [];
  const latamReports: Report[] = data[mainTab]["LATAM"] || [];

  function renderCard(report: Report) {
    const isExpanded = expandedId === report.id;
    return (
      <div key={report.id} className="report-card">
        <div className="card-header">
          <span className="card-date">{report.date}</span>
          {report.category && <span className="card-tag cat">{report.category}</span>}
          {report.game && <span className="card-tag game">{report.game}</span>}
          {report.scores && (
            <span className="card-tag score-tag">⭐ {report.scores.total.toFixed(1)}</span>
          )}
        </div>

        <h3 className="card-title">{report.title}</h3>

        <div className="card-highlights">
          <p>{report.highlights}</p>
        </div>

        {/* Scores */}
        {report.scores && isExpanded && (
          <div className="card-scores">
            <strong>📊 评分维度</strong>
            {Object.entries(SCORE_LABELS).map(([key, label]) => (
              <ScoreBar
                key={key}
                label={label}
                value={(report.scores as any)[key]}
              />
            ))}
          </div>
        )}

        {/* Resource Types */}
        {report.resourceTypes && isExpanded && (
          <div className="card-resources">
            <strong>🎨 建议资源类型</strong>
            <div className="resource-tags">
              {report.resourceTypes.map((rt) => (
                <span key={rt} className="resource-tag">
                  {RESOURCE_LABELS[rt] || rt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className={`card-summary ${isExpanded ? "expanded" : ""}`}>
          <strong>🧠 深度分析 & BS启示</strong>
          <p>{report.summary}</p>
        </div>

        <div className="card-actions">
          <button
            className="expand-btn"
            onClick={() => setExpandedId(isExpanded ? null : report.id)}
          >
            {isExpanded ? "收起 ▲" : "展开详情 ▼"}
          </button>
          <a className="source-link" href={report.sourceUrl} target="_blank" rel="noopener noreferrer">
            🔗 来源
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>🎯 Bloodstrike 热梗资源雷达</h1>
        <p className="subtitle">AI深度分析 · 热点追踪 & 竞品监控 · 东南亚 & 拉美双市场</p>
        <p className="update-info">
          更新: {data.meta.lastUpdate} · 热点 {data.meta.totalTrends} 条 · 竞品 {data.meta.totalCompetitors} 条 · 分析: {data.meta.analyst}
        </p>
      </header>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button className={`main-tab ${mainTab === "trends" ? "active" : ""}`} onClick={() => setMainTab("trends")}>
          📡 热点追踪
        </button>
        <button className={`main-tab ${mainTab === "competitors" ? "active" : ""}`} onClick={() => setMainTab("competitors")}>
          🎮 竞品分析
        </button>
      </div>

      {/* Two-Column Layout */}
      <div className="two-column">
        <div className="column">
          <div className="column-header">
            <span className="column-icon">🌏</span>
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
            <span className="column-icon">🌎</span>
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
