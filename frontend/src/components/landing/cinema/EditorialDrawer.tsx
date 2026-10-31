import React, { useEffect } from 'react';
import { X, ArrowRight, ShieldCheck, Database, Cpu, MessageSquare, FileText } from 'lucide-react';
import { soundEngine } from './SoundEngine';

export interface EditorialDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterNumber: string;
  stationName: string;
  title: string;
  subtitle: string;
  specSection: string;
  content: {
    overview: string;
    keyPoints: Array<{ label: string; detail: string }>;
    codeSnippet?: string;
    mathematicsOrRule?: string;
  };
}

export const EditorialDrawer: React.FC<EditorialDrawerProps> = ({
  isOpen,
  onClose,
  chapterNumber,
  stationName,
  title,
  subtitle,
  specSection,
  content,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        soundEngine.playRelayClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex justify-center items-center bg-black/85 backdrop-blur-md p-4 sm:p-6 transition-opacity duration-300 animate-fade-in-headline"
      onClick={() => {
        soundEngine.playRelayClick();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#121212] border border-[#c9a47a]/30 rounded-2xl shadow-2xl overflow-y-auto flex flex-col p-6 sm:p-10 text-[#f4efe8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-white/10 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 font-mono text-[11px] uppercase tracking-widest text-[#c9a47a]">
              <span>STOP {chapterNumber}</span>
              <span>•</span>
              <span>{stationName}</span>
              <span>•</span>
              <span className="text-white/40">SPEC REF: {specSection}</span>
            </div>
            <h2 className="font-sans text-3xl sm:text-4xl leading-tight font-bold text-white">
              {title}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/70 mt-1">
              {subtitle}
            </p>
          </div>
          <button
            onClick={() => {
              soundEngine.playRelayClick();
              onClose();
            }}
            className="p-2 rounded-full border border-white/20 hover:border-[#c9a47a] text-white hover:text-[#c9a47a] transition-colors cursor-pointer shrink-0 ml-4"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative Overview */}
        <div className="mb-8">
          <h3 className="font-mono text-xs uppercase tracking-widest text-[#c9a47a] mb-2 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            Architectural Intent & Mechanism
          </h3>
          <p className="font-sans text-sm sm:text-base leading-relaxed text-[#f4efe8]/85 font-light">
            {content.overview}
          </p>
        </div>

        {/* Key Architectural Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {content.keyPoints.map((pt, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[#dfc29f] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                {pt.label}
              </div>
              <p className="font-sans text-xs text-[#f4efe8]/70 leading-relaxed">
                {pt.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Optional Mathematics or Logic Rule */}
        {content.mathematicsOrRule && (
          <div className="mb-8 p-4 rounded-xl bg-[#1c1917]/70 border border-[#c9a47a]/40">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#dfc29f] mb-1.5 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              State Machine & Concurrency Invariant
            </h4>
            <pre className="font-mono text-xs text-[#f4efe8]/90 whitespace-pre-wrap leading-relaxed">
              {content.mathematicsOrRule}
            </pre>
          </div>
        )}

        {/* Optional Code Snippet */}
        {content.codeSnippet && (
          <div className="mb-6">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase text-white/50 mb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#c9a47a]" />
                Production Implementation Excerpt
              </span>
              <span>TypeScript</span>
            </div>
            <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-[#38bdf8] overflow-x-auto leading-relaxed">
              <code>{content.codeSnippet}</code>
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/50 font-mono">
          <span>AI-DLC Master Implementation Specification (v2)</span>
          <button
            onClick={() => {
              soundEngine.playRelayClick();
              onClose();
            }}
            className="flex items-center gap-1 text-[#dfc29f] hover:underline cursor-pointer"
          >
            <span>Return to Voyage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorialDrawer;
