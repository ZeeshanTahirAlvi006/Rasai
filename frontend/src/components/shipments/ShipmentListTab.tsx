// src/components/shipments/ShipmentListTab.tsx
import React, { useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Edit2,
  XCircle,
  ChevronRight,
  ArrowRight,
  Package,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IShipment,
  Carrier,
  ShipmentStatus,
  TrackingHealth,
  ListShipmentsFilter,
} from '../../types/shipment';
import { CARRIERS, SHIPMENT_STATUSES } from '../../types/shipment';
import CarrierBadge from './CarrierBadge';
import ShipmentStatusBadge from './ShipmentStatusBadge';

interface ShipmentListTabProps {
  shipments: IShipment[];
  nextCursor?: string;
  loading: boolean;
  onRefresh: () => void;
  onApplyFilters: (filter: ListShipmentsFilter) => void;
  onLoadMore: (cursor: string) => void;
  onOpenDetails: (shipment: IShipment) => void;
  onOpenEdit: (shipment: IShipment) => void;
  onOpenCancel: (shipment: IShipment) => void;
  onNavigateToBulk: () => void;
}

export const ShipmentListTab: React.FC<ShipmentListTabProps> = ({
  shipments,
  nextCursor,
  loading,
  onRefresh,
  onApplyFilters,
  onLoadMore,
  onOpenDetails,
  onOpenEdit,
  onOpenCancel,
  onNavigateToBulk,
}) => {
  const [carrier, setCarrier] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [trackingHealth, setTrackingHealth] = useState<string>('');
  const [needsManifest, setNeedsManifest] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [limit, setLimit] = useState<number>(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const filter: ListShipmentsFilter = {
      limit,
    };
    if (carrier) filter.carrier = carrier as Carrier;
    if (status) filter.status = status as ShipmentStatus;
    if (trackingHealth) filter.trackingHealth = trackingHealth as TrackingHealth;
    if (needsManifest === 'true') filter.needsManifest = true;
    if (needsManifest === 'false') filter.needsManifest = false;
    if (trackingNumber.trim()) filter.trackingNumber = trackingNumber.trim();

    onApplyFilters(filter);
  };

  const handleResetFilters = () => {
    setCarrier('');
    setStatus('');
    setTrackingHealth('');
    setNeedsManifest('');
    setTrackingNumber('');
    setLimit(20);
    onApplyFilters({ limit: 20 });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied tracking number');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const hasActiveFilters = Boolean(
    carrier || status || trackingHealth || needsManifest || trackingNumber,
  );

  return (
    <div className="space-y-6">
      {/* Search & Filters Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Filter & Query Ledger</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Filters Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Input Grid */}
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Tracking Number Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Tracking # (e.g. TRK-001)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full pl-9.5 pr-3.5 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Carrier Select */}
          <div>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Carriers</option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Statuses</option>
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Health Select */}
          <div>
            <select
              value={trackingHealth}
              onChange={(e) => setTrackingHealth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Health</option>
              <option value="HEALTHY">HEALTHY</option>
              <option value="DEGRADED">DEGRADED</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Secondary Filters Bar */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Run-sheet Manifest:</span>
              <select
                value={needsManifest}
                onChange={(e) => {
                  setNeedsManifest(e.target.value);
                  setTimeout(() => handleFilterSubmit(), 0);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-white/10 text-[11px] text-slate-300 font-mono"
              >
                <option value="">Any</option>
                <option value="true">Needs Manifest</option>
                <option value="false">Standard</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>Batch Limit:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setTimeout(() => handleFilterSubmit(), 0);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-white/10 text-[11px] text-slate-300 font-mono"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          <div className="font-mono text-[11px]">
            Loaded: <span className="text-white font-semibold">{shipments.length}</span> parcels
          </div>
        </div>
      </div>

      {/* Shipments Table Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
        {loading && shipments.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Loading shipments from MongoDB ledger...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No Shipments Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No parcels matched your current criteria, or none have been ingested yet.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
                >
                  Reset Active Filters
                </button>
              )}
              <button
                onClick={onNavigateToBulk}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ingest Sample Shipments</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-3">Carrier</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">COD Amount</th>
                  <th className="py-3.5 px-3">Customer Phone</th>
                  <th className="py-3.5 px-3">Station</th>
                  <th className="py-3.5 px-3 text-center">NDR Att.</th>
                  <th className="py-3.5 px-3 text-center">Version</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shipments.map((s) => {
                  const isTerminal = ['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(s.status);
                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      {/* Tracking Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenDetails(s)}
                            className="hover:text-indigo-300 hover:underline transition-colors text-left"
                            title="Click to view details & event timeline"
                          >
                            {s.trackingNumber}
                          </button>
                          <button
                            onClick={() => handleCopy(s.trackingNumber, s._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-white transition-opacity"
                            title="Copy tracking number"
                          >
                            {copiedId === s._id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Carrier */}
                      <td className="py-3.5 px-3">
                        <CarrierBadge carrier={s.carrier} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <ShipmentStatusBadge status={s.status} size="sm" />
                      </td>

                      {/* COD Amount */}
                      <td className="py-3.5 px-3 font-mono text-slate-200">
                        PKR {s.orderValueCOD.toLocaleString()}
                      </td>

                      {/* Phone (Masked) */}
                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {s.customerPhoneMasked || '•••••••••••'}
                      </td>

                      {/* Station Code */}
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {s.destinationStationCode || (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* NDR Attempts */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${s.ndrAttempt > 0
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'text-slate-500'
                            }`}
                        >
                          {s.ndrAttempt}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-white/10">
                          v{s.stateVersion}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDetails(s)}
                            title="Inspect Details & Ledger Timeline (GET /api/shipments/:id)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenEdit(s)}
                            disabled={isTerminal}
                            title={
                              isTerminal
                                ? `Cannot edit in terminal state (${s.status})`
                                : 'Update Parcel Metadata (PATCH /api/shipments/:id)'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${isTerminal
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                              }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenCancel(s)}
                            disabled={isTerminal}
                            title={
                              isTerminal
                                ? `Already in terminal state (${s.status})`
                                : 'Cancel via State Engine (POST /api/shipments/:id/cancel)'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${isTerminal
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cursor Pagination Bar */}
        {nextCursor && (
          <div className="p-4 bg-slate-950/90 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Next Cursor:</span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-indigo-300">
                {nextCursor}
              </span>
            </div>

            <button
              onClick={() => onLoadMore(nextCursor)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span>Load Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentListTab;
