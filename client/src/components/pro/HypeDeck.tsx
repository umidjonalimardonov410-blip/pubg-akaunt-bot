import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Gauge, Gift, ShieldCheck, Sparkles, Timer, TrendingUp, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { haptic } from "@/lib/haptics";

const uz = (value: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(value || 0));

function relativeTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "hozir";
  if (minutes < 60) return `${minutes} daq oldin`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}

/** Jonli savdo lentasi — bozor tirikligini ko'rsatuvchi yugurib turuvchi tasma. */
export function LiveTicker() {
  const feed = trpc.hype.liveFeed.useQuery({ limit: 12 }, { refetchInterval: 25_000, staleTime: 10_000 });
  const items = feed.data ?? [];
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="hype-ticker relative overflow-hidden rounded-2xl border border-amber-400/20 bg-[#0e1013]">
      <span className="absolute left-0 top-0 z-10 flex h-full items-center gap-1.5 bg-gradient-to-r from-[#0e1013] via-[#0e1013] to-transparent pl-3 pr-6 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber-300" />
        LIVE
      </span>
      <div className="hype-ticker-track flex w-max items-center gap-6 py-2.5 pl-24 pr-6">
        {loop.map((item, index) => (
          <span key={`${item.id}-${index}`} className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-white/60">
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-white/85">{item.playerName}</span>
            <span className="text-amber-200">{uz(item.price)} so'm</span>
            <span className="text-white/30">• {relativeTime(item.createdAt as unknown as string)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Bozor pulsi: raqamlar jonli sanaladi. */
function PulseValue({ value, suffix }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const steps = 22;
    const tick = () => {
      frame += 1;
      setShown(Math.round((value * frame) / steps));
      if (frame < steps) raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="font-display text-lg font-black text-white sm:text-xl">
      {uz(shown)}
      {suffix ? <span className="ml-1 font-sans text-[10px] font-bold text-white/40">{suffix}</span> : null}
    </span>
  );
}

export function MarketPulse() {
  const pulse = trpc.hype.pulse.useQuery(undefined, { refetchInterval: 30_000, staleTime: 15_000 });
  const data = pulse.data;
  const cards = [
    { label: "Faol e'lonlar", value: data?.listings ?? 0, icon: Gauge, suffix: "" },
    { label: "24 soat savdo", value: data?.soldToday ?? 0, icon: TrendingUp, suffix: "ta" },
    { label: "O'rtacha narx", value: data?.avgPrice ?? 0, icon: Flame, suffix: "so'm" },
    { label: "Eng qimmat", value: data?.topPrice ?? 0, icon: Crown, suffix: "so'm" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map(card => (
        <div key={card.label} className="hype-card rounded-2xl border border-white/[0.08] bg-[#0e1013] p-3">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
            <card.icon className="h-3.5 w-3.5 text-amber-300" />
            {card.label}
          </span>
          <span className="mt-1.5 block">
            <PulseValue value={card.value} suffix={card.suffix} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Daraja, XP progressi va nishonlar. */
export function LevelCard() {
  const { isAuthenticated } = useAuth();
  const me = trpc.hype.me.useQuery(undefined, { enabled: isAuthenticated, staleTime: 20_000 });
  if (!isAuthenticated || !me.data) return null;
  const data = me.data;
  const earned = data.badges.filter(badge => badge.earned);
  return (
    <section className="hype-card relative overflow-hidden rounded-2xl border border-amber-400/20 bg-[#0e1013] p-4">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Sizning darajangiz</span>
          <h3 className="mt-1 font-display text-xl font-black text-white">
            LVL {data.level} <span className="text-amber-200">{data.title}</span>
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-black text-amber-100">
          <Zap className="h-3.5 w-3.5" />
          {uz(data.xp)} XP
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="xp-bar h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(data.progress * 100)}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-white/40">
        Keyingi darajaga {uz(Math.max(0, data.nextLevelXp - data.xp))} XP • streak {data.spinStreak} kun
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.badges.map(badge => (
          <span
            key={badge.key}
            title={badge.hint}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${
              badge.earned
                ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                : "border-white/[0.07] bg-white/[0.02] text-white/25"
            }`}
          >
            <span>{badge.emoji}</span>
            {badge.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/30">{earned.length}/{data.badges.length} nishon ochilgan</p>
    </section>
  );
}

/** Kunlik omad g'ildiragi — 24 soatda 1 marta, natija Telegramga ham yuboriladi. */
export function SpinWheel() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const me = trpc.hype.me.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ emoji: string; label: string; promoCode: string | null; xpGained: number } | null>(null);
  const timer = useRef<number | null>(null);

  const prizes = me.data?.prizes ?? [];
  const segment = prizes.length > 0 ? 360 / prizes.length : 45;

  const spin = trpc.hype.spin.useMutation({
    onSuccess: data => {
      const target = 360 * 6 - (data.index * segment + segment / 2);
      setAngle(previous => previous + (target - (previous % 360)) + 360);
      timer.current = window.setTimeout(() => {
        setSpinning(false);
        setResult({ emoji: data.prize.emoji, label: data.prize.label, promoCode: data.promoCode, xpGained: data.xpGained });
        haptic("success");
        toast.success(`${data.prize.emoji} ${data.prize.label}`, {
          description: data.promoCode ? `Promo-kod: ${data.promoCode} • +${data.xpGained} XP` : `+${data.xpGained} XP`,
        });
        utils.hype.me.invalidate();
        utils.profile.get.invalidate();
      }, 4200);
    },
    onError: error => {
      setSpinning(false);
      toast.error(error.message || "G‘ildirak hozir mavjud emas");
    },
  });

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const wheelBackground = useMemo(() => {
    if (prizes.length === 0) return "conic-gradient(#1a1d21, #101215)";
    const stops = prizes
      .map((_, index) => {
        const color = index % 2 === 0 ? "rgba(245,197,66,.22)" : "rgba(255,255,255,.04)";
        return `${color} ${index * segment}deg ${(index + 1) * segment}deg`;
      })
      .join(", ");
    return `conic-gradient(${stops})`;
  }, [prizes, segment]);

  if (!isAuthenticated) return null;
  const ready = Boolean(me.data?.canSpin) && !spinning;

  return (
    <section className="hype-card relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-amber-300" />
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">Omad g‘ildiragi</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-white/35">
          <Timer className="h-3 w-3" />24 soatda 1 marta
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative h-44 w-44 shrink-0">
          <span className="absolute left-1/2 top-0 z-20 -translate-x-1/2 text-lg">🔻</span>
          <motion.div
            className="wheel-glow h-44 w-44 rounded-full border border-amber-400/30"
            style={{ background: wheelBackground }}
            animate={{ rotate: angle }}
            transition={{ duration: 4, ease: [0.15, 0.9, 0.2, 1] }}
          >
            {prizes.map((prize, index) => (
              <span
                key={prize.key}
                className="absolute left-1/2 top-1/2 origin-left text-[11px] font-black text-white/80"
                style={{ transform: `rotate(${index * segment + segment / 2}deg) translateX(26px)` }}
              >
                {prize.emoji}
              </span>
            ))}
          </motion.div>
          <span className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-400/40 bg-black/70 text-amber-200">
            <Sparkles className="h-5 w-5" />
          </span>
        </div>

        <div className="w-full space-y-2">
          <button
            type="button"
            disabled={!ready || spin.isPending}
            onClick={() => {
              if (!ready) return;
              haptic("light");
              setResult(null);
              setSpinning(true);
              spin.mutate();
            }}
            className="btn-shine w-full rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-3 text-sm font-black text-amber-100 transition active:scale-95 disabled:opacity-40"
          >
            {spinning ? "Aylanmoqda..." : ready ? "Aylantirish" : "Ertaga qayta urinib ko‘ring"}
          </button>
          {result ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-xs text-amber-50">
              <p className="font-black">{result.emoji} {result.label}</p>
              <p className="mt-1 text-[11px] text-white/55">+{uz(result.xpGained)} XP{result.promoCode ? ` • promo: ${result.promoCode}` : ""}</p>
            </div>
          ) : (
            <p className="text-[11px] leading-5 text-white/40">
              Har kuni aylantiring: XP, pul bonusi yoki shaxsiy chegirma promo-kodi. Natija Telegram botga ham yuboriladi.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Eng faol treyderlar reytingi. */
export function TopTraders() {
  const traders = trpc.hype.topTraders.useQuery({ limit: 5 }, { staleTime: 60_000 });
  const rows = traders.data ?? [];
  if (rows.length === 0) return null;
  return (
    <section className="hype-card rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-300" />
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">Top treyderlar</h3>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black ${row.rank === 1 ? "bg-amber-400/20 text-amber-200" : "bg-white/[0.05] text-white/45"}`}>
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-white">
                {row.name} {row.verified ? <ShieldCheck className="inline h-3 w-3 text-amber-300" /> : null}
              </p>
              <p className="text-[10px] text-white/35">LVL {row.level} • {row.title} • {row.totalSales} savdo</p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-amber-200">★ {row.rating.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HypeDeck() {
  return (
    <div className="space-y-3">
      <LiveTicker />
      <MarketPulse />
      <div className="grid gap-3 lg:grid-cols-2">
        <LevelCard />
        <SpinWheel />
      </div>
      <TopTraders />
    </div>
  );
}
