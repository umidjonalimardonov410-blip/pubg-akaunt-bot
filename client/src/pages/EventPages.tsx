/**
 * Flash-sale va Mystery Box sahifalari — to'liq mobilga moslashgan,
 * gamer uslubidagi animatsiyalar bilan.
 */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "wouter";
import { Clock, Flame, Gift, Package, Sparkles, Ticket, TrendingDown, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const money = (value: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(value));

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** `01:02:03` ko'rinishidagi countdown. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function CountdownPill({ msLeft, tone = "amber" }: { msLeft: number; tone?: "amber" | "red" }) {
  const parts = formatCountdown(msLeft).split(":");
  const color = tone === "red" ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-amber-300/30 bg-amber-400/10 text-amber-200";
  return (
    <div className="flex items-center gap-1.5">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <motion.span
            key={`${index}-${part}`}
            initial={{ y: -6, opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`grid min-w-[2.4rem] place-items-center rounded-xl border px-2 py-1.5 font-mono text-base font-black tabular-nums ${color}`}
          >
            {part}
          </motion.span>
          {index < parts.length - 1 ? <span className="text-white/25">:</span> : null}
        </span>
      ))}
    </div>
  );
}

export function FlashSalePage() {
  const now = useTicker();
  const query = trpc.events.flash.active.useQuery(undefined, { refetchInterval: 30_000 });
  const items = query.data?.items ?? [];
  const nextStartMs = query.data?.nextStart ? new Date(query.data.nextStart).getTime() : 0;

  return (
    <div className="space-y-5 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-amber-300/20"
      >
        <img src="/assets/flash-sale.jpg" alt="Flash-sale" width={1024} height={640} className="h-44 w-full object-cover sm:h-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <motion.div
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.35),transparent_65%)]"
        />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
            <Zap className="h-3 w-3" /> Har kuni 20:00
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">1 soatlik flash-sale</h1>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60 sm:text-sm">
            Uchta tanlangan akkauntga 10-15% chegirma. Vaqt tugashi bilan narx avtomatik qaytadi.
          </p>
        </div>
      </motion.section>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 text-center"
        >
          <motion.span
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-200"
          >
            <Clock className="h-6 w-6" />
          </motion.span>
          <p className="mt-3 text-base font-black text-white">Hozir aksiya yo‘q</p>
          <p className="mt-1 text-xs text-white/50">Keyingi flash-sale boshlanishiga:</p>
          <div className="mt-3 flex justify-center">
            <CountdownPill msLeft={nextStartMs - now} />
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const msLeft = new Date(item.endsAt).getTime() - now;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.35 }}
                className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-4"
              >
                <motion.span
                  animate={{ x: ["-120%", "220%"] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent"
                />
                <div className="flex items-start gap-3">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.playerName} loading="lazy" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-200">
                      <Flame className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-black text-white">{item.playerName}</p>
                      <motion.span
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        className="shrink-0 rounded-lg bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-200"
                      >
                        -{item.discountPercent}%
                      </motion.span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {item.region} • {item.level}-daraja
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="text-lg font-black text-amber-300">{money(item.salePrice)} so‘m</span>
                      <span className="text-xs font-bold text-white/35 line-through">{money(item.originalPrice)}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                        <TrendingDown className="h-3 w-3" /> {money(item.originalPrice - item.salePrice)} tejaysiz
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CountdownPill msLeft={msLeft} tone="red" />
                  <Link
                    href={`/account/${item.accountId}`}
                    className="grid h-11 place-items-center rounded-2xl bg-amber-400 px-5 text-sm font-black text-black active:scale-[0.98] sm:h-10"
                  >
                    Hoziroq sotib olish
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const prizeIcon = { account: Package, promo: Ticket, uc: Sparkles, empty: Gift } as const;

export function MysteryBoxPage() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const status = trpc.events.mystery.status.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10_000 });
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<{ prize: keyof typeof prizeIcon; label: string } | null>(null);
  const open = trpc.events.mystery.open.useMutation({
    onSuccess: data => {
      setTimeout(() => {
        setOpening(false);
        setResult({ prize: data.prize as keyof typeof prizeIcon, label: data.label });
        utils.events.mystery.status.invalidate();
        if (data.prize === "empty") toast("Bo‘sh quti chiqdi. Omad keyingi safar!");
        else toast.success("Tabriklaymiz, sovrin qo‘lga kiritildi!");
      }, 1400);
    },
    onError: error => {
      setOpening(false);
      toast.error(error.message);
    },
  });

  const info = status.data;
  const canOpen = Boolean(info?.canOpen) && !open.isPending && !opening;
  const balanceLabel = useMemo(() => money(info?.balance ?? 0), [info?.balance]);

  const handleOpen = () => {
    if (!isAuthenticated) {
      toast.error("Avval Telegram orqali kiring");
      return;
    }
    setResult(null);
    setOpening(true);
    open.mutate({});
  };

  const ResultIcon = result ? prizeIcon[result.prize] : Gift;

  return (
    <div className="space-y-5 pb-24">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-amber-300/20"
      >
        <img src="/assets/mystery-box.jpg" alt="Mystery Box" width={1024} height={640} className="h-44 w-full object-cover sm:h-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
            <Gift className="h-3 w-3" /> Kunlik limit
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">Mystery Box</h1>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-white/60 sm:text-sm">
            50 000 so‘mlik quti. Ichidan akkaunt, chegirma kodi yoki UC chiqishi mumkin.
          </p>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Balansingiz</p>
          <p className="mt-2 truncate text-lg font-black text-white">{balanceLabel} so‘m</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Bugungi limit</p>
          <p className="mt-2 truncate text-lg font-black text-amber-300">{info?.userRemaining ?? 0} ta quti</p>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-b from-amber-500/[0.08] to-transparent p-6 text-center">
        <motion.div
          animate={opening ? { rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.08, 1] } : { y: [0, -6, 0] }}
          transition={opening ? { duration: 0.6, repeat: Infinity } : { duration: 2.6, repeat: Infinity }}
          className="mx-auto grid h-28 w-28 place-items-center rounded-3xl border border-amber-300/30 bg-amber-400/10 text-amber-200 shadow-[0_0_50px_-12px_rgba(251,191,36,0.6)]"
        >
          <Gift className="h-12 w-12" />
        </motion.div>
        <p className="mt-4 text-sm font-bold text-white/60">Quti narxi: 50 000 so‘m</p>
        <button
          type="button"
          onClick={handleOpen}
          disabled={!canOpen}
          className="mt-4 h-12 w-full rounded-2xl bg-amber-400 text-sm font-black text-black transition active:scale-[0.98] disabled:opacity-40 sm:w-auto sm:px-10"
        >
          {opening ? "Ochilmoqda..." : "Qutini ochish"}
        </button>
        {info && info.globalRemaining <= 0 ? (
          <p className="mt-3 text-xs font-bold text-red-300">Bugungi qutilar tugadi. Ertaga yangi partiya chiqadi.</p>
        ) : null}
      </div>

      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-3xl border border-amber-300/30 bg-amber-400/[0.07] p-5 text-center"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-200">
              <ResultIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 text-base font-black text-white">{result.label}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {info?.history?.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">Oxirgi ochilishlar</p>
          {info.history.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-xs font-bold text-white/70"
            >
              {row.prizeLabel}
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default FlashSalePage;
