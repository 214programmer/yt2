import { isValidAccessCode } from "@/lib/access-codes";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { videoUrl, accessCode } = await request.json();

    if (!isValidAccessCode(accessCode)) {
      return Response.json({ error: "Неверный код доступа" }, { status: 401 });
    }

    // 1. Достаем ID видео из ссылки
    const videoId = videoUrl.split('v=')[1]?.split('&')[0];
    if (!videoId) return Response.json({ error: "Неверная ссылка на видео" }, { status: 400 });

    // 2. Запрос к YouTube API за статистикой видео
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();
    const stats = ytData.items[0].statistics;
    const info = ytData.items[0].snippet;

    // 3. Запрос к Groq за объяснением "Почему?"
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Ты — аналитик YouTube. Объясни успех видео на основе его цифр и названия. Отвечай кратко в JSON на русском."
          },
          {
            role: "user",
            content: `Видео: "${info.title}". Просмотров: ${stats.viewCount}, Лайков: ${stats.likeCount}. Объясни почему оно популярно и сколько примерно оно принесло подписчиков (оценка AI). 
            JSON: {"explanation": "текст", "subEstimate": "число"}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiExplanation = await groqRes.json();
    const aiData = JSON.parse(aiExplanation.choices[0].message.content);

    return Response.json({
      title: info.title,
      views: stats.viewCount,
      likes: stats.likeCount,
      explanation: aiData.explanation,
      subEstimate: aiData.subEstimate
    });

  } catch (error) {
    return Response.json({ error: "Ошибка анализа видео" }, { status: 500 });
  }
}
