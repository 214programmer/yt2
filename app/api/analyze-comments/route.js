import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { channelId, accessCode } = await request.json();
    const ytKey = process.env.YOUTUBE_API_KEY;

    // 1. Получаем комментарии через YouTube API
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&maxResults=100&key=${ytKey}`);
    const ytData = await ytRes.json();
    const comments = ytData.items?.map(i => i.snippet.topLevelComment.snippet.textOriginal).join(" | ");

    // 2. Анализ через Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Ты аналитик сообществ. Изучи комментарии и дай глубокий отчет в JSON." },
          { role: "user", content: `Комментарии: ${comments}. Дай ответ JSON: {"requests": ["что просят снять"], "complaints": ["на что жалуются"], "themes": ["3 идеи для новых видео на основе болей аудитории"]}` }
        ],
        response_format: { type: "json_object" }
      }),
    });
    const aiData = await groqRes.json();
    return Response.json(JSON.parse(aiData.choices[0].message.content));
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
