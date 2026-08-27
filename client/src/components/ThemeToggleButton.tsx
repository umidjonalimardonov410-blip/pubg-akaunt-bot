import React from "react";
import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { APP_THEMES, useTheme, type AppTheme } from "@/contexts/ThemeContext";
import { telegramHaptic } from "@/lib/telegram";

/**
 * Ixcham tema tugmasi — yuqori paneldа til tugmasi yonida turadi.
 * Bosilganda kichik menyu ochiladi, tanlov profilga saqlanadi.
 */
export default function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const update = trpc.profile.update.useMutation();
  const [open, setOpen] = useState(false);
  const hydrated = useRef(false);
  const lastSaved = useRef<AppTheme | null>(null);

  useEffect(() => {
    if (hydrated.current) return;
    const saved = (me.data as any)?.themePreference as AppTheme | undefined;
    if (!saved) return;
    hydrated.current = true;
    lastSaved.current = saved;
    if (saved !== theme) setTheme(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("app:close-popovers", close);
    return () => window.removeEventListener("app:close-popovers", close);
  }, []);

  const pick = (next: AppTheme) => {
    setTheme(next);
    setOpen(false);
    telegramHaptic("light");
    if (!me.data || lastSaved.current === next) return;
    lastSaved.current = next;
    update.mutate(
      { themePreference: next },
      {
        onError: () => toast.error("Temani saqlab bo‘lmadi"),
      },
    );
  };

  const active = APP_THEMES.find(option => option.id === theme) ?? APP_THEMES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => { if (!value) window.dispatchEvent(new CustomEvent("app:close-popovers")); return !value; })}
        aria-label="Tema"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/10 transition duration-200 hover:bg-white/[0.07] hover:text-amber-100 hover:ring-amber-400/35 active:scale-[.96]"
      >
        <span className="relative grid place-items-center">
          <Palette className="h-4 w-4" />
          <span className="absolute -bottom-1 h-1 w-4 rounded-full" style={{ background: active?.swatch }} />
        </span>
      </button>
      {open && <button type="button" aria-label="Yopish" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0d0f12] shadow-2xl">
          {APP_THEMES.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(option.id)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition hover:bg-amber-400/[0.08] ${option.id === theme ? "text-amber-200" : "text-white/65"}`}
            >
              <span className="h-4 w-4 shrink-0 rounded-full border border-white/15" style={{ background: option.swatch }} />
              <span className="flex-1 truncate">{option.label}</span>
              {option.id === theme ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
