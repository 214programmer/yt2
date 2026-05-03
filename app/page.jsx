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
    day: "2-digit", month: "short", year: "numeric",
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

  // Title Lab State
  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  // --- Функция Анализа Канала ---
  async function handleSubmit(event) {
    event.preventDefault();
    const accessCode = window.prompt("Введите код доступа от администратора");
    if (!accessCode) {
      setError("Для запуска анализа нужен код доступа.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setPlanDetails(null);
    setPlanError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось выполнить анализ.");
      setResult(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Функция Title Lab (с кодом доступа) ---
  async function handleCheckTitle(e) {
    e.preventDefault();
    if (!testTitle) return;

    const accessCode = window.prompt("Введите код доступа для работы Title Lab");
    if (!accessCode) return;

    setTitleLoading(true);
    setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode }),
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

  async function handlePlanDetails() {
    if (!result) return;
    setPlanLoading(true);
    setPlanError("");
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
      if (!response.ok) throw new Error(payload.error || "Ошибка детализации.");
      setPlanDetails(payload);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setPlanLoading(false);
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
          <p>Вставьте ссылку на YouTube-канал и получите глубокий AI-аудит.</p>
          <div className="hero-tags">
            <span>Аналитика канала</span>
            <span>Разбор роликов</span>
            <span>Советы по росту</span>
            <span>Конкурентная разведка</span>
          </div>
        </div>

        <form className="hero-form" onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <label htmlFor="channelUrl">Ссылка на канал</label>
          <input
            id="channelUrl"
            type="text"
            value={channelUrl}
            onChange={(event) => setChannelUrl(event.target.value)}
            placeholder="https://www.youtube.com/@channel"
          />
          <div className="example-row">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className="ghost-chip" onClick={() => setChannelUrl(example)}>
                {example.replace("https://www.youtube.com/", "")}
              </button>
            ))}
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Собираю аналитику..." : "Запустить анализ"}
          </button>
        </form>

        {/* --- TITLE LAB (С ПРОВЕРКОЙ КОДА) --- */}
        <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Title Lab — Симулятор заголовка</h3>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ИНСТРУМЕНТ</span>
          </div>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              placeholder="Введите заголовок для проверки..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0 }}>
              {titleLoading ? "..." : "Оценить"}
            </button>
          </form>

          {titleResult && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>
                  {titleResult.score}%
                </div>
                <p style={{ color: '#333' }}><strong>Вердикт:</strong> {titleResult.analysis}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <BulletList title="Плюсы" items={titleResult.pros} />
                <BulletList title="Минусы" items={titleResult.cons} />
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50' }}>
                <h3 style={{ color: '#ff7a50' }}>7 вариантов от AI (Нажми, чтобы скопировать)</h3>
                <ul style={{ padding: '10px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <li key={i} onClick={() => { navigator.clipboard.writeText(v); alert('Скопировано!'); }} 
                        style={{ cursor: 'pointer', padding: '8px', borderBottom: '1px solid #eee', listStyle: 'none' }}>
                      {i + 1}. {v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {error ? <div className="status-banner error">{error}</div> : null}
      {loading ? <div className="status-banner">Анализирую данные канала...</div> : null}

      {result ? (
        <>
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.96)), url(${result.channel.banner})` } : undefined}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <span className="eyebrow">Канал</span>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
                <div className="hero-tags">
                  {(result.stats.topicFingerprint.keywords || []).slice(0, 6).map((k) => <span key={k}>{k}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Всего" />
            <MetricCard label="Просмотры" value={formatNumber(result.channel.viewCount)} hint="На канале" />
            <MetricCard label="Видео" value={formatNumber(coverage.analyzedVideos)} hint="В анализе" />
            <MetricCard label="Средние" value={formatNumber(result.stats.averages.views)} hint="Просмотры" />
            <MetricCard label="ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
            <MetricCard label="Частота" value={`${result.stats.averages.postingCadenceDays} дн.`} hint="График" />
          </section>

          <section className="two-column">
            <div className="panel">
              <span className="eyebrow">Позиционирование</span>
              <h3>{result.analysis.positioning.niche}</h3>
              <p>{result.analysis.positioning.targetAudience}</p>
              <p className="muted">{result.analysis.positioning.contentEngine}</p>
            </div>
            <div className="panel">
              <span className="eyebrow">Цифры</span>
              <div className="stat-lines">
                <div><span>Медиана</span><strong>{formatNumber(result.stats.averages.medianViews)}</strong></div>
                <div><span>Скорость</span><strong>{formatNumber(result.stats.averages.viewsPerDay)}/д</strong></div>
                <div><span>Длина</span><strong>{formatDuration(result.stats.averages.durationSeconds)}</strong></div>
                <div><span>Shorts</span><strong>{formatPercent(result.stats.averages.shortsShare)}</strong></div>
              </div>
            </div>
          </section>

          <section className="list-grid">
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Быстрые улучшения" items={result.analysis.channelAudit.quickWins} />
            <BulletList title="Риски" items={result.analysis.channelAudit.strategicRisks} />
          </section>

          <section className="list-grid">
            <BulletList title="Что работает" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Что не работает" items={result.analysis.contentPatterns.underperformingPatterns} />
            <BulletList title="Заголовки" items={result.analysis.contentPatterns.titleInsights} />
            <BulletList title="Подача" items={result.analysis.contentPatterns.thumbnailInsights} />
          </section>

          {topVideo && (
            <section className="spotlight">
              <div className="spotlight-main">
                <span className="eyebrow">Топ видео</span>
                <h3>{topVideo.title}</h3>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer">Открыть на YouTube</a>
              </div>
              <div className="spotlight-grid">
                <BulletList title="Почему выстрелил" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Что повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
                <BulletList title="Осторожнее" items={result.analysis.topVideoBreakdown.cautionNotes} />
              </div>
            </section>
          )}

          <section className="panel">
            <span className="eyebrow">Конкуренты</span>
            <div className="competitor-grid">
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card">
                  <h4>{v.title}</h4>
                  <p className="muted">{v.channelTitle}</p>
                  <ul>{v.whyItPopped.map((i) => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3>План роста</h3>
            <div className="list-grid">
              <BulletList title="7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading}>
              {planLoading ? "Генерирую..." : "Узнать подробнее"}
            </button>
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '20px' }}>
                <BulletList title="Чеклист" items={planDetails.details.checklist} />
                <BulletList title="Метрики" items={planDetails.details.metricsToWatch} />
                <BulletList title="Промпты" items={planDetails.details.prompts} />
              </div>
            )}
          </section>

          <section className="panel">
            <h3>Разбивка по роликам</h3>
            <div className="table-wrap">
              <table className="videos-table">
                <thead><tr><th>Видео</th><th>Дата</th><th>Просмотры</th><th>ER</th><th>Формат</th></tr></thead>
                <tbody>
                  {result.videos.map((v) => (
                    <tr key={v.id}>
                      <td><a href={v.url} target="_blank" rel="noreferrer">{v.title}</a></td>
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
      ) : null}
    </main>
  );
}
