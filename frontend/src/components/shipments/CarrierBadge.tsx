// src/components/shipments/CarrierBadge.tsx
import React from 'react';
import type { Carrier } from '../../types/shipment';

interface CarrierBadgeProps {
  carrier: Carrier | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const CarrierBadge: React.FC<CarrierBadgeProps> = ({
  carrier,
  size = 'md',
  showDot = true,
}) => {
  const getStyles = (c: string) => {
    switch (c) {
      case 'POSTEX':
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-300',
          dot: 'bg-rose-400',
          label: 'PostEx',
        };
      case 'TRAX':
        return {
          bg: 'bg-blue-500/15',
          border: 'border-blue-500/30',
          text: 'text-blue-300',
          dot: 'bg-blue-400',
          label: 'Trax',
        };
      case 'LEOPARDS':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-300',
          dot: 'bg-amber-400',
          label: 'Leopards',
        };
      case 'TCS':
        return {
          bg: 'bg-red-500/15',
          border: 'border-red-500/30',
          text: 'text-red-300',
          dot: 'bg-red-400',
          label: 'TCS',
        };
      default:
        return {
          bg: 'bg-slate-500/15',
          border: 'border-slate-500/30',
          text: 'text-slate-300',
          dot: 'bg-slate-400',
          label: c,
        };
    }
  };

  const style = getStyles(carrier);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium font-mono ${style.bg} ${style.border} ${style.text} ${sizeClasses[size]}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span>{style.label}</span>
    </span>
  );
};

export default CarrierBadge;
