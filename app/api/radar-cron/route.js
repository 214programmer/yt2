import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const ytKey = process.env.YOUTUBE_API_KEY;

  try {
    // 1. Берем всех пользователей из базы
    const usersSnap = await getDocs(collection(db, "users"));
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userTgId = userData.telegramId; // Личный ID пользователя в ТГ

      // Если у юзера не привязан ТГ — пропускаем его
      if (!userTgId) continue;

      // 2. Берем список конкурентов этого конкретного пользователя
      const radarSnap = await getDocs(collection(db, "users", userDoc.id, "radar"));
      
      for (const channelDoc of radarSnap.docs) {
        const channelData = channelDoc.data();
        const url = channelData.url;
        const lastSeenId = channelData.lastVideoId;

        // Извлекаем Handle канала (@name)
        const handle = url.split('@')[1]?.split('/')[0];
        if (!handle) continue;

        // 3. Спрашиваем у YouTube про свежее видео
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&order=date&q=@${handle}&key=${ytKey}`);
        const ytData = await ytRes.json();
        const video = ytData.items?.[0];

        if (video && video.id.videoId !== lastSeenId) {
          // 4. НАШЛИ НОВОЕ! Шлем лично этому пользователю
          const text = `🕵️‍♂️ РАДАР: Конкурент @${handle} выложил ролик!\n\n"${video.snippet.title}"\n\nСмотреть: https://www.youtube.com/watch?v=${video.id.videoId}`;
          
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: userTgId, text: text })
          });

          // Запоминаем, чтобы не спамить
          await updateDoc(doc(db, "users", userDoc.id, "radar", channelDoc.id), {
            lastVideoId: video.id.videoId
          });
        }
      }
    }
    return Response.json({ status: "done" });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
