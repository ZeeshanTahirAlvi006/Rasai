// src/components/shipments/ManifestsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
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
import CarrierBadge from './CarrierBadge';

const STATUS_CONFIG: Record<
  ManifestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  SENT: {
    label: 'Dispatched',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  STARTED: {
    label: 'Compiling',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
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
  const [carrierFilter, setCarrierFilter] = useState<string>('');

  // Pending parcels state
  const [pendingParcels, setPendingParcels] = useState<PendingManifestParcelItem[]>([]);
  const [totalPending, setTotalPending] = useState<number>(0);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  // Carrier stations state
  const [stations, setStations] = useState<CarrierStationItem[]>([]);
  const [loadingStations, setLoadingStations] = useState<boolean>(false);

  // Modals & Action loading
  const [compiling, setCompiling] = useState<boolean>(false);
  const [stationModalOpen, setStationModalOpen] = useState<boolean>(false);
  const [editingStation, setEditingStation] = useState<CarrierStationItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // New Station Form State
  const [stationCarrier, setStationCarrier] = useState<'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS'>('POSTEX');
  const [stationCode, setStationCode] = useState<string>('');
  const [stationName, setStationName] = useState<string>('');
  const [stationCity, setStationCity] = useState<string>('');
  const [managerEmail, setManagerEmail] = useState<string>('');
  const [managerWhatsAppPhone, setManagerWhatsAppPhone] = useState<string>('');

  // Manual Compile Modal State
  const [compileModalOpen, setCompileModalOpen] = useState<boolean>(false);
  const [compileCarrier, setCompileCarrier] = useState<string>('');
  const [compileStationCode, setCompileStationCode] = useState<string>('');

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

  useEffect(() => {
    fetchBatches();
    fetchPendingParcels();
    fetchStations();
  }, [fetchBatches, fetchPendingParcels, fetchStations]);

  // Handle Download PDF/CSV
  const handleDownload = async (batchId: string, format: 'pdf' | 'csv') => {
    try {
      toast.loading(`Downloading ${format.toUpperCase()}...`, { id: `dl-${batchId}` });
      await downloadManifestArtifact(batchId, format);
      toast.success(`${format.toUpperCase()} downloaded`, { id: `dl-${batchId}` });
    } catch (err: any) {
      toast.error(err.message || `Failed to download ${format.toUpperCase()}`, { id: `dl-${batchId}` });
    }
  };

  // Handle Manual Compilation
  const handleTriggerCompilation = async () => {
    setCompiling(true);
    try {
      const payload: { carrier?: string; stationCode?: string } = {};
      if (compileCarrier) payload.carrier = compileCarrier;
      if (compileStationCode.trim()) payload.stationCode = compileStationCode.trim().toUpperCase();

      const res = await triggerManifestCompilation(payload);
      toast.success(`Successfully compiled ${res.data.compiledCount} run-sheet batch(es)`);
      setCompileModalOpen(false);
      fetchBatches();
      fetchPendingParcels();
    } catch (err: any) {
      toast.error(err.message || 'Manifest compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  // Open Upsert Station Modal
  const handleOpenStationModal = (st?: CarrierStationItem) => {
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
    setStationModalOpen(true);
  };

  // Save Station
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationCode.trim() || !stationName.trim()) {
      toast.error('Station Code and Station Name are required');
      return;
    }

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
      setStationModalOpen(false);
      fetchStations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save station contact');
    }
  };

  // Delete Station
  const handleDeleteStation = async (id: string) => {
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
  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    toast.success('WhatsApp escalation link copied to clipboard');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Page Header Bar */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Dispatch
            </h1>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 border border-purple-500/30 font-bold">
              07:30 PKT RUN-SHEETS
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            07:30 PKT automated station run-sheet dispatch, pending manifests, and batch archive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBatches}
            disabled={loadingBatches}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches ? 'animate-spin text-purple-400' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Section 1: Schedule */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Schedule
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-indigo-400 text-xs mb-1">
            <span>07:30 PKT SCHEDULE</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-white">Daily Run</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Automated BullMQ</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-1">
            <span>BATCHES TODAY</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">{totalBatches}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Station Run-Sheets</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>DISPATCHED</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">{summary.SENT}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">PDF + CSV Emailed</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-purple-400 text-xs mb-1">
            <span>PARCELS SENT</span>
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">{summary.totalParcelsSent}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Dispatched to Couriers</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>PENDING RUN-SHEET</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">{totalPending}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Needs Station Run-Sheet</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>STATIONS</span>
            <Building2 className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{stations.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Directory Contacts</div>
        </div>
      </div>
      </div>

      {/* Subtab Navigation Pill Bar */}
      <div className="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('pending')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all border ${
              activeSubView === 'pending'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending</span>
            {totalPending > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubView('batches')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all border ${
              activeSubView === 'batches'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Archive</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-black/40">
              {totalBatches}
            </span>
          </button>

          <button
            onClick={() => setActiveSubView('stations')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all border ${
              activeSubView === 'stations'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Station Directory</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-black/40">
              {stations.length}
            </span>
          </button>
        </div>

        {/* Action Button for Current Subview */}
        <div className="flex items-center gap-2">
          {activeSubView === 'batches' && (
            <button
              onClick={() => setCompileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Compile Run-Sheets Now</span>
            </button>
          )}

          {activeSubView === 'stations' && (
            <button
              onClick={() => handleOpenStationModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Station Contact</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchBatches();
              fetchPendingParcels();
              fetchStations();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
            title="Refresh All Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingBatches || loadingPending || loadingStations ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* VIEW 1: 07:30 PKT Run-Sheet Batches */}
      {activeSubView === 'batches' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium">Filter by Carrier:</span>
              <div className="flex gap-1.5">
                {['', 'POSTEX', 'TRAX', 'LEOPARDS', 'TCS'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCarrierFilter(c)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                      carrierFilter === c
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {c || 'All Carriers'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Pure PDF 1.4 + RFC-4180 Formula-Sanitized CSV Artifacts
            </div>
          </div>

          {/* Batches Table */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Date & Carrier</th>
                    <th className="py-3 px-4">Station Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Parcels</th>
                    <th className="py-3 px-4">Total COD</th>
                    <th className="py-3 px-4">Dispatched To</th>
                    <th className="py-3 px-4 text-right">Artifacts & Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {loadingBatches ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Loading manifest run-sheets...</span>
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <div className="text-sm font-medium text-slate-400">No manifest batches found</div>
                        <div className="text-xs mt-1 text-slate-600">
                          Batches are compiled daily at 07:30 PKT or via manual trigger.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => {
                      const statusMeta = STATUS_CONFIG[batch.status] || STATUS_CONFIG.FAILED;

                      return (
                        <tr key={batch._id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-bold text-white font-mono">{batch.dateKey}</div>
                            <div className="mt-1">
                              <CarrierBadge carrier={batch.carrier} />
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-cyan-300 font-bold">
                              {batch.stationCode}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-white font-bold">{batch.parcelCount}</span>
                            <span className="text-slate-500 text-[11px] ml-1">pkgs</span>
                          </td>

                          <td className="py-3.5 px-4 text-emerald-400 font-bold">
                            Rs. {batch.totalCOD.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-[11px] font-sans">
                            {batch.recipientEmail ? (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Mail className="w-3 h-3 text-cyan-400" />
                                <span>{batch.recipientEmail}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Default Station Inbox</span>
                            )}
                            {batch.sentAt && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Sent {new Date(batch.sentAt).toLocaleTimeString()}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownload(batch._id, 'pdf')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
                                title="Download Pure PDF 1.4 Run-Sheet"
                              >
                                <FileText className="w-3 h-3" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleDownload(batch._id, 'csv')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
                                title="Download RFC-4180 Formula-Sanitized CSV"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>CSV</span>
                              </button>

                              {batch.driveUrl && (
                                <a
                                  href={batch.driveUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                  title="View on Google Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
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
        </div>
      )}

      {/* VIEW 2: Pending Parcels Queue & Tier 3 Escalation */}
      {activeSubView === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Pending Manifest Parcels Queue ({totalPending})</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Shipments with confirmed reschedule requests awaiting tomorrow's 07:30 PKT run-sheet dispatch.
              </p>
            </div>

            <div className="text-[11px] text-amber-400/90 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
              Tier 3 Station Manager WhatsApp Escalations Enabled
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingPending ? (
              <div className="col-span-2 py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <span>Loading pending manifest parcels...</span>
              </div>
            ) : pendingParcels.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-500 rounded-2xl bg-slate-900/50 border border-white/5">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                <div className="text-sm font-medium text-slate-300">All Parcels Manifested</div>
                <div className="text-xs mt-1 text-slate-500">
                  No shipments currently waiting for station run-sheet dispatch.
                </div>
              </div>
            ) : (
              pendingParcels.map((parcel) => (
                <div
                  key={parcel._id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CarrierBadge carrier={parcel.carrier} />
                        <span className="font-mono font-bold text-white text-xs">{parcel.trackingNumber}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>Station:</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/40 text-cyan-300 font-bold border border-white/5">
                          {parcel.destinationStationCode || 'MAIN'}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">Rs. {parcel.orderValueCOD.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {parcel.status}
                      </span>
                      {parcel.rescheduledDate && (
                        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-cyan-300 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>{parcel.rescheduledDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer & Location Details */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-mono">{parcel.customerPhonePlain || parcel.customerPhoneMasked}</span>
                      </div>
                      {parcel.customerCoordinates ? (
                        <a
                          href={`https://maps.google.com/?q=${parcel.customerCoordinates.lat},${parcel.customerCoordinates.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                        >
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>
                            {parcel.customerCoordinates.lat.toFixed(4)}, {parcel.customerCoordinates.lng.toFixed(4)}
                          </span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500">No GPS Pin</span>
                      )}
                    </div>

                    {parcel.stationContact && (
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Courier Contact:</span>
                        <span className="text-slate-300 font-mono">
                          {parcel.stationContact.managerWhatsAppPhone || parcel.stationContact.managerEmail || 'Unassigned'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tier 3 Escalation Action Bar */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <a
                      href={parcel.escalationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>WhatsApp Station Manager (wa.me)</span>
                    </a>

                    <button
                      onClick={() => handleCopyLink(parcel.escalationLink, parcel._id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                      title="Copy Escalation Deep-Link"
                    >
                      {copiedLink === parcel._id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Courier Station Directory */}
      {activeSubView === 'stations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Courier Station Directory ({stations.length})</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Manage destination courier station contact info for direct daily run-sheets and Tier 3 WhatsApp escalation routing.
              </p>
            </div>

            <button
              onClick={() => handleOpenStationModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Station Contact</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Carrier</th>
                    <th className="py-3 px-4">Station Code</th>
                    <th className="py-3 px-4">Station Name</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Manager Email</th>
                    <th className="py-3 px-4">Manager WhatsApp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {loadingStations ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Loading station directory...</span>
                      </td>
                    </tr>
                  ) : stations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <div className="text-sm font-medium text-slate-400">No carrier stations configured</div>
                        <div className="text-xs mt-1 text-slate-600">
                          Add station manager emails and WhatsApp numbers to enable automated run-sheets.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stations.map((st) => (
                      <tr key={st._id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <CarrierBadge carrier={st.carrier} />
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-cyan-300 font-bold">
                            {st.stationCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-sans font-medium">{st.stationName}</td>
                        <td className="py-3 px-4 text-slate-400 font-sans">{st.city || '—'}</td>
                        <td className="py-3 px-4 text-slate-300">{st.managerEmail || '—'}</td>
                        <td className="py-3 px-4 text-emerald-400">{st.managerWhatsAppPhone || '—'}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenStationModal(st)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                              title="Edit Station"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStation(st._id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                              title="Delete Station"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compile Run-Sheets Now Modal */}
      {compileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Compile Station Run-Sheets</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execute immediate compilation of all parcels flagged with needsStationManifest: true.
                </p>
              </div>
              <button
                onClick={() => setCompileModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Carrier Filter (Optional)</label>
                <select
                  value={compileCarrier}
                  onChange={(e) => setCompileCarrier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Carriers</option>
                  <option value="POSTEX">POSTEX</option>
                  <option value="TRAX">TRAX</option>
                  <option value="LEOPARDS">LEOPARDS</option>
                  <option value="TCS">TCS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Station Code (Optional)</label>
                <input
                  type="text"
                  value={compileStationCode}
                  onChange={(e) => setCompileStationCode(e.target.value)}
                  placeholder="Leave empty for all destination stations"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCompileModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerCompilation}
                disabled={compiling}
                className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <Zap className={`w-3.5 h-3.5 ${compiling ? 'animate-spin' : ''}`} />
                <span>{compiling ? 'Compiling Run-Sheets...' : 'Compile & Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Station Modal */}
      {stationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleSaveStation}
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>{editingStation ? 'Edit Carrier Station' : 'Add Carrier Station'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Station contact for automated PDF/CSV run-sheets and WhatsApp escalations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStationModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Carrier *</label>
                <select
                  value={stationCarrier}
                  onChange={(e) => setStationCarrier(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="POSTEX">POSTEX</option>
                  <option value="TRAX">TRAX</option>
                  <option value="LEOPARDS">LEOPARDS</option>
                  <option value="TCS">TCS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Station Code *</label>
                <input
                  type="text"
                  required
                  value={stationCode}
                  onChange={(e) => setStationCode(e.target.value)}
                  placeholder="e.g. KHI-01 or ISB-CENTRAL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Station Name *</label>
                <input
                  type="text"
                  required
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="e.g. Karachi Clifton Hub"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">City</label>
                <input
                  type="text"
                  value={stationCity}
                  onChange={(e) => setStationCity(e.target.value)}
                  placeholder="e.g. Karachi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Manager Email</label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="hubmanager@carrier.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Manager WhatsApp Phone</label>
                <input
                  type="text"
                  value={managerWhatsAppPhone}
                  onChange={(e) => setManagerWhatsAppPhone(e.target.value)}
                  placeholder="+923001234567 or 03001234567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md"
              >
                Save Station Contact
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManifestsTab;
