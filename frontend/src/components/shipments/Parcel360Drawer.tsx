// src/components/shipments/Parcel360Drawer.tsx
// Comprehensive parcel 360 inspector: status telemetry, timeline ledger, mutations, and linked modules.
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import type { IShipment, IShipmentEvent, UpdateShipmentInput } from '../../types/shipment';
import { getShipment, updateShipment, cancelShipment } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import { cn } from '../../lib/utils';

const CARRIER_LABELS: Record<string, string> = {
  POSTEX: 'PostEx',
  TRAX: 'Trax',
  LEOPARDS: 'Leopards',
  TCS: 'TCS',
};

// Plain text status styling with semantic text color (Zero background/pill per project standards)
const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  NDR_ACTIVE: 'NDR Active',
  DELIVERED: 'Delivered',
  RTO_REQUESTED: 'RTO Requested',
  RTO_IN_TRANSIT: 'RTO In Transit',
  RTO_DELIVERED: 'RTO Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  BOOKED: 'text-blue-600 dark:text-blue-400 font-bold',
  IN_TRANSIT: 'text-cyan-600 dark:text-cyan-400 font-bold',
  OUT_FOR_DELIVERY: 'text-indigo-600 dark:text-indigo-400 font-bold',
  NDR_ACTIVE: 'text-amber-600 dark:text-amber-400 font-bold',
  DELIVERED: 'text-emerald-600 dark:text-emerald-400 font-bold',
  RTO_REQUESTED: 'text-rose-600 dark:text-rose-400 font-bold',
  RTO_IN_TRANSIT: 'text-rose-600 dark:text-rose-400 font-bold',
  RTO_DELIVERED: 'text-rose-700 dark:text-rose-300 font-bold',
  CANCELLED: 'text-zinc-500 font-bold',
};

const DISPOSITION_TEXT_COLORS: Record<string, string> = {
  APPLIED: 'text-emerald-600 dark:text-emerald-400 font-bold',
  DUPLICATE: 'text-amber-600 dark:text-amber-400 font-bold',
  IGNORED: 'text-zinc-500 font-bold',
  REJECTED: 'text-rose-600 dark:text-rose-400 font-bold',
};

const getTimelineDotColor = (disposition?: string, rawStatus?: string): string => {
  if (disposition === 'APPLIED') return 'bg-emerald-500';
  if (disposition === 'DUPLICATE') return 'bg-amber-500';
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('deliver') && !s.includes('undeliver')) return 'bg-emerald-500';
  if (s.includes('fail') || s.includes('ndr') || s.includes('cancel') || s.includes('rto')) return 'bg-rose-500';
  if (s.includes('transit') || s.includes('dispatch') || s.includes('pick')) return 'bg-blue-500';
  return 'bg-zinc-400';
};

const formatDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
};

export const Parcel360Drawer: React.FC = () => {
  const { isOpen, selectedShipmentId, closeInspection } = useShipmentInspection();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<IShipment | null>(null);
  const [timeline, setTimeline] = useState<IShipmentEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Active accordion section: 'Summary' | 'Update' | 'History' | 'Linked'
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Summary: true,
    Update: true,
    History: false,
    Linked: false,
  });

  // Mutation form state
  const [expectedVersion, setExpectedVersion] = useState<number>(0);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderValueCOD, setOrderValueCOD] = useState<number>(0);
  const [destinationStationCode, setDestinationStationCode] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const loadShipmentDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getShipment(id);
      const sh = res.envelope.data.shipment;
      setShipment(sh);
      setTimeline(res.envelope.data.timeline || []);
      setExpectedVersion(sh.stateVersion);
      setCustomerPhone(sh.customerPhoneMasked || '');
      setOrderValueCOD(sh.orderValueCOD);
      setDestinationStationCode(sh.destinationStationCode || '');
    } catch (err: any) {
      toast.error('Failed to load shipment: ' + (err.message || 'Unknown error'));
      closeInspection();
    } finally {
      setLoading(false);
    }
  }, [closeInspection]);

  useEffect(() => {
    if (isOpen && selectedShipmentId) {
      loadShipmentDetails(selectedShipmentId);
    } else {
      setShipment(null);
      setTimeline([]);
    }
  }, [isOpen, selectedShipmentId, loadShipmentDetails]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeInspection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeInspection]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied tracking number');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveUpdate = async () => {
    if (!shipment) return;
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
      const res = await updateShipment(shipment._id, patch);
      toast.success(`Updated successfully (v${res.envelope.data.stateVersion})`);
      setShipment(res.envelope.data);
      setExpectedVersion(res.envelope.data.stateVersion);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update shipment');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!shipment) return;
    if (!cancelReason.trim()) {
      toast.error('Please specify a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      await cancelShipment(shipment._id);
      toast.success('Shipment cancelled successfully');
      await loadShipmentDetails(shipment._id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel shipment');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) closeInspection();
      }}
      className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-xl h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-bold">
              Inspect
            </span>
            {shipment && (
              <span className="text-[11px] text-muted-foreground font-semibold">
                v{shipment.stateVersion}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {shipment && (
              <button
                onClick={() => loadShipmentDetails(shipment._id)}
                disabled={loading}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading ? 'animate-spin' : '')} />
              </button>
            )}
            <button
              onClick={closeInspection}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Identity Strip (Zero Background Pills per Project Standards) */}
        {shipment ? (
          <div className="px-5 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {CARRIER_LABELS[shipment.carrier] || shipment.carrier}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 select-all">
                {shipment.trackingNumber}
              </span>
              <button
                onClick={() => handleCopy(shipment.trackingNumber)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Copy tracking number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
        )}

        {/* Scrollable Body */}
        {shipment && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* 1. Summary */}
            <div className="border border-border bg-white dark:bg-black">
              <button
                onClick={() => toggleSection('Summary')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <span>Summary</span>
                {openSections['Summary'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Summary'] && (
                <div className="p-4 grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Amount</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      PKR {shipment.orderValueCOD?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Attempts</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {shipment.ndrAttempt || 0}
                    </span>
                  </div>
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Station</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                      {shipment.destinationStationCode || '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Health</span>
                    <span className={shipment.trackingHealth === 'HEALTHY' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      {shipment.trackingHealth || '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Phone</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {shipment.customerPhoneMasked || '—'}
                    </span>
                  </div>
                  <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Dispute</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {shipment.disputeStatus || 'None'}
                    </span>
                  </div>
                  <div className="col-span-2 p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Event</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {formatDate(shipment.lastCarrierEventAt)}
                      </span>
                    </div>
                    {shipment.callLogAttempts > 0 && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {shipment.callLogAttempts} calls
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Update */}
            <div className="border border-border bg-white dark:bg-black">
              <button
                onClick={() => toggleSection('Update')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <span>Update</span>
                {openSections['Update'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Update'] && (
                <div className="p-4 space-y-3.5 text-[11px]">
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold uppercase text-[10px] flex items-center justify-between">
                      <span>Version</span>
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <input
                      type="number"
                      readOnly
                      disabled
                      value={expectedVersion}
                      className="w-full bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-500 dark:text-zinc-400 font-mono cursor-not-allowed select-none focus:outline-hidden"
                      title="State version is locked for optimistic concurrency control"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-muted-foreground block mb-1 font-semibold uppercase text-[10px]">Amount (PKR)</label>
                      <input
                        type="number"
                        value={orderValueCOD}
                        onChange={(e) => setOrderValueCOD(Number(e.target.value))}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1 font-semibold uppercase text-[10px]">Station</label>
                      <input
                        type="text"
                        value={destinationStationCode}
                        placeholder="e.g. LHE, KHI"
                        onChange={(e) => setDestinationStationCode(e.target.value.toUpperCase())}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 uppercase focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1 font-semibold uppercase text-[10px]">Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      placeholder="03001234567"
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={handleSaveUpdate}
                      disabled={updating}
                      className="w-full border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold py-1.5 px-3 uppercase tracking-wider text-[11px] transition-opacity hover:opacity-85 disabled:opacity-50 cursor-pointer"
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  {/* Cancel partition */}
                  {shipment.status !== 'CANCELLED' && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <label className="text-rose-600 dark:text-rose-400 block font-semibold uppercase text-[10px]">Cancel</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Cancellation reason..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="flex-1 bg-white dark:bg-zinc-950 border border-rose-300 dark:border-rose-900/50 px-2.5 py-1 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-rose-500"
                        />
                        <button
                          onClick={handleCancelShipment}
                          disabled={cancelling}
                          className="border border-rose-600 dark:border-rose-800 bg-rose-600 text-white dark:bg-rose-950 dark:text-rose-300 hover:opacity-85 px-3 py-1 font-bold uppercase text-[10px] disabled:opacity-50 cursor-pointer"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. History (Proper Connected Timeline, Payloads Hidden) */}
            <div className="border border-border bg-white dark:bg-black">
              <button
                onClick={() => toggleSection('History')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <span>History</span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {timeline.length}
                </span>
              </button>

              {openSections['History'] && (
                <div className="p-4">
                  {timeline.length === 0 ? (
                    <div className="text-muted-foreground p-4 text-center text-xs">
                      No history recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {timeline.map((ev, idx) => {
                        const isLast = idx === timeline.length - 1;
                        return (
                          <div key={ev._id || idx} className="flex gap-3">
                            {/* Track Column (Dot + Perfectly Aligned Connecting Line) */}
                            <div className="flex flex-col items-center shrink-0 w-3">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full shrink-0 mt-1',
                                  getTimelineDotColor(ev.disposition, ev.rawStatus)
                                )}
                              />
                              {!isLast && (
                                <div className="w-0.5 grow bg-zinc-200 dark:bg-zinc-800 my-1" />
                              )}
                            </div>

                            {/* Event Details */}
                            <div className={cn('flex-1 space-y-1', !isLast ? 'pb-5' : 'pb-1')}>
                              <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                                <span className="text-muted-foreground font-medium">
                                  {formatDate(ev.occurredAt)}
                                </span>
                                {ev.disposition && (
                                  <span className={DISPOSITION_TEXT_COLORS[ev.disposition] || 'text-muted-foreground font-bold'}>
                                    {ev.disposition}
                                  </span>
                                )}
                              </div>
                              <div className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                                {ev.rawStatus || 'STATUS UPDATE'}
                              </div>
                              {ev.rawRemarks && (
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                  {ev.rawRemarks}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Linked (Conversations, Dispatch, Dispute) */}
            <div className="border border-border bg-white dark:bg-black">
              <button
                onClick={() => toggleSection('Linked')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <span>Linked</span>
                {openSections['Linked'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Linked'] && (
                <div className="p-3 grid grid-cols-1 gap-2 text-xs">
                  {/* Conversations Button */}
                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/conversations');
                    }}
                    className="p-3 border border-border bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold block">Conversations</span>
                        <span className="text-[10px] text-muted-foreground">Customer WhatsApp reschedule sessions</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>

                  {/* Dispatch Button */}
                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/manifests');
                    }}
                    className="p-3 border border-border bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-purple-500 shrink-0" />
                      <div>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold block">Dispatch</span>
                        <span className="text-[10px] text-muted-foreground">Station run-sheets and morning manifests</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>

                  {/* Dispute Button */}
                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/disputes');
                    }}
                    className="p-3 border border-border bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold block">Dispute</span>
                        <span className="text-[10px] text-muted-foreground">Margin defense and audit evidence dossier</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Parcel360Drawer;
