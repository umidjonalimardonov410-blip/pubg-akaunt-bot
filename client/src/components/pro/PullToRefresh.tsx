import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoaderCircle, ArrowDown } from 'lucide-react';
import { haptic } from '@/lib/haptics';

const THRESHOLD = 72;
const MAX_PULL = 120;

/**
 * Mobil uchun "tortib yangilash" (pull-to-refresh).
 * Ro'yxat eng tepada bo'lgandagina ishlaydi, yangilash paytida shimmer skeleton ko'rsatiladi.
 */
export default function PullToRefresh({
  onRefresh,
  refreshing = false,
  children,
  skeleton,
}: {
  onRefresh: () => Promise<unknown> | void;
  refreshing?: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const [pull, setPull] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const armed = React.useRef(false);

  const active = busy || refreshing;

  const onTouchStart = (event: React.TouchEvent) => {
    if (active) return;
    const scroller = document.scrollingElement ?? document.documentElement;
    if ((scroller?.scrollTop ?? 0) > 4) return;
    startY.current = event.touches[0].clientY;
    armed.current = false;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (startY.current === null || active) return;
    const delta = event.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    const eased = Math.min(MAX_PULL, delta * 0.55);
    setPull(eased);
    if (!armed.current && eased >= THRESHOLD) {
      armed.current = true;
      haptic('light');
    }
  };

  const onTouchEnd = async () => {
    const shouldRefresh = pull >= THRESHOLD;
    startY.current = null;
    setPull(0);
    if (!shouldRefresh || active) return;
    haptic('medium');
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      window.setTimeout(() => setBusy(false), 420);
    }
  };

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <div className="relative">
        <AnimatePresence>
          {(pull > 0 || active) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 -top-1 z-20 flex justify-center"
            >
              <span
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 backdrop-blur"
                style={{ transform: `translateY(${active ? 8 : pull * 0.4}px)` }}
              >
                {active ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-amber-200" />
                    Yangilanmoqda...
                  </>
                ) : (
                  <>
                    <ArrowDown
                      className="h-3.5 w-3.5 text-amber-200 transition-transform duration-200"
                      style={{ transform: `rotate(${progress >= 1 ? 180 : 0}deg)` }}
                    />
                    {progress >= 1 ? 'Qo‘yib yuboring' : 'Yangilash uchun torting'}
                  </>
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div animate={{ y: active ? 26 : pull }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
          {active && skeleton ? skeleton : children}
        </motion.div>
      </div>
    </div>
  );
}
