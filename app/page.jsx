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
    <article className="metric-card" style={{ flex: '1 1 300px', textAlign: 'left', padding: '30px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <span className="eyebrow" style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#ff7a50', fontWeight: 'bold' }}>{label}</span>
      <strong style={{ fontSize: '36px', display: 'block', margin: '15px 0' }}>{value}</strong>
      <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5' }}>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="list-card" style={{ padding: '30px', width: '100%', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '22px', borderBottom: '2px solid #ff7a50', paddingBottom: '10px', display: 'inline-block' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '20px' }}>
        {(items || []).map((item, idx) => (<li key={idx} style={{ fontSize: '15.5px', lineHeight: '1.7', color: '#333' }}>{item}</li>))}
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
  const [planDetails, setPlanDetails] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  const [radar, setRadar] = useState([]);
  const [radarInput, setRadarInput] = useState("");
  const [tgIdInput, setTgIdInput] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const savedCode = localStorage.getItem("yt_access_code");
      if (savedCode) {
        const docRef = doc(db, "users", savedCode);
        const docSnap = await getDoc(docRef);
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
  };

  const updateTgId = async () => {
    await updateDoc(doc(db, "users", user.code), { telegramId: tgIdInput });
    setUser({...user, telegramId: tgIdInput});
    alert("Telegram ID привязан к облаку!");
  };

  const loadRadar = async (code) => {
    const q = await getDocs(collection(db, "users", code, "radar"));
    setRadar(q.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const addToRadar = async () => {
    if (!radarInput || !user.telegramId) { alert("Сначала привяжите Telegram ID!"); return; }
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
    e.preventDefault(); setLoading(true); setResult(null); setPlanDetails(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelUrl, accessCode: user.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
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
    } catch (err) { alert("Error"); } finally { setPlanLoading(false); }
  }

  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
        <div className="panel" style={{ width: '450px', textAlign: 'center', border: '2px solid #ff7a50', padding: '50px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '10px' }}>Вход в PRO Систему</h2>
          <p className="muted" style={{ marginBottom: '30px' }}>Ваш ключ к управлению охватами</p>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input type="text" placeholder="Имя профиля" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
               {AVATARS.map(a => <button key={a} type="button" onClick={() => setRegAvatar(a)} style={{ fontSize: '28px', background: regAvatar === a ? '#fff1ed' : 'transparent', border: regAvatar === a ? '1px solid #ff7a50' : 'none', borderRadius: '8px', cursor: 'pointer', padding: '5px' }}>{a}</button>)}
            </div>
            <input type="password" placeholder="Код администратора" style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit" style={{ fontSize: '18px' }}>АКТИВИРОВАТЬ АККАУНТ</button>
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
           <div><div style={{ fontWeight: 'bold', fontSize: '20px', color: '#111' }}>{user?.name}</div><div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>● PRO DASHBOARD ACTIVE</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
           <div style={{ display: 'flex', gap: '8px', background: '#f9f9f9', padding: '5px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <input type="text" placeholder="Telegram ID" style={{ width: '120px', padding: '8px', fontSize: '13px', background: 'transparent', border: 'none' }} value={tgIdInput} onChange={(e) => setTgIdInput(e.target.value)} />
              <button onClick={updateTgId} style={{ background: '#ff7a50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', padding: '0 15px' }}>Привязать</button>
           </div>
           <button onClick={() => {localStorage.removeItem("yt_access_code"); location.reload();}} style={{ color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>ВЫЙТИ</button>
        </div>
      </header>

      <section className="hero">
        <h1 style={{ fontSize: '72px', fontWeight: '900', letterSpacing: '-2px' }}>Channel Scope</h1>
        <p style={{ fontSize: '20px', color: '#666', maxWidth: '800px', margin: '0 auto 40px' }}>Глубокая аналитика YouTube-стратегий и лаборатория виральных заголовков.</p>

        <form className="hero-form" onSubmit={handleSubmit} style={{ margin: '0 auto 60px', maxWidth: '900px' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Вставьте ссылку на YouTube канал..." style={{ padding: '20px', fontSize: '18px' }} />
          <button className="primary-button" type="submit" disabled={loading} style={{ padding: '0 40px', fontSize: '18px' }}>{loading ? "Идет расчет..." : "Провести полный аудит"}</button>
        </form>

        {/* RADAR */}
        <div className="panel" style={{ marginBottom: '40px', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ margin: 0 }}>📡 Мой Радар (Облачная слежка)</h3>
             <span style={{ fontSize: '12px', background: '#ff7a50', color: '#fff', padding: '4px 10px', borderRadius: '50px' }}>{radar.length} / 10 КАНАЛОВ</span>
           </div>
           {!user?.telegramId && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '15px' }}>⚠️ <b>Важно:</b> Привяжите Telegram ID в шапке сайта, чтобы получать алерты о новых видео!</p>}
           <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input type="text" placeholder="Ссылка на конкурента (@handle или URL)..." style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #eee', background: '#f9f9f9' }} value={radarInput} onChange={(e) => setRadarInput(e.target.value)} />
              <button onClick={addToRadar} className="primary-button" style={{ margin: 0, padding: '0 40px' }}>ДОБАВИТЬ В РАДАР</button>
           </div>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {radar.map(item => (
                <div key={item.id} style={{ background: '#f8f9fa', padding: '12px 20px', borderRadius: '50px', border: '1px solid #eee', fontSize: '14px', display: 'flex', gap: '15px', alignItems: 'center', fontWeight: 'bold' }}>
                  <span>{item.url.split('@')[1] || item.url}</span>
                  <button onClick={() => deleteFromRadar(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>
              ))}
           </div>
        </div>

        {/* --- IMPROVED WIDE TITLE LAB --- */}
        <div className="panel" style={{ border: '3px solid #ff7a50', background: '#fff', padding: '50px', textAlign: 'left', borderRadius: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '32px', margin: 0 }}>Title Lab PRO — Симулятор кликов</h2>
            <div style={{ background: '#fff1ed', color: '#ff7a50', padding: '8px 20px', borderRadius: '50px', fontWeight: '900' }}>AI ANALYTICS</div>
          </div>
          
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '15px', marginBottom: '40px' }}>
            <input type="text" style={{ flex: 1, padding: '20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '20px', color: '#000', outline: 'none' }} placeholder="Введите ваш вариант заголовка для глубокого разбора..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0, padding: '0 50px', fontSize: '18px' }}>{titleLoading ? "Думаю..." : "Оценить"}</button>
          </form>

          {titleResult && (
            <div style={{ animation: 'fadeIn 0.5s' }}>
              <div style={{ display: 'flex', gap: '50px', background: '#fcfcfc', padding: '40px', borderRadius: '20px', border: '1px solid #eee', marginBottom: '30px' }}>
                 <div style={{ textAlign: 'center', minWidth: '150px' }}>
                    <div style={{ fontSize: '84px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b', lineHeight: '1' }}>{titleResult.score}%</div>
                    <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>CTR Potential</div>
                 </div>
                 <div style={{ borderLeft: '2px solid #eee', paddingLeft: '50px' }}>
                    <h3 style={{ marginBottom: '15px', color: '#ff7a50' }}>Глубокий вердикт аналитика:</h3>
                    <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#333' }}>{titleResult.analysis}</p>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                 <div style={{ background: '#f0fdf4', padding: '30px', borderRadius: '20px', border: '1px solid #dcfce7' }}>
                    <h4 style={{ color: '#166534', marginBottom: '15px', fontSize: '18px' }}>🚀 Триггеры роста (Плюсы)</h4>
                    <ul style={{ paddingLeft: '20px' }}>{titleResult.pros.map((v, i) => <li key={i} style={{ marginBottom: '10px', fontSize: '15px', lineHeight: '1.6' }}>{v}</li>)}</ul>
                 </div>
                 <div style={{ background: '#fef2f2', padding: '30px', borderRadius: '20px', border: '1px solid #fee2e2' }}>
                    <h4 style={{ color: '#991b1b', marginBottom: '15px', fontSize: '18px' }}>⚠️ Ошибки упаковки (Минусы)</h4>
                    <ul style={{ paddingLeft: '20px' }}>{titleResult.cons.map((v, i) => <li key={i} style={{ marginBottom: '10px', fontSize: '15px', lineHeight: '1.6' }}>{v}</li>)}</ul>
                 </div>
              </div>

              <div className="list-card" style={{ width: '100%', border: '2px solid #ff7a50', background: '#fff', borderRadius: '25px', padding: '40px' }}>
                <h3 style={{ color: '#ff7a50', marginBottom: '25px', fontSize: '24px' }}>10 Виральных стратегий для этого ролика:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} 
                         style={{ padding: '18px', background: '#fff9f7', border: '1px dashed #ff7a50', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', color: '#111', fontWeight: 'bold', transition: '0.2s' }}>
                      {i + 1}. {v}
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: '20px', color: '#999', fontSize: '13px' }}>* Нажмите на заголовок, чтобы мгновенно скопировать его в буфер обмена.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <>
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.95)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta" style={{ padding: '40px' }}>
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" style={{ width: '120px', height: '120px', border: '4px solid #fff' }} />}
              <div>
                <h2 style={{ fontSize: '42px', fontWeight: '900' }}>{result.channel.title}</h2>
                <p style={{ fontSize: '18px', color: '#444', maxWidth: '900px', lineHeight: '1.6' }}>{result.analysis.summary}</p>
              </div>
            </div>
          </section>

          {/* INCOME + WIDE METRICS */}
          <section style={{ display: 'flex', gap: '20px', marginTop: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', background: 'linear-gradient(135deg, #111, #222)', color: '#fff', padding: '40px', borderRadius: '20px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <span style={{ color: '#ff7a50', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Прогноз дохода в месяц</span>
              <div style={{ fontSize: '56px', fontWeight: '900', margin: '15px 0', color: '#ff7a50' }}>${formatNumber(Math.round(monthlyViews/1000))} - ${formatNumber(Math.round(monthlyViews/1000*3.5))}</div>
              <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>Примерный расчет на основе <b>{formatNumber(monthlyViews)}</b> органических просмотров в месяц. Не включает доход от прямых интеграций и продажи курсов.</p>
            </div>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="Активная база зрителей. При таком объеме рекомендуется выпускать не менее 2 качественных видео в неделю для удержания темпов роста." />
            <MetricCard label="СРЕДНИЕ ПРОСМОТРЫ" value={formatNumber(result.stats.averages.views)} hint="Ваш стандарт качества. Ролики, набирающие меньше этой цифры за 48 часов, требуют срочной смены обложки или заголовка." />
            <MetricCard label="ENGAGEMENT (ER)" value={formatPercent(result.stats.averages.engagementRate)} hint="Показатель лояльности. Норма для вашей ниши: 2-4%. Если цифра ниже — работайте над призывами к действию в середине ролика." />
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '30px' }}>Динамика популярности контента (Последние 60 видео)</h3>
            <div style={{ width: '100%', height: 450 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff7a50" stopOpacity={0.4}/><stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" hide /><YAxis stroke="#999" fontSize={12} tickFormatter={(v) => v > 1000000 ? (v/1000000).toFixed(1) + 'M' : v} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" strokeWidth={4} fill="url(#v)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>Пики на графике — это ваши 'вечнозеленые' хиты. Провалы — темы, которые не интересны вашей текущей аудитории.</p>
          </section>

          <section className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
            <BulletList title="Сильные стороны стратегии" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Критические упущения" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Что 'взлетает' сейчас" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Форматы-пустышки" items={result.analysis.contentPatterns.underperformingPatterns} />
          </section>

          {topVideo && (
            <section className="spotlight" style={{ marginTop: '40px', padding: '50px' }}>
              <div className="spotlight-main">
                <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ЗОЛОТОЙ РЕФЕРЕНС КАНАЛА</span>
                <h3 style={{ fontSize: '36px', margin: '20px 0' }}>{topVideo.title}</h3>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                   <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '10px', border: '1px solid #ddd' }}><b>{formatNumber(topVideo.viewCount)}</b> просмотров</div>
                   <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '10px', border: '1px solid #ddd' }}><b>{formatPercent(topVideo.engagementRate)}</b> вовлеченность</div>
                </div>
                <a className="primary-button" href={topVideo.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'inline-block' }}>СМОТРЕТЬ И ИЗУЧАТЬ ↗</a>
              </div>
              <div className="spotlight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
                <BulletList title="Почему этот ролик стал хитом" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Как это повторить (Action)" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </section>
          )}

          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3>Конкурентная разведка (Рекомендации к просмотру)</h3>
            <div className="competitor-grid" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} style={{ padding: '35px', background: '#fff', borderRadius: '25px', border: '1px solid #eee', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ color: '#111', fontWeight: '900', fontSize: '22px', textDecoration: 'none', display: 'block', lineHeight: '1.3' }}>{v.title}</a>
                  <p style={{ color: '#ff7a50', fontWeight: 'bold', margin: '15px 0', fontSize: '14px' }}>КАНАЛ: {v.channelTitle.toUpperCase()}</p>
                  <div style={{ marginTop: '20px', background: '#f9f9f9', padding: '20px', borderRadius: '15px' }}>
                    <strong style={{ display: 'block', marginBottom: '10px', color: '#555' }}>Психология успеха:</strong>
                    <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>{v.whyItPopped.map((i, idx) => <li key={idx} style={{ marginBottom: '8px' }}>{i}</li>)}</ul>
                    <strong style={{ display: 'block', margin: '20px 0 10px', color: '#555' }}>Идеи для вашей адаптации:</strong>
                    <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>{v.ideasToAdapt.map((i, idx) => <li key={idx} style={{ marginBottom: '8px' }}>{i}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <span className="eyebrow" style={{ color: '#ff7a50', fontWeight: 'bold' }}>ROADMAP НА 30 ДНЕЙ</span>
            <h3 style={{ fontSize: '32px' }}>Тактическая стратегия масштабирования</h3>
            <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '40px' }}>
              <BulletList title="Ближайшие 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="Цели на 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Смелые эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <button className="primary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ padding: '20px 60px', fontSize: '20px' }}>
                {planLoading ? "AI СОСТАВЛЯЕТ ИНСТРУКЦИЮ..." : "ПОЛУЧИТЬ ПОШАГОВЫЙ ПЛАН ВЫПОЛНЕНИЯ"}
              </button>
            </div>
            {planDetails && (
              <div style={{ marginTop: '60px', background: '#f5f7fa', padding: '50px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '40px', textAlign: 'center' }}>Пошаговый план внедрения (Фазы 1-4)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px' }}>
                  {planDetails?.details?.phases?.map((p, i) => (
                    <article key={i} style={{ padding: '35px', background: '#fff', borderRadius: '25px', borderLeft: '8px solid #ff7a50', boxShadow: '0 10px 20px rgba(0,0,0,0.03)' }}>
                      <h4 style={{ color: '#111', fontSize: '22px', marginBottom: '15px' }}>{i+1}. {p.title}</h4>
                      <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.7', marginBottom: '20px' }}>{p.objective}</p>
                      <div style={{ background: '#fff1ed', padding: '15px', borderRadius: '10px', fontSize: '14px', color: '#ff7a50', fontWeight: 'bold' }}>РЕЗУЛЬТАТ: {p.deliverable}</div>
                    </article>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                   <BulletList title="Чек-лист для автора" items={planDetails?.details?.checklist} />
                   <BulletList title="Метрики для контроля роста" items={planDetails?.details?.metricsToWatch} />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* --- PRO EXTENSION CENTER --- */}
      <section id="extension" className="panel" style={{ marginTop: '100px', background: '#0a0a0a', color: '#fff', padding: '80px 50px', textAlign: 'center', borderRadius: '35px', border: '4px solid #ff7a50' }}>
        <h2 style={{ color: '#ff7a50', fontSize: '48px', fontWeight: '900', marginBottom: '20px' }}>Установка Pulse PRO</h2>
        <p style={{ color: '#aaa', fontSize: '18px', maxWidth: '700px', margin: '0 auto 60px' }}>Получайте аналитику любого видео прямо во время просмотра на YouTube. Без лишних переходов и ожидания.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', textAlign: 'left', marginBottom: '60px' }}>
          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: '#ff7a50', fontSize: '22px' }}>01. Загрузка</strong>
              <p style={{ fontSize: '15px', color: '#888', marginTop: '15px', lineHeight: '1.6' }}>Скачайте подготовленный архив расширения. В нем содержится актуальная версия системы Pulse.</p>
            </div>
            <a href="/pulse-extension.zip" download style={{ display: 'block', background: '#ff7a50', color: '#fff', textDecoration: 'none', padding: '15px', borderRadius: '12px', marginTop: '30px', fontWeight: 'bold', textAlign: 'center', fontSize: '18px' }}>СКАЧАТЬ АРХИВ .ZIP</a>
          </div>

          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50', fontSize: '22px' }}>02. Активация Chrome</strong>
            <p style={{ fontSize: '15px', color: '#888', marginTop: '15px', lineHeight: '1.6' }}>
              Введите в адресной строке <code>chrome://extensions</code>. <br/><br/>
              1. Включите <b>"Режим разработчика"</b> в правом верхнем углу. <br/>
              2. Нажмите <b>"Загрузить распакованное"</b> и выберите папку из архива.
            </p>
          </div>

          <div style={{ padding: '35px', background: '#1a1a1a', borderRadius: '25px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50', fontSize: '22px' }}>03. Облачная привязка</strong>
            <p style={{ fontSize: '15px', color: '#888', marginTop: '15px', lineHeight: '1.6' }}>Откройте расширение на YouTube и вставьте ваш персональный ID из блока ниже. Система автоматически подгрузит ваши данные.</p>
          </div>
        </div>

        <div style={{ padding: '40px', background: '#000', border: '2px dashed #ff7a50', borderRadius: '25px', maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Ваш личный облачный ID:</p>
          <code style={{ fontSize: '42px', color: '#ff7a50', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '4px' }}>
            {user?.code || "DEMO-MODE"}
          </code>
        </div>
      </section>
    </main>
  );
}
