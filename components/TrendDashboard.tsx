"use client";

import { useState, useEffect } from "react";

// ============ Types ============

interface Report {
  id: string;
  date: string;
  region: string;
  category: string;
  title: string;
  highlights: string;
  summary: string;
  sourceUrl: string;
}

// ============ Main Component ============

export default function TrendDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/data/reports.json?v=${Date.now()}`);
      const data: Report[] = await res.json();
      // Sort by date descending
      data.sort((a, b) => b.date.localeCompare(a.date));
      setReports(data);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  }

  // Get unique categories
  const categories = Array.from(new Set(reports.map((r) => r.category)));

  // Filter reports
  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.category === filter);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载热点数据中...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>🎯 Bloodstrike 热梗资源雷达</h1>
        <p className="subtitle">
          AI分析当前最火热点 · 东南亚 &amp; 拉美市场 · 资源化落地参考
        </p>
        <p className="update-info">
          最后更新: {reports[0]?.date || "N/A"} · 共 {reports.length} 条热点
        </p>
      </header>

      {/* Filters */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? "active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="cards-grid">
        {filtered.map((report) => (
          <div key={report.id} className="report-card">
            <div className="card-header">
              <span className="card-date">{report.date}</span>
              <span className="card-region">{report.region}</span>
              <span className="card-category">{report.category}</span>
            </div>

            <h2 className="card-title">{report.title}</h2>

            <div className="card-highlights">
              <strong>📌 要点速览</strong>
              <p>{report.highlights}</p>
            </div>

            <div
              className={`card-summary ${expandedId === report.id ? "expanded" : ""}`}
            >
              <strong>🧠 深度分析</strong>
              <p>{report.summary}</p>
            </div>

            <div className="card-actions">
              <button
                className="expand-btn"
                onClick={() =>
                  setExpandedId(expandedId === report.id ? null : report.id)
                }
              >
                {expandedId === report.id ? "收起 ▲" : "展开分析 ▼"}
              </button>
              <a
                className="source-link"
                href={report.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 来源
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="empty-state">暂无该分类的热点数据</p>
      )}
    </div>
  );
}
