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

// ГЛОБАЛЬНЫЕ КОМПОНЕНТЫ
function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card" style={{ flex: '1 1 250px', textAlign: 'left', padding: '25px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <span className="eyebrow" style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#ff7a50', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ fontSize: '28px', display: 'block', margin: '8px 0', color: '#111' }}>{value}</strong>
      <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="list-card" style={{ padding: '30px', background: '#fff', borderRadius: '20px', border: '1px solid #eee' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#111', borderLeft: '4px solid #ff7a50', paddingLeft: '15px' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '20px' }}>
        {safeItems.slice(0, 15).map((item, idx) => (<li key={idx} style={{ fontSize: '15px', lineHeight: '1.6', color: '#444' }}>{item}</li>))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
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

  // AI IMAGE GENERATOR STATES
  const [imgPrompt, setImgPrompt] = useState("");
  const [generatedImg, setGeneratedImg] = useState("");
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem("yt_access_code");
    if (savedCode) handleAutoLogin(savedCode);
  }, []);

  const handleAutoLogin = async (code) => {
    const docSnap = await getDoc(doc(db, "users", code));
    if (docSnap.exists()) {
      setUser(docSnap.data());
      setTgIdInput(docSnap.data().telegramId || "");
      loadRadar(code);
    }
  };

 const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regCode) return alert("Заполни поля!");

    // 1. Сначала проверяем код на сервере
    const res = await fetch("/api/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: regCode })
    });

    if (!res.ok) {
      alert("Неверный код доступа!");
      return;
    }

    // 2. Если код верный, создаем профиль
    const userData = { name: regName, avatar: regAvatar, code: regCode, telegramId: "" };
    await setDoc(doc(db, "users", regCode), userData);
    localStorage.setItem("yt_access_code", regCode);
    setUser(userData);
    setIsRegistering(false);
    loadRadar(regCode);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const docSnap = await getDoc(doc(db, "users", regCode));
    if (docSnap.exists()) {
      setUser(docSnap.data());
      localStorage.setItem("yt_access_code", regCode);
      setTgIdInput(docSnap.data().telegramId || "");
      loadRadar(regCode);
    } else { alert("Аккаунт не найден!"); }
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
    if (!radarInput || !user.telegramId) return alert("Привяжите TG ID!");
    const docRef = await addDoc(collection(db, "users", user.code, "radar"), { url: radarInput, addedAt: new Date(), lastVideoId: "" });
    await fetch("/api/notify-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, channelUrl: radarInput }) });
    setRadar([...radar, { id: docRef.id, url: radarInput }]);
    setRadarInput("");
  };

  const deleteFromRadar = async (id) => {
    await deleteDoc(doc(db, "users", user.code, "radar", id));
    setRadar(radar.filter(i => i.id !== id));
  };

  // GENERATE AI IMAGE
  const handleGenerateImg = (e) => {
    e.preventDefault();
    if (!imgPrompt) return;
    setImgLoading(true);
    // Используем Pollinations AI - это бесплатно и без ключа
    const encodedPrompt = encodeURIComponent(imgPrompt + " youtube thumbnail high quality professional bright colors");
    const url = `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
    
    // Эмуляция загрузки для UI
    setTimeout(() => {
      setGeneratedImg(url);
      setImgLoading(false);
    }, 2500);
  };

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setResult(null); setPlanDetails(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelUrl, accessCode: user.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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

  if (!user) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f7' }}>
        <div className="panel" style={{ width: '450px', textAlign: 'center', padding: '50px', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', background: '#fff', borderRadius: '30px' }}>
          <div style={{ marginBottom: '30px', display: 'flex', background: '#f0f0f0', borderRadius: '12px', padding: '5px' }}>
             <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === "login" ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>ВХОД</button>
             <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === "register" ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>СОЗДАТЬ</button>
          </div>
          <span style={{ fontSize: '50px', display: 'block', marginBottom: '15px' }}>{authMode === "login" ? "🔑" : regAvatar}</span>
          <h2>{authMode === "login" ? "С возвращением!" : "Новый профиль"}</h2>
          <form onSubmit={authMode === "login" ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            {authMode === "register" && <input type="text" placeholder="Имя" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd' }} value={regName} onChange={(e) => setRegName(e.target.value)} />}
            <input type="password" placeholder="Ваш секретный код" style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd', textAlign: 'center', letterSpacing: '4px' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit">{authMode === "login" ? "ВОЙТИ" : "СОЗДАТЬ"}</button>
          </form>
        </div>
      </main>
    );
  }

  const chartData = result?.videos?.map(v => ({ name: v.title.substring(0, 10), views: v.viewCount })).reverse() || [];
  const monthlyViews = (result?.stats?.averages?.viewsPerDay || 0) * 30;

  return (
    <main className="page-shell" style={{ background: '#f8f9fa' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '15px 30px', background: '#fff', borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span style={{ fontSize: '32px' }}>{user?.avatar}</span>
           <div><div style={{ fontWeight: 'bold', fontSize: '18px' }}>{user?.name}</div><div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>● PRO DASHBOARD ACTIVE</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
           <a href={`/pro/${user?.code}`} target="_blank" style={{ color: '#ff7a50', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', background: '#fff1ed', padding: '8px 15px', borderRadius: '8px' }}>MEDIA KIT 📄</a>
           <div style={{ display: 'flex', gap: '8px', background: '#f5f5f5', padding: '6px', borderRadius: '10px' }}>
              <input type="text" placeholder="TG ID" style={{ width: '90px', padding: '5px', fontSize: '12px', background: 'transparent', border: 'none' }} value={tgIdInput} onChange={(e) => setTgIdInput(e.target.value)} />
              <button onClick={updateTgId} style={{ background: '#ff7a50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', padding: '0 12px' }}>Привязать</button>
           </div>
           <button onClick={() => {localStorage.removeItem("yt_access_code"); location.reload();}} style={{ color: '#999', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>ВЫЙТИ</button>
        </div>
      </header>

      {/* TOP SECTION: SEARCH + RADAR + TITLE LAB */}
      <section style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '72px', fontWeight: '900', letterSpacing: '-4px', margin: '0 0 15px 0' }}>Channel Scope</h1>
        <form className="hero-form" onSubmit={handleSubmit} style={{ maxWidth: '850px', margin: '0 auto 40px' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на YouTube канал..." />
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "..." : "АУДИТ"}</button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
          {/* RADAR */}
          <div className="panel" style={{ textAlign: 'left', background: '#fff', border: '1px solid #eee', margin: 0 }}>
             <h3 style={{ marginBottom: '20px' }}>📡 Мой Радар <span style={{fontSize:'12px', color:'#999'}}>(Cloud)</span></h3>
             <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" placeholder="Ссылка на конкурента..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #eee' }} value={radarInput} onChange={(e) => setRadarInput(e.target.value)} />
                <button onClick={addToRadar} className="primary-button" style={{ margin: 0, padding: '0 25px' }}>СЛЕДИТЬ</button>
             </div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {radar.map(item => (
                  <div key={item.id} style={{ background: '#f8f9fa', padding: '10px 18px', borderRadius: '50px', border: '1px solid #eee', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center', fontWeight: 'bold' }}>
                    <span>{item.url.split('@')[1] || "Канал"}</span>
                    <button onClick={() => deleteFromRadar(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                  </div>
                ))}
             </div>
          </div>

          {/* TITLE LAB */}
          <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff', margin: 0, textAlign: 'left' }}>
            <h3 style={{ marginBottom: '20px', color: '#ff7a50' }}>Title Lab PRO — Симулятор клика</h3>
            <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} placeholder="Введи заголовок..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
              <button className="primary-button" type="submit" disabled={titleLoading} style={{margin:0}}>{titleLoading ? "..." : "ОЦЕНИТЬ"}</button>
            </form>
            {titleResult && <div style={{marginTop:'15px', fontWeight:'bold', color:'#ff7a50'}}>Оценка: {titleResult.score}% (Прокрутите вниз для разбора)</div>}
          </div>
        </div>
      </section>

      {/* --- NEW: AI THUMBNAIL GENERATOR --- */}
      <section className="panel" style={{ background: '#111', color: '#fff', padding: '50px', marginBottom: '50px', borderRadius: '30px', border: '2px solid #ff7a50' }}>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px', textAlign: 'left' }}>
            <h2 style={{ color: '#ff7a50', fontSize: '32px', marginBottom: '15px' }}>AI Thumbnail Generator</h2>
            <p style={{ color: '#aaa', marginBottom: '30px' }}>Опишите идею обложки (на английском для лучшего результата), и ИИ создаст готовый концепт за секунды.</p>
            <form onSubmit={handleGenerateImg} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Example: Man shocked looking at phone with fire background..." 
                style={{ flex: 1, padding: '15px', borderRadius: '10px', background: '#222', border: '1px solid #333', color: '#fff' }}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
              />
              <button className="primary-button" type="submit" disabled={imgLoading} style={{ margin: 0 }}>
                {imgLoading ? "РИСУЮ..." : "ГЕНЕРИРОВАТЬ"}
              </button>
            </form>
          </div>
          <div style={{ flex: '1 1 300px', minHeight: '250px', background: '#000', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #444' }}>
            {generatedImg ? (
              <img src={generatedImg} alt="AI Preview" style={{ width: '100%', height: 'auto' }} />
            ) : (
              <span style={{ color: '#444' }}>Превью появится здесь</span>
            )}
          </div>
        </div>
      </section>

      {/* TITLE LAB DETAILED RESULT */}
      {titleResult && (
        <div className="panel" style={{ background: '#fff', border: '1px solid #eee', marginBottom: '50px', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', alignItems: 'center' }}>
             <div style={{ fontSize: '84px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
             <p style={{ fontSize: '18px', lineHeight: '1.7', color: '#333' }}>{titleResult.analysis}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '40px' }}>
             <BulletList title="Сильные стороны" items={titleResult.pros} />
             <BulletList title="Что мешает росту" items={titleResult.cons} />
          </div>
          <div className="list-card" style={{ width: '100%', border: '2px solid #ff7a50', background: '#fff', borderRadius: '25px', padding: '40px' }}>
            <h3 style={{ color: '#ff7a50', marginBottom: '25px' }}>10 Виральных стратегий:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
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

      {error && <div className="status-banner error">{error}</div>}

      {result && (
        <>
          <section className="channel-header" style={result.channel.banner ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.95)), url(${result.channel.banner})` } : {}}>
            <div className="channel-meta" style={{ padding: '40px' }}>
              {result.channel.thumbnail && <img className="channel-avatar" src={result.channel.thumbnail} alt="" style={{ width: '110px', height: '110px', border: '4px solid #fff' }} />}
              <div><h2 style={{ fontSize: '38px', fontWeight: '900' }}>{result.channel.title}</h2><p style={{ fontSize: '17px', color: '#444' }}>{result.analysis.summary}</p></div>
            </div>
          </section>

          <section style={{ display: 'flex', gap: '20px', marginTop: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', background: '#111', color: '#fff', padding: '35px', borderRadius: '20px' }}>
              <span style={{ color: '#ff7a50', fontSize: '11px', fontWeight: 'bold' }}>ESTIMATED MONTHLY REVENUE</span>
              <div style={{ fontSize: '48px', fontWeight: '900', margin: '12px 0', color: '#ff7a50' }}>${formatNumber(Math.round(monthlyViews/1000))} - ${formatNumber(Math.round(monthlyViews/1000*3.5))}</div>
              <p style={{ color: '#888', fontSize: '13px' }}>На базе {formatNumber(monthlyViews)} просмотров/мес.</p>
            </div>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="Лояльное ядро канала." />
            <MetricCard label="ENGAGEMENT (ER)" value={formatPercent(result.stats.averages.engagementRate)} hint="Норма: 2-4%. Работайте над призывами!" />
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3>Динамика просмотров</h3>
            <div style={{ width: '100%', height: 420 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff7a50" stopOpacity={0.4}/><stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" /><XAxis dataKey="name" hide /><YAxis stroke="#999" fontSize={12} /><Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" strokeWidth={3} fill="url(#v)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
            <BulletList title="Преимущества стратегии" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Критические упущения" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Что 'взлетает' сейчас" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList title="Паттерны деградации" items={result.analysis.contentPatterns.underperformingPatterns} />
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '50px' }}>
            <h3 style={{ fontSize: '30px' }}>Roadmap на 30 дней</h3>
            <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '30px' }}>
              <BulletList title="Первые 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="Цели на 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <button className="primary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ padding: '18px 50px' }}>
                {planLoading ? "..." : "РАСКРЫТЬ ФАЗЫ ВЫПОЛНЕНИЯ"}
              </button>
            </div>
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '60px', background: '#f5f7fa', padding: '45px', borderRadius: '25px' }}>
                <div className="phase-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                  {(planDetails?.details?.phases || []).slice(0, 15).map((p, i) => (
                    <article key={i} style={{ padding: '30px', background: '#fff', borderRadius: '20px', borderLeft: '6px solid #ff7a50' }}>
                      <h4 style={{ color: '#111', fontSize: '20px' }}>{i+1}. {p.title}</h4>
                      <p style={{ fontSize: '14px', color: '#555', marginTop: '10px' }}>{p.objective}</p>
                      <div style={{ fontSize: '12px', color: '#ff7a50', fontWeight: 'bold', marginTop: '10px' }}>РЕЗУЛЬТАТ: {p.deliverable}</div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* EXTENSION CENTER */}
      <section id="extension" className="panel" style={{ marginTop: '100px', background: '#0a0a0a', color: '#fff', padding: '80px 50px', textAlign: 'center', borderRadius: '35px', border: '4px solid #ff7a50' }}>
        <h2 style={{ color: '#ff7a50', fontSize: '42px', fontWeight: '900', marginBottom: '15px' }}>Pulse PRO Extension</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', textAlign: 'left', marginBottom: '50px' }}>
          <div style={{ padding: '30px', background: '#1a1a1a', borderRadius: '20px', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div><strong style={{ color: '#ff7a50', fontSize: '20px' }}>01. Скачивание</strong><p style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>Загрузите архив ZIP.</p></div>
            <a href="/pulse-extension.zip" download style={{ display: 'block', background: '#ff7a50', color: '#fff', textDecoration: 'none', padding: '14px', borderRadius: '10px', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>СКАЧАТЬ ZIP</a>
          </div>
          <div style={{ padding: '30px', background: '#1a1a1a', borderRadius: '20px', border: '1px solid #222' }}>
             <strong style={{ color: '#ff7a50', fontSize: '20px' }}>02. Установка</strong><p style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>Загрузите распакованную папку в chrome://extensions.</p>
          </div>
          <div style={{ padding: '30px', background: '#1a1a1a', borderRadius: '20px', border: '1px solid #222' }}>
             <strong style={{ color: '#ff7a50', fontSize: '20px' }}>03. ID Входа</strong><p style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>Используйте ваш ID ниже.</p>
          </div>
        </div>
        <code style={{ fontSize: '38px', color: '#ff7a50', fontWeight: '900', fontFamily: 'monospace' }}>{user?.code || "DEMO"}</code>
      </section>
    </main>
  );
}
