// src/components/shipments/DisputesTab.tsx
// CPR Margin Defense Station: Financial KPIs, 5-Signal Breakdown, Browser-Printable Dossiers, and CDR Ingestion

import React, { useState, useEffect } from 'react';
import { disputeApi } from '../../api/disputeApi';
import type {
  ICprDispute,
  DisputeKpiSummary,
  CprBand,
  CprDisputeStatus,
} from '../../types/dispute';

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

  // Modals
  const [activeDossier, setActiveDossier] = useState<ICprDispute | null>(null);
  const [cdrModalOpen, setCdrModalOpen] = useState<boolean>(false);
  const [cdrInput, setCdrInput] = useState<string>('');
  const [cdrLoading, setCdrLoading] = useState<boolean>(false);
  const [cdrResult, setCdrResult] = useState<string | null>(null);

  // Action Modals
  const [settleModalDispute, setSettleModalDispute] = useState<ICprDispute | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [retractModalDispute, setRetractModalDispute] = useState<ICprDispute | null>(null);
  const [retractReason, setRetractReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [selectedStatus, selectedCarrier, selectedBand]);

  const fetchData = async () => {
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
      setError(err?.response?.data?.message || err.message || 'Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleViewDossier = async (disputeId: string) => {
    try {
      const res = await disputeApi.getDisputeById(disputeId);
      if (res.success) {
        setActiveDossier(res.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load dispute dossier');
    }
  };

  const handleSubmit = async (dispute: ICprDispute) => {
    if (dispute.disputeRetractionRequested) {
      alert('Cannot submit: Consignee delivery was confirmed and retraction is requested.');
      return;
    }
    if (!confirm(`Submit formal CPR dispute for tracking #${dispute.trackingNumber} to ${dispute.carrier}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await disputeApi.submitDispute(dispute._id);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!settleModalDispute) return;
    setActionLoading(true);
    try {
      await disputeApi.settleDispute(settleModalDispute._id, settleAmount);
      setSettleModalDispute(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetract = async () => {
    if (!retractModalDispute || !retractReason) return;
    setActionLoading(true);
    try {
      await disputeApi.retractDispute(retractModalDispute._id, retractReason);
      setRetractModalDispute(null);
      setRetractReason('');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to retract dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCdrUpload = async () => {
    if (!cdrInput.trim()) return;
    setCdrLoading(true);
    setCdrResult(null);
    try {
      const res = await disputeApi.uploadCdrLogs(cdrInput);
      if (res.success) {
        setCdrResult(`Successfully ingested ${res.data.ingestedCount} records and recalculated ${res.data.matchedDisputesCount} disputes!`);
        setCdrInput('');
        await fetchData();
      }
    } catch (err: any) {
      setCdrResult(`Upload failed: ${err?.response?.data?.message || err.message}`);
    } finally {
      setCdrLoading(false);
    }
  };

  const handleTriggerSweeper = async () => {
    try {
      const res = await disputeApi.triggerSweeper();
      if (res.success) {
        alert(`Sweeper completed! Warned: ${res.data.warnedCount}, Expired: ${res.data.expiredCount}`);
        await fetchData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to trigger sweeper');
    }
  };

  const getBandBadge = (band: CprBand, score: number) => {
    if (band === 'STRONG') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          STRONG ({score})
        </span>
      );
    }
    if (band === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          MEDIUM ({score})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        WEAK ({score})
      </span>
    );
  };

  const getStatusBadge = (status: CprDisputeStatus) => {
    const map: Record<CprDisputeStatus, { bg: string; text: string }> = {
      DRAFT: { bg: 'bg-zinc-800 text-zinc-300', text: 'DRAFT' },
      PENDING_REVIEW: { bg: 'bg-amber-900/30 text-amber-300', text: 'IN REVIEW' },
      SUBMITTED: { bg: 'bg-blue-900/30 text-blue-300', text: 'SUBMITTED' },
      SETTLED: { bg: 'bg-emerald-900/30 text-emerald-300', text: 'SETTLED' },
      REJECTED: { bg: 'bg-rose-900/30 text-rose-300', text: 'REJECTED' },
      RETRACTED: { bg: 'bg-purple-900/30 text-purple-300', text: 'RETRACTED' },
      EXPIRED: { bg: 'bg-zinc-900 text-zinc-500', text: 'EXPIRED' },
    };
    const s = map[status] || { bg: 'bg-zinc-800 text-zinc-400', text: status };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${s.bg}`}>
        {s.text}
      </span>
    );
  };

  const getRelativeCutoff = (cutoffStr: string) => {
    const diff = new Date(cutoffStr).getTime() - Date.now();
    if (diff <= 0) return <span className="text-rose-400 font-semibold text-xs">Expired</span>;
    const days = Math.floor(diff / (24 * 3600000));
    const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
    if (days === 0) {
      return <span className="text-amber-400 font-bold text-xs">⚠️ {hours}h left</span>;
    }
    return <span className="text-zinc-400 text-xs">{days}d {hours}h left</span>;
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Page Header Bar */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Disputes
            </h1>
            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 border border-rose-500/30 font-bold">
              CPR MARGIN DEFENSE
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            CPR fake delivery attempt detection, courier settlement cutoffs, and evidence dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCdrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>INGEST CDR CALL LOGS</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* 1. Summary */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Summary
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">At-Risk Disputed Value</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            PKR {(kpi?.totalDisputedAmount ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Unsettled active COD claims</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recovered Value</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            PKR {(kpi?.totalSettledAmount ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Total won settlements</div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Win Rate</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {kpi?.winRate ?? 0}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {kpi?.settledCount ?? 0} settled / {kpi?.totalDisputes ?? 0} total
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Strong Evidence</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {kpi?.bandCounts.strong ?? 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Score ≥ 80 (High Win Probability)
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Expiring in &lt;48h</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {kpi?.expiringIn48hCount ?? 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Urgent cutoff action needed</div>
        </div>
      </div>
      </div>

      {/* 2. Disputed Parcels */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Disputed Parcels
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-900/50 p-4 border border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'DRAFT', 'SUBMITTED', 'SETTLED', 'RETRACTED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Carrier Select */}
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Carriers</option>
            <option value="POSTEX">PostEx</option>
            <option value="TRAX">Trax</option>
            <option value="LEOPARDS">Leopards</option>
            <option value="TCS">TCS</option>
          </select>

          {/* CPR Band Select */}
          <select
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Bands</option>
            <option value="STRONG">Strong (≥80)</option>
            <option value="MEDIUM">Medium (50-79)</option>
            <option value="WEAK">Weak (&lt;50)</option>
          </select>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Search Tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-44"
            />
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              Find
            </button>
          </form>

          {/* Action Buttons */}
          <button
            onClick={() => setCdrModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
          >
            <span>📁</span> Upload CDR Logs
          </button>
          <button
            onClick={handleTriggerSweeper}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700"
            title="Scan cutoffs and update expired disputes"
          >
            <span>⏱️</span> Run Sweeper
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/80 text-rose-300 px-4 py-3 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* 3. DISPUTES DATA TABLE */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-800/60 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800">
                <th className="py-3 px-4">Tracking &amp; Courier</th>
                <th className="py-3 px-4">Claim COD</th>
                <th className="py-3 px-4">CPR Evidence Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Cutoff Countdown</th>
                <th className="py-3 px-4">Retraction Alert</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Loading CPR disputes...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No disputes found matching the selected filters.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d._id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-zinc-200">
                      <div>{d.trackingNumber}</div>
                      <span className="text-[10px] text-zinc-500 font-sans uppercase font-bold">{d.carrier}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300 font-semibold">
                      PKR {d.claimAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {getBandBadge(d.cprBand, d.cprScore)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="py-3 px-4">
                      {getRelativeCutoff(d.settlementCutoff)}
                    </td>
                    <td className="py-3 px-4">
                      {d.disputeRetractionRequested ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          ⚠️ Delivery Confirmed
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleViewDossier(d._id)}
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-semibold"
                      >
                        Dossier
                      </button>

                      {d.status === 'DRAFT' && (
                        <button
                          onClick={() => handleSubmit(d)}
                          disabled={actionLoading || d.disputeRetractionRequested}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-sm"
                        >
                          Submit
                        </button>
                      )}

                      {d.status === 'SUBMITTED' && (
                        <button
                          onClick={() => {
                            setSettleModalDispute(d);
                            setSettleAmount(d.claimAmount);
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-sm"
                        >
                          Settle
                        </button>
                      )}

                      {['DRAFT', 'SUBMITTED'].includes(d.status) && (
                        <button
                          onClick={() => {
                            setRetractModalDispute(d);
                            setRetractReason(d.disputeRetractionRequested ? 'Customer confirmed receipt' : '');
                          }}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-semibold"
                        >
                          Retract
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* 4. DOSSIER VIEW & BROWSER PRINT MODAL */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:max-w-none print:p-0">
            {/* Header controls (hidden when printing) */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wider">Evidence Dossier</h3>
                {getBandBadge(activeDossier.cprBand, activeDossier.cprScore)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  onClick={() => setActiveDossier(null)}
                  className="text-zinc-400 hover:text-zinc-200 text-lg px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Dossier Sheet */}
            <div className="mt-6 space-y-6 text-zinc-200 print:mt-0 print:text-black">
              {/* Document Header */}
              <div className="border-b border-zinc-700 pb-4">
                <div className="text-xs uppercase tracking-widest text-zinc-400 print:text-zinc-600">
                  NDR Middleware Margin Defense Control
                </div>
                <h1 className="text-2xl font-black text-white mt-1 print:text-black">
                  COURIER PERFORMANCE RATE (CPR) DISPUTE AUDIT DOSSIER
                </h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block">Tracking Number</span>
                    <span className="font-bold text-sm text-zinc-100 print:text-black">{activeDossier.trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Courier</span>
                    <span className="font-bold text-sm text-zinc-100 print:text-black">{activeDossier.carrier}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Claim Amount</span>
                    <span className="font-bold text-sm text-zinc-100 print:text-black">PKR {activeDossier.claimAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cutoff Deadline</span>
                    <span className="font-bold text-sm text-zinc-100 print:text-black">
                      {new Date(activeDossier.settlementCutoff).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* CPR 5-Signal Breakdown Cards */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 print:text-black mb-3">
                  5-Signal Audit Breakdown ({activeDossier.cprScore} / 100 Points)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {Object.entries(activeDossier.breakdown).map(([key, val]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border ${
                        val.passed
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 print:bg-emerald-50 print:border-emerald-300 print:text-black'
                          : 'bg-zinc-800/30 border-zinc-800 text-zinc-400 print:bg-zinc-50 print:border-zinc-300 print:text-black'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span>{val.points} / {val.maxPoints} pts</span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300 print:text-zinc-700">{val.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence: Ledger Scans */}
              {activeDossier.evidenceSnapshot?.ledgerEvents && activeDossier.evidenceSnapshot.ledgerEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 print:text-black mb-2">
                    Immutable Courier Ledger Scans (Timeline)
                  </h3>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-zinc-800/50 text-zinc-400">
                        <tr>
                          <th className="py-2 px-3">Scan Time</th>
                          <th className="py-2 px-3">Carrier Raw Status</th>
                          <th className="py-2 px-3">Engine Disposition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {activeDossier.evidenceSnapshot.ledgerEvents.map((ev, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 text-zinc-400">{new Date(ev.occurredAt).toLocaleString()}</td>
                            <td className="py-2 px-3 font-semibold text-zinc-200 print:text-black">{ev.rawStatus}</td>
                            <td className="py-2 px-3">{ev.disposition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Evidence: Consignee WhatsApp Evidence */}
              {activeDossier.evidenceSnapshot?.conversationSummary && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 print:text-black mb-2">
                    Verified Consignee WhatsApp Interaction
                  </h3>
                  <div className="bg-zinc-800/40 border border-zinc-800 p-3 rounded-lg text-xs space-y-1">
                    <div>
                      <span className="text-zinc-500">Session Outcome: </span>
                      <span className="font-semibold text-zinc-200 print:text-black">
                        {activeDossier.evidenceSnapshot.conversationSummary.state}
                      </span>
                    </div>
                    {activeDossier.evidenceSnapshot.conversationSummary.requestedRescheduleDate && (
                      <div>
                        <span className="text-zinc-500">Customer Requested Reschedule: </span>
                        <span className="font-semibold text-emerald-400 print:text-emerald-800">
                          {new Date(activeDossier.evidenceSnapshot.conversationSummary.requestedRescheduleDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {activeDossier.evidenceSnapshot.conversationSummary.location && (
                      <div>
                        <span className="text-zinc-500">Verified GPS Pin: </span>
                        <span className="font-mono text-blue-400">
                          {activeDossier.evidenceSnapshot.conversationSummary.location.lat},{' '}
                          {activeDossier.evidenceSnapshot.conversationSummary.location.lng}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evidence: Verified Call Logs */}
              {activeDossier.evidenceSnapshot?.callLogMatches && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 print:text-black mb-2">
                    Call Detail Records (CDR) Match
                  </h3>
                  {activeDossier.evidenceSnapshot.callLogMatches.length === 0 ? (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-xs text-rose-300 print:text-black">
                      ⚠️ Zero call records found in attempt window. Courier made no verified delivery call.
                    </div>
                  ) : (
                    <div className="border border-zinc-800 rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-zinc-800/50 text-zinc-400">
                          <tr>
                            <th className="py-2 px-3">Call Time</th>
                            <th className="py-2 px-3">Duration (sec)</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {activeDossier.evidenceSnapshot.callLogMatches.map((call, i) => (
                            <tr key={i}>
                              <td className="py-2 px-3 text-zinc-400">{new Date(call.callTimestamp).toLocaleString()}</td>
                              <td className="py-2 px-3">{call.durationSeconds}s</td>
                              <td className="py-2 px-3 font-semibold text-emerald-400">{call.callStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sign-off / Signature footer */}
              <div className="pt-6 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 print:pt-12 print:text-black">
                <div>Generated by NDR Middleware CPR Defense System</div>
                <div className="text-right">Authorized Merchant Operations Representative</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CDR CALL LOG UPLOAD MODAL */}
      {cdrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>📁</span> Upload CDR Call Logs
              </h3>
              <button onClick={() => setCdrModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Paste CSV call logs exported from your telephony PBX or courier call center. Required columns: <code className="text-blue-400">Phone</code>, <code className="text-blue-400">Time</code>, <code className="text-blue-400">Duration</code>, <code className="text-blue-400">Status</code>.
              </p>

              <textarea
                rows={8}
                value={cdrInput}
                onChange={(e) => setCdrInput(e.target.value)}
                placeholder="Rider,Phone,Time,Duration,Status&#10;03129999999,03001234567,2026-10-25 14:30:00,45,ANSWERED"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
              />

              {cdrResult && (
                <div className={`p-3 rounded-lg text-xs ${cdrResult.includes('failed') ? 'bg-rose-950/40 text-rose-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
                  {cdrResult}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCdrModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCdrUpload}
                  disabled={cdrLoading || !cdrInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  {cdrLoading ? 'Ingesting...' : 'Ingest & Recalculate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SETTLE MODAL */}
      {settleModalDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Record Courier Settlement</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Tracking #{settleModalDispute.trackingNumber} | Claimed: PKR {settleModalDispute.claimAmount.toLocaleString()}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Agreed Settlement Amount (PKR)</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSettleModalDispute(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettle}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                >
                  Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. RETRACT MODAL */}
      {retractModalDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Formally Retract Dispute</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Tracking #{retractModalDispute.trackingNumber}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Retraction Reason</label>
                <textarea
                  rows={3}
                  value={retractReason}
                  onChange={(e) => setRetractReason(e.target.value)}
                  placeholder="e.g. Consignee confirmed parcel delivered upon secondary audit..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRetractModalDispute(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRetract}
                  disabled={actionLoading || !retractReason.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                >
                  Confirm Retraction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputesTab;
