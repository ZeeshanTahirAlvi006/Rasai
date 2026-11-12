// src/components/shipments/ManifestsTab.tsx
// 07:30 PKT automated station run-sheet dispatch, pending manifests, and batch archive.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Building2,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Zap,
  Layers,
  ArrowUpRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IManifestBatchItem,
  ManifestStatus,
  ManifestSummary,
  PendingManifestParcelItem,
  CarrierStationItem,
} from '../../types/manifest';
import {
  listManifests,
  listPendingManifestParcels,
  triggerManifestCompilation,
  downloadManifestArtifact,
  listCarrierStations,
  upsertCarrierStation,
  deleteCarrierStation,
} from '../../api/manifestApi';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { cn } from '../../lib/utils';

const CARRIER_LABELS: Record<string, string> = {
  POSTEX: 'PostEx',
  TRAX: 'Trax',
  LEOPARDS: 'Leopards',
  TCS: 'TCS',
};

// Plain text status labels with clean semantic text color (Zero background/pill per project standard)
const STATUS_CONFIG: Record<
  ManifestStatus,
  { label: string; textClass: string }
> = {
  SENT: {
    label: 'Dispatched',
    textClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
  },
  STARTED: {
    label: 'Compiling',
    textClass: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  FAILED: {
    label: 'Failed',
    textClass: 'text-rose-600 dark:text-rose-400 font-bold',
  },
};

export const ManifestsTab: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<'batches' | 'pending' | 'stations'>('batches');

  // Batches state
  const [batches, setBatches] = useState<IManifestBatchItem[]>([]);
  const [summary, setSummary] = useState<ManifestSummary>({
    SENT: 0,
    STARTED: 0,
    FAILED: 0,
    totalParcelsSent: 0,
    pendingParcelsCount: 0,
  });
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);

  // Pending parcels state
  const [pendingParcels, setPendingParcels] = useState<PendingManifestParcelItem[]>([]);
  const [totalPending, setTotalPending] = useState<number>(0);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  // Carrier stations state
  const [stations, setStations] = useState<CarrierStationItem[]>([]);
  const [loadingStations, setLoadingStations] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Row Accordion Expanded IDs
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [expandedPendingIds, setExpandedPendingIds] = useState<Set<string>>(new Set());
  const [expandedStationIds, setExpandedStationIds] = useState<Set<string>>(new Set());

  // Drawers & Action loading
  const [compiling, setCompiling] = useState<boolean>(false);
  const [compileDrawerOpen, setCompileDrawerOpen] = useState<boolean>(false);
  const [compileCarrier, setCompileCarrier] = useState<string>('');
  const [compileStationCode, setCompileStationCode] = useState<string>('');

  const [stationDrawerOpen, setStationDrawerOpen] = useState<boolean>(false);
  const [editingStation, setEditingStation] = useState<CarrierStationItem | null>(null);
  const [savingStation, setSavingStation] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Station Form State
  const [stationCarrier, setStationCarrier] = useState<'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS'>('POSTEX');
  const [stationCode, setStationCode] = useState<string>('');
  const [stationName, setStationName] = useState<string>('');
  const [stationCity, setStationCity] = useState<string>('');
  const [managerEmail, setManagerEmail] = useState<string>('');
  const [managerWhatsAppPhone, setManagerWhatsAppPhone] = useState<string>('');

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await listManifests({ carrier: carrierFilter || undefined });
      setBatches(res.data.batches);
      setSummary(res.data.summary);
      setTotalBatches(res.data.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load manifest batches');
    } finally {
      setLoadingBatches(false);
    }
  }, [carrierFilter]);

  // Fetch pending parcels
  const fetchPendingParcels = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await listPendingManifestParcels();
      setPendingParcels(res.data.parcels);
      setTotalPending(res.data.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pending manifest parcels');
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Fetch carrier stations
  const fetchStations = useCallback(async () => {
    setLoadingStations(true);
    try {
      const res = await listCarrierStations();
      setStations(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load carrier stations');
    } finally {
      setLoadingStations(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchBatches();
    fetchPendingParcels();
    fetchStations();
  }, [fetchBatches, fetchPendingParcels, fetchStations]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle ESC key to dismiss slide-over drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (compileDrawerOpen) setCompileDrawerOpen(false);
        if (stationDrawerOpen) setStationDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compileDrawerOpen, stationDrawerOpen]);

  // Handle Download PDF/CSV
  const handleDownload = async (batchId: string, format: 'pdf' | 'csv', e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      toast.loading(`Downloading ${format.toUpperCase()}...`, { id: `dl-${batchId}` });
      await downloadManifestArtifact(batchId, format);
      toast.success(`${format.toUpperCase()} downloaded`, { id: `dl-${batchId}` });
    } catch (err: any) {
      toast.error(err.message || `Failed to download ${format.toUpperCase()}`, { id: `dl-${batchId}` });
    }
  };

  // Handle Manual Compilation
  const handleTriggerCompilation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompiling(true);
    try {
      const payload: { carrier?: string; stationCode?: string } = {};
      if (compileCarrier) payload.carrier = compileCarrier;
      if (compileStationCode.trim()) payload.stationCode = compileStationCode.trim().toUpperCase();

      const res = await triggerManifestCompilation(payload);
      toast.success(`Successfully compiled ${res.data.compiledCount} run-sheet batch(es)`);
      setCompileDrawerOpen(false);
      setCompileCarrier('');
      setCompileStationCode('');
      fetchBatches();
      fetchPendingParcels();
    } catch (err: any) {
      toast.error(err.message || 'Manifest compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  // Open Upsert Station Drawer
  const handleOpenStationDrawer = (st?: CarrierStationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (st) {
      setEditingStation(st);
      setStationCarrier(st.carrier);
      setStationCode(st.stationCode);
      setStationName(st.stationName);
      setStationCity(st.city || '');
      setManagerEmail(st.managerEmail || '');
      setManagerWhatsAppPhone(st.managerWhatsAppPhone || '');
    } else {
      setEditingStation(null);
      setStationCarrier('POSTEX');
      setStationCode('');
      setStationName('');
      setStationCity('');
      setManagerEmail('');
      setManagerWhatsAppPhone('');
    }
    setStationDrawerOpen(true);
  };

  // Save Station Contact
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationCode.trim() || !stationName.trim()) {
      toast.error('Station Code and Station Name are required');
      return;
    }

    setSavingStation(true);
    try {
      await upsertCarrierStation({
        carrier: stationCarrier,
        stationCode: stationCode.trim().toUpperCase(),
        stationName: stationName.trim(),
        city: stationCity.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        managerWhatsAppPhone: managerWhatsAppPhone.trim() || undefined,
        isActive: true,
      });
      toast.success('Station contact saved successfully');
      setStationDrawerOpen(false);
      fetchStations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save station contact');
    } finally {
      setSavingStation(false);
    }
  };

  // Delete Station
  const handleDeleteStation = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this carrier station contact?')) return;
    try {
      await deleteCarrierStation(id);
      toast.success('Station contact removed');
      fetchStations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete station contact');
    }
  };

  // Copy Escalation Link
  const handleCopyLink = (link: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    toast.success('WhatsApp escalation link copied to clipboard');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Accordion Toggle Handlers
  const toggleBatchExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePendingExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStationExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedStationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (carrierFilter && b.carrier !== carrierFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const date = (b.dateKey || '').toLowerCase();
      const station = (b.stationCode || '').toLowerCase();
      const carrier = (b.carrier || '').toLowerCase();
      const email = (b.recipientEmail || '').toLowerCase();
      const id = (b._id || '').toLowerCase();
      return (
        date.includes(q) ||
        station.includes(q) ||
        carrier.includes(q) ||
        email.includes(q) ||
        id.includes(q)
      );
    });
  }, [batches, statusFilter, carrierFilter, searchQuery]);

  // Filtered Pending Parcels
  const filteredPending = useMemo(() => {
    return pendingParcels.filter((p) => {
      if (carrierFilter && p.carrier !== carrierFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const track = (p.trackingNumber || '').toLowerCase();
      const station = (p.destinationStationCode || '').toLowerCase();
      const carrier = (p.carrier || '').toLowerCase();
      const phone = (p.customerPhonePlain || p.customerPhoneMasked || '').toLowerCase();
      return (
        track.includes(q) ||
        station.includes(q) ||
        carrier.includes(q) ||
        phone.includes(q)
      );
    });
  }, [pendingParcels, carrierFilter, searchQuery]);

  // Filtered Stations
  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (carrierFilter && s.carrier !== carrierFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const code = (s.stationCode || '').toLowerCase();
      const name = (s.stationName || '').toLowerCase();
      const city = (s.city || '').toLowerCase();
      const carrier = (s.carrier || '').toLowerCase();
      const email = (s.managerEmail || '').toLowerCase();
      const phone = (s.managerWhatsAppPhone || '').toLowerCase();
      return (
        code.includes(q) ||
        name.includes(q) ||
        city.includes(q) ||
        carrier.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [stations, carrierFilter, searchQuery]);

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* ============================================================ */}
      {/* 1. TOP PIPELINE TELEMETRY & OPERATIONS COMMAND BAR           */}
      {/* ============================================================ */}
      <div className="border border-border bg-white dark:bg-black p-2.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Header Action Controls */}
          <div className="flex items-center justify-between lg:justify-start gap-2 shrink-0">
            <button
              onClick={() => setCompileDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
              title="Compile Station Run-Sheets Now"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Compile Run Sheet</span>
            </button>

            {/* Mobile Action Controls (< lg) */}
            <div className="flex items-center gap-1.5 lg:hidden">
              {activeSubView === 'stations' && (
                <button
                  onClick={() => handleOpenStationDrawer()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
                  title="Add Courier Station Contact"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Station</span>
                </button>
              )}
              <button
                onClick={refreshAll}
                disabled={loadingBatches || loadingPending || loadingStations}
                title="Refresh dispatch state"
                className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={cn(
                    'w-3.5 h-3.5',
                    loadingBatches || loadingPending || loadingStations ? 'animate-spin' : ''
                  )}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Telemetry Metrics (Static Badges) */}
          <div className="flex items-center gap-1 sm:gap-1.5 w-full lg:w-auto text-xs overflow-x-auto pb-0.5 scrollbar-none">
            {/* All Batches */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Total run-sheet batches"
            >
              <span>Batches:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {totalBatches}
              </span>
            </div>

            {/* Dispatched */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Dispatched batches"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500 hidden sm:inline shrink-0" />
              <span>Dispatched:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {summary.SENT}
              </span>
            </div>

            {/* Compiling */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Compiling batches"
            >
              <RefreshCw
                className={cn(
                  'w-3 h-3 text-amber-500 hidden sm:inline shrink-0',
                  summary.STARTED > 0 && 'animate-spin'
                )}
              />
              <span>Compiling:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {summary.STARTED}
              </span>
            </div>

            {/* Failed */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Failed batches"
            >
              <AlertTriangle className={cn('w-3 h-3 shrink-0', summary.FAILED > 0 ? 'text-rose-500' : 'opacity-60 hidden sm:inline')} />
              <span>Failed:</span>
              <span className={cn('font-mono text-[10px] sm:text-[11px] font-bold', summary.FAILED > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100')}>
                {summary.FAILED}
              </span>
            </div>

            {/* Parcels Sent */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Total parcels successfully dispatched in run-sheets"
            >
              <FileSpreadsheet className="w-3 h-3 text-purple-500 hidden sm:inline shrink-0" />
              <span>Parcels Sent:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {summary.totalParcelsSent}
              </span>
            </div>

            {/* Pending Run-Sheets */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Pending parcels awaiting run-sheet dispatch"
            >
              <Clock className="w-3 h-3 opacity-70 hidden sm:inline shrink-0" />
              <span>Pending:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {totalPending}
              </span>
            </div>

            {/* Stations Directory */}
            <div
              className="inline-flex items-center gap-1 px-2 py-1 border border-border bg-muted/20 text-muted-foreground text-[10px] sm:text-[11px] whitespace-nowrap shrink-0"
              title="Manage courier destination station contacts"
            >
              <Building2 className="w-3 h-3 opacity-70 hidden sm:inline shrink-0" />
              <span>Stations:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                {stations.length}
              </span>
            </div>
          </div>

          {/* Desktop Action Controls (>= lg) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {activeSubView === 'stations' && (
              <button
                onClick={() => handleOpenStationDrawer()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
                title="Add Courier Station Contact"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Station</span>
              </button>
            )}

            <button
              onClick={refreshAll}
              disabled={loadingBatches || loadingPending || loadingStations}
              title="Refresh dispatch state"
              className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5',
                  loadingBatches || loadingPending || loadingStations ? 'animate-spin' : ''
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUBVIEW NAVIGATION PILLS & UNIFIED SEARCH/FILTER TOOLBAR  */}
      {/* ============================================================ */}
      <div className="border border-border bg-white dark:bg-black p-2.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Subview Navigation Tabs (Compact to fit small screens) */}
          <div className="flex items-center gap-1 border-b sm:border-b-0 pb-1.5 sm:pb-0 border-border w-full sm:w-auto">
            <button
              onClick={() => setActiveSubView('batches')}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 border text-[11px] sm:text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap',
                activeSubView === 'batches'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                  : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>Archive</span>
              <span className="font-mono text-[10px] opacity-75">({totalBatches})</span>
            </button>

            <button
              onClick={() => setActiveSubView('pending')}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 border text-[11px] sm:text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap',
                activeSubView === 'pending'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                  : totalPending > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Pending</span>
              <span className="font-mono text-[10px] opacity-75">({totalPending})</span>
            </button>

            <button
              onClick={() => setActiveSubView('stations')}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 border text-[11px] sm:text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap',
                activeSubView === 'stations'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                  : 'bg-muted/40 hover:bg-muted border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="w-3 h-3 shrink-0" />
              <span>Stations</span>
              <span className="font-mono text-[10px] opacity-75">({stations.length})</span>
            </button>
          </div>
        </div>

        {/* Unified Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Live Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubView === 'batches'
                    ? 'Search date, station, email, carrier...'
                    : activeSubView === 'pending'
                    ? 'Search tracking, phone, station...'
                    : 'Search station code, name, city, email...'
                }
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

            {/* Carrier Filter Dropdown */}
            <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-2 py-1">
              <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
              >
                <option value="" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">ALL CARRIERS</option>
                <option value="POSTEX" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">POSTEX</option>
                <option value="TRAX" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">TRAX</option>
                <option value="LEOPARDS" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">LEOPARDS</option>
                <option value="TCS" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">TCS</option>
              </select>
            </div>

            {/* Status Filter Dropdown */}
            {activeSubView === 'batches' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
              >
                <option value="" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">ALL STATUSES</option>
                <option value="SENT" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">SENT / DISPATCHED</option>
                <option value="STARTED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">STARTED / COMPILING</option>
                <option value="FAILED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">FAILED</option>
              </select>
            )}

            {/* Reset Filters Button */}
            {(carrierFilter || statusFilter || searchQuery) && (
              <button
                onClick={() => {
                  setCarrierFilter('');
                  setStatusFilter('');
                  setSearchQuery('');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Showing Counter */}
          <div className="text-[11px] text-zinc-500 font-mono shrink-0">
            {activeSubView === 'batches' && `Showing ${filteredBatches.length} of ${batches.length} batches`}
            {activeSubView === 'pending' && `Showing ${filteredPending.length} of ${pendingParcels.length} parcels`}
            {activeSubView === 'stations' && `Showing ${filteredStations.length} of ${stations.length} stations`}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SUBVIEW 1: BATCHES ARCHIVE TABLE                          */}
      {/* ============================================================ */}
      {activeSubView === 'batches' && (
        <div
          role="region"
          tabIndex={0}
          aria-label="Batches Archive Table"
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-xs focus:outline-hidden"
        >
          <Table className="max-h-[600px]">
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                {/* 1. Date (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </TableHead>

                {/* 2. Carrier (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Carrier
                </TableHead>

                {/* 3. Status (Visible on sm+) */}
                <TableHead className="hidden sm:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Status
                </TableHead>

                {/* 4. Station Code (Visible on md+) */}
                <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Station
                </TableHead>

                {/* 5. Parcels Count (Visible on md+) */}
                <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">
                  Parcels
                </TableHead>

                {/* 6. Amount (Visible on lg+) */}
                <TableHead className="hidden lg:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">
                  Amount
                </TableHead>

                {/* 7. Recipient (Visible on xl+) */}
                <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Recipient
                </TableHead>

                {/* 8. Actions (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-zinc-800 dark:text-zinc-200 font-mono">
              {loadingBatches && batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    <span>Loading manifest run-sheets...</span>
                  </TableCell>
                </TableRow>
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="w-7 h-7 mx-auto mb-2 opacity-40 text-zinc-400" />
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">No manifest batches found</div>
                    <div className="text-[11px] mt-0.5">
                      Batches compile automatically daily at 07:30 PKT or via immediate trigger.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => {
                  const isExpanded = expandedBatchIds.has(batch._id);
                  const statusMeta = STATUS_CONFIG[batch.status] || STATUS_CONFIG.FAILED;

                  return (
                    <React.Fragment key={batch._id}>
                      <TableRow
                        onClick={() => toggleBatchExpand(batch._id)}
                        className={cn(
                          'cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 hover:bg-muted/40',
                          isExpanded && 'bg-muted/20'
                        )}
                      >
                        {/* 1. Date */}
                        <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {batch.dateKey}
                        </TableCell>

                        {/* 2. Carrier (Plain text, no background/border pill) */}
                        <TableCell className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                          {CARRIER_LABELS[batch.carrier] || batch.carrier}
                        </TableCell>

                        {/* 3. Status (Plain text, no background/border pill) */}
                        <TableCell className="hidden sm:table-cell py-2.5 px-3 whitespace-nowrap">
                          <span className={cn('text-[11px] uppercase', statusMeta.textClass)}>
                            {statusMeta.label}
                          </span>
                        </TableCell>

                        {/* 4. Station Code (hidden on mobile/small < md) */}
                        <TableCell className="hidden md:table-cell py-2.5 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-medium">
                          {batch.stationCode}
                        </TableCell>

                        {/* 5. Parcels Count (hidden on mobile/small < md) */}
                        <TableCell className="hidden md:table-cell py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {batch.parcelCount}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1">pkgs</span>
                        </TableCell>

                        {/* 6. Amount (hidden < lg) */}
                        <TableCell className="hidden lg:table-cell py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums whitespace-nowrap">
                          PKR {batch.totalCOD.toLocaleString()}
                        </TableCell>

                        {/* 7. Recipient (hidden < xl) */}
                        <TableCell className="hidden xl:table-cell py-2.5 px-3 text-[11px] text-muted-foreground max-w-[200px] truncate whitespace-nowrap">
                          {batch.recipientEmail || 'Default Station Inbox'}
                        </TableCell>

                        {/* 8. Actions */}
                        <TableCell className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handleDownload(batch._id, 'pdf', e)}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Download PDF Run-Sheet"
                            >
                              <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>PDF</span>
                            </button>

                            <button
                              onClick={(e) => handleDownload(batch._id, 'csv', e)}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Download RFC-4180 CSV"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>CSV</span>
                            </button>

                            <button
                              onClick={(e) => toggleBatchExpand(batch._id, e)}
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
                              {/* Left Column: Overview */}
                              <div className="space-y-1.5 p-3 border border-border bg-white dark:bg-zinc-950">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">
                                  Overview
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Batch ID:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-[11px] truncate max-w-[180px]">
                                    {batch._id}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Carrier:</span>
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {CARRIER_LABELS[batch.carrier] || batch.carrier}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Station Code:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {batch.stationCode}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className={cn('text-[11px] uppercase font-bold', statusMeta.textClass)}>
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Parcels Included:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {batch.parcelCount}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-bold text-amber-500 dark:text-amber-400">
                                    PKR {batch.totalCOD.toLocaleString()}
                                  </span>
                                </div>
                                {batch.error && (
                                  <div className="pt-2 border-t border-border text-rose-600 dark:text-rose-400 text-[11px]">
                                    <span className="font-bold">Error:</span> {batch.error}
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Download */}
                              <div className="space-y-2 p-3 border border-border bg-white dark:bg-zinc-950 flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-2">
                                    Download
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      onClick={(e) => handleDownload(batch._id, 'pdf', e)}
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span>PDF</span>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">.pdf</span>
                                    </button>

                                    <button
                                      onClick={(e) => handleDownload(batch._id, 'csv', e)}
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>CSV</span>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">.csv</span>
                                    </button>

                                    {batch.driveUrl && (
                                      <a
                                        href={batch.driveUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                                      >
                                        <span className="flex items-center gap-1.5">
                                          <ExternalLink className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                          <span>Google Drive Archive</span>
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">↗</span>
                                      </a>
                                    )}
                                  </div>
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
      )}

      {/* ============================================================ */}
      {/* 4. SUBVIEW 2: PENDING MANIFEST PARCELS TABLE                 */}
      {/* ============================================================ */}
      {activeSubView === 'pending' && (
        <div
          role="region"
          tabIndex={0}
          aria-label="Pending Manifests Table"
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

                {/* 3. Rescheduled Date (Visible on sm+) */}
                <TableHead className="hidden sm:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Rescheduled Date
                </TableHead>

                {/* 4. Destination Station (Visible on md+) */}
                <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Station
                </TableHead>

                {/* 5. Amount (Visible on md+) */}
                <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">
                  Amount
                </TableHead>

                {/* 6. Customer Phone (Visible on lg+) */}
                <TableHead className="hidden lg:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Phone
                </TableHead>

                {/* 7. Status (Visible on xl+) */}
                <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Status
                </TableHead>

                {/* 8. Action (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-zinc-800 dark:text-zinc-200 font-mono">
              {loadingPending && pendingParcels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    <span>Loading pending manifest parcels...</span>
                  </TableCell>
                </TableRow>
              ) : filteredPending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500 opacity-80" />
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">All Parcels Manifested</div>
                    <div className="text-[11px] mt-0.5">
                      No rescheduled shipments currently awaiting station run-sheet dispatch.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPending.map((parcel) => {
                  const isExpanded = expandedPendingIds.has(parcel._id);

                  return (
                    <React.Fragment key={parcel._id}>
                      <TableRow
                        onClick={() => togglePendingExpand(parcel._id)}
                        className={cn(
                          'cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 hover:bg-muted/40',
                          isExpanded && 'bg-muted/20'
                        )}
                      >
                        {/* 1. Tracking Num */}
                        <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {parcel.trackingNumber}
                        </TableCell>

                        {/* 2. Carrier (Plain text, no background/border pill) */}
                        <TableCell className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                          {CARRIER_LABELS[parcel.carrier] || parcel.carrier}
                        </TableCell>

                        {/* 3. Rescheduled Date (hidden on mobile < sm) */}
                        <TableCell className="hidden sm:table-cell py-2.5 px-3 whitespace-nowrap">
                          {parcel.rescheduledDate ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                              <Calendar className="w-3 h-3 text-cyan-500" />
                              <span>{parcel.rescheduledDate}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Next 07:30</span>
                          )}
                        </TableCell>

                        {/* 4. Station (hidden < md) */}
                        <TableCell className="hidden md:table-cell py-2.5 px-3 whitespace-nowrap font-medium text-zinc-700 dark:text-zinc-300">
                          {parcel.destinationStationCode || 'MAIN'}
                        </TableCell>

                        {/* 5. Amount (hidden < md) */}
                        <TableCell className="hidden md:table-cell py-2.5 px-3 text-right font-bold text-amber-500 dark:text-amber-400 tabular-nums whitespace-nowrap">
                          PKR {parcel.orderValueCOD?.toLocaleString() ?? 0}
                        </TableCell>

                        {/* 6. Customer Phone (hidden < lg) */}
                        <TableCell className="hidden lg:table-cell py-2.5 px-3 text-[11px] text-muted-foreground whitespace-nowrap font-mono">
                          {parcel.customerPhonePlain || parcel.customerPhoneMasked}
                        </TableCell>

                        {/* 7. Status (hidden < xl) (Plain text, no background/border pill) */}
                        <TableCell className="hidden xl:table-cell py-2.5 px-3 whitespace-nowrap font-bold text-[11px] uppercase text-amber-600 dark:text-amber-400">
                          {parcel.status}
                        </TableCell>

                        {/* 8. Action (Always visible on mobile & desktop) */}
                        <TableCell className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={parcel.escalationLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 text-[10px] font-bold uppercase border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors inline-flex items-center gap-1"
                              title="WhatsApp Station Manager (wa.me)"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>wa.me</span>
                            </a>

                            <button
                              onClick={(e) => handleCopyLink(parcel.escalationLink, parcel._id, e)}
                              className="p-1 border border-border bg-muted/40 hover:bg-muted text-zinc-600 dark:text-zinc-300 cursor-pointer"
                              title="Copy WhatsApp deep-link"
                            >
                              {copiedLink === parcel._id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => togglePendingExpand(parcel._id, e)}
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

                      {/* Accordion Expanded Detail Row for Pending Parcel */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 border-b border-zinc-200 dark:border-zinc-800">
                          <TableCell colSpan={8} className="p-3 sm:p-4 font-mono text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Left Column: Delivery & Hub Details */}
                              <div className="space-y-1.5 p-3 border border-border bg-white dark:bg-zinc-950">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">
                                  Parcel Details
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tracking Number:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    {parcel.trackingNumber}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Carrier:</span>
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {CARRIER_LABELS[parcel.carrier] || parcel.carrier}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Destination Hub:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {parcel.destinationStationCode || 'MAIN'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Rescheduled Date:</span>
                                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                    {parcel.rescheduledDate || 'Next 07:30 PKT Dispatch'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-bold text-amber-500 dark:text-amber-400">
                                    PKR {parcel.orderValueCOD?.toLocaleString() ?? 0}
                                  </span>
                                </div>
                              </div>

                              {/* Center Column: Customer & Location */}
                              <div className="space-y-1.5 p-3 border border-border bg-white dark:bg-zinc-950">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">
                                  Customer & Geolocation
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Customer Phone:</span>
                                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                                    {parcel.customerPhonePlain || parcel.customerPhoneMasked}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">GPS Location:</span>
                                  {parcel.customerCoordinates ? (
                                    <a
                                      href={`https://maps.google.com/?q=${parcel.customerCoordinates.lat},${parcel.customerCoordinates.lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-mono text-[11px]"
                                    >
                                      <MapPin className="w-3 h-3 text-rose-500" />
                                      <span>
                                        {parcel.customerCoordinates.lat.toFixed(4)}, {parcel.customerCoordinates.lng.toFixed(4)}
                                      </span>
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">No GPS Coordinates</span>
                                  )}
                                </div>
                                {parcel.stationContact && (
                                  <div className="pt-2 border-t border-border space-y-1">
                                    <div className="text-[10px] text-muted-foreground font-bold">
                                      Station Manager Contact:
                                    </div>
                                    <div className="text-zinc-800 dark:text-zinc-200 text-[11px]">
                                      {parcel.stationContact.managerWhatsAppPhone || parcel.stationContact.managerEmail || 'Unassigned'}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Tier 3 Escalation wa.me Action */}
                              <div className="space-y-2 p-3 border border-border bg-white dark:bg-zinc-950 flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-2">
                                    Tier 3 Station Manager Escalation
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mb-3">
                                    Deep-link directly to the courier station manager on WhatsApp with pre-filled reschedule instructions.
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={parcel.escalationLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex-1 py-1.5 px-3 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 hover:opacity-85 transition-opacity"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                      <span>Open WhatsApp (wa.me)</span>
                                    </a>
                                    <button
                                      onClick={(e) => handleCopyLink(parcel.escalationLink, parcel._id, e)}
                                      className="p-1.5 border border-border bg-muted/40 hover:bg-muted text-zinc-600 dark:text-zinc-300 cursor-pointer"
                                      title="Copy deep-link"
                                    >
                                      {copiedLink === parcel._id ? (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border">
                                  Scheduled for automated compilation at 07:30 PKT
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
      )}

      {/* ============================================================ */}
      {/* 5. SUBVIEW 3: COURIER STATION DIRECTORY TABLE                */}
      {/* ============================================================ */}
      {activeSubView === 'stations' && (
        <div
          role="region"
          tabIndex={0}
          aria-label="Station Directory Table"
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-xs focus:outline-hidden"
        >
          <Table className="max-h-[600px]">
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                {/* 1. Carrier (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Carrier
                </TableHead>

                {/* 2. Station Code (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Station Code
                </TableHead>

                {/* 3. City (Visible on sm+) */}
                <TableHead className="hidden sm:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  City
                </TableHead>

                {/* 4. Station Name (Visible on md+) */}
                <TableHead className="hidden md:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Station Name
                </TableHead>

                {/* 5. Manager WhatsApp (Visible on lg+) */}
                <TableHead className="hidden lg:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Manager WhatsApp
                </TableHead>

                {/* 6. Manager Email (Visible on xl+) */}
                <TableHead className="hidden xl:table-cell py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Manager Email
                </TableHead>

                {/* 7. Actions (Always visible on mobile & desktop) */}
                <TableHead className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-zinc-800 dark:text-zinc-200 font-mono">
              {loadingStations && stations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    <span>Loading station directory...</span>
                  </TableCell>
                </TableRow>
              ) : filteredStations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Building2 className="w-7 h-7 mx-auto mb-2 opacity-40 text-zinc-400" />
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">No carrier stations configured</div>
                    <div className="text-[11px] mt-0.5">
                      Add courier hub codes and manager emails/WhatsApp to automate daily run-sheet routing.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStations.map((st) => {
                  const isExpanded = expandedStationIds.has(st._id);

                  return (
                    <React.Fragment key={st._id}>
                      <TableRow
                        onClick={() => toggleStationExpand(st._id)}
                        className={cn(
                          'cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 hover:bg-muted/40',
                          isExpanded && 'bg-muted/20'
                        )}
                      >
                        {/* 1. Carrier (Plain text, no background/border pill) */}
                        <TableCell className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                          {CARRIER_LABELS[st.carrier] || st.carrier}
                        </TableCell>

                        {/* 2. Station Code */}
                        <TableCell className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {st.stationCode}
                        </TableCell>

                        {/* 3. City (hidden on mobile < sm) */}
                        <TableCell className="hidden sm:table-cell py-2.5 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-medium">
                          {st.city || '—'}
                        </TableCell>

                        {/* 4. Station Name (hidden < md) */}
                        <TableCell className="hidden md:table-cell py-2.5 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                          {st.stationName}
                        </TableCell>

                        {/* 5. Manager WhatsApp (hidden < lg) */}
                        <TableCell className="hidden lg:table-cell py-2.5 px-3 whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-mono">
                          {st.managerWhatsAppPhone || '—'}
                        </TableCell>

                        {/* 6. Manager Email (hidden < xl) */}
                        <TableCell className="hidden xl:table-cell py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {st.managerEmail || '—'}
                        </TableCell>

                        {/* 7. Actions (Always visible on mobile & desktop) */}
                        <TableCell className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => handleOpenStationDrawer(st, e)}
                              className="p-1 border border-border bg-muted/40 hover:bg-muted text-zinc-600 dark:text-zinc-300 cursor-pointer"
                              title="Edit Station"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteStation(st._id, e)}
                              className="p-1 border border-rose-300 dark:border-rose-900 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Delete Station"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => toggleStationExpand(st._id, e)}
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

                      {/* Accordion Expanded Detail Row for Station */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 border-b border-zinc-200 dark:border-zinc-800">
                          <TableCell colSpan={7} className="p-3 sm:p-4 font-mono text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Station Info */}
                              <div className="space-y-1.5 p-3 border border-border bg-white dark:bg-zinc-950">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">
                                  Station Information
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Carrier:</span>
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {CARRIER_LABELS[st.carrier] || st.carrier}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Station Code:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{st.stationCode}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Station Name:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{st.stationName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">City:</span>
                                  <span className="text-zinc-800 dark:text-zinc-200">{st.city || 'Unspecified'}</span>
                                </div>
                              </div>

                              {/* Station Manager Contact & Quick Actions */}
                              <div className="space-y-2 p-3 border border-border bg-white dark:bg-zinc-950 flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-2">
                                    Manager Escalation Route
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                      <span className="text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                                        {st.managerEmail || 'No Email Registered'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                                        {st.managerWhatsAppPhone || 'No WhatsApp Registered'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                                  <button
                                    onClick={(e) => handleOpenStationDrawer(st, e)}
                                    className="px-3 py-1 border border-border bg-muted/60 hover:bg-muted text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit Contact</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteStation(st._id, e)}
                                    className="px-3 py-1 border border-rose-300 dark:border-rose-900 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
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
      )}

      {/* ============================================================ */}
      {/* 6. SLIDE-OVER RIGHT DRAWER: COMPILE RUN-SHEETS NOW           */}
      {/* ============================================================ */}
      {compileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setCompileDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Compile Station Run-Sheets"
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Compile Station Run-Sheets
                </span>
                <span className="text-[10px] text-zinc-500 bg-muted px-2 py-0.5 border border-border">
                  IMMEDIATE
                </span>
              </div>
              <button
                onClick={() => setCompileDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleTriggerCompilation} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Trigger an immediate compilation pass across all shipments flagged with{' '}
                  <code className="text-zinc-900 dark:text-zinc-100 font-bold">needsStationManifest: true</code>.
                  Compiled PDF 1.4 run-sheets and RFC-4180 formula-sanitized CSVs will be dispatched to station contacts.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    Carrier Filter (Optional)
                  </label>
                  <select
                    value={compileCarrier}
                    onChange={(e) => setCompileCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 dark:[color-scheme:dark]"
                  >
                    <option value="">All Carriers (Aggregate All Pending)</option>
                    <option value="POSTEX">POSTEX Only</option>
                    <option value="TRAX">TRAX Only</option>
                    <option value="LEOPARDS">LEOPARDS Only</option>
                    <option value="TCS">TCS Only</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    Destination Station Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={compileStationCode}
                    onChange={(e) => setCompileStationCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KHI-01, LHE-MAIN, ISB"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 uppercase"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Leave blank to compile all destination stations concurrently.
                  </span>
                </div>

                <div className="p-3 border border-border bg-muted/20 space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Automated BullMQ Worker</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    The scheduled queue automatically fires daily at 07:30 PKT. Running an immediate compile will claim
                    pending parcels and dispatch today's station batch early.
                  </p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCompileDrawerOpen(false)}
                  className="px-4 py-2 border border-border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={compiling}
                  className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold hover:opacity-85 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className={cn('w-3.5 h-3.5', compiling && 'animate-spin')} />
                  <span>{compiling ? 'Compiling Run-Sheets...' : 'Compile Run-Sheets Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. SLIDE-OVER RIGHT DRAWER: ADD / EDIT STATION CONTACT       */}
      {/* ============================================================ */}
      {stationDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setStationDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingStation ? 'Edit Station Contact' : 'Add Station Contact'}
          >
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {editingStation ? 'Edit Station Contact' : 'Add Station Contact'}
                </span>
                <span className="text-[10px] text-zinc-500 bg-muted px-2 py-0.5 border border-border">
                  DIRECTORY
                </span>
              </div>
              <button
                onClick={() => setStationDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveStation} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Destination station contacts receive daily 07:30 PKT run-sheets and serve as the target for Tier 3
                  customer escalation routing on WhatsApp.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                      Carrier *
                    </label>
                    <select
                      value={stationCarrier}
                      onChange={(e) => setStationCarrier(e.target.value as any)}
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 dark:[color-scheme:dark]"
                    >
                      <option value="POSTEX">PostEx</option>
                      <option value="TRAX">Trax</option>
                      <option value="LEOPARDS">Leopards</option>
                      <option value="TCS">TCS</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                      Station Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={stationCode}
                      onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KHI-NORTH, LHE-02"
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    Station Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Karachi North Nazimabad Hub"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    value={stationCity}
                    onChange={(e) => setStationCity(e.target.value)}
                    placeholder="e.g. Karachi, Lahore, Rawalpindi"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    Manager Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="hub.manager@carrier.pk"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">
                    Manager WhatsApp Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={managerWhatsAppPhone}
                    onChange={(e) => setManagerWhatsAppPhone(e.target.value)}
                    placeholder="+923001234567 or 03001234567"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Used to generate direct WhatsApp escalation links (wa.me) for fast delivery resolution.
                  </span>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-border bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStationDrawerOpen(false)}
                  className="px-4 py-2 border border-border bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStation}
                  className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold hover:opacity-85 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className={cn('w-3.5 h-3.5', savingStation && 'animate-spin')} />
                  <span>{savingStation ? 'Saving Contact...' : 'Save Station Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManifestsTab;
