import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";

/**
 * Til almashtirgich — bayroq + kod ko'rinishida, tanlov localStorage'ga saqlanadi
 * va butun interfeys darhol qayta tarjima qilinadi (LanguageSync orqali).
 */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LANGUAGES.find(item => item.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    const close = (event: Event) => {
      if (event.type === "app:close-popovers") return setOpen(false);
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("app:close-popovers", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("app:close-popovers", close);
    };
  }, []);

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0" data-testid="language-switcher">
      <button
        type="button"
        onClick={() => {
          if (!open) window.dispatchEvent(new CustomEvent("app:close-popovers"));
          setOpen(value => !value);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Tilni tanlash"
        data-testid="language-switcher-button"
        className="pubg-press flex h-10 min-w-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-white/70 transition hover:border-amber-400/40 hover:text-white"
      >
        <span className="text-base leading-none">{active.flag}</span>
        {!compact && (
          <span className="text-[11px] font-black uppercase tracking-widest" data-testid="language-current">
            {active.code}
          </span>
        )}
      </button>
      {open && (
        <div
          role="listbox"
          data-testid="language-menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1013] p-1 shadow-[0_18px_50px_rgba(0,0,0,.6)]"
        >
          {LANGUAGES.map(item => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === lang}
              data-testid={`language-option-${item.code}`}
              onClick={() => choose(item.code)}
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-bold transition ${
                item.code === lang ? "bg-amber-400/15 text-amber-100" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.flag}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
