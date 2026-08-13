import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Bot, HelpCircle, CheckCircle, TrendingUp, MessageCircle, Megaphone, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export function AiPriceEstimatorModal() {
  const { isAuthenticated } = useAuth();
  const [level, setLevel] = useState(60);
  const [kd, setKd] = useState(3.5);
  const [skins, setSkins] = useState(15);
  const [hasGlacier, setHasGlacier] = useState(true);
  const [hasXSuit, setHasXSuit] = useState(false);

  const estimateQuery = trpc.pro.estimatePrice.useQuery({
    level,
    kd,
    skinsCount: skins,
    hasM416Glacier: hasGlacier,
    hasXSuit,
  });
  const history = trpc.pro.priceHistory.useQuery(undefined, { enabled: isAuthenticated });
  const saveEstimate = trpc.pro.savePriceEstimate.useMutation({
    onSuccess: () => { toast.success("Baholash tarixga saqlandi"); history.refetch(); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="bg-card/90 border-border/60 text-card-foreground shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary font-bold">
          <Bot className="w-5 h-5 text-red-500" />
          AI Akkaunt Narxini Baholash (Inferno AI)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-semibold">Daraja (Level): {level}</label>
            <Input type="range" min="30" max="100" value={level} onChange={(e) => setLevel(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold">K/D Koeffitsiyenti: {kd}</label>
            <Input type="range" min="1" max="8" step="0.1" value={kd} onChange={(e) => setKd(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold">Afsonaviy Skinlar: {skins}</label>
            <Input type="range" min="1" max="100" value={skins} onChange={(e) => setSkins(Number(e.target.value))} className="mt-1" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <label className="flex items-center gap-3 text-sm cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 flex-1">
            <input type="checkbox" checked={hasGlacier} onChange={(e) => setHasGlacier(e.target.checked)} className="h-4 w-4 rounded accent-red-500" />
            <span className="font-medium text-white">M416 Muz (Glacier)</span>
          </label>
          <label className="flex items-center gap-3 text-sm cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 flex-1">
            <input type="checkbox" checked={hasXSuit} onChange={(e) => setHasXSuit(e.target.checked)} className="h-4 w-4 rounded accent-red-500" />
            <span className="font-medium text-white">X-Suit</span>
          </label>
        </div>
        {estimateQuery.data && (
          <div className="p-4 bg-muted/40 rounded-xl border border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tavsiya etilgan bozor narxi:</p>
              <p className="text-2xl font-black text-primary">{estimateQuery.data.recommended.toLocaleString()} so'm</p>
              <p className="text-xs text-muted-foreground mt-1">
                Oraliq: {estimateQuery.data.minPrice.toLocaleString()} - {estimateQuery.data.maxPrice.toLocaleString()} so'm
              </p>
            </div>
            <Button size="sm" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold" disabled={!isAuthenticated || saveEstimate.isPending} onClick={() => saveEstimate.mutate({ level, kd, skinsCount: skins, hasM416Glacier: hasGlacier, hasXSuit })}>Tarixga saqlash</Button>
          </div>
        )}
        {isAuthenticated && (history.data ?? []).length > 0 && <div className="border-t border-white/10 pt-3"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Oxirgi baholashlar</p><div className="mt-2 flex flex-wrap gap-2">{(history.data ?? []).slice(0, 3).map((item) => <Badge key={item.id} variant="secondary">{Number(item.recommended).toLocaleString()} so‘m</Badge>)}</div></div>}
      </CardContent>
    </Card>
  );
}

export function SupportTicketsSection() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Escrow");
  const [message, setMessage] = useState("");

  const ticketsQuery = trpc.pro.tickets.list.useQuery(undefined, { enabled: isAuthenticated });
  const createMutation = trpc.pro.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Murojaatingiz qabul qilindi. Admin navbat asosida javob beradi.");
      setSubject("");
      setMessage("");
      utils.pro.tickets.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="bg-card/90 border-border/60 text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <HelpCircle className="w-5 h-5 text-red-500" />
          Yordam Markazi & Ticketlar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated && <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">Ticket ochish uchun Telegram profilingizga kiring.</p>}
        <div className="space-y-3">
          <Input disabled={!isAuthenticated} placeholder="Mavzu (masalan: Pul yechish haqida)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            disabled={!isAuthenticated}
            className="w-full p-3 rounded-md bg-background border border-input text-foreground text-sm resize-none h-24"
            placeholder="Muammo yoki savolingizni batafsil yozing. Login va parolni yubormang."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            disabled={!isAuthenticated || createMutation.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            onClick={() => {
              if (!subject || !message) {
                toast.error("Barcha maydonlarni to‘ldiring");
                return;
              }
              createMutation.mutate({ subject, category, message });
            }}
          >
            Ticket yuborish
          </Button>
        </div>
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-semibold text-muted-foreground">Murojaatlaringiz va admin javoblari:</h4>
          {ticketsQuery.data?.map((t) => (
            <div key={t.id} className="p-3 bg-muted/30 rounded-lg border border-border/40 flex justify-between items-center text-sm">
              <div>
                <p className="font-bold text-foreground">{t.subject}</p>
                <p className="text-xs text-muted-foreground">{t.message}</p>
                {t.adminReply && <p className="text-xs text-emerald-400 mt-1">Inferno admini javobi: {t.adminReply}</p>}
              </div>
              <Badge variant={t.status === 'resolved' ? 'default' : 'secondary'}>{t.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


export function SellerVerificationSection() {
  const { isAuthenticated } = useAuth();
  const statusQuery = trpc.pro.verification.status.useQuery(undefined, { enabled: isAuthenticated });
  const [fullName, setFullName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState("");
  const submit = trpc.pro.verification.submit.useMutation({
    onSuccess: () => {
      toast.success("Verifikatsiya arizasi yuborildi.");
      statusQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const status = statusQuery.data?.status;
  return (
    <Card className="border-emerald-500/20 bg-emerald-500/[0.04] text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-300"><CheckCircle className="h-5 w-5" /> Sotuvchi verifikatsiyasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">Tasdiqlangan sotuvchi belgisi faqat admin ko‘rib chiqqan profilga beriladi. Hujjatlar S3’da saqlanadi; login yoki parol bu yerda hech qachon so‘ralmaydi.</p>
        {status ? (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"><span className="text-sm text-muted-foreground">Ariza holati</span><Badge variant={status === 'approved' ? 'default' : 'secondary'}>{status === 'pending' ? 'Ko‘rib chiqilmoqda' : status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}</Badge></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <Input disabled={!isAuthenticated} placeholder="To‘liq ism" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <Input disabled={!isAuthenticated} placeholder="Telegram username" value={telegramUsername} onChange={(event) => setTelegramUsername(event.target.value)} />
            <Input disabled={!isAuthenticated} placeholder="Tasdiqlash hujjati S3 URL" value={idCardPhotoUrl} onChange={(event) => setIdCardPhotoUrl(event.target.value)} />
            <Button disabled={!isAuthenticated || submit.isPending} className="md:col-span-3" onClick={() => submit.mutate({ fullName, telegramUsername, idCardPhotoUrl })}>Verifikatsiyaga yuborish</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function LiveHelpThread() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const tickets = trpc.pro.tickets.list.useQuery(undefined, { enabled: isAuthenticated });
  const messages = trpc.pro.messages.list.useQuery({ ticketId: selectedTicketId ?? 0 }, { enabled: isAuthenticated && Boolean(selectedTicketId) });
  const send = trpc.pro.messages.send.useMutation({
    onSuccess: () => {
      setBody("");
      utils.pro.messages.list.invalidate({ ticketId: selectedTicketId ?? 0 });
      utils.pro.tickets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="border-blue-500/20 bg-blue-500/[0.04] text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-300"><MessageCircle className="h-5 w-5" /> Jonli yordam suhbati</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
        {!isAuthenticated ? <p className="text-sm text-muted-foreground md:col-span-2">Jonli yordamdan foydalanish uchun Telegram profilingizga kiring.</p> : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Murojaatlar</p>
              {(tickets.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Avval ticket oching.</p> : (tickets.data ?? []).map((ticket) => <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedTicketId === ticket.id ? 'border-blue-400/60 bg-blue-400/10' : 'border-white/10 bg-black/10 hover:bg-white/5'}`}><span className="block truncate text-sm font-semibold">{ticket.subject}</span><span className="mt-1 block text-xs text-muted-foreground">#{ticket.id} · {ticket.status}</span></button>)}
            </div>
            <div className="min-h-56 rounded-xl border border-white/10 bg-black/20 p-3">
              {!selectedTicketId ? <div className="grid h-full min-h-48 place-items-center text-center text-sm text-muted-foreground">Suhbatni ko‘rish uchun murojaatni tanlang.</div> : <>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">{(messages.data ?? []).map((item) => <div key={item.id} className={`rounded-lg p-3 text-sm ${item.authorRole === 'admin' ? 'bg-emerald-400/10 text-emerald-100' : 'ml-6 bg-white/5 text-foreground'}`}><p>{item.body}</p><span className="mt-1 block text-[10px] opacity-60">{item.authorRole === 'admin' ? 'Admin' : 'Siz'}</span></div>)}</div>
                <div className="mt-3 flex gap-2"><Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Javob yozing..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && body.trim()) { event.preventDefault(); send.mutate({ ticketId: selectedTicketId, body: body.trim() }); } }} /><Button disabled={send.isPending || !body.trim()} onClick={() => send.mutate({ ticketId: selectedTicketId, body: body.trim() })}>Yuborish</Button></div>
              </>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


export function PremiumPromotionSection() {
  const { isAuthenticated } = useAuth();
  const [accountId, setAccountId] = useState("");
  const [durationDays, setDurationDays] = useState<7 | 14 | 30>(7);
  const promotions = trpc.pro.promotions.mine.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.pro.promotions.create.useMutation({
    onSuccess: (result) => { toast.success(`Premium e’lon ${result.cost.toLocaleString()} so‘m uchun faollashtirildi`); setAccountId(""); promotions.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  return <Card className="border-amber-400/20 bg-amber-400/[0.04] text-card-foreground"><CardHeader><CardTitle className="flex items-center gap-2 text-amber-200"><Megaphone className="h-5 w-5" /> Premium e’lon</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">E’loningizni yuqoriroqda ko‘rsatish uchun 7, 14 yoki 30 kunlik premium joylashtirishni tanlang.</p><div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><Input disabled={!isAuthenticated} value={accountId} onChange={(event) => setAccountId(event.target.value.replace(/\D/g, ""))} placeholder="Akkaunt ID" /><select disabled={!isAuthenticated} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value) as 7 | 14 | 30)} className="rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value={7}>7 kun · 350 000 so‘m</option><option value={14}>14 kun · 700 000 so‘m</option><option value={30}>30 kun · 1 500 000 so‘m</option></select><Button disabled={!isAuthenticated || create.isPending || !accountId} onClick={() => create.mutate({ accountId: Number(accountId), durationDays })}>Faollashtirish</Button></div>{(promotions.data ?? []).length > 0 && <div className="space-y-2">{(promotions.data ?? []).slice(0, 3).map((promotion) => <div key={promotion.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3 text-sm"><span>Akkaunt #{promotion.accountId} · {promotion.durationDays} kun</span><Badge>{promotion.status === 'active' ? 'Faol' : 'Tugagan'}</Badge></div>)}</div>}</CardContent></Card>;
}

export function SecurityStatusSection() {
  const { isAuthenticated } = useAuth();
  const [token, setToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [riskResult, setRiskResult] = useState<{ status: string; riskScore: number; factors: string[] } | null>(null);
  const status = trpc.pro.securityStatus.useQuery(undefined, { enabled: isAuthenticated });
  const twoFactor = trpc.pro.twoFactor.status.useQuery(undefined, { enabled: isAuthenticated });
  const begin2fa = trpc.pro.twoFactor.begin.useMutation({ onSuccess: (data) => { setSetupSecret(data.secret); toast.success('2FA kaliti yaratildi'); }, onError: (error) => toast.error(error.message) });
  const confirm2fa = trpc.pro.twoFactor.confirm.useMutation({ onSuccess: () => { setToken(''); setSetupSecret(''); twoFactor.refetch(); status.refetch(); toast.success('2FA muvaffaqiyatli yoqildi'); }, onError: (error) => toast.error(error.message) });
  const disable2fa = trpc.pro.twoFactor.disable.useMutation({ onSuccess: () => { twoFactor.refetch(); status.refetch(); toast.success('2FA o‘chirildi'); }, onError: (error) => toast.error(error.message) });
  const evaluate = trpc.pro.security.evaluate.useMutation({ onSuccess: (data) => { setRiskResult(data); toast.success('Xavfsizlik holati qayta tekshirildi'); }, onError: (error) => toast.error(error.message) });
  const checks = status.data ? [
    ['Telegram sessiyasi', status.data.telegramSession, 'Telegram WebApp sessiyasi orqali kirish faol'],
    ['Parol saqlanmaydi', !status.data.passwordStorage, 'Marketplace parollarni o‘z bazasida saqlamaydi'],
    ['Escrow himoyasi', status.data.escrowProtection, 'To‘lov savdo yakunigacha escrow’da ushlanadi'],
    ['Sotuvchi verifikatsiyasi', status.data.sellerVerification, status.data.sellerVerification ? 'Tasdiqlangan' : 'Tasdiqlash tavsiya qilinadi'],
    ['Ikki bosqichli himoya', Boolean(status.data.twoFactorEnabled), status.data.twoFactorEnabled ? 'TOTP 2FA faol' : '2FA yoqilmagan'],
  ] as const : [];
  return <Card className="border-cyan-400/20 bg-cyan-400/[0.04] text-card-foreground"><CardHeader><CardTitle className="flex items-center gap-2 text-cyan-200"><LockKeyhole className="h-5 w-5" /> Xavfsizlik holati</CardTitle></CardHeader><CardContent className="space-y-3">{!isAuthenticated ? <p className="text-sm text-muted-foreground">Xavfsizlik tekshiruvini ko‘rish uchun Telegram profilingizga kiring.</p> : <>{checks.map(([label, ok, description]) => <div key={label} className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Badge variant={ok ? 'default' : 'secondary'}>{ok ? 'Faol' : 'Tavsiya'}</Badge></div>)}<div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Authenticator 2FA</p><p className="mt-1 text-xs text-muted-foreground">Google Authenticator yoki boshqa TOTP ilovasi bilan himoyalang.</p></div><Badge variant={twoFactor.data?.enabled ? 'default' : 'secondary'}>{twoFactor.data?.enabled ? 'Yoqilgan' : 'O‘chiq'}</Badge></div>{!twoFactor.data?.enabled && !setupSecret && <Button className="mt-3" variant="outline" disabled={begin2fa.isPending} onClick={() => begin2fa.mutate()}>2FA sozlashni boshlash</Button>}{setupSecret && <div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">Authenticator ilovasiga ushbu maxfiy kalitni qo‘shing:</p><code className="block break-all rounded-lg bg-black/40 p-3 text-xs text-cyan-100">{setupSecret}</code><div className="flex gap-2"><Input value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 xonali kod" inputMode="numeric" /><Button disabled={token.length !== 6 || confirm2fa.isPending} onClick={() => confirm2fa.mutate({ token })}>Tasdiqlash</Button></div></div>}{twoFactor.data?.enabled && <Button className="mt-3" variant="outline" disabled={disable2fa.isPending} onClick={() => disable2fa.mutate()}>2FA ni o‘chirish</Button>}</div><div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Anti-fraud qayta tekshiruv</p><p className="mt-1 text-xs text-muted-foreground">Yangi qurilma, IP muhiti va sessiya signallari anonim hash orqali baholanadi.</p></div><Button variant="outline" disabled={evaluate.isPending} onClick={() => evaluate.mutate({ eventType: 'manual_security_recheck', details: 'Foydalanuvchi xavfsizlik holatini qo‘lda tekshirdi' })}>{evaluate.isPending ? 'Tekshirilmoqda...' : 'Qayta tekshirish'}</Button></div>{riskResult && <p className="mt-3 text-xs text-amber-100">Natija: <strong>{riskResult.status}</strong> · Risk: {riskResult.riskScore}/100{riskResult.factors.length ? ` · ${riskResult.factors.join(', ')}` : ' · shubhali signal topilmadi'}</p>}</div></>}</CardContent></Card>;
}


export function AccountComparisonSection() {
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const left = trpc.accounts.getById.useQuery(Number(leftId) || 0, { enabled: Boolean(leftId) });
  const right = trpc.accounts.getById.useQuery(Number(rightId) || 0, { enabled: Boolean(rightId) });
  const rows = [
    ['Level', (account: any) => account?.level],
    ['K/D', (account: any) => account?.kdRatio],
    ['G‘alaba foizi', (account: any) => account?.winRate],
    ['UC balansi', (account: any) => account?.ucBalance],
    ['Outfitlar', (account: any) => account?.outfitCount],
    ['Qurol skinlari', (account: any) => account?.gunSkinCount],
    ['Narx', (account: any) => account?.price ? `${Number(account.price).toLocaleString()} so‘m` : '—'],
  ] as const;
  return <Card className="border-fuchsia-400/20 bg-fuchsia-400/[0.04] text-card-foreground"><CardHeader><CardTitle className="flex items-center gap-2 text-fuchsia-200"><TrendingUp className="h-5 w-5" /> Akkauntlarni taqqoslash</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Input value={leftId} onChange={(event) => setLeftId(event.target.value.replace(/\D/g, ""))} placeholder="Birinchi akkaunt ID" /><Input value={rightId} onChange={(event) => setRightId(event.target.value.replace(/\D/g, ""))} placeholder="Ikkinchi akkaunt ID" /></div>{(left.data || right.data) ? <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[420px] text-sm"><thead><tr className="bg-white/5 text-left"><th className="p-3 text-muted-foreground">Ko‘rsatkich</th><th className="p-3">{left.data?.playerName ?? 'Birinchi'}</th><th className="p-3">{right.data?.playerName ?? 'Ikkinchi'}</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-white/10"><td className="p-3 text-muted-foreground">{label}</td><td className="p-3 font-semibold">{value(left.data) ?? '—'}</td><td className="p-3 font-semibold">{value(right.data) ?? '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Ikki e’lon ID sini kiritsangiz, asosiy ko‘rsatkichlar yonma-yon chiqadi.</p>}</CardContent></Card>;
}


export function TelegramBotCommandSection() {
  const [selected, setSelected] = useState('/start');
  const [showWebhook, setShowWebhook] = useState(false);
  const [sent, setSent] = useState(false);
  const commands: Record<string, { title: string; text: string }> = {
    '/start': { title: 'Inferno Stealth bilan xush kelibsiz', text: 'PUBG akkauntlarini ko‘ring, xavfsiz escrow orqali xarid qiling yoki o‘zingizning e’loningizni joylang.' },
    '/buy': { title: 'Akkaunt izlash', text: 'Region, level, K/D, skinlar va narx bo‘yicha mos akkauntni tanlang. E’lonlar admin tekshiruvidan o‘tadi.' },
    '/sell': { title: 'Akkaunt sotish', text: 'PUBG ID, statistika, inventar va media ma’lumotlarini yuboring. E’lon xaridorga chiqishidan oldin tekshiriladi.' },
    '/orders': { title: 'Buyurtmalarim', text: 'Escrow bosqichlari, topshirish tasdig‘i va nizo holatini bitta joyda kuzating.' },
    '/wallet': { title: 'Inferno Wallet', text: 'Balans, ichki escrow to‘lovi va tranzaksiyalar tarixini ko‘ring. Tashqi to‘lovlar faqat sozlangandan keyin faol bo‘ladi.' },
    '/support': { title: 'Yordam markazi', text: 'Buyurtma raqami va dalillar bilan murojaat qiling. Login yoki parolni hech qachon chatga yubormang.' },
    '/pro': { title: 'Inferno Stealth Pro', text: 'AI narx bahosi, sotuvchi analitikasi, ishonch profili va xavfsizlik vositalarini oching.' },
    '/admin': { title: 'Admin nazorati', text: 'Faqat tasdiqlangan adminlar uchun: e’lonlar, escrow, nizolar va support navbatini boshqaring.' },
  };
  const payload = JSON.stringify({ update_id: 10001, message: { chat: { id: 777001, type: 'private' }, text: selected, from: { language_code: 'uz' } }, web_app: { path: selected === '/start' ? '/' : selected.replace('/', '') } }, null, 2);
  return <Card className="overflow-hidden border-red-500/20 bg-red-500/[0.04] text-card-foreground"><CardHeader><CardTitle className="flex items-center gap-2 text-red-300"><Bot className="h-5 w-5" /> Telegram bot menyusi va buyruqlar</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Buyruqlar foydalanuvchini kerakli Mini App bo‘limiga olib boradi. Escrow pulni bitim shartlari bajarilguncha himoya qiladi; platforma login va parolni chat orqali so‘ramaydi.</p><div className="mobile-scroll-row gap-2 pb-1">{Object.keys(commands).map((command) => <Button key={command} size="sm" variant={selected === command ? 'default' : 'outline'} className="min-h-11 shrink-0" onClick={() => { setSelected(command); setSent(false); }}>{command}</Button>)}</div><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="font-semibold text-foreground">{commands[selected].title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{commands[selected].text}</p></div><div className="grid gap-2 sm:flex sm:flex-wrap"><Button className="min-h-11 w-full sm:w-auto" variant="outline" onClick={() => setShowWebhook(!showWebhook)}>{showWebhook ? 'Webhook previewni yopish' : 'Webhook previewni ko‘rish'}</Button>{showWebhook && <Button className="min-h-11 w-full sm:w-auto" onClick={() => { setSent(true); toast.success('Webhook test payloadi qabul qilindi'); }}>Webhook testini yuborish</Button>}</div>{showWebhook && <div className="rounded-xl border border-red-300/20 bg-black/30 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="break-all text-xs font-bold uppercase tracking-wider text-red-200">POST /api/telegram/webhook</p><Badge className="self-start">{sent ? '200 OK' : 'Preview'}</Badge></div><pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-white/60 sm:text-[11px]">{payload}</pre></div>}<p className="text-xs leading-5 text-muted-foreground">Production webhook Railway domeniga ulangan. Bu karta buyruq oqimi va Telegram update payloadini xavfsiz ko‘rsatadi; haqiqiy bot javobi faqat Telegram webhook orqali yuboriladi.</p></CardContent></Card>;
}
