"use client";

import { useState } from "react";

const EXAMPLES = [
  "https://www.youtube.com/@MrBeast",
  "https://www.youtube.com/@aliabdaal",
  "https://www.youtube.com/@вдудь",
];

const numberFormatter = new Intl.NumberFormat("ru-RU");
const formatNumber = (v) => numberFormatter.format(Number(v || 0));
const formatPercent = (v) => `${Number(v || 0).toFixed(1)}%`;
const formatDate = (v) => v ? new Date(v).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }) : "Нет даты";

function formatDuration(seconds) {
  const safe = Number(seconds || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м ${s}с`;
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
      <ul>{(items || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
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

  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  // --- ПОЛНЫЙ АНАЛИЗ КАНАЛА ---
  async function handleSubmit(event) {
    event.preventDefault();
    const accessCode = window.prompt("Введите код доступа администратора");
    if (!accessCode) return;
    setLoading(true); setError(""); setResult(null); setPlanDetails(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setResult(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  // --- TITLE LAB ---
  async function handleCheckTitle(e) {
    e.preventDefault();
    if (!testTitle) return;
    const accessCode = window.prompt("Введите код доступа администратора");
    if (!accessCode) return;
    setTitleLoading(true); setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setTitleResult(data);
    } catch (err) { alert(err.message); } finally { setTitleLoading(false); }
  }

  async function handlePlanDetails() {
    if (!result) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: result.channel, stats: result.stats, analysis: result.analysis }),
      });
      const data = await res.json();
      setPlanDetails(data);
    } catch (err) { alert(err.message); } finally { setPlanLoading(false); }
  }

  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">PRO-LEVEL • YouTube API • Groq AI</span>
          <h1>Channel Scope</h1>
          <p>Профессиональный AI-аудит каналов и лаборатория заголовков с анализом психологии клика.</p>
        </div>

        <form className="hero-form" onSubmit={handleSubmit}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на канал..." />
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Анализирую..." : "Запустить полный аудит"}
          </button>
        </form>

        {/* --- TITLE LAB --- */}
        <div className="panel" style={{ marginTop: '20px', border: '2px solid #ff7a50', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Title Lab — Анализ заголовка</h3>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>10 ВАРИАНТОВ</span>
          </div>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              placeholder="Напиши заголовок для проверки..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0 }}>
              {titleLoading ? "..." : "Оценить"}
            </button>
          </form>

          {titleResult && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '20px' }}>
                <div style={{ fontSize: '50px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <div>
                   <p style={{ color: '#000', margin: '0 0 5px 0' }}><strong>Вердикт:</strong> {titleResult.analysis}</p>
                   <p style={{ color: '#666', fontSize: '14px', margin: 0 }}><strong>Психология:</strong> {titleResult.psychology}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <BulletList title="Сильные стороны" items={titleResult.pros} />
                <BulletList title="Что мешает клику" items={titleResult.cons} />
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50' }}>
                <h3 style={{ color: '#ff7a50' }}>10 улучшенных вариантов (нажми, чтобы скопировать)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} 
                         style={{ padding: '10px', background: '#fff', border: '1px dashed #ff7a50', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#000' }}>
                      {i + 1}. {v}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {error && <div className="status-banner error">{error}</div>}

      {result && (
        <>
          {/* ШАПКА КАНАЛА */}
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.95)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
              </div>
            </div>
          </section>

          {/* МЕТРИКИ */}
          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Всего на канале" />
            <MetricCard label="Просмотры" value={formatNumber(result.channel.viewCount)} hint="Суммарно" />
            <MetricCard label="Видео" value={formatNumber(coverage.analyzedVideos)} hint="В анализе" />
            <MetricCard label="Средний ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
          </section>

          {/* КОНКУРЕНТЫ - ТЕПЕРЬ КЛИКАБЕЛЬНЫ */}
          <section className="panel">
            <span className="eyebrow">Конкурентная разведка</span>
            <h3>Видео конкурентов, которые сейчас растут</h3>
            <div className="competitor-grid" style={{ marginTop: '20px' }}>
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#ff7a50', fontWeight: 'bold', fontSize: '18px', display: 'block', marginBottom: '10px' }}>
                    {v.title} ↗
                  </a>
                  <p className="muted" style={{ marginBottom: '15px' }}>Канал: {v.channelTitle}</p>
                  <div style={{ fontSize: '14px', color: '#444' }}>
                    <strong>Почему залетело:</strong>
                    <ul style={{ margin: '5px 0 15px 0', paddingLeft: '20px' }}>{v.whyItPopped.map((i) => <li key={i}>{i}</li>)}</ul>
                    <strong>Что забрать себе:</strong>
                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>{v.ideasToAdapt.map((i) => <li key={i}>{i}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ПЛАН РОСТА */}
          <section className="panel">
            <span className="eyebrow">Стратегия</span>
            <h3>Пошаговый план развития</h3>
            <div className="list-grid" style={{ marginTop: '20px' }}>
              <BulletList title="План на 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="План на 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ marginTop: '20px' }}>
              {planLoading ? "AI детализирует план..." : "Раскрыть подробную инструкцию"}
            </button>
            
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '30px', background: '#f0f4f8', padding: '30px', borderRadius: '15px' }}>
                <h3>Детальная инструкция по реализации</h3>
                <p style={{ marginBottom: '25px', color: '#444' }}>{planDetails.details.overview}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <BulletList title="Чек-лист для автора" items={planDetails.details.checklist} />
                  <BulletList title="Метрики контроля" items={planDetails.details.metricsToWatch} />
                </div>
              </div>
            )}
          </section>

          {/* ТАБЛИЦА ВИДЕО */}
          <section className="panel">
             <h3>Подробный аудит последних роликов</h3>
             <div className="table-wrap">
               <table className="videos-table">
                 <thead><tr><th>Видео</th><th>Дата</th><th>Просмотры</th><th>ER</th><th>Формат</th></tr></thead>
                 <tbody>
                   {result.videos.map((v) => (
                     <tr key={v.id}>
                       <td><a href={v.url} target="_blank" rel="noreferrer" style={{ fontWeight: 'bold' }}>{v.title}</a></td>
                       <td>{formatDate(v.publishedAt)}</td>
                       <td>{formatNumber(v.viewCount)}</td>
                       <td>{formatPercent(v.engagementRate)}</td>
                       <td>{v.isShort ? "Shorts" : formatDuration(v.durationSeconds)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </section>
        </>
      )}
    </main>
  );
}
