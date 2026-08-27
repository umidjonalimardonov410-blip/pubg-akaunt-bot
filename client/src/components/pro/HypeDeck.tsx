import { useEffect, useState } from "react";
import { Crown, Flame, Gauge, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AimTrainer from "./AimTrainer";

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

export default function HypeDeck() {
  return (
    <div className="space-y-3">
      <LiveTicker />
      <MarketPulse />
      <AimTrainer />
    </div>
  );
}
