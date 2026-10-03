import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Copy, Timer, Trophy, Flame, Target as TargetIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Phase = "idle" | "countdown" | "playing" | "done";

type Target = { id: number; x: number; y: number; size: number; life: number };
type Pop = { id: number; x: number; y: number; text: string; kind: "hit" | "miss" };

const DURATION_MS = 15_000;

function randomTarget(id: number, progress = 0): Target {
  // O'yin davomida nishon kichrayadi va tezroq yo'qoladi.
  const size = Math.round(62 - progress * 20 + Math.random() * 10);
  return {
    id,
    x: 10 + Math.random() * 80,
    y: 14 + Math.random() * 72,
    size,
    life: Math.round(1250 - progress * 450),
  };
}

function formatLeft(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Aim Trainer — kuniga BIR marta o'ynaladigan chegirma mini-o'yini (Toshkent vaqti bilan).
 * Ball serverda qayta hisoblanadi, bu yerda faqat tegish vaqtlari yig'iladi.
 */
export default function AimTrainer() {
  const status = trpc.hype.aimStatus.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const utils = trpc.useUtils?.();
  const start = trpc.hype.aimStart.useMutation();
  const submit = trpc.hype.aimSubmit.useMutation();

  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [target, setTarget] = useState<Target>(() => randomTarget(0));
  const [hitCount, setHitCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [shake, setShake] = useState(false);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<{
    score: number;
    discountPercent: number;
    promoCode: string | null;
    accuracy: number;
    bestCombo: number;
  } | null>(null);

  const hitsRef = useRef<number[]>([]);
  const missRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const startedAtRef = useRef(0);
  const tokenRef = useRef("");
  const popIdRef = useRef(0);
  const finishRef = useRef<() => void>(() => undefined);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  const addPop = (x: number, y: number, text: string, kind: Pop["kind"]) => {
    const id = ++popIdRef.current;
    setPops(list => [...list.slice(-6), { id, x, y, text, kind }]);
    window.setTimeout(() => setPops(list => list.filter(p => p.id !== id)), 650);
  };

  const registerMiss = (x: number, y: number) => {
    missRef.current += 1;
    comboRef.current = 0;
    setCombo(0);
    setShake(true);
    window.setTimeout(() => setShake(false), 160);
    addPop(x, y, "MISS", "miss");
  };

  const finish = useCallback(async () => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "done";
    setPhase("done");
    const hits = hitsRef.current.length;
    const accuracy = hits + missRef.current > 0 ? Math.round((hits / (hits + missRef.current)) * 100) : 0;
    try {
      const data = await submit.mutateAsync({ token: tokenRef.current, hits: hitsRef.current });
      setResult({
        score: data.score,
        discountPercent: data.discountPercent,
        promoCode: data.promoCode,
        accuracy,
        bestCombo: bestComboRef.current,
      });
      if (data.promoCode) toast.success(`${data.discountPercent}% chegirma ochildi: ${data.promoCode}`);
      else toast("Chegirma uchun kamida 4 ball kerak edi.");
      utils?.hype.aimStatus.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Natijani yuborib bo'lmadi");
      setPhase("idle");
      utils?.hype.aimStatus.invalidate();
    }
  }, [submit, utils]);

  finishRef.current = finish;

  // 3-2-1 sanash
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      startedAtRef.current = Date.now();
      setRemaining(DURATION_MS);
      setTarget(randomTarget(1));
      setPhase("playing");
      return;
    }
    const t = window.setTimeout(() => setCount(c => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  // Taymer
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = window.setInterval(() => {
      const left = DURATION_MS - (Date.now() - startedAtRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) finishRef.current();
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase]);

  // Nishon vaqti tugasa — miss, yangi nishon.
  useEffect(() => {
    if (phase !== "playing") return;
    const expire = window.setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      registerMiss(target.x, target.y);
      const progress = Math.min(1, (Date.now() - startedAtRef.current) / DURATION_MS);
      setTarget(prev => randomTarget(prev.id + 1, progress));
    }, target.life);
    return () => window.clearTimeout(expire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, target.id]);

  // Keyingi o'yingacha qolgan vaqt sanog'i
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const handleStart = async () => {
    try {
      const session = await start.mutateAsync();
      tokenRef.current = session.token;
      hitsRef.current = [];
      missRef.current = 0;
      comboRef.current = 0;
      bestComboRef.current = 0;
      setHitCount(0);
      setCombo(0);
      setPops([]);
      setResult(null);
      setCount(3);
      setPhase("countdown");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "O'yinni boshlab bo'lmadi");
      utils?.hype.aimStatus.invalidate();
    }
  };

  const handleHit = (event: React.PointerEvent) => {
    event.stopPropagation();
    if (phaseRef.current !== "playing") return;
    hitsRef.current.push(Date.now() - startedAtRef.current);
    comboRef.current += 1;
    bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
    setCombo(comboRef.current);
    setHitCount(c => c + 1);
    addPop(target.x, target.y, comboRef.current >= 3 ? `+1  x${comboRef.current}` : "+1", "hit");
    const progress = Math.min(1, (Date.now() - startedAtRef.current) / DURATION_MS);
    setTarget(prev => randomTarget(prev.id + 1, progress));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
  };

  const handleArenaMiss = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    const rect = event.currentTarget.getBoundingClientRect();
    registerMiss(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  };

  if (status.isError) return null;

  const played = Boolean(status.data?.played);
  const savedPromo = status.data?.promoCode ?? null;
  const nextAt = status.data?.nextPlayAt ? new Date(status.data.nextPlayAt).getTime() : 0;
  const untilNext = nextAt - now;
  const inGame = phase === "playing" || phase === "countdown";
  const urgency = phase === "playing" && remaining < 4000;

  return (
    <section className="hype-card relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4">
      <style>{`
        @keyframes aim-ring { from { transform: scale(2.1); opacity: .9 } to { transform: scale(1); opacity: .15 } }
        @keyframes aim-pop { from { transform: translate(-50%, -50%) scale(.8); opacity: 1 } to { transform: translate(-50%, -190%) scale(1.15); opacity: 0 } }
        @keyframes aim-in { from { transform: translate(-50%, -50%) scale(.3); opacity: 0 } to { transform: translate(-50%, -50%) scale(1); opacity: 1 } }
        @keyframes aim-count { from { transform: scale(1.7); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
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
            15 soniya • har tegish 1 ball • kuniga 1 marta • 10+ ball = 5%
          </p>
        </div>
        {phase === "playing" ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
              urgency ? "bg-red-500/20 text-red-300" : "bg-amber-400/15 text-amber-200"
            }`}
          >
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

      {inGame ? (
        <div className="relative mt-3">
          {phase === "playing" && (
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${urgency ? "bg-red-400" : "bg-amber-400"}`}
                style={{ width: `${(remaining / DURATION_MS) * 100}%`, transition: "width 100ms linear" }}
              />
            </div>
          )}
          <div
            onPointerDown={handleArenaMiss}
            className="relative h-[72vw] max-h-80 min-h-60 w-full touch-none select-none overflow-hidden rounded-xl border border-amber-400/20 bg-[#08090b]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              boxShadow: shake ? "inset 0 0 40px rgba(239,68,68,0.45)" : "inset 0 0 30px rgba(0,0,0,0.6)",
              transition: "box-shadow 120ms",
            }}
          >
            {phase === "countdown" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  key={count}
                  className="font-mono text-7xl font-black text-amber-300"
                  style={{ animation: "aim-count 300ms ease-out" }}
                >
                  {count > 0 ? count : "GO!"}
                </span>
                <span className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Tayyor bo'ling</span>
              </div>
            ) : (
              <>
                <div
                  key={target.id}
                  className="absolute"
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    width: target.size,
                    height: target.size,
                    transform: "translate(-50%, -50%)",
                    animation: "aim-in 120ms ease-out",
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400"
                    style={{ animation: `aim-ring ${target.life}ms linear forwards` }}
                  />
                  <button
                    type="button"
                    onPointerDown={handleHit}
                    aria-label="Nishonga teging"
                    className="absolute inset-0 rounded-full border-2 border-amber-300/90 bg-amber-400/20 shadow-[0_0_22px_rgba(245,158,11,0.5)] active:scale-90"
                  >
                    <span className="absolute inset-[22%] rounded-full border border-amber-200/70" />
                    <span className="absolute inset-[40%] rounded-full bg-amber-300" />
                  </button>
                </div>
                {pops.map(p => (
                  <span
                    key={p.id}
                    className={`pointer-events-none absolute font-mono text-sm font-black ${
                      p.kind === "hit" ? "text-amber-200" : "text-red-400"
                    }`}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, animation: "aim-pop 650ms ease-out forwards" }}
                  >
                    {p.text}
                  </span>
                ))}
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-200">
                  {hitCount} ball
                </span>
                {combo >= 2 && (
                  <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-orange-500/25 px-2 py-0.5 font-mono text-[11px] font-black text-orange-300">
                    <Flame className="h-3 w-3" />x{combo}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      {!inGame ? (
        <div className="relative mt-3">
          {!played && !result && (
            <img
              src="/assets/pro/aim.jpg"
              alt="Snayper pritseli"
              loading="lazy"
              width={1024}
              height={512}
              className="mb-3 hidden h-24 w-full rounded-xl border border-white/[0.06] object-cover opacity-80 sm:block sm:h-28"
            />
          )}
          {result || (played && savedPromo) ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3">
              <p className="text-xs font-bold text-white">
                {result ? `${result.score} ball` : `Eng yaxshi natija: ${status.data?.bestScore ?? 0} ball`}
                {result?.discountPercent ? ` — ${result.discountPercent}% chegirma` : ""}
              </p>
              {result && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1.5 text-white/70">
                    <TargetIcon className="h-3.5 w-3.5 text-amber-300" />
                    Aniqlik: {result.accuracy}%
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1.5 text-white/70">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    Eng uzun combo: x{result.bestCombo}
                  </span>
                </div>
              )}
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
              {nextAt > 0 || result ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white/60">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  Keyingi o'yin: {nextAt > 0 ? formatLeft(untilNext) : "ertaga"}
                </p>
              ) : null}
            </div>
          ) : played ? (
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
              <p className="text-[11px] font-medium text-white/55">
                Bugun o'ynab bo'lgansiz. Ertaga yangi imkoniyat bo'ladi!
              </p>
              {nextAt > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white/70">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  Keyingi o'yin: {formatLeft(untilNext)}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={start.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-black transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {start.isPending ? "Yuklanmoqda..." : "Bugungi o'yinni boshlash"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
