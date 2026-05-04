"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EXAMPLES = ["https://www.youtube.com/@MrBeast", "https://www.youtube.com/@aliabdaal", "https://www.youtube.com/@вдудь"];
const AVATARS = ["🚀", "👨‍💻", "🤖", "📈", "🔥", "🎧", "👾"];

const formatNumber = (v) => new Intl.NumberFormat("ru-RU").format(Number(v || 0));
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
    <article className="metric-card" style={{ flex: '1 1 280px', textAlign: 'left', padding: '30px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <span className="eyebrow" style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#ff7a50', fontWeight: 'bold' }}>{label}</span>
      <strong style={{ fontSize: '32px', display: 'block', margin: '15px 0' }}>{value}</strong>
      <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{hint}</p>
    </article>
  );
}

// Улучшенный список с ограничением в 15 элементов
function BulletList({ title, items }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="list-card" style={{ padding: '30px', width: '100%', background: '#fff', borderRadius: '20px', border: '1px solid #eee' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '22px', color: '#111', borderBottom: '3px solid #ff7a50', paddingBottom: '10px', display: 'inline-block' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '20px' }}>
        {safeItems.slice(0, 15).map((item, idx) => (
          <li key={idx} style={{ fontSize: '15.5px', lineHeight: '1.7', color: '#333' }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATARS[0]);

  const [channelUrl, setChannelUrl] = useState(EXAMPLES[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planDetails, setPlanDetails] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  const [radar, setRadar] = useState([]);
  const [radarInput, setRadarInput] = useState("");
  const [tgIdInput, setTgIdInput] = useState("");

  const [commentResult, setCommentResult] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const savedCode = localStorage.getItem("yt_access_code");
      if (savedCode) {
        const docSnap = await getDoc(doc(db, "users", savedCode));
        if (docSnap.exists()) {
          setUser(docSnap.data());
          setTgIdInput(docSnap.data().telegramId || "");
          loadRadar(savedCode);
        } else { setIsRegistering(true); }
      } else { setIsRegistering(true); }
    };
    checkUser();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regCode) return;
    const userData = { name: regName, avatar: regAvatar, code: regCode, telegramId: "" };
    await setDoc(doc(db, "users", regCode), userData);
    localStorage.setItem("yt_access_code", regCode);
    setUser(userData); setIsRegistering(false);
    loadRadar(regCode);
  };

  const updateTgId = async () => {
    await updateDoc(doc(db, "users", user.code), { telegramId: tgIdInput });
    setUser({...user, telegramId: tgIdInput});
    alert("Telegram ID привязан!");
  };

  const loadRadar = async (code) => {
    const q = await getDocs(collection(db, "users", code, "radar"));
    setRadar(q.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const addToRadar = async () => {
    if (!radarInput || !user.telegramId) { alert("Привяжите TG ID!"); return; }
    const docRef = await addDoc(collection(db, "users", user.code, "radar"), { url: radarInput, addedAt: new Date(), lastVideoId: "" });
    await fetch("/api/notify-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, channelUrl: radarInput }) });
    setRadar([...radar, { id: docRef.id, url: radarInput }]);
    setRadarInput("");
  };

  const deleteFromRadar = async (id) => {
    await deleteDoc(doc(db, "users", user.code, "radar", id));
    setRadar(radar.filter(i => i.id !== id));
  };

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setResult(null); setPlanDetails(null); setCommentResult(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelUrl, accessCode: user.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleAnalyzeComments() {
    setCommentLoading(true);
    try {
      const res = await fetch("/api/analyze-comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: result.channel.id, accessCode: user.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error("AI вернул пустой ответ");
      setCommentResult(data);
    } catch (err) { alert("Ошибка анализа комментариев: " + err.message); } finally { setCommentLoading(false); }
  }

  async function handleCheckTitle(e) {
    e.preventDefault(); setTitleLoading(true);
    try {
      const res = await fetch("/api/check-title", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: testTitle, accessCode: user.code }) });
      const data = await res.json();
      setTitleResult(data);
    } catch (err) { alert("AI Error"); } finally { setTitleLoading(false); }
  }

  async function handlePlanDetails() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...result, accessCode: user.code }) });
      const data = await res.json();
      setPlanDetails(data);
    } catch (err) { alert("Ошибка детализации"); } finally { setPlanLoading(false); }
  }

  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '450px', textAlign: 'center', border: '2px solid #ff7a50', padding: '50px' }}>
          <h2>Вход в PRO Систему</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <input type="text" placeholder="Имя" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
               {AVATARS.map(a => <button key={a} type="button" onClick={() => setRegAvatar(a)} style={{ fontSize: '28px', background: regAvatar === a ? '#fff1ed' : 'transparent', border: 'none', cursor: 'pointer' }}>{a}</button>)}
            </div>
            <input type="password" placeholder="Код доступа" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit">АКТИВИРОВАТЬ</button>
          </form>
        </div>
      </main>
    );
  }

  const chartData = result?.videos?.map(v => ({ name: v.title.substring(0, 10), views: v.viewCount })).reverse() || [];
  const topVideo = result?.stats?.leaders?.topVideo;
  const monthlyViews = (result?.stats?.averages?.viewsPerDay || 0) * 30;

  return (
    <main className="page-shell">
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '15px 30px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span style={{ fontSize: '32px' }}>{user?.avatar}</span>
           <div><div style={{ fontWeight: 'bold', fontSize: '18px' }}>{user?.name}</div><div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>● PRO DASHBOARD ACTIVE</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
           <a href={`/pro/${user?.code}`} target="_blank" style={{ color: '#ff7a50', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>MEDIA KIT 📄</a>
           <div style={{ display: 'flex', gap: '8px', background: '#f9f9f9', padding: '5px', borderRadius: '8px' }}>
              <input type="text" placeholder="TG ID" style={{ width: '90px', padding: '8px', fontSize: '12px' }} value={tgIdInput} onChange={(e) => setTgIdInput(e.target.value)} />
              <button onClick={updateTgId} style={{ background: '#ff7a50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', padding: '0 10px' }}>Привязать</button>
           </div>
           <button onClick={() => {localStorage.removeItem("yt_access_code"); location.reload();}} style={{ color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>ВЫЙТИ</button>
        </div>
      </header>

      <section className="hero">
        <h1 style={{ fontSize: '84px', fontWeight: '900', letterSpacing: '-3px' }}>Channel Scope</h1>
        <form className="hero-form" onSubmit={handleSubmit} style={{ margin: '0 auto 60px', maxWidth: '900px' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Вставьте ссылку на YouTube канал..." style={{ padding: '20px', fontSize: '18px' }} />
          <button className="primary-button" type="submit" disabled={loading} style={{ padding: '0 40px', fontSize: '18px' }}>{loading ? "Идет расчет..." : "Провести полный аудит"}</button>
        </form>

        {/* RADAR */}
        <div className="panel" style={{ marginBottom: '40px', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
           <h3 style={{ marginBottom: '20px' }}>📡 Мой Радар (Облачное отслеживание)</h3>
           <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input type="text" placeholder="Ссылка на конкурента (@handle)..." style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9' }} value={radarInput} onChange={(e) => setRadarInput(e.target.value)} />
              <button onClick={addToRadar} className="primary-button" style={{ margin: 0, padding: '0 40px' }}>ДОБАВИТЬ В РАДАР</button>
           </div>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {radar.map(item => (
                <div key={item.id} style={{ background: '#f8f9fa', padding: '12px 20px', borderRadius: '50px', border: '1px solid #eee', fontSize: '14px', display: 'flex', gap: '15px', alignItems: 'center', fontWeight: 'bold' }}>
                  <span>{item.url.split('@')[1] || item.url}</span>
                  <button onClick={() => deleteFromRadar(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>
              ))}
           </div>
        </div>

        {/* TITLE LAB */}
        <div className="panel" style={{ border: '3px solid #ff7a50', background: '#fff', padding: '50px', textAlign: 'left', borderRadius: '25px' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '30px' }}>Title Lab PRO — Симулятор кликов</h2>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '15px', marginBottom: '40px' }}>
            <input type="text" style={{ flex: 1, padding: '20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '20px', color: '#000' }} placeholder="Введите будущий заголовок..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0, padding: '0 50px' }}>{titleLoading ? "..." : "Оценить"}</button>
          </form>
          {titleResult && (
            <div>
              <div style={{ display: 'flex', gap: '40px', background: '#fcfcfc', padding: '40px', borderRadius: '20px', border: '1px solid #eee', marginBottom: '30px' }}>
                 <div style={{ fontSize: '80px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                 <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#333' }}><strong>Вердикт аналитика:</strong> {titleResult.analysis}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                 <BulletList title="Сильные триггеры" items={titleResult.pros} />
                 <BulletList title="Что мешает CTR" items={titleResult.cons} />
              </div>
              <div className="list-card" style={{ width: '100%', border: '2px solid #ff7a50', background: '#fff', borderRadius: '25px', padding: '40px' }}>
                <h3 style={{ color: '#ff7a50', marginBottom: '25px' }}>10 Виральных стратегий (Нажми для копирования):</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {(titleResult.improvements || []).slice(0, 15).map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} 
                         style={{ padding: '15px', background: '#fff9f7', border: '1px dashed #ff7a50', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', color: '#111', fontWeight: 'bold' }}>
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
          {/* INCOME + METRICS */}
          <section style={{ display: 'flex', gap: '20px', marginTop: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', background: '#111', color: '#fff', padding: '40px', borderRadius: '25px', border: '1px solid #333' }}>
              <span style={{ color: '#ff7a50', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px' }}>ESTIMATED REVENUE</span>
              <div style={{ fontSize: '56px', fontWeight: '900', margin: '15px 0', color: '#ff7a50' }}>${formatNumber(Math.round(monthlyViews/1000))} - ${formatNumber(Math.round(monthlyViews/1000*3.5))}</div>
              <p style={{ color: '#888', fontSize: '14px' }}>На основе {formatNumber(monthlyViews)} просмотров в месяц.</p>
            </div>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="Активная база лояльных зрителей." />
            <MetricCard label="ENGAGEMENT (ER)" value={formatPercent(result.stats.averages.engagementRate)} hint="Уровень вовлеченности аудитории." />
          </section>

          {/* КОММЕНТАРИИ (С ЗАЩИТОЙ) */}
          <section className="panel" style={{ marginTop: '40px', padding: '50px', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
               <h3 style={{ margin: 0, color: '#166534' }}>📊 Анализ сообщества (Золотая жила)</h3>
               <button onClick={handleAnalyzeComments} disabled={commentLoading} className="primary-button" style={{ background: '#22c55e', margin: 0 }}>
                 {commentLoading ? "СКАНИРУЮ..." : "СКАНИРОВАТЬ КОММЕНТАРИИ"}
               </button>
            </div>
            {commentResult && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px' }}>
                <BulletList title="Запросы аудитории" items={commentResult?.requests || []} />
                <BulletList title="Критика и боли" items={commentResult?.complaints || []} />
                <BulletList title="Идеи для хайпа" items={commentResult?.themes || []} />
              </div>
            )}
          </section>

          {/* ГРАФИК */}
          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3>Динамика просмотров</h3>
            <div style={{ width: '100%', height: 450 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff7a50" stopOpacity={0.4}/><stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" hide /><YAxis stroke="#999" fontSize={12} /><Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" strokeWidth={4} fill="url(#v)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* АУДИТ */}
          <section className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
            <BulletList title="Преимущества стратегии" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Критические упущения" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Форматы-лидеры" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Паттерны деградации" items={result.analysis.contentPatterns.underperformingPatterns} />
          </section>

          {topVideo && (
            <section className="spotlight" style={{ marginTop: '40px', padding: '50px' }}>
              <div className="spotlight-main">
                <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ЗОЛОТОЙ РЕФЕРЕНС КАНАЛА</span>
                <h3 style={{ fontSize: '36px', margin: '20px 0' }}>{topVideo.title}</h3>
                <a className="primary-button" href={topVideo.url} target="_blank" rel="noreferrer">СМОТРЕТЬ И ИЗУЧАТЬ ↗</a>
              </div>
              <div className="spotlight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
                <BulletList title="Почему это стало хитом" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Как это повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </section>
          )}

          {/* ПЛАН РОСТА */}
          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3 style={{ fontSize: '32px' }}>Тактический Roadmap на 30 дней</h3>
            <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '40px' }}>
              <BulletList title="Первые 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="Цели на 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <button className="primary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ padding: '20px 60px', fontSize: '20px' }}>
                {planLoading ? "AI СОСТАВЛЯЕТ ИНСТРУКЦИЮ..." : "ПОЛУЧИТЬ ПОШАГОВЫЙ ПЛАН ВЫПОЛНЕНИЯ"}
              </button>
            </div>
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '60px', background: '#f5f7fa', padding: '50px', borderRadius: '30px' }}>
                <h3 style={{ marginBottom: '40px', textAlign: 'center' }}>Пошаговый план внедрения (Фазы 1-4)</h3>
                <div className="phase-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px' }}>
                  {(planDetails?.details?.phases || []).slice(0, 15).map((p, i) => (
                    <article key={i} style={{ padding: '35px', background: '#fff', borderRadius: '25px', borderLeft: '8px solid #ff7a50' }}>
                      <h4 style={{ color: '#111', fontSize: '22px', marginBottom: '15px' }}>{i+1}. {p.title}</h4>
                      <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.7', marginBottom: '20px' }}>{p.objective}</p>
                      <div style={{ background: '#fff1ed', padding: '10px', borderRadius: '10px', fontSize: '14px', color: '#ff7a50', fontWeight: 'bold' }}>РЕЗУЛЬТАТ: {p.deliverable}</div>
                    </article>
                  ))}
                </div>
                <div className="list-grid">
                   <BulletList title="Чек-лист для автора" items={planDetails?.details?.checklist} />
                   <BulletList title="Метрики для контроля роста" items={planDetails?.details?.metricsToWatch} />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* EXTENSION CENTER */}
      <section id="extension" className="panel" style={{ marginTop: '100px', background: '#0a0a0a', color: '#fff', padding: '80px 50px', textAlign: 'center', borderRadius: '35px', border: '4px solid #ff7a50' }}>
        <h2 style={{ color: '#ff7a50', fontSize: '48px', fontWeight: '900', marginBottom: '20px' }}>Установка Pulse PRO</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', textAlign: 'left', marginBottom: '60px' }}>
          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div><strong style={{ color: '#ff7a50', fontSize: '22px' }}>01. Загрузка</strong><p style={{ fontSize: '15px', color: '#888', marginTop: '15px' }}>Скачайте актуальную версию Pulse PRO.</p></div>
            <a href="/pulse-extension.zip" download style={{ display: 'block', background: '#ff7a50', color: '#fff', textDecoration: 'none', padding: '15px', borderRadius: '12px', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>СКАЧАТЬ ZIP</a>
          </div>
          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50', fontSize: '22px' }}>02. Активация</strong><p style={{ fontSize: '15px', color: '#888', marginTop: '15px' }}>Откройте chrome://extensions и включите "Режим разработчика".</p>
          </div>
          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50', fontSize: '22px' }}>03. Облачный ID</strong><p style={{ fontSize: '15px', color: '#888', marginTop: '15px' }}>Введите ваш персональный ID в расширение.</p>
          </div>
        </div>
        <div style={{ padding: '40px', background: '#000', border: '2px dashed #ff7a50', borderRadius: '25px', maxWidth: '600px', margin: '0 auto' }}>
          <code style={{ fontSize: '42px', color: '#ff7a50', fontWeight: '900' }}>{user?.code || "DEMO"}</code>
        </div>
      </section>
    </main>
  );
}
