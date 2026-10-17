// src/components/shipments/ShipmentStatusBadge.tsx
import React from 'react';
import type { ShipmentStatus } from '../../types/shipment';
import {
  Clock,
  Truck,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  CalendarCheck,
} from 'lucide-react';

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ShipmentStatusBadge: React.FC<ShipmentStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const getMeta = (st: string) => {
    switch (st) {
      case 'BOOKED':
        return {
          bg: 'bg-cyan-500/15',
          border: 'border-cyan-500/30',
          text: 'text-cyan-300',
          glow: 'shadow-cyan-500/10',
          icon: Clock,
          label: 'Booked',
        };
      case 'IN_TRANSIT':
        return {
          bg: 'bg-indigo-500/15',
          border: 'border-indigo-500/30',
          text: 'text-indigo-300',
          glow: 'shadow-indigo-500/10',
          icon: Truck,
          label: 'In Transit',
        };
      case 'OUT_FOR_DELIVERY':
        return {
          bg: 'bg-sky-500/15',
          border: 'border-sky-500/30',
          text: 'text-sky-300',
          glow: 'shadow-sky-500/10',
          icon: Send,
          label: 'Out For Delivery',
        };
      case 'NDR_ACTIVE':
        return {
          bg: 'bg-amber-500/20 animate-pulse',
          border: 'border-amber-500/40',
          text: 'text-amber-300',
          glow: 'shadow-amber-500/20',
          icon: AlertTriangle,
          label: 'NDR Active',
        };
      case 'RESOLVED_RESCHEDULED':
        return {
          bg: 'bg-teal-500/15',
          border: 'border-teal-500/30',
          text: 'text-teal-300',
          glow: 'shadow-teal-500/10',
          icon: CalendarCheck,
          label: 'Rescheduled',
        };
      case 'RTO_INITIATED':
        return {
          bg: 'bg-orange-500/15',
          border: 'border-orange-500/30',
          text: 'text-orange-300',
          glow: 'shadow-orange-500/10',
          icon: RotateCcw,
          label: 'RTO Initiated',
        };
      case 'RTO_DELIVERED':
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-300',
          glow: 'shadow-rose-500/10',
          icon: RotateCcw,
          label: 'RTO Delivered',
        };
      case 'DELIVERED':
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-300',
          glow: 'shadow-emerald-500/10',
          icon: CheckCircle2,
          label: 'Delivered',
        };
      case 'CANCELLED':
        return {
          bg: 'bg-slate-500/20',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          glow: 'shadow-slate-500/5',
          icon: XCircle,
          label: 'Cancelled',
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/20',
          text: 'text-slate-300',
          glow: 'shadow-none',
          icon: Clock,
          label: st,
        };
    }
  };

  const meta = getMeta(status);
  const Icon = meta.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm font-medium tracking-tight ${meta.bg} ${meta.border} ${meta.text} ${meta.glow} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{meta.label}</span>
    </span>
  );
};

export default ShipmentStatusBadge;
