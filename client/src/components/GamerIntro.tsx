import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const TITLES: Record<string, { boot: string; tag: string; enter: string }> = {
  uz: { boot: "INFERNO GOLD MARKET", tag: "Xavfsiz PUBG akkaunt bozori", enter: "TIZIMGA KIRILMOQDA" },
  ru: { boot: "INFERNO GOLD MARKET", tag: "Безопасный рынок PUBG аккаунтов", enter: "ЗАГРУЗКА СИСТЕМЫ" },
  en: { boot: "INFERNO GOLD MARKET", tag: "Secure PUBG account marketplace", enter: "BOOTING SYSTEM" },
};

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

  useEffect(() => {
    if (!visible) return;
    const tick = window.setInterval(() => setProgress(value => Math.min(100, value + Math.random() * 18 + 6)), 130);
    const leave = window.setTimeout(() => setLeaving(true), 1750);
    const done = window.setTimeout(() => {
      window.sessionStorage.setItem("inferno-intro", "done");
      setVisible(false);
    }, 2350);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, [visible]);

  if (!visible) return null;
  const copy = TITLES[lang] ?? TITLES.uz;

  return (
    <div className={`intro-root ${leaving ? "intro-leaving" : ""}`} role="presentation" aria-hidden="true">
      <div className="intro-grid" />
      <div className="intro-scan" />
      <div className="intro-center">
        <div className="intro-hex">
          <span className="intro-hex-ring" />
          <span className="intro-hex-core">IG</span>
        </div>
        <h1 className="intro-title" data-text={copy.boot}>{copy.boot}</h1>
        <p className="intro-tag">{copy.tag}</p>
        <div className="intro-bar"><span style={{ width: `${Math.min(100, progress)}%` }} /></div>
        <p className="intro-status">{copy.enter} — {Math.round(Math.min(100, progress))}%</p>
      </div>
    </div>
  );
}
