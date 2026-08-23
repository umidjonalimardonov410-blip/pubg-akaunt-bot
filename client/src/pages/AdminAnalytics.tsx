import React, { useState } from 'react';
import { Activity, BarChart3, Crown, LoaderCircle, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { trpc } from '@/lib/trpc';

const uzNumber = (value: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(value));
const PIE_COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#f87171', '#a78bfa', '#facc15'];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Kutilmoqda',
  paid: 'To‘landi',
  escrow: 'Escrow',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
  refunded: 'Qaytarildi',
  disputed: 'Nizoli',
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 md:p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-black text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] text-white/35">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/10 text-amber-200">{icon}</span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-1 font-display text-xl font-black text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}

const tooltipStyle = { background: '#14161a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, fontSize: 12, color: '#fff' } as const;

/** Admin analitika dashboardi: daromad, buyurtma va sotuvchi grafikalari. */
export function AdminAnalyticsPanel() {
  const [days, setDays] = useState(14);
  const query = trpc.admin.getAnalytics.useQuery({ days }, { staleTime: 30_000, refetchOnWindowFocus: false });

  if (query.isLoading) {
    return <div className="flex items-center gap-3 card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6 text-sm font-bold text-white"><LoaderCircle className="h-5 w-5 animate-spin text-amber-200" />Analitika yuklanmoqda...</div>;
  }
  if (query.error || !query.data) {
    return <div className="rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-6 text-sm text-red-200">Analitikani yuklab bo‘lmadi: {query.error?.message ?? 'noma’lum xatolik'}</div>;
  }

  const data = query.data;
  const series = data.series.map(point => ({ ...point, label: point.date.slice(5) }));
  const statusData = data.orderStatus.map(row => ({ name: ORDER_STATUS_LABELS[row.status] ?? row.status, value: row.count }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Analitika</span>
          <h2 className="mt-1 font-display text-xl sm:text-2xl font-black text-white">Bozor ko‘rsatkichlari</h2>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(option => (
            <button key={option} type="button" onClick={() => setDays(option)} className={`min-h-10 rounded-xl border px-3 text-xs font-black transition ${days === option ? 'border-amber-300/50 bg-amber-400/10 text-amber-100' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'}`}>{option} kun</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<TrendingUp className="h-4 w-4" />} label="Umumiy daromad" value={`${uzNumber(data.totals.revenue)} so‘m`} hint={`${data.totals.completedOrders} ta yakunlangan savdo`} />
        <Metric icon={<BarChart3 className="h-4 w-4" />} label="Buyurtmalar" value={uzNumber(data.totals.orders)} hint={`Konversiya ${data.totals.conversionRate}%`} />
        <Metric icon={<Activity className="h-4 w-4" />} label="O‘rtacha chek" value={`${uzNumber(data.totals.averageOrderValue)} so‘m`} />
        <Metric icon={<Users className="h-4 w-4" />} label="Yangi foydalanuvchi" value={uzNumber(series.reduce((sum, point) => sum + point.newUsers, 0))} hint={`So‘nggi ${days} kun`} />
      </div>

      <Panel title="Daromad dinamikasi" subtitle="Yakunlangan buyurtmalar bo‘yicha kunlik tushum">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={value => uzNumber(Number(value))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${uzNumber(Number(value))} so‘m`, 'Daromad']} />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Buyurtma va e’lonlar" subtitle="Kunlik faollik">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }} />
                <Line type="monotone" dataKey="orders" name="Buyurtma" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="listings" name="E’lon" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newUsers" name="Yangi user" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Buyurtma holatlari" subtitle="Umumiy taqsimot">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Eng faol sotuvchilar" subtitle="Yakunlangan savdolar daromadi bo‘yicha">
        {data.topSellers.length === 0 ? (
          <p className="text-sm text-white/40">Hali yakunlangan savdo yo‘q.</p>
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topSellers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={value => uzNumber(Number(value))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${uzNumber(Number(value))} so‘m`, 'Daromad']} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.topSellers.map((seller, index) => (
                <div key={seller.sellerId} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-xs font-black text-amber-200">{index === 0 ? <Crown className="h-4 w-4" /> : index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-white">{seller.name}</span>
                  <span className="shrink-0 text-xs text-white/45">{seller.sales} savdo</span>
                  <span className="shrink-0 font-display text-sm font-black text-amber-200">{uzNumber(seller.revenue)} so‘m</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
