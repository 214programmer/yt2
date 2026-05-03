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
          <span className="hero-pill">Vercel-ready • YouTube API • Groq AI</span>
          <h1>Channel Scope</h1>
          <p>Вставьте ссылку на YouTube-канал и получите глубокий AI-аудит.</p>
        </div>

        <form className="hero-form" onSubmit={handleSubmit}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на канал..." />
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Анализирую..." : "Запустить анализ"}
          </button>
        </form>

        {/* --- TITLE LAB (ИНСТРУМЕНТ) --- */}
        <div className="panel" style={{ marginTop: '20px', border: '2px solid #ff7a50', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Title Lab — Симулятор заголовка</h3>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ИНСТРУМЕНТ</span>
          </div>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              placeholder="Введите будущий заголовок..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0 }}>
              {titleLoading ? "..." : "Оценить"}
            </button>
          </form>

          {titleResult && (
            <div style={{ marginTop: '20px', padding: '25px', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '20px' }}>
                <div style={{ fontSize: '54px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <div>
                   <p style={{ color: '#000', margin: '0 0 5px 0' }}><strong>Вердикт AI:</strong> {titleResult.analysis}</p>
                   <p style={{ color: '#666', fontSize: '15px', margin: 0 }}><strong>Психология клика:</strong> {titleResult.psychology}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <BulletList title="Что круто" items={titleResult.pros} />
                <BulletList title="Слабые места" items={titleResult.cons} />
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50', background: '#fff' }}>
                <h3 style={{ color: '#ff7a50' }}>10 виральных вариантов (Нажми, чтобы скопировать)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} 
                         style={{ padding: '12px', background: '#fff9f7', border: '1px dashed #ff7a50', borderRadius: '8px', cursor: 'pointer', color: '#000', fontSize: '14px' }}>
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
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.98)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <span className="eyebrow">Канал</span>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
                <div className="hero-tags">
                   {(result.stats.topicFingerprint.keywords || []).slice(0, 8).map(k => <span key={k}>{k}</span>)}
                </div>
              </div>
            </div>
            <div className="model-badge">AI Модель: <strong>{result.groqModel}</strong></div>
          </section>

          {/* СЕТКА МЕТРИК (6 КАРТОЧЕК) */}
          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Общее число" />
            <MetricCard label="Просмотры канала" value={formatNumber(result.channel.viewCount)} hint="Суммарно" />
            <MetricCard label="Видео в анализе" value={formatNumber(coverage.analyzedVideos)} hint={`Из ${coverage.totalPublicVideos}`} />
            <MetricCard label="Средние просмотры" value={formatNumber(result.stats.averages.views)} hint="На ролик" />
            <MetricCard label="Средний ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
            <MetricCard label="Частота публикаций" value={`${result.stats.averages.postingCadenceDays} дн.`} hint="Интервал" />
          </section>

          {/* ПОЗИЦИОНИРОВАНИЕ И ЦИФРЫ */}
          <section className="two-column">
            <div className="panel">
              <span className="eyebrow">Позиционирование</span>
              <h3>{result.analysis.positioning.niche}</h3>
              <p>{result.analysis.positioning.targetAudience}</p>
              <p className="muted">{result.analysis.positioning.contentEngine}</p>
            </div>
            <div className="panel">
              <span className="eyebrow">Что видно по цифрам</span>
              <div className="stat-lines">
                <div><span>Медиана просмотров</span><strong>{formatNumber(result.stats.averages.medianViews)}</strong></div>
                <div><span>Средняя скорость</span><strong>{formatNumber(result.stats.averages.viewsPerDay)} / д</strong></div>
                <div><span>Длина ролика</span><strong>{formatDuration(result.stats.averages.durationSeconds)}</strong></div>
                <div><span>Доля Shorts</span><strong>{formatPercent(result.stats.averages.shortsShare)}</strong></div>
              </div>
            </div>
          </section>

          {/* БЛОКИ АУДИТА (4 + 4) */}
          <section className="list-grid">
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Быстрые улучшения" items={result.analysis.channelAudit.quickWins} />
            <BulletList title="Стратегические риски" items={result.analysis.channelAudit.strategicRisks} />
          </section>

          <section className="list-grid">
            <BulletList title="Форматы, которые работают" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Паттерны тянущие вниз" items={result.analysis.contentPatterns.underperformingPatterns} />
            <BulletList title="Что по заголовкам" items={result.analysis.contentPatterns.titleInsights} />
            <BulletList title="Что по подаче" items={result.analysis.contentPatterns.thumbnailInsights} />
          </section>

          {/* ТОП ВИДЕО */}
          {topVideo && (
            <section className="spotlight">
              <div className="spotlight-main">
                <span className="eyebrow">Самое популярное видео</span>
                <h3>{topVideo.title}</h3>
                <div className="hero-tags">
                  <span>{formatNumber(topVideo.viewCount)} просмотров</span>
                  <span>{formatPercent(topVideo.engagementRate)} ER</span>
                </div>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer">Открыть видео на YouTube ↗</a>
              </div>
              <div className="spotlight-grid">
                <BulletList title="Почему выстрелил" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Что повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
                <BulletList title="Осторожнее" items={result.analysis.topVideoBreakdown.cautionNotes} />
              </div>
            </section>
          )}

          {/* КОНКУРЕНТЫ - ТЕПЕРЬ КЛИКАБЕЛЬНЫ */}
          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Конкуренты и референсы</span>
                <h3>Видео по теме, которые залетели</h3>
              </div>
            </div>
            <div className="competitor-grid">
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card">
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ fontSize: '18px', color: '#ff7a50', textDecoration: 'none', fontWeight: 'bold' }}>
                    {v.title} ↗
                  </a>
                  <p className="muted" style={{ margin: '5px 0 15px 0' }}>{v.channelTitle}</p>
                  <strong>Почему залетело</strong>
                  <ul>{v.whyItPopped.map((i) => <li key={i}>{i}</li>)}</ul>
                  <strong>Что адаптировать</strong>
                  <ul>{v.ideasToAdapt.map((i) => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          {/* ДОРОЖНАЯ КАРТА */}
          <section className="panel">
            <div className="section-head">
              <div><span className="eyebrow">План роста</span><h3>Что делать дальше</h3></div>
              <p className="muted">Ниже готовый tactical roadmap, собранный AI по метрикам канала.</p>
            </div>
            <div className="list-grid plan-grid">
              <BulletList title="Следующие 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="Следующие 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
              <BulletList title="Инсайты по ритму" items={result.analysis.contentPatterns.cadenceInsights} />
            </div>
            <button className="secondary-button" style={{ marginTop: '20px' }} onClick={handlePlanDetails} disabled={planLoading}>
              {planLoading ? "Генерирую инструкцию..." : "Раскрыть пошаговый план выполнения"}
            </button>

            {/* ДЕТАЛИЗАЦИЯ ИЗ СКРИНШОТА */}
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '40px' }}>
                <div className="section-head"><h3>Инструкция: как выполнить план шаг за шагом</h3></div>
                
                {/* Фазы выполнения (1-4) */}
                <div className="phase-list" style={{ marginBottom: '40px' }}>
                  {planDetails.details.phases.map((phase, idx) => (
                    <article className="phase-card" key={idx}>
                      <span className="phase-number">{idx + 1}</span>
                      <h4>{phase.title}</h4>
                      <p style={{ margin: '10px 0', fontSize: '14px' }}>{phase.objective}</p>
                      <ol style={{ paddingLeft: '20px', fontSize: '13px' }}>
                        {phase.steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                      <strong style={{ display: 'block', marginTop: '10px', fontSize: '13px', color: '#ff7a50' }}>Результат: {phase.deliverable}</strong>
                    </article>
                  ))}
                </div>

                {/* Чеклисты и Метрики */}
                <div className="list-grid">
                  <BulletList title="Чеклист выполнения" items={planDetails.details.checklist} />
                  <BulletList title="Метрики для контроля" items={planDetails.details.metricsToWatch} />
                  <BulletList title="Готовые AI скрипты" items={planDetails.details.prompts} />
                </div>
              </div>
            )}
          </section>

          {/* ТАБЛИЦА ВИДЕО */}
          <section className="panel">
            <h3>Подробная разбивка по роликам</h3>
            <div className="table-wrap">
              <table className="videos-table">
                <thead><tr><th>Видео</th><th>Просмотры</th><th>ER</th><th>Формат</th></tr></thead>
                <tbody>
                  {result.videos.map((v) => (
                    <tr key={v.id}>
                      <td><a href={v.url} target="_blank" rel="noreferrer" style={{ fontWeight: 'bold' }}>{v.title}</a></td>
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
