export type AdminPayoutCardStatus = {
  configured: boolean;
  holder?: string;
  maskedNumber?: string;
  fullNumber?: never;
};

function normalizeCardNumber(value: string | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

export function getAdminPayoutCardStatus(): AdminPayoutCardStatus {
  const number = normalizeCardNumber(process.env.ADMIN_PAYOUT_CARD_NUMBER);
  const holder = String(process.env.ADMIN_PAYOUT_CARD_HOLDER ?? '').trim();
  if (number.length < 12 || !holder) return { configured: false };
  return {
    configured: true,
    holder,
    maskedNumber: `${number.slice(0, 4)} **** **** ${number.slice(-4)}`,
  };
}

export function getAdminPayoutCardSecret() {
  const number = normalizeCardNumber(process.env.ADMIN_PAYOUT_CARD_NUMBER);
  const holder = String(process.env.ADMIN_PAYOUT_CARD_HOLDER ?? '').trim();
  if (number.length < 12 || !holder) return null;
  return { number, holder };
}
