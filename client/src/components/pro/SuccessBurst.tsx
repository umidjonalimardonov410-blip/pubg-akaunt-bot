import { motion } from 'framer-motion';

const CONFETTI = Array.from({ length: 18 }).map((_, index) => ({
  id: index,
  x: (index % 2 ? 1 : -1) * (18 + (index * 9) % 120),
  y: -(60 + (index * 17) % 130),
  rotate: (index * 47) % 360,
  color: ['#f5c542', '#ff6b3d', '#4ade80', '#ffffff'][index % 4],
}));

/** To'lov o'tganda: checkmark chiziladi + konfetti. */
export default function SuccessBurst({ title = 'Muvaffaqiyatli!', text }: { title?: string; text?: string }) {
  return (
    <div className="relative grid place-items-center py-6 text-center">
      {CONFETTI.map(piece => (
        <motion.span
          key={piece.id}
          className="absolute h-2 w-1.5 rounded-[2px]"
          style={{ background: piece.color }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: piece.x, y: piece.y, rotate: piece.rotate }}
          transition={{ duration: 1.1, delay: 0.08 + (piece.id % 6) * 0.03, ease: 'easeOut' }}
        />
      ))}
      <motion.svg viewBox="0 0 64 64" className="h-16 w-16" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
        <motion.circle cx="32" cy="32" r="28" fill="none" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
        <motion.path d="M20 33.5 L28.5 42 L45 24" fill="none" stroke="#4ade80" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.35 }} />
      </motion.svg>
      <h3 className="mt-4 font-display text-lg font-black text-white">{title}</h3>
      {text && <p className="mt-1 text-xs leading-5 text-white/50">{text}</p>}
    </div>
  );
}
