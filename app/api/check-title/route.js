export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { title } = await request.json();

    if (!title) {
      return Response.json({ error: "Введите заголовок" }, { status: 400 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Используем более быструю модель, чтобы не вылетать по таймауту на Vercel
        model: "llama-3.1-8b-instant", 
        messages: [
          {
            role: "system",
            content: "Ты — эксперт по YouTube. Оцени заголовок. Отвечай СТРОГО в формате JSON на русском языке."
          },
          {
            role: "user",
            content: `Оцени этот заголовок и предложи 3 варианта лучше. Формат ответа строго такой: {"score": 85, "analysis": "текст", "pros": ["..."], "cons": ["..."], "improvements": ["..."]}. Заголовок: "${title}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // Если Groq вернул ошибку (например, неверный ключ)
    if (!response.ok) {
      console.error("Groq API Error:", data);
      return Response.json({ 
        error: `Ошибка Groq: ${data.error?.message || "Проверьте GROQ_API_KEY в настройках Vercel"}` 
      }, { status: response.status });
    }

    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от нейросети");

    return Response.json(JSON.parse(content));

  } catch (error) {
    console.error("Title Lab Error:", error);
    return Response.json({ 
      error: "Не удалось связаться с нейросетью. Убедитесь, что в Vercel добавлен GROQ_API_KEY." 
    }, { status: 500 });
  }
}
