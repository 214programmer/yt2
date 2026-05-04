"use client";
import { useState, useEffect } from "react";
// Добавляем импорт графиков
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const AVATARS = ["🚀", "👨‍💻", "🤖", "📈", "🔥", "🎧", "👾"];
const formatNumber = (v) => new Intl.NumberFormat("ru-RU").format(Number(v || 0));

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card" style={{ flex: 1, minWidth: '280px', textAlign: 'left', padding: '25px' }}>
      <span className="eyebrow" style={{ fontSize: '12px', letterSpacing: '1px' }}>{label}</span>
      <strong style={{ fontSize: '32px', display: 'block', margin: '10px 0' }}>{value}</strong>
      <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="list-card" style={{ padding: '25px' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {(items || []).map((item, idx) => (
          <li key={idx} style={{ fontSize: '15px', lineHeight: '1.6', color: '#333' }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [channelUrl, setChannelUrl] = useState("https://www.youtube.com/@MrBeast");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  
  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("channel_scope_user");
    if (saved) setUser(JSON.parse(saved)); else setIsRegistering(true);
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    const newUser = { name: regName, avatar: AVATARS[0], code: regCode };
    localStorage.setItem("channel_scope_user", JSON.stringify(newUser));
    setUser(newUser); setIsRegistering(false);
  };

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, accessCode: user.code }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) { alert("Ошибка анализа"); } finally { setLoading(false); }
  }

  async function handleCheckTitle(e) {
    e.preventDefault(); setTitleLoading(true);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle, accessCode: user.code }),
      });
      const data = await res.json();
      setTitleResult(data);
    } catch (err) { alert("Ошибка AI"); } finally { setTitleLoading(false); }
  }

  if (isRegistering) {
    return (
      <main className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <form className="panel" onSubmit={handleRegister} style={{ width: '400px', padding: '40px', border: '2px solid #ff7a50' }}>
          <h2>Регистрация PRO</h2>
          <input type="text" placeholder="Имя" style={{ width: '100%', padding: '12px', margin: '15px 0', borderRadius: '8px', border: '1px solid #ddd' }} value={regName} onChange={(e) => setRegName(e.target.value)} />
          <input type="password" placeholder="Код доступа" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd' }} value={regCode} onChange={(e) => setRegCode(e.target.value)} />
          <button className="primary-button" type="submit">Создать аккаунт</button>
        </form>
      </main>
    );
  }

  // Подготовка данных для графика
  const chartData = result?.videos?.map(v => ({
    name: v.title.substring(0, 15) + "...",
    views: v.viewCount,
    er: v.engagementRate * 100
  })).reverse() || [];

  return (
    <main className="page-shell">
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: '#fff', borderRadius: '15px', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 'bold' }}>{user?.avatar} {user?.name} | PRO DASHBOARD</div>
        <button onClick={() => {localStorage.removeItem("channel_scope_user"); location.reload();}} style={{ color: '#ff7a50', background: 'none', border: 'none', cursor: 'pointer' }}>Выйти</button>
      </header>

      <section className="hero">
        <h1 style={{ fontSize: '56px', marginBottom: '20px' }}>Channel Scope</h1>
        <p style={{ maxWidth: '800px', margin: '0 auto 40px', fontSize: '18px', color: '#555' }}>
          Профессиональный инструмент глубокой аналитики. Мы используем нейросети последнего поколения для разбора контентных стратегий и поиска точек роста вашего канала.
        </p>

        <form className="hero-form" onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto 40px' }}>
          <input type="text" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Ссылка на YouTube канал..." style={{ fontSize: '18px', padding: '15px' }} />
          <button className="primary-button" type="submit" style={{ padding: '0 40px', fontSize: '18px' }}>
            {loading ? "Идет глубокий анализ..." : "Запустить аудит"}
          </button>
        </form>

        {/* TITLE LAB - ШИРОКИЙ ДИЗАЙН */}
        <div className="panel" style={{ border: '2px solid #ff7a50', background: '#fff', textAlign: 'left', padding: '40px' }}>
          <h2 style={{ marginBottom: '10px' }}>Title Lab — Симулятор кликабельности</h2>
          <p className="muted" style={{ marginBottom: '25px' }}>Введите заголовок, чтобы AI разобрал его психологические триггеры и предложил улучшения.</p>
          
          <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            <input type="text" style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', color: '#000' }} placeholder="Напиши заголовок будущего ролика..." value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0, padding: '0 40px' }}>{titleLoading ? "..." : "Оценить"}</button>
          </form>

          {titleResult && (
            <div style={{ background: '#fcfcfc', borderRadius: '15px', padding: '30px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div style={{ fontSize: '72px', fontWeight: '900', color: titleResult.score > 70 ? '#22c55e' : '#f59e0b' }}>{titleResult.score}%</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '10px' }}>Вердикт AI</h3>
                  <p style={{ fontSize: '17px', lineHeight: '1.6', color: '#333' }}>{titleResult.analysis}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '5px solid #22c55e' }}>
                  <h4 style={{ color: '#22c55e', marginBottom: '10px' }}>Сильные стороны (Плюсы)</h4>
                  <ul style={{ paddingLeft: '20px' }}>{titleResult.pros.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}</ul>
                </div>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', borderLeft: '5px solid #ef4444' }}>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>Критические замечания (Минусы)</h4>
                  <ul style={{ paddingLeft: '20px' }}>{titleResult.cons.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}</ul>
                </div>
              </div>

              <div style={{ marginTop: '30px', padding: '25px', background: '#fff', border: '1px solid #ff7a50', borderRadius: '12px' }}>
                <h4 style={{ color: '#ff7a50', marginBottom: '20px' }}>10 виральных вариантов от AI</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {titleResult.improvements.map((v, i) => (
                    <div key={i} onClick={() => {navigator.clipboard.writeText(v); alert('Скопировано!');}} style={{ padding: '15px', background: '#fff8f6', border: '1px dashed #ff7a50', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', color: '#000' }}>{v}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <>
          {/* МЕТРИКИ - ШИРОКИЕ */}
          <section className="metrics-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '40px' }}>
            <MetricCard label="ПОДПИСЧИКИ" value={formatNumber(result.channel.subscriberCount)} hint="Огромная база лояльных зрителей, требующая регулярного вовлечения через новые форматы." />
            <MetricCard label="ПРОСМОТРЫ" value={formatNumber(result.channel.viewCount)} hint="Суммарный охват за всё время существования канала, отражающий накопленный авторитет." />
            <MetricCard label="СРЕДНИЕ" value={formatNumber(result.stats.averages.views)} hint="Средняя планка просмотров на одно видео. Ориентир для оценки успеха новых релизов." />
            <MetricCard label="ER (ВОВЛЕЧЕННОСТЬ)" value={formatPercent(result.stats.averages.engagementRate)} hint="Процент активных действий (лайки, комменты). Показатель 'здоровья' вашей аудитории." />
          </section>

          {/* ГРАФИК ПРОСМОТРОВ - ВМЕСТО ТАБЛИЦЫ */}
          <section className="panel" style={{ marginTop: '40px', padding: '40px' }}>
            <h3 style={{ marginBottom: '30px' }}>Динамика популярности последних видео</h3>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7a50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff7a50" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" hide />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" stroke="#ff7a50" fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="muted" style={{ marginTop: '20px', textAlign: 'center' }}>График отражает виральный потенциал последних 60 роликов. Пики означают успешное попадание в рекомендации.</p>
          </section>

          {/* АУДИТ */}
          <section className="list-grid" style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <BulletList title="Преимущества стратегии" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Критические недочеты" items={result.analysis.channelAudit.weaknesses} />
          </section>

          <section className="panel" style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '20px' }}>Самое успешное видео: Глубокий разбор</h3>
            <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '15px', border: '1px solid #eee' }}>
              <h4 style={{ fontSize: '24px', marginBottom: '15px' }}>{result.stats.leaders.topVideo.title}</h4>
              <div style={{ display: 'flex', gap: '30px' }}>
                <BulletList title="Почему выстрелило (Детально)" items={result.analysis.topVideoBreakdown.whyItWorked} />
                <BulletList title="Что нужно повторить" items={result.analysis.topVideoBreakdown.replicableElements} />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
