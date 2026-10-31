import React, { useState } from 'react';
import { MessageSquare, Calendar, MapPin, CheckCheck, Clock, ShieldCheck, Info, Sparkles, RefreshCw } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import EditorialDrawer from './EditorialDrawer';

export const Chapter04WhatsApp: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<string>('Tomorrow, 10:00 AM');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChooseReschedule = () => {
    soundEngine.playRelayClick();
    setStep(2);
  };

  const handleSelectDate = (date: string) => {
    soundEngine.playRelayClick();
    setSelectedDate(date);
    setStep(3);
  };

  const handleDropPin = () => {
    soundEngine.playRelayClick();
    soundEngine.playSuccessChime();
    setStep(4);
  };

  const handleReset = () => {
    soundEngine.playRelayClick();
    setStep(1);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-25 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-2.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Narrative */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#10b981]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>04 / 05 • THE CUSTOMER HANDSHAKE • LIVE WHATSAPP</span>
          </div>

          <h2 className="font-sans text-3xl sm:text-5xl font-bold leading-[1.08] text-white tracking-tight">
            Conversational Rescue: In 3 Taps Under 60 Seconds
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            When a delivery attempt fails, calling call-centers is slow and frustrating. Rasai dispatches an
            official Meta WhatsApp Cloud API interactive utility message. The recipient confirms their availability,
            selects a new time slot, and transmits a high-precision GPS coordinate directly to the courier manifest.
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
              <span>EXPLORE SPEC §6 & §7 CONVERSATION ENGINE</span>
            </button>
            <span className="font-mono text-[11px] text-white/40">
              State: RESOLVED_RESCHEDULED (needsManifest = true)
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Smartphone Mockup */}
        <div className="w-full lg:w-96 bg-[#0a0a0a] border-4 border-[#262626] rounded-[2.5rem] p-4 shadow-2xl flex flex-col justify-between">
          {/* Phone Speaker Notch */}
          <div className="w-24 h-4 bg-[#262626] rounded-full mx-auto mb-3" />

          {/* WhatsApp Header */}
          <div className="bg-[#1f2c34] p-3 rounded-xl flex items-center justify-between text-white border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#128c7e] flex items-center justify-center font-bold text-xs text-white">
                R
              </div>
              <div>
                <div className="font-sans text-xs font-semibold flex items-center gap-1">
                  <span>Rasai Verified Logistics</span>
                  <CheckCheck className="w-3.5 h-3.5 text-[#34b7f1]" />
                </div>
                <div className="text-[10px] text-white/60">Official Delivery Concierge</div>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1 rounded text-white/50 hover:text-white cursor-pointer"
              title="Reset Conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Bubble Area */}
          <div className="py-4 space-y-3 font-sans text-xs min-h-[300px] flex flex-col justify-end">
            {/* Incoming Verified NDR Message */}
            <div className="bg-[#202c33] text-white p-3.5 rounded-2xl rounded-tl-none max-w-[90%] shadow space-y-1.5 self-start border border-white/5">
              <div className="font-bold text-[#25d366] text-[11px]">Leopards Express Delivery Notice</div>
              <p className="text-[12px] leading-relaxed text-[#e9edef]">
                Salam Bilal! Courier attempted delivery for parcel <strong>#PK-8842</strong> (Rs. 4,500 COD), but recorded you as unavailable.
              </p>
              <div className="text-[10px] text-white/40 text-right flex items-center justify-end gap-1">
                <span>09:47 AM</span>
                <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
              </div>
            </div>

            {/* Step 1: Interactive Quick Replies */}
            {step === 1 && (
              <div className="space-y-1.5 pt-2 animate-fade-in-headline">
                <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider text-center">
                  Select Quick Action:
                </div>
                <button
                  onClick={handleChooseReschedule}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule Delivery Slot</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleChooseReschedule}
                    className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[11px] text-center cursor-pointer border border-white/10"
                  >
                    Wrong Address
                  </button>
                  <button
                    onClick={handleChooseReschedule}
                    className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[11px] text-center cursor-pointer border border-white/10"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Date Selector */}
            {step === 2 && (
              <div className="space-y-2 pt-2 animate-fade-in-headline">
                <div className="bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tr-none self-end text-[11px] ml-auto">
                  Reschedule Delivery Slot
                </div>
                <div className="bg-[#202c33] text-white p-3 rounded-xl text-[11px] space-y-2">
                  <div className="text-white/80">Select when you will be available at home:</div>
                  <div className="space-y-1.5">
                    {['Tomorrow, 10:00 AM', 'Tomorrow Evening (6 PM - 9 PM)', 'Saturday Afternoon'].map((d) => (
                      <button
                        key={d}
                        onClick={() => handleSelectDate(d)}
                        className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-[#00a884] text-left text-white text-xs transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{d}</span>
                        <Clock className="w-3 h-3 text-white/50" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location Pin Drop */}
            {step === 3 && (
              <div className="space-y-2 pt-2 animate-fade-in-headline">
                <div className="bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tr-none self-end text-[11px] ml-auto">
                  {selectedDate}
                </div>
                <div className="bg-[#202c33] text-white p-3 rounded-xl text-[11px] space-y-2.5">
                  <div className="text-white/80">To prevent rider location errors, drop your live pin:</div>
                  <button
                    onClick={handleDropPin}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Drop Exact GPS Location Pin</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmed & Transitioned */}
            {step === 4 && (
              <div className="space-y-2 pt-2 animate-fade-in-headline">
                <div className="bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tr-none self-end text-[11px] ml-auto flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>GPS Pin Dropped (31.5204° N, 74.3587° E)</span>
                </div>
                <div className="bg-[#202c33] text-white p-3 rounded-xl text-[11px] space-y-1.5 border border-[#10b981]/40">
                  <div className="flex items-center gap-1 text-[#10b981] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reschedule Confirmed!</span>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    Dispatched to Islamabad hub morning manifest. Your rider has exact GPS coordinates.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* State Transition Status Bar */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
            <span className="text-white/40">Status:</span>
            <span className={step === 4 ? 'text-[#10b981] font-bold' : 'text-[#f59e0b]'}>
              {step === 4 ? 'RESOLVED_RESCHEDULED' : 'NDR_ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Editorial Drawer */}
      <EditorialDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapterNumber="04"
        stationName="Customer Handshake Engine"
        title="Meta Inbound Webhooks & Lease Relay"
        subtitle="Idempotent customer conversation flows surviving server crashes and duplicate deliveries"
        specSection="§6 & §7"
        content={{
          overview:
            'Rasai implements an atomic outbox lease relay. Messages are claimed with a 60-second lease so worker crashes never leave messages trapped in PROCESSING. Incoming customer WhatsApp responses are verified using HMAC SHA-256 (X-Hub-Signature-256) on raw request bytes and deduped via unique Meta wamid.',
          keyPoints: [
            {
              label: 'Zero PII in Outbox Queue',
              detail:
                'Outbox messages only carry shipment references. Phone numbers are decrypted on the fly at dispatch time, ensuring customer PII never leaks across secondary collections.',
            },
            {
              label: 'Atomic Mongo Claim with Lease',
              detail:
                'findOneAndUpdate atomically claims pending outbox rows with leaseUntil: now + 60s. Stale workers cannot overwrite reclaimed jobs.',
            },
            {
              label: 'Crash-Proof Provider Idempotency',
              detail:
                'If a worker sends a message to Meta but crashes before recording DISPATCHED, the providerMessageId check prevents re-sending duplicate messages on recovery.',
            },
            {
              label: 'needsManifest Flag Activated',
              detail:
                'The customer reschedule triggers MARK_NEEDS_MANIFEST, automatically pulling the parcel into the 07:30 PKT morning run-sheet.',
            },
          ],
          mathematicsOrRule:
            'CUSTOMER_RESCHEDULE + [NDR_ACTIVE] => next: RESOLVED_RESCHEDULED, effects: [MARK_NEEDS_MANIFEST]',
          codeSnippet: `// Signed Meta Webhook verification (§7.1)
export function verifyMetaSignature(req: Request, appSecret: string): boolean {
  const header = req.header('X-Hub-Signature-256') ?? '';
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}`,
        }}
      />
    </div>
  );
};

export default Chapter04WhatsApp;
