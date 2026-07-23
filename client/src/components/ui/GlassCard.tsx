/**
 * VRVerse Player — Glass Card Component
 * Reusable glassmorphism container.
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type GlassCardProps = React.ComponentProps<typeof motion.div> & {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
};

export function GlassCard({ children, className = '', hover = true, glow = false, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`
        bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg
        ${hover ? 'transition-all duration-300 hover:bg-white/[0.08] hover:border-white/15 hover:shadow-xl' : ''}
        ${glow ? 'animate-glow' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
