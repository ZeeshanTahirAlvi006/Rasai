// src/components/shipments/OutboxTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  Eye,
  Copy,
  Check,
  Filter,
  FileText,
  AlertOctagon,
  ShieldAlert,
  Zap,
  Activity,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IOutboxMessageItem,
  OutboxSummary,
  GovernorStatus,
  MerchantTemplateConfig,
  OpsAlertItem,
  OutboxStatus,
  OutboxMessageType,
  ListOutboxFilter,
} from '../../types/outbox';
import {
  listOutboxMessages,
  triggerRelayTick,
  dispatchOutboxMessage,
  getGovernorStatus,
  pauseGovernor,
  resumeGovernor,
  listTemplates,
  saveTemplate,
  listOpsAlerts,
  resolveOpsAlert,
} from '../../api/outboxApi';
import CarrierBadge from './CarrierBadge';

const STATUS_CONFIG: Record<
  OutboxStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PROCESSING: {
    label: 'Processing',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
  },
  DISPATCHED: {
    label: 'Dispatched',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  DISCARDED_STALE: {
    label: 'Stale (Discarded)',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  FAILED: {
    label: 'Failed (Poison)',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const TYPE_CONFIG: Record<OutboxMessageType, { label: string; badge: string }> = {
  NDR_UTILITY_TEMPLATE: {
    label: 'NDR Utility',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  RTO_NOTICE: {
    label: 'RTO Notice',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  DELIVERY_CORRECTION: {
    label: 'Delivery Correction',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  RESCHEDULE_CONFIRMATION: {
    label: 'Reschedule Confirmed',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
};

export const OutboxTab: React.FC = () => {
  // Main Data States
  const [messages, setMessages] = useState<IOutboxMessageItem[]>([]);
  const [summary, setSummary] = useState<OutboxSummary>({
    PENDING: 0,
    PROCESSING: 0,
    DISPATCHED: 0,
    DISCARDED_STALE: 0,
    FAILED: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [governor, setGovernor] = useState<GovernorStatus | null>(null);
  const [templates, setTemplates] = useState<MerchantTemplateConfig[]>([]);
  const [alerts, setAlerts] = useState<OpsAlertItem[]>([]);

  // Loading States
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingRelay, setLoadingRelay] = useState(false);
  const [loadingGov, setLoadingGov] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(50);

  // Modals & Inspection
  const [selectedMessage, setSelectedMessage] = useState<IOutboxMessageItem | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MerchantTemplateConfig | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Template Form State
  const [tplName, setTplName] = useState('');
  const [tplLang, setTplLang] = useState('en_US');
  const [tplHeaderType, setTplHeaderType] = useState<'NONE' | 'TEXT'>('NONE');
  const [tplHeaderText, setTplHeaderText] = useState('');
  const [tplBindings, setTplBindings] = useState('');
  const [tplSaving, setTplSaving] = useState(false);

  // Countdown timer for paused governor
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);

  const fetchOutboxData = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const filter: ListOutboxFilter = { limit: 50 };
      if (statusFilter) filter.status = statusFilter as OutboxStatus;
      if (typeFilter) filter.messageType = typeFilter as OutboxMessageType;

      const res = await listOutboxMessages(filter);
      setMessages(res.data.messages);
      setSummary(res.data.summary);
      setTotalCount(res.data.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load outbox messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [statusFilter, typeFilter]);

  const fetchGovernorData = useCallback(async () => {
    try {
      const res = await getGovernorStatus();
      setGovernor(res.data);
      if (res.data.isPaused && res.data.resumeAt) {
        const remaining = Math.max(0, Math.floor((new Date(res.data.resumeAt).getTime() - Date.now()) / 1000));
        setPauseCountdown(remaining);
      } else {
        setPauseCountdown(null);
      }
    } catch (err: any) {
      console.error('Governor status error:', err);
    }
  }, []);

  const fetchTemplatesData = useCallback(async () => {
    try {
      const res = await listTemplates();
      setTemplates(res.data);
    } catch (err: any) {
      console.error('Template list error:', err);
    }
  }, []);

  const fetchAlertsData = useCallback(async () => {
    try {
      const res = await listOpsAlerts();
      setAlerts(res.data);
    } catch (err: any) {
      console.error('Alerts list error:', err);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchOutboxData();
    fetchGovernorData();
    fetchTemplatesData();
    fetchAlertsData();
  }, [fetchOutboxData, fetchGovernorData, fetchTemplatesData, fetchAlertsData]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Live timer for pause countdown
  useEffect(() => {
    if (pauseCountdown === null || pauseCountdown <= 0) return;
    const interval = setInterval(() => {
      setPauseCountdown((prev) => {
        if (prev === null || prev <= 1) {
          fetchGovernorData();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pauseCountdown, fetchGovernorData]);

  // Handle Relay Tick
  const handleTriggerRelay = async () => {
    setLoadingRelay(true);
    try {
      const res = await triggerRelayTick(batchSize);
      toast.success(
        `Relay executed: claimed & enqueued ${res.data.claimedCount} messages`,
        { icon: '🚀' },
      );
      fetchOutboxData();
      fetchGovernorData();
    } catch (err: any) {
      toast.error(err.message || 'Relay tick failed');
    } finally {
      setLoadingRelay(false);
    }
  };

  // Handle Single Message Test Dispatch
  const handleDispatchMessage = async (id: string) => {
    setDispatchingId(id);
    try {
      const res = await dispatchOutboxMessage(id);
      toast.success(`Message processed: ${res.data.status}`, { icon: '⚡' });
      fetchOutboxData();
      fetchGovernorData();
    } catch (err: any) {
      toast.error(err.message || 'Dispatch failed');
    } finally {
      setDispatchingId(null);
    }
  };

  // Handle Governor Pause
  const handlePauseGov = async () => {
    setLoadingGov(true);
    try {
      await pauseGovernor('META_WHATSAPP', 600_000); // 10 minutes
      toast.success('Governor paused for 10 minutes (Meta 131048 simulation)');
      fetchGovernorData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause governor');
    } finally {
      setLoadingGov(false);
    }
  };

  // Handle Governor Resume
  const handleResumeGov = async () => {
    setLoadingGov(true);
    try {
      await resumeGovernor('META_WHATSAPP');
      toast.success('Governor resumed: Token bucket active');
      fetchGovernorData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume governor');
    } finally {
      setLoadingGov(false);
    }
  };

  // Handle Alert Resolution
  const handleResolveAlert = async (id: string) => {
    setResolvingAlertId(id);
    try {
      await resolveOpsAlert(id);
      toast.success('Ops alert marked as resolved');
      fetchAlertsData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert');
    } finally {
      setResolvingAlertId(null);
    }
  };

  // Open Template Editor
  const handleEditTemplate = (tpl: MerchantTemplateConfig) => {
    setEditingTemplate(tpl);
    setTplName(tpl.templateName || '');
    setTplLang(tpl.languageCode || 'en_US');
    setTplHeaderType(tpl.headerType || 'NONE');
    setTplHeaderText(tpl.headerText || '');
    setTplBindings((tpl.parameterBindings || []).join(', '));
  };

  // Save Template Config
  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setTplSaving(true);
    try {
      const bindingsArray = tplBindings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveTemplate({
        messageType: editingTemplate.messageType,
        templateName: tplName.trim(),
        languageCode: tplLang.trim(),
        headerType: tplHeaderType,
        headerText: tplHeaderText.trim() || undefined,
        parameterBindings: bindingsArray,
        status: 'ACTIVE',
      });

      toast.success(`Template updated & cache invalidated for ${editingTemplate.messageType}`);
      setEditingTemplate(null);
      fetchTemplatesData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setTplSaving(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Summary */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 font-mono text-xs space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white uppercase tracking-wider">
                Outbox
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                META WHATSAPP PIPELINE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Transactional message outbox, rate-limit governor, and atomic lease relay dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={refreshAll}
              disabled={loadingMessages}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin text-emerald-400' : ''}`}
              />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Status Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* PENDING */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                PENDING
              </span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-bold text-amber-200">{summary.PENDING}</span>
            <span className="text-[10px] text-amber-400/80 block mt-0.5">Awaiting Relay</span>
          </div>

          {/* PROCESSING */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                PROCESSING
              </span>
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-bold text-blue-200">{summary.PROCESSING}</span>
            <span className="text-[10px] text-blue-400/80 block mt-0.5">Enqueued in BullMQ</span>
          </div>

          {/* DISPATCHED */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                DISPATCHED
              </span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-bold text-emerald-200">{summary.DISPATCHED}</span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">Sent via Meta</span>
          </div>

          {/* DISCARDED_STALE */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                STALE
              </span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-bold text-slate-300">{summary.DISCARDED_STALE}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Pre-flight Matrix Drop</span>
          </div>

          {/* FAILED */}
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                FAILED / POISON
              </span>
              <XCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xl font-bold text-rose-200">{summary.FAILED}</span>
            <span className="text-[10px] text-rose-400/80 block mt-0.5">Reaped After 5 Tries</span>
          </div>

          {/* GOVERNOR PILL */}
          <div
            className={`p-3 rounded-xl border ${
              governor?.isPaused
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-teal-500/10 border-teal-500/20 text-teal-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                GOVERNOR
              </span>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold block truncate">
              {governor?.isPaused ? 'PAUSED' : 'ACTIVE'}
            </span>
            <span className="text-[10px] block mt-0.5 truncate font-mono">
              {governor?.isPaused && pauseCountdown !== null
                ? `Resumes in ${pauseCountdown}s`
                : 'Rate: 60 msg/sec'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Station: Relay Trigger & Send Governor */}
      <div className="space-y-2">
        <div className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">
          Control
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Relay Daemon Control */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Outbox Relay Daemon Trigger</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              ATOMIC 2-STEP CLAIM
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Relay runs Phase 1a poison reaping (<span className="text-rose-300 font-mono">attempts ≥ 5</span>), Phase 1b lease reaper, and assigns an atomic <span className="text-cyan-300 font-mono">relayClaimToken</span> before enqueuing to BullMQ.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Batch Size:</span>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button
              onClick={handleTriggerRelay}
              disabled={loadingRelay}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20 border border-cyan-400/20 transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${loadingRelay ? 'animate-bounce text-yellow-300' : ''}`} />
              <span>{loadingRelay ? 'Executing Relay Tick...' : 'Trigger Relay Tick Now'}</span>
            </button>
          </div>
        </div>

        {/* Send Governor Control */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Rate Governor & Circuit Breaker</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                governor?.isPaused
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {governor?.isPaused ? 'CIRCUIT OPEN (PAUSED)' : 'TOKEN BUCKET (60/s)'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Redis-backed token bucket prevents Meta rate limits. Triggers a 10-minute circuit-break cooldown automatically upon encountering error code <span className="text-rose-300 font-mono">131048</span>.
          </p>

          <div className="flex items-center gap-2.5 pt-2">
            {governor?.isPaused ? (
              <button
                onClick={handleResumeGov}
                disabled={loadingGov}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Governor (Clear Pause)</span>
              </button>
            ) : (
              <button
                onClick={handlePauseGov}
                disabled={loadingGov}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600/80 hover:bg-amber-600 text-white shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Governor (Simulate 131048)</span>
              </button>
            )}

            <button
              onClick={fetchGovernorData}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Query Redis permit state"
            >
              <span>Check Permit</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Queue Filter Bar & Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold font-mono text-white uppercase tracking-wider">Dispatch Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
              {totalCount} Total Messages
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="DISCARDED_STALE">DISCARDED_STALE</option>
              <option value="FAILED">FAILED</option>
            </select>

            {/* Message Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Message Types</option>
              <option value="NDR_UTILITY_TEMPLATE">NDR_UTILITY_TEMPLATE</option>
              <option value="RTO_NOTICE">RTO_NOTICE</option>
              <option value="DELIVERY_CORRECTION">DELIVERY_CORRECTION</option>
              <option value="RESCHEDULE_CONFIRMATION">RESCHEDULE_CONFIRMATION</option>
            </select>

            {(statusFilter || typeFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Outbox Messages Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Message ID / Dedupe</th>
                <th className="py-3 px-3">Type & Channel</th>
                <th className="py-3 px-3">Shipment Ref</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Attempts / Lease</th>
                <th className="py-3 px-3">Payload / Meta ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loadingMessages ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p className="font-mono text-xs">Loading outbox queue...</p>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Send className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-400">No Outbox Messages Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Trigger an NDR event in the Events Tab or import a batch with NDR/RTO status to generate messages.
                    </p>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const statusConf = STATUS_CONFIG[msg.status] || STATUS_CONFIG.PENDING;
                  const typeConf = TYPE_CONFIG[msg.messageType] || {
                    label: msg.messageType,
                    badge: 'bg-white/10 text-slate-300 border-white/20',
                  };

                  const shipment =
                    typeof msg.shipmentId === 'object' && msg.shipmentId !== null
                      ? msg.shipmentId
                      : null;

                  return (
                    <tr
                      key={msg._id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* ID / Dedupe */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                          <span>{msg._id.slice(-8)}</span>
                          <button
                            onClick={() => handleCopy(msg._id, msg._id)}
                            className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy full Outbox ID"
                          >
                            {copiedId === msg._id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span
                          className="text-[10px] text-slate-500 font-mono block truncate max-w-[140px]"
                          title={msg.dedupeKey}
                        >
                          {msg.dedupeKey}
                        </span>
                      </td>

                      {/* Type & Channel */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${typeConf.badge}`}
                        >
                          {typeConf.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {msg.channel}
                        </span>
                      </td>

                      {/* Shipment Ref */}
                      <td className="py-3 px-3 font-mono">
                        {shipment ? (
                          <div className="space-y-0.5">
                            <span className="text-xs text-indigo-300 font-semibold block">
                              {shipment.trackingNumber || 'N/A'}
                            </span>
                            {shipment.carrier && (
                              <CarrierBadge carrier={shipment.carrier as any} size="sm" />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">
                            {typeof msg.shipmentId === 'string' ? msg.shipmentId.slice(-8) : 'N/A'}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          {statusConf.icon}
                          <span>{statusConf.label}</span>
                        </span>
                      </td>

                      {/* Attempts / Lease Version */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div>
                          <span
                            className={
                              msg.attempts >= 4
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-300'
                            }
                          >
                            {msg.attempts} / 5
                          </span>
                          <span className="text-slate-500 text-[10px] block">
                            v{msg.leaseVersion || 1}
                          </span>
                        </div>
                      </td>

                      {/* Payload / Meta ID / Last Error */}
                      <td className="py-3 px-3 max-w-[200px]">
                        {msg.metaMessageId ? (
                          <div className="font-mono text-[10px] text-emerald-400 truncate">
                            <span className="text-slate-500">ID: </span>
                            {msg.metaMessageId}
                          </div>
                        ) : msg.lastError ? (
                          <div
                            className="font-mono text-[10px] text-rose-400 truncate"
                            title={msg.lastError}
                          >
                            <span className="text-rose-500">Err: </span>
                            {msg.lastError}
                          </div>
                        ) : (
                          <div className="font-mono text-[10px] text-slate-400 truncate">
                            {JSON.stringify(msg.payload || {})}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dispatch single message */}
                          <button
                            onClick={() => handleDispatchMessage(msg._id)}
                            disabled={
                              dispatchingId === msg._id ||
                              msg.status === 'DISPATCHED' ||
                              msg.status === 'DISCARDED_STALE'
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Dispatch immediately through outbox worker pipeline"
                          >
                            {dispatchingId === msg._id ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-300 inline" />
                            ) : (
                              'Dispatch'
                            )}
                          </button>

                          {/* View detail modal */}
                          <button
                            onClick={() => setSelectedMessage(msg)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                            title="Inspect message payload & metadata"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Templates & Ops Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Merchant WhatsApp Templates Catalog */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">WhatsApp Templates Catalog</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              LRU CACHED (5m)
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Manage template names, language codes, and variable bindings mapped to Meta approved HSM templates.
          </p>

          <div className="space-y-2.5">
            {templates.map((tpl) => (
              <div
                key={tpl.messageType}
                className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {tpl.messageType}
                    </span>
                    {tpl.isCustom ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        CUSTOM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-indigo-300">
                    {tpl.templateName}{' '}
                    <span className="text-slate-500">({tpl.languageCode})</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(tpl.parameterBindings || []).map((binding) => (
                      <span
                        key={binding}
                        className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/5 text-slate-400 border border-white/5"
                      >
                        {`{{${binding}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleEditTemplate(tpl)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  Configure
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Alerts Live Feed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-white">Operational Alerts (OpsAlert)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
              5-MIN COOLDOWN
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time feed for circuit breaks, poison messages, and Meta spam rate limits with email dispatch alerting.
          </p>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-white/5 rounded-xl">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/60 mb-1.5" />
                <p className="text-xs font-mono text-slate-400">No Active Operational Alerts</p>
                <p className="text-[10px] text-slate-600">All services operating within normal thresholds</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-3 rounded-xl border transition-all ${
                    alert.resolved
                      ? 'bg-slate-950/40 border-white/5 opacity-60'
                      : alert.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {alert.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                      {!alert.resolved && (
                        <button
                          onClick={() => handleResolveAlert(alert._id)}
                          disabled={resolvingAlertId === alert._id}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors disabled:opacity-50"
                        >
                          {resolvingAlertId === alert._id ? 'Resolving...' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 font-mono mt-1.5 truncate">
                    Scope: <span className="text-indigo-300">{alert.scope}</span>
                  </p>

                  {alert.details && (
                    <div className="mt-1 text-[10px] font-mono text-slate-400 bg-black/30 p-1.5 rounded max-h-16 overflow-y-auto">
                      {JSON.stringify(alert.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Outbox Message Details</h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[10px]">ID:</span>
                <span className="text-slate-200">{selectedMessage._id}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Dedupe Key:</span>
                <span className="text-slate-200 truncate block">{selectedMessage.dedupeKey}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Status / Version:</span>
                <span className="text-emerald-300 font-bold">
                  {selectedMessage.status} (v{selectedMessage.leaseVersion || 1})
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5">
                <span className="text-slate-500 block text-[10px]">Relay Claim Token:</span>
                <span className="text-cyan-300 truncate block">
                  {selectedMessage.relayClaimToken || 'None (Unclaimed)'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                Resolved Payload:
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedMessage.payload, null, 2)}
              </pre>
            </div>

            {selectedMessage.lastError && (
              <div>
                <span className="text-xs font-semibold text-rose-400 block mb-1.5">
                  Last Error:
                </span>
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {selectedMessage.lastError}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Configure Template: {editingTemplate.messageType}
                </h3>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Meta HSM Template Name:
                </label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. ndr_utility_v1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Language Code:</label>
                  <input
                    type="text"
                    required
                    value={tplLang}
                    onChange={(e) => setTplLang(e.target.value)}
                    placeholder="e.g. en_US"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Header Type:</label>
                  <select
                    value={tplHeaderType}
                    onChange={(e) => setTplHeaderType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NONE">NONE</option>
                    <option value="TEXT">TEXT</option>
                  </select>
                </div>
              </div>

              {tplHeaderType === 'TEXT' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Header Text:</label>
                  <input
                    type="text"
                    value={tplHeaderText}
                    onChange={(e) => setTplHeaderText(e.target.value)}
                    placeholder="Delivery Notice"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Body Parameter Bindings (comma-separated):
                </label>
                <input
                  type="text"
                  value={tplBindings}
                  onChange={(e) => setTplBindings(e.target.value)}
                  placeholder="trackingNumber, orderValueCOD, carrier"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Available shipment keys: trackingNumber, orderValueCOD, carrier, rescheduledDate, customerPhone
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {tplSaving ? 'Saving...' : 'Save & Invalidate Cache'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboxTab;
