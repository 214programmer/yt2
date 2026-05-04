import { isValidAccessCode } from "@/lib/access-codes";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { title, accessCode } = await request.json();
    if (!isValidAccessCode(accessCode)) return Response.json({ error: "401" }, { status: 401 });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Ты — эксперт мирового уровня по YouTube. Пиши МАКСИМАЛЬНО подробно. Каждый пункт должен содержать 3-4 предложения глубокой аналитики. Отвечай СТРОГО в JSON."
          },
          {
            role: "user",
            content: `Проведи ЭКСТРЕМАЛЬНО детальный аудит заголовка: "${title}". 
            JSON: {
              "score": число,
              "analysis": "огромный текст на 500+ знаков с разбором психологии и SEO",
              "pros": ["детальный плюс на 2 строки", "еще один детальный плюс"],
              "cons": ["детальный минус на 2 строки", "еще один детальный минус"],
              "improvements": ["вариант 1", "вариант 2", "вариант 3", "вариант 4", "вариант 5", "вариант 6", "вариант 7", "вариант 8", "вариант 9", "вариант 10"]
            }`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });
    const data = await response.json();
    return Response.json(JSON.parse(data.choices[0].message.content));
  } catch (e) { return Response.json({ error: "AI Error" }, { status: 500 }); }
}
