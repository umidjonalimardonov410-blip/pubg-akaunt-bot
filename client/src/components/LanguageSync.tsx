import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { applyDetectedLang, useI18n } from "@/lib/i18n";
import { setPhraseOverrides } from "@/lib/phraseStore";
import { retranslateDocument } from "@/lib/autoTranslate";

/**
 * 1) Telegram/profil tilini avtomatik qo'llaydi.
 * 2) Tanlangan til bot va profilga yoziladi.
 * 3) Admin tarjimalarini real vaqtda yuklab turadi.
 * 4) Til almashganda kesh tozalanadi va barcha ekranlar darhol qayta chiziladi.
 */
export default function LanguageSync() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const update = trpc.profile.update.useMutation();
  const overrides = trpc.phrases.list.useQuery(undefined, {
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const last = useRef<string | null>(null);
  const lastRefreshed = useRef<string | null>(null);

  useEffect(() => {
    applyDetectedLang(null);
  }, []);

  useEffect(() => {
    applyDetectedLang((me.data as any)?.languageCode ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  useEffect(() => {
    if (overrides.data) setPhraseOverrides(overrides.data as any);
  }, [overrides.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const first = lastRefreshed.current === null;
    lastRefreshed.current = lang;
    retranslateDocument(lang);
    if (first) return;
    void queryClient.invalidateQueries();
    void queryClient.refetchQueries({ type: "active" });
    window.dispatchEvent(new CustomEvent("inferno:lang-changed", { detail: { lang } }));
    const frame = window.requestAnimationFrame(() => retranslateDocument(lang));
    return () => window.cancelAnimationFrame(frame);
  }, [lang, queryClient]);

  useEffect(() => {
    if (!me.data) return;
    if (last.current === lang) return;
    last.current = lang;
    update.mutate({ languageCode: lang }, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, me.data]);

  return null;
}
