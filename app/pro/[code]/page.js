"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function MediaKit({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getKit = async () => {
      try {
        // params.code - это то, что в ссылке после /pro/
        const docRef = doc(db, "users", decodeURIComponent(params.code));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getKit();
  }, [params.code]);

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Загрузка медиакита...</div>;
  if (!data) return <div style={{padding: '50px', textAlign: 'center'}}>Профиль не найден. Проверьте ID в ссылке.</div>;

  const stats = data.lastStats || { subs: "Нет данных", views: "Нет данных" };

  return (
    <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <span style={{ fontSize: '60px' }}>{data.avatar}</span>
        <h1 style={{ fontSize: '40px' }}>{data.name}</h1>
        <div style={{ background: '#ff7a50', color: '#fff', padding: '5px 15px', borderRadius: '20px', display: 'inline-block' }}>OFFICIAL YOUTUBE MEDIA KIT</div>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '30px', background: '#f9f9f9', borderRadius: '15px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>ПОДПИСЧИКИ</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.subs}</div>
        </div>
        <div style={{ padding: '30px', background: '#f9f9f9', borderRadius: '15px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>ПРОСМОТРЫ</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.views}</div>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '30px', border: '1px solid #eee', borderRadius: '15px' }}>
        <h3>Статистика: {stats.title || "Канал не анализировался"}</h3>
        <p>Этот профиль верифицирован через Channel Scope AI.</p>
        <p>ID Профиля: {data.code}</p>
      </div>
    </main>
  );
}
