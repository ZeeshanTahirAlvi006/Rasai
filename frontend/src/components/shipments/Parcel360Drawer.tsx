// src/components/shipments/Parcel360Drawer.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  DollarSign,
  MapPin,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  GitCommit,
  XCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import type { IShipment, IShipmentEvent, UpdateShipmentInput } from '../../types/shipment';
import { getShipment, updateShipment, cancelShipment } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import CarrierBadge from './CarrierBadge';
import ShipmentStatusBadge from './ShipmentStatusBadge';

export const Parcel360Drawer: React.FC = () => {
  const { isOpen, selectedShipmentId, closeInspection } = useShipmentInspection();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<IShipment | null>(null);
  const [timeline, setTimeline] = useState<IShipmentEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Active accordion section: 'Summary' | 'Update Status' | 'History' | 'Linked Records'
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Summary: true,
    'Update Status': true,
    History: false,
    'Linked Records': false,
  });

  // Mutation form state
  const [expectedVersion, setExpectedVersion] = useState<number>(0);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderValueCOD, setOrderValueCOD] = useState<number>(0);
  const [destinationStationCode, setDestinationStationCode] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && selectedShipmentId) {
      loadShipmentDetails(selectedShipmentId);
    } else {
      setShipment(null);
      setTimeline([]);
    }
  }, [isOpen, selectedShipmentId]);

  const loadShipmentDetails = async (id: string) => {
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
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
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
      toast.success(`Updated successfully! Version bumped to v${res.envelope.data.stateVersion}`);
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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col text-zinc-100 shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Shipment Inspection
            </span>
            {shipment && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-none bg-zinc-800 text-zinc-300 border border-zinc-700">
                v{shipment.stateVersion}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {shipment && (
              <button
                onClick={() => loadShipmentDetails(shipment._id)}
                disabled={loading}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Refresh parcel"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={closeInspection}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Parcel Identity Strip */}
        {shipment ? (
          <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CarrierBadge carrier={shipment.carrier} size="sm" />
              <span className="font-mono text-sm font-bold tracking-tight text-white select-all">
                {shipment.trackingNumber}
              </span>
              <button
                onClick={() => handleCopy(shipment.trackingNumber)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="Copy tracking number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ShipmentStatusBadge status={shipment.status} size="sm" />
              {shipment.needsManifest && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  MANIFEST PENDING
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading shipment...</div>
        )}

        {/* Scrollable Body */}
        {shipment && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
            {/* Section 1: Summary */}
            <div className="border border-zinc-800 bg-zinc-900/30">
              <button
                onClick={() => toggleSection('Summary')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-900/80 border-b border-zinc-800 text-left font-bold text-zinc-200"
              >
                <span>1. Summary</span>
                {openSections['Summary'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Summary'] && (
                <div className="p-4 grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">COD Value</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      PKR {shipment.orderValueCOD?.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">NDR Attempt</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                      {shipment.ndrAttempt}
                    </span>
                  </div>
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">Destination Station</span>
                    <span className="text-zinc-200 font-bold">
                      {shipment.destinationStationCode || 'UNASSIGNED'}
                    </span>
                  </div>
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">Tracking Health</span>
                    <span className={shipment.trackingHealth === 'HEALTHY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {shipment.trackingHealth}
                    </span>
                  </div>
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">Customer Phone</span>
                    <span className="text-zinc-200">
                      {shipment.customerPhoneMasked || 'NOT PROVIDED'}
                    </span>
                  </div>
                  <div className="p-2 border border-zinc-800/80 bg-zinc-950/60">
                    <span className="text-zinc-500 block uppercase">Dispute Status</span>
                    <span className="text-zinc-200">
                      {shipment.disputeStatus || 'NONE'}
                    </span>
                  </div>
                  <div className="col-span-2 p-2 border border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-500 block uppercase">Last Carrier Event</span>
                      <span className="text-zinc-300">
                        {shipment.lastCarrierEventAt ? new Date(shipment.lastCarrierEventAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                    {shipment.callLogAttempts > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px]">
                        {shipment.callLogAttempts} CALL ATTEMPTS
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Update Status */}
            <div className="border border-zinc-800 bg-zinc-900/30">
              <button
                onClick={() => toggleSection('Update Status')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-900/80 border-b border-zinc-800 text-left font-bold text-zinc-200"
              >
                <span>2. Update Status</span>
                {openSections['Update Status'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Update Status'] && (
                <div className="p-4 space-y-3.5 text-[11px]">
                  <div>
                    <label className="text-zinc-400 block mb-1">State Version Guard (Optimistic)</label>
                    <input
                      type="number"
                      value={expectedVersion}
                      onChange={(e) => setExpectedVersion(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-zinc-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-zinc-400 block mb-1">COD Amount (PKR)</label>
                      <input
                        type="number"
                        value={orderValueCOD}
                        onChange={(e) => setOrderValueCOD(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Station Code</label>
                      <input
                        type="text"
                        value={destinationStationCode}
                        placeholder="e.g. LHE, KHI"
                        onChange={(e) => setDestinationStationCode(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-zinc-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Customer Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      placeholder="03001234567"
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-200 focus:outline-hidden focus:border-zinc-500"
                    />
                  </div>
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={handleSaveUpdate}
                      disabled={updating}
                      className="flex-1 bg-zinc-100 text-zinc-950 hover:bg-white font-bold py-1.5 px-3 uppercase tracking-wider text-[11px] transition-colors disabled:opacity-50"
                    >
                      {updating ? 'Saving...' : 'Save Updates (PATCH)'}
                    </button>
                  </div>

                  {/* Cancel shipment partition */}
                  {shipment.status !== 'CANCELLED' && (
                    <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                      <label className="text-rose-400 block">Cancel Shipment</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Mandatory cancellation reason..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-rose-900/40 px-2.5 py-1 text-zinc-200 text-xs focus:outline-hidden focus:border-rose-500"
                        />
                        <button
                          onClick={handleCancelShipment}
                          disabled={cancelling}
                          className="bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800/60 px-3 py-1 font-bold uppercase text-[10px] disabled:opacity-50"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: History */}
            <div className="border border-zinc-800 bg-zinc-900/30">
              <button
                onClick={() => toggleSection('History')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-900/80 border-b border-zinc-800 text-left font-bold text-zinc-200"
              >
                <span>3. History ({timeline.length} Events)</span>
                {openSections['History'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['History'] && (
                <div className="p-3 space-y-2 text-[11px]">
                  {timeline.length === 0 ? (
                    <div className="text-zinc-500 p-3 text-center">No ledger events recorded yet.</div>
                  ) : (
                    timeline.map((ev, idx) => (
                      <div key={ev._id || idx} className="border border-zinc-800/70 p-2.5 bg-zinc-950/70 space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className={`px-1.5 py-0.2 uppercase text-[9px] font-bold border ${
                            ev.disposition === 'APPLIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : ev.disposition === 'DUPLICATE'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {ev.disposition || 'EVENT'}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {ev.occurredAt ? new Date(ev.occurredAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <div className="text-zinc-200 font-bold">
                          {ev.rawStatus || 'STATUS UPDATE'}
                        </div>
                        {ev.rawRemarks && (
                          <div className="text-zinc-400 text-[10px]">
                            {ev.rawRemarks}
                          </div>
                        )}
                        <button
                          onClick={() => toggleEvent(ev._id || String(idx))}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                        >
                          {expandedEvents[ev._id || String(idx)] ? 'Hide Payload' : 'View Payload'}
                        </button>
                        {expandedEvents[ev._id || String(idx)] && (
                          <pre className="p-2 bg-black border border-zinc-800 text-[9px] text-zinc-400 overflow-x-auto">
                            {JSON.stringify(ev.payload || ev, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Linked Records */}
            <div className="border border-zinc-800 bg-zinc-900/30">
              <button
                onClick={() => toggleSection('Linked Records')}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-900/80 border-b border-zinc-800 text-left font-bold text-zinc-200"
              >
                <span>4. Linked Records</span>
                {openSections['Linked Records'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections['Linked Records'] && (
                <div className="p-3 grid grid-cols-1 gap-2 text-xs">
                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/conversations');
                    }}
                    className="p-2.5 border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-zinc-200 font-bold block">WhatsApp Conversations</span>
                        <span className="text-[10px] text-zinc-500">View customer reschedule sessions</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/manifests');
                    }}
                    className="p-2.5 border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="text-zinc-200 font-bold block">07:30 PKT Dispatch Run-Sheets</span>
                        <span className="text-[10px] text-zinc-500">Manifest station assignments & CSV exports</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  <button
                    onClick={() => {
                      closeInspection();
                      navigate('/disputes');
                    }}
                    className="p-2.5 border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <div>
                        <span className="text-zinc-200 font-bold block">CPR Margin Defense</span>
                        <span className="text-[10px] text-zinc-500">Courier dispute dossiers & settlement cutoffs</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
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
