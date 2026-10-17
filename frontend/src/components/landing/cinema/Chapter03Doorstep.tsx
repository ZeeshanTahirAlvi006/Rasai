import React, { useState } from 'react';
import { MapPin, Navigation, ShieldAlert, Crosshair, ArrowRight, Info, AlertOctagon } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import EditorialDrawer from './EditorialDrawer';

export const Chapter03Doorstep: React.FC = () => {
  const [hasScanned, setHasScanned] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSimulateScan = () => {
    soundEngine.playRelayClick();
    soundEngine.playAlertPing();
    setHasScanned(true);
  };

  const handleReset = () => {
    soundEngine.playRelayClick();
    setHasScanned(false);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background Courier Urban Street Image Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-4.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Narrative */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#f59e0b]">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping" />
            <span>03 / 05 • LAHORE URBAN SECTOR • 09:45 AM</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-normal leading-[1.08] text-white tracking-tight">
            The Doorstep Intercept: Halting Rider Fraud
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            Over 65% of Pakistani COD delivery failures are "ghost scans"—where an overloaded rider marks
            <em>"Customer Unavailable"</em> or <em>"Address Incomplete"</em> without ever entering the neighborhood.
            Rasai intercepts the failure event the millisecond it registers on the carrier API, preventing the parcel
            from entering premature Return-to-Origin (RTO).
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
              <span>EXPLORE SPEC §4.2 TRANSITION ENGINE</span>
            </button>
            <span className="font-mono text-[11px] text-white/40">
              State: OUT_FOR_DELIVERY ➔ NDR_ACTIVE
            </span>
          </div>
        </div>

        {/* Right Column: Doorstep Radar Simulation */}
        <div className="w-full lg:w-1/2 bg-black/70 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-white/60">
            <span className="flex items-center gap-1.5 text-white/90">
              <Crosshair className="w-4 h-4 text-[#f59e0b]" />
              Telemetry Geofence Telemetry
            </span>
            <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded">
              SECTOR 14-B GULBERG
            </span>
          </div>

          {/* Interactive Radar Visual */}
          <div className="relative my-4 h-52 w-full rounded-xl bg-[#0d1117] border border-white/10 overflow-hidden flex items-center justify-center">
            {/* Concentric radar rings */}
            <div className="absolute w-44 h-44 rounded-full border border-white/10" />
            <div className="absolute w-28 h-28 rounded-full border border-white/15" />
            <div className="absolute w-12 h-12 rounded-full border border-white/20" />

            {/* Sweep line */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#f59e0b]/10 to-transparent animate-[spin_4s_linear_infinite]" />

            {/* Customer Doorstep Waypoint */}
            <div className="absolute top-12 left-16 flex flex-col items-center">
              <div className="p-1.5 rounded-full bg-[#10b981] text-black shadow-[0_0_12px_#10b981]">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono text-[9px] text-[#10b981] mt-1 font-semibold uppercase">
                Customer Pin
              </span>
            </div>

            {/* Courier Rider Location */}
            <div className="absolute bottom-10 right-16 flex flex-col items-center">
              <div
                className={`p-1.5 rounded-full text-black transition-all duration-300 ${
                  hasScanned
                    ? 'bg-[#ef4444] shadow-[0_0_15px_#ef4444] animate-bounce'
                    : 'bg-[#f59e0b] shadow-[0_0_10px_#f59e0b]'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 transform rotate-45" />
              </div>
              <span className="font-mono text-[9px] text-white/70 mt-1 uppercase">
                Rider Device (2.8 km away)
              </span>
            </div>

            {/* Geofence Distance Tag */}
            <div className="absolute bottom-2 left-3 font-mono text-[10px] text-white/40">
              Proximity Offset: <span className="text-[#f59e0b]">2,840 meters</span>
            </div>
          </div>

          {/* Trigger Button or Active Intercept Result */}
          {!hasScanned ? (
            <button
              onClick={handleSimulateScan}
              className="w-full py-3 px-4 rounded-xl bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/50 text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              <AlertOctagon className="w-4 h-4 text-[#f59e0b]" />
              <span>Simulate Rider Fake Failure Scan</span>
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in-headline">
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/50 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
                <div className="text-xs font-mono">
                  <div className="font-bold text-[#fca5a5] uppercase">
                    NDR INTERCEPTED • FRAUD DETECTED
                  </div>
                  <div className="text-white/70 mt-0.5">
                    Carrier logged: "Customer Unavailable". Telemetry confirms rider never breached delivery geofence.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono bg-white/5 p-2 rounded border border-white/10">
                <span className="text-white/60">State Machine Mutation:</span>
                <span className="text-[#10b981] font-bold">NDR_ACTIVE (Attempt #1)</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={handleReset}
                  className="text-[11px] font-mono text-white/50 hover:text-white underline cursor-pointer"
                >
                  Reset Telemetry
                </button>
                <span className="text-[11px] font-mono text-[#c9a47a] flex items-center gap-1">
                  <span>Advancing to WhatsApp Engine</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Drawer */}
      <EditorialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapterNumber="03"
        stationName="Doorstep Telemetry Engine"
        title="Pure Decision Engine & Transition Guard"
        subtitle="Mathematical state transitions preventing ghost attempts and out-of-order race conditions"
        specSection="§4.2 & §4.3"
        content={{
          overview:
            'A single COD parcel can receive events out of chronological sequence—for instance, a delayed "In Transit" webhook arriving after a rider already recorded "Out for Delivery". Rasai enforces monotonic state integrity: late events pre-dating lastCarrierEventAt are marked STALE_OUT_OF_ORDER and rejected without rewinding projection state.',
          keyPoints: [
            {
              label: 'Optimistic State Versioning',
              detail:
                'Shipments are updated via { _id, stateVersion }. On version conflict, the transaction rolls back and retries against fresh state with zero data loss.',
            },
            {
              label: 'Same-Status NOOP Guard',
              detail:
                'Repeated NDR carrier scans are evaluated as NOOP with zero effects, strictly preventing duplicate WhatsApp utility messages to buyers.',
            },
            {
              label: 'Single Mongo Transaction',
              detail:
                'The append-only ledger insert, state projection update, and outbox message upsert execute in a single ACID transaction.',
            },
            {
              label: 'Explicit Intent Decoupling',
              detail:
                'Dispute retractions, customer reschedules, and carrier status updates are distinct strongly typed intents handled by the pure decide() function.',
            },
          ],
          mathematicsOrRule:
            'OUT_FOR_DELIVERY + [CARRIER_STATUS: NDR_ACTIVE] => next: NDR_ACTIVE, effects: [INCREMENT_NDR_ATTEMPT, ENQUEUE_NDR_TEMPLATE]',
          codeSnippet: `// Pure transition decision function (§4.3)
export function decide(current: Status, intent: Intent, ctx: { ndrTemplateSent: boolean }): Decision {
  if (target === current) return { next: current, effects: [], disposition: 'NOOP' };
  if (target === 'NDR_ACTIVE') {
    return {
      next: 'NDR_ACTIVE',
      effects: ['INCREMENT_NDR_ATTEMPT', 'ENQUEUE_NDR_TEMPLATE'],
      disposition: 'APPLIED'
    };
  }
}`,
        }}
      />
    </div>
  );
};

export default Chapter03Doorstep;
