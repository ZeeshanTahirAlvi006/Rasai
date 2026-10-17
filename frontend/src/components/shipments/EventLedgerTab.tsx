// src/components/shipments/EventLedgerTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  UploadCloud,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Copy,
  Check,
  Send,
  Calendar,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IShipmentEvent,
  Carrier,
  EventSource,
  EventDisposition,
  ListShipmentEventsFilter,
  LedgerMetricsResult,
  RecordShipmentEventInput,
  BulkRecordEventsInput,
  BulkRecordEventsResult,
  ShipmentTimelineResult,
} from '../../types/shipment';
import { CARRIERS, EVENT_SOURCES, EVENT_DISPOSITIONS } from '../../types/shipment';
import {
  listShipmentEvents,
  getLedgerMetrics,
  recordShipmentEvent,
  bulkRecordShipmentEvents,
  getShipmentEventTimeline,
} from '../../api/shipmentEventApi';
import CarrierBadge from './CarrierBadge';

interface EventLedgerTabProps {
  onRefreshParent?: () => void;
}

export const EventLedgerTab: React.FC<EventLedgerTabProps> = ({ onRefreshParent }) => {
  // Ledger state
  const [events, setEvents] = useState<Array<IShipmentEvent & { id?: string }>>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState<LedgerMetricsResult | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Filter state
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [dispositionFilter, setDispositionFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [trackingSearch, setTrackingSearch] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  // Single event simulator state
  const [simCarrier, setSimCarrier] = useState<Carrier>('POSTEX');
  const [simTrackingNumber, setSimTrackingNumber] = useState('PK-EXP-99201');
  const [simSource, setSimSource] = useState<EventSource>('CARRIER_WEBHOOK');
  const [simRawStatus, setSimRawStatus] = useState('DELIVERED');
  const [simRawRemarks, setSimRawRemarks] = useState('Delivered to customer doorstep');
  const [simOccurredAt, setSimOccurredAt] = useState('');
  const [simCarrierEventId, setSimCarrierEventId] = useState('EVT-WEBHOOK-01');
  const [simPayloadJson, setSimPayloadJson] = useState('{\n  "podSignature": "verified",\n  "city": "Lahore"\n}');
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Bulk events simulator state
  const sampleBulkJson: BulkRecordEventsInput = {
    events: [
      {
        carrier: 'POSTEX',
        trackingNumber: 'PK-EXP-99201',
        source: 'CARRIER_WEBHOOK',
        rawStatus: 'OUT_FOR_DELIVERY',
        rawRemarks: 'Courier out for delivery',
        carrierEventId: 'CE-001',
        payload: { attempt: 1 },
      },
      {
        carrier: 'TRAX',
        trackingNumber: 'TRX-77881',
        source: 'FILE_IMPORT',
        rawStatus: 'BOOKED',
        rawRemarks: 'Manifest generated',
      },
      {
        carrier: 'POSTEX',
        trackingNumber: 'PK-EXP-99201',
        source: 'CARRIER_WEBHOOK',
        rawStatus: 'DELIVERED',
        rawRemarks: 'Delivered successfully',
        carrierEventId: 'CE-002',
      },
    ],
  };
  const [bulkInputJson, setBulkInputJson] = useState(JSON.stringify(sampleBulkJson, null, 2));
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkRecordEventsResult | null>(null);

  // Timeline lookup state
  const [timelineCarrier, setTimelineCarrier] = useState<Carrier>('POSTEX');
  const [timelineTracking, setTimelineTracking] = useState('PK-EXP-99201');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineResult, setTimelineResult] = useState<ShipmentTimelineResult | null>(null);

  // Fetch metrics
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await getLedgerMetrics({
        carrier: carrierFilter ? (carrierFilter as Carrier) : undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });
      setMetrics(res.envelope.data);
    } catch (err: any) {
      toast.error('Failed to load ledger metrics: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fetch events list
  const fetchEvents = async (cursor?: string) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const filter: ListShipmentEventsFilter = {
        limit: 25,
        cursor,
        carrier: carrierFilter ? (carrierFilter as Carrier) : undefined,
        disposition: dispositionFilter || undefined,
        source: sourceFilter || undefined,
        trackingNumber: trackingSearch.trim() || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      };

      const res = await listShipmentEvents(filter);
      if (cursor) {
        setEvents((prev) => [...prev, ...res.envelope.data.events]);
      } else {
        setEvents(res.envelope.data.events);
      }
      setNextCursor(res.envelope.data.nextCursor);
    } catch (err: any) {
      if (err.status === 401) {
        toast.error('Authentication required: Click "Auth Setup" to login or set token');
      } else {
        toast.error('Failed to load ledger events: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
    fetchMetrics();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
    fetchMetrics();
  };

  const handleResetFilter = () => {
    setCarrierFilter('');
    setDispositionFilter('');
    setSourceFilter('');
    setTrackingSearch('');
    setStartDateFilter('');
    setEndDateFilter('');
    setTimeout(() => {
      fetchEvents();
      fetchMetrics();
    }, 0);
  };

  const togglePayloadExpand = (id: string) => {
    setExpandedPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Single event submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimSubmitting(true);
    setSimResult(null);

    try {
      let parsedPayload: Record<string, unknown> | undefined;
      if (simPayloadJson.trim()) {
        parsedPayload = JSON.parse(simPayloadJson);
      }

      const input: RecordShipmentEventInput = {
        carrier: simCarrier,
        trackingNumber: simTrackingNumber.trim(),
        source: simSource,
        rawStatus: simRawStatus.trim() || undefined,
        rawRemarks: simRawRemarks.trim() || undefined,
        occurredAt: simOccurredAt || undefined,
        carrierEventId: simCarrierEventId.trim() || undefined,
        payload: parsedPayload,
      };

      const res = await recordShipmentEvent(input);
      setSimResult(res.envelope);
      toast.success(`Event recorded! Disposition: ${res.envelope.data.disposition}`);
      fetchEvents();
      fetchMetrics();
      onRefreshParent?.();
    } catch (err: any) {
      setSimResult(err);
      toast.error('Event record failed: ' + (err.message || 'Error'));
    } finally {
      setSimSubmitting(false);
    }
  };

  // Preset loader for single simulator
  const loadSimulatorPreset = (
    c: Carrier,
    track: string,
    src: EventSource,
    raw: string,
    remarks: string,
  ) => {
    setSimCarrier(c);
    setSimTrackingNumber(track);
    setSimSource(src);
    setSimRawStatus(raw);
    setSimRawRemarks(remarks);
    setSimOccurredAt(new Date().toISOString());
  };

  // Bulk submit
  const handleBulkSubmit = async () => {
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const parsed = JSON.parse(bulkInputJson);
      const res = await bulkRecordShipmentEvents(parsed);
      setBulkResult(res.envelope.data);
      toast.success(`Processed ${res.envelope.data.processed} bulk events!`);
      fetchEvents();
      fetchMetrics();
      onRefreshParent?.();
    } catch (err: any) {
      toast.error('Bulk submission error: ' + (err.message || 'Invalid JSON format'));
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Timeline lookup submit
  const handleTimelineLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineTracking.trim()) return;
    setTimelineLoading(true);
    setTimelineResult(null);

    try {
      const res = await getShipmentEventTimeline(timelineCarrier, timelineTracking.trim());
      setTimelineResult(res.envelope.data);
      toast.success(`Loaded ${res.envelope.data.totalEvents} events for ${timelineTracking}`);
    } catch (err: any) {
      toast.error('Timeline lookup failed: ' + (err.message || 'Shipment not found'));
    } finally {
      setTimelineLoading(false);
    }
  };

  // Disposition badge color mapper
  const getDispositionStyle = (disp?: string) => {
    switch (disp) {
      case 'APPLIED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'NOOP':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'STALE_REJECTED':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'STALE_OUT_OF_ORDER':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'UNKNOWN_SHIPMENT':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'DUPLICATE':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-white/10';
    }
  };

  // Source badge color mapper
  const getSourceStyle = (source?: string) => {
    switch (source) {
      case 'CARRIER_WEBHOOK':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'CARRIER_POLL':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'FILE_IMPORT':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'CUSTOMER':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'MERCHANT':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. KPI Telemetry Summary Cards (GET /api/shipment-events/metrics)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Ledger Telemetry & Event Metrics
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  GET /metrics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aggregated disposition breakdown, source distribution, and deduplication telemetry
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for Testing Routes */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSingleModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-md shadow-indigo-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simulate Single Event</span>
            </button>

            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-purple-400" />
              <span>Bulk Ingest Events</span>
            </button>

            <button
              onClick={() => setTimelineModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Timeline Lookup</span>
            </button>

            <button
              onClick={() => {
                fetchMetrics();
                fetchEvents();
              }}
              disabled={loadingMetrics || loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Refresh ledger and metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-5 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400 text-[10px] block">TOTAL LEDGERED</span>
            <span className="text-lg font-bold text-white">
              {metrics ? metrics.totalEvents.toLocaleString() : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Events</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 text-[10px] block">APPLIED</span>
            <span className="text-lg font-bold text-emerald-200">
              {metrics?.byDisposition?.['APPLIED'] ?? 0}
            </span>
            <span className="text-[10px] text-emerald-400/70 block mt-0.5">Transitioned</span>
          </div>

          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-cyan-400 text-[10px] block">NOOP</span>
            <span className="text-lg font-bold text-cyan-200">
              {metrics?.byDisposition?.['NOOP'] ?? 0}
            </span>
            <span className="text-[10px] text-cyan-400/70 block mt-0.5">No State Change</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 text-[10px] block">STALE REJECTED</span>
            <span className="text-lg font-bold text-amber-200">
              {metrics?.byDisposition?.['STALE_REJECTED'] ?? 0}
            </span>
            <span className="text-[10px] text-amber-400/70 block mt-0.5">Terminal/Invalid</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 text-[10px] block">OUT OF ORDER</span>
            <span className="text-lg font-bold text-purple-200">
              {metrics?.byDisposition?.['STALE_OUT_OF_ORDER'] ?? 0}
            </span>
            <span className="text-[10px] text-purple-400/70 block mt-0.5">Late Timestamp</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-rose-400 text-[10px] block">UNKNOWN SHIPMENT</span>
            <span className="text-lg font-bold text-rose-200">
              {metrics?.byDisposition?.['UNKNOWN_SHIPMENT'] ?? 0}
            </span>
            <span className="text-[10px] text-rose-400/70 block mt-0.5">Unregistered</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5">
            <span className="text-slate-400 text-[10px] block">DUPLICATES</span>
            <span className="text-lg font-bold text-slate-300">
              {metrics?.byDisposition?.['DUPLICATE'] ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Idempotent</span>
          </div>
        </div>

        {/* Source breakdown tags */}
        {metrics && (
          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-white/5 text-xs flex-wrap">
            <span className="text-slate-400 text-xs font-semibold">Sources:</span>
            {Object.entries(metrics.bySource).map(([src, count]) => (
              <span
                key={src}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-slate-400">{src}:</span>
                <span className="font-bold text-white">{count}</span>
              </span>
            ))}
            {metrics.period?.startDate && (
              <span className="text-[11px] text-slate-500 font-mono ml-auto">
                Window: {new Date(metrics.period.startDate).toLocaleDateString()} →{' '}
                {metrics.period.endDate ? new Date(metrics.period.endDate).toLocaleDateString() : 'Now'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. Filter & Query Controls (GET /api/shipment-events)
      ───────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleApplyFilter}
        className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 shadow-xl backdrop-blur-xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
              Filter Event Ledger (GET /api/shipment-events)
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetFilter}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Tracking Number Search */}
          <div className="relative">
            <label className="text-[10px] font-mono text-slate-400 block mb-1">TRACKING NUMBER</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. PK-EXP-99201"
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Carrier Select */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">CARRIER</label>
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Carriers</option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Disposition Select */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">DISPOSITION</label>
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Dispositions</option>
              {EVENT_DISPOSITIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Source Select */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">SOURCE</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Sources</option>
              {EVENT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">START DATE</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">END DATE</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Ledger Filters</span>
          </button>
        </div>
      </form>

      {/* ─────────────────────────────────────────────────────────────
          3. Events Ledger Stream Table
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white font-mono uppercase">
              Immutable Ledger Stream ({events.length} Loaded)
            </span>
          </div>
          {nextCursor && (
            <span className="text-[11px] font-mono text-slate-500">
              Next Cursor: <code className="text-slate-400">{nextCursor.slice(-8)}...</code>
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Loading immutable event records from MongoDB...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Radio className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Ledger Events Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No events matched the selected filters. Use "Simulate Single Event" or "Bulk Ingest" above to register test events into the engine!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/40 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Occurred At</th>
                  <th className="py-3 px-4">Carrier & Tracking</th>
                  <th className="py-3 px-4">Disposition</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Raw Status / Remarks</th>
                  <th className="py-3 px-4">Event Key</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {events.map((evt, idx) => {
                  const evtId = evt._id || evt.id || `evt-${idx}`;
                  const isExpanded = Boolean(expandedPayloads[evtId]);

                  return (
                    <React.Fragment key={evtId}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        {/* Occurred At */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {new Date(evt.occurredAt).toLocaleString()}
                        </td>

                        {/* Carrier & Tracking */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CarrierBadge carrier={evt.carrier} size="sm" />
                            <span className="font-mono font-bold text-white text-xs">
                              {evt.trackingNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(evt.trackingNumber, evtId)}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Copy tracking number"
                            >
                              {copiedId === evtId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Disposition */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getDispositionStyle(
                              evt.disposition,
                            )}`}
                          >
                            {evt.disposition || 'APPLIED'}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono border ${getSourceStyle(
                              evt.source,
                            )}`}
                          >
                            {evt.source || 'CARRIER_WEBHOOK'}
                          </span>
                        </td>

                        {/* Raw Status & Remarks */}
                        <td className="py-3 px-4 max-w-xs truncate">
                          <span className="font-mono text-cyan-300 font-semibold">
                            {evt.rawStatus || '—'}
                          </span>
                          {evt.rawRemarks && (
                            <p className="text-[11px] text-slate-400 truncate">{evt.rawRemarks}</p>
                          )}
                        </td>

                        {/* Event Key */}
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[140px] truncate">
                          {evt.carrierEventId || evt._id || '—'}
                        </td>

                        {/* Details expand button */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => togglePayloadExpand(evtId)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-[11px]"
                          >
                            <span>Payload</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Payload Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-white/5">
                          <td colSpan={7} className="p-4">
                            <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                <span className="flex items-center gap-1.5">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Raw Event Document & Ingestion Payload</span>
                                </span>
                                <span>Batch: {evt.batchId || 'Single Event (No Batch)'}</span>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-48">
                                {JSON.stringify(
                                  {
                                    id: evt._id || evt.id,
                                    carrier: evt.carrier,
                                    trackingNumber: evt.trackingNumber,
                                    source: evt.source,
                                    rawStatus: evt.rawStatus,
                                    rawRemarks: evt.rawRemarks,
                                    occurredAt: evt.occurredAt,
                                    carrierEventId: evt.carrierEventId,
                                    disposition: evt.disposition,
                                    payload: evt.payload,
                                    createdAt: evt.createdAt,
                                  },
                                  null,
                                  2,
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cursor Load More Bar */}
        {nextCursor && (
          <div className="p-4 bg-slate-950/40 border-t border-white/10 flex items-center justify-center">
            <button
              onClick={() => fetchEvents(nextCursor)}
              disabled={loadingMore}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMore ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Load More Events via Cursor Pagination</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. Single Event Ingestion Modal (POST /api/shipment-events)
      ───────────────────────────────────────────────────────────── */}
      {singleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Shipment Event</h3>
                  <p className="text-xs text-slate-400">
                    Simulate a carrier webhook or merchant status event (POST /api/shipment-events)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSingleModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Presets Bar */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Quick Simulator Presets</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    loadSimulatorPreset(
                      'POSTEX',
                      'PK-EXP-99201',
                      'CARRIER_WEBHOOK',
                      'OUT_FOR_DELIVERY',
                      'Rider dispatched with parcel',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono border border-white/10"
                >
                  ⚡ Out For Delivery
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadSimulatorPreset(
                      'POSTEX',
                      'PK-EXP-99201',
                      'CARRIER_WEBHOOK',
                      'DELIVERED',
                      'Customer signed for delivery',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-500/20"
                >
                  ✅ Delivered
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadSimulatorPreset(
                      'POSTEX',
                      'PK-EXP-99201',
                      'CARRIER_WEBHOOK',
                      'NDR_ACTIVE',
                      'Customer phone unanswered at destination',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/20"
                >
                  ⚠️ NDR Delivery Failure
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadSimulatorPreset(
                      'TRAX',
                      'UNREGISTERED-99',
                      'CARRIER_WEBHOOK',
                      'BOOKED',
                      'Unknown shipment test',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-mono border border-rose-500/20"
                >
                  ❌ Unknown Shipment
                </button>
              </div>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Carrier */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">CARRIER *</label>
                  <select
                    value={simCarrier}
                    onChange={(e) => setSimCarrier(e.target.value as Carrier)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                    required
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">TRACKING NUMBER *</label>
                  <input
                    type="text"
                    value={simTrackingNumber}
                    onChange={(e) => setSimTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                    required
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">SOURCE *</label>
                  <select
                    value={simSource}
                    onChange={(e) => setSimSource(e.target.value as EventSource)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                    required
                  >
                    {EVENT_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Raw Status */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">RAW STATUS</label>
                  <input
                    type="text"
                    value={simRawStatus}
                    onChange={(e) => setSimRawStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                    placeholder="e.g. DELIVERED, OUT_FOR_DELIVERY"
                  />
                </div>

                {/* Carrier Event ID */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">CARRIER EVENT ID (OPTIONAL)</label>
                  <input
                    type="text"
                    value={simCarrierEventId}
                    onChange={(e) => setSimCarrierEventId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                    placeholder="e.g. EVT-1004"
                  />
                </div>

                {/* Occurred At Timestamp */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">OCCURRED AT (OPTIONAL ISO)</label>
                  <input
                    type="text"
                    value={simOccurredAt}
                    onChange={(e) => setSimOccurredAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                    placeholder="Leave empty for now"
                  />
                </div>
              </div>

              {/* Raw Remarks */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">RAW REMARKS</label>
                <input
                  type="text"
                  value={simRawRemarks}
                  onChange={(e) => setSimRawRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                  placeholder="e.g. Delivered successfully"
                />
              </div>

              {/* Custom Payload JSON */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">PAYLOAD (JSON)</label>
                <textarea
                  rows={3}
                  value={simPayloadJson}
                  onChange={(e) => setSimPayloadJson(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-cyan-300"
                />
              </div>

              {/* Simulation Result Preview */}
              {simResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-1.5 font-mono text-xs">
                  <span className="text-slate-400 text-[10px] block">SERVER RESPONSE</span>
                  <pre className="text-emerald-300 max-h-40 overflow-y-auto">
                    {JSON.stringify(simResult, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSingleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={simSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30"
                >
                  <Send className={`w-3.5 h-3.5 ${simSubmitting ? 'animate-spin' : ''}`} />
                  <span>Send Event to Engine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. Bulk Ingestion Modal (POST /api/shipment-events/bulk)
      ───────────────────────────────────────────────────────────── */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk Ingest Shipment Events</h3>
                  <p className="text-xs text-slate-400">
                    Process batches up to 500 events with parallel lane concurrency (POST /api/shipment-events/bulk)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-slate-400 uppercase">BATCH PAYLOAD (JSON)</label>
                <button
                  type="button"
                  onClick={() => setBulkInputJson(JSON.stringify(sampleBulkJson, null, 2))}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset Sample Batch
                </button>
              </div>
              <textarea
                rows={10}
                value={bulkInputJson}
                onChange={(e) => setBulkInputJson(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-white/10 text-xs font-mono text-purple-200"
              />
            </div>

            {/* Results Table */}
            {bulkResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-white">
                    Processed: {bulkResult.processed} Events
                  </span>
                  {bulkResult.batchId && (
                    <span className="text-[11px] text-slate-500">Batch ID: {bulkResult.batchId}</span>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-white/5">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Carrier & Tracking</th>
                        <th className="p-2">Disposition</th>
                        <th className="p-2">Duplicate?</th>
                        <th className="p-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bulkResult.results.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-500">{r.index}</td>
                          <td className="p-2 text-white">
                            {r.carrier} - {r.trackingNumber}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getDispositionStyle(
                                r.disposition,
                              )}`}
                            >
                              {r.disposition}
                            </span>
                          </td>
                          <td className="p-2">{r.isDuplicate ? 'Yes' : 'No'}</td>
                          <td className="p-2 text-slate-400">{r.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${bulkSubmitting ? 'animate-spin' : ''}`} />
                <span>Submit Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. Timeline Lookup Modal (GET /api/shipment-events/timeline/:carrier/:trackingNumber)
      ───────────────────────────────────────────────────────────── */}
      {timelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chronological Parcel Timeline</h3>
                  <p className="text-xs text-slate-400">
                    Query full audit ledger history by carrier & tracking number (GET /api/shipment-events/timeline/...)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTimelineModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTimelineLookup} className="flex items-center gap-3">
              <select
                value={timelineCarrier}
                onChange={(e) => setTimelineCarrier(e.target.value as Carrier)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Tracking number (e.g. PK-EXP-99201)"
                value={timelineTracking}
                onChange={(e) => setTimelineTracking(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                required
              />

              <button
                type="submit"
                disabled={timelineLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lookup</span>
              </button>
            </form>

            {timelineLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              </div>
            ) : timelineResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <CarrierBadge carrier={timelineResult.carrier} size="sm" />
                    <span className="font-mono font-bold text-white">{timelineResult.trackingNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>Status: <strong className="text-cyan-300">{timelineResult.currentStatus || 'UNKNOWN'}</strong></span>
                    <span>Total Events: <strong className="text-white">{timelineResult.totalEvents}</strong></span>
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {timelineResult.timeline.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDispositionStyle(
                              evt.disposition,
                            )}`}
                          >
                            {evt.disposition}
                          </span>
                          <span className="font-mono font-semibold text-white">{evt.rawStatus}</span>
                        </div>
                        {evt.rawRemarks && (
                          <p className="text-[11px] text-slate-400">{evt.rawRemarks}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(evt.occurredAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTimelineModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventLedgerTab;
