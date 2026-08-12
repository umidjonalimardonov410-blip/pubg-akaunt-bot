import { Link } from "wouter";
import { ArrowLeft, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountComparisonSection, AiPriceEstimatorModal, LiveHelpThread, PremiumPromotionSection, SecurityStatusSection, SellerVerificationSection, SupportTicketsSection, TelegramBotCommandSection } from "./ProComponents";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ProTools() {
  const { isAuthenticated } = useAuth();
  const dashboard = trpc.pro.sellerDashboard.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="container max-w-6xl py-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Inferno Stealth Pro</p>
            <h1 className="mt-2 text-3xl md:text-5xl font-black tracking-tight">Savdo vositalari</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Akkauntingizni to‘g‘ri baholang, ishonchni oshiring va savdo bo‘yicha yordamni bitta joydan boshqaring.</p>
          </div>
          <Button variant="outline" asChild className="border-border/60">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Bozorga qaytish</Link>
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-500/20 bg-red-500/[0.06]">
            <CardContent className="p-5">
              <Sparkles className="mb-4 h-6 w-6 text-red-400" />
              <h2 className="font-bold">AI baholash</h2>
              <p className="mt-2 text-sm text-muted-foreground">Level, K/D, skin va X-Suit ma’lumotlari bo‘yicha tavsiya etiladigan narx oralig‘ini hisoblang.</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/[0.06]">
            <CardContent className="p-5">
              <ShieldCheck className="mb-4 h-6 w-6 text-emerald-400" />
              <h2 className="font-bold">Ishonch profili</h2>
              <p className="mt-2 text-sm text-muted-foreground">Verifikatsiya, escrow va dispute jarayonlari bilan xaridorlar uchun ishonchli ko‘rining.</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/[0.06]">
            <CardContent className="p-5">
              <BarChart3 className="mb-4 h-6 w-6 text-amber-300" />
              <h2 className="font-bold">Sotuvchi rivoji</h2>
              <p className="mt-2 text-sm text-muted-foreground">Premium e’lon, savdo tezligi va javob sifati orqali profilingizni kuchaytiring.</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">Sotuvchi kabineti</p>
            <h2 className="mt-2 text-2xl font-black">Natijalarni kuzating</h2>
          </div>
          {!isAuthenticated ? (
            <Card className="border-white/10 bg-card/70"><CardContent className="p-6 text-sm text-muted-foreground">Sotuvchi statistikalarini ko‘rish uchun Telegram profilingizga kiring.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['E’lonlar', dashboard.data?.listingCount ?? 0],
                ['Faol e’lon', dashboard.data?.availableCount ?? 0],
                ['Sotuvlar', dashboard.data?.completedSales ?? 0],
                ['Daromad', `${(dashboard.data?.revenue ?? 0).toLocaleString()} so‘m`],
                ['Reyting', dashboard.data?.rating ? `${dashboard.data.rating}/5` : '—'],
              ].map(([label, value]) => <Card key={label} className="border-white/10 bg-card/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-black text-foreground">{value}</p></CardContent></Card>)}
            </div>
          )}
        </section>

        <AiPriceEstimatorModal />
        <AccountComparisonSection />
        <SellerVerificationSection />
        <PremiumPromotionSection />
        <SecurityStatusSection />
        <TelegramBotCommandSection />
        <SupportTicketsSection />
        <LiveHelpThread />
      </div>
    </main>
  );
}
