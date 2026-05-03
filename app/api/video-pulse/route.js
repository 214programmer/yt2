import { isValidAccessCode } from "@/lib/access-codes";

export const runtime = "nodejs";

export async function POST(request) {
  // Настройки для обхода блокировки браузером (CORS)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { videoUrl, accessCode } = await request.json();

    if (!isValidAccessCode(accessCode)) {
      return Response.json({ error: "Неверный код доступа" }, { status: 401, headers: corsHeaders });
    }

    const videoId = videoUrl.split('v=')[1]?.split('&')[0];
    if (!videoId) return Response.json({ error: "ID не найден" }, { status: 400, headers: corsHeaders });

    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();
    const stats = ytData.items[0].statistics;
    const info = ytData.items[0].snippet;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Ты аналитик YouTube. Дай JSON: {\"explanation\": \"...\", \"subEstimate\": \"...\"}" },
          { role: "user", content: `Видео: ${info.title}. Просмотры: ${stats.viewCount}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiExplanation = await groqRes.json();
    const aiData = JSON.parse(aiExplanation.choices[0].message.content);

    return Response.json({
      views: stats.viewCount,
      subEstimate: aiData.subEstimate,
      explanation: aiData.explanation
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: "Ошибка сервера" }, { status: 500, headers: corsHeaders });
  }
}

// Добавь это, чтобы браузер не ругался на проверку связи
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
