// src/components/landing/movie/Scene5DoorstepHandover.tsx
// Scene 5: 10:00 AM sunlit doorstep handover at Ayesha's Flat 4B where parcel #LP-9042 is exchanged for Rs. 4,500 COD.

import React, { useRef, useCallback, useEffect, forwardRef } from 'react';
import { Scene1Package } from './Scene1Package';
import { soundEngine } from '../cinema/SoundEngine';

export interface Scene5DoorstepHandle {
  setProgress: (progress: number) => void;
  setActive: (active: boolean) => void;
}

export interface Scene5DoorstepProps {
  isPortrait?: boolean;
  isActive?: boolean;
}

const HANDOVER_URDU =
  'السلام علیکم باجی! آپ کی واٹس ایپ لوکیشن پن سے سیدھا فلیٹ 4B تک آ گیا۔ یہ لیں آپ کا پارسل۔';
const HANDOVER_EN =
  'SALAM BAJI! YOUR WHATSAPP PIN LED ME STRAIGHT TO FLAT 4B. HERE IS PARCEL #LP-9042.';

export const Scene5DoorstepHandover = forwardRef<Scene5DoorstepHandle, Scene5DoorstepProps>(
  ({ isPortrait = false, isActive = false }, ref) => {
    const isActiveRef = useRef<boolean>(isActive);
    const progressRef = useRef<number>(0);

    // Zero-re-render SVG & DOM mutation refs
    const sunbeamGroupRef = useRef<SVGGElement>(null);
    const doorPanelGroupRef = useRef<SVGGElement>(null);
    const courierGroupRef = useRef<SVGGElement>(null);
    const courierArmsGroupRef = useRef<SVGGElement>(null);
    const ayeshaGroupRef = useRef<SVGGElement>(null);
    const ayeshaArmsGroupRef = useRef<SVGGElement>(null);
    const parcelTransferGroupRef = useRef<SVGGElement>(null);
    const parcelFloorShadowRef = useRef<SVGEllipseElement>(null);
    const cashTransferGroupRef = useRef<SVGGElement>(null);
    const deliveredBadgeGroupRef = useRef<SVGGElement>(null);

    // Bilingual Typewriter Dialogue Bubble Refs
    const speechBubbleRef = useRef<SVGGElement>(null);
    const speechUrduRef = useRef<HTMLParagraphElement>(null);
    const speechEnRef = useRef<HTMLSpanElement>(null);
    const speechCursorRef = useRef<HTMLSpanElement>(null);
    const lastTypedCharsRef = useRef<number>(-1);

    // Minimal 2-Line Bottom Caption Ref
    const scene5CaptionRef = useRef<HTMLDivElement>(null);

    // One-shot audio guard
    const hasPlayedDeliveryChimeRef = useRef<boolean>(false);

    const applyProgressMutations = useCallback((progress: number) => {
      progressRef.current = progress;

      // 1. Morning Sunbeams & Doorway Arrival (0.00 -> 0.25)
      const introT = Math.max(0, Math.min(1, progress / 0.22));
      const smoothIntro = introT * introT * (3 - 2 * introT);

      if (sunbeamGroupRef.current) {
        sunbeamGroupRef.current.setAttribute('opacity', (0.35 + smoothIntro * 0.65).toFixed(3));
      }

      if (doorPanelGroupRef.current) {
        // Subtle 3D perspective opening of carved walnut entrance door
        const doorSkew = -4 - smoothIntro * 4;
        const doorScaleX = 0.92 - smoothIntro * 0.14;
        doorPanelGroupRef.current.setAttribute(
          'transform',
          `translate(520, 148) scale(${doorScaleX.toFixed(3)}, 1) skewY(${doorSkew.toFixed(2)})`
        );
      }

      if (courierGroupRef.current) {
        const courierStepX = (1 - smoothIntro) * -28;
        courierGroupRef.current.setAttribute(
          'transform',
          `translate(${(690 + courierStepX).toFixed(1)}, 310)`
        );
      }

      if (ayeshaGroupRef.current) {
        const ayeshaStepX = (1 - smoothIntro) * 20;
        ayeshaGroupRef.current.setAttribute(
          'transform',
          `translate(${(1155 + ayeshaStepX).toFixed(1)}, 330)`
        );
      }

      // 2. Simultaneous Parcel #LP-9042 & Rs. 4,500 Cash Handover (0.14 -> 0.64)
      const rawHandover = Math.max(0, Math.min(1, (progress - 0.14) / 0.50));
      const handoverT = rawHandover * rawHandover * (3 - 2 * rawHandover);
      const arcLift = Math.sin(handoverT * Math.PI) * -16;

      // Parcel glides from Courier's hands (x=832, y=545) to Ayesha's receiving hands (x=974, y=538)
      const parcelX = 832 + handoverT * 142;
      const parcelY = 545 - handoverT * 7 + arcLift;

      if (parcelTransferGroupRef.current) {
        parcelTransferGroupRef.current.setAttribute(
          'transform',
          `translate(${parcelX.toFixed(1)}, ${parcelY.toFixed(1)}) scale(1.08)`
        );
      }
      if (parcelFloorShadowRef.current) {
        parcelFloorShadowRef.current.setAttribute('cx', (parcelX + 72).toFixed(1));
        const shadowOpacity = 0.36 - Math.sin(handoverT * Math.PI) * 0.08;
        parcelFloorShadowRef.current.setAttribute('opacity', shadowOpacity.toFixed(3));
      }

      // Rs. 4,500 Cash Notes glide from Ayesha's hand (x=1048, y=598) to Courier's hand (x=908, y=602)
      const cashX = 1048 - handoverT * 140;
      const cashY = 598 + handoverT * 4 - arcLift * 0.45;
      const cashRot = -8 + handoverT * 14;

      if (cashTransferGroupRef.current) {
        cashTransferGroupRef.current.setAttribute(
          'transform',
          `translate(${cashX.toFixed(1)}, ${cashY.toFixed(1)}) rotate(${cashRot.toFixed(1)})`
        );
      }

      // Forearm articulation following the handover
      if (courierArmsGroupRef.current) {
        const cArmDeg = -4 + Math.sin(handoverT * Math.PI) * -6 + handoverT * 3;
        courierArmsGroupRef.current.setAttribute(
          'transform',
          `translate(56, 210) rotate(${cArmDeg.toFixed(2)}) translate(-56, -210)`
        );
      }
      if (ayeshaArmsGroupRef.current) {
        const aArmDeg = 4 + Math.sin(handoverT * Math.PI) * 6 - handoverT * 4;
        ayeshaArmsGroupRef.current.setAttribute(
          'transform',
          `translate(0, 195) rotate(${aArmDeg.toFixed(2)}) translate(0, -195)`
        );
      }

      // 3. Verified Delivery Badge & Completion Chime (0.56 -> 0.88)
      const badgeT = Math.max(0, Math.min(1, (progress - 0.56) / 0.14));
      const smoothBadge = badgeT * badgeT * (3 - 2 * badgeT);

      if (progress >= 0.58 && progress <= 0.86 && !hasPlayedDeliveryChimeRef.current) {
        hasPlayedDeliveryChimeRef.current = true;
        soundEngine.playSuccessChime();
      } else if (progress < 0.50) {
        hasPlayedDeliveryChimeRef.current = false;
      }

      if (deliveredBadgeGroupRef.current) {
        deliveredBadgeGroupRef.current.setAttribute('opacity', smoothBadge.toFixed(3));
        const badgeY = 472 - smoothBadge * 14;
        deliveredBadgeGroupRef.current.setAttribute(
          'transform',
          `translate(960, ${badgeY.toFixed(1)})`
        );
      }

      // 4. Bilingual Typewriter Dialogue Bubble (0.10 -> 0.46, fades out 0.78 -> 0.88)
      const typeT = Math.max(0, Math.min(1, (progress - 0.10) / 0.34));
      const typedChars = Math.floor(typeT * HANDOVER_URDU.length);
      const bubbleFadeOut = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.10) : 1;

      if (speechBubbleRef.current) {
        if (typedChars <= 0 || bubbleFadeOut <= 0.01) {
          speechBubbleRef.current.style.display = 'none';
        } else {
          speechBubbleRef.current.style.display = 'block';
          speechBubbleRef.current.style.opacity = bubbleFadeOut.toFixed(3);
        }
      }
      if (typedChars !== lastTypedCharsRef.current) {
        lastTypedCharsRef.current = typedChars;
        const isComplete = typedChars >= HANDOVER_URDU.length;
        if (speechUrduRef.current) {
          speechUrduRef.current.textContent = isComplete
            ? `"${HANDOVER_URDU}"`
            : `"${HANDOVER_URDU.slice(0, typedChars)}`;
        }
        if (speechEnRef.current) {
          const enChars = Math.floor(typeT * HANDOVER_EN.length);
          speechEnRef.current.textContent = HANDOVER_EN.slice(0, enChars);
        }
        if (speechCursorRef.current) {
          speechCursorRef.current.style.display = isComplete ? 'none' : 'inline';
        }
      }

      // 5. Minimal 2-Line Bottom Caption (0.16 -> 0.86, fades out before cloud bookend completes)
      if (scene5CaptionRef.current) {
        let capOpacity = 0;
        if (progress >= 0.14 && progress <= 0.86) {
          const fadeIn = Math.min(1, (progress - 0.14) / 0.10);
          const fadeOut = Math.min(1, (0.86 - progress) / 0.10);
          capOpacity = Math.min(fadeIn, fadeOut);
        }
        scene5CaptionRef.current.style.opacity = capOpacity.toFixed(3);
        scene5CaptionRef.current.style.transform = `translate3d(-50%, ${(
          (1 - capOpacity) *
          12
        ).toFixed(1)}px, 0)`;
      }
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          applyProgressMutations(p);
        },
        setActive: (active: boolean) => {
          isActiveRef.current = active;
        },
      }),
      [applyProgressMutations]
    );

    useEffect(() => {
      applyProgressMutations(progressRef.current);
    }, [applyProgressMutations]);

    return (
      <div className="relative w-full h-full overflow-hidden bg-[#120d0a] select-none">
        <svg
          viewBox={isPortrait ? '0 0 1080 1520' : '0 0 1920 1080'}
          className="w-full h-full object-cover pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <style>{`
              @keyframes s5CharacterBlink {
                0%, 93%, 100% { transform: scaleY(1); }
                95.5%, 97% { transform: scaleY(0.08); }
              }
              @keyframes s5ChestBreathing {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50% { transform: translate(0.3px, -1.2px) scale(1.008); }
              }
              .s5-blink {
                animation: s5CharacterBlink 4.1s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
              .s5-breathing {
                animation: s5ChestBreathing 3.8s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
              @media (prefers-reduced-motion: reduce) {
                .s5-blink,
                .s5-breathing {
                  animation: none !important;
                }
              }
            `}</style>

            {/* 3D Soft Depth & Ambient Occlusion Filter (Matches CourierKamran #softOcclusion) */}
            <filter id="s5SoftOcclusion" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
            </filter>

            {/* 10:00 AM Sunlit Lahore Morning Sky Gradient (Outside Open Doorway) */}
            <linearGradient id="s5MorningSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="38%" stopColor="#bae6fd" />
              <stop offset="72%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Warm Gulberg III Foyer Limestone Wall Shader */}
            <linearGradient id="s5FoyerWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d2c22" />
              <stop offset="48%" stopColor="#2c1f18" />
              <stop offset="100%" stopColor="#1b130e" />
            </linearGradient>

            {/* Sunlit Travertine Marble Floor Gradient */}
            <linearGradient id="s5MarbleFloorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#443328" />
              <stop offset="45%" stopColor="#33251d" />
              <stop offset="100%" stopColor="#1c1410" />
            </linearGradient>

            {/* Volumetric 10:00 AM Golden Morning Sunbeam Ray Shader */}
            <linearGradient id="s5SunbeamGrad" x1="0%" y1="0%" x2="100%" y2="65%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.46" />
              <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>

            {/* Carved Walnut Entrance Door Timber Gradient */}
            <linearGradient id="s5WalnutDoorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5c341d" />
              <stop offset="50%" stopColor="#432311" />
              <stop offset="100%" stopColor="#291408" />
            </linearGradient>

            {/* ===============================================================
                COURIER KAMRAN 3D SHADERS (EXACT SCENE 3 COURIERKAMRAN.TSX)
                =============================================================== */}
            <radialGradient id="s5KamranSkinHead3D" cx="62%" cy="38%" r="65%" fx="68%" fy="32%">
              <stop offset="0%" stopColor="#f3c6a5" />
              <stop offset="35%" stopColor="#dc9e76" />
              <stop offset="70%" stopColor="#b57049" />
              <stop offset="92%" stopColor="#7c4224" />
              <stop offset="100%" stopColor="#9a5834" />
            </radialGradient>

            <linearGradient id="s5KamranSkinNeck3D" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#e2a882" />
              <stop offset="45%" stopColor="#b57049" />
              <stop offset="85%" stopColor="#653218" />
              <stop offset="100%" stopColor="#8a4e2d" />
            </linearGradient>

            <radialGradient id="s5KamranCheekFlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="s5KamranBeardStubble" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#271c18" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#1c1411" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#0f0a08" stopOpacity="0.95" />
            </linearGradient>

            <radialGradient id="s5KamranHelmetShell3D" cx="35%" cy="22%" r="75%" fx="28%" fy="15%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="18%" stopColor="#334155" />
              <stop offset="52%" stopColor="#0f172a" />
              <stop offset="85%" stopColor="#020617" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            <linearGradient id="s5KamranHelmetStripeGreen" x1="0%" y1="0%" x2="100%" y2="20%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="45%" stopColor="#10b981" />
              <stop offset="90%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="s5KamranVisorMirror" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <stop offset="28%" stopColor="#38bdf8" stopOpacity="0.88" />
              <stop offset="65%" stopColor="#0369a1" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.96" />
            </linearGradient>

            <linearGradient id="s5KamranJacketTorso3D" x1="10%" y1="5%" x2="90%" y2="95%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="22%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#047857" />
              <stop offset="88%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="s5KamranJacketSleeve3D" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="s5KamranJacketFarArm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="60%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            <linearGradient id="s5KamranHiVisStripe" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            <linearGradient id="s5KamranPantsThigh3D" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="68%" stopColor="#1e293b" />
              <stop offset="92%" stopColor="#090d16" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="s5KamranPantsCalf3D" x1="10%" y1="0%" x2="90%" y2="50%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="35%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#090d16" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="s5KamranPantsFarLeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <radialGradient id="s5KamranBoot3D" cx="65%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#57534e" />
              <stop offset="35%" stopColor="#292524" />
              <stop offset="80%" stopColor="#0c0a09" />
              <stop offset="100%" stopColor="#1c1917" />
            </radialGradient>

            {/* ===============================================================
                CUSTOMER AYESHA 3D SHADERS (EXACT CUSTOMERAYESHA.TSX)
                =============================================================== */}
            <radialGradient id="s5AyeshaSkin3D" cx="38%" cy="32%" r="68%" fx="32%" fy="26%">
              <stop offset="0%" stopColor="#fae1cb" />
              <stop offset="28%" stopColor="#ecc09e" />
              <stop offset="62%" stopColor="#d1966d" />
              <stop offset="88%" stopColor="#a66843" />
              <stop offset="100%" stopColor="#7d482a" />
            </radialGradient>

            <linearGradient id="s5AyeshaLimbSkin" x1="0%" y1="0%" x2="100%" y2="25%">
              <stop offset="0%" stopColor="#f7d9bf" />
              <stop offset="45%" stopColor="#dfac86" />
              <stop offset="82%" stopColor="#b87c54" />
              <stop offset="100%" stopColor="#8c5432" />
            </linearGradient>

            <radialGradient id="s5AyeshaCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.24" />
              <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="s5AyeshaHairGrad" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#3b2316" />
              <stop offset="28%" stopColor="#23140d" />
              <stop offset="68%" stopColor="#140b07" />
              <stop offset="100%" stopColor="#090504" />
            </linearGradient>

            <linearGradient id="s5AyeshaKurtaGrad" x1="12%" y1="5%" x2="88%" y2="95%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="22%" stopColor="#0d9488" />
              <stop offset="62%" stopColor="#0f766e" />
              <stop offset="88%" stopColor="#115e59" />
              <stop offset="100%" stopColor="#042f2e" />
            </linearGradient>

            <linearGradient id="s5AyeshaSleeve3D" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="25%" stopColor="#14b8a6" />
              <stop offset="70%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#042f2e" />
            </linearGradient>

            <linearGradient id="s5AyeshaFarArmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="55%" stopColor="#115e59" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            <linearGradient id="s5AyeshaDupattaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.94" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.88" />
              <stop offset="85%" stopColor="#fde68a" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
            </linearGradient>

            <radialGradient id="s5AyeshaIris3D" cx="42%" cy="38%" r="58%">
              <stop offset="0%" stopColor="#854d0e" />
              <stop offset="35%" stopColor="#451a03" />
              <stop offset="75%" stopColor="#291307" />
              <stop offset="100%" stopColor="#090504" />
            </radialGradient>

            <linearGradient id="s5AyeshaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="18%" stopColor="#d97706" />
              <stop offset="38%" stopColor="#fbbf24" />
              <stop offset="52%" stopColor="#ffffff" />
              <stop offset="68%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <radialGradient id="s5AyeshaPearlGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#fffbeb" />
              <stop offset="80%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            <linearGradient id="s5AyeshaOrganzaLace" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.88" />
            </linearGradient>

            <linearGradient id="s5AyeshaChuridar3D" x1="0%" y1="0%" x2="100%" y2="20%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="45%" stopColor="#f8fafc" />
              <stop offset="82%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <linearGradient id="s5Pkr1000Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="45%" stopColor="#0369a1" />
              <stop offset="80%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>

            <linearGradient id="s5Pkr500Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="55%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* Lahori Woven Crimson & Gold Foyer Runner Rug */}
            <linearGradient id="s5RunnerRugGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="50%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
          </defs>

          <g transform={isPortrait ? 'translate(-420, 210) scale(1)' : undefined}>
            {/* ===============================================================
                1. ARCHITECTURAL FOYER BACKGROUND & SUNLIT 10:00 AM DOORWAY
                =============================================================== */}
            {/* Interior Foyer Wall */}
            <rect x="0" y="0" width="1920" height="790" fill="url(#s5FoyerWallGrad)" />

            {/* Classic Wainscoting & Crown Molding */}
            <rect x="0" y="54" width="1920" height="14" fill="#4e382b" opacity="0.7" />
            <rect x="0" y="560" width="1920" height="230" fill="#231812" />
            <line x1="0" y1="560" x2="1920" y2="560" stroke="#785844" strokeWidth="4" />

            {/* Wainscot Recessed Wall Panels on Right Side */}
            {[980, 1240, 1500].map((px) => (
              <rect
                key={px}
                x={px}
                y="586"
                width="210"
                height="168"
                rx="4"
                fill="none"
                stroke="#4a3528"
                strokeWidth="2.5"
              />
            ))}

            {/* Framed Mountain & Waterfall Landscape Painting on Right Foyer Wall (Continuity with Scene 3) */}
            <g transform="translate(1350, 165)">
              {/* Frame Drop Shadow */}
              <rect x="8" y="10" width="290" height="190" rx="6" fill="#090604" opacity="0.65" />
              {/* Ornate Walnut & Brushed Gold Frame */}
              <rect
                x="0"
                y="0"
                width="290"
                height="190"
                rx="5"
                fill="#3b2313"
                stroke="#d97706"
                strokeWidth="3"
              />
              <rect
                x="12"
                y="12"
                width="266"
                height="166"
                rx="2"
                fill="#1e293b"
                stroke="#fcd34d"
                strokeWidth="1.5"
              />
              {/* Painting Sky & Sunlit Mountain Peaks */}
              <rect x="14" y="14" width="262" height="162" fill="#0f172a" />
              <circle cx="220" cy="48" r="18" fill="#fde68a" opacity="0.85" />
              <polygon points="14,142 78,64 148,142" fill="#334155" />
              <polygon points="78,64 102,92 64,92" fill="#f8fafc" opacity="0.85" />
              <polygon points="95,148 175,48 262,148" fill="#475569" />
              <polygon points="175,48 202,82 152,82" fill="#f8fafc" opacity="0.9" />
              {/* Cascading Waterfall & Emerald Valley River */}
              <path
                d="M172,82 Q166,115 154,148 L178,148 Q182,115 178,82 Z"
                fill="#bae6fd"
                opacity="0.9"
              />
              <path d="M14,142 L276,142 L276,176 L14,176 Z" fill="#065f46" />
              <path d="M138,148 Q160,162 210,176 L140,176 Z" fill="#38bdf8" opacity="0.8" />
            </g>

            {/* Brushed Brass Apartment Plaque next to Doorframe */}
            <g transform="translate(950, 240)">
              <rect x="3" y="5" width="136" height="54" rx="6" fill="#090503" opacity="0.65" />
              <rect
                x="0"
                y="0"
                width="136"
                height="54"
                rx="6"
                fill="#271911"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <circle cx="10" cy="10" r="2" fill="#fbbf24" />
              <circle cx="126" cy="10" r="2" fill="#fbbf24" />
              <circle cx="10" cy="44" r="2" fill="#fbbf24" />
              <circle cx="126" cy="44" r="2" fill="#fbbf24" />
              <text
                x="68"
                y="24"
                fill="#fef3c7"
                fontSize="14"
                fontFamily="monospace"
                fontWeight="900"
                textAnchor="middle"
                letterSpacing="1.5"
              >
                FLAT 4B
              </text>
              <text
                x="68"
                y="41"
                fill="#fbbf24"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
                textAnchor="middle"
                letterSpacing="0.8"
              >
                BLOCK H • GULBERG
              </text>
            </g>

            {/* ===============================================================
                2. OPEN ENTRANCE DOORWAY (10:00 AM SUNLIT GULBERG III EXTERIOR)
                =============================================================== */}
            <g id="flat-4b-open-doorway">
              {/* Outer Architectural Door Casing */}
              <rect
                x="498"
                y="126"
                width="414"
                height="668"
                rx="6"
                fill="#291b13"
                stroke="#785844"
                strokeWidth="4"
              />

              {/* Sunlit 10:00 AM Morning Sky & Gulberg III Exterior View */}
              <rect x="520" y="148" width="370" height="642" fill="url(#s5MorningSkyGrad)" />

              {/* Morning Sun Orb & Soft Atmospheric Glow */}
              <circle cx="775" cy="245" r="56" fill="#fef9c3" opacity="0.88" />
              <circle cx="775" cy="245" r="95" fill="#fde047" opacity="0.28" />

              {/* Distant Sunlit Lahore Neighbouring Villas & Cypress Trees */}
              <polygon points="520,540 615,475 710,540" fill="#d97706" opacity="0.35" />
              <rect x="545" y="495" width="135" height="120" fill="#fde68a" opacity="0.45" />
              {/* Cypress & Neem Foliage Silhouettes */}
              <path
                d="M665,580 Q682,420 700,580 Z"
                fill="#15803d"
                opacity="0.55"
              />
              <path
                d="M720,585 Q742,395 764,585 Z"
                fill="#166534"
                opacity="0.62"
              />
              <circle cx="835" cy="510" r="54" fill="#15803d" opacity="0.48" />

              {/* Exterior Breezeway Balustrade & Sunlit Terrace Floor */}
              <rect x="520" y="575" width="370" height="14" fill="#b45309" opacity="0.65" />
              <rect x="520" y="589" width="370" height="201" fill="#d6b48d" />
              <line x1="520" y1="650" x2="890" y2="650" stroke="#a8845e" strokeWidth="2" />
              <line x1="520" y1="715" x2="890" y2="715" stroke="#a8845e" strokeWidth="2" />

              {/* 3D Carved Walnut Entrance Door Wing (Swung Open Inward on Left Hinges) */}
              <g ref={doorPanelGroupRef} transform="translate(520, 148) scale(0.78, 1) skewY(-8)">
                {/* Door Edge Thickness */}
                <rect x="-14" y="0" width="14" height="642" fill="#1c0d06" />
                {/* Main Walnut Door Slab */}
                <rect
                  x="0"
                  y="0"
                  width="176"
                  height="642"
                  fill="url(#s5WalnutDoorGrad)"
                  stroke="#7c4a2b"
                  strokeWidth="2.5"
                />
                {/* Recessed Carved Timber Panels */}
                <rect
                  x="22"
                  y="36"
                  width="132"
                  height="180"
                  rx="4"
                  fill="#31180b"
                  stroke="#854d27"
                  strokeWidth="2"
                />
                <rect
                  x="22"
                  y="246"
                  width="132"
                  height="160"
                  rx="4"
                  fill="#31180b"
                  stroke="#854d27"
                  strokeWidth="2"
                />
                <rect
                  x="22"
                  y="436"
                  width="132"
                  height="164"
                  rx="4"
                  fill="#31180b"
                  stroke="#854d27"
                  strokeWidth="2"
                />
                {/* Brushed Brass Mortise Lockset & Lever Handle */}
                <rect x="148" y="302" width="14" height="58" rx="3" fill="#f59e0b" />
                <rect x="124" y="324" width="34" height="8" rx="4" fill="#fef08a" />
                <circle cx="155" cy="346" r="3" fill="#451a03" />
              </g>
            </g>

            {/* ===============================================================
                3. POLISHED TRAVERTINE MARBLE FLOOR & WOVEN RUNNER RUG
                =============================================================== */}
            <rect x="0" y="790" width="1920" height="290" fill="url(#s5MarbleFloorGrad)" />
            {/* Marble Threshold Sill */}
            <polygon
              points="495,790 915,790 945,812 475,812"
              fill="#786252"
              stroke="#a8907e"
              strokeWidth="1.5"
            />
            {/* Perspective Tile Grout Lines */}
            <line x1="0" y1="855" x2="1920" y2="855" stroke="#261b15" strokeWidth="2" />
            <line x1="0" y1="935" x2="1920" y2="935" stroke="#261b15" strokeWidth="2" />
            <line x1="0" y1="1025" x2="1920" y2="1025" stroke="#261b15" strokeWidth="2" />
            <line x1="520" y1="790" x2="310" y2="1080" stroke="#261b15" strokeWidth="2" />
            <line x1="890" y1="790" x2="860" y2="1080" stroke="#261b15" strokeWidth="2" />
            <line x1="1260" y1="790" x2="1440" y2="1080" stroke="#261b15" strokeWidth="2" />

            {/* Sunlit Floor Reflection Patch Across Threshold */}
            <polygon
              points="525,792 890,792 1290,1080 620,1080"
              fill="#fde68a"
              opacity="0.14"
            />

            {/* Lahori Woven Crimson & Gold Foyer Runner Rug (Grounded with Contact Shadow) */}
            <g id="foyer-runner-rug">
              <polygon
                points="946,844 1595,844 1715,1036 882,1036"
                fill="#090504"
                opacity="0.65"
              />
              <polygon
                points="950,838 1590,838 1705,1028 890,1028"
                fill="url(#s5RunnerRugGrad)"
                stroke="#f59e0b"
                strokeWidth="3"
              />
              <polygon
                points="975,854 1565,854 1665,1010 922,1010"
                fill="none"
                stroke="#fcd34d"
                strokeWidth="1.5"
                strokeDasharray="8 4"
                opacity="0.75"
              />
              {/* Geometric Medallions on Rug */}
              {[1140, 1310, 1480].map((mx) => (
                <polygon
                  key={mx}
                  points={`${mx},895 ${mx + 42},930 ${mx},965 ${mx - 42},930`}
                  fill="#450a0a"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              ))}
            </g>

            {/* Volumetric 10:00 AM Golden Morning Sunbeams Streaming Through Doorway */}
            <g ref={sunbeamGroupRef} opacity="0.9">
              <polygon
                points="520,148 890,148 1390,1080 660,1080"
                fill="url(#s5SunbeamGrad)"
              />
              <polygon
                points="590,148 890,148 1540,960 880,960"
                fill="url(#s5SunbeamGrad)"
                opacity="0.65"
              />
            </g>

            {/* Dynamic Floor Contact Shadow directly underneath the Exchanged Parcel */}
            <ellipse
              ref={parcelFloorShadowRef}
              cx="920"
              cy="872"
              rx="68"
              ry="14"
              fill="#050302"
              opacity="0.34"
            />

            {/* ===============================================================
                4. COURIER KAMRAN AT THE THRESHOLD (EXACT SCENE 3 3D ANATOMICAL RIG)
                =============================================================== */}
            <g ref={courierGroupRef} id="scene5-courier-rig" transform="translate(690, 310)">
              {/* Multi-Layer Ambient + High-Opacity Floor Contact Shadows */}
              <ellipse cx="75" cy="542" rx="92" ry="22" fill="#050302" opacity="0.55" />
              <ellipse cx="75" cy="540" rx="58" ry="12" fill="#020101" opacity="0.88" />

              {/* FAR-SIDE LIMBS (Darker Depth Shader Behind Torso, matching CourierKamran FarSideHumanLimbs) */}
              <g id="s5-kamran-far-limbs" opacity="0.94">
                {/* Far Left Leg (Thigh -> Knee -> Calf) */}
                <path
                  d="M 38 308 C 52 308, 66 355, 64 405 C 62 445, 58 478, 54 498 L 24 496 C 26 462, 30 422, 32 395 C 34 358, 28 322, 38 308 Z"
                  fill="url(#s5KamranPantsFarLeg)"
                />
                {/* Far Left Boot */}
                <path
                  d="M 22 492 L 58 492 C 74 496, 92 502, 98 512 C 100 518, 94 522, 82 522 L 18 522 C 15 512, 18 498, 22 492 Z"
                  fill="#0c0a09"
                  stroke="#334155"
                  strokeWidth="1"
                />
              </g>

              {/* FOREGROUND KAMRAN BODY (With #s5SoftOcclusion, matching CourierKamran RealisticHumanRider) */}
              <g id="s5-kamran-foreground-body" filter="url(#s5SoftOcclusion)">
                {/* 1. NEAR RIGHT LEG (Muscular Thigh, Knee Cap, Cargo Pocket, Calf & Leather Boot) */}
                <g id="s5-kamran-right-leg">
                  {/* Muscular Thigh & Articulated Knee Cap */}
                  <path
                    d="M 48 304
                       C 76 302, 106 332, 108 378
                       C 110 398, 108 412, 100 420
                       C 90 426, 72 422, 66 410
                       C 58 386, 46 352, 40 326
                       C 36 312, 40 305, 48 304 Z"
                    fill="url(#s5KamranPantsThigh3D)"
                  />
                  {/* Cargo Pocket on Side of Thigh with 3D Flap & Bevel (Exact CourierKamran lines 295-315) */}
                  <path
                    d="M 58 342 L 96 346 L 94 388 L 56 384 Z"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 56 340 L 98 344 L 96 355 L 55 351 Z"
                    fill="#334155"
                  />
                  <path
                    d="M 58 342 L 96 346"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    opacity="0.65"
                  />
                  {/* Paired Knee-Joint Articulation Creases */}
                  <path
                    d="M 68 404 Q 86 412 104 402"
                    fill="none"
                    stroke="#090d16"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 70 407 Q 88 415 104 405"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    opacity="0.55"
                    strokeLinecap="round"
                  />
                  {/* Lower Calf & Shin */}
                  <path
                    d="M 66 408
                       C 78 406, 100 412, 104 426
                       C 108 452, 106 482, 104 508
                       L 68 508
                       C 64 480, 60 442, 66 408 Z"
                    fill="url(#s5KamranPantsCalf3D)"
                  />
                  {/* Pant Cuff Overlap at Ankle */}
                  <path
                    d="M 66 504 Q 86 510 106 504"
                    fill="none"
                    stroke="#020617"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Sculpted 3D Leather Riding Boot (Exact CourierKamran lines 351-384) */}
                  <g id="s5-kamran-right-boot">
                    <path
                      d="M 70 502 L 102 502 L 106 520 L 68 520 Z"
                      fill="#1c1917"
                    />
                    <path
                      d="M 66 516
                         L 106 514
                         C 122 518, 140 522, 148 530
                         C 152 535, 148 540, 138 540
                         L 64 540
                         C 60 534, 62 522, 66 516 Z"
                      fill="url(#s5KamranBoot3D)"
                    />
                    <path
                      d="M 108 518 C 122 521, 136 525, 143 531"
                      fill="none"
                      stroke="#a8a29e"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                    <path
                      d="M 62 536 L 146 536 L 144 542 L 62 542 Z"
                      fill="#090d16"
                    />
                  </g>
                </g>

                {/* 2. TORSO & RASAI DISPATCH JACKET (Exact CourierKamran #TorsoAndJacket lines 394-462) */}
                <g id="s5-kamran-torso-jacket" className="s5-breathing">
                  {/* Natural S-Curve Spine, Ribcage Volume & Waist */}
                  <path
                    d="M 22 146
                       C 38 130, 78 128, 102 146
                       C 120 166, 126 204, 120 246
                       C 116 276, 110 302, 104 316
                       C 82 324, 42 322, 24 310
                       C 14 278, 12 232, 16 192
                       C 18 168, 16 154, 22 146 Z"
                    fill="url(#s5KamranJacketTorso3D)"
                  />
                  {/* Breathable Dark Side Seam Panel (Exact CourierKamran lines 410-416) */}
                  <path
                    d="M 52 178 C 72 192, 84 236, 78 312 L 42 310 C 46 250, 44 206, 52 178 Z"
                    fill="#042f2e"
                    opacity="0.55"
                  />
                  {/* High-Collar Neck Guard */}
                  <path
                    d="M 46 130 L 94 138 C 98 148, 92 158, 82 158 L 42 148 Z"
                    fill="#064e3b"
                    stroke="#10b981"
                    strokeWidth="1"
                  />
                  {/* Paired 3D Cloth Folds on Lumbar & Chest (Dark Valley + Specular Ridge, CourierKamran lines 425-443) */}
                  <path
                    d="M 22 228 Q 58 240 94 232"
                    fill="none"
                    stroke="#022c22"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 24 231 Q 60 243 92 235"
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="1.5"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 24 268 Q 62 280 104 268"
                    fill="none"
                    stroke="#022c22"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 26 271 Q 64 283 102 271"
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="1.3"
                    opacity="0.45"
                    strokeLinecap="round"
                  />
                  {/* 3M Hi-Vis Reflective Safety Chest Sash (Exact CourierKamran lines 446-455) */}
                  <path
                    d="M 15 198 C 48 212, 88 214, 122 204 L 120 222 C 86 232, 46 230, 15 216 Z"
                    fill="url(#s5KamranHiVisStripe)"
                  />
                  <path
                    d="M 15 204 C 48 218, 88 220, 121 210"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.75"
                  />
                  {/* Bottom Jacket Elastic Hem Rim */}
                  <path
                    d="M 24 308 C 52 320, 82 322, 106 312"
                    fill="none"
                    stroke="#022c22"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </g>

                {/* 3. KAMRAN NECK, SCULPTED HUMAN FACE & OPEN-FACE HELMET (Exact CourierKamran #HeadAndHelmet3D lines 467-696) */}
                <g id="s5-kamran-head-and-helmet" transform="translate(-262, -28)">
                  {/* Cylindrical Neck & Sub-Chin Shadow */}
                  <path
                    d="M 322 128 L 352 132 L 348 168 L 314 160 Z"
                    fill="url(#s5KamranSkinNeck3D)"
                  />
                  <path
                    d="M 324 130 C 336 138, 346 140, 352 135 L 350 150 C 338 148, 328 142, 322 134 Z"
                    fill="#431e0d"
                    opacity="0.55"
                  />

                  {/* Sculpted Human Face (Brow Ridge, Nose, Mustache, Beard Stubble, Eye Socket, Ear) */}
                  <g id="s5-kamran-sculpted-face">
                    <path
                      d="M 320 75
                         C 348 75, 368 88, 370 105
                         C 371 111, 369 115, 370 119
                         C 373 125, 379 132, 379 136
                         C 379 140, 374 141, 371 142
                         C 373 145, 374 147, 372 150
                         C 374 152, 373 156, 370 158
                         C 368 160, 367 163, 368 166
                         C 369 170, 363 174, 354 173
                         C 338 172, 324 162, 318 148
                         C 312 132, 312 95, 320 75 Z"
                      fill="url(#s5KamranSkinHead3D)"
                    />
                    <ellipse cx="354" cy="136" rx="14" ry="10" fill="url(#s5KamranCheekFlush)" />
                    <path d="M 371 140 Q 374 138 376 140" fill="#5c2d16" opacity="0.75" />
                    <path
                      d="M 364 138 Q 360 146 362 154"
                      fill="none"
                      stroke="#7c4224"
                      strokeWidth="1.2"
                      opacity="0.5"
                      strokeLinecap="round"
                    />
                    {/* Groomed Beard Stubble & Mustache */}
                    <path
                      d="M 334 128
                         C 338 138, 344 148, 356 148
                         C 364 148, 368 143, 372 144
                         C 374 146, 373 150, 370 151
                         C 364 151, 362 156, 367 158
                         C 370 160, 369 169, 358 172
                         C 342 174, 326 164, 321 148
                         C 320 140, 326 130, 334 128 Z"
                      fill="url(#s5KamranBeardStubble)"
                    />
                    <path
                      d="M 360 146 Q 368 143 374 148"
                      fill="none"
                      stroke="#0f0a08"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    {/* Warm Friendly Smile Under Mustache */}
                    <path
                      d="M 361 151 Q 367 155 372 150"
                      fill="none"
                      stroke="#fde8d7"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    {/* Deep-Set Realistic Eye with Socket Shadow & Specular Catchlight */}
                    <g id="s5-kamran-realistic-eye">
                      <ellipse cx="360" cy="117" rx="8" ry="6" fill="#7c4224" opacity="0.55" />
                      <g className="s5-blink">
                        <path
                          d="M 353 117 Q 361 112 367 117 Q 361 121 353 117 Z"
                          fill="#f8fafc"
                        />
                        <circle cx="362" cy="117" r="3.2" fill="#291509" />
                        <circle cx="362.5" cy="117" r="1.5" fill="#000000" />
                        <circle cx="361.2" cy="115.6" r="1.1" fill="#ffffff" />
                        <path
                          d="M 352 116 Q 360 110 368 116"
                          fill="none"
                          stroke="#271206"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </g>
                      <path
                        d="M 351 108 Q 361 104 369 109"
                        fill="none"
                        stroke="#181210"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Sculpted Anatomical Ear */}
                    <g id="s5-kamran-ear">
                      <path
                        d="M 326 116 C 318 112, 314 122, 317 132 C 319 139, 326 142, 330 137"
                        fill="url(#s5KamranSkinHead3D)"
                        stroke="#8a4e2d"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M 324 120 C 320 120, 319 127, 323 132"
                        fill="none"
                        stroke="#653218"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </g>
                  </g>

                  {/* 3D Open-Face Helmet with Flipped-Up Mirror Visor & Temple Hinge (Exact CourierKamran lines 597-695) */}
                  <g id="s5-kamran-helmet-3d">
                    <path
                      d="M 290 124
                         C 282 88, 304 54, 344 56
                         C 368 57, 384 72, 388 92
                         C 374 88, 355 90, 344 100
                         C 334 109, 332 122, 330 138
                         C 316 140, 298 134, 290 124 Z"
                      fill="url(#s5KamranHelmetShell3D)"
                    />
                    <path
                      d="M 294 102 C 312 76, 348 68, 382 80 C 378 86, 372 88, 364 87 C 338 80, 312 88, 296 112 Z"
                      fill="url(#s5KamranHelmetStripeGreen)"
                    />
                    <path
                      d="M 304 78 C 324 62, 352 60, 374 68"
                      fill="none"
                      stroke="#f8fafc"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <path
                      d="M 290 124
                         C 298 134, 316 140, 330 138
                         C 332 122, 334 109, 344 100
                         C 355 90, 374 88, 388 92"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Chin Strap & Buckle */}
                    <path
                      d="M 326 136 L 344 168 L 352 167 L 333 135 Z"
                      fill="#0f172a"
                    />
                    <rect x="336" y="154" width="8" height="6" rx="1.5" fill="#dc2626" transform="rotate(25 340 157)" />
                    {/* Flipped-Up Visor (-30deg) */}
                    <g transform="translate(336, 108) rotate(-30) translate(-336, -108)">
                      <path
                        d="M 336 106
                           C 350 92, 374 88, 392 94
                           C 399 108, 398 126, 389 138
                           C 372 138, 350 126, 336 106 Z"
                        fill="url(#s5KamranVisorMirror)"
                        stroke="#bae6fd"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M 350 100 C 366 94, 382 94, 390 100 C 392 108, 390 118, 384 124 C 374 118, 360 110, 350 100 Z"
                        fill="#ffffff"
                        opacity="0.45"
                      />
                    </g>
                    {/* Mechanical Temple Pivot Hinge Pod */}
                    <g id="s5-kamran-helmet-hinge">
                      <ellipse cx="336" cy="108" rx="11.5" ry="9.5" transform="rotate(-14 336 108)" fill="#020617" opacity="0.6" />
                      <ellipse cx="336" cy="108" rx="10" ry="8" transform="rotate(-14 336 108)" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                      <circle cx="336" cy="108" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                      <circle cx="336" cy="108" r="2.2" fill="#94a3b8" />
                      <circle cx="330" cy="109" r="1.1" fill="#64748b" />
                      <circle cx="342" cy="107" r="1.1" fill="#64748b" />
                    </g>
                  </g>
                </g>

                {/* 4. ARTICULATED KAMRAN ARMS (Deltoid Cap, Bicep Taper, Elbow Wrinkles, Forearm Sleeve & Sculpted 3D Hands) */}
                <g ref={courierArmsGroupRef}>
                  {/* Far Left Arm (Receiving Rs. 4,500 Cash Bundle) */}
                  <g id="s5-kamran-left-arm" opacity="0.95">
                    <path
                      d="M 78 164 C 102 166, 128 192, 148 226 L 210 242 L 206 268 L 136 254 C 110 226, 86 202, 68 188 Z"
                      fill="url(#s5KamranJacketFarArm)"
                      stroke="#022c22"
                      strokeWidth="1.2"
                    />
                    {/* Sculpted Left Hand Receiving Cash */}
                    <path
                      d="M 206 244 C 220 242, 234 246, 238 254 C 240 260, 230 268, 214 268 L 204 266 Z"
                      fill="url(#s5KamranSkinHead3D)"
                      stroke="#7c4224"
                      strokeWidth="1"
                    />
                  </g>

                  {/* Near Right Arm (Deltoid -> Bicep -> Elbow Creases -> Forearm -> Sculpted Hand Handing Parcel #LP-9042) */}
                  <g id="s5-kamran-right-arm">
                    {/* Deltoid Shoulder Cap & Bicep/Tricep Taper (Exact CourierKamran lines 702-715) */}
                    <path
                      d="M 42 162
                         C 62 154, 86 168, 98 192
                         C 110 212, 122 228, 132 238
                         C 122 254, 104 260, 92 248
                         C 74 230, 56 210, 42 192
                         C 34 180, 34 166, 42 162 Z"
                      fill="url(#s5KamranJacketSleeve3D)"
                    />
                    {/* Overlapping Forearm Sleeve Starting at Elbow */}
                    <path
                      d="M 108 222
                         C 118 214, 134 218, 148 222
                         L 204 224
                         L 206 252
                         L 124 258
                         C 108 256, 100 234, 108 222 Z"
                      fill="url(#s5KamranJacketSleeve3D)"
                    />
                    {/* Paired Elbow Joint Wrinkles (Exact CourierKamran lines 739-746) */}
                    <path
                      d="M 110 226 Q 124 236 120 250"
                      fill="none"
                      stroke="#022c22"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 114 224 Q 128 234 124 248"
                      fill="none"
                      stroke="#6ee7b7"
                      strokeWidth="1.2"
                      opacity="0.55"
                      strokeLinecap="round"
                    />
                    {/* Forearm Cuff & Elastic Wristband */}
                    <rect x="196" y="223" width="10" height="30" rx="3" fill="#064e3b" stroke="#022c22" strokeWidth="1" />
                    {/* Sculpted 3D Right Hand & Articulated Fingers Supporting Parcel #LP-9042 */}
                    <path
                      d="M 204 226 C 218 222, 232 226, 238 234 C 240 242, 232 252, 216 252 L 204 250 Z"
                      fill="url(#s5KamranSkinHead3D)"
                      stroke="#7c4224"
                      strokeWidth="1"
                    />
                    <path
                      d="M 214 224 C 224 218, 234 218, 238 223 C 238 227, 228 230, 218 230 Z"
                      fill="url(#s5KamranSkinHead3D)"
                      stroke="#7c4224"
                      strokeWidth="0.9"
                    />
                    <line x1="224" y1="236" x2="236" y2="236" stroke="#7c4224" strokeWidth="1" />
                    <line x1="222" y1="242" x2="235" y2="242" stroke="#7c4224" strokeWidth="1" />
                  </g>
                </g>
              </g>
            </g>

            {/* ===============================================================
                5. ULTRA-REALISTIC 3D AYESHA AT THE THRESHOLD (EXACT SCENE 3/4 RIG)
                =============================================================== */}
            <g ref={ayeshaGroupRef} id="scene5-ayesha-rig" transform="translate(1155, 330)">
              {/* Multi-Layer Ambient + High-Opacity Floor Contact Shadows */}
              <ellipse cx="0" cy="522" rx="88" ry="20" fill="#050302" opacity="0.52" />
              <ellipse cx="0" cy="520" rx="54" ry="11" fill="#020101" opacity="0.88" />

              {/* Volumetric Back Mahogany Hair Cascade */}
              <path
                d="M -16 14 C 22 10, 48 46, 46 112 C 44 156, 30 192, 12 204 C -8 192, -18 140, -16 14 Z"
                fill="url(#s5AyeshaHairGrad)"
              />

              {/* FAR-SIDE LIMBS (Behind Torso) */}
              <g id="s5-ayesha-far-limbs" opacity="0.95">
                {/* Far Left Leg in Tailored Ivory Churidar & Embroidered Khussa */}
                <path
                  d="M -30 340 C -32 392, -34 442, -34 488 L -6 488 C -4 442, -2 392, 0 340 Z"
                  fill="#cbd5e1"
                />
                {/* Gathered Churidar Ankle Folds */}
                <path d="M -34 468 Q -20 474 -6 468" fill="none" stroke="#64748b" strokeWidth="2" />
                <path d="M -34 476 Q -20 482 -6 476" fill="none" stroke="#64748b" strokeWidth="2" />
                <rect x="-34" y="482" width="28" height="6" fill="url(#s5AyeshaGoldGrad)" />
                {/* Far Left Foot & Handcrafted Lahori Khussa */}
                <path
                  d="M -64 490 C -54 486, -36 486, -4 488 L -2 504 L -64 504 C -72 502, -72 492, -64 490 Z"
                  fill="#78350f"
                  stroke="url(#s5AyeshaGoldGrad)"
                  strokeWidth="1.5"
                />
              </g>

              {/* FOREGROUND AYESHA BODY (With #s5SoftOcclusion, matching CustomerAyesha & CourierKamran) */}
              <g id="s5-ayesha-foreground-body" filter="url(#s5SoftOcclusion)">
                {/* 1. NEAR RIGHT LEG (Churidar Trousers, Gathered Ankle Folds & Embroidered Khussa) */}
                <g id="s5-ayesha-near-leg">
                  <path
                    d="M 0 340 C 2 396, 4 448, 4 498 L 34 498 C 36 448, 38 396, 38 340 Z"
                    fill="url(#s5AyeshaChuridar3D)"
                  />
                  {/* Paired Churidar Ankle Gather Folds (Dark Valley + Specular Ridge) */}
                  <path d="M 4 472 Q 19 478 34 472" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M 4 474 Q 19 480 34 474" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
                  <path d="M 4 482 Q 19 488 34 482" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" />
                  <rect x="4" y="490" width="30" height="6" fill="url(#s5AyeshaGoldGrad)" />
                  {/* Sculpted Foot Arch & Handcrafted Gold-Embroidered Khussa */}
                  <path d="M -18 496 L 30 496 L 30 504 L -18 504 Z" fill="url(#s5AyeshaLimbSkin)" />
                  <path
                    d="M -32 500 C -20 496, 4 498, 34 498 L 36 514 L -32 514 C -42 512, -42 502, -32 500 Z"
                    fill="#92400e"
                    stroke="url(#s5AyeshaGoldGrad)"
                    strokeWidth="1.6"
                  />
                  <path d="M -26 506 Q 2 502 28 506" fill="none" stroke="#fde68a" strokeWidth="1.2" strokeDasharray="3 2" />
                </g>

                {/* 2. ANATOMICAL S-CURVE TORSO, EMBROIDERED SAGE-TEAL KURTA & IVORY/GOLD DUPATTA */}
                <g id="s5-ayesha-torso" className="s5-breathing">
                  <path
                    d="M -34 138
                       C -12 126, 22 126, 40 140
                       C 52 174, 54 226, 48 274
                       C 46 308, 50 342, 54 368
                       C 18 378, -20 376, -50 364
                       C -44 326, -38 282, -42 238
                       C -46 198, -42 160, -34 138 Z"
                    fill="url(#s5AyeshaKurtaGrad)"
                    stroke="#042f2e"
                    strokeWidth="1.8"
                  />
                  {/* Tailored Dark Side-Seam Depth Panel */}
                  <path
                    d="M 24 166 C 36 210, 40 278, 42 366 L 52 366 C 50 282, 48 206, 38 144 Z"
                    fill="#042f2e"
                    opacity="0.48"
                  />
                  {/* Paired 3D Cloth Folds Across Bust, Waist & Hip (Dark Valley + Specular Ridge) */}
                  <path d="M -36 198 Q 0 214 34 196" fill="none" stroke="#022c22" strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M -34 201 Q 2 217 32 199" fill="none" stroke="#5eead4" strokeWidth="1.3" opacity="0.48" strokeLinecap="round" />
                  <path d="M -36 244 Q 2 258 38 242" fill="none" stroke="#022c22" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M -34 247 Q 4 261 36 245" fill="none" stroke="#5eead4" strokeWidth="1.2" opacity="0.42" strokeLinecap="round" />
                  <path d="M -40 294 Q 4 308 42 292" fill="none" stroke="#022c22" strokeWidth="3.0" strokeLinecap="round" />
                  <path d="M -38 297 Q 6 311 40 295" fill="none" stroke="#5eead4" strokeWidth="1.1" opacity="0.38" strokeLinecap="round" />

                  {/* Intricate Gold Zari Neckline (Gala) & Pearl Placket Buttons (Exact CustomerAyesha) */}
                  <path
                    d="M -22 138 Q -4 172 16 138"
                    fill="none"
                    stroke="url(#s5AyeshaGoldGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -17 141 Q -4 166 11 141"
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <rect x="-7" y="162" width="6" height="58" rx="1.5" fill="#0f766e" stroke="url(#s5AyeshaGoldGrad)" strokeWidth="1" />
                  <circle cx="-4" cy="172" r="2.2" fill="url(#s5AyeshaPearlGrad)" stroke="#b45309" strokeWidth="0.7" />
                  <circle cx="-4" cy="186" r="2.2" fill="url(#s5AyeshaPearlGrad)" stroke="#b45309" strokeWidth="0.7" />
                  <circle cx="-4" cy="200" r="2.2" fill="url(#s5AyeshaPearlGrad)" stroke="#b45309" strokeWidth="0.7" />
                  <circle cx="-4" cy="214" r="2.2" fill="url(#s5AyeshaPearlGrad)" stroke="#b45309" strokeWidth="0.7" />

                  {/* Gold Zari Daman Hem Embroidery Border */}
                  <path
                    d="M -48 352 Q 2 364 52 354 L 54 366 Q 2 376 -50 364 Z"
                    fill="url(#s5AyeshaGoldGrad)"
                    opacity="0.9"
                  />
                  <line x1="-46" y1="346" x2="50" y2="348" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="5 3" />

                  {/* Draped Ivory & Zari-Gold Chiffon Dupatta with Gota Border (Exact CustomerAyesha) */}
                  <path
                    d="M -28 138 C -8 134, 18 148, 36 184 C 48 224, 54 276, 56 324 L 14 332 C 4 282, -12 222, -32 166 Z"
                    fill="url(#s5AyeshaDupattaGrad)"
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M -18 150 C -2 194, 16 254, 28 326"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                    opacity="0.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -24 142 C -6 192, 12 258, 22 328"
                    fill="none"
                    stroke="url(#s5AyeshaGoldGrad)"
                    strokeWidth="2.6"
                    strokeDasharray="6 3"
                  />
                </g>

                {/* 3. ULTRA-REALISTIC 3D SCULPTED HEAD, NECK & JEWELRY (EXACT CUSTOMERAYESHA #ayesha-head-group) */}
                <g id="s5-ayesha-head-group" transform="translate(-535, -318)">
                  {/* Graceful Neck Cylinder with Sternocleidomastoid & Clavicle Shading */}
                  <path
                    d="M 522 412 L 520 464 C 528 476, 548 476, 556 464 L 554 412 Z"
                    fill="url(#s5AyeshaLimbSkin)"
                    stroke="#7d482a"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 526 422 C 532 442, 538 456, 542 466"
                    fill="none"
                    stroke="#8c5432"
                    strokeWidth="1.2"
                    opacity="0.45"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 534 466 Q 540 470 546 466"
                    fill="none"
                    stroke="#7d482a"
                    strokeWidth="1.2"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 522 416 C 530 430, 546 432, 554 422 L 554 412 L 522 412 Z"
                    fill="#5c3018"
                    opacity="0.42"
                  />

                  {/* Minimalist Modern 18K Gold Collarbone Chain Seated in Clavicle Hollow */}
                  <path
                    d="M 522 454 C 530 468, 546 468, 554 454"
                    fill="none"
                    stroke="url(#s5AyeshaGoldGrad)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <rect x="537.2" y="465" width="1.6" height="2.8" rx="0.6" fill="url(#s5AyeshaGoldGrad)" stroke="#78350f" strokeWidth="0.4" />
                  <ellipse cx="538" cy="470.5" rx="2.4" ry="3.4" fill="url(#s5AyeshaPearlGrad)" stroke="#b45309" strokeWidth="0.65" />
                  <ellipse cx="537.4" cy="469.2" rx="0.85" ry="1.3" fill="#ffffff" opacity="0.92" />

                  {/* Sculpted 3/4 Female Facial Cranium & Refined Jawline */}
                  <path
                    d="M 502 336
                       C 492 355, 490 382, 494 402
                       C 497 416, 510 428, 526 428
                       C 548 428, 568 412, 574 388
                       C 578 362, 568 332, 542 326
                       C 520 322, 508 326, 502 336 Z"
                    fill="url(#s5AyeshaSkin3D)"
                    stroke="#7d482a"
                    strokeWidth="1.3"
                  />

                  {/* Soft Rose Cheek Blush & Cheekbone Highlight */}
                  <ellipse cx="512" cy="392" rx="15" ry="9" fill="url(#s5AyeshaCheekBlush)" />
                  <ellipse cx="508" cy="382" rx="8" ry="4" fill="#fff7ed" opacity="0.38" transform="rotate(-12 508 382)" />

                  {/* 3D Anatomical Sculpted Nose Bridge, Alar Cartilage & Nostril (Solid-Filled Skin) */}
                  <path
                    d="M 502 364 C 496 374, 490 382, 488 388 C 486 392, 490 395, 494 395 C 499 395, 503 393, 506 391 Z"
                    fill="url(#s5AyeshaSkin3D)"
                  />
                  <path
                    d="M 502 364 C 496 374, 490 382, 488 388 C 486 392, 490 395, 494 395 C 499 395, 503 393, 506 391"
                    fill="#a66843"
                    opacity="0.18"
                  />
                  <path
                    d="M 502 364 C 496 374, 489 383, 488 389 C 487.5 392.5, 491 394.5, 495 394.5"
                    fill="none"
                    stroke="#7d482a"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 501 366 L 490 387"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.1"
                    opacity="0.8"
                    strokeLinecap="round"
                  />
                  <circle cx="489.5" cy="389" r="1.4" fill="#ffffff" opacity="0.75" />
                  <path
                    d="M 496 391 C 499 389, 504 390, 506 393"
                    fill="none"
                    stroke="#8c502b"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <ellipse cx="493.8" cy="393.2" rx="2.4" ry="1.1" fill="#3b1806" opacity="0.85" transform="rotate(-15 493.8 393.2)" />
                  <path
                    d="M 495 396 L 495 404"
                    fill="none"
                    stroke="#a66843"
                    strokeWidth="0.8"
                    opacity="0.55"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 497.5 396 L 497.5 404"
                    fill="none"
                    stroke="#a66843"
                    strokeWidth="0.8"
                    opacity="0.4"
                    strokeLinecap="round"
                  />

                  {/* Expressive Feathered Arched Eyebrows with Micro-Hair Strokes */}
                  <path
                    d="M 492 360 Q 500 354 508 358"
                    fill="none"
                    stroke="#140b07"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path d="M 493 361 L 495 358" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 497 359 L 499 356" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 502 358 L 504 356" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />

                  <path
                    d="M 515 359 Q 528 352 541 359"
                    fill="none"
                    stroke="#140b07"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path d="M 517 360 L 519 356" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 522 358 L 524 354" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 528 356 L 531 353" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 534 356 L 537 355" stroke="#140b07" strokeWidth="0.9" strokeLinecap="round" />

                  {/* High-Fidelity Almond Eyes with Sclera, Limbal Ring, Pupil & Dual Catchlights */}
                  <g className="s5-blink">
                    {/* Far Left Eye */}
                    <ellipse cx="500" cy="369" rx="5.8" ry="4" fill="#ffffff" stroke="#451a03" strokeWidth="0.9" />
                    <circle cx="505" cy="369.5" r="0.8" fill="#fda4af" />
                    <circle cx="499" cy="369" r="3" fill="url(#s5AyeshaIris3D)" stroke="#090504" strokeWidth="0.6" />
                    <circle cx="499" cy="369" r="1.4" fill="#000000" />
                    <circle cx="497.6" cy="367.6" r="1.1" fill="#ffffff" />
                    <path d="M 493 367 Q 500 362 506 367" fill="none" stroke="#090504" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M 495 372 Q 499 373 504 371" fill="none" stroke="#451a03" strokeWidth="0.8" opacity="0.6" />

                    {/* Near Right Eye */}
                    <ellipse cx="527" cy="369" rx="7.8" ry="4.8" fill="#ffffff" stroke="#451a03" strokeWidth="1" />
                    <circle cx="520" cy="370" r="1" fill="#fda4af" />
                    <circle cx="525" cy="369" r="3.8" fill="url(#s5AyeshaIris3D)" stroke="#090504" strokeWidth="0.7" />
                    <circle cx="525" cy="369" r="1.8" fill="#000000" />
                    <circle cx="523.5" cy="367.2" r="1.4" fill="#ffffff" />
                    <circle cx="526.8" cy="370.4" r="0.75" fill="#ffffff" opacity="0.9" />
                    <path
                      d="M 518 368 Q 527 361 538 366 L 542 364"
                      fill="none"
                      stroke="#090504"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 519 363 Q 527 359 536 363"
                      fill="none"
                      stroke="#7d482a"
                      strokeWidth="0.9"
                      opacity="0.75"
                    />
                    <path
                      d="M 522 373 Q 527 374 534 372"
                      fill="none"
                      stroke="#451a03"
                      strokeWidth="0.85"
                      opacity="0.65"
                    />
                  </g>

                  {/* Sculpted Rose Lips with Cupid's Bow, Vermilion Border & Specular Gloss */}
                  <path
                    d="M 494 406 Q 504 403 515 405 Q 506 414 494 406 Z"
                    fill="#be123c"
                    stroke="#881337"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M 495 406 Q 500 404 504 405 Q 508 404 513 406"
                    fill="none"
                    stroke="#fda4af"
                    strokeWidth="0.8"
                    opacity="0.85"
                  />
                  <ellipse cx="504" cy="409.5" rx="3.5" ry="1.2" fill="#ffffff" opacity="0.45" />
                  <path
                    d="M 495 406 Q 504 408 514 404"
                    fill="none"
                    stroke="#4c0519"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 499 414 Q 504 416 509 414"
                    fill="none"
                    stroke="#7d482a"
                    strokeWidth="0.9"
                    opacity="0.55"
                  />

                  {/* Sculpted Anatomical Ear & 18K Gold Hoop + Baroque Pearl Drop */}
                  <path
                    d="M 557 372 C 559 364, 571 364, 574 374 C 576 382, 572 393, 565 397 C 560 399, 555 394, 556 387 Z"
                    fill="url(#s5AyeshaSkin3D)"
                    stroke="#7d482a"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M 559 377 C 564 377, 566 384, 561 388 Z"
                    fill="#5c280b"
                    opacity="0.45"
                  />
                  <path
                    d="M 567 372 C 569 378, 568 386, 563 391"
                    fill="none"
                    stroke="#a66843"
                    strokeWidth="0.95"
                    opacity="0.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 556 379 C 559 380, 559 384, 556 386"
                    fill="url(#s5AyeshaSkin3D)"
                    stroke="#7d482a"
                    strokeWidth="0.9"
                  />
                  <circle cx="562" cy="395.5" r="0.65" fill="#451a03" />
                  <ellipse
                    cx="562"
                    cy="400"
                    rx="3.5"
                    ry="4.5"
                    fill="none"
                    stroke="url(#s5AyeshaGoldGrad)"
                    strokeWidth="1.6"
                  />
                  <ellipse
                    cx="561.2"
                    cy="399.2"
                    rx="1.6"
                    ry="2.4"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.65"
                    opacity="0.85"
                  />
                  <circle cx="562" cy="404.5" r="1.1" fill="url(#s5AyeshaGoldGrad)" stroke="#78350f" strokeWidth="0.5" />
                  <ellipse
                    cx="562"
                    cy="410"
                    rx="2.5"
                    ry="3.6"
                    fill="url(#s5AyeshaPearlGrad)"
                    stroke="#b45309"
                    strokeWidth="0.7"
                  />
                  <ellipse cx="561.3" cy="408.6" rx="0.9" ry="1.4" fill="#ffffff" opacity="0.92" />

                  {/* Multi-Layered Flowing Hair: Crown Volume, Side-Parted Bangs & Loose Temple Wisps */}
                  <path
                    d="M 494 352
                       C 496 324, 522 310, 554 316
                       C 584 322, 598 350, 594 392
                       C 590 424, 578 452, 570 468
                       C 567 435, 573 396, 565 372
                       C 557 352, 536 344, 514 342
                       C 504 342, 498 346, 494 352 Z"
                    fill="url(#s5AyeshaHairGrad)"
                  />
                  <path
                    d="M 526 314 C 532 328, 536 340, 538 350"
                    fill="none"
                    stroke="#090504"
                    strokeWidth="1.4"
                    opacity="0.85"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 548 320 C 560 334, 570 354, 574 374"
                    fill="none"
                    stroke="#23140d"
                    strokeWidth="1.2"
                    opacity="0.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 494 350 C 490 358, 491 366, 493 372 Q 494 370 496 364"
                    fill="none"
                    stroke="#140b07"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 556 384 C 554 394, 552 404, 556 414 Q 557 410 557 400"
                    fill="none"
                    stroke="#140b07"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 508 328 C 530 318, 560 322, 578 340"
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth="2.8"
                    opacity="0.75"
                    strokeLinecap="round"
                  />
                </g>

                {/* 4. ARTICULATED AYESHA ARMS (Deltoid Cap, Bicep Taper, Elbow Folds, Organza Lace Cuffs, 18K Gold Watch & Sculpted Hands) */}
                <g ref={ayeshaArmsGroupRef}>
                  {/* Far Right Arm (Extending Forward with Rs. 4,500 Cash Bundle) */}
                  <g id="s5-ayesha-right-arm" opacity="0.95">
                    <path
                      d="M -22 158 C -46 164, -68 188, -86 220 L -134 238 L -130 262 L -74 248 C -52 222, -32 198, -14 182 Z"
                      fill="url(#s5AyeshaFarArmGrad)"
                      stroke="#022c22"
                      strokeWidth="1.3"
                    />
                    {/* Scalloped Organza Lace Cuff */}
                    <path
                      d="M -126 234 L -138 238 L -134 264 L -122 260 Z"
                      fill="url(#s5AyeshaOrganzaLace)"
                      stroke="#fbbf24"
                      strokeWidth="1"
                    />
                    {/* Sculpted Hand Holding Cash Bundle */}
                    <path
                      d="M -134 240 C -148 238, -160 242, -164 250 C -164 258, -152 264, -134 262 Z"
                      fill="url(#s5AyeshaSkin3D)"
                      stroke="#7c4224"
                      strokeWidth="1"
                    />
                  </g>

                  {/* Near Left Arm (Deltoid -> Bicep -> Elbow Creases -> Forearm -> Organza Cuff -> 18K Gold Watch -> Sculpted Hand Receiving Parcel #LP-9042) */}
                  <g id="s5-ayesha-left-arm">
                    {/* Deltoid Shoulder Cap & Bicep/Tricep Taper */}
                    <path
                      d="M 18 158
                         C 4 150, -18 164, -34 186
                         C -48 204, -58 218, -68 228
                         C -58 244, -40 248, -26 236
                         C -10 220, 6 202, 20 186
                         C 26 174, 26 162, 18 158 Z"
                      fill="url(#s5AyeshaSleeve3D)"
                      stroke="#042f2e"
                      strokeWidth="1.4"
                    />
                    {/* Overlapping Forearm Sleeve Starting at Elbow */}
                    <path
                      d="M -52 214
                         C -64 208, -80 212, -96 214
                         L -122 214
                         L -126 240
                         L -64 246
                         C -48 244, -42 224, -52 214 Z"
                      fill="url(#s5AyeshaSleeve3D)"
                      stroke="#042f2e"
                      strokeWidth="1.4"
                    />
                    {/* Paired Elbow Joint Articulation Creases (Dark Valley + Specular Ridge) */}
                    <path d="M -54 218 Q -66 228 -62 240" fill="none" stroke="#022c22" strokeWidth="2.8" strokeLinecap="round" />
                    <path d="M -57 216 Q -69 226 -65 238" fill="none" stroke="#5eead4" strokeWidth="1.1" opacity="0.5" strokeLinecap="round" />

                    {/* Scalloped Organza Lace Sleeve Cuff with Gold Zari Border */}
                    <path
                      d="M -114 213 L -128 213 L -130 241 L -116 241 Z"
                      fill="url(#s5AyeshaOrganzaLace)"
                      stroke="#0d9488"
                      strokeWidth="1"
                    />
                    <line x1="-115" y1="213" x2="-117" y2="241" stroke="#fbbf24" strokeWidth="1.6" strokeDasharray="3 2" />
                    <circle cx="-122" cy="220" r="1.1" fill="#ffffff" opacity="0.85" />
                    <circle cx="-123" cy="228" r="1.1" fill="#ffffff" opacity="0.85" />
                    <circle cx="-124" cy="235" r="1.1" fill="#ffffff" opacity="0.85" />

                    {/* Sculpted Wrist, 18K Gold Mother-of-Pearl Wristwatch & Articulated Hand */}
                    <path
                      d="M -128 216 C -144 212, -160 216, -166 224 C -168 232, -158 240, -142 240 L -128 238 Z"
                      fill="url(#s5AyeshaSkin3D)"
                      stroke="#7c4224"
                      strokeWidth="1"
                    />
                    {/* 18K Gold Wristwatch on Wrist */}
                    <g transform="translate(-132, 227) rotate(8)">
                      <rect x="-2.5" y="-11" width="5" height="22" rx="1.2" fill="url(#s5AyeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />
                      <circle cx="0" cy="0" r="4.8" fill="url(#s5AyeshaGoldGrad)" stroke="#78350f" strokeWidth="0.7" />
                      <circle cx="0" cy="0" r="3.6" fill="url(#s5AyeshaPearlGrad)" />
                    </g>
                    {/* Opposable Thumb & Extended Fingers with 18K Gold Band Ring */}
                    <path
                      d="M -138 214 C -148 208, -158 208, -162 213 C -162 217, -152 220, -142 220 Z"
                      fill="url(#s5AyeshaSkin3D)"
                      stroke="#7c4224"
                      strokeWidth="0.9"
                    />
                    <rect x="-152" y="231" width="2.4" height="4.2" rx="0.7" fill="url(#s5AyeshaGoldGrad)" stroke="#78350f" strokeWidth="0.5" />
                  </g>
                </g>
              </g>
            </g>

            {/* ===============================================================
                6. AUTHENTIC STATE BANK OF PAKISTAN RS. 4,500 CASH BUNDLE IN TRANSIT
                =============================================================== */}
            <g ref={cashTransferGroupRef} id="scene5-cash-handover" transform="translate(1048, 598) rotate(-8)">
              {/* Cash Stack Drop Shadow */}
              <ellipse cx="44" cy="24" rx="52" ry="12" fill="#020617" opacity="0.48" />

              {/* 4x Rs. 1,000 Blue SBP Banknotes Fanned (With Quaid-e-Azam Portrait & Urdu Header) */}
              {[-10, -4, 2, 8].map((angle, idx) => (
                <g
                  key={idx}
                  transform={`translate(${idx * 4}, ${-idx * 1.5}) rotate(${angle} 42 16)`}
                >
                  <rect
                    x="0"
                    y="0"
                    width="86"
                    height="40"
                    rx="2"
                    fill="#f0f9ff"
                    stroke="#94a3b8"
                    strokeWidth="0.6"
                  />
                  <rect x="2" y="2" width="82" height="36" rx="1.2" fill="url(#s5Pkr1000Grad)" />
                  <text x="44" y="8" fill="#f8fafc" fontSize="3.5" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">
                    بینک دولت پاکستان
                  </text>
                  <line x1="56" y1="2" x2="56" y2="38" stroke="#e0f2fe" strokeWidth="1.2" strokeDasharray="3 1.5" />
                  {/* Quaid-e-Azam Portrait Silhouette on Left */}
                  <circle cx="22" cy="18" r="5" fill="#e0f2fe" opacity="0.85" />
                  <path d="M 15 13 C 17 8, 27 8, 29 13 Z" fill="#0f172a" />
                  <path d="M 14 24 L 30 24 L 32 34 L 12 34 Z" fill="#024268" />
                  {/* White Watermark Field on Right */}
                  <rect x="60" y="4" width="22" height="32" rx="1" fill="#f8fafc" opacity="0.92" />
                  <text x="80" y="35" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="900" textAnchor="end">
                    1000
                  </text>
                  <text x="5" y="9" fill="#ffffff" fontSize="4.5" fontFamily="monospace" fontWeight="900">
                    1000
                  </text>
                </g>
              ))}

              {/* 1x Rs. 500 Emerald Green SBP Banknote on Top */}
              <g transform="translate(18, -6) rotate(14 42 16)">
                <rect
                  x="0"
                  y="0"
                  width="84"
                  height="38"
                  rx="2"
                  fill="#f0fdf4"
                  stroke="#86efac"
                  strokeWidth="0.6"
                />
                <rect x="2" y="2" width="80" height="34" rx="1.2" fill="url(#s5Pkr500Grad)" />
                <text x="42" y="8" fill="#f8fafc" fontSize="3.5" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">
                  بینک دولت پاکستان
                </text>
                <line x1="54" y1="2" x2="54" y2="36" stroke="#d1fae5" strokeWidth="1.2" strokeDasharray="3 1.5" />
                <circle cx="21" cy="17" r="4.8" fill="#d1fae5" opacity="0.88" />
                <path d="M 14 12 C 16 7, 26 7, 28 12 Z" fill="#022c22" />
                <path d="M 13 23 L 29 23 L 31 32 L 11 32 Z" fill="#064e3b" />
                <rect x="58" y="4" width="21" height="30" rx="1" fill="#f0fdf4" opacity="0.94" />
                <text x="77" y="33" fill="#022c22" fontSize="6.5" fontFamily="monospace" fontWeight="900" textAnchor="end">
                  500
                </text>
                <text x="5" y="9" fill="#ffffff" fontSize="4.5" fontFamily="monospace" fontWeight="900">
                  500
                </text>
              </g>
            </g>

            {/* ===============================================================
                7. SEALED #LP-9042 PARCEL FROM SCENE 1 IN TRANSIT (COURIER -> AYESHA)
                =============================================================== */}
            <g ref={parcelTransferGroupRef} id="scene5-parcel-handover" transform="translate(832, 545) scale(1.08)">
              <Scene1Package showStraps={false} />
            </g>

            {/* ===============================================================
                8. VERIFIED DELIVERY CONFIRMATION BADGE (RISES ABOVE PARCEL)
                =============================================================== */}
            <g
              ref={deliveredBadgeGroupRef}
              transform="translate(960, 472)"
              opacity="0"
            >
              <rect
                x="-158"
                y="-22"
                width="316"
                height="38"
                rx="19"
                fill="#052e16"
                stroke="#10b981"
                strokeWidth="2"
              />
              <circle cx="-134" cy="-3" r="10" fill="#10b981" />
              <path
                d="M-138,-3 L-135,0 L-129,-6"
                fill="none"
                stroke="#052e16"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="10"
                y="1"
                fill="#ecfdf5"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="800"
                textAnchor="middle"
                letterSpacing="0.6"
              >
                DELIVERED • #LP-9042 • RS. 4,500 PAID
              </text>
            </g>

            {/* ===============================================================
                9. BILINGUAL TYPEWRITER DIALOGUE BUBBLE (SCENE 1 & 3 STYLE)
                =============================================================== */}
            <g
              ref={speechBubbleRef}
              transform="translate(510, 62)"
              style={{ display: 'none', opacity: 0 }}
            >
              <foreignObject x="0" y="0" width="880" height="190" style={{ overflow: 'visible' }}>
                <div className="inline-block max-w-[680px] rounded-2xl bg-[#090d16]/95 border-[1.8px] border-emerald-500/50 px-5 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.88)] backdrop-blur-md">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="font-mono text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
                      10:00 AM • MORNING DISPATCH RIDER (FLAT 4B, GULBERG III)
                    </span>
                    <span className="font-mono text-[10px] text-amber-300 font-bold">
                      PIN VERIFIED ✓
                    </span>
                  </div>
                  <p
                    ref={speechUrduRef}
                    dir="rtl"
                    className="font-sans text-sm sm:text-base font-bold text-white leading-relaxed m-0 text-right"
                  >
                    &ldquo;{HANDOVER_URDU}&rdquo;
                  </p>
                  <div className="mt-1 font-mono text-[11px] sm:text-xs font-semibold text-emerald-300 tracking-wide">
                    <span ref={speechEnRef}>{HANDOVER_EN}</span>
                    <span
                      ref={speechCursorRef}
                      className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 align-middle animate-pulse"
                    />
                  </div>
                </div>
              </foreignObject>
            </g>
          </g>
        </svg>

        {/* ===================================================================
            MINIMAL 2-LINE CAPTION RECTANGLE (MATCHES SCENE 3 & SCENE 4 STYLE)
            =================================================================== */}
        <div
          ref={scene5CaptionRef}
          className="absolute bottom-2 sm:bottom-5 left-1/2 z-35 w-[92%] sm:w-auto min-w-[320px] sm:min-w-[540px] max-w-xl rounded-2xl bg-[#090d16]/95 border-[1.5px] border-emerald-500/45 px-4 sm:px-6 py-2 sm:py-3 text-center shadow-2xl pointer-events-none backdrop-blur-md"
          style={{ opacity: 0, transform: 'translate3d(-50%, 12px, 0)' }}
        >
          <p className="font-sans text-[10.5px] sm:text-xs md:text-[13px] font-medium text-slate-100 tracking-wide leading-snug m-0">
            <span className="text-amber-300 font-bold">10:00 AM next morning</span> &mdash; Guided by Ayesha&rsquo;s live WhatsApp pin,
          </p>
          <p className="font-sans text-[10.5px] sm:text-xs md:text-[13px] font-bold text-emerald-400 tracking-wide leading-snug m-0 mt-0.5">
            Parcel #LP-9042 is delivered at Flat 4B and Rs. 4,500 COD is collected in full.
          </p>
        </div>
      </div>
    );
  }
);

Scene5DoorstepHandover.displayName = 'Scene5DoorstepHandover';

export default Scene5DoorstepHandover;
