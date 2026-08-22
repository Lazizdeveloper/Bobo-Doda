import { NextRequest, NextResponse } from "next/server";
import { text } from "@/lib/validate";
import type { SupportRequestCategory } from "@/lib/types";

/* In-site Support Modal → this route → Telegram Bot API (server-side only).
   The bot token never reaches the client bundle — it is read from process.env
   here, inside a Node.js server function, and used in a server-to-server
   fetch() call that the browser never sees. */

export const runtime = "nodejs";

const CATEGORIES: Record<SupportRequestCategory, string> = {
  tolov_escrow: "To'lov / Escrow",
  loyiha: "Loyiha",
  mutaxassis: "Mutaxassis",
  profil: "Profil",
  tasdiqlash: "Tasdiqlash",
  texnik: "Texnik muammo",
  hisob: "Hisob / Login",
  boshqa: "Boshqa",
};

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const CONTACT_MAX = 200;
const SOURCE_MAX = 60;
const ROUTE_MAX = 300;

/* Best-effort in-memory rate limit — resets on cold start / across serverless
   instances. This is a first line of defense against accidental double-fire
   and casual abuse, not a hard guarantee (that would need a shared store this
   project doesn't have). Real double-submit prevention lives client-side
   (button disables while a request is in flight). */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimitLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  hits.push(now);
  rateLimitLog.set(ip, hits);
  if (rateLimitLog.size > 5000) rateLimitLog.clear();
  return hits.length > RATE_LIMIT_MAX;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isCategory(value: unknown): value is SupportRequestCategory {
  return typeof value === "string" && value in CATEGORIES;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const category = input.category;
  if (!isCategory(category)) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }

  const message = text(input.message, MESSAGE_MAX);
  if (message.length < MESSAGE_MIN) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }

  const contactName = text(input.contactName, CONTACT_MAX);
  const contactInfo = text(input.contactInfo, CONTACT_MAX);
  const userId = text(input.userId, 60);
  const source = text(input.source, SOURCE_MAX) || "unknown";
  const route = text(input.route, ROUTE_MAX) || "-";

  /* Guest with no session context and no contact details is unreachable —
     reject rather than send an unactionable notification. */
  if (!userId && !contactName && !contactInfo) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID;
  if (!botToken || !chatId) {
    /* Configuration gap, not a user error — surface honestly rather than
       pretending the message was sent. */
    console.error("[/api/support] TELEGRAM_BOT_TOKEN or TELEGRAM_SUPPORT_CHAT_ID is not set");
    return NextResponse.json({ ok: false, error: "SERVER_MISCONFIGURED" }, { status: 500 });
  }

  const now = new Date();
  const timeStr = now.toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = ["🆘 <b>YANGI SUPPORT SO'ROVI</b>", ""];
  if (contactName) lines.push("👤 <b>Foydalanuvchi:</b>", escapeHtml(contactName), "");
  if (userId) lines.push("🆔 <b>User ID:</b>", escapeHtml(userId), "");
  if (contactInfo) lines.push("📧 <b>Aloqa:</b>", escapeHtml(contactInfo), "");
  lines.push("📂 <b>Kategoriya:</b>", escapeHtml(CATEGORIES[category]), "");
  lines.push("💬 <b>Xabar:</b>", escapeHtml(message), "");
  lines.push("🌐 <b>Sahifa:</b>", escapeHtml(route), "");
  lines.push("📍 <b>Source:</b>", escapeHtml(source), "");
  lines.push("🕐 <b>Vaqt:</b>", escapeHtml(timeStr));

  const telegramText = lines.join("\n");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText,
        parse_mode: "HTML",
      }),
    });
    if (!tgRes.ok) {
      const detail = await tgRes.text().catch(() => "");
      console.error("[/api/support] Telegram API error", tgRes.status, detail);
      return NextResponse.json({ ok: false, error: "TELEGRAM_FAILED" }, { status: 502 });
    }
  } catch (err) {
    console.error("[/api/support] Telegram request failed", err);
    return NextResponse.json({ ok: false, error: "NETWORK" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
