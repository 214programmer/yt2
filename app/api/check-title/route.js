import { isValidAccessCode } from "@/lib/access-codes";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { title, accessCode } = await request.json();

    if (!isValidAccessCode(accessCode)) {
      return Response.json({ error: "Неверный код доступа." }, { status: 401 });
    }

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
            content: "Ты — эксперт по YouTube. Оцени заголовок и предложи 7 КРУТЫХ альтернатив. Отвечай СТРОГО в формате JSON на русском языке."
          },
          {
            role: "user",
            content: `Оцени заголовок: "${title}". Верни JSON: {"score": число, "analysis": "текст", "pros": ["пункт1"], "cons": ["пункт1"], "improvements": ["вариант1", "вариант2", "вариант3", "вариант4", "вариант5", "вариант6", "вариант7"]}`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return Response.json(content);

  } catch (error) {
    return Response.json({ error: "Ошибка сервера или нейросети." }, { status: 500 });
  }
}
