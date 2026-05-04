"use client";

import { useState, useEffect } from "react";
// Импорт компонентов для графика
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

// Улучшенная широкая карточка метрик
function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card" style={{ flex: '1 1 300px', textAlign: 'left', padding: '30px' }}>
      <span className="eyebrow" style={{ fontSize: '11px', letterSpacing: '1.5px' }}>{label}</span>
      <strong style={{ fontSize: '36px', display: 'block', margin: '15px 0' }}>{value}</strong>
      <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.6' }}>{hint}</p>
    </article>
  );
}

// Универсальный список
function BulletList({ title, items }) {
  return (
    <div className="list-card" style={{ padding: '25px', width: '100%' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {(items || []).map((item, idx) => (
          <li key={idx} style={{ fontSize: '15.5px', lineHeight: '1.7', color: '#333' }}>{item}</li>
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

  // Состояния аккаунта
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATARS[0]);

  // Title Lab
  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("channel_scope_user");
    if (savedUser) setUser(JSON.parse(savedUser)); else setIsRegistering(true);
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regName || !regCode) return;
    const newUser = { name: regName, avatar: regAvatar, code: regCode };
    localStorage.setItem("channel_scope_user", JSON.stringify(newUser));
    setUser(newUser); setIsRegistering(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("channel_scope_user");
    setUser(null); setIsRegistering(true);
  };

  async function handleSubmit(event) {
    event.preventDefault();
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
    setTitleLoading(true); setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode: user.code }),
      });
      const data = await res.json();
      setTitleResult(data);
    } catch (err) { alert(err.message); } finally { setTitleLoading(false); }
  }

  async function handlePlanDetails() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result, accessCode: user.code }),
      });
      const data = await res.json();
      setPlanDetails(data);
    } catch (err) { alert(err.message); } finally { setPlanLoading(false); }
  }

  // Данные для графика
  const chartData = result?.videos?.map(v => ({
    name: v.title.substring(0, 15),
    views: v.viewCount,
  })).reverse() || [];

  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '420px', textAlign: 'center', border: '2px solid #ff7a50', padding: '40px' }}>
          <span style={{ fontSize: '50px' }}>{regAvatar}</span>
          <h2>Создать профиль PRO</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
            <input type="text" placeholder="Имя" className="hero-form input" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', color: '#000' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
            <input type="password" placeholder="Код доступа" className="hero-form input" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', color: '#000' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit">Начать работу</button>
          </form>
        </div>
      </main>
    );
  }

  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      {/* ПАНЕЛЬ ПРОФИЛЯ */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '15px 30px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span style={{ fontSize: '32px' }}>{user?.avatar}</span>
           <div><div style={{ fontWeight: 'bold', fontSize: '18px', color: '#000' }}>{user?.name}</div><div style={{ fontSize: '11px', color: '#22c55e' }}>● PRO ACCOUNT</div></div>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#ff7a50', cursor: 'pointer', fontWeight: 'bold' }}>ВЫЙТИ</button>
      </header>

      <section className="hero">
        <h1 style={{ fontSize: '64px', fontWeight: '900', marginBottom: '15px' }}>Channel Scope</h1>
        <p style={{ fontSize: '19px', color: '#666', maxWidth: '800px', margin: '0 auto 40px' }}>Ваша персональная студия AI-аналитики для взрывного роста на YouTube.</p>

        <form className="hero-form" onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto 50px' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Вставьте ссылку на канал..." style={{ padding: '18px', fontSize: '18px' }} />
          <button className="primary-button" type="submit" disabled={loading} style={{ padding: '0 40px' }}>
            {loading ? "Идет сбор данных..." : "Запустить полный аудит"}
          </button>
        </form>

        {/* --- ШИРОКАЯ TITLE LAB --- */}
        <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff', padding: '40px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: 0 }}>Title Lab — Лаборатория заголовков</h2>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>10 ВАРИАНТОВ</span>
          </div>
          
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            <input type="text" style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', color: '#000' }} placeholder="Введите будущий заголовок ролика..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0, padding: '0 40px' }}>{titleLoading ? "..." : "Оценить"}</button>
          </form>

          {titleResult && (
            <div style={{ background: '#fcfcfc', padding: '35px', borderRadius: '15px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '40px', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '72px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '10px' }}>Вердикт AI</h3>
                  <p style={{ fontSize: '17px', lineHeight: '1.6', color: '#333' }}>{titleResult.analysis}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <BulletList title="Сильные стороны (Плюсы)" items={titleResult.pros} />
                 <BulletList title="Критические недочеты (Минусы)" items={titleResult.cons} />
              </div>

              <div style={{ marginTop: '40px', padding: '30px', background: '#fff', border: '1px solid #ff7a50', borderRadius: '15px' }}>
                <h4 style={{ color: '#ff7a50', marginBottom: '20px', fontSize: '18px' }}>10 улучшенных AI-вариантов (Нажми для копирования)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} style={{ padding: '15px', background: '#fff8f6', border: '1px dashed #ff7a50', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', color: '#000' }}>{v}</div>
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
          {/* ШАПКА РЕЗУЛЬТАТОВ */}
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.98)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta">
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" />}
              <div>
                <h2>{result.channel.title}</h2>
                <p style={{ fontSize: '17px', lineHeight: '1.6' }}>{result.analysis.summary}</p>
              </div>
            </div>
          </section>

          {/* ШИРОКИЕ МЕТРИКИ */}
          <section className="metrics-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '40px' }}>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="База лояльных зрителей, требующая регулярного удержания через новые форматы." />
            <MetricCard label="ПРОСМОТРЫ КАНАЛА" value={formatNumber(result.channel.viewCount)} hint="Общий авторитет канала за все время существования." />
            <MetricCard label="СРЕДНИЕ ПРОСМОТРЫ" value={formatNumber(result.stats.averages.views)} hint="Средняя планка охвата одного ролика. Ориентир для новых запусков." />
            <MetricCard label="СРЕДНИЙ ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Показатель 'живости' аудитории: процент лайков и комментариев." />
          </section>

          {/* ГРАФИК ПРОСМОТРОВ (ВМЕСТО ТАБЛИЦЫ) */}
          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3 style={{ marginBottom: '30px' }}>Динамика популярности контента (60 видео)</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff7a50" stopOpacity={0.8}/><stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" hide />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="muted" style={{ marginTop: '20px', textAlign: 'center' }}>Пики на графике означают виральные хиты, которые вышли за рамки обычной аудитории.</p>
          </section>

          {/* СПИСКИ АУДИТА */}
          <section className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
            <BulletList title="Преимущества канала" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Критические недочеты" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Форматы, которые 'залетают'" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Паттерны, тянущие вниз" items={result.analysis.contentPatterns.underperformingPatterns} />
          </section>

          {/* ТОП ВИДЕО */}
          {topVideo && (
            <section className="spotlight" style={{ marginTop: '40px' }}>
              <div className="spotlight-main">
                <span className="eyebrow">Самое популярное видео</span>
                <h3 style={{ fontSize: '28px', margin: '15px 0' }}>{topVideo.title}</h3>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer" style={{ fontSize: '18px' }}>Открыть видео на YouTube ↗</a>
              </div>
              <div className="spotlight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <BulletList title="Почему это стало хитом" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Элементы для повторения" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </section>
          )}

          {/* КОНКУРЕНТЫ */}
          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3>Конкурентная разведка — что смотрят прямо сейчас</h3>
            <div className="competitor-grid" style={{ marginTop: '30px' }}>
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card" style={{ padding: '25px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#ff7a50', fontWeight: 'bold', fontSize: '19px', display: 'block', marginBottom: '10px' }}>{v.title} ↗</a>
                  <p className="muted" style={{ marginBottom: '20px' }}>Канал: {v.channelTitle}</p>
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#444' }}>
                    <strong>Секрет успеха:</strong>
                    <ul style={{ paddingLeft: '20px', margin: '10px 0 20px' }}>{v.whyItPopped.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                    <strong>Что адаптировать:</strong>
                    <ul style={{ paddingLeft: '20px' }}>{v.ideasToAdapt.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ПЛАН РОСТА + ДЕТАЛИЗАЦИЯ */}
          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <span className="eyebrow">Стратегия 30 дней</span>
            <h3>Тактическая дорожная карта</h3>
            <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '30px' }}>
              <BulletList title="Первые 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="До 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ padding: '15px 50px', fontSize: '17px' }}>
                {planLoading ? "AI прорабатывает детали..." : "Раскрыть подробный пошаговый план"}
              </button>
            </div>

            {planDetails && (
              <div className="details-panel" style={{ marginTop: '50px', background: '#f5f7fa', padding: '40px', borderRadius: '20px' }}>
                <h3 style={{ marginBottom: '30px' }}>Инструкция по реализации (Фазы 1-4)</h3>
                <div className="phase-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '40px' }}>
                  {planDetails.details.phases.map((p, i) => (
                    <article className="phase-card" key={i} style={{ padding: '25px', background: '#fff', borderRadius: '15px', position: 'relative' }}>
                      <span className="phase-number" style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '24px', fontWeight: 'bold', color: '#ff7a50', opacity: 0.2 }}>{i+1}</span>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{p.title}</h4>
                      <p style={{ fontSize: '14.5px', color: '#555', marginBottom: '15px' }}>{p.objective}</p>
                      <strong style={{ fontSize: '14px', color: '#ff7a50' }}>Результат: {p.deliverable}</strong>
                    </article>
                  ))}
                </div>
                <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                   <BulletList title="Чек-лист выполнения" items={planDetails.details.checklist} />
                   <BulletList title="Метрики контроля" items={planDetails.details.metricsToWatch} />
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
