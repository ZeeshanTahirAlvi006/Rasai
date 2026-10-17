import React, { useEffect, useState } from 'react';
import { soundEngine } from './SoundEngine';
import { Volume2, VolumeX } from 'lucide-react';

export const AudioPill: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());

  useEffect(() => {
    const unsub = soundEngine.subscribe((muted) => {
      setIsMuted(muted);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggle = () => {
    soundEngine.toggleMute();
  };

  return (
    <button
      onClick={handleToggle}
      className={`fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full border text-[11px] font-mono tracking-wider uppercase backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
        isMuted
          ? 'bg-[#141414]/80 text-[#f4efe8]/60 border-white/10 hover:border-[#c9a47a]/50 hover:text-[#f4efe8]'
          : 'bg-[#1c1917]/90 text-[#dfc29f] border-[#c9a47a]/60 shadow-[0_0_20px_rgba(201,164,122,0.25)]'
      }`}
      aria-label={isMuted ? 'Turn Sound On' : 'Mute Sound'}
      title={isMuted ? 'Enable atmospheric audio' : 'Mute atmospheric audio'}
    >
      {isMuted ? (
        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <div className="flex items-center gap-1">
          <Volume2 className="w-3.5 h-3.5 text-[#dfc29f]" />
          {/* Animated Equalizer bars */}
          <div className="flex items-end gap-0.5 h-3 w-3">
            <span className="w-0.5 bg-[#dfc29f] animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
            <span className="w-0.5 bg-[#dfc29f] animate-[pulse_0.6s_ease-in-out_infinite_0.2s] h-3" />
            <span className="w-0.5 bg-[#dfc29f] animate-[pulse_0.9s_ease-in-out_infinite_0.4s] h-1.5" />
          </div>
        </div>
      )}
      <span className="select-none">
        {isMuted ? 'Sound Off' : 'Atmosphere On'}
      </span>
    </button>
  );
};

export default AudioPill;
