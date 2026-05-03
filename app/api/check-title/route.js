import { isValidAccessCode } from "@/lib/access-codes";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { title, accessCode } = await request.json();

    if (!isValidAccessCode(accessCode)) {
      return Response.json({ error: "Неверный код доступа." }, { status: 401 });
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
            content: "Ты — эксперт по психологии зрителя на YouTube. Твоя задача — разобрать заголовок по косточкам. Отвечай СТРОГО в формате JSON на русском языке."
          },
          {
            role: "user",
            content: `Проанализируй заголовок: "${title}". 
            Верни JSON с такими полями: 
            {
              "score": число 0-100, 
              "analysis": "подробный разбор структуры", 
              "psychology": "какие триггеры используются",
              "pros": ["детальный плюс 1", "детальный плюс 2", "детальный плюс 3"], 
              "cons": ["детальный минус 1", "детальный минус 2", "детальный минус 3"], 
              "improvements": ["Вариант 1 (Хайп)", "Вариант 2 (SEO)", "Вариант 3 (Вопрос)", "Вариант 4 (Интрига)", "Вариант 5 (Список)", "Вариант 6 (Эмоции)", "Вариант 7 (Для Shorts)", "Вариант 8 (Провокация)", "Вариант 9 (С цифрами)", "Вариант 10 (Финальный)"]
            }`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return Response.json(JSON.parse(data.choices[0].message.content));
  } catch (error) {
    return Response.json({ error: "Ошибка нейросети. Проверьте API ключ." }, { status: 500 });
  }
}
