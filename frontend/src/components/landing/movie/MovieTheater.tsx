import React from 'react';
import Scene1Packing from './Scene1Packing';
import { Film, PlayCircle, Clapperboard, Compass } from 'lucide-react';

export const MovieTheater: React.FC = () => {
  return (
    <section
      id="movie-theater"
      className="relative w-full py-20 px-4 sm:px-8 bg-[#0b0b0b] text-[#f4efe8] overflow-hidden"
      aria-label="The Story of a Saved Sale"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial from-[#1e1b18]/40 via-[#0b0b0b]/90 to-[#0b0b0b] pointer-events-none" />

      {/* Theater Section Header */}
      <div className="relative z-10 max-w-4xl mx-auto text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c9a47a]/40 bg-[#c9a47a]/10 text-[#dfc29f] font-mono text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(201,164,122,0.15)]">
          <Clapperboard className="w-3.5 h-3.5 text-[#c9a47a]" />
          <span>CINEMATIC NARRATIVE • SCENE 1 OF 7</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-5xl font-normal text-white tracking-tight leading-[1.08]">
          The Story of a Saved Delivery
        </h2>

        <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/70 max-w-2xl mx-auto leading-relaxed font-light">
          Experience the real-world human journey of a high-value Cash-on-Delivery parcel in Pakistan.
          Watch what happens when a customer misses the rider's call—and how Rasai intercepts the crisis.
        </p>
      </div>

      {/* Cinema Screen Stage: Scene 1 The Packing */}
      <div className="relative z-10">
        <Scene1Packing />
      </div>

      {/* Story Timeline Tracker */}
      <div className="relative z-10 max-w-5xl mx-auto mt-8 px-4">
        <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-3 border-b border-white/10 pb-2">
          <span className="flex items-center gap-1.5 text-white/80">
            <Film className="w-3.5 h-3.5 text-[#c9a47a]" />
            MOVIE SCENE TIMELINE
          </span>
          <span className="text-[#c9a47a]">Scene 1 Active</span>
        </div>

        {/* Scene Milestones Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-[10px]">
          <div className="p-2.5 rounded-xl border border-[#c9a47a] bg-[#c9a47a]/15 text-[#dfc29f] shadow-[0_0_12px_rgba(201,164,122,0.3)]">
            <div className="font-bold">01. PACKING</div>
            <div className="text-white/60 text-[9px] mt-0.5">Warehouse Dawn</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">02. CITY RUSH</div>
            <div className="text-white/30 text-[9px] mt-0.5">Rider on Bike</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">03. MISSED CALL</div>
            <div className="text-white/30 text-[9px] mt-0.5">Doorstep Crisis</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">04. WHATSAPP</div>
            <div className="text-white/30 text-[9px] mt-0.5">Rasai Rescue</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">05. HANDOVER</div>
            <div className="text-white/30 text-[9px] mt-0.5">COD Payment</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">06. CELEBRATION</div>
            <div className="text-white/30 text-[9px] mt-0.5">Saved Sale</div>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/40">
            <div className="font-bold">07. RASAI CLIMAX</div>
            <div className="text-white/30 text-[9px] mt-0.5">Logo Reveal</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MovieTheater;
