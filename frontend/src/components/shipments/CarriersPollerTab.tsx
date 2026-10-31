// src/components/shipments/CarriersPollerTab.tsx
// Comprehensive carrier control station: adaptive poller metrics, circuit breaker controls, encrypted credentials manager, and webhook simulator.
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  Clock,
  Radio,
  Key,
  Webhook,
  Play,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  Settings2,
  Server,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import carrierHealthApi from '../../api/carrierHealthApi';
import type {
  Carrier,
  CarrierHealthSummary,
  PollerStatusData,
  MerchantCarrierCredentialData,
} from '../../types/carrierHealth';

const CARRIERS: Carrier[] = ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'];

const CARRIER_LIMITS: Record<Carrier, { maxBatch: number; minIntervalMs: number }> = {
  POSTEX: { maxBatch: 10, minIntervalMs: 1000 },
  TRAX: { maxBatch: 20, minIntervalMs: 1000 },
  LEOPARDS: { maxBatch: 1, minIntervalMs: 2000 },
  TCS: { maxBatch: 20, minIntervalMs: 1000 },
};

export const CarriersPollerTab: React.FC = () => {
  // Navigation inside tab
  const [activeSection, setActiveSection] = useState<'breakers' | 'credentials' | 'simulator'>('breakers');

  // Poller & Health State
  const [summaries, setSummaries] = useState<CarrierHealthSummary[]>([]);
  const [pollerStatus, setPollerStatus] = useState<PollerStatusData | null>(null);
  const [credentials, setCredentials] = useState<MerchantCarrierCredentialData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sweep Form State
  const [forceSweep, setForceSweep] = useState<boolean>(false);

  // Credential Edit Modal / Form State
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiSecretInput, setApiSecretInput] = useState<string>('');
  const [accountNumberInput, setAccountNumberInput] = useState<string>('');
  const [webhookEnabledInput, setWebhookEnabledInput] = useState<boolean>(false);
  const [webhookSecretInput, setWebhookSecretInput] = useState<string>('');
  const [simulationModeInput, setSimulationModeInput] = useState<boolean>(false);

  // Webhook Simulator State
  const [simCarrier, setSimCarrier] = useState<Carrier>('POSTEX');
  const [simTrackingNumber, setSimTrackingNumber] = useState<string>('PEX-SIM-9901');
  const [simStatus, setSimStatus] = useState<string>('OUT_FOR_DELIVERY');
  const [simRemarks, setSimRemarks] = useState<string>('Rider out for delivery via courier bike');
  const [simResult, setSimResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, pollRes, credRes] = await Promise.allSettled([
        carrierHealthApi.getSummary(),
        carrierHealthApi.getPollerStatus(),
        carrierHealthApi.listCarrierCredentials(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data) {
        setSummaries(sumRes.value.data);
      }
      if (pollRes.status === 'fulfilled' && pollRes.value.data) {
        setPollerStatus(pollRes.value.data);
      }
      if (credRes.status === 'fulfilled' && credRes.value.data) {
        setCredentials(credRes.value.data);
      }
    } catch {
      toast.error('Failed to load carrier operational data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Actions
  const handleTriggerSweep = async (carrier?: Carrier) => {
    const key = carrier ? `sweep-${carrier}` : 'sweep-all';
    setActionLoading(key);
    try {
      const res = await carrierHealthApi.triggerPollerSweep({ carrier, force: forceSweep });
      toast.success(res.message || 'Polling sweep triggered');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger sweep');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetBreaker = async (carrier: Carrier) => {
    setActionLoading(`reset-${carrier}`);
    try {
      await carrierHealthApi.resetBreaker(carrier);
      toast.success(`Circuit breaker reset for ${carrier}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset breaker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTripBreaker = async (carrier: Carrier, type: '429' | '403') => {
    setActionLoading(`trip-${carrier}-${type}`);
    try {
      if (type === '429') {
        await carrierHealthApi.executeWithBreaker(carrier, { simulate429: true });
      } else {
        await carrierHealthApi.executeWithBreaker(carrier, { simulate403: true });
      }
    } catch (err: any) {
      toast.success(`Breaker tripped to OPEN via ${type} simulation`);
      await loadData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCanaryProbe = async (carrier: Carrier) => {
    setActionLoading(`probe-${carrier}`);
    try {
      const res = await carrierHealthApi.checkPermission(carrier);
      if (res.data?.allowed) {
        toast.success(`Canary permission acquired (state: ${res.data.state})`);
      } else {
        toast.error(`Permission denied: ${res.data?.reason || 'Circuit OPEN'}`);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Canary probe failed');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (c: Carrier) => {
    const cred = credentials.find((item) => item.carrier === c);
    setEditingCarrier(c);
    setApiKeyInput('');
    setApiSecretInput('');
    setAccountNumberInput(cred?.accountNumber || '');
    setWebhookEnabledInput(cred?.webhookEnabled ?? false);
    setWebhookSecretInput('');
    setSimulationModeInput(cred?.simulationMode ?? false);
  };

  const handleSaveCredential = async () => {
    if (!editingCarrier) return;
    setActionLoading('save-cred');
    try {
      await carrierHealthApi.upsertCarrierCredential({
        carrier: editingCarrier,
        apiKey: apiKeyInput || undefined,
        apiSecret: apiSecretInput || undefined,
        accountNumber: accountNumberInput || undefined,
        webhookEnabled: webhookEnabledInput,
        webhookSecret: webhookSecretInput || undefined,
        simulationMode: simulationModeInput,
      });
      toast.success(`Credentials updated for ${editingCarrier}`);
      setEditingCarrier(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save credentials');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCredential = async (c: Carrier) => {
    if (!confirm(`Remove configured credentials for ${c}?`)) return;
    setActionLoading(`del-cred-${c}`);
    try {
      await carrierHealthApi.deleteCarrierCredential(c);
      toast.success(`Credentials removed for ${c}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete credentials');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateWebhook = async () => {
    setActionLoading('sim-webhook');
    setSimResult(null);
    try {
      const res = await carrierHealthApi.simulateCarrierWebhook({
        carrier: simCarrier,
        trackingNumber: simTrackingNumber,
        rawStatus: simStatus,
        rawRemarks: simRemarks,
      });
      setSimResult(res.data);
      toast.success('Simulated webhook event processed');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Webhook simulation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getSummaryFor = (carrier: Carrier): CarrierHealthSummary => {
    return (
      summaries.find((s) => s.carrier === carrier) || {
        carrier,
        state: 'CLOSED',
        failureCount: 0,
        tripCount: 0,
        isHealthy: true,
        remainingBackoffMs: 0,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Operational Header ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Parcels Due */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Due For Poll</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {(pollerStatus?.tierStats?.OFD?.totalDue ?? 0) +
              (pollerStatus?.tierStats?.ACTIVE_NDR?.totalDue ?? 0) +
              (pollerStatus?.tierStats?.TRANSIT?.totalDue ?? 0)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-cyan-300 font-mono">OFD: {pollerStatus?.tierStats?.OFD?.totalDue ?? 0}</span>
            <span>•</span>
            <span className="text-amber-300 font-mono">NDR: {pollerStatus?.tierStats?.ACTIVE_NDR?.totalDue ?? 0}</span>
            <span>•</span>
            <span className="text-slate-300 font-mono">6h: {pollerStatus?.tierStats?.TRANSIT?.totalDue ?? 0}</span>
          </div>
        </div>

        {/* Degraded Tracking Health */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Degraded Parcels</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mb-2">
            {pollerStatus?.degradedShipmentsCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            Parcels awaiting carrier circuit breaker recovery
          </p>
        </div>

        {/* Breaker Grid Summary */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Breakers State</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {CARRIERS.map((c) => {
              const s = getSummaryFor(c);
              const isClosed = s.state === 'CLOSED';
              const isOpen = s.state === 'OPEN';
              return (
                <div
                  key={c}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-mono border ${
                    isClosed
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : isOpen
                      ? 'bg-red-500/10 text-red-300 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  <span>{c}</span>
                  <span className="font-bold">{s.state}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Poller Trigger */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-950/60 to-slate-900/90 border border-indigo-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Adaptive Sweep
            </span>
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={forceSweep}
                onChange={(e) => setForceSweep(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Force Poll (Ignore Jitter)</span>
            </label>
          </div>
          <button
            onClick={() => handleTriggerSweep()}
            disabled={Boolean(actionLoading)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${actionLoading === 'sweep-all' ? 'animate-spin' : ''}`} />
            <span>{actionLoading === 'sweep-all' ? 'Sweeping...' : 'Run Sweep Now'}</span>
          </button>
        </div>
      </div>

      {/* ── Sub-Navigation Segmented Bar ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
        <button
          onClick={() => setActiveSection('breakers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'breakers'
              ? 'bg-linear-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Adaptive Poller & Circuit Breakers</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/30">4 CARRIERS</span>
        </button>

        <button
          onClick={() => setActiveSection('credentials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'credentials'
              ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Key className="w-4 h-4 text-emerald-400" />
          <span>Carrier Credentials & Webhooks</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
            ENCRYPTED AES-GCM
          </span>
        </button>

        <button
          onClick={() => setActiveSection('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'simulator'
              ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Webhook className="w-4 h-4 text-purple-400" />
          <span>Webhook & Chaos Simulator</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
            QA SUITE
          </span>
        </button>

        <div className="ml-auto pr-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh Operational Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Section 1: Adaptive Poller & Circuit Breakers ── */}
      {activeSection === 'breakers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARRIERS.map((c) => {
            const summary = getSummaryFor(c);
            const limits = CARRIER_LIMITS[c];
            const isClosed = summary.state === 'CLOSED';
            const isOpen = summary.state === 'OPEN';
            const isHalfOpen = summary.state === 'HALF_OPEN';

            return (
              <div
                key={c}
                className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">{c}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Batch: {limits.maxBatch} CNs • Pace: {limits.minIntervalMs}ms
                      </p>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isClosed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isOpen
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isClosed ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{summary.state}</span>
                  </span>
                </div>

                {/* Circuit Metrics */}
                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Trip Count</div>
                    <div className="text-base font-mono font-bold text-white mt-0.5">
                      {summary.tripCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Failures</div>
                    <div className="text-base font-mono font-bold text-white mt-0.5">
                      {summary.failureCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Cooldown</div>
                    <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
                      {summary.remainingBackoffMs > 0
                        ? `${Math.ceil(summary.remainingBackoffMs / 1000)}s`
                        : '0s'}
                    </div>
                  </div>
                </div>

                {/* Last Error Note */}
                {summary.lastErrorCode && (
                  <div className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/20 text-[11px] text-red-300 font-mono">
                    Last Fault: {summary.lastErrorCode}
                  </div>
                )}

                {/* Interactive Controls */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTriggerSweep(c)}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    <span>Poll Carrier</span>
                  </button>

                  <button
                    onClick={() => handleCanaryProbe(c)}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/80 hover:bg-cyan-600 text-white transition-all disabled:opacity-50"
                  >
                    <Radio className="w-3 h-3" />
                    <span>Canary Probe</span>
                  </button>

                  <button
                    onClick={() => handleTripBreaker(c, '429')}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 transition-all disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 text-red-400" />
                    <span>Trip 429</span>
                  </button>

                  <button
                    onClick={() => handleResetBreaker(c)}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Breaker</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 2: Carrier Credentials & Webhooks ── */}
      {activeSection === 'credentials' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white">Merchant Carrier Credentials & Webhooks</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Encrypted at rest using AES-256-GCM. Overrides .env fallback keys when active.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Carrier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">API Key</th>
                  <th className="py-3 px-4">Account #</th>
                  <th className="py-3 px-4">Webhooks</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {CARRIERS.map((c) => {
                  const cred = credentials.find((item) => item.carrier === c);
                  const isConfigured = cred?.isConfigured ?? false;
                  return (
                    <tr key={c} className="hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{c}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            isConfigured
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-white/5'
                          }`}
                        >
                          {cred?.source || 'NONE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {cred?.apiKeyMasked || '••••••••'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {cred?.accountNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cred?.webhookEnabled
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cred?.webhookEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            cred?.simulationMode
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {cred?.simulationMode ? 'SIMULATOR' : 'LIVE API'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-all"
                        >
                          Configure
                        </button>
                        {isConfigured && (
                          <button
                            onClick={() => handleDeleteCredential(c)}
                            className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/20 text-[11px] font-semibold transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section 3: Webhook & Chaos Simulator ── */}
      {activeSection === 'simulator' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white">Carrier Webhook & Fault Injection Simulator</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate inbound signed carrier webhook milestones or inject HTTP 429/403 faults to test resilience.
              </p>
            </div>
            <Webhook className="w-5 h-5 text-purple-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Carrier</label>
                <select
                  value={simCarrier}
                  onChange={(e) => setSimCarrier(e.target.value as Carrier)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tracking Number</label>
                <input
                  type="text"
                  value={simTrackingNumber}
                  onChange={(e) => setSimTrackingNumber(e.target.value)}
                  placeholder="e.g. PEX-9901 or SIM429-01"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono focus:ring-1 focus:ring-purple-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tip: Include <code className="text-purple-300">SIM429</code> or <code className="text-purple-300">SIM403</code> in CN to inject rate-limit faults.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Milestone Status</label>
                <select
                  value={simStatus}
                  onChange={(e) => setSimStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                >
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (Out for Delivery)</option>
                  <option value="DELIVERED">DELIVERED (Delivered successfully)</option>
                  <option value="NDR_ACTIVE">NDR_ACTIVE (Delivery Attempted / Unreachable)</option>
                  <option value="RTO_INITIATED">RTO_INITIATED (Return Marked)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (In Transit between hubs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Remarks / Reason</label>
                <input
                  type="text"
                  value={simRemarks}
                  onChange={(e) => setSimRemarks(e.target.value)}
                  placeholder="Raw scanner remarks"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <button
                onClick={handleSimulateWebhook}
                disabled={Boolean(actionLoading)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Fire Webhook Event</span>
              </button>
            </div>

            {/* Results Preview */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">Ingestion Response</div>
                {simResult ? (
                  <pre className="p-3 rounded-lg bg-slate-900 border border-white/5 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {JSON.stringify(simResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-slate-500">
                    Awaiting simulated event execution...
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
                <p>• Webhook receiver: <code className="text-slate-300">POST /api/webhooks/carriers/:carrier</code></p>
                <p>• Verifies HMAC signature with raw byte stream buffer <code className="text-slate-300">req.rawBody</code>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Configuration Modal ── */}
      {editingCarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Configure {editingCarrier}</h3>
              <button
                onClick={() => setEditingCarrier(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter secret API key (leave blank to keep)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">API Secret (Optional)</label>
                <input
                  type="password"
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  placeholder="Enter API secret / password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number / Shipper Code</label>
                <input
                  type="text"
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value)}
                  placeholder="e.g. ACC-12345"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Webhook Secret (HMAC-SHA256)</label>
                <input
                  type="password"
                  value={webhookSecretInput}
                  onChange={(e) => setWebhookSecretInput(e.target.value)}
                  placeholder="Enter signing secret"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEnabledInput}
                    onChange={(e) => setWebhookEnabledInput(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                  />
                  <span>Enable Inbound Webhook</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulationModeInput}
                    onChange={(e) => setSimulationModeInput(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-purple-600"
                  />
                  <span>Simulation Mode</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => setEditingCarrier(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCredential}
                disabled={Boolean(actionLoading)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
              >
                Save Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarriersPollerTab;
