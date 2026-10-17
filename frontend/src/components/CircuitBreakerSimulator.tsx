import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Flame,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Terminal,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import carrierHealthApi from '../api/carrierHealthApi';
import type { Carrier, BreakerState } from '../types/carrierHealth';

interface LogEntry {
  id: string;
  timestamp: string;
  carrier: Carrier;
  type: 'SUCCESS' | 'FALLBACK' | 'CIRCUIT_OPEN' | 'FAILURE';
  message: string;
  latencyMs: number;
}

export const CircuitBreakerSimulator: React.FC = () => {
  const [carrier, setCarrier] = useState<Carrier>('LEOPARDS');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentState, setCurrentState] = useState<BreakerState>('CLOSED');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Check state on carrier change
  const refreshState = async () => {
    try {
      const res = await carrierHealthApi.checkAvailability(carrier);
      if (res.data?.state) {
        setCurrentState(res.data.state);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    refreshState();
  }, [carrier]);

  const handleExecute = async () => {
    setLoading(true);
    const start = performance.now();

    try {
      const res = await carrierHealthApi.executeWithBreaker(carrier, {
        simulateFailure,
        useFallback,
      });

      const latencyMs = Math.round(performance.now() - start);

      if (res.success) {
        const isFallback = res.data?.probeStatus === 'FALLBACK';
        const newLog: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          carrier,
          type: isFallback ? 'FALLBACK' : 'SUCCESS',
          message: isFallback
            ? `Served via Fallback Adapter (Graceful Degradation)`
            : `Upstream executed successfully (HTTP 200)`,
          latencyMs,
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
        toast.success(isFallback ? 'Fallback executed successfully' : 'Request succeeded under breaker');
      }
      await refreshState();
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const isBreakerOpen = err.response?.status === 503;
      const errorMsg = err.response?.data?.message || err.message || 'Operation failed';

      const newLog: LogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        carrier,
        type: isBreakerOpen ? 'CIRCUIT_OPEN' : 'FAILURE',
        message: isBreakerOpen
          ? `503 Service Unavailable: Circuit Breaker OPEN (${errorMsg})`
          : `500 Upstream Failure: ${errorMsg}`,
        latencyMs,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 19)]);

      if (isBreakerOpen) {
        toast.error(`Circuit Breaker OPEN! Suspended calls.`);
      } else {
        toast.error(`Simulated failure registered: ${errorMsg}`);
      }
      await refreshState();
    } finally {
      setLoading(false);
    }
  };

  const handleFastTrip = async () => {
    toast('Tripping circuit breaker with 5 consecutive failures...', { icon: '⚡' });
    for (let i = 0; i < 5; i++) {
      await carrierHealthApi.recordFailure(carrier).catch(() => {});
    }
    toast.error(`${carrier} circuit breaker is now TRIPPED (OPEN)!`);
    await refreshState();
  };

  const handleReset = async () => {
    await carrierHealthApi.resetBreaker(carrier);
    toast.success(`${carrier} circuit breaker RESET to CLOSED!`);
    await refreshState();
  };

  return (
    <div className="space-y-6">
      {/* ── State Machine Diagram ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Circuit Breaker State Machine & Transition Flow
            </h2>
            <p className="text-xs text-slate-400">
              Visualizes the 3-state finite state machine guarding upstream carrier connections
            </p>
          </div>
          <div className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-950/70 border border-white/10 text-slate-300">
            Current {carrier} State: <strong className="text-indigo-400">{currentState}</strong>
          </div>
        </div>

        {/* State nodes visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* CLOSED node */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              currentState === 'CLOSED'
                ? 'bg-emerald-500/15 border-emerald-500/50 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                : 'bg-slate-950/40 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                CLOSED (Normal)
              </span>
              {currentState === 'CLOSED' && (
                <span className="text-[10px] uppercase font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              All requests routed to carrier. Failures tracked in rolling threshold window.
            </p>
            <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-white/5">
              Trip rule: <strong>5 consecutive failures</strong>
            </div>
          </div>

          {/* OPEN node */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              currentState === 'OPEN'
                ? 'bg-rose-500/15 border-rose-500/50 ring-4 ring-rose-500/20 shadow-lg shadow-rose-500/10 scale-[1.02]'
                : 'bg-slate-950/40 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm text-rose-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                OPEN (Quarantine)
              </span>
              {currentState === 'OPEN' && (
                <span className="text-[10px] uppercase font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Calls fail-fast with HTTP 503 or divert to fallback adapter. Exponential cooldown backoff.
            </p>
            <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-white/5">
              Recovery: <strong>Backoff timer expiration</strong>
            </div>
          </div>

          {/* HALF_OPEN node */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              currentState === 'HALF_OPEN'
                ? 'bg-amber-500/15 border-amber-500/50 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/10 scale-[1.02]'
                : 'bg-slate-950/40 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                HALF_OPEN (Canary)
              </span>
              {currentState === 'HALF_OPEN' && (
                <span className="text-[10px] uppercase font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Single canary lease granted to probe carrier health. Success closes circuit; failure re-opens.
            </p>
            <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-white/5">
              Condition: <strong>1 Successful probe</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sandbox Controls & Live Execution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Card */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Execution Sandbox Controls
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Carrier</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as Carrier)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LEOPARDS">LEOPARDS</option>
                <option value="POSTEX">POSTEX</option>
                <option value="TRAX">TRAX</option>
                <option value="TCS">TCS</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                />
                <span className="font-semibold text-rose-300">Simulate Upstream Failure</span>
              </label>
              <p className="text-[11px] text-slate-400 pl-6">
                Forces the carrier call to throw an error, registering a strike on the circuit breaker.
              </p>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none pt-2 border-t border-white/5">
                <input
                  type="checkbox"
                  checked={useFallback}
                  onChange={(e) => setUseFallback(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                />
                <span className="font-semibold text-sky-300">Enable Fallback Routing</span>
              </label>
              <p className="text-[11px] text-slate-400 pl-6">
                When breaker is OPEN, gracefully routes traffic to fallback secondary handler.
              </p>
            </div>
          </div>

          {/* Action triggers */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Execute with Circuit Breaker</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFastTrip}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Trip to OPEN (5x)</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to CLOSED</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Execution Stream Log */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 lg:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Telemetry Execution Audit Stream
              </h3>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No executions yet. Run an operation on the left to inspect breaker behavior.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {logs.map((log) => {
                  let badge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  if (log.type === 'FALLBACK') badge = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
                  else if (log.type === 'CIRCUIT_OPEN') badge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                  else if (log.type === 'FAILURE') badge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge}`}>
                            {log.type}
                          </span>
                          <span className="font-mono font-bold text-white">{log.carrier}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.message}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono self-end sm:self-center bg-white/5 px-2 py-0.5 rounded">
                        {log.latencyMs}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Automatic retry backoff uses full jitter to prevent thundering herds upon recovery.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CircuitBreakerSimulator;
