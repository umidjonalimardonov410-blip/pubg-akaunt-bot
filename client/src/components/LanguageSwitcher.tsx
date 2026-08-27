import React, { useEffect, useRef, useState } from "react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";

/**
 * Til almashtirgich — bayroq + kod ko'rinishida, tanlov localStorage'ga saqlanadi
 * va butun interfeys darhol qayta tarjima qilinadi (LanguageSync orqali).
 */
export default function LanguageSwitcher(_props: { compact?: boolean } = {}) {
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
        className="pubg-press grid h-10 min-w-10 place-items-center rounded-xl bg-white/[0.04] px-3 text-white/70 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.07] hover:text-white hover:ring-amber-400/35"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.14em]" data-testid="language-current">
          {active.code}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          data-testid="language-menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl bg-[#0e1013]/95 p-1 shadow-[0_18px_50px_rgba(0,0,0,.6)] ring-1 ring-inset ring-white/10 backdrop-blur-xl"
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
              <span className="w-7 shrink-0 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{item.code}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
