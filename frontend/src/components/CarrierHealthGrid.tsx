import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  Zap,
  Flame,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import carrierHealthApi from '../api/carrierHealthApi';
import type { Carrier, CarrierHealthSummary, BreakerState } from '../types/carrierHealth';

const CARRIERS: Carrier[] = ['LEOPARDS', 'POSTEX', 'TRAX', 'TCS'];

const CARRIER_THEMES: Record<
  Carrier,
  { name: string; tag: string; bgGlow: string; border: string; accent: string }
> = {
  LEOPARDS: {
    name: 'Leopards Courier',
    tag: 'Web Scraping Adapter',
    bgGlow: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/30',
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  POSTEX: {
    name: 'PostEx Logistics',
    tag: 'API Integration',
    bgGlow: 'from-blue-500/10 to-transparent',
    border: 'border-blue-500/30',
    accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  TRAX: {
    name: 'Trax Logistics',
    tag: 'API Integration',
    bgGlow: 'from-rose-500/10 to-transparent',
    border: 'border-rose-500/30',
    accent: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  TCS: {
    name: 'TCS Courier',
    tag: 'Enterprise API',
    bgGlow: 'from-red-500/10 to-transparent',
    border: 'border-red-500/30',
    accent: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
};

export const CarrierHealthGrid: React.FC = () => {
  const [carriersData, setCarriersData] = useState<CarrierHealthSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSummary = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await carrierHealthApi.getSummary();
      if (res.success && res.data) {
        setCarriersData(res.data);
      }
    } catch (err: any) {
      if (!silent) toast.error('Failed to fetch carrier summary');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSummary(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSimulateFailure = async (carrier: Carrier) => {
    setActionLoading(`${carrier}-fail`);
    try {
      const res = await carrierHealthApi.recordFailure(carrier);
      toast.success(`Recorded failure for ${carrier}. Check failure count!`);
      await fetchSummary(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record failure');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordSuccess = async (carrier: Carrier) => {
    setActionLoading(`${carrier}-success`);
    try {
      await carrierHealthApi.recordSuccess(carrier);
      toast.success(`Recorded success for ${carrier}. Counter reset.`);
      await fetchSummary(true);
    } catch (err: any) {
      toast.error('Failed to record success');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetBreaker = async (carrier: Carrier) => {
    setActionLoading(`${carrier}-reset`);
    try {
      await carrierHealthApi.resetBreaker(carrier);
      toast.success(`Circuit breaker for ${carrier} restored to CLOSED!`);
      await fetchSummary(true);
    } catch (err: any) {
      toast.error('Failed to reset circuit breaker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTripBreaker = async (carrier: Carrier) => {
    setActionLoading(`${carrier}-trip`);
    try {
      await carrierHealthApi.tripBreaker(carrier, 60000, 'MANUAL_TEST_QUARANTINE');
      toast.error(`Circuit breaker for ${carrier} forced to OPEN (60s quarantine)!`);
      await fetchSummary(true);
    } catch (err: any) {
      toast.error('Failed to trip circuit breaker');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckAvailability = async (carrier: Carrier) => {
    try {
      const res = await carrierHealthApi.checkAvailability(carrier);
      if (res.data?.isAvailable) {
        toast.success(`${carrier} is AVAILABLE (${res.data.state})`);
      } else {
        const secs = Math.ceil((res.data?.remainingBackOffMs || 0) / 1000);
        toast.error(`${carrier} is IN COOLDOWN (${res.data?.state}). Retry after ${secs}s.`);
      }
    } catch (err: any) {
      toast.error('Error checking availability');
    }
  };

  const getStateBadge = (state: BreakerState) => {
    switch (state) {
      case 'CLOSED':
        return {
          label: 'CLOSED (Healthy)',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          desc: 'Traffic routing normally',
        };
      case 'OPEN':
        return {
          label: 'OPEN (Quarantined)',
          color: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
          dot: 'bg-rose-400',
          desc: 'Failing; calls suspended to fallback',
        };
      case 'HALF_OPEN':
        return {
          label: 'HALF_OPEN (Canary)',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
          desc: 'Canary lease probing recovery',
        };
    }
  };

  const totalHealthy = carriersData.filter((c) => c.state === 'CLOSED').length;
  const totalOpen = carriersData.filter((c) => c.state === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* ── Dashboard Header & Metrics ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Carrier Fleet Telemetry & Circuit Breakers
          </h2>
          <p className="text-xs text-slate-400">
            Real-time health monitoring, automated error threshold detection, and failover isolation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status summary pill */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {totalHealthy} Healthy
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              {totalOpen} Tripped
            </span>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${autoRefresh
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
              }`}
          >
            {autoRefresh ? '● Auto-Polling ON' : '○ Auto-Polling OFF'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchSummary()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 4-Carrier Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {CARRIERS.map((carrierName) => {
          const summary = carriersData.find((c) => c.carrier === carrierName) || {
            carrier: carrierName,
            state: 'CLOSED' as BreakerState,
            failureCount: 0,
            tripCount: 0,
            isHealthy: true,
            remainingBackoffMs: 0,
          };

          const theme = CARRIER_THEMES[carrierName];
          const stateConfig = getStateBadge(summary.state);
          const failurePercentage = Math.min(100, (summary.failureCount / 5) * 100);
          const backoffSecs = Math.ceil(summary.remainingBackoffMs / 1000);

          return (
            <div
              key={carrierName}
              className={`rounded-2xl border ${theme.border} bg-slate-900/70 bg-gradient-to-b ${theme.bgGlow} backdrop-blur-xl p-5 lg:p-6 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.01]`}
            >
              <div>
                {/* Header: Carrier Name & Breaker State Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg text-white tracking-tight">{carrierName}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.accent}`}>
                        {theme.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{theme.name}</p>
                  </div>

                  {/* Circuit State Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${stateConfig.color}`}>
                    <span className={`w-2 h-2 rounded-full ${stateConfig.dot}`}></span>
                    <span>{stateConfig.label}</span>
                  </div>
                </div>

                {/* State Microcopy */}
                <p className="text-xs text-slate-300/80 mb-4 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <span className="font-semibold text-slate-200">Policy: </span>
                  {stateConfig.desc}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Consecutive Failures Bar */}
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                      <span>Failures (5 Trip)</span>
                      <span className={`font-bold font-mono ${summary.failureCount >= 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {summary.failureCount} / 5
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${summary.failureCount >= 4
                          ? 'bg-rose-500'
                          : summary.failureCount >= 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          }`}
                        style={{ width: `${failurePercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Total Trips */}
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Total Trips</div>
                      <div className="text-base font-bold font-mono text-white mt-0.5">
                        {summary.tripCount}
                      </div>
                    </div>
                    <Flame className={`w-5 h-5 ${summary.tripCount > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
                  </div>
                </div>

                {/* Backoff / Cooldown Timer if OPEN */}
                {summary.state === 'OPEN' && backoffSecs > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-rose-400 animate-spin" />
                      Cooldown Backoff Active:
                    </span>
                    <span className="font-mono font-bold text-sm bg-rose-500/20 px-2 py-0.5 rounded">
                      {backoffSecs}s remaining
                    </span>
                  </div>
                )}

                {summary.lastErrorCode && (
                  <div className="mb-4 text-[11px] text-slate-400 font-mono truncate">
                    Last Reason: <span className="text-rose-300">{summary.lastErrorCode}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCheckAvailability(carrierName)}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-white/5"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Check Status</span>
                </button>

                <button
                  onClick={() => handleSimulateFailure(carrierName)}
                  disabled={actionLoading === `${carrierName}-fail`}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-rose-500/30 disabled:opacity-50"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>+1 Failure</span>
                </button>

                <button
                  onClick={() => handleRecordSuccess(carrierName)}
                  disabled={actionLoading === `${carrierName}-success`}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-500/30 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Record Success</span>
                </button>

                {summary.state === 'OPEN' ? (
                  <button
                    onClick={() => handleResetBreaker(carrierName)}
                    disabled={actionLoading === `${carrierName}-reset`}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Breaker</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleTripBreaker(carrierName)}
                    disabled={actionLoading === `${carrierName}-trip`}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-white/5 hover:border-rose-500/30"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trip Circuit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CarrierHealthGrid;
