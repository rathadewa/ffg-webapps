import { db } from "../db";
import { pengukuranOrderPsb } from "../db/schema/pengukuran_order_psb";
import { eq } from "drizzle-orm";

/* ── Config ─────────────────────────────────────────────────── */
const BOT_TOKEN = Bun.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID   = Bun.env.TELEGRAM_CHAT_ID   ?? "";
const API       = (m: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${m}`;

/* ── HTTP helper ────────────────────────────────────────────── */
async function tg(method: string, payload: object): Promise<any> {
  const res  = await fetch(API(method), {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  const json = await res.json() as any;
  if (!json.ok) console.error(`[tg] ${method}:`, JSON.stringify(json));
  return json;
}

/* ── Options ────────────────────────────────────────────────── */
const PENYEBAB_OPTS = ["GAMAS", "Gangguan Reguler"];

const SEGMEN_OPTS = [
  "GPON & OLT", "Feeder", "ODC", "Distribusi", "ODP", "Dropcore",
];

const ACTSOL_OPTS = [
  "ONT -> Ganti kabel RJ11 & RJ45",
  "ONT -> Ganti ONT",
  "ONT -> Ganti Patch Cord",
  "ONT -> Ganti Power Adaptor",
  "ONT -> Pembersihan PLUG UNPLUG PATCH CORE",
  "ONT -> Pindah Perangkat ONT",
];

/* ── HTML escape helper ─────────────────────────────────────── */
const esc = (s: string | null | undefined) =>
  (s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ── WIB timestamp (UTC+7) untuk disimpan ke DB ─────────────── */
const nowWib = () => new Date(Date.now() + 7 * 60 * 60 * 1000);

/* ── Date formatter (Indonesian) ────────────────────────────── */
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtDate(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()!]} ${d.getFullYear()}, ${h}:${m}`;
}

/* ── Conversation state ─────────────────────────────────────── */
interface ConvState {
  step:           "penyebab" | "segmen" | "actsol" | "evidence";
  orderId:        string;
  sto:            string | null;
  stepMsgId:      number;   // pesan DM yang diedit di setiap langkah
  penyebab?:      string;
  segmen?:        string;
  actsol?:        string;
  evidence:       string[]; // Telegram file_id
  evidenceMsgId?: number;   // pesan prompt evidence
}

const convs = new Map<number, ConvState>(); // key: Telegram user_id

/* ── Exported types ─────────────────────────────────────────── */
export interface DownTicket {
  orderId:    string;
  source:     string | null;
  sto:        string | null;
  external:   string | null;
  speedy:     string | null;
  pots:       string | null;
  lastUpdate: string | null;
}

/* ════════════════════════════════════════════════════════════
   1. Kirim notifikasi DOWN ke grup
   ════════════════════════════════════════════════════════════ */
export async function sendDownNotification(
  ticket: DownTicket,
  picTelegram: string | null,
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[telegram] BOT_TOKEN atau CHAT_ID belum dikonfigurasi");
    return;
  }

  const source = ticket.source === "indihome" ? "IndiHome"
               : ticket.source === "indibiz"  ? "IndiBiz" : "—";
  const sto = esc(ticket.sto);

  const text = [
    `<b>MOJANG GAUL - FFG</b>`,
    ``,
    `<b>[URGENT: PERBAIKAN REDAMAN LOSS - ${sto}]</b>`,
    `Halo Rekan STO ${sto}, mohon bantuan untuk segera melakukan perbaikan pada WO PSB berikut:`,
    `- Order ID    : <code>${esc(ticket.orderId)}</code>`,
    `- Source      : ${esc(source)}`,
    `- STO         : ${sto}`,
    `- External    : ${esc(ticket.external)}`,
    `- Speedy      : ${esc(ticket.speedy)}`,
    `- Last Update : ${esc(ticket.lastUpdate)}`,
    `Mohon Segera dilakukan tindak lanjut agar Performansi FFG tidak memburuk!`,
    `${esc(picTelegram)}`,
  ].join("\n");

  await tg("sendMessage", {
    chat_id:      CHAT_ID,
    text,
    parse_mode:   "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "🙋 Pickup", callback_data: `pickup:${ticket.orderId}` },
      ]],
    },
  });
}

/* ════════════════════════════════════════════════════════════
   2. Dispatcher utama
   ════════════════════════════════════════════════════════════ */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const cq  = update.callback_query;
  const msg = update.message;

  if (cq?.data) {
    const d = cq.data as string;
    if      (d.startsWith("pickup:"))  await handlePickup(cq);
    else if (d.startsWith("upd:"))     await handleUpdateStart(cq);
    else if (d.startsWith("p:"))       await handlePenyebab(cq);
    else if (d.startsWith("s:"))       await handleSegmen(cq);
    else if (d.startsWith("a:"))       await handleActsol(cq);
    else if (d.startsWith("ev_done:")) await handleEvidenceDone(cq);
    return;
  }

  if (msg?.photo && msg.from?.id) {
    await handlePhoto(msg);
  }
}

/* ════════════════════════════════════════════════════════════
   3. Pickup
   ════════════════════════════════════════════════════════════ */
async function handlePickup(cq: any): Promise<void> {
  const orderId  = cq.data.slice("pickup:".length) as string;
  const from     = cq.from;
  const userName = from.username ? `@${from.username}` : (from.first_name as string);
  const userId   = from.id as number;
  const msg      = cq.message;
  const now      = new Date();   // untuk display Telegram
  const nowDb    = nowWib();     // untuk disimpan ke DB (WIB)

  await tg("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: `✅ ${userName} pickup tiket!`,
  });

  // Update DB
  await db.update(pengukuranOrderPsb).set({
    pic:              userName,
    statusPengerjaan: "pickup",
    pickupTime:       nowDb,
  }).where(eq(pengukuranOrderPsb.orderId, orderId));

  // Edit pesan grup — hapus tombol, tambah info pickup
  if (msg) {
    await tg("editMessageText", {
      chat_id:      msg.chat.id,
      message_id:   msg.message_id,
      text:         esc(msg.text) + `\n\n✅ <b>Diambil oleh ${esc(userName)}</b>`,
      parse_mode:   "HTML",
      reply_markup: { inline_keyboard: [] },
    });
  }

  // Kirim DM
  const dmRes = await tg("sendMessage", {
    chat_id:    userId,
    text: [
      `<b>MOJANG GAUL - FFG</b>`,
      ``,
      `Order ID      : <code>${esc(orderId)}</code>`,
      `Waktu Pick UP : ${fmtDate(now)}`,
      ``,
      `Tiket sudah kamu pick up! Mohon untuk segera melakukan update progress perbaikan sebelum tiket reguler terbit dan Performansi FFG memburuk!`,
    ].join("\n"),
    parse_mode:   "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📝 Update Progress", callback_data: `upd:${orderId}` },
      ]],
    },
  });

  if (!dmRes.ok) {
    console.warn(`[telegram] Gagal DM ke ${userName} (id:${userId}) — belum /start bot`);
  }
}

/* ════════════════════════════════════════════════════════════
   4. Update Progress → tanya penyebab
   ════════════════════════════════════════════════════════════ */
async function handleUpdateStart(cq: any): Promise<void> {
  if (!cq.message) return;

  const orderId = cq.data.slice("upd:".length) as string;
  const userId  = cq.from.id as number;

  await tg("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: "📝 Memulai update...",
  });

  const [order] = await db
    .select({ sto: pengukuranOrderPsb.sto })
    .from(pengukuranOrderPsb)
    .where(eq(pengukuranOrderPsb.orderId, orderId))
    .limit(1);

  await tg("editMessageText", {
    chat_id:      cq.message.chat.id,
    message_id:   cq.message.message_id,
    text:         `*Penyebab Redaman Loss?*`,
    parse_mode:   "Markdown",
    reply_markup: {
      inline_keyboard: PENYEBAB_OPTS.map((opt, i) => [
        { text: opt, callback_data: `p:${orderId}:${i}` },
      ]),
    },
  });

  convs.set(userId, {
    step:      "penyebab",
    orderId,
    sto:       order?.sto ?? null,
    stepMsgId: cq.message.message_id,
    evidence:  [],
  });
}

/* ════════════════════════════════════════════════════════════
   5. Jawaban penyebab → tanya segmen
   ════════════════════════════════════════════════════════════ */
async function handlePenyebab(cq: any): Promise<void> {
  if (!cq.message) return;

  const parts   = (cq.data as string).split(":");
  const orderId = parts[1]!;
  const idx     = Number(parts[2]);
  const userId  = cq.from.id as number;
  const state   = convs.get(userId);

  if (!state || state.orderId !== orderId) {
    await tg("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⚠️ Sesi kedaluwarsa. Mulai ulang dari grup.",
      show_alert: true,
    });
    return;
  }

  const penyebab = PENYEBAB_OPTS[idx];
  if (!penyebab) return;

  state.penyebab = penyebab;
  state.step     = "segmen";

  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: `✅ ${penyebab}` });

  await tg("editMessageText", {
    chat_id:      cq.message.chat.id,
    message_id:   state.stepMsgId,
    text:         `*Penyebab:* ${penyebab}\n\n*Segmen Infra yang terganggu?*`,
    parse_mode:   "Markdown",
    reply_markup: {
      inline_keyboard: SEGMEN_OPTS.map((opt, i) => [
        { text: opt, callback_data: `s:${orderId}:${i}` },
      ]),
    },
  });
}

/* ════════════════════════════════════════════════════════════
   6. Jawaban segmen → tanya actual solution
   ════════════════════════════════════════════════════════════ */
async function handleSegmen(cq: any): Promise<void> {
  if (!cq.message) return;

  const parts   = (cq.data as string).split(":");
  const orderId = parts[1]!;
  const idx     = Number(parts[2]);
  const userId  = cq.from.id as number;
  const state   = convs.get(userId);

  if (!state || state.orderId !== orderId) {
    await tg("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⚠️ Sesi kedaluwarsa. Mulai ulang dari grup.",
      show_alert: true,
    });
    return;
  }

  const segmen = SEGMEN_OPTS[idx];
  if (!segmen) return;

  state.segmen = segmen;
  state.step   = "actsol";

  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: `✅ ${segmen}` });

  await tg("editMessageText", {
    chat_id:      cq.message.chat.id,
    message_id:   state.stepMsgId,
    text: [
      `*Penyebab:* ${state.penyebab}`,
      `*Segmen:* ${segmen}`,
      ``,
      `*Pilih Actual Solution yang dilakukan?*`,
    ].join("\n"),
    parse_mode:   "Markdown",
    reply_markup: {
      inline_keyboard: ACTSOL_OPTS.map((opt, i) => [
        { text: opt, callback_data: `a:${orderId}:${i}` },
      ]),
    },
  });
}

/* ════════════════════════════════════════════════════════════
   7. Jawaban actual solution → minta foto evidence
   ════════════════════════════════════════════════════════════ */
async function handleActsol(cq: any): Promise<void> {
  if (!cq.message) return;

  const parts   = (cq.data as string).split(":");
  const orderId = parts[1]!;
  const idx     = Number(parts[2]);
  const userId  = cq.from.id as number;
  const state   = convs.get(userId);

  if (!state || state.orderId !== orderId) {
    await tg("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⚠️ Sesi kedaluwarsa. Mulai ulang dari grup.",
      show_alert: true,
    });
    return;
  }

  const actsol = ACTSOL_OPTS[idx];
  if (!actsol) return;

  state.actsol = actsol;
  state.step   = "evidence";

  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: `✅ ${actsol}` });

  // Edit step message jadi ringkasan pilihan
  await tg("editMessageText", {
    chat_id:      cq.message.chat.id,
    message_id:   state.stepMsgId,
    text: [
      `*Penyebab:* ${state.penyebab}`,
      `*Segmen:* ${state.segmen}`,
      `*Solusi:* ${actsol}`,
    ].join("\n"),
    parse_mode:   "Markdown",
    reply_markup: { inline_keyboard: [] },
  });

  // Kirim pesan baru untuk evidence
  const evRes = await tg("sendMessage", {
    chat_id:    cq.message.chat.id,
    text:       `*Berikan Evidence* (minimal 1, maksimal 3 foto):\n\nFoto diterima: 0/3`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Selesai", callback_data: `ev_done:${orderId}` },
      ]],
    },
  });

  if (evRes.ok) {
    state.evidenceMsgId = evRes.result.message_id;
  }
}

/* ════════════════════════════════════════════════════════════
   8. Terima foto evidence
   ════════════════════════════════════════════════════════════ */
async function handlePhoto(msg: any): Promise<void> {
  const userId = msg.from.id as number;
  const state  = convs.get(userId);

  if (!state || state.step !== "evidence") return;
  if (state.evidence.length >= 3) return;

  // Ambil resolusi tertinggi (elemen terakhir array photo)
  const photos = msg.photo as any[];
  const fileId = photos[photos.length - 1]?.file_id as string | undefined;
  if (!fileId) return;

  state.evidence.push(fileId);
  const count = state.evidence.length;

  if (state.evidenceMsgId) {
    await tg("editMessageText", {
      chat_id:      msg.chat.id,
      message_id:   state.evidenceMsgId,
      text:         `*Berikan Evidence* (minimal 1, maksimal 3 foto):\n\nFoto diterima: ${count}/3`,
      parse_mode:   "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Selesai", callback_data: `ev_done:${state.orderId}` },
        ]],
      },
    });
  }

  // Auto-selesai jika sudah 3 foto
  if (count >= 3) {
    await completeTiket(userId, msg.chat.id, state);
  }
}

/* ════════════════════════════════════════════════════════════
   9. Tombol Selesai pada evidence
   ════════════════════════════════════════════════════════════ */
async function handleEvidenceDone(cq: any): Promise<void> {
  const orderId = cq.data.slice("ev_done:".length) as string;
  const userId  = cq.from.id as number;
  const state   = convs.get(userId);

  if (!state || state.orderId !== orderId) {
    await tg("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⚠️ Sesi kedaluwarsa.",
      show_alert: true,
    });
    return;
  }

  if (state.evidence.length === 0) {
    await tg("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⚠️ Kirim minimal 1 foto evidence terlebih dahulu!",
      show_alert: true,
    });
    return;
  }

  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "✅ Selesai!" });

  const chatId = cq.message?.chat.id ?? userId;
  await completeTiket(userId, chatId, state);
}

/* ════════════════════════════════════════════════════════════
   10. Selesaikan tiket — update DB + notif grup
   ════════════════════════════════════════════════════════════ */
async function completeTiket(
  userId:  number,
  dmChatId: number,
  state:   ConvState,
): Promise<void> {
  const now   = new Date();   // untuk display Telegram
  const nowDb = nowWib();     // untuk disimpan ke DB (WIB)

  // Update DB
  await db.update(pengukuranOrderPsb).set({
    statusPengerjaan: "done",
    doneTime:         nowDb,
    penyebabLoss:     state.penyebab ?? null,
    segmenInfra:      state.segmen   ?? null,
    actsol:           state.actsol   ?? null,
    evidence:         JSON.stringify(state.evidence),
  }).where(eq(pengukuranOrderPsb.orderId, state.orderId));

  // Ambil info pickup dari DB
  const [order] = await db
    .select({
      pic:        pengukuranOrderPsb.pic,
      pickupTime: pengukuranOrderPsb.pickupTime,
    })
    .from(pengukuranOrderPsb)
    .where(eq(pengukuranOrderPsb.orderId, state.orderId))
    .limit(1);

  // Update pesan evidence jadi konfirmasi
  if (state.evidenceMsgId) {
    await tg("editMessageText", {
      chat_id:      dmChatId,
      message_id:   state.evidenceMsgId,
      text:         `✅ <b>${state.evidence.length} foto evidence berhasil disimpan.</b>`,
      parse_mode:   "HTML",
      reply_markup: { inline_keyboard: [] },
    });
  }

  // DM konfirmasi
  await tg("sendMessage", {
    chat_id:    dmChatId,
    text:       `✅ <b>Update selesai!</b> Laporan telah dikirim ke grup.`,
    parse_mode: "HTML",
  });

  // Notifikasi selesai ke grup
  await tg("sendMessage", {
    chat_id:    CHAT_ID,
    text: [
      `✅ <b>TIKET SELESAI DIPERBAIKI</b>`,
      ``,
      `📋 Order ID : <code>${esc(state.orderId)}</code>`,
      `📍 STO      : ${esc(state.sto)}`,
      ``,
      `👤 Dikerjakan oleh : ${esc(order?.pic)}`,
      `⏰ Waktu Pick up   : ${order?.pickupTime ? fmtDate(new Date(order.pickupTime)) : "—"}`,
      `🔍 Penyebab Loss   : ${esc(state.penyebab)}`,
      `🔧 Segmen Infra    : ${esc(state.segmen)}`,
      `🛠️  Actual Solution : ${esc(state.actsol)}`,
      `⏱️  Waktu Update    : ${fmtDate(now)}`,
    ].join("\n"),
    parse_mode: "HTML",
  });

  convs.delete(userId);
}

/* ════════════════════════════════════════════════════════════
   11. Polling loop
   ════════════════════════════════════════════════════════════ */
export async function startPolling(): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[telegram] BOT_TOKEN tidak dikonfigurasi, polling dinonaktifkan");
    return;
  }

  await tg("deleteWebhook", {});
  console.log("[telegram] Polling dimulai...");

  let offset = 0;

  while (true) {
    try {
      const data = await tg("getUpdates", {
        offset,
        timeout:         30,
        allowed_updates: ["callback_query", "message"],
      });

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          await handleTelegramUpdate(update);
          offset = update.update_id + 1;
        }
      } else if (!data.ok) {
        if (data.error_code === 409) {
          // Konflik: instance lain masih polling, tunggu sebelum retry
          await Bun.sleep(10_000);
        } else {
          console.error("[telegram] getUpdates error:", JSON.stringify(data));
          await Bun.sleep(5_000);
        }
      }
    } catch (e) {
      console.error("[telegram] Polling error:", e);
      await Bun.sleep(5_000);
    }
  }
}
