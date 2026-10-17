// src/components/shipments/MutationTab.tsx
import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  XCircle,
  RefreshCw,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IShipment,
  UpdateShipmentInput,
} from '../../types/shipment';
import { updateShipment, cancelShipment, getShipment } from '../../api/shipmentApi';
import CarrierBadge from './CarrierBadge';
import ShipmentStatusBadge from './ShipmentStatusBadge';

interface MutationTabProps {
  shipments: IShipment[];
  selectedShipmentId?: string;
  onRefreshList: () => void;
}

export const MutationTab: React.FC<MutationTabProps> = ({
  shipments,
  selectedShipmentId,
  onRefreshList,
}) => {
  const [activeShipmentId, setActiveShipmentId] = useState<string>(
    selectedShipmentId || (shipments[0]?._id ?? ''),
  );
  const [activeShipment, setActiveShipment] = useState<IShipment | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState<boolean>(false);

  // Update Form state
  const [expectedVersion, setExpectedVersion] = useState<number>(0);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderValueCOD, setOrderValueCOD] = useState<number>(0);
  const [destinationStationCode, setDestinationStationCode] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Result inspector state
  const [lastMutationResult, setLastMutationResult] = useState<{
    type: 'UPDATE' | 'CANCEL';
    status: number;
    data: any;
  } | null>(null);

  // Load shipment when activeShipmentId changes
  useEffect(() => {
    if (activeShipmentId) {
      loadShipmentData(activeShipmentId);
    }
  }, [activeShipmentId]);

  const loadShipmentData = async (id: string) => {
    if (!id || id.length !== 24) return;
    setFetchingDetails(true);
    try {
      const res = await getShipment(id);
      const sh = res.envelope.data.shipment;
      setActiveShipment(sh);
      setExpectedVersion(sh.stateVersion);
      setCustomerPhone(sh.customerPhoneMasked || '03001234567');
      setOrderValueCOD(sh.orderValueCOD);
      setDestinationStationCode(sh.destinationStationCode || '');
    } catch (err: any) {
      toast.error('Failed to load parcel: ' + (err.message || 'Unknown error'));
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleUpdate = async () => {
    if (!activeShipmentId) {
      toast.error('Please select or specify a shipment');
      return;
    }

    setUpdating(true);
    const patch: UpdateShipmentInput = {
      expectedVersion,
      orderValueCOD,
      destinationStationCode: destinationStationCode.trim() || undefined,
    };
    if (customerPhone && !customerPhone.includes('*')) {
      patch.customerPhone = customerPhone.trim();
    }

    try {
      const res = await updateShipment(activeShipmentId, patch);
      toast.success(
        `Updated successfully! Version bumped to v${res.envelope.data.stateVersion} (HTTP 200)`,
      );
      setLastMutationResult({
        type: 'UPDATE',
        status: res.status,
        data: res.envelope.data,
      });
      // Refresh current parcel
      loadShipmentData(activeShipmentId);
      onRefreshList();
    } catch (err: any) {
      setLastMutationResult({
        type: 'UPDATE',
        status: err.status || 500,
        data: err,
      });

      if (err.status === 409) {
        toast.error(`409 Conflict: Expected version mismatch (Optimistic Lock triggered)`);
      } else if (err.status === 422) {
        toast.error(`422 Unprocessable: Cannot mutate parcel in terminal state`);
      } else {
        toast.error(err.message || 'Update failed');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!activeShipmentId) {
      toast.error('Please select or specify a shipment');
      return;
    }

    setCancelling(true);
    try {
      const res = await cancelShipment(activeShipmentId);
      toast.success(`Shipment cancellation submitted! Disposition: ${res.envelope.data.disposition}`);
      setLastMutationResult({
        type: 'CANCEL',
        status: res.status,
        data: res.envelope.data,
      });
      loadShipmentData(activeShipmentId);
      onRefreshList();
    } catch (err: any) {
      setLastMutationResult({
        type: 'CANCEL',
        status: err.status || 500,
        data: err,
      });

      if (err.status === 422) {
        toast.error(`422 Unprocessable: Parcel is already in terminal state`);
      } else {
        toast.error(err.message || 'Cancellation failed');
      }
    } finally {
      setCancelling(false);
    }
  };

  const isTerminal = activeShipment
    ? ['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(activeShipment.status)
    : false;

  return (
    <div className="space-y-6">
      {/* Target Parcel Selector Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">
                Mutations & State Machine Engine
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test optimistic concurrency control (<code className="text-indigo-300">PATCH /api/shipments/:id</code>) and formal state engine cancellation (<code className="text-rose-300">POST /api/shipments/:id/cancel</code>).
            </p>
          </div>

          <button
            onClick={() => activeShipmentId && loadShipmentData(activeShipmentId)}
            disabled={fetchingDetails || !activeShipmentId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingDetails ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Reload Parcel</span>
          </button>
        </div>

        {/* Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Choose from Loaded Parcels:
            </label>
            <select
              value={activeShipmentId}
              onChange={(e) => setActiveShipmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">-- Select a parcel --</option>
              {shipments.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.trackingNumber} ({s.carrier}) — {s.status} [v{s.stateVersion}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Or Target Custom ObjectId:
            </label>
            <input
              type="text"
              placeholder="e.g. 6701f4c3917a4c90b6a71234"
              value={activeShipmentId}
              onChange={(e) => setActiveShipmentId(e.target.value.trim())}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Active Parcel Summary Pill */}
        {activeShipment && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-3">
              <CarrierBadge carrier={activeShipment.carrier} size="sm" />
              <span className="font-mono font-bold text-white">
                {activeShipment.trackingNumber}
              </span>
              <ShipmentStatusBadge status={activeShipment.status} size="sm" />
              <span className="font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                Current Version: v{activeShipment.stateVersion}
              </span>
            </div>

            {isTerminal && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Terminal State: Mutations are locked</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Operations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route 4: PATCH /api/shipments/:id */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <GitCommit className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Optimistic Concurrency Update
                </h4>
                <p className="font-mono text-[11px] text-amber-300">
                  PATCH /api/shipments/:id
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Requires <code className="text-amber-300">expectedVersion</code>. Atomically increments <code className="text-amber-300">stateVersion</code> by 1 upon success. If another worker mutated the document concurrently, returns <span className="font-semibold text-rose-400">HTTP 409 Conflict</span>.
          </p>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            {/* Expected Version & Conflict Generator */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="text-slate-300 font-medium">
                  Expected Version (Concurrency Lock) <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setExpectedVersion(999)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-mono underline"
                >
                  Test 409 Conflict (set to 999)
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={expectedVersion}
                onChange={(e) => setExpectedVersion(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Customer Phone (PK format)
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* COD Amount */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Order Value COD (₨)
              </label>
              <input
                type="number"
                min="0"
                value={orderValueCOD}
                onChange={(e) => setOrderValueCOD(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Station Code */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Destination Station Code
              </label>
              <input
                type="text"
                value={destinationStationCode}
                onChange={(e) => setDestinationStationCode(e.target.value)}
                placeholder="LHE-01"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <button
              onClick={handleUpdate}
              disabled={updating || !activeShipmentId}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-sans"
            >
              {updating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitCommit className="w-4 h-4" />
              )}
              <span>{updating ? 'Executing Update...' : 'Submit Optimistic Patch'}</span>
            </button>
          </div>
        </div>

        {/* Route 5: POST /api/shipments/:id/cancel */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  State Engine Formal Cancellation
                </h4>
                <p className="font-mono text-[11px] text-rose-300">
                  POST /api/shipments/:id/cancel
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers the <code className="text-rose-300">MERCHANT_CANCEL</code> transition in the state engine. Writes a ledger audit event to <code className="text-slate-300">ShipmentEvents</code> and enforces:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>State Transition:</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="text-indigo-300">{activeShipment?.status || 'CURRENT'}</span>
                  <span>➔</span>
                  <span className="text-rose-400 font-bold">CANCELLED</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Engine Side-Effects:</span>
                </div>
                <div className="font-mono text-[11px] text-indigo-300">
                  [PURGE_PENDING_OUTBOX]
                </div>
                <p className="text-[11px] text-slate-500">
                  Purges pending WhatsApp utility templates and notices queued in BullMQ.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={handleCancel}
              disabled={cancelling || !activeShipmentId || isTerminal}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isTerminal
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              {cancelling ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>
                {cancelling
                  ? 'Processing Cancellation...'
                  : isTerminal
                  ? `Cannot Cancel (${activeShipment?.status})`
                  : 'Execute Merchant Cancel'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Response Inspector Card */}
      {lastMutationResult && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-3 animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  lastMutationResult.status < 300
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                HTTP {lastMutationResult.status}
              </span>
              <span className="text-slate-300 font-semibold font-sans">
                {lastMutationResult.type === 'UPDATE' ? 'PATCH' : 'CANCEL'} Response Preview
              </span>
            </div>
          </div>

          <pre className="p-3.5 rounded-xl bg-black/60 border border-white/5 text-slate-300 overflow-x-auto max-h-48 text-[11px]">
            {JSON.stringify(lastMutationResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MutationTab;
