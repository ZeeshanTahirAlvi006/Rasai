// src/components/shipments/DisputesTab.tsx
// CPR Margin Defense Station: Financial KPIs, 5-Signal Breakdown, Browser-Printable Dossiers, and CDR Ingestion
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Filter,
  UploadCloud,
  Zap,
  ChevronDown,
  ChevronUp,
  Printer,
  ExternalLink,
  Calendar,
  MapPin,
  Phone,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Copy,
  Check,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import { disputeApi } from '../../api/disputeApi';
import type {
  ICprDispute,
  DisputeKpiSummary,
  CprBand,
  CprDisputeStatus,
} from '../../types/dispute';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { cn } from '../../lib/utils';

const CARRIER_LABELS: Record<string, string> = {
  POSTEX: 'PostEx',
  TRAX: 'Trax',
  LEOPARDS: 'Leopards',
  TCS: 'TCS',
};

// Plain text status styling with semantic text color (Zero background/pill per project standard)
const STATUS_CONFIG: Record<
  CprDisputeStatus,
  { label: string; textClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    textClass: 'text-zinc-600 dark:text-zinc-400 font-bold',
  },
  PENDING_REVIEW: {
    label: 'In Review',
    textClass: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  SUBMITTED: {
    label: 'Submitted',
    textClass: 'text-blue-600 dark:text-blue-400 font-bold',
  },
  SETTLED: {
    label: 'Settled',
    textClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
  },
  REJECTED: {
    label: 'Rejected',
    textClass: 'text-rose-600 dark:text-rose-400 font-bold',
  },
  RETRACTED: {
    label: 'Retracted',
    textClass: 'text-purple-600 dark:text-purple-400 font-bold',
  },
  EXPIRED: {
    label: 'Expired',
    textClass: 'text-zinc-400 dark:text-zinc-600 font-bold',
  },
};

const BAND_CONFIG: Record<
  CprBand,
  { label: string; textClass: string }
> = {
  STRONG: {
    label: 'STRONG',
    textClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
  },
  MEDIUM: {
    label: 'MEDIUM',
    textClass: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  WEAK: {
    label: 'WEAK',
    textClass: 'text-rose-600 dark:text-rose-400 font-bold',
  },
};

const formatDateTime = (dateInput?: string | Date | null): string => {
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

const formatDateOnly = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const DisputesTab: React.FC = () => {
  const [disputes, setDisputes] = useState<ICprDispute[]>([]);
  const [kpi, setKpi] = useState<DisputeKpiSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ALL');
  const [selectedBand, setSelectedBand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Row Accordion Expanded IDs
  const [expandedDisputeIds, setExpandedDisputeIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);
  const [openDossierSections, setOpenDossierSections] = useState<Record<string, boolean>>({
    Summary: true,
    Audit: true,
    Timeline: true,
    Chat: true,
    Calls: true,
    Linked: false,
  });

  const toggleDossierSection = (section: string) => {
    setOpenDossierSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopyTracking = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    toast.success('Copied tracking number');
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Slide-Over Drawers
  const [activeDossier, setActiveDossier] = useState<ICprDispute | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [cdrDrawerOpen, setCdrDrawerOpen] = useState<boolean>(false);
  const [cdrInput, setCdrInput] = useState<string>('');
  const [cdrLoading, setCdrLoading] = useState<boolean>(false);
  const [cdrResult, setCdrResult] = useState<string | null>(null);

  // Action Centered Dialogs
  const [settleModalDispute, setSettleModalDispute] = useState<ICprDispute | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [retractModalDispute, setRetractModalDispute] = useState<ICprDispute | null>(null);
  const [retractReason, setRetractReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch Disputes & KPI
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, listRes] = await Promise.all([
        disputeApi.getKpiSummary(),
        disputeApi.listDisputes({
          status: selectedStatus !== 'ALL' ? (selectedStatus as CprDisputeStatus) : undefined,
          carrier: selectedCarrier !== 'ALL' ? selectedCarrier : undefined,
          cprBand: selectedBand !== 'ALL' ? (selectedBand as CprBand) : undefined,
          search: searchQuery.trim() || undefined,
        }),
      ]);

      if (kpiRes.success) setKpi(kpiRes.data);
      if (listRes.success) setDisputes(listRes.data.disputes);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to fetch disputes';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedCarrier, selectedBand, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle ESC key to dismiss drawers and dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDossier) setActiveDossier(null);
        if (cdrDrawerOpen) setCdrDrawerOpen(false);
        if (settleModalDispute) setSettleModalDispute(null);
        if (retractModalDispute) setRetractModalDispute(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDossier, cdrDrawerOpen, settleModalDispute, retractModalDispute]);

  const toggleDisputeExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedDisputeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleViewDossier = async (disputeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoadingDossier(true);
    try {
      const res = await disputeApi.getDisputeById(disputeId);
      if (res.success) {
        setActiveDossier(res.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load dispute dossier');
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleSubmit = async (dispute: ICprDispute, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (dispute.disputeRetractionRequested) {
      toast.error('Cannot submit: Consignee delivery was confirmed and retraction is requested.');
      return;
    }
    if (!window.confirm(`Submit formal CPR dispute for tracking #${dispute.trackingNumber} to ${dispute.carrier}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await disputeApi.submitDispute(dispute._id);
      toast.success(`Dispute submitted to ${dispute.carrier}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalDispute) return;
    setActionLoading(true);
    try {
      await disputeApi.settleDispute(settleModalDispute._id, settleAmount);
      toast.success(`Settlement recorded: PKR ${settleAmount.toLocaleString()}`);
      setSettleModalDispute(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retractModalDispute || !retractReason.trim()) return;
    setActionLoading(true);
    try {
      await disputeApi.retractDispute(retractModalDispute._id, retractReason);
      toast.success('Dispute retracted successfully');
      setRetractModalDispute(null);
      setRetractReason('');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to retract dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCdrUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdrInput.trim()) return;
    setCdrLoading(true);
    setCdrResult(null);
    try {
      const res = await disputeApi.uploadCdrLogs(cdrInput);
      if (res.success) {
        toast.success(`Ingested ${res.data.ingestedCount} call records!`);
        setCdrResult(`Successfully ingested ${res.data.ingestedCount} records and recalculated ${res.data.matchedDisputesCount} disputes!`);
        setCdrInput('');
        await fetchData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Upload failed';
      setCdrResult(`Upload failed: ${msg}`);
      toast.error(msg);
    } finally {
      setCdrLoading(false);
    }
  };

  const handleTriggerSweeper = async () => {
    try {
      toast.loading('Running settlement cutoff sweeper...', { id: 'sweeper' });
      const res = await disputeApi.triggerSweeper();
      if (res.success) {
        toast.success(`Sweeper finished: ${res.data.warnedCount} warned, ${res.data.expiredCount} expired`, { id: 'sweeper' });
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to trigger sweeper', { id: 'sweeper' });
    }
  };

  const getRelativeCutoff = (cutoffStr: string) => {
    const diff = new Date(cutoffStr).getTime() - Date.now();
    if (diff <= 0) return <span className="text-rose-600 dark:text-rose-400 font-semibold text-xs">Expired</span>;
    const days = Math.floor(diff / (24 * 3600000));
    const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
    if (days === 0) {
      return <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">⚠️ {hours}h left</span>;
    }
    return <span className="text-zinc-600 dark:text-zinc-400 text-xs">{days}d {hours}h left</span>;
  };

  // Filtered Disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      if (selectedStatus !== 'ALL' && d.status !== selectedStatus) return false;
      if (selectedCarrier !== 'ALL' && d.carrier !== selectedCarrier) return false;
      if (selectedBand !== 'ALL' && d.cprBand !== selectedBand) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.trackingNumber.toLowerCase().includes(q) ||
        d.carrier.toLowerCase().includes(q) ||
        d._id.toLowerCase().includes(q)
      );
    });
  }, [disputes, selectedStatus, selectedCarrier, selectedBand, searchQuery]);

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* ============================================================ */}
      {/* 1. TOP PIPELINE TELEMETRY & OPERATIONS COMMAND BAR           */}
      {/* ============================================================ */}
      <div className="border border-border bg-white dark:bg-black p-2.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Mobile Action Controls (< lg) */}
          <div className="flex items-center justify-between gap-2 shrink-0 lg:hidden">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCdrDrawerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
                title="Upload CDR Call Logs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>CDR</span>
              </button>
              <button
                onClick={handleTriggerSweeper}
                title="Run cutoff sweeper"
                className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh disputes"
                className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading ? 'animate-spin' : '')} />
              </button>
            </div>
          </div>

          {/* Section 2: Telemetry Metrics (Static Badges) */}
          <div className="flex items-center gap-1 sm:gap-1.5 w-full lg:w-auto text-xs overflow-x-auto pb-0.5 scrollbar-none">
            {/* All Disputes */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Total disputes recorded"
            >
              <span>Disputes:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {kpi?.totalDisputes ?? disputes.length}
              </span>
            </div>

            {/* At-Risk Disputed Amount */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Unsettled active claims"
            >
              <ShieldAlert className="w-3 h-3 text-rose-500 hidden sm:inline shrink-0" />
              <span>At-Risk:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                PKR {(kpi?.totalDisputedAmount ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Recovered Value */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Total recovered settlements won"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500 hidden sm:inline shrink-0" />
              <span>Recovered:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                PKR {(kpi?.totalSettledAmount ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Win Rate */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Settlement win rate percentage"
            >
              <span className="text-zinc-600 dark:text-zinc-400">Win Rate:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {kpi?.winRate ?? 0}%
              </span>
            </div>

            {/* Strong Evidence Band */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Strong evidence claims (Score ≥ 80)"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500 hidden sm:inline shrink-0" />
              <span>Strong:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {kpi?.bandCounts?.strong ?? 0}
              </span>
            </div>

            {/* Expiring in <48h */}
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 border text-[10px] sm:text-[11px] whitespace-nowrap shrink-0',
                (kpi?.expiringIn48hCount ?? 0) > 0
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-border bg-muted/20 text-muted-foreground'
              )}
              title="Claims nearing settlement cutoff"
            >
              <Clock className="w-3 h-3 text-amber-500 hidden sm:inline shrink-0" />
              <span>&lt;48h Cutoff:</span>
              <span className="font-mono font-bold">
                {kpi?.expiringIn48hCount ?? 0}
              </span>
            </div>
          </div>

          {/* Desktop Action Controls (>= lg) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCdrDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
              title="Upload CDR Call Logs for Telephony Matching"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload CDR Logs</span>
            </button>

            <button
              onClick={handleTriggerSweeper}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Scan cutoffs and update expired disputes"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Run Sweeper</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh disputes state"
              className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading ? 'animate-spin' : '')} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. UNIFIED SEARCH & FILTER TOOLBAR                           */}
      {/* ============================================================ */}
      <div className="border border-border bg-white dark:bg-black p-2.5 shadow-xs">
        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Live Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tracking #, carrier..."
                className="w-full pl-8 pr-7 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Carrier Dropdown */}
            <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-2 py-1">
              <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">ALL CARRIERS</option>
                <option value="POSTEX" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">POSTEX</option>
                <option value="TRAX" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">TRAX</option>
                <option value="LEOPARDS" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">LEOPARDS</option>
                <option value="TCS" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">TCS</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
            >
              <option value="ALL" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">ALL STATUSES</option>
              <option value="DRAFT" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">DRAFT</option>
              <option value="PENDING_REVIEW" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">IN REVIEW</option>
              <option value="SUBMITTED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">SUBMITTED</option>
              <option value="SETTLED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">SETTLED</option>
              <option value="REJECTED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">REJECTED</option>
              <option value="RETRACTED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">RETRACTED</option>
              <option value="EXPIRED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">EXPIRED</option>
            </select>

            {/* Band Dropdown */}
            <select
              value={selectedBand}
              onChange={(e) => setSelectedBand(e.target.value)}
              className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
            >
              <option value="ALL" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">ALL BANDS</option>
              <option value="STRONG" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">STRONG (≥80)</option>
              <option value="MEDIUM" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">MEDIUM (50-79)</option>
              <option value="WEAK" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">WEAK (&lt;50)</option>
            </select>

            {/* Reset Filters Button */}
            {(selectedCarrier !== 'ALL' || selectedStatus !== 'ALL' || selectedBand !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCarrier('ALL');
                  setSelectedStatus('ALL');
                  setSelectedBand('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono shrink-0">
            Showing {filteredDisputes.length} of {disputes.length} disputes
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 border border-rose-300 dark:border-rose-900 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DISPUTES DATA TABLE (3-Column Mobile Shrink Strategy)     */}
      {/* ============================================================ */}
      <div
        role="region"
        tabIndex={0}
        aria-label="Disputes Management Table"
        className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-xs focus:outline-hidden"
      >
        <Table className="max-h-[600px]">
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              {/* 1. Tracking Num (Always visible on mobile & desktop) */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Tracking Num
              </TableHead>

              {/* 2. Carrier (Always visible on mobile & desktop) */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Carrier
              </TableHead>

              {/* 3. Status (Visible on sm+) */}
              <TableHead className="hidden sm:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Status
              </TableHead>

              {/* 4. CPR Evidence Score (Visible on md+) */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Evidence Score
              </TableHead>

              {/* 5. Amount (Visible on md+) */}
              <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">
                Amount
              </TableHead>

              {/* 6. Cutoff Countdown (Visible on lg+) */}
              <TableHead className="hidden lg:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Cutoff
              </TableHead>

              {/* 7. Retraction Alert (Visible on xl+) */}
              <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Alert
              </TableHead>

              {/* 8. Actions (Always visible on mobile & desktop) */}
              <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-zinc-800 dark:text-zinc-200 font-mono">
            {loading && disputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                  <span>Loading CPR disputes...</span>
                </TableCell>
              </TableRow>
            ) : filteredDisputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <ShieldCheck className="w-7 h-7 mx-auto mb-2 opacity-40 text-zinc-400" />
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">No disputes found</div>
                  <div className="text-[11px] mt-0.5">
                    No CPR margin defense records matching the active filter criteria.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDisputes.map((d) => {
                const isExpanded = expandedDisputeIds.has(d._id);
                const statusMeta = STATUS_CONFIG[d.status] || STATUS_CONFIG.DRAFT;
                const bandMeta = BAND_CONFIG[d.cprBand] || BAND_CONFIG.WEAK;

                return (
                  <React.Fragment key={d._id}>
                    <TableRow
                      onClick={() => toggleDisputeExpand(d._id)}
                      className={cn(
                        'cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 hover:bg-muted/40',
                        isExpanded && 'bg-muted/20'
                      )}
                    >
                      {/* 1. Tracking Num */}
                      <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {d.trackingNumber}
                      </TableCell>

                      {/* 2. Carrier (Plain text, zero background/border pill) */}
                      <TableCell className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                        {CARRIER_LABELS[d.carrier] || d.carrier}
                      </TableCell>

                      {/* 3. Status (Plain text, zero background/border pill) */}
                      <TableCell className="hidden sm:table-cell py-2.5 px-3 whitespace-nowrap">
                        <span className={cn('text-[11px] uppercase font-bold', statusMeta.textClass)}>
                          {statusMeta.label}
                        </span>
                      </TableCell>

                      {/* 4. Evidence Score (Plain text, zero background/border pill) */}
                      <TableCell className="hidden md:table-cell py-2.5 px-3 whitespace-nowrap">
                        <span className={cn('text-[11px] font-bold', bandMeta.textClass)}>
                          {bandMeta.label} ({d.cprScore})
                        </span>
                      </TableCell>

                      {/* 5. Amount (Term: Amount, not COD) */}
                      <TableCell className="hidden md:table-cell py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        PKR {d.claimAmount.toLocaleString()}
                      </TableCell>

                      {/* 6. Cutoff */}
                      <TableCell className="hidden lg:table-cell py-2.5 px-3 whitespace-nowrap">
                        {getRelativeCutoff(d.settlementCutoff)}
                      </TableCell>

                      {/* 7. Retraction Alert (Plain text, zero background/border pill) */}
                      <TableCell className="hidden xl:table-cell py-2.5 px-3 whitespace-nowrap text-[11px]">
                        {d.disputeRetractionRequested ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            ⚠️ Delivery Confirmed
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </TableCell>

                      {/* 8. Actions (Always visible on mobile & desktop) */}
                      <TableCell className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleViewDossier(d._id, e)}
                            className="px-2 py-0.5 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Open Full Evidence Dossier"
                          >
                            <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Dossier</span>
                          </button>

                          {d.status === 'DRAFT' && (
                            <button
                              onClick={(e) => handleSubmit(d, e)}
                              disabled={actionLoading || d.disputeRetractionRequested}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              Submit
                            </button>
                          )}

                          {d.status === 'SUBMITTED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSettleModalDispute(d);
                                setSettleAmount(d.claimAmount);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                            >
                              Settle
                            </button>
                          )}

                          {['DRAFT', 'SUBMITTED'].includes(d.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRetractModalDispute(d);
                                setRetractReason(d.disputeRetractionRequested ? 'Customer confirmed receipt' : '');
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                            >
                              Retract
                            </button>
                          )}

                          <button
                            onClick={(e) => toggleDisputeExpand(d._id, e)}
                            className="p-1 border border-border bg-muted/40 hover:bg-muted text-zinc-600 dark:text-zinc-300 cursor-pointer"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Accordion Expanded Detail Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/10 border-b border-zinc-200 dark:border-zinc-800">
                        <TableCell colSpan={8} className="p-3 sm:p-4 font-mono text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Left: Overview Card */}
                            <div className="space-y-1.5 p-3 border border-border bg-white dark:bg-zinc-950">
                              <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">
                                Overview
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Dispute ID:</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[11px] truncate max-w-[180px]">
                                  {d._id}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Carrier:</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {CARRIER_LABELS[d.carrier] || d.carrier}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tracking Number:</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{d.trackingNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className={cn('text-[11px] uppercase font-bold', statusMeta.textClass)}>
                                  {statusMeta.label}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">CPR Score:</span>
                                <span className={cn('font-bold', bandMeta.textClass)}>
                                  {d.cprScore} / 100 ({d.cprBand})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-bold text-amber-500 dark:text-amber-400">
                                  PKR {d.claimAmount.toLocaleString()}
                                </span>
                              </div>
                              {d.settlementAmount !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Settlement Won:</span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    PKR {d.settlementAmount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cutoff Deadline:</span>
                                <span className="text-zinc-800 dark:text-zinc-200">
                                  {new Date(d.settlementCutoff).toLocaleDateString()} ({getRelativeCutoff(d.settlementCutoff)})
                                </span>
                              </div>
                              {d.disputeRetractionRequested && (
                                <div className="pt-2 border-t border-border text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                                  ⚠️ Consignee delivery was confirmed. Retraction requested.
                                </div>
                              )}
                            </div>

                            {/* Right: 5-Signal Breakdown Mini-Card & Action Launcher */}
                            <div className="space-y-2 p-3 border border-border bg-white dark:bg-zinc-950 flex flex-col justify-between">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-2">
                                  Audit Breakdown
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  {d.breakdown && (
                                    <>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Zero Verified Courier Call:</span>
                                        <span className={d.breakdown.noCallEvidence?.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                                          {d.breakdown.noCallEvidence?.points ?? 0} pts
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Customer WhatsApp Confirmed:</span>
                                        <span className={d.breakdown.customerConfirmed?.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                                          {d.breakdown.customerConfirmed?.points ?? 0} pts
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Address Contradiction:</span>
                                        <span className={d.breakdown.addressContradicts?.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                                          {d.breakdown.addressContradicts?.points ?? 0} pts
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Timing Discrepancy:</span>
                                        <span className={d.breakdown.timingDiscrepancy?.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                                          {d.breakdown.timingDiscrepancy?.points ?? 0} pts
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Inside Cutoff Window:</span>
                                        <span className={d.breakdown.insideCutoff?.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500'}>
                                          {d.breakdown.insideCutoff?.points ?? 0} pts
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-border flex items-center justify-end gap-2 flex-wrap">
                                <button
                                  onClick={(e) => handleViewDossier(d._id, e)}
                                  className="px-3 py-1.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Dossier</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ============================================================ */}
      {/* 4. SLIDE-OVER RIGHT DRAWER: DOSSIER & PRINT VIEW             */}
      {/* ============================================================ */}
      {activeDossier && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveDossier(null)}
        >
          <div
            className="w-full max-w-3xl h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Dispute Dossier"
          >
            {/* Header controls (hidden when printing) */}
            <div className="px-5 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Dossier
                </span>
                <span className={cn('text-xs font-bold', BAND_CONFIG[activeDossier.cprBand]?.textClass)}>
                  {activeDossier.cprBand} ({activeDossier.cprScore} / 100)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer"
                  title="Print Dossier"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveDossier(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Identity Strip (Zero Background Pills per Project Standards) */}
            <div className="px-5 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between flex-wrap gap-2 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {CARRIER_LABELS[activeDossier.carrier] || activeDossier.carrier}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 select-all">
                  {activeDossier.trackingNumber}
                </span>
                <button
                  onClick={() => handleCopyTracking(activeDossier.trackingNumber)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copy tracking number"
                >
                  {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('font-bold', STATUS_CONFIG[activeDossier.status]?.textClass)}>
                  {STATUS_CONFIG[activeDossier.status]?.label || activeDossier.status}
                </span>
              </div>
            </div>

            {/* Printable & Scrollable Dossier Sheet */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 print:p-0 print:text-black">
              {/* Document Header (Print Only) */}
              <div className="hidden print:block border-b border-zinc-300 pb-3 mb-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                  NDR Middleware Margin Defense Control
                </div>
                <h1 className="text-lg font-bold text-black mt-1">
                  COURIER PERFORMANCE RATE (CPR) DISPUTE AUDIT DOSSIER
                </h1>
                <div className="grid grid-cols-4 gap-3 mt-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Tracking Number</span>
                    <span className="font-bold text-black">{activeDossier.trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Courier</span>
                    <span className="font-bold text-black">{CARRIER_LABELS[activeDossier.carrier] || activeDossier.carrier}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Amount</span>
                    <span className="font-bold text-black">PKR {activeDossier.claimAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Cutoff</span>
                    <span className="font-bold text-black">{formatDateOnly(activeDossier.settlementCutoff)}</span>
                  </div>
                </div>
              </div>

              {/* 1. Summary */}
              <div className="border border-border bg-white dark:bg-black">
                <button
                  type="button"
                  onClick={() => toggleDossierSection('Summary')}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer print:border-none"
                >
                  <span>Summary</span>
                  <span className="print:hidden">
                    {openDossierSections['Summary'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {openDossierSections['Summary'] && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                      <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Amount</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        PKR {activeDossier.claimAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                      <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Score</span>
                      <span className={cn('text-sm font-bold tabular-nums', BAND_CONFIG[activeDossier.cprBand]?.textClass)}>
                        {activeDossier.cprScore} / 100
                      </span>
                    </div>
                    <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                      <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Band</span>
                      <span className={cn('font-bold', BAND_CONFIG[activeDossier.cprBand]?.textClass)}>
                        {activeDossier.cprBand}
                      </span>
                    </div>
                    <div className="p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                      <span className="text-muted-foreground block uppercase text-[10px] font-semibold">Cutoff</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                        {formatDateOnly(activeDossier.settlementCutoff)}
                      </span>
                    </div>
                    {activeDossier.settlementAmount !== undefined && activeDossier.settlementAmount > 0 && (
                      <div className="col-span-2 md:col-span-4 p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center justify-between">
                        <span className="text-muted-foreground uppercase text-[10px] font-semibold">Settled</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          PKR {activeDossier.settlementAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Audit */}
              <div className="border border-border bg-white dark:bg-black">
                <button
                  type="button"
                  onClick={() => toggleDossierSection('Audit')}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer print:border-none"
                >
                  <span>Audit</span>
                  <span className="print:hidden">
                    {openDossierSections['Audit'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {openDossierSections['Audit'] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    {Object.entries(activeDossier.breakdown).map(([key, val]) => (
                      <div
                        key={key}
                        className={cn(
                          'p-2.5 border',
                          val.passed
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300'
                            : 'border-border bg-zinc-50/50 dark:bg-zinc-900/20 text-muted-foreground'
                        )}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span>{val.points} / {val.maxPoints} pts</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
                          {val.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Timeline (Proper Connected Timeline, Dots & Line Aligned) */}
              {activeDossier.evidenceSnapshot?.ledgerEvents && activeDossier.evidenceSnapshot.ledgerEvents.length > 0 && (
                <div className="border border-border bg-white dark:bg-black">
                  <button
                    type="button"
                    onClick={() => toggleDossierSection('Timeline')}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer print:border-none"
                  >
                    <span>Timeline</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {activeDossier.evidenceSnapshot.ledgerEvents.length}
                    </span>
                  </button>

                  {openDossierSections['Timeline'] && (
                    <div className="p-4 space-y-0">
                      {activeDossier.evidenceSnapshot.ledgerEvents.map((ev, idx) => {
                        const isLast = idx === activeDossier.evidenceSnapshot!.ledgerEvents.length - 1;
                        return (
                          <div key={idx} className="flex gap-3">
                            {/* Track Column (Dot + Perfectly Aligned Connecting Line) */}
                            <div className="flex flex-col items-center shrink-0 w-3">
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full shrink-0 mt-1',
                                  ev.disposition === 'APPLIED' ? 'bg-emerald-500' : 'bg-blue-500'
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
                                  {formatDateTime(ev.occurredAt)}
                                </span>
                                {ev.disposition && (
                                  <span className={ev.disposition === 'APPLIED' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                                    {ev.disposition}
                                  </span>
                                )}
                              </div>
                              <div className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                                {ev.rawStatus || 'STATUS UPDATE'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Chat */}
              {activeDossier.evidenceSnapshot?.conversationSummary && (
                <div className="border border-border bg-white dark:bg-black">
                  <button
                    type="button"
                    onClick={() => toggleDossierSection('Chat')}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer print:border-none"
                  >
                    <span>Chat</span>
                    <span className="print:hidden">
                      {openDossierSections['Chat'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>

                  {openDossierSections['Chat'] && (
                    <div className="p-4 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                        <span className="text-muted-foreground">Session Outcome</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {activeDossier.evidenceSnapshot.conversationSummary.state}
                        </span>
                      </div>
                      {activeDossier.evidenceSnapshot.conversationSummary.requestedRescheduleDate && (
                        <div className="flex items-center justify-between p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                          <span className="text-muted-foreground">Reschedule Requested</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatDateOnly(activeDossier.evidenceSnapshot.conversationSummary.requestedRescheduleDate)}
                          </span>
                        </div>
                      )}
                      {activeDossier.evidenceSnapshot.conversationSummary.location && (
                        <div className="flex items-center justify-between p-2 border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
                          <span className="text-muted-foreground">Verified GPS Pin</span>
                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {activeDossier.evidenceSnapshot.conversationSummary.location.lat},{' '}
                            {activeDossier.evidenceSnapshot.conversationSummary.location.lng}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Calls */}
              {activeDossier.evidenceSnapshot?.callLogMatches && (
                <div className="border border-border bg-white dark:bg-black">
                  <button
                    type="button"
                    onClick={() => toggleDossierSection('Calls')}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer print:border-none"
                  >
                    <span>Calls</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {activeDossier.evidenceSnapshot.callLogMatches.length}
                    </span>
                  </button>

                  {openDossierSections['Calls'] && (
                    <div className="p-4">
                      {activeDossier.evidenceSnapshot.callLogMatches.length === 0 ? (
                        <div className="p-3 border border-rose-300 dark:border-rose-900/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                          ⚠️ Zero call records found in attempt window. Courier made no verified delivery call.
                        </div>
                      ) : (
                        <div className="border border-border overflow-hidden text-xs">
                          <table className="w-full text-left font-mono">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-muted-foreground">
                              <tr>
                                <th className="py-2 px-3">Call Time</th>
                                <th className="py-2 px-3">Duration</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {activeDossier.evidenceSnapshot.callLogMatches.map((call, i) => (
                                <tr key={i}>
                                  <td className="py-2 px-3 text-muted-foreground">{formatDateTime(call.callTimestamp)}</td>
                                  <td className="py-2 px-3">{call.durationSeconds}s</td>
                                  <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">{call.callStatus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 6. Linked */}
              <div className="border border-border bg-white dark:bg-black print:hidden">
                <button
                  type="button"
                  onClick={() => toggleDossierSection('Linked')}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 border-b border-border text-left font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <span>Linked</span>
                  {openDossierSections['Linked'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {openDossierSections['Linked'] && (
                  <div className="p-3 grid grid-cols-1 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDossier(null);
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

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDossier(null);
                        navigate('/manifests');
                      }}
                      className="p-3 border border-border bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-purple-500 shrink-0" />
                        <div>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block">Dispatch</span>
                          <span className="text-[10px] text-muted-foreground">Station morning run-sheets and manifest batch</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </button>

                    {activeDossier.shipmentId && (
                      <button
                        type="button"
                        onClick={() => {
                          const id = activeDossier.shipmentId;
                          setActiveDossier(null);
                          openInspection(id);
                        }}
                        className="p-3 border border-border bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <span className="text-zinc-900 dark:text-zinc-100 font-bold block">Inspect</span>
                            <span className="text-[10px] text-muted-foreground">Open parcel 360 inspection drawer</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sign-off / Signature footer */}
              <div className="pt-4 border-t border-border flex justify-between items-center text-[11px] text-muted-foreground print:pt-12 print:text-black">
                <div>Generated by NDR Middleware CPR Defense System</div>
                <div className="text-right">Authorized Merchant Operations Representative</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SLIDE-OVER RIGHT DRAWER: UPLOAD CDR CALL LOGS             */}
      {/* ============================================================ */}
      {cdrDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setCdrDrawerOpen(false)}
        >
          <div
            className="w-full max-w-xl h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upload CDR Call Logs"
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Upload CDR Call Logs
                </span>
                <span className="text-[10px] text-zinc-500 bg-muted px-2 py-0.5 border border-border">
                  TELEPHONY
                </span>
              </div>
              <button
                onClick={() => setCdrDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleCdrUpload} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Paste CSV call logs exported from your telephony PBX or courier call center. Required columns:{' '}
                  <code className="text-zinc-900 dark:text-zinc-100 font-bold">Phone</code>,{' '}
                  <code className="text-zinc-900 dark:text-zinc-100 font-bold">Time</code>,{' '}
                  <code className="text-zinc-900 dark:text-zinc-100 font-bold">Duration</code>,{' '}
                  <code className="text-zinc-900 dark:text-zinc-100 font-bold">Status</code>.
                </p>

                <textarea
                  rows={10}
                  value={cdrInput}
                  onChange={(e) => setCdrInput(e.target.value)}
                  placeholder="Rider,Phone,Time,Duration,Status&#10;03129999999,03001234567,2026-10-25 14:30:00,45,ANSWERED"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                />

                {cdrResult && (
                  <div
                    className={cn(
                      'p-3 border text-xs',
                      cdrResult.includes('failed')
                        ? 'border-rose-300 dark:border-rose-900 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'border-emerald-300 dark:border-emerald-900 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {cdrResult}
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCdrDrawerOpen(false)}
                  className="px-4 py-2 border border-border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cdrLoading || !cdrInput.trim()}
                  className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold hover:opacity-85 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className={cn('w-3.5 h-3.5', cdrLoading && 'animate-spin')} />
                  <span>{cdrLoading ? 'Ingesting Logs...' : 'Ingest & Recalculate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. CENTERED TERMINAL DIALOG: RECORD COURIER SETTLEMENT       */}
      {/* ============================================================ */}
      {settleModalDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Record Courier Settlement
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tracking #{settleModalDispute.trackingNumber} | Claimed: PKR {settleModalDispute.claimAmount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSettleModalDispute(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                  Agreed Settlement Amount (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSettleModalDispute(null)}
                  className="px-3 py-1.5 border border-border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. CENTERED TERMINAL DIALOG: FORMALLY RETRACT DISPUTE        */}
      {/* ============================================================ */}
      {retractModalDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Formally Retract Dispute
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tracking #{retractModalDispute.trackingNumber}
                </p>
              </div>
              <button
                onClick={() => setRetractModalDispute(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRetract} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                  Retraction Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={retractReason}
                  onChange={(e) => setRetractReason(e.target.value)}
                  placeholder="e.g. Consignee confirmed parcel delivered upon secondary audit..."
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRetractModalDispute(null)}
                  className="px-3 py-1.5 border border-border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !retractReason.trim()}
                  className="px-4 py-1.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  Confirm Retraction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputesTab;
