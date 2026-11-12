// src/pages/dashboard/ShipmentsDirectoryPage.tsx
import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  X,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment, ListShipmentsFilter, Carrier, ShipmentStatus } from '../../types/shipment';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import BulkIngestionTab from '../../components/shipments/BulkIngestionTab';

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

export const ShipmentsDirectoryPage: React.FC = () => {
  const { openInspection } = useShipmentInspection();

  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState<boolean>(false);

  const fetchShipments = async (cursor?: string) => {
    setLoading(true);
    try {
      const filter: ListShipmentsFilter = { limit: 50 };
      if (carrierFilter !== 'ALL') filter.carrier = carrierFilter as Carrier;
      if (statusFilter !== 'ALL') filter.status = statusFilter as ShipmentStatus;
      if (searchQuery.trim()) filter.trackingNumber = searchQuery.trim();
      if (cursor) filter.cursor = cursor;

      const res = await listShipments(filter);
      if (cursor) {
        setShipments((prev) => [...prev, ...res.envelope.data.shipments]);
      } else {
        setShipments(res.envelope.data.shipments || []);
      }
      setNextCursor(res.envelope.data.nextCursor);
    } catch (err: any) {
      if (err.status !== 401 && err.response?.status !== 401) {
        toast.error(typeof err?.message === 'string' ? err.message : 'Failed to fetch shipments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [carrierFilter, statusFilter]);

  // Handle ESC key to close upload drawer (Light-Dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploadDrawerOpen) {
        setUploadDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadDrawerOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShipments();
  };

  const filteredShipments = shipments.filter((s) => {
    if (carrierFilter !== 'ALL' && s.carrier !== carrierFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrack = s.trackingNumber.toLowerCase().includes(q);
      const matchStation = (s.destinationStationCode || '').toLowerCase().includes(q);
      const matchPhone = (s.customerPhoneMasked || '').toLowerCase().includes(q);
      if (!matchTrack && !matchStation && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Table Controls / Filter Toolbar matching Triage Desk */}
      <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-white dark:bg-zinc-950 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">All Statuses</option>
              <option value="NDR_ACTIVE" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Active (NDR)</option>
              <option value="OUT_FOR_DELIVERY" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Outbound</option>
              <option value="IN_TRANSIT" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">In Transit</option>
              <option value="DELIVERED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Delivered</option>
              <option value="RTO_INITIATED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">RTO Initiated</option>
              <option value="RTO_DELIVERED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">RTO Delivered</option>
              <option value="RESOLVED_RESCHEDULED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Rescheduled</option>
              <option value="BOOKED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Booked</option>
              <option value="CANCELLED" className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">Cancelled</option>
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

        {/* Right side: Search, Upload & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-border pl-8 pr-3 py-1.5 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden"
            />
          </form>

          {/* Upload Shipments Button */}
          <button
            onClick={() => setUploadDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-muted font-bold text-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Shipments</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchShipments()}
            disabled={loading}
            className="p-1.5 border border-border bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Shipments Action Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Shipments master directory table"
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

              {/* 6. Phone (hidden on tablet and mobile) */}
              <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Phone
              </TableHead>

              {/* 7. Manifest */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Manifest
              </TableHead>

              {/* 8. Updated (hidden on tablet and mobile) */}
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
            {filteredShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground text-xs">
                  {loading ? 'Loading shipments from ledger...' : 'No shipments found matching criteria.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredShipments.map((s) => {
                const { label: statusLabel, colorClass: statusColor } = getStatusDisplay(s.status);

                return (
                  <TableRow
                    key={s._id}
                    onClick={() => openInspection(s._id)}
                    className="cursor-pointer text-xs transition-colors hover:bg-muted/50"
                  >
                    {/* 1. Tracking Number */}
                    <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {s.trackingNumber}
                    </TableCell>

                    {/* 2. Station */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                      {s.destinationStationCode || 'UNASSIGNED'}
                    </TableCell>

                    {/* 3. Status */}
                    <TableCell className={`py-2.5 px-3 font-semibold ${statusColor}`}>
                      {statusLabel}
                    </TableCell>

                    {/* 4. Attempt */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 font-bold text-amber-500 dark:text-amber-400">
                      #{s.ndrAttempt ?? 1}
                    </TableCell>

                    {/* 5. Amount */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums">
                      PKR {s.orderValueCOD?.toLocaleString() ?? 0}
                    </TableCell>

                    {/* 6. Phone (hidden on tablet and mobile) */}
                    <TableCell className="hidden xl:table-cell py-2.5 px-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                      {s.customerPhoneMasked || 'N/A'}
                    </TableCell>

                    {/* 7. Manifest */}
                    <TableCell className="hidden md:table-cell py-2.5 px-3">
                      {s.needsManifest ? (
                        <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] uppercase font-bold">
                          YES
                        </span>
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-600 text-[10px]">NO</span>
                      )}
                    </TableCell>

                    {/* 8. Updated (hidden on tablet and mobile) */}
                    <TableCell className="hidden xl:table-cell py-2.5 px-3 text-[11px] text-zinc-500">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : 'N/A'}
                    </TableCell>

                    {/* 9. Action */}
                    <TableCell className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openInspection(s._id)}
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

        {/* Cursor Pagination / Load More Footer */}
        {nextCursor && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
            <span>Loaded {shipments.length} parcels</span>
            <button
              onClick={() => fetchShipments(nextCursor)}
              disabled={loading}
              className="px-3 py-1.5 border border-border bg-white dark:bg-zinc-950 hover:bg-muted font-bold text-xs uppercase text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More ↗'}
            </button>
          </div>
        )}
      </div>

      {/* Slide-Over Drawer for 'Upload Shipments' with backdrop blur */}
      {uploadDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setUploadDrawerOpen(false)}
        >
          <div
            className="w-full max-w-3xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col text-zinc-100 shadow-2xl overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upload Shipments"
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-border bg-zinc-900/90 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white uppercase tracking-wider">
                  Upload Shipments
                </span>
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 border border-zinc-700">
                  UP TO 500 ROWS
                </span>
              </div>
              <button
                onClick={() => setUploadDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Workspace Body */}
            <div className="flex-1 overflow-y-auto p-5 font-sans">
              <BulkIngestionTab
                onSuccess={() => {
                  fetchShipments();
                  setUploadDrawerOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentsDirectoryPage;
