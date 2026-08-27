import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Copy, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Phase = "idle" | "playing" | "done";

type Target = { id: number; x: number; y: number; size: number };

const DURATION_MS = 15_000;

function randomTarget(id: number): Target {
  return {
    id,
    x: 8 + Math.random() * 84,
    y: 12 + Math.random() * 76,
    size: 44 + Math.random() * 22,
  };
}

/**
 * Aim Trainer — yangi foydalanuvchi uchun BIR MARTALIK chegirma mini-o'yini.
 * Ball serverda qayta hisoblanadi, bu yerda faqat tegish vaqtlari yig'iladi.
 */
export default function AimTrainer() {
  const status = trpc.hype.aimStatus.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const utils = trpc.useUtils?.();
  const start = trpc.hype.aimStart.useMutation();
  const submit = trpc.hype.aimSubmit.useMutation();

  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<Target>(() => randomTarget(0));
  const [hitCount, setHitCount] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [result, setResult] = useState<{ score: number; discountPercent: number; promoCode: string | null } | null>(null);

  const hitsRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const tokenRef = useRef("");
  const finishRef = useRef<() => void>(() => undefined);

  const finish = useCallback(async () => {
    if (phase !== "playing") return;
    setPhase("done");
    try {
      const data = await submit.mutateAsync({ token: tokenRef.current, hits: hitsRef.current });
      setResult({ score: data.score, discountPercent: data.discountPercent, promoCode: data.promoCode });
      if (data.promoCode) toast.success(`${data.discountPercent}% chegirma ochildi: ${data.promoCode}`);
      else toast("Chegirma uchun kamida 4 ball kerak edi.");
      utils?.hype.aimStatus.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Natijani yuborib bo'lmadi");
      setPhase("idle");
    }
  }, [phase, submit, utils]);

  finishRef.current = finish;

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = window.setInterval(() => {
      const left = DURATION_MS - (Date.now() - startedAtRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) finishRef.current();
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase]);

  // O'yin davomida nishon o'zi ham sakrab turadi (qimirlab yuruvchi target).
  useEffect(() => {
    if (phase !== "playing") return;
    const move = window.setInterval(() => setTarget(prev => randomTarget(prev.id + 1)), 900);
    return () => window.clearInterval(move);
  }, [phase]);

  const handleStart = async () => {
    try {
      const session = await start.mutateAsync();
      tokenRef.current = session.token;
      hitsRef.current = [];
      startedAtRef.current = Date.now();
      setHitCount(0);
      setResult(null);
      setRemaining(DURATION_MS);
      setTarget(randomTarget(1));
      setPhase("playing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "O'yinni boshlab bo'lmadi");
    }
  };

  const handleHit = () => {
    if (phase !== "playing") return;
    hitsRef.current.push(Date.now() - startedAtRef.current);
    setHitCount(count => count + 1);
    setTarget(prev => randomTarget(prev.id + 1));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
  };

  if (status.isError) return null;

  const played = Boolean(status.data?.played);
  const savedPromo = status.data?.promoCode ?? null;

  return (
    <section className="hype-card relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(120% 80% at 0% 0%, rgba(245,158,11,0.12), transparent 60%)" }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
            <Crosshair className="h-4 w-4 text-amber-300" />
            Aim Trainer
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-white/45">
            15 soniya • har tegish 1 ball • 10+ ball = 5% chegirma
          </p>
        </div>
        {phase === "playing" ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-200">
            <Timer className="h-3.5 w-3.5" />
            {(remaining / 1000).toFixed(1)}s
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/60">
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            {status.data?.bestScore ?? 0}
          </span>
        )}
      </div>

      {phase === "playing" ? (
        <div
          className="relative mt-3 h-[58vw] max-h-72 min-h-52 w-full touch-none select-none overflow-hidden rounded-xl border border-amber-400/20 bg-[#08090b]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        >
          <button
            type="button"
            onPointerDown={handleHit}
            aria-label="Nishonga teging"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/80 bg-amber-400/20 shadow-[0_0_22px_rgba(245,158,11,0.45)] transition-transform duration-100 active:scale-90"
            style={{ left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size }}
          >
            <span className="absolute inset-[30%] rounded-full bg-amber-300" />
          </button>
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-200">
            {hitCount} ball
          </span>
        </div>
      ) : null}

      {phase !== "playing" ? (
        <div className="relative mt-3">
          {!played && !result && (
            <img
              src="/assets/pro/aim.jpg"
              alt="Snayper pritseli"
              loading="lazy"
              width={1024}
              height={512}
              className="mb-3 h-24 w-full rounded-xl border border-white/[0.06] object-cover opacity-80 sm:h-28"
            />
          )}
          {result || (played && savedPromo) ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3">
              <p className="text-xs font-bold text-white">
                {result ? `${result.score} ball` : `Eng yaxshi natija: ${status.data?.bestScore ?? 0} ball`}
                {result?.discountPercent ? ` — ${result.discountPercent}% chegirma` : ""}
              </p>
              {(result?.promoCode || savedPromo) && (
                <button
                  type="button"
                  onClick={() => {
                    const code = result?.promoCode || savedPromo || "";
                    navigator.clipboard?.writeText(code);
                    toast.success("Promo-kod nusxalandi");
                  }}
                  className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-amber-300/40 bg-black/30 px-3 py-2 font-mono text-sm font-black tracking-widest text-amber-200"
                >
                  {result?.promoCode || savedPromo}
                  <Copy className="h-3.5 w-3.5 opacity-70" />
                </button>
              )}
              <p className="mt-1.5 text-[10px] font-medium text-white/40">Promo-kod 24 soat amal qiladi.</p>
            </div>
          ) : played ? (
            <p className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[11px] font-medium text-white/45">
              Siz allaqachon o'ynagansiz — bu o'yin har akkountga faqat bir marta beriladi.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={start.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-black transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {start.isPending ? "Yuklanmoqda..." : "Chegirma uchun o'ynash"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
