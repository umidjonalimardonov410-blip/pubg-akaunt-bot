import React, { useState } from 'react';
import { BadgeCheck, Bell, BellOff, Crown, Flame, Handshake, LoaderCircle, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const uzNumber = (value: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(value));

export type TrustTier = { key: string; label: string; hint: string; className: string };

/** Sotuvchi darajasi savdolar soni va reytingdan hisoblanadi. */
export function resolveTrustTier(totalSales: number, rating: number): TrustTier {
  if (totalSales >= 50 && rating >= 4.7) return { key: 'legend', label: 'Legend sotuvchi', hint: '50+ savdo, 4.7+ reyting', className: 'border-amber-300/50 bg-amber-400/15 text-amber-100' };
  if (totalSales >= 20 && rating >= 4.5) return { key: 'elite', label: 'Elite sotuvchi', hint: '20+ savdo, 4.5+ reyting', className: 'border-violet-300/40 bg-violet-400/15 text-violet-100' };
  if (totalSales >= 5) return { key: 'trusted', label: 'Ishonchli sotuvchi', hint: '5+ yakunlangan savdo', className: 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' };
  if (totalSales >= 1) return { key: 'rising', label: 'Yangi sotuvchi', hint: 'Savdo tarixi shakllanmoqda', className: 'border-sky-300/35 bg-sky-400/10 text-sky-100' };
  return { key: 'new', label: 'Tarixsiz', hint: 'Hali yakunlangan savdo yo‘q', className: 'border-white/12 bg-white/[0.04] text-white/55' };
}

export function TrustStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(index => (
        <Star key={index} className={`h-3.5 w-3.5 ${index <= Math.round(rating) ? 'fill-amber-300 text-amber-300' : 'text-white/20'}`} />
      ))}
    </span>
  );
}

export function TrustBadge({ totalSales, rating, verified }: { totalSales: number; rating: number; verified?: boolean }) {
  const tier = resolveTrustTier(totalSales, rating);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${tier.className}`}>
      {verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <Flame className="h-3.5 w-3.5" />}
      {tier.label}
    </span>
  );
}

/** Narx kuzatuvi tugmasi — narx tushganda bildirishnoma keladi. */
export function PriceWatchButton({ accountId, currentPrice }: { accountId: number; currentPrice: number }) {
  const utils = trpc.useUtils();
  const watchlist = trpc.expansion.alerts.watchlist.useQuery(undefined, { staleTime: 15_000, retry: false });
  const watching = (watchlist.data ?? []).some((row: any) => row.accountId === accountId);
  const [target, setTarget] = useState('');
  const watch = trpc.expansion.alerts.watch.useMutation({
    onSuccess: () => { toast.success('Narx kuzatuvi yoqildi'); utils.expansion.alerts.watchlist.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const unwatch = trpc.expansion.alerts.unwatch.useMutation({
    onSuccess: () => { toast.info('Kuzatuv o‘chirildi'); utils.expansion.alerts.watchlist.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const pending = watch.isPending || unwatch.isPending;

  if (watching) {
    return (
      <button type="button" disabled={pending} onClick={() => unwatch.mutate({ accountId })} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 text-xs font-black text-emerald-100">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}Kuzatuvni o‘chirish
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        value={target}
        onChange={event => setTarget(event.target.value)}
        type="number"
        placeholder={`Maqsad narx (${uzNumber(currentPrice)})`}
        className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => watch.mutate({ accountId, targetPrice: target ? Number(target) : undefined })}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 text-xs font-black text-amber-100"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Kuzatish
      </button>
    </div>
  );
}

/** Sotuvchi ishonchi bloki: reyting, nishonlar va statistika. */
export function SellerTrustCard({ sellerId }: { sellerId?: number }) {
  const query = trpc.expansion.trust.profile.useQuery({ userId: sellerId ?? 0 }, { enabled: Boolean(sellerId), staleTime: 30_000 });
  if (!sellerId) return null;
  if (query.isLoading) {
    return <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 text-sm text-white/45"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin text-amber-200" />Sotuvchi ma’lumoti yuklanmoqda...</section>;
  }
  const data: any = query.data;
  if (!data) return null;
  const rating = Number(data.rating ?? 0);
  const totalSales = Number(data.totalSales ?? 0);
  const tier = resolveTrustTier(totalSales, rating);

  return (
    <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-200"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="font-display text-lg font-black text-white">Sotuvchi ishonchi</h2>
            <p className="mt-0.5 text-[11px] text-white/40">{tier.hint}</p>
          </div>
        </div>
        <TrustBadge totalSales={totalSales} rating={rating} verified={Boolean(data.verified)} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <TrustStars rating={rating} />
        <span className="font-display text-lg font-black text-white">{rating.toFixed(1)}</span>
        <span className="text-xs text-white/40">{uzNumber(Number(data.reviewCount ?? 0))} ta sharh</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Yakunlangan savdo', uzNumber(totalSales)],
          ['Faol e’lonlar', uzNumber(Number(data.activeListings ?? 0))],
          ['Javob darajasi', `${Number(data.responseRate ?? 0)}%`],
          ['A’zo bo‘lgan', data.memberSince ? new Date(data.memberSince).toLocaleDateString('uz-UZ', { month: 'short', year: 'numeric' }) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</span>
            <span className="mt-1 block text-sm font-black text-white">{value}</span>
          </div>
        ))}
      </div>

      {Array.isArray(data.trustSignals) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.trustSignals.map((signal: any) => (
            <span key={signal.label} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${signal.value ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white/35'}`}>
              <Handshake className="h-3.5 w-3.5" />{signal.label}
            </span>
          ))}
        </div>
      )}

      {Array.isArray(data.recentReviews) && data.recentReviews.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-4">
          {data.recentReviews.slice(0, 3).map((review: any) => (
            <div key={review.id} className="rounded-xl bg-white/[0.03] p-3">
              <TrustStars rating={Number(review.rating)} />
              {review.comment && <p className="mt-1.5 text-xs leading-5 text-white/55">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Eng ishonchli sotuvchilar reytingi. */
export function SellerLeaderboard({ limit = 5 }: { limit?: number }) {
  const query = trpc.expansion.trust.leaderboard.useQuery({ limit }, { staleTime: 60_000 });
  const rows = query.data ?? [];
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl border border-amber-400/20 bg-[#0e1013] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-200"><Crown className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-lg font-black text-white">Top sotuvchilar</h2>
          <p className="mt-0.5 text-[11px] text-white/40">Yakunlangan savdolar va reyting bo‘yicha</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((seller: any, index: number) => (
          <div key={seller.userId} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-xs font-black text-amber-200">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><span className="truncate text-sm font-black text-white">{seller.name}</span>{seller.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />}</span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45"><TrustStars rating={seller.rating} />{seller.rating.toFixed(1)}</span>
            </span>
            <span className="shrink-0 text-xs font-bold text-white/50">{seller.totalSales} savdo</span>
          </div>
        ))}
      </div>
    </section>
  );
}
