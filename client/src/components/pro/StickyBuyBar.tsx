import { motion } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { spring } from './motion';

export default function StickyBuyBar({
  price,
  label = 'Kafolatli sotib olish',
  hint = 'To‘lov kafolatda saqlanadi',
  loading = false,
  onBuy,
}: {
  price: string;
  label?: string;
  hint?: string;
  loading?: boolean;
  onBuy: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/[0.09] bg-[#0b0c0e]/92 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Narx</span>
          <span className="block truncate font-display text-lg font-black leading-none text-amber-200">{price}</span>
          <span className="mt-1 block text-[10px] text-white/30">{hint}</span>
        </div>
        <motion.button
          type="button"
          data-haptic="medium"
          whileTap={{ scale: 0.96 }}
          disabled={loading}
          onClick={onBuy}
          className="ml-auto inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 text-sm font-black uppercase tracking-wide text-black shadow-[0_10px_30px_rgba(245,197,66,.28)] disabled:opacity-60"
        >
          {loading ? 'Yuborilmoqda...' : label}
          <LockKeyhole className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
