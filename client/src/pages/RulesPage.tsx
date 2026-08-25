import { AlertTriangle, BadgeCheck, Banknote, Handshake, KeyRound, Lock, ShieldCheck, ShoppingBag, Store, Wallet } from "lucide-react";

import { useI18n } from "@/lib/i18n";

const HERO = "/assets/rules-hero.jpg";
const SQUAD = "/assets/rules-2.jpg";
const TROPHY = "/assets/rules-3.jpg";

/** Kafolatli savdo bosqichlari — ishonch tizimining asosi. */
function EscrowFlow() {
  const { t } = useI18n();
  const steps = [
    { icon: ShoppingBag, title: t("Buyurtma"), text: t("Xaridor akkauntni tanlaydi va to‘lovni bot kafolat hisobiga o‘tkazadi.") },
    { icon: Lock, title: t("Kafolat"), text: t("Pul sotuvchiga emas, kafolat hisobida bloklanadi.") },
    { icon: KeyRound, title: t("Topshirish"), text: t("Sotuvchi akkaunt ma’lumotlarini yuboradi, xaridor 24 soat ichida tekshiradi.") },
    { icon: Handshake, title: t("Yakun"), text: t("Xaridor tasdiqlagach pul sotuvchiga o‘tadi. Nizo bo‘lsa admin hal qiladi.") },
  ];
  return (
    <section className="px-frame px-scan relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-[#0f1012] p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-amber-200 px-pulse">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-black tracking-tight text-white">{t("Xavfsiz savdo qanday ishlaydi")}</h2>
          <p className="text-[12px] font-bold text-white/45">{t("Kafolat hisobi orqali har ikki tomon himoyalangan.")}</p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.title} className="px-glass relative overflow-hidden rounded-2xl p-4" data-reveal>
            <span className="absolute right-3 top-2 font-display text-3xl font-black text-amber-300/10">{index + 1}</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
              <step.icon className="h-4 w-4" />
            </span>
            <h3 className="mt-3 font-display text-[13px] font-black uppercase tracking-wider text-white">{step.title}</h3>
            <p className="mt-1 text-[12px] leading-5 text-white/60">{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { icon: Wallet, label: t("Kafolatli to‘lov") },
          { icon: BadgeCheck, label: t("Tekshirilgan sotuvchilar") },
          { icon: ShieldCheck, label: t("24/7 nizo yechimi") },
        ].map(item => (
          <span key={item.label} className="px-shine flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-amber-100">
            <item.icon className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}


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
          <img src={image} alt="" loading="lazy" width={1024} height={1024} className="h-full w-full img-live object-cover opacity-70" />
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
    <main className="space-y-4 pb-24 sm:space-y-6 lg:pb-6">
      <section className="px-frame relative isolate overflow-hidden rounded-[28px] border border-amber-400/25 bg-[#0f1012]">
        <img src={HERO} alt="" width={1280} height={720} className="absolute inset-0 -z-10 h-full w-full img-live object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#0b0c0e_18%,rgba(11,12,14,.85)_48%,rgba(11,12,14,.25))]" />
        <div className="relative p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
            <ShieldCheck className="h-3 w-3" />
            INFERNO GOLD MARKET
          </span>
          <h1 className="mt-4 max-w-lg font-display text-2xl sm:text-3xl font-black leading-tight text-white sm:text-5xl">
            {t("rules.title")}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/60">{t("rules.subtitle")}</p>
        </div>
      </section>

      <EscrowFlow />

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
