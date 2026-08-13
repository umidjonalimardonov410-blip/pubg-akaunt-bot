import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Heart, MessageCircle, Send, Shield, Star, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { referralShareUrl, shareTelegramText, telegramHaptic } from '@/lib/telegram';
import { useLanguage } from '@/contexts/LanguageContext';

const CARD_IMAGE = '/manus-storage/soldier-red_6bdf1882.jpg';
const uzNumber = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);

type ListingLike = { id: number; playerName: string; level: number; rank: string; price: number; region: string; image: string; description?: string; tag?: string };

function Button({ children, onClick, ghost = false, disabled = false, className = '' }: { children: React.ReactNode; onClick?: () => void; ghost?: boolean; disabled?: boolean; className?: string }) {
  return <button disabled={disabled} onClick={onClick} className={`${className} inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${ghost ? 'border border-white/10 bg-white/[0.03] text-white/70 hover:border-red-400/40 hover:text-white' : 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,.25)] hover:bg-red-400'}`}>{children}</button>;
}

function normalize(row: any): ListingLike {
  const gallery = Array.isArray(row.galleryUrls) ? row.galleryUrls : [];
  return { id: Number(row.id), playerName: row.playerName || 'PUBG akkaunt', level: Number(row.level || 0), rank: Number(row.level || 0) >= 70 ? 'Conqueror' : 'Ace Master', price: Number(row.price || 0), region: row.region || 'KRJP', image: row.thumbnailUrl || gallery[0] || CARD_IMAGE, description: row.description || 'Sotuvchi tavsifi kiritilmagan.', tag: row.isVerified ? 'TEKSHIRILGAN' : 'E’LON' };
}

export function FavoriteButton({ accountId, compact = false }: { accountId: number; compact?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const idsQuery = trpc.favorites.ids.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  const utils = trpc.useUtils();
  const toggle = trpc.favorites.toggle.useMutation({ onSuccess: result => { telegramHaptic(result.saved ? 'success' : 'light'); utils.favorites.ids.invalidate(); utils.favorites.list.invalidate(); toast.success(result.saved ? 'Akkaunt saqlanganlar ro‘yxatiga qo‘shildi' : 'Akkaunt saqlanganlardan olib tashlandi'); }, onError: error => toast.error(error.message) });
  const saved = Boolean(idsQuery.data?.includes(accountId));
  const handleClick = () => { if (!isAuthenticated) { toast.info(t('loginToSave')); return; } toggle.mutate({ accountId }); };
  return <button onClick={handleClick} disabled={toggle.isPending} className={`${compact ? 'h-10 w-10' : 'h-11 w-11'} grid place-items-center rounded-xl border transition ${saved ? 'border-red-400/50 bg-red-500/20 text-red-300' : 'border-white/10 bg-black/30 text-white/65 hover:border-red-400/40 hover:text-white'}`} aria-label={saved ? t('savedAccounts') : t('wishlist')} aria-pressed={saved}><Heart className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${saved ? 'fill-current' : ''}`} /></button>;
}

function PriceDropToggle({ accountId, enabled }: { accountId: number; enabled: boolean }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const toggle = trpc.favorites.setPriceDropAlerts.useMutation({
    onSuccess: result => {
      utils.favorites.watchlist.invalidate();
      toast.success(result.enabled ? t('priceDropOn') : t('priceDropOff'));
    },
    onError: error => toast.error(error.message),
  });
  return <button type="button" role="switch" aria-checked={enabled} disabled={toggle.isPending} onClick={() => toggle.mutate({ accountId, enabled: !enabled })} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold transition ${enabled ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/45'}`}><span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]' : 'bg-white/25'}`} />{enabled ? t('priceDropOn') : t('priceDropOff')}</button>;
}

export function SavedPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const query = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  const watchlistQuery = trpc.favorites.watchlist.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000 });
  if (!isAuthenticated) return <main className="mx-auto max-w-2xl rounded-3xl border border-red-500/20 bg-[#0e1013] p-8 text-center"><Heart className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-4 font-display text-2xl font-black text-white">{t('savedAccounts')}</h1><p className="mt-2 text-sm leading-6 text-white/45">Qiziqqan akkauntlaringizni saqlash uchun profilga kiring.</p><Button onClick={() => onNavigate('/profile')}>{t('openProfile')} <ArrowRight className="h-4 w-4" /></Button></main>;
  const accounts = (query.data ?? []).map(normalize);
  const watchlist = new Map((watchlistQuery.data ?? []).map(item => [item.accountId, item]));
  return <main className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">{t('wishlist')}</span><h1 className="mt-2 font-display text-3xl font-black text-white">{t('savedAccounts')}</h1><p className="mt-2 text-sm text-white/45">{t('wishlistDescription')}</p></div><Button ghost onClick={() => onNavigate('/accounts')}><ArrowLeft className="h-4 w-4" />{t('backToMarket')}</Button></div>{query.isLoading ? <div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-8 text-center text-sm text-white/45">Saqlanganlar yuklanmoqda...</div> : accounts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1013] p-10 text-center"><Heart className="mx-auto h-8 w-8 text-white/20" /><h2 className="mt-4 font-display text-lg font-black text-white">{t('savedAccountsEmpty')}</h2><p className="mt-2 text-sm text-white/40">{t('saveAccountsHint')}</p><Button className="mt-5" onClick={() => onNavigate('/accounts')}>{t('browseMarket')}</Button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accounts.map(account => <article key={account.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1013]"><img src={account.image} alt={account.playerName} className="h-44 w-full object-cover" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-red-300">{account.tag}</p><h2 className="mt-1 font-display text-lg font-black text-white">{account.playerName}</h2><p className="mt-1 text-xs text-white/40">LVL {account.level} · {account.rank} · {account.region}</p></div><FavoriteButton accountId={account.id} compact /></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-white/45">{account.description}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="font-display text-lg font-black text-red-300">{uzNumber(account.price)} so‘m</span><Button onClick={() => onNavigate(`/account/${account.id}`)}>{t('details')} <ArrowRight className="h-4 w-4" /></Button></div><div className="mt-3"><PriceDropToggle accountId={account.id} enabled={watchlist.get(account.id)?.priceDropAlerts ?? true} /></div></div></article>)}</div>}</main>;
}

export function ChatPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const input = useMemo(() => ({ threadId: id }), [id]);
  const query = trpc.chat.messages.useQuery(input, { enabled: isAuthenticated, refetchInterval: 4_000, staleTime: 2_000 });
  const send = trpc.chat.send.useMutation({ onSuccess: () => { setBody(''); query.refetch(); telegramHaptic('success'); }, onError: error => toast.error(error.message) });
  const [body, setBody] = useState('');
  if (!isAuthenticated) return <main className="mx-auto max-w-2xl rounded-3xl border border-red-500/20 bg-[#0e1013] p-8 text-center"><MessageCircle className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-4 font-display text-2xl font-black text-white">Xavfsiz chat</h1><p className="mt-2 text-sm text-white/45">Sotuvchi bilan yozishish uchun tizimga kiring.</p></main>;
  const messages = query.data ?? [];
  return <main className="mx-auto max-w-3xl space-y-5"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 hover:text-white"><ArrowLeft className="h-4 w-4" />Orqaga</button><section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e1013]"><div className="flex items-center gap-3 border-b border-white/[0.08] p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-300"><MessageCircle className="h-5 w-5" /></span><div><h1 className="font-display text-xl font-black text-white">Inferno xavfsiz chat</h1><p className="mt-1 text-xs text-white/40">Login va parolni chatga yozmang. Faqat savdo tafsilotlarini muhokama qiling.</p></div><Shield className="ml-auto h-5 w-5 text-emerald-300" /></div><div className="min-h-80 space-y-3 p-5">{query.isLoading ? <p className="text-sm text-white/40">Xabarlar yuklanmoqda...</p> : messages.length === 0 ? <div className="grid min-h-64 place-items-center text-center"><MessageCircle className="h-8 w-8 text-white/20" /><p className="mt-3 text-sm text-white/40">Birinchi xabarni yuboring.</p></div> : messages.map(message => <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.senderId === user?.id ? 'bg-red-500 text-white' : 'border border-white/10 bg-white/[0.04] text-white/75'}`}><p>{message.body}</p><span className="mt-1 block text-[10px] opacity-55">{new Date(message.createdAt).toLocaleString('uz-UZ')}</span></div></div>)}</div><form onSubmit={event => { event.preventDefault(); if (body.trim()) send.mutate({ threadId: id, body: body.trim() }); }} className="flex gap-2 border-t border-white/[0.08] p-4"><input className="field-input flex-1" value={body} onChange={event => setBody(event.target.value)} placeholder="Xabar yozing..." maxLength={2000} /><Button disabled={send.isPending || !body.trim()}>{send.isPending ? '...' : <Send className="h-4 w-4" />}Yuborish</Button></form></section></main>;
}

export function ReferralPage() {
  const { isAuthenticated } = useAuth();
  const query = trpc.profile.referral.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const claim = trpc.profile.claimReferral.useMutation({ onSuccess: result => { toast.success(`${uzNumber(result.reward)} so‘m bonus qo‘shildi`); setClaimCode(''); query.refetch(); }, onError: error => toast.error(error.message) });
  const [claimCode, setClaimCode] = useState('');
  if (!isAuthenticated) return <main className="mx-auto max-w-2xl rounded-3xl border border-red-500/20 bg-[#0e1013] p-8 text-center"><Star className="mx-auto h-10 w-10 text-amber-200" /><h1 className="mt-4 font-display text-2xl font-black text-white">Referral dasturi</h1><p className="mt-2 text-sm text-white/45">Do‘stlaringizni taklif qilish va bonus olish uchun tizimga kiring.</p></main>;
  const referral = query.data;
  const shareUrl = referral ? referralShareUrl(referral.code) : '';
  const share = () => { if (!referral) return; telegramHaptic('light'); shareTelegramText(`Inferno Stealth’da xavfsiz PUBG akkaunt bozoriga qo‘shiling. Mening referral kodim: ${referral.code}`, shareUrl); };
  return <main className="mx-auto max-w-3xl space-y-6"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Bonus tizimi</span><h1 className="mt-2 font-display text-3xl font-black text-white">Do‘stingizni taklif qiling</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Har bir yangi foydalanuvchi sizning kodingiz orqali kirsa, referral dasturi orqali bonus yig‘asiz.</p></div><section className="rounded-3xl border border-amber-300/20 bg-[linear-gradient(135deg,rgba(245,158,11,.12),rgba(14,16,19,.96))] p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/10 text-amber-200"><Star className="h-6 w-6" /></span><div><h2 className="font-display text-xl font-black text-white">Sizning referral kodingiz</h2><p className="mt-1 text-sm text-white/45">Kod orqali ulashish uchun tayyor.</p></div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"><span className="font-display text-lg font-black tracking-widest text-amber-100">{referral?.code || 'Yuklanmoqda...'}</span><button onClick={() => { if (referral) { navigator.clipboard?.writeText(referral.code); toast.success('Kod nusxalandi'); } }} className="text-white/50 hover:text-white" aria-label="Referral kodini nusxalash"><Copy className="h-4 w-4" /></button></div><Button onClick={share}><Send className="h-4 w-4" />Telegram’da ulashish</Button></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="block text-[10px] text-white/35">Takliflar</span><strong className="mt-1 block font-display text-xl text-white">{referral?.total ?? 0}</strong></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="block text-[10px] text-white/35">Faol bonuslar</span><strong className="mt-1 block font-display text-xl text-white">{referral?.credited ?? 0}</strong></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="block text-[10px] text-white/35">Jami bonus</span><strong className="mt-1 block font-display text-xl text-amber-200">{uzNumber(referral?.reward ?? 0)}</strong></div></div></section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><h2 className="font-display text-lg font-black text-white">Referral kodini ishlatish</h2><p className="mt-1 text-sm text-white/40">Agar do‘stingiz kod bergan bo‘lsa, uni bir marta shu yerda kiriting.</p><form onSubmit={event => { event.preventDefault(); if (claimCode.trim()) claim.mutate({ code: claimCode.trim() }); }} className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="field-input flex-1 uppercase" value={claimCode} onChange={event => setClaimCode(event.target.value.toUpperCase())} placeholder="IS..." maxLength={32} /><Button disabled={claim.isPending || !claimCode.trim()}>{claim.isPending ? 'Tekshirilmoqda...' : 'Kodni qo‘llash'}</Button></form></section></main>;
}
