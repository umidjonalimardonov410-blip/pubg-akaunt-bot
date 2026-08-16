import { AlertTriangle, BadgeCheck, Banknote, ShieldCheck, ShoppingBag, Store } from "lucide-react";

import { useI18n } from "@/lib/i18n";

const HERO = "/assets/rules-hero.jpg";
const SQUAD = "/assets/rules-2.jpg";
const TROPHY = "/assets/rules-3.jpg";

function RuleBlock({
  icon: Icon,
  title,
  items,
  image,
  tone = "gold",
}: {
  icon: typeof ShieldCheck;
  title: string;
  items: string[];
  image?: string;
  tone?: "gold" | "danger";
}) {
  const accent = tone === "danger" ? "border-rose-500/25 bg-rose-500/[0.05]" : "border-amber-400/20 bg-amber-400/[0.04]";
  const iconTone = tone === "danger" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-amber-300/30 bg-amber-400/10 text-amber-200";
  return (
    <section className={`overflow-hidden rounded-3xl border ${accent}`}>
      {image && (
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <img src={image} alt="" loading="lazy" width={1024} height={1024} className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-[#0b0c0e]/45 to-transparent" />
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${iconTone}`}>
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="font-display text-lg font-black tracking-tight text-white">{title}</h2>
        </div>
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-black ${tone === "danger" ? "bg-rose-500/15 text-rose-200" : "bg-amber-400/15 text-amber-200"}`}>
                {index + 1}
              </span>
              <span className="text-[13px] leading-6 text-white/70">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function RulesPage() {
  const { t } = useI18n();

  return (
    <main className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-amber-400/25 bg-[#0f1012]">
        <img src={HERO} alt="" width={1280} height={720} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#0b0c0e_18%,rgba(11,12,14,.85)_48%,rgba(11,12,14,.25))]" />
        <div className="relative p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
            <ShieldCheck className="h-3 w-3" />
            INFERNO GOLD MARKET
          </span>
          <h1 className="mt-4 max-w-lg font-display text-3xl font-black leading-tight text-white sm:text-5xl">
            {t("rules.title")}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/60">{t("rules.subtitle")}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <RuleBlock icon={ShieldCheck} title={t("rules.section.general")} items={[t("rules.g1"), t("rules.g2"), t("rules.g3"), t("rules.g4")]} image={SQUAD} />
        <RuleBlock icon={ShoppingBag} title={t("rules.section.buyer")} items={[t("rules.b1"), t("rules.b2"), t("rules.b3")]} image={TROPHY} />
        <RuleBlock icon={Store} title={t("rules.section.seller")} items={[t("rules.s1"), t("rules.s2"), t("rules.s3")]} />
        <RuleBlock icon={Banknote} title={t("rules.section.payment")} items={[t("rules.p1"), t("rules.p2"), t("rules.p3")]} />
        <div className="lg:col-span-2">
          <RuleBlock icon={AlertTriangle} tone="danger" title={t("rules.section.banned")} items={[t("rules.x1"), t("rules.x2"), t("rules.x3")]} />
        </div>
      </div>

      <section className="flex items-start gap-4 rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.02))] p-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-200">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-base font-black text-white">{t("rules.footerTitle")}</h3>
          <p className="mt-1.5 text-sm leading-6 text-white/60">{t("rules.footerText")}</p>
        </div>
      </section>
    </main>
  );
}

export default RulesPage;
