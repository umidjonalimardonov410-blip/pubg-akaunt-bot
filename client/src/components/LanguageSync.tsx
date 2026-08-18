import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { applyDetectedLang, useI18n } from "@/lib/i18n";
import { setPhraseOverrides } from "@/lib/phraseStore";

/**
 * 1) Telegram/profil tilini avtomatik qo'llaydi (zaxira: brauzer tili -> uz).
 * 2) Web-app'da tanlangan til bot va profilga ham yoziladi.
 * 3) Admin tahrirlagan tarjimalarni real vaqtda (polling) yuklab turadi.
 */
export default function LanguageSync() {
  const { lang } = useI18n();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const update = trpc.profile.update.useMutation();
  const overrides = trpc.phrases.list.useQuery(undefined, {
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const last = useRef<string | null>(null);

  // Telegram WebApp tilini darhol qo'llash (foydalanuvchi qo'lda tanlamagan bo'lsa).
  useEffect(() => {
    applyDetectedLang(null);
  }, []);

  // Profilga saqlangan tilni qo'llash (qurilmalar orasida bir xil bo'lishi uchun).
  useEffect(() => {
    applyDetectedLang((me.data as any)?.languageCode ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  useEffect(() => {
    if (overrides.data) setPhraseOverrides(overrides.data as any);
  }, [overrides.data]);

  useEffect(() => {
    if (!me.data) return;
    if (last.current === lang) return;
    last.current = lang;
    update.mutate({ languageCode: lang }, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, me.data]);

  return null;
}
