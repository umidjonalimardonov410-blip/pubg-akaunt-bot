import React from 'react';
import { ArrowLeft, ArrowRight, Bell, BellRing, CheckCheck, Gavel, MessageCircle, Shield, Timer, TrendingDown } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { telegramHaptic } from '@/lib/telegram';

const dateLabel = (value: unknown) => {
  const date = value ? new Date(value as string) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function LoginWall({ icon, title, text, onNavigate }: { icon: React.ReactNode; title: string; text: string; onNavigate: (path: string) => void }) {
  return (
    <main className="pubg-rise mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-[#0e1013] p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-200">{icon}</span>
      <h1 className="mt-4 font-display text-2xl font-black text-white">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-white/45">{text}</p>
      <button onClick={() => onNavigate('/profile')} className="pubg-press mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-black text-black">
        Profilga kirish <ArrowRight className="h-4 w-4" />
      </button>
    </main>
  );
}

export function ChatInboxPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated, user } = useAuth();
  const query = trpc.chat.threads.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 10_000, staleTime: 5_000 });
  if (!isAuthenticated) {
    return <LoginWall icon={<MessageCircle className="h-6 w-6" />} title="Xavfsiz chat" text="Sotuvchi va xaridorlar bilan yozishish uchun Telegram orqali kiring." onNavigate={onNavigate} />;
  }
  const threads = query.data ?? [];
  return (
    <main className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => onNavigate('/')} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Orqaga</button>
      <section className="pubg-rise overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0e1013]">
        <div className="flex items-center gap-3 border-b border-white/[0.08] p-5">
          <span className="pubg-glow grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-200"><MessageCircle className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-xl font-black text-white">Chatlar</h1>
            <p className="mt-1 text-xs text-white/40">Bitim bo‘yicha barcha suhbatlar shu yerda.</p>
          </div>
          <Shield className="ml-auto h-5 w-5 text-emerald-300" />
        </div>
        {query.isLoading ? (
          <div className="p-6 text-sm text-white/40">Chatlar yuklanmoqda...</div>
        ) : threads.length === 0 ? (
          <div className="grid min-h-56 place-items-center p-6 text-center">
            <MessageCircle className="h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/40">Hozircha chat yo‘q. Akkaunt sahifasidan “Sotuvchiga yozish”ni bosing.</p>
            <button onClick={() => onNavigate('/accounts')} className="pubg-press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-black text-black">Bozorga kirish <ArrowRight className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {threads.map((thread: any, index: number) => {
              const isSeller = thread.sellerId === user?.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => { telegramHaptic('light'); onNavigate(`/chat/${thread.id}`); }}
                  className="pubg-rise flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-amber-400/[0.06]"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200"><MessageCircle className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-white">Chat #{thread.id}</span>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">{isSeller ? 'Xaridor bilan' : 'Sotuvchi bilan'}</span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-white/40">
                      {thread.accountId ? `Akkaunt #${thread.accountId}` : 'Umumiy suhbat'} · {thread.status === 'closed' ? 'Yopilgan' : 'Faol'} · {dateLabel(thread.updatedAt ?? thread.createdAt)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}


const uzMoney = (value: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(value))} so‘m`;

const NOTIFICATION_STYLES: Record<string, { icon: React.ReactNode; tone: string; label: string }> = {
  price_drop: { icon: <TrendingDown className="h-4 w-4" />, tone: 'bg-emerald-400/15 text-emerald-300', label: 'Narx tushdi' },
  auction_ending: { icon: <Gavel className="h-4 w-4" />, tone: 'bg-red-400/15 text-red-300', label: 'Auksion' },
  dispute_update: { icon: <Shield className="h-4 w-4" />, tone: 'bg-sky-400/15 text-sky-300', label: 'Nizo' },
};

/** Live countdown label for auctions, recomputed every second on the client. */
export function useCountdown(endsAt: string | Date | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!endsAt) return { label: '—', ended: true, totalMs: 0 };
  const totalMs = new Date(endsAt).getTime() - now;
  if (totalMs <= 0) return { label: 'Yakunlandi', ended: true, totalMs: 0 };
  const seconds = Math.floor(totalMs / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const label = days > 0 ? `${days}k ${hours}s` : hours > 0 ? `${hours}s ${minutes}d` : `${minutes}d ${rest}s`;
  return { label, ended: false, totalMs };
}

function AuctionCountdownRow({ auction, onNavigate }: { auction: any; onNavigate: (path: string) => void }) {
  const countdown = useCountdown(auction.endsAt);
  return (
    <button type="button" onClick={() => onNavigate(`/account/${auction.accountId}`)} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3 text-left transition hover:border-amber-300/40">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${countdown.totalMs < 3600_000 ? 'bg-red-400/15 text-red-300' : 'bg-amber-400/15 text-amber-200'}`}><Timer className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-white">{auction.playerName}</span>
        <span className="mt-0.5 block text-[11px] text-white/45">Joriy taklif: {uzMoney(auction.currentBid)}</span>
      </span>
      <span className={`shrink-0 font-display text-sm font-black ${countdown.ended ? 'text-white/35' : countdown.totalMs < 3600_000 ? 'text-red-300' : 'text-amber-200'}`}>{countdown.label}</span>
    </button>
  );
}

export function NotificationsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const query = trpc.notifications.getAll.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15_000, staleTime: 5_000 });
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => { utils.notifications.getAll.invalidate(); utils.notifications.getUnread.invalidate(); },
  });
  const watchlistQuery = trpc.expansion.alerts.watchlist.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  const auctionsQuery = trpc.expansion.auctions.active.useQuery(undefined, { staleTime: 15_000, refetchInterval: 30_000 });
  const alertsQuery = trpc.expansion.alerts.summary.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  const updatePrefs = trpc.expansion.alerts.updatePreferences.useMutation({ onSuccess: () => { alertsQuery.refetch(); } });
  const unwatch = trpc.expansion.alerts.unwatch.useMutation({ onSuccess: () => { watchlistQuery.refetch(); } });
  if (!isAuthenticated) {
    return <LoginWall icon={<Bell className="h-6 w-6" />} title="Bildirishnomalar" text="Bitim, to‘lov va chat yangiliklarini ko‘rish uchun tizimga kiring." onNavigate={onNavigate} />;
  }
  const items = query.data ?? [];
  const unread = items.filter((item: any) => !item.isRead);
  return (
    <main className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => onNavigate('/')} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Orqaga</button>
      <section className="pubg-rise overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0e1013]">
        <div className="flex items-center gap-3 border-b border-white/[0.08] p-5">
          <span className="pubg-glow grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-200"><Bell className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-xl font-black text-white">Bildirishnomalar</h1>
            <p className="mt-1 text-xs text-white/40">{unread.length > 0 ? `${unread.length} ta o‘qilmagan xabar` : 'Barchasi o‘qilgan'}</p>
          </div>
          {unread.length > 0 && (
            <button
              onClick={() => { telegramHaptic('success'); unread.forEach((item: any) => markAsRead.mutate(item.id)); }}
              className="pubg-press ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 text-[11px] font-black text-amber-100"
            >
              <CheckCheck className="h-4 w-4" />O‘qildi
            </button>
          )}
        </div>
        {query.isLoading ? (
          <div className="p-6 text-sm text-white/40">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="grid min-h-56 place-items-center p-6 text-center">
            <Bell className="h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/40">Hozircha bildirishnoma yo‘q.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {items.map((item: any, index: number) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.isRead) markAsRead.mutate(item.id);
                  if (item.orderId) onNavigate(`/order/${item.orderId}`);
                  else if (item.accountId) onNavigate(`/account/${item.accountId}`);
                }}
                className={`pubg-rise flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-amber-400/[0.06] ${item.isRead ? '' : 'bg-amber-400/[0.04]'}`}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${NOTIFICATION_STYLES[item.type]?.tone ?? (item.isRead ? 'bg-white/[0.05] text-white/45' : 'bg-amber-400/15 text-amber-200')}`}>{NOTIFICATION_STYLES[item.type]?.icon ?? <Bell className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black text-white">{item.title}</span>
                    {NOTIFICATION_STYLES[item.type] && <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/55">{NOTIFICATION_STYLES[item.type].label}</span>}
                    {!item.isRead && <span className="pubg-live h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-white/45">{item.message}</span>
                  <span className="mt-1 block text-[10px] text-white/25">{dateLabel(item.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-amber-400/20 bg-[#0e1013] p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-200"><BellRing className="h-5 w-5" /></span>
          <div>
            <h2 className="font-display text-lg font-black text-white">Bildirishnoma sozlamalari</h2>
            <p className="mt-1 text-xs text-white/40">Telegram push va narx tushishi haqidagi ogohlantirishlar.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {([['telegramAlerts', 'Telegram push'], ['priceDropAlerts', 'Narx tushishi ogohlantirishi']] as const).map(([key, label]) => {
            const prefs = alertsQuery.data?.prefs ?? { telegramAlerts: true, priceDropAlerts: true };
            const enabled = Boolean((prefs as any)[key]);
            return (
              <button
                key={key}
                type="button"
                disabled={updatePrefs.isPending}
                onClick={() => { telegramHaptic('success'); updatePrefs.mutate({ ...prefs, [key]: !enabled } as any); }}
                className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-xs font-black transition ${enabled ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/50'}`}
              >
                {label}
                <span className={`ml-3 h-5 w-9 rounded-full p-0.5 transition ${enabled ? 'bg-emerald-400/70' : 'bg-white/15'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-4' : ''}`} /></span>
              </button>
            );
          })}
        </div>
      </section>

      {(watchlistQuery.data?.length ?? 0) > 0 && (
        <section className="rounded-3xl border border-emerald-400/20 bg-[#0e1013] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><TrendingDown className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-lg font-black text-white">Narx kuzatuvi</h2>
              <p className="mt-1 text-xs text-white/40">Belgilangan narxga tushganda darhol xabar olasiz.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {watchlistQuery.data?.map((watch: any) => (
              <div key={watch.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <button type="button" onClick={() => onNavigate(`/account/${watch.accountId}`)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-black text-white">{watch.playerName}</span>
                  <span className="mt-0.5 block text-[11px] text-white/45">Joriy: {uzMoney(watch.currentPrice)}{watch.targetPrice ? ` · Maqsad: ${uzMoney(watch.targetPrice)}` : ''}</span>
                </button>
                {watch.reached && <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-black text-emerald-300">Maqsadga yetdi</span>}
                <button type="button" onClick={() => unwatch.mutate({ accountId: watch.accountId })} className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-black text-white/45 transition hover:text-white">O‘chirish</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(auctionsQuery.data?.length ?? 0) > 0 && (
        <section className="rounded-3xl border border-red-400/20 bg-[#0e1013] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-400/10 text-red-300"><Gavel className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-lg font-black text-white">Auksion sanoq</h2>
              <p className="mt-1 text-xs text-white/40">Tugashiga oz qolgan auksionlarni kuzating.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {auctionsQuery.data?.map((auction: any) => <AuctionCountdownRow key={auction.id} auction={auction} onNavigate={onNavigate} />)}
          </div>
        </section>
      )}
    </main>
  );
}
