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
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `Ты — эксперт по YouTube-стратегии. Оцени заголовок видео. 
            Верни ответ СТРОГО в формате JSON на русском языке:
            {
              "score": число от 0 до 100,
              "analysis": "краткая оценка",
              "pros": ["плюс 1", "плюс 2"],
              "cons": ["минус 1", "минус 2"],
              "improvements": ["вариант 1", "вариант 2", "вариант 3"]
            }`
          },
          { role: "user", content: `Оцени заголовок: "${title}"` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return Response.json(JSON.parse(data.choices[0].message.content));
  } catch (error) {
    return Response.json({ error: "Ошибка нейросети" }, { status: 500 });
  }
}
