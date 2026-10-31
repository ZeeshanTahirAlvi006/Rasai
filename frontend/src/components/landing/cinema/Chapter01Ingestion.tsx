import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, Copy, FileSpreadsheet, Info, Sparkles } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import EditorialDrawer from './EditorialDrawer';

export const Chapter01Ingestion: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    total: number;
    applied: number;
    duplicates: number;
    sampleKey: string;
  } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSimulate = () => {
    soundEngine.playRelayClick();
    setIsSimulating(true);
    setBatchResult(null);

    setTimeout(() => {
      soundEngine.playSuccessChime();
      setIsSimulating(false);
      setBatchResult({
        total: 500,
        applied: 468,
        duplicates: 32,
        sampleKey: 'd7a8f192b0c4e8832a76fbc990141e9381a1795db28ff1098e9182312b918342',
      });
    }, 900);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background with Cinematic Darkness & Image Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-3.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Content Card with Deckled Border Effect */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Narrative & Setting */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#c9a47a]">
            <span className="w-2 h-2 rounded-full bg-[#c9a47a] animate-ping" />
            <span>01 / 05 • KARACHI PORT & AIR DISPATCH</span>
          </div>

          <h2 className="font-sans text-3xl sm:text-5xl font-bold leading-[1.08] text-white tracking-tight">
            High-Volume Telemetry & Zero-Waste Ingestion
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            In Pakistani e-commerce, hundreds of thousands of Cash-on-Delivery (COD) parcels originate nightly.
            Carriers fire repeated, uncoordinated webhooks and polling retries. Rasai guarantees that identical
            carrier events never spawn ghost outbox notifications or database deadlocks.
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
              <span>EXPLORE SPEC §3.3 & §5.7</span>
            </button>
            <span className="font-mono text-[11px] text-white/40">
              Adapters: PostEx • Trax • Leopards • TCS
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Dropzone & Normalizer Simulation */}
        <div className="w-full lg:w-1/2 bg-black/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-white/60">
            <span className="flex items-center gap-1.5 text-white/90">
              <FileSpreadsheet className="w-4 h-4 text-[#c9a47a]" />
              Manifest Normalizer Sandbox
            </span>
            <span className="text-[10px] text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded">
              READY FOR PAYLOAD
            </span>
          </div>

          {/* Simulated Dropzone */}
          <div
            onClick={handleSimulate}
            className={`mt-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer ${
              isSimulating
                ? 'border-[#c9a47a] bg-[#c9a47a]/10 scale-[0.99]'
                : 'border-white/20 hover:border-[#c9a47a]/70 hover:bg-white/5'
            }`}
          >
            <UploadCloud
              className={`w-10 h-10 mb-2 transition-transform duration-300 ${
                isSimulating ? 'text-[#c9a47a] animate-bounce' : 'text-slate-400'
              }`}
            />
            <span className="font-sans text-xs font-semibold text-white uppercase tracking-wider">
              {isSimulating ? 'Processing Manifest Batch...' : 'Simulate 500 Parcel Batch Ingest'}
            </span>
            <span className="font-sans text-[11px] text-white/50 mt-1">
              Click to feed a multi-carrier CSV through canonical SHA-256 eventKey hashing
            </span>
          </div>

          {/* Simulation Output Card */}
          {batchResult && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 animate-fade-in-headline">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-black/40">
                  <div className="text-[10px] text-white/50 uppercase">Ingested</div>
                  <div className="text-base font-bold text-white">{batchResult.total}</div>
                </div>
                <div className="p-2 rounded bg-[#10b981]/10 border border-[#10b981]/30">
                  <div className="text-[10px] text-[#10b981] uppercase">Applied</div>
                  <div className="text-base font-bold text-[#10b981]">{batchResult.applied}</div>
                </div>
                <div className="p-2 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                  <div className="text-[10px] text-[#f59e0b] uppercase">Dedup Drop</div>
                  <div className="text-base font-bold text-[#f59e0b]">{batchResult.duplicates}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono bg-black/60 p-2.5 rounded border border-white/10">
                <div className="truncate text-white/70 mr-2">
                  <span className="text-[#c9a47a]">eventKey:</span> {batchResult.sampleKey}
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
              </div>

              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Zero transaction rollbacks • Concurrency pool strictly isolated
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Drawer Details */}
      <EditorialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapterNumber="01"
        stationName="Karachi Ingestion Engine"
        title="Deduplication & Transaction Pool Protection"
        subtitle="Eliminating ghost WhatsApp notifications and transaction stalls at high volumes"
        specSection="§3.3 & §5.7"
        content={{
          overview:
            'A common logistics platform bug is treating carrier retries as fresh events, causing duplicate customer alerts and runaway database locks. Rasai computes a canonical SHA-256 fingerprint from the merchant ID, carrier, tracking number, status, normalized remarks, and ISO timestamp. If the carrier provides an event ID, that is prioritized.',
          keyPoints: [
            {
              label: 'Fingerprint Deduplication',
              detail:
                'Two distinct events with identical attributes collapse into a single eventKey in the append-only ledger before any transaction opens.',
            },
            {
              label: 'Zero Network I/O in Transactions',
              detail:
                'Hashing, PII encryption, and API requests execute entirely outside MongoDB sessions, keeping transaction lock durations strictly under 15ms.',
            },
            {
              label: 'Partitioned Lane Serialization',
              detail:
                'Events for the same parcel are serialized chronologically in chronological lanes, completely eliminating O(N²) rollback storms.',
            },
            {
              label: 'Tiered Fair-Share Queueing',
              detail:
                'Interactive WhatsApp replies operate in Priority 1 (≤50ms), while heavy 500k-row merchant CSV imports are isolated in Priority 3.',
            },
          ],
          mathematicsOrRule:
            'eventKey = SHA-256([ \'fp\', merchantId, carrier, trackingNumber, rawStatus.trim(), rawRemarks.trim(), occurredAt.toISOString() ])',
          codeSnippet: `// Up-front batch deduplication query
const existingKeys = await ShipmentEvent.find({
  merchantId,
  eventKey: { $in: incomingKeys }
}).select('eventKey').lean().exec();

// Novel events proceed to applyEvent in parallel lanes
await Promise.all(novelEvents.map(e => applyEvent(e)));`,
        }}
      />
    </div>
  );
};

export default Chapter01Ingestion;
