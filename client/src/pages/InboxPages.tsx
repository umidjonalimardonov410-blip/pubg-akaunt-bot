import React from 'react';
import { ArrowLeft, ArrowRight, Bell, CheckCheck, MessageCircle, Shield } from 'lucide-react';
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

export function NotificationsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const query = trpc.notifications.getAll.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15_000, staleTime: 5_000 });
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => { utils.notifications.getAll.invalidate(); utils.notifications.getUnread.invalidate(); },
  });
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
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.isRead ? 'bg-white/[0.05] text-white/45' : 'bg-amber-400/15 text-amber-200'}`}><Bell className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black text-white">{item.title}</span>
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
    </main>
  );
}
