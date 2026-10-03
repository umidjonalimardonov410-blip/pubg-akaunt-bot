import type { Transition, Variants } from 'framer-motion';

/** Tabiiy spring fizikasi — chiziqli emas. */
export const spring: Transition = { type: 'spring', stiffness: 300, damping: 25, mass: 0.9 };
export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 28 };

/** Tugma press: 0.96 ga siqiladi. */
export const pressable = {
  whileTap: { scale: 0.96 },
  transition: spring,
} as const;

/** Ro'yxat: 40ms stagger bilan birin-ketin chiqadi. */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

/** Sahifa o'tishi: o'ngdan sirg'alib kiradi, orqaga chapga chiqadi. */
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 1, transition: { duration: 0 } },
};
