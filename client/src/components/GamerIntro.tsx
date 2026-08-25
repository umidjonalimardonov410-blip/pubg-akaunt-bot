import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Copy = {
  boot: string;
  tag: string;
  enter: string;
  stats: { label: string; value: number; suffix?: string }[];
  skip: string;
};

const TITLES: Record<string, Copy> = {
  uz: {
    boot: "INFERNO GOLD MARKET",
    tag: "Xavfsiz PUBG akkaunt bozori",
    enter: "MATCH TOPILMOQDA",
    skip: "O‘tkazib yuborish",
    stats: [
      { label: "Sotilgan akkaunt", value: 2148 },
      { label: "Xavfsiz bitim", value: 99, suffix: "%" },
      { label: "O‘rtacha yetkazish", value: 7, suffix: " daq" },
    ],
  },
  ru: {
    boot: "INFERNO GOLD MARKET",
    tag: "Безопасный рынок PUBG аккаунтов",
    enter: "ПОИСК МАТЧА",
    skip: "Пропустить",
    stats: [
      { label: "Продано аккаунтов", value: 2148 },
      { label: "Безопасных сделок", value: 99, suffix: "%" },
      { label: "Средняя выдача", value: 7, suffix: " мин" },
    ],
  },
  en: {
    boot: "INFERNO GOLD MARKET",
    tag: "Secure PUBG account marketplace",
    enter: "FINDING MATCH",
    skip: "Skip",
    stats: [
      { label: "Accounts sold", value: 2148 },
      { label: "Safe deals", value: 99, suffix: "%" },
      { label: "Avg delivery", value: 7, suffix: " min" },
    ],
  },
};

const SEGMENTS = 14;
const HOLD_MS = 3000;
const LEAVE_MS = 900;
const SOUND_KEY = "inferno-intro-sound";

function haptic(style: "light" | "medium" | "rigid" = "light") {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } }).Telegram;
    tg?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    /* ignore */
  }
}

/** Kirish ovozi — fayl yo‘q, WebAudio orqali qisqa "whoosh + click". */
function playBootSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // whoosh (filtered noise)
    const len = Math.floor(ctx.sampleRate * 0.7);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.18);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // click / lock-in
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now + 0.62);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.82);
    oscGain.gain.setValueAtTime(0.0001, now + 0.62);
    oscGain.gain.exponentialRampToValueAtTime(0.22, now + 0.66);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now + 0.62);
    osc.stop(now + 0.95);

    window.setTimeout(() => void ctx.close().catch(() => undefined), 1400);
  } catch {
    /* ignore */
  }
}

/** Gamer uslubidagi kirish (boot) animatsiyasi — sessiyada bir marta ko‘rsatiladi. */
export default function GamerIntro() {
  const { lang } = useI18n();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    return window.sessionStorage.getItem("inferno-intro") !== "done";
  });
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  });
  const finishRef = useRef<(() => void) | null>(null);

  const copy = TITLES[lang] ?? TITLES.uz;

  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        delay: Math.round(Math.random() * 2600),
        dur: 2200 + Math.round(Math.random() * 2400),
        size: 2 + Math.round(Math.random() * 3),
        drift: Math.round(Math.random() * 60 - 30),
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const pct = Math.min(100, ((now - start) / HOLD_MS) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    if (soundOn) playBootSound();
    haptic("medium");
    const midHaptic = window.setTimeout(() => haptic("light"), HOLD_MS * 0.6);

    let doneTimer = 0;
    const finish = () => {
      if (leaving) return;
      haptic("rigid");
      setLeaving(true);
      doneTimer = window.setTimeout(() => {
        window.sessionStorage.setItem("inferno-intro", "done");
        setVisible(false);
      }, LEAVE_MS);
    };
    finishRef.current = finish;
    const leaveTimer = window.setTimeout(finish, HOLD_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(midHaptic);
      window.clearTimeout(doneTimer);
      window.clearTimeout(midHaptic);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const pct = Math.min(100, progress);
  const filled = Math.round((pct / 100) * SEGMENTS);

  const toggleSound = (event: React.MouseEvent) => {
    event.stopPropagation();
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) playBootSound();
  };

  return (
    <div
      className={`intro-root ${leaving ? "intro-leaving" : ""}`}
      role="presentation"
      onClick={() => finishRef.current?.()}
    >
      <div className="intro-grid" />
      <div className="intro-horizon" />
      <div className="intro-scan" />
      <div className="intro-vignette" />

      {/* PUBG atmosferasi: parashyutchi siluet */}
      <div className="intro-drop" aria-hidden="true">
        <svg viewBox="0 0 64 96" className="intro-drop-svg">
          <path d="M4 26c0-13 12-22 28-22s28 9 28 22c0 3-2 4-4 2-6-6-14-9-24-9s-18 3-24 9c-2 2-4 1-4-2Z" />
          <path d="M8 28 30 52M32 28 32 52M56 28 34 52" className="intro-drop-line" />
          <path d="M32 52c4 0 7 3 7 7v10c0 5-3 9-7 9s-7-4-7-9V59c0-4 3-7 7-7Z" />
        </svg>
      </div>

      {/* ko‘tarilayotgan uchqunlar */}
      <div className="intro-embers" aria-hidden="true">
        {embers.map(e => (
          <span
            key={e.id}
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDelay: `${e.delay}ms`,
              animationDuration: `${e.dur}ms`,
              ["--drift" as string]: `${e.drift}px`,
            }}
          />
        ))}
      </div>

      <div className={`intro-card ${leaving ? "intro-card-flip" : ""}`}>
        <div className="intro-center">
          <div className="intro-hex">
            <span className="intro-hex-ring" />
            <span className="intro-hex-ring intro-hex-ring-2" />
            <span className="intro-hex-core">IG</span>
          </div>
          <h1 className="intro-title" data-text={copy.boot}>{copy.boot}</h1>
          <p className="intro-tag">{copy.tag}</p>

          <div className="intro-hud" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className={i < filled ? "on" : ""} />
            ))}
          </div>
          <p className="intro-status">{copy.enter} — {Math.round(pct)}%</p>

          <div className="intro-stats">
            {copy.stats.map(stat => (
              <div className="intro-stat" key={stat.label}>
                <strong>
                  {Math.round((stat.value * pct) / 100).toLocaleString("ru-RU")}
                  {stat.suffix ?? ""}
                </strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="intro-sound" onClick={toggleSound} aria-label="sound">
        {soundOn ? "🔊" : "🔇"}
      </button>
      <button type="button" className="intro-skip" onClick={() => finishRef.current?.()}>
        {copy.skip} ›
      </button>
    </div>
  );
}
