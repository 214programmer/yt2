import { runGroqPlanDetails, verifyGroqAccess } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла неизвестная ошибка во время детализации плана.";
}

export async function POST(request) {
  try {
    const body = await request.json();

    await verifyGroqAccess();

    const groq = await runGroqPlanDetails(body);

    return Response.json({
      generatedAt: new Date().toISOString(),
      groqModel: groq.model,
      details: groq.details,
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
