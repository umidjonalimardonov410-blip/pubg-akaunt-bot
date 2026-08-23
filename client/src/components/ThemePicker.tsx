import { useEffect, useRef } from "react";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { APP_THEMES, useTheme, type AppTheme } from "@/contexts/ThemeContext";
import { telegramHaptic } from "@/lib/telegram";

/**
 * Gamer/neon/dark temalarini tanlash. Tanlangan tema profilga saqlanadi
 * va boshqa qurilmada ham avtomatik tiklanadi.
 */
export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const update = trpc.profile.update.useMutation();
  const hydrated = useRef(false);
  const lastSaved = useRef<AppTheme | null>(null);

  // Profildagi temani bir marta qo'llash.
  useEffect(() => {
    if (hydrated.current) return;
    const saved = (me.data as any)?.themePreference as AppTheme | undefined;
    if (!saved) return;
    hydrated.current = true;
    lastSaved.current = saved;
    if (saved !== theme) setTheme(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  const pick = (next: AppTheme) => {
    setTheme(next);
    telegramHaptic("light");
    if (!me.data || lastSaved.current === next) return;
    lastSaved.current = next;
    update.mutate(
      { themePreference: next },
      {
        onSuccess: () => toast.success("Tema profilga saqlandi"),
        onError: () => toast.error("Temani saqlab bo‘lmadi"),
      },
    );
  };

  return (
    <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-200">
          <Palette className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-black text-white">Ko‘rinish (tema)</h2>
          <p className="mt-1 text-xs text-white/40">Gamer, neon yoki klassik dark temani tanlang — tanlov profilga saqlanadi.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {APP_THEMES.map(option => {
          const active = option.id === theme;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(option.id)}
              aria-pressed={active}
              className={`theme-card group relative overflow-hidden rounded-xl border p-4 text-left transition duration-200 ${
                active
                  ? "border-amber-300/60 bg-amber-400/[0.08] shadow-[0_0_22px_rgba(245,197,66,.18)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-amber-300/40"
              }`}
            >
              <span className="block h-12 w-full rounded-lg" style={{ background: option.swatch }} />
              <span className="mt-3 flex items-center justify-between">
                <span className="text-sm font-black text-white">{option.label}</span>
                {active ? <Check className="h-4 w-4 text-amber-200" /> : null}
              </span>
              <span className="mt-1 block text-[11px] text-white/40">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
