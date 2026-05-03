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
            content: "Ты — топовый YouTube-стратег. Твоя задача — провести глубокий аудит заголовка. Отвечай СТРОГО в формате JSON на русском языке."
          },
          {
            role: "user",
            content: `Проанализируй заголовок: "${title}". 
            Дай ответ в JSON: 
            {
              "score": число 0-100, 
              "analysis": "подробный разбор почему заголовок работает или нет", 
              "psychology": "какие триггеры (любопытство, страх, выгода) задействованы",
              "pros": ["детальный плюс 1", "детальный плюс 2"], 
              "cons": ["детальный минус 1", "детальный минус 2"], 
              "improvements": ["Вариант 1 (Хайповый)", "Вариант 2 (SEO)", "Вариант 3 (Вопрос)", "Вариант 4 (Интрига)", "Вариант 5 (Список)", "Вариант 6 (Эмоциональный)", "Вариант 7 (Короткий)", "Вариант 8 (Для Shorts)", "Вариант 9 (С цифрами)", "Вариант 10 (Провокация)"]
            }`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return Response.json(JSON.parse(data.choices[0].message.content));
  } catch (error) {
    return Response.json({ error: "Ошибка нейросети. Проверьте ключ Groq." }, { status: 500 });
  }
}
