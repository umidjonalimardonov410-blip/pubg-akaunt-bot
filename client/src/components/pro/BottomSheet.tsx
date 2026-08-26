import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from './motion';
import { haptic } from '@/lib/haptics';

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { haptic('light'); onClose(); }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-lg rounded-t-3xl border border-white/[0.09] border-b-0 bg-[#0e1013] pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_rgba(0,0,0,.6)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) { haptic('soft'); onClose(); }
            }}
          >
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-11 rounded-full bg-white/20" />
            </div>
            {title && <h2 className="px-5 pt-3 font-display text-base font-black uppercase tracking-wide text-white">{title}</h2>}
            <div className="px-5 pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
