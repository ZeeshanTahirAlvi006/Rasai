// src/components/dashboard/StatCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  value: string;
  label: string;
  subtext?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  subtext,
  className,
}) => {
  // If value is long (e.g. PKR 2,450,000), adaptively scale text size
  const isLong = value.length > 7;
  const isVeryLong = value.length > 12;

  const valueFontSize = isVeryLong
    ? 'text-lg sm:text-xl xl:text-2xl'
    : isLong
    ? 'text-xl sm:text-2xl xl:text-3xl'
    : 'text-3xl sm:text-4xl xl:text-5xl';

  return (
    <div
      className={cn(
        'relative w-full h-[200px] rounded-xl overflow-hidden p-[2px] bg-gradient-to-br from-neutral-800 via-neutral-900 to-black select-none',
        className,
      )}
    >
      {/* Moving halo */}
      <motion.div
        className="absolute w-12 h-12 rounded-full bg-white/20 blur-xl pointer-events-none"
        animate={{
          top: ['10%', '10%', '75%', '75%', '10%'],
          left: ['10%', '80%', '80%', '10%', '10%'],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner Card */}
      <div className="relative flex flex-col items-center justify-center w-full h-full rounded-lg border border-white/10 bg-gradient-to-br from-neutral-900/80 to-black/60 backdrop-blur-md px-3 text-center">
        {/* Rotating Ray */}
        <motion.div
          className="absolute w-[220px] h-[50px] rounded-full bg-white/10 blur-2xl pointer-events-none"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        {/* Value */}
        <motion.div
          className={cn(
            'font-extrabold font-mono tabular-nums tracking-tight bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent',
            valueFontSize,
          )}
          animate={{
            textShadow: [
              '0 0 10px rgba(255,255,255,0.6)',
              '0 0 2px rgba(255,255,255,0.2)',
              '0 0 10px rgba(255,255,255,0.6)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          {value}
        </motion.div>

        {/* Label */}
        <div className="mt-2.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
          {label}
        </div>

        {/* Subtext */}
        {subtext && (
          <div className="mt-1 text-[10px] font-mono text-neutral-400 tracking-tight">
            {subtext}
          </div>
        )}

        {/* Subtle lines */}
        <motion.div
          className="absolute top-[12%] w-[80%] h-[1px] bg-gradient-to-r from-white/30 to-transparent pointer-events-none"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[12%] w-[80%] h-[1px] bg-gradient-to-r from-transparent to-white/30 pointer-events-none"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>
    </div>
  );
};

export default StatCard;
