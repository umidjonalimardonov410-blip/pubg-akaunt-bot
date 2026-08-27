/**
 * Escrow "Deal Room" taymeri: har bosqich uchun muddat, sanoq va eslatma holati.
 * Toza funksiya — buyurtma holatini oladi, deadline hisoblaydi.
 */

export type EscrowStage = "payment_frozen" | "account_verification" | "buyer_confirmation";

export const STAGE_LIMITS_MS: Record<EscrowStage, number> = {
  payment_frozen: 2 * 60 * 60 * 1000, // sotuvchi 2 soat ichida javob berishi kerak
  account_verification: 12 * 60 * 60 * 1000, // ma'lumot topshirish va tekshirish
  buyer_confirmation: 24 * 60 * 60 * 1000, // xaridor tasdig'i
};

export const STAGE_META: Record<EscrowStage, { label: string; who: "seller" | "buyer" | "admin"; hint: string }> = {
  payment_frozen: {
    label: "To'lov muzlatildi",
    who: "seller",
    hint: "Sotuvchi akkaunt ma'lumotlarini topshirishi kerak.",
  },
  account_verification: {
    label: "Akkaunt tekshiruvi",
    who: "admin",
    hint: "Akkaunt ma'lumotlari tekshirilmoqda.",
  },
  buyer_confirmation: {
    label: "Xaridor tasdig'i",
    who: "buyer",
    hint: "Xaridor akkauntni tekshirib tasdiqlashi kerak.",
  },
};

export function formatCountdown(ms: number) {
  if (ms <= 0) return "muddat tugadi";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} kun ${hours % 24} soat`;
  }
  if (hours > 0) return `${hours} soat ${minutes} daq`;
  return `${minutes} daq`;
}

export function buildDealRoom(order: {
  status: string;
  escrowStage: EscrowStage | null | undefined;
  updatedAt: Date | string;
  createdAt: Date | string;
}, now = new Date()) {
  const stage = (order.escrowStage ?? "payment_frozen") as EscrowStage;
  const startedAtRaw = order.updatedAt ?? order.createdAt;
  const startedAt = startedAtRaw instanceof Date ? startedAtRaw : new Date(startedAtRaw);
  const limit = STAGE_LIMITS_MS[stage] ?? STAGE_LIMITS_MS.payment_frozen;
  const deadline = new Date(startedAt.getTime() + limit);
  const remainingMs = deadline.getTime() - now.getTime();
  const finished = order.status === "completed" || order.status === "cancelled";

  const steps = (Object.keys(STAGE_LIMITS_MS) as EscrowStage[]).map((key, index) => ({
    key,
    label: STAGE_META[key].label,
    hint: STAGE_META[key].hint,
    who: STAGE_META[key].who,
    state:
      finished && order.status === "completed"
        ? "done"
        : index < stageIndex(stage)
          ? "done"
          : index === stageIndex(stage)
            ? "active"
            : "pending",
  }));

  return {
    stage,
    label: STAGE_META[stage].label,
    hint: STAGE_META[stage].hint,
    responsible: STAGE_META[stage].who,
    deadline,
    remainingMs: finished ? 0 : remainingMs,
    countdownLabel: finished ? "yakunlandi" : formatCountdown(remainingMs),
    overdue: !finished && remainingMs <= 0,
    urgent: !finished && remainingMs > 0 && remainingMs <= 60 * 60 * 1000,
    finished,
    progress: finished && order.status === "completed" ? 1 : (stageIndex(stage) + 0.5) / 3,
    steps,
  };
}

export function stageIndex(stage: EscrowStage) {
  return ["payment_frozen", "account_verification", "buyer_confirmation"].indexOf(stage);
}
