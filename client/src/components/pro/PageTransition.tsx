import React from 'react';
import { useLocation } from 'wouter';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const prevRef = React.useRef(location);
  React.useEffect(() => {
    if (prevRef.current !== location) window.scrollTo({ top: 0, behavior: 'auto' });
    prevRef.current = location;
  }, [location]);

  return <>{children}</>;
}
