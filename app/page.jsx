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

  // --- ЛОГИКА АККАУНТА ---
  const [user, setUser] = useState(null); // { name: '', avatar: '', code: '' }
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATARS[0]);

  // Title Lab State
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
    if (!regName || !regCode) {
      alert("Заполни все поля!");
      return;
    }
    const newUser = { name: regName, avatar: regAvatar, code: regCode };
    localStorage.setItem("channel_scope_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsRegistering(false);
  };

  const handleLogout = () => {
    if (confirm("Выйти из аккаунта? Все данные профиля будут удалены.")) {
      localStorage.removeItem("channel_scope_user");
      setUser(null);
      setIsRegistering(true);
    }
  };

  // --- ФУНКЦИИ АНАЛИЗА ---
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
        body: JSON.stringify({ ...result, accessCode: user.code }),
      });
      const data = await res.json();
      setPlanDetails(data);
    } catch (err) { alert(err.message); } finally { setPlanLoading(false); }
  }

  // --- ЭКРАН РЕГИСТРАЦИИ ---
  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '400px', textAlign: 'center', border: '2px solid #ff7a50' }}>
          <span style={{ fontSize: '40px' }}>{regAvatar}</span>
          <h2>Создать аккаунт</h2>
          <p className="muted">Добро пожаловать в Channel Scope PRO</p>
          
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input 
              type="text" 
              placeholder="Твое имя" 
              className="hero-form input"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {AVATARS.map(a => (
                <button 
                  key={a} 
                  type="button" 
                  onClick={() => setRegAvatar(a)}
                  style={{ fontSize: '24px', background: regAvatar === a ? '#fff1ed' : 'transparent', border: regAvatar === a ? '1px solid #ff7a50' : 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  {a}
                </button>
              ))}
            </div>

            <input 
              type="password" 
              placeholder="Код доступа админа" 
              className="hero-form input"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              value={regCode}
              onChange={(e) => setRegCode(e.target.value)}
            />

            <button className="primary-button" type="submit">Начать работу</button>
          </form>
        </div>
      </main>
    );
  }

  // --- ОСНОВНОЙ КОНТЕНТ ---
  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      {/* ПАНЕЛЬ ПРОФИЛЯ */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '10px 20px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ fontSize: '32px', background: '#fff1ed', padding: '10px', borderRadius: '50%' }}>{user?.avatar}</div>
           <div>
             <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#000' }}>{user?.name}</div>
             <div style={{ fontSize: '12px', color: '#22c55e' }}>● Лицензия активна</div>
           </div>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#ff7a50', cursor: 'pointer', fontSize: '14px' }}>Выйти</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">PRO-DASHBOARD • {user?.name}</span>
          <h1>Channel Scope</h1>
          <p>Твой персональный AI-ассистент готов к работе.</p>
        </div>

        <form className="hero-form" onSubmit={handleSubmit}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на канал..." />
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Анализирую..." : "Запустить аудит"}
          </button>
        </form>

        {/* TITLE LAB */}
        <div className="panel" style={{ marginTop: '20px', border: '2px solid #ff7a50', background: '#fff' }}>
          <h3 style={{ margin: 0, color: '#000' }}>Title Lab — Анализ заголовка</h3>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <input
              type="text"
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }}
              placeholder="Введи заголовок..."
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
            <button className="primary-button" type="submit" disabled={titleLoading}>
              {titleLoading ? "..." : "Оценить"}
            </button>
          </form>

          {titleResult && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '20px' }}>
                <div style={{ fontSize: '50px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <p style={{ color: '#000', margin: 0 }}><strong>Вердикт:</strong> {titleResult.analysis}</p>
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50' }}>
                <h3 style={{ color: '#ff7a50' }}>10 виральных вариантов (кликни для копирования)</h3>
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
          {/* Здесь весь твой код отображения результатов, я его оставил без изменений */}
          <section className="metrics-grid">
            <MetricCard label="Подписчики" value={formatNumber(result.channel.subscriberCount)} hint="Всего" />
            <MetricCard label="Просмотры" value={formatNumber(result.channel.viewCount)} hint="Суммарно" />
            <MetricCard label="Средний ER" value={formatPercent(result.stats.averages.engagementRate)} hint="Вовлеченность" />
          </section>

          <section className="list-grid">
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
          </section>

          <section className="panel">
            <h3>План на 30 дней</h3>
            <div className="list-grid">
              <BulletList title="7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="30 дней" items={result.analysis.actionPlan.next30Days} />
            </div>
            <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ marginTop: '20px' }}>
              {planLoading ? "AI думает..." : "Подробный чеклист"}
            </button>
            {planDetails && (
              <div style={{ marginTop: '20px', background: '#f0f4f8', padding: '20px', borderRadius: '12px' }}>
                 <BulletList title="Твой чеклист" items={planDetails.details.checklist} />
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
