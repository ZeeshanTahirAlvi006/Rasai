import React, { useState } from 'react';
import { FileCheck, Shield, Award, CheckSquare, Square, Download, Send, Info, Sparkles } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import EditorialDrawer from './EditorialDrawer';

interface EvidenceItem {
  id: string;
  label: string;
  points: number;
  checked: boolean;
}

export const Chapter05ManifestMargin: React.FC = () => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([
    { id: '1', label: 'No courier call evidence on attempt (Zero dial logs)', points: 40, checked: true },
    { id: '2', label: 'Customer WhatsApp GPS confirmation within window', points: 25, checked: true },
    { id: '3', label: 'Rider GPS contradicted customer address (>2km away)', points: 15, checked: true },
    { id: '4', label: 'Dispute filed inside carrier settlement cutoff', points: 10, checked: true },
  ]);
  const [manifestGenerated, setManifestGenerated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleEvidence = (id: string) => {
    soundEngine.playRelayClick();
    setEvidence((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const totalScore = evidence
    .filter((e) => e.checked)
    .reduce((sum, item) => sum + item.points, 0);

  const getScoreBand = (score: number) => {
    if (score >= 80) return { label: 'STRONG (≥80 PTS)', color: 'text-[#10b981]', bg: 'bg-[#10b981]/15', border: 'border-[#10b981]/40' };
    if (score >= 50) return { label: 'MEDIUM (50–79 PTS)', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/15', border: 'border-[#f59e0b]/40' };
    return { label: 'WEAK (<50 PTS)', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/15', border: 'border-[#ef4444]/40' };
  };

  const band = getScoreBand(totalScore);

  const handleGenerateManifest = () => {
    soundEngine.playRelayClick();
    soundEngine.playSuccessChime();
    setManifestGenerated(true);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background Dispatch Warehouse Mist Image Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-6.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Narrative */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#c9a47a]">
            <span className="w-2 h-2 rounded-full bg-[#c9a47a] animate-ping" />
            <span>05 / 05 • ISLAMABAD REGIONAL STATION • 07:30 PKT</span>
          </div>

          <h2 className="font-sans text-3xl sm:text-5xl font-bold leading-[1.08] text-white tracking-tight">
            07:30 PKT Manifest & CPR Margin Defense
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            At 07:30 PKT every morning, before couriers dispatch their riders, Rasai groups all rescheduled
            parcels by delivery station code. Automated PDFs and CSVs with embedded Google Maps coordinates
            are uploaded to Google Drive and emailed directly to hub supervisors. Simultaneously, fraudulent
            cancellation claims are assembled into legally sound dispute dossiers to reverse courier penalties.
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
              <span>EXPLORE SPEC §8.1 & §9</span>
            </button>
            <span className="font-mono text-[11px] text-white/40">
              Unique Batch: [dateKey, stationCode]
            </span>
          </div>
        </div>

        {/* Right Column: Interactive CPR Score Builder & Manifest Dispatch */}
        <div className="w-full lg:w-1/2 bg-black/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-white/60">
            <span className="flex items-center gap-1.5 text-white/90">
              <Shield className="w-4 h-4 text-[#c9a47a]" />
              CPR Dispute Evidence Dossier
            </span>
            <div className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${band.bg} ${band.color} ${band.border} border`}>
              {band.label}
            </div>
          </div>

          {/* Interactive Evidence Signals */}
          <div className="space-y-2 my-4">
            {evidence.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleEvidence(item.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-sans transition-all cursor-pointer ${
                  item.checked
                    ? 'bg-white/10 border-[#c9a47a]/50 text-white'
                    : 'bg-white/5 border-white/5 text-white/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.checked ? (
                    <CheckSquare className="w-4 h-4 text-[#10b981] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
                <span className="font-mono text-[11px] text-[#c9a47a] shrink-0 ml-2">
                  +{item.points} pts
                </span>
              </div>
            ))}
          </div>

          {/* Score Gauge & Action */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/60">Audit Evidence Confidence:</span>
              <span className={`text-base font-bold ${band.color}`}>{totalScore} / 100</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#f59e0b] to-[#10b981] transition-all duration-500 rounded-full"
                style={{ width: `${totalScore}%` }}
              />
            </div>
          </div>

          {/* Manifest Compilation Button */}
          {!manifestGenerated ? (
            <button
              onClick={handleGenerateManifest}
              className="mt-4 w-full py-3 px-4 rounded-xl bg-[#c9a47a] hover:bg-[#dfc29f] text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,164,122,0.3)]"
            >
              <Send className="w-4 h-4 text-black" />
              <span>Compile 07:30 PKT Manifest & Sync Drive</span>
            </button>
          ) : (
            <div className="mt-4 p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-xs font-mono space-y-1.5 animate-fade-in-headline">
              <div className="flex items-center justify-between text-[#10b981] font-bold">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  Manifest Batch Dispatched!
                </span>
                <span className="text-[10px] text-white/60">ISB-HUB-01</span>
              </div>
              <p className="text-white/80 text-[11px]">
                PDF & CSV dispatched to station supervisor email + synced to Google Drive root folder.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Drawer */}
      <EditorialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapterNumber="05"
        stationName="Manifest & Margin Vault"
        title="07:30 PKT Run-Sheets & Margin Defense"
        subtitle="Bridging software automation with physical courier dispatch reality"
        specSection="§8.1 & §9"
        content={{
          overview:
            'Pakistan courier riders depart their hubs between 08:00 and 08:30 PKT. Sending updates at noon is too late. Rasai schedules a BullMQ job at exactly 07:30 PKT (Asia/Karachi UTC+5, zero DST). The job queries all parcels with needsManifest = true for Leopard and TCS stations, compiling per-station PDF and CSV run-sheets.',
          keyPoints: [
            {
              label: 'Single-Fire Cron Invariant',
              detail:
                'BullMQ repeatable job scheduler guarantees a single fire regardless of instance count, eliminating duplicate manifest emails.',
            },
            {
              label: 'Idempotency by {dateKey, stationCode}',
              detail:
                'Unique index on manifest_batches ensures a retried job safely skips stations already transmitted today.',
            },
            {
              label: 'CPR Dispute Score Algorithm',
              detail:
                'Dispute evidence is mathematically scored: Call logs (40), WhatsApp confirmations (25), Geofence contradictions (15), Settlement timing (10). Scores ≥ 80 are rated STRONG.',
            },
            {
              label: 'Quiet Dispute Retraction',
              detail:
                'If a buyer corrects their details after an error report, disputeRetractionRequested is set to quietly retract disputes without burning courier goodwill.',
            },
          ],
          mathematicsOrRule:
            'needsManifest query: { carrier: { $in: [\'LEOPARDS\', \'TCS\'] }, needsManifest: true, status: { $in: [\'RESOLVED_RESCHEDULED\', \'RTO_INITIATED\'] } }',
          codeSnippet: `// 07:30 PKT Manifest Dispatcher (§8.1)
await queue.upsertJobScheduler(
  'run-sheet-0730',
  { pattern: '30 7 * * *', tz: 'Asia/Karachi' },
  { name: 'compile-manifests', data: {} }
);`,
        }}
      />
    </div>
  );
};

export default Chapter05ManifestMargin;
