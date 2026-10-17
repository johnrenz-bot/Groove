'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return <div className="w-full flex-1">{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        ease: [0.2, 0.8, 0.2, 1], // Matches course.marwieang.com easing curve
      }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
