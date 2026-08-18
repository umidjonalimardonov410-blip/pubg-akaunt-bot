import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";

/** Web-app'da tanlangan til bot va profilga ham yoziladi. */
export default function LanguageSync() {
  const { lang } = useI18n();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const update = trpc.profile.update.useMutation();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    if (last.current === lang) return;
    last.current = lang;
    update.mutate({ languageCode: lang }, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, me.data]);

  return null;
}
