import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { pageVariants } from './motion';
import { prefersReducedMotion } from '@/lib/haptics';

const depth = (path: string) => path.split('/').filter(Boolean).length;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const prevRef = React.useRef(location);
  const back = depth(location) < depth(prevRef.current);
  React.useEffect(() => {
    if (prevRef.current !== location) window.scrollTo({ top: 0, behavior: 'auto' });
    prevRef.current = location;
  }, [location]);

  if (prefersReducedMotion()) return <>{children}</>;

  return (
    <motion.div key={location} custom={back} variants={pageVariants} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}
