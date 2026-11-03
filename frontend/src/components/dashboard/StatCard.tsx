// src/components/dashboard/StatCard.tsx
import React from 'react';
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
    ? 'text-xs sm:text-sm md:text-base lg:text-lg xl:text-3xl'
    : isLong
    ? 'text-sm sm:text-base md:text-lg lg:text-xl xl:text-4xl'
    : 'text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-5xl';

  return (
    <div
      className={cn(
        'relative w-full h-[110px] sm:h-[125px] md:h-[135px] lg:h-[145px] xl:h-[170px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 sm:p-3 md:p-3.5 lg:p-4 xl:p-5 flex flex-col items-center justify-center text-center select-none shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors',
        className,
      )}
    >
      {/* Value */}
      <div
        className={cn(
          'font-extrabold font-mono tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100',
          valueFontSize,
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div className="mt-1 sm:mt-1.5 md:mt-2 xl:mt-3 text-[11px] sm:text-xs md:text-xs lg:text-xs xl:text-base font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        {label}
      </div>

      {/* Subtext */}
      {subtext && (
        <div className="mt-0.5 sm:mt-1 xl:mt-1.5 text-[9px] sm:text-[10px] md:text-[10px] lg:text-[11px] xl:text-[13px] font-mono text-zinc-500 dark:text-zinc-400 font-medium tracking-tight truncate max-w-full px-1">
          {subtext}
        </div>
      )}
    </div>
  );
};

export default StatCard;
