import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Compass } from 'lucide-react';
import { soundEngine } from './SoundEngine';
import AudioPill from './AudioPill';
import Chapter01Ingestion from './Chapter01Ingestion';
import Chapter02Resilience from './Chapter02Resilience';
import Chapter03Doorstep from './Chapter03Doorstep';
import Chapter04WhatsApp from './Chapter04WhatsApp';
import Chapter05ManifestMargin from './Chapter05ManifestMargin';
import LaunchpadStation from './LaunchpadStation';
import { RasaiUrduCalligraphy } from '../../common/RasaiUrduCalligraphy';

interface StationMeta {
  index: number;
  id: string;
  label: string;
  tag: string;
  component: React.ReactNode;
}

export const HorizontalCinemaTrack: React.FC = () => {
  const [currentStop, setCurrentStop] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const stations: StationMeta[] = [
    {
      index: 0,
      id: 'karachi-ingestion',
      label: '01 KARACHI',
      tag: 'Fleet Ingestion',
      component: <Chapter01Ingestion />,
    },
    {
      index: 1,
      id: 'transit-resilience',
      label: '02 TRANSIT',
      tag: 'Circuit Breakers',
      component: <Chapter02Resilience />,
    },
    {
      index: 2,
      id: 'lahore-intercept',
      label: '03 LAHORE',
      tag: 'Doorstep Intercept',
      component: <Chapter03Doorstep />,
    },
    {
      index: 3,
      id: 'customer-handshake',
      label: '04 WHATSAPP',
      tag: 'Customer Rescue',
      component: <Chapter04WhatsApp />,
    },
    {
      index: 4,
      id: 'islamabad-manifest',
      label: '05 ISLAMABAD',
      tag: '07:30 PKT & CPR',
      component: <Chapter05ManifestMargin />,
    },
    {
      index: 5,
      id: 'launchpad',
      label: '06 LAUNCHPAD',
      tag: 'Margin Recovery',
      component: <LaunchpadStation />,
    },
  ];

  const goToStop = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= stations.length) return;
      if (targetIndex === currentStop) return;

      soundEngine.playWhoosh();
      setCurrentStop(targetIndex);
    },
    [currentStop, stations.length]
  );

  const nextStop = useCallback(() => {
    if (currentStop < stations.length - 1) {
      goToStop(currentStop + 1);
    }
  }, [currentStop, goToStop, stations.length]);

  const prevStop = useCallback(() => {
    if (currentStop > 0) {
      goToStop(currentStop - 1);
    }
  }, [currentStop, goToStop]);

  // Keyboard navigation (Left / Right / Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextStop();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        prevStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStop, prevStop]);

  // Mouse wheel scroll to advance stops
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Don't intercept if an internal modal / drawer is scrolling
      const target = e.target as HTMLElement;
      if (target && target.closest('.overflow-y-auto')) {
        return;
      }

      if (isTransitioningRef.current) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 35) {
        isTransitioningRef.current = true;
        if (delta > 0) {
          nextStop();
        } else {
          prevStop();
        }
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 650);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [nextStop, prevStop]);

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;

    // Check if horizontal swipe exceeds 45px and dominates vertical movement
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        nextStop();
      } else {
        prevStop();
      }
    }
  };

  return (
    <section
      id="cinema-journey"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-screen min-h-dvh overflow-hidden bg-[#0b0b0b] text-[#f4efe8] select-none"
      aria-label="Rasai Horizontal Cinema Journey"
    >
      {/* Top Header Rail */}
      <header className="absolute top-0 left-0 right-0 z-40 px-6 sm:px-10 py-5 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          <RasaiUrduCalligraphy height={26} variant="white" className="select-none" />
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-white/50 border-l border-white/20 pl-4">
            <Compass className="w-3.5 h-3.5 text-[#c9a47a]" />
            <span>NATIONAL COD RESCUE VOYAGE</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="font-mono text-xs text-[#c9a47a]">
            {stations[currentStop].label}
          </div>
          <span className="hidden sm:inline font-mono text-xs text-white/40">
            {currentStop + 1} of {stations.length}
          </span>
        </div>
      </header>

      {/* Full-Screen Horizontal Moving Track */}
      <div
        className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{
          transform: `translateX(-${currentStop * 100}%)`,
        }}
      >
        {stations.map((s) => (
          <div
            key={s.id}
            className="w-full h-full shrink-0 flex items-center justify-center relative"
          >
            {s.component}
          </div>
        ))}
      </div>

      {/* Screen Side Navigation Arrow Buttons */}
      {currentStop > 0 && (
        <button
          onClick={prevStop}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/60 hover:bg-[#c9a47a] text-white hover:text-black border border-white/20 hover:border-[#c9a47a] transition-all cursor-pointer backdrop-blur shadow-2xl"
          aria-label="Previous Stop"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {currentStop < stations.length - 1 && (
        <button
          onClick={nextStop}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/60 hover:bg-[#c9a47a] text-white hover:text-black border border-white/20 hover:border-[#c9a47a] transition-all cursor-pointer backdrop-blur shadow-2xl"
          aria-label="Next Stop"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Bottom Milestone Navigation Rail */}
      <nav
        className="absolute bottom-5 sm:bottom-7 left-0 right-0 z-40 px-6 sm:px-12 flex items-center justify-between gap-4 pointer-events-auto"
        aria-label="Voyage Stops Navigation"
      >
        {/* Audio Pill on the Left */}
        <AudioPill />

        {/* Milestone Dots & Stops in Center */}
        <div className="flex items-center gap-2 sm:gap-4 bg-black/70 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md mx-auto shadow-xl overflow-x-auto max-w-[85vw] sm:max-w-none">
          {stations.map((s) => {
            const isActive = s.index === currentStop;
            return (
              <button
                key={s.id}
                onClick={() => goToStop(s.index)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#c9a47a] text-black font-bold shadow-[0_0_12px_rgba(201,164,122,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-black' : 'bg-white/40'
                  }`}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Swipe / Arrow Hint on the Right (Desktop only) */}
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] text-white/40 tracking-wider">
          <span>USE ARROW KEYS OR SWIPE</span>
        </div>
      </nav>
    </section>
  );
};

export default HorizontalCinemaTrack;
