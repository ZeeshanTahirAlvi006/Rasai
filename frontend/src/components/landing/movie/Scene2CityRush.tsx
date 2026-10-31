// src/components/landing/movie/Scene2CityRush.tsx
// High-performance, 60/120fps hardware-composited cinematic Scene 2: City Rush.
// Adheres strictly to Scene 1 zero-re-render rAF practices, delta-time normalized physics,
// and rich realistic visual detail across sky, skyline, colonial buildings, banyan trees, and road.

import React, { useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../cinema/SoundEngine';
import { HondaCD70 } from './HondaCD70';
import { CourierKamran } from './CourierKamran';
import { AutoRickshaw } from './AutoRickshaw';

const DIALOGUE_URDU = "Time bohot kam hai, dopahar se pehle 35 parcels deliver karne hain!";
const DIALOGUE_EN = "Running out of time, 35 parcels to deliver before afternoon!";
const SMOKE_PUFF_COUNT = 16;
const DUST_PARTICLE_COUNT = 12;

export interface Scene2Handle {
  setProgress: (progress: number, velocity: number) => void;
  setActive: (active: boolean) => void;
}

export interface Scene2CityRushProps {
  progress?: number;
  velocity?: number;
  isActive?: boolean;
  isPortrait?: boolean;
}

export const Scene2CityRush = React.forwardRef<Scene2Handle, Scene2CityRushProps>(({
  progress = 0,
  velocity = 0,
  isActive = true,
  isPortrait = false,
}, ref) => {
  const sceneProgressRef = useRef<number>(progress);
  const scrollVelocityRef = useRef<number>(velocity);
  const isActiveRef = useRef<boolean>(isActive);
  const svgRef = useRef<SVGSVGElement>(null);

  // Parallax & scene direct DOM refs (mutated directly in rAF loop with 0 React re-renders)
  const skyGroupRef = useRef<SVGGElement>(null);
  const skylineGroupRef = useRef<SVGGElement>(null);
  const midgroundGroupRef = useRef<SVGGElement>(null);
  const roadLinesGroupRef = useRef<SVGGElement>(null);
  const roadDustGroupRef = useRef<SVGGElement>(null);
  const rickshawGroupRef = useRef<SVGGElement>(null);
  const bikeGroupRef = useRef<SVGGElement>(null);
  const frontWheelRef = useRef<SVGGElement>(null);
  const rearWheelRef = useRef<SVGGElement>(null);
  const headlightBeamRef = useRef<SVGPolygonElement>(null);
  const speechBubbleGroupRef = useRef<SVGGElement>(null);
  const speechLine1Ref = useRef<HTMLParagraphElement>(null);
  const speechLine2Ref = useRef<HTMLSpanElement>(null);
  const speechCursorRef = useRef<HTMLSpanElement>(null);
  const speedDigitsRef = useRef<HTMLSpanElement>(null);

  // Dedicated refs for procedural animated silencer smoke puffs
  const smokePuffElementsRef = useRef<Array<SVGCircleElement | null>>([]);
  const smokePuffProgressRef = useRef<number[]>(
    Array.from({ length: SMOKE_PUFF_COUNT }, (_, i) => i / SMOKE_PUFF_COUNT)
  );

  // Dedicated refs for high-speed road dust particles
  const dustElementsRef = useRef<Array<SVGCircleElement | null>>([]);
  const dustProgressRef = useRef<number[]>(
    Array.from({ length: DUST_PARTICLE_COUNT }, (_, i) => i / DUST_PARTICLE_COUNT)
  );

  // Animation physics refs (delta-time normalized)
  const rafIdRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const roadOffsetRef = useRef<number>(0);
  const midgroundOffsetRef = useRef<number>(0);
  const skylineOffsetRef = useRef<number>(0);
  const skyCloudsOffsetRef = useRef<number>(0);
  const wheelAngleRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(38);
  const lastHornPlayedRef = useRef<boolean>(false);
  const lastTypedCharCountRef = useRef<number>(-1);
  const lastAudioRPMUpdateRef = useRef<number>(0);

  // Zero-React-rerender frame mutations applying Scene 1 smooth physics
  const applyFrameMutations = useCallback(
    (speedKmH: number, sceneProgress: number, dt: number) => {
      // Direct DOM update for top-right speed digits (Zero React re-renders)
      if (speedDigitsRef.current) {
        speedDigitsRef.current.textContent = `${Math.round(speedKmH)}`;
      }

      // Base pixel speed: at 40 km/h, road travels ~1450px / second to the left
      const pixelSpeed = (speedKmH / 40) * 1450;
      roadOffsetRef.current = (roadOffsetRef.current + pixelSpeed * dt) % 400;
      midgroundOffsetRef.current = (midgroundOffsetRef.current + pixelSpeed * 0.45 * dt) % 1920;
      skylineOffsetRef.current = (skylineOffsetRef.current + pixelSpeed * 0.14 * dt) % 1920;
      skyCloudsOffsetRef.current = (skyCloudsOffsetRef.current + pixelSpeed * 0.05 * dt) % 1920;

      // When driving forward to the right, wheels rotate clockwise (+angle)
      wheelAngleRef.current = (wheelAngleRef.current + pixelSpeed * 0.92 * dt) % 360;

      // 1. Road dashed markings conveyor (moves LEFT to simulate forward drive)
      if (roadLinesGroupRef.current) {
        roadLinesGroupRef.current.setAttribute(
          'transform',
          `translate(${-roadOffsetRef.current.toFixed(1)}, 0)`
        );
      }

      // 2. Midground colonial arches, shops & structural trees conveyor
      if (midgroundGroupRef.current) {
        midgroundGroupRef.current.setAttribute(
          'transform',
          `translate(${-midgroundOffsetRef.current.toFixed(1)}, 0)`
        );
      }

      // 3. Distant Badshahi Mosque & Lahore skyline conveyor
      if (skylineGroupRef.current) {
        skylineGroupRef.current.setAttribute(
          'transform',
          `translate(${-skylineOffsetRef.current.toFixed(1)}, 0)`
        );
      }

      // 4. Wheels Clockwise Rotation (Local center 0,0 inside translated wheel hub assemblies)
      const rotWheel = `rotate(${wheelAngleRef.current.toFixed(1)})`;
      if (frontWheelRef.current) frontWheelRef.current.setAttribute('transform', rotWheel);
      if (rearWheelRef.current) rearWheelRef.current.setAttribute('transform', rotWheel);

      // 5. Bike & Rider Suspension Micro-Bounce (scaled with speed and engine vibration)
      if (bikeGroupRef.current) {
        const bounce = Math.sin(performance.now() * 0.026) * (0.7 + (speedKmH / 68) * 1.4);
        bikeGroupRef.current.setAttribute('transform', `translate(0, ${bounce.toFixed(2)})`);
      }

      // 6. PROCEDURAL ANIMATED 4-STROKE EXHAUST SMOKE (Billowing backwards to the left)
      const smokePuffs = smokePuffElementsRef.current;
      const smokeProgress = smokePuffProgressRef.current;
      const smokeStep = (0.75 + (speedKmH / 68) * 0.95) * dt;
      // Authentic Honda CD 70 silencer exhaust tip coordinate
      const tipX = 660;
      const tipY = 839;
      const speedExpansion = 1 + (speedKmH / 68) * 0.8;

      for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
        smokeProgress[i] = (smokeProgress[i] + smokeStep) % 1;
        const p = smokeProgress[i];
        const el = smokePuffs[i];
        if (!el) continue;

        // Billows backwards to the left behind the bike
        const driftDistance = Math.pow(p, 0.82) * 360 * speedExpansion;
        const cx = tipX - driftDistance;
        // Thermal upward buoyancy with turbulence
        const cy = tipY - p * 48 + Math.sin(p * 9 + i * 1.6) * 8;
        // Expands from 6px tight puff to 58px soft billowing cloud
        const r = 6 + p * 52;
        // Smooth sine fade-in and dissipation
        const opacity = Math.sin(p * Math.PI) * Math.max(0, 0.82 - p * 0.4);

        el.setAttribute('cx', cx.toFixed(1));
        el.setAttribute('cy', cy.toFixed(1));
        el.setAttribute('r', r.toFixed(1));
        el.style.opacity = opacity.toFixed(3);
      }

      // 7. Dynamic Road Dust Particles (whips up behind spinning rear wheel)
      const dustElements = dustElementsRef.current;
      const dustProgress = dustProgressRef.current;
      const dustStep = (1.2 + (speedKmH / 68) * 1.4) * dt;
      const rearTireX = 720;
      const rearTireY = 872;

      for (let j = 0; j < DUST_PARTICLE_COUNT; j++) {
        dustProgress[j] = (dustProgress[j] + dustStep) % 1;
        const dp = dustProgress[j];
        const del = dustElements[j];
        if (!del) continue;

        const dcx = rearTireX - Math.pow(dp, 0.75) * 280 * speedExpansion;
        const dcy = rearTireY - dp * 24 + Math.sin(dp * 12 + j) * 5;
        const dr = 2 + dp * 12;
        const dopacity = Math.sin(dp * Math.PI) * 0.35 * (speedKmH / 40);

        del.setAttribute('cx', dcx.toFixed(1));
        del.setAttribute('cy', dcy.toFixed(1));
        del.setAttribute('r', dr.toFixed(1));
        del.style.opacity = Math.max(0, dopacity).toFixed(3);
      }

      // 8. Auto-Rickshaw Relative Movement (Facing RIGHT, driving forward)
      // Rickshaw travels at ~32 km/h; Kamran rushes forward and overtakes it
      if (rickshawGroupRef.current) {
        // Rickshaw starts ahead (X: 1480), falls behind to (X: -580) as Kamran rushes forward
        const rickshawProgress = Math.max(0, Math.min(1, (sceneProgress - 0.20) / 0.60));
        const rickshawX = 1480 - rickshawProgress * 2160;
        const rickshawBounce = Math.cos(performance.now() * 0.034) * 1.8;
        rickshawGroupRef.current.setAttribute(
          'transform',
          `translate(${rickshawX.toFixed(1)}, ${rickshawBounce.toFixed(1)})`
        );

        // Authentic rickshaw horn plays once as Kamran passes it
        if (rickshawProgress > 0.40 && rickshawProgress < 0.65 && !lastHornPlayedRef.current) {
          lastHornPlayedRef.current = true;
          soundEngine.playRickshawHorn();
        } else if (rickshawProgress <= 0.18 || rickshawProgress >= 0.88) {
          lastHornPlayedRef.current = false;
        }
      }

      // 9. Halogen Headlight Beam Pulse
      if (headlightBeamRef.current) {
        const beamIntensity = 0.24 + (speedKmH / 68) * 0.18 + Math.sin(performance.now() * 0.016) * 0.03;
        headlightBeamRef.current.style.opacity = beamIntensity.toFixed(2);
      }

      // 10. Typewriter Dialogue Bubble (Triggers as Kamran cruises: 0.30 -> 0.85)
      const dialogueTrigger = Math.max(0, Math.min(1, (sceneProgress - 0.28) / 0.50));
      const typedCharCount = Math.floor(dialogueTrigger * DIALOGUE_URDU.length);

      if (typedCharCount !== lastTypedCharCountRef.current) {
        lastTypedCharCountRef.current = typedCharCount;
        if (speechBubbleGroupRef.current) {
          speechBubbleGroupRef.current.style.display = typedCharCount > 0 ? 'block' : 'none';
        }
        if (typedCharCount > 0) {
          const isComplete = typedCharCount >= DIALOGUE_URDU.length;
          if (speechLine1Ref.current) {
            speechLine1Ref.current.textContent = isComplete
              ? `"${DIALOGUE_URDU}"`
              : `"${DIALOGUE_URDU.slice(0, typedCharCount)}`;
          }
          if (speechLine2Ref.current) {
            const enCount = Math.floor(dialogueTrigger * DIALOGUE_EN.length);
            speechLine2Ref.current.textContent = DIALOGUE_EN.slice(0, enCount);
          }
          if (speechCursorRef.current) {
            speechCursorRef.current.style.display = isComplete ? 'none' : 'inline';
          }
        }
      }
    },
    []
  );

  const startEngineLoop = useCallback(() => {
    if (rafIdRef.current) return;
    soundEngine.startEngine(0.35);
    lastFrameTimeRef.current = performance.now();

    const engineLoop = (now: number) => {
      if (!isActiveRef.current) {
        rafIdRef.current = 0;
        return;
      }

      // Normalized delta-time (handles 60Hz, 90Hz, 120Hz, 144Hz displays with identical physics)
      const dt =
        lastFrameTimeRef.current > 0
          ? Math.min(0.05, Math.max(0.001, (now - lastFrameTimeRef.current) / 1000))
          : 1 / 120;
      lastFrameTimeRef.current = now;

      // Base cruising floor: 38 km/h. Speed strictly increases on scroll DOWN (positive scroll velocity)
      const forwardVelocity = Math.max(0, scrollVelocityRef.current);
      const velocityBoost = Math.min(52, forwardVelocity * 0.05);
      const targetSpeed = 38 + velocityBoost;

      // Smooth spring dampening toward target speed
      const speedDiff = targetSpeed - currentSpeedRef.current;
      currentSpeedRef.current += speedDiff * (1 - Math.exp(-6.8 * dt));

      // Natural velocity dissipation back to cruising floor when scroll ceases
      scrollVelocityRef.current *= Math.exp(-3.5 * dt);

      applyFrameMutations(currentSpeedRef.current, sceneProgressRef.current, dt);

      // Web Audio RPM update (~every 80ms)
      if (now - lastAudioRPMUpdateRef.current > 80) {
        lastAudioRPMUpdateRef.current = now;
        const rpmRatio = (currentSpeedRef.current - 38) / 30;
        soundEngine.updateEngineRPM(rpmRatio);
        if (rpmRatio > 0.35) {
          soundEngine.playWindRush(rpmRatio);
        }
      }

      rafIdRef.current = requestAnimationFrame(engineLoop);
    };

    rafIdRef.current = requestAnimationFrame(engineLoop);
  }, [applyFrameMutations]);

  const stopEngineLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    soundEngine.stopEngine();
  }, []);

  React.useImperativeHandle(ref, () => ({
    setProgress: (p: number, vel: number) => {
      sceneProgressRef.current = p;
      scrollVelocityRef.current = vel;
    },
    setActive: (active: boolean) => {
      if (isActiveRef.current === active) return;
      isActiveRef.current = active;
      if (active) {
        startEngineLoop();
      } else {
        stopEngineLoop();
      }
    },
  }), [startEngineLoop, stopEngineLoop]);

  useEffect(() => {
    sceneProgressRef.current = progress;
    scrollVelocityRef.current = velocity;
    isActiveRef.current = isActive;
    if (isActive) {
      startEngineLoop();
    } else {
      stopEngineLoop();
    }
    return () => {
      stopEngineLoop();
    };
  }, [isActive, progress, velocity, startEngineLoop, stopEngineLoop]);

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden bg-[#060a14] pointer-events-none"
      id="scene-2-city-rush"
    >
      {/* Top Right Digital Speed: XX KM/H */}
      <div
        id="scene2-digital-speed"
        className="absolute top-6 right-8 z-30 select-none pointer-events-none flex items-baseline gap-2"
        style={{
          fontFamily: '"Orbitron", "Share Tech Mono", "Courier New", monospace',
          letterSpacing: '0.06em',
        }}
      >
        <span
          ref={speedDigitsRef}
          className="text-4xl sm:text-5xl font-black text-cyan-400 tabular-nums leading-none drop-shadow-[0_0_14px_rgba(34,211,238,0.75)]"
        >
          38
        </span>
        <span className="text-xl sm:text-2xl font-bold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
          KM/H
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={isPortrait ? '0 0 1080 1520' : '0 0 1920 1080'}
        className="w-full h-full object-cover select-none pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* ========================================================= */}
          {/* CINEMATIC DAWN SUNRISE SKY GRADIENTS                      */}
          {/* ========================================================= */}
          <linearGradient id="skySunriseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#060a16" />
            <stop offset="22%" stopColor="#121829" />
            <stop offset="42%" stopColor="#2e1b38" />
            <stop offset="62%" stopColor="#6b262d" />
            <stop offset="78%" stopColor="#b44a17" />
            <stop offset="90%" stopColor="#e27c1d" />
            <stop offset="97%" stopColor="#f7ba5b" />
            <stop offset="100%" stopColor="#fde0b4" />
          </linearGradient>

          {/* Morning Solar Corona Flare & Rays */}
          <radialGradient id="sunGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.32" />
            <stop offset="92%" stopColor="#d97706" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>

          {/* Soft Dawn Cirrus Cloud Gradient */}
          <linearGradient id="cirrusCloudGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fed7aa" stopOpacity="0" />
            <stop offset="25%" stopColor="#fde68a" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#f472b6" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
          </linearGradient>

          {/* Volumetric Morning Cloud Bank Gradient */}
          <linearGradient id="cumulusCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#fca5a5" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0" />
          </linearGradient>

          {/* Crepuscular God Rays Gradient */}
          <linearGradient id="godRayGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#fef08a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Distant Atmospheric Mist Layer */}
          <linearGradient id="horizonMistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" stopOpacity="0" />
            <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.32" />
          </linearGradient>

          {/* Textured Asphalt Road Surface Gradient */}
          <linearGradient id="roadSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#171e2e" />
            <stop offset="15%" stopColor="#111827" />
            <stop offset="45%" stopColor="#0f172a" />
            <stop offset="80%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>

          {/* Asphalt Specular Sunlit Sheen */}
          <linearGradient id="asphaltSheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
            <stop offset="65%" stopColor="#fef08a" stopOpacity="0.08" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Path-Traced Master CD 70 Motorcycle Volumetric Headlight Beam */}
          <linearGradient id="bikeVolumetricBeamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="12%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="38%" stopColor="#fde047" stopOpacity="0.4" />
            <stop offset="72%" stopColor="#f59e0b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Path-Traced Motorcycle Road Light Pool (Illuminates Asphalt & Markings) */}
          <radialGradient id="bikeRoadLightPool" cx="35%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#d97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* Focused Motorcycle Beam Core Hotspot */}
          <radialGradient id="bikeBeamCorePool" cx="38%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#fef9c3" stopOpacity="0.88" />
            <stop offset="70%" stopColor="#fef08a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>

          {/* Auto-Rickshaw Halogen Headlight Volumetric Beam */}
          <linearGradient id="rkVolumetricBeamGrad" x1="0%" y1="45%" x2="100%" y2="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="15%" stopColor="#fef08a" stopOpacity="0.7" />
            <stop offset="48%" stopColor="#fde047" stopOpacity="0.32" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Auto-Rickshaw Path-Traced Road Light Pool */}
          <radialGradient id="rkRoadLightPool" cx="38%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="58%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Auto-Rickshaw Focused Core Hotspot */}
          <radialGradient id="rkBeamCorePool" cx="35%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#fffbeb" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#fef08a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>

          {/* Overhead Streetlight Volumetric Cone Gradient (High-Pressure Sodium) */}
          <linearGradient id="streetLightBeamGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="20%" stopColor="#fde047" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Overhead Streetlight Sidewalk / Curb Light Pool */}
          <radialGradient id="streetLightGroundPool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#fde047" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Auto-Rickshaw Specular Ruby Taillight Road Reflection */}
          <linearGradient id="rkTailRoadReflection" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </linearGradient>

          {/* Auto-Rickshaw Taillight Corona Bloom */}
          <radialGradient id="rkTailCorona" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#dc2626" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          {/* Procedural Smoke Radial Puff with Path-Traced Sunlight Scatter */}
          <radialGradient id="smokePuffGrad" cx="58%" cy="36%" r="55%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#fed7aa" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#64748b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0" />
          </radialGradient>

          {/* Road Dust Particle Radial Gradient */}
          <radialGradient id="dustParticleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#b45309" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>

          {/* Banyan Tree Foliage Radial Gradient */}
          <radialGradient id="banyanFoliageGrad" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="45%" stopColor="#166534" />
            <stop offset="85%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>

          {/* Gulmohar Blossom Cluster Radial Gradient */}
          <radialGradient id="gulmoharBlossomGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#ea580c" />
            <stop offset="80%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>

          {/* Path-Traced Directional Building Cast Shadow Gradient */}
          <linearGradient id="buildingCastShadowGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.65" />
            <stop offset="45%" stopColor="#090d16" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#0f172a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>

          {/* Volumetric Crepuscular Ray Gradients radiating from Sun (1520, 340) */}
          <linearGradient id="volumetricRayGrad1" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="20%" stopColor="#fef08a" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#fed7aa" stopOpacity="0.18" />
            <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="volumetricRayGrad2" x1="100%" y1="15%" x2="0%" y2="85%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.38" />
            <stop offset="60%" stopColor="#fed7aa" stopOpacity="0.2" />
            <stop offset="90%" stopColor="#f59e0b" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Soft Volumetric Blur Filters */}
          <filter id="softOcclusion" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
          </filter>
          <filter id="volumetricSunGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          {/* Path-Traced Volumetric Headlight Beam Blur (Eliminates harsh angular polygon cuts into atmospheric haze) */}
          <filter id="headlightBeamBlur" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          {/* Path-Traced Road Light Pool Blur (Seamlessly blends road reflection into bitumen texture) */}
          <filter id="roadLightPoolBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          {/* Filament & Prismatic Lens Bloom */}
          <filter id="lensCoronaBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* =========================================================================
            RESPONSIVE VIEWPORT STAGE CONTAINER (Centered on Mobile Portrait & Desktop)
            ========================================================================= */}
        <g id="scene-2-viewport-container" transform={isPortrait ? 'translate(-420, 200)' : undefined}>
          {/* =========================================================================
              LAYER 1: CINEMATIC SKY, DAWN SUNRISE, GOD RAYS & DRIFTING BIRDS
              ========================================================================= */}
          <g id="layer-sky">
            {/* Atmospheric Sunrise Base Backdrop (Extended width and height for all viewports) */}
            <rect x="-600" y="-200" width="3120" height="940" fill="url(#skySunriseGrad)" />

          {/* 3D REALISTIC VOLUMETRIC SUN RAYS & CREPUSCULAR SHAFTS (No Crosshairs!) */}
          <g id="volumetric-sun-rays" style={{ mixBlendMode: 'screen' }}>
            {/* Broad Atmospheric Light Cones fanning across from Sun at (1520, 340) */}
            <polygon points="1520,340 -300,520 -300,680" fill="url(#volumetricRayGrad1)" opacity="0.38" />
            <polygon points="1520,340 -100,660 140,730" fill="url(#volumetricRayGrad2)" opacity="0.42" />
            <polygon points="1520,340 320,700 560,735" fill="url(#volumetricRayGrad1)" opacity="0.48" />
            <polygon points="1520,340 700,715 960,750" fill="url(#volumetricRayGrad2)" opacity="0.52" />
            <polygon points="1520,340 1080,725 1340,765" fill="url(#volumetricRayGrad1)" opacity="0.55" />
            <polygon points="1520,340 1400,740 1660,790" fill="url(#volumetricRayGrad2)" opacity="0.52" />
            <polygon points="1520,340 1700,760 1980,820" fill="url(#volumetricRayGrad1)" opacity="0.45" />
          </g>

          {/* Wispy Cirrus Morning Cloud Strands */}
          <g opacity="0.65">
            <path d="M 120 160 C 260 140, 520 170, 780 150 C 960 135, 1240 165, 1480 145" fill="none" stroke="url(#cirrusCloudGrad)" strokeWidth="24" strokeLinecap="round" />
            <path d="M 340 220 C 580 200, 890 230, 1150 210 C 1380 195, 1680 215, 1860 200" fill="none" stroke="url(#cirrusCloudGrad)" strokeWidth="18" strokeLinecap="round" />
            <path d="M 40 290 C 240 275, 490 295, 720 280 C 980 265, 1280 290, 1540 275" fill="none" stroke="url(#cirrusCloudGrad)" strokeWidth="16" strokeLinecap="round" />
          </g>

          {/* 3D REALISTIC SUN: BLINDING SOLAR DISK, CORONA HALO & CINEMATIC BLOOM (NO CROSSHAIRS) */}
          <g id="sunrise-sun" transform="translate(1520, 340)">
            {/* Outer Giant Atmospheric Corona Glow */}
            <circle cx="0" cy="0" r="260" fill="url(#sunGlowGrad)" opacity="0.82" filter="url(#volumetricSunGlow)" />
            {/* Secondary Concentric Warm Corona Ring */}
            <circle cx="0" cy="0" r="150" fill="url(#sunGlowGrad)" opacity="0.92" />
            {/* Core Golden Flare */}
            <circle cx="0" cy="0" r="76" fill="#fef08a" opacity="0.95" />
            {/* Blazing White Solar Disk */}
            <circle cx="0" cy="0" r="46" fill="#ffffff" />

            {/* Cinematic Horizontal Anamorphic Bloom (Natural lens streak without crosshairs) */}
            <ellipse cx="0" cy="0" rx="360" ry="7" fill="#fef08a" opacity="0.3" />
            <ellipse cx="0" cy="0" rx="190" ry="3.5" fill="#ffffff" opacity="0.55" />
          </g>

          {/* Atmospheric Horizon Mist Layer */}
          <rect x="0" y="520" width="1920" height="190" fill="url(#horizonMistGrad)" />

          {/* Dynamic Flocks of Lahori Pigeons & Sparrows */}
          <g id="sky-birds">
            <g transform="translate(1080, 210) scale(0.7)" opacity="0.65">
              <path d="M 0 0 Q 10 -12 20 0 Q 30 -12 40 0" fill="none" stroke="#3b1d11" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g transform="translate(1140, 185) scale(0.55)" opacity="0.55">
              <path d="M 0 0 Q 10 -12 20 0 Q 30 -12 40 0" fill="none" stroke="#3b1d11" strokeWidth="2.4" strokeLinecap="round" />
            </g>
            <g transform="translate(1185, 230) scale(0.6)" opacity="0.6">
              <path d="M 0 0 Q 10 -12 20 0 Q 30 -12 40 0" fill="none" stroke="#3b1d11" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g transform="translate(1250, 205) scale(0.48)" opacity="0.5">
              <path d="M 0 0 Q 10 -12 20 0 Q 30 -12 40 0" fill="none" stroke="#3b1d11" strokeWidth="2.2" strokeLinecap="round" />
            </g>
            <g transform="translate(1310, 240) scale(0.52)" opacity="0.52">
              <path d="M 0 0 Q 10 -12 20 0 Q 30 -12 40 0" fill="none" stroke="#3b1d11" strokeWidth="2.3" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* =========================================================================
            LAYER 2: DISTANT LAHORE SKYLINE (0.14x Parallax: Badshahi Mosque & Fort)
            ========================================================================= */}
        <g id="layer-skyline" ref={skylineGroupRef} opacity="0.88">
          {[-1920, 0, 1920].map((baseX, idx) => (
            <g key={idx} transform={`translate(${baseX}, 0)`}>
              <g fill="#182234" stroke="#0f172a" strokeWidth="1">
                {/* ------------------------------------------------------------- */}
                {/* BADSHAHI MOSQUE MONUMENTAL COMPLEX                            */}
                {/* ------------------------------------------------------------- */}
                {/* Left Octagonal Minaret (8-tier Mughal minaret) */}
                <g transform="translate(210, 360)">
                  {/* Minaret Base Pedestal */}
                  <polygon points="6,270 26,270 24,240 8,240" fill="#24334a" />
                  {/* Shaft Tier 1 */}
                  <rect x="9" y="160" width="14" height="80" rx="1.5" />
                  {/* Balcony 1 (Jharoka) with Carved Brackets */}
                  <rect x="5" y="156" width="22" height="5" rx="1" fill="#334155" />
                  {/* Shaft Tier 2 */}
                  <rect x="10" y="80" width="12" height="76" rx="1" />
                  {/* Balcony 2 (Upper Jharoka) */}
                  <rect x="6" y="76" width="20" height="5" rx="1" fill="#334155" />
                  {/* Shaft Tier 3 (Pavilion / Chhatri) */}
                  <rect x="11" y="30" width="10" height="46" rx="1" />
                  {/* Octagonal Cupola Dome & Golden Finial */}
                  <polygon points="5,30 27,30 16,4" fill="#1e293b" />
                  <circle cx="16" cy="4" r="2.5" fill="#f59e0b" stroke="none" />
                  <line x1="16" y1="4" x2="16" y2="-6" stroke="#f59e0b" strokeWidth="1.2" />
                </g>

                {/* Left Secondary Marble Dome */}
                <path
                  d="M 252 630 L 252 540 C 252 485, 276 470, 282 445 C 288 470, 312 485, 312 540 L 312 630 Z"
                  fill="#1f2c42"
                />
                <polygon points="280,445 284,445 282,425" fill="#f59e0b" stroke="none" />

                {/* Grand Imperial Central Mughal Onion Dome */}
                <path
                  d="M 302 630 L 302 520 C 302 445, 348 425, 356 370 C 364 425, 410 445, 410 520 L 410 630 Z"
                  fill="#24334a"
                />
                {/* Sunlit Rim on Central Dome */}
                <path
                  d="M 356 370 C 364 425, 410 445, 410 520"
                  fill="none"
                  stroke="#fed7aa"
                  strokeWidth="2"
                  opacity="0.6"
                />
                {/* Imperial Triple Golden Kalasa Finial */}
                <polygon points="353,370 359,370 356,335" fill="#f59e0b" stroke="none" />
                <circle cx="356" cy="342" r="3" fill="#fef08a" stroke="none" />
                <circle cx="356" cy="352" r="4" fill="#f59e0b" stroke="none" />

                {/* Right Secondary Marble Dome */}
                <path
                  d="M 400 630 L 400 540 C 400 485, 424 470, 430 445 C 436 470, 460 485, 460 540 L 460 630 Z"
                  fill="#1f2c42"
                />
                <polygon points="428,445 432,445 430,425" fill="#f59e0b" stroke="none" />

                {/* Right Octagonal Minaret */}
                <g transform="translate(470, 360)">
                  <polygon points="6,270 26,270 24,240 8,240" fill="#24334a" />
                  <rect x="9" y="160" width="14" height="80" rx="1.5" />
                  <rect x="5" y="156" width="22" height="5" rx="1" fill="#334155" />
                  <rect x="10" y="80" width="12" height="76" rx="1" />
                  <rect x="6" y="76" width="20" height="5" rx="1" fill="#334155" />
                  <rect x="11" y="30" width="10" height="46" rx="1" />
                  <polygon points="5,30 27,30 16,4" fill="#1e293b" />
                  <circle cx="16" cy="4" r="2.5" fill="#f59e0b" stroke="none" />
                  <line x1="16" y1="4" x2="16" y2="-6" stroke="#f59e0b" strokeWidth="1.2" />
                </g>

                {/* ------------------------------------------------------------- */}
                {/* LAHORE FORT (SHAHI QILA) RAMPARTS & ALAMGIRI GATE SILHOUETTE  */}
                {/* ------------------------------------------------------------- */}
                <g transform="translate(560, 490)">
                  {/* Fluted Semi-Circular Bastion 1 */}
                  <path d="M 0 140 L 0 50 C 0 30, 40 30, 40 50 L 40 140 Z" fill="#202c3f" />
                  <polygon points="0,50 40,50 20,25" fill="#2d3f5a" />
                  {/* Fort Curtain Wall with Battlements (Merlons) */}
                  <rect x="40" y="70" width="120" height="70" fill="#1a2436" />
                  {[45, 65, 85, 105, 125, 145].map((mx) => (
                    <rect key={mx} x={mx} y="62" width="10" height="9" rx="1" fill="#2d3f5a" />
                  ))}
                  {/* Bastion 2 */}
                  <path d="M 160 140 L 160 50 C 160 30, 200 30, 200 50 L 200 140 Z" fill="#202c3f" />
                  <polygon points="160,50 200,50 180,25" fill="#2d3f5a" />
                </g>

                {/* ------------------------------------------------------------- */}
                {/* MODERN LAHORE CITY SILHOUETTE: TELECOM MAST & GLASS TOWERS    */}
                {/* ------------------------------------------------------------- */}
                {/* Telecommunications Broadcast Mast with Blinking Aviation Beacon */}
                <g transform="translate(860, 310)">
                  <line x1="20" y1="320" x2="20" y2="40" stroke="#334155" strokeWidth="3" />
                  <line x1="5" y1="320" x2="20" y2="40" stroke="#263445" strokeWidth="1.5" />
                  <line x1="35" y1="320" x2="20" y2="40" stroke="#263445" strokeWidth="1.5" />
                  {/* Horizontal Truss Braces */}
                  {[90, 140, 190, 240, 290].map((ty) => (
                    <line key={ty} x1="10" y1={ty} x2="30" y2={ty} stroke="#334155" strokeWidth="1.4" />
                  ))}
                  {/* Cross Bracing */}
                  <line x1="10" y1="190" x2="30" y2="240" stroke="#263445" strokeWidth="1" />
                  <line x1="30" y1="190" x2="10" y2="240" stroke="#263445" strokeWidth="1" />
                  {/* Microwave Drums */}
                  <circle cx="28" cy="115" r="7" fill="#475569" />
                  <circle cx="12" cy="165" r="8" fill="#475569" />
                  {/* Red Aviation Warning Beacon Light */}
                  <circle cx="20" cy="38" r="4" fill="#ef4444" className="animate-pulse" />
                  <circle cx="20" cy="38" r="8" fill="#ef4444" opacity="0.35" />
                </g>

                {/* Modern Commercial High-Rise Towers */}
                <g transform="translate(1080, 440)">
                  <rect x="0" y="0" width="130" height="190" rx="3" fill="#1b2537" />
                  {/* Stepped Architectural Crown */}
                  <rect x="15" y="-20" width="100" height="22" rx="2" fill="#23324a" />
                  <rect x="35" y="-38" width="60" height="20" rx="1.5" fill="#2d3e5b" />
                  <line x1="65" y1="-38" x2="65" y2="-65" stroke="#475569" strokeWidth="2.5" />
                  <circle cx="65" cy="-66" r="2.5" fill="#ef4444" />
                </g>

                <g transform="translate(1240, 475)">
                  <rect x="0" y="0" width="110" height="155" rx="3" fill="#1a2333" />
                  <rect x="18" y="-15" width="74" height="17" rx="2" fill="#243349" />
                </g>

                {/* Overhead Municipal Water Tower */}
                <g transform="translate(1410, 430)">
                  <line x1="15" y1="200" x2="25" y2="60" stroke="#334155" strokeWidth="4" />
                  <line x1="55" y1="200" x2="45" y2="60" stroke="#334155" strokeWidth="4" />
                  <ellipse cx="35" cy="50" rx="36" ry="24" fill="#24334a" />
                  <rect x="8" y="48" width="54" height="18" fill="#1c2738" />
                </g>
              </g>

              {/* Distant Warm Sunlit Horizon Rim */}
              <rect x="0" y="580" width="1920" height="70" fill="url(#sunGlowGrad)" opacity="0.14" />
            </g>
          ))}
        </g>

        {/* =========================================================================
            LAYER 3: MIDGROUND COLONIAL BUILDINGS, SHOPS & BANYAN TREES (0.45x Parallax)
            ========================================================================= */}
        <g id="layer-midground" ref={midgroundGroupRef}>
          {[-1920, 0, 1920].map((baseX, idx) => (
            <g key={idx} transform={`translate(${baseX}, 0)`}>
              {/* ------------------------------------------------------------- */}
              {/* BUILDING 1: 2-STORY COLONIAL BRICK COMMERCIAL BLOCK            */}
              {/* Lahore Electronics (لاہور الیکٹرانکس)                         */}
              {/* ------------------------------------------------------------- */}
              <g transform="translate(80, 440)">
                {/* Red-Brick Main Facade */}
                <rect width="480" height="270" fill="#2e1a14" stroke="#1c100c" strokeWidth="2.5" />
                {/* Decorative Brick Cornice Dentils */}
                <rect x="0" y="0" width="480" height="14" fill="#3f231b" />
                {Array.from({ length: 32 }).map((_, di) => (
                  <rect key={di} x={di * 15 + 2} y="14" width="10" height="6" fill="#1f110c" />
                ))}

                {/* 2nd Story Colonial Arched Windows with Keystones & Shutters */}
                {[35, 145, 255, 365].map((wx, wIdx) => (
                  <g key={wIdx} transform={`translate(${wx}, 36)`}>
                    {/* Outer Brick Arch Frame */}
                    <path d="M -4,78 L -4,30 C -4,0 74,0 74,30 L 74,78 Z" fill="#1f110c" />
                    {/* Window Glass Pane with Warm Amber Morning Glow */}
                    <path d="M 0,74 L 0,28 C 0,5 70,5 70,28 L 70,74 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="2" />
                    {/* Louvered Wooden Shutters */}
                    <rect x="2" y="26" width="31" height="48" fill="#3b2016" stroke="#1c100c" strokeWidth="1" />
                    <rect x="37" y="26" width="31" height="48" fill="#3b2016" stroke="#1c100c" strokeWidth="1" />
                    {/* Keystones */}
                    <polygon points="31,0 39,0 42,7 28,7" fill="#ca8a04" />
                  </g>
                ))}

                {/* Ground Floor Urdu Signboard: لاہور الیکٹرانکس */}
                <g transform="translate(40, 136)">
                  {/* Glowing Signboard Box */}
                  <rect width="400" height="62" rx="6" fill="#18181b" stroke="#facc15" strokeWidth="2.8" />
                  <rect x="4" y="4" width="392" height="54" rx="4" fill="#09090b" />
                  {/* Neon Perimeter Rim */}
                  <rect x="6" y="6" width="388" height="50" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.2" opacity="0.8" />
                  {/* Authentic Urdu Typography */}
                  <text
                    x="200"
                    y="40"
                    fill="#fef08a"
                    fontSize="26"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    لاہور الیکٹرانکس • ایل ای ڈی
                  </text>
                </g>

                {/* Ground Floor Showcase Glass & Merchandise Silhouettes */}
                <g transform="translate(45, 212)">
                  <rect width="390" height="58" fill="#0b0f17" stroke="#334155" strokeWidth="2" />
                  <rect x="15" y="10" width="80" height="44" rx="2" fill="#1e293b" />
                  <rect x="110" y="10" width="80" height="44" rx="2" fill="#1e293b" />
                  <rect x="205" y="10" width="80" height="44" rx="2" fill="#1e293b" />
                  <rect x="300" y="10" width="75" height="44" rx="2" fill="#1e293b" />
                </g>
              </g>

              {/* ------------------------------------------------------------- */}
              {/* STRUCTURAL OLD BANYAN TREE (برگد) WITH HANGING AERIAL ROOTS   */}
              {/* ------------------------------------------------------------- */}
              <g transform="translate(620, 390)">
                {/* Thick Gnarled Trunk with Bark Grooves */}
                <path
                  d="M 60,320 L 70,220 Q 55,160 85,120 Q 115,160 100,220 L 110,320 Z"
                  fill="#29180e"
                  stroke="#1c100c"
                  strokeWidth="2"
                />
                {/* Bark Relief Highlights */}
                <path d="M 72,310 Q 64,220 82,140" fill="none" stroke="#452718" strokeWidth="3" />
                <path d="M 88,310 Q 94,210 92,150" fill="none" stroke="#452718" strokeWidth="2.5" />

                {/* Sprawling Primary Horizontal Boughs */}
                <path d="M 75,150 Q 20,110 -40,120" fill="none" stroke="#29180e" strokeWidth="16" strokeLinecap="round" />
                <path d="M 95,140 Q 150,100 210,115" fill="none" stroke="#29180e" strokeWidth="16" strokeLinecap="round" />
                <path d="M 85,120 Q 85,60 85,10" fill="none" stroke="#29180e" strokeWidth="14" strokeLinecap="round" />

                {/* Signature Cascading Hanging Aerial Prop Roots */}
                {[-25, -5, 30, 130, 165, 190].map((rx, rIdx) => (
                  <path
                    key={rIdx}
                    d={`M ${rx},${115 + (rIdx % 3) * 10} Q ${rx + 5},220 ${rx - 2},320`}
                    fill="none"
                    stroke="#3b2016"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                ))}

                {/* Lush Layered Canopy Foliage Clusters (Banyan Leaf Masses) */}
                <circle cx="-30" cy="90" r="62" fill="url(#banyanFoliageGrad)" />
                <circle cx="30" cy="50" r="74" fill="url(#banyanFoliageGrad)" />
                <circle cx="85" cy="20" r="68" fill="url(#banyanFoliageGrad)" />
                <circle cx="150" cy="50" r="74" fill="url(#banyanFoliageGrad)" />
                <circle cx="205" cy="95" r="58" fill="url(#banyanFoliageGrad)" />
                <circle cx="85" cy="70" r="82" fill="url(#banyanFoliageGrad)" />

                {/* Dappled Sunlit Leaf Highlights */}
                <circle cx="20" cy="40" r="28" fill="#22c55e" opacity="0.35" />
                <circle cx="140" cy="40" r="32" fill="#22c55e" opacity="0.35" />
                <circle cx="85" cy="15" r="30" fill="#4ade80" opacity="0.38" />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* UTILITY POLE 1: STEP-DOWN TRANSFORMER & POWER DISTRIBUTION    */}
              {/* ------------------------------------------------------------- */}
              <g id="utility-pole-1" transform="translate(930, 370)">
                {/* Heavy Concrete Utility Mast */}
                <rect x="-1" y="0" width="18" height="340" fill="#1c1917" stroke="#09090b" strokeWidth="1.2" />
                {/* Diagonal Steel Crossarm Brace Struts */}
                <line x1="-30" y1="24" x2="8" y2="52" stroke="#334155" strokeWidth="2.2" />
                <line x1="46" y1="24" x2="8" y2="52" stroke="#334155" strokeWidth="2.2" />

                {/* Upper Heavy Wooden Crossarm */}
                <rect x="-48" y="20" width="112" height="10" rx="2" fill="#292524" stroke="#1c1917" strokeWidth="1" />
                {/* 4 Ceramic Bell Insulators */}
                {[-32, -8, 16, 40].map((ix) => (
                  <g key={ix} transform={`translate(${ix}, 14)`}>
                    <rect x="0" y="0" width="8" height="7" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
                    <circle cx="4" cy="7" r="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" />
                    <line x1="4" y1="-2" x2="4" y2="2" stroke="#475569" strokeWidth="1.2" />
                  </g>
                ))}

                {/* Heavy Pole-Mounted Cylindrical Transformer Unit */}
                <g transform="translate(-24, 62)">
                  <rect width="42" height="52" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
                  {/* Cooling Radiator Fins */}
                  {[6, 12, 18, 24, 30, 36].map((fx) => (
                    <line key={fx} x1={fx} y1="4" x2={fx} y2="48" stroke="#475569" strokeWidth="1.8" />
                  ))}
                  {/* High-Voltage Primary Bushings */}
                  <rect x="8" y="-8" width="7" height="9" rx="1.2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />
                  <rect x="26" y="-8" width="7" height="9" rx="1.2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />
                  <circle cx="11.5" cy="-8" r="1.5" fill="#f59e0b" />
                  <circle cx="29.5" cy="-8" r="1.5" fill="#f59e0b" />
                  {/* Secondary Low-Voltage Terminal Bushings */}
                  <rect x="16" y="51" width="10" height="5" rx="1" fill="#1e293b" />
                </g>

                {/* Transformer Primary Jumper Wires from Crossarm */}
                <path d="M -8,22 Q -12,42 -12,54" fill="none" stroke="#0f172a" strokeWidth="2.2" />
                <path d="M 16,22 Q 6,42 6,54" fill="none" stroke="#0f172a" strokeWidth="2.2" />
                {/* Copper Grounding Wire down to Road Bed */}
                <line x1="8" y1="62" x2="8" y2="340" stroke="#78350f" strokeWidth="1.4" />

                {/* Street Light Bracket Arm & Cobra-Head Fixture */}
                <path d="M 8,82 Q 40,70 65,76" fill="none" stroke="#334155" strokeWidth="3" />
                <ellipse cx="65" cy="77" rx="9" ry="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
                <ellipse cx="65" cy="79" rx="6" ry="2.5" fill="#fef08a" opacity="0.9" />
                <circle cx="65" cy="80" r="14" fill="#fef08a" filter="url(#lensCoronaBloom)" opacity="0.4" style={{ mixBlendMode: 'screen' }} />

                {/* Path-Traced Volumetric Downward Sodium Light Cone onto Road Curb */}
                <polygon
                  points="62,79 68,79 160,340 -30,340"
                  fill="url(#streetLightBeamGrad)"
                  filter="url(#headlightBeamBlur)"
                  opacity="0.32"
                  style={{ mixBlendMode: 'screen' }}
                />
                {/* Path-Traced Sodium Light Pool on Road Curb & Pavement */}
                <ellipse
                  cx="65"
                  cy="340"
                  rx="105"
                  ry="20"
                  fill="url(#streetLightGroundPool)"
                  filter="url(#roadLightPoolBlur)"
                  opacity="0.48"
                  style={{ mixBlendMode: 'screen' }}
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* UTILITY POLE 2: IN-LINE TRANSMISSION POLE (Down the Street)   */}
              {/* ------------------------------------------------------------- */}
              <g id="utility-pole-2" transform="translate(1960, 375)">
                {/* Heavy Concrete Utility Mast */}
                <rect x="-1" y="0" width="18" height="335" fill="#1c1917" stroke="#09090b" strokeWidth="1.2" />
                {/* Diagonal Steel Crossarm Brace Struts */}
                <line x1="-30" y1="24" x2="8" y2="52" stroke="#334155" strokeWidth="2.2" />
                <line x1="46" y1="24" x2="8" y2="52" stroke="#334155" strokeWidth="2.2" />
                {/* Upper Wooden Crossarm */}
                <rect x="-48" y="20" width="112" height="10" rx="2" fill="#292524" stroke="#1c1917" strokeWidth="1" />
                {/* 4 Ceramic Bell Insulators */}
                {[-32, -8, 16, 40].map((ix) => (
                  <g key={ix} transform={`translate(${ix}, 14)`}>
                    <rect x="0" y="0" width="8" height="7" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
                    <circle cx="4" cy="7" r="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" />
                  </g>
                ))}

                {/* Street Light Bracket Arm & Cobra-Head Fixture on Pole 2 */}
                <path d="M 8,82 Q 40,70 65,76" fill="none" stroke="#334155" strokeWidth="3" />
                <ellipse cx="65" cy="77" rx="9" ry="4" fill="#475569" stroke="#1e293b" strokeWidth="1" />
                <ellipse cx="65" cy="79" rx="6" ry="2.5" fill="#fef08a" opacity="0.9" />
                <circle cx="65" cy="80" r="14" fill="#fef08a" filter="url(#lensCoronaBloom)" opacity="0.4" style={{ mixBlendMode: 'screen' }} />

                {/* Path-Traced Volumetric Downward Sodium Light Cone onto Road Curb */}
                <polygon
                  points="62,79 68,79 160,335 -30,335"
                  fill="url(#streetLightBeamGrad)"
                  filter="url(#headlightBeamBlur)"
                  opacity="0.32"
                  style={{ mixBlendMode: 'screen' }}
                />
                {/* Path-Traced Sodium Light Pool on Road Curb & Pavement */}
                <ellipse
                  cx="65"
                  cy="335"
                  rx="105"
                  ry="20"
                  fill="url(#streetLightGroundPool)"
                  filter="url(#roadLightPoolBlur)"
                  opacity="0.48"
                  style={{ mixBlendMode: 'screen' }}
                />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* CONTINUOUS 3-PHASE TRANSMISSION POWER GRID (Spanning Across)  */}
              {/* ------------------------------------------------------------- */}
              <g id="continuous-transmission-grid">
                {/* Span A: From Left Upstream into Pole 1 */}
                <path d="M -150,310 Q 380,490 898,392" fill="none" stroke="#090d16" strokeWidth="2.8" />
                <path d="M -150,325 Q 400,505 922,392" fill="none" stroke="#090d16" strokeWidth="2.4" />
                <path d="M -150,340 Q 420,520 946,392" fill="none" stroke="#090d16" strokeWidth="2.0" />
                <path d="M -150,355 Q 440,535 970,392" fill="none" stroke="#090d16" strokeWidth="1.8" />

                {/* Span B: From Pole 1 to Pole 2 Across Karak Chai Hotel & Gulmohar */}
                <path d="M 898,392 Q 1420,490 1928,397" fill="none" stroke="#090d16" strokeWidth="2.8" />
                <path d="M 922,392 Q 1435,502 1952,397" fill="none" stroke="#090d16" strokeWidth="2.4" />
                <path d="M 946,392 Q 1450,514 1976,397" fill="none" stroke="#090d16" strokeWidth="2.0" />
                <path d="M 970,392 Q 1465,526 2000,397" fill="none" stroke="#090d16" strokeWidth="1.8" />

                {/* Span C: From Pole 2 into Next Conveyor Tile's Pole 1 */}
                <path d="M 1928,397 Q 2480,495 2998,392" fill="none" stroke="#090d16" strokeWidth="2.8" />
                <path d="M 1952,397 Q 2500,508 3022,392" fill="none" stroke="#090d16" strokeWidth="2.4" />
                <path d="M 1976,397 Q 2520,520 3046,392" fill="none" stroke="#090d16" strokeWidth="2.0" />
                <path d="M 2000,397 Q 2540,532 3070,392" fill="none" stroke="#090d16" strokeWidth="1.8" />

                {/* Service Drop 1: From Pole 1 Transformer to Karak Chai Hotel Weatherhead */}
                <path d="M 922,482 Q 1020,545 1110,485" fill="none" stroke="#090d16" strokeWidth="3.2" strokeLinecap="round" />
                {/* Service Drop 2: From Pole 1 Transformer to Lahore Electronics Building */}
                <path d="M 914,482 Q 680,545 440,470" fill="none" stroke="#090d16" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* ------------------------------------------------------------- */}
              {/* BUILDING 2: KARAK CHAI HOTEL (اصلی کڑک چائے و پراٹھا)         */}
              {/* ------------------------------------------------------------- */}
              <g transform="translate(1080, 460)">
                <rect width="410" height="250" fill="#382015" stroke="#1c0f0a" strokeWidth="2" />

                {/* Rooftop Electrical Weatherhead & Revenue Meter Box */}
                <g transform="translate(30, 25)">
                  <line x1="0" y1="0" x2="0" y2="70" stroke="#475569" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="3.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                  <rect x="-6" y="70" width="12" height="18" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1" />
                  <rect x="-3" y="73" width="6" height="5" rx="1" fill="#090d16" />
                </g>

                {/* Striped Canvas Cafe Awning */}
                <g transform="translate(15, 75)">
                  {Array.from({ length: 18 }).map((_, ai) => (
                    <polygon
                      key={ai}
                      points={`${ai * 21},0 ${(ai + 1) * 21},0 ${(ai + 1) * 21 - 5},28 ${ai * 21 - 5},28`}
                      fill={ai % 2 === 0 ? '#b91c1c' : '#fef08a'}
                      stroke="#450a0a"
                      strokeWidth="0.8"
                    />
                  ))}
                </g>

                {/* Warm Tungsten Hanging Lantern & Golden Ambient Glow */}
                <g transform="translate(200, 96)">
                  <line x1="0" y1="-21" x2="0" y2="0" stroke="#1e293b" strokeWidth="1.5" />
                  <path d="M -6,0 L 6,0 L 4,9 L -4,9 Z" fill="#334155" />
                  <circle cx="0" cy="12" r="5" fill="#fef08a" stroke="#d97706" strokeWidth="0.8" />
                  <circle cx="0" cy="12" r="35" fill="#fde047" opacity="0.22" style={{ mixBlendMode: 'screen' }} />
                </g>

                {/* Shop Signboard: اصلی کڑک چائے و پراٹھا */}
                <g transform="translate(30, 24)">
                  <rect width="350" height="50" rx="5" fill="#450a0a" stroke="#ef4444" strokeWidth="2.2" />
                  <text
                    x="175"
                    y="34"
                    fill="#fef08a"
                    fontSize="22"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    اصلی کڑک چائے و پراٹھا • منذ ۱۹۷۲
                  </text>
                </g>

                {/* Chai Tea Stall Front Counter & Steaming Kettle */}
                <g transform="translate(35, 120)">
                  <rect width="340" height="90" fill="#18181b" stroke="#334155" strokeWidth="1.5" />
                  {/* Brass Samovar / Kettle */}
                  <rect x="25" y="-18" width="34" height="22" rx="4" fill="#d97706" stroke="#92400e" strokeWidth="1.2" />
                  <ellipse cx="42" cy="-18" rx="14" ry="4" fill="#fbbf24" />
                  <path d="M 59,-10 L 67,-6 L 67,-3" fill="none" stroke="#d97706" strokeWidth="2.5" />
                  {/* Gentle Rising Steam Plumes */}
                  <path d="M 42,-22 Q 38,-35 44,-46 Q 50,-56 46,-68" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
                  <path d="M 48,-22 Q 54,-33 50,-44 Q 44,-54 48,-66" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />
                </g>
              </g>

              {/* ------------------------------------------------------------- */}
              {/* STRUCTURAL FLOWERING GULMOHAR TREE (گل مہر)                   */}
              {/* Fiery red-orange floral clusters with delicate feathery leaves */}
              {/* ------------------------------------------------------------- */}
              <g transform="translate(1560, 410)">
                {/* Spreading Gulmohar Trunk */}
                <path
                  d="M 50,300 L 58,200 Q 42,140 70,95 Q 98,140 82,200 L 90,300 Z"
                  fill="#29180e"
                  stroke="#1a0f08"
                  strokeWidth="2"
                />
                <path d="M 62,110 Q 15,80 -25,90" fill="none" stroke="#29180e" strokeWidth="13" strokeLinecap="round" />
                <path d="M 78,100 Q 130,70 185,85" fill="none" stroke="#29180e" strokeWidth="13" strokeLinecap="round" />

                {/* Dense Layered Blossom Clusters (Fiery Red-Orange Poinciana) */}
                <circle cx="-15" cy="70" r="50" fill="url(#gulmoharBlossomGrad)" />
                <circle cx="35" cy="40" r="58" fill="url(#gulmoharBlossomGrad)" />
                <circle cx="80" cy="20" r="54" fill="url(#gulmoharBlossomGrad)" />
                <circle cx="130" cy="45" r="56" fill="url(#gulmoharBlossomGrad)" />
                <circle cx="175" cy="75" r="46" fill="url(#gulmoharBlossomGrad)" />
                <circle cx="75" cy="55" r="66" fill="url(#gulmoharBlossomGrad)" />

                {/* Delicate Bipinnate Leaf Fronds Peeking Through */}
                <circle cx="-5" cy="50" r="22" fill="#15803d" opacity="0.65" />
                <circle cx="60" cy="18" r="24" fill="#15803d" opacity="0.65" />
                <circle cx="120" cy="30" r="24" fill="#15803d" opacity="0.65" />

                {/* Bright Fire Petal Highlights */}
                <circle cx="35" cy="35" r="22" fill="#f97316" opacity="0.6" />
                <circle cx="85" cy="22" r="20" fill="#facc15" opacity="0.5" />
              </g>
            </g>
          ))}
        </g>

        {/* =========================================================================
            LAYER 4: FOREGROUND ROAD ASPHALT, MARKINGS & CONVEYOR SYSTEM
            ========================================================================= */}
        <g id="layer-road">
          {/* Dark Textured Asphalt Surface (Extended bounds for full-bleed portrait and landscape) */}
          <rect x="-600" y="710" width="3120" height="900" fill="url(#roadSurfaceGrad)" />
          {/* Morning Sunlight Bitumen Sheen */}
          <rect x="-600" y="710" width="3120" height="900" fill="url(#asphaltSheenGrad)" />

          {/* Yellow & Black Diagonal Hazard Curb Header */}
          <g transform="translate(-600, 710)">
            <rect width="3120" height="15" fill="#090d16" />
            {Array.from({ length: 78 }).map((_, i) => (
              <polygon
                key={i}
                points={`${i * 40},0 ${i * 40 + 20},0 ${i * 40 + 10},15 ${i * 40 - 10},15`}
                fill={i % 2 === 0 ? '#facc15' : '#090d16'}
              />
            ))}
          </g>

          {/* Path-Traced Directional Building & Colonnade Ground Shadows (Cast Down-Left from Sun at 1520, 340) */}
          <polygon
            points="-600,725 2520,725 2360,762 -760,762"
            fill="url(#buildingCastShadowGrad)"
            opacity="0.85"
          />

          {/* Continuous Cycling Dashed White & Double Yellow Dividers (Conveyor moves LEFT) */}
          <g ref={roadLinesGroupRef}>
            {[-400, 0, 400, 800, 1200, 1600, 2000, 2400].map((rx, idx) => (
              <g key={idx} transform={`translate(${rx}, 0)`}>
                {/* Upper White Dashed Lane Line with Motion Blur Gradient */}
                <rect x="20" y="775" width="170" height="9" rx="4.5" fill="#ffffff" opacity="0.9" />
                {/* Double Solid Yellow Center Divider */}
                <rect x="0" y="858" width="140" height="6.5" rx="3.25" fill="#fbbf24" opacity="0.98" />
                <rect x="0" y="871" width="140" height="6.5" rx="3.25" fill="#fbbf24" opacity="0.98" />
                {/* Lower White Dashed Lane Line */}
                <rect x="40" y="990" width="150" height="10" rx="5" fill="#ffffff" opacity="0.92" />
                {/* Reflective Road Studs (Cat-Eyes) embedded between lines */}
                <circle cx="150" cy="864.5" r="2.8" fill="#ffffff" opacity="0.95" />
                <circle cx="150" cy="864.5" r="5" fill="#fef08a" opacity="0.35" />
              </g>
            ))}
          </g>

          {/* High-Speed Pavement Streak Lines */}
          <g opacity="0.35">
            <line x1="100" y1="772" x2="440" y2="772" stroke="#cbd5e1" strokeWidth="2.2" strokeDasharray="30 40 80 50" />
            <line x1="660" y1="808" x2="1200" y2="808" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="50 70 120 40" />
            <line x1="320" y1="918" x2="920" y2="918" stroke="#fef08a" strokeWidth="2.5" strokeDasharray="60 50 140 60" />
            <line x1="1080" y1="952" x2="1740" y2="952" stroke="#cbd5e1" strokeWidth="2.8" strokeDasharray="40 90 100 80" />
          </g>
        </g>

        {/* =========================================================================
            LAYER 5: ADJACENT TRAFFIC: ICONIC PAKISTANI AUTO-RICKSHAW (Facing RIGHT)
            With Ray-Traced Halogen Road Reflection & Volumetric Headlight Cone
            ========================================================================= */}
        <g id="layer-rickshaw" ref={rickshawGroupRef} transform="translate(1480, 0)">
          {/* Path-Traced Halogen Road Light Pool on Asphalt (Illuminates Road Surface)
              Starts at touchdown point x=780, y=790 where volumetric air cone strikes asphalt */}
          <path
            d="M 780 790 Q 980 765 1240 758 L 1240 822 Q 980 812 780 790 Z"
            fill="url(#rkRoadLightPool)"
            filter="url(#roadLightPoolBlur)"
            opacity="0.82"
            style={{ mixBlendMode: 'screen' }}
          />
          {/* High-Intensity Core Hotspot */}
          <ellipse
            cx="910"
            cy="790"
            rx="120"
            ry="15"
            fill="url(#rkBeamCorePool)"
            filter="url(#roadLightPoolBlur)"
            opacity="0.75"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Volumetric Headlight Beam Cone in Air (Lens at x=684, y=678 -> touches down at x=780, y=790) */}
          <polygon
            points="684,670 1240,715 1240,790 780,790 684,686"
            fill="url(#rkVolumetricBeamGrad)"
            filter="url(#headlightBeamBlur)"
            opacity="0.65"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Path-Traced Specular Taillight Road Reflection (Directly Below Rear Bumper at x=188) */}
          <ellipse cx="188" cy="792" rx="36" ry="7" fill="url(#rkTailRoadReflection)" opacity="0.88" style={{ mixBlendMode: 'screen' }} />
          <ellipse cx="188" cy="792" rx="60" ry="12" fill="#ef4444" opacity="0.22" style={{ mixBlendMode: 'screen' }} />

          <AutoRickshaw transform="translate(0, 395)" />
        </g>

        {/* =========================================================================
            LAYER 6: HERO COURIER RIDER & MOTORCYCLE
            Facing RIGHT (Driving Forward Down Lahore Boulevard)
            ========================================================================= */}
        <g id="layer-hero-bike" ref={bikeGroupRef}>
          {/* Ray-Traced Directional Ground Shadows (Projected Forward-Left from Sun at 1520, 340) */}
          <ellipse cx="780" cy="876" rx="68" ry="9" fill="#020617" opacity="0.88" />
          <ellipse cx="1140" cy="876" rx="68" ry="9" fill="#020617" opacity="0.88" />
          {/* Directional Body Shadow Skewed Forward-Left onto Asphalt */}
          <path
            d="M 680 878 C 640 882, 740 904, 940 904 C 1100 904, 1160 882, 1120 876 C 1020 874, 820 874, 680 878 Z"
            fill="#020617"
            opacity="0.68"
          />
          {/* Soft Road Shadow under Exhaust Smoke Plume */}
          <ellipse cx="560" cy="880" rx="130" ry="14" fill="#090d16" opacity="0.35" />

          {/* -----------------------------------------------------------------------
              PATH-TRACED ASPHALT ROAD ILLUMINATION POOL (Front of Motorcycle)
              Originates continuously at the exact road touchdown point x=1250, y=876!
              ----------------------------------------------------------------------- */}
          {/* Wide Diffuse Halogen Illumination Fan on Asphalt in 3D Perspective */}
          <path
            d="M 1250 876 Q 1540 838 1920 825 L 1920 940 Q 1540 920 1250 876 Z"
            fill="url(#bikeRoadLightPool)"
            filter="url(#roadLightPoolBlur)"
            opacity="0.88"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* High-Intensity Focused Beam Core Hot-Spot */}
          <ellipse
            cx="1440"
            cy="880"
            rx="160"
            ry="22"
            fill="url(#bikeBeamCorePool)"
            filter="url(#roadLightPoolBlur)"
            opacity="0.82"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Specular Yellow Road Line Reflection Highlight under Headlight */}
          <ellipse
            cx="1460"
            cy="864.5"
            rx="180"
            ry="9"
            fill="#fef08a"
            filter="url(#roadLightPoolBlur)"
            opacity="0.45"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* -----------------------------------------------------------------------
              FRONT HALOGEN HEADLIGHT VOLUMETRIC CONE (Origin at Headlight Lens x=1103, y=675)
              Touches down at road surface x=1250, y=876 with soft Gaussian atmospheric blur!
              ----------------------------------------------------------------------- */}
          <polygon
            ref={headlightBeamRef}
            points="1103,660 1920,715 1920,876 1250,876 1103,688"
            fill="url(#bikeVolumetricBeamGrad)"
            filter="url(#headlightBeamBlur)"
            opacity="0.55"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* -----------------------------------------------------------------------
              DYNAMIC ROAD DUST PARTICLES (Whips up from Rear Tire at x=720, y=872)
              ----------------------------------------------------------------------- */}
          <g id="road-dust-particles" ref={roadDustGroupRef}>
            {Array.from({ length: DUST_PARTICLE_COUNT }).map((_, di) => (
              <circle
                key={di}
                ref={(el) => {
                  dustElementsRef.current[di] = el;
                }}
                cx="720"
                cy="872"
                r="3"
                fill="url(#dustParticleGrad)"
                style={{ opacity: 0 }}
              />
            ))}
          </g>

          {/* -----------------------------------------------------------------------
              PROCEDURAL ANIMATED 4-STROKE EXHAUST SMOKE (Billowing to the Left from x=660, y=839)
              ----------------------------------------------------------------------- */}
          <g id="animated-exhaust-plume">
            {Array.from({ length: SMOKE_PUFF_COUNT }).map((_, i) => (
              <circle
                key={i}
                ref={(el) => {
                  smokePuffElementsRef.current[i] = el;
                }}
                cx="660"
                cy="839"
                r="8"
                fill="url(#smokePuffGrad)"
                style={{ opacity: 0 }}
              />
            ))}
          </g>

          {/* -----------------------------------------------------------------------
              KAMRAN'S FAR LIMBS (LEFT LEG & LEFT ARM BEHIND MOTORCYCLE)
              ----------------------------------------------------------------------- */}
          <CourierKamran layer="far" />

          {/* -----------------------------------------------------------------------
              AUTHENTIC ATLAS HONDA CD 70 MOTORCYCLE & SEALED SCENE 1 COD PARCEL
              ----------------------------------------------------------------------- */}
          <HondaCD70
            frontWheelRef={frontWheelRef}
            rearWheelRef={rearWheelRef}
            isMoving={true}
            showCargoRack={true}
          />

          {/* -----------------------------------------------------------------------
              KAMRAN (HERO COURIER RIDER) IN FOREGROUND WITH FIXED MIRROR VISOR
              ----------------------------------------------------------------------- */}
          <CourierKamran
            layer="near"
            visorDown={true}
            showParcel={false}
          />

          {/* -----------------------------------------------------------------------
              TYPEWRITER SPEECH BUBBLE (KAMRAN'S URGENT MISSION DIALOGUE)
              Positioned clearly above Kamran pointing to his helmet at (975, 450)
              ----------------------------------------------------------------------- */}
          <g ref={speechBubbleGroupRef} transform="translate(820, 310)" style={{ display: 'none' }}>
            {/* Speech Bubble Pointer pointing directly to helmet */}
            <polygon points="150,96 150,136 178,96" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.8" />
            <line x1="151" y1="96" x2="177" y2="96" stroke="#0b0f17" strokeWidth="2.5" />
            
            {/* ForeignObject Speech Box with True HTML Padding and Word Wrapping */}
            <foreignObject x="0" y="0" width="560" height="116" className="overflow-visible pointer-events-none">
              <div
                className="relative w-full min-h-[96px] rounded-2xl bg-[#0b0f17]/96 border-[1.6px] border-[#c9a47a] px-5 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.85)] flex flex-col justify-center box-border select-none"
              >
                {/* Speaker Badge */}
                <div className="absolute -top-3 left-6 bg-[#c9a47a] px-2.5 py-0.5 rounded text-[10px] font-black text-black tracking-wider uppercase shadow-sm">
                  KAMRAN (COURIER)
                </div>
                {/* Typewritten Dialogue Lines */}
                <p
                  ref={speechLine1Ref}
                  className="font-sans text-[13.5px] font-semibold text-white leading-snug break-words m-0 tracking-wide"
                />
                <p className="font-sans text-[12px] font-medium text-[#cbd5e1] italic leading-snug mt-1 break-words m-0">
                  <span ref={speechLine2Ref} />
                  <span ref={speechCursorRef} className="text-amber-500 font-bold not-italic ml-0.5 animate-pulse">|</span>
                </p>
              </div>
            </foreignObject>
          </g>
        </g>
      </g>
      </svg>
    </div>
  );
});

Scene2CityRush.displayName = 'Scene2CityRush';

export default Scene2CityRush;
