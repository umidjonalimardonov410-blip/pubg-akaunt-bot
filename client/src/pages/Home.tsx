import { useEffect, useMemo, useState } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { getParentPath, isHomePath } from "@/lib/navigation";
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
  Copy,
  CreditCard,
  Edit3,
  FileCheck2,
  Flag,
  Filter,
  Flame,
  Grid2X2,
  Headphones,
  Heart,
  Phone,
  ImagePlus,
  LayoutList,
  LoaderCircle,
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
  Zap, Trash2, Camera, Bookmark, FolderOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { accountShareUrl, authenticateTelegramWebApp, getTelegramPhoneLoginUrl, autoClaimTelegramReferral, getTelegramMiniAppLaunchUrl, getTelegramReferralCode, getTelegramWebApp, initTelegramWebApp, shareTelegramText, telegramHaptic } from "@/lib/telegram";
import { ChatPage, FavoriteButton, ReferralPage, SavedPage } from "@/pages/EnhancedPages";
import { AdminPanelPage, FulfillmentTracker, SupportFaqPage } from "@/pages/MarketplaceExtras";
import { AdminAnalyticsPanel } from "@/pages/AdminAnalytics";
import { PriceWatchButton, SellerLeaderboard, SellerTrustCard } from "@/pages/SellerTrust";
import AdminPhrasesPanel from "@/components/AdminPhrasesPanel";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import MediaViewer, { type MediaItem } from "@/components/MediaViewer";
import { compressImage, validateMediaFile } from "@/lib/mediaCompression";
import { ChatInboxPage, NotificationsPage } from "@/pages/InboxPages";
import { RulesPage } from "@/pages/RulesPage";
import { FlashSalePage, MysteryBoxPage } from "@/pages/EventPages";
import { motion, AnimatePresence } from "framer-motion";
import { ListingGridSkeleton, ListRowSkeleton } from "@/components/pro/Skeleton";
import BottomSheet from "@/components/pro/BottomSheet";
import StickyBuyBar from "@/components/pro/StickyBuyBar";
import PullToRefresh from "@/components/pro/PullToRefresh";
import SuccessBurst from "@/components/pro/SuccessBurst";
import { haptic } from "@/lib/haptics";
import HypeDeck, { LiveTicker } from "@/components/pro/HypeDeck";
import ProDetailPanel, { CashbackCard, DealRoomPanel, HoldButton, TopSellersBoard } from "@/components/pro/ProPack";
import { listContainer, listItem } from "@/components/pro/motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ADMIN_TELEGRAM_LABEL, ADMIN_TELEGRAM_URL } from "@shared/adminContact";

const HERO_IMAGE = "/assets/pubg-hero.jpg";
const CARD_IMAGE = "/assets/pubg-card-1.jpg";
const PORTRAIT_IMAGE = "/assets/pubg-card-2.jpg";
const SQUAD_IMAGE = "/assets/pubg-card-3.jpg";
const SNIPER_IMAGE = "/assets/pubg-card-4.jpg";
const PROFILE_BANNER = "/assets/pubg-profile.jpg";
const CRATE_IMAGE = "/assets/pubg-crate.jpg";
const SUPPORT_IMAGE = "/assets/pubg-support.jpg";

/** Barcha "Admin" tugmalari shu yagona havolaga boradi. */
function openAdminChat() {
  telegramHaptic('light');
  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) webApp.openTelegramLink(ADMIN_TELEGRAM_URL);
  else window.open(ADMIN_TELEGRAM_URL, '_blank', 'noopener');
}

function AdminContactButton({ label = 'Admin bilan bog‘lanish', className = '' }: { label?: string; className?: string }) {
  return (
    <button onClick={openAdminChat} className={`pubg-press inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-[linear-gradient(120deg,rgba(220,38,38,.35),rgba(245,197,66,.28))] px-4 py-3 text-xs font-black text-amber-50 shadow-[0_0_24px_rgba(220,38,38,.25)] transition hover:brightness-110 ${className}`}>
      <MessageCircle className="h-4 w-4" />{label}
      <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">{ADMIN_TELEGRAM_LABEL}</span>
    </button>
  );
}

type Listing = {
  id: number;
  playerName: string;
  level: number;
  rank: string;
  price: number;
  region: string;
  kd: string;
  winRate: string;
  matches: string;
  skins: string[];
  image: string;
  tag: string;
  description: string;
  galleryUrls?: string[];
  videoUrl?: string;
  accountId?: string;
  sellerId?: number;
  verifiedSeller?: boolean;
};

export function marketplaceLayoutClass(view: 'grid' | 'list', isSwitching: boolean) {
  const motion = isSwitching ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100';
  const layout = view === 'grid' ? 'grid gap-2.5 grid-cols-3 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-3';
  return `transform-gpu transition-[opacity,transform] duration-300 ease-out ${motion} ${layout}`;
}

/** Uzun matnni 2 qatorda ko'rsatadi, "Ko'proq" bosilsa to'liq ochiladi. */
export function ExpandableText({ text, className = '' }: { text: string; className?: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = text.trim().length > 90;
  return (
    <div className={className}>
      <p className={expanded || !isLong ? '' : 'line-clamp-2'}>{text}</p>
      {isLong && <button type="button" onClick={() => setExpanded(value => !value)} className="mt-1 text-[11px] font-black text-amber-200 active:scale-95">{expanded ? 'Yopish' : 'Ko‘proq'}</button>}
    </div>
  );
}

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
    sellerId: row.sellerId ? Number(row.sellerId) : undefined,
    verifiedSeller: Boolean(row.sellerVerified ?? row.isVerifiedSeller),
  };
}

type PageKey = "home" | "accounts" | "sell" | "orders" | "profile" | "transactions" | "reviews" | "support" | "admin" | "details" | "escrow" | "saved" | "chat" | "chats" | "notifications" | "referral" | "rules" | "flash" | "mystery";

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

/** Balans/statistika raqamlarini yumshoq animatsiya bilan sanab chiqadi (gamer HUD effekti). */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  React.useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const duration = 550;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{uzNumber(display)}</span>;
}


function pageFromPath(pathname: string): { key: PageKey; id?: number } {
  if (pathname.startsWith("/accounts")) return { key: "accounts" };
  if (pathname.startsWith("/sell")) return { key: "sell" };
  if (pathname.startsWith("/orders")) return { key: "orders" };
  if (pathname.startsWith("/saved")) return { key: "saved" };
  if (pathname.startsWith("/referral")) return { key: "referral" };
  if (pathname.startsWith("/rules")) return { key: "rules" };
  if (pathname.startsWith("/flash")) return { key: "flash" };
  if (pathname.startsWith("/mystery")) return { key: "mystery" };
  if (pathname.startsWith("/chats")) return { key: "chats" };
  if (pathname.startsWith("/notifications")) return { key: "notifications" };
  if (pathname.startsWith("/chat/")) return { key: "chat", id: Number(pathname.split("/").pop()) || 1 };
  if (pathname.startsWith("/order/")) return { key: "escrow", id: Number(pathname.split("/").pop()) || 1 };
  if (pathname.startsWith("/profile")) return { key: "profile" };
  if (pathname.startsWith("/transactions")) return { key: "transactions" };
  if (pathname.startsWith("/reviews")) return { key: "reviews" };
  if (pathname.startsWith("/support")) return { key: "support" };
  if (pathname.startsWith("/admin")) return { key: "admin" };
  if (pathname.startsWith("/account/")) return { key: "details", id: Number(pathname.split("/").pop()) || 1 };
  return { key: "home" };
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Inferno Stealth bosh sahifa">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(150deg,rgba(245,197,66,.16),rgba(245,197,66,.03))] ring-1 ring-inset ring-amber-400/25 transition duration-300 group-hover:ring-amber-300/50">
        <img loading="lazy" decoding="async" src="/assets/inferno-logo.png" alt="Inferno Gold Market" className="h-7 w-7 object-contain drop-shadow-[0_2px_10px_rgba(245,197,66,.35)]" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-sm font-black tracking-[0.22em] text-white">INFERNO</span>
          <span className="block text-[9px] font-bold tracking-[0.32em] text-amber-300">GOLD MARKET</span>
        </span>
      )}
    </Link>
  );
}

function PrimaryButton({ children, onClick, variant = "solid", type = "button", className = "", disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "solid" | "ghost" | "soft"; type?: "button" | "submit"; className?: string; disabled?: boolean }) {
  const styles = {
    solid: "border border-amber-300/50 bg-gradient-to-b from-blood-400 to-blood-600 text-white shadow-[0_0_26px_rgba(220,38,38,.38)] hover:from-blood-300 hover:to-blood-500",
    ghost: "border border-white/10 bg-white/[0.03] text-white hover:border-amber-300/50 hover:bg-blood-500/10",
    soft: "border border-amber-400/25 bg-amber-400/10 text-amber-50 hover:bg-blood-500/15",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function StatusPill({ children, tone = "red" }: { children: React.ReactNode; tone?: "red" | "green" | "gold" | "muted" }) {
  const tones = {
    red: "border-blood-400/40 bg-blood-500/15 text-blood-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    gold: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    muted: "border-white/10 bg-white/[0.04] text-white/60",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}>{children}</span>;
}

function AppHeader({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [headerLocation] = useLocation();
  const isHomePage = isHomePath(headerLocation);
  /** Har bir bo'limda ortga tugmasi bir xil ishlashi uchun mantiqiy ota-sahifaga qaytamiz. */
  const goBack = () => {
    telegramHaptic('light');
    onNavigate(getParentPath(headerLocation));
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { t } = useI18n();
  /** Bitta vaqtda faqat bitta ochiluvchi menyu turishi uchun. */
  const closeOtherPopovers = () => window.dispatchEvent(new CustomEvent('app:close-popovers'));
  useEffect(() => {
    const close = () => { setNotificationsOpen(false); setMenuOpen(false); };
    window.addEventListener('app:close-popovers', close);
    return () => window.removeEventListener('app:close-popovers', close);
  }, []);
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
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(14,16,19,.92),rgba(8,9,11,.88))] backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,.04)_inset,0_14px_40px_-24px_rgba(0,0,0,.9)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[radial-gradient(60%_100%_at_18%_100%,rgba(245,197,66,.13),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(245,197,66,.35),transparent)]" />
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-3 sm:h-[72px] sm:px-4 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-10">
          {!isHomePage && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Ortga"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.08] hover:text-amber-100 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="sm:hidden"><Brand compact /></span>
          <span className="hidden sm:inline-flex"><Brand /></span>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/55 lg:flex">
            {[['nav.market', '/accounts'], ['nav.saved', '/saved'], ['nav.sell', '/sell'], ['nav.orders', '/orders'], ['nav.referral', '/referral'], ['nav.flash', '/flash'], ['nav.mystery', '/mystery'], ['nav.rules', '/rules'], ['nav.support', '/support']].map(([label, path]) => (
              <button key={path} onClick={() => onNavigate(path)} className="transition hover:text-white">{t(label)}</button>
            ))}
          </nav>
        </div>
        <div className="relative flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => onNavigate('/chats')}
            className="pubg-press grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/10 transition duration-200 hover:bg-white/[0.07] hover:text-amber-100 hover:ring-amber-400/35 active:scale-[.96]"
            aria-label="Chatlar"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setNotificationsOpen(value => { if (!value) closeOtherPopovers(); return !value; })}
            className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/10 transition duration-200 hover:bg-white/[0.07] hover:text-amber-100 hover:ring-amber-400/35 active:scale-[.96]"
            aria-label="Bildirishnomalar"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4 w-4" />
            {unread.length > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border border-[#08090b] bg-amber-400 px-1 text-[9px] font-black text-black">{unread.length > 9 ? '9+' : unread.length}</span>}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-amber-400/25 bg-[#0d0f12] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <div><p className="text-sm font-black text-white">Bildirishnomalar</p><p className="mt-0.5 text-[11px] text-white/40">Muhim savdo yangiliklari</p></div>
                {unread.length > 0 && <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-200">{unread.length} ta yangi</span>}
              </div>
              {!isAuthenticated ? (
                <button onClick={() => { setNotificationsOpen(false); onNavigate('/profile'); }} className="w-full px-4 py-6 text-left text-xs leading-5 text-white/50 transition hover:bg-white/[0.03]">Bildirishnomalarni ko‘rish uchun profilga kiring.</button>
              ) : unread.length === 0 ? (
                <div className="px-4 py-7 text-center"><Bell className="mx-auto h-6 w-6 text-white/20" /><p className="mt-2 text-xs text-white/45">Hozircha yangi bildirishnoma yo‘q.</p></div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {unread.slice(0, 6).map(notification => (
                    <button key={notification.id} onClick={() => markNotificationRead(notification.id)} className="block w-full border-b border-white/[0.06] px-4 py-3 text-left transition hover:bg-amber-400/[0.06]">
                      <div className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-200"><Bell className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{notification.title}</span><span className="mt-1 block text-[11px] leading-5 text-white/45">{notification.message}</span></span></div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { setNotificationsOpen(false); onNavigate('/notifications'); }} className="w-full border-t border-white/[0.08] px-4 py-3 text-center text-xs font-bold text-amber-200 transition hover:bg-amber-400/[0.06]">Barcha bildirishnomalar</button>
            </div>
          )}
          <ThemeToggleButton />
          <button onClick={() => onNavigate('/profile')} className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left sm:flex">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400/15 text-amber-200"><UserRound className="h-4 w-4" /></span>
            <span><span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">Kabinet</span><span className="block text-xs font-bold text-white">Mening profilim</span></span>
          </button>
          <button onClick={() => { if (!menuOpen) closeOtherPopovers(); setMenuOpen(!menuOpen); }} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/10 transition duration-200 hover:bg-white/[0.07] hover:text-amber-100 hover:ring-amber-400/35 active:scale-[.96] lg:hidden" aria-label="Menyu"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#0b0d10] px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-1">
            {[['nav.market', '/accounts'], ['nav.saved', '/saved'], ['nav.sell', '/sell'], ['nav.orders', '/orders'], ['nav.transactions', '/transactions'], ['nav.referral', '/referral'], ['nav.flash', '/flash'], ['nav.mystery', '/mystery'], ['nav.rules', '/rules'], ['nav.profile', '/profile'], ['nav.support', '/support']].map(([label, path]) => (
              <button key={path} onClick={() => { setMenuOpen(false); onNavigate(path); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white">{t(label)}</button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function TrustStrip() {
  const items = [
    [Shield, "Ommaviy bozor", "E'lonlar darhol xaridorlarga ko‘rinadi"],
    [LockKeyhole, "Kafolatli savdo", "Pul bitim tugaguncha himoyada"],
    [Headphones, "Tezkor yordam", "Savollar bo'yicha admin bilan aloqa"],
  ] as const;
  return (
    <div className="hidden gap-3 sm:grid md:grid-cols-3">
      {items.map(([Icon, title, text]) => (
        <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-200"><Icon className="h-5 w-5" /></span>
          <span><span className="block text-xs font-bold text-white">{title}</span><span className="mt-0.5 block text-[11px] text-white/45">{text}</span></span>
        </div>
      ))}
    </div>
  );
}

function ListingCard({ item, onOpen, showcase = false }: { item: Listing; onOpen: (id: number) => void; showcase?: boolean }) {
  return (
    <article
      onClick={() => onOpen(item.id)}
      className={`pubg-card rise-in group flex min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101215] shadow-md transition duration-200 hover:border-amber-400/40 active:scale-[.99] ${showcase ? 'p-2' : 'p-2 sm:p-2.5'}`}
    >
      <div>
        <div className={`relative overflow-hidden rounded-xl bg-[#16181b] ${showcase ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
          <motion.img layoutId={`acc-image-${item.id}`} src={item.image} alt={item.playerName} loading="lazy" className="h-full w-full img-live object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="inferno-scan pointer-events-none absolute inset-0" />
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-[3px] text-[9px] sm:px-1.5 sm:text-[10px] font-black leading-none tracking-wide text-amber-50 shadow">LVL {item.level}</span>
          {item.verifiedSeller && <span className="absolute left-1.5 top-7 inline-flex items-center gap-1 rounded bg-emerald-500/85 px-1.5 py-[2px] text-[9px] font-black leading-none text-black shadow"><BadgeCheck className="h-3 w-3" />ISHONCHLI</span>}
          <div className="absolute right-1.5 top-1.5 z-10" onClick={event => event.stopPropagation()}><FavoriteButton accountId={item.id} compact /></div>
          <div className="absolute inset-x-2 bottom-1.5">
            <p className="truncate text-[12px] font-black text-white drop-shadow sm:text-sm">{item.playerName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-bold text-white/75 sm:text-[11px]"><span>{item.region}</span><span className="text-amber-200">K/D {item.kd}</span></p>
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-white/[0.06] pt-1.5">
        <div className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-white/40">Narx</span>
          <motion.span layoutId={`acc-price-${item.id}`} className="block truncate font-display text-[13px] font-black leading-none text-amber-50 sm:text-[16px]">{uzNumber(item.price)} <span className="text-[8px] sm:text-[9px]">so'm</span></motion.span>
        </div>
        <span className="pubg-press grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/25 sm:h-9 sm:w-9 sm:rounded-xl text-amber-50 transition group-hover:bg-amber-400 group-hover:text-black"><ArrowRight className="h-4 w-4" /></span>
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
  hasGlacier?: boolean;
  hasXSuit?: boolean;
  hasConquerorHistory?: boolean;
  isOldAccount?: boolean;
  verifiedSeller?: boolean;
  mediaAvailable?: boolean;
  category?: 'all' | 'pro' | 'conqueror' | 'classic';
  minKd?: number;
  minWinRate?: number;
  sortBy?: SortMode;
};

export type SortMode = 'newest' | 'price_asc' | 'price_desc' | 'level_desc' | 'popular';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'Eng yangi' },
  { value: 'price_asc', label: 'Narx: arzondan' },
  { value: 'price_desc', label: 'Narx: qimmatdan' },
  { value: 'level_desc', label: 'Daraja bo‘yicha' },
  { value: 'popular', label: 'Ommabop' },
];

type SearchDraft = {
  search: string;
  minPrice: string;
  maxPrice: string;
  minLevel: string;
  maxLevel: string;
  region: string;
  category: 'all' | 'pro' | 'conqueror' | 'classic';
  skins: string[];
  minKd: string;
  minWinRate: string;
  sortBy: SortMode;
};

/** Single source of truth for turning the search form state into API filters. */
export function buildAccountFilters(draft: SearchDraft, advanced: string[]): AccountFilters {
  return {
    search: draft.search.trim() || undefined,
    minPrice: draft.minPrice ? Number(draft.minPrice) : undefined,
    maxPrice: draft.maxPrice ? Number(draft.maxPrice) : undefined,
    minLevel: draft.minLevel ? Number(draft.minLevel) : undefined,
    maxLevel: draft.maxLevel ? Number(draft.maxLevel) : undefined,
    region: draft.region || undefined,
    skins: draft.skins.length ? draft.skins : undefined,
    hasGlacier: advanced.includes('glacier') || undefined,
    hasXSuit: advanced.includes('xsuit') || undefined,
    hasConquerorHistory: advanced.includes('conqueror') || undefined,
    isOldAccount: advanced.includes('old') || undefined,
    verifiedSeller: advanced.includes('verified') || undefined,
    mediaAvailable: advanced.includes('media') || undefined,
    category: draft.category === 'all' ? undefined : draft.category,
    minKd: draft.minKd ? Number(draft.minKd) : undefined,
    minWinRate: draft.minWinRate ? Number(draft.minWinRate) : undefined,
    sortBy: draft.sortBy === 'newest' ? undefined : draft.sortBy,
  };
}


/** Saqlangan filtrlar paneli — foydalanuvchi tez-tez ishlatadigan filtrlarni saqlaydi va qayta yuklaydi. */
function SavedFiltersBar({ draft, advanced, onLoad }: { draft: SearchDraft; advanced: string[]; onLoad: (filters: AccountFilters) => void }) {
  const utils = trpc.useUtils();
  const saved = trpc.savedFilters.list.useQuery(undefined, { staleTime: 60_000 });
  const saveMutation = trpc.savedFilters.save.useMutation({
    onSuccess: () => { toast.success('Filtr saqlandi'); utils.savedFilters.list.invalidate(); },
    onError: (error: any) => toast.error(error.message),
  });
  const removeMutation = trpc.savedFilters.remove.useMutation({
    onSuccess: () => { utils.savedFilters.list.invalidate(); },
    onError: (error: any) => toast.error(error.message),
  });

  const handleSave = () => {
    const filters = buildAccountFilters(draft, advanced);
    const hasFilters = Object.values(filters).some(value => value !== undefined);
    if (!hasFilters) { toast.info('Avval kamida bitta filtr tanlang'); return; }
    saveMutation.mutate({ name: `Filtr ${new Date().toLocaleDateString('uz-UZ')}`, filters: JSON.stringify(filters) });
  };

  const handleLoad = (filterJson: string) => {
    try { onLoad(JSON.parse(filterJson)); toast.success('Filtr yuklandi'); }
    catch { toast.error('Filtr ma\u2019lumotlari buzilgan'); }
  };

  const items = saved.data ?? [];
  if (items.length === 0 && !saveMutation.isPending) {
    return (
      <button type="button" onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition hover:text-white">
        <Bookmark className="h-3.5 w-3.5" />Filtri saqlash
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleSave} disabled={saveMutation.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-400/20">
        <Bookmark className="h-3.5 w-3.5" />{saveMutation.isPending ? 'Saqlanmoqda...' : 'Filtri saqlash'}
      </button>
      {items.map(item => (
        <div key={item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/65">
          <button type="button" onClick={() => handleLoad(item.filters)} className="inline-flex items-center gap-1.5 transition hover:text-amber-200">
            <FolderOpen className="h-3.5 w-3.5" />{item.name}
          </button>
          <button type="button" onClick={() => removeMutation.mutate({ filterId: item.id })} aria-label="Filtrni o\u2018chirish" className="text-white/30 transition hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function SearchPanel({ onFilters }: { onFilters: (filters: AccountFilters) => void }) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [advanced, setAdvanced] = useState<string[]>([]);
  const [draft, setDraft] = useState<SearchDraft>({ search: "", minPrice: "", maxPrice: "", minLevel: "", maxLevel: "", region: "", category: "all", skins: [], minKd: "", minWinRate: "", sortBy: "newest" });
  const suggestionInput = useMemo(() => ({ query: draft.search }), [draft.search]);
  const suggestionQuery = trpc.accounts.suggestions.useQuery(suggestionInput, {
    enabled: draft.search.trim().length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: keyof SearchDraft, value: string) => {
    const next = { ...draft, [key]: value } as SearchDraft;
    setDraft(next);
    onFilters(buildAccountFilters(next, advanced));
  };
  const toggleSkin = (skin: string) => {
    const skins = draft.skins.includes(skin) ? draft.skins.filter(item => item !== skin) : [...draft.skins, skin];
    const next = { ...draft, skins };
    setDraft(next);
    onFilters(buildAccountFilters(next, advanced));
  };
  const toggleAdvanced = (key: string) => {
    const nextAdvanced = advanced.includes(key) ? advanced.filter(item => item !== key) : [...advanced, key];
    setAdvanced(nextAdvanced);
    onFilters(buildAccountFilters(draft, nextAdvanced));
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
  const activeFilterCount = advanced.length + [draft.minPrice, draft.maxPrice, draft.minLevel, draft.maxLevel, draft.region, draft.minKd, draft.minWinRate].filter(Boolean).length + (draft.skins.length ? 1 : 0) + (draft.category !== 'all' ? 1 : 0);
  const filterContent = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Minimal narx"><input type="number" value={draft.minPrice} onChange={event => update('minPrice', event.target.value)} className="field-input" placeholder="100000" /></Field>
      <Field label="Maksimal narx"><input type="number" value={draft.maxPrice} onChange={event => update('maxPrice', event.target.value)} className="field-input" placeholder="5000000" /></Field>
      <Field label="Minimal daraja"><input type="number" value={draft.minLevel} onChange={event => update('minLevel', event.target.value)} className="field-input" placeholder="1" /></Field>
      <Field label="Maksimal daraja"><input type="number" value={draft.maxLevel} onChange={event => update('maxLevel', event.target.value)} className="field-input" placeholder="100" /></Field>
      <Field label="Mintaqa"><select value={draft.region} onChange={event => update('region', event.target.value)} className="field-input"><option value="">Barcha mintaqalar</option><option value="KRJP">KRJP</option><option value="EU">EU</option><option value="ME">ME</option><option value="SEA">SEA</option><option value="NA">NA</option></select></Field>
      <Field label="Toifa"><select value={draft.category} onChange={event => update('category', event.target.value)} className="field-input"><option value="all">Barcha toifalar</option><option value="pro">Pro / X-Suit</option><option value="conqueror">Conqueror tarixi</option><option value="classic">Classic / oddiy</option></select></Field>
      <Field label="Minimal K/D"><input type="number" step="0.1" value={draft.minKd} onChange={event => update('minKd', event.target.value)} className="field-input" placeholder="3.5" /></Field>
      <Field label="Minimal win rate (%)"><input type="number" step="1" value={draft.minWinRate} onChange={event => update('minWinRate', event.target.value)} className="field-input" placeholder="15" /></Field>
      <Field label="Saralash"><select value={draft.sortBy} onChange={event => update('sortBy', event.target.value)} className="field-input">{SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <div className="sm:col-span-2 lg:col-span-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Maxsus skinlar</span><div className="mobile-scroll-row gap-2 pb-1">{['M416 Glacier', 'X-Suit', 'Gun Lab', 'Mythic outfit'].map(skin => <Chip key={skin} label={skin} active={draft.skins.includes(skin)} onToggle={() => toggleSkin(skin)} />)}</div></div>
      <div className="sm:col-span-2 lg:col-span-4"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Pro filtrlari</span><div className="mobile-scroll-row gap-2 pb-1">{[['glacier', 'Glacier bor'], ['xsuit', 'X-Suit bor'], ['conqueror', 'Conqueror tarixi'], ['old', 'Eski akkaunt'], ['verified', 'Verifikatsiyalangan sotuvchi'], ['media', 'Rasm/video mavjud']].map(([key, label]) => <Chip key={key} label={label} active={advanced.includes(key)} onToggle={() => toggleAdvanced(key)} />)}</div></div>
    </div>
  );
  return (
    <section className="rounded-2xl border border-white/[0.09] bg-[#0e1013] p-3 shadow-[0_18px_50px_rgba(0,0,0,.18)]">
      <div className="flex flex-col gap-3 sm:flex-row lg:flex-row">
        <div className="relative flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 focus-within:border-amber-400/50"><Search className="h-4 w-4 shrink-0 text-white/35" /><input value={draft.search} onFocus={() => setShowSuggestions(true)} onChange={event => { setShowSuggestions(true); update('search', event.target.value); }} placeholder="Akkaunt ID, skin yoki o'yinchi nomini qidiring..." className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/30 sm:text-sm" />{showSuggestions && draft.search.trim().length >= 2 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-amber-400/20 bg-[#14161a] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.55)]">{suggestionQuery.isFetching ? <div className="px-3 py-3 text-xs text-white/45">Tavsiya qidirilmoqda...</div> : suggestions.length ? suggestions.map(suggestion => <button key={`${suggestion.type}-${suggestion.value}`} type="button" onMouseDown={event => event.preventDefault()} onClick={() => applySuggestion(suggestion)} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-amber-400/10"><span className="flex items-center gap-2 text-sm font-semibold text-white/80"><Sparkles className="h-3.5 w-3.5 text-amber-200" />{suggestion.label}</span><span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">{suggestion.type}</span></button>) : <div className="px-3 py-3 text-xs text-white/45">Mos tavsiya topilmadi. Filtrlarni sinab ko‘ring.</div>}</div>}</div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${showFilters ? 'border-amber-300/50 bg-amber-400/10 text-amber-100' : 'border-white/10 bg-white/[0.03] text-white/65 hover:text-white'}`}><Filter className="h-4 w-4" />Filtrlar{activeFilterCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] text-black">{activeFilterCount}</span>}<ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} /></button>
      </div>
      {showFilters && <><button type="button" aria-label="Filtr oynasini yopish" onClick={() => setShowFilters(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] sm:hidden" /><div className="fixed inset-x-0 bottom-0 z-50 max-h-[84vh] overflow-y-auto rounded-t-[28px] border-t border-amber-400/25 bg-[#0d0f12] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-30px_90px_rgba(0,0,0,.6)] sm:static sm:mt-3 sm:max-h-none sm:overflow-visible sm:rounded-none sm:border-0 sm:border-t sm:border-white/[0.08] sm:bg-transparent sm:p-0 sm:pt-3 sm:shadow-none"><div className="mx-auto mb-4 flex max-w-sm items-center justify-between sm:hidden"><div><p className="text-sm font-black text-white">Qidiruv filtrlari</p><p className="mt-1 text-[11px] text-white/40">Kerakli akkauntni tezroq toping</p></div><button type="button" onClick={() => setShowFilters(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60" aria-label="Yopish"><X className="h-4 w-4" /></button></div>{filterContent}<PrimaryButton onClick={() => setShowFilters(false)} className="mt-4 w-full sm:hidden">Filtrlarni qo‘llash <Check className="h-4 w-4" /></PrimaryButton></div></>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</span>{children}</label>;
}

function EditField({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className ?? ''}`}><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>{children}{error && <span role="alert" className="mt-1 block text-[11px] font-semibold leading-4 text-amber-100">{error}</span>}</label>;
}

function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? 'border-amber-300/60 bg-amber-400/15 text-amber-100' : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'}`}>{active && <Check className="mr-1 inline h-3 w-3" />}{label}</button>;
}

const BATTLE_BACKDROPS = ['/assets/pubg-bg-1.jpg', '/assets/pubg-bg-2.jpg', '/assets/pubg-bg-3.jpg'];

/** Jonli PUBG orqa fon: 3 ta kinematik kadr Ken Burns effekti bilan almashib turadi. */
function BattleBackdrop() {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setInterval(() => setIndex(value => (value + 1) % BATTLE_BACKDROPS.length), 9000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BATTLE_BACKDROPS.map((src, i) => (
        <img loading="lazy" decoding="async"
          key={src}
          src={src}
          alt=""
          className={`pubg-kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ${i === index ? 'opacity-[0.28]' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,.10),transparent_55%),linear-gradient(180deg,rgba(8,9,11,.72),rgba(8,9,11,.94))]" />
    </div>
  );
}

/** Animated battlefield layer: muzzle flashes, tracer rounds and rising embers. */
function BattleEffects() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="inferno-muzzle absolute left-[18%] top-[38%] h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(255,196,120,.95),rgba(245,197,66,.35),transparent_70%)] blur-[2px]" />
      <span className="inferno-muzzle absolute right-[24%] top-[52%] h-8 w-8 rounded-full bg-[radial-gradient(circle,rgba(255,214,150,.9),rgba(245,197,66,.3),transparent_70%)] blur-[2px]" style={{ animationDelay: '1.4s' }} />
      <span className="inferno-tracer absolute left-[20%] top-[41%] h-[2px] w-24 rounded-full bg-gradient-to-r from-transparent via-amber-200 to-amber-400" />
      <span className="inferno-tracer absolute right-[14%] top-[58%] h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-amber-100 to-amber-400" style={{ animationDelay: '1.1s' }} />
      {[8, 26, 44, 62, 78, 92].map((left, index) => (
        <span key={left} className="inferno-ember absolute bottom-0 h-1.5 w-1.5 rounded-full bg-amber-300/70 blur-[1px]" style={{ left: `${left}%`, animationDelay: `${index * 0.9}s` }} />
      ))}
    </div>
  );
}

function Hero({ onExplore, onSell }: { onExplore: () => void; onSell: () => void }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-amber-400/20 bg-[#111316] shadow-[0_30px_100px_rgba(0,0,0,.3)]">
      <img loading="lazy" decoding="async" src={HERO_IMAGE} alt="Inferno Stealth" className="pubg-parallax absolute inset-0 -z-20 h-full w-full img-live object-cover opacity-60" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_30%,rgba(245,197,66,.26),transparent_38%),linear-gradient(90deg,#111316_15%,rgba(17,19,22,.9)_44%,rgba(17,19,22,.35))]" />
      <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <BattleEffects />
      <div className="grid min-h-[300px] items-end gap-6 p-4 sm:min-h-[380px] sm:p-8 md:p-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div className="max-w-2xl">
          <StatusPill><Flame className="h-3 w-3" />INFERNO STEALTH MARKET</StatusPill>
          <h1 className="mt-4 max-w-xl font-display text-2xl sm:text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">PUBG akkauntingiz uchun <span className="text-amber-300 [text-shadow:0_0_30px_rgba(245,197,66,.35)]">xavfsiz bozor.</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/55 sm:text-base sm:leading-7">Akkauntlarni to'liq ma'lumot, rasm va video bilan solishtiring. Kafolatli savdo jarayoni orqali ishonch bilan xarid qiling yoki o'z e'loningizni joylang.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3"><PrimaryButton onClick={onExplore} className="w-full sm:w-auto">Akkauntlarni ko'rish <ArrowRight className="h-4 w-4" /></PrimaryButton><PrimaryButton variant="ghost" onClick={onSell} className="w-full sm:w-auto"><Plus className="h-4 w-4" />Akkaunt sotish</PrimaryButton></div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/45"><span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-300" />Admin nazorati</span><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-amber-300" />Kafolatli savdo</span><span className="inline-flex items-center gap-1.5"><ImagePlus className="h-3.5 w-3.5 text-amber-300" />Rasm + video</span></div>
        </div>
        <div className="hidden lg:block">
          <div className="ml-auto max-w-sm rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Tanlangan e'lon</span><StatusPill tone="green"><Check className="h-3 w-3" />Tekshiruvda</StatusPill></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10"><img src={CARD_IMAGE} alt="Tanlangan akkaunt" loading="lazy" className="h-44 w-full img-live object-cover" /></div>
            <div className="mt-4 flex items-end justify-between"><div><span className="block text-xs font-bold text-white">Inferno Warrior</span><span className="mt-1 block text-[11px] text-white/40">LVL 78 • Conqueror</span></div><span className="font-display text-lg font-black text-amber-200">1 499 000 <span className="font-sans text-[10px]">so'm</span></span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3"><Stat label="K/D" value="5.32" /><Stat label="Win rate" value="62.7%" /><Stat label="Region" value="KRJP" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const featuredQuery = trpc.accounts.search.useQuery({ limit: 8, offset: 0 }, { staleTime: 20_000, refetchOnWindowFocus: false });
  const featured = (featuredQuery.data ?? []).map(normalizeAccount);
  return (
    <main className="space-y-5 pb-2">
      <LiveTicker />
      <Hero onExplore={() => onNavigate('/accounts')} onSell={() => onNavigate('/sell')} />
      <TrustStrip />
      <HypeDeck />
      <TopSellersBoard limit={5} />
      <div className="hidden sm:block"><SellerLeaderboard /></div>
      <section>
        <SectionHeading eyebrow="Bozor" title="Tanlangan akkauntlar" actionLabel="Barchasi" onAction={() => onNavigate('/accounts')} />
        {featuredQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map(i => <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />)}</div>
        ) : featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300/25 bg-[#0e1013] p-4 sm:p-5 sm:p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-amber-200" />
            <h3 className="mt-3 font-display text-lg font-black text-white">Bozor hozircha bo‘sh</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/40">Faqat haqiqiy sotuvchilar e’lonlari chiqadi.</p>
            <PrimaryButton className="mt-4" onClick={() => onNavigate('/sell')}><Plus className="h-4 w-4" />Birinchi e’lonni joylash</PrimaryButton>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {featured.map(item => <ListingCard key={item.id} item={item} onOpen={id => onNavigate(`/account/${id}`)} showcase />)}
            </div>
            <button onClick={() => onNavigate('/accounts')} className="pubg-press mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 text-sm font-black text-black active:scale-[.98]">
              Bozorga kirish<ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, title, actionLabel, onAction }: { eyebrow: string; title: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">{eyebrow}</span><h2 className="mt-2 font-display text-xl sm:text-2xl font-black text-white">{title}</h2></div>{actionLabel && <button onClick={onAction} className="inline-flex items-center gap-1 text-xs font-bold text-white/45 transition hover:text-amber-200">{actionLabel}<ChevronRight className="h-4 w-4" /></button>}</div>;
}

function AccountsPage({ onOpen }: { onOpen: (id: number) => void }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimer = React.useRef<number | null>(null);
  const [filters, setFilters] = useState<AccountFilters>({});
  const input = useMemo(() => ({ ...filters, limit: 40, offset: 0 }), [filters]);
  const accountsQuery = trpc.accounts.search.useQuery(input, { staleTime: 20_000, refetchOnWindowFocus: false });
  const remoteListings = (accountsQuery.data ?? []).map(normalizeAccount);
  const listings = remoteListings;
  const changeView = (nextView: 'grid' | 'list') => {
    if (nextView === view || isSwitching) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setView(nextView);
      return;
    }
    setIsSwitching(true);
    switchTimer.current = window.setTimeout(() => {
      setView(nextView);
      window.requestAnimationFrame(() => setIsSwitching(false));
    }, 90);
  };
  useEffect(() => () => {
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
  }, []);
  return <main className="space-y-4 pb-24 lg:pb-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Inferno market</span><h1 className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">Akkauntlar bozori</h1><p className="mt-1 text-xs text-white/45 sm:text-sm">Daraja, mintaqa, skin va narx bo'yicha kerakli akkauntni toping.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1" aria-label="Bozor ko‘rinishini tanlang"><button type="button" disabled={isSwitching} onClick={() => changeView('grid')} className={`grid h-9 w-9 place-items-center rounded-lg transition-all duration-200 active:scale-90 disabled:cursor-wait ${view === 'grid' ? 'bg-amber-400 text-black shadow-[0_0_18px_rgba(245,197,66,.24)]' : 'text-white/45 hover:bg-white/[0.05] hover:text-white'}`} aria-label="3 ta ustunli ko'rinish" aria-pressed={view === 'grid'} title="3 ta ustunli ko'rinish"><Grid2X2 className="h-4 w-4" /></button><button type="button" disabled={isSwitching} onClick={() => changeView('list')} className={`grid h-9 w-9 place-items-center rounded-lg transition-all duration-200 active:scale-90 disabled:cursor-wait ${view === 'list' ? 'bg-amber-400 text-black shadow-[0_0_18px_rgba(245,197,66,.24)]' : 'text-white/45 hover:bg-white/[0.05] hover:text-white'}`} aria-label="5 qatorli ixcham ko'rinish" aria-pressed={view === 'list'} title="5 qatorli ixcham ko'rinish"><LayoutList className="h-4 w-4" /></button></div></div><SearchPanel onFilters={setFilters} /><PullToRefresh onRefresh={() => accountsQuery.refetch()} refreshing={accountsQuery.isFetching && !accountsQuery.isLoading} skeleton={view === 'grid' ? <ListingGridSkeleton count={9} /> : <ListRowSkeleton count={6} />}>{accountsQuery.isLoading ? (view === 'grid' ? <ListingGridSkeleton count={9} /> : <ListRowSkeleton count={6} />) : listings.length === 0 ? <EmptyState title="Akkaunt topilmadi" text="Filtrlarni o'zgartirib ko'ring yoki keyinroq qaytib ko'ring." /> : <AnimatePresence mode="popLayout"><motion.div variants={listContainer} initial="hidden" animate="show" aria-busy={isSwitching} className={marketplaceLayoutClass(view, isSwitching)}>{listings.map(item => <motion.div layout key={item.id} variants={listItem} exit={{ opacity: 0, scale: .96 }}>{view === 'grid' ? <ListingCard item={item} onOpen={onOpen} /> : <ListListing item={item} onOpen={onOpen} />}</motion.div>)}</motion.div></AnimatePresence>}</PullToRefresh></main>;
}

function CompactInfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 border-t border-white/[0.07] px-3 py-2.5"><span className="pt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">{label}</span><div className="min-w-0 text-[11px] font-semibold leading-5 text-white/75">{children}</div></div>;
}

function ListListing({ item, onOpen }: { item: Listing; onOpen: (id: number) => void }) {
  const skins = item.skins.length ? item.skins.join(' • ') : 'Skin ma’lumoti kiritilmagan';
  return <article className="overflow-hidden rounded-2xl border border-amber-400/15 bg-[#101215] shadow-[0_12px_32px_rgba(0,0,0,.18)]">
    <div className="grid grid-cols-[48px_minmax(0,1fr)_36px] items-center gap-2.5 p-2.5">
      <img loading="lazy" decoding="async" src={item.image} alt={item.playerName} className="h-12 w-12 rounded-xl img-live object-cover ring-1 ring-white/10" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2"><h3 className="truncate font-display text-sm font-black text-white">{item.playerName}</h3><StatusPill>{item.tag}</StatusPill></div>
        <p className="mt-1 truncate text-[10px] text-white/40">Akkaunt #{item.id} • {item.region}</p>
      </div>
      <FavoriteButton accountId={item.id} compact />
    </div>
    <CompactInfoRow label="Daraja"><span className="text-[9px] font-black text-white">LVL {item.level}</span><span className="mx-1.5 text-white/25">•</span>{item.rank}<span className="mx-1.5 text-white/25">•</span>{item.region}</CompactInfoRow>
    <CompactInfoRow label="Statistika"><span className="text-amber-100">K/D {item.kd}</span><span className="mx-2 text-white/20">|</span><span className="text-emerald-200">Win rate {item.winRate}</span><span className="mx-2 text-white/20">|</span>{item.matches} ta o‘yin</CompactInfoRow>
    <CompactInfoRow label="Skinlar"><span className="break-words text-white/70">{skins}</span></CompactInfoRow>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-white/[0.07] px-3 py-2.5"><div><span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">Narx</span><span className="font-display text-base font-black text-amber-200">{uzNumber(item.price)} <span className="font-sans text-[10px]">so'm</span></span></div><PrimaryButton onClick={() => onOpen(item.id)} className="min-h-9 px-3 text-xs">Ko‘rish <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton></div>
  </article>;
}

function DetailPage({ id, onBack, onNavigate }: { id: number; onBack: () => void; onNavigate: (path: string) => void }) {
  const accountQuery = trpc.accounts.getById.useQuery(id, { staleTime: 30_000, refetchOnWindowFocus: false });
  const recordView = trpc.accounts.recordView.useMutation();
  useEffect(() => {
    if (accountQuery.data?.id) recordView.mutate({ accountId: accountQuery.data.id });
  }, [accountQuery.data?.id]);
  const item: Listing = accountQuery.data ? normalizeAccount(accountQuery.data) : ({ id, playerName: 'Akkaunt yuklanmoqda...', level: 0, rank: '—', price: 0, region: '—', kd: '0', winRate: '0%', matches: '0', skins: [], image: CARD_IMAGE, tag: 'YUKLANMOQDA', description: 'Ma’lumot yuklanmoqda yoki e’lon o‘chirilgan.' } as Listing);
  const gallery: string[] = item.galleryUrls?.length ? item.galleryUrls : [item.image, CARD_IMAGE, PORTRAIT_IMAGE, HERO_IMAGE];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? item.image);
  const mediaItems: MediaItem[] = React.useMemo(() => {
    const list: MediaItem[] = gallery.map(url => ({ type: 'image' as const, url, alt: item.playerName }));
    if (item.videoUrl) list.push({ type: 'video' as const, url: item.videoUrl, alt: item.playerName });
    return list;
  }, [gallery, item.videoUrl, item.playerName]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const utils = trpc.useUtils();
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<null | { code: string; discountPercent: number; discountAmount: number }>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const discountedPrice = promo ? Math.max(0, item.price - Math.round((item.price * promo.discountPercent) / 100) - promo.discountAmount) : item.price;
  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || promoChecking) return;
    setPromoChecking(true);
    try {
      const result = await utils.promo.validate.fetch({ code });
      setPromo(result);
      haptic('success');
      toast.success('Promo-kod qabul qilindi');
    } catch (error: unknown) {
      setPromo(null);
      haptic('error');
      toast.error(error instanceof Error ? error.message : 'Promo-kod ishlamadi');
    } finally {
      setPromoChecking(false);
    }
  };
  const [optimisticSold, setOptimisticSold] = useState(false);
  const rollback = React.useRef<null | (() => void)>(null);
  const applyOptimistic = async () => {
    await utils.accounts.getById.cancel(id);
    const previous = utils.accounts.getById.getData(id);
    setOptimisticSold(true);
    if (previous) utils.accounts.getById.setData(id, { ...(previous as any), status: 'sold' } as any);
    rollback.current = () => {
      setOptimisticSold(false);
      if (previous) utils.accounts.getById.setData(id, previous);
    };
  };
  const revertOptimistic = () => { rollback.current?.(); rollback.current = null; };
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      rollback.current = null;
      setBuying(false);
      setPurchased(true);
      haptic('success');
      utils.accounts.search.invalidate();
      window.setTimeout(() => { setConfirmOpen(false); setPurchased(false); setOptimisticSold(false); onNavigate('/orders'); }, 1600);
    },
    onError: error => {
      setBuying(false);
      setConfirmOpen(false);
      haptic('error');
      revertOptimistic();
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const message = offline
        ? 'Internet aloqasi uzildi. Buyurtma yuborilmadi.'
        : /login|auth|kir/i.test(error?.message ?? '')
          ? "Kirishdan so'ng buyurtma berish mumkin."
          : (error?.message || 'Server buyurtmani qabul qilmadi.');
      toast.error(message, { description: 'Holat orqaga qaytarildi.', action: { label: 'Qayta urinish', onClick: () => confirmBuy() } });
    },
  });
  const openChat = trpc.chat.open.useMutation({ onSuccess: thread => { telegramHaptic('success'); onNavigate(`/chat/${thread?.id}`); }, onError: error => toast.error(error.message) });
  const handleBuy = () => { haptic('medium'); setConfirmOpen(true); };
  const confirmBuy = () => { if (buying) return; setBuying(true); setConfirmOpen(true); void applyOptimistic().then(() => createOrder.mutate({ accountId: item.id, promoCode: promo?.code })); };
  return <main className="space-y-4 px-1 pro-sticky-space sm:px-0 lg:pb-6"><button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Bozorga qaytish</button><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-3"><div className="relative overflow-hidden rounded-2xl bg-black"><button type="button" onClick={() => setViewerIndex(Math.max(0, gallery.indexOf(activeImage)))} className="group block w-full text-left" aria-label="Galereyani katta ko‘rish"><motion.img layoutId={`acc-image-${item.id}`} src={activeImage} alt={item.playerName} className="aspect-video w-full img-live object-cover transition duration-300 group-active:scale-[.99]" /><span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-2 text-[10px] font-bold text-white/80 backdrop-blur"><Grid2X2 className="h-3.5 w-3.5 text-amber-200" />Katta ko‘rish</span></button>{item.videoUrl && <button onClick={() => setViewerIndex(gallery.length)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-bold text-white backdrop-blur active:scale-95"><Play className="h-3.5 w-3.5 text-amber-200" />Videoni ko‘rish</button>}</div><div className="mt-3 grid grid-cols-4 gap-2">{gallery.map((image, index) => <button key={`${image}-${index}`} onClick={() => setActiveImage(image)} className={`min-h-16 overflow-hidden rounded-xl border ${activeImage === image ? 'border-amber-300' : 'border-white/10'}`}><img loading="lazy" decoding="async" src={image} alt={`${item.playerName} galereyasi ${index + 1}`} className="aspect-square w-full img-live object-cover" /></button>)}</div>{viewerIndex !== null && <MediaViewer items={mediaItems} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} title={item.playerName} />}</section><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><StatusPill tone="green"><BadgeCheck className="h-3 w-3" />Admin ko'rigidan o'tadi</StatusPill><h1 className="mt-3 font-display text-2xl font-black text-white sm:text-3xl">{item.playerName}</h1><p className="mt-1 text-xs text-white/45">LVL {item.level} • {item.rank} • {item.region}</p></div><FavoriteButton accountId={item.id} /></div><ExpandableText text={item.description} className="mt-4 text-xs leading-6 text-white/55 sm:text-sm" /><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['K/D', item.kd], ['Win rate', item.winRate], ['Jami o‘yin', item.matches], ['Region', item.region]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</span><span className="mt-1 block text-base font-black text-white">{value}</span></div>)}</div><div className="mt-5"><h2 className="font-display text-xs font-black text-white uppercase tracking-wider">Inventar va skinlar</h2><div className="mt-2 flex flex-wrap gap-1.5">{item.skins.map(skin => <span key={skin} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-50"><Sparkles className="h-3 w-3 text-amber-200" />{skin}</span>)}</div></div><div className="mt-6 border-t border-white/[0.08] pt-4"><div className="flex items-end justify-between gap-3"><div><span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Sotuv narxi</span><motion.span layoutId={`acc-price-${item.id}`} className="price-flame mt-1 inline-block px-2 py-1 font-display text-xl font-black text-amber-200 sm:text-2xl">{uzNumber(item.price)} <span className="font-sans text-xs">so'm</span></motion.span></div><span className="text-right text-[10px] text-white/35">To'lov kafolatda<br />saqlanadi</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><PrimaryButton onClick={handleBuy} className="btn-shine w-full">{buying ? 'Buyurtma berilmoqda...' : optimisticSold ? 'Band qilindi' : 'Kafolatli sotib olish'} <LockKeyhole className="h-4 w-4" /></PrimaryButton><PrimaryButton variant="ghost" onClick={() => { const text = `${item.playerName} — ${uzNumber(item.price)} so‘m. Inferno Stealth’da ko‘ring.`; telegramHaptic('light'); shareTelegramText(text, accountShareUrl(item.id)); }} className="w-full"><Send className="h-4 w-4" />Ulashish</PrimaryButton></div><div className="mt-2 grid grid-cols-2 gap-2"><PrimaryButton variant="soft" disabled={openChat.isPending} onClick={() => openChat.mutate({ accountId: item.id })} className="w-full"><MessageCircle className="h-4 w-4" />{openChat.isPending ? 'Chat...' : 'Sotuvchiga yozish'}</PrimaryButton><PrimaryButton variant="ghost" onClick={onBack} className="w-full"><ArrowLeft className="h-4 w-4" />Qaytish</PrimaryButton></div><div className="mt-3 space-y-2"><HoldButton accountId={item.id} /><PriceWatchButton accountId={item.id} currentPrice={item.price} /></div></div></section></div><ProDetailPanel accountId={item.id} sellerId={item.sellerId} /><SellerTrustCard sellerId={item.sellerId} /><TrustStrip /><StickyBuyBar price={`${uzNumber(item.price)} so'm`} loading={buying} onBuy={handleBuy} /><BottomSheet open={confirmOpen} onClose={() => { if (!buying) setConfirmOpen(false); }} title={purchased ? undefined : 'Kafolatli sotib olish'}>{purchased ? <SuccessBurst title="Buyurtma yaratildi" text="Kafolatli savdo bosqichi boshlandi." /> : <div className="space-y-4 pb-2"><div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3"><img loading="lazy" decoding="async" src={item.image} alt={item.playerName} className="h-14 w-14 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-sm font-black text-white">{item.playerName}</p><p className="mt-0.5 text-[11px] text-white/45">LVL {item.level} • {item.region}</p></div><span className="ml-auto shrink-0 text-right font-display text-base font-black text-amber-200">{promo && <span className="mr-2 text-xs font-semibold text-white/35 line-through">{uzNumber(item.price)}</span>}{uzNumber(discountedPrice)}</span></div><div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider text-white/35">Promo-kod (ixtiyoriy)</label><div className="flex gap-2"><input value={promoInput} onChange={event => { setPromoInput(event.target.value); setPromo(null); }} className="field-input flex-1" placeholder="INFERNO10" /><PrimaryButton variant="soft" disabled={promoChecking || !promoInput.trim()} onClick={applyPromo} className="shrink-0">{promoChecking ? 'Tekshirilmoqda...' : promo ? 'Qabul qilindi ✓' : 'Qo‘llash'}</PrimaryButton></div>{promo && <p className="text-[11px] font-semibold text-emerald-300">Chegirma qo‘llandi — to‘lov: {uzNumber(discountedPrice)} so‘m</p>}</div><p className="text-xs leading-5 text-white/45">To‘lov kafolat (escrow) hisobida saqlanadi. Akkauntni tekshirib tasdiqlaganingizdan so‘ng sotuvchiga o‘tkaziladi.</p><div className="grid grid-cols-2 gap-2"><PrimaryButton variant="ghost" onClick={() => setConfirmOpen(false)} className="w-full">Bekor qilish</PrimaryButton><PrimaryButton onClick={confirmBuy} disabled={buying} className="w-full">{buying ? 'Yuborilmoqda...' : 'Tasdiqlash'}</PrimaryButton></div></div>}</BottomSheet></main>;
}

export const SELLER_MEDIA_MAX_FILES = 12;
export const SELLER_MEDIA_MAX_BYTES = 200 * 1024 * 1024;
export const SELLER_DIRECT_UPLOAD_MAX_BYTES = 40 * 1024 * 1024;
export const SELLER_VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const SELLER_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'] as const;

export type SellerFormState = {
  accountId: string;
  playerName: string;
  level: string;
  region: string;
  kdRatio: string;
  winRate: string;
  totalMatches: string;
  headshotPercentage: string;
  ucBalance: string;
  outfitCount: string;
  gunSkinCount: string;
  vehicleCount: string;
  accountCreatedYear: string;
  hasConquerorHistory: boolean;
  hasXSuit: boolean;
  price: string;
  description: string;
  skins: string;
};

export function createEmptySellerForm(): SellerFormState {
  return { accountId: '', playerName: '', level: '', region: 'KRJP', kdRatio: '', winRate: '', totalMatches: '', headshotPercentage: '', ucBalance: '', outfitCount: '', gunSkinCount: '', vehicleCount: '', accountCreatedYear: '2024', hasConquerorHistory: false, hasXSuit: false, price: '', description: '', skins: '' };
}

export function validateSellerForm(form: SellerFormState): string | null {
  if (form.accountId.trim().length < 2) return 'PUBG akkaunt ID sini kiriting.';
  if (form.playerName.trim().length < 2) return 'O‘yinchi nomi kamida 2 ta belgidan iborat bo‘lsin.';
  const level = Number(form.level);
  if (!Number.isInteger(level) || level < 1 || level > 100) return 'Daraja 1 dan 100 gacha bo‘lishi kerak.';
  if (form.region.trim().length < 2) return 'Mintaqani tanlang.';
  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return 'Narx 0 yoki undan katta bo‘lishi kerak.';
  const year = Number(form.accountCreatedYear);
  if (!Number.isInteger(year) || year < 2008 || year > 2030) return 'Akkaunt ochilgan yil 2008–2030 oralig‘ida bo‘lishi kerak.';
  if (form.description.length > 5000) return 'Tavsif 5000 belgidan oshmasin.';
  return null;
}

export function buildSellerAccountPayload(form: SellerFormState, uploaded: Array<{ url: string; type: string }>) {
  const validationError = validateSellerForm(form);
  if (validationError) throw new Error(validationError);
  const images = uploaded.filter(file => file.type.startsWith('image/')).map(file => file.url);
  const video = uploaded.find(file => file.type.startsWith('video/'))?.url;
  return {
    accountId: form.accountId.trim(),
    playerName: form.playerName.trim(),
    level: Number(form.level),
    region: form.region.trim(),
    kdRatio: Number(form.kdRatio || 0),
    winRate: Number(form.winRate || 0),
    totalMatches: Number(form.totalMatches || 0),
    headshotPercentage: Number(form.headshotPercentage || 0),
    ucBalance: Number(form.ucBalance || 0),
    outfitCount: Number(form.outfitCount || 0),
    gunSkinCount: Number(form.gunSkinCount || 0),
    vehicleCount: Number(form.vehicleCount || 0),
    hasConquerorHistory: form.hasConquerorHistory,
    hasXSuit: form.hasXSuit,
    accountCreatedYear: Number(form.accountCreatedYear || 2024),
    featuredSkins: form.skins.split(',').map(skin => skin.trim()).filter(Boolean),
    price: Number(form.price),
    description: form.description.trim(),
    thumbnailUrl: images[0],
    galleryUrls: images,
    videoUrl: video,
  };
}


export function validateSellerMediaFiles(files: Array<Pick<File, 'type' | 'size'>>): string | null {
  if (files.length > SELLER_MEDIA_MAX_FILES) return `Ko‘pi bilan ${SELLER_MEDIA_MAX_FILES} ta rasm yoki video tanlash mumkin.`;
  if (files.some(file => file.type.startsWith('image/') && file.size > SELLER_MEDIA_MAX_BYTES)) return 'Har bir rasm 200 MB dan kichik bo‘lishi kerak.';
  if (files.some(file => file.type.startsWith('video/') && file.size > SELLER_VIDEO_MAX_BYTES)) return 'Video 200 MB dan kichik bo‘lishi kerak.';
  if (files.some(file => !file.type.startsWith('image/') && !SELLER_MEDIA_TYPES.includes(file.type as typeof SELLER_MEDIA_TYPES[number]))) return 'Faqat rasm (JPG, PNG, WEBP, HEIC) yoki video (MP4, MOV, WEBM) fayllari qabul qilinadi.';
  return null;
}

export function sellerUploadProgressLabel(completed: number, total: number): string {
  return total > 0 ? `Media yuklanmoqda: ${Math.min(completed, total)}/${total}` : 'Media tayyorlanmoqda...';
}

export function SellerUploadProgress({ completed, total }: { completed: number; total: number }) {
  const percent = total ? Math.round((Math.min(completed, total) / total) * 100) : 12;
  return <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.07] p-3"><div className="flex items-center justify-between gap-3 text-xs font-bold text-amber-50"><span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-100/30 border-t-amber-100" />{sellerUploadProgressLabel(completed, total)}</span><span>{total ? `${percent}%` : '...'}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-200 transition-[width] duration-300" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-[11px] text-white/45">Oynani yopmang — fayllar xavfsiz S3 xotirasiga yuborilmoqda.</p></div>;
}

export function SellerMediaPreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  React.useEffect(() => {
    let objectUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(file);
    } else if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
    return () => {
      if (objectUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
    <div className="relative aspect-video bg-black/40">
      {previewUrl && file.type.startsWith('image/') ? <img loading="lazy" decoding="async" src={previewUrl} alt={file.name} className="h-full w-full img-live object-cover" /> : previewUrl && file.type.startsWith('video/') ? <video src={previewUrl} aria-label={file.name} muted playsInline className="h-full w-full img-live object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold text-white/35">PREVIEW TAYYORLANMOQDA</div>}
      <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/75">{file.type.startsWith('video/') ? 'Video' : 'Rasm'}</span>
    </div>
    <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-[10px]">
      <span className="min-w-0 truncate font-bold text-white/75">{file.name}</span>
      <span className="shrink-0 text-white/35">{file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}</span>
    </div>
  </div>;
}

export function SellPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [form, setForm] = useState<SellerFormState>(() => createEmptySellerForm());
  const [formError, setFormError] = useState<string | null>(null);
  const uploadMutation = trpc.media.upload.useMutation();
  const presignMutation = trpc.media.presignUpload.useMutation();
  const registerMediaMutation = (trpc as any).mediaModeration?.register?.useMutation?.() ?? null;
  const [videoPercent, setVideoPercent] = useState(0);
  const createMutation = trpc.accounts.create.useMutation();
  const setField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [key]: event.target.value }));
  const toggleFlag = (key: 'hasConquerorHistory' | 'hasXSuit') => (event: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: event.target.checked }));
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.currentTarget.value = '';
    const validationError = validateSellerMediaFiles(selected);
    if (validationError) {
      setMediaError(validationError);
      toast.error(validationError);
      return;
    }
    setMediaError(null);
    setFiles(prev => {
      const merged = [...prev, ...selected].slice(0, SELLER_MEDIA_MAX_FILES);
      setUploadProgress({ completed: 0, total: merged.length });
      return merged;
    });
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
    setMediaError(null);
    setFormError(null);
    setUploadProgress({ completed: 0, total: 0 });
    setVideoPercent(0);
    setForm(createEmptySellerForm());
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (uploading || createMutation.isPending) return;
    if (!isAuthenticated) { toast.info('E’lon berish uchun avval tizimga kiring.'); return; }
    setMediaError(null);
    setFormError(null);
    const validationError = validateSellerForm(form);
    if (validationError) { setFormError(validationError); toast.error(validationError); return; }
    try {
      setUploading(true);
      setUploadProgress({ completed: 0, total: files.length });
      const uploaded: { url: string; type: string }[] = [];
      for (const original of files) {
        const validationError = validateSellerMediaFiles([original]) ?? validateMediaFile(original);
        if (validationError) {
          setMediaError(validationError);
          throw new Error(validationError);
        }
        // Rasmlar yuklashdan oldin brauzerda siqiladi (video siqilmaydi).
        const { file, originalSize, compressed } = await compressImage(original);
        if (compressed) toast.info(`${original.name} siqildi: ${(originalSize / 1048576).toFixed(1)} MB → ${(file.size / 1048576).toFixed(1)} MB`);
        if (file.type.startsWith('image/') && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`"${original.name}" formatini brauzer o'qiy olmadi. Iltimos, rasmni JPG yoki PNG ko'rinishida saqlab qayta urinib ko'ring.`);
        }
        if (file.size > SELLER_DIRECT_UPLOAD_MAX_BYTES) {
          // Katta fayllar (200 MB gacha video) to‘g‘ridan-to‘g‘ri S3 ga yuboriladi.
          const presigned = await presignMutation.mutateAsync({ fileName: file.name, contentType: file.type as 'video/mp4' | 'video/webm' | 'video/quicktime' | 'image/jpeg' | 'image/png' | 'image/webp', size: file.size });
          setVideoPercent(0);
          const putFile = () => new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presigned.uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.timeout = 10 * 60 * 1000;
            xhr.upload.onprogress = event => { if (event.lengthComputable) setVideoPercent(Math.round((event.loaded / event.total) * 100)); };
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Fayl yuklanmadi (${xhr.status})`)));
            xhr.onerror = () => reject(new Error('Yuklashda tarmoq xatosi'));
            xhr.ontimeout = () => reject(new Error('Yuklash juda uzoq davom etdi'));
            xhr.send(file);
          });
          let directUploadOk = true;
          try {
            await putFile();
          } catch (uploadError) {
            // Bir marta qayta urinamiz (mobil tarmoq uzilishlari uchun).
            setVideoPercent(0);
            try {
              await putFile();
            } catch (retryError) {
              directUploadOk = false;
              if (file.size > SELLER_DIRECT_UPLOAD_MAX_BYTES) throw retryError;
            }
          }
          if (directUploadOk) {
            setVideoPercent(100);
            uploaded.push({ url: presigned.url, type: file.type });
          } else {
            // Zaxira yo'l: fayl server orqali (base64) yuklanadi.
            const fallback = await uploadMutation.mutateAsync({ fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm', dataBase64: await fileToBase64(file) });
            setVideoPercent(100);
            uploaded.push({ url: fallback.url, type: file.type });
          }
        } else {
          if (file.type.startsWith('video/')) setVideoPercent(10);
          const result = await uploadMutation.mutateAsync({ fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm' | 'video/quicktime', dataBase64: await fileToBase64(file) });
          if (file.type.startsWith('video/')) setVideoPercent(100);
          uploaded.push({ url: result.url, type: file.type });
        }
        const justUploaded = uploaded[uploaded.length - 1];
        if (justUploaded) {
          try {
            await registerMediaMutation?.mutateAsync({ url: justUploaded.url, contentType: file.type, sizeBytes: file.size, originalSizeBytes: originalSize });
          } catch (registerError) {
            console.warn('[media] Moderatsiya navbatiga yozib bo\u2018lmadi:', registerError);
          }
        }
        setUploadProgress(progress => ({ ...progress, completed: progress.completed + 1 }));
      }
      const images = uploaded.filter(file => file.type.startsWith('image/')).map(file => file.url);
      const video = uploaded.find(file => file.type.startsWith('video/'))?.url;
      await createMutation.mutateAsync(buildSellerAccountPayload(form, uploaded));
      setSubmitted(true);
      toast.success('E’lon admin tekshiruviga yuborildi. Tasdiqlangach bozorda ko‘rinadi.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E’lonni yuborishda xatolik yuz berdi.';
      setFormError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };
  if (!isAuthenticated) return <TelegramLoginGate title="Akkaunt sotish uchun Telegram orqali kiring" description="Profilingiz, media fayllaringiz va sotuvchi e’lonlaringiz xavfsiz Telegram sessiyasi bilan bog‘lanadi." />;
  if (submitted) return <main className="mx-auto max-w-2xl"><div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.06] p-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><TicketCheck className="h-8 w-8" /></span><h1 className="mt-5 font-display text-xl sm:text-2xl font-black text-white">E'lon bozorga joylandi</h1><p className="mt-3 text-sm leading-6 text-white/50">Media S3 xotirasiga saqlandi va akkaunt ma’lumotlari ommaviy bozorga chiqarildi. Profil bo‘limidan narx, tavsif va asosiy ma’lumotlarni tahrirlashingiz mumkin.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><PrimaryButton onClick={reset}>Yana e'lon berish</PrimaryButton><PrimaryButton variant="ghost" onClick={() => onNavigate('/accounts')}>Bozorga o'tish</PrimaryButton></div></div></main>;
  return <main className="space-y-4 pb-24 sm:space-y-6 lg:pb-6"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Sotuvchi markazi</span><h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">Akkaunt sotish</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Akkaunt haqida to‘liq ma’lumot va media qo‘shing. Rasm va videolar xavfsiz S3 xotirasiga yuboriladi.</p></div><div className="grid gap-6 xl:grid-cols-[1fr_.4fr]"><form onSubmit={submit} className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 md:p-7">{formError && <p role="alert" className="mb-4 rounded-xl border border-amber-300/25 bg-amber-400/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-amber-50">{formError}</p>}<div className="grid grid-cols-3 gap-2 sm:gap-3"><Field label="Akkaunt ID"><input required value={form.accountId} onChange={setField('accountId')} className="field-input" placeholder="PUBG ID" /></Field><Field label="O'yinchi nomi"><input required value={form.playerName} onChange={setField('playerName')} className="field-input" placeholder="O'yinchi nomi" /></Field><Field label="Daraja"><input required type="number" min="1" max="100" value={form.level} onChange={setField('level')} className="field-input" placeholder="75" /></Field><Field label="Mintaqa"><select value={form.region} onChange={setField('region')} className="field-input"><option>KRJP</option><option>EU</option><option>ME</option><option>SEA</option><option>NA</option></select></Field><Field label="K/D nisbati"><input type="number" step="0.01" value={form.kdRatio} onChange={setField('kdRatio')} className="field-input" placeholder="4.50" /></Field><Field label="G'alaba foizi"><input type="number" step="0.01" value={form.winRate} onChange={setField('winRate')} className="field-input" placeholder="55" /></Field><Field label="Jami o'yin"><input type="number" value={form.totalMatches} onChange={setField('totalMatches')} className="field-input" placeholder="1200" /></Field><Field label="Headshot foizi"><input type="number" step="0.01" value={form.headshotPercentage} onChange={setField('headshotPercentage')} className="field-input" placeholder="24" /></Field><Field label="UC balansi"><input type="number" value={form.ucBalance} onChange={setField('ucBalance')} className="field-input" placeholder="5200" /></Field><Field label="Kiyimlar soni"><input type="number" value={form.outfitCount} onChange={setField('outfitCount')} className="field-input" placeholder="128" /></Field><Field label="Qurol skinlari"><input type="number" value={form.gunSkinCount} onChange={setField('gunSkinCount')} className="field-input" placeholder="156" /></Field><Field label="Transport soni"><input type="number" value={form.vehicleCount} onChange={setField('vehicleCount')} className="field-input" placeholder="23" /></Field><Field label="Akkaunt ochilgan yil"><input type="number" min="2008" max="2030" value={form.accountCreatedYear} onChange={setField('accountCreatedYear')} className="field-input" placeholder="2021" /></Field><Field label="Narxi (so'm)"><input required type="number" min="0" value={form.price} onChange={setField('price')} className="field-input" placeholder="1000000" /></Field><Field label="Asosiy skinlar"><input value={form.skins} onChange={setField('skins')} className="field-input" placeholder="M416 Glacier, X-Suit" /></Field><div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/70"><input type="checkbox" checked={form.hasConquerorHistory} onChange={toggleFlag('hasConquerorHistory')} className="h-4 w-4 accent-amber-400" />Conqueror tarixi bor</label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/70"><input type="checkbox" checked={form.hasXSuit} onChange={toggleFlag('hasXSuit')} className="h-4 w-4 accent-amber-400" />X-Suit mavjud</label></div></div><div className="mt-4"><Field label="Batafsil tavsif"><textarea value={form.description} onChange={setField('description')} className="field-input min-h-32 resize-y" placeholder="Inventar, bog'langan platformalar, topshirish shartlari va boshqa ma'lumotlar..." /></Field></div><div className="mt-5"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Media fayllar</span><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300/30 bg-amber-400/[0.04] px-5 text-center transition hover:bg-amber-400/[0.08]"><Upload className="h-6 w-6 text-amber-200" /><span className="mt-3 text-sm font-bold text-white">Rasm va videolarni tanlang</span><span className="mt-1 text-xs text-white/40">Rasm va video 200 MB gacha (JPG, PNG, WEBP, MP4, MOV, WEBM)</span><input type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="hidden" /></label>{mediaError && <p role="alert" className="mt-2 rounded-lg border border-amber-300/25 bg-amber-400/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-amber-50">{mediaError}</p>}{uploading && <SellerUploadProgress completed={uploadProgress.completed} total={uploadProgress.total} />}{uploading && videoPercent > 0 && videoPercent < 100 && <div className="mt-2 rounded-xl border border-blood-400/30 bg-blood-500/[0.08] p-3"><div className="flex items-center justify-between text-xs font-bold text-white"><span>Video yuklanmoqda</span><span className="text-amber-200">{videoPercent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blood-500 to-amber-300 transition-[width] duration-200" style={{ width: `${videoPercent}%` }} /></div></div>}{files.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{files.map(file => <SellerMediaPreview key={`${file.name}-${file.size}`} file={file} />)}</div>}</div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><PrimaryButton variant="ghost" onClick={() => onNavigate('/accounts')}>Bekor qilish</PrimaryButton><PrimaryButton type="submit" disabled={uploading || createMutation.isPending}>{uploading ? 'Media yuklanmoqda...' : createMutation.isPending ? 'E’lon saqlanmoqda...' : <><TicketCheck className="h-4 w-4" />Bozorga joylash</>}</PrimaryButton></div></form><aside className="space-y-4"><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5"><Shield className="h-6 w-6 text-amber-200" /><h2 className="mt-4 font-display text-base font-black text-white">Yaxshi e'lon formulasi</h2><p className="mt-2 text-sm leading-6 text-white/50">Aniq statistika, inventar ro'yxati va sifatli media xaridor savollarini kamaytiradi.</p><div className="mt-4 space-y-2 text-xs text-white/55">{['Barcha maydonlarni to‘ldiring', 'Kamida 3 ta rasm qo‘shing', 'Video bo‘lsa, afzallik beradi', 'Login/parolni e’longa yozmang'].map(item => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-amber-200" />{item}</div>)}</div></div><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><h2 className="font-display text-base font-black text-white">Jarayon</h2><div className="mt-4 space-y-4">{[["01","E'lon yuboriladi"],["02","Bozorda darhol ko‘rinadi"],["03","Profil orqali tahrirlanadi"]].map(([num,label]) => <div key={num} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-xs font-black text-amber-200">{num}</span><span className="text-xs font-semibold text-white/65">{label}</span></div>)}</div></div></aside></div></main>;
}

function OrdersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const { isAuthenticated } = useAuth();
  const ordersQuery = trpc.orders.getUserOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const liveOrders = (ordersQuery.data ?? []).map(order => {
    const status = order.status === 'completed' ? 'Completed' : order.status === 'in_escrow' ? 'In Escrow' : 'Pending';
    const stage = order.escrowStage === 'buyer_confirmation' ? 3 : order.escrowStage === 'account_verification' ? 2 : 1;
    return { id: `#IS-${order.id}`, orderId: order.id, accountId: order.accountId, name: `PUBG akkaunt #${order.accountId}`, price: Number(order.price), status, stage, image: CARD_IMAGE, fulfillmentStatus: ((order as any).fulfillmentStatus ?? 'waiting') as 'waiting' | 'preparing' | 'delivered', fulfillmentNote: (order as any).fulfillmentNote ?? null, isSeller: (order as any).sellerId === undefined ? false : false };
  });
  const sourceOrders = isAuthenticated ? liveOrders : [];
  const orders = sourceOrders.filter(order => tab === 'completed' ? order.status === 'Completed' : order.status !== 'Completed');
  const activeDealIds = sourceOrders.filter(order => order.status !== 'Completed').slice(0, 3).map(order => order.orderId);
  return <main className="space-y-4 pb-24 sm:space-y-6 lg:pb-6">{activeDealIds.length > 0 && <div className="grid gap-3 lg:grid-cols-3">{activeDealIds.map(orderId => <DealRoomPanel key={orderId} orderId={orderId} />)}</div>}<div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Kafolat markazi</span><h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">Buyurtmalar</h1><p className="mt-2 text-sm text-white/45">Savdolaringiz holati va kafolat bosqichlarini shu yerdan kuzating.</p></div><div className="flex gap-2 border-b border-white/[0.08]"><button onClick={() => setTab('active')} className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === 'active' ? 'border-amber-300 text-amber-200' : 'border-transparent text-white/40'}`}>Faol buyurtmalar</button><button onClick={() => setTab('completed')} className={`border-b-2 px-3 py-3 text-sm font-bold ${tab === 'completed' ? 'border-amber-300 text-amber-200' : 'border-transparent text-white/40'}`}>Yakunlangan</button></div>{ordersQuery.isLoading && isAuthenticated ? <div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 sm:p-8 text-center text-sm text-white/45">Buyurtmalar yuklanmoqda...</div> : orders.length === 0 ? <EmptyState title="Buyurtmalar topilmadi" text="Savdo boshlaganingizdan so‘ng buyurtmalar shu yerda ko‘rinadi." /> : <div className="space-y-4">{orders.map(order => <article key={order.id} className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 md:p-5"><div className="flex flex-col gap-5 md:flex-row md:items-center"><img loading="lazy" decoding="async" src={order.image} alt={order.name} className="h-24 w-full rounded-xl img-live object-cover md:w-36" /><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-white/35">{order.id}</span><StatusPill tone={order.status === 'Completed' ? 'green' : 'gold'}>{order.status}</StatusPill></div><h2 className="mt-2 font-display text-lg font-black text-white">{order.name}</h2><p className="mt-1 text-xs text-white/40">{uzNumber(order.price)} so'm • xarid buyurtmasi</p></div><div className="flex gap-2"><PrimaryButton variant="ghost" onClick={() => onNavigate(`/account/${order.accountId}`)}>Batafsil</PrimaryButton>{order.status !== 'Completed' && <PrimaryButton onClick={() => onNavigate(`/order/${order.orderId}`)}>Jarayon</PrimaryButton>}</div></div>{order.status !== 'Completed' && <div className="mt-5 grid gap-3 border-t border-white/[0.08] pt-5 md:grid-cols-3">{[['To‘lov muzlatildi', order.stage >= 1], ['Akkaunt tekshiruvi', order.stage >= 2], ['Xaridor tasdig‘i', order.stage >= 3]].map(([label, complete], index) => <div key={label as string} className="flex items-center gap-3"><span className={`step-dot grid h-8 w-8 place-items-center rounded-full border ${complete ? 'step-dot-done border-amber-300 bg-amber-400/15 text-amber-100' : 'border-white/10 text-white/30'}`}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span><span className={`text-xs font-bold ${complete ? 'text-white/80' : 'text-white/30'}`}>{label as string}</span></div>)}</div>}{order.status !== 'Completed' && <FulfillmentTracker status={(order as any).fulfillmentStatus ?? 'waiting'} note={(order as any).fulfillmentNote} orderId={order.orderId} />}</article>)}</div>}<div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-amber-200" /><p className="text-sm leading-6 text-white/55">Kafolatli savdoda pul xaridor tasdig‘igacha muzlatilgan holatda turadi. Login yoki parolni platformadan tashqari kanallarda yubormang.</p></div></div></main>;
}

export function TelegramLoginGate({ title, description }: { title: string; description: string }) {
  const [busy, setBusy] = React.useState(false);
  const handleLogin = async () => {
    const webApp = initTelegramWebApp();
    if (!webApp) {
      window.open(getTelegramMiniAppLaunchUrl(), '_blank', 'noopener,noreferrer');
      return;
    }
    setBusy(true);
    const result = await authenticateTelegramWebApp(webApp);
    setBusy(false);
    if (result.ok) {
      toast.success('Telegram profili ulandi');
      window.location.reload();
    } else {
      toast.error('Telegram sessiyasi topilmadi. Pastdagi telefon raqam orqali kirishdan foydalaning.');
    }
  };
  const handlePhoneLogin = () => {
    const url = getTelegramPhoneLoginUrl();
    const webApp = getTelegramWebApp();
    if (webApp?.openTelegramLink) webApp.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };
  return <main className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-amber-400/25 bg-[linear-gradient(135deg,rgba(245,197,66,.12),rgba(14,16,19,.98))] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,.28)] sm:p-8"><span className="inferno-pulse mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/15 text-amber-100"><Send className="h-7 w-7" /></span><h1 className="mt-5 font-display text-xl sm:text-2xl font-black text-white">{title}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">{description}</p><button type="button" disabled={busy} onClick={handleLogin} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black shadow-[0_0_24px_rgba(245,197,66,.25)] transition active:scale-[.98] disabled:opacity-60">{busy ? 'Telegram tekshirilmoqda...' : 'Telegram orqali kirish'}<ArrowRight className="h-4 w-4" /></button><button type="button" onClick={handlePhoneLogin} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-white/[0.04] px-5 text-sm font-black text-white/85 transition active:scale-[.98]"><Phone className="h-4 w-4 text-amber-200" />Telefon raqam orqali kirish</button><p className="mt-4 text-[11px] text-white/35">Login va parolni bu yerga yubormang. Faqat Telegram sessiyasi ishlatiladi.</p></main>;
}

const PAYMENT_LOGOS: Record<string, string> = {
  uzcard: '/assets/pay-uzcard.jpg',
  visa: '/assets/pay-visa.jpg',
};

/** "Tez orada" usullari uchun kichik suratlar. */
const PAYMENT_SOON_IMAGES: Record<string, string> = {
  TON: '/assets/pay-ton.jpg',
  'Telegram Stars': '/assets/pay-stars.jpg',
};

/** Ixcham to'lov usuli tanlagichi: UZCARD / VISA kartalari va tez oradagi usullar. */
function PaymentMethodPicker({ cards, fallbackCard, onCopy }: { cards: Array<{ id: string; label: string; number: string; holder: string }>; fallbackCard: { number: string; holder: string }; onCopy: (value: string, label: string) => void }) {
  const list = cards.length ? cards : [{ id: 'uzcard', label: 'UZCARD', number: fallbackCard.number, holder: fallbackCard.holder }];
  const [active, setActive] = React.useState(list[0]?.id ?? 'uzcard');
  const selected = list.find(card => card.id === active) ?? list[0];
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {list.map(card => (
          <button key={card.id} type="button" onClick={() => setActive(card.id)} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-2 transition active:scale-[.97] ${active === card.id ? 'border-amber-300 bg-amber-400/15' : 'border-white/10 bg-white/[0.03]'}`}>
            <img src={PAYMENT_LOGOS[card.id]} alt={card.label} loading="lazy" className="h-5 w-8 rounded img-live object-cover" onError={event => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span className={`text-[11px] font-black ${active === card.id ? 'text-amber-50' : 'text-white/60'}`}>{card.label}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-2.5">
          <img src={PAYMENT_LOGOS[selected.id]} alt={selected.label} loading="lazy" className="mb-2 h-20 w-full rounded-lg img-live object-cover" onError={event => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-[13px] font-black leading-5 text-white">{selected.number || 'Karta sozlanmagan'}</p>
            <button type="button" onClick={() => selected.number && onCopy(selected.number, 'Karta raqami')} className="shrink-0 rounded-lg border border-amber-300/40 bg-amber-400/15 px-2 py-1 text-[10px] font-black text-amber-100">Nusxa</button>
          </div>
          <p className="mt-1 text-[10px] text-white/45">Egasi: <strong className="text-white/80">{selected.holder}</strong></p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[['TON', '💎'], ['Telegram Stars', '⭐']].map(([label, icon]) => (
          <div key={label} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-2 py-2 text-[10px] font-bold text-white/35">
            <img src={PAYMENT_SOON_IMAGES[label as string]} alt={label as string} loading="lazy" className="h-5 w-8 rounded img-live object-cover" onError={event => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span>{icon}</span>{label}<span className="rounded bg-white/10 px-1 text-[8px] font-black uppercase text-white/50">Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SellerListingsPanel() {
  const listingsQuery = trpc.accounts.getSellerAccounts.useQuery(undefined, { staleTime: 10_000, refetchOnWindowFocus: false });
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState({ playerName: '', level: '', region: '', price: '', description: '', skins: '' });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const updateListing = trpc.accounts.update.useMutation({
    onSuccess: () => { toast.success('E’lon yangilandi va bozorda ko‘rinishi davom etadi.'); setEditingId(null); setFieldErrors({}); listingsQuery.refetch(); },
    onError: error => { const message = error.message || 'E’lonni saqlashda xatolik yuz berdi.'; setFieldErrors({ form: message }); toast.error(message); },
  });
  const deleteListing = trpc.accounts.delete.useMutation({
    onSuccess: () => { toast.success('E’lon o‘chirildi.'); listingsQuery.refetch(); },
    onError: error => toast.error(error.message || 'E’lonni o‘chirib bo‘lmadi.'),
  });
  const [pendingDelete, setPendingDelete] = React.useState<any | null>(null);
  const removeListing = (account: any) => setPendingDelete(account);
  const confirmDelete = () => { if (!pendingDelete) return; deleteListing.mutate({ id: pendingDelete.id }); setPendingDelete(null); };
  const beginEdit = (account: any) => { setEditingId(account.id); setFieldErrors({}); setDraft({ playerName: account.playerName ?? '', level: String(account.level ?? ''), region: account.region ?? '', price: String(Number(account.price ?? 0)), description: account.description ?? '', skins: (account.featuredSkins ?? []).join(', ') }); };
  const updateDraft = (field: keyof typeof draft, value: string) => { setDraft(previous => ({ ...previous, [field]: value })); setFieldErrors(previous => { const next = { ...previous }; delete next[field]; delete next.form; return next; }); };
  const saveEdit = () => {
    if (!editingId) return;
    const nextErrors: Record<string, string> = {};
    if (draft.playerName.trim().length < 2) nextErrors.playerName = 'O‘yinchi nomi kamida 2 ta belgidan iborat bo‘lsin.';
    const level = Number(draft.level);
    if (!Number.isInteger(level) || level < 1 || level > 100) nextErrors.level = 'Daraja 1 dan 100 gacha bo‘lishi kerak.';
    if (draft.region.trim().length < 2) nextErrors.region = 'Mintaqani kiriting.';
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) nextErrors.price = 'Narx 0 yoki undan katta bo‘lishi kerak.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    updateListing.mutate({ id: editingId, playerName: draft.playerName.trim(), level, region: draft.region.trim(), price, description: draft.description.trim(), featuredSkins: draft.skins.split(',').map(item => item.trim()).filter(Boolean) });
  };
  return <>
    <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><SectionHeading eyebrow="Sotuvchi markazi" title="Mening e’lonlarim" /><p className="-mt-2 mb-4 text-xs leading-5 text-white/40">E’lon avval admin tekshiruvidan o‘tadi, tasdiqlangach bozorda ko‘rinadi. Rad etilsa sababi shu yerda ko‘rsatiladi.</p>{listingsQuery.isLoading ? <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-4 text-xs text-white/55"><LoaderCircle className="h-4 w-4 animate-spin text-amber-200" />E’lonlar yuklanmoqda...</div> : (listingsQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center"><p className="text-sm font-bold text-white">Hali e’lon yo‘q</p><p className="mt-1 text-xs text-white/40">Birinchi akkauntingizni bozorga qo‘ying.</p></div> : <div className="space-y-3">{(listingsQuery.data ?? []).map((account, index) => editingId === account.id ? <div key={account.id} className="rounded-xl border border-amber-300/30 bg-amber-400/[0.06] p-4"><div className="grid gap-3 sm:grid-cols-2"><EditField label="O‘yinchi nomi" error={fieldErrors.playerName}><input className={`field-input ${fieldErrors.playerName ? 'border-amber-300/70' : ''}`} aria-label="O‘yinchi nomi" aria-invalid={Boolean(fieldErrors.playerName)} value={draft.playerName} onChange={event => updateDraft('playerName', event.target.value)} placeholder="O‘yinchi nomi" /></EditField><EditField label="Daraja" error={fieldErrors.level}><input className={`field-input ${fieldErrors.level ? 'border-amber-300/70' : ''}`} aria-label="Daraja" aria-invalid={Boolean(fieldErrors.level)} inputMode="numeric" value={draft.level} onChange={event => updateDraft('level', event.target.value)} placeholder="Daraja" /></EditField><EditField label="Mintaqa" error={fieldErrors.region}><input className={`field-input ${fieldErrors.region ? 'border-amber-300/70' : ''}`} aria-label="Mintaqa" aria-invalid={Boolean(fieldErrors.region)} value={draft.region} onChange={event => updateDraft('region', event.target.value)} placeholder="Mintaqa" /></EditField><EditField label="Narx" error={fieldErrors.price}><input className={`field-input ${fieldErrors.price ? 'border-amber-300/70' : ''}`} aria-label="Narx" aria-invalid={Boolean(fieldErrors.price)} inputMode="numeric" value={draft.price} onChange={event => updateDraft('price', event.target.value)} placeholder="Narx" /></EditField><EditField label="Asosiy skinlar" className="sm:col-span-2"><input className="field-input" aria-label="Asosiy skinlar" value={draft.skins} onChange={event => updateDraft('skins', event.target.value)} placeholder="M416 Glacier, X-Suit" /></EditField><EditField label="Tavsif" className="sm:col-span-2"><textarea className="field-input min-h-24" aria-label="Tavsif" value={draft.description} onChange={event => updateDraft('description', event.target.value)} placeholder="Tavsif" /></EditField></div>{fieldErrors.form && <p role="alert" className="mt-3 rounded-lg border border-amber-300/25 bg-amber-400/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-amber-50">{fieldErrors.form}</p>}<div className="mt-3 flex flex-wrap items-center justify-end gap-2"><span className="mr-auto text-[11px] text-white/35">Saqlashdan oldin maydonlarni tekshiring.</span><PrimaryButton variant="ghost" disabled={updateListing.isPending} onClick={() => { setEditingId(null); setFieldErrors({}); }}>Bekor qilish</PrimaryButton><PrimaryButton disabled={updateListing.isPending} onClick={saveEdit}>{updateListing.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saqlanmoqda...</> : <><Check className="h-4 w-4" />Saqlash</>}</PrimaryButton></div></div> : <motion.article key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }} whileHover={{ scale: 1.01 }} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/30">{account.thumbnailUrl ? <img loading="lazy" decoding="async" src={account.thumbnailUrl} alt={account.playerName} className="h-full w-full img-live object-cover" /> : <div className="grid h-full place-items-center text-amber-200"><ImagePlus className="h-5 w-5" /></div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-white">{account.playerName}</h3><StatusPill tone={account.status === 'available' ? 'green' : account.status === 'sold' ? 'muted' : 'gold'}>{account.status === 'available' ? '✅ Bozorda' : account.status === 'sold' ? 'Sotilgan' : account.status === 'delisted' ? '❌ Rad etilgan' : '⏳ Admin tekshiruvida'}</StatusPill></div><p className="mt-1 text-xs text-white/40">LVL {account.level} · {account.region} · {uzNumber(Number(account.price))} so‘m</p>{(account as any).verificationNotes && account.status !== 'available' && <p className="mt-1 text-[11px] leading-4 text-amber-100/80">Sabab: {(account as any).verificationNotes}</p>}</div></div><div className="flex shrink-0 gap-2"><button type="button" disabled={account.status === 'sold'} onClick={() => beginEdit(account)} aria-label="E’lonni tahrirlash" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 text-[11px] font-black text-amber-100 transition active:scale-95 disabled:opacity-40"><Edit3 className="h-4 w-4" />Tahrirlash</button><button type="button" disabled={account.status === 'sold' || deleteListing.isPending} onClick={() => removeListing(account)} aria-label="E’lonni o‘chirish" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-400/35 bg-red-500/10 px-3 text-[11px] font-black text-red-200 transition active:scale-95 disabled:opacity-40"><Trash2 className="h-4 w-4" />O‘chirish</button></div></motion.article>)}</div>}</section>
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => !open && setPendingDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>E’lonni o‘chirish</AlertDialogTitle>
          <AlertDialogDescription>“{pendingDelete?.playerName}” e’loni butunlay o‘chiriladi. Bu amalni bekor qilib bo‘lmaydi.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">O‘chirish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, isAuthenticated } = useAuth();
  const balanceQuery = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const transactionsQuery = trpc.wallet.getTransactions.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const listingsQuery = trpc.accounts.getSellerAccounts.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const sellerOrdersQuery = trpc.orders.getSellerOrders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 15_000, refetchOnWindowFocus: false });
  const reviewsQuery = trpc.reviews.getSellerReviews.useQuery(user?.id ?? 0, { enabled: Boolean(user?.id), staleTime: 15_000, refetchOnWindowFocus: false });
  const reportReview = trpc.reviews.report.useMutation({ onSuccess: () => toast.success('Sharh shikoyati adminlarga yuborildi'), onError: error => toast.error(error.message) });
  const topupInstructionsQuery = trpc.wallet.getTopupInstructions.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000, refetchOnWindowFocus: false });
  const receiptsQuery = trpc.wallet.getDepositReceipts.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: false });
  const [walletAction, setWalletAction] = React.useState<'manual_topup' | 'withdraw' | null>(null);
  const [amount, setAmount] = React.useState('');
  const [selectedTopupAmount, setSelectedTopupAmount] = React.useState<number | null>(null);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [destination, setDestination] = React.useState('');
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000, refetchOnWindowFocus: false });
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [identityOpen, setIdentityOpen] = React.useState(false);
  const [profileDraft, setProfileDraft] = React.useState({ name: '', phone: '' });
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success('Profil yangilandi'); setEditingProfile(false); profileQuery.refetch(); },
    onError: error => toast.error(error.message || 'Profilni saqlashda xatolik'),
  });
  const uploadReceipt = trpc.wallet.uploadReceipt.useMutation();
  const submitReceipt = trpc.wallet.submitReceipt.useMutation();
  const withdraw = trpc.wallet.withdraw.useMutation({ onSuccess: () => { toast.success('Yechib olish so‘rovi qabul qilindi'); setWalletAction(null); setAmount(''); setDestination(''); balanceQuery.refetch(); transactionsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const balance = Number(balanceQuery.data?.balance ?? 0);
  const listingsCount = listingsQuery.data?.length ?? 0;
  const salesCount = sellerOrdersQuery.data?.length ?? 0;
  const reviews = reviewsQuery.data ?? [];
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  const badge = salesCount >= 20 ? 'Elite sotuvchi' : salesCount >= 5 ? 'Tasdiqlangan sotuvchi' : 'Yangi sotuvchi';
  const profileRow = profileQuery.data as any;
  const telegramId = String(profileRow?.openId ?? (user as any)?.openId ?? '').replace(/^telegram:/, '') || '—';
  const profilePhone = profileRow?.phone || '';
  const displayName = profileRow?.name || user?.name || 'Inferno savdogari';
  const avatarUrl = profileRow?.avatarUrl || '';
  const uploadAvatarMutation = trpc.media.upload.useMutation();
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarDraft, setAvatarDraft] = React.useState<{ src: string; zoom: number; x: number; y: number } | null>(null);
  const pickAvatar = (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error('Rasm hajmi 8 MB dan oshmasin'); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarDraft({ src: String(reader.result), zoom: 1, x: 50, y: 50 });
    reader.onerror = () => toast.error('Fayl o‘qilmadi');
    reader.readAsDataURL(file);
  };
  /** Tanlangan kadrni 512x512 kvadratga kesib, keyin yuklaydi. */
  const confirmAvatar = async () => {
    if (!avatarDraft) return;
    setAvatarUploading(true);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Rasm ochilmadi'));
        element.src = avatarDraft.src;
      });
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Kadrlash imkonsiz');
      const scale = (size / Math.min(image.width, image.height)) * avatarDraft.zoom;
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const offsetX = (size - drawWidth) * (avatarDraft.x / 100);
      const offsetY = (size - drawHeight) * (avatarDraft.y / 100);
      context.fillStyle = '#08090b';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const base64 = dataUrl.split(',')[1] || '';
      const uploaded = await uploadAvatarMutation.mutateAsync({ fileName: `avatar-${Date.now()}.jpg`, contentType: 'image/jpeg', dataBase64: base64 });
      await updateProfile.mutateAsync({ avatarUrl: uploaded.url });
      toast.success('Profil rasmi yangilandi');
      setAvatarDraft(null);
      profileQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rasmni yuklashda xatolik');
    } finally {
      setAvatarUploading(false);
    }
  };
  const openProfileEditor = () => { setProfileDraft({ name: displayName === 'Inferno savdogari' ? '' : displayName, phone: profilePhone }); setEditingProfile(true); };
  const copyText = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast.success(`${label} nusxa olindi`); }
    catch { toast.error('Nusxa olishda xatolik'); }
  };
  const transactions = transactionsQuery.data ?? [];
  const submitWalletAction = async () => {
    if (walletAction === 'manual_topup') {
      if (!selectedTopupAmount) { toast.error('Avval summani tanlang'); return; }
      if (!receiptFile) { toast.error('To‘lov chekini rasm qilib yuklang'); return; }
      if (receiptFile.size > 8 * 1024 * 1024) { toast.error('Chek hajmi 8 MB dan oshmasin'); return; }
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = () => reject(new Error('Fayl o‘qilmadi'));
          reader.readAsDataURL(receiptFile);
        });
        const uploaded = await uploadReceipt.mutateAsync({ fileName: receiptFile.name, contentType: receiptFile.type as 'image/jpeg' | 'image/png' | 'image/webp', dataBase64: base64 });
        await submitReceipt.mutateAsync({ amount: selectedTopupAmount, receiptKey: uploaded.key, receiptUrl: uploaded.url });
        toast.success('Chek admin tekshiruviga yuborildi');
        setWalletAction(null); setSelectedTopupAmount(null); setReceiptFile(null);
        receiptsQuery.refetch(); transactionsQuery.refetch();
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Chekni yuborishda xatolik yuz berdi'); }
      return;
    }
    const numericAmount = Math.floor(Number(amount.replace(/\\s/g, '')));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { toast.error('To‘g‘ri summa kiriting'); return; }
    if (walletAction === 'withdraw') {
      if (destination.trim().length < 4) { toast.error('Karta yoki hamyon ma’lumotini kiriting'); return; }
      withdraw.mutate({ amount: numericAmount, destination: destination.trim() });
    }
  };
  const walletBusy = uploadReceipt.isPending || submitReceipt.isPending || withdraw.isPending;
  if (!isAuthenticated) return <TelegramLoginGate title="Profilga Telegram orqali kiring" description="Sotuvlaringiz, balansingiz, saqlangan akkauntlaringiz va media boshqaruvi shu profilga ulanadi." />;
  return (
    <main className="space-y-3 pb-4">
      {avatarDraft && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xs rounded-2xl border border-amber-300/25 bg-[#0e1013] p-4">
          <p className="text-sm font-black text-white">Profil rasmi</p>
          <p className="mt-1 text-[11px] text-white/40">Kadrni sozlang — faqat doira ichidagi qism saqlanadi.</p>
          <div className="mx-auto mt-3 h-44 w-44 overflow-hidden rounded-full border border-amber-300/40 bg-black">
            <img loading="lazy" decoding="async" src={avatarDraft.src} alt="Profil rasmi" className="h-full w-full img-live object-cover" style={{ objectPosition: `${avatarDraft.x}% ${avatarDraft.y}%`, transform: `scale(${avatarDraft.zoom})` }} />
          </div>
          <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-white/40">Kattalashtirish
            <input type="range" min={1} max={3} step={0.05} value={avatarDraft.zoom} onChange={event => setAvatarDraft(previous => previous && ({ ...previous, zoom: Number(event.target.value) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <label className="mt-2 block text-[10px] font-black uppercase tracking-wider text-white/40">Gorizontal
            <input type="range" min={0} max={100} value={avatarDraft.x} onChange={event => setAvatarDraft(previous => previous && ({ ...previous, x: Number(event.target.value) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <label className="mt-2 block text-[10px] font-black uppercase tracking-wider text-white/40">Vertikal
            <input type="range" min={0} max={100} value={avatarDraft.y} onChange={event => setAvatarDraft(previous => previous && ({ ...previous, y: Number(event.target.value) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAvatarDraft(null)} className="min-h-10 rounded-xl border border-white/12 text-[11px] font-bold text-white/70 active:scale-95">Bekor qilish</button>
            <button type="button" disabled={avatarUploading} onClick={confirmAvatar} className="min-h-10 rounded-xl bg-amber-400 text-[11px] font-black text-black active:scale-95 disabled:opacity-50">{avatarUploading ? 'Saqlanmoqda...' : 'Saqlash'}</button>
          </div>
        </div>
      </div>}
      {/* ===== Pro live hero ===== */}
      <section className="pro-live pro-clip relative -mx-1 overflow-hidden rounded-3xl border border-amber-400/25 sm:mx-0">
        {/* Profil banneri qotib turadi — aylanma slayd o'chirildi. */}
        <div className="pro-static-hero" style={{ backgroundImage: `url(${PROFILE_BANNER})` }} />
        <div className="pro-live__grid" />
        <div className="pro-live__veil" />
        {[8, 26, 44, 62, 80, 92].map((left, index) => (
          <span key={left} className="pro-ember" style={{ left: `${left}%`, animationDelay: `${index * 0.85}s` }} />
        ))}
        <div className="relative px-3 pb-3 pt-3 sm:px-6 sm:pt-6">
          {/* Statistika paneli */}
          <div className="mobile-scroll-row -mx-3 mb-3 items-center gap-0 px-3 sm:mx-0 sm:px-0">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/35 bg-black/60 px-2.5 py-1.5">
              <WalletCards className="h-3.5 w-3.5 shrink-0 text-amber-200" />
              <span className="px-gold-text font-display text-[13px] font-black"><AnimatedNumber value={balance} /></span>
              <span className="text-[9px] font-bold text-white/40">so‘m</span>
            </span>
            <span className="mx-2 h-5 w-px shrink-0 bg-white/12" />
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-white/55">E‘lon<b className="text-white">{listingsCount}</b></span>
            <span className="mx-2 h-5 w-px shrink-0 bg-white/12" />
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-white/55">Savdo<b className="text-white">{salesCount}</b></span>
            <span className="mx-2 h-5 w-px shrink-0 bg-white/12" />
            <span className="inline-flex shrink-0 items-center gap-2 text-[11px] font-bold text-white/55">
              Reyting
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200" style={{ width: `${Math.min(100, (averageRating / 5) * 100)}%` }} />
              </span>
            </span>
          </div>
          <div className="flex items-end gap-3">
            <div className="relative shrink-0 pb-3">
              <span className="pro-ring" />
              <span className="px-frame relative grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-full border-[3px] border-amber-300/70 bg-black/60 text-amber-200 shadow-[0_0_22px_rgba(245,197,66,.28)] sm:h-24 sm:w-24">
                {avatarUrl
                  ? <img loading="lazy" decoding="async" src={avatarUrl} alt={displayName} className="img-live h-full w-full object-cover" />
                  : <img loading="lazy" decoding="async" src="/assets/pubg-avatar.jpg" alt={displayName} className="img-live h-full w-full object-cover" />}
              </span>
              <label className="absolute inset-x-0 bottom-0 mx-auto flex w-max cursor-pointer items-center gap-1 rounded-md border border-amber-300/40 bg-black/85 px-2 py-[2px] text-[8px] font-black uppercase tracking-wider text-amber-100 active:scale-95">
                <Camera className="h-2.5 w-2.5" />{avatarUploading ? '...' : 'Surat'}
                <input type="file" accept="image/*" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) pickAvatar(file); event.target.value = ''; }} />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <span className="pubg-live inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/45 px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{badge}
              </span>
              <h1 className="mt-1.5 flex items-center gap-2 truncate font-display text-xl font-black uppercase italic leading-tight text-white drop-shadow sm:text-3xl">
                <Sparkles className="h-5 w-5 shrink-0 text-white/80" />
                <span className="truncate">{displayName}</span>
              </h1>
              <p className="mt-1 flex items-center gap-x-2 truncate text-[11px] font-bold text-white/60">
                <span className="flex items-center gap-1 text-amber-200"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />{averageRating.toFixed(1)}</span>
                <span className="text-white/25">•</span>
                <span>{salesCount} savdo</span>
                <span className="text-white/25">•</span>
                <span>{listingsCount} e‘lon</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="shrink-0 rounded-md border border-amber-300/40 bg-amber-400/15 px-2 py-[2px] text-[9px] font-black text-amber-100">LVL {Math.max(1, Math.floor(salesCount / 5) + 1)}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 transition-all duration-700" style={{ width: `${Math.min(100, ((salesCount % 5) / 5) * 100 + 8)}%` }} />
                </span>
                <span className="shrink-0 text-[8px] font-bold text-white/40">{5 - (salesCount % 5)} savdo — keyingi daraja</span>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <button onClick={() => onNavigate('/sell')} className="pubg-press relative flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,#f0b90b,#ffe08a_55%,#f0b90b)] text-[15px] font-black uppercase tracking-wide text-black shadow-[0_0_24px_rgba(240,185,11,.35)] active:scale-95">
              <span aria-hidden className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-black/45" />
              <span aria-hidden className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-black/45" />
              <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-black/45" />
              <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-black/45" />
              <ShoppingBag className="h-5 w-5" />+ Akkaunt sotish
            </button>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                [FileCheck2, 'Buyurtma', () => onNavigate('/orders')],
                [Clock3, 'Tranzaksiya', () => onNavigate('/transactions')],
                [Star, 'Sharhlar', () => onNavigate('/reviews')],
                [Headphones, 'Admin', openAdminChat],
              ] as const).map(([Icon, label, action]) => (
                <button key={label} onClick={action} className="pubg-press flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-300/25 bg-black/55 px-2 text-[10px] font-black uppercase tracking-wide text-white/85 active:scale-95">
                  <Icon className="h-5 w-5 text-amber-300" />
                  <span className="flex w-full items-center justify-center gap-1 truncate text-center">{label}<ChevronRight className="h-3 w-3 shrink-0 text-white/35" /></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Wallet ===== */}
      <section className="hud-crate pro-clip relative overflow-hidden rounded-2xl border border-amber-400/25 bg-[linear-gradient(135deg,rgba(245,197,66,.12),rgba(10,11,13,.98))] p-3.5">
        <span aria-hidden className="hud-stripes pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex flex-col gap-3">
          <div className="min-w-0">
          <CashbackCard />
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80"><WalletCards className="h-4 w-4" />Hamyon</span>
            <div className="mt-1 truncate font-display text-[26px] font-black leading-none text-white"><AnimatedNumber value={balance} /> <span className="font-sans text-[11px] font-bold text-white/45">so‘m</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-label="To‘ldirish" title="Kartadan balansni to‘ldirish: summani tanlang va chek rasmini yuboring" aria-busy={walletBusy} disabled={walletBusy} onClick={() => { telegramHaptic('light'); const opening = walletAction !== 'manual_topup'; setWalletAction(opening ? 'manual_topup' : null); setAmount(''); setSelectedTopupAmount(null); setReceiptFile(null); toast.info(opening ? 'To‘ldirish formasi ochildi — summani tanlang' : 'To‘ldirish formasi yopildi'); }} className="pubg-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c9ee] px-4 text-[13px] font-black text-black shadow-[0_0_18px_rgba(34,201,238,.35)] transition active:scale-95 disabled:opacity-60">{walletBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{walletBusy ? 'Kutilmoqda...' : 'To‘ldirish'}</button>
            <button type="button" aria-label="Yechish" title="Balansdan pul yechish: summa va karta raqamini kiriting" aria-busy={walletBusy} disabled={walletBusy} onClick={() => { telegramHaptic('light'); const opening = walletAction !== 'withdraw'; setWalletAction(opening ? 'withdraw' : null); setAmount(''); toast.info(opening ? 'Yechish formasi ochildi — summani kiriting' : 'Yechish formasi yopildi'); }} className="pubg-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-4 text-[13px] font-black text-white/85 transition active:scale-95 disabled:opacity-60">{walletBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{walletBusy ? 'Kutilmoqda...' : 'Yechish'}</button>
          </div>
        </div>
        {walletAction === 'manual_topup' && <div className="hud-crate relative mt-4 overflow-hidden rounded-2xl border border-amber-300/30 bg-black/45 p-3.5">
          <span aria-hidden className="hud-stripes pointer-events-none absolute inset-0 opacity-10" />
          <div className="relative flex items-start justify-between gap-3">
            <div><p className="text-sm font-black text-white">Manual to‘lov</p><p className="mt-1 text-[11px] leading-5 text-white/45">Summani tanlang, kartaga o‘tkazing va chek rasmini yuboring. Balans admin tasdig‘idan keyin qo‘shiladi.</p></div>
            <button onClick={() => setWalletAction(null)} className="shrink-0 text-[11px] font-bold text-white/40">Yopish</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">{(topupInstructionsQuery.data?.amounts ?? [10000, 20000, 50000]).map(option => <button key={option} type="button" onClick={() => setSelectedTopupAmount(Number(option))} className={`rounded-xl border px-1 py-3 text-[11px] font-black transition ${selectedTopupAmount === option ? 'border-amber-300 bg-amber-400/20 text-amber-50' : 'border-white/10 bg-white/[0.03] text-white/60'}`}>{uzNumber(option)}</button>)}</div>
          <label className="mt-2 block text-[10px] font-black uppercase tracking-wider text-white/40">Boshqa summa (so‘m)
            <input type="number" min={1} inputMode="numeric" data-testid="receipt-amount" aria-label="To‘ldirish summasi" value={selectedTopupAmount ?? ''} onChange={event => setSelectedTopupAmount(event.target.value ? Math.max(0, Math.floor(Number(event.target.value))) : null)} placeholder="Masalan: 125000" className="field-input mt-1 w-full" />
          </label>
          <PaymentMethodPicker
            cards={(topupInstructionsQuery.data as any)?.cards ?? []}
            fallbackCard={{ number: topupInstructionsQuery.data?.cardNumber ?? '', holder: topupInstructionsQuery.data?.cardHolder ?? '' }}
            onCopy={copyText}
          />
          <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-300/30 bg-amber-400/[0.05] px-3 py-4 text-center">
            <Upload className="h-5 w-5 text-amber-200" />
            <span className="mt-2 text-xs font-bold text-white">{receiptFile ? receiptFile.name : '📸 To‘lov chekini tanlang'}</span>
            <span className="mt-1 text-[10px] text-white/35">JPG, PNG yoki WEBP · maksimum 8 MB</span>
            <input type="file" accept="image/*" className="sr-only" onChange={event => setReceiptFile(event.target.files?.[0] ?? null)} />
          </label>
          <PrimaryButton className="mt-3 w-full" disabled={walletBusy} onClick={submitWalletAction}>{walletBusy ? <><LoaderCircle className="h-4 w-4 animate-spin" />Yuborilmoqda...</> : <>Chekni adminlarga yuborish<ArrowRight className="h-4 w-4" /></>}</PrimaryButton>
        </div>}
        {walletAction === 'withdraw' && <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-black text-white">Mablag‘ yechib olish</p><p className="mt-1 text-[11px] text-white/45">Minimum 10 000 so‘m; so‘rov admin tomonidan ko‘rib chiqiladi</p></div>
            <button onClick={() => setWalletAction(null)} className="shrink-0 text-[11px] font-bold text-white/40">Yopish</button>
          </div>
          <input className="field-input mt-3" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Summa, masalan 100000" />
          <input className="field-input mt-2" value={destination} onChange={event => setDestination(event.target.value)} placeholder="Karta raqami yoki hamyon manzili" />
          <PrimaryButton className="mt-3 w-full" disabled={walletBusy} onClick={submitWalletAction}>{walletBusy ? <><LoaderCircle className="h-4 w-4 animate-spin" />Yuborilmoqda...</> : <>So‘rov yuborish<ArrowRight className="h-4 w-4" /></>}</PrimaryButton>
        </div>}
        <div className="mt-2.5 border-t border-white/[0.08] pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80">Chek holati</span>
            <button type="button" disabled={receiptsQuery.isFetching} onClick={() => { telegramHaptic('light'); receiptsQuery.refetch(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#22c9ee]/35 bg-[#22c9ee]/10 px-3 text-[11px] font-black text-[#22c9ee] transition active:scale-95 disabled:opacity-60">{receiptsQuery.isFetching ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Yangilash</button>
          </div>
          {receiptsQuery.isLoading ? <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/55"><LoaderCircle className="h-4 w-4 animate-spin text-amber-200" />Yuklanmoqda...</div> : (receiptsQuery.data ?? []).length === 0 ? <p className="mt-2 text-[11px] text-white/35">Hali manual top-up so‘rovi yo‘q.</p> : <div className="mt-2 space-y-2">{(receiptsQuery.data ?? []).slice(0, 3).map(receipt => <div key={receipt.id} className={`hud-row flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${receipt.status === 'approved' ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : receipt.status === 'rejected' ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-amber-300/30 bg-amber-400/[0.06]'}`}>
            <div><p className="text-[13px] font-black text-white">#{receipt.id} · {uzNumber(Number(receipt.amount))} so‘m</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40"><Clock3 className="h-3 w-3" />{new Date(receipt.createdAt).toLocaleString()}</p></div>
            <div className="shrink-0 text-right"><StatusPill tone={receipt.status === 'approved' ? 'green' : receipt.status === 'rejected' ? 'muted' : 'gold'}>{receipt.status === 'approved' ? '✅ Balansga tushdi' : receipt.status === 'rejected' ? '❌ Tushmadi' : '⏳ Tekshirilmoqda'}</StatusPill>{(receipt as any).reviewNote && <p className="mt-1 max-w-[150px] text-[10px] leading-4 text-white/40">Sabab: {(receipt as any).reviewNote}</p>}</div>
          </div>)}</div>}
        </div>
      </section>

      {/* ===== Identity card (yig‘iladigan) ===== */}
      <section className="pro-glass pro-clip rounded-2xl">
        <button type="button" onClick={() => setIdentityOpen(value => !value)} aria-expanded={identityOpen} className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left active:scale-[.99]">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-400/12 text-amber-200"><UserRound className="h-3.5 w-3.5" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Shaxsiy ma’lumotlar</span>
              <span className="block truncate text-[10px] text-white/35">{displayName} · ID {telegramId}</span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-amber-200 transition-transform ${identityOpen ? 'rotate-180' : ''}`} />
        </button>
        {identityOpen && <div className="border-t border-white/[0.07] p-3.5 pt-3">
          <div className="flex items-center justify-end">
            {!editingProfile && <button onClick={openProfileEditor} aria-label="Profilni tahrirlash" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 text-[11px] font-black text-amber-100 active:scale-95"><Edit3 className="h-3.5 w-3.5" />Tahrirlash</button>}
          </div>
          {!editingProfile ? <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => telegramId !== '—' && copyText(telegramId, 'Telegram ID')} className="rounded-xl border border-white/10 bg-black/25 p-2.5 text-left active:scale-[.98]">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/35"><Copy className="h-3 w-3" />Telegram ID</span>
              <span className="mt-1 block truncate font-mono text-[13px] font-black text-amber-200">{telegramId}</span>
            </button>
            <button type="button" onClick={() => profilePhone && copyText(profilePhone, 'Telefon raqam')} className="rounded-xl border border-white/10 bg-black/25 p-2.5 text-left active:scale-[.98]">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white/35"><Phone className="h-3 w-3" />Telefon</span>
              <span className="mt-1 block truncate font-mono text-[13px] font-black text-white">{profilePhone || 'Kiritilmagan'}</span>
            </button>
            <div className="col-span-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wider text-white/35">To‘liq ism</span>
              <span className="mt-1 block truncate text-[13px] font-black text-white">{displayName}</span>
            </div>
          </div> : <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            <EditField label="To‘liq ism"><input className="field-input" value={profileDraft.name} onChange={event => setProfileDraft(previous => ({ ...previous, name: event.target.value }))} placeholder="Ism Familiya" /></EditField>
            <EditField label="Telefon raqam"><input className="field-input" value={profileDraft.phone} onChange={event => setProfileDraft(previous => ({ ...previous, phone: event.target.value }))} placeholder="+998 90 123 45 67" /></EditField>
            <div className="flex gap-2 sm:col-span-2">
              <PrimaryButton disabled={updateProfile.isPending} onClick={() => updateProfile.mutate({ name: profileDraft.name.trim() || undefined, phone: profileDraft.phone.trim() })}>{updateProfile.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Saqlash</PrimaryButton>
              <PrimaryButton variant="ghost" onClick={() => setEditingProfile(false)}>Bekor qilish</PrimaryButton>
            </div>
          </div>}
        </div>}
      </section>

      {/* ===== Reviews ===== */}
      {reviews.length > 0 && <section className="pro-glass pro-clip rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Xaridorlar fikri</p>
          <button type="button" onClick={() => onNavigate('/reviews')} className="text-[10px] font-bold text-amber-200">Barchasi</button>
        </div>
        <div className="mt-3 space-y-2">{reviews.slice(0, 3).map(review => <article key={review.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-3.5 w-3.5 ${star <= Number(review.rating) ? 'fill-amber-300 text-amber-300' : 'text-white/20'}`} />)}</div>
            <span className="text-[10px] text-white/35">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
          {review.comment && <p className="mt-2 text-[11px] leading-5 text-white/65">“{review.comment}”</p>}
          <div className="mt-2 flex justify-end"><button type="button" disabled={reportReview.isPending} onClick={() => reportReview.mutate({ reviewId: review.id, reason: 'Spam yoki haqoratli kontent' })} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-bold text-white/40 active:scale-95"><Flag className="h-3 w-3" />{reportReview.isPending ? 'Yuborilmoqda...' : 'Shikoyat'}</button></div>
        </article>)}</div>
      </section>}

      <SellerListingsPanel />

      {/* ===== Transactions ===== */}
      <section className="pro-glass pro-clip rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Oxirgi moliyaviy harakatlar</p>
        {transactions.length === 0 ? <p className="mt-3 text-[11px] text-white/40">Hozircha tranzaksiyalar mavjud emas.</p> : <div className="mt-2 divide-y divide-white/[0.07]">{transactions.slice(0, 5).map(transaction => { const isCredit = transaction.type === 'topup' || transaction.type === 'seller_payout' || transaction.type === 'order_refund'; const label = transaction.type === 'topup' ? 'Balans to‘ldirildi' : transaction.type === 'withdrawal' ? 'Yechib olish so‘rovi' : transaction.type === 'seller_payout' ? 'Sotuvchi to‘lovi' : transaction.type === 'order_refund' ? 'Buyurtma qaytarimi' : 'Buyurtma to‘lovi'; return <div key={transaction.id} className="flex items-center justify-between gap-3 py-2.5">
          <div><p className="text-[12px] font-bold text-white">{label}</p><p className="mt-0.5 text-[10px] text-white/35">{transaction.status === 'completed' ? 'Yakunlangan' : 'Kutilmoqda'}</p></div>
          <span className={`font-display text-sm font-black ${isCredit ? 'text-emerald-300' : 'text-amber-200'}`}>{isCredit ? '+' : '-'}{uzNumber(Number(transaction.amount))}</span>
        </div>; })}</div>}
      </section>
    </main>
  );
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
  return <main className="mx-auto max-w-5xl space-y-6"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Buyurtmalarga qaytish</button><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Inferno kafolat</span><h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">Kafolatli savdo</h1><p className="mt-2 text-sm text-white/45">Buyurtma #{id} — har bir bosqich admin nazoratida.</p></div><StatusPill tone={statusLabel === 'Completed' ? 'green' : statusLabel === 'In Escrow' ? 'gold' : 'muted'}>{statusLabel}</StatusPill></div>{orderQuery.isLoading && isAuthenticated ? <div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 sm:p-8 text-center text-sm text-white/45">Buyurtma yuklanmoqda...</div> : <><section className="rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,197,66,.12),rgba(14,16,19,.95))] p-5 md:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-xs font-bold uppercase tracking-widest text-amber-200">Savdo tafsiloti</span><h2 className="mt-2 font-display text-xl sm:text-2xl font-black text-white">PUBG akkaunt #{order?.accountId ?? 1}</h2><p className="mt-1 text-sm text-white/45">{uzNumber(Number(order?.price ?? 0))} so'm • xavfsiz bitim</p></div><span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-200"><LockKeyhole className="h-6 w-6" /></span></div><div className="mt-8 grid gap-3 md:grid-cols-3">{ESCROW_STAGES.map(({ label, description }, index) => { const num = `0${index + 1}`; return <div key={num} className={`relative rounded-2xl border p-5 ${stage >= index + 1 ? 'border-amber-300/35 bg-amber-400/10' : 'border-white/[0.08] bg-white/[0.02]'}`}><div className="flex items-center justify-between"><span className={`font-display text-xl font-black ${stage >= index + 1 ? 'text-amber-200' : 'text-white/25'}`}>{num}</span><span className={`grid h-8 w-8 place-items-center rounded-full ${stage >= index + 1 ? 'bg-amber-400 text-black' : 'bg-white/[0.06] text-white/25'}`}>{stage >= index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span></div><h3 className="mt-5 text-sm font-black text-white">{label}</h3><p className="mt-2 text-xs leading-5 text-white/45">{description}</p></div>; })}</div><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-white/40">Login/parolni faqat platformadagi kafolat jarayoni orqali topshiring.</p>{statusLabel !== 'Completed' && <PrimaryButton onClick={advance} disabled={busy as boolean}>{busy ? 'Yangilanmoqda...' : stage === 1 ? 'Tekshiruvni boshlash' : stage === 2 ? 'Xaridor tasdig‘iga o‘tish' : 'Xaridni tasdiqlash'}</PrimaryButton>}</div></section><div className="grid gap-4 md:grid-cols-3"><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><Shield className="h-5 w-5 text-emerald-300" /><h3 className="mt-3 text-sm font-bold text-white">Admin nazorati</h3><p className="mt-1 text-xs leading-5 text-white/40">Shubhali holatlar bo‘lsa, savdo to‘xtatiladi.</p></div><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><Clock3 className="h-5 w-5 text-amber-300" /><h3 className="mt-3 text-sm font-bold text-white">Bosqichma-bosqich</h3><p className="mt-1 text-xs leading-5 text-white/40">Har bir status o‘zgarishi buyurtmada saqlanadi.</p></div><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><MessageCircle className="h-5 w-5 text-amber-200" /><h3 className="mt-3 text-sm font-bold text-white">Nizo bo‘lsa</h3><p className="mt-1 text-xs leading-5 text-white/40">To‘g‘ridan-to‘g‘ri admin bilan bog‘laning.</p><AdminContactButton className="mt-3 w-full" label="Adminga yozish" /></div></div></>}</main>;
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
    return <main className="mx-auto max-w-3xl space-y-4 pb-24 sm:space-y-6 lg:pb-6"><div className="rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,197,66,.12),rgba(14,16,19,.96))] p-8 text-center"><Star className="mx-auto h-10 w-10 text-amber-200" /><h1 className="mt-4 font-display text-2xl sm:text-3xl font-black text-white">Sotuvchi reytinglari</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Sharh qoldirish va sotuvchilar ishonchliligini ko‘rish uchun Inferno Stealth profiliga kiring.</p><PrimaryButton className="mt-6" onClick={() => onNavigate('/profile')}>Profilga kirish <ArrowRight className="h-4 w-4" /></PrimaryButton></div></main>;
  }

  return <main className="space-y-4 pb-24 sm:space-y-6 lg:pb-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Ishonch markazi</span><h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">Reytinglar va sharhlar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Yakunlangan savdodan keyin sotuvchiga xolis baho qoldiring. Sharhlar faqat real buyurtma orqali yuboriladi.</p></div><PrimaryButton variant="ghost" onClick={() => onNavigate('/orders')}><ShoppingBag className="h-4 w-4" />Buyurtmalar</PrimaryButton></div><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border border-amber-400/20 bg-[#0e1013] p-4 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-200"><Star className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-black text-white">Sharh qoldirish</h2><p className="mt-1 text-xs text-white/40">Faqat yakunlangan savdolar uchun</p></div></div>{completedOrders.length === 0 ? <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-6 text-white/40">Hozircha sharh qoldirish mumkin bo‘lgan yakunlangan buyurtma yo‘q.</div> : <form onSubmit={submitReview} className="mt-6 space-y-4"><Field label="Buyurtmani tanlang"><select required value={selectedOrderId} onChange={event => setSelectedOrderId(event.target.value ? Number(event.target.value) : '')} className="field-input"><option value="">Buyurtmani tanlang</option>{completedOrders.map(order => <option key={order.id} value={order.id}>Buyurtma #{order.id} — {uzNumber(Number(order.price))} so‘m</option>)}</select></Field><div><span className="mb-2 block text-xs font-bold text-white/65">Bahongiz</span><div className="flex gap-2" role="radiogroup" aria-label="Sotuvchiga baho berish">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} yulduz`} aria-pressed={rating === value} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${rating >= value ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/[0.08] bg-white/[0.02] text-white/25'}`}><Star className={`h-4 w-4 ${rating >= value ? 'fill-amber-200' : ''}`} /></button>)}</div></div><Field label="Izoh (ixtiyoriy)"><textarea value={comment} onChange={event => setComment(event.target.value)} className="field-input min-h-28 resize-y" maxLength={1000} placeholder="Savdo tajribangizni yozing..." /></Field><PrimaryButton type="submit" disabled={createReview.isPending}>{createReview.isPending ? 'Saqlanmoqda...' : 'Sharhni yuborish'} <ArrowRight className="h-4 w-4" /></PrimaryButton></form>}</section><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><SectionHeading eyebrow="Sotuvchi profili" title="Sizga qoldirilgan sharhlar" />{sellerReviews.length === 0 ? <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm leading-6 text-white/40">Sizning e’lonlaringiz bo‘yicha hali sharhlar mavjud emas. Birinchi savdolardan keyin bu yerda haqiqiy xaridor fikrlari ko‘rinadi.</div> : <div className="space-y-3">{sellerReviews.map(review => <article key={review.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-1 text-amber-200">{[1, 2, 3, 4, 5].map(value => <Star key={value} className={`h-4 w-4 ${Number(review.rating) >= value ? 'fill-amber-200' : 'text-white/15'}`} />)}</div><span className="text-[10px] text-white/30">Buyurtma #{review.orderId}</span></div><p className="mt-3 text-sm leading-6 text-white/65">{review.comment || 'Xaridor izoh qoldirmagan.'}</p></article>)}</div>}</section></div></main>;
}

export function transactionHistoryLabel(type: string) {
  return type === 'topup' ? 'Balans to‘ldirish' : type === 'withdrawal' ? 'Yechib olish' : type === 'seller_payout' ? 'Sotuvchi payout' : type === 'order_refund' ? 'Buyurtma qaytarimi' : type === 'referral_reward' ? 'Referral bonusi' : 'Buyurtma to‘lovi';
}

export function transactionHistoryStatusLabel(status: string) {
  return status === 'completed' ? 'Yakunlandi' : status === 'failed' ? 'Rad etildi' : 'Kutilmoqda';
}

export function transactionHistoryStatusTone(status: string): 'green' | 'gold' | 'muted' {
  return status === 'completed' ? 'green' : status === 'pending' ? 'gold' : 'muted';
}

export function TransactionsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const transactionsQuery = trpc.wallet.getTransactions.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: false });
  const receiptsQuery = trpc.wallet.getDepositReceipts.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: false });
  const notificationsQuery = trpc.notifications.getAll.useQuery(undefined, { enabled: isAuthenticated, staleTime: 10_000, refetchOnWindowFocus: false });
  const markAsRead = trpc.notifications.markAsRead.useMutation({ onSuccess: () => notificationsQuery.refetch() });

  if (!isAuthenticated) return <TelegramLoginGate title="Tranzaksiyalarni ko‘rish uchun Telegram orqali kiring" description="Balans to‘ldirish, yechib olish, payout va barcha moliyaviy harakatlar faqat Telegram profilingizga ulanadi." />;

  const transactions = transactionsQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const receiptByTransaction = new Map(receipts.filter(receipt => receipt.transactionId).map(receipt => [receipt.transactionId as number, receipt]));
  const isLoading = transactionsQuery.isLoading || receiptsQuery.isLoading || notificationsQuery.isLoading;
  const dateLabel = (value: Date | string) => new Date(value).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' });

  return <main className="space-y-4 pb-24 sm:space-y-6 lg:pb-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Moliyaviy markaz</span><h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">Tranzaksiyalar tarixi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Balans to‘ldirish, yechib olish, payout va boshqa moliyaviy harakatlaringizni bir joyda kuzating.</p></div><div className="flex gap-2"><PrimaryButton variant="ghost" onClick={() => transactionsQuery.refetch()} disabled={isLoading}><LoaderCircle className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Yangilash</PrimaryButton><PrimaryButton onClick={() => onNavigate('/profile')}><WalletCards className="h-4 w-4" />Hamyon</PrimaryButton></div></div>{isLoading ? <section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-center gap-3 text-sm font-bold text-white"><LoaderCircle className="h-5 w-5 animate-spin text-amber-200" />Ma’lumotlar yuklanmoqda...</div><div className="mt-5 space-y-3">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}</div></section> : <><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Hisobot</span><h2 className="mt-2 font-display text-xl font-black text-white">Barcha tranzaksiyalar</h2></div><StatusPill tone={transactions.length ? 'green' : 'muted'}>{transactions.length} ta</StatusPill></div>{transactions.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center"><Clock3 className="mx-auto h-7 w-7 text-white/20" /><p className="mt-3 text-sm font-bold text-white/60">Hali tranzaksiya yo‘q</p><p className="mt-1 text-xs text-white/35">Hamyon orqali balans to‘ldirsangiz yoki yechib olsangiz, tarix shu yerda paydo bo‘ladi.</p></div> : <div className="mt-4 divide-y divide-white/[0.07]">{transactions.map(transaction => { const isCredit = transaction.type === 'topup' || transaction.type === 'seller_payout' || transaction.type === 'order_refund' || transaction.type === 'referral_reward'; const receipt = receiptByTransaction.get(transaction.id); return <article key={transaction.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isCredit ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-200'}`}>{isCredit ? <ArrowRight className="h-4 w-4 rotate-[-45deg]" /> : <ArrowRight className="h-4 w-4 rotate-[45deg]" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-white">{transactionHistoryLabel(transaction.type)}</p><StatusPill tone={transactionHistoryStatusTone(transaction.status)}>{transactionHistoryStatusLabel(transaction.status)}</StatusPill></div><p className="mt-1 truncate text-xs text-white/40">{transaction.description || `Tranzaksiya #${transaction.id}`}</p><p className="mt-1 text-[10px] text-white/30">{dateLabel(transaction.createdAt)}{receipt ? ` · Chek #${receipt.id}` : ''}</p></div></div><p className={`shrink-0 text-right font-display text-base font-black ${isCredit ? 'text-emerald-300' : 'text-amber-200'}`}>{isCredit ? '+' : '-'}{uzNumber(Number(transaction.amount))} so‘m</p></article>; })}</div>}</section><section className="rounded-2xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,.08),rgba(14,16,19,.96))] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Chek monitoringi</span><h2 className="mt-2 font-display text-xl font-black text-white">Top-up holatlari</h2></div><button type="button" onClick={() => receiptsQuery.refetch()} className="text-xs font-bold text-amber-200">Yangilash</button></div>{receipts.length === 0 ? <p className="mt-4 text-sm text-white/40">Hali yuborilgan chek yo‘q.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{receipts.map(receipt => <div key={receipt.id} className="rounded-xl border border-white/[0.08] bg-black/15 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-white">Chek #{receipt.id}</p><StatusPill tone={receipt.status === 'approved' ? 'green' : receipt.status === 'rejected' ? 'muted' : 'gold'}>{receipt.status === 'approved' ? 'Tasdiqlandi' : receipt.status === 'rejected' ? 'Rad etildi' : 'Kutilmoqda'}</StatusPill></div><p className="mt-3 font-display text-lg font-black text-white">{uzNumber(Number(receipt.amount))} so‘m</p><p className="mt-1 text-[11px] text-white/35">Yuborildi: {dateLabel(receipt.createdAt)}</p>{receipt.status === 'pending' && <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-amber-200"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Admin tekshiruvi kutilmoqda</div>}{receipt.reviewNote && <p className="mt-3 rounded-lg bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/55">Admin izohi: {receipt.reviewNote}</p>}</div>)}</div>}</section><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Xabarlar</span><h2 className="mt-2 font-display text-xl font-black text-white">Bildirishnomalar</h2></div><StatusPill tone={notifications.some(item => !item.isRead) ? 'gold' : 'muted'}>{notifications.filter(item => !item.isRead).length} ta yangi</StatusPill></div>{notifications.length === 0 ? <p className="mt-4 text-sm text-white/40">Hali bildirishnomalar yo‘q.</p> : <div className="mt-4 space-y-2">{notifications.map(notification => <button key={notification.id} type="button" onClick={() => !notification.isRead && markAsRead.mutate(notification.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${notification.isRead ? 'border-white/[0.07] bg-white/[0.02]' : 'border-amber-300/20 bg-amber-400/[0.06]'}`}><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-200"><Bell className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-white">{notification.title}</span>{!notification.isRead && <StatusPill tone="gold">Yangi</StatusPill>}</span><span className="mt-1 block text-xs leading-5 text-white/50">{notification.message}</span><span className="mt-1 block text-[10px] text-white/25">{dateLabel(notification.createdAt)}</span></span></button>)}</div>}</section></>}</main>;
}

function SupportPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const questions = ['Akkaunt qanday tekshiriladi?', 'To‘lov qachon sotuvchiga beriladi?', 'Media fayllar qayerda saqlanadi?', 'Muammo yuzaga kelsa nima qilaman?'];
  const [open, setOpen] = useState<number | null>(0);
  return <main className="mx-auto max-w-4xl space-y-4 pb-24 sm:space-y-6 lg:pb-6"><div className="relative overflow-hidden rounded-3xl border border-amber-400/25"><img src={SUPPORT_IMAGE} alt="Qo‘llab-quvvatlash" loading="lazy" className="h-40 w-full img-live object-cover sm:h-56" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(10,11,13,.95))]" /><div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3"><div><span className="pubg-live inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-100"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />24/7 ONLAYN</span><h2 className="mt-2 font-display text-xl font-black text-white sm:text-2xl">Admin markazi</h2></div><AdminContactButton label="Adminga yozish" /></div></div><div className="text-center"><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Yordam markazi</span><h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-white">Yordam va qoidalar</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Inferno Stealth'dan xavfsiz foydalanish bo'yicha asosiy javoblar.</p></div><div className="grid gap-3 md:grid-cols-3"><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><Shield className="h-6 w-6 text-amber-200" /><h2 className="mt-4 font-display text-sm font-black text-white">Xavfsizlik</h2><p className="mt-2 text-xs leading-5 text-white/40">Bitimni platformadan tashqarida yakunlamang.</p></div><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><FileCheck2 className="h-6 w-6 text-amber-200" /><h2 className="mt-4 font-display text-sm font-black text-white">Qoidalar</h2><p className="mt-2 text-xs leading-5 text-white/40">E'lon ma'lumotlarini aniq va to'liq kiriting.</p></div><div className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5"><Headphones className="h-6 w-6 text-amber-200" /><h2 className="mt-4 font-display text-sm font-black text-white">Aloqa</h2><p className="mt-2 text-xs leading-5 text-white/40">Admin: {ADMIN_TELEGRAM_LABEL} — to‘g‘ridan-to‘g‘ri yozing.</p><AdminContactButton className="mt-3 w-full" label="Adminga yozish" /></div></div><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-5 md:p-7"><h2 className="font-display text-xl font-black text-white">Ko'p beriladigan savollar</h2><div className="mt-5 space-y-2">{questions.map((question, index) => <div key={question} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"><button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-bold text-white/75"><span><span className="mr-3 text-amber-300">0{index + 1}</span>{question}</span><ChevronDown className={`h-4 w-4 text-white/35 transition ${open === index ? 'rotate-180' : ''}`} /></button>{open === index && <div className="border-t border-white/[0.08] px-4 pb-4 pt-3 text-sm leading-6 text-white/45">Bu bo'limda xavfsiz savdo jarayoni va admin ko'rigi orqali barcha tomonlar uchun aniq tartib saqlanadi. Shaxsiy ma'lumotlarni ochiq e'lon maydoniga yozmang.</div>}</div>)}</div></section><div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 sm:flex-row sm:items-center sm:p-5"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-amber-200" /><span className="text-sm font-semibold text-white">Savolingiz javobsiz qoldimi?</span></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><AdminContactButton className="w-full sm:w-auto" label="Adminga yozish" /><PrimaryButton onClick={() => onNavigate('/chats')} className="w-full sm:w-auto">Ichki chat <ArrowRight className="h-4 w-4" /></PrimaryButton></div></div></main>;
}

function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');
  const statsQuery = trpc.admin.getStats.useQuery(undefined, { enabled: isAdmin, staleTime: 15_000, refetchOnWindowFocus: false });
  const pendingQuery = trpc.admin.getPendingAccounts.useQuery(undefined, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const sellerVerificationQuery = trpc.admin.getSellerVerificationQueue.useQuery({ status: 'pending' }, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const reviewReportsQuery = trpc.admin.getReviewReports.useQuery({ status: 'pending' }, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const disputesQuery = trpc.admin.getDisputes.useQuery(undefined, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const [depositStatus, setDepositStatus] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const depositsQuery = trpc.admin.getDepositReceipts.useQuery({ status: depositStatus }, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const payoutsQuery = trpc.admin.getPayoutQueue.useQuery({ status: 'pending' }, { enabled: isAdmin, staleTime: 10_000, refetchOnWindowFocus: false });
  const auditsQuery = trpc.admin.getAuditLogs.useQuery({ limit: 30 }, { enabled: isAdmin, staleTime: 15_000, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [broadcastText, setBroadcastText] = React.useState('');
  const [resolutionText, setResolutionText] = React.useState<Record<number, string>>({});
  const [reviewNote, setReviewNote] = React.useState<Record<string, string>>({});
  const reviewDeposit = trpc.admin.reviewDepositReceipt.useMutation({ onSuccess: () => { toast.success('Chek qarori saqlandi'); depositsQuery.refetch(); statsQuery.refetch(); auditsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const processPayout = trpc.admin.processPayout.useMutation({ onSuccess: () => { toast.success('Payout holati saqlandi'); payoutsQuery.refetch(); statsQuery.refetch(); auditsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const verifyAccount = trpc.admin.verifyAccount.useMutation({ onSuccess: () => { toast.success('Tekshiruv qarori saqlandi'); pendingQuery.refetch(); statsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const reviewSellerVerification = trpc.admin.reviewSellerVerification.useMutation({ onSuccess: () => { toast.success('Sotuvchi arizasi bo‘yicha qaror saqlandi'); sellerVerificationQuery.refetch(); auditsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const moderateReviewReport = trpc.admin.moderateReviewReport.useMutation({ onSuccess: () => { toast.success('Sharh shikoyati bo‘yicha qaror saqlandi'); reviewReportsQuery.refetch(); auditsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const resolveDispute = trpc.admin.resolveDispute.useMutation({ onSuccess: () => { toast.success('Nizo yopildi'); disputesQuery.refetch(); statsQuery.refetch(); }, onError: error => toast.error(error.message) });
  const broadcast = trpc.admin.broadcast.useMutation({ onSuccess: result => { toast.success(`${result.recipients} foydalanuvchiga xabar yuborildi`); setBroadcastText(''); }, onError: error => toast.error(error.message) });
  if (!isAdmin) return <main className="mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-[#0e1013] p-4 sm:p-5 sm:p-8 text-center"><Shield className="mx-auto h-10 w-10 text-amber-200" /><h1 className="mt-5 font-display text-xl sm:text-2xl font-black text-white">Admin kirishi kerak</h1><p className="mt-2 text-sm leading-6 text-white/45">Bu bo‘lim faqat platforma egasi va adminlar uchun ochiq.</p></main>;
  const stats = statsQuery.data;
  const pending = pendingQuery.data ?? [];
  const disputes = disputesQuery.data ?? [];
  return <main className="space-y-3 pb-24 sm:space-y-6 lg:pb-6"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:flex md:items-end md:justify-between"><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Boshqaruv</span><h1 className="mt-1 font-display text-xl sm:text-3xl font-black text-white">Admin panel</h1><p className="mt-1 line-clamp-2 text-xs text-white/45 sm:text-sm">Inferno Stealth xavfsizligi, tekshiruv va savdo nazorati.</p></div><StatusPill tone="green"><BadgeCheck className="h-3 w-3" />Owner</StatusPill></div><div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">{[["Foydalanuvchilar", stats?.totalUsers ?? '—', UserRound],['Faol e’lonlar', stats?.totalAccounts ?? '—', ShoppingBag],['Tekshiruv navbati', stats?.pendingAccounts ?? '—', FileCheck2],['Yakunlangan savdo', stats?.totalSales ?? '—', Check],['Ochiq nizolar', stats?.openDisputes ?? '—', MessageCircle]].map(([label, value, Icon]) => { const CardIcon = Icon as React.ElementType; return <div key={label as string} className="card-glow min-w-0 rounded-xl border border-white/[0.08] bg-[#0e1013] p-2.5 sm:rounded-2xl sm:p-5"><CardIcon className="h-4 w-4 text-amber-200 sm:h-5 sm:w-5" /><span className="mt-2 block truncate text-[9px] font-bold uppercase tracking-wider text-white/35 sm:mt-4 sm:text-[10px]">{label as string}</span><span className="mt-1 block font-display text-base font-black text-white sm:mt-2 sm:text-2xl">{String(value)}</span></div>; })}</div><div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-emerald-400/20 bg-[#0e1013] p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Trust desk</span><h2 className="mt-2 font-display text-lg font-black text-white">Sotuvchi verifikatsiyasi</h2><p className="mt-1 text-xs text-white/40">Shaxsni tasdiqlash arizalarini ko‘rib chiqing va ishonch belgisini boshqaring.</p></div><StatusPill tone={(sellerVerificationQuery.data ?? []).length ? 'gold' : 'muted'}>{(sellerVerificationQuery.data ?? []).length} ta</StatusPill></div>{sellerVerificationQuery.isLoading ? <div className="mt-5 flex items-center gap-2 text-xs text-white/45"><LoaderCircle className="h-4 w-4 animate-spin text-emerald-300" />Arizalar yuklanmoqda...</div> : (sellerVerificationQuery.data ?? []).length === 0 ? <EmptyState title="Kutilayotgan ariza yo‘q" text="Yangi sotuvchi arizasi yuborilganda shu yerda ko‘rinadi." /> : <div className="mt-5 space-y-3">{(sellerVerificationQuery.data ?? []).map(row => { const application = row.application; return <article key={application.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-start gap-3"><a href={application.idCardPhotoUrl} target="_blank" rel="noreferrer" className="shrink-0"><img loading="lazy" decoding="async" src={application.idCardPhotoUrl} alt="Shaxsni tasdiqlovchi hujjat" className="h-20 w-20 rounded-xl bg-black/30 img-live object-cover ring-1 ring-emerald-400/20" /></a><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-emerald-200">#{application.id}</span><StatusPill tone="gold">Kutilmoqda</StatusPill></div><h3 className="mt-2 truncate text-sm font-black text-white">{application.fullName}</h3><p className="mt-1 truncate text-xs text-white/45">@{application.telegramUsername} · {row.userName || row.userOpenId || `User #${application.userId}`}</p><p className="mt-1 text-[10px] text-white/30">{new Date(application.createdAt).toLocaleString()}</p></div></div><textarea className="field-input mt-3 min-h-16 resize-y" value={reviewNote[application.id] || ''} onChange={event => setReviewNote(current => ({ ...current, [application.id]: event.target.value }))} placeholder="Qaror izohi (ixtiyoriy)" /><div className="mt-2 grid grid-cols-2 gap-2"><PrimaryButton disabled={reviewSellerVerification.isPending} onClick={() => reviewSellerVerification.mutate({ verificationId: application.id, approved: true, note: reviewNote[application.id] || undefined })}><Check className="h-4 w-4" />Tasdiqlash</PrimaryButton><PrimaryButton variant="ghost" disabled={reviewSellerVerification.isPending} onClick={() => reviewSellerVerification.mutate({ verificationId: application.id, approved: false, note: reviewNote[application.id] || 'Ma’lumotlar tekshiruvdan o‘tmadi.' })}>Rad etish</PrimaryButton></div></article>; })}</div>}</section><section className="rounded-2xl border border-rose-400/20 bg-[#0e1013] p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Moderation desk</span><h2 className="mt-2 font-display text-lg font-black text-white">Sharh shikoyatlari</h2><p className="mt-1 text-xs text-white/40">Spam yoki haqoratli sharhlarni yashiring, asossiz shikoyatlarni yoping.</p></div><StatusPill tone={(reviewReportsQuery.data ?? []).length ? 'gold' : 'muted'}>{(reviewReportsQuery.data ?? []).length} ta</StatusPill></div>{reviewReportsQuery.isLoading ? <div className="mt-5 flex items-center gap-2 text-xs text-white/45"><LoaderCircle className="h-4 w-4 animate-spin text-rose-300" />Shikoyatlar yuklanmoqda...</div> : (reviewReportsQuery.data ?? []).length === 0 ? <EmptyState title="Kutilayotgan shikoyat yo‘q" text="Foydalanuvchi sharh haqida xabar berganda shu yerda ko‘rinadi." /> : <div className="mt-5 space-y-3">{(reviewReportsQuery.data ?? []).map(row => <article key={row.report.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-rose-200">Shikoyat #{row.report.id}</span><span className="text-[10px] text-white/35">{new Date(row.report.createdAt).toLocaleString()}</span></div><p className="mt-2 text-xs text-white/45">Sabab: <strong className="text-white/75">{row.report.reason}</strong></p><blockquote className="mt-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 text-xs leading-5 text-white/65">“{row.review?.comment || 'Izohsiz sharh'}”<footer className="mt-2 text-[10px] text-white/30">Xabar bergan: {row.reporterName || `User #${row.report.reporterId}`}</footer></blockquote><textarea className="field-input mt-3 min-h-16 resize-y" value={reviewNote[row.report.id] || ''} onChange={event => setReviewNote(current => ({ ...current, [row.report.id]: event.target.value }))} placeholder="Moderatsiya izohi (ixtiyoriy)" /><div className="mt-2 grid grid-cols-2 gap-2"><PrimaryButton disabled={moderateReviewReport.isPending} onClick={() => moderateReviewReport.mutate({ reportId: row.report.id, action: 'hidden', note: reviewNote[row.report.id] || 'Qoidabuzarlik tasdiqlandi.' })}>Yashirish</PrimaryButton><PrimaryButton variant="ghost" disabled={moderateReviewReport.isPending} onClick={() => moderateReviewReport.mutate({ reportId: row.report.id, action: 'dismissed', note: reviewNote[row.report.id] || 'Qoidabuzarlik topilmadi.' })}>Rad etish</PrimaryButton></div></article>)}</div>}</section></div><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-2xl border border-amber-400/20 bg-[#0e1013] p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Wallet review</span><h2 className="mt-2 font-display text-lg font-black text-white">Deposit Review</h2><p className="mt-1 text-xs text-white/40">Kartaga tushgan to‘lov cheklarini tekshiring va balansni faqat bir marta kredit qiling.</p></div><select value={depositStatus} onChange={event => setDepositStatus(event.target.value as 'all' | 'pending' | 'approved' | 'rejected')} className="field-input w-full sm:w-32"><option value="pending">Kutilmoqda</option><option value="all">Barchasi</option><option value="approved">Tasdiqlangan</option><option value="rejected">Rad etilgan</option></select></div>{(depositsQuery.data ?? []).length === 0 ? <EmptyState title="Cheklar yo‘q" text="Tanlangan holat bo‘yicha manual top-up topilmadi." /> : <div className="mt-5 space-y-3">{(depositsQuery.data ?? []).map(row => { const receipt = row.receipt; return <article key={receipt.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3"><div className="flex gap-3"><a href={receipt.receiptUrl} target="_blank" rel="noreferrer" className="shrink-0"><img loading="lazy" decoding="async" src={receipt.receiptUrl} alt={`Chek #${receipt.id}`} className="h-24 w-20 rounded-xl bg-black/30 img-live object-cover" /></a><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-amber-200">#{receipt.id}</span><StatusPill tone={receipt.status === 'approved' ? 'green' : receipt.status === 'rejected' ? 'muted' : 'gold'}>{receipt.status === 'approved' ? 'Tasdiqlandi' : receipt.status === 'rejected' ? 'Rad etildi' : 'Kutilmoqda'}</StatusPill></div><p className="mt-2 text-sm font-black text-white">{uzNumber(Number(receipt.amount))} so‘m</p><p className="mt-1 truncate text-xs text-white/40">{row.userName || row.userOpenId || `User #${receipt.userId}`}</p><p className="mt-1 text-[10px] text-white/30">{new Date(receipt.createdAt).toLocaleString()}</p></div></div>{receipt.status === 'pending' && <><textarea className="field-input mt-3 min-h-16 resize-y" value={reviewNote[receipt.id] || ''} onChange={event => setReviewNote(current => ({ ...current, [receipt.id]: event.target.value }))} placeholder="Admin izohi (ixtiyoriy)" /><div className="mt-2 grid grid-cols-2 gap-2"><PrimaryButton disabled={reviewDeposit.isPending} onClick={() => reviewDeposit.mutate({ receiptId: receipt.id, approved: true, note: reviewNote[receipt.id] || undefined })}><Check className="h-4 w-4" />Tasdiqlash</PrimaryButton><PrimaryButton variant="ghost" disabled={reviewDeposit.isPending} onClick={() => reviewDeposit.mutate({ receiptId: receipt.id, approved: false, note: reviewNote[receipt.id] || 'Chek ma’lumotlari mos kelmadi.' })}>Rad etish</PrimaryButton></div></>}</article>; })}</div>}</section><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Payout queue</span><h2 className="mt-2 font-display text-lg font-black text-white">Yechib olish navbati</h2><p className="mt-1 text-xs text-white/40">Mablag‘ qaytarilishi yoki to‘lanishini qo‘lda tasdiqlang.</p></div><StatusPill tone={(payoutsQuery.data ?? []).length ? 'gold' : 'muted'}>{(payoutsQuery.data ?? []).length} ta</StatusPill></div>{(payoutsQuery.data ?? []).length === 0 ? <EmptyState title="Payout navbati bo‘sh" text="Kutilayotgan yechib olish so‘rovi yo‘q." /> : <div className="mt-5 space-y-3">{(payoutsQuery.data ?? []).map(row => { const transaction = row.transaction; return <article key={transaction.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black text-amber-200">#{transaction.id}</span><h3 className="mt-2 text-sm font-black text-white">{uzNumber(Number(transaction.amount))} so‘m</h3><p className="mt-1 text-xs text-white/40">{row.userName || row.userOpenId || `User #${transaction.userId}`}</p><p className="mt-1 line-clamp-2 text-[11px] text-white/35">{transaction.description}</p></div><StatusPill tone="gold">Kutilmoqda</StatusPill></div><textarea className="field-input mt-3 min-h-16 resize-y" value={reviewNote[transaction.id] || ''} onChange={event => setReviewNote(current => ({ ...current, [transaction.id]: event.target.value }))} placeholder="Payout izohi" /><div className="mt-2 grid grid-cols-2 gap-2"><PrimaryButton disabled={processPayout.isPending} onClick={() => processPayout.mutate({ transactionId: transaction.id, approved: true, note: reviewNote[transaction.id] || undefined })}><Check className="h-4 w-4" />To‘landi</PrimaryButton><PrimaryButton variant="ghost" disabled={processPayout.isPending} onClick={() => processPayout.mutate({ transactionId: transaction.id, approved: false, note: reviewNote[transaction.id] || 'Payout rad etildi.' })}>Rad etish</PrimaryButton></div></article>; })}</div>}</section></div><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Audit trail</span><h2 className="mt-2 font-display text-lg font-black text-white">Audit log</h2><p className="mt-1 text-xs text-white/40">Deposit va payout qarorlari kim tomonidan va qachon bajarilganini ko‘ring.</p></div><button type="button" onClick={() => auditsQuery.refetch()} className="text-xs font-bold text-amber-200">Yangilash</button></div>{(auditsQuery.data ?? []).length === 0 ? <EmptyState title="Audit yozuvlari yo‘q" text="Yangi admin qarorlari shu yerda ko‘rinadi." /> : <div className="mt-4 divide-y divide-white/[0.07]">{(auditsQuery.data ?? []).slice(0, 12).map(row => <div key={row.audit.id} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><p className="text-xs font-black text-white">{row.audit.eventType}</p><p className="mt-1 truncate text-[11px] text-white/40">{row.userName || `User #${row.audit.userId}`} · {row.audit.details || '—'}</p></div><span className="shrink-0 text-[10px] text-white/30">{new Date(row.audit.createdAt).toLocaleString()}</span></div>)}</div>}</section><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Queue</span><h2 className="mt-2 font-display text-lg font-black text-white">Tekshiruv navbati</h2><p className="mt-1 text-xs text-white/40">Har bir e’lon egasiga chiqishidan oldin tekshiriladi.</p></div><StatusPill tone={pending.length ? 'gold' : 'muted'}>{pending.length ? `${pending.length} ta kutilmoqda` : 'Bo‘sh'}</StatusPill></div>{pending.length === 0 ? <EmptyState title="Kutilayotgan e’lonlar yo‘q" text="Yangi e’lon kelganda shu yerda ko‘rinadi." /> : <div className="mt-5 space-y-3">{pending.map(account => <article key={account.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex gap-4">{account.thumbnailUrl ? <img loading="lazy" decoding="async" src={account.thumbnailUrl} alt="" className="h-20 w-24 rounded-xl bg-black/30 img-live object-cover" /> : <span className="grid h-20 w-24 place-items-center rounded-xl border border-amber-400/15 bg-amber-400/[0.06] text-amber-200"><Shield className="h-6 w-6" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-amber-200">#{account.id}</span><span className="text-xs text-white/40">{account.accountId}</span><StatusPill tone="muted">{account.region}</StatusPill></div><h3 className="mt-2 truncate text-sm font-black text-white">{account.playerName}</h3><p className="mt-1 text-xs text-white/45">LVL {account.level} · {uzNumber(Number(account.price))} so‘m</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{account.description || 'Tavsif kiritilmagan.'}</p></div></div><textarea className="field-input mt-3 min-h-16 resize-y" value={reviewNote[`acc${account.id}`] || ''} onChange={event => setReviewNote(current => ({ ...current, [`acc${account.id}`]: event.target.value }))} placeholder="Tasdiqlash/rad etish sababi (foydalanuvchiga ko‘rinadi)" /><div className="mt-3 flex flex-wrap gap-2"><PrimaryButton disabled={verifyAccount.isPending} onClick={() => verifyAccount.mutate({ accountId: account.id, approved: true, notes: reviewNote[`acc${account.id}`] || undefined })}><Check className="h-4 w-4" />Tasdiqlash</PrimaryButton><PrimaryButton variant="ghost" disabled={verifyAccount.isPending} onClick={() => verifyAccount.mutate({ accountId: account.id, approved: false, notes: reviewNote[`acc${account.id}`] || 'Admin tekshiruvidan o‘tmadi.' })}>Rad etish</PrimaryButton></div></article>)}</div>}</section><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-200"><MessageCircle className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-black text-white">Broadcast xabar</h2><p className="mt-1 text-xs text-white/40">Barcha foydalanuvchilarga in-app xabar yuboring.</p></div></div><textarea className="field-input mt-5 min-h-32 resize-y" value={broadcastText} onChange={event => setBroadcastText(event.target.value)} placeholder="Masalan: Bugun barcha premium e’lonlar uchun komissiya kamaytirildi..." /><PrimaryButton className="mt-3 w-full" disabled={broadcast.isPending || broadcastText.trim().length < 3} onClick={() => broadcast.mutate({ message: broadcastText.trim() })}>{broadcast.isPending ? 'Yuborilmoqda...' : 'Barcha foydalanuvchilarga yuborish'}<ArrowRight className="h-4 w-4" /></PrimaryButton><div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4"><p className="text-xs leading-5 text-white/45">Jami tushum: <strong className="text-white">{uzNumber(Number(stats?.totalRevenue ?? 0))} so‘m</strong></p></div></section></div><section className="card-glow rounded-2xl border border-white/[0.08] bg-[#0e1013] p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Safety desk</span><h2 className="mt-2 font-display text-lg font-black text-white">Ochiq nizolar</h2></div><StatusPill tone={disputes.length ? 'gold' : 'muted'}>{disputes.length ? `${disputes.length} ta ochiq` : 'Nizo yo‘q'}</StatusPill></div>{disputes.length === 0 ? <EmptyState title="Ochiq nizo yo‘q" text="Yangi murojaatlar shu yerda ko‘rinadi." /> : <div className="mt-5 grid gap-3 md:grid-cols-2">{disputes.map(dispute => <article key={dispute.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-amber-200">Nizo #{dispute.id}</span><span className="text-xs text-white/35">Buyurtma #{dispute.orderId}</span></div><h3 className="mt-3 text-sm font-black text-white">{dispute.reason}</h3><p className="mt-2 text-xs leading-5 text-white/40">{dispute.description || 'Qo‘shimcha izoh yo‘q.'}</p><textarea className="field-input mt-4 min-h-20 resize-y" value={resolutionText[dispute.id] || ''} onChange={event => setResolutionText(current => ({ ...current, [dispute.id]: event.target.value }))} placeholder="Qaror izohi..." /><PrimaryButton className="mt-3 w-full" disabled={resolveDispute.isPending || (resolutionText[dispute.id] || '').trim().length < 3} onClick={() => resolveDispute.mutate({ disputeId: dispute.id, resolution: resolutionText[dispute.id].trim() })}>Nizoni yopish <Check className="h-4 w-4" /></PrimaryButton></article>)}</div>}</section></main>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="grid min-h-40 place-items-center py-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30"><Search className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-bold text-white/70">{title}</h3><p className="mt-1 text-xs text-white/35">{text}</p></div>;
}

function BottomNav({ current, onNavigate }: { current: PageKey; onNavigate: (path: string) => void }) {
  const items = [['home', '/', Flame], ['accounts', '/accounts', Search], ['sell', '/sell', Plus], ['orders', '/orders', ShoppingBag], ['profile', '/profile', UserRound]] as const;
  const nav = <nav
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      transform: 'translateZ(0)',
      WebkitTransform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
    }}
    className="fixed bottom-0 left-0 right-0 z-40 transform-gpu will-change-transform border-t border-amber-400/15 bg-[#08090b] px-2 pt-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,.5)] lg:hidden"><div className="mx-auto grid max-w-md grid-cols-5 gap-1">{items.map(([key, path, Icon]) => {
    const active = current === key;
    return <button key={key} onClick={() => { telegramHaptic('light'); onNavigate(path); }} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[9px] font-bold transition active:scale-95 ${active ? 'text-amber-200' : 'text-white/40 hover:text-white'}`}><span className={`grid h-8 w-8 place-items-center rounded-xl transition ${active ? 'bg-amber-400/20 text-amber-200 shadow-[0_0_15px_rgba(245,197,66,.3)]' : 'bg-white/[0.03] text-white/60'}`}><Icon className="h-3.5 w-3.5" /></span>{key === 'home' ? 'Asosiy' : key === 'accounts' ? 'Bozor' : key === 'sell' ? 'Sotish' : key === 'orders' ? 'Buyurtma' : 'Profil'}</button>;
  })}</div></nav>;
  // Portal: sahifa ichidagi transform/filter/overflow kontekstlar fixed pozitsiyani
  // buzmasligi uchun navni to'g'ridan-to'g'ri body ga chiqaramiz.
  if (typeof document === 'undefined') return nav;
  return createPortal(nav, document.body);
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const page = pageFromPath(location);
  const navigate = (path: string) => setLocation(path);
  const { isAuthenticated } = useAuth();
  const claimReferral = trpc.profile.claimReferral.useMutation();
  const needsTelegramLogin = !isAuthenticated && !getTelegramWebApp() && new Set(['sell', 'orders', 'profile', 'admin']).has(page.key);
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
    const goBack = () => {
      setLocation(getParentPath(location));
    };
    if (isHomePath(location)) webApp.BackButton?.hide?.();
    else {
      webApp.BackButton?.show?.();
      webApp.BackButton?.onClick?.(goBack);
    }
    return () => webApp.BackButton?.offClick?.(goBack);
  }, [location, page.key, setLocation]);
  const content = page.key === 'home' ? <HomePage onNavigate={navigate} /> : page.key === 'accounts' ? <AccountsPage onOpen={id => navigate(`/account/${id}`)} /> : page.key === 'details' ? <DetailPage id={page.id ?? 1} onBack={() => navigate('/accounts')} onNavigate={navigate} /> : page.key === 'sell' ? <SellPage onNavigate={navigate} /> : page.key === 'orders' ? <OrdersPage onNavigate={navigate} /> : page.key === 'escrow' ? <EscrowPage id={page.id ?? 1} onBack={() => navigate('/orders')} /> : page.key === 'saved' ? <SavedPage onNavigate={navigate} /> : page.key === 'chats' ? <ChatInboxPage onNavigate={navigate} /> : page.key === 'notifications' ? <NotificationsPage onNavigate={navigate} /> : page.key === 'chat' ? <ChatPage id={page.id ?? 1} onBack={() => navigate('/')} /> : page.key === 'profile' ? <ProfilePage onNavigate={navigate} /> : page.key === 'transactions' ? <TransactionsPage onNavigate={navigate} /> : page.key === 'reviews' ? <ReviewsPage onNavigate={navigate} /> : page.key === 'support' ? <SupportFaqPage /> : page.key === 'admin' ? <div className="space-y-8"><AdminPage /><AdminAnalyticsPanel /><AdminPanelPage /><AdminPhrasesPanel /></div> : page.key === 'rules' ? <RulesPage /> : page.key === 'flash' ? <FlashSalePage /> : page.key === 'mystery' ? <MysteryBoxPage /> : <ReferralPage />;
  return <div className="relative min-h-screen bg-[#08090b] text-white"><BattleBackdrop /><div className="relative z-10"><AppHeader onNavigate={navigate} /><div aria-hidden className="h-16 sm:h-[72px]" />{needsTelegramLogin && <section className="mx-auto mt-3 max-w-[1440px] px-3 sm:px-6 lg:px-8"><div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3"><div><p className="text-xs font-black text-amber-100">Telegram orqali kirish kerak</p><p className="mt-1 text-[11px] leading-4 text-white/45">Sotish, buyurtmalar va profil bo‘limlari Telegram Mini App ichida ishlaydi.</p></div><button onClick={() => { const url = getTelegramMiniAppLaunchUrl(); const webApp = getTelegramWebApp(); if (webApp?.openTelegramLink) webApp.openTelegramLink(url); else window.open(url, '_blank', 'noopener,noreferrer'); }} className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black text-black shadow-[0_0_18px_rgba(245,197,66,.22)]">Telegramni ochish</button></div></section>}<div className="relative overflow-hidden"><div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/[0.045] blur-3xl" /><div className="relative z-10 mx-auto max-w-[1440px] px-3 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12"><div key={`${page.key}-${page.id ?? 0}`} className="page-enter">{content}</div></div></div><BottomNav current={page.key} onNavigate={navigate} /></div></div>;
}
