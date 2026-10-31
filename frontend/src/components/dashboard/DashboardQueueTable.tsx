// src/components/dashboard/DashboardQueueTable.tsx
import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/table';
import type { IShipment } from '../../types/shipment';

export interface DashboardQueueTableProps {
  shipments: IShipment[];
  onInspect: (id: string) => void;
  emptyMessage?: string;
  isDisputeQueue?: boolean;
}

/**
 * Returns single-word status text and color class without pill styling.
 */
function getStatusDisplay(shipment: IShipment, isDisputeQueue: boolean): { label: string; colorClass: string } {
  if (isDisputeQueue && shipment.disputeStatus && shipment.disputeStatus !== 'NONE') {
    switch (shipment.disputeStatus) {
      case 'PENDING':
        return { label: 'Pending', colorClass: 'text-orange-500 dark:text-orange-400' };
      case 'SUBMITTED':
        return { label: 'Submitted', colorClass: 'text-amber-500 dark:text-amber-400' };
      case 'SETTLED':
        return { label: 'Settled', colorClass: 'text-emerald-500 dark:text-emerald-400' };
      case 'RETRACTED':
        return { label: 'Retracted', colorClass: 'text-zinc-500 dark:text-zinc-400' };
      default:
        return { label: 'Disputed', colorClass: 'text-rose-500 dark:text-rose-400' };
    }
  }

  // Parcel delivery / NDR status
  switch (shipment.status) {
    case 'NDR_ACTIVE':
      return { label: 'Active', colorClass: 'text-amber-500 dark:text-amber-400' };
    case 'RTO_INITIATED':
      return { label: 'Initiated', colorClass: 'text-rose-500 dark:text-rose-400' };
    case 'RTO_DELIVERED':
      return { label: 'Returned', colorClass: 'text-rose-600 dark:text-rose-500' };
    case 'RESOLVED_RESCHEDULED':
      return { label: 'Rescheduled', colorClass: 'text-cyan-600 dark:text-cyan-400' };
    case 'DELIVERED':
      return { label: 'Delivered', colorClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'OUT_FOR_DELIVERY':
      return { label: 'Outbound', colorClass: 'text-sky-500 dark:text-sky-400' };
    case 'IN_TRANSIT':
      return { label: 'Transit', colorClass: 'text-blue-500 dark:text-blue-400' };
    case 'CANCELLED':
      return { label: 'Cancelled', colorClass: 'text-zinc-500 dark:text-zinc-400' };
    case 'BOOKED':
      return { label: 'Booked', colorClass: 'text-zinc-600 dark:text-zinc-400' };
    default:
      return { label: 'Active', colorClass: 'text-amber-500 dark:text-amber-400' };
  }
}

export const DashboardQueueTable: React.FC<DashboardQueueTableProps> = ({
  shipments,
  onInspect,
  emptyMessage = 'No records in queue.',
  isDisputeQueue = false,
}) => {
  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tracking Number
          </TableHead>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Attempt
          </TableHead>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Station
          </TableHead>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">
            Amount
          </TableHead>
          <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          shipments.map((shipment) => {
            const { label: statusLabel, colorClass: statusColor } = getStatusDisplay(
              shipment,
              isDisputeQueue,
            );

            return (
              <TableRow
                key={shipment._id}
                onClick={() => onInspect(shipment._id)}
                className="cursor-pointer text-xs transition-colors hover:bg-muted/50"
              >
                {/* 1. Tracking Number (plain text, no logistic pill) */}
                <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                  {shipment.trackingNumber}
                </TableCell>

                {/* 2. Status (plain colored text, one word, no pills) */}
                <TableCell className={`py-2.5 px-3 font-semibold ${statusColor}`}>
                  {statusLabel}
                </TableCell>

                {/* 3. Attempt */}
                <TableCell className="py-2.5 px-3 font-bold text-amber-500 dark:text-amber-400">
                  #{shipment.ndrAttempt ?? 1}
                </TableCell>

                {/* 4. Station */}
                <TableCell className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                  {shipment.destinationStationCode || 'UNASSIGNED'}
                </TableCell>

                {/* 5. Amount */}
                <TableCell className="py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums">
                  PKR {shipment.orderValueCOD?.toLocaleString() ?? 0}
                </TableCell>

                {/* 6. Action */}
                <TableCell className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onInspect(shipment._id)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    INSPECT ↗
                  </button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default DashboardQueueTable;
