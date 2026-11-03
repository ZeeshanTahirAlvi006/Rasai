// src/pages/dashboard/NdrTriagePage.tsx
import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment } from '../../types/shipment';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';

type TriageFilter = 'All' | '1st Attempt' | '2nd Attempt' | 'RTO Pending' | 'Rescheduled';

function getStatusDisplay(status: string): { label: string; colorClass: string } {
  switch (status) {
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
      return { label: status || 'Active', colorClass: 'text-amber-500 dark:text-amber-400' };
  }
}

export const NdrTriagePage: React.FC = () => {
  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();

  const [activeFilter, setActiveFilter] = useState<TriageFilter>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTriageParcels = async () => {
    setLoading(true);
    try {
      const res = await listShipments({ limit: 100 });
      setShipments(res.envelope.data.shipments || []);
    } catch (err: any) {
      if (err.status !== 401) {
        toast.error('Failed to load triage exceptions: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriageParcels();
  }, []);

  const filteredParcels = shipments.filter((parcel) => {
    if (carrierFilter !== 'ALL' && parcel.carrier !== carrierFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrack = parcel.trackingNumber.toLowerCase().includes(q);
      const matchStation = (parcel.destinationStationCode || '').toLowerCase().includes(q);
      const matchPhone = (parcel.customerPhoneMasked || '').toLowerCase().includes(q);
      if (!matchTrack && !matchStation && !matchPhone) return false;
    }

    switch (activeFilter) {
      case '1st Attempt':
        return parcel.status === 'NDR_ACTIVE' && parcel.ndrAttempt === 1;
      case '2nd Attempt':
        return parcel.status === 'NDR_ACTIVE' && (parcel.ndrAttempt ?? 1) >= 2;
      case 'RTO Pending':
        return parcel.status === 'RTO_INITIATED';
      case 'Rescheduled':
        return parcel.status === 'RESOLVED_RESCHEDULED';
      case 'All':
      default:
        return (
          parcel.status === 'NDR_ACTIVE' ||
          parcel.status === 'RTO_INITIATED' ||
          parcel.status === 'RESOLVED_RESCHEDULED'
        );
    }
  });

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Table Controls / Filter Toolbar */}
      <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Icon Dropdown: "All", "1st Attempt", "2nd Attempt" etc */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-white dark:bg-zinc-950 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as TriageFilter)}
              className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">All</option>
              <option value="1st Attempt" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">1st Attempt</option>
              <option value="2nd Attempt" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">2nd Attempt</option>
              <option value="RTO Pending" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">RTO Pending</option>
              <option value="Rescheduled" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Rescheduled</option>
            </select>
          </div>

          {/* Carrier Filter Dropdown */}
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-border bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">ALL COURIERS</option>
            <option value="POSTEX" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">POSTEX</option>
            <option value="TRAX" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">TRAX</option>
            <option value="LEOPARDS" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">LEOPARDS</option>
            <option value="TCS" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">TCS</option>
          </select>
        </div>

        {/* Right side: Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-border pl-8 pr-3 py-1.5 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden"
            />
          </div>

          <button
            onClick={fetchTriageParcels}
            disabled={loading}
            className="p-1.5 border border-border bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Table extended from Dashboard Table Component */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Actionable NDR triage queue"
        className="border border-border bg-white dark:bg-zinc-950 shadow-xs focus:outline-hidden"
      >
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              {/* 1. Tracking Number */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tracking Number
              </TableHead>

              {/* 2. Station */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Station
              </TableHead>

              {/* 3. Status */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>

              {/* 4. Attempt */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Attempt
              </TableHead>

              {/* 5. Amount */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                Amount
              </TableHead>

              {/* 6. Phone (hidden on mobile and tablet) */}
              <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Phone
              </TableHead>

              {/* 7. Manifest */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Manifest
              </TableHead>

              {/* 8. Updated (hidden on mobile and tablet) */}
              <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Updated
              </TableHead>

              {/* 9. Action */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParcels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground text-xs">
                  {loading ? 'Loading triage exceptions...' : 'No actionable parcels matching filter criteria.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredParcels.map((parcel) => {
                const { label: statusLabel, colorClass: statusColor } = getStatusDisplay(parcel.status);

                return (
                  <TableRow
                    key={parcel._id}
                    onClick={() => openInspection(parcel._id)}
                    className="cursor-pointer text-xs transition-colors hover:bg-muted/50"
                  >
                    {/* 1. Tracking Number */}
                    <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {parcel.trackingNumber}
                    </TableCell>

                    {/* 2. Station */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                      {parcel.destinationStationCode || 'UNASSIGNED'}
                    </TableCell>

                    {/* 3. Status */}
                    <TableCell className={`py-2.5 px-3 font-semibold ${statusColor}`}>
                      {statusLabel}
                    </TableCell>

                    {/* 4. Attempt */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 font-bold text-amber-500 dark:text-amber-400">
                      #{parcel.ndrAttempt ?? 1}
                    </TableCell>

                    {/* 5. Amount */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums">
                      PKR {parcel.orderValueCOD?.toLocaleString() ?? 0}
                    </TableCell>

                    {/* 6. Phone (hidden on mobile and tablet) */}
                    <TableCell className="hidden xl:table-cell py-2.5 px-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                      {parcel.customerPhoneMasked || 'N/A'}
                    </TableCell>

                    {/* 7. Manifest */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3">
                      {parcel.needsManifest ? (
                        <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] uppercase font-bold">
                          YES
                        </span>
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-600 text-[10px]">NO</span>
                      )}
                    </TableCell>

                    {/* 8. Updated (hidden on mobile and tablet) */}
                    <TableCell className="hidden xl:table-cell py-2.5 px-3 text-[11px] text-zinc-500">
                      {parcel.updatedAt ? new Date(parcel.updatedAt).toLocaleTimeString() : 'N/A'}
                    </TableCell>

                    {/* 9. Action */}
                    <TableCell className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openInspection(parcel._id)}
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
      </div>
    </div>
  );
};

export default NdrTriagePage;
