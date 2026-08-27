import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlarmClock,
  Crown,
  Gauge,
  Handshake,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trophy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { telegramHaptic } from "@/lib/telegram";

const uz = (value: number) => Number(value || 0).toLocaleString("uz-UZ");

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 ${className}`}>{children}</section>
  );
}

function Heading({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">{icon}</span>
      <div>
        <h3 className="font-display text-xs font-black uppercase tracking-wider text-white">{title}</h3>
        {sub && <p className="text-[10px] text-white/40">{sub}</p>}
      </div>
    </div>
  );
}

/** Sotuvchining reputatsiya darajasi va ishonch bali. */
export function TrustRankBadge({ userId }: { userId: number }) {
  const query = trpc.pro.trust.useQuery({ userId }, { staleTime: 60_000 });
  const data = query.data;
  if (!data) return null;
  return (
    <Card>
      <Heading icon={<ShieldCheck className="h-4 w-4" />} title="Ishonch reytingi" sub={`${data.completedOrders} yakunlangan savdo`} />
      <div className="mt-3 flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black"
          style={{ borderColor: `${data.rank.color}55`, background: `${data.rank.color}1a`, color: data.rank.color }}
        >
          {data.rank.emoji} {data.rank.label}
        </span>
        <span className="font-display text-lg font-black text-white">{data.score}<span className="text-xs text-white/35">/100</span></span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${data.rank.color}80, ${data.rank.color})` }}
        />
      </div>
      {Array.isArray(data.signals) && data.signals.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {data.signals.slice(0, 4).map((signal: any, index: number) => (
            <li key={index} className="flex items-start gap-2 text-[11px] text-white/55">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: signal.tone === "good" ? "#22c55e" : signal.tone === "bad" ? "#ef4444" : "#f59e0b" }} />
              {signal.label ?? String(signal)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Fair-price o'lchagich: narx bozorga nisbatan qanday. */
export function FairPriceMeter({ accountId }: { accountId: number }) {
  const query = trpc.pro.fairPrice.useQuery({ accountId }, { staleTime: 60_000 });
  const data = query.data;
  if (!data) return null;
  const ratio = Math.max(0, Math.min(1.8, Number(data.price) / Math.max(1, Number(data.fair))));
  return (
    <Card>
      <Heading icon={<Gauge className="h-4 w-4" />} title="Fair-price radar" sub="Bozor medianasi asosida" />
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Adolatli narx oralig'i</span>
          <p className="mt-1 font-display text-base font-black text-white">
            {uz(Number(data.low))} – {uz(Number(data.high))} <span className="font-sans text-[10px] text-white/35">so'm</span>
          </p>
        </div>
        <span className="rounded-xl border px-2.5 py-1.5 text-[11px] font-black" style={{ borderColor: `${data.tone}55`, background: `${data.tone}1a`, color: data.tone }}>
          {data.emoji} {data.label}
        </span>
      </div>
      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500/50 via-sky-500/50 to-rose-500/60">
        <motion.span
          initial={{ left: "0%" }}
          animate={{ left: `${(ratio / 1.8) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]"
        />
      </div>
      <p className="mt-2 text-[11px] text-white/45">
        Bu e'lon narxi bozor darajasidan {Math.abs(data.deltaPercent)}% {data.deltaPercent >= 0 ? "yuqori" : "past"}. Taqqoslangan e'lonlar: {data.sampleSize}.
      </p>
    </Card>
  );
}

/** Anti-scam skaner natijasi. */
export function RiskScanCard({ accountId }: { accountId: number }) {
  const query = trpc.pro.riskScan.useQuery({ accountId }, { staleTime: 60_000 });
  const data = query.data;
  if (!data) return null;
  const tone = data.level === "safe" ? "#22c55e" : data.level === "watch" ? "#eab308" : data.level === "risky" ? "#f97316" : "#ef4444";
  const label = data.level === "safe" ? "Xavfsiz" : data.level === "watch" ? "E'tiborli bo'ling" : data.level === "risky" ? "Xavfli" : "Juda xavfli";
  return (
    <Card>
      <Heading icon={<ShieldAlert className="h-4 w-4" />} title="Anti-scam skaner" sub={`Xavf bali ${data.score}/100`} />
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black" style={{ borderColor: `${tone}55`, background: `${tone}1a`, color: tone }}>
        {label}
      </span>
      {data.flags.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {data.flags.map(flag => (
            <li key={flag.key} className="flex items-start gap-2 text-[11px] text-white/55">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
              {flag.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-white/45">Shubhali belgilar topilmadi. Baribir to'lovni faqat kafolat (escrow) orqali qiling.</p>
      )}
    </Card>
  );
}

function useCountdown(target?: string | Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "00:00";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}s ${minutes % 60}d`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 15 daqiqalik bron tugmasi — snayperlardan himoya. */
export function HoldButton({ accountId }: { accountId: number }) {
  const utils = trpc.useUtils();
  const status = trpc.pro.holdStatus.useQuery({ accountId }, { refetchInterval: 15_000 });
  const hold = trpc.pro.hold.useMutation({ onSuccess: () => utils.pro.holdStatus.invalidate({ accountId }) });
  const release = trpc.pro.releaseHold.useMutation({ onSuccess: () => utils.pro.holdStatus.invalidate({ accountId }) });
  const countdown = useCountdown(status.data?.expiresAt ?? null);

  if (status.data?.held && !status.data.mine) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-[11px] font-bold text-rose-200">
        <Timer className="h-4 w-4" />Boshqa xaridor bron qilgan • {countdown}
      </div>
    );
  }
  if (status.data?.mine) {
    return (
      <button
        onClick={() => { telegramHaptic("light"); release.mutate({ accountId }); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-bold text-emerald-200 active:scale-95"
      >
        <AlarmClock className="h-4 w-4" />Siz bron qildingiz • {countdown} • bekor qilish
      </button>
    );
  }
  return (
    <button
      onClick={() => { telegramHaptic("light"); hold.mutate({ accountId }); }}
      disabled={hold.isPending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-bold text-white/80 transition active:scale-95"
    >
      <Timer className="h-4 w-4 text-amber-200" />{hold.isPending ? "Bron qilinmoqda..." : "15 daqiqaga bron qilish"}
    </button>
  );
}

/** Escrow Deal Room — bosqichlar va taymer. */
export function DealRoomPanel({ orderId }: { orderId: number }) {
  const query = trpc.pro.dealRoom.useQuery({ orderId }, { refetchInterval: 30_000 });
  const data = query.data;
  const countdown = useCountdown(data?.deadline ?? null);
  if (!data) return null;
  return (
    <Card className={data.yourTurn ? "ring-1 ring-amber-300/30" : ""}>
      <Heading icon={<Handshake className="h-4 w-4" />} title={`Deal Room #${data.orderId}`} sub={`${uz(data.price)} so'm kafolatda`} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-black text-white">{data.label}</span>
        {!data.finished && (
          <span className={`rounded-lg px-2 py-1 text-[11px] font-black ${data.overdue ? "bg-rose-400/15 text-rose-200" : data.urgent ? "bg-amber-300/15 text-amber-200" : "bg-white/[0.06] text-white/60"}`}>
            {data.overdue ? "Muddat tugadi" : countdown}
          </span>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(data.progress * 100)}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-white/50">{data.hint}</p>
      {data.yourTurn && !data.finished && (
        <p className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[11px] font-bold text-amber-100">Navbat sizda — harakat qiling.</p>
      )}
    </Card>
  );
}

/** Eng ishonchli sotuvchilar reytingi. */
export function TopSellersBoard({ limit = 10 }: { limit?: number }) {
  const query = trpc.pro.leaderboard.useQuery({ limit }, { staleTime: 120_000 });
  const rows = query.data ?? [];
  if (rows.length === 0) return null;
  return (
    <Card>
      <Heading icon={<Trophy className="h-4 w-4" />} title="Top sotuvchilar" sub="Ishonch bali bo'yicha" />
      <ul className="mt-3 space-y-2">
        {rows.map((row: any, index: number) => (
          <li key={row.userId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <span className="w-5 text-center font-display text-sm font-black text-white/40">{index + 1}</span>
            {index === 0 ? <Crown className="h-4 w-4 text-amber-300" /> : <span className="text-sm">{row.emoji ?? "🎯"}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-white">{row.name}</p>
              <p className="text-[10px] text-white/40">{row.totalSales} savdo • ⭐ {Number(row.rating).toFixed(1)}</p>
            </div>
            <span className="font-display text-sm font-black text-amber-200">{row.score}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Referal cashback kartasi. */
export function CashbackCard() {
  const query = trpc.pro.cashback.useQuery(undefined, { staleTime: 60_000 });
  const data = query.data;
  if (!data) return null;
  return (
    <Card>
      <Heading icon={<Trophy className="h-4 w-4" />} title="Referal cashback" sub="Har savdodan 2% qaytadi" />
      {data.entries.length === 0 ? (
        <p className="mt-3 text-[11px] text-white/45">Do'stlaringizni taklif qiling — ular savdo qilganda hamyoningizga 2% cashback tushadi.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {data.entries.slice(0, 5).map(entry => (
            <li key={entry.id} className="text-[11px] text-white/55">{entry.message}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** E'lon sahifasidagi to'liq pro-blok. */
export default function ProDetailPanel({ accountId, sellerId }: { accountId: number; sellerId: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <FairPriceMeter accountId={accountId} />
      <RiskScanCard accountId={accountId} />
      <TrustRankBadge userId={sellerId} />
    </div>
  );
}
