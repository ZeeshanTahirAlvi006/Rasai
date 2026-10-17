import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../cinema/SoundEngine';

export const Scene1Packing: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGSVGElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [sealProgress, setSealProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastSoundProgressRef = useRef<number>(0);
  const dragStartClientXRef = useRef<number>(0);
  const dragStartProgressRef = useRef<number>(0);

  // Pupil eye tracking offset (tracks cursor / touch coordinates in SVG space)
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 1.2 });

  // Responsive device orientation tracking for full-bleed camera framing
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || window.innerWidth / window.innerHeight < 0.95;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const portrait = window.innerWidth < 768 || window.innerWidth / window.innerHeight < 0.95;
      setIsPortrait(portrait);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Character dialogue
  const dialogueFull = "Ye Lahore ka urgent COD parcel hai, customer ko kal lazmi milna chahiye.";

  // Scroll listener ONLY for camera descent through clouds (0.0 to 0.40) & dialogue reveal
  // NOTE: Package sealing is NEVER affected by scroll - only direct user interaction.
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track cursor position to have Tariq's pupils watch the cursor in real time
  useEffect(() => {
    let rafId: number;
    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!trackRef.current) return;
        const svg = trackRef.current;
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const svgPoint = point.matrixTransform(ctm.inverse());

        // Tariq's head eye position in SVG coordinates
        const eyeX = isPortrait ? 540 : 960;
        const eyeY = isPortrait ? 630 : 496;

        const dx = svgPoint.x - eyeX;
        const dy = svgPoint.y - eyeY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // Normalize and clamp pupil movement within the eye socket
        // Eye white rx is ~4.5, ry is ~2.4. Max pupil travel is 2.2px horizontal, 1.3px vertical.
        const intensity = Math.min(1, dist / 220);
        const maxOffsetX = 2.2;
        const maxOffsetY = 1.3;

        setPupilOffset({
          x: Math.cos(angle) * maxOffsetX * intensity,
          y: Math.sin(angle) * maxOffsetY * intensity,
        });
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [isPortrait]);

  // Handle Dragging to Seal Tape across the box seam with smooth delta dragging
  // Prevents teleporting or clicking anywhere to trigger early sealing
  const updateDragFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const svg = trackRef.current;
      const point1 = svg.createSVGPoint();
      point1.x = dragStartClientXRef.current;
      const point2 = svg.createSVGPoint();
      point2.x = clientX;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const inv = ctm.inverse();
      const svgX1 = point1.matrixTransform(inv).x;
      const svgX2 = point2.matrixTransform(inv).x;
      const deltaSvgX = svgX2 - svgX1;

      const seamLength = isPortrait ? 360 : 380;
      const addedProgress = deltaSvgX / seamLength;
      const targetProgress = Math.max(0, Math.min(1, dragStartProgressRef.current + addedProgress));

      setSealProgress((prev) => {
        // Can only advance forward as user physically pulls rightward across seam
        const next = Math.max(prev, targetProgress);
        if (next - lastSoundProgressRef.current > 0.12) {
          soundEngine.playTapePull();
          lastSoundProgressRef.current = next;
        }
        // SEALED stamp and chime strictly only trigger when the tape physically reaches the very end
        if (next >= 0.99) {
          if (lastSoundProgressRef.current < 0.99) {
            soundEngine.playCartonThud();
            soundEngine.playSuccessChime();
            lastSoundProgressRef.current = 1;
          }
          return 1;
        }
        return next;
      });
    },
    [isPortrait]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartClientXRef.current = e.clientX;
    dragStartProgressRef.current = sealProgress;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      updateDragFromClientX(e.clientX);
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateDragFromClientX]);

  // =========================================================================
  // ANIMATION TIMINGS & VALUES:
  // =========================================================================

  // 1. Cloud Plunge (0.0 -> 0.36)
  const cloudProgress = Math.max(0, Math.min(1, scrollProgress / 0.36));
  const cloudOpacity = Math.max(0, 1 - Math.pow(cloudProgress, 1.4));
  const cloudPartLeft = cloudProgress * -60; // percentage
  const cloudPartRight = cloudProgress * 60; // percentage
  const cloudScale = 1 + cloudProgress * 1.8;

  // Title on clouds
  const titleOpacity =
    scrollProgress < 0.04
      ? scrollProgress / 0.04
      : scrollProgress < 0.20
      ? 1
      : Math.max(0, 1 - (scrollProgress - 0.20) / 0.14);
  const titleScale = 0.96 + scrollProgress * 0.3;

  // 2. Seam Tape Geometry
  const seamLength = isPortrait ? 360 : 380;
  const tapeWidth = sealProgress * seamLength;
  const isFullySealed = sealProgress >= 0.99;

  // 3. Typewriter Dialogue (starts when warehouse is revealed at scrollProgress > 0.34)
  const dialogueTrigger = Math.max(0, Math.min(1, (scrollProgress - 0.34) / 0.32));
  const typedCharCount = Math.floor(dialogueTrigger * dialogueFull.length);
  const displayedDialogue = dialogueFull.slice(0, typedCharCount);
  const isTypingComplete = typedCharCount >= dialogueFull.length;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[300vh] bg-[#0b0b0b]"
      id="movie-scene-1"
      data-story-scene="true"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Sticky Full-Screen Viewport - 100vw x 100vh Edge-to-Edge */}
      <div className="sticky top-0 left-0 w-full h-screen h-dvh overflow-hidden flex items-center justify-center bg-[#07090e]">
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#07090e]">
          <svg
            ref={trackRef}
            viewBox={isPortrait ? '0 0 1080 1520' : '0 0 1920 1080'}
            className="w-full h-full object-cover select-none"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Keyframe Animations */}
              <style>{`
                @keyframes stampSlam {
                  0% {
                    opacity: 0;
                    transform: scale(3.2) rotate(-30deg);
                    filter: blur(4px);
                  }
                  55% {
                    opacity: 0.98;
                    transform: scale(0.90) rotate(-8deg);
                    filter: blur(0px);
                  }
                  75% {
                    transform: scale(1.06) rotate(-13deg);
                  }
                  100% {
                    opacity: 0.94;
                    transform: scale(1) rotate(-11deg);
                  }
                }
                .animate-stamp-slam {
                  animation: stampSlam 0.42s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
                }

                /* Industrial High-Bay Pendant Lamp Periodic Micro-Flicker */
                @keyframes industrialLampFlicker {
                  0%, 68%, 71%, 74%, 78%, 100% {
                    opacity: 1;
                    filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.45));
                  }
                  69% {
                    opacity: 0.24;
                    filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.05));
                  }
                  70% {
                    opacity: 0.92;
                    filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.35));
                  }
                  72% {
                    opacity: 0.14;
                    filter: drop-shadow(0 0 0px transparent);
                  }
                  73% {
                    opacity: 0.65;
                  }
                  75% {
                    opacity: 0.20;
                  }
                  76% {
                    opacity: 0.96;
                  }
                }
                .animate-lamp-flicker {
                  animation: industrialLampFlicker 6.2s infinite;
                }

                /* Synchronized Pendant Light Cone Pulsing */
                @keyframes lightConeFlicker {
                  0%, 68%, 71%, 74%, 78%, 100% { opacity: 0.65; }
                  69% { opacity: 0.16; }
                  70% { opacity: 0.58; }
                  72% { opacity: 0.09; }
                  73% { opacity: 0.42; }
                  75% { opacity: 0.14; }
                  76% { opacity: 0.64; }
                }
                .animate-cone-flicker {
                  animation: lightConeFlicker 6.2s infinite;
                }

                /* Natural Character Eye Blink (every ~4.2s) */
                @keyframes characterEyeBlink {
                  0%, 93%, 100% {
                    transform: scaleY(1);
                  }
                  95.5%, 97% {
                    transform: scaleY(0.08);
                  }
                }
                .animate-eye-blink {
                  animation: characterEyeBlink 4.2s ease-in-out infinite;
                }

                /* Realistic Natural Tea Steam Billowing & Drifting */
                @keyframes naturalSteamDrift1 {
                  0% {
                    opacity: 0;
                    transform: translate(0, 0) scale(0.6) rotate(0deg);
                  }
                  20% {
                    opacity: 0.75;
                    transform: translate(-3px, -15px) scale(0.9) rotate(-3deg);
                  }
                  50% {
                    opacity: 0.55;
                    transform: translate(4px, -34px) scale(1.3) rotate(4deg);
                  }
                  75% {
                    opacity: 0.25;
                    transform: translate(-2px, -52px) scale(1.7) rotate(-2deg);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(3px, -70px) scale(2.2) rotate(3deg);
                  }
                }
                @keyframes naturalSteamDrift2 {
                  0% {
                    opacity: 0;
                    transform: translate(0, 0) scale(0.5) rotate(0deg);
                  }
                  25% {
                    opacity: 0.7;
                    transform: translate(4px, -18px) scale(0.85) rotate(4deg);
                  }
                  60% {
                    opacity: 0.45;
                    transform: translate(-4px, -38px) scale(1.25) rotate(-3deg);
                  }
                  85% {
                    opacity: 0.2;
                    transform: translate(1px, -54px) scale(1.6) rotate(1deg);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(2px, -68px) scale(1.9) rotate(2deg);
                  }
                }
                @keyframes naturalSteamDrift3 {
                  0% {
                    opacity: 0;
                    transform: translate(0, 0) scale(0.7) rotate(0deg);
                  }
                  20% {
                    opacity: 0.8;
                    transform: translate(-2px, -12px) scale(0.95) rotate(-2deg);
                  }
                  50% {
                    opacity: 0.5;
                    transform: translate(3px, -28px) scale(1.4) rotate(3deg);
                  }
                  80% {
                    opacity: 0.18;
                    transform: translate(-3px, -48px) scale(1.8) rotate(-4deg);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(0px, -62px) scale(2.3) rotate(0deg);
                  }
                }
                .animate-steam-natural-1 {
                  animation: naturalSteamDrift1 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                .animate-steam-natural-2 {
                  animation: naturalSteamDrift2 3.8s cubic-bezier(0.4, 0, 0.2, 1) 1.2s infinite;
                }
                .animate-steam-natural-3 {
                  animation: naturalSteamDrift3 4.2s cubic-bezier(0.4, 0, 0.2, 1) 2.3s infinite;
                }

                @keyframes moteDriftA {
                  0%, 100% { transform: translate(0, 0); opacity: 0.35; }
                  50% { transform: translate(16px, -24px); opacity: 0.95; }
                }
                @keyframes moteDriftB {
                  0%, 100% { transform: translate(0, 0); opacity: 0.45; }
                  50% { transform: translate(-18px, -18px); opacity: 1; }
                }
                .animate-mote-a { animation: moteDriftA 5.5s ease-in-out infinite; }
                .animate-mote-b { animation: moteDriftB 7.5s ease-in-out 1.5s infinite; }

                @keyframes blinkDot {
                  0%, 100% { opacity: 0.2; }
                  50% { opacity: 1; }
                }
                .animate-blink-dot { animation: blinkDot 1.4s step-end infinite; }
              `}</style>

              {/* Filters for Volumetric Sunlight, Soft Steam & Shadows */}
              <filter id="naturalSteamBlur" x="-60%" y="-80%" width="220%" height="240%">
                <feGaussianBlur stdDeviation="3.0" result="blur" />
              </filter>
              <filter id="sunGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
              </filter>
              <filter id="sunShaftFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
              </filter>
              <filter id="shadowBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
              </filter>
              <filter id="contactShadowBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
              </filter>

              {/* Natural Tea Vapor Gradient */}
              <linearGradient id="teaVaporGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#fefce8" stopOpacity="0.55" />
                <stop offset="85%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* CARDBOARD KRAFT TEXTURE PATTERNS */}
              {/* Front Face Horizontal Flute Grain Pattern */}
              <pattern id="kraftGrain" width="40" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="2" x2="40" y2="2" stroke="#5a330e" strokeWidth="0.8" opacity="0.22" />
                <line x1="0" y1="4" x2="40" y2="4" stroke="#fef3c7" strokeWidth="0.5" opacity="0.12" />
                <line x1="0" y1="7" x2="40" y2="7" stroke="#3b1f0b" strokeWidth="0.7" opacity="0.18" />
                <line x1="0" y1="9" x2="40" y2="9" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
                <circle cx="8" cy="3" r="0.8" fill="#3b1f0b" opacity="0.28" />
                <circle cx="28" cy="8" r="0.9" fill="#3b1f0b" opacity="0.24" />
                <circle cx="18" cy="5" r="0.6" fill="#fef3c7" opacity="0.32" />
                <circle cx="36" cy="3" r="0.7" fill="#3b1f0b" opacity="0.2" />
              </pattern>

              {/* Top Face Angled Flute Pattern (calibrated to -29.05° isometric angle) */}
              <pattern id="kraftGrainTop" width="30" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(-29.05)">
                <line x1="0" y1="3" x2="30" y2="3" stroke="#5a330e" strokeWidth="0.8" opacity="0.22" />
                <line x1="0" y1="7" x2="30" y2="7" stroke="#fef3c7" strokeWidth="0.5" opacity="0.14" />
                <line x1="0" y1="11" x2="30" y2="11" stroke="#3b1f0b" strokeWidth="0.7" opacity="0.18" />
                <circle cx="12" cy="5" r="0.7" fill="#3b1f0b" opacity="0.25" />
                <circle cx="24" cy="12" r="0.6" fill="#fef3c7" opacity="0.28" />
              </pattern>

              {/* Side Face Skewed Flute Pattern (calibrated to -29.05° side slope) */}
              <pattern id="kraftGrainSide" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="skewY(-29.05)">
                <line x1="0" y1="4" x2="24" y2="4" stroke="#3b1f0b" strokeWidth="1" opacity="0.32" />
                <line x1="0" y1="12" x2="24" y2="12" stroke="#fef3c7" strokeWidth="0.5" opacity="0.12" />
                <line x1="0" y1="20" x2="24" y2="20" stroke="#251205" strokeWidth="0.8" opacity="0.25" />
              </pattern>

              {/* Fiberglass Reinforced Packing Tape Grid Mesh */}
              <pattern id="tapeFiber" width="14" height="14" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="14" y2="14" stroke="#ffffff" strokeWidth="0.7" opacity="0.3" />
                <line x1="14" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="0.7" opacity="0.3" />
                <line x1="0" y1="7" x2="14" y2="7" stroke="#ffffff" strokeWidth="0.5" opacity="0.22" />
              </pattern>

              {/* Warehouse Dawn Atmosphere Gradients */}
              <linearGradient id="wallDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#080b12" />
                <stop offset="60%" stopColor="#0f1522" />
                <stop offset="100%" stopColor="#182030" />
              </linearGradient>

              {/* Polished Concrete Floor with sheen */}
              <linearGradient id="concreteFloor" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e2532" />
                <stop offset="10%" stopColor="#161c28" />
                <stop offset="100%" stopColor="#0a0e16" />
              </linearGradient>

              {/* Volumetric Dawn Sunbeams from High Dispatch Opening */}
              <linearGradient id="sunBeamBroad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.45" />
                <stop offset="25%" stopColor="#fde047" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="sunBeamCore" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                <stop offset="20%" stopColor="#fef08a" stopOpacity="0.42" />
                <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>

              {/* Radiant Warm Pool on Workbench Surface */}
              <radialGradient id="sunBenchGlow" cx="60%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.32" />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.0" />
              </radialGradient>

              {/* Calculated Directional Cast Shadow (Stretching to Left from Sun Source) */}
              <linearGradient id="boxSunCastShadow" x1="100%" y1="0%" x2="0%" y2="70%">
                <stop offset="0%" stopColor="#030712" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#090d16" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#090d16" stopOpacity="0.0" />
              </linearGradient>

              {/* Overhead Pendant Lamp Light Cone */}
              <linearGradient id="pendantCone" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
                <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>

              {/* Outside Morning Sky */}
              <linearGradient id="dawnSky" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="50%" stopColor="#fdba74" />
                <stop offset="100%" stopColor="#93c5fd" />
              </linearGradient>

              {/* Heavy Timber Workbench Top */}
              <linearGradient id="benchSurface" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#54371f" />
                <stop offset="10%" stopColor="#3d2513" />
                <stop offset="100%" stopColor="#1a1108" />
              </linearGradient>

              {/* Self-Healing Green Cutting Mat */}
              <linearGradient id="cuttingMatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e3a29" />
                <stop offset="100%" stopColor="#0f291e" />
              </linearGradient>

              {/* Stainless Steel Digital Scale */}
              <linearGradient id="scaleSteelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="25%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#cbd5e1" />
                <stop offset="75%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* 3D Parcel Cardboard Gradients */}
              <linearGradient id="boxFrontGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#bd8147" />
                <stop offset="100%" stopColor="#99602b" />
              </linearGradient>
              <linearGradient id="boxTopGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#d1a66b" />
                <stop offset="100%" stopColor="#b4854b" />
              </linearGradient>
              <linearGradient id="boxSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7a4b1f" />
                <stop offset="100%" stopColor="#553111" />
              </linearGradient>

              {/* Brown Translucent Packing Tape */}
              <linearGradient id="tapeStripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e29b43" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#fff3db" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#b66714" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#824304" stopOpacity="0.9" />
              </linearGradient>

              {/* Metallic Polished Chrome for Pens & Clips */}
              <linearGradient id="penChromeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="35%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Industrial Tape Gun Chassis (Safety Orange) */}
              <linearGradient id="tapeGunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>

              {/* Woven Rasai Brand Lanyard Ribbon */}
              <linearGradient id="lanyardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            {/* =========================================================================
                RENDER CONDITIONAL: MOBILE PORTRAIT (1080x1520) vs DESKTOP (1920x1080)
                ========================================================================= */}
            {isPortrait ? (
              /* =====================================================================
                 MOBILE PORTRAIT FULL-BLEED STAGE (1080 x 1520)
                 ===================================================================== */
              <g id="mobile-portrait-stage">
                {/* Back Wall & Floor */}
                <rect width="1080" height="900" fill="url(#wallDark)" />
                <polygon points="0,850 1080,850 1080,1520 0,1520" fill="url(#concreteFloor)" />
                <line x1="0" y1="850" x2="1080" y2="850" stroke="#334155" strokeWidth="2" opacity="0.4" />

                {/* Ceiling Trusses */}
                <g opacity="0.75">
                  <rect x="0" y="0" width="1080" height="36" fill="#111827" />
                  <line x1="0" y1="36" x2="1080" y2="36" stroke="#1f2937" strokeWidth="3" />
                  <line x1="0" y1="68" x2="1080" y2="68" stroke="#1f2937" strokeWidth="2.5" />
                  {Array.from({ length: 9 }).map((_, i) => (
                    <g key={i} transform={`translate(${i * 120}, 0)`}>
                      <line x1="0" y1="36" x2="60" y2="68" stroke="#374151" strokeWidth="1.8" />
                      <line x1="60" y1="68" x2="120" y2="36" stroke="#374151" strokeWidth="1.8" />
                    </g>
                  ))}
                </g>

                {/* Overhead Digital Warehouse Clock */}
                <g transform="translate(540, 36)">
                  <rect x="-80" y="-12" width="160" height="24" rx="4" fill="#09090b" stroke="#374151" strokeWidth="1.5" />
                  <text x="-65" y="5" fill="#ef4444" fontSize="12" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">
                    07:42<tspan className="animate-blink-dot">:</tspan>18
                  </text>
                  <rect x="15" y="-6" width="50" height="13" rx="2" fill="#1e293b" />
                  <text x="21" y="4" fill="#f59e0b" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold">
                    PKT LIVE
                  </text>
                </g>

                {/* Central Pendant Lamp with Industrial Flicker */}
                <g className="animate-lamp-flicker">
                  <line x1="540" y1="68" x2="540" y2="120" stroke="#475569" strokeWidth="2.5" />
                  <path d="M515 120 L565 120 L575 135 L505 135 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
                  <ellipse cx="540" cy="135" rx="16" ry="4" fill="#fef08a" filter="drop-shadow(0 0 10px #fbbf24)" />
                </g>
                {/* Synchronized Flickering Downward Light Cone */}
                <polygon
                  points="515,135 565,135 880,880 200,880"
                  fill="url(#pendantCone)"
                  className="animate-cone-flicker"
                />

                {/* Upper Left: High Pallet Storage Shelves (With Cardboard Textures) */}
                <g transform="translate(40, 120)" opacity="0.9">
                  <rect x="0" y="0" width="12" height="420" fill="#1e293b" />
                  <rect x="180" y="0" width="12" height="420" fill="#1e293b" />
                  <rect x="0" y="140" width="192" height="10" fill="#ea580c" rx="1" />
                  <rect x="0" y="270" width="192" height="10" fill="#ea580c" rx="1" />
                  {/* Textured Pallet Boxes */}
                  <g transform="translate(16, 70)">
                    <rect width="70" height="68" fill="#78350f" rx="2" />
                    <rect width="70" height="68" fill="url(#kraftGrain)" rx="2" />
                    <rect x="0" y="30" width="70" height="10" fill="#15803d" opacity="0.9" />
                    <rect x="6" y="8" width="46" height="16" fill="#ffffff" rx="1" />
                    <text x="9" y="19" fill="#0f172a" fontSize="6" fontFamily="monospace" fontWeight="bold">
                      KARACHI
                    </text>
                  </g>
                  <g transform="translate(94, 80)">
                    <rect width="76" height="58" fill="#92400e" rx="2" />
                    <rect width="76" height="58" fill="url(#kraftGrain)" rx="2" />
                    <rect x="0" y="25" width="76" height="9" fill="#dc2626" opacity="0.9" />
                  </g>
                  <g transform="translate(16, 200)">
                    <rect width="80" height="68" fill="#9a622d" rx="2" />
                    <rect width="80" height="68" fill="url(#kraftGrain)" rx="2" />
                    <rect x="0" y="30" width="80" height="10" fill="#0284c7" opacity="0.9" />
                  </g>
                  <g transform="translate(104, 210)">
                    <rect width="66" height="58" fill="#78350f" rx="2" />
                    <rect width="66" height="58" fill="url(#kraftGrain)" rx="2" />
                  </g>
                </g>

                {/* Upper Right: Dispatch Bay Window with Realistic Volumetric Sunbeams */}
                <g transform="translate(820, 120)" opacity="0.95">
                  <rect width="220" height="280" fill="#0d1117" rx="6" />
                  <rect x="6" y="60" width="208" height="214" fill="url(#dawnSky)" rx="3" />
                  <rect x="6" y="200" width="208" height="74" fill="#475569" />
                  <rect x="30" y="160" width="110" height="55" rx="4" fill="#ffffff" />
                  <rect x="30" y="190" width="110" height="7" fill="#15803d" />
                  <circle cx="50" cy="215" r="9" fill="#1e293b" />
                  <circle cx="120" cy="215" r="9" fill="#1e293b" />

                  {/* Multiple Volumetric God Rays */}
                  <polygon points="10,60 210,60 0,720 -350,720" fill="url(#sunBeamBroad)" filter="url(#sunGlowFilter)" opacity="0.8" />
                  <polygon points="30,80 140,80 -50,680 -200,680" fill="url(#sunBeamCore)" filter="url(#sunShaftFilter)" opacity="0.9" />
                  <polygon points="120,60 190,60 50,680 -30,680" fill="url(#sunBeamCore)" filter="url(#sunShaftFilter)" opacity="0.75" />
                </g>

                {/* Animated Dust Motes Inside Sunbeams */}
                <g>
                  {[
                    { cx: 720, cy: 300, r: 2.2, cls: 'animate-mote-a' },
                    { cx: 650, cy: 450, r: 2.8, cls: 'animate-mote-b' },
                    { cx: 580, cy: 620, r: 3.0, cls: 'animate-mote-a' },
                    { cx: 480, cy: 750, r: 2.5, cls: 'animate-mote-b' },
                    { cx: 520, cy: 500, r: 1.8, cls: 'animate-mote-a' },
                  ].map((mote, i) => (
                    <circle
                      key={i}
                      cx={mote.cx}
                      cy={mote.cy}
                      r={mote.r}
                      fill="#fef08a"
                      className={mote.cls}
                      filter="drop-shadow(0 0 4px #fbbf24)"
                    />
                  ))}
                </g>

                {/* CHARACTER: TARIQ (CENTERED AT x=540, y=560) */}
                <g transform="translate(540, 560)">
                  {/* Torso & Uniform Shirt */}
                  <path
                    d="M-85 240 C-85 160, -55 125, 0 120 C55 125, 85 160, 85 240 Z"
                    fill="#1e293b"
                  />
                  {/* Heavy Twill Apron / Vest */}
                  <path
                    d="M-45 145 L45 145 L60 240 L-60 240 Z"
                    fill="#334155"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />

                  {/* Head & Neck Base */}
                  <rect x="-14" y="90" width="28" height="40" rx="4" fill="#c26839" />
                  {/* Collar / Chin Shadow */}
                  <path d="M-22 120 Q 0 138 22 120 Z" fill="#0f172a" opacity="0.6" />
                  <ellipse cx="0" cy="74" rx="36" ry="40" fill="#d97746" />
                  <ellipse cx="-36" cy="74" rx="6" ry="10" fill="#c26839" />
                  <ellipse cx="36" cy="74" rx="6" ry="10" fill="#c26839" />
                  {/* Cap & Visor */}
                  <path d="M-38 56 Q 0 28 38 56 Q 0 44 -38 56 Z" fill="#15803d" />
                  <path d="M-35 53 C-35 24, 35 24, 35 53 Z" fill="#166534" />
                  <path d="M-40 56 Q 0 48 44 64 Q 0 56 -40 56 Z" fill="#14532d" />
                  <ellipse cx="0" cy="65" rx="30" ry="8" fill="#000000" opacity="0.25" />

                  {/* Eyes Group with Periodic Blink and Real-Time Cursor Tracking */}
                  <g className="animate-eye-blink" style={{ transformOrigin: '0px 70px' }}>
                    {/* Left Eye */}
                    <ellipse cx="-12" cy="70" rx="4.2" ry="2.3" fill="#ffffff" />
                    <circle cx={-12 + pupilOffset.x} cy={70 + pupilOffset.y} r="1.8" fill="#111827" />
                    <circle cx={-12 + pupilOffset.x - 0.5} cy={70 + pupilOffset.y - 0.5} r="0.45" fill="#ffffff" />

                    {/* Right Eye */}
                    <ellipse cx="12" cy="70" rx="4.2" ry="2.3" fill="#ffffff" />
                    <circle cx={12 + pupilOffset.x} cy={70 + pupilOffset.y} r="1.8" fill="#111827" />
                    <circle cx={12 + pupilOffset.x - 0.5} cy={70 + pupilOffset.y - 0.5} r="0.45" fill="#ffffff" />
                  </g>

                  {/* Facial Details */}
                  <line x1="-20" y1="65" x2="-6" y2="67" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                  <line x1="20" y1="65" x2="6" y2="67" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                  <path d="M0 69 L-2 81 L3 82" stroke="#9a3412" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M-18 90 Q 0 85 18 90 Q 0 95 -18 90 Z" fill="#18181b" />
                  <line x1="-7" y1="97" x2="7" y2="97" stroke="#7c2d12" strokeWidth="1.8" strokeLinecap="round" />

                  {/* PERFECTLY ALIGNED WORKER LANYARD RIBBON AROUND NECK */}
                  <g id="mobile-tariq-lanyard">
                    {/* Left Lanyard Strap curving naturally over collar from back of neck */}
                    <path
                      d="M -14 116 C -20 128, -18 144, -2 164"
                      stroke="url(#lanyardGrad)"
                      strokeWidth="3.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M -14 116 C -20 128, -18 144, -2 164"
                      stroke="#38bdf8"
                      strokeWidth="0.8"
                      fill="none"
                      opacity="0.75"
                    />

                    {/* Right Lanyard Strap curving naturally over collar from back of neck */}
                    <path
                      d="M 14 116 C 20 128, 18 144, 2 164"
                      stroke="url(#lanyardGrad)"
                      strokeWidth="3.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 14 116 C 20 128, 18 144, 2 164"
                      stroke="#38bdf8"
                      strokeWidth="0.8"
                      fill="none"
                      opacity="0.75"
                    />

                    {/* Swivel Ring & Lobster Claw Clasp at Sternum */}
                    <circle cx="0" cy="165" r="2.8" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                    <rect x="-1.8" y="167" width="3.6" height="5.5" rx="1.2" fill="url(#penChromeGrad)" />
                    <rect x="-1.2" y="172" width="2.4" height="4.5" fill="#e2e8f0" opacity="0.85" />

                    {/* Tariq's Staff ID Card Badge (Hanging Dead-Center from Swivel Clasp) */}
                    <g transform="translate(0, 175)">
                      {/* Transparent Badge Sleeve with drop shadow */}
                      <rect x="-15" y="0" width="30" height="40" rx="2.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.9" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.4))" />
                      {/* Lanyard Hole Punch Slot */}
                      <rect x="-4.5" y="2.5" width="9" height="2" rx="1" fill="#475569" />
                      {/* Header Navy Band */}
                      <rect x="-13.5" y="6" width="27" height="9" rx="1" fill="#0369a1" />
                      <text x="0" y="12.5" fill="#f8fafc" fontSize="4.2" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
                        RASAI
                      </text>
                      {/* Staff Photo Avatar Box */}
                      <rect x="-12" y="17" width="10" height="12" rx="1" fill="#0f172a" />
                      <circle cx="-7" cy="22" r="3" fill="#d97746" />
                      <path d="M-10 28 C-10 26, -4 26, -4 28 Z" fill="#15803d" />
                      {/* Worker Details */}
                      <text x="2" y="22" fill="#0f172a" fontSize="3.8" fontFamily="sans-serif" fontWeight="bold">
                        TARIQ M.
                      </text>
                      <text x="2" y="27" fill="#0284c7" fontSize="2.8" fontFamily="sans-serif" fontWeight="bold">
                        DISPATCH
                      </text>
                      {/* Barcode Lines */}
                      <g transform="translate(-11, 31)">
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#000" strokeWidth="1.2" />
                        <line x1="3" y1="0" x2="3" y2="6" stroke="#000" strokeWidth="0.8" />
                        <line x1="6" y1="0" x2="6" y2="6" stroke="#000" strokeWidth="1.5" />
                        <line x1="10" y1="0" x2="10" y2="6" stroke="#000" strokeWidth="0.8" />
                        <line x1="14" y1="0" x2="14" y2="6" stroke="#000" strokeWidth="1.2" />
                        <line x1="18" y1="0" x2="18" y2="6" stroke="#000" strokeWidth="1.0" />
                        <line x1="21" y1="0" x2="21" y2="6" stroke="#000" strokeWidth="1.4" />
                      </g>
                    </g>
                  </g>

                  {/* HIGH-DEFINITION WORKER SHIRT POCKET & 3 DEFINED PENS */}
                  <g id="mobile-tariq-pocket-pens">
                    {/* Stitched Denim Chest Pocket Pouch */}
                    <path
                      d="M 18 174 L 18 200 Q 18 204 22 204 L 42 204 Q 46 204 46 200 L 46 174 Z"
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    {/* Double-Needle Yellow Stitching Line */}
                    <line x1="19" y1="177" x2="45" y2="177" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1.5,1.5" opacity="0.85" />
                    <line x1="19" y1="179" x2="45" y2="179" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1.5,1.5" opacity="0.85" />
                    {/* Pocket Shadow Interior */}
                    <rect x="19" y="174" width="26" height="3" fill="#090d16" opacity="0.6" />

                    {/* Pen 1 (Left): Royal Blue Click Ballpoint Pen */}
                    <g transform="translate(22, 155)">
                      {/* Top Chrome Click Plunger */}
                      <rect x="0" y="0" width="2.4" height="4" rx="0.5" fill="url(#penChromeGrad)" />
                      {/* Pen Barrel */}
                      <rect x="-0.3" y="4" width="3" height="22" rx="0.8" fill="#0284c7" />
                      {/* Chrome Accent Ring */}
                      <rect x="-0.3" y="11" width="3" height="1" fill="url(#penChromeGrad)" />
                      {/* Specular Barrel Streak */}
                      <line x1="0.5" y1="5" x2="0.5" y2="18" stroke="#93c5fd" strokeWidth="0.6" opacity="0.8" />
                      {/* Chrome Pocket Clip Clasping Over Pocket Hem */}
                      <path d="M 2.7 5 L 3.5 5 L 3.5 20 Q 3.5 22 2.2 22" fill="none" stroke="url(#penChromeGrad)" strokeWidth="1.1" strokeLinecap="round" />
                    </g>

                    {/* Pen 2 (Middle): Black & Gold Heavy Industrial Marker */}
                    <g transform="translate(30, 151)">
                      {/* Chunky Marker Cap Body */}
                      <rect x="0" y="0" width="4.5" height="26" rx="1.2" fill="#18181b" stroke="#27272a" strokeWidth="0.5" />
                      {/* Gold Accent Band */}
                      <rect x="0" y="10" width="4.5" height="1.8" fill="#eab308" />
                      {/* Ribbed Grip Indentations */}
                      <line x1="0.8" y1="4" x2="3.7" y2="4" stroke="#3f3f46" strokeWidth="0.5" />
                      <line x1="0.8" y1="7" x2="3.7" y2="7" stroke="#3f3f46" strokeWidth="0.5" />
                      {/* Heavy Black Clip Clasping Pocket */}
                      <path d="M 4.5 4 L 5.4 4 L 5.4 22 Q 5.4 24 3.8 24" fill="none" stroke="#52525b" strokeWidth="1.4" strokeLinecap="round" />
                    </g>

                    {/* Pen 3 (Right): Red Fine Quality-Control Inspector Pen */}
                    <g transform="translate(38, 157)">
                      {/* Silver Clicker Plunger */}
                      <rect x="0" y="0" width="2" height="3.5" rx="0.4" fill="url(#penChromeGrad)" />
                      {/* Red Barrel */}
                      <rect x="-0.3" y="3.5" width="2.6" height="20" rx="0.6" fill="#dc2626" />
                      {/* Specular Highlight */}
                      <line x1="0.4" y1="4.5" x2="0.4" y2="17" stroke="#fca5a5" strokeWidth="0.5" />
                      {/* Chrome Clip Clasping Pocket */}
                      <path d="M 2.3 5 L 3.1 5 L 3.1 19 Q 3.1 20.5 2 20.5" fill="none" stroke="url(#penChromeGrad)" strokeWidth="0.9" strokeLinecap="round" />
                    </g>
                  </g>
                </g>

                {/* TIMBER WORKBENCH (IMPROVED WITH BUTCHER-BLOCK PLANKS & BEVELED EDGES) */}
                <polygon points="40,820 1040,820 1080,1520 0,1520" fill="url(#benchSurface)" />
                {/* Plank Seam Lines */}
                <line x1="50" y1="940" x2="1050" y2="940" stroke="#251408" strokeWidth="1.2" opacity="0.45" />
                <line x1="30" y1="1080" x2="1065" y2="1080" stroke="#251408" strokeWidth="1.2" opacity="0.4" />
                <line x1="15" y1="1240" x2="1075" y2="1240" stroke="#251408" strokeWidth="1.2" opacity="0.35" />
                {/* Steel Rail Top Fascia */}
                <rect x="40" y="816" width="1000" height="8" fill="#475569" />

                {/* GREEN CUTTING MAT ON BENCH */}
                <g transform="translate(140, 828)">
                  <polygon points="0,0 800,0 830,340 -30,340" fill="url(#cuttingMatGrad)" stroke="#166534" strokeWidth="1.5" />
                  {Array.from({ length: 14 }).map((_, i) => (
                    <line key={i} x1={i * 60} y1="0" x2={i * 60 + 20} y2="340" stroke="#22c55e" strokeWidth="0.8" opacity="0.28" />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line key={i} x1={-15 + i * 5} y1={i * 55} x2={810 + i * 5} y2={i * 55} stroke="#22c55e" strokeWidth="0.8" opacity="0.28" />
                  ))}
                  {/* Sun Pool Luminous Overlay on Workbench */}
                  <polygon points="260,0 790,0 810,260 200,260" fill="url(#sunBenchGlow)" opacity="0.4" />
                </g>

                {/* PROPS ON WORKBENCH (PERFECTLY ARRANGED & SPACED) */}
                {/* 1. Authentic Steaming Dhabba Chai Glass & Saucer (Far Left Corner) */}
                <g transform="translate(100, 840)">
                  {/* Chai Directional Cast Shadow */}
                  <ellipse cx="6" cy="56" rx="22" ry="8" fill="#000000" opacity="0.5" filter="url(#shadowBlur)" />
                  {/* Stainless Steel Saucer */}
                  <ellipse cx="14" cy="50" rx="22" ry="6" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                  <ellipse cx="14" cy="48" rx="18" ry="4.5" fill="#cbd5e1" />
                  {/* Glass Body */}
                  <path d="M3 15 L25 15 L22 47 L6 47 Z" fill="#f8fafc" fillOpacity="0.35" stroke="#cbd5e1" strokeWidth="1.2" />
                  <path d="M5 24 L23 24 L21 46 L7 46 Z" fill="#d97706" fillOpacity="0.9" />
                  <line x1="8" y1="44" x2="20" y2="6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  {/* Specular Catchlight */}
                  <ellipse cx="14" cy="15" rx="10" ry="2" fill="#ffffff" opacity="0.6" />

                  {/* Natural Billowing Hot Chai Steam Wisps */}
                  <g filter="url(#naturalSteamBlur)" style={{ transformOrigin: '14px 10px' }}>
                    <path
                      d="M 12 12 Q 8 2 14 -12 T 10 -34 T 16 -54"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-1"
                    />
                    <path
                      d="M 9 14 Q 3 4 11 -8 T 5 -28 T 12 -46"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-2"
                    />
                    <path
                      d="M 17 14 Q 22 6 15 -6 T 20 -24 T 14 -42"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-3"
                    />
                  </g>
                </g>

                {/* 2. DAILY DISPATCH REGISTER (SECURELY ON TABLE, CENTERED AT x=210, y=930) */}
                <g transform="translate(210, 930) rotate(165)">
                  {/* Hardbound Register Base with Shadow */}
                  <rect x="-50" y="-70" width="100" height="140" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.6))" />
                  {/* Brass Corner Protectors */}
                  <polygon points="-50,-70 -38,-70 -50,-58" fill="#d97706" />
                  <polygon points="50,-70 38,-70 50,-58" fill="#d97706" />
                  <polygon points="-50,70 -38,70 -50,58" fill="#d97706" />
                  <polygon points="50,70 38,70 50,58" fill="#d97706" />
                  {/* Metal Clamp (At Top From Tariq's Perspective) */}
                  <rect x="-25" y="-78" width="50" height="15" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
                  <circle cx="0" cy="-71" r="2.5" fill="#475569" />
                  {/* Ledger Page */}
                  <rect x="-44" y="-58" width="88" height="120" rx="2" fill="#fdfbf7" />
                  {/* Header facing Tariq */}
                  <text x="-40" y="-46" fill="#0f172a" fontSize="5.5" fontFamily="sans-serif" fontWeight="900">
                    DAILY DISPATCH REGISTER
                  </text>
                  <text x="-40" y="-38" fill="#475569" fontSize="4.2" fontFamily="monospace">
                    BATCH #PK-409 • 07:30 PKT
                  </text>
                  <line x1="-40" y1="-34" x2="40" y2="-34" stroke="#cbd5e1" strokeWidth="0.8" />
                  {/* Lined Ledger Rows */}
                  <g transform="translate(-40, -24)">
                    <text x="0" y="0" fill="#10b981" fontSize="5.0" fontFamily="monospace" fontWeight="bold">
                      [✓] ORD-8841 (ISB)
                    </text>
                    <rect x="-2" y="5" width="80" height="11" fill="#fef08a" rx="1" />
                    <text x="0" y="13" fill="#991b1b" fontSize="5.0" fontFamily="monospace" fontWeight="900">
                      [➔] ORD-8842 (LHR) COD
                    </text>
                    <text x="0" y="26" fill="#64748b" fontSize="5.0" fontFamily="monospace">
                      [ ] ORD-8843 (KHI)
                    </text>
                  </g>
                  {/* Tariq's Signature Pen Resting on Register */}
                  <line x1="-30" y1="45" x2="30" y2="15" stroke="#0284c7" strokeWidth="2.8" strokeLinecap="round" />
                  <line x1="25" y1="17.5" x2="33" y2="13.5" stroke="url(#penChromeGrad)" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="-28" cy="44" r="1.8" fill="#1e293b" />
                </g>

                {/* 3. Right-Side Tooling Zone: Barcode Scanner in Dock */}
                <g transform="translate(910, 840)">
                  <ellipse cx="10" cy="52" rx="24" ry="9" fill="#000000" opacity="0.45" filter="url(#shadowBlur)" />
                  <ellipse cx="20" cy="44" rx="22" ry="7" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                  <g transform="translate(18, 10) rotate(-22)">
                    <rect x="-10" y="-24" width="20" height="34" rx="3" fill="#eab308" stroke="#ca8a04" strokeWidth="0.8" />
                    <rect x="-7" y="10" width="14" height="30" rx="2" fill="#1f2937" />
                    <circle cx="-12" cy="38" r="2" fill="#ef4444" filter="drop-shadow(0 0 3px #ef4444)" />
                  </g>
                </g>

                {/* 4. Industrial Heavy-Duty Packing Tape Dispenser Gun (Right Side) */}
                <g transform="translate(815, 940) rotate(-12)">
                  <ellipse cx="15" cy="45" rx="28" ry="10" fill="#000000" opacity="0.5" filter="url(#shadowBlur)" />
                  {/* Pistol Grip Handle */}
                  <rect x="0" y="20" width="14" height="30" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                  {/* Tape Gun Metal Housing */}
                  <path d="M -5 20 L 35 10 L 40 28 L 5 32 Z" fill="url(#tapeGunGrad)" />
                  {/* Brown Packing Tape Spool Core */}
                  <circle cx="8" cy="8" r="22" fill="#b45309" stroke="#78350f" strokeWidth="1.2" />
                  <circle cx="8" cy="8" r="16" fill="#ca8a04" />
                  <circle cx="8" cy="8" r="9" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                  {/* Serrated Cutting Blade at Front */}
                  <line x1="36" y1="12" x2="38" y2="26" stroke="url(#penChromeGrad)" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* 5. Rubber Stamp Pad Tin (Front-Right Tooling) */}
                <g transform="translate(805, 1020)">
                  <ellipse cx="15" cy="18" rx="22" ry="7" fill="#000000" opacity="0.4" filter="url(#shadowBlur)" />
                  <rect width="32" height="22" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1" />
                  <rect x="3" y="3" width="26" height="16" rx="1.5" fill="#09090b" />
                  <rect x="5" y="5" width="22" height="12" rx="1" fill="#18181b" />
                </g>

                {/* CALCULATED DIRECTIONAL SHADOW: Reduced Parcel blocks morning sunlight */}
                <polygon
                  points="360,1060 220,1105 240,935 360,890"
                  fill="url(#boxSunCastShadow)"
                  filter="url(#shadowBlur)"
                />

                {/* STAINLESS STEEL SCALE UNDER PARCEL (MATHEMATICALLY ENCLOSES REDUCED PARCEL) */}
                <g id="mobile-scale-assembly">
                  {/* Ambient Occlusion Shadow Under Scale Chassis */}
                  <ellipse cx="560" cy="1102" rx="320" ry="20" fill="#020617" opacity="0.68" filter="url(#shadowBlur)" />

                  {/* Stainless Steel Heavy Platter Top Surface */}
                  <polygon
                    points="300,1074 405,1016 885,1016 780,1074"
                    fill="url(#scaleSteelGrad)"
                    stroke="#475569"
                    strokeWidth="1.2"
                  />
                  {/* Platter Polished Rim Bevel */}
                  <polygon points="300,1074 780,1074 780,1088 300,1088" fill="#94a3b8" />
                  <polygon points="780,1074 885,1016 885,1030 780,1088" fill="#64748b" />

                  {/* Scale Lower Chassis & Leveling Feet */}
                  <polygon points="315,1088 765,1088 765,1102 315,1102" fill="#1e293b" />
                  <rect x="325" y="1102" width="20" height="6" rx="1.5" fill="#0f172a" />
                  <rect x="740" y="1102" width="20" height="6" rx="1.5" fill="#0f172a" />
                  <rect x="860" y="1030" width="16" height="5" rx="1.5" fill="#0f172a" />

                  {/* Contact Shadow of Parcel on the Scale Platter */}
                  <polygon
                    points="360,1060 720,1060 780,1027 420,1027"
                    fill="#020617"
                    opacity="0.45"
                    filter="url(#contactShadowBlur)"
                  />

                  {/* Digital Weight Readout on Scale Front Apron */}
                  <g transform="translate(450, 1079)">
                    <rect width="160" height="18" rx="2.5" fill="#09090b" stroke="#1e293b" strokeWidth="1" />
                    <text x="12" y="13.5" fill="#22c55e" fontSize="12" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">
                      1.450 KG
                    </text>
                    <circle cx="118" cy="9" r="2.2" fill="#22c55e" />
                    <text x="125" y="11" fill="#22c55e" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold">
                      STABLE
                    </text>
                  </g>
                </g>

                {/* =====================================================================
                    REDUCED-SIZE 3D PARCEL WITH REALISTIC KRAFT TEXTURE (MOBILE)
                    ===================================================================== */}
                {/* 1. Box Base Faces: Front (360x170), Side (dx=60, dy=-33), Top */}
                <polygon points="360,890 720,890 720,1060 360,1060" fill="url(#boxFrontGrad)" />
                <polygon points="720,890 780,857 780,1027 720,1060" fill="url(#boxSideGrad)" />
                <polygon points="360,890 420,857 780,857 720,890" fill="url(#boxTopGrad)" />

                {/* 2. Micro-Flute Kraft Cardboard Grain Textures */}
                <polygon points="360,890 720,890 720,1060 360,1060" fill="url(#kraftGrain)" />
                <polygon points="720,890 780,857 780,1027 720,1060" fill="url(#kraftGrainSide)" />
                <polygon points="360,890 420,857 780,857 720,890" fill="url(#kraftGrainTop)" />

                {/* 3. Authentic Fold Creases & Sunlight Highlights */}
                <line x1="360" y1="890" x2="720" y2="890" stroke="#fef08a" strokeWidth="1.2" opacity="0.45" />
                <line x1="720" y1="890" x2="720" y2="1060" stroke="#251205" strokeWidth="2.2" opacity="0.75" />
                <line x1="360" y1="890" x2="360" y2="1060" stroke="#3b1f0b" strokeWidth="1.8" opacity="0.6" />
                <line x1="720" y1="890" x2="780" y2="857" stroke="#fef08a" strokeWidth="2" opacity="0.65" />
                <line x1="780" y1="857" x2="780" y2="1027" stroke="#fef08a" strokeWidth="1.8" opacity="0.55" />
                <line x1="360" y1="890" x2="420" y2="857" stroke="#fef08a" strokeWidth="1.2" opacity="0.35" />

                {/* Contact Shadow Under Box on Scale Platter */}
                <polygon points="355,1060 725,1060 785,1027 775,1022 360,1056" fill="#020617" opacity="0.6" filter="url(#contactShadowBlur)" />

                {/* 4. Heavy Copper Staples along Left Seam */}
                {[915, 965, 1015].map((stapleY, idx) => (
                  <rect key={idx} x="363" y={stapleY} width="2.5" height="11" rx="0.8" fill="#b45309" stroke="#78350f" strokeWidth="0.7" />
                ))}

                {/* 5. Box Manufacturer's Certificate (BMC) Ink Stamp */}
                <g transform="translate(545, 1010)">
                  <circle cx="0" cy="0" r="16" fill="none" stroke="#3b1f0b" strokeWidth="1.2" strokeDasharray="12 2 15 2" opacity="0.55" />
                  <circle cx="0" cy="0" r="13" fill="none" stroke="#3b1f0b" strokeWidth="0.7" opacity="0.5" />
                  <text x="0" y="-7" fill="#3b1f0b" fontSize="3.4" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.6">
                    BOX CERTIFICATE
                  </text>
                  <text x="0" y="-2" fill="#3b1f0b" fontSize="2.8" fontFamily="sans-serif" textAnchor="middle" opacity="0.55">
                    SINGLEWALL
                  </text>
                  <text x="0" y="3" fill="#3b1f0b" fontSize="3.2" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.6">
                    BURST 200 LBS
                  </text>
                  <text x="0" y="8" fill="#3b1f0b" fontSize="2.8" fontFamily="sans-serif" textAnchor="middle" opacity="0.55">
                    GROSS 65 LBS
                  </text>
                  <text x="0" y="12" fill="#3b1f0b" fontSize="2.6" fontFamily="monospace" textAnchor="middle" opacity="0.5">
                    LAHORE PK
                  </text>
                </g>

                {/* 6. Handling Stencils on Isometric Side Face (Aligned with -28.8° slope) */}
                <g transform="translate(732, 882) skewY(-28.8)">
                  {/* THIS WAY UP Arrows */}
                  <g transform="translate(14, 10)">
                    <line x1="0" y1="20" x2="0" y2="4" stroke="#251205" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                    <path d="M-3.5 9 L0 2 L3.5 9" fill="none" stroke="#251205" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  </g>
                  <g transform="translate(32, 10)">
                    <line x1="0" y1="20" x2="0" y2="4" stroke="#251205" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                    <path d="M-3.5 9 L0 2 L3.5 9" fill="none" stroke="#251205" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  </g>

                  {/* Keep Dry Umbrella */}
                  <g transform="translate(16, 40)">
                    <path d="M0 7 Q 7 -2 14 7 Z" fill="#251205" opacity="0.8" />
                    <line x1="7" y1="5" x2="7" y2="15" stroke="#251205" strokeWidth="1.4" opacity="0.8" />
                    <path d="M7 15 Q 5.5 18 3 17" fill="none" stroke="#251205" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
                  </g>

                  {/* Max Weight */}
                  <text x="24" y="74" fill="#251205" fontSize="5.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.8">
                    MAX: 35 KG
                  </text>
                  <text x="24" y="90" fill="#251205" fontSize="6.8" fontFamily="sans-serif" textAnchor="middle" opacity="0.75">
                    ♲ RECYCLED
                  </text>
                  <text x="24" y="102" fill="#251205" fontSize="4.8" fontFamily="monospace" textAnchor="middle" opacity="0.65">
                    LOT #PK-409
                  </text>
                </g>

                {/* Top Flute Edge Cut Line */}
                <line x1="390" y1="873.5" x2="750" y2="873.5" stroke="#3b1f0b" strokeWidth="1.8" strokeDasharray="3,2" opacity="0.7" />

                {/* Dotted Guideline & Slide Prompt */}
                {!isFullySealed && (
                  <g onPointerDown={handlePointerDown} className="cursor-pointer select-none" style={{ touchAction: 'none' }}>
                    <rect x="360" y="830" width="410" height="85" fill="transparent" className="cursor-grab active:cursor-grabbing" />
                    <line
                      x1={Math.max(390, 390 + tapeWidth)}
                      y1="873.5"
                      x2="750"
                      y2="873.5"
                      stroke="#fbbf24"
                      strokeWidth="3.2"
                      strokeDasharray="7,5"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    <circle cx="750" cy="873.5" r="4.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.8" />
                    {sealProgress < 0.65 && (
                      <g transform="translate(570, 845)" className="pointer-events-none transition-opacity duration-200" style={{ opacity: Math.max(0, 1 - sealProgress * 1.6) }}>
                        <rect x="-105" y="-14" width="210" height="22" rx="11" fill="#0a0e17" fillOpacity="0.92" stroke="#fbbf24" strokeWidth="1.2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))" />
                        <text x="0" y="1" fill="#fef08a" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1.2">
                          SLIDE TAPE TO SEAL BOX ➔
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Applied Tape (Brown Translucent + Fiberglass Reinforcement Grid) */}
                {tapeWidth > 0 && (
                  <g>
                    <polygon
                      points={`390,873.5 ${390 + tapeWidth},873.5 ${390 + tapeWidth + 5},869 395,869`}
                      fill="url(#tapeStripGrad)"
                      opacity="0.95"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    />
                    <polygon
                      points={`390,873.5 ${390 + tapeWidth},873.5 ${390 + tapeWidth + 5},869 395,869`}
                      fill="url(#tapeFiber)"
                      opacity="0.45"
                    />
                  </g>
                )}

                {/* Shipping Label on Front (Crisply Sized 180x110) */}
                <g transform="translate(375, 910)">
                  <rect width="180" height="110" rx="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))" />
                  <rect x="0" y="0" width="180" height="22" fill="#0f172a" rx="2.5" />
                  <text x="10" y="15" fill="#f59e0b" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                    LEOPARDS COD EXPRESS
                  </text>
                  <g transform="translate(10, 28)">
                    <line x1="0" y1="0" x2="0" y2="22" stroke="#000" strokeWidth="2.5" />
                    <line x1="5" y1="0" x2="5" y2="22" stroke="#000" strokeWidth="1.2" />
                    <line x1="10" y1="0" x2="10" y2="22" stroke="#000" strokeWidth="3" />
                    <line x1="16" y1="0" x2="16" y2="22" stroke="#000" strokeWidth="1.5" />
                    <line x1="22" y1="0" x2="22" y2="22" stroke="#000" strokeWidth="3" />
                    <line x1="28" y1="0" x2="28" y2="22" stroke="#000" strokeWidth="1.2" />
                    <line x1="34" y1="0" x2="34" y2="22" stroke="#000" strokeWidth="2.5" />
                    <line x1="41" y1="0" x2="41" y2="22" stroke="#000" strokeWidth="3.2" />
                    <line x1="48" y1="0" x2="48" y2="22" stroke="#000" strokeWidth="1.5" />
                  </g>
                  <text x="76" y="38" fill="#0f172a" fontSize="9.2" fontFamily="monospace" fontWeight="bold">
                    DEST: LAHORE, PK
                  </text>
                  <text x="76" y="50" fill="#475569" fontSize="7.8" fontFamily="monospace">
                    TRACK: #PK-8842
                  </text>
                  <rect x="8" y="60" width="164" height="40" rx="2.5" fill="#fef2f2" stroke="#ef4444" strokeWidth="0.8" />
                  <text x="12" y="74" fill="#991b1b" fontSize="7.8" fontFamily="sans-serif" fontWeight="bold">
                    CASH ON DELIVERY (COD):
                  </text>
                  <text x="12" y="92" fill="#b91c1c" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                    RS. 4,500 /-
                  </text>
                </g>

                {/* Fragile Stamp (Cleanly Positioned Top-Right of Front Face) */}
                <g transform="translate(585, 905) rotate(-5)">
                  <rect width="90" height="36" rx="4" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="3,2" />
                  <text x="10" y="16" fill="#dc2626" fontSize="10" fontFamily="sans-serif" fontWeight="900" letterSpacing="1.2">
                    FRAGILE
                  </text>
                  <text x="16" y="29" fill="#dc2626" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
                    احتیـــاط
                  </text>
                </g>

                {/* ROUND BLACK SEALED STAMP (Slams on Front-Right) */}
                {isFullySealed && (
                  <g className="animate-stamp-slam select-none" style={{ transformOrigin: '635px 985px' }}>
                    <g transform="translate(635, 985) rotate(-11)">
                      <circle cx="0" cy="0" r="40" fill="none" stroke="#09090b" strokeWidth="3" strokeDasharray="70 2 40 3 28 2" opacity="0.94" />
                      <circle cx="0" cy="0" r="34" fill="#09090b" fillOpacity="0.04" stroke="#09090b" strokeWidth="1.4" opacity="0.88" />
                      <circle cx="0" cy="0" r="28" fill="none" stroke="#09090b" strokeWidth="1" strokeDasharray="3,3" opacity="0.75" />
                      <g transform="translate(0, -19)">
                        <text x="0" y="0" fill="#09090b" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1.5" opacity="0.85">
                          ★ ★ ★
                        </text>
                      </g>
                      <text x="0" y="-9.5" fill="#09090b" fontSize="6" fontFamily="sans-serif" fontWeight="800" textAnchor="middle" letterSpacing="1.2" opacity="0.8">
                        VERIFIED
                      </text>
                      <line x1="-31" y1="-7" x2="31" y2="-7" stroke="#09090b" strokeWidth="1.6" opacity="0.9" />
                      <line x1="-31" y1="10" x2="31" y2="10" stroke="#09090b" strokeWidth="1.6" opacity="0.9" />
                      <text x="0" y="5.5" fill="#09090b" fontSize="15" fontFamily="Impact, sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="2" opacity="0.96">
                        SEALED
                      </text>
                      <text x="0" y="20" fill="#09090b" fontSize="5.8" fontFamily="sans-serif" fontWeight="800" textAnchor="middle" letterSpacing="1" opacity="0.8">
                        INSPECTED & PASSED
                      </text>
                    </g>
                  </g>
                )}

                {/* Draggable Red Tape Gun */}
                <g
                  transform={`translate(${390 + tapeWidth}, 850)`}
                  onPointerDown={handlePointerDown}
                  className="cursor-grab active:cursor-grabbing transition-transform duration-75 select-none"
                  style={{ touchAction: 'none' }}
                >
                  <path d="M-5 -25 L25 -25 L32 0 L-2 10 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2.5" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))" />
                  <circle cx="12" cy="-12" r="14" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                  <circle cx="12" cy="-12" r="5" fill="#1e293b" />
                  <rect x="-10" y="5" width="12" height="26" rx="3" fill="#0f172a" />
                  <rect x="22" y="2" width="8" height="6" fill="#475569" />
                </g>

                {/* Typewriter Speech Bubble Above Tariq */}
                {displayedDialogue.length > 0 && (
                  <g transform="translate(320, 390)">
                    <polygon points="220,88 240,105 230,88" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.5" />
                    <rect x="0" y="0" width="440" height="88" rx="16" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.5" filter="drop-shadow(0 10px 24px rgba(0,0,0,0.8))" />
                    <rect x="20" y="-10" width="110" height="20" rx="4" fill="#c9a47a" />
                    <text x="26" y="4" fill="#000000" fontSize="9.5" fontFamily="sans-serif" fontWeight="bold" letterSpacing="1">
                      TARIQ (PACKER)
                    </text>
                    <text x="20" y="36" fill="#ffffff" fontSize="14.5" fontFamily="sans-serif" fontWeight="600">
                      "{displayedDialogue.slice(0, 36)}
                    </text>
                    <text x="20" y="62" fill="#e2e8f0" fontSize="14.5" fontFamily="sans-serif" fontWeight="600">
                      {displayedDialogue.slice(36)}
                      {!isTypingComplete && <tspan fill="#f59e0b" className="animate-pulse">|</tspan>}
                      {isTypingComplete && '"'}
                    </text>
                  </g>
                )}
              </g>
            ) : (
              /* =====================================================================
                 DESKTOP WIDESCREEN FULL-BLEED STAGE (1920 x 1080)
                 ===================================================================== */
              <g id="desktop-widescreen-stage">
                {/* Back Wall with Subtle Brick Coursing */}
                <rect width="1920" height="720" fill="url(#wallDark)" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={60 + i * 50}
                    x2="1920"
                    y2={60 + i * 50}
                    stroke="#1f2937"
                    strokeWidth="0.8"
                    opacity="0.3"
                  />
                ))}

                {/* Warehouse Concrete Floor */}
                <polygon points="0,680 1920,680 1920,1080 0,1080" fill="url(#concreteFloor)" />
                <line x1="0" y1="680" x2="1920" y2="680" stroke="#334155" strokeWidth="2.5" opacity="0.5" />

                {/* Ceiling Heavy Steel Trusses */}
                <g opacity="0.75">
                  <rect x="0" y="0" width="1920" height="36" fill="#111827" />
                  <line x1="0" y1="36" x2="1920" y2="36" stroke="#1f2937" strokeWidth="4" />
                  <line x1="0" y1="72" x2="1920" y2="72" stroke="#1f2937" strokeWidth="3" />
                  {Array.from({ length: 16 }).map((_, i) => (
                    <g key={i} transform={`translate(${i * 120}, 0)`}>
                      <line x1="0" y1="36" x2="60" y2="72" stroke="#374151" strokeWidth="2" />
                      <line x1="60" y1="72" x2="120" y2="36" stroke="#374151" strokeWidth="2" />
                      <line x1="60" y1="36" x2="60" y2="72" stroke="#374151" strokeWidth="1.5" />
                    </g>
                  ))}
                </g>

                {/* LIVE DIGITAL WAREHOUSE CLOCK ON THE CENTRAL ROOF GIRDER */}
                <g transform="translate(960, 36)">
                  <rect x="-85" y="-12" width="170" height="26" rx="4" fill="#09090b" stroke="#374151" strokeWidth="1.5" />
                  <text x="-70" y="6" fill="#ef4444" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">
                    07:42<tspan className="animate-blink-dot">:</tspan>18
                  </text>
                  <rect x="15" y="-6" width="55" height="15" rx="2" fill="#1e293b" />
                  <text x="22" y="5" fill="#f59e0b" fontSize="8" fontFamily="sans-serif" fontWeight="bold">
                    PKT LIVE
                  </text>
                </g>

                {/* High-Bay Overhead Pendant Lamps */}
                <g>
                  {/* Left Lamp */}
                  <line x1="360" y1="72" x2="360" y2="135" stroke="#475569" strokeWidth="2" />
                  <path d="M340 135 L380 135 L390 150 L330 150 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                  <polygon points="340,150 380,150 520,680 200,680" fill="url(#sunBeamBroad)" opacity="0.35" />

                  {/* Center Lamp directly over Tariq's bench with authentic industrial micro-flicker */}
                  <g className="animate-lamp-flicker">
                    <line x1="960" y1="72" x2="960" y2="125" stroke="#475569" strokeWidth="2.5" />
                    <path d="M935 125 L985 125 L995 142 L925 142 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
                    <ellipse cx="960" cy="142" rx="18" ry="4" fill="#fef08a" filter="drop-shadow(0 0 12px #fbbf24)" />
                  </g>
                  {/* Synchronized Flickering Downward Cone */}
                  <polygon
                    points="935,142 985,142 1280,720 640,720"
                    fill="url(#pendantCone)"
                    className="animate-cone-flicker"
                  />

                  {/* Right Lamp */}
                  <line x1="1560" y1="72" x2="1560" y2="135" stroke="#475569" strokeWidth="2" />
                  <path d="M1540 135 L1580 135 L1590 150 L1530 150 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                </g>

                {/* LEFT WING: TOWERING PALLET STORAGE RACKS */}
                <g id="pallet-racks">
                  <rect x="60" y="72" width="18" height="608" fill="#1e293b" />
                  <rect x="260" y="72" width="18" height="608" fill="#1e293b" />
                  <rect x="460" y="72" width="18" height="608" fill="#1e293b" />
                  <rect x="640" y="72" width="18" height="608" fill="#1e293b" />

                  {/* Safety First Emblem Sign on Column 1 */}
                  <g transform="translate(69, 260)">
                    <circle cx="0" cy="0" r="18" fill="#15803d" stroke="#ffffff" strokeWidth="1.5" />
                    <path d="M-6 -2 L6 -2 M0 -8 L0 4" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                    <text x="0" y="11" fill="#ffffff" fontSize="5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                      SAFETY
                    </text>
                  </g>

                  {/* Convex Forklift Safety Mirror on Column 4 */}
                  <g transform="translate(649, 170)">
                    <line x1="0" y1="0" x2="14" y2="-10" stroke="#64748b" strokeWidth="2" />
                    <circle cx="18" cy="-14" r="14" fill="#94a3b8" stroke="#f59e0b" strokeWidth="2" />
                    <circle cx="18" cy="-14" r="11" fill="#cbd5e1" opacity="0.6" />
                    <path d="M12 -18 Q 18 -22 24 -16" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                  </g>

                  {/* Yellow/Black Safety Striping on Column Footers */}
                  {[60, 260, 460, 640].map((colX, idx) => (
                    <g key={idx} transform={`translate(${colX}, 630)`}>
                      <rect width="18" height="50" fill="#f59e0b" />
                      <line x1="0" y1="10" x2="18" y2="0" stroke="#111827" strokeWidth="3" />
                      <line x1="0" y1="25" x2="18" y2="15" stroke="#111827" strokeWidth="3" />
                      <line x1="0" y1="40" x2="18" y2="30" stroke="#111827" strokeWidth="3" />
                    </g>
                  ))}

                  {/* Horizontal Load Beams */}
                  <rect x="60" y="210" width="598" height="14" fill="#ea580c" rx="2" />
                  <rect x="60" y="390" width="598" height="14" fill="#ea580c" rx="2" />
                  <rect x="60" y="560" width="598" height="14" fill="#ea580c" rx="2" />

                  {/* Diagonal Upright Bracing */}
                  {[72, 250, 430].map((braceY, i) => (
                    <g key={i}>
                      <line x1="60" y1={braceY} x2="260" y2={braceY + 90} stroke="#334155" strokeWidth="2.5" />
                      <line x1="260" y1={braceY} x2="460" y2={braceY + 90} stroke="#334155" strokeWidth="2.5" />
                      <line x1="460" y1={braceY} x2="640" y2={braceY + 90} stroke="#334155" strokeWidth="2.5" />
                    </g>
                  ))}

                  {/* Stacked Cartons on Shelves with Textured Overlays */}
                  <g transform="translate(85, 110)">
                    <rect width="145" height="100" fill="#78350f" rx="3" stroke="#451a03" strokeWidth="1" />
                    <rect width="145" height="100" fill="url(#kraftGrain)" rx="3" />
                    <rect x="0" y="45" width="145" height="14" fill="#15803d" opacity="0.9" />
                    <rect x="15" y="15" width="90" height="24" fill="#f8fafc" rx="2" />
                    <text x="20" y="31" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      KARACHI (COD)
                    </text>

                    <rect x="155" y="15" width="180" height="85" fill="#92400e" rx="3" />
                    <rect x="155" y="15" width="180" height="85" fill="url(#kraftGrain)" rx="3" />
                    <rect x="155" y="55" width="180" height="12" fill="#ea580c" opacity="0.9" />
                    <rect x="175" y="25" width="85" height="24" fill="#fef3c7" rx="2" />
                    <text x="180" y="41" fill="#78350f" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      MULTAN HUB
                    </text>

                    <rect x="345" y="30" width="135" height="70" fill="#78350f" rx="3" />
                    <rect x="345" y="30" width="135" height="70" fill="url(#kraftGrain)" rx="3" />
                  </g>

                  <g transform="translate(85, 290)">
                    <rect width="165" height="100" fill="#9a622d" rx="3" />
                    <rect width="165" height="100" fill="url(#kraftGrain)" rx="3" />
                    <rect x="0" y="50" width="165" height="12" fill="#0284c7" opacity="0.9" />
                    <rect x="20" y="20" width="95" height="24" fill="#ffffff" rx="2" />
                    <text x="25" y="36" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      PESHAWAR EXP
                    </text>

                    <rect x="175" y="10" width="155" height="90" fill="#78350f" rx="3" />
                    <rect x="175" y="10" width="155" height="90" fill="url(#kraftGrain)" rx="3" />
                    <rect x="195" y="25" width="95" height="24" fill="#fee2e2" rx="2" />
                    <text x="200" y="41" fill="#991b1b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      ISLAMABAD COD
                    </text>

                    <rect x="340" y="25" width="145" height="75" fill="#b45309" rx="3" />
                    <rect x="340" y="25" width="145" height="75" fill="url(#kraftGrain)" rx="3" />
                  </g>

                  <g transform="translate(85, 460)">
                    <rect width="180" height="100" fill="#583413" rx="3" />
                    <rect width="180" height="100" fill="url(#kraftGrain)" rx="3" />
                    <text x="30" y="50" fill="#ef4444" fontSize="12" fontFamily="sans-serif" fontWeight="900" letterSpacing="1">
                      FRAGILE
                    </text>
                    <rect x="190" y="15" width="170" height="85" fill="#6a4c2e" rx="3" />
                    <rect x="190" y="15" width="170" height="85" fill="url(#kraftGrain)" rx="3" />
                    <text x="210" y="60" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      SUKKUR #290
                    </text>
                  </g>

                  {/* Pallet Jack */}
                  <g transform="translate(510, 630)">
                    <rect x="-80" y="32" width="95" height="10" fill="#eab308" rx="2" />
                    <circle cx="-75" cy="44" r="5" fill="#1e293b" />
                    <circle cx="10" cy="44" r="7" fill="#1e293b" />
                    <rect x="12" y="15" width="14" height="25" fill="#ca8a04" />
                    <line x1="20" y1="18" x2="42" y2="-20" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
                    <ellipse cx="45" cy="-22" rx="7" ry="5" fill="#ca8a04" stroke="#111827" strokeWidth="1.5" />
                  </g>
                </g>

                {/* RIGHT WING: OPEN DISPATCH BAY & REALISTIC VOLUMETRIC SUNLIGHT */}
                <g id="dispatch-bay">
                  <g transform="translate(1610, 52)">
                    <rect x="-110" y="-12" width="220" height="28" rx="4" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
                    <text x="0" y="6" fill="#000000" fontSize="11" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="1.2">
                      DISPATCH BAY 03 • برائے ترسیل
                    </text>
                  </g>
                  <g transform="translate(1380, 75)">
                    <rect x="-5" y="-5" width="10" height="12" fill="#334155" />
                    <ellipse cx="0" cy="12" rx="10" ry="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <circle cx="0" cy="14" r="4" fill="#0f172a" />
                    <circle cx="5" cy="8" r="1.5" fill="#22c55e" className="animate-blink-dot" />
                  </g>

                  <rect x="1360" y="80" width="500" height="600" fill="#0d1117" rx="8" />
                  <g transform="translate(1360, 80)">
                    <rect width="500" height="160" fill="#334155" stroke="#1e293b" strokeWidth="3" />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={i} x1="0" y1={i * 20} x2="500" y2={i * 20} stroke="#1e293b" strokeWidth="3" />
                    ))}
                    <rect x="0" y="150" width="500" height="14" fill="#0f172a" />
                  </g>

                  <g transform="translate(1370, 240)">
                    <rect width="480" height="435" fill="url(#dawnSky)" />
                    <path d="M0 320 Q 80 290 180 310 Q 280 280 380 300 Q 440 290 480 310 L480 350 L0 350 Z" fill="#fdba74" opacity="0.6" />
                    <path d="M120 120 Q 125 116 130 120 Q 135 116 140 120" stroke="#0f172a" strokeWidth="1.2" fill="none" opacity="0.6" />
                    <rect x="0" y="340" width="480" height="95" fill="#475569" />
                    <line x1="40" y1="365" x2="160" y2="365" stroke="#fef08a" strokeWidth="3" strokeDasharray="12,8" />
                    <line x1="260" y1="365" x2="420" y2="365" stroke="#fef08a" strokeWidth="3" strokeDasharray="12,8" />

                    {/* Van 1 */}
                    <g transform="translate(30, 230)">
                      <rect width="180" height="95" rx="6" fill="#f8fafc" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.3))" />
                      <path d="M140 0 L180 35 L180 95 L140 95 Z" fill="#e2e8f0" />
                      <polygon points="144,8 172,35 144,35" fill="#0284c7" opacity="0.8" />
                      <rect x="0" y="52" width="180" height="12" fill="#15803d" />
                      <text x="14" y="61" fill="#ffffff" fontSize="7.5" fontFamily="sans-serif" fontWeight="900" letterSpacing="0.8">
                        LEOPARDS EXPRESS
                      </text>
                      <circle cx="35" cy="95" r="16" fill="#1e293b" />
                      <circle cx="145" cy="95" r="16" fill="#1e293b" />
                      <rect x="-10" y="10" width="12" height="75" fill="#0f172a" />
                      <rect x="5" y="25" width="22" height="18" fill="#b45309" />
                    </g>

                    {/* Van 2 */}
                    <g transform="translate(260, 250)" opacity="0.95">
                      <rect width="160" height="85" rx="5" fill="#f1f5f9" />
                      <polygon points="120,0 155,30 155,85 120,85" fill="#cbd5e1" />
                      <rect x="0" y="45" width="160" height="10" fill="#dc2626" />
                      <text x="12" y="53" fill="#ffffff" fontSize="6.5" fontFamily="sans-serif" fontWeight="bold">
                        TRAX LOGISTICS
                      </text>
                      <circle cx="30" cy="85" r="14" fill="#1e293b" />
                      <circle cx="125" cy="85" r="14" fill="#1e293b" />
                    </g>
                  </g>

                  {/* REALISTIC MULTI-LAYER VOLUMETRIC SUNBEAMS */}
                  {/* Broad Ambient Sun Cone */}
                  <polygon points="1370,240 1850,240 1350,1080 500,1080" fill="url(#sunBeamBroad)" filter="url(#sunGlowFilter)" opacity="0.85" />
                  {/* Intense Golden Core Shaft 1 - Aimed directly across the workbench */}
                  <polygon points="1420,240 1620,240 1080,1080 820,1080" fill="url(#sunBeamCore)" filter="url(#sunShaftFilter)" opacity="0.95" />
                  {/* Collimated Core Shaft 2 */}
                  <polygon points="1660,240 1820,240 1480,1080 1260,1080" fill="url(#sunBeamCore)" filter="url(#sunShaftFilter)" opacity="0.75" />

                  {/* Slanted Shadow Mullion Bars across Sunbeams */}
                  <polygon points="1450,240 1475,240 910,1080 885,1080" fill="#080c14" opacity="0.4" filter="url(#shadowBlur)" />
                  <polygon points="1620,240 1648,240 1220,1080 1192,1080" fill="#080c14" opacity="0.35" filter="url(#shadowBlur)" />

                  {/* Sunlit Dust Motes Catching Specular Glow */}
                  <g>
                    {[
                      { cx: 1450, cy: 350, r: 2.5, cls: 'animate-mote-a' },
                      { cx: 1520, cy: 420, r: 3.5, cls: 'animate-mote-b' },
                      { cx: 1390, cy: 480, r: 2.0, cls: 'animate-mote-a' },
                      { cx: 1480, cy: 550, r: 3.0, cls: 'animate-mote-b' },
                      { cx: 1320, cy: 620, r: 2.5, cls: 'animate-mote-a' },
                      { cx: 1220, cy: 720, r: 3.5, cls: 'animate-mote-b' },
                      { cx: 1150, cy: 780, r: 2.2, cls: 'animate-mote-a' },
                      { cx: 1050, cy: 680, r: 2.8, cls: 'animate-mote-b' },
                      { cx: 980, cy: 620, r: 2.0, cls: 'animate-mote-a' },
                      { cx: 890, cy: 750, r: 2.4, cls: 'animate-mote-b' },
                    ].map((mote, i) => (
                      <circle
                        key={i}
                        cx={mote.cx}
                        cy={mote.cy}
                        r={mote.r}
                        fill="#fef08a"
                        className={mote.cls}
                        filter="drop-shadow(0 0 5px #fbbf24)"
                      />
                    ))}
                  </g>
                </g>

                {/* TARIQ AT WORKBENCH */}
                <g transform="translate(960, 420)">
                  {/* Torso & Uniform Shirt */}
                  <path d="M-95 260 C-95 175, -60 135, 0 130 C60 135, 95 175, 95 260 Z" fill="#1e293b" />
                  {/* Heavy Twill Apron / Vest */}
                  <path d="M-50 155 L50 155 L65 260 L-65 260 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />

                  {/* Head & Neck Base */}
                  <rect x="-16" y="98" width="32" height="42" rx="4" fill="#c26839" />
                  {/* Collar / Chin Shadow */}
                  <path d="M-24 130 Q 0 148 24 130 Z" fill="#0f172a" opacity="0.6" />
                  <ellipse cx="0" cy="80" rx="38" ry="42" fill="#d97746" />
                  <ellipse cx="-38" cy="80" rx="6" ry="11" fill="#c26839" />
                  <ellipse cx="38" cy="80" rx="6" ry="11" fill="#c26839" />
                  {/* Cap & Visor */}
                  <path d="M-40 62 Q 0 32 40 62 Q 0 50 -40 62 Z" fill="#15803d" />
                  <path d="M-37 59 C-37 28, 37 28, 37 59 Z" fill="#166534" />
                  <path d="M-42 62 Q 0 54 46 70 Q 0 62 -42 62 Z" fill="#14532d" />
                  <ellipse cx="0" cy="71" rx="32" ry="9" fill="#000000" opacity="0.25" />

                  {/* Tariq's Eyes Group with Realistic Periodic Blink and Cursor Tracking */}
                  <g className="animate-eye-blink" style={{ transformOrigin: '0px 76px' }}>
                    {/* Left Eye White & Tracking Pupil */}
                    <ellipse cx="-13" cy="76" rx="4.5" ry="2.4" fill="#ffffff" />
                    <circle cx={-13 + pupilOffset.x} cy={76 + pupilOffset.y} r="2.0" fill="#111827" />
                    <circle cx={-13 + pupilOffset.x - 0.6} cy={76 + pupilOffset.y - 0.5} r="0.5" fill="#ffffff" />

                    {/* Right Eye White & Tracking Pupil */}
                    <ellipse cx="13" cy="76" rx="4.5" ry="2.4" fill="#ffffff" />
                    <circle cx={13 + pupilOffset.x} cy={76 + pupilOffset.y} r="2.0" fill="#111827" />
                    <circle cx={13 + pupilOffset.x - 0.6} cy={76 + pupilOffset.y - 0.5} r="0.5" fill="#ffffff" />
                  </g>

                  {/* Facial Features */}
                  <line x1="-22" y1="71" x2="-7" y2="73" stroke="#1f2937" strokeWidth="3.2" strokeLinecap="round" />
                  <line x1="22" y1="71" x2="7" y2="73" stroke="#1f2937" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M0 75 L-2 88 L3 89" stroke="#9a3412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  <path d="M-20 98 Q 0 92 20 98 Q 0 104 -20 98 Z" fill="#18181b" />
                  <line x1="-8" y1="106" x2="8" y2="106" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />

                  {/* PERFECTLY ALIGNED WORKER LANYARD RIBBON AROUND NECK */}
                  <g id="desktop-tariq-lanyard">
                    {/* Left Lanyard Ribbon curving naturally from behind neck over collar */}
                    <path
                      d="M -16 124 C -24 138, -20 156, -2 174"
                      stroke="url(#lanyardGrad)"
                      strokeWidth="3.8"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M -16 124 C -24 138, -20 156, -2 174"
                      stroke="#38bdf8"
                      strokeWidth="0.9"
                      fill="none"
                      opacity="0.75"
                    />

                    {/* Right Lanyard Ribbon curving naturally from behind neck over collar */}
                    <path
                      d="M 16 124 C 24 138, 20 156, 2 174"
                      stroke="url(#lanyardGrad)"
                      strokeWidth="3.8"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 16 124 C 24 138, 20 156, 2 174"
                      stroke="#38bdf8"
                      strokeWidth="0.9"
                      fill="none"
                      opacity="0.75"
                    />

                    {/* Swivel Ring & Carabiner Clasp at Sternum */}
                    <circle cx="0" cy="175" r="3.2" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
                    <rect x="-2" y="177" width="4" height="6.5" rx="1.5" fill="url(#penChromeGrad)" />
                    <rect x="-1.5" y="183" width="3" height="5.5" fill="#e2e8f0" opacity="0.85" />

                    {/* Tariq's Staff ID Card Badge (Hanging Symmetrically from Clasp) */}
                    <g transform="translate(0, 187)">
                      <rect x="-18" y="0" width="36" height="48" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.45))" />
                      {/* Lanyard Punch Slot */}
                      <rect x="-5.5" y="3" width="11" height="2.5" rx="1.2" fill="#475569" />
                      {/* Top Header Banner */}
                      <rect x="-16" y="7" width="32" height="11" rx="1.2" fill="#0369a1" />
                      <text x="0" y="15" fill="#f8fafc" fontSize="4.8" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="0.8">
                        RASAI
                      </text>
                      {/* Photo Avatar Thumbnail */}
                      <rect x="-14" y="20" width="12" height="14" rx="1" fill="#0f172a" />
                      <circle cx="-8" cy="25" r="3.5" fill="#d97746" />
                      <path d="M-12 33 C-12 30, -4 30, -4 33 Z" fill="#15803d" />
                      {/* Staff Info */}
                      <text x="1" y="26" fill="#0f172a" fontSize="4.5" fontFamily="sans-serif" fontWeight="bold">
                        TARIQ M.
                      </text>
                      <text x="1" y="32" fill="#0284c7" fontSize="3.4" fontFamily="sans-serif" fontWeight="bold">
                        DISPATCH
                      </text>
                      {/* Micro Barcode */}
                      <g transform="translate(-13, 37)">
                        <line x1="0" y1="0" x2="0" y2="7" stroke="#000" strokeWidth="1.2" />
                        <line x1="3" y1="0" x2="3" y2="7" stroke="#000" strokeWidth="0.8" />
                        <line x1="6" y1="0" x2="6" y2="7" stroke="#000" strokeWidth="1.5" />
                        <line x1="11" y1="0" x2="11" y2="7" stroke="#000" strokeWidth="0.8" />
                        <line x1="15" y1="0" x2="15" y2="7" stroke="#000" strokeWidth="1.4" />
                        <line x1="20" y1="0" x2="20" y2="7" stroke="#000" strokeWidth="1.0" />
                        <line x1="24" y1="0" x2="24" y2="7" stroke="#000" strokeWidth="1.6" />
                      </g>
                    </g>
                  </g>

                  {/* HIGH-DEFINITION WORKER SHIRT POCKET & 3 DEFINED PENS */}
                  <g id="desktop-tariq-pocket-pens">
                    {/* Stitched Denim Chest Pocket Pouch */}
                    <path
                      d="M 22 178 L 22 208 Q 22 212 26 212 L 52 212 Q 56 212 56 208 L 56 178 Z"
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    {/* Double-Needle Yellow Stitching Line */}
                    <line x1="23" y1="181" x2="55" y2="181" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1.5,1.5" opacity="0.85" />
                    <line x1="23" y1="183" x2="55" y2="183" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1.5,1.5" opacity="0.85" />
                    {/* Pocket Shadow Interior */}
                    <rect x="23" y="178" width="32" height="4" fill="#090d16" opacity="0.65" />

                    {/* Pen 1 (Left): Royal Blue Click Ballpoint Pen */}
                    <g transform="translate(26, 157)">
                      {/* Top Chrome Click Plunger */}
                      <rect x="0" y="0" width="2.6" height="4.5" rx="0.6" fill="url(#penChromeGrad)" />
                      {/* Pen Barrel */}
                      <rect x="-0.3" y="4.5" width="3.2" height="24" rx="0.8" fill="#0284c7" />
                      {/* Chrome Collar Ring */}
                      <rect x="-0.3" y="12" width="3.2" height="1.2" fill="url(#penChromeGrad)" />
                      {/* Specular Barrel Streak */}
                      <line x1="0.6" y1="5.5" x2="0.6" y2="20" stroke="#93c5fd" strokeWidth="0.6" opacity="0.85" />
                      {/* Chrome Pocket Clip Gripping Pocket Hem */}
                      <path d="M 2.9 5.5 L 3.8 5.5 L 3.8 22 Q 3.8 24 2.4 24" fill="none" stroke="url(#penChromeGrad)" strokeWidth="1.2" strokeLinecap="round" />
                    </g>

                    {/* Pen 2 (Middle): Black & Gold Heavy Industrial Marker */}
                    <g transform="translate(36, 152)">
                      {/* Chunky Marker Cap Body */}
                      <rect x="0" y="0" width="5.2" height="29" rx="1.4" fill="#18181b" stroke="#27272a" strokeWidth="0.6" />
                      {/* Gold Accent Band */}
                      <rect x="0" y="11" width="5.2" height="2.2" fill="#eab308" />
                      {/* Ribbed Grip Indentations */}
                      <line x1="1" y1="4.5" x2="4.2" y2="4.5" stroke="#3f3f46" strokeWidth="0.6" />
                      <line x1="1" y1="8" x2="4.2" y2="8" stroke="#3f3f46" strokeWidth="0.6" />
                      {/* Heavy Black Clip Clasping Pocket */}
                      <path d="M 5.2 4.5 L 6.2 4.5 L 6.2 24 Q 6.2 26.5 4.5 26.5" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
                    </g>

                    {/* Pen 3 (Right): Red Fine Quality Inspector Pen */}
                    <g transform="translate(46, 159)">
                      {/* Silver Clicker Plunger */}
                      <rect x="0" y="0" width="2.2" height="4" rx="0.5" fill="url(#penChromeGrad)" />
                      {/* Red Barrel */}
                      <rect x="-0.3" y="4" width="2.8" height="22" rx="0.7" fill="#dc2626" />
                      {/* Specular Highlight */}
                      <line x1="0.5" y1="5" x2="0.5" y2="19" stroke="#fca5a5" strokeWidth="0.5" />
                      {/* Chrome Clip Clasping Pocket */}
                      <path d="M 2.5 5.5 L 3.4 5.5 L 3.4 21 Q 3.4 22.5 2.2 22.5" fill="none" stroke="url(#penChromeGrad)" strokeWidth="1.0" strokeLinecap="round" />
                    </g>
                  </g>
                </g>

                {/* HEAVY TIMBER WORKBENCH (IMPROVED BUTCHER-BLOCK SURFACE & WELDED LEGS) */}
                {/* HEAVY TIMBER WORKBENCH (SOLID BUTCHER-BLOCK SURFACE WITH BEVELED EDGES) */}
                <polygon points="500,670 1420,670 1490,1080 430,1080" fill="url(#benchSurface)" />
                {/* Plank Seam Lines */}
                <line x1="510" y1="760" x2="1435" y2="760" stroke="#251408" strokeWidth="1.2" opacity="0.45" />
                <line x1="480" y1="870" x2="1455" y2="870" stroke="#251408" strokeWidth="1.2" opacity="0.4" />
                <line x1="455" y1="980" x2="1475" y2="980" stroke="#251408" strokeWidth="1.2" opacity="0.35" />
                {/* Steel Rail Top Fascia & Corner Gusset Brackets */}
                <rect x="500" y="666" width="920" height="8" fill="#475569" />
                <polygon points="500,666 525,666 500,691" fill="#334155" />
                <polygon points="1420,666 1395,666 1420,691" fill="#334155" />

                {/* Cutting Mat with Sunlight Pool Overlay */}
                <g transform="translate(560, 678)">
                  <polygon points="0,0 800,0 830,300 -30,300" fill="url(#cuttingMatGrad)" stroke="#166534" strokeWidth="1.5" />
                  {Array.from({ length: 14 }).map((_, i) => (
                    <line key={i} x1={i * 60} y1="0" x2={i * 60 + 30} y2="300" stroke="#22c55e" strokeWidth="0.8" opacity="0.28" />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <line key={i} x1={-15 + i * 5} y1={i * 50} x2={810 + i * 5} y2={i * 50} stroke="#22c55e" strokeWidth="0.8" opacity="0.28" />
                  ))}
                  {/* Warm Sunlight Pool on Mat Surface */}
                  <polygon points="200,0 800,0 830,300 140,300" fill="url(#sunBenchGlow)" opacity="0.45" />
                </g>

                {/* PROPS ON WORKBENCH (HARMONIOUS INDUSTRIAL ARRANGEMENT) */}
                {/* 1. Steaming Chai Glass & Saucer (Upper-Left Corner, Clear of All Papers) */}
                <g transform="translate(520, 710)">
                  <ellipse cx="6" cy="62" rx="26" ry="9" fill="#000000" opacity="0.5" filter="url(#shadowBlur)" />
                  {/* Stainless Steel Saucer */}
                  <ellipse cx="14" cy="54" rx="26" ry="7" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                  <ellipse cx="14" cy="52" rx="21" ry="5.5" fill="#cbd5e1" />
                  {/* Glass Body */}
                  <path d="M2 15 L26 15 L22 50 L6 50 Z" fill="#f8fafc" fillOpacity="0.35" stroke="#cbd5e1" strokeWidth="1.2" />
                  <path d="M4 25 L24 25 L21 49 L7 49 Z" fill="#d97706" fillOpacity="0.9" />
                  <line x1="8" y1="46" x2="22" y2="5" stroke="url(#penChromeGrad)" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Rim Sun Specular Highlight */}
                  <ellipse cx="14" cy="15" rx="11" ry="2" fill="#ffffff" opacity="0.65" />

                  {/* Natural Billowing Hot Tea Steam Wisps */}
                  <g filter="url(#naturalSteamBlur)" style={{ transformOrigin: '14px 10px' }}>
                    <path
                      d="M 14 12 Q 9 0 17 -16 T 11 -42 T 18 -68"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="5.5"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-1"
                    />
                    <path
                      d="M 10 14 Q 4 3 13 -12 T 6 -36 T 14 -58"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="4.5"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-2"
                    />
                    <path
                      d="M 18 14 Q 24 5 16 -8 T 22 -30 T 15 -52"
                      stroke="url(#teaVaporGrad)"
                      strokeWidth="4.0"
                      fill="none"
                      strokeLinecap="round"
                      className="animate-steam-natural-3"
                    />
                  </g>
                </g>

                {/* 2. DAILY DISPATCH REGISTER (SECURELY ON TABLE, CENTERED AT x=640, y=835) */}
                <g transform="translate(640, 835) rotate(168)">
                  {/* Heavy Kraft Hardbound Clipboard Base with Drop Shadow */}
                  <rect x="-60" y="-85" width="120" height="170" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="1.8" filter="drop-shadow(0 6px 14px rgba(0,0,0,0.55))" />
                  {/* Brass Corner Protectors */}
                  <polygon points="-60,-85 -48,-85 -60,-73" fill="#d97706" />
                  <polygon points="60,-85 48,-85 60,-73" fill="#d97706" />
                  <polygon points="-60,85 -48,85 -60,73" fill="#d97706" />
                  <polygon points="60,85 48,85 60,73" fill="#d97706" />

                  {/* Heavy Steel Clamp (At Top From Tariq's Perspective) */}
                  <rect x="-26" y="-93" width="52" height="16" rx="2.5" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" />
                  <circle cx="0" cy="-86" r="3" fill="#475569" />

                  {/* Lined Dispatch Ledger Sheet */}
                  <rect x="-53" y="-72" width="106" height="146" rx="2" fill="#fdfbf7" />

                  {/* Register Header facing Tariq */}
                  <text x="-48" y="-58" fill="#0f172a" fontSize="7.2" fontFamily="sans-serif" fontWeight="900" letterSpacing="0.4">
                    DAILY DISPATCH REGISTER
                  </text>
                  <text x="-48" y="-49" fill="#475569" fontSize="5.5" fontFamily="monospace">
                    BATCH #PK-409 • 07:30 PKT
                  </text>
                  <line x1="-48" y1="-45" x2="48" y2="-45" stroke="#cbd5e1" strokeWidth="0.8" />

                  {/* Logged Rows Facing Worker */}
                  <g transform="translate(-48, -34)">
                    <text x="0" y="0" fill="#10b981" fontSize="6.4" fontFamily="monospace" fontWeight="bold">
                      [✓] ORD-8841 (ISB) RS.3,200
                    </text>
                    {/* Active Order Highlight Row */}
                    <rect x="-2" y="5" width="98" height="13" fill="#fef08a" rx="1.5" />
                    <text x="0" y="15" fill="#991b1b" fontSize="6.4" fontFamily="monospace" fontWeight="900">
                      [➔] ORD-8842 (LHR) COD RS.4,500
                    </text>
                    <text x="0" y="30" fill="#64748b" fontSize="6.4" fontFamily="monospace">
                      [ ] ORD-8843 (KHI) RS.2,100
                    </text>
                    <text x="0" y="44" fill="#94a3b8" fontSize="6.4" fontFamily="monospace">
                      [ ] ORD-8844 (MUX) RS.1,800
                    </text>
                  </g>

                  {/* Tariq's Signature Pen Resting on Register */}
                  <line x1="-35" y1="55" x2="35" y2="20" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                  <line x1="30" y1="23" x2="38" y2="18" stroke="url(#penChromeGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="-32" cy="53" r="2" fill="#1e293b" />
                </g>

                {/* 3. Barcode Scanner in Angled Charging Stand (Far Right Tooling, In Sunbeam) */}
                <g transform="translate(1360, 745)">
                  <ellipse cx="14" cy="52" rx="28" ry="10" fill="#000000" opacity="0.45" filter="url(#shadowBlur)" />
                  <ellipse cx="20" cy="44" rx="24" ry="8" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
                  <path d="M12 44 L16 16 L28 16 L30 44 Z" fill="#334155" />
                  <g transform="translate(22, 12) rotate(-20)">
                    <rect x="-10" y="-26" width="22" height="38" rx="3.5" fill="#eab308" stroke="#854d0e" strokeWidth="1" />
                    <rect x="-8" y="-24" width="18" height="10" fill="#111827" rx="1.5" />
                    <rect x="-6" y="8" width="14" height="34" rx="2.5" fill="#1f2937" />
                    <circle cx="-12" cy="40" r="2.2" fill="#ef4444" filter="drop-shadow(0 0 4px #ef4444)" />
                  </g>
                  <circle cx="28" cy="45" r="1.5" fill="#22c55e" />
                  <path d="M22 44 Q 16 54 24 62 Q 32 70 24 78 Q 16 86 26 94" stroke="#0f172a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                </g>

                {/* 4. Industrial Packing Tape Gun (Resting on Table to Right of Box) */}
                <g transform="translate(1300, 835) rotate(-16)">
                  <ellipse cx="20" cy="48" rx="34" ry="11" fill="#000000" opacity="0.5" filter="url(#shadowBlur)" />
                  {/* Heavy Pistol Grip Handle */}
                  <rect x="0" y="22" width="16" height="36" rx="3.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                  {/* Tape Spool Metal Housing Frame */}
                  <path d="M -8 22 L 42 12 L 48 32 L 6 38 Z" fill="url(#tapeGunGrad)" />
                  {/* Heavy Brown Tape Roll */}
                  <circle cx="10" cy="10" r="26" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
                  <circle cx="10" cy="10" r="18" fill="#ca8a04" />
                  <circle cx="10" cy="10" r="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
                  {/* Serrated Steel Blade */}
                  <line x1="42" y1="14" x2="44" y2="30" stroke="url(#penChromeGrad)" strokeWidth="2.4" strokeLinecap="round" />
                </g>

                {/* 5. Vintage Stamp Pad Tin & Turned Wooden Stamp (Far Right) */}
                <g transform="translate(1380, 855)">
                  <ellipse cx="18" cy="20" rx="26" ry="8" fill="#000000" opacity="0.4" filter="url(#shadowBlur)" />
                  <rect width="36" height="26" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
                  <rect x="3.5" y="3.5" width="29" height="19" rx="1.8" fill="#09090b" />
                  <rect x="5.5" y="5.5" width="25" height="15" rx="1.2" fill="#18181b" />
                  {/* Turned Wooden Inspection Stamp standing beside pad */}
                  <g transform="translate(44, 4)">
                    <rect x="-8" y="10" width="16" height="6" rx="2" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
                    <path d="M -3 10 L -2 0 L 2 0 L 3 10 Z" fill="#b45309" />
                    <circle cx="0" cy="-2" r="4.5" fill="#d97706" />
                  </g>
                </g>

                {/* 6. Heavy-Duty Snap-Off Box Cutter Utility Knife (Right of Scale) */}
                <g transform="translate(1245, 915) rotate(22)">
                  <ellipse cx="18" cy="10" rx="22" ry="5" fill="#000000" opacity="0.35" filter="url(#shadowBlur)" />
                  {/* Yellow Ergonomic Plastic Casing */}
                  <rect width="38" height="10" rx="2.5" fill="#eab308" stroke="#ca8a04" strokeWidth="0.8" />
                  {/* Black Rubber Grip Inset */}
                  <rect x="8" y="2" width="20" height="6" rx="1.5" fill="#1f2937" />
                  {/* Segmented Steel Blade Tip */}
                  <polygon points="38,2 45,6 38,8" fill="url(#penChromeGrad)" stroke="#64748b" strokeWidth="0.6" />
                  {/* Thumb Slider Lock */}
                  <rect x="14" y="-1.5" width="6" height="3" rx="0.8" fill="#0f172a" />
                </g>

                {/* CALCULATED DIRECTIONAL SHADOW: Reduced 3D Parcel blocks dawn sun */}
                <polygon
                  points="770,895 620,950 645,760 770,715"
                  fill="url(#boxSunCastShadow)"
                  filter="url(#shadowBlur)"
                />

                {/* STAINLESS STEEL SCALE UNDER PARCEL (MATHEMATICALLY ENCLOSES REDUCED PARCEL) */}
                <g id="desktop-scale-assembly">
                  {/* Ambient Occlusion Shadow Under Scale */}
                  <ellipse cx="1000" cy="946" rx="320" ry="20" fill="#020617" opacity="0.68" filter="url(#shadowBlur)" />

                  {/* Stainless Steel Heavy Platter Top Surface */}
                  <polygon
                    points="700,904 810,844 1330,844 1220,904"
                    fill="url(#scaleSteelGrad)"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                  {/* Platter Polished Bevel Rims */}
                  <polygon points="700,904 1220,904 1220,918 700,918" fill="#94a3b8" />
                  <polygon points="1220,904 1330,844 1330,858 1220,918" fill="#64748b" />

                  {/* Platter Polished Perimeter Sheen */}
                  <line x1="700" y1="904" x2="1220" y2="904" stroke="#ffffff" strokeWidth="1.5" opacity="0.65" />
                  <line x1="1220" y1="904" x2="1330" y2="844" stroke="#fef08a" strokeWidth="1.8" opacity="0.75" />

                  {/* Scale Lower Chassis & Rubber Leveling Feet */}
                  <polygon points="715,918 1205,918 1205,934 715,934" fill="#1e293b" />
                  <rect x="725" y="934" width="26" height="7" rx="2" fill="#0f172a" />
                  <rect x="1170" y="934" width="26" height="7" rx="2" fill="#0f172a" />
                  <rect x="1305" y="858" width="20" height="7" rx="2" fill="#0f172a" />

                  {/* Contact Shadow of Parcel on the Scale Platter Plate */}
                  <polygon
                    points="770,895 1150,895 1216,859 836,859"
                    fill="#020617"
                    opacity="0.45"
                    filter="url(#contactShadowBlur)"
                  />

                  {/* Digital Weight Readout on Scale Front Apron */}
                  <g transform="translate(865, 911)">
                    <rect width="180" height="20" rx="3" fill="#09090b" stroke="#334155" strokeWidth="1.2" />
                    <text x="12" y="14.8" fill="#22c55e" fontSize="12.5" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">
                      1.450 KG
                    </text>
                    <circle cx="128" cy="10" r="2.3" fill="#22c55e" />
                    <text x="135" y="12" fill="#22c55e" fontSize="6" fontFamily="sans-serif" fontWeight="bold">
                      STABLE
                    </text>
                  </g>
                </g>

                {/* =====================================================================
                    REDUCED-SIZE 3D PARCEL WITH REALISTIC CARDBOARD TEXTURE & GRAPHICS (DESKTOP)
                    ===================================================================== */}
                {/* 1. Base Faces: Front (380x180), Side (dx=66, dy=-36), Top */}
                <polygon points="770,715 1150,715 1150,895 770,895" fill="url(#boxFrontGrad)" />
                <polygon points="1150,715 1216,679 1216,859 1150,895" fill="url(#boxSideGrad)" />
                <polygon points="770,715 836,679 1216,679 1150,715" fill="url(#boxTopGrad)" />

                {/* 2. Micro-Flute Kraft Cardboard Grain Textures */}
                <polygon points="770,715 1150,715 1150,895 770,895" fill="url(#kraftGrain)" />
                <polygon points="1150,715 1216,679 1216,859 1150,895" fill="url(#kraftGrainSide)" />
                <polygon points="770,715 836,679 1216,679 1150,715" fill="url(#kraftGrainTop)" />

                {/* 3. Authentic Fold Creases & Sunlight Rim Highlights */}
                <line x1="770" y1="715" x2="1150" y2="715" stroke="#fef08a" strokeWidth="1.4" opacity="0.45" />
                <line x1="1150" y1="715" x2="1150" y2="895" stroke="#251205" strokeWidth="2.5" opacity="0.75" />
                <line x1="770" y1="715" x2="770" y2="895" stroke="#3b1f0b" strokeWidth="2" opacity="0.6" />
                <line x1="1150" y1="715" x2="1216,679" stroke="#fef08a" strokeWidth="2.5" opacity="0.75" />
                <line x1="1216" y1="679" x2="1216" y2="859" stroke="#fef08a" strokeWidth="2" opacity="0.65" />
                <line x1="770" y1="715" x2="836" y2="679" stroke="#fef08a" strokeWidth="1.2" opacity="0.35" />

                {/* Crisp Contact Shadow Under Box on Scale */}
                <polygon points="765,895 1155,895 1221,859 1211,854 770,890" fill="#020617" opacity="0.65" filter="url(#contactShadowBlur)" />

                {/* 4. Manufacturer Joint Heavy Copper Staples along Left Seam */}
                {[740, 795, 850].map((stapleY, idx) => (
                  <rect key={idx} x="773" y={stapleY} width="3" height="13" rx="1" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
                ))}

                {/* 5. Box Manufacturer's Certificate (BMC) Ink Stamp on Front Face */}
                <g transform="translate(965, 835)">
                  <circle cx="0" cy="0" r="18" fill="none" stroke="#3b1f0b" strokeWidth="1.4" strokeDasharray="14 2 18 2" opacity="0.55" />
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#3b1f0b" strokeWidth="0.8" opacity="0.5" />
                  <text x="0" y="-8" fill="#3b1f0b" fontSize="3.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.6">
                    BOX CERTIFICATE
                  </text>
                  <text x="0" y="-3" fill="#3b1f0b" fontSize="3.2" fontFamily="sans-serif" textAnchor="middle" opacity="0.55">
                    SINGLEWALL
                  </text>
                  <text x="0" y="3" fill="#3b1f0b" fontSize="3.6" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.6">
                    BURST 200 LBS
                  </text>
                  <text x="0" y="8" fill="#3b1f0b" fontSize="3.2" fontFamily="sans-serif" textAnchor="middle" opacity="0.55">
                    GROSS 65 LBS
                  </text>
                  <text x="0" y="13" fill="#3b1f0b" fontSize="3.0" fontFamily="monospace" textAnchor="middle" opacity="0.5">
                    LAHORE PK
                  </text>
                </g>

                {/* 6. Handling Stencils on Isometric Side Face (Mathematically Aligned with -28.6° slope) */}
                <g transform="translate(1162, 706) skewY(-28.6)">
                  {/* THIS WAY UP Arrows */}
                  <g transform="translate(16, 12)">
                    <line x1="0" y1="22" x2="0" y2="4" stroke="#251205" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
                    <path d="M-3.5 10 L0 2 L3.5 10" fill="none" stroke="#251205" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  </g>
                  <g transform="translate(36, 12)">
                    <line x1="0" y1="22" x2="0" y2="4" stroke="#251205" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
                    <path d="M-3.5 10 L0 2 L3.5 10" fill="none" stroke="#251205" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  </g>

                  {/* Keep Dry Umbrella */}
                  <g transform="translate(18, 44)">
                    <path d="M0 8 Q 8 -2 16 8 Z" fill="#251205" opacity="0.8" />
                    <line x1="8" y1="6" x2="8" y2="17" stroke="#251205" strokeWidth="1.6" opacity="0.8" />
                    <path d="M8 17 Q 6.5 20 4 19" fill="none" stroke="#251205" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                  </g>

                  {/* Max Weight Stamp */}
                  <text x="28" y="80" fill="#251205" fontSize="6.4" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.8">
                    MAX: 35 KG
                  </text>
                  <text x="28" y="96" fill="#251205" fontSize="7.5" fontFamily="sans-serif" textAnchor="middle" opacity="0.75">
                    ♲ RECYCLED
                  </text>
                  <text x="28" y="109" fill="#251205" fontSize="5.2" fontFamily="monospace" textAnchor="middle" opacity="0.65">
                    QC PASS • PK-09
                  </text>
                </g>

                {/* Top Flute Edge Cut Line */}
                <line x1="803" y1="697" x2="1183" y2="697" stroke="#3b1f0b" strokeWidth="1.8" strokeDasharray="3,2" opacity="0.7" />

                {/* Dotted Guideline & Prompt */}
                {!isFullySealed && (
                  <g onPointerDown={handlePointerDown} className="cursor-pointer select-none" style={{ touchAction: 'none' }}>
                    <rect x="770" y="650" width="450" height="90" fill="transparent" className="cursor-grab active:cursor-grabbing" />
                    <line
                      x1={Math.max(803, 803 + tapeWidth)}
                      y1="697"
                      x2="1183"
                      y2="697"
                      stroke="#fbbf24"
                      strokeWidth="3.5"
                      strokeDasharray="8,6"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    <circle cx="1183" cy="697" r="5" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
                    {sealProgress < 0.65 && (
                      <g transform="translate(993, 669)" className="pointer-events-none transition-opacity duration-200" style={{ opacity: Math.max(0, 1 - sealProgress * 1.6) }}>
                        <rect x="-115" y="-15" width="230" height="24" rx="12" fill="#0a0e17" fillOpacity="0.92" stroke="#fbbf24" strokeWidth="1.2" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))" />
                        <text x="0" y="1" fill="#fef08a" fontSize="10.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1.2">
                          SLIDE TAPE TO SEAL BOX ➔
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Applied Tape (Brown Translucent + Fiberglass Reinforcement Grid) */}
                {tapeWidth > 0 && (
                  <g>
                    <polygon
                      points={`803,697 ${803 + tapeWidth},697 ${803 + tapeWidth + 6},692 809,692`}
                      fill="url(#tapeStripGrad)"
                      opacity="0.95"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    />
                    <polygon
                      points={`803,697 ${803 + tapeWidth},697 ${803 + tapeWidth + 6},692 809,692`}
                      fill="url(#tapeFiber)"
                      opacity="0.45"
                    />
                  </g>
                )}

                {/* Front Shipping Label (Crisply Sized 185x115) */}
                <g transform="translate(785, 735)">
                  <rect width="185" height="115" rx="3.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))" />
                  <rect x="0" y="0" width="185" height="23" fill="#0f172a" rx="2.5" />
                  <text x="10" y="16" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    LEOPARDS COD EXPRESS
                  </text>
                  <g transform="translate(10, 30)">
                    <line x1="0" y1="0" x2="0" y2="24" stroke="#000" strokeWidth="2.5" />
                    <line x1="5" y1="0" x2="5" y2="24" stroke="#000" strokeWidth="1.2" />
                    <line x1="10" y1="0" x2="10" y2="24" stroke="#000" strokeWidth="3" />
                    <line x1="16" y1="0" x2="16" y2="24" stroke="#000" strokeWidth="1.5" />
                    <line x1="22" y1="0" x2="22" y2="24" stroke="#000" strokeWidth="3" />
                    <line x1="28" y1="0" x2="28" y2="24" stroke="#000" strokeWidth="1.2" />
                    <line x1="34" y1="0" x2="34" y2="24" stroke="#000" strokeWidth="2.5" />
                    <line x1="41" y1="0" x2="41" y2="24" stroke="#000" strokeWidth="3.2" />
                    <line x1="48" y1="0" x2="48" y2="24" stroke="#000" strokeWidth="1.5" />
                  </g>
                  <text x="80" y="42" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                    DEST: LAHORE, PK
                  </text>
                  <text x="80" y="54" fill="#475569" fontSize="8" fontFamily="monospace">
                    TRACK: #PK-8842
                  </text>
                  <rect x="8" y="63" width="169" height="42" rx="2.5" fill="#fef2f2" stroke="#ef4444" strokeWidth="0.8" />
                  <text x="12" y="78" fill="#991b1b" fontSize="8" fontFamily="sans-serif" fontWeight="bold">
                    CASH ON DELIVERY (COD):
                  </text>
                  <text x="12" y="96" fill="#b91c1c" fontSize="14.5" fontFamily="monospace" fontWeight="bold">
                    RS. 4,500 /-
                  </text>
                </g>

                {/* Fragile Stamp (Cleanly Positioned Top-Right of Front Face) */}
                <g transform="translate(995, 728) rotate(-5)">
                  <rect width="95" height="38" rx="4.5" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeDasharray="3,2" />
                  <text x="12" y="17" fill="#dc2626" fontSize="10.5" fontFamily="sans-serif" fontWeight="900" letterSpacing="1.2">
                    FRAGILE
                  </text>
                  <text x="18" y="31" fill="#dc2626" fontSize="9.5" fontFamily="sans-serif" fontWeight="bold">
                    احتیـــاط
                  </text>
                </g>

                {/* Round Black Sealed Stamp (Slams between Label and Fragile Stamp) */}
                {isFullySealed && (
                  <g className="animate-stamp-slam select-none" style={{ transformOrigin: '1045px 810px' }}>
                    <g transform="translate(1045, 810) rotate(-11)">
                      <circle cx="0" cy="0" r="42" fill="none" stroke="#09090b" strokeWidth="3.2" strokeDasharray="75 2 45 3 30 2" opacity="0.94" />
                      <circle cx="0" cy="0" r="36" fill="#09090b" fillOpacity="0.04" stroke="#09090b" strokeWidth="1.5" opacity="0.88" />
                      <circle cx="0" cy="0" r="29" fill="none" stroke="#09090b" strokeWidth="1" strokeDasharray="3,3" opacity="0.75" />
                      <g transform="translate(0, -20)">
                        <text x="0" y="0" fill="#09090b" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="1.8" opacity="0.85">
                          ★ ★ ★
                        </text>
                      </g>
                      <text x="0" y="-10" fill="#09090b" fontSize="6.5" fontFamily="sans-serif" fontWeight="800" textAnchor="middle" letterSpacing="1.2" opacity="0.8">
                        VERIFIED
                      </text>
                      <line x1="-33" y1="-7.5" x2="33" y2="-7.5" stroke="#09090b" strokeWidth="1.8" opacity="0.9" />
                      <line x1="-33" y1="11" x2="33" y2="11" stroke="#09090b" strokeWidth="1.8" opacity="0.9" />
                      <text x="0" y="6" fill="#09090b" fontSize="16" fontFamily="Impact, sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="2.2" opacity="0.96">
                        SEALED
                      </text>
                      <text x="0" y="21" fill="#09090b" fontSize="6" fontFamily="sans-serif" fontWeight="800" textAnchor="middle" letterSpacing="1" opacity="0.8">
                        INSPECTED & PASSED
                      </text>
                    </g>
                  </g>
                )}

                {/* Draggable Red Tape Gun */}
                <g
                  transform={`translate(${803 + tapeWidth}, 674)`}
                  onPointerDown={handlePointerDown}
                  className="cursor-grab active:cursor-grabbing transition-transform duration-75 select-none"
                  style={{ touchAction: 'none' }}
                >
                  <path d="M-5 -25 L25 -25 L32 0 L-2 10 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2.5" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))" />
                  <circle cx="12" cy="-12" r="14" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                  <circle cx="12" cy="-12" r="5" fill="#1e293b" />
                  <rect x="-10" y="5" width="12" height="26" rx="3" fill="#0f172a" />
                  <rect x="22" y="2" width="8" height="6" fill="#475569" />
                  {!isFullySealed && (
                    <circle cx="12" cy="-12" r="22" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,3" className="animate-spin" style={{ animationDuration: '4s' }} />
                  )}
                </g>

                {/* Typewriter Speech Bubble */}
                {displayedDialogue.length > 0 && (
                  <g transform="translate(740, 260)">
                    <polygon points="220,88 240,105 230,88" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.5" />
                    <rect x="0" y="0" width="440" height="88" rx="16" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.5" filter="drop-shadow(0 10px 24px rgba(0,0,0,0.8))" />
                    <rect x="20" y="-10" width="110" height="20" rx="4" fill="#c9a47a" />
                    <text x="26" y="4" fill="#000000" fontSize="9.5" fontFamily="sans-serif" fontWeight="bold" letterSpacing="1">
                      TARIQ (PACKER)
                    </text>
                    <text x="20" y="36" fill="#ffffff" fontSize="14.5" fontFamily="sans-serif" fontWeight="600">
                      "{displayedDialogue.slice(0, 36)}
                    </text>
                    <text x="20" y="62" fill="#e2e8f0" fontSize="14.5" fontFamily="sans-serif" fontWeight="600">
                      {displayedDialogue.slice(36)}
                      {!isTypingComplete && <tspan fill="#f59e0b" className="animate-pulse">|</tspan>}
                      {isTypingComplete && '"'}
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>

          {/* =========================================================================
              HARDWARE-ACCELERATED FULL-BLEED CSS CLOUDS & TITLE DESCENT OVERLAY
              ========================================================================= */}
          {cloudOpacity > 0 && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden transform-gpu"
              style={{
                opacity: cloudOpacity,
                transition: 'opacity 0.1s linear',
                willChange: 'opacity, transform',
                transform: 'translateZ(0)',
              }}
            >
              <div className="absolute inset-0 bg-[#05070c]" />

              {/* Left Cloud Bank */}
              <div
                className="absolute -top-[20%] -left-[30%] w-[120%] h-[140%] transform-gpu"
                style={{
                  transform: `translate3d(${cloudPartLeft}%, 0, 0) scale3d(${cloudScale}, ${cloudScale}, 1)`,
                  transformOrigin: '20% 50%',
                  background:
                    'radial-gradient(circle at 30% 40%, rgba(254, 215, 170, 0.85) 0%, rgba(203, 213, 225, 0.75) 35%, rgba(148, 163, 184, 0.4) 60%, transparent 80%)',
                  filter: 'blur(35px)',
                }}
              />

              {/* Right Cloud Bank */}
              <div
                className="absolute -top-[20%] -right-[30%] w-[120%] h-[140%] transform-gpu"
                style={{
                  transform: `translate3d(${cloudPartRight}%, 0, 0) scale3d(${cloudScale}, ${cloudScale}, 1)`,
                  transformOrigin: '80% 50%',
                  background:
                    'radial-gradient(circle at 70% 45%, rgba(254, 215, 170, 0.85) 0%, rgba(203, 213, 225, 0.75) 35%, rgba(148, 163, 184, 0.4) 60%, transparent 80%)',
                  filter: 'blur(35px)',
                }}
              />

              {/* Central Fog Plume */}
              <div
                className="absolute inset-0 flex items-center justify-center transform-gpu"
                style={{
                  transform: `scale3d(${1 + cloudProgress * 2.5}, ${1 + cloudProgress * 2.5}, 1)`,
                  transformOrigin: 'center center',
                }}
              >
                <div
                  className="w-[120vw] h-[120vh]"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(255, 237, 213, 0.7) 0%, rgba(148, 163, 184, 0.55) 40%, rgba(30, 41, 59, 0.85) 75%, #05070c 100%)',
                    filter: 'blur(45px)',
                  }}
                />
              </div>

              {/* Floating Title Card on Clouds */}
              {titleOpacity > 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none transform-gpu"
                  style={{
                    opacity: titleOpacity,
                    transform: `scale3d(${titleScale}, ${titleScale}, 1)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <div className="absolute w-[90vw] max-w-lg h-36 bg-black/60 rounded-full blur-2xl" />

                  <div className="relative z-10 space-y-2">
                    <div className="font-mono text-[10px] sm:text-xs text-[#c9a47a] tracking-[0.25em] uppercase font-bold">
                      A NARRATIVE JOURNEY ACROSS PAKISTAN
                    </div>

                    <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl text-[#fef08a] font-normal tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                      The Story of a Saved Delivery
                    </h1>

                    <p className="font-sans text-[11px] sm:text-xs md:text-sm text-[#f4efe8]/85 font-light tracking-wider max-w-md mx-auto">
                      How a single Rs. 4,500 Cash-on-Delivery order survived the doorstep crisis
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scene1Packing;
