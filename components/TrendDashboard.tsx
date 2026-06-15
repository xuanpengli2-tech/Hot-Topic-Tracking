"use client";

import { useState, useEffect } from "react";

// ============ Types ============
interface Report {
  id: string;
  date: string;
  category?: string;
  game?: string;
  title: string;
  highlights: string;
  summary: string;
  sourceUrl: string;
}

interface ReportData {
  trends: { SEA: Report[]; LATAM: Report[] };
  competitors: { SEA: Report[]; LATAM: Report[] };
  meta: { lastUpdate: string; totalTrends: number; totalCompetitors: number; analyst: string };
}

type MainTab = "trends" | "competitors";
type RegionTab = "SEA" | "LATAM";

// ============ Component ============
export default function TrendDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("trends");
  const [regionTab, setRegionTab] = useState<RegionTab>("SEA");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载数据中...</p>
      </div>
    );
  }

  const reports: Report[] = data[mainTab][regionTab] || [];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>🎯 Bloodstrike 热梗资源雷达</h1>
        <p className="subtitle">AI深度分析 · 热点追踪 & 竞品监控 · 东南亚 & 拉美市场</p>
        <p className="update-info">
          最后更新: {data.meta.lastUpdate} · 热点 {data.meta.totalTrends} 条 · 竞品 {data.meta.totalCompetitors} 条 · 分析师: {data.meta.analyst}
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

      {/* Region Tabs */}
      <div className="region-tabs">
        <button className={`region-tab ${regionTab === "SEA" ? "active" : ""}`} onClick={() => setRegionTab("SEA")}>
          🌏 东南亚 (SEA)
        </button>
        <button className={`region-tab ${regionTab === "LATAM" ? "active" : ""}`} onClick={() => setRegionTab("LATAM")}>
          🌎 拉美 (LATAM)
        </button>
      </div>

      {/* Cards */}
      <div className="cards-grid">
        {reports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="card-header">
              <span className="card-date">{report.date}</span>
              {report.category && <span className="card-category">{report.category}</span>}
              {report.game && <span className="card-game">{report.game}</span>}
            </div>

            <h2 className="card-title">{report.title}</h2>

            <div className="card-highlights">
              <strong>📌 要点速览</strong>
              <p>{report.highlights}</p>
            </div>

            <div className={`card-summary ${expandedId === report.id ? "expanded" : ""}`}>
              <strong>🧠 深度分析 & BS启示</strong>
              <p>{report.summary}</p>
            </div>

            <div className="card-actions">
              <button
                className="expand-btn"
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
              >
                {expandedId === report.id ? "收起 ▲" : "展开分析 ▼"}
              </button>
              <a className="source-link" href={report.sourceUrl} target="_blank" rel="noopener noreferrer">
                🔗 来源
              </a>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && <p className="empty-state">暂无该分区的数据</p>}
    </div>
  );
}
