import { useMemo, useState } from "react";
import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  FileCheck2,
  Filter,
  Flame,
  Grid2X2,
  Headphones,
  Heart,
  ImagePlus,
  LayoutList,
  LockKeyhole,
  Menu,
  MessageCircle,
  Play,
  Plus,
  Search,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  TicketCheck,
  Upload,
  UserRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { accountShareUrl, autoClaimTelegramReferral, getTelegramReferralCode, initTelegramWebApp, shareTelegramText, telegramHaptic } from "@/lib/telegram";
import { ChatPage, FavoriteButton, ReferralPage, SavedPage } from "@/pages/EnhancedPages";

const HERO_IMAGE = "/manus-storage/hero-soldier_222b0d1f.jpeg";
const CARD_IMAGE = "/manus-storage/soldier-red_6bdf1882.jpg";
const PORTRAIT_IMAGE = "/manus-storage/portrait-soldier_33dfbd35.jpg";

const demoListings = [
  {
    id: 1,
    playerName: "Inferno Warrior",
    level: 78,
    rank: "Conqueror",
    price: 1499000,
    region: "KRJP",
    kd: "5.32",
    winRate: "62.7%",
    matches: "1 892",
    skins: ["M416 Glacier", "X-Suit", "Glacier Set"],
    image: CARD_IMAGE,
    tag: "FLASH SAVDO",
    description: "Conqueror darajasi, kuchli inventar va tekshiruv uchun to'liq media to'plami mavjud.",
  },
  {
    id: 2,
    playerName: "Blood Raven",
    level: 72,
    rank: "Ace Master",
    price: 899000,
    region: "EU",
    kd: "4.28",
    winRate: "58.3%",
    matches: "1 245",
    skins: ["X-Suit", "M416 Glacier", "Mythic Set"],
    image: PORTRAIT_IMAGE,
    tag: "EPIC E'LON",
    description: "Ace Master darajasidagi hisob. Sotuvchi tavsifi va media fayllari admin ko'rigidan o'tadi.",
  },
  {
    id: 3,
    playerName: "Crimson Ghost",
    level: 65,
    rank: "Crown I",
    price: 479000,
    region: "ME",
    kd: "3.86",
    winRate: "51.9%",
    matches: "908",
    skins: ["M416 Glacier", "Legendary Qurol", "Vehicle Skin"],
    image: HERO_IMAGE,
    tag: "YANGI",
    description: "Yangi joylangan e'lon. Xarid qilishdan avval barcha maydonlarni tekshiring.",
  },
  {
    id: 4,
    playerName: "Redline Scout",
    level: 59,
    rank: "Diamond V",
    price: 289000,
    region: "SEA",
    kd: "3.12",
    winRate: "47.4%",
    matches: "674",
    skins: ["X-Suit", "Rare Outfit", "Gun Lab"],
    image: CARD_IMAGE,
    tag: "TEJAMKOR",
    description: "Tejamkor segment uchun tayyor e'lon. Batafsil inventar ro'yxati sahifada ko'rsatiladi.",
  },
];

type Listing = (typeof demoListings)[number] & {
  galleryUrls?: string[];
  videoUrl?: string;
  accountId?: string;
};

function normalizeAccount(row: any): Listing {
  const galleryUrls = Array.isArray(row.galleryUrls) ? row.galleryUrls : [];
  const featuredSkins = Array.isArray(row.featuredSkins) ? row.featuredSkins : [];
  return {
    id: Number(row.id),
    playerName: row.playerName ?? "Noma'lum akkaunt",
    level: Number(row.level ?? 0),
    rank: row.rank ?? (Number(row.level ?? 0) >= 70 ? "Conqueror" : "Ace Master"),
    price: Number(row.price ?? 0),
    region: row.region ?? "KRJP",
    kd: String(row.kdRatio ?? "0"),
    winRate: `${row.winRate ?? "0"}%`,
    matches: String(row.totalMatches ?? 0),
    skins: featuredSkins,
    image: row.thumbnailUrl ?? galleryUrls[0] ?? CARD_IMAGE,
    tag: row.isVerified ? "TEKSHIRILGAN" : "YANGI E'LON",
    description: row.description ?? "Sotuvchi batafsil tavsif qoldirmagan.",
    galleryUrls,
    videoUrl: row.videoUrl ?? undefined,
    accountId: row.accountId ?? undefined,
  };
}

type PageKey = "home" | "accounts" | "sell" | "orders" | "profile" | "reviews" | "support" | "admin" | "details" | "escrow" | "saved" | "chat" | "referral";

export const ESCROW_STAGES = [
  { key: 'payment_frozen', label: 'To‘lov muzlatildi', description: 'Pul bitim yakunigacha himoyalangan.' },
  { key: 'account_verification', label: 'Akkaunt tekshiruvi', description: 'Admin ma’lumot va media fayllarni tekshiradi.' },
  { key: 'buyer_confirmation', label: 'Xaridor tasdig‘i', description: 'Xaridor tasdiqlagach mablag‘ sotuvchiga beriladi.' },
] as const;

export const ESCROW_STATUS_LABELS = {
  pending: 'Pending',
  in_escrow: 'In Escrow',
  completed: 'Completed',
} as const;

export function getEscrowStatusLabel(status: string) {
  if (status === 'completed') return ESCROW_STATUS_LABELS.completed;
  if (status === 'in_escrow') return ESCROW_STATUS_LABELS.in_escrow;
  return ESCROW_STATUS_LABELS.pending;
}

const uzNumber = (value: number) => new Intl.NumberFormat("uz-UZ").format(value);

function pageFromPath(pathname: string): { key: PageKey; id?: number } {
  if (pathname.startsWith("/accounts")) return { key: "accounts" };
  if (pathname.startsWith("/sell")) return { key: "sell" };
  if (pathname.startsWith("/orders")) return { key: "orders" };
  if (pathname.startsWith("/saved")) return { key: "saved" };
  if (pathname.startsWith("/referral")) return { key: "referral" };
  if (pathname.startsWith("/chat/")) return { key: "chat", id: Number(pathname.split("/").pop()) || 1 };
  if (pathname.startsWith("/order/")) return { key: "escrow", id: Number(pathname.split("/").pop()) || 1 };
  if (pathname.startsWith("/profile")) return { key: "profile" };
  if (pathname.startsWith("/reviews")) return { key: "reviews" };
  if (pathname.startsWith("/support")) return { key: "support" };
  if (pathname.startsWith("/admin")) return { key: "admin" };
  if (pathname.startsWith("/account/")) return { key: "details", id: Number(pathname.split("/").pop()) || 1 };
  return { key: "home" };
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Inferno Stealth bosh sahifa">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-red-500/60 bg-red-500/10 text-red-500 shadow-[0_0_25px_rgba(239,68,68,.25)]">
        <Flame className="h-5 w-5 fill-red-500/20" />
        <span className="absolute inset-x-1 bottom-1 h-px bg-red-500/70" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-sm font-black tracking-[0.22em] text-white">INFERNO</span>
          <span className="block text-[9px] font-bold tracking-[0.32em] text-red-400">STEALTH MARKET</span>
        </span>
      )}
    </Link>
  );
}

function PrimaryButton({ children, onClick, variant = "solid", type = "button", className = "", disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "solid" | "ghost" | "soft"; type?: "button" | "submit"; className?: string; disabled?: boolean }) {
  const styles = {
    solid: "bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,.32)] hover:bg-red-400",
    ghost: "border border-white/10 bg-white/[0.03] text-white hover:border-red-400/50 hover:bg-red-500/10",
    soft: "border border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function StatusPill({ children, tone = "red" }: { children: React.ReactNode; tone?: "red" | "green" | "gold" | "muted" }) {
  const tones = {
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    gold: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    muted: "border-white/10 bg-white/[0.04] text-white/60",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}>{children}</span>;
}

function AppHeader({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const unreadQuery = trpc.notifications.getUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => unreadQuery.refetch(),
  });
  const unread = unreadQuery.data ?? [];

  const markNotificationRead = (notificationId: number) => {
    markAsRead.mutate(notificationId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#08090b]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-10">
          <Brand />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/55 lg:flex">
            {[['Bozor', '/accounts'], ['Saqlanganlar', '/saved'], ['Sotish', '/sell'], ['Kafolatli savdo', '/orders'], ['Referral', '/referral'], ['Yordam', '/support']].map(([label, path]) => (
              <button key={path} onClick={() => onNavigate(path)} className="transition hover:text-white">{label}</button>
            ))}
          </nav>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setNotificationsOpen(value => !value)}
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:border-red-500/40 hover:text-white"
            aria-label="Bildirishnomalar"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4 w-4" />
            {unread.length > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border border-[#08090b] bg-red-500 px-1 text-[9px] font-black text-white">{unread.length > 9 ? '9+' : unread.length}</span>}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-red-500/25 bg-[#0d0f12] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <div><p className="text-sm font-black text-white">Bildirishnomalar</p><p className="mt-0.5 text-[11px] text-white/40">Muhim savdo yangiliklari</p></div>
                {unread.length > 0 && <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-300">{unread.length} ta yangi</span>}
              </div>
              {!isAuthenticated ? (
                <button onClick={() => { setNotificationsOpen(false); onNavigate('/profile'); }} className="w-full px-4 py-6 text-left text-xs leading-5 text-white/50 transition hover:bg-white/[0.03]">Bildirishnomalarni ko‘rish uchun profilga kiring.</button>
              ) : unread.length === 0 ? (
                <div className="px-4 py-7 text-center"><Bell className="mx-auto h-6 w-6 text-white/20" /><p className="mt-2 text-xs text-white/45">Hozircha yangi bildirishnoma yo‘q.</p></div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {unread.slice(0, 6).map(notification => (
                    <button key={notification.id} onClick={() => markNotificationRead(notification.id)} className="block w-full border-b border-white/[0.06] px-4 py-3 text-left transition hover:bg-red-500/[0.06]">
                      <div className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-300"><Bell className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{notification.title}</span><span className="mt-1 block text-[11px] leading-5 text-white/45">{notification.message}</span></span></div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { setNotificationsOpen(false); onNavigate('/profile'); }} className="w-full border-t border-white/[0.08] px-4 py-3 text-center text-xs font-bold text-red-300 transition hover:bg-red-500/[0.06]">Profilni ochish</button>
            </div>
          )}
          <button onClick={() => onNavigate('/profile')} className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left sm:flex">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-500/15 text-red-300"><UserRound className="h-4 w-4" /></span>
            <span><span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">Kabinet</span><span className="block text-xs font-bold text-white">Mening profilim</span></span>
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 lg:hidden" aria-label="Menyu"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0b0d10] px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {[['Bozor', '/accounts'], ['Saqlanganlar', '/saved'], ['Sotish', '/sell'], ['Kafolatli savdo', '/orders'], ['Referral', '/referral'], ['Profil', '/profile'], ['Yordam', '/support']].map(([label, path]) => (
              <button key={path} onClick={() => { setMenuOpen(false); onNavigate(path); }} className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white">{label}</button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function TrustStrip() {
  const items = [
    [Shield, "Admin nazorati", "E'lonlar tekshiruvdan o'tadi"],
    [LockKeyhole, "Kafolatli savdo", "Pul bitim tugaguncha himoyada"],
    [Headphones, "Tezkor yordam", "Savollar bo'yicha admin bilan aloqa"],
  ] as const;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(([Icon, title, text]) => (
        <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"><Icon className="h-5 w-5" /></span>
          <span><span className="block text-xs font-bold text-white">{title}</span><span className="mt-0.5 block text-[11px] text-white/45">{text}</span></span>
        </div>
      ))}
    </div>
  );
}

function ListingCard({ item, onOpen }: { item: Listing; onOpen: (id: number) => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101215] shadow-[0_14px_50px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:border-red-500/35 hover:shadow-[0_18px_60px_rgba(239,68,68,.13)]">
      <div className="relative aspect-[1.3] overflow-hidden bg-[#16181b]">
        <img src={item.image} alt={item.playerName} className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1012] via-transparent to-black/20" />
        <div className="absolute left-3 top-3"><StatusPill tone="red"><Zap className="h-3 w-3" />{item.tag}</StatusPill></div>
        <FavoriteButton accountId={item.id} compact />
        <div className="absolute bottom-3 left-3 flex items-center gap-2"><span className="rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">LVL {item.level}</span><span className="rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-bold text-red-300">{item.rank}</span></div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-base font-black tracking-wide text-white">{item.playerName}</h3><p className="mt-1 text-[11px] text-white/45">{item.region} • Ko'rgazmali e'lon</p></div><BadgeCheck className="h-5 w-5 shrink-0 text-red-400" /></div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.07] py-3">
          <Stat label="K/D" value={item.kd} /><Stat label="Win rate" value={item.winRate} /><Stat label="O'yin" value={item.matches} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{item.skins.slice(0, 3).map(skin => <span key={skin} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] text-white/60">{skin}</span>)}</div>
        <div className="mt-4 flex items-end justify-between gap-3"><div><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Narxi</span><span className="font-display text-lg font-black text-red-300">{uzNumber(item.price)} <span className="font-sans text-[11px] font-bold text-red-300/70">so'm</span></span></div><PrimaryButton onClick={() => onOpen(item.id)} className="min-h-10 px-3 text-xs">Batafsil <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton></div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</span><span className="mt-1 block text-xs font-bold text-white/80">{value}</span></div>;
}

type AccountFilters = {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minLevel?: number;
  maxLevel?: number;
  region?: string;
  skins?: string[];
};

export function SearchPanel({ onFilters }: { onFilters: (filters: AccountFilters) => void }) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draft, setDraft] = useState({ search: "", minPrice: "", maxPrice: "", minLevel: "", maxLevel: "", region: "", skins: [] as string[] });
  const suggestionInput = useMemo(() => ({ query: draft.search }), [draft.search]);
  const suggestionQuery = trpc.accounts.suggestions.useQuery(suggestionInput, {
    enabled: draft.search.trim().length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: keyof typeof draft, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next as typeof draft);
    onFilters({
      search: next.search || undefined,
      minPrice: next.minPrice ? Number(next.minPrice) : undefined,
      maxPrice: next.maxPrice ? Number(next.maxPrice) : undefined,
      minLevel: next.minLevel ? Number(next.minLevel) : undefined,
      maxLevel: next.maxLevel ? Number(next.maxLevel) : undefined,
      region: next.region || undefined,
      skins: next.skins.length ? next.skins : undefined,
    });
  };
  const toggleSkin = (skin: string) => {
    const skins = draft.skins.includes(skin) ? draft.skins.filter(item => item !== skin) : [...draft.skins, skin];
    const next = { ...draft, skins };
    setDraft(next);
    onFilters({ search: next.search || undefined, minPrice: next.minPrice ? Number(next.minPrice) : undefined, maxPrice: next.maxPrice ? Number(next.maxPrice) : undefined, minLevel: next.minLevel ? Number(next.minLevel) : undefined, maxLevel: next.maxLevel ? Number(next.maxLevel) : undefined, region: next.region || undefined, skins: skins.length ? skins : undefined });
  };
  const applySuggestion = (suggestion: { type: string; value: string }) => {
    if (suggestion.type === 'Skin') {
      if (!draft.skins.includes(suggestion.value)) toggleSkin(suggestion.value);
    } else {
      update('search', suggestion.value);
    }
    setShowSuggestions(false);
  };
  const suggestions = suggestionQuery.data ?? [];
  return <section className="rounded-2xl border border-white/[0.09] bg-[#0e1013] p-3 shadow-[0_18px_50px_rgba(0,0,0,.18)]"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 focus-within:border-red-500/50"><Search className="h-4 w-4 shrink-0 text-white/35" /><input value={draft.search} onFocus={() => setShowSuggestions(true)} onChange={event => { setShowSuggestions(true); update('search', event.target.value); }} placeholder="Akkaunt ID, skin yoki o'yinchi nomini qidiring..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />{showSuggestions && draft.search.trim().length >= 2 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-red-500/20 bg-[#14161a] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.55)]">{suggestionQuery.isFetching ? <div className="px-3 py-3 text-xs text-white/45">Tavsiya qidirilmoqda...</div> : suggestions.length ? suggestions.map(suggestion => <button key={`${suggestion.type}-${suggestion.value}`} type="button" onMouseDown={event => event.preventDefault()} onClick={() => applySuggestion(suggestion)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-red-500/10"><span className="flex items-center gap-2 text-sm font-semibold text-white/80"><Sparkles className="h-3.5 w-3.5 text-red-300" />{suggestion.label}</span><span className="text-[10px] font-bold uppercase tracking-wider text-red-300/70">{suggestion.type}</span></button>) : <div className="px-3 py-3 text-xs text-white/45">Mos tavsiya topilmadi. Filtrlarni sinab ko‘ring.</div>}</div>}</div><button onClick={() => setShowFilters(!showFilters)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${showFilters ? 'border-red-400/50 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-white'}`}><Filter className="h-4 w-4" />Filtrlar<ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} /></button></div>{showFilters && <div className="mt-3 grid gap-3 border-t border-white/[0.08] pt-3 md:grid-cols-2 lg:grid-cols-4"><Field label="Minimal narx"><input type="number" value={draft.minPrice} onChange={event => update('minPrice', event.target.value)} className="field-input" placeholder="100000" /></Field><Field label="Maksimal narx"><input type="number" value={draft.maxPrice} onChange={event => update('maxPrice', event.target.value)} className="field-input" placeholder="5000000" /></Field><Field label="Minimal daraja"><input type="number" value={draft.minLevel} onChange={event => update('minLevel', event.target.value)} className="field-input" placeholder="1" /></Field><Field label="Maksimal daraja"><input type="number" value={draft.maxLevel} onChange={event => update('maxLevel', event.target.value)} className="field-input" placeholder="100" /></Field><Field label="Mintaqa"><select value={draft.region} onChange={event => update('region', event.target.value)} className="field-input"><option value="">Barcha mintaqalar</option><option value="KRJP">KRJP</option><option value="EU">EU</option><option value="ME">ME</option><option value="SEA">SEA</option><option value="NA">NA</option></select></Field><div className="md:col-span-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Maxsus skinlar</span><div className="flex flex-wrap gap-2">{['M416 Glacier', 'X-Suit', 'Gun Lab', 'Mythic outfit'].map(skin => <Chip key={skin} label={skin} active={draft.skins.includes(skin)} onToggle={() => toggleSkin(skin)} />)}</div></div></div>}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</span>{children}</label>;
}

function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? 'border-red-400/60 bg-red-500/15 text-red-200' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'}`}>{active && <Check className="mr-1 inline h-3 w-3" />}{label}</button>;
}

function Hero({ onExplore, onSell }: { onExplore: () => void; onSell: () => void }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-red-500/20 bg-[#111316] shadow-[0_30px_100px_rgba(0,0,0,.3)]">
      <img src={HERO_IMAGE} alt="Inferno Stealth" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_30%,rgba(239,68,68,.26),transparent_38%),linear-gradient(90deg,#111316_15%,rgba(17,19,22,.9)_44%,rgba(17,19,22,.35))]" />
      <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
      <div className="grid min-h-[430px] items-end gap-8 p-7 md:p-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div className="max-w-2xl">
          <StatusPill><Flame className="h-3 w-3" />INFERNO STEALTH MARKET</StatusPill>
          <h1 className="mt-5 max-w-xl font-display text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">PUBG akkauntingiz uchun <span className="text-red-400 [text-shadow:0_0_30px_rgba(239,68,68,.35)]">xavfsiz bozor.</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/55">Akkauntlarni to'liq ma'lumot, rasm va video bilan solishtiring. Kafolatli savdo jarayoni orqali ishonch bilan xarid qiling yoki o'z e'loningizni joylang.</p>
          <div className="mt-7 flex flex-wrap gap-3"><PrimaryButton onClick={onExplore}>Akkauntlarni ko'rish <ArrowRight className="h-4 w-4" /></PrimaryButton><PrimaryButton variant="ghost" onClick={onSell}><Plus className="h-4 w-4" />Akkaunt sotish</PrimaryButton></div>
          <div className="mt-8 flex flex-wrap gap-5 text-xs text-white/45"><span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-red-400" />Admin nazorati</span><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-red-400" />Kafolatli savdo</span><span className="inline-flex items-center gap-2"><ImagePlus className="h-4 w-4 text-red-400" />Rasm + video</span></div>
        </div>
        <div className="hidden lg:block">
          <div className="ml-auto max-w-sm rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Tanlangan e'lon</span><StatusPill tone="green"><Check className="h-3 w-3" />Tekshiruvda</StatusPill></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10"><img src={CARD_IMAGE} alt="Tanlangan akkaunt" className="h-44 w-full object-cover" /></div>
            <div className="mt-4 flex items-end justify-between"><div><span className="block text-xs font-bold text-white">Inferno Warrior</span><span className="mt-1 block text-[11px] text-white/40">LVL 78 • Conqueror</span></div><span className="font-display text-lg font-black text-red-300">1 499 000 <span className="font-sans text-[10px]">so'm</span></span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3"><Stat label="K/D" value="5.32" /><Stat label="Win rate" value="62.7%" /><Stat label="Region" value="KRJP" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoBanner() {
  return <div className="relative overflow-hidden rounded-2xl border border-red-500/25 bg-[linear-gradient(110deg,rgba(239,68,68,.16),rgba(239,68,68,.04)_45%,rgba(255,255,255,.02))] p-5"><div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-red-500/20 blur-3xl" /><div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><Zap className="h-4 w-4" />Inferno Flash</div><h2 className="mt-2 font-display text-xl font-black text-white">Yangi e'lonlar uchun tekshiruv navbati ochiq</h2><p className="mt-1 max-w-xl text-sm text-white/45">Rasm, video va inventar ma'lumotlarini to'liq qo'shing — xaridorlar e'loningizni tezroq tushunadi.</p></div><button className="inline-flex items-center gap-2 self-start rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200 transition hover:bg-red-500/20 md:self-auto">E'lon berish <ArrowRight className="h-4 w-4" /></button></div></div>;
}

function HomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <main className="space-y-8"><Hero onExplore={() => onNavigate('/accounts')} onSell={() => onNavigate('/sell')} /><TrustStrip /><PromoBanner /><section><SectionHeading eyebrow="Bozor" title="Tanlangan akkauntlar" actionLabel="Barchasini ko'rish" onAction={() => onNavigate('/accounts')} /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{demoListings.map(item => <ListingCard key={item.id} item={item} onOpen={id => onNavigate(`/account/${id}`)} />)}</div></section><section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-300"><Shield className="h-6 w-6" /></span><div><h3 className="font-display text-lg font-black text-white">Kafolatli savdo qanday ishlaydi?</h3><p className="mt-2 text-sm leading-6 text-white/45">Bitimning har bir bosqichi tushunarli ko'rsatiladi: to'lov muzlatiladi, akkaunt tekshiriladi va xaridor tasdiqlagandan keyin savdo yakunlanadi.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[['01','To‘lov muzlatildi'],['02','Akkaunt tekshiruvi'],['03','Xaridor tasdig‘i']].map(([num,label],i) => <div key={num} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"><span className="text-xs font-black text-red-400">{num}</span><span className="mt-2 block text-xs font-bold text-white/70">{label}</span><span className="mt-1 block text-[10px] text-white/35">Admin nazoratida</span></div>)}</div><PrimaryButton variant="soft" className="mt-5" onClick={() => onNavigate('/orders')}>Jarayonni ko'rish <ArrowRight className="h-4 w-4" /></PrimaryButton></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300/10 text-amber-200"><CircleHelp className="h-5 w-5" /></span><div><h3 className="font-display text-lg font-black text-white">Yordam kerakmi?</h3><p className="mt-1 text-sm text-white/45">Qoidalar va tez-tez so'raladigan savollar</p></div></div><div className="mt-5 space-y-2">{['Akkaunt qanday tekshiriladi?', 'Xarid paytida login/parol qayerda beriladi?', 'Muammo bo‘lsa kimga murojaat qilaman?'].map(q => <button key={q} onClick={() => onNavigate('/support')} className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] px-3 py-3 text-left text-xs font-semibold text-white/65 transition hover:border-red-500/30 hover:text-white"><span>{q}</span><ChevronRight className="h-4 w-4 text-white/30" /></button>)}</div></div></section></main>;
}

function SectionHeading({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">{eyebrow}</span><h2 className="mt-2 font-display text-2xl font-black text-white">{title}</h2></div>{actionLabel && <button onClick={onAction} className="inline-flex items-center gap-1 text-xs font-bold text-white/45 transition hover:text-red-300">{actionLabel}<ChevronRight className="h-4 w-4" /></button>}</div>;
}

function AccountsPage({ onOpen }: { onOpen: (id: number) => void }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<AccountFilters>({});
  const input = useMemo(() => ({ ...filters, limit: 40, offset: 0 }), [filters]);
  const accountsQuery = trpc.accounts.search.useQuery(input, { staleTime: 20_000, refetchOnWindowFocus: false });
  const remoteListings = (accountsQuery.data ?? []).map(normalizeAccount);
  const fallback = useMemo(() => {
    const query = (filters.search ?? '').toLowerCase();
    return demoListings.filter(item => {
      const matchesText = `${item.playerName} ${item.region} ${item.skins.join(' ')}`.toLowerCase().includes(query);
      const matchesSkins = !filters.skins?.length || filters.skins.every(skin => item.skins.includes(skin));
      return matchesText && (!filters.region || item.region === filters.region) && (!filters.minPrice || item.price >= filters.minPrice) && (!filters.maxPrice || item.price <= filters.maxPrice) && (!filters.minLevel || item.level >= filters.minLevel) && (!filters.maxLevel || item.level <= filters.maxLevel) && matchesSkins;
    });
  }, [filters]);
  const listings = remoteListings.length ? remoteListings : fallback;
  return <main className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Inferno market</span><h1 className="mt-2 font-display text-3xl font-black text-white">Akkauntlar bozori</h1><p className="mt-2 max-w-xl text-sm text-white/45">Daraja, mintaqa, skin va narx bo'yicha kerakli akkauntni toping.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1"><button onClick={() => setView('grid')} className={`grid h-9 w-9 place-items-center rounded-lg ${view === 'grid' ? 'bg-red-500 text-white' : 'text-white/45'}`} aria-label="Katak ko'rinishi"><Grid2X2 className="h-4 w-4" /></button><button onClick={() => setView('list')} className={`grid h-9 w-9 place-items-center rounded-lg ${view === 'list' ? 'bg-red-500 text-white' : 'text-white/45'}`} aria-label="Ro'yxat ko'rinishi"><LayoutList className="h-4 w-4" /></button></div></div><SearchPanel onFilters={setFilters} />{accountsQuery.isLoading ? <div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-8 text-center text-sm text-white/45">Akkauntlar yuklanmoqda...</div> : listings.length === 0 ? <EmptyState title="Akkaunt topilmadi" text="Filtrlarni o'zgartirib ko'ring yoki keyinroq qaytib ko'ring." /> : <div className={view === 'grid' ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>{listings.map(item => view === 'grid' ? <ListingCard key={item.id} item={item} onOpen={onOpen} /> : <ListListing key={item.id} item={item} onOpen={onOpen} />)}</div>}</main>;
}

function ListListing({ item, onOpen }: { item: Listing; onOpen: (id: number) => void }) {
  return <article className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#101215] p-3 sm:flex-row sm:items-center"><img src={item.image} alt={item.playerName} className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-36" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-display font-black text-white">{item.playerName}</h3><p className="mt-1 text-xs text-white/40">LVL {item.level} • {item.rank} • {item.region}</p></div><StatusPill>{item.tag}</StatusPill></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/50"><span>K/D {item.kd}</span><span>Win rate {item.winRate}</span><span>{item.skins.join(' • ')}</span></div></div><div className="flex items-center justify-between gap-4 sm:block sm:text-right"><div className="font-display text-lg font-black text-red-300">{uzNumber(item.price)} <span className="font-sans text-[10px]">so'm</span></div><PrimaryButton onClick={() => onOpen(item.id)} className="mt-2 min-h-9 px-3 text-xs">Ko'rish <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton></div></article>;
}

function DetailPage({ id, onBack, onNavigate }: { id: number; onBack: () => void; onNavigate: (path: string) => void }) {
  const accountQuery = trpc.accounts.getById.useQuery(id, { staleTime: 30_000, refetchOnWindowFocus: false });
  const item: Listing = accountQuery.data ? normalizeAccount(accountQuery.data) : (demoListings.find(listing => listing.id === id) ?? demoListings[0]) as Listing;
  const gallery: string[] = item.galleryUrls?.length ? item.galleryUrls : [item.image, CARD_IMAGE, PORTRAIT_IMAGE, HERO_IMAGE];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? item.image);
  const [showVideo, setShowVideo] = useState(false);
  const [buying, setBuying] = useState(false);
  const createOrder = trpc.orders.create.useMutation({ onSuccess: () => { setBuying(false); toast.success("Buyurtma yaratildi. Kafolatli savdo bosqichi boshlandi."); onNavigate('/orders'); }, onError: () => { setBuying(false); toast.info("Kirishdan so'ng buyurtma berish mumkin."); } });
  const openChat = trpc.chat.open.useMutation({ onSuccess: thread => { telegramHaptic('success'); onNavigate(`/chat/${thread?.id}`); }, onError: error => toast.error(error.message) });
  const handleBuy = () => { if (!buying) { setBuying(true); createOrder.mutate({ accountId: item.id }); } };
  return <main className="space-y-5"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Bozorga qaytish</button><div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-3"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={activeImage} alt={item.playerName} className="aspect-video w-full object-cover" />{showVideo && <div className="absolute inset-0 grid place-items-center bg-black/75 p-4">{item.videoUrl ? <video src={item.videoUrl} controls playsInline className="max-h-full w-full rounded-xl" /> : <div className="rounded-2xl border border-red-500/40 bg-[#121417]/90 p-6 text-center backdrop-blur"><Play className="mx-auto h-8 w-8 text-red-300" /><p className="mt-3 text-sm font-bold text-white">Video hali yuklanmagan</p><p className="mt-1 text-xs text-white/40">Sotuvchi video qo‘shsa, shu oynada ko‘rishingiz mumkin.</p></div>}</div>}<button onClick={() => setShowVideo(!showVideo)} className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-bold text-white backdrop-blur"><Play className="h-3.5 w-3.5 text-red-300" />{item.videoUrl ? 'Videoni ko‘rish' : 'Video holati'}</button></div><div className="mt-3 grid grid-cols-4 gap-2">{gallery.slice(0, 4).map((image, index) => <button key={`${image}-${index}`} onClick={() => { setActiveImage(image); setShowVideo(false); }} className={`overflow-hidden rounded-xl border ${activeImage === image ? 'border-red-400' : 'border-white/10'}`}><img src={image} alt={`${item.playerName} galereyasi ${index + 1}`} className="aspect-square w-full object-cover" /></button>)}</div></section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-start justify-between gap-3"><div><StatusPill tone="green"><BadgeCheck className="h-3 w-3" />Admin ko'rigidan o'tadi</StatusPill><h1 className="mt-4 font-display text-3xl font-black text-white">{item.playerName}</h1><p className="mt-2 text-sm text-white/45">LVL {item.level} • {item.rank} • {item.region}</p></div><FavoriteButton accountId={item.id} /></div><p className="mt-5 text-sm leading-7 text-white/55">{item.description}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['K/D', item.kd], ['Win rate', item.winRate], ['Jami o‘yin', item.matches], ['Region', item.region]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</span><span className="mt-2 block text-lg font-black text-white">{value}</span></div>)}</div><div className="mt-6"><h2 className="font-display text-sm font-black text-white">Inventar va skinlar</h2><div className="mt-3 flex flex-wrap gap-2">{item.skins.map(skin => <span key={skin} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100"><Sparkles className="h-3.5 w-3.5 text-red-300" />{skin}</span>)}</div></div><div className="mt-7 border-t border-white/[0.08] pt-5"><div className="flex items-end justify-between gap-3"><div><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Sotuv narxi</span><span className="font-display text-2xl font-black text-red-300">{uzNumber(item.price)} <span className="font-sans text-xs">so'm</span></span></div><span className="text-right text-[11px] text-white/35">To'lov kafolat tizimida<br />saqlanadi</span></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><PrimaryButton onClick={handleBuy} className="w-full">{buying ? 'Buyurtma berilmoqda...' : 'Kafolatli sotib olish'} <LockKeyhole className="h-4 w-4" /></PrimaryButton><PrimaryButton variant="ghost" onClick={() => { const text = `${item.playerName} — ${uzNumber(item.price)} so‘m. Inferno Stealth’da ko‘ring.`; telegramHaptic('light'); shareTelegramText(text, accountShareUrl(item.id)); }} className="w-full"><Send className="h-4 w-4" />Ulashish</PrimaryButton></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><PrimaryButton variant="soft" disabled={openChat.isPending} onClick={() => openChat.mutate({ accountId: item.id })} className="w-full"><MessageCircle className="h-4 w-4" />{openChat.isPending ? 'Chat ochilmoqda...' : 'Sotuvchiga yozish'}</PrimaryButton><PrimaryButton variant="ghost" onClick={onBack} className="w-full"><ArrowLeft className="h-4 w-4" />Bozorga qaytish</PrimaryButton></div></div></section></div><TrustStrip /></main>;
}

function SellPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ accountId: '', playerName: '', level: '', region: 'KRJP', kdRatio: '', winRate: '', totalMatches: '', headshotPercentage: '', ucBalance: '', outfitCount: '', gunSkinCount: '', vehicleCount: '', price: '', description: '', skins: '' });
  const uploadMutation = trpc.media.upload.useMutation();
  const createMutation = trpc.accounts.create.useMutation();
  const setField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [key]: event.target.value }));
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some(file => file.size > 8 * 1024 * 1024)) {
      toast.error('Har bir fayl 8 MB dan kichik bo‘lishi kerak.');
      return;
    }
    setFiles(selected);
  };
  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    reader.readAsDataURL(file);
  });
  const reset = () => {
    setSubmitted(false);
    setFiles([]);
    setForm({ accountId: '', playerName: '', level: '', region: 'KRJP', kdRatio: '', winRate: '', totalMatches: '', headshotPercentage: '', ucBalance: '', outfitCount: '', gunSkinCount: '', vehicleCount: '', price: '', description: '', skins: '' });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) { toast.info('E’lon berish uchun avval tizimga kiring.'); return; }
    try {
      setUploading(true);
      const uploaded: { url: string; type: string }[] = [];
      for (const file of files) {
        const supported = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
        if (!supported.includes(file.type)) throw new Error('Faqat JPG, PNG, WEBP, MP4 yoki WEBM fayllari qabul qilinadi.');
        const result = await uploadMutation.mutateAsync({ fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm', dataBase64: await fileToBase64(file) });
        uploaded.push({ url: result.url, type: file.type });
      }
      const images = uploaded.filter(file => file.type.startsWith('image/')).map(file => file.url);
      const video = uploaded.find(file => file.type.startsWith('video/'))?.url;
      await createMutation.mutateAsync({ accountId: form.accountId, playerName: form.playerName, level: Number(form.level), region: form.region, kdRatio: Number(form.kdRatio || 0), winRate: Number(form.winRate || 0), totalMatches: Number(form.totalMatches || 0), headshotPercentage: Number(form.headshotPercentage || 0), ucBalance: Number(form.ucBalance || 0), outfitCount: Number(form.outfitCount || 0), gunSkinCount: Number(form.gunSkinCount || 0), vehicleCount: Number(form.vehicleCount || 0), featuredSkins: form.skins.split(',').map(skin => skin.trim()).filter(Boolean), price: Number(form.price), description: form.description, thumbnailUrl: images[0], galleryUrls: images, videoUrl: video });
      setSubmitted(true);
      toast.success('E’loningiz admin tekshiruviga yuborildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'E’lonni yuborishda xatolik yuz berdi.');
    } finally {
      setUploading(false);
    }
  };
  if (submitted) return <main className="mx-auto max-w-2xl"><div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.06] p-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><TicketCheck className="h-8 w-8" /></span><h1 className="mt-5 font-display text-2xl font-black text-white">E'lon tekshiruvga yuborildi</h1><p className="mt-3 text-sm leading-6 text-white/50">Media S3 xotirasiga saqlandi, akkaunt ma'lumotlari esa bazaga yozildi. Admin tekshiruv tugagach e’lon bozorga chiqadi.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><PrimaryButton onClick={reset}>Yana e'lon berish</PrimaryButton><PrimaryButton variant="ghost" onClick={() => onNavigate('/accounts')}>Bozorga o'tish</PrimaryButton></div></div></main>;
  return <main className="space-y-6"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Sotuvchi markazi</span><h1 className="mt-2 font-display text-3xl font-black text-white">Akkaunt sotish</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Akkaunt haqida to‘liq ma’lumot va media qo‘shing. Rasm va videolar xavfsiz S3 xotirasiga yuboriladi.</p></div><div className="grid gap-6 xl:grid-cols-[1fr_.4fr]"><form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5 md:p-7"><div className="grid gap-4 md:grid-cols-2"><Field label="Akkaunt ID"><input required value={form.accountId} onChange={setField('accountId')} className="field-input" placeholder="PUBG ID" /></Field><Field label="O'yinchi nomi"><input required value={form.playerName} onChange={setField('playerName')} className="field-input" placeholder="O'yinchi nomi" /></Field><Field label="Daraja"><input required type="number" min="1" max="100" value={form.level} onChange={setField('level')} className="field-input" placeholder="75" /></Field><Field label="Mintaqa"><select value={form.region} onChange={setField('region')} className="field-input"><option>KRJP</option><option>EU</option><option>ME</option><option>SEA</option><option>NA</option></select></Field><Field label="K/D nisbati"><input type="number" step="0.01" value={form.kdRatio} onChange={setField('kdRatio')} className="field-input" placeholder="4.50" /></Field><Field label="G'alaba foizi"><input type="number" step="0.01" value={form.winRate} onChange={setField('winRate')} className="field-input" placeholder="55" /></Field><Field label="Jami o'yin"><input type="number" value={form.totalMatches} onChange={setField('totalMatches')} className="field-input" placeholder="1200" /></Field><Field label="Headshot foizi"><input type="number" step="0.01" value={form.headshotPercentage} onChange={setField('headshotPercentage')} className="field-input" placeholder="24" /></Field><Field label="UC balansi"><input type="number" value={form.ucBalance} onChange={setField('ucBalance')} className="field-input" placeholder="5200" /></Field><Field label="Kiyimlar soni"><input type="number" value={form.outfitCount} onChange={setField('outfitCount')} className="field-input" placeholder="128" /></Field><Field label="Qurol skinlari"><input type="number" value={form.gunSkinCount} onChange={setField('gunSkinCount')} className="field-input" placeholder="156" /></Field><Field label="Transport soni"><input type="number" value={form.vehicleCount} onChange={setField('vehicleCount')} className="field-input" placeholder="23" /></Field><Field label="Narxi (so'm)"><input required type="number" min="0" value={form.price} onChange={setField('price')} className="field-input" placeholder="1000000" /></Field><Field label="Asosiy skinlar"><input value={form.skins} onChange={setField('skins')} className="field-input" placeholder="M416 Glacier, X-Suit" /></Field></div><div className="mt-4"><Field label="Batafsil tavsif"><textarea value={form.description} onChange={setField('description')} className="field-input min-h-32 resize-y" placeholder="Inventar, bog'langan platformalar, topshirish shartlari va boshqa ma'lumotlar..." /></Field></div><div className="mt-5"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Media fayllar</span><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-red-400/30 bg-red-500/[0.04] px-5 text-center transition hover:bg-red-500/[0.08]"><Upload className="h-6 w-6 text-red-300" /><span className="mt-3 text-sm font-bold text-white">Rasm va videolarni tanlang</span><span className="mt-1 text-xs text-white/40">JPG, PNG, WEBP, MP4 yoki WEBM • har biri 8 MB gacha</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={handleFiles} className="hidden" /></label>{files.length > 0 && <div className="mt-3 space-y-2">{files.map(file => <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-white/70"><FileCheck2 className="h-4 w-4 shrink-0 text-emerald-300" /><span className="truncate">{file.name}</span></span><span className="text-white/30">{Math.round(file.size / 1024)} KB</span></div>)}</div>}</div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><PrimaryButton variant="ghost" onClick={() => onNavigate('/accounts')}>Bekor qilish</PrimaryButton><PrimaryButton type="submit">{uploading ? 'Media yuklanmoqda...' : <><TicketCheck className="h-4 w-4" />Tekshiruvga yuborish</>}</PrimaryButton></div></form><aside className="space-y-4"><div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5"><Shield className="h-6 w-6 text-red-300" /><h2 className="mt-4 font-display text-base font-black text-white">Yaxshi e'lon formulasi</h2><p className="mt-2 text-sm leading-6 text-white/50">Aniq statistika, inventar ro'yxati va sifatli media xaridor savollarini kamaytiradi.</p><div className="mt-4 space-y-2 text-xs text-white/55">{['Barcha maydonlarni to‘ldiring', 'Kamida 3 ta rasm qo‘shing', 'Video bo‘lsa, afzallik beradi', 'Login/parolni e’longa yozmang'].map(item => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-red-300" />{item}</div>)}</div></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><h2 className="font-display text-base font-black text-white">Jarayon</h2><div className="mt-4 space-y-4">{[["01","E'lon yuboriladi"],["02","Admin tekshiradi"],["03","Bozorda ko‘rinadi"]].map(([num,label]) => <div key={num} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-xs font-black text-red-300">{num}</span><span className="text-xs font-semibold text-white/65">{label}</span></div>)}</div></div></aside></div></main>;
}

function OrdersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const { isAuthenticated } = useAuth();
  const ordersQuery = trpc.orders.getUserOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const liveOrders = (ordersQuery.data ?? []).map(order => {
    const status = order.status === 'completed' ? 'Completed' : order.status === 'in_escrow' ? 'In Escrow' : 'Pending';
    const stage = order.escrowStage === 'buyer_confirmation' ? 3 : order.escrowStage === 'account_verification' ? 2 : 1;
    return { id: `#IS-${order.id}`, orderId: order.id, accountId: order.accountId, name: `PUBG akkaunt #${order.accountId}`, price: Number(order.price), status, stage, image: CARD_IMAGE };
  });
  const demoOrders = [{ id: '#IS-2048', orderId: 2048, accountId: 1, name: 'Inferno Warrior', price: 1499000, status: 'In Escrow', stage: 2, image: CARD_IMAGE }, { id: '#IS-1984', orderId: 1984, accountId: 3, name: 'Crimson Ghost', price: 479000, status: 'Completed', stage: 3, image: HERO_IMAGE }];
  const sourceOrders = isAuthenticated ? liveOrders : demoOrders;
  const orders = sourceOrders.filter(order => tab === 'completed' ? order.status === 'Completed' : order.status !== 'Completed');
  return <main className="space-y-6"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Kafolat markazi</span><h1 className="mt-2 font-display text-3xl font-black text-white">Buyurtmalar</h1><p className="mt-2 text-sm text-white/45">Savdolaringiz holati va kafolat bosqichlarini shu yerdan kuzating.</p></div><div className="flex gap-2 border-b border-white/[0.08]"><button onClick={() => setTab('active')} className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === 'active' ? 'border-red-400 text-red-300' : 'border-transparent text-white/40'}`}>Faol buyurtmalar</button><button onClick={() => setTab('completed')} className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === 'completed' ? 'border-red-400 text-red-300' : 'border-transparent text-white/40'}`}>Yakunlangan</button></div>{ordersQuery.isLoading && isAuthenticated ? <div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-8 text-center text-sm text-white/45">Buyurtmalar yuklanmoqda...</div> : orders.length === 0 ? <EmptyState title="Buyurtmalar topilmadi" text="Savdo boshlaganingizdan so‘ng buyurtmalar shu yerda ko‘rinadi." /> : <div className="space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 md:p-5"><div className="flex flex-col gap-5 md:flex-row md:items-center"><img src={order.image} alt={order.name} className="h-24 w-full rounded-xl object-cover md:w-36" /><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-white/35">{order.id}</span><StatusPill tone={order.status === 'Completed' ? 'green' : 'gold'}>{order.status}</StatusPill></div><h2 className="mt-2 font-display text-lg font-black text-white">{order.name}</h2><p className="mt-1 text-xs text-white/40">{uzNumber(order.price)} so'm • xarid buyurtmasi</p></div><div className="flex gap-2"><PrimaryButton variant="ghost" onClick={() => onNavigate(`/account/${order.accountId}`)}>Batafsil</PrimaryButton>{order.status !== 'Completed' && <PrimaryButton onClick={() => onNavigate(`/order/${order.orderId}`)}>Jarayon</PrimaryButton>}</div></div>{order.status !== 'Completed' && <div className="mt-5 grid gap-3 border-t border-white/[0.08] pt-5 md:grid-cols-3">{[['To‘lov muzlatildi', order.stage >= 1], ['Akkaunt tekshiruvi', order.stage >= 2], ['Xaridor tasdig‘i', order.stage >= 3]].map(([label, complete], index) => <div key={label as string} className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-full border ${complete ? 'border-red-400 bg-red-500/15 text-red-200' : 'border-white/10 text-white/30'}`}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span><span className={`text-xs font-bold ${complete ? 'text-white/80' : 'text-white/30'}`}>{label as string}</span></div>)}</div>}</article>)}</div>}<div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-red-300" /><p className="text-sm leading-6 text-white/55">Kafolatli savdoda pul xaridor tasdig‘igacha muzlatilgan holatda turadi. Login yoki parolni platformadan tashqari kanallarda yubormang.</p></div></div></main>;
}

function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, isAuthenticated } = useAuth();
  const balanceQuery = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const transactionsQuery = trpc.wallet.getTransactions.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const listingsQuery = trpc.accounts.getSellerAccounts.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const sellerOrdersQuery = trpc.orders.getSellerOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const reviewsQuery = trpc.reviews.getSellerReviews.useQuery(user?.id ?? 0, { enabled: Boolean(user?.id), staleTime: 15_000, refetchOnWindowFocus: false });
  const [walletAction, setWalletAction] = React.useState<'topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const topup = trpc.wallet.topup.useMutation({ onSuccess: () => { toast.success('Hamyon muvaffaqiyatli to‘ldirildi'); setWalletAction(null); setAmount(''); balanceQuery.refetch(); transactionsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const withdraw = trpc.wallet.withdraw.useMutation({ onSuccess: () => { toast.success('Yechib olish so‘rovi qabul qilindi'); setWalletAction(null); setAmount(''); setDestination(''); balanceQuery.refetch(); transactionsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const balance = Number(balanceQuery.data?.balance ?? 0);
  const listingsCount = listingsQuery.data?.length ?? 0;
  const salesCount = sellerOrdersQuery.data?.length ?? 0;
  const reviews = reviewsQuery.data ?? [];
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  const badge = salesCount >= 20 ? 'Elite sotuvchi' : salesCount >= 5 ? 'Tasdiqlangan sotuvchi' : 'Yangi sotuvchi';
  const displayName = user?.name || 'Inferno savdogari';
  const transactions = transactionsQuery.data ?? [];
  const submitWalletAction = () => {
    const numericAmount = Math.floor(Number(amount.replace(/\\s/g, '')));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { toast.error('To‘g‘ri summa kiriting'); return; }
    if (walletAction === 'topup') topup.mutate({ amount: numericAmount });
    else if (walletAction === 'withdraw') {
      if (destination.trim().length < 4) { toast.error('Karta yoki hamyon ma’lumotini kiriting'); return; }
      withdraw.mutate({ amount: numericAmount, destination: destination.trim() });
    }
  };
  const walletBusy = topup.isPending || withdraw.isPending;
  return <main className="space-y-6"><div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6 md:flex-row md:items-center"><span className="grid h-20 w-20 place-items-center rounded-3xl border border-red-500/30 bg-red-500/10 text-red-300"><UserRound className="h-9 w-9" /></span><div className="flex-1"><StatusPill tone="gold"><Star className="h-3 w-3" />{badge}</StatusPill><h1 className="mt-3 font-display text-2xl font-black text-white">{displayName}</h1><p className="mt-1 text-sm text-white/45">Akkauntlar, hamyon va savdo faoliyatingiz</p></div><PrimaryButton variant="ghost" onClick={() => toast.info('Profil tahrirlash oynasi tez orada qo‘shiladi')}><UserRound className="h-4 w-4" />Tahrirlash</PrimaryButton></div><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border border-red-500/20 bg-[linear-gradient(135deg,rgba(239,68,68,.14),rgba(239,68,68,.03))] p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-white/50">Hamyon balansi</span><WalletCards className="h-5 w-5 text-red-300" /></div><div className="mt-4 font-display text-3xl font-black text-white">{uzNumber(balance)} <span className="font-sans text-sm text-white/45">so'm</span></div><p className="mt-2 text-xs text-white/40">{isAuthenticated ? 'Kafolatli savdo uchun mavjud balans' : 'Balansni ko‘rish uchun tizimga kiring'}</p><div className="mt-6 flex flex-wrap gap-2"><PrimaryButton onClick={() => { setWalletAction('topup'); setAmount(''); }}><CreditCard className="h-4 w-4" />To‘ldirish</PrimaryButton><PrimaryButton variant="ghost" onClick={() => { setWalletAction('withdraw'); setAmount(''); }}>Yechib olish</PrimaryButton></div>{walletAction && <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">{walletAction === 'topup' ? 'Hamyonni to‘ldirish' : 'Mablag‘ yechib olish'}</p><p className="mt-1 text-xs text-white/40">{walletAction === 'topup' ? 'Minimum 1 000 so‘m' : 'Minimum 10 000 so‘m; so‘rov admin tomonidan ko‘rib chiqiladi'}</p></div><button onClick={() => setWalletAction(null)} className="text-xs font-bold text-white/40 hover:text-white">Yopish</button></div><input className="field-input mt-4" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Summa, masalan 100000" />{walletAction === 'withdraw' && <input className="field-input mt-3" value={destination} onChange={event => setDestination(event.target.value)} placeholder="Karta raqami yoki hamyon manzili" />}<PrimaryButton className="mt-3 w-full" disabled={walletBusy} onClick={submitWalletAction}>{walletBusy ? 'Yuborilmoqda...' : walletAction === 'topup' ? 'Balansni to‘ldirish' : 'So‘rov yuborish'}<ArrowRight className="h-4 w-4" /></PrimaryButton></div>}</section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><SectionHeading eyebrow="Faoliyat" title="Qisqa ma'lumot" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['E’lonlarim', String(listingsCount)],['Savdolarim', String(salesCount)],['Sharhlar', reviews.length ? `${averageRating.toFixed(1)} / 5` : '—'],['Badge', badge]].map(([label,value]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</span><span className="mt-2 block truncate font-display text-xl font-black text-white">{value}</span></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><PrimaryButton variant="soft" onClick={() => onNavigate('/sell')}><Plus className="h-4 w-4" />Akkaunt sotish</PrimaryButton><PrimaryButton variant="ghost" onClick={() => onNavigate('/orders')}><ShoppingBag className="h-4 w-4" />Buyurtmalar</PrimaryButton><PrimaryButton variant="ghost" onClick={() => onNavigate('/reviews')}><Star className="h-4 w-4" />Sharhlar</PrimaryButton></div></section></div><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><SectionHeading eyebrow="Tranzaksiyalar" title="Oxirgi moliyaviy harakatlar" />{transactions.length === 0 ? <p className="mt-4 text-sm text-white/40">Hozircha tranzaksiyalar mavjud emas.</p> : <div className="mt-4 divide-y divide-white/[0.07]">{transactions.slice(0, 5).map(transaction => { const isCredit = transaction.type === 'topup' || transaction.type === 'seller_payout' || transaction.type === 'order_refund'; const label = transaction.type === 'topup' ? 'Balans to‘ldirildi' : transaction.type === 'withdrawal' ? 'Yechib olish so‘rovi' : transaction.type === 'seller_payout' ? 'Sotuvchi to‘lovi' : transaction.type === 'order_refund' ? 'Buyurtma qaytarimi' : 'Buyurtma to‘lovi'; return <div key={transaction.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-white">{label}</p><p className="mt-1 text-xs text-white/35">{transaction.status === 'completed' ? 'Yakunlangan' : 'Kutilmoqda'}</p></div><span className={`font-display text-sm font-black ${isCredit ? 'text-emerald-300' : 'text-red-300'}`}>{isCredit ? '+' : '-'}{uzNumber(Number(transaction.amount))} so'm</span></div>; })}</div>}</section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><SectionHeading eyebrow="Ishonch" title="Sotuvchi uchun tavsiyalar" /><div className="grid gap-3 md:grid-cols-3">{[['Media qo‘shing', 'Rasm va video xaridorga aniq tasavvur beradi.', ImagePlus], ['Qoidalarni o‘qing', 'Login/parolni ochiq joyga yozmang.', Shield], ['Savdoni kuzating', 'Buyurtmalar bo‘limida har bir bosqich ko‘rinadi.', Clock3]].map(([title, text, Icon]) => <div key={title as string} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"><Icon className="h-5 w-5 text-red-300" /><h3 className="mt-3 text-sm font-bold text-white">{title as string}</h3><p className="mt-1 text-xs leading-5 text-white/40">{text as string}</p></div>)}</div></section></main>;
}

function EscrowPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { isAuthenticated } = useAuth();
  const orderQuery = trpc.orders.getById.useQuery(id, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: false });
  const updateStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => { toast.success('Kafolat bosqichi yangilandi'); orderQuery.refetch(); } });
  const confirmBuyer = trpc.orders.confirmBuyer.useMutation({ onSuccess: () => { toast.success('Savdo yakunlandi'); orderQuery.refetch(); } });
  const fallbackOrder = { id, accountId: 1, price: '1499000', status: 'in_escrow' as const, escrowStage: 'account_verification' as const };
  const order = orderQuery.data ?? (isAuthenticated ? undefined : fallbackOrder);
  const stage = order?.escrowStage === 'buyer_confirmation' ? 3 : order?.escrowStage === 'account_verification' ? 2 : 1;
  const statusLabel = getEscrowStatusLabel(order?.status ?? 'pending');
  const advance = () => {
    if (!order) return;
    if (stage === 1) updateStatus.mutate({ orderId: id, status: 'in_escrow', escrowStage: 'account_verification' });
    else if (stage === 2) updateStatus.mutate({ orderId: id, status: 'in_escrow', escrowStage: 'buyer_confirmation' });
    else confirmBuyer.mutate(id);
  };
  const busy = updateStatus.isPending || confirmBuyer.isPending;
  return <main className="mx-auto max-w-5xl space-y-6"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Buyurtmalarga qaytish</button><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Inferno kafolat</span><h1 className="mt-2 font-display text-3xl font-black text-white">Kafolatli savdo</h1><p className="mt-2 text-sm text-white/45">Buyurtma #{id} — har bir bosqich admin nazoratida.</p></div><StatusPill tone={statusLabel === 'Completed' ? 'green' : statusLabel === 'In Escrow' ? 'gold' : 'muted'}>{statusLabel}</StatusPill></div>{orderQuery.isLoading && isAuthenticated ? <div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-8 text-center text-sm text-white/45">Buyurtma yuklanmoqda...</div> : <><section className="rounded-3xl border border-red-500/20 bg-[linear-gradient(135deg,rgba(239,68,68,.12),rgba(14,16,19,.95))] p-5 md:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-bold uppercase tracking-widest text-red-300">Savdo tafsiloti</span><h2 className="mt-2 font-display text-2xl font-black text-white">PUBG akkaunt #{order?.accountId ?? 1}</h2><p className="mt-1 text-sm text-white/45">{uzNumber(Number(order?.price ?? 0))} so'm • xavfsiz bitim</p></div><span className="grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300"><LockKeyhole className="h-6 w-6" /></span></div><div className="mt-8 grid gap-3 md:grid-cols-3">{ESCROW_STAGES.map(({ label, description }, index) => { const num = `0${index + 1}`; return <div key={num} className={`relative rounded-2xl border p-5 ${stage >= index + 1 ? 'border-red-400/35 bg-red-500/10' : 'border-white/[0.08] bg-white/[0.02]'}`}><div className="flex items-center justify-between"><span className={`font-display text-xl font-black ${stage >= index + 1 ? 'text-red-300' : 'text-white/25'}`}>{num}</span><span className={`grid h-8 w-8 place-items-center rounded-full ${stage >= index + 1 ? 'bg-red-500 text-white' : 'bg-white/[0.06] text-white/25'}`}>{stage >= index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span></div><h3 className="mt-5 text-sm font-black text-white">{label}</h3><p className="mt-2 text-xs leading-5 text-white/45">{description}</p></div>; })}</div><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-white/40">Login/parolni faqat platformadagi kafolat jarayoni orqali topshiring.</p>{statusLabel !== 'Completed' && <PrimaryButton onClick={advance} disabled={busy as boolean}>{busy ? 'Yangilanmoqda...' : stage === 1 ? 'Tekshiruvni boshlash' : stage === 2 ? 'Xaridor tasdig‘iga o‘tish' : 'Xaridni tasdiqlash'}</PrimaryButton>}</div></section><div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><Shield className="h-5 w-5 text-emerald-300" /><h3 className="mt-3 text-sm font-bold text-white">Admin nazorati</h3><p className="mt-1 text-xs leading-5 text-white/40">Shubhali holatlar bo‘lsa, savdo to‘xtatiladi.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><Clock3 className="h-5 w-5 text-amber-300" /><h3 className="mt-3 text-sm font-bold text-white">Bosqichma-bosqich</h3><p className="mt-1 text-xs leading-5 text-white/40">Har bir status o‘zgarishi buyurtmada saqlanadi.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><MessageCircle className="h-5 w-5 text-red-300" /><h3 className="mt-3 text-sm font-bold text-white">Nizo bo‘lsa</h3><p className="mt-1 text-xs leading-5 text-white/40">Yordam bo‘limi orqali admin bilan bog‘laning.</p></div></div></>}</main>;
}

function ReviewsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, isAuthenticated } = useAuth();
  const ordersQuery = trpc.orders.getUserOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const sellerReviewsQuery = trpc.reviews.getSellerReviews.useQuery(user?.id ?? 0, { enabled: Boolean(user?.id), staleTime: 15_000, refetchOnWindowFocus: false });
  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success('Sharhingiz saqlandi. Xarid tajribasi uchun rahmat!');
      setSelectedOrderId('');
      setComment('');
      setRating(5);
      ordersQuery.refetch();
      sellerReviewsQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Sharhni saqlashda xatolik yuz berdi.'),
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const completedOrders = (ordersQuery.data ?? []).filter(order => order.status === 'completed');
  const sellerReviews = sellerReviewsQuery.data ?? [];

  const submitReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrderId) {
      toast.error('Avval yakunlangan buyurtmani tanlang.');
      return;
    }
    createReview.mutate({ orderId: selectedOrderId, rating, comment: comment.trim() || undefined });
  };

  if (!isAuthenticated) {
    return <main className="mx-auto max-w-3xl space-y-6"><div className="rounded-3xl border border-red-500/20 bg-[linear-gradient(135deg,rgba(239,68,68,.12),rgba(14,16,19,.96))] p-8 text-center"><Star className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-4 font-display text-3xl font-black text-white">Sotuvchi reytinglari</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Sharh qoldirish va sotuvchilar ishonchliligini ko‘rish uchun Inferno Stealth profiliga kiring.</p><PrimaryButton className="mt-6" onClick={() => onNavigate('/profile')}>Profilga kirish <ArrowRight className="h-4 w-4" /></PrimaryButton></div></main>;
  }

  return <main className="space-y-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Ishonch markazi</span><h1 className="mt-2 font-display text-3xl font-black text-white">Reytinglar va sharhlar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Yakunlangan savdodan keyin sotuvchiga xolis baho qoldiring. Sharhlar faqat real buyurtma orqali yuboriladi.</p></div><PrimaryButton variant="ghost" onClick={() => onNavigate('/orders')}><ShoppingBag className="h-4 w-4" />Buyurtmalar</PrimaryButton></div><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border border-red-500/20 bg-[#0e1013] p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-300"><Star className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-black text-white">Sharh qoldirish</h2><p className="mt-1 text-xs text-white/40">Faqat yakunlangan savdolar uchun</p></div></div>{completedOrders.length === 0 ? <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-6 text-white/40">Hozircha sharh qoldirish mumkin bo‘lgan yakunlangan buyurtma yo‘q.</div> : <form onSubmit={submitReview} className="mt-6 space-y-4"><Field label="Buyurtmani tanlang"><select required value={selectedOrderId} onChange={event => setSelectedOrderId(event.target.value ? Number(event.target.value) : '')} className="field-input"><option value="">Buyurtmani tanlang</option>{completedOrders.map(order => <option key={order.id} value={order.id}>Buyurtma #{order.id} — {uzNumber(Number(order.price))} so‘m</option>)}</select></Field><div><span className="mb-2 block text-xs font-bold text-white/65">Bahongiz</span><div className="flex gap-2" role="radiogroup" aria-label="Sotuvchiga baho berish">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} yulduz`} aria-pressed={rating === value} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${rating >= value ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/[0.08] bg-white/[0.02] text-white/25'}`}><Star className={`h-4 w-4 ${rating >= value ? 'fill-amber-200' : ''}`} /></button>)}</div></div><Field label="Izoh (ixtiyoriy)"><textarea value={comment} onChange={event => setComment(event.target.value)} className="field-input min-h-28 resize-y" maxLength={1000} placeholder="Savdo tajribangizni yozing..." /></Field><PrimaryButton type="submit" disabled={createReview.isPending}>{createReview.isPending ? 'Saqlanmoqda...' : 'Sharhni yuborish'} <ArrowRight className="h-4 w-4" /></PrimaryButton></form>}</section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><SectionHeading eyebrow="Sotuvchi profili" title="Sizga qoldirilgan sharhlar" />{sellerReviews.length === 0 ? <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm leading-6 text-white/40">Sizning e’lonlaringiz bo‘yicha hali sharhlar mavjud emas. Birinchi savdolardan keyin bu yerda haqiqiy xaridor fikrlari ko‘rinadi.</div> : <div className="space-y-3">{sellerReviews.map(review => <article key={review.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-1 text-amber-200">{[1, 2, 3, 4, 5].map(value => <Star key={value} className={`h-4 w-4 ${Number(review.rating) >= value ? 'fill-amber-200' : 'text-white/15'}`} />)}</div><span className="text-[10px] text-white/30">Buyurtma #{review.orderId}</span></div><p className="mt-3 text-sm leading-6 text-white/65">{review.comment || 'Xaridor izoh qoldirmagan.'}</p></article>)}</div>}</section></div></main>;
}

function SupportPage() {
  const questions = ['Akkaunt qanday tekshiriladi?', 'To‘lov qachon sotuvchiga beriladi?', 'Media fayllar qayerda saqlanadi?', 'Muammo yuzaga kelsa nima qilaman?'];
  const [open, setOpen] = useState<number | null>(0);
  return <main className="mx-auto max-w-4xl space-y-6"><div className="text-center"><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Yordam markazi</span><h1 className="mt-3 font-display text-3xl font-black text-white">Yordam va qoidalar</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Inferno Stealth'dan xavfsiz foydalanish bo'yicha asosiy javoblar.</p></div><div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><Shield className="h-6 w-6 text-red-300" /><h2 className="mt-4 font-display text-sm font-black text-white">Xavfsizlik</h2><p className="mt-2 text-xs leading-5 text-white/40">Bitimni platformadan tashqarida yakunlamang.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><FileCheck2 className="h-6 w-6 text-red-300" /><h2 className="mt-4 font-display text-sm font-black text-white">Qoidalar</h2><p className="mt-2 text-xs leading-5 text-white/40">E'lon ma'lumotlarini aniq va to'liq kiriting.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><Headphones className="h-6 w-6 text-red-300" /><h2 className="mt-4 font-display text-sm font-black text-white">Aloqa</h2><p className="mt-2 text-xs leading-5 text-white/40">Admin bilan bog'lanish uchun xabar yuboring.</p></div></div><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5 md:p-7"><h2 className="font-display text-xl font-black text-white">Ko'p beriladigan savollar</h2><div className="mt-5 space-y-2">{questions.map((question, index) => <div key={question} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"><button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold text-white/75"><span><span className="mr-3 text-red-400">0{index + 1}</span>{question}</span><ChevronDown className={`h-4 w-4 text-white/35 transition ${open === index ? 'rotate-180' : ''}`} /></button>{open === index && <div className="border-t border-white/[0.08] px-4 pb-4 pt-3 text-sm leading-6 text-white/45">Bu bo'limda xavfsiz savdo jarayoni va admin ko'rigi orqali barcha tomonlar uchun aniq tartib saqlanadi. Shaxsiy ma'lumotlarni ochiq e'lon maydoniga yozmang.</div>}</div>)}</div></section><div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 sm:flex-row"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-red-300" /><span className="text-sm font-semibold text-white">Savolingiz javobsiz qoldimi?</span></div><PrimaryButton onClick={() => toast.info('Admin bilan bog‘lanish kanali sozlanmoqda')}>Admin bilan bog'lanish <ArrowRight className="h-4 w-4" /></PrimaryButton></div></main>;
}

function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');
  const statsQuery = trpc.admin.getStats.useQuery(undefined, { enabled: isAdmin, staleTime: 15_000, refetchOnWindowFocus: false });
  const pendingQuery = trpc.admin.getPendingAccounts.useQuery(undefined, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const disputesQuery = trpc.admin.getDisputes.useQuery(undefined, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [broadcastText, setBroadcastText] = React.useState('');
  const [resolutionText, setResolutionText] = React.useState<Record<number, string>>({});
  const verifyAccount = trpc.admin.verifyAccount.useMutation({ onSuccess: () => { toast.success('Tekshiruv qarori saqlandi'); pendingQuery.refetch(); statsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const resolveDispute = trpc.admin.resolveDispute.useMutation({ onSuccess: () => { toast.success('Nizo yopildi'); disputesQuery.refetch(); statsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const broadcast = trpc.admin.broadcast.useMutation({ onSuccess: result => { toast.success(`${result.recipients} foydalanuvchiga xabar yuborildi`); setBroadcastText(''); }, onError: error => toast.error(error.message) });
  if (!isAdmin) return <main className="mx-auto max-w-2xl rounded-3xl border border-red-500/20 bg-[#0e1013] p-8 text-center"><Shield className="mx-auto h-10 w-10 text-red-300" /><h1 className="mt-5 font-display text-2xl font-black text-white">Admin kirishi kerak</h1><p className="mt-2 text-sm leading-6 text-white/45">Bu bo‘lim faqat platforma egasi va adminlar uchun ochiq.</p></main>;
  const stats = statsQuery.data;
  const pending = pendingQuery.data ?? [];
  const disputes = disputesQuery.data ?? [];
  return <main className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Boshqaruv</span><h1 className="mt-2 font-display text-3xl font-black text-white">Admin panel</h1><p className="mt-2 text-sm text-white/45">Inferno Stealth xavfsizligi, tekshiruv va savdo nazorati.</p></div><StatusPill tone="green"><BadgeCheck className="h-3 w-3" />Owner tasdiqlangan</StatusPill></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Foydalanuvchilar", stats?.totalUsers ?? '—', UserRound],['Faol e’lonlar', stats?.totalAccounts ?? '—', ShoppingBag],['Tekshiruv navbati', stats?.pendingAccounts ?? '—', FileCheck2],['Yakunlangan savdo', stats?.totalSales ?? '—', Check],['Ochiq nizolar', stats?.openDisputes ?? '—', MessageCircle]].map(([label, value, Icon]) => { const CardIcon = Icon as React.ElementType; return <div key={label as string} className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-5"><CardIcon className="h-5 w-5 text-red-300" /><span className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-white/35">{label as string}</span><span className="mt-2 block font-display text-2xl font-black text-white">{String(value)}</span></div>; })}</div><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Queue</span><h2 className="mt-2 font-display text-lg font-black text-white">Tekshiruv navbati</h2><p className="mt-1 text-xs text-white/40">Har bir e’lon egasiga chiqishidan oldin tekshiriladi.</p></div><StatusPill tone={pending.length ? 'gold' : 'muted'}>{pending.length ? `${pending.length} ta kutilmoqda` : 'Bo‘sh'}</StatusPill></div>{pending.length === 0 ? <EmptyState title="Kutilayotgan e’lonlar yo‘q" text="Yangi e’lon kelganda shu yerda ko‘rinadi." /> : <div className="mt-5 space-y-3">{pending.map(account => <article key={account.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex gap-4">{account.thumbnailUrl ? <img src={account.thumbnailUrl} alt="" className="h-20 w-24 rounded-xl bg-black/30 object-cover" /> : <span className="grid h-20 w-24 place-items-center rounded-xl border border-red-500/15 bg-red-500/[0.06] text-red-300"><Shield className="h-6 w-6" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-red-300">#{account.id}</span><span className="text-xs text-white/40">{account.accountId}</span><StatusPill tone="muted">{account.region}</StatusPill></div><h3 className="mt-2 truncate text-sm font-black text-white">{account.playerName}</h3><p className="mt-1 text-xs text-white/45">LVL {account.level} · {uzNumber(Number(account.price))} so‘m</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{account.description || 'Tavsif kiritilmagan.'}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><PrimaryButton disabled={verifyAccount.isPending} onClick={() => verifyAccount.mutate({ accountId: account.id, approved: true })}><Check className="h-4 w-4" />Tasdiqlash</PrimaryButton><PrimaryButton variant="ghost" disabled={verifyAccount.isPending} onClick={() => verifyAccount.mutate({ accountId: account.id, approved: false, notes: 'Admin tekshiruvidan o‘tmadi.' })}>Rad etish</PrimaryButton></div></article>)}</div>}</section><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-300"><MessageCircle className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-black text-white">Broadcast xabar</h2><p className="mt-1 text-xs text-white/40">Barcha foydalanuvchilarga in-app xabar yuboring.</p></div></div><textarea className="field-input mt-5 min-h-32 resize-y" value={broadcastText} onChange={event => setBroadcastText(event.target.value)} placeholder="Masalan: Bugun barcha premium e’lonlar uchun komissiya kamaytirildi..." /><PrimaryButton className="mt-3 w-full" disabled={broadcast.isPending || broadcastText.trim().length < 3} onClick={() => broadcast.mutate({ message: broadcastText.trim() })}>{broadcast.isPending ? 'Yuborilmoqda...' : 'Barcha foydalanuvchilarga yuborish'}<ArrowRight className="h-4 w-4" /></PrimaryButton><div className="mt-6 rounded-2xl border border-red-500/15 bg-red-500/[0.05] p-4"><p className="text-xs leading-5 text-white/45">Jami tushum: <strong className="text-white">{uzNumber(Number(stats?.totalRevenue ?? 0))} so‘m</strong></p></div></section></div><section className="rounded-2xl border border-white/[0.08] bg-[#0e1013] p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Safety desk</span><h2 className="mt-2 font-display text-lg font-black text-white">Ochiq nizolar</h2></div><StatusPill tone={disputes.length ? 'gold' : 'muted'}>{disputes.length ? `${disputes.length} ta ochiq` : 'Nizo yo‘q'}</StatusPill></div>{disputes.length === 0 ? <EmptyState title="Ochiq nizo yo‘q" text="Yangi murojaatlar shu yerda ko‘rinadi." /> : <div className="mt-5 grid gap-3 md:grid-cols-2">{disputes.map(dispute => <article key={dispute.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-red-300">Nizo #{dispute.id}</span><span className="text-xs text-white/35">Buyurtma #{dispute.orderId}</span></div><h3 className="mt-3 text-sm font-black text-white">{dispute.reason}</h3><p className="mt-2 text-xs leading-5 text-white/40">{dispute.description || 'Qo‘shimcha izoh yo‘q.'}</p><textarea className="field-input mt-4 min-h-20 resize-y" value={resolutionText[dispute.id] || ''} onChange={event => setResolutionText(current => ({ ...current, [dispute.id]: event.target.value }))} placeholder="Qaror izohi..." /><PrimaryButton className="mt-3 w-full" disabled={resolveDispute.isPending || (resolutionText[dispute.id] || '').trim().length < 3} onClick={() => resolveDispute.mutate({ disputeId: dispute.id, resolution: resolutionText[dispute.id].trim() })}>Nizoni yopish <Check className="h-4 w-4" /></PrimaryButton></article>)}</div>}</section></main>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="grid min-h-40 place-items-center py-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30"><Search className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-bold text-white/70">{title}</h3><p className="mt-1 text-xs text-white/35">{text}</p></div>;
}

function BottomNav({ current, onNavigate }: { current: PageKey; onNavigate: (path: string) => void }) {
  const items = [['home', '/', Flame], ['accounts', '/accounts', Search], ['sell', '/sell', Plus], ['orders', '/orders', ShoppingBag], ['profile', '/profile', UserRound]] as const;
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#08090b]/95 px-3 py-2 backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5 gap-1">{items.map(([key, path, Icon]) => <button key={key} onClick={() => onNavigate(path)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${current === key ? 'text-red-300' : 'text-white/35'}`}><span className={`grid h-8 w-8 place-items-center rounded-xl ${current === key ? 'bg-red-500/15' : ''}`}><Icon className="h-4 w-4" /></span>{key === 'home' ? 'Asosiy' : key === 'accounts' ? 'Bozor' : key === 'sell' ? 'Sotish' : key === 'orders' ? 'Buyurtma' : 'Profil'}</button>)}</div></nav>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const page = pageFromPath(location);
  const navigate = (path: string) => setLocation(path);
  const { isAuthenticated } = useAuth();
  const claimReferral = trpc.profile.claimReferral.useMutation();
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    autoClaimTelegramReferral({
      isAuthenticated,
      code: getTelegramReferralCode(),
      storage: window.sessionStorage,
      claim: (input, callbacks) => claimReferral.mutate(input, callbacks),
      onSuccess: result => {
        telegramHaptic('success');
        toast.success(`${uzNumber(result.reward)} so‘m referral bonusi qo‘shildi`);
      },
      onError: error => {
        if (!/already|allaqachon|o'zi|o‘z/i.test(error.message)) toast.info('Referral kodi avtomatik tekshirilmadi. Profil orqali qayta urinib ko‘ring.');
      },
    });
  }, [isAuthenticated]);
  React.useEffect(() => {
    const webApp = initTelegramWebApp();
    if (!webApp) return;
    const goBack = () => { if (location !== '/') setLocation('/'); };
    if (page.key === 'home') webApp.BackButton?.hide?.();
    else {
      webApp.BackButton?.show?.();
      webApp.BackButton?.onClick?.(goBack);
    }
    return () => webApp.BackButton?.offClick?.(goBack);
  }, [location, page.key, setLocation]);
  const content = page.key === 'home' ? <HomePage onNavigate={navigate} /> : page.key === 'accounts' ? <AccountsPage onOpen={id => navigate(`/account/${id}`)} /> : page.key === 'details' ? <DetailPage id={page.id ?? 1} onBack={() => navigate('/accounts')} onNavigate={navigate} /> : page.key === 'sell' ? <SellPage onNavigate={navigate} /> : page.key === 'orders' ? <OrdersPage onNavigate={navigate} /> : page.key === 'escrow' ? <EscrowPage id={page.id ?? 1} onBack={() => navigate('/orders')} /> : page.key === 'saved' ? <SavedPage onNavigate={navigate} /> : page.key === 'chat' ? <ChatPage id={page.id ?? 1} onBack={() => navigate('/')} /> : page.key === 'profile' ? <ProfilePage onNavigate={navigate} /> : page.key === 'reviews' ? <ReviewsPage onNavigate={navigate} /> : page.key === 'support' ? <SupportPage /> : page.key === 'admin' ? <AdminPage /> : <ReferralPage />;
  return <div className="min-h-screen bg-[#08090b] text-white"><AppHeader onNavigate={navigate} /><div className="relative overflow-hidden"><div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-red-500/[0.045] blur-3xl" /><div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-24 pt-7 lg:px-8 lg:pb-12">{content}</div></div><BottomNav current={page.key} onNavigate={navigate} /></div>;
}
