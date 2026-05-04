export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { telegramId, channelUrl } = await request.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || !telegramId) return Response.json({ error: "No data" }, { status: 400 });

    const handle = channelUrl.split('@')[1]?.split('/')[0] || channelUrl;
    const message = `✅ РАДАР ОБНОВЛЕН\n\nЯ начал слежку за каналом: @${handle}\n\nКак только там выйдет новое видео, я мгновенно пришлю тебе ссылку сюда.`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text: message })
    });

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
