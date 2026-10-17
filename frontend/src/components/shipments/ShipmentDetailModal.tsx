// src/components/shipments/ShipmentDetailModal.tsx
import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Phone,
  DollarSign,
  MapPin,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { IShipment, IShipmentEvent } from '../../types/shipment';
import CarrierBadge from './CarrierBadge';
import ShipmentStatusBadge from './ShipmentStatusBadge';

interface ShipmentDetailModalProps {
  shipment: IShipment | null;
  timeline: IShipmentEvent[];
  loadingTimeline?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit?: (shipment: IShipment) => void;
  onOpenCancel?: (shipment: IShipment) => void;
}

export const ShipmentDetailModal: React.FC<ShipmentDetailModalProps> = ({
  shipment,
  timeline,
  loadingTimeline = false,
  isOpen,
  onClose,
  onOpenEdit,
  onOpenCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  if (!isOpen || !shipment) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied tracking number');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEventExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isTerminal = ['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(shipment.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3.5 flex-wrap">
            <CarrierBadge carrier={shipment.carrier} size="lg" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-tight text-white">
                {shipment.trackingNumber}
              </span>
              <button
                onClick={() => handleCopy(shipment.trackingNumber)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Copy tracking number"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <ShipmentStatusBadge status={shipment.status} size="md" />
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              v{shipment.stateVersion}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>COD Amount</span>
              </div>
              <p className="text-base font-semibold text-slate-100 font-mono">
                PKR {shipment.orderValueCOD.toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Customer Phone</span>
              </div>
              <p className="text-sm font-semibold text-slate-100 font-mono">
                {shipment.customerPhoneMasked || '•••••••••••'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Station Code</span>
              </div>
              <p className="text-sm font-semibold text-slate-100 font-mono">
                {shipment.destinationStationCode || 'Unassigned'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>NDR Attempts</span>
              </div>
              <p className="text-base font-semibold text-slate-100 font-mono">
                {shipment.ndrAttempt} / 3
              </p>
            </div>
          </div>

          {/* Operational Secondary Details */}
          <div className="p-4 rounded-xl bg-slate-950/30 border border-white/5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Operational & Health Metadata</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
              <div>
                <span className="text-slate-500">Manifest Run-sheet:</span>{' '}
                <span
                  className={`font-semibold ${shipment.needsManifest ? 'text-amber-400' : 'text-slate-300'
                    }`}
                >
                  {shipment.needsManifest ? 'Required' : 'Not Required'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Tracking Health:</span>{' '}
                <span
                  className={`font-semibold ${shipment.trackingHealth === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  {shipment.trackingHealth}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Dispute Status:</span>{' '}
                <span className="font-semibold text-slate-300">{shipment.disputeStatus}</span>
              </div>
              <div>
                <span className="text-slate-500">Call Log Attempts:</span>{' '}
                <span className="font-semibold text-slate-300">{shipment.callLogAttempts}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Carrier Event:</span>{' '}
                <span className="font-semibold text-slate-300">
                  {shipment.lastCarrierEventAt
                    ? new Date(shipment.lastCarrierEventAt).toLocaleString()
                    : 'None recorded'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Last System Update:</span>{' '}
                <span className="font-semibold text-slate-300">
                  {new Date(shipment.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Ledger Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Historical Ledger & Event Timeline</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {timeline.length} {timeline.length === 1 ? 'event' : 'events'}
                </span>
              </h4>
            </div>

            {loadingTimeline ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Loading ledger events...</span>
              </div>
            ) : timeline.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center space-y-1">
                <p className="text-xs text-slate-400">
                  No historical ledger events recorded yet for this parcel.
                </p>
                <p className="text-[11px] text-slate-500">
                  When carrier poller webhooks or merchant actions (like cancellations) occur, immutable ledger events are registered here.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                {timeline.map((event, idx) => {
                  const eventId = event._id || `evt-${idx}`;
                  const isExpanded = !!expandedEvents[eventId];
                  return (
                    <div key={eventId} className="relative group">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-indigo-400 group-hover:scale-125 transition-transform" />

                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-all space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-200">
                              {event.rawStatus}
                            </span>
                            {event.source && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/5 text-cyan-300 border border-cyan-500/20">
                                {event.source}
                              </span>
                            )}
                            {event.disposition && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                {event.disposition}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(event.occurredAt).toLocaleString()}
                          </span>
                        </div>

                        {event.rawRemarks && (
                          <p className="text-xs text-slate-400">{event.rawRemarks}</p>
                        )}

                        {event.effectsApplied && event.effectsApplied.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] text-slate-500">Side-effects:</span>
                            {event.effectsApplied.map((eff) => (
                              <span
                                key={eff}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                              >
                                {eff}
                              </span>
                            ))}
                          </div>
                        )}

                        {event.payload && (
                          <div className="pt-1">
                            <button
                              onClick={() => toggleEventExpand(eventId)}
                              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Payload' : 'Inspect Raw Payload'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {isExpanded && (
                              <pre className="mt-2 p-2.5 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">ID: {shipment._id}</div>

          <div className="flex items-center gap-2.5">
            {onOpenEdit && !isTerminal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEdit(shipment);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
              >
                Edit Parcel
              </button>
            )}

            {onOpenCancel && !isTerminal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCancel(shipment);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
              >
                Cancel Shipment
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailModal;
