import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { pageVariants } from './motion';
import { prefersReducedMotion } from '@/lib/haptics';

const depth = (path: string) => path.split('/').filter(Boolean).length;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const prevRef = React.useRef(location);
  const back = depth(location) < depth(prevRef.current);
  React.useEffect(() => { prevRef.current = location; }, [location]);

  if (prefersReducedMotion()) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false} custom={back}>
      <motion.div key={location} custom={back} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="will-change-transform">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
