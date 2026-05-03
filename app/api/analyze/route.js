import { runGroqChannelAnalysis, verifyGroqAccess } from "@/lib/groq";
import { isValidAccessCode } from "@/lib/access-codes";
import { buildYoutubeDataset } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла неизвестная ошибка во время анализа.";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const channelUrl = String(body?.channelUrl || "").trim();
    const accessCode = String(body?.accessCode || "").trim();

    if (!channelUrl) {
      return Response.json(
        {
          error: "Передайте ссылку на канал в поле channelUrl.",
        },
        { status: 400 },
      );
    }

    if (!isValidAccessCode(accessCode)) {
      return Response.json(
        {
          error: "Неверный код доступа. Запросите рабочий код у администратора.",
        },
        { status: 401 },
      );
    }

    await verifyGroqAccess();

    const dataset = await buildYoutubeDataset(channelUrl);
    const groq = await runGroqChannelAnalysis(dataset);

    return Response.json({
      analyzedAt: new Date().toISOString(),
      groqModel: groq.model,
      channel: dataset.channel,
      stats: dataset.stats,
      videos: dataset.videos,
      competitors: dataset.competitors,
      analysis: groq.analysis,
    });
  } catch (error) {
    return Response.json(
      {
        error: toMessage(error),
      },
      { status: 500 },
    );
  }
}
