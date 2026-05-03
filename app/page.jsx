"use client";

import { useState } from "react";

const EXAMPLES = [
  "https://www.youtube.com/@MrBeast",
  "https://www.youtube.com/@aliabdaal",
  "https://www.youtube.com/@вдудь",
];

const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "Нет даты";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds) {
  const safe = Number(seconds || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м ${secs}с`;
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      <ul>
        {(items || []).map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [channelUrl, setChannelUrl] = useState(EXAMPLES[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planDetails, setPlanDetails] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const accessCode = window.prompt("Введите код доступа от администратора");
    if (!accessCode) {
      setError("Нужен код доступа.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setPlanDetails(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Ошибка анализа.");
      setResult(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanDetails() {
    if (!result) return;
    setPlanLoading(true);
    try {
      const response = await fetch("/api/plan-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: result.channel,
          stats: result.stats,
          analysis: result.analysis,
        }),
      });
      const payload = await response.json();
      setPlanDetails(payload);
    } catch (err) {
      alert(err.message);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleCheckTitle(e) {
    e.preventDefault();
    if (!testTitle) return;
    setTitleLoading(true);
    setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setTitleResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setTitleLoading(false);
    }
  }

  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">Vercel-ready • YouTube API • Groq AI</span>
          <h1>Channel Scope</h1>
          <p>Глубокий AI-аудит YouTube-каналов и лаборатория заголовков.</p>
        </div>

        <form className="hero-form" onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <label htmlFor="channelUrl">Ссылка на канал</label>
          <input
            id="channelUrl"
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="https://www.youtube.com/@channel"
          />
          <div className="example-row">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="ghost-chip" onClick={() => setChannelUrl(ex)}>
                {ex.split('@')[1]}
              </button>
            ))}
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Анализ..." : "Запустить полный аудит"}
          </button>
        </form>

        {/* --- УЛУЧШЕННЫЙ TITLE LAB --- */}
        <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#1a1a1a' }}>Title Lab — Симулятор заголовка</h3>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ИНСТРУМЕНТ</span>
          </div>
          
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', color: '#000' }}
              placeholder="Введите заголовок для проверки..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0 }}>
              {titleLoading ? "..." : "Оценить"}
            </button>
          </form>

          {titleResult && (
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '25px' }}>
                <div style={{ 
                  fontSize: '48px', 
                  fontWeight: '900', 
                  color: titleResult.score > 70 ? '#22c55e' : '#f59e0b',
                  background: '#fff',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                  {titleResult.score}%
                </div>
                <p style={{ margin: 0, fontSize: '16px', color: '#374151', lineHeight: '1.5' }}>
                  <strong>Вердикт:</strong> {titleResult.analysis}
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <BulletList title="Плюсы" items={titleResult.pros} />
                <BulletList title="Минусы" items={titleResult.cons} />
              </div>

              <div className="list-card" style={{ width: '100%', background: '#fff', border: '1px solid #ff7a50' }}>
                <h3 style={{ color: '#ff7a50' }}>7 вариантов от AI (Кликай, чтобы скопировать)</h3>
                <ul style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', padding: '15px' }}>
                  {titleResult.improvements.map((variant, i) => (
                    <li 
                      key={i} 
                      onClick={() => { navigator.clipboard.writeText(variant); alert('Скопировано!'); }}
                      style={{ 
                        padding: '12px', 
                        background: '#fff8f6', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        border: '1px dashed #ff7a50',
                        fontSize: '15px',
                        listStyle: 'none'
                      }}
                    >
                      {i + 1}. {variant}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {error && <div className="status-banner error">{error}</div>}
      {loading && <div className="status-banner">Собираю данные канала...</div>}

      {result && (
        <>
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.95)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
              </div>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Всего" />
            <MetricCard label="Просмотры" value={formatNumber(result.channel.viewCount)} hint="На канале" />
            <MetricCard label="Средние просмотры" value={formatNumber(result.stats.averages.views)} hint="На видео" />
            <MetricCard label="Средний ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
          </section>

          <section className="list-grid">
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Быстрые улучшения" items={result.analysis.channelAudit.quickWins} />
            <BulletList title="Риски" items={result.analysis.channelAudit.strategicRisks} />
          </section>

          {topVideo && (
            <section className="spotlight">
              <div className="spotlight-main">
                <span className="eyebrow">Самое популярное видео</span>
                <h3>{topVideo.title}</h3>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer">Открыть на YouTube</a>
              </div>
              <div className="spotlight-grid">
                <BulletList title="Почему выстрелил" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Что повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </section>
          )}

          <section className="panel">
            <div className="section-head">
               <h3>План роста на 30 дней</h3>
            </div>
            <div className="list-grid">
              <BulletList title="7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="30 дней" items={result.analysis.actionPlan.next30Days} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
