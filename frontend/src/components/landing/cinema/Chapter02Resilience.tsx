import React, { useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, RefreshCw, Zap, Info } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import EditorialDrawer from './EditorialDrawer';

interface CarrierState {
  name: string;
  code: 'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS';
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  latency: string;
  successRate: string;
}

export const Chapter02Resilience: React.FC = () => {
  const [carriers, setCarriers] = useState<CarrierState[]>([
    { name: 'Leopards Express', code: 'LEOPARDS', status: 'CLOSED', latency: '180ms', successRate: '99.4%' },
    { name: 'PostEx Logistics', code: 'POSTEX', status: 'CLOSED', latency: '210ms', successRate: '98.9%' },
    { name: 'Trax Courier', code: 'TRAX', status: 'CLOSED', latency: '195ms', successRate: '99.1%' },
    { name: 'TCS Express', code: 'TCS', status: 'CLOSED', latency: '160ms', successRate: '99.8%' },
  ]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleTripCarrier = (code: 'POSTEX' | 'TRAX') => {
    soundEngine.playRelayClick();
    soundEngine.playAlertPing();

    setCarriers((prev) =>
      prev.map((c) =>
        c.code === code
          ? { ...c, status: 'OPEN', latency: '5400ms (TIMEOUT)', successRate: '41.2%' }
          : c
      )
    );
    setActiveAlert(`HTTP 429 Too Many Requests detected on ${code}. Circuit tripped to OPEN. Dynamic reroute engaged.`);
  };

  const handleReset = () => {
    soundEngine.playRelayClick();
    soundEngine.playSuccessChime();
    setCarriers((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'CLOSED',
        latency: c.code === 'TCS' ? '160ms' : c.code === 'LEOPARDS' ? '180ms' : '205ms',
        successRate: '99.2%',
      }))
    );
    setActiveAlert(null);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background Logistics Convoy Image Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-35 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-5.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Narrative */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#c9a47a]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>02 / 05 • NATIONAL TRANSIT ARTERIES</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-normal leading-[1.08] text-white tracking-tight">
            Carrier API Resilience & Circuit Breakers
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            Regional logistics APIs are prone to unexpected Cloudflare rate limits, throttling, or staging outages.
            Rasai’s distributed circuit breaker monitors HTTP error codes in real time. If a carrier returns 429 or 5xx,
            the breaker trips to OPEN in MongoDB, immediately isolating the affected carrier and shielding merchant cash flow.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                soundEngine.playRelayClick();
                setIsDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-[#dfc29f] hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-lg border border-[#c9a47a]/30 hover:border-[#c9a47a] bg-[#c9a47a]/5"
            >
              <Info className="w-3.5 h-3.5 text-[#c9a47a]" />
              <span>EXPLORE SPEC §5.4 & §6.3</span>
            </button>
            <span className="font-mono text-[11px] text-white/40">
              Token Bucket Rate Governor: 60 msg/s
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Switchboard */}
        <div className="w-full lg:w-1/2 bg-black/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-white/60">
            <span className="flex items-center gap-1.5 text-white/90">
              <Activity className="w-4 h-4 text-[#10b981]" />
              Live Carrier Health Switchboard
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] text-[#c9a47a] hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset All Canaries
            </button>
          </div>

          {/* 4 Carriers Grid */}
          <div className="grid grid-cols-2 gap-3 my-4">
            {carriers.map((c) => (
              <div
                key={c.code}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  c.status === 'OPEN'
                    ? 'bg-[#ef4444]/10 border-[#ef4444]/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white truncate">{c.name}</span>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                      c.status === 'OPEN'
                        ? 'bg-[#ef4444] text-white animate-pulse'
                        : 'bg-[#10b981]/20 text-[#10b981]'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                  <span>Latency: {c.latency}</span>
                  <span>{c.successRate}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Fault Injection Controls */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
                Simulate Chaos / Rate Limit Fault:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTripCarrier('TRAX')}
                className="py-1.5 px-3 rounded-lg border border-[#f59e0b]/40 hover:border-[#f59e0b] bg-[#f59e0b]/10 text-white font-mono text-[11px] transition-all cursor-pointer hover:bg-[#f59e0b]/20"
              >
                Inject 429 on TRAX
              </button>
              <button
                onClick={() => handleTripCarrier('POSTEX')}
                className="py-1.5 px-3 rounded-lg border border-[#f59e0b]/40 hover:border-[#f59e0b] bg-[#f59e0b]/10 text-white font-mono text-[11px] transition-all cursor-pointer hover:bg-[#f59e0b]/20"
              >
                Inject 429 on POSTEX
              </button>
            </div>
          </div>

          {/* Active Alert Banner */}
          {activeAlert && (
            <div className="mt-3 p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-start gap-2.5 text-xs text-[#fca5a5] animate-fade-in-headline font-mono">
              <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
              <span>{activeAlert}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Drawer */}
      <EditorialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapterNumber="02"
        stationName="Carrier Telemetry & Breakers"
        title="Distributed Circuit Breakers & Governor"
        subtitle="Self-healing poller pipelines that survive courier outages and Meta API limits"
        specSection="§5.4 & §6.3"
        content={{
          overview:
            'Courier APIs frequently crash under holiday shopping surges or enforce unannounced IP blocks. Instead of letting worker threads retry blindly and face permanent blacklisting, Rasai manages a stateful circuit breaker in MongoDB (carrier_health), synchronizing all background workers.',
          keyPoints: [
            {
              label: 'State Invariant Across Workers',
              detail:
                'Circuit breaker state lives in Mongo, not memory. When worker A detects a 429, all other workers honor the OPEN backoff immediately.',
            },
            {
              label: 'Half-Open Canary Probes',
              detail:
                'After the backoff pause expires (default 60 mins or Retry-After header), one canary request tests carrier recovery before full traffic resumes.',
            },
            {
              label: 'Degraded Tracking Alerts',
              detail:
                'Parcels for an OPEN carrier are marked trackingHealth: DEGRADED. Ops receives instant Telegram/email alerts with zero dropped parcels.',
            },
            {
              label: 'Meta Spam Governor (§6.3)',
              detail:
                'Meta Error 131048 is treated as a spam rate limit requiring a multi-hour pause, while error 130429 uses bounded exponential backoff.',
            },
          ],
          mathematicsOrRule:
            'CLOSED -> [HTTP 429 / 403 / 5xx] -> OPEN (pause: 60m + Retry-After) -> HALF_OPEN (1 canary) -> CLOSED / OPEN',
          codeSnippet: `// Worker checks breaker before polling
const health = await CarrierHealth.findOne({ carrier }).lean().exec();
if (health?.state === 'OPEN' && health.backoffUntil > new Date()) {
  throw AppError.serviceUnavailable('Carrier circuit is OPEN', 'circuit_breaker_open');
}`,
        }}
      />
    </div>
  );
};

export default Chapter02Resilience;
