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
            content: "Ты — топовый стратег YouTube. Твоя задача — дать ОЧЕНЬ краткий, но мощный анализ и ровно 10 готовых заголовков. НЕ оставляй пустых полей. Каждый из 10 вариантов ДОЛЖЕН быть заполнен готовым кликабельным заголовком без лишних вступлений."
          },
          {
            role: "user",
            content: `Разбери заголовок: "${title}". 
            JSON: {
              "score": число,
              "analysis": "2-3 самых важных предложения о психологии клика",
              "pros": ["короткий плюс 1", "короткий плюс 2"],
              "cons": ["короткий минус 1", "короткий минус 2"],
              "improvements": ["Заголовок 1", "Заголовок 2", "Заголовок 3", "Заголовок 4", "Заголовок 5", "Заголовок 6", "Заголовок 7", "Заголовок 8", "Заголовок 9", "Заголовок 10"]
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
