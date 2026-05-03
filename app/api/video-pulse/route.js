import { isValidAccessCode } from "@/lib/access-codes";

export const runtime = "nodejs";

export async function POST(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { videoUrl, accessCode } = await request.json();
    if (!isValidAccessCode(accessCode)) return Response.json({ error: "401" }, { status: 401, headers: corsHeaders });

    const videoId = videoUrl.split('v=')[1]?.split('&')[0];
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();
    
    if (!ytData.items?.length) return Response.json({ error: "No video" }, { status: 404, headers: corsHeaders });

    const stats = ytData.items[0].statistics;
    const info = ytData.items[0].snippet;
    
    // Считаем вовлеченность (лайки к просмотрам)
    const er = ((Number(stats.likeCount) / Number(stats.viewCount)) * 100).toFixed(1);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Ты PRO-аналитик YouTube. Дай ответ СТРОГО в JSON на русском." },
          { role: "user", content: `Видео: "${info.title}". Просмотры: ${stats.viewCount}, Лайки: ${stats.likeCount}. 
            Дай JSON: {
              "subs": "оценка новых подписок числом", 
              "secret": "в чем главный секрет успеха (1 фраза)", 
              "hook": "оценка начала видео (хука)",
              "advice": "что улучшить в упаковке"
            }`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await groqRes.json();
    const ai = JSON.parse(aiData.choices[0].message.content);

    return Response.json({
      title: info.title,
      views: stats.viewCount,
      likes: stats.likeCount,
      er: er + "%",
      subs: ai.subs,
      secret: ai.secret,
      hook: ai.hook,
      advice: ai.advice
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders }); }
