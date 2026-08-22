import React, { useState } from 'react';
import { Check, ChevronDown, Clock, HelpCircle, Image as ImageIcon, LifeBuoy, Package, Send, ShieldCheck, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatBytes } from '@/lib/mediaCompression';

const TICKET_CATEGORIES = ['buyurtma', "to'lov", 'akkaunt', 'media', 'boshqa'] as const;

export const FULFILLMENT_STEPS = [
  { key: 'waiting', label: 'Kutilmoqda', icon: Clock, hint: "To'lov muzlatildi, sotuvchi javobini kutmoqdamiz." },
  { key: 'preparing', label: 'Yaratilmoqda', icon: Package, hint: "Sotuvchi akkaunt ma'lumotlarini tayyorlayapti." },
  { key: 'delivered', label: 'Yuborildi', icon: Truck, hint: 'Login yuborildi — tekshirib tasdiqlang.' },
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STEPS)[number]['key'];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 md:p-5 ${className}`}>{children}</div>;
}

function GoldButton({ children, onClick, disabled = false, ghost = false, type = 'button', className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; ghost?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${className} inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${ghost ? 'border border-white/10 bg-white/[0.03] text-white/70 hover:border-amber-300/40 hover:text-white' : 'bg-amber-400 text-black shadow-[0_0_24px_rgba(245,197,66,.25)] hover:bg-amber-300'}`}>
      {children}
    </button>
  );
}

/** Buyurtma yetkazish bosqichlari (kutilmoqda → yaratilmoqda → yuborildi). */
export function FulfillmentTracker({ status, note, canManage = false, orderId, onChanged }: { status: FulfillmentStatus; note?: string | null; canManage?: boolean; orderId?: number; onChanged?: () => void }) {
  const activeIndex = Math.max(0, FULFILLMENT_STEPS.findIndex(step => step.key === status));
  const utils = trpc.useUtils();
  const setStatus = trpc.tracking.setFulfillment.useMutation({
    onSuccess: () => { toast.success('Buyurtma holati yangilandi'); utils.tracking.myOrders.invalidate(); onChanged?.(); },
    onError: error => toast.error(error.message || 'Holatni yangilab bo‘lmadi'),
  });
  return (
    <div className="mt-4 border-t border-white/[0.08] pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {FULFILLMENT_STEPS.map((step, index) => {
          const done = index <= activeIndex;
          const current = index === activeIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} style={{ animationDelay: `${index * 70}ms` }} className={`step-card rounded-xl border p-3 transition ${current ? 'border-amber-300/50 bg-amber-400/[0.08] shadow-[0_0_22px_rgba(245,197,66,.12)]' : done ? 'border-emerald-400/25 bg-emerald-400/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
              <div className="flex items-center gap-2">
                <span className={`step-dot grid h-8 w-8 shrink-0 place-items-center rounded-full border ${current ? 'step-dot-current border-amber-300 bg-amber-400/20 text-amber-100' : done ? 'step-dot-done border-emerald-400/50 bg-emerald-400/15 text-emerald-200' : 'border-white/10 text-white/30'}`}>
                  {done && !current ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={`text-xs font-black ${done ? 'text-white/85' : 'text-white/35'}`}>{step.label}</span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-white/40">{step.hint}</p>
            </div>
          );
        })}
      </div>
      {note ? <p className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] text-white/55">Sotuvchi izohi: {note}</p> : null}
      {canManage && orderId ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {FULFILLMENT_STEPS.map(step => (
            <GoldButton key={step.key} ghost={step.key !== status} disabled={setStatus.isPending || step.key === status} onClick={() => setStatus.mutate({ orderId, status: step.key })}>
              {step.label}
            </GoldButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Support + FAQ sahifasi: savol yuborish va javoblarni kuzatish. */
export function SupportFaqPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'faq' | 'tickets'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTicket, setActiveTicket] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: '', category: 'buyurtma' as (typeof TICKET_CATEGORIES)[number], message: '' });
  const [reply, setReply] = useState('');
  const utils = trpc.useUtils();

  const faqQuery = trpc.support.faq.useQuery(undefined, { staleTime: 60_000 });
  const ticketsQuery = trpc.support.myTickets.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 20_000 });
  const messagesQuery = trpc.support.ticketMessages.useQuery({ ticketId: activeTicket ?? 0 }, { enabled: Boolean(activeTicket), refetchInterval: 15_000 });

  const createTicket = trpc.support.createTicket.useMutation({
    onSuccess: result => {
      toast.success('Savolingiz yuborildi. Admin tez orada javob beradi.');
      setForm({ subject: '', category: 'buyurtma', message: '' });
      setActiveTicket(result.ticketId);
      utils.support.myTickets.invalidate();
    },
    onError: error => toast.error(error.message || 'Yuborishda xatolik'),
  });
  const sendReply = trpc.support.reply.useMutation({
    onSuccess: () => { setReply(''); utils.support.ticketMessages.invalidate(); utils.support.myTickets.invalidate(); },
    onError: error => toast.error(error.message || 'Xabar yuborilmadi'),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) { toast.info('Savol yuborish uchun Telegram orqali kiring.'); return; }
    if (form.subject.trim().length < 4) { toast.error('Mavzu kamida 4 ta belgidan iborat bo‘lsin.'); return; }
    if (form.message.trim().length < 10) { toast.error('Savolni kamida 10 ta belgi bilan yozing.'); return; }
    createTicket.mutate({ subject: form.subject.trim(), category: form.category, message: form.message.trim() });
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Yordam markazi</span>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Support & FAQ</h1>
        <p className="mt-2 text-sm text-white/45">Tez-tez so‘raladigan savollar va shaxsiy murojaatlaringiz shu yerda.</p>
      </div>

      <div className="flex gap-2 border-b border-white/[0.08]">
        {(['faq', 'tickets'] as const).map(key => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold ${tab === key ? 'border-amber-300 text-amber-200' : 'border-transparent text-white/40'}`}>
            {key === 'faq' ? <HelpCircle className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
            {key === 'faq' ? 'FAQ' : 'Mening murojaatlarim'}
          </button>
        ))}
      </div>

      {tab === 'faq' ? (
        <div className="space-y-3">
          {(faqQuery.data ?? []).map((item: any, index: number) => (
            <Card key={item.id ?? index} className="!p-0">
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <span className="text-sm font-bold text-white/85">{item.question}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-amber-200 transition ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index ? <p className="whitespace-pre-line border-t border-white/[0.06] p-4 text-sm leading-6 text-white/55">{item.answer}</p> : null}
            </Card>
          ))}
          {faqQuery.isLoading ? <Card><p className="text-sm text-white/45">FAQ yuklanmoqda...</p></Card> : null}
        </div>
      ) : (
        <div className="space-y-5">
          <Card>
            <h2 className="font-display text-lg font-black text-white">Yangi savol yuborish</h2>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} placeholder="Mavzu (masalan: buyurtma #12 yetkazilmadi)" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <select value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value as (typeof TICKET_CATEGORIES)[number] }))} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white focus:border-amber-300/50 focus:outline-none">
                {TICKET_CATEGORIES.map(category => <option key={category} value={category} className="bg-[#0e1013]">{category}</option>)}
              </select>
              <textarea value={form.message} onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))} rows={4} placeholder="Muammoni batafsil yozing..." className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <GoldButton type="submit" disabled={createTicket.isPending} className="w-full"><Send className="h-4 w-4" />{createTicket.isPending ? 'Yuborilmoqda...' : 'Savolni yuborish'}</GoldButton>
            </form>
          </Card>

          {!isAuthenticated ? <Card><p className="text-sm text-white/45">Murojaatlaringizni ko‘rish uchun Telegram orqali kiring.</p></Card> : null}

          {(ticketsQuery.data ?? []).map((ticket: any) => (
            <Card key={ticket.id}>
              <button onClick={() => setActiveTicket(activeTicket === ticket.id ? null : ticket.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <div>
                  <p className="text-sm font-black text-white">#{ticket.id} {ticket.subject}</p>
                  <p className="mt-1 text-[11px] text-white/40">{ticket.category} • {new Date(ticket.createdAt).toLocaleString('uz-UZ')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${ticket.status === 'closed' || ticket.status === 'resolved' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>{ticket.status}</span>
              </button>
              {activeTicket === ticket.id ? (
                <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                  {(messagesQuery.data?.messages ?? []).map((message: any) => (
                    <div key={message.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${message.authorRole === 'admin' ? 'ml-auto bg-amber-400/15 text-amber-50' : 'bg-white/[0.04] text-white/70'}`}>
                      <span className="mb-1 block text-[9px] font-black uppercase tracking-wider opacity-60">{message.authorRole === 'admin' ? 'Support' : 'Siz'}</span>
                      {message.body}
                    </div>
                  ))}
                  {ticket.status !== 'closed' ? (
                    <div className="flex gap-2 pt-2">
                      <input value={reply} onChange={event => setReply(event.target.value)} placeholder="Javob yozing..." className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
                      <GoldButton disabled={!reply.trim() || sendReply.isPending} onClick={() => sendReply.mutate({ ticketId: ticket.id, body: reply.trim() })}><Send className="h-3.5 w-3.5" /></GoldButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

/** Admin panel: media moderatsiyasi, kategoriyalar, FAQ va ticketlar. */
export function AdminPanelPage() {
  const [tab, setTab] = useState<'media' | 'categories' | 'faq' | 'tickets'>('media');
  const utils = trpc.useUtils();

  const mediaQueue = trpc.mediaModeration.queue.useQuery({ status: 'pending' }, { refetchInterval: 20_000 });
  const moderate = trpc.mediaModeration.moderate.useMutation({
    onSuccess: () => { toast.success('Media ko‘rib chiqildi'); utils.mediaModeration.queue.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const categoriesQuery = trpc.categories.listAll.useQuery();
  const [categoryDraft, setCategoryDraft] = useState({ slug: '', name: '', emoji: '', description: '' });
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => { toast.success('Kategoriya qo‘shildi'); setCategoryDraft({ slug: '', name: '', emoji: '', description: '' }); utils.categories.listAll.invalidate(); utils.categories.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => { utils.categories.listAll.invalidate(); utils.categories.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const removeCategory = trpc.categories.remove.useMutation({
    onSuccess: () => { toast.success('O‘chirildi'); utils.categories.listAll.invalidate(); utils.categories.list.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const faqQuery = trpc.faqAdmin.listAll.useQuery();
  const [faqDraft, setFaqDraft] = useState({ question: '', answer: '', category: 'umumiy' });
  const createFaq = trpc.faqAdmin.create.useMutation({
    onSuccess: () => { toast.success('FAQ qo‘shildi'); setFaqDraft({ question: '', answer: '', category: 'umumiy' }); utils.faqAdmin.listAll.invalidate(); utils.support.faq.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const removeFaq = trpc.faqAdmin.remove.useMutation({
    onSuccess: () => { utils.faqAdmin.listAll.invalidate(); utils.support.faq.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const ticketsQuery = trpc.support.adminTickets.useQuery({ status: 'open' }, { refetchInterval: 20_000 });
  const [adminReply, setAdminReply] = useState<Record<number, string>>({});
  const replyTicket = trpc.support.reply.useMutation({
    onSuccess: () => { toast.success('Javob yuborildi'); utils.support.adminTickets.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const setTicketStatus = trpc.support.setTicketStatus.useMutation({
    onSuccess: () => { utils.support.adminTickets.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const tabs = [
    { key: 'media' as const, label: 'Media moderatsiya', icon: ImageIcon },
    { key: 'categories' as const, label: 'Kategoriyalar', icon: Package },
    { key: 'faq' as const, label: 'FAQ', icon: HelpCircle },
    { key: 'tickets' as const, label: 'Support', icon: LifeBuoy },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Boshqaruv</span>
        <h1 className="mt-2 font-display text-3xl font-black text-white">Admin panel</h1>
        <p className="mt-2 text-sm text-white/45">Uploadlarni tasdiqlang, kategoriya va FAQ’ni boshqaring, murojaatlarga javob bering.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/[0.08]">
        {tabs.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold ${tab === item.key ? 'border-amber-300 text-amber-200' : 'border-transparent text-white/40'}`}>
            <item.icon className="h-4 w-4" />{item.label}
          </button>
        ))}
      </div>

      {tab === 'media' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(mediaQueue.data ?? []).length === 0 ? <Card><p className="text-sm text-white/45">Moderatsiya navbati bo‘sh.</p></Card> : null}
          {(mediaQueue.data ?? []).map((row: any) => (
            <Card key={row.media.id} className="!p-0 overflow-hidden">
              <div className="aspect-video bg-black/50">
                {row.media.kind === 'video'
                  ? <video src={row.media.url} controls playsInline className="h-full w-full img-live object-cover" />
                  : <img src={row.media.url} alt="upload" loading="lazy" className="h-full w-full img-live object-cover" />}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-[11px] text-white/45">{row.userName || 'Foydalanuvchi'} • {formatBytes(row.media.sizeBytes)} • {row.media.contentType}</p>
                <div className="flex gap-2">
                  <GoldButton disabled={moderate.isPending} onClick={() => moderate.mutate({ id: row.media.id, approved: true })}><Check className="h-3.5 w-3.5" />Tasdiqlash</GoldButton>
                  <GoldButton ghost disabled={moderate.isPending} onClick={() => moderate.mutate({ id: row.media.id, approved: false, note: 'Sifat yoki qoidalarga mos emas' })}><X className="h-3.5 w-3.5" />Rad etish</GoldButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'categories' ? (
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-base font-black text-white">Yangi kategoriya</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={categoryDraft.slug} onChange={event => setCategoryDraft(prev => ({ ...prev, slug: event.target.value }))} placeholder="slug (mythic)" className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <input value={categoryDraft.name} onChange={event => setCategoryDraft(prev => ({ ...prev, name: event.target.value }))} placeholder="Nomi" className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <input value={categoryDraft.emoji} onChange={event => setCategoryDraft(prev => ({ ...prev, emoji: event.target.value }))} placeholder="Emoji" className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <input value={categoryDraft.description} onChange={event => setCategoryDraft(prev => ({ ...prev, description: event.target.value }))} placeholder="Tavsif" className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
            </div>
            <GoldButton className="mt-3" disabled={createCategory.isPending} onClick={() => createCategory.mutate({ slug: categoryDraft.slug.trim().toLowerCase(), name: categoryDraft.name.trim(), emoji: categoryDraft.emoji.trim() || undefined, description: categoryDraft.description.trim() || undefined, sortOrder: 0 })}>Qo‘shish</GoldButton>
          </Card>
          {(categoriesQuery.data ?? []).map((category: any) => (
            <Card key={category.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{category.emoji} {category.name} <span className="text-[11px] font-normal text-white/35">/{category.slug}</span></p>
                <p className="mt-1 text-[11px] text-white/40">{category.description || 'Tavsif yo‘q'}</p>
              </div>
              <div className="flex gap-2">
                <GoldButton ghost onClick={() => updateCategory.mutate({ id: category.id, isActive: !category.isActive })}>{category.isActive ? 'Yashirish' : 'Yoqish'}</GoldButton>
                <GoldButton ghost onClick={() => removeCategory.mutate({ id: category.id })}>O‘chirish</GoldButton>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'faq' ? (
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-base font-black text-white">Yangi FAQ</h2>
            <div className="mt-3 space-y-2">
              <input value={faqDraft.question} onChange={event => setFaqDraft(prev => ({ ...prev, question: event.target.value }))} placeholder="Savol" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <textarea value={faqDraft.answer} onChange={event => setFaqDraft(prev => ({ ...prev, answer: event.target.value }))} rows={3} placeholder="Javob" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
              <GoldButton disabled={createFaq.isPending} onClick={() => createFaq.mutate({ question: faqDraft.question.trim(), answer: faqDraft.answer.trim(), category: faqDraft.category, sortOrder: 0 })}>Qo‘shish</GoldButton>
            </div>
          </Card>
          {(faqQuery.data ?? []).map((item: any) => (
            <Card key={item.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white/85">{item.question}</p>
                <p className="mt-1 whitespace-pre-line text-[11px] text-white/45">{item.answer}</p>
              </div>
              <GoldButton ghost onClick={() => removeFaq.mutate({ id: item.id })}><X className="h-3.5 w-3.5" /></GoldButton>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'tickets' ? (
        <div className="space-y-4">
          {(ticketsQuery.data ?? []).length === 0 ? <Card><p className="text-sm text-white/45">Ochiq murojaat yo‘q.</p></Card> : null}
          {(ticketsQuery.data ?? []).map((row: any) => (
            <Card key={row.ticket.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-white">#{row.ticket.id} {row.ticket.subject}</p>
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-amber-200">{row.ticket.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/55">{row.ticket.message}</p>
              <p className="mt-1 text-[11px] text-white/35">{row.userName || 'Foydalanuvchi'} • {row.ticket.category}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input value={adminReply[row.ticket.id] ?? ''} onChange={event => setAdminReply(prev => ({ ...prev, [row.ticket.id]: event.target.value }))} placeholder="Javob yozing..." className="min-h-10 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white placeholder:text-white/25 focus:border-amber-300/50 focus:outline-none" />
                <GoldButton disabled={!(adminReply[row.ticket.id] ?? '').trim() || replyTicket.isPending} onClick={() => replyTicket.mutate({ ticketId: row.ticket.id, body: (adminReply[row.ticket.id] ?? '').trim() })}><Send className="h-3.5 w-3.5" />Javob</GoldButton>
                <GoldButton ghost onClick={() => setTicketStatus.mutate({ ticketId: row.ticket.id, status: 'resolved' })}><ShieldCheck className="h-3.5 w-3.5" />Yopish</GoldButton>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </main>
  );
}
