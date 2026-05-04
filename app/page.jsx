"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EXAMPLES = ["https://www.youtube.com/@MrBeast", "https://www.youtube.com/@aliabdaal"];
const AVATARS = ["🚀", "👨‍💻", "🤖", "📈", "🔥", "🎧", "👾"];

const formatNumber = (v) => new Intl.NumberFormat("ru-RU").format(Number(v || 0));
const formatPercent = (v) => `${Number(v || 0).toFixed(1)}%`;
const formatDate = (v) => v ? new Date(v).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }) : "Нет даты";

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card" style={{ flex: '1 1 280px', textAlign: 'left', padding: '30px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <span className="eyebrow" style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#ff7a50', fontWeight: 'bold' }}>{label}</span>
      <strong style={{ fontSize: '32px', display: 'block', margin: '15px 0' }}>{value}</strong>
      <p style={{ fontSize: '14px', color: '#555' }}>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="list-card" style={{ padding: '25px', width: '100%', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(items || []).map((item, idx) => (<li key={idx} style={{ fontSize: '15px', lineHeight: '1.6' }}>{item}</li>))}
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
    setUser(userData);
    setIsRegistering(false);
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
    if (!radarInput || !user.telegramId) { alert("Сначала привяжите Telegram ID в профиле!"); return; }
    const docRef = await addDoc(collection(db, "users", user.code, "radar"), { url: radarInput, addedAt: new Date(), lastVideoId: "" });
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
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode: user.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  }

  async function handleCheckTitle(e) {
    e.preventDefault(); setTitleLoading(true); setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode: user.code }),
      });
      const data = await res.json();
      setTitleResult(data);
    } catch (err) { alert("AI Error"); } finally { setTitleLoading(false); }
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
    } catch (err) { alert("Error"); } finally { setPlanLoading(false); }
  }

  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="panel" style={{ width: '420px', textAlign: 'center', border: '2px solid #ff7a50', padding: '40px' }}>
          <h2>Вход в Channel Scope</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input type="text" placeholder="Имя" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
               {AVATARS.map(a => <button key={a} type="button" onClick={() => setRegAvatar(a)} style={{ fontSize: '24px', background: regAvatar === a ? '#fff1ed' : 'transparent', border: 'none', cursor: 'pointer' }}>{a}</button>)}
            </div>
            <input type="password" placeholder="Код доступа" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
            <button className="primary-button" type="submit">Создать профиль</button>
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '15px 30px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span style={{ fontSize: '32px' }}>{user?.avatar}</span>
           <div><div style={{ fontWeight: 'bold' }}>{user?.name}</div><div style={{ fontSize: '11px', color: '#22c55e' }}>● CLOUD ACTIVE</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
           <div style={{ display: 'flex', gap: '5px' }}>
              <input type="text" placeholder="Твой TG ID" style={{ width: '100px', padding: '5px', fontSize: '12px' }} value={tgIdInput} onChange={(e) => setTgIdInput(e.target.value)} />
              <button onClick={updateTgId} style={{ fontSize: '10px', background: '#ff7a50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Привязать TG</button>
           </div>
           <button onClick={() => {localStorage.removeItem("yt_access_code"); location.reload();}} style={{ color: '#999', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>ВЫЙТИ</button>
        </div>
      </header>

      <section className="hero">
        <h1 style={{ fontSize: '64px', fontWeight: '900' }}>Channel Scope</h1>
        <form className="hero-form" onSubmit={handleSubmit} style={{ margin: '40px 0' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на канал..." />
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "..." : "Анализ канала"}</button>
        </form>

        {/* МОЙ РАДАР */}
        <div className="panel" style={{ marginBottom: '40px', textAlign: 'left', background: '#fcfcfc' }}>
           <h3 style={{ marginBottom: '15px' }}>📡 Мой Радар (Уведомления в Telegram)</h3>
           {!user?.telegramId && <p style={{ color: 'red', fontSize: '13px' }}>⚠️ Привяжите Telegram ID в шапке сайта, чтобы включить уведомления!</p>}
           <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" placeholder="Ссылка на конкурента..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #eee' }} value={radarInput} onChange={(e) => setRadarInput(e.target.value)} />
              <button onClick={addToRadar} className="primary-button" style={{ margin: 0, padding: '0 30px' }}>Следить</button>
           </div>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {radar.map(item => (
                <div key={item.id} style={{ background: '#fff', padding: '10px 20px', borderRadius: '25px', border: '1px solid #ddd', fontSize: '13px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <strong>{item.url.split('@')[1] || item.url}</strong>
                  <button onClick={() => deleteFromRadar(item.id)} style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                </div>
              ))}
           </div>
        </div>

        {/* TITLE LAB */}
        <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff', padding: '40px', textAlign: 'left' }}>
          <h2 style={{ marginBottom: '25px' }}>Title Lab — Анализ кликабельности</h2>
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            <input type="text" style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', color: '#000' }} placeholder="Введите заголовок..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading}>{titleLoading ? "..." : "Оценить"}</button>
          </form>
          {titleResult && (
            <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '15px' }}>
              <div style={{ display: 'flex', gap: '40px', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '72px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <div style={{ flex: 1 }}><p style={{ fontSize: '17px', lineHeight: '1.6' }}>{titleResult.analysis}</p></div>
              </div>
              <div className="list-card" style={{ width: '100%', border: '1px solid #ff7a50', marginTop: '30px' }}>
                <h4 style={{ color: '#ff7a50', marginBottom: '20px' }}>10 виральных вариантов</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '20px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} style={{ padding: '12px', background: '#fff', border: '1px dashed #ff7a50', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>{v}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <>
          <section style={{ display: 'flex', gap: '20px', marginTop: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #111, #222)', color: '#fff', padding: '30px', borderRadius: '15px' }}>
              <span style={{ color: '#ff7a50', fontSize: '12px', fontWeight: 'bold' }}>ДОХОД В МЕСЯЦ</span>
              <div style={{ fontSize: '42px', fontWeight: '900', margin: '10px 0' }}>${formatNumber(Math.round(monthlyViews/1000))} - ${formatNumber(Math.round(monthlyViews/1000*3.5))}</div>
              <p style={{ color: '#aaa', fontSize: '13px' }}>На основе {formatNumber(monthlyViews)} просмотров/мес.</p>
            </div>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="Лояльная база канала." />
            <MetricCard label="СРЕДНИЕ" value={formatNumber(result.stats.averages.views)} hint="Планка охвата на видео." />
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3>Динамика просмотров (60 видео)</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff7a50" stopOpacity={0.8}/><stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" /><XAxis dataKey="name" hide /><YAxis stroke="#999" fontSize={12} /><Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" fill="url(#v)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px' }}>
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3>Конкуренты</h3>
            <div className="competitor-grid" style={{ marginTop: '30px' }}>
              {result.analysis.competitorTakeaways.videos.map((v) => (
                <article key={v.videoId} className="competitor-card" style={{ padding: '25px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ color: '#ff7a50', fontWeight: 'bold', textDecoration: 'none' }}>{v.title} ↗</a>
                  <p className="muted">Канал: {v.channelTitle}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3>План на 30 дней</h3>
            <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '30px' }}>
              <BulletList title="7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
            </div>
            <button className="secondary-button" onClick={handlePlanDetails} disabled={planLoading} style={{ marginTop: '30px' }}>{planLoading ? "..." : "Раскрыть фазы"}</button>
            {planDetails && (
              <div className="details-panel" style={{ marginTop: '40px', background: '#f5f7fa', padding: '40px', borderRadius: '20px' }}>
                <div className="phase-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '40px' }}>
                  {planDetails?.details?.phases?.map((p, i) => (
                    <article className="phase-card" key={i} style={{ padding: '25px', background: '#fff', borderRadius: '15px' }}>
                      <h4 style={{ color: '#ff7a50' }}>{i+1}. {p.title}</h4>
                      <p style={{ fontSize: '14px' }}>{p.objective}</p>
                    </article>
                  ))}
                </div>
                <div className="list-grid">
                   <BulletList title="Чеклист" items={planDetails?.details?.checklist} />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* РАСШИРЕНИЕ */}
      <section id="extension" className="panel" style={{ marginTop: '80px', background: '#111', color: '#fff', padding: '60px 40px', textAlign: 'center', borderRadius: '20px' }}>
        <h2 style={{ color: '#ff7a50', fontSize: '32px' }}>Pulse Extension</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', textAlign: 'left', margin: '40px 0' }}>
          <div style={{ padding: '25px', background: '#1a1a1a', borderRadius: '15px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50' }}>Шаг 1. ZIP</strong><br/> Скачайте архив ниже.
          </div>
          <div style={{ padding: '25px', background: '#1a1a1a', borderRadius: '15px', border: '1px solid #222' }}>
            <strong style={{ color: '#ff7a50' }}>Шаг 2. Хром</strong><br/> Загрузите в chrome://extensions.
          </div>
        </div>
        <code style={{ fontSize: '28px', color: '#ff7a50', fontWeight: 'bold' }}>{user?.code || "DEMO"}</code><br/>
        <a href="/pulse-extension.zip" download style={{ display: 'inline-block', background: '#ff7a50', color: '#fff', textDecoration: 'none', padding: '15px 40px', borderRadius: '8px', marginTop: '30px', fontWeight: 'bold' }}>СКАЧАТЬ .ZIP</a>
      </section>
    </main>
  );
}
