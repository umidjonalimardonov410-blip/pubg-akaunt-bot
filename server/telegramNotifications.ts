export type TelegramDeliveryStatus = "active" | "setup_required" | "failed";

export type TelegramNotificationInput = {
  chatId: string;
  text: string;
};

export function getTelegramDeliveryStatus() {
  return {
    status: process.env.TELEGRAM_BOT_TOKEN ? ("active" as const) : ("setup_required" as const),
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    note: process.env.TELEGRAM_BOT_TOKEN
      ? "Telegram bot delivery is configured."
      : "TELEGRAM_BOT_TOKEN is required to send external bot messages; in-app notifications remain active.",
  };
}

export async function sendTelegramNotification(input: TelegramNotificationInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: false, status: "setup_required" as const };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: input.chatId, text: input.text, disable_web_page_preview: true }),
    });
    if (!response.ok) return { sent: false, status: "failed" as const, httpStatus: response.status };
    return { sent: true, status: "active" as const };
  } catch {
    return { sent: false, status: "failed" as const };
  }
}
