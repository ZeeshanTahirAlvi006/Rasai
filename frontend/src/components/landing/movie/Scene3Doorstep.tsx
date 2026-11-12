// src/components/landing/movie/Scene3Doorstep.tsx
// High-performance, 60/120/144fps hardware-composited cinematic Scene 3: The Doorstep Intercept.
// Implements:
//   Phase 1 (0.00 -> 0.18): Phone Match Cut (Kamran's phone buzzes, camera zooms into screen & splits)
//   Phase 2 (0.18 -> 0.48): Split-Screen Dual Perspective (Kamran parked under flyover | Ayesha in Gulberg flat with Rs. 4,500 cash)
//   Phase 3 (0.48 -> 0.76): Batch Ghost Scan Swipe, Red Flash on Left, Calm Green Notification on Right & Minimal One-Line Caption
//   Phase 4 (0.76 -> 1.00): Right Half Expands Fullscreen as Ayesha unlocks her phone to reveal the WhatsApp rescue chat

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { soundEngine } from '../cinema/SoundEngine';
import { HondaCD70 } from './HondaCD70';
import { CourierKamran } from './CourierKamran';
import { CustomerAyesha } from './CustomerAyesha';

const KAMRAN_DIALOGUE_URDU = 'Bohot rush hai, kal dobara koshish karoon ga...';
const KAMRAN_DIALOGUE_EN = "Too much traffic, I'll attempt tomorrow...";

const AYESHA_DIALOGUE_URDU = 'Kab aayega parcel? Cash subah se nikaal ke rakhi hai...';
const AYESHA_DIALOGUE_EN = 'When will the parcel arrive? Cash has been ready since morning...';

const PARCEL_QUEUE = [
  {
    id: '#LP-9038',
    recipient: 'Tariq Mahmood',
    address: 'House 19, Street 4, Cavalry Ground',
    cod: 'Rs. 1,850',
    dist: '3.4 km away',
    isTarget: false,
  },
  {
    id: '#LP-9042',
    recipient: 'Ayesha Khan',
    address: 'Flat 4B, Block H, Gulberg III, Lahore',
    cod: 'Rs. 4,500',
    dist: '2.8 km away',
    isTarget: true,
  },
  {
    id: '#LP-9049',
    recipient: 'Zainab Textiles',
    address: 'Shop 12, Main Boulevard, Garden Town',
    cod: 'Rs. 3,200',
    dist: '4.1 km away',
    isTarget: false,
  },
];

export interface Scene3Handle {
  setProgress: (progress: number) => void;
  setActive: (active: boolean) => void;
}

export interface Scene3DoorstepProps {
  embedded?: boolean;
  isPortrait?: boolean;
  isActive?: boolean;
}

export const Scene3Doorstep = React.forwardRef<Scene3Handle, Scene3DoorstepProps>(
  ({ embedded = false, isPortrait: isPortraitProp, isActive = false }, ref) => {
    const [internalPortrait, setInternalPortrait] = useState<boolean>(() =>
      typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
    );
    const isPortrait = isPortraitProp ?? internalPortrait;
    const isPortraitRef = useRef<boolean>(isPortrait);
    useEffect(() => {
      isPortraitRef.current = isPortrait;
    }, [isPortrait]);
    const [isSceneMounted, setIsSceneMounted] = useState<boolean>(() => embedded || true);

    // Master scroll & stage refs (Zero React re-renders during scroll)
    const containerRef = useRef<HTMLDivElement>(null);
    const stickyStageRef = useRef<HTMLDivElement>(null);
    const scrollProgressRef = useRef<number>(0);
    const targetScrollProgressRef = useRef<number>(0);
    const isSceneInViewRef = useRef<boolean>(isActive);
    const ambientRafIdRef = useRef<number>(0);
    const isTouchingRef = useRef<boolean>(false);
    const isProgrammaticScrollRef = useRef<boolean>(false);

    // Phase 1: Phone Match Cut Layer Refs (100% Vector SVG — zero CSS bitmap scaling)
    const matchCutLayerRef = useRef<HTMLDivElement>(null);
    const matchCutPhoneGroupRef = useRef<SVGGElement>(null);
    const matchCutRing1Ref = useRef<SVGRectElement>(null);
    const matchCutRing2Ref = useRef<SVGRectElement>(null);

    // Phase 2-4: Split Screen Pane Refs
    const splitStageRef = useRef<HTMLDivElement>(null);
    const leftPaneRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);
    const splitDividerLineRef = useRef<HTMLDivElement>(null);

    // Left Half (Kamran under Flyover) Refs
    const parcelCardRefs = useRef<Array<HTMLDivElement | null>>([]);
    const parcelStampRefs = useRef<Array<HTMLDivElement | null>>([]);
    const parcelInfoRefs = useRef<Array<HTMLDivElement | null>>([]);
    const remainingCounterRef = useRef<HTMLSpanElement>(null);
    const leftRedFlashRef = useRef<HTMLDivElement>(null);
    const kamranBubbleRef = useRef<SVGGElement>(null);
    const kamranUrduTextRef = useRef<HTMLParagraphElement>(null);
    const kamranEnTextRef = useRef<HTMLSpanElement>(null);
    const kamranCursorRef = useRef<HTMLSpanElement>(null);

    // Right Half (Ayesha in Gulberg Flat) Refs
    const clockSecondHandRef = useRef<SVGLineElement>(null);
    const rightGreenGlowRef = useRef<HTMLDivElement>(null);
    const tablePhoneHaloRef = useRef<SVGEllipseElement>(null);
    const tablePhoneScreenRef = useRef<SVGPolygonElement>(null);
    const tablePhoneClockRef = useRef<SVGTextElement>(null);
    const tablePhoneHeaderClockRef = useRef<SVGTextElement>(null);
    const tablePhoneChatTrackRef = useRef<SVGGElement>(null);
    const tablePhoneQuickRepliesRef = useRef<SVGGElement>(null);
    const tablePhoneReplyBubbleRef = useRef<SVGGElement>(null);
    const tablePhoneConfirmBubbleRef = useRef<SVGGElement>(null);
    const ayeshaRightArmRef = useRef<SVGGElement>(null);
    const ayeshaTablePhoneGroupRef = useRef<SVGGElement>(null);
    const ayeshaNotificationPillRef = useRef<HTMLDivElement>(null);
    const ayeshaBubbleRef = useRef<SVGGElement>(null);
    const ayeshaUrduTextRef = useRef<HTMLParagraphElement>(null);
    const ayeshaEnTextRef = useRef<HTMLSpanElement>(null);
    const ayeshaCursorRef = useRef<HTMLSpanElement>(null);

    // Minimal One-Line Caption Refs (Scene 3 & Scene 4)
    const minimalCaptionRef = useRef<HTMLDivElement>(null);
    const scene4CaptionRef = useRef<HTMLDivElement>(null);

    // Phase 4 & Scene 4: Rising Unlocked WhatsApp Phone Modal & 2-Step Fast Rescue Refs
    const unlockedPhoneContainerRef = useRef<HTMLDivElement>(null);
    const phoneClockTextRef = useRef<HTMLSpanElement>(null);
    const waHeaderClockRef = useRef<HTMLSpanElement>(null);
    const chatMessagesTrackRef = useRef<HTMLDivElement>(null);
    const quickRepliesTrayRef = useRef<HTMLDivElement>(null);
    const yesHomeBtnRef = useRef<HTMLButtonElement>(null);
    const ayeshaReplyBubbleRef = useRef<HTMLDivElement>(null);
    const gpsPinSvgGroupRef = useRef<SVGGElement>(null);
    const gpsPulseRingRef = useRef<SVGCircleElement>(null);
    const rasaiConfirmBubbleRef = useRef<HTMLDivElement>(null);
    const manualRescueTriggeredRef = useRef<boolean>(false);

    // One-shot audio trigger guards
    const hasPlayedBuzzRef = useRef<boolean>(false);
    const hasPlayedSplitWhooshRef = useRef<boolean>(false);
    const hasPlayedGhostScanAlertRef = useRef<boolean>(false);
    const hasPlayedWhatsAppChimeRef = useRef<boolean>(false);
    const hasPlayedS4TapChimeRef = useRef<boolean>(false);
    const hasPlayedS4ConfirmChimeRef = useRef<boolean>(false);
    const lastKamranCharsRef = useRef<number>(-1);
    const lastAyeshaCharsRef = useRef<number>(-1);

    // Viewport orientation listener
    useEffect(() => {
      const handleResize = () => {
        const p = window.innerHeight > window.innerWidth;
        setInternalPortrait(p);
        isPortraitRef.current = isPortraitProp ?? p;
      };
      window.addEventListener('resize', handleResize, { passive: true });
      return () => window.removeEventListener('resize', handleResize);
    }, [isPortraitProp]);

    // =========================================================================
    // ZERO-RE-RENDER SCROLL MUTATION ENGINE (60Hz / 120Hz / 144Hz)
    // =========================================================================
    const applyScrollMutations = useCallback((rawProgress: number) => {
      scrollProgressRef.current = rawProgress;

      // Map 0.00 -> 0.64 to Scene 3 Phases 1-4 (Phone Match Cut, Split Screen, Ghost Scan, Phone Rise)
      // Map 0.62 -> 1.00 to Scene 4 (2-Step Fast WhatsApp Rescue inside the risen 3D Smartphone)
      const progress = Math.min(1, rawProgress / 0.64);
      const s4Progress = Math.max(0, Math.min(1, (rawProgress - 0.62) / 0.38));

      if (rawProgress < 0.56 && manualRescueTriggeredRef.current) {
        manualRescueTriggeredRef.current = false;
      }

      // Gate overall sticky stage visibility so Scene 1 & 2 remain unobstructed when rawProgress <= 0.001
      if (stickyStageRef.current) {
        if (!embedded && rawProgress <= 0.001) {
          stickyStageRef.current.style.visibility = 'hidden';
          stickyStageRef.current.style.opacity = '0';
          stickyStageRef.current.style.pointerEvents = 'none';
          return;
        }
        stickyStageRef.current.style.visibility = 'visible';
        stickyStageRef.current.style.opacity = '1';
        stickyStageRef.current.style.pointerEvents = 'auto';
      }

      // -----------------------------------------------------------------------
      // PHASE 1: PHONE MATCH CUT (0.00 -> 0.18)
      // Kamran's phone buzzes, camera zooms into its screen, then splits open
      // -----------------------------------------------------------------------
      if (progress > 0.005 && progress < 0.08 && !hasPlayedBuzzRef.current) {
        hasPlayedBuzzRef.current = true;
        soundEngine.playPhoneBuzz();
      } else if (progress <= 0.002) {
        hasPlayedBuzzRef.current = false;
      }

      if (progress >= 0.11 && progress <= 0.19 && !hasPlayedSplitWhooshRef.current) {
        hasPlayedSplitWhooshRef.current = true;
        soundEngine.playWhoosh();
      } else if (progress < 0.08) {
        hasPlayedSplitWhooshRef.current = false;
      }

      if (matchCutLayerRef.current && matchCutPhoneGroupRef.current) {
        if (progress >= 0.21) {
          matchCutLayerRef.current.style.display = 'none';
        } else {
          matchCutLayerRef.current.style.display = 'flex';
          // Full dramatic zoom-in on scroll down & zoom-out on scroll up (0.00 -> 0.19)
          // Uses SVG attribute transform (no CSS will-change bitmap caching) so vectors stay 100% razor-sharp at 6.8x
          const zoomT = Math.max(0, Math.min(1, (progress - 0.03) / 0.15));
          const easeZoom = zoomT * zoomT * (3 - 2 * zoomT);
          const scale = 0.92 + Math.pow(easeZoom, 1.75) * 6.4;
          // Haptic buzz shake during initial phone ring (0.00 -> 0.07)
          const buzzShake =
            progress < 0.07 ? Math.sin(progress * 960) * 5 * (1 - progress / 0.07) : 0;

          matchCutPhoneGroupRef.current.setAttribute(
            'transform',
            `translate(${(960 + buzzShake).toFixed(1)}, 540) scale(${scale.toFixed(3)})`
          );

          // Fade out match cut layer as camera zooms right through the phone screen (0.13 -> 0.20)
          const fadeOut = progress < 0.13 ? 1 : Math.max(0, 1 - (progress - 0.13) / 0.07);
          matchCutLayerRef.current.style.opacity = fadeOut.toFixed(3);
        }
      }

      if (matchCutRing1Ref.current && matchCutRing2Ref.current) {
        const ringPulse = (progress * 18) % 1;
        const rScale1 = 1 + ringPulse * 0.22;
        matchCutRing1Ref.current.setAttribute('transform', `scale(${rScale1.toFixed(3)})`);
        matchCutRing1Ref.current.setAttribute(
          'opacity',
          `${Math.max(0, (1 - ringPulse) * 0.75).toFixed(3)}`
        );
        const ringPulse2 = (progress * 18 + 0.5) % 1;
        const rScale2 = 1 + ringPulse2 * 0.22;
        matchCutRing2Ref.current.setAttribute('transform', `scale(${rScale2.toFixed(3)})`);
        matchCutRing2Ref.current.setAttribute(
          'opacity',
          `${Math.max(0, (1 - ringPulse2) * 0.75).toFixed(3)}`
        );
      }

      // -----------------------------------------------------------------------
      // PHASE 2 & 4: SPLIT SCREEN GEOMETRY & FULLSCREEN RIGHT EXPANSION
      // - 0.00 -> 0.76: 50% Left (Kamran) / 50% Right (Ayesha) at native 1:1 DPI (zero CSS scale)
      // - 0.76 -> 0.90: Right Half slides left to 100% fullscreen!
      // -----------------------------------------------------------------------
      const splitIntroT = Math.max(0, Math.min(1, progress / 0.14));
      const smoothIntro = splitIntroT * splitIntroT * (3 - 2 * splitIntroT);

      const expandRightT = Math.max(0, Math.min(1, (progress - 0.76) / 0.14));
      const smoothExpandRight = expandRightT * expandRightT * (3 - 2 * expandRightT);
      // Divider percentage from left edge (50% during split, 0% when Ayesha expands fullscreen)
      const dividerPct = 50 * (1 - smoothExpandRight);
      const leftPaneOpacity = Math.max(0, 1 - smoothExpandRight * 1.25);

      if (isPortraitRef.current) {
        if (leftPaneRef.current) {
          leftPaneRef.current.style.width = '100%';
          leftPaneRef.current.style.height = `${dividerPct.toFixed(2)}%`;
          leftPaneRef.current.style.opacity = leftPaneOpacity.toFixed(3);
        }
        if (rightPaneRef.current) {
          rightPaneRef.current.style.width = '100%';
          rightPaneRef.current.style.height = `${(100 - dividerPct).toFixed(2)}%`;
        }
        if (splitDividerLineRef.current) {
          splitDividerLineRef.current.style.top = `${dividerPct.toFixed(2)}%`;
          splitDividerLineRef.current.style.left = '0';
          splitDividerLineRef.current.style.width = '100%';
          splitDividerLineRef.current.style.height = '2px';
          splitDividerLineRef.current.style.transform = 'translate3d(0, -50%, 0)';
          splitDividerLineRef.current.style.opacity =
            progress < 0.06 || dividerPct <= 1.5 ? '0' : (smoothIntro * leftPaneOpacity).toFixed(3);
        }
      } else {
        if (leftPaneRef.current) {
          leftPaneRef.current.style.height = '100%';
          leftPaneRef.current.style.width = `${dividerPct.toFixed(2)}%`;
          leftPaneRef.current.style.opacity = leftPaneOpacity.toFixed(3);
        }
        if (rightPaneRef.current) {
          rightPaneRef.current.style.height = '100%';
          rightPaneRef.current.style.width = `${(100 - dividerPct).toFixed(2)}%`;
        }
        if (splitDividerLineRef.current) {
          splitDividerLineRef.current.style.top = '0';
          splitDividerLineRef.current.style.left = `${dividerPct.toFixed(2)}%`;
          splitDividerLineRef.current.style.width = '2px';
          splitDividerLineRef.current.style.height = '100%';
          splitDividerLineRef.current.style.transform = 'translate3d(-50%, 0, 0)';
          splitDividerLineRef.current.style.opacity =
            progress < 0.06 || dividerPct <= 1.5 ? '0' : (smoothIntro * leftPaneOpacity).toFixed(3);
        }
      }

      // -----------------------------------------------------------------------
      // PHASE 2: DUAL TYPEWRITER DIALOGUE BUBBLES (Scene 1 & 2 Exact Style)
      // -----------------------------------------------------------------------
      // Kamran's Typewriter Bubble (0.20 -> 0.38)
      const kamranTypeT = Math.max(0, Math.min(1, (progress - 0.20) / 0.16));
      const kamranChars = Math.floor(kamranTypeT * KAMRAN_DIALOGUE_URDU.length);
      const kamranBubbleFadeOut =
        progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.06) : 1;

      if (kamranBubbleRef.current) {
        if (kamranChars <= 0 || kamranBubbleFadeOut <= 0.01) {
          kamranBubbleRef.current.style.display = 'none';
        } else {
          kamranBubbleRef.current.style.display = 'block';
          kamranBubbleRef.current.style.opacity = kamranBubbleFadeOut.toFixed(3);
        }
      }
      if (kamranChars !== lastKamranCharsRef.current) {
        lastKamranCharsRef.current = kamranChars;
        const isKamranComplete = kamranChars >= KAMRAN_DIALOGUE_URDU.length;
        if (kamranUrduTextRef.current) {
          kamranUrduTextRef.current.textContent = isKamranComplete
            ? `"${KAMRAN_DIALOGUE_URDU}"`
            : `"${KAMRAN_DIALOGUE_URDU.slice(0, kamranChars)}`;
        }
        if (kamranEnTextRef.current) {
          const enCount = Math.floor(kamranTypeT * KAMRAN_DIALOGUE_EN.length);
          kamranEnTextRef.current.textContent = KAMRAN_DIALOGUE_EN.slice(0, enCount);
        }
        if (kamranCursorRef.current) {
          kamranCursorRef.current.style.display = isKamranComplete ? 'none' : 'inline';
        }
      }

      // Ayesha's Typewriter Bubble (0.27 -> 0.45)
      const ayeshaTypeT = Math.max(0, Math.min(1, (progress - 0.27) / 0.16));
      const ayeshaChars = Math.floor(ayeshaTypeT * AYESHA_DIALOGUE_URDU.length);
      const ayeshaBubbleFadeOut =
        progress > 0.76 ? Math.max(0, 1 - (progress - 0.76) / 0.06) : 1;

      if (ayeshaBubbleRef.current) {
        if (ayeshaChars <= 0 || ayeshaBubbleFadeOut <= 0.01) {
          ayeshaBubbleRef.current.style.display = 'none';
        } else {
          ayeshaBubbleRef.current.style.display = 'block';
          ayeshaBubbleRef.current.style.opacity = ayeshaBubbleFadeOut.toFixed(3);
        }
      }
      if (ayeshaChars !== lastAyeshaCharsRef.current) {
        lastAyeshaCharsRef.current = ayeshaChars;
        const isAyeshaComplete = ayeshaChars >= AYESHA_DIALOGUE_URDU.length;
        if (ayeshaUrduTextRef.current) {
          ayeshaUrduTextRef.current.textContent = isAyeshaComplete
            ? `"${AYESHA_DIALOGUE_URDU}"`
            : `"${AYESHA_DIALOGUE_URDU.slice(0, ayeshaChars)}`;
        }
        if (ayeshaEnTextRef.current) {
          const enCount = Math.floor(ayeshaTypeT * AYESHA_DIALOGUE_EN.length);
          ayeshaEnTextRef.current.textContent = AYESHA_DIALOGUE_EN.slice(0, enCount);
        }
        if (ayeshaCursorRef.current) {
          ayeshaCursorRef.current.style.display = isAyeshaComplete ? 'none' : 'inline';
        }
      }

      // -----------------------------------------------------------------------
      // PHASE 3: BATCH GHOST SCAN SWIPE, RED FLASH & CALM GREEN NOTIFICATION
      // (0.46 -> 0.76)
      // -----------------------------------------------------------------------
      let swipedCount = 0;
      PARCEL_QUEUE.forEach((item, idx) => {
        const cardStart = 0.46 + idx * 0.035;
        const swipeT = Math.max(0, Math.min(1, (progress - cardStart) / 0.055));
        if (swipeT > 0.6) swipedCount++;

        const cardEl = parcelCardRefs.current[idx];
        const stampEl = parcelStampRefs.current[idx];
        const infoEl = parcelInfoRefs.current[idx];

        if (cardEl) {
          cardEl.style.borderColor =
            swipeT > 0.35
              ? 'rgba(239, 68, 68, 0.85)'
              : item.isTarget
              ? 'rgba(251, 191, 36, 0.6)'
              : 'rgba(51, 65, 85, 0.7)';
          cardEl.style.backgroundColor =
            swipeT > 0.35
              ? 'rgba(36, 6, 6, 0.95)'
              : item.isTarget
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(15, 23, 42, 0.6)';
        }
        if (infoEl) {
          infoEl.style.opacity = (1 - swipeT).toFixed(3);
          infoEl.style.display = swipeT >= 0.99 ? 'none' : 'block';
        }
        if (stampEl) {
          stampEl.style.opacity = swipeT.toFixed(3);
          stampEl.style.display = swipeT > 0.01 ? 'flex' : 'none';
        }
      });

      if (remainingCounterRef.current) {
        remainingCounterRef.current.textContent = `${34 - swipedCount}`;
      }

      // Trigger Ghost Scan Red Flash on Kamran's Side (0.50 -> 0.68)
      if (progress >= 0.50 && progress <= 0.62 && !hasPlayedGhostScanAlertRef.current) {
        hasPlayedGhostScanAlertRef.current = true;
        soundEngine.playAlertPing();
      } else if (progress < 0.45) {
        hasPlayedGhostScanAlertRef.current = false;
      }

      if (leftRedFlashRef.current) {
        let redOpacity = 0;
        if (progress >= 0.49 && progress <= 0.72) {
          const peak = 1 - Math.abs(progress - 0.56) / 0.14;
          redOpacity = Math.max(0, Math.min(0.65, peak * 0.65));
        }
        leftRedFlashRef.current.style.opacity = redOpacity.toFixed(3);
      }

      // Minimal One-Line Caption (0.54 -> 0.82)
      if (minimalCaptionRef.current) {
        let capOpacity = 0;
        if (progress >= 0.53 && progress <= 0.84) {
          const fadeIn = Math.min(1, (progress - 0.53) / 0.05);
          const fadeOut = Math.min(1, (0.84 - progress) / 0.05);
          capOpacity = Math.min(fadeIn, fadeOut);
        }
        minimalCaptionRef.current.style.opacity = capOpacity.toFixed(3);
        minimalCaptionRef.current.style.transform = `translate3d(-50%, ${(
          (1 - capOpacity) *
          12
        ).toFixed(1)}px, 0)`;
      }

      // Calm Green Notification on Ayesha's Side (0.60 -> 0.90)
      if (progress >= 0.60 && progress <= 0.72 && !hasPlayedWhatsAppChimeRef.current) {
        hasPlayedWhatsAppChimeRef.current = true;
        soundEngine.playWhatsAppChime();
      } else if (progress < 0.56) {
        hasPlayedWhatsAppChimeRef.current = false;
      }

      const greenActiveT = Math.max(0, Math.min(1, (progress - 0.60) / 0.06));
      if (rightGreenGlowRef.current) {
        const glowFadeOut =
          progress > 0.86 ? Math.max(0, 1 - Math.pow((progress - 0.86) / 0.1, 2)) : 1;
        rightGreenGlowRef.current.style.opacity = (greenActiveT * 0.55 * glowFadeOut).toFixed(3);
      }

      if (ayeshaNotificationPillRef.current) {
        const pillFadeOut = progress > 0.82 ? Math.max(0, 1 - (progress - 0.82) / 0.05) : 1;
        const pillVis = greenActiveT * pillFadeOut;
        ayeshaNotificationPillRef.current.style.opacity = pillVis.toFixed(3);
        ayeshaNotificationPillRef.current.style.transform = `translate3d(0, ${(
          (1 - pillVis) *
          10
        ).toFixed(1)}px, 0)`;
      }

      // -----------------------------------------------------------------------
      // PHASE 4: AYESHA PICKS UP PHONE & UNLOCKS WHATSAPP CHAT (0.78 -> 1.00)
      // -----------------------------------------------------------------------
      const pickupT = Math.max(0, Math.min(1, (progress - 0.78) / 0.14));
      const smoothPickup = pickupT * pickupT * (3 - 2 * pickupT);

      // Zero-re-render SVG mutations for Ayesha's table phone glow & arm reach
      if (tablePhoneHaloRef.current) {
        tablePhoneHaloRef.current.setAttribute('opacity', (greenActiveT * 0.45).toFixed(3));
      }
      if (tablePhoneScreenRef.current) {
        tablePhoneScreenRef.current.setAttribute('fill', '#0b141a');
      }
      if (ayeshaTablePhoneGroupRef.current) {
        const px = 238 + smoothPickup * 45;
        const py = 646 - smoothPickup * 38;
        const prot = -8 + smoothPickup * 18;
        ayeshaTablePhoneGroupRef.current.setAttribute(
          'transform',
          `translate(${px.toFixed(1)}, ${py.toFixed(1)}) rotate(${prot.toFixed(1)})`
        );
      }
      if (ayeshaRightArmRef.current) {
        const armDeg = smoothPickup * -14;
        ayeshaRightArmRef.current.setAttribute(
          'transform',
          `translate(585, 488) rotate(${armDeg.toFixed(1)}) translate(-585, -488)`
        );
      }

      if (unlockedPhoneContainerRef.current) {
        if (smoothPickup <= 0.01) {
          unlockedPhoneContainerRef.current.style.opacity = '0';
          unlockedPhoneContainerRef.current.style.pointerEvents = 'none';
          unlockedPhoneContainerRef.current.style.transform = 'translate3d(0, 64px, 0)';
        } else {
          // Lower phone gently at the end of Scene 4 (s4Progress > 0.88) as Scene 5 morning handover begins
          const s4ExitT = Math.max(0, Math.min(1, (s4Progress - 0.88) / 0.12));
          const phoneOpacity = smoothPickup * (1 - s4ExitT * 0.35);
          unlockedPhoneContainerRef.current.style.opacity = phoneOpacity.toFixed(3);
          unlockedPhoneContainerRef.current.style.pointerEvents = s4ExitT > 0.5 ? 'none' : 'auto';
          const yOffset = (1 - smoothPickup) * 64 + s4ExitT * 36;
          unlockedPhoneContainerRef.current.style.transform = `translate3d(0, ${yOffset.toFixed(
            1
          )}px, 0)`;
        }
      }

      // -----------------------------------------------------------------------
      // SCENE 4: 2-STEP FAST WHATSAPP RESCUE INSIDE 3D SMARTPHONE (s4Progress: 0.00 -> 1.00)
      // Step 1: Tap 'Yes, I'm Home' + Auto-Attach Live Gulberg III GPS Pin in one reply
      // Step 2: Rasai Verified 07:30 AM Priority Dispatch Confirmation
      // -----------------------------------------------------------------------
      const effectiveS4 = manualRescueTriggeredRef.current ? Math.max(s4Progress, 0.72) : s4Progress;

      // Tactile button press (0.04 -> 0.16)
      if (effectiveS4 >= 0.06 && effectiveS4 <= 0.35 && !hasPlayedS4TapChimeRef.current) {
        hasPlayedS4TapChimeRef.current = true;
        soundEngine.playSuccessChime();
      } else if (effectiveS4 < 0.02) {
        hasPlayedS4TapChimeRef.current = false;
      }

      if (yesHomeBtnRef.current) {
        const pressPulse =
          effectiveS4 >= 0.03 && effectiveS4 <= 0.18
            ? Math.sin(((effectiveS4 - 0.03) / 0.15) * Math.PI)
            : 0;
        const btnScale = 1 - pressPulse * 0.055;
        yesHomeBtnRef.current.style.transform = `scale(${btnScale.toFixed(3)})`;
      }

      // Step 1 Reply Transition (0.15 -> 0.38)
      const step1ReplyT = Math.max(0, Math.min(1, (effectiveS4 - 0.15) / 0.20));
      const smoothStep1 = step1ReplyT * step1ReplyT * (3 - 2 * step1ReplyT);

      if (quickRepliesTrayRef.current) {
        if (smoothStep1 >= 0.98) {
          quickRepliesTrayRef.current.style.display = 'none';
        } else {
          quickRepliesTrayRef.current.style.display = 'block';
          quickRepliesTrayRef.current.style.opacity = (1 - smoothStep1).toFixed(3);
        }
      }
      if (tablePhoneQuickRepliesRef.current) {
        if (smoothStep1 >= 0.98) {
          tablePhoneQuickRepliesRef.current.style.display = 'none';
        } else {
          tablePhoneQuickRepliesRef.current.style.display = 'block';
          tablePhoneQuickRepliesRef.current.style.opacity = (1 - smoothStep1).toFixed(3);
        }
      }

      if (ayeshaReplyBubbleRef.current) {
        if (smoothStep1 <= 0.01) {
          ayeshaReplyBubbleRef.current.style.display = 'none';
          ayeshaReplyBubbleRef.current.style.opacity = '0';
        } else {
          ayeshaReplyBubbleRef.current.style.display = 'block';
          ayeshaReplyBubbleRef.current.style.opacity = smoothStep1.toFixed(3);
          const replyY = (1 - smoothStep1) * 12;
          ayeshaReplyBubbleRef.current.style.transform = `translate3d(0, ${replyY.toFixed(1)}px, 0)`;
        }
      }
      if (tablePhoneReplyBubbleRef.current) {
        if (smoothStep1 <= 0.01) {
          tablePhoneReplyBubbleRef.current.style.display = 'none';
          tablePhoneReplyBubbleRef.current.style.opacity = '0';
        } else {
          tablePhoneReplyBubbleRef.current.style.display = 'block';
          tablePhoneReplyBubbleRef.current.style.opacity = smoothStep1.toFixed(3);
        }
      }

      // Native SVG GPS Pin Drop & Accuracy Ring inside Ayesha's reply bubble
      if (gpsPinSvgGroupRef.current && smoothStep1 > 0.01) {
        const pinDropT = Math.max(0, Math.min(1, (effectiveS4 - 0.20) / 0.18));
        const pinEase = 1 - Math.pow(1 - pinDropT, 3);
        const pinY = (1 - pinEase) * -18;
        gpsPinSvgGroupRef.current.setAttribute('transform', `translate(130, ${(38 + pinY).toFixed(1)})`);
      }
      if (gpsPulseRingRef.current && smoothStep1 > 0.01) {
        const ringT = ((effectiveS4 * 6) % 1 + 1) % 1;
        gpsPulseRingRef.current.setAttribute('r', (8 + ringT * 16).toFixed(1));
        gpsPulseRingRef.current.setAttribute('opacity', ((1 - ringT) * 0.65).toFixed(2));
      }

      // Step 2: Rasai Verified Dispatch Confirmation (0.44 -> 0.68)
      const step2ConfirmT = Math.max(0, Math.min(1, (effectiveS4 - 0.44) / 0.20));
      const smoothStep2 = step2ConfirmT * step2ConfirmT * (3 - 2 * step2ConfirmT);

      if (effectiveS4 >= 0.46 && effectiveS4 <= 0.78 && !hasPlayedS4ConfirmChimeRef.current) {
        hasPlayedS4ConfirmChimeRef.current = true;
        soundEngine.playWhatsAppChime();
      } else if (effectiveS4 < 0.40) {
        hasPlayedS4ConfirmChimeRef.current = false;
      }

      if (rasaiConfirmBubbleRef.current) {
        if (smoothStep2 <= 0.01) {
          rasaiConfirmBubbleRef.current.style.display = 'none';
          rasaiConfirmBubbleRef.current.style.opacity = '0';
        } else {
          rasaiConfirmBubbleRef.current.style.display = 'block';
          rasaiConfirmBubbleRef.current.style.opacity = smoothStep2.toFixed(3);
          const confirmY = (1 - smoothStep2) * 12;
          rasaiConfirmBubbleRef.current.style.transform = `translate3d(0, ${confirmY.toFixed(1)}px, 0)`;
        }
      }
      if (tablePhoneConfirmBubbleRef.current) {
        if (smoothStep2 <= 0.01) {
          tablePhoneConfirmBubbleRef.current.style.display = 'none';
          tablePhoneConfirmBubbleRef.current.style.opacity = '0';
        } else {
          tablePhoneConfirmBubbleRef.current.style.display = 'block';
          tablePhoneConfirmBubbleRef.current.style.opacity = smoothStep2.toFixed(3);
        }
      }

      // Scroll internal WhatsApp chat track upward inside fixed-height phone screen so phone size NEVER changes
      if (chatMessagesTrackRef.current) {
        const chatScrollY = smoothStep1 * 28 + smoothStep2 * 138;
        chatMessagesTrackRef.current.style.transform = `translate3d(0, -${chatScrollY.toFixed(1)}px, 0)`;
      }
      if (tablePhoneChatTrackRef.current) {
        const tableChatScrollY = smoothStep1 * 24 + smoothStep2 * 118;
        tablePhoneChatTrackRef.current.setAttribute(
          'transform',
          `translate(0, -${tableChatScrollY.toFixed(1)})`
        );
      }

      // Update status bar & WhatsApp header clock from 11:43 to 11:44 on reply (synchronized across both phones)
      const clockLabel = smoothStep1 > 0.5 ? '11:44' : '11:43';
      if (phoneClockTextRef.current && phoneClockTextRef.current.textContent !== clockLabel) {
        phoneClockTextRef.current.textContent = clockLabel;
      }
      if (tablePhoneClockRef.current && tablePhoneClockRef.current.textContent !== clockLabel) {
        tablePhoneClockRef.current.textContent = clockLabel;
      }
      const headerClockLabel = smoothStep1 > 0.5 ? '11:44 AM' : '11:43 AM';
      if (waHeaderClockRef.current && waHeaderClockRef.current.textContent !== headerClockLabel) {
        waHeaderClockRef.current.textContent = headerClockLabel;
      }
      if (
        tablePhoneHeaderClockRef.current &&
        tablePhoneHeaderClockRef.current.textContent !== headerClockLabel
      ) {
        tablePhoneHeaderClockRef.current.textContent = headerClockLabel;
      }

      // Scene 4 Minimal 2-Line Rounded Caption (s4Progress: 0.10 -> 0.90)
      if (scene4CaptionRef.current) {
        let s4CapOpacity = 0;
        if (s4Progress >= 0.10 && s4Progress <= 0.92) {
          const fadeIn = Math.min(1, (s4Progress - 0.10) / 0.12);
          const fadeOut = Math.min(1, (0.92 - s4Progress) / 0.10);
          s4CapOpacity = Math.min(fadeIn, fadeOut);
        }
        scene4CaptionRef.current.style.opacity = s4CapOpacity.toFixed(3);
        scene4CaptionRef.current.style.transform = `translate3d(-50%, ${(
          (1 - s4CapOpacity) *
          12
        ).toFixed(1)}px, 0)`;
      }
    }, [embedded]);

    const startAmbientLoop = useCallback(() => {
      if (ambientRafIdRef.current) return;
      const ambientLoop = (now: number) => {
        if (!isSceneInViewRef.current) {
          ambientRafIdRef.current = 0;
          return;
        }
        if (clockSecondHandRef.current) {
          const secAngle = (Math.floor(now / 1000) % 60) * 6;
          clockSecondHandRef.current.setAttribute('transform', `rotate(${secAngle} 180 185)`);
        }
        ambientRafIdRef.current = requestAnimationFrame(ambientLoop);
      };
      ambientRafIdRef.current = requestAnimationFrame(ambientLoop);
    }, []);

    const stopAmbientLoop = useCallback(() => {
      if (ambientRafIdRef.current) {
        cancelAnimationFrame(ambientRafIdRef.current);
        ambientRafIdRef.current = 0;
      }
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        setProgress: (p: number) => {
          targetScrollProgressRef.current = p;
          applyScrollMutations(p);
        },
        setActive: (active: boolean) => {
          if (isSceneInViewRef.current === active) return;
          isSceneInViewRef.current = active;
          if (active) {
            startAmbientLoop();
          } else {
            stopAmbientLoop();
          }
        },
      }),
      [applyScrollMutations, startAmbientLoop, stopAmbientLoop]
    );

    // =========================================================================
    // AMBIENT ANIMATION LOOP (Wall Clock Ticking when in view)
    // =========================================================================
    useEffect(() => {
      if (embedded) {
        return () => stopAmbientLoop();
      }
      const el = containerRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') {
        setIsSceneMounted(true);
        isSceneInViewRef.current = true;
        startAmbientLoop();
        return () => stopAmbientLoop();
      }

      const mountObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setIsSceneMounted(true);
            mountObserver.disconnect();
          }
        },
        { rootMargin: '600px 0px' }
      );
      mountObserver.observe(el);

      const activeObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          isSceneInViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            startAmbientLoop();
          } else {
            stopAmbientLoop();
          }
        },
        { threshold: 0.01 }
      );
      activeObserver.observe(el);

      return () => {
        mountObserver.disconnect();
        activeObserver.disconnect();
        stopAmbientLoop();
      };
    }, [embedded, startAmbientLoop, stopAmbientLoop]);

    // =========================================================================
    // REFRESH-RATE-INDEPENDENT SCROLL ENGINE (Identical to Scene 1 practices)
    // =========================================================================
    useEffect(() => {
      if (embedded) return;
      let rafId = 0;
      let lastFrameTime = 0;

      const MAX_PROGRESS_SPEED = 0.32;
      const DAMPING_LAMBDA = 9.5;
      const MAX_FLING_LEAD = 0.16;

      const animateScrollLoop = (now: number) => {
        const dt =
          lastFrameTime > 0
            ? Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000))
            : 1 / 120;
        lastFrameTime = now;

        const target = targetScrollProgressRef.current;
        const current = scrollProgressRef.current;
        const diff = target - current;

        if (Math.abs(diff) <= 0.0004) {
          if (current !== target) {
            applyScrollMutations(target);
          }
          rafId = 0;
          lastFrameTime = 0;
          return;
        }

        const alpha = 1 - Math.exp(-DAMPING_LAMBDA * dt);
        const dampedStep = diff * alpha;
        const maxStep = MAX_PROGRESS_SPEED * dt;
        const step =
          Math.abs(dampedStep) > maxStep ? Math.sign(dampedStep) * maxStep : dampedStep;

        const nextProgress = Math.max(0, Math.min(1, current + step));
        applyScrollMutations(nextProgress);

        rafId = requestAnimationFrame(animateScrollLoop);
      };

      const startLoopIfNeeded = () => {
        if (!rafId) {
          lastFrameTime = performance.now();
          rafId = requestAnimationFrame(animateScrollLoop);
        }
      };

      const handleScroll = () => {
        if (isProgrammaticScrollRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollable = rect.height - windowHeight;
        if (totalScrollable <= 0) return;

        const currentScroll = -rect.top;
        let rawTarget = Math.max(0, Math.min(1, currentScroll / totalScrollable));

        if (rawTarget > 0 && !isSceneMounted) {
          setIsSceneMounted(true);
        }

        const isInsideScene = rect.top <= 0 && rect.bottom >= windowHeight;
        const rendered = scrollProgressRef.current;
        const lead = rawTarget - rendered;

        if (isInsideScene && !isTouchingRef.current && Math.abs(lead) > MAX_FLING_LEAD) {
          rawTarget = Math.max(0, Math.min(1, rendered + Math.sign(lead) * MAX_FLING_LEAD));
          const containerDocTop = window.scrollY + rect.top;
          const clampedScrollY = containerDocTop + rawTarget * totalScrollable;
          isProgrammaticScrollRef.current = true;
          window.scrollTo(0, clampedScrollY);
          requestAnimationFrame(() => {
            isProgrammaticScrollRef.current = false;
          });
        }

        targetScrollProgressRef.current = rawTarget;
        startLoopIfNeeded();
      };

      const handleWheel = (e: WheelEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const isInsideScene = rect.top <= 4 && rect.bottom >= windowHeight - 4;
        if (!isInsideScene) return;

        if (e.deltaY < 0 && scrollProgressRef.current <= 0.01 && rect.top >= -4) return;
        if (e.deltaY > 0 && scrollProgressRef.current >= 0.99 && rect.bottom <= windowHeight + 4)
          return;

        const maxWheelPx = windowHeight * 0.09;
        if (Math.abs(e.deltaY) > maxWheelPx) {
          e.preventDefault();
          window.scrollBy({
            top: Math.sign(e.deltaY) * maxWheelPx,
            behavior: 'instant' as ScrollBehavior,
          });
        }
      };

      const handleTouchStart = () => {
        isTouchingRef.current = true;
      };
      const handleTouchEnd = () => {
        isTouchingRef.current = false;
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const totalScrollable = Math.max(1, rect.height - window.innerHeight);
        const initialProgress = Math.max(0, Math.min(1, -rect.top / totalScrollable));
        targetScrollProgressRef.current = initialProgress;
        applyScrollMutations(initialProgress);
      }

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [embedded, applyScrollMutations, isSceneMounted]);

    const stageContent = (
      <div className="relative w-full h-full overflow-hidden bg-[#070a12] select-none">
        {isSceneMounted && (
          <>
            {/* ===============================================================
                SPLIT SCREEN DUAL PERSPECTIVE CONTAINER (Phases 2, 3 & 4)
                - Mobile portrait: Stacked vertically (Top: Courier, Bottom: Ayesha)
                - Desktop landscape: Side-by-side (Left: Courier, Right: Ayesha)
                =============================================================== */}
            <div
              ref={splitStageRef}
              className={`relative w-full h-full flex ${
                isPortrait ? 'flex-col' : 'flex-row'
              } overflow-hidden`}
            >
              {/* -------------------------------------------------------------
                  TOP (MOBILE) / LEFT (DESKTOP): KAMRAN UNDER FLYOVER
                  ------------------------------------------------------------- */}
              <div
                ref={leftPaneRef}
                className={`relative overflow-hidden bg-[#080d18] transform-gpu ${
                  isPortrait
                    ? 'w-full h-1/2 will-change-[height,opacity]'
                    : 'h-full w-1/2 will-change-[width,opacity]'
                }`}
                style={
                  isPortrait
                    ? {
                        width: '100%',
                        height: '50%',
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                      }
                    : {
                        width: '50%',
                        height: '100%',
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                      }
                }
              >
                <svg
                  viewBox="0 0 960 1080"
                  className="w-full h-full object-cover pointer-events-none"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    {/* Underpass Shaded Concrete Gradient */}
                    <linearGradient id="flyoverDeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#050811" />
                      <stop offset="42%" stopColor="#0f172a" />
                      <stop offset="78%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#090d16" />
                    </linearGradient>

                    {/* Cylindrical Concrete Pier 3D Gradient */}
                    <linearGradient id="concretePierGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#090d16" />
                      <stop offset="18%" stopColor="#1e293b" />
                      <stop offset="38%" stopColor="#3b4c63" />
                      <stop offset="68%" stopColor="#1e293b" />
                      <stop offset="90%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#060911" />
                    </linearGradient>

                    {/* 3D Flared Pier Capital Gradient */}
                    <linearGradient id="pierCapitalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="45%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#090d16" />
                    </linearGradient>

                    {/* Sunlit Distant Lahore Afternoon Sky & Heat Haze */}
                    <linearGradient id="lahoreDistantSky" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#111a2e" />
                      <stop offset="48%" stopColor="#1e293b" />
                      <stop offset="82%" stopColor="#45301c" />
                      <stop offset="100%" stopColor="#784717" />
                    </linearGradient>

                    {/* Diagonal Midday Sunbeam Slicing Past Flyover Edge */}
                    <linearGradient id="flyoverSunShaft" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity="0.26" />
                      <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>

                    {/* Shaded Underpass Asphalt Road */}
                    <linearGradient id="flyoverRoadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#131c2e" />
                      <stop offset="32%" stopColor="#0b111e" />
                      <stop offset="75%" stopColor="#060a12" />
                      <stop offset="100%" stopColor="#03050a" />
                    </linearGradient>
                  </defs>

                  {/* 1. Distant Sunlit Lahore Street, Skyline & Tree Canopies Beyond Underpass */}
                  <rect x="0" y="0" width="960" height="730" fill="url(#lahoreDistantSky)" />
                  <rect x="0" y="340" width="960" height="390" fill="#f59e0b" opacity="0.12" />

                  {/* Distant Sunlit Ferozepur / Kalma Chowk Commercial Skyline Silhouettes */}
                  <g opacity="0.45" fill="#0f172a">
                    <rect x="275" y="475" width="78" height="250" />
                    <rect x="288" y="458" width="52" height="20" />
                    <rect x="370" y="515" width="95" height="210" />
                    <rect x="520" y="490" width="110" height="235" />
                    <rect x="815" y="465" width="125" height="260" />
                    {/* Sunlit Window Glints on Distant Plaza */}
                    <g fill="#fde68a" opacity="0.35">
                      <rect x="536" y="512" width="14" height="8" />
                      <rect x="560" y="512" width="14" height="8" />
                      <rect x="584" y="512" width="14" height="8" />
                      <rect x="536" y="532" width="14" height="8" />
                      <rect x="560" y="532" width="14" height="8" />
                    </g>
                  </g>

                  {/* Distant Roadside Neem & Eucalyptus Tree Silhouettes Along Sunlit Median */}
                  <g opacity="0.52">
                    <path
                      d="M 290 725 L 290 650 C 260 645, 252 605, 278 592 C 272 565, 315 555, 330 582 C 358 582, 362 622, 335 642 L 335 725 Z"
                      fill="#132a1e"
                    />
                    <path
                      d="M 455 725 L 455 660 C 425 655, 418 615, 444 598 C 440 572, 485 562, 502 590 C 528 592, 532 630, 504 652 L 504 725 Z"
                      fill="#163022"
                    />
                    <path
                      d="M 825 725 L 825 645 C 792 638, 785 595, 814 578 C 810 548, 862 542, 882 572 C 912 575, 916 618, 885 640 L 885 725 Z"
                      fill="#142e20"
                    />
                  </g>

                  {/* Diagonal Sun Shafts Slicing Between Bridge Spans */}
                  <polygon
                    points="675,180 960,180 825,780 475,780"
                    fill="url(#flyoverSunShaft)"
                  />
                  <polygon
                    points="755,195 890,195 735,780 615,780"
                    fill="url(#flyoverSunShaft)"
                    opacity="0.65"
                  />

                  {/* 2. Massive 3D Concrete Flyover Support Piers */}
                  {/* Far Pier with Bearing Pads & Formwork Seams */}
                  <g transform="translate(690, 220)">
                    {/* Elastomeric Bridge Bearing Pads on Top */}
                    <rect x="-8" y="-12" width="34" height="12" rx="1.5" fill="#090d16" stroke="#334155" strokeWidth="1" />
                    <rect x="70" y="-12" width="34" height="12" rx="1.5" fill="#090d16" stroke="#334155" strokeWidth="1" />
                    {/* Pier Shaft */}
                    <rect x="0" y="0" width="96" height="505" fill="url(#concretePierGrad)" stroke="#090d16" strokeWidth="1.5" />
                    {/* Horizontal Formwork Seam Lines & Tie-Rod Holes */}
                    {[95, 190, 285, 380].map((sy) => (
                      <g key={sy}>
                        <line x1="2" y1={sy} x2="94" y2={sy} stroke="#0f172a" strokeWidth="1.4" opacity="0.75" />
                        <line x1="2" y1={sy + 1.5} x2="94" y2={sy + 1.5} stroke="#475569" strokeWidth="0.7" opacity="0.4" />
                        <circle cx="22" cy={sy - 18} r="2" fill="#090d16" opacity="0.7" />
                        <circle cx="74" cy={sy - 18} r="2" fill="#090d16" opacity="0.7" />
                      </g>
                    ))}
                    {/* Pier Capital & Base Plinth */}
                    <polygon points="-18,0 114,0 96,36 0,36" fill="url(#pierCapitalGrad)" stroke="#090d16" strokeWidth="1.2" />
                    <rect x="-12" y="478" width="120" height="28" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                  </g>

                  {/* Primary Foreground 3D Concrete Flyover Pier (PIER LHR-14B) */}
                  <g transform="translate(110, 190)">
                    {/* Laminated Elastomeric Neoprene Bridge Bearing Pads Above Capital */}
                    <g fill="#090d16" stroke="#475569" strokeWidth="1.2">
                      <rect x="-20" y="-14" width="52" height="14" rx="2" />
                      <line x1="-18" y1="-7" x2="30" y2="-7" stroke="#64748b" strokeWidth="1" />
                      <rect x="116" y="-14" width="52" height="14" rx="2" />
                      <line x1="118" y1="-7" x2="166" y2="-7" stroke="#64748b" strokeWidth="1" />
                    </g>

                    {/* Main Cylindrical/Octagonal Concrete Pier Shaft */}
                    <rect
                      x="0"
                      y="0"
                      width="148"
                      height="535"
                      fill="url(#concretePierGrad)"
                      stroke="#060911"
                      strokeWidth="2"
                    />
                    {/* Vertical Specular Highlight Rib & Shadow Fluting */}
                    <rect x="28" y="54" width="16" height="410" fill="#64748b" opacity="0.14" />
                    <rect x="116" y="54" width="22" height="410" fill="#020617" opacity="0.32" />

                    {/* Concrete Formwork Panel Seams & Recessed Tie-Rod Cone Holes */}
                    {[105, 175, 255, 335, 415].map((py) => (
                      <g key={py}>
                        <line x1="2" y1={py} x2="146" y2={py} stroke="#090d16" strokeWidth="1.8" opacity="0.8" />
                        <line x1="2" y1={py + 2} x2="146" y2={py + 2} stroke="#64748b" strokeWidth="0.9" opacity="0.45" />
                        {[24, 74, 124].map((hx) => (
                          <g key={hx} transform={`translate(${hx}, ${py - 28})`}>
                            <circle cx="0" cy="0" r="3.2" fill="#090d16" />
                            <circle cx="0.6" cy="0.6" r="2.2" fill="#1e293b" />
                          </g>
                        ))}
                      </g>
                    ))}

                    {/* Flared 3D Concrete Pier Capital (Bearing Pad Header) */}
                    <polygon
                      points="-38,0 186,0 148,54 0,54"
                      fill="url(#pierCapitalGrad)"
                      stroke="#090d16"
                      strokeWidth="2"
                    />
                    <line x1="-34" y1="3" x2="182" y2="3" stroke="#64748b" strokeWidth="1.5" opacity="0.55" />
                    <polygon points="0,54 148,54 148,66 0,66" fill="#050811" opacity="0.65" />

                    {/* 3D Bolted Aluminum Municipal Stencil Plate on Pier */}
                    <g transform="translate(22, 184)">
                      {/* Plate Drop Shadow */}
                      <rect x="3" y="4" width="104" height="46" rx="4" fill="#020617" opacity="0.7" />
                      {/* Plate Metallic Frame */}
                      <rect
                        x="0"
                        y="0"
                        width="104"
                        height="46"
                        rx="4"
                        fill="#090d16"
                        stroke="#64748b"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="3"
                        y="3"
                        width="98"
                        height="40"
                        rx="2.5"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="0.8"
                      />
                      {/* 4 Corner Mounting Hex Rivets */}
                      <circle cx="7" cy="7" r="1.6" fill="#94a3b8" />
                      <circle cx="97" cy="7" r="1.6" fill="#94a3b8" />
                      <circle cx="7" cy="39" r="1.6" fill="#94a3b8" />
                      <circle cx="97" cy="39" r="1.6" fill="#94a3b8" />
                      <text
                        x="52"
                        y="20"
                        fill="#facc15"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="900"
                        textAnchor="middle"
                        letterSpacing="0.8"
                      >
                        LHR-FLY-14
                      </text>
                      <line x1="14" y1="25" x2="90" y2="25" stroke="#334155" strokeWidth="1" />
                      <text
                        x="52"
                        y="36"
                        fill="#cbd5e1"
                        fontSize="8.5"
                        fontFamily="sans-serif"
                        fontWeight="700"
                        textAnchor="middle"
                        letterSpacing="0.5"
                      >
                        KALMA UNDERPASS
                      </text>
                    </g>

                    {/* 3D Molded Concrete Crash Plinth & Yellow/Black Hazard Chevron Band */}
                    <g transform="translate(-8, 462)">
                      {/* Upper Concrete Bevel */}
                      <polygon points="8,0 156,0 164,8 0,8" fill="#334155" stroke="#0f172a" strokeWidth="1" />
                      {/* Recessed Hazard Band */}
                      <g transform="translate(4, 8)">
                        <rect width="156" height="36" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
                        {[0, 1, 2, 3, 4].map((ci) => (
                          <polygon
                            key={ci}
                            points={`${ci * 31 + 4},0 ${ci * 31 + 20},0 ${ci * 31 + 10},36 ${ci * 31 - 6},36`}
                            fill="#facc15"
                          />
                        ))}
                        {/* Weathering/Scuff Gradient Overlay on Hazard Band */}
                        <rect width="156" height="36" fill="#090d16" opacity="0.18" />
                      </g>
                      {/* Heavy Lower Concrete Footing Plinth */}
                      <rect x="-6" y="44" width="176" height="29" rx="3" fill="#1e293b" stroke="#090d16" strokeWidth="1.5" />
                      <line x1="-4" y1="46" x2="168" y2="46" stroke="#475569" strokeWidth="1.2" />
                    </g>
                  </g>

                  {/* 3. Overhead 3D Concrete Flyover Bridge Deck, Box Girders & Drainage Pipe */}
                  <g id="flyover-overhead-deck">
                    <polygon
                      points="0,0 960,0 960,265 0,215"
                      fill="url(#flyoverDeckGrad)"
                      stroke="#334155"
                      strokeWidth="2"
                    />
                    {/* 3D Structural Box-Girder Ribs & Recessed Coffers Under Bridge Deck */}
                    {[70, 230, 390, 550, 710, 870].map((gx, gi) => (
                      <g key={gi}>
                        {/* Girder Front Face */}
                        <polygon
                          points={`${gx},${210 + gi * 8} ${gx + 52},${213 + gi * 8} ${gx + 32},115 ${gx - 12},115`}
                          fill="#090d16"
                          stroke="#1e293b"
                          strokeWidth="1"
                          opacity="0.82"
                        />
                        {/* Girder 3D Side Thickness Return */}
                        <polygon
                          points={`${gx + 52},${213 + gi * 8} ${gx + 66},${206 + gi * 8} ${gx + 46},115 ${gx + 32},115`}
                          fill="#1e293b"
                          opacity="0.65"
                        />
                      </g>
                    ))}
                    {/* Galvanized Bridge Deck Stormwater Drainage Pipe Running Along Pier */}
                    <path
                      d="M 244 226 L 244 252 L 236 264 L 236 725"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 242 226 L 242 252 L 234 264 L 234 725"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Pipe Mounting Brackets */}
                    {[310, 420, 530, 640].map((by) => (
                      <rect key={by} x="229" y={by} width="14" height="4" rx="1" fill="#64748b" />
                    ))}

                    {/* 3D Concrete Parapet Fascia, Expansion Joint & Top Railing */}
                    <polygon points="0,182 960,232 960,265 0,215" fill="#1e293b" opacity="0.6" />
                    <line x1="0" y1="215" x2="960" y2="265" stroke="#64748b" strokeWidth="4" />
                    <line x1="0" y1="218" x2="960" y2="268" stroke="#090d16" strokeWidth="2.5" />
                    <line x1="0" y1="184" x2="960" y2="234" stroke="#334155" strokeWidth="3" />
                    {/* Expansion Joint Seam */}
                    <line x1="485" y1="140" x2="465" y2="240" stroke="#020617" strokeWidth="3" />
                  </g>

                  {/* 4. Shaded Underpass Asphalt Road, 3D Kerbstones & Drain Grate */}
                  <rect x="0" y="725" width="960" height="355" fill="url(#flyoverRoadGrad)" />

                  {/* 3D Segmented Concrete Road Kerbstones Along Underpass Edge */}
                  <g id="road-kerbstones">
                    {Array.from({ length: 12 }).map((_, ki) => (
                      <g key={ki} transform={`translate(${ki * 82}, 716)`}>
                        {/* Top Bevel of Kerbstone */}
                        <polygon
                          points="0,0 78,0 82,4 0,4"
                          fill={ki % 2 === 0 ? '#475569' : '#ca8a04'}
                          opacity="0.75"
                        />
                        {/* Front Vertical Face of Kerbstone */}
                        <rect
                          x="0"
                          y="4"
                          width="80"
                          height="10"
                          fill={ki % 2 === 0 ? '#1e293b' : '#854d0e'}
                          stroke="#090d16"
                          strokeWidth="1"
                        />
                      </g>
                    ))}
                  </g>

                  {/* Cast-Iron Roadside Stormwater Gutter Grate */}
                  <g transform="translate(310, 732)" opacity="0.65">
                    <polygon points="0,0 76,0 70,14 -6,14" fill="#020617" stroke="#334155" strokeWidth="1.2" />
                    {[10, 22, 34, 46, 58].map((gx) => (
                      <line key={gx} x1={gx} y1="2" x2={gx - 3} y2="12" stroke="#475569" strokeWidth="2" />
                    ))}
                  </g>

                  {/* Asphalt Aggregate Texture Lines & Weathered Lane Marking */}
                  <g opacity="0.3" strokeLinecap="round">
                    <line x1="40" y1="775" x2="360" y2="775" stroke="#334155" strokeWidth="1.5" strokeDasharray="18 12" />
                    <line x1="520" y1="810" x2="910" y2="810" stroke="#475569" strokeWidth="1.2" strokeDasharray="14 18" />
                    <line x1="110" y1="955" x2="880" y2="955" stroke="#1e293b" strokeWidth="2" />
                  </g>
                  {/* Faded Thermoplastic Road Shoulder Line */}
                  <line
                    x1="0"
                    y1="918"
                    x2="960"
                    y2="918"
                    stroke="#64748b"
                    strokeWidth="4"
                    strokeDasharray="48 28"
                    opacity="0.28"
                  />

                  {/* Cast Shadow of Flyover Deck on Road */}
                  <polygon
                    points="0,726 740,726 620,1080 0,1080"
                    fill="#020617"
                    opacity="0.58"
                  />

                  {/* 5. Parked Atlas Honda CD 70 & Courier Kamran Looking at Phone */}
                  <g transform={isPortrait ? 'translate(-410, 80) scale(0.90)' : 'translate(-390, 48) scale(0.88)'}>
                    {/* Multi-Layered Ground Contact & Ambient Shadow Under Parked Bike */}
                    <ellipse cx="950" cy="882" rx="232" ry="20" fill="#020617" opacity="0.88" />
                    <ellipse cx="835" cy="880" rx="72" ry="11" fill="#000000" opacity="0.75" />
                    <ellipse cx="1095" cy="880" rx="72" ry="11" fill="#000000" opacity="0.75" />
                    <CourierKamran layer="far" visorDown={false} />
                    <HondaCD70 isMoving={false} showCargoRack={true} />
                    <CourierKamran
                      layer="near"
                      visorDown={false}
                      leanAngle={16}
                      headTilt={8}
                      showParcel={false}
                    />
                    {/* 3D CNC-Machined Bike Handlebar Mobile Clamp & Titanium Smartphone */}
                    <g id="handlebar-mobile-mount" transform="translate(1054, 595)">
                      {/* Heavy-Duty Anodized Aluminum Handlebar Ring Clamp with Allen Bolts */}
                      <circle cx="0" cy="0" r="6.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="3" fill="#090d16" />
                      <circle cx="-4.2" cy="-3.5" r="1.1" fill="#cbd5e1" />
                      <circle cx="4.2" cy="3.5" r="1.1" fill="#cbd5e1" />

                      {/* Articulated Dual Ball-Joint Arm & Locking Thumbscrew Knob */}
                      <path
                        d="M 0 0 L 4 -16 L 6.5 -25"
                        fill="none"
                        stroke="#475569"
                        strokeWidth="4.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M -0.8 0 L 3.2 -16 L 5.7 -25"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                      {/* Locking Wingnut / Thumbscrew on Arm Joint */}
                      <ellipse cx="7.5" cy="-13" rx="3.2" ry="1.8" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" transform="rotate(15 7.5 -13)" />
                      {/* Upper Ball Socket */}
                      <circle cx="6.5" cy="-25" r="3.8" fill="#334155" stroke="#cbd5e1" strokeWidth="0.9" />

                      {/* 3D Phone Cradle & Titanium Smartphone Side Profile */}
                      <g transform="translate(6.5, -25) rotate(-14)">
                        {/* Soft Cyan OLED Screen Light Cone Illuminating Toward Kamran */}
                        <polygon
                          points="-2.5,-16 -36,-28 -36,24 -2.5,16"
                          fill="#38bdf8"
                          opacity="0.16"
                        />

                        {/* Anodized Cradle Spine & Rear Retention Plate */}
                        <rect x="-1.5" y="-19" width="3.5" height="38" rx="1.2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                        {/* Spring-Loaded Red Silicone Shock-Absorbing Grip Claws (Top & Bottom) */}
                        <path d="M 1.5 -19 L -4.2 -19 L -4.2 -14" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 1.5 19 L -4.2 19 L -4.2 14" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                        {/* 3D Protruding Rear Triple-Camera Bump & Sapphire Lens Rings (Right/Rear Side) */}
                        <rect x="0.8" y="-16.5" width="2.4" height="11.5" rx="1" fill="#334155" stroke="#94a3b8" strokeWidth="0.5" />
                        <rect x="2.6" y="-15.5" width="1.3" height="4" rx="0.4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.4" />
                        <rect x="2.6" y="-10.2" width="1.3" height="4" rx="0.4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.4" />

                        {/* 3D Brushed Titanium Smartphone Chassis Side Rail */}
                        <rect x="-3.4" y="-18" width="4.4" height="36" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />
                        {/* Specular Metallic Center Highlight Along Titanium Rail */}
                        <line x1="-1.2" y1="-16" x2="-1.2" y2="16" stroke="#f8fafc" strokeWidth="1" opacity="0.65" />
                        {/* Antenna Band Seams */}
                        <line x1="-3.4" y1="-13" x2="1" y2="-13" stroke="#0f172a" strokeWidth="0.7" />
                        <line x1="-3.4" y1="13" x2="1" y2="13" stroke="#0f172a" strokeWidth="0.7" />

                        {/* Physical Tactile Side Buttons (Power Lock & Volume Up/Down) */}
                        <rect x="-4.1" y="-8.5" width="1" height="4.8" rx="0.5" fill="#e2e8f0" stroke="#475569" strokeWidth="0.4" />
                        <rect x="-4.1" y="-2.2" width="1" height="4.8" rx="0.5" fill="#e2e8f0" stroke="#475569" strokeWidth="0.4" />
                        <rect x="-4.1" y="4.8" width="1" height="6.8" rx="0.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.4" />

                        {/* Active Illuminated OLED Screen Glass Edge Facing Kamran */}
                        <line x1="-3.6" y1="-16" x2="-3.6" y2="16" stroke="#38bdf8" strokeWidth="1.3" strokeLinecap="round" />
                        <line x1="-3.6" y1="-11" x2="-3.6" y2="9" stroke="#e0f2fe" strokeWidth="0.8" strokeLinecap="round" />
                      </g>
                    </g>
                  </g>

                  {/* Kamran's Typewriter Speech Bubble (Optimized for Foldables, Tablets & Desktops) */}
                  <g
                    ref={kamranBubbleRef}
                    transform={isPortrait ? 'translate(20, 245) scale(0.82)' : 'translate(25, 360) scale(0.84)'}
                    style={{ display: 'none' }}
                  >
                    {/* Speech Bubble Pointer pointing toward Kamran's helmet */}
                    <polygon points="280,92 325,124 305,92" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.6" />
                    <line x1="281" y1="92" x2="304" y2="92" stroke="#0b0f17" strokeWidth="2.5" />
                    
                    {/* ForeignObject Speech Box with True HTML Padding and Word Wrapping */}
                    <foreignObject x="0" y="0" width="370" height="110" className="overflow-visible pointer-events-none">
                      <div
                        className="relative w-full min-h-[92px] rounded-2xl bg-[#0b0f17]/96 border-[1.6px] border-[#c9a47a] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.85)] flex flex-col justify-center box-border select-none"
                      >
                        <div className="absolute -top-3 left-5 bg-[#c9a47a] px-2 py-0.5 rounded text-[9.5px] font-black text-black tracking-wider uppercase shadow-sm">
                          KAMRAN (COURIER)
                        </div>
                        <p
                          ref={kamranUrduTextRef}
                          className="font-sans text-[12.5px] sm:text-[13px] font-semibold text-white leading-snug break-words m-0 tracking-wide"
                        />
                        <p className="font-sans text-[11px] sm:text-[11.5px] font-medium text-[#cbd5e1] italic leading-snug mt-1 break-words m-0">
                          <span ref={kamranEnTextRef} />
                          <span ref={kamranCursorRef} className="text-amber-500 font-bold not-italic ml-0.5 animate-pulse">|</span>
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                </svg>

                {/* Top-Left Sector Location Text */}
                <div className="absolute top-2 sm:top-3.5 left-2 sm:left-3.5 z-20 pointer-events-none max-w-[55%]">
                  <span className="font-mono text-[7.5px] sm:text-[8.5px] md:text-[10px] lg:text-xs font-black tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-tight block truncate">
                    KALMA FLYOVER SHADE • 2.8 KM FROM CUSTOMER
                  </span>
                </div>

                {/* Delivery List Panel (Top-Right of Kamran Pane - Compact Responsive Architecture) */}
                <div className="absolute top-2.5 sm:top-3.5 right-2 sm:right-3.5 w-[190px] sm:w-[230px] md:w-[260px] lg:w-[290px] max-w-[55%] z-20 rounded-xl bg-[#0b0f17]/96 border border-slate-700/80 p-1.5 sm:p-2.5 shadow-2xl pointer-events-none backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-800">
                    <span className="font-mono text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black text-white uppercase tracking-wider">
                      DELIVERY LIST
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        ref={remainingCounterRef}
                        className="font-mono text-[9.5px] sm:text-[11px] font-black text-white"
                      >
                        34
                      </span>
                      <span className="font-mono text-[7px] sm:text-[8px] text-slate-400 uppercase tracking-tight">parcels</span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    {PARCEL_QUEUE.map((item, idx) => (
                      <div
                        key={item.id}
                        ref={(el) => {
                          parcelCardRefs.current[idx] = el;
                        }}
                        className={`relative rounded-lg p-1 sm:p-1.5 border transition-colors overflow-hidden min-h-[36px] sm:min-h-[42px] flex flex-col justify-center ${
                          item.isTarget
                            ? 'bg-slate-900/95 border-amber-400/60'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        {/* Normal Parcel Information Container (Fades out cleanly when status changes) */}
                        <div
                          ref={(el) => {
                            parcelInfoRefs.current[idx] = el;
                          }}
                          className="w-full"
                        >
                          <div className="flex items-center justify-between text-[7.5px] sm:text-[9px] md:text-[10px] font-mono leading-tight">
                            <span className="font-bold text-white truncate max-w-[68%]">
                              {item.id} • {item.recipient}
                            </span>
                            <span className="text-emerald-400 font-bold shrink-0">{item.cod}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5 text-[6.5px] sm:text-[8px] md:text-[8.5px] text-slate-400 leading-tight">
                            <span className="truncate pr-1">{item.address}</span>
                            <span className="font-mono text-amber-400 shrink-0 font-bold">{item.dist}</span>
                          </div>
                        </div>

                        {/* Customer Unavailable Status Overlay (Changes in same position, no bleed-through) */}
                        <div
                          ref={(el) => {
                            parcelStampRefs.current[idx] = el;
                          }}
                          className="absolute inset-0 rounded-[inherit] bg-[#220606] border border-red-500/80 flex items-center justify-center px-1.5 pointer-events-none box-border shadow-inner"
                          style={{ opacity: 0, display: 'none' }}
                        >
                          <span className="font-mono text-[7.5px] sm:text-[9px] md:text-[10px] font-black tracking-wider text-red-200 uppercase text-center leading-tight select-none">
                            Customer Unavailable
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Red Flash Vignette on Kamran's Side during Ghost Scan */}
                <div
                  ref={leftRedFlashRef}
                  className="absolute inset-0 z-30 pointer-events-none border-4 border-red-500"
                  style={{
                    opacity: 0,
                    background:
                      'radial-gradient(circle at center, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.58) 100%)',
                  }}
                />
              </div>

              {/* -------------------------------------------------------------
                  BOTTOM (MOBILE) / RIGHT (DESKTOP): AYESHA IN GULBERG FLAT
                  ------------------------------------------------------------- */}
              <div
                ref={rightPaneRef}
                className={`relative overflow-hidden bg-[#1e1510] transform-gpu ${
                  isPortrait
                    ? 'w-full h-1/2 will-change-[height]'
                    : 'h-full w-1/2 will-change-[width]'
                }`}
                style={
                  isPortrait
                    ? {
                        width: '100%',
                        height: '50%',
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                      }
                    : {
                        width: '50%',
                        height: '100%',
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                      }
                }
              >
                <svg
                  viewBox="0 0 960 1080"
                  className="w-full h-full object-cover pointer-events-none"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    {/* Warm Sunlit Gulberg Apartment Wall Gradient */}
                    <linearGradient id="gulbergWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4a3423" />
                      <stop offset="38%" stopColor="#352519" />
                      <stop offset="78%" stopColor="#241810" />
                      <stop offset="100%" stopColor="#160e09" />
                    </linearGradient>

                    {/* 3D Wainscoting Recessed Panel Gradient */}
                    <linearGradient id="wainscotPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#160e09" />
                      <stop offset="50%" stopColor="#21150e" />
                      <stop offset="100%" stopColor="#2c1c12" />
                    </linearGradient>

                    {/* 3D Molded Wood Frame / Casing Gradient */}
                    <linearGradient id="teakWoodCasing3D" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#92400e" />
                      <stop offset="28%" stopColor="#78350f" />
                      <stop offset="65%" stopColor="#451a03" />
                      <stop offset="100%" stopColor="#270e01" />
                    </linearGradient>

                    {/* 3D Antique Gold / Brass Bevel Gradient */}
                    <linearGradient id="brassGold3D" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="25%" stopColor="#f59e0b" />
                      <stop offset="55%" stopColor="#b45309" />
                      <stop offset="82%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* Morning Window Sky Gradient */}
                    <linearGradient id="gulbergWindowSky" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="38%" stopColor="#38bdf8" />
                      <stop offset="72%" stopColor="#bae6fd" />
                      <stop offset="100%" stopColor="#fef3c7" />
                    </linearGradient>

                    {/* 3D Tree Trunk Bark Cylindrical Gradient */}
                    <linearGradient id="treeBark3D" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#78350f" />
                      <stop offset="32%" stopColor="#5c280b" />
                      <stop offset="68%" stopColor="#3b1806" />
                      <stop offset="100%" stopColor="#1f0c02" />
                    </linearGradient>

                    {/* 3D Multi-Layered Neem & Banyan Foliage Gradients */}
                    <radialGradient id="canopyDeepGrad" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#15803d" />
                      <stop offset="55%" stopColor="#14532d" />
                      <stop offset="100%" stopColor="#052e16" />
                    </radialGradient>
                    <radialGradient id="canopyMidGrad" cx="32%" cy="28%" r="70%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="48%" stopColor="#16a34a" />
                      <stop offset="88%" stopColor="#15803d" />
                      <stop offset="100%" stopColor="#14532d" />
                    </radialGradient>
                    <radialGradient id="canopySunlitGrad" cx="30%" cy="25%" r="68%">
                      <stop offset="0%" stopColor="#bef264" />
                      <stop offset="35%" stopColor="#4ade80" />
                      <stop offset="75%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#166534" />
                    </radialGradient>

                    {/* 3D Bougainvillea Blossom Cluster Gradient */}
                    <radialGradient id="bougainvillea3D" cx="35%" cy="30%" r="68%">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="45%" stopColor="#ec4899" />
                      <stop offset="82%" stopColor="#be185d" />
                      <stop offset="100%" stopColor="#831843" />
                    </radialGradient>

                    {/* 3D Sheer Pleated Ivory Curtain Gradient */}
                    <linearGradient id="pleatedCurtainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
                      <stop offset="22%" stopColor="#fffbeb" stopOpacity="0.65" />
                      <stop offset="45%" stopColor="#fde68a" stopOpacity="0.88" />
                      <stop offset="70%" stopColor="#fffbeb" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.45" />
                    </linearGradient>

                    {/* Golden Window Sunbeam Across Living Room */}
                    <linearGradient id="windowSunRay" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity="0.34" />
                      <stop offset="60%" stopColor="#fde68a" stopOpacity="0.13" />
                      <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                    </linearGradient>

                    {/* ClipPath for Inner Arched Window Opening */}
                    <clipPath id="gulbergWindowArchClip">
                      <rect x="0" y="0" width="225" height="385" rx="112.5" />
                    </clipPath>
                  </defs>

                  {/* 1. Rich 3D Gulberg Apartment Wall, Wallpaper Texture, Cornice & Wainscoting */}
                  <rect x="0" y="0" width="960" height="1080" fill="url(#gulbergWallGrad)" />

                  {/* Subtle Vertical Damask / Plaster Wallpaper Striping on Upper Wall */}
                  <g opacity="0.08" stroke="#fde68a" strokeWidth="1.5">
                    {Array.from({ length: 20 }).map((_, wi) => (
                      <line key={wi} x1={wi * 50 + 20} y1="24" x2={wi * 50 + 20} y2="668" />
                    ))}
                  </g>

                  {/* Top Ceiling Crown Cornice Molding & Ambient Ceiling Shadow */}
                  <rect x="0" y="0" width="960" height="14" fill="#24160e" stroke="#120a06" strokeWidth="1" />
                  <rect x="0" y="14" width="960" height="8" fill="#3b2518" />
                  <line x1="0" y1="14" x2="960" y2="14" stroke="#78350f" strokeWidth="1.2" opacity="0.65" />
                  <rect x="0" y="22" width="960" height="18" fill="#090503" opacity="0.38" />

                  {/* 3D Sculpted Wooden Chair Rail / Dado Molding & Recessed Wainscoting */}
                  <g id="gulberg-wainscoting">
                    {/* Lower Wall Wainscoting Backing */}
                    <rect x="0" y="676" width="960" height="404" fill="#1c120b" />

                    {/* 3D Stepped Chair Rail Molding (y=666 to 684) */}
                    <rect x="0" y="666" width="960" height="16" fill="url(#teakWoodCasing3D)" stroke="#120904" strokeWidth="1.2" />
                    {/* Top Sunlit Bevel Lip of Chair Rail */}
                    <line x1="0" y1="667.5" x2="960" y2="667.5" stroke="#d97706" strokeWidth="1.5" opacity="0.65" />
                    <line x1="0" y1="673" x2="960" y2="673" stroke="#92400e" strokeWidth="1" opacity="0.55" />
                    {/* Drop Shadow Below Chair Rail */}
                    <rect x="0" y="682" width="960" height="10" fill="#090402" opacity="0.55" />

                    {/* 5 Recessed 3D Wooden Boiserie / Wainscot Panels Across Lower Wall */}
                    {[24, 212, 400, 588, 776].map((px, pi) => (
                      <g key={pi} transform={`translate(${px}, 696)`}>
                        {/* Outer Sunken Shadow Bevel (Top & Left Dark, Bottom & Right Lit) */}
                        <rect
                          x="0"
                          y="0"
                          width="160"
                          height="240"
                          rx="3"
                          fill="url(#wainscotPanelGrad)"
                          stroke="#0c0603"
                          strokeWidth="2"
                        />
                        <line x1="2" y1="239" x2="159" y2="239" stroke="#5c3a21" strokeWidth="1.5" opacity="0.7" />
                        <line x1="159" y1="2" x2="159" y2="239" stroke="#5c3a21" strokeWidth="1.5" opacity="0.6" />
                        {/* Inner Raised Center Fielding Panel */}
                        <rect
                          x="14"
                          y="14"
                          width="132"
                          height="212"
                          rx="2"
                          fill="#24170f"
                          stroke="#3f2819"
                          strokeWidth="1.5"
                        />
                        <line x1="15" y1="15" x2="145" y2="15" stroke="#78350f" strokeWidth="1.2" opacity="0.6" />
                        <line x1="15" y1="15" x2="15" y2="225" stroke="#78350f" strokeWidth="1.2" opacity="0.5" />
                        {/* Mitered Corner Bevel Lines */}
                        <line x1="0" y1="0" x2="14" y2="14" stroke="#0c0603" strokeWidth="1.2" />
                        <line x1="160" y1="0" x2="146" y2="14" stroke="#0c0603" strokeWidth="1.2" />
                      </g>
                    ))}
                  </g>

                  {/* 2. Tall Arched Gulberg Window with Dense Tropical Courtyard View */}
                  <g id="gulberg-window" transform="translate(58, 125)">
                    {/* Drop Shadow of Arched Window Casing & Curtains onto Living Room Wall */}
                    <rect
                      x="-10"
                      y="8"
                      width="248"
                      height="395"
                      rx="124"
                      fill="#090402"
                      opacity="0.58"
                    />

                    {/* Outer 3D Molded Teak Arch Casing Surround */}
                    <rect
                      x="-12"
                      y="-12"
                      width="249"
                      height="405"
                      rx="124.5"
                      fill="url(#teakWoodCasing3D)"
                      stroke="#1c0a02"
                      strokeWidth="2.5"
                    />
                    {/* Inner Specular Bevel Lip on Arch Casing */}
                    <rect
                      x="-6"
                      y="-6"
                      width="237"
                      height="393"
                      rx="118.5"
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="1.5"
                      opacity="0.7"
                    />

                    {/* =========================================================
                        CLIPPED OUTDOOR COURTYARD SCENE (Trees, Bungalow, Vines)
                        ========================================================= */}
                    <g clipPath="url(#gulbergWindowArchClip)">
                      {/* Morning Lahore Sky Gradient */}
                      <rect x="0" y="0" width="225" height="385" fill="url(#gulbergWindowSky)" />

                      {/* Soft Golden Morning Sun Glow & Drifting Clouds */}
                      <circle cx="52" cy="82" r="46" fill="#fef08a" opacity="0.38" />
                      <path
                        d="M 12 118 C 28 106, 52 108, 66 116 C 82 106, 110 108, 122 120 Z"
                        fill="#ffffff"
                        opacity="0.55"
                      />
                      <path
                        d="M 118 92 C 136 80, 162 82, 178 90 C 194 82, 214 86, 224 96 Z"
                        fill="#fffbeb"
                        opacity="0.5"
                      />

                      {/* Distant Lahore Red-Brick Bungalow Roofline & Parapet Silhouette */}
                      <g id="distant-gulberg-bungalow" transform="translate(0, 205)">
                        {/* Warm Terracotta Brick Upper Storey Facade */}
                        <rect x="8" y="38" width="142" height="145" fill="#9a3412" opacity="0.72" />
                        {/* Sunlit Right Return Wall of Neighboring Bungalow */}
                        <rect x="148" y="52" width="77" height="130" fill="#7c2d12" opacity="0.78" />
                        {/* Stepped Lahore Brick Parapet & Terracotta Coping */}
                        <rect x="4" y="28" width="150" height="12" fill="#7c2d12" />
                        <line x1="4" y1="28" x2="154" y2="28" stroke="#fde68a" strokeWidth="1.5" opacity="0.65" />
                        {/* Traditional Ventilated Brick Jali Screen Pattern Along Parapet */}
                        <g fill="#431407" opacity="0.65">
                          {[16, 32, 48, 64, 80, 96, 112, 128].map((jx) => (
                            <rect key={jx} x={jx} y="31" width="8" height="6" rx="1" />
                          ))}
                        </g>
                        {/* Sloped Chajja Sunshade Ledge & Arched Bungalow Verandah Window */}
                        <polygon points="22,62 128,62 136,70 16,70" fill="#5c280b" />
                        <rect x="42" y="76" width="32" height="48" rx="16" fill="#431407" stroke="#fbbf24" strokeWidth="1" opacity="0.75" />
                        <rect x="88" y="76" width="32" height="48" rx="16" fill="#431407" stroke="#fbbf24" strokeWidth="1" opacity="0.75" />
                      </g>

                      {/* LAYER 1 (Deep Background): Shaded Banyan & Neem Tree Canopy */}
                      <g id="courtyard-trees-back">
                        <circle cx="38" cy="272" r="56" fill="url(#canopyDeepGrad)" />
                        <circle cx="115" cy="252" r="64" fill="url(#canopyDeepGrad)" />
                        <circle cx="192" cy="268" r="58" fill="url(#canopyDeepGrad)" />
                      </g>

                      {/* Sculpted 3D Gnarled Banyan & Neem Tree Trunks, Limbs & Aerial Roots */}
                      <g id="courtyard-tree-trunks">
                        {/* Left Neem Tree Trunk & Forked Primary Branches */}
                        <path
                          d="M 46 385 C 48 352, 44 326, 38 302 C 26 284, 14 270, 6 258 M 38 302 C 52 282, 68 268, 82 254"
                          fill="none"
                          stroke="url(#treeBark3D)"
                          strokeWidth="11"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 43 385 C 45 352, 41 326, 35 302 C 24 285, 13 271, 6 260"
                          fill="none"
                          stroke="#b45309"
                          strokeWidth="2"
                          opacity="0.55"
                          strokeLinecap="round"
                        />

                        {/* Right Courtyard Banyan Trunk, Spreading Boughs & Hanging Aerial Roots */}
                        <path
                          d="M 164 385 C 160 345, 166 312, 174 284 C 154 262, 132 246, 114 232 M 174 284 C 188 264, 204 250, 218 238"
                          fill="none"
                          stroke="url(#treeBark3D)"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Sunlit Left Bark Edge on Banyan Trunk */}
                        <path
                          d="M 160 385 C 156 345, 162 312, 170 284 C 151 263, 130 247, 114 234"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2.4"
                          opacity="0.5"
                          strokeLinecap="round"
                        />
                        {/* Slender Hanging Banyan Aerial Prop Roots */}
                        <line x1="138" y1="252" x2="136" y2="345" stroke="#451a03" strokeWidth="2.2" opacity="0.75" />
                        <line x1="146" y1="258" x2="145" y2="355" stroke="#5c280b" strokeWidth="1.6" opacity="0.7" />
                        <line x1="192" y1="262" x2="190" y2="348" stroke="#451a03" strokeWidth="2" opacity="0.7" />
                      </g>

                      {/* LAYER 2 (Midground): Lush Sculpted Emerald Neem Leaf Canopies */}
                      <g id="courtyard-trees-mid">
                        <path
                          d="M -10 315 C -8 278, 22 254, 58 262 C 74 238, 114 236, 132 260 C 156 242, 198 248, 212 276 C 232 288, 234 328, 210 348 L -10 348 Z"
                          fill="url(#canopyMidGrad)"
                        />
                        <circle cx="52" cy="296" r="44" fill="url(#canopyMidGrad)" />
                        <circle cx="148" cy="282" r="52" fill="url(#canopyMidGrad)" />
                        <circle cx="102" cy="318" r="48" fill="url(#canopyDeepGrad)" opacity="0.75" />
                      </g>

                      {/* LAYER 3 (Foreground): Sun-Dappled Crown Leaf Clusters & Individual Neem Sprigs */}
                      <g id="courtyard-trees-sunlit">
                        <circle cx="34" cy="282" r="32" fill="url(#canopySunlitGrad)" opacity="0.92" />
                        <circle cx="92" cy="268" r="36" fill="url(#canopySunlitGrad)" opacity="0.88" />
                        <circle cx="162" cy="256" r="38" fill="url(#canopySunlitGrad)" opacity="0.9" />
                        <circle cx="198" cy="292" r="30" fill="url(#canopySunlitGrad)" opacity="0.85" />
                        <circle cx="72" cy="336" r="38" fill="url(#canopyMidGrad)" />
                        <circle cx="152" cy="342" r="42" fill="url(#canopySunlitGrad)" opacity="0.82" />

                        {/* Detailed Individual Neem & Banyan Leaf Sprigs Catching Morning Sunlight */}
                        {[
                          { x: 24, y: 264, r: -25 },
                          { x: 48, y: 256, r: 15 },
                          { x: 78, y: 246, r: -12 },
                          { x: 108, y: 252, r: 22 },
                          { x: 142, y: 236, r: -18 },
                          { x: 174, y: 242, r: 18 },
                          { x: 62, y: 308, r: -15 },
                          { x: 128, y: 302, r: 12 },
                          { x: 182, y: 282, r: -22 },
                        ].map((lf, li) => (
                          <g key={li} transform={`translate(${lf.x}, ${lf.y}) rotate(${lf.r})`}>
                            <path
                              d="M 0 0 C 5 -8, 15 -8, 20 0 C 15 6, 5 6, 0 0 Z"
                              fill="#bef264"
                              stroke="#15803d"
                              strokeWidth="0.6"
                            />
                            <line x1="1" y1="0" x2="18" y2="0" stroke="#fef08a" strokeWidth="0.7" />
                            <path
                              d="M 6 -3 C 10 -11, 20 -10, 24 -2 C 18 3, 10 2, 6 -3 Z"
                              fill="#4ade80"
                              stroke="#166534"
                              strokeWidth="0.5"
                            />
                          </g>
                        ))}
                      </g>

                      {/* LAYER 4: Trailing Lahore Bougainvillea Vines & Paperflower Bract Clusters */}
                      <g id="lahore-bougainvillea-vines">
                        {/* Trailing Woody Vine Stems Draping from Top-Left & Top-Right Arch */}
                        <path
                          d="M 8 110 C 26 148, 42 182, 34 235 M 24 142 C 48 168, 68 196, 74 232"
                          fill="none"
                          stroke="#3f6212"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 216 95 C 196 138, 178 175, 184 226 M 196 135 C 174 162, 160 188, 154 218"
                          fill="none"
                          stroke="#3f6212"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Deep Green Heart-Shaped Bougainvillea Vine Leaves */}
                        {[
                          { x: 18, y: 145, r: 25 },
                          { x: 32, y: 175, r: -20 },
                          { x: 54, y: 185, r: 30 },
                          { x: 198, y: 142, r: -30 },
                          { x: 176, y: 168, r: 20 },
                          { x: 162, y: 192, r: -15 },
                        ].map((vl, vli) => (
                          <path
                            key={vli}
                            d="M 0 0 C 4 -6, 12 -6, 15 0 C 12 6, 4 6, 0 0 Z"
                            fill="#15803d"
                            stroke="#052e16"
                            strokeWidth="0.5"
                            transform={`translate(${vl.x}, ${vl.y}) rotate(${vl.r})`}
                          />
                        ))}

                        {/* Sculpted 3D Bougainvillea Blossom Clusters with 3-Petal Bracts & Ivory Star Centers */}
                        {[
                          { cx: 28, cy: 205, r: 18 },
                          { cx: 44, cy: 238, r: 22 },
                          { cx: 72, cy: 224, r: 19 },
                          { cx: 56, cy: 202, r: 15 },
                          { cx: 194, cy: 184, r: 18 },
                          { cx: 178, cy: 216, r: 21 },
                          { cx: 154, cy: 204, r: 16 },
                        ].map((b, bi) => (
                          <g key={bi} transform={`translate(${b.cx}, ${b.cy})`}>
                            {/* Base Magenta Cluster Shadow */}
                            <circle cx="0" cy="2" r={b.r} fill="#831843" opacity="0.7" />
                            {/* 3D Shaded Blossom Sphere */}
                            <circle cx="0" cy="0" r={b.r - 1} fill="url(#bougainvillea3D)" />
                            {/* Individual Paperflower Petal Bracts */}
                            <path
                              d="M -8 -4 C -4 -12, 4 -12, 8 -4 C 4 2, -4 2, -8 -4 Z"
                              fill="#f472b6"
                            />
                            <path
                              d="M -10 4 C -12 -3, -5 -8, 0 -2 C -2 6, -8 8, -10 4 Z"
                              fill="#ec4899"
                            />
                            <path
                              d="M 10 4 C 12 -3, 5 -8, 0 -2 C 2 6, 8 8, 10 4 Z"
                              fill="#db2777"
                            />
                            <path
                              d="M -5 9 C 0 3, 6 3, 8 9 C 3 14, -3 14, -5 9 Z"
                              fill="#f9a8d4"
                              opacity="0.85"
                            />
                            {/* Tiny Ivory-White Tubular Star Florets Inside Bracts */}
                            <circle cx="-2" cy="-2" r="1.6" fill="#fefce8" />
                            <circle cx="4" cy="2" r="1.4" fill="#fefce8" />
                            <circle cx="-4" cy="5" r="1.3" fill="#fefce8" />
                          </g>
                        ))}
                      </g>

                      {/* Diagonal Specular Morning Glass Reflections Across Window Panes */}
                      <polygon
                        points="-10,70 65,0 105,0 -10,115"
                        fill="#ffffff"
                        opacity="0.18"
                      />
                      <polygon
                        points="-10,145 135,0 160,0 -10,170"
                        fill="#ffffff"
                        opacity="0.11"
                      />
                      <polygon
                        points="35,385 225,195 225,235 75,385"
                        fill="#fef9c3"
                        opacity="0.14"
                      />

                      {/* Inner 3D Recessed Window Frame Shadow (Top & Left Depth) */}
                      <rect
                        x="0"
                        y="0"
                        width="225"
                        height="385"
                        rx="112.5"
                        fill="none"
                        stroke="#1c0a02"
                        strokeWidth="10"
                        opacity="0.55"
                      />
                    </g>

                    {/* 3D Beveled Teak Window Mullion Bars & Brass Casement Latch */}
                    <g id="window-mullions-3d">
                      {/* Radial Arch Transom Spoke Bars */}
                      <line x1="112.5" y1="112" x2="34" y2="34" stroke="#451a03" strokeWidth="5" />
                      <line x1="112.5" y1="112" x2="34" y2="34" stroke="#b45309" strokeWidth="1.4" />
                      <line x1="112.5" y1="112" x2="191" y2="34" stroke="#451a03" strokeWidth="5" />
                      <line x1="112.5" y1="112" x2="191" y2="34" stroke="#b45309" strokeWidth="1.4" />

                      {/* Central Vertical Mullion Stile with 3D Bevel */}
                      <rect x="108.5" y="4" width="8" height="378" fill="#451a03" stroke="#1c0a02" strokeWidth="1" />
                      <line x1="110.5" y1="6" x2="110.5" y2="380" stroke="#b45309" strokeWidth="1.6" />

                      {/* Horizontal Transom Bar at Arch Springline (y=112) */}
                      <rect x="4" y="109" width="217" height="7" fill="#451a03" stroke="#1c0a02" strokeWidth="1" />
                      <line x1="6" y1="110.8" x2="219" y2="110.8" stroke="#d97706" strokeWidth="1.5" />

                      {/* Middle Horizontal Mullion Bar (y=204) */}
                      <rect x="4" y="201" width="217" height="6.5" fill="#451a03" stroke="#1c0a02" strokeWidth="1" />
                      <line x1="6" y1="202.5" x2="219" y2="202.5" stroke="#d97706" strokeWidth="1.4" />

                      {/* Lower Horizontal Mullion Bar (y=296) */}
                      <rect x="8" y="293" width="209" height="6" fill="#451a03" stroke="#1c0a02" strokeWidth="1" />
                      <line x1="10" y1="294.5" x2="215" y2="294.5" stroke="#d97706" strokeWidth="1.3" />

                      {/* Ornate Brass Casement Window Cremone Handle / Latch on Center Stile */}
                      <g transform="translate(112.5, 248)">
                        <rect x="-3.5" y="-9" width="7" height="18" rx="2" fill="url(#brassGold3D)" stroke="#451a03" strokeWidth="0.8" />
                        <circle cx="0" cy="0" r="2.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                        <path d="M 0 0 L 5 12" stroke="url(#brassGold3D)" strokeWidth="2.4" strokeLinecap="round" />
                      </g>
                    </g>

                    {/* Inner Arched Teak Window Frame Bevel */}
                    <rect
                      x="0"
                      y="0"
                      width="225"
                      height="385"
                      rx="112.5"
                      fill="none"
                      stroke="#78350f"
                      strokeWidth="8"
                    />
                    <rect
                      x="2"
                      y="2"
                      width="221"
                      height="381"
                      rx="110.5"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="1.2"
                      opacity="0.65"
                    />

                    {/* 3D Brass Curtain Rod, Finials & Richly Pleated Sheer Ivory Curtains */}
                    <g id="window-curtains-3d">
                      {/* Brass Curtain Rod Above Arch */}
                      <rect x="-32" y="-18" width="289" height="5" rx="2.5" fill="url(#brassGold3D)" stroke="#451a03" strokeWidth="0.9" />
                      <circle cx="-35" cy="-15.5" r="5.5" fill="url(#brassGold3D)" stroke="#451a03" strokeWidth="0.9" />
                      <circle cx="260" cy="-15.5" r="5.5" fill="url(#brassGold3D)" stroke="#451a03" strokeWidth="0.9" />

                      {/* Left Pleated Sheer Curtain Panel with Vertical Drape Folds & Gold Tieback */}
                      <path
                        d="M -22 -13 L 18 -13 C 38 78, 30 198, 12 262 C 22 308, 26 355, 16 392 L -24 392 C -20 265, -24 125, -22 -13 Z"
                        fill="url(#pleatedCurtainGrad)"
                        stroke="#fde68a"
                        strokeWidth="1"
                      />
                      {/* Vertical Pleat Crease Lines on Left Curtain */}
                      <path d="M -12 -12 C -2 85, -4 195, -8 260 C -4 310, -2 355, -8 390" fill="none" stroke="#d97706" strokeWidth="1.1" opacity="0.45" />
                      <path d="M 0 -12 C 14 85, 10 195, 2 260 C 8 310, 10 355, 4 390" fill="none" stroke="#b45309" strokeWidth="1.2" opacity="0.4" />
                      <path d="M 10 -12 C 26 85, 20 195, 8 260" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.65" />
                      {/* Gold Rope Tieback & Tassel on Left Curtain */}
                      <path d="M -23 258 Q -4 268 14 260" fill="none" stroke="url(#brassGold3D)" strokeWidth="4" strokeLinecap="round" />
                      <polygon points="-2,265 4,265 7,282 -5,282" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />

                      {/* Right Pleated Sheer Curtain Panel with Vertical Drape Folds & Gold Tieback */}
                      <path
                        d="M 207 -13 L 247 -13 C 249 125, 245 265, 249 392 L 209 392 C 199 355, 203 308, 213 262 C 195 198, 187 78, 207 -13 Z"
                        fill="url(#pleatedCurtainGrad)"
                        stroke="#fde68a"
                        strokeWidth="1"
                      />
                      {/* Vertical Pleat Crease Lines on Right Curtain */}
                      <path d="M 237 -12 C 227 85, 229 195, 233 260 C 229 310, 227 355, 233 390" fill="none" stroke="#d97706" strokeWidth="1.1" opacity="0.45" />
                      <path d="M 225 -12 C 211 85, 215 195, 223 260 C 217 310, 215 355, 221 390" fill="none" stroke="#b45309" strokeWidth="1.2" opacity="0.4" />
                      <path d="M 215 -12 C 199 85, 205 195, 217 260" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.65" />
                      {/* Gold Rope Tieback & Tassel on Right Curtain */}
                      <path d="M 211 260 Q 229 268 248 258" fill="none" stroke="url(#brassGold3D)" strokeWidth="4" strokeLinecap="round" />
                      <polygon points="221,265 227,265 230,282 218,282" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
                    </g>

                    {/* 3D Stepped Molded Teak Window Sill & Apron Corbel */}
                    <g id="window-sill-3d" transform="translate(-30, 380)">
                      {/* Deep Wall Cast Shadow Under Sill */}
                      <rect x="6" y="18" width="278" height="14" rx="3" fill="#090402" opacity="0.68" />
                      {/* Lower Molded Sill Apron */}
                      <rect x="12" y="13" width="261" height="10" rx="2" fill="#3b1806" stroke="#1c0a02" strokeWidth="1.2" />
                      {/* Main Protruding Bullnose Window Sill Ledge */}
                      <rect
                        x="0"
                        y="0"
                        width="285"
                        height="15"
                        rx="4"
                        fill="url(#teakWoodCasing3D)"
                        stroke="#1c0a02"
                        strokeWidth="1.5"
                      />
                      {/* Sunlit Top Specular Lip of Window Sill */}
                      <line x1="4" y1="2" x2="281" y2="2" stroke="#fcd34d" strokeWidth="1.6" opacity="0.65" />
                      <line x1="4" y1="6" x2="281" y2="6" stroke="#b45309" strokeWidth="1" opacity="0.5" />
                    </g>
                  </g>

                  {/* Sunbeam Streaming from Window onto Ayesha's Table */}
                  <polygon
                    points="85,180 280,180 790,720 260,720"
                    fill="url(#windowSunRay)"
                  />

                  {/* 3. 3D Walnut & Brass Wall Clock with Domed Glass (11:42 AM) */}
                  <g id="gulberg-wall-clock" transform="translate(650, 45)">
                    {/* Wall Cast Shadow (Offset Down-Right from Window Light) */}
                    <circle cx="186" cy="192" r="52" fill="#090402" opacity="0.65" />

                    {/* Outer 3D Molded Walnut Wood Bezel */}
                    <circle
                      cx="180"
                      cy="185"
                      r="52"
                      fill="url(#teakWoodCasing3D)"
                      stroke="#1c0a02"
                      strokeWidth="2"
                    />
                    {/* Sunlit Top-Left Specular Bevel Highlight on Wood Rim */}
                    <path
                      d="M 136 158 A 50 50 0 0 1 212 146"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2"
                      opacity="0.7"
                      strokeLinecap="round"
                    />

                    {/* Inner Polished Brass Bezel Ring */}
                    <circle
                      cx="180"
                      cy="185"
                      r="44"
                      fill="url(#brassGold3D)"
                      stroke="#451a03"
                      strokeWidth="1.5"
                    />

                    {/* Cream Parchment Clock Dial with Inner Recessed Shadow */}
                    <circle
                      cx="180"
                      cy="185"
                      r="40.5"
                      fill="#fffbeb"
                      stroke="#92400e"
                      strokeWidth="1.2"
                    />
                    {/* Inner Bezel Shadow Crescent */}
                    <path
                      d="M 142 195 A 39 39 0 0 1 208 156 A 40 40 0 0 0 142 195 Z"
                      fill="#78350f"
                      opacity="0.18"
                    />

                    {/* Inner Decorative Gold Chapter Ring */}
                    <circle cx="180" cy="185" r="28" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.7" />
                    <text x="180" y="172" fill="#78350f" fontSize="4.2" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
                      LAHORE
                    </text>

                    {/* 12 Hour Markers & Brass Studs */}
                    {Array.from({ length: 12 }).map((_, hi) => (
                      <g key={hi} transform={`rotate(${hi * 30} 180 185)`}>
                        <line
                          x1="180"
                          y1="147"
                          x2="180"
                          y2={hi % 3 === 0 ? '155' : '152.5'}
                          stroke={hi % 3 === 0 ? '#1c1917' : '#78350f'}
                          strokeWidth={hi % 3 === 0 ? '2.6' : '1.6'}
                          strokeLinecap="round"
                        />
                      </g>
                    ))}

                    {/* Subtle Hand Drop Shadows on Dial */}
                    <line x1="181.5" y1="187" x2="175.5" y2="162" stroke="#78350f" strokeWidth="3.5" opacity="0.28" strokeLinecap="round" />
                    <line x1="181.5" y1="187" x2="155.5" y2="170" stroke="#78350f" strokeWidth="2.5" opacity="0.28" strokeLinecap="round" />

                    {/* Sculpted Lancet Hour Hand (Pointing Near 12) */}
                    <path
                      d="M 180 190 L 177.2 174 L 174 159 L 179.5 173 Z"
                      fill="#1c1917"
                      stroke="#090504"
                      strokeWidth="1.2"
                    />
                    <line x1="180" y1="185" x2="174" y2="160" stroke="#1c1917" strokeWidth="3.2" strokeLinecap="round" />

                    {/* Sculpted Lancet Minute Hand (42m) */}
                    <line
                      x1="180"
                      y1="185"
                      x2="154"
                      y2="168"
                      stroke="#1c1917"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />

                    {/* Animated Red Second Hand (Preserves clockSecondHandRef) */}
                    <line
                      ref={clockSecondHandRef}
                      x1="180"
                      y1="194"
                      x2="180"
                      y2="149"
                      stroke="#dc2626"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    {/* Domed Brass Center Cap Nut */}
                    <circle cx="180" cy="185" r="4.2" fill="url(#brassGold3D)" stroke="#451a03" strokeWidth="1" />
                    <circle cx="179" cy="184" r="1.2" fill="#fef08a" />

                    {/* Curved Domed Clock Glass Specular Reflection */}
                    <path
                      d="M 148 168 A 36 36 0 0 1 204 156 Q 178 168 148 168 Z"
                      fill="#ffffff"
                      opacity="0.32"
                    />
                  </g>

                  {/* 4. 3D Framed Mountain & Waterfall Landscape Painting */}
                  <g id="gulberg-calligraphy-frame" transform="translate(362, 160)">
                    <defs>
                      <clipPath id="mountainCanvasClip">
                        <rect x="18" y="18" width="86" height="118" rx="1" />
                      </clipPath>
                      <linearGradient id="paintingSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="48%" stopColor="#38bdf8" />
                        <stop offset="78%" stopColor="#bae6fd" />
                        <stop offset="100%" stopColor="#fef3c7" />
                      </linearGradient>
                      <linearGradient id="waterfallCascadeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="35%" stopColor="#e0f2fe" />
                        <stop offset="75%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="alpineRiverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="45%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#0f766e" />
                      </linearGradient>
                    </defs>

                    {/* Wall Drop Shadow Cast by Heavy Frame */}
                    <rect x="6" y="8" width="122" height="154" rx="5" fill="#090402" opacity="0.68" />

                    {/* Outer 3D Carved Teak & Antique Gold Frame */}
                    <rect
                      x="0"
                      y="0"
                      width="122"
                      height="154"
                      rx="4"
                      fill="url(#teakWoodCasing3D)"
                      stroke="#140701"
                      strokeWidth="2"
                    />
                    {/* Mitered Frame Corner Lines */}
                    <line x1="0" y1="0" x2="14" y2="14" stroke="#140701" strokeWidth="1.2" />
                    <line x1="122" y1="0" x2="108" y2="14" stroke="#140701" strokeWidth="1.2" />
                    <line x1="0" y1="154" x2="14" y2="140" stroke="#140701" strokeWidth="1.2" />
                    <line x1="122" y1="154" x2="108" y2="140" stroke="#140701" strokeWidth="1.2" />

                    {/* Raised Antique Gold Outer Bevel Rim */}
                    <rect
                      x="4"
                      y="4"
                      width="114"
                      height="146"
                      rx="2.5"
                      fill="none"
                      stroke="url(#brassGold3D)"
                      strokeWidth="3"
                    />

                    {/* Cream Textured Mat Board (Passe-Partout) */}
                    <rect
                      x="11"
                      y="11"
                      width="100"
                      height="132"
                      rx="1.5"
                      fill="#f5f5f4"
                      stroke="#78350f"
                      strokeWidth="1"
                    />

                    {/* =========================================================
                        CLIPPED 3D MOUNTAIN & WATERFALL LANDSCAPE CANVAS
                        ========================================================= */}
                    <g clipPath="url(#mountainCanvasClip)">
                      {/* 1. Golden-Blue Alpine Morning Sky & Warm Sun */}
                      <rect x="18" y="18" width="86" height="118" fill="url(#paintingSkyGrad)" />
                      <circle cx="78" cy="36" r="11" fill="#fef08a" opacity="0.85" />
                      <circle cx="78" cy="36" r="6.5" fill="#ffffff" opacity="0.95" />
                      {/* Soft Wispy Alpine Clouds */}
                      <path
                        d="M 24 38 C 32 33, 44 34, 52 38 C 58 34, 68 35, 74 39 Z"
                        fill="#ffffff"
                        opacity="0.72"
                      />

                      {/* 2. Far Background Snow-Capped Karakoram / Himalayan Peaks */}
                      {/* Far Left Peak (Sunlit Left Face + Shaded Right Face) */}
                      <polygon points="14,82 44,36 72,82" fill="#475569" />
                      <polygon points="14,82 44,36 47,54 36,64 26,82" fill="#64748b" />
                      {/* Snow Cap on Left Peak */}
                      <polygon points="44,36 33,53 39,50 44,55 49,49 54,53" fill="#f8fafc" />
                      <polygon points="44,36 44,55 49,49 54,53" fill="#bae6fd" />

                      {/* Far Right Majestic Peak */}
                      <polygon points="48,84 82,39 112,84" fill="#334155" />
                      <polygon points="48,84 82,39 80,58 68,68" fill="#64748b" />
                      {/* Snow Cap on Right Peak */}
                      <polygon points="82,39 71,54 77,51 81,56 86,51 92,55" fill="#ffffff" />
                      <polygon points="82,39 81,56 86,51 92,55" fill="#cbd5e1" />

                      {/* 3. Mid-Ground Rugged Cliff Gorge & Emerald Valley Ridges */}
                      {/* Left Rocky Canyon Wall */}
                      <polygon points="18,62 52,66 48,112 18,112" fill="#3f3f46" />
                      <polygon points="18,62 42,65 36,105 18,105" fill="#52525b" />
                      {/* Lush Green Alpine Ridge Terrace on Left */}
                      <polygon points="18,62 52,66 46,72 18,70" fill="#15803d" />
                      <polygon points="18,62 38,64 34,68 18,67" fill="#4ade80" opacity="0.75" />

                      {/* Right Stepped Rock Cliff */}
                      <polygon points="66,64 104,58 104,114 62,114" fill="#27272a" />
                      <polygon points="66,64 84,61 78,106 62,106" fill="#3f3f46" />
                      <polygon points="66,64 104,58 104,66 68,70" fill="#166534" />

                      {/* 4. Multi-Tiered Cascading Waterfall Plunging Down the Gorge */}
                      {/* Upper River Source Between Cliffs */}
                      <polygon points="48,65 68,64 65,70 50,70" fill="#38bdf8" />
                      {/* Main Plunging Waterfall Curtain (y=66 to 112) */}
                      <path
                        d="M 51 66 C 49 80, 47 95, 45 112 L 66 112 C 64 95, 65 80, 66 66 Z"
                        fill="url(#waterfallCascadeGrad)"
                      />
                      {/* Mid-Cliff Rock Ledge Splitting the Cascade into Twin Falls */}
                      <polygon points="56,78 61,78 63,86 55,86" fill="#27272a" />
                      {/* Vertical Foaming White Water Streaks */}
                      <path
                        d="M 53 67 Q 51 88 48 110 M 56 67 Q 54 89 53 111 M 62 67 Q 63 88 62 110"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        opacity="0.92"
                      />
                      {/* Secondary Tiered Side Cascade on Left Ledge */}
                      <path
                        d="M 43 76 C 42 88, 40 98, 39 110 L 44 110 C 45 98, 45 88, 46 76 Z"
                        fill="#e0f2fe"
                        opacity="0.85"
                      />

                      {/* 5. Turquoise Alpine Plunge Pool, Foaming Mist & River */}
                      <rect x="18" y="108" width="86" height="28" fill="url(#alpineRiverGrad)" />
                      {/* Swirling White Foam & Spray Cloud at Base of Waterfall */}
                      <ellipse cx="55" cy="111" rx="18" ry="5.5" fill="#e0f2fe" opacity="0.88" />
                      <ellipse cx="55" cy="110" rx="12" ry="4" fill="#ffffff" opacity="0.95" />
                      <circle cx="43" cy="109" r="3.5" fill="#ffffff" opacity="0.75" />
                      <circle cx="66" cy="109" r="4" fill="#ffffff" opacity="0.75" />

                      {/* Shimmering Water Ripples Across Foreground River */}
                      <g stroke="#e0f2fe" strokeWidth="1" strokeLinecap="round" opacity="0.75">
                        <line x1="42" y1="117" x2="68" y2="117" />
                        <line x1="36" y1="122" x2="74" y2="122" />
                        <line x1="46" y1="127" x2="66" y2="127" />
                        <line x1="32" y1="131" x2="58" y2="131" />
                      </g>

                      {/* 6. Foreground Mossy Riverbanks, Boulders & Pine / Deodar Trees */}
                      {/* Left Mossy Riverbank & Boulders */}
                      <path d="M 18 104 Q 34 106 42 118 L 18 124 Z" fill="#14532d" />
                      <ellipse cx="34" cy="115" rx="7" ry="4" fill="#52525b" />
                      <ellipse cx="33" cy="114" rx="5" ry="2.5" fill="#71717a" />
                      {/* Right Mossy Riverbank & Boulders */}
                      <path d="M 104 102 Q 82 105 74 120 L 104 128 Z" fill="#064e3b" />
                      <ellipse cx="82" cy="116" rx="8" ry="4.5" fill="#3f3f46" />
                      <ellipse cx="80" cy="114.5" rx="5.5" ry="2.8" fill="#71717a" />

                      {/* Foreground Conifer / Deodar Pine Trees Framing the Waterfall */}
                      {/* Left Tall Pine Tree */}
                      <g transform="translate(26, 76)">
                        <rect x="-1.2" y="22" width="2.4" height="10" fill="#451a03" />
                        <polygon points="0,0 -8,11 8,11" fill="#166534" />
                        <polygon points="0,6 -10,18 10,18" fill="#15803d" />
                        <polygon points="0,12 -11,25 11,25" fill="#14532d" />
                        {/* Sunlit Right Bough Tips */}
                        <polygon points="0,0 8,11 2,11" fill="#4ade80" opacity="0.55" />
                        <polygon points="0,6 10,18 3,18" fill="#4ade80" opacity="0.45" />
                      </g>
                      {/* Right Pine Tree Pair */}
                      <g transform="translate(92, 74)">
                        <rect x="-1.2" y="24" width="2.4" height="10" fill="#451a03" />
                        <polygon points="0,0 -8,12 8,12" fill="#065f46" />
                        <polygon points="0,7 -10,19 10,19" fill="#047857" />
                        <polygon points="0,14 -12,27 12,27" fill="#064e3b" />
                      </g>
                      <g transform="translate(81, 83) scale(0.78)">
                        <polygon points="0,0 -7,11 7,11" fill="#15803d" />
                        <polygon points="0,6 -9,18 9,18" fill="#166534" />
                        <polygon points="0,12 -10,24 10,24" fill="#14532d" />
                      </g>
                    </g>

                    {/* Inner Recessed Gold Leaf Fillet Around Landscape Canvas */}
                    <rect
                      x="18"
                      y="18"
                      width="86"
                      height="118"
                      fill="none"
                      stroke="url(#brassGold3D)"
                      strokeWidth="2"
                    />

                    {/* Diagonal Picture Glass Reflection Sheen */}
                    <polygon
                      points="18,18 68,18 28,136 18,136"
                      fill="#ffffff"
                      opacity="0.14"
                    />
                    <polygon
                      points="76,18 92,18 52,136 36,136"
                      fill="#ffffff"
                      opacity="0.07"
                    />
                  </g>

                  {/* 5. Anatomical Customer Ayesha, Table, Laptop, Chai & Rs. 4,500 Cash */}
                  <CustomerAyesha
                    transform={isPortrait ? 'translate(-10, 40) scale(0.92)' : 'translate(15, 35)'}
                    rightArmRef={ayeshaRightArmRef}
                    tablePhoneGroupRef={ayeshaTablePhoneGroupRef}
                    tablePhoneHaloRef={tablePhoneHaloRef}
                    tablePhoneScreenRef={tablePhoneScreenRef}
                    tablePhoneClockRef={tablePhoneClockRef}
                    tablePhoneHeaderClockRef={tablePhoneHeaderClockRef}
                    tablePhoneChatTrackRef={tablePhoneChatTrackRef}
                    tablePhoneQuickRepliesRef={tablePhoneQuickRepliesRef}
                    tablePhoneReplyBubbleRef={tablePhoneReplyBubbleRef}
                    tablePhoneConfirmBubbleRef={tablePhoneConfirmBubbleRef}
                  />

                  {/* Ayesha's Typewriter Speech Bubble (Optimized for Foldables, Tablets & Desktops) */}
                  <g
                    ref={ayeshaBubbleRef}
                    transform={isPortrait ? 'translate(25, 235) scale(0.82)' : 'translate(45, 220) scale(0.84)'}
                    style={{ display: 'none' }}
                  >
                    {/* Speech Bubble Pointer pointing toward Ayesha */}
                    <polygon points="280,92 335,124 310,92" fill="#0b0f17" stroke="#c9a47a" strokeWidth="1.6" />
                    <line x1="281" y1="92" x2="309" y2="92" stroke="#0b0f17" strokeWidth="2.5" />
                    
                    {/* ForeignObject Speech Box with True HTML Padding and Word Wrapping */}
                    <foreignObject x="0" y="0" width="370" height="110" className="overflow-visible pointer-events-none">
                      <div
                        className="relative w-full min-h-[92px] rounded-2xl bg-[#0b0f17]/96 border-[1.6px] border-[#c9a47a] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.85)] flex flex-col justify-center box-border select-none"
                      >
                        <div className="absolute -top-3 left-5 bg-[#c9a47a] px-2 py-0.5 rounded text-[9.5px] font-black text-black tracking-wider uppercase shadow-sm">
                          AYESHA (CUSTOMER)
                        </div>
                        <p
                          ref={ayeshaUrduTextRef}
                          className="font-sans text-[12.5px] sm:text-[13px] font-semibold text-white leading-snug break-words m-0 tracking-wide"
                        />
                        <p className="font-sans text-[11px] sm:text-[11.5px] font-medium text-[#cbd5e1] italic leading-snug mt-1 break-words m-0">
                          <span ref={ayeshaEnTextRef} />
                          <span ref={ayeshaCursorRef} className="text-amber-500 font-bold not-italic ml-0.5 animate-pulse">|</span>
                        </p>
                      </div>
                    </foreignObject>
                  </g>
                </svg>

                {/* Top-Right Sector Location Text */}
                <div className="absolute top-2 sm:top-3.5 right-2 sm:right-3.5 z-20 pointer-events-none max-w-[55%] text-right">
                  <span className="font-mono text-[7.5px] sm:text-[8.5px] md:text-[10px] lg:text-xs font-black tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-tight block truncate">
                    FLAT 4B, GULBERG III • RS. 4,500 CASH
                  </span>
                </div>

                {/* Calm Green Notification Banner on Ayesha's Side */}
                <div
                  ref={ayeshaNotificationPillRef}
                  className="absolute top-2.5 sm:top-4 right-2 sm:right-3.5 w-[220px] sm:w-[260px] md:w-[280px] max-w-[55%] z-30 rounded-xl bg-[#042f2e]/95 border-2 border-emerald-400 p-2 sm:p-2.5 shadow-[0_0_35px_rgba(16,185,129,0.45)] pointer-events-none backdrop-blur-sm"
                  style={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[11px] sm:text-xs shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-mono text-[7.5px] sm:text-[8.5px] font-black tracking-wider text-emerald-300 uppercase">
                        WHATSAPP • RASAI GUARD
                      </div>
                      <p className="font-sans text-[9px] sm:text-[10.5px] md:text-xs font-semibold text-white mt-0.5 leading-tight">
                        &ldquo;Rider marked you unavailable. Are you home to receive #LP-9042?&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calm Emerald-Green Ambient Glow when Rasai Reaches Ayesha */}
                <div
                  ref={rightGreenGlowRef}
                  className="absolute inset-0 z-10 pointer-events-none border-4 border-emerald-400/80 transform-gpu"
                  style={{
                    opacity: 0,
                    transform: 'translate3d(0, 0, 0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    willChange: 'opacity',
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.42) 100%)',
                  }}
                />

                {/* -----------------------------------------------------------
                    PHASE 4: 3D TITANIUM UNLOCKED WHATSAPP SMARTPHONE REVEAL
                    ----------------------------------------------------------- */}
                <div
                  ref={unlockedPhoneContainerRef}
                  className="absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-4 pointer-events-none"
                  style={{ opacity: 0, transform: 'translate3d(0, 64px, 0)' }}
                >
                  {/* Outer 3D Titanium Chassis Wrapper with Protruding Physical Side Buttons */}
                  <div className="relative w-[280px] sm:w-[320px] md:w-[340px] max-w-[95%] p-[3px] rounded-[1.45rem] bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 shadow-[0_28px_80px_rgba(0,0,0,0.92),0_0_30px_rgba(16,185,129,0.22)]">
                    {/* Left Side Physical Action & Volume Up/Down Titanium Buttons */}
                    <div className="absolute -left-[3px] top-16 w-[3px] h-5 rounded-l-sm bg-gradient-to-b from-slate-300 to-slate-500 border-y border-l border-slate-400" />
                    <div className="absolute -left-[3px] top-24 w-[3px] h-9 rounded-l-sm bg-gradient-to-b from-slate-300 to-slate-500 border-y border-l border-slate-400" />
                    <div className="absolute -left-[3px] top-36 w-[3px] h-9 rounded-l-sm bg-gradient-to-b from-slate-300 to-slate-500 border-y border-l border-slate-400" />
                    {/* Right Side Physical Power Lock Button */}
                    <div className="absolute -right-[3px] top-28 w-[3px] h-12 rounded-r-sm bg-gradient-to-b from-slate-300 to-slate-500 border-y border-r border-slate-400" />

                    {/* Inner Chamfered Black Glass Bezel */}
                    <div className="relative w-full rounded-[1.35rem] bg-[#070a12] border-[2.5px] border-slate-900 overflow-hidden">
                      {/* Diagonal Specular Glass Screen Sheen Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none z-20"
                        style={{
                          background:
                            'linear-gradient(125deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 28%, transparent 45%)',
                        }}
                      />

                      {/* Prominent Front Camera, Earpiece Speaker Mesh & Status Bar */}
                      <div className="bg-[#070a12] px-4 py-2 flex items-center justify-between border-b border-slate-800/90">
                        <span
                          ref={phoneClockTextRef}
                          className="font-mono text-[10px] font-bold text-slate-200 tracking-tight"
                        >
                          11:43
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
                          <div className="w-12 h-1.5 rounded-full bg-slate-900 border border-slate-600/80 shadow-inner" />
                          <div className="relative w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-400 shadow-[0_0_8px_rgba(56,189,248,0.45)] flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#0c1e3e] border border-sky-400/60 flex items-start justify-start p-0.5">
                              <span className="w-0.5 h-0.5 rounded-full bg-sky-300" />
                            </div>
                          </div>
                        </div>
                        {/* Cellular Signal, 5G & Battery Status Icons */}
                        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-300">
                          <span>5G</span>
                          <div className="w-4 h-2.5 rounded-[2px] border border-slate-400 p-[1px] flex items-center">
                            <div className="w-full h-full bg-emerald-400 rounded-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Header */}
                      <div className="bg-gradient-to-r from-[#075e54] to-[#064e46] px-4 py-2.5 flex items-center justify-between border-b border-emerald-800 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-inner">
                            R
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              <span>Rasai</span>
                              <span className="text-[10px] bg-emerald-400 text-slate-950 rounded-full px-1 font-black">
                                ✓
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-200">
                              Official WhatsApp Business
                            </div>
                          </div>
                        </div>
                        <span ref={waHeaderClockRef} className="font-mono text-[10px] text-emerald-200">
                          11:43 AM
                        </span>
                      </div>

                      {/* WhatsApp Chat Body (Strictly Fixed Height — Phone Chassis Size Never Changes) */}
                      <div className="bg-[#0b141a] h-[346px] sm:h-[358px] flex flex-col justify-between overflow-hidden">
                        {/* Internal Clipped Chat Viewport */}
                        <div className="flex-1 overflow-hidden px-3.5 sm:px-4 pt-3 relative">
                          <div
                            ref={chatMessagesTrackRef}
                            className="space-y-2.5 will-change-transform"
                            style={{ transform: 'translate3d(0, 0px, 0)' }}
                          >
                            <div className="text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-800/95 border border-amber-400/30 text-[10px] font-mono text-amber-300 shadow-sm">
                                GHOST SCAN INTERCEPTED • 2.8 KM AWAY
                              </span>
                            </div>

                            {/* Incoming Rasai Message */}
                            <div className="rounded-2xl rounded-tl-none bg-[#1f2c34] p-2.5 sm:p-3 text-xs text-slate-100 leading-relaxed border border-slate-700/70 shadow-md">
                              <p className="font-semibold text-emerald-300 mb-0.5">
                                Assalam-o-Alaikum Ayesha!
                              </p>
                              <p className="text-slate-200">
                                Our courier marked <strong>&ldquo;Customer Unavailable&rdquo;</strong> for
                                parcel <strong>#LP-9042 (COD Rs. 4,500)</strong>, but Rasai detected the
                                rider was 2.8 km away.
                              </p>
                              <p className="mt-1 text-white font-medium">
                                We blocked the return. Are you home right now?
                              </p>
                              <div className="text-[9px] text-slate-400 text-right mt-0.5">11:43 AM</div>
                            </div>

                            {/* Quick-Reply Interactive Buttons (Replaced in-place on Step 1 Reply) */}
                            <div ref={quickRepliesTrayRef} className="space-y-1.5 pt-1">
                              <button
                                ref={yesHomeBtnRef}
                                type="button"
                                onClick={() => {
                                  manualRescueTriggeredRef.current = true;
                                  soundEngine.playSuccessChime();
                                  applyScrollMutations(scrollProgressRef.current);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 font-sans text-xs font-black text-center shadow-[0_4px_20px_rgba(16,185,129,0.5)] border-t border-emerald-200 cursor-pointer select-none transition-transform"
                              >
                                ✓ Yes, I&apos;m Home (Rs. 4,500 Cash Ready)
                              </button>
                              <div className="w-full py-2 px-3 rounded-xl bg-[#1f2c34] text-emerald-300 border border-emerald-500/40 font-sans text-xs font-semibold text-center shadow-sm">
                                📍 Share Exact Gulberg Doorstep Pin
                              </div>
                              <div className="w-full py-2 px-3 rounded-xl bg-[#1f2c34] text-slate-300 border border-slate-700 font-sans text-xs font-medium text-center shadow-sm">
                                📅 Reschedule Time Slot
                              </div>
                            </div>

                            {/* SCENE 4 STEP 1: Ayesha Combined Outgoing Reply + Auto-Attached Gulberg III Vector GPS Map */}
                            <div
                              ref={ayeshaReplyBubbleRef}
                              className="ml-auto w-[92%] rounded-2xl rounded-tr-none bg-[#005c4b] p-2.5 text-xs text-white border border-emerald-500/40 shadow-lg space-y-2"
                              style={{ display: 'none', opacity: 0, transform: 'translate3d(0, 12px, 0)' }}
                            >
                              <p className="font-semibold text-emerald-50 leading-snug">
                                ✓ Yes, I&apos;m home! Rs. 4,500 cash is ready.
                              </p>

                              {/* Embedded Native Vector Gulberg III Rooftop GPS Map Card */}
                              <div className="rounded-xl overflow-hidden border border-emerald-400/35 bg-[#071512]">
                                <svg
                                  viewBox="0 0 260 72"
                                  className="w-full h-[64px] block pointer-events-none"
                                  preserveAspectRatio="xMidYMid slice"
                                >
                                  <rect width="260" height="72" fill="#071915" />
                                  {/* Gulberg III Street & Block H Vector Grid */}
                                  <line x1="0" y1="22" x2="260" y2="22" stroke="#0f352c" strokeWidth="5" />
                                  <line x1="0" y1="52" x2="260" y2="52" stroke="#0d2b24" strokeWidth="3.5" />
                                  <line x1="68" y1="0" x2="52" y2="72" stroke="#0f352c" strokeWidth="4.5" />
                                  <line x1="184" y1="0" x2="196" y2="72" stroke="#0d2b24" strokeWidth="3.5" />
                                  {/* Flat 4B Block H Building Footprint */}
                                  <rect
                                    x="96"
                                    y="26"
                                    width="68"
                                    height="22"
                                    rx="3"
                                    fill="#0f2f26"
                                    stroke="#10b981"
                                    strokeWidth="1"
                                    strokeDasharray="3 2"
                                  />
                                  <text
                                    x="20"
                                    y="15"
                                    fill="#6ee7b7"
                                    fontSize="7.5"
                                    fontFamily="monospace"
                                    fontWeight="700"
                                    opacity="0.8"
                                  >
                                    BLOCK H • GULBERG III
                                  </text>
                                  {/* Pulsing GPS Accuracy Ring */}
                                  <circle
                                    ref={gpsPulseRingRef}
                                    cx="130"
                                    cy="38"
                                    r="12"
                                    fill="none"
                                    stroke="#34d399"
                                    strokeWidth="1.5"
                                    opacity="0.55"
                                  />
                                  {/* Pin Ground Shadow */}
                                  <ellipse cx="130" cy="40" rx="5.5" ry="2.2" fill="#020617" opacity="0.65" />
                                  {/* Dropping 3D Emerald GPS Pin */}
                                  <g ref={gpsPinSvgGroupRef} transform="translate(130, 38)">
                                    <path
                                      d="M0,0 C-5,-7 -9,-11 -9,-16 C-9,-21 -5,-25 0,-25 C5,-25 9,-21 9,-16 C9,-11 5,-7 0,0 Z"
                                      fill="#10b981"
                                      stroke="#ecfdf5"
                                      strokeWidth="1.2"
                                    />
                                    <circle cx="0" cy="-16" r="3.2" fill="#052e16" />
                                  </g>
                                </svg>
                                <div className="px-2.5 py-1 bg-[#09221c] flex items-center justify-between text-[10px] font-mono text-emerald-200 border-t border-emerald-500/20">
                                  <span className="font-bold text-white">📍 Flat 4B, Gulberg III</span>
                                  <span>31.5204° N, 74.3587° E</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/90 font-mono">
                                <span>Live Doorstep Pin Attached • 11:44 AM</span>
                                <span className="text-sky-300 font-bold">✓✓</span>
                              </div>
                            </div>

                            {/* SCENE 4 STEP 2: Rasai Verified Dispatch Confirmation Bubble */}
                            <div
                              ref={rasaiConfirmBubbleRef}
                              className="rounded-2xl rounded-tl-none bg-[#1f2c34] p-2.5 text-xs text-slate-100 leading-snug border border-emerald-500/50 shadow-[0_6px_24px_rgba(16,185,129,0.18)]"
                              style={{ display: 'none', opacity: 0, transform: 'translate3d(0, 12px, 0)' }}
                            >
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[9.5px] font-mono font-bold text-emerald-300 mb-1">
                                <span>✓ 07:30 AM PRIORITY RUN-SHEET LOCKED</span>
                              </div>
                              <p className="text-slate-100">
                                Shukriya Ayesha! Your exact Gulberg III pin is locked for{' '}
                                <strong className="text-white">#LP-9042 (Rs. 4,500 COD)</strong>.
                                Guaranteed delivery tomorrow at{' '}
                                <strong className="text-emerald-300">10:00 AM</strong>.
                              </p>
                              <div className="text-[9px] text-slate-400 text-right mt-0.5 font-mono">
                                11:44 AM
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Home Bar Indicator (Pinned to Bottom of Fixed-Size Phone Screen) */}
                        <div className="py-2 bg-[#0b141a] flex justify-center shrink-0 border-t border-slate-800/40">
                          <div className="w-24 h-1 rounded-full bg-slate-600/80" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Architectural Split Seam */}
              <div
                ref={splitDividerLineRef}
                className={`absolute z-25 pointer-events-none ${
                  isPortrait
                    ? 'left-0 right-0 h-[2px] bg-gradient-to-r from-slate-500/40 via-white/70 to-slate-500/40'
                    : 'top-0 bottom-0 w-[2px] bg-gradient-to-b from-slate-500/40 via-white/70 to-slate-500/40'
                }`}
                style={
                  isPortrait
                    ? { top: '50%', left: '0', width: '100%', height: '2px', transform: 'translate3d(0, -50%, 0)' }
                    : { left: '50%', top: '0', width: '2px', height: '100%', transform: 'translate3d(-50%, 0, 0)' }
                }
              />
            </div>

            {/* ===============================================================
                MINIMAL CAPTION RECTANGLE WITH SOFT ROUNDED BORDERS
                =============================================================== */}
            <div
              ref={minimalCaptionRef}
              className="absolute bottom-2 sm:bottom-5 left-1/2 z-35 w-[92%] sm:w-auto min-w-[300px] sm:min-w-[440px] max-w-xl rounded-2xl bg-[#090d16]/95 border-[1.5px] border-slate-700/90 px-4 sm:px-6 py-2 sm:py-2.5 text-center shadow-2xl pointer-events-none backdrop-blur-md"
              style={{ opacity: 0, transform: 'translate3d(-50%, 12px, 0)' }}
            >
              <p className="font-sans text-[11px] sm:text-xs md:text-[13px] font-bold text-emerald-400 tracking-wide leading-snug m-0">
                Rasai blocks the false return and notifies Ayesha directly.
              </p>
            </div>

            {/* ===============================================================
                SCENE 4 MINIMAL CAPTION RECTANGLE (2-Step Fast WhatsApp Rescue)
                =============================================================== */}
            <div
              ref={scene4CaptionRef}
              className="absolute bottom-2 sm:bottom-5 left-1/2 z-35 w-[92%] sm:w-auto min-w-[320px] sm:min-w-[520px] max-w-xl rounded-2xl bg-[#090d16]/95 border-[1.5px] border-emerald-500/40 px-4 sm:px-6 py-2 sm:py-3 text-center shadow-2xl pointer-events-none backdrop-blur-md"
              style={{ opacity: 0, transform: 'translate3d(-50%, 12px, 0)' }}
            >
              <p className="font-sans text-[10.5px] sm:text-xs md:text-[13px] font-medium text-slate-100 tracking-wide leading-snug m-0">
                <span className="text-emerald-300 font-bold">One tap</span> confirms Rs. 4,500 cash and drops Ayesha&rsquo;s live Gulberg III pin &mdash;
              </p>
              <p className="font-sans text-[10.5px] sm:text-xs md:text-[13px] font-bold text-emerald-400 tracking-wide leading-snug m-0 mt-0.5">
                Rasai locks #LP-9042 onto tomorrow&rsquo;s 07:30 AM priority run-sheet.
              </p>
            </div>

            {/* ===============================================================
                PHASE 1 OVERLAY: VECTOR SVG PHONE MATCH CUT (0.00 -> 0.20)
                100% Vector SVG (<svg viewBox="0 0 1920 1080">) with ZERO CSS
                will-change bitmap caching so text & borders stay razor-sharp
                throughout the entire 0.92x -> 7.3x zoom in and out!
                =============================================================== */}
            <div
              ref={matchCutLayerRef}
              className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(245,158,11,0.22) 0%, rgba(7,10,18,0.62) 68%, rgba(4,7,13,0.88) 100%)',
              }}
            >
              <svg
                viewBox="0 0 1920 1080"
                className="w-full h-full object-cover pointer-events-none"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  {/* 3D Brushed Titanium Smartphone Frame Bevel Gradient */}
                  <linearGradient id="matchCutTitaniumBezel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="22%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="78%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                <g ref={matchCutPhoneGroupRef} transform="translate(960, 540) scale(0.92)">
                  {/* Concentric Haptic Buzz Sonic Rings (Reduced border roundness rx="24") */}
                  <rect
                    ref={matchCutRing1Ref}
                    x="-168"
                    y="-236"
                    width="336"
                    height="472"
                    rx="24"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    opacity="0.7"
                  />
                  <rect
                    ref={matchCutRing2Ref}
                    x="-168"
                    y="-236"
                    width="336"
                    height="472"
                    rx="24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    opacity="0.7"
                  />

                  {/* Protruding Physical 3D Titanium Side Buttons (Left Action/Volume & Right Power) */}
                  <rect x="-157" y="-138" width="4" height="22" rx="1.5" fill="url(#matchCutTitaniumBezel)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="-157" y="-102" width="4" height="42" rx="1.5" fill="url(#matchCutTitaniumBezel)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="-157" y="-50" width="4" height="42" rx="1.5" fill="url(#matchCutTitaniumBezel)" stroke="#475569" strokeWidth="0.8" />
                  <rect x="153" y="-88" width="4" height="56" rx="1.5" fill="url(#matchCutTitaniumBezel)" stroke="#475569" strokeWidth="0.8" />

                  {/* 3D Brushed Titanium Outer Chassis Rim */}
                  <rect
                    x="-154"
                    y="-222"
                    width="308"
                    height="444"
                    rx="22"
                    fill="url(#matchCutTitaniumBezel)"
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                  />
                  {/* Antenna Band Seams on Titanium Frame */}
                  <line x1="-154" y1="-175" x2="-148" y2="-175" stroke="#0f172a" strokeWidth="2" />
                  <line x1="148" y1="-175" x2="154" y2="-175" stroke="#0f172a" strokeWidth="2" />
                  <line x1="-154" y1="175" x2="-148" y2="175" stroke="#0f172a" strokeWidth="2" />
                  <line x1="148" y1="175" x2="154" y2="175" stroke="#0f172a" strokeWidth="2" />

                  {/* Smartphone Inner Black Glass Bezel (rx="19") */}
                  <rect
                    x="-149"
                    y="-217"
                    width="298"
                    height="434"
                    rx="19"
                    fill="#050811"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  {/* Active OLED Display Panel */}
                  <rect
                    x="-143"
                    y="-211"
                    width="286"
                    height="422"
                    rx="15"
                    fill="#0b101d"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />

                  {/* Diagonal Specular Glass Reflection Across Screen */}
                  <polygon
                    points="-143,-120 -35,-211 35,-211 -143,-55"
                    fill="#ffffff"
                    opacity="0.045"
                  />

                  {/* Prominent Front Camera, Earpiece Speaker Grille & Status Bar */}
                  <g transform="translate(0, -190)">
                    {/* Top Bezel Divider Line */}
                    <line x1="-132" y1="18" x2="132" y2="18" stroke="#1e293b" strokeWidth="1.5" />
                    {/* Carrier & Network Status on Top Left */}
                    <text x="-128" y="6" fill="#94a3b8" fontSize="9.5" fontFamily="monospace" fontWeight="700">
                      4G LTE
                    </text>
                    {/* Infrared Proximity Sensor */}
                    <circle cx="-48" cy="2" r="4" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
                    <circle cx="-48" cy="2" r="1.5" fill="#dc2626" opacity="0.55" />
                    {/* Recessed Earpiece Speaker Mesh */}
                    <rect
                      x="-28"
                      y="-2"
                      width="56"
                      height="8"
                      rx="4"
                      fill="#090d16"
                      stroke="#475569"
                      strokeWidth="1.2"
                    />
                    <line x1="-22" y1="2" x2="22" y2="2" stroke="#334155" strokeWidth="1.5" strokeDasharray="2 2" />
                    {/* Prominent Multi-Element Sapphire Front Camera Lens Assembly */}
                    <g transform="translate(52, 2)">
                      {/* Outer Metallic Camera Ring */}
                      <circle
                        cx="0"
                        cy="0"
                        r="11.5"
                        fill="#090d16"
                        stroke="url(#matchCutTitaniumBezel)"
                        strokeWidth="2.4"
                      />
                      {/* Deep Cobalt Optical Glass Aperture */}
                      <circle
                        cx="0"
                        cy="0"
                        r="7.2"
                        fill="#0c1e3e"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                      />
                      {/* Inner Sensor Iris */}
                      <circle cx="0" cy="0" r="3.6" fill="#020617" />
                      {/* Optical Lens Specular Catchlights */}
                      <circle cx="-2.4" cy="-2.4" r="1.8" fill="#7dd3fc" />
                      <circle cx="2.2" cy="2.2" r="0.9" fill="#38bdf8" opacity="0.7" />
                    </g>
                    {/* Battery Indicator on Top Right */}
                    <g transform="translate(106, -3)">
                      <rect x="0" y="0" width="18" height="9" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                      <rect x="2" y="2" width="11" height="5" rx="1" fill="#f59e0b" />
                      <rect x="19" y="2.5" width="1.8" height="4" rx="0.5" fill="#94a3b8" />
                    </g>
                  </g>

                  {/* Header: 34 PARCELS LEFT (Overload Alert Badge Removed) */}
                  <g transform="translate(0, -144)">
                    <text
                      x="-128"
                      y="0"
                      fill="#ffffff"
                      fontSize="16"
                      fontFamily="monospace"
                      fontWeight="900"
                      letterSpacing="0.4"
                    >
                      34 PARCELS LEFT
                    </text>
                    <text
                      x="128"
                      y="-1"
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      11:42 AM
                    </text>
                  </g>

                  {/* Rider Delivery Parcel List (Replaces 'OPENING RIDER QUEUE...') */}
                  {PARCEL_QUEUE.map((item, idx) => {
                    const cardY = -122 + idx * 96;
                    return (
                      <g key={item.id} transform={`translate(-130, ${cardY})`}>
                        <rect
                          x="0"
                          y="0"
                          width="260"
                          height="84"
                          rx="10"
                          fill={item.isTarget ? '#111a2e' : '#0f172a'}
                          stroke={item.isTarget ? '#f59e0b' : '#1e293b'}
                          strokeWidth={item.isTarget ? '2' : '1.4'}
                        />
                        {/* Row 1: Parcel ID + Recipient | COD Amount */}
                        <text
                          x="12"
                          y="26"
                          fill="#f8fafc"
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="800"
                        >
                          {item.id} • {item.recipient}
                        </text>
                        <text
                          x="248"
                          y="26"
                          fill="#34d399"
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="800"
                          textAnchor="end"
                        >
                          {item.cod}
                        </text>
                        {/* Row 2: Street Address */}
                        <text
                          x="12"
                          y="48"
                          fill="#94a3b8"
                          fontSize="10.5"
                          fontFamily="sans-serif"
                          fontWeight="500"
                        >
                          {item.address}
                        </text>
                        {/* Row 3: Status Tag & Distance */}
                        <rect
                          x="12"
                          y="58"
                          width="76"
                          height="16"
                          rx="4"
                          fill={item.isTarget ? 'rgba(245,158,11,0.18)' : '#1e293b'}
                        />
                        <text
                          x="50"
                          y="69"
                          fill={item.isTarget ? '#fcd34d' : '#cbd5e1'}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {item.isTarget ? 'NEXT STOP' : 'IN QUEUE'}
                        </text>
                        <text
                          x="248"
                          y="70"
                          fill="#fbbf24"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="700"
                          textAnchor="end"
                        >
                          {item.dist}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bottom Home Indicator Bar */}
                  <rect x="-42" y="196" width="84" height="4" rx="2" fill="#475569" />
                </g>
              </svg>
            </div>
          </>
        )}
      </div>
    );

    if (embedded) {
      return stageContent;
    }

    return (
      <div
        ref={containerRef}
        className="relative w-full h-[650vh] -mt-[100dvh] z-20 pointer-events-none"
        id="movie-scene-3"
        data-story-scene="true"
      >
        <div
          ref={stickyStageRef}
          className="sticky top-0 left-0 w-full h-screen h-dvh overflow-hidden flex items-center justify-center bg-[#070a12]"
          style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        >
          {stageContent}
        </div>
      </div>
    );
  }
);

Scene3Doorstep.displayName = 'Scene3Doorstep';

export default Scene3Doorstep;
