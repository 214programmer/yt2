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
        model: "llama-3.1-8b-instant", 
        messages: [
          {
            role: "system",
            content: "Ты — эксперт по виральному контенту на YouTube. Твоя задача — проанализировать заголовок и предложить 7 КРУТЫХ, кликабельных альтернатив. Отвечай СТРОГО в формате JSON на русском языке."
          },
          {
            role: "user",
            content: `Оцени заголовок: "${title}". Верни JSON: {"score": число, "analysis": "текст", "pros": ["пункт1", "пункт2"], "cons": ["пункт1", "пункт2"], "improvements": ["вариант1", "вариант2", "вариант3", "вариант4", "вариант5", "вариант6", "вариант7"]}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error("Ошибка Groq API");

    const content = JSON.parse(data.choices[0].message.content);
    return Response.json(content);

  } catch (error) {
    return Response.json({ error: "Ошибка нейросети. Проверьте соединение." }, { status: 500 });
  }
}
