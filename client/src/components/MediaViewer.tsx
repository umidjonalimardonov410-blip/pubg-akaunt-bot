import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

export type MediaItem = { type: "image" | "video"; url: string; alt?: string };

type MediaViewerProps = {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  title?: string;
};

/**
 * To'liq ekran media ko'ruvchi: rasm va videolar uchun.
 * Pinch-zoom, double-tap zoom, pan, svayp/strelka bilan navigatsiya.
 */
export default function MediaViewer({ items, index, onClose, onIndexChange, title }: MediaViewerProps) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const pinchState = React.useRef<{ distance: number; zoom: number } | null>(null);
  const panState = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTap = React.useRef(0);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const clampIndex = React.useCallback((n: number) => Math.max(0, Math.min(items.length - 1, n)), [items.length]);
  const goTo = React.useCallback((n: number) => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onIndexChange?.(clampIndex(n));
  }, [clampIndex, onIndexChange]);

  const current = items[index];

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;

  const distanceOf = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      pinchState.current = { distance: distanceOf(event.touches), zoom };
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      panState.current = { x: touch.clientX, y: touch.clientY, panX: pan.x, panY: pan.y };
      swipeStart.current = { x: touch.clientX, y: touch.clientY };
      const now = Date.now();
      if (now - lastTap.current < 320) {
        setZoom(previous => (previous > 1 ? 1 : 2.4));
        setPan({ x: 0, y: 0 });
      }
      lastTap.current = now;
    }
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && pinchState.current) {
      const newDistance = distanceOf(event.touches);
      const ratio = newDistance / (pinchState.current.distance || 1);
      setZoom(Math.max(1, Math.min(5, pinchState.current.zoom * ratio)));
    } else if (event.touches.length === 1 && panState.current) {
      const touch = event.touches[0];
      if (zoom > 1) {
        setPan({
          x: panState.current.panX + (touch.clientX - panState.current.x),
          y: panState.current.panY + (touch.clientY - panState.current.y),
        });
      }
    }
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    pinchState.current = null;
    if (zoom <= 1 && swipeStart.current && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - swipeStart.current.x;
      const dy = touch.clientY - swipeStart.current.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goTo(index + 1); else goTo(index - 1);
      }
    }
    swipeStart.current = null;
    panState.current = null;
  };

  const onDoubleClick = () => {
    setZoom(previous => (previous > 1 ? 1 : 2.4));
    setPan({ x: 0, y: 0 });
  };

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Media ko'ruvchi"}
      className="media-viewer fixed inset-0 z-[999] flex flex-col bg-black/95 backdrop-blur-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          {title && <p className="truncate text-sm font-black text-white">{title}</p>}
          <p className="mt-0.5 text-[10px] text-white/40">{index + 1} / {items.length}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white/85 transition active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={onDoubleClick}
      >
        {items.length > 1 && (
          <button
            type="button"
            aria-label="Oldingi"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/50 text-white/80 transition active:scale-90 disabled:opacity-30"
            disabled={index === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            autoPlay
            className="media-viewer-fade max-h-full max-w-full object-contain"
          />
        ) : (
          <img loading="lazy" decoding="async"
            key={current.url}
            src={current.url}
            alt={current.alt || title || "Media"}
            className="media-viewer-fade max-h-full max-w-full object-contain transition-transform duration-150 ease-out"
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
            draggable={false}
          />
        )}
        {items.length > 1 && (
          <button
            type="button"
            aria-label="Keyingi"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/50 text-white/80 transition active:scale-90 disabled:opacity-30"
            disabled={index === items.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="mobile-scroll-row shrink-0 gap-2 px-3 pb-3 pt-1">
          {items.map((item, thumbIndex) => (
            <button
              type="button"
              key={`${item.url}-${thumbIndex}`}
              onClick={() => goTo(thumbIndex)}
              aria-label={`${thumbIndex + 1}-media`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition ${thumbIndex === index ? "border-amber-300 scale-105" : "border-white/10 opacity-70"}`}
            >
              {item.type === "video" ? (
                <video src={item.url} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <img loading="lazy" decoding="async" src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}

/** Ochish/yopish holatini boshqarish uchun yordamchi hook. */
export function useMediaViewer(items: MediaItem[]) {
  const [index, setIndex] = React.useState<number | null>(null);
  return {
    isOpen: index !== null,
    index: index ?? 0,
    open: (start = 0) => setIndex(start),
    close: () => setIndex(null),
    setIndex,
    render: () => (index !== null && items.length > 0 ? (
      <MediaViewer items={items} index={index} onClose={() => setIndex(null)} onIndexChange={setIndex} />
    ) : null),
  };
}
