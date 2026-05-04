"use client";

import { useState, useEffect } from "react";

const EXAMPLES = [
  "https://www.youtube.com/@MrBeast",
  "https://www.youtube.com/@aliabdaal",
  "https://www.youtube.com/@вдудь",
];

const AVATARS = ["🚀", "👨‍💻", "🤖", "📈", "🔥", "🎧", "👾"];

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

  // --- АККАУНТ ---
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATARS[0]);

  // --- TITLE LAB ---
  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("channel_scope_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setIsRegistering(true);
    }
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regName || !regCode) { alert("Заполни имя и код!"); return; }
    const newUser = { name: regName, avatar: regAvatar, code: regCode };
    localStorage.setItem("channel_scope_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsRegistering(false);
  };

  const handleLogout = () => {
    if (confirm("Выйти и удалить данные профиля?")) {
      localStorage.removeItem("channel_scope_user");
      setUser(null);
      setIsRegistering(true);
    }
  };

  // --- ФУНКЦИИ АНАЛИЗА (ИСПОЛЬЗУЮТ user.code) ---
  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setLoading(true); setError(""); setResult(null); setPlanDetails(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode: user.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setResult(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleCheckTitle(e) {
    e.preventDefault();
    if (!testTitle || !user) return;
    setTitleLoading(true); setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode: user.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setTitleResult(data);
    } catch (err) { alert(err.message); } finally { setTitleLoading(false); }
  }

  async function handlePlanDetails() {
    if (!result || !user) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: result.channel, stats: result.stats, analysis: result.analysis, accessCode: user.code }),
      });
      const data = await res.json();
      setPlanDetails(data);
    } catch (err) { alert(err.message); } finally { setPlanLoading(false); }
  }

  // ЭКРАН РЕГИСТРАЦИИ
  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '400px', textAlign: 'center', border: '2px solid #ff7a50' }}>
          <span style={{ fontSize: '50px' }}>{regAvatar}</span>
          <h2>Создать профиль</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input type="text" placeholder="Твое имя" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {AVATARS.map(a => <button key={a} type="button" onClick={() => setRegAvatar(a)} style={{ fontSize: '24px', background: regAvatar === a ? '#fff1ed' : 'transparent', border: 'none', cursor: 'pointer' }}>{a}</button>)}
            </div>
            <input type="password" placeholder="Код администратора" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit">Войти в систему</button>
          </form>
        </div>
      </main>
    );
  }

  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      {/* ШАПКА ПРОФИЛЯ */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '10px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <span style={{ fontSize: '30px' }}>{user?.avatar}</span>
           <div><strong>{user?.name}</strong><div style={{ fontSize: '11px', color: '#22c55e' }}>PRO-АККАУНТ</div></div>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#ff7a50', cursor: 'pointer' }}>Выйти</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">PRO-ACCOUNT • {user?.name}</span>
          <h1>Channel Scope</h1>
          <p>Вставьте ссылку на YouTube-канал для полного AI-аудита.</p>
        </div>

        <form className="hero-form" onSubmit={handleSubmit}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на канал..." />
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Анализирую..." : "Запустить аудит"}
          </button>
        </form>

        {/* TITLE LAB */}
        <div className="panel" style={{ marginTop: '20px', border: '2px solid #ff7a50', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#000' }}>Title Lab — Анализ заголовка</h3>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>10 ВАРИАНТОВ</span>
          </div>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px' }}>
            <input type="text" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }} placeholder="Напиши заголовок..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading}>{titleLoading ? "..." : "Оценить"}</button>
          </form>
          {titleResult && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '20px' }}>
                <div style={{ fontSize: '50px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <p style={{ color: '#000', margin: 0 }}><strong>Вердикт:</strong> {titleResult.analysis}</p>
              </div>
              <div className="list-grid">
                <BulletList title="Плюсы" items={titleResult.pros} />
                <BulletList title="Минусы" items={titleResult.cons} />
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50', marginTop: '20px' }}>
                <h3 style={{ color: '#ff7a50' }}>10 улучшенных вариантов</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '15px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} style={{ padding: '10px', background: '#fff', border: '1px dashed #ff7a50', borderRadius: '6px', cursor: 'pointer', color: '#000', fontSize: '13px' }}>{v}</div>
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
          {/* РЕЗУЛЬТАТЫ АНАЛИЗА КАНАЛА */}
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.98)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
                <div className="hero-tags">{(result.stats.topicFingerprint.keywords || []).slice(0, 6).map(k => <span key={k}>{k}</span>)}</div>
              </div>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Всего" />
            <MetricCard label="Просмотры" value={formatNumber(result.channel.viewCount)} hint="Суммарно" />
            <MetricCard label="Средние" value={formatNumber(result.stats.averages.views)} hint="На ролик" />
            <MetricCard label="ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
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
                <span className="eyebrow">Самое популярное</span>
                <h3>{topVideo.title}</h3>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer">Открыть видео ↗</a>
              </div>
              <div className="spotlight-grid">
                <BulletList title="Почему выстрелил" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Что повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </section>
          )}

          {/* КОНКУРЕНТЫ */}
          <section className="panel">
            <h3>Видео по теме, которые залетели</h3>
            <div className="competitor-grid">
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card">
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ color: '#ff7a50', fontWeight: 'bold' }}>{v.title}</a>
                  <p className="muted">{v.channelTitle}</p>
                  <ul>{v.whyItPopped.map(i => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          {/* ПЛАН РОСТА */}
          <section className="panel">
            <h3>План на 30 дней</h3>
            <div className="list-grid plan-grid">
              <BulletList title="7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Инсайты" items={result.analysis.contentPatterns.cadenceInsights} />
            </div>
            <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ marginTop: '20px' }}>
              {planLoading ? "Генерирую инструкцию..." : "Узнать подробнее"}
            </button>

            {planDetails && (
              <div className="details-panel" style={{ marginTop: '30px' }}>
                <div className="phase-list">
                  {planDetails.details.phases.map((p, i) => (
                    <article className="phase-card" key={i}>
                      <span className="phase-number">{i+1}</span>
                      <h4>{p.title}</h4>
                      <p>{p.objective}</p>
                      <strong>Результат: {p.deliverable}</strong>
                    </article>
                  ))}
                </div>
                <div className="list-grid">
                  <BulletList title="Чеклист" items={planDetails.details.checklist} />
                  <BulletList title="Метрики" items={planDetails.details.metricsToWatch} />
                </div>
              </div>
            )}
          </section>

          {/* ТАБЛИЦА */}
          <section className="panel">
            <h3>Подробная разбивка видео</h3>
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
