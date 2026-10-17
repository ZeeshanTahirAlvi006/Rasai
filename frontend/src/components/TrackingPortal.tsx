import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Search,
  ExternalLink,
  MessageSquare,
  Phone,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCode2,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import carrierHealthApi from '../api/carrierHealthApi';
import type { Carrier, TrackingData, CarrierUpdate } from '../types/carrierHealth';

const PRESETS = [
  {
    label: 'Live Leopards (Delivered)',
    carrier: 'LEOPARDS' as Carrier,
    cn: 'KI7544323103',
    badge: 'Real Scraper',
    color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  },
  {
    label: 'Trax (In Transit)',
    carrier: 'TRAX' as Carrier,
    cn: 'TRX-948123',
    badge: 'Simulated',
    color: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
  },
  {
    label: 'PostEx (NDR Active)',
    carrier: 'POSTEX' as Carrier,
    cn: 'PST-NDR-8821',
    badge: 'NDR Flow',
    color: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
  },
  {
    label: 'TCS (Out for Delivery)',
    carrier: 'TCS' as Carrier,
    cn: 'TCS-OFD-4001',
    badge: 'Simulated',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  },
];

export const TrackingPortal: React.FC = () => {
  const [carrier, setCarrier] = useState<Carrier>('LEOPARDS');
  const [trackingNumber, setTrackingNumber] = useState('KI7544323103');
  const [loading, setLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingData | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);

  const handleTrack = async (customCarrier?: Carrier, customCn?: string) => {
    const activeCarrier = customCarrier || carrier;
    const activeCn = (customCn !== undefined ? customCn : trackingNumber).trim();

    if (!activeCn) {
      toast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      // Special client-side simulation for mock demonstration CNs to show how user-facing UI renders different states
      if (activeCn === 'PST-NDR-8821') {
        const mockResult: TrackingData = {
          carrier: 'POSTEX',
          trackingNumber: activeCn,
          trackingHealth: 'HEALTHY',
          updates: [
            {
              trackingNumber: activeCn,
              rawStatus: 'Delivery Attempt Failed: Customer Unreachable on Call',
              rawRemarks: 'Rider visited location at 03:15 PM. 3 calls made to 0300-XXXXXXX, no answer.',
              occuredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
              normalizedStatus: 'NDR_ACTIVE',
              payload: {
                canonicalStatus: 'NDR_ACTIVE',
                activeStepText: 'Action Required',
                attemptNumber: 1,
                reason: 'Customer Unreachable',
              },
            },
            {
              trackingNumber: activeCn,
              rawStatus: 'Assigned to Rider for Delivery',
              rawRemarks: 'Out for delivery with rider Muhammad Usman',
              occuredAt: new Date(Date.now() - 3600000 * 8).toISOString(),
              normalizedStatus: 'OUT_FOR_DELIVERY',
              payload: { canonicalStatus: 'OUT_FOR_DELIVERY' },
            },
            {
              trackingNumber: activeCn,
              rawStatus: 'Arrived at Gulberg Delivery Hub, Lahore',
              rawRemarks: 'Bag received & sorted',
              occuredAt: new Date(Date.now() - 3600000 * 24).toISOString(),
              normalizedStatus: 'IN_TRANSIT',
              payload: { canonicalStatus: 'IN_TRANSIT' },
            },
            {
              trackingNumber: activeCn,
              rawStatus: 'Shipment Picked up from Merchant Warehouse',
              rawRemarks: 'Package verified and labeled',
              occuredAt: new Date(Date.now() - 3600000 * 48).toISOString(),
              normalizedStatus: 'BOOKED',
              payload: { canonicalStatus: 'BOOKED' },
            },
          ],
        };
        setTrackingResult(mockResult);
        setRawApiResponse({ success: true, message: 'NDR scenario loaded', data: mockResult });
        setResponseTimeMs(Math.round(performance.now() - startTime));
        toast.success('NDR Shipment state loaded');
        return;
      }

      if (activeCn === 'TCS-OFD-4001') {
        const mockResult: TrackingData = {
          carrier: 'TCS',
          trackingNumber: activeCn,
          trackingHealth: 'HEALTHY',
          updates: [
            {
              trackingNumber: activeCn,
              rawStatus: 'Out for Delivery with Courier Rider',
              rawRemarks: 'Expected delivery today between 02:00 PM - 06:00 PM',
              occuredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
              normalizedStatus: 'OUT_FOR_DELIVERY',
              payload: { canonicalStatus: 'OUT_FOR_DELIVERY', activeStepText: 'Out for Delivery' },
            },
            {
              trackingNumber: activeCn,
              rawStatus: 'Processed at Destination Hub',
              rawRemarks: 'Sorted into route delivery van',
              occuredAt: new Date(Date.now() - 3600000 * 12).toISOString(),
              normalizedStatus: 'IN_TRANSIT',
              payload: { canonicalStatus: 'IN_TRANSIT' },
            },
            {
              trackingNumber: activeCn,
              rawStatus: 'Shipment Booked by Merchant',
              rawRemarks: 'Electronic data received',
              occuredAt: new Date(Date.now() - 3600000 * 36).toISOString(),
              normalizedStatus: 'BOOKED',
              payload: { canonicalStatus: 'BOOKED' },
            },
          ],
        };
        setTrackingResult(mockResult);
        setRawApiResponse({ success: true, message: 'OFD scenario loaded', data: mockResult });
        setResponseTimeMs(Math.round(performance.now() - startTime));
        toast.success('Out for delivery scenario loaded');
        return;
      }

      // Live call to backend API (including Leopards real scraper)
      const res = await carrierHealthApi.trackShipment(activeCarrier, activeCn);
      setResponseTimeMs(Math.round(performance.now() - startTime));
      setRawApiResponse(res);

      if (res.success && res.data) {
        setTrackingResult(res.data);
        if (res.data.updates?.length > 0) {
          toast.success(`Retrieved ${res.data.updates.length} milestone(s) for ${activeCn}`);
        } else {
          toast('No milestones recorded yet for this CN', { icon: 'ℹ️' });
        }
      } else {
        toast.error(res.message || 'Tracking failed');
      }
    } catch (err: any) {
      setResponseTimeMs(Math.round(performance.now() - startTime));
      const errorMsg = err.response?.data?.message || err.message || 'Request failed';
      setRawApiResponse(err.response?.data || { error: errorMsg });
      toast.error(`Tracking Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Tracking number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine current stage & styling
  const latestUpdate: CarrierUpdate | undefined = trackingResult?.updates?.[0];
  const canonicalStatus = (latestUpdate?.payload?.canonicalStatus || latestUpdate?.normalizedStatus || 'IN_TRANSIT').toUpperCase();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return {
          label: 'Delivered Successfully',
          headline: 'Package Delivered',
          color: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 text-emerald-400',
          badgeColor: 'bg-emerald-500 text-white',
          icon: CheckCircle2,
          stepIndex: 3,
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Out for Delivery',
          headline: 'Package is with Courier Rider',
          color: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 text-amber-300',
          badgeColor: 'bg-amber-500 text-slate-950 font-semibold',
          icon: Truck,
          stepIndex: 2,
        };
      case 'NDR_ACTIVE':
      case 'FAILED_ATTEMPT':
        return {
          label: 'Action Required: Delivery Exception',
          headline: 'Delivery Attempt Failed',
          color: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 text-rose-300',
          badgeColor: 'bg-rose-500 text-white animate-pulse',
          icon: AlertTriangle,
          stepIndex: 2,
        };
      case 'RTO_INITIATED':
      case 'RTO_DELIVERED':
        return {
          label: 'Return to Origin (RTO)',
          headline: 'Package Being Returned to Sender',
          color: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30 text-purple-300',
          badgeColor: 'bg-purple-500 text-white',
          icon: RotateCcw,
          stepIndex: 2,
        };
      case 'BOOKED':
        return {
          label: 'Shipment Booked',
          headline: 'Order Confirmed & Manifest Created',
          color: 'from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 text-indigo-300',
          badgeColor: 'bg-indigo-500 text-white',
          icon: Package,
          stepIndex: 0,
        };
      default:
        return {
          label: 'In Transit',
          headline: 'On the Way to Delivery Hub',
          color: 'from-sky-500/20 via-sky-500/10 to-transparent border-sky-500/30 text-sky-300',
          badgeColor: 'bg-sky-500 text-white',
          icon: Truck,
          stepIndex: 1,
        };
    }
  };

  const statusConfig = getStatusConfig(canonicalStatus);
  const StatusIcon = statusConfig.icon;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getTimeAgo = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  // Steps definition for visual stepper
  const steps = [
    { title: 'Booked', desc: 'Package Manifested', icon: Package },
    { title: 'In Transit', desc: 'Dispatched to Hub', icon: Truck },
    { title: 'Out for Delivery', desc: 'With Local Courier', icon: Truck },
    {
      title: canonicalStatus === 'NDR_ACTIVE' ? 'Delivery Issue' : 'Delivered',
      desc: canonicalStatus === 'NDR_ACTIVE' ? 'Action Required' : 'Handed to Consignee',
      icon: canonicalStatus === 'NDR_ACTIVE' ? AlertTriangle : CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Search Bar & Presets Card ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-2xl transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Live Shipment Tracking
            </h2>
            <p className="text-xs text-slate-400">
              Query real-time milestones via carrier web scrapers & APIs with circuit breaker protection
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Upstream Bridge</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="w-full sm:w-44">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as Carrier)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="LEOPARDS">LEOPARDS</option>
              <option value="POSTEX">POSTEX</option>
              <option value="TRAX">TRAX</option>
              <option value="TCS">TCS</option>
            </select>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter Tracking CN (e.g. KI7544323103)"
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {trackingNumber && (
              <button
                type="button"
                onClick={() => setTrackingNumber('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Test Chips */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Quick Test Cases:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.cn}
              type="button"
              onClick={() => {
                setCarrier(p.carrier);
                setTrackingNumber(p.cn);
                handleTrack(p.carrier, p.cn);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${p.color}`}
            >
              <span>{p.label}</span>
              <span className="opacity-70 text-[10px] bg-white/10 px-1 py-0.2 rounded font-mono">{p.cn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Real User-Facing Tracking Presentation ── */}
      {trackingResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero Delivery Status Banner */}
          <div
            className={`rounded-2xl border bg-gradient-to-br ${statusConfig.color} bg-slate-900/80 backdrop-blur-xl p-6 lg:p-8 shadow-2xl relative overflow-hidden`}
          >
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusConfig.badgeColor}`}>
                    {statusConfig.label}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-slate-300 font-mono">
                    {trackingResult.carrier}
                  </span>
                  {latestUpdate?.occuredAt && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {getTimeAgo(latestUpdate.occuredAt)}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <StatusIcon className="w-8 h-8 flex-shrink-0" />
                  <span>{statusConfig.headline}</span>
                </h1>

                <p className="text-sm text-slate-300 max-w-2xl">
                  {latestUpdate?.rawRemarks || latestUpdate?.rawStatus || 'Shipment tracking information retrieved.'}
                </p>
              </div>

              {/* Action buttons (Copy CN, Share) */}
              <div className="flex items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => handleCopy(trackingResult.trackingNumber)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : trackingResult.trackingNumber}</span>
                </button>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Background line */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-white/10 -z-0"></div>
                {/* Filled line */}
                <div
                  className="absolute top-4 left-6 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 -z-0 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, (statusConfig.stepIndex / (steps.length - 1)) * 90))}%`,
                  }}
                ></div>

                {steps.map((st, idx) => {
                  const isCompleted = idx < statusConfig.stepIndex || (idx === statusConfig.stepIndex && canonicalStatus === 'DELIVERED');
                  const isCurrent = idx === statusConfig.stepIndex && canonicalStatus !== 'DELIVERED';
                  const StepIcon = st.icon;

                  return (
                    <div key={st.title} className="flex flex-col items-center text-center relative z-10">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md ${isCompleted
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                            : isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 scale-110 animate-pulse'
                              : 'bg-slate-800 text-slate-500 border border-white/10'
                          }`}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span
                        className={`mt-2.5 text-xs font-semibold ${isCompleted || isCurrent ? 'text-white' : 'text-slate-500'
                          }`}
                      >
                        {st.title}
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">{st.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Delivery Attributes Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>Tracking Number</span>
              </div>
              <div className="font-mono font-bold text-sm text-white flex items-center justify-between">
                <span>{trackingResult.trackingNumber}</span>
                <button
                  onClick={() => handleCopy(trackingResult.trackingNumber)}
                  className="text-slate-400 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Carrier Network</span>
              </div>
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <span>{trackingResult.carrier}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {trackingResult.trackingHealth || 'HEALTHY'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <User className="w-4 h-4 text-purple-400" />
                <span>Signed / Received By</span>
              </div>
              <div className="font-semibold text-sm text-white">
                {latestUpdate?.payload?.signedBy || 'Consignee / Recipient'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Event Timestamp</span>
              </div>
              <div className="font-semibold text-sm text-white">
                {formatDate(latestUpdate?.occuredAt)}
              </div>
            </div>
          </div>

          {/* ── NDR Action Hub (When delivery exception occurs) ── */}
          {canonicalStatus === 'NDR_ACTIVE' && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl p-5 lg:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">NDR Resolution Hub — Immediate Customer Action</h3>
                    <p className="text-xs text-rose-200/80">
                      Delivery attempt was unsuccessful. Trigger automated customer interventions to prevent RTO.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-rose-500 text-white font-bold text-xs uppercase tracking-wider">
                  Action Required
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  onClick={() => toast.success('WhatsApp Re-attempt OTP link dispatched to customer!')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Verification</span>
                </button>

                <button
                  onClick={() => toast.success('Automated IVR call triggered to customer phone!')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Trigger Automated IVR Call</span>
                </button>

                <button
                  onClick={() => setAddressModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-bold transition-all active:scale-95"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Update Address / Landmark</span>
                </button>

                <button
                  onClick={() => {
                    toast.success('Scheduled for re-attempt tomorrow morning with rider notes.');
                    // add milestone locally
                    if (trackingResult) {
                      const updatedUpdates = [
                        {
                          trackingNumber: trackingResult.trackingNumber,
                          rawStatus: 'Customer requested 2nd re-attempt for tomorrow',
                          rawRemarks: 'Address re-verified. Rescheduled by merchant.',
                          occuredAt: new Date().toISOString(),
                          normalizedStatus: 'IN_TRANSIT',
                          payload: { canonicalStatus: 'IN_TRANSIT' },
                        },
                        ...trackingResult.updates,
                      ];
                      setTrackingResult({ ...trackingResult, updates: updatedUpdates });
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-bold transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Reschedule Re-Attempt</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Milestone Timeline ── */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Tracking Milestones ({trackingResult.updates.length})</span>
              </h3>
              <span className="text-xs text-slate-400">Reverse Chronological</span>
            </div>

            {trackingResult.updates.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No activity recorded for this package yet.</p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-500/20 space-y-6">
                {trackingResult.updates.map((update, index) => {
                  const isLatest = index === 0;
                  const itemStatus = (update.payload?.canonicalStatus || update.normalizedStatus || 'IN_TRANSIT').toUpperCase();

                  let dotColor = 'bg-indigo-500 border-slate-950';
                  if (itemStatus === 'DELIVERED') dotColor = 'bg-emerald-500 border-slate-950 ring-4 ring-emerald-500/20';
                  else if (itemStatus === 'NDR_ACTIVE') dotColor = 'bg-rose-500 border-slate-950 ring-4 ring-rose-500/20';
                  else if (itemStatus === 'OUT_FOR_DELIVERY') dotColor = 'bg-amber-500 border-slate-950 ring-4 ring-amber-500/20';

                  return (
                    <div key={index} className="relative group">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 ${dotColor} transition-transform group-hover:scale-125`}
                      ></span>

                      <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/70 hover:border-white/15 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {update.rawStatus}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatDate(update.occuredAt)}
                          </span>
                        </div>

                        {update.rawRemarks && update.rawRemarks !== update.rawStatus && (
                          <p className="text-xs text-slate-300 mt-1">{update.rawRemarks}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 font-semibold text-slate-300">
                            Status: {itemStatus.replace(/_/g, ' ')}
                          </span>
                          {update.payload?.activeStepText && (
                            <span>Stage: {update.payload.activeStepText}</span>
                          )}
                          {update.payload?.source && (
                            <span className="text-slate-500 font-mono">Source: {update.payload.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Raw API Inspector Drawer ── */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
            <button
              onClick={() => setShowJson(!showJson)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <span>Developer / Raw API Response Payload</span>
                {responseTimeMs !== null && (
                  <span className="text-[11px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    ⚡ {responseTimeMs}ms
                  </span>
                )}
              </div>
              {showJson ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showJson && (
              <div className="p-4 bg-slate-950/80 border-t border-white/10 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                <div className="flex justify-end pb-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(rawApiResponse, null, 2));
                      toast.success('JSON copied to clipboard!');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] text-white"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre>{JSON.stringify(rawApiResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Address Update Modal ── */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Update Customer Delivery Address
              </h3>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Enter corrected address or landmark instructions for the courier rider to re-attempt delivery.
            </p>

            <textarea
              rows={3}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="e.g. House #14, Street 2, Near Shell Pump, Gulberg III, Lahore"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newAddress.trim()) {
                    toast.error('Please enter an address');
                    return;
                  }
                  toast.success('Address updated and synced with courier dispatch!');
                  setAddressModalOpen(false);
                  setNewAddress('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                Save & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TrackingPortal;
