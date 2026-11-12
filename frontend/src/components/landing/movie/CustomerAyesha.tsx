// src/components/landing/movie/CustomerAyesha.tsx
// 3D Realistic Anatomical SVG Rig & Interior Props for Customer Ayesha in her Gulberg Flat.
// Features multi-stop subsurface skin shading, expressive eyes with catchlights, layered hair,
// embroidered kurta with fabric folds, walnut table, laptop, steaming chai, and Rs. 4,500 COD cash.

import React, { forwardRef } from 'react';
import { LOGO_PATHS } from '../logoData';

export interface CustomerAyeshaProps extends React.SVGProps<SVGGElement> {
  /**
   * Whether the green Rasai WhatsApp notification has arrived on her table phone.
   */
  notificationActive?: boolean;
  /**
   * 0 -> 1 progress of Ayesha reaching for and picking up her phone in Phase 4.
   */
  pickupProgress?: number;
  /**
   * Optional refs for zero-re-render rAF scroll animations in Scene3Doorstep.
   */
  rightArmRef?: React.RefObject<SVGGElement | null>;
  tablePhoneGroupRef?: React.RefObject<SVGGElement | null>;
  tablePhoneHaloRef?: React.RefObject<SVGEllipseElement | null>;
  tablePhoneScreenRef?: React.RefObject<SVGPolygonElement | null>;
  tablePhoneClockRef?: React.RefObject<SVGTextElement | null>;
  tablePhoneHeaderClockRef?: React.RefObject<SVGTextElement | null>;
  tablePhoneChatTrackRef?: React.RefObject<SVGGElement | null>;
  tablePhoneQuickRepliesRef?: React.RefObject<SVGGElement | null>;
  tablePhoneReplyBubbleRef?: React.RefObject<SVGGElement | null>;
  tablePhoneConfirmBubbleRef?: React.RefObject<SVGGElement | null>;
}

export const CustomerAyesha = forwardRef<SVGGElement, CustomerAyeshaProps>(
  (
    {
      notificationActive = false,
      pickupProgress = 0,
      rightArmRef,
      tablePhoneGroupRef,
      tablePhoneHaloRef,
      tablePhoneScreenRef,
      tablePhoneClockRef,
      tablePhoneHeaderClockRef,
      tablePhoneChatTrackRef,
      tablePhoneQuickRepliesRef,
      tablePhoneReplyBubbleRef,
      tablePhoneConfirmBubbleRef,
      transform,
      ...restProps
    },
    ref
  ) => {
    const clampedPickup = Math.max(0, Math.min(1, pickupProgress));
    // Subtle head nod toward the phone as notification arrives or as she picks it up
    const headPitch = notificationActive ? 6 + clampedPickup * 4 : -2;
    // Right forearm & hand reach toward the phone on the table
    const armReachDeg = clampedPickup * -14;

    return (
      <g ref={ref} id="customer-ayesha-rig" transform={transform} {...restProps}>
        <defs>
          <style>{`
            @keyframes ayeshaEyeBlink {
              0%, 92%, 100% { transform: scaleY(1); }
              95%, 96.5% { transform: scaleY(0.08); }
            }
            @keyframes ayeshaChestBreathing {
              0%, 100% { transform: translate(0px, 0px) scale(1); }
              50% { transform: translate(-0.3px, -1.2px) scale(1.008); }
            }
            .animate-ayesha-blink {
              animation: ayeshaEyeBlink 4.2s ease-in-out infinite;
              transform-box: fill-box;
              transform-origin: center;
            }
            .animate-ayesha-breathing {
              animation: ayeshaChestBreathing 3.8s ease-in-out infinite;
              transform-box: fill-box;
              transform-origin: center;
            }
            @media (prefers-reduced-motion: reduce) {
              .animate-ayesha-blink,
              .animate-ayesha-breathing {
                animation: none !important;
              }
            }

            /* Continuous Delicate Karak Tea Steam (Exact Scene 1 Continuous Ribbon Flow with Natural Rise & Dissipation) */
            .ayesha-tea-smoke-container {
              position: relative;
              width: 100%;
              height: 100%;
              pointer-events: none;
              filter: url('#ayesha-tea-smoke-filter') blur(4px);
              -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.95) 12%, rgba(0, 0, 0, 0.6) 42%, rgba(0, 0, 0, 0.15) 75%, rgba(0, 0, 0, 0) 100%);
              mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.95) 12%, rgba(0, 0, 0, 0.6) 42%, rgba(0, 0, 0, 0.15) 75%, rgba(0, 0, 0, 0) 100%);
              transform: translateZ(0);
            }

            .ayesha-tea-smoke-container span {
              position: absolute;
              bottom: 0;
              left: 50%;
              width: 11px;
              height: 11px;
              background: radial-gradient(circle, rgba(255, 250, 240, 0.45) 0%, rgba(254, 243, 199, 0.25) 45%, rgba(255, 255, 255, 0.08) 75%, transparent 100%);
              border-radius: 50%;
              transform: translateX(-50%) scale(0.7);
              animation: ayeshaTeaSteamContinuous 6.5s cubic-bezier(0.25, 0.65, 0.4, 1) infinite;
              will-change: transform, opacity;
            }

            /* 12 Continuously Overlapping Steam Particles (0.54s step interval for slow, peaceful steam) */
            .ayesha-tea-smoke-container span:nth-child(1)  { animation-delay: 0.00s; left: 48%; }
            .ayesha-tea-smoke-container span:nth-child(2)  { animation-delay: 0.54s; left: 52%; width: 12px; height: 12px; }
            .ayesha-tea-smoke-container span:nth-child(3)  { animation-delay: 1.08s; left: 47%; }
            .ayesha-tea-smoke-container span:nth-child(4)  { animation-delay: 1.62s; left: 53%; width: 13px; height: 13px; }
            .ayesha-tea-smoke-container span:nth-child(5)  { animation-delay: 2.16s; left: 49%; }
            .ayesha-tea-smoke-container span:nth-child(6)  { animation-delay: 2.70s; left: 51%; width: 10px; height: 10px; }
            .ayesha-tea-smoke-container span:nth-child(7)  { animation-delay: 3.24s; left: 48%; }
            .ayesha-tea-smoke-container span:nth-child(8)  { animation-delay: 3.78s; left: 52%; width: 12px; height: 12px; }
            .ayesha-tea-smoke-container span:nth-child(9)  { animation-delay: 4.32s; left: 46%; }
            .ayesha-tea-smoke-container span:nth-child(10) { animation-delay: 4.86s; left: 53%; width: 11px; height: 11px; }
            .ayesha-tea-smoke-container span:nth-child(11) { animation-delay: 5.40s; left: 50%; }
            .ayesha-tea-smoke-container span:nth-child(12) { animation-delay: 5.94s; left: 48%; width: 12px; height: 12px; }

            /* Continuous, Slender, Ethereal Slow-Rising Vapor that Fades Out As It Rises */
            @keyframes ayeshaTeaSteamContinuous {
              0% {
                bottom: 0%;
                transform: translateX(-50%) scale(0.65);
                opacity: 0;
              }
              12% {
                opacity: 0.42;
                transform: translateX(-50%) scale(0.85);
              }
              30% {
                opacity: 0.28;
                transform: translateX(calc(-50% - 3px)) scale(1.15);
              }
              55% {
                opacity: 0.14;
                transform: translateX(calc(-50% + 4px)) scale(1.5);
              }
              75% {
                opacity: 0.05;
                transform: translateX(calc(-50% - 2px)) scale(1.85);
              }
              100% {
                bottom: 100%;
                transform: translateX(calc(-50% + 3px)) scale(2.2);
                opacity: 0;
              }
            }
          `}</style>

          {/* Organic Fractal Steam Turbulence & Displacement Filter (From Scene 1) */}
          <filter id="ayesha-tea-smoke-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Path-Traced Contact Shadow Filter (Crisp Umbra under Laptop Feet & Base) */}
          <filter id="laptopContactShadowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          {/* Path-Traced Directional Cast Shadow Filter (Soft Penumbra on Walnut Wood) */}
          <filter id="laptopCastShadowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.8" />
          </filter>

          {/* 3D Subsurface Scattering Skin Gradient (Warm Sunlit South Asian Tone) */}
          <radialGradient id="ayeshaSkin3D" cx="38%" cy="32%" r="68%" fx="32%" fy="26%">
            <stop offset="0%" stopColor="#fae1cb" />
            <stop offset="28%" stopColor="#ecc09e" />
            <stop offset="62%" stopColor="#d1966d" />
            <stop offset="88%" stopColor="#a66843" />
            <stop offset="100%" stopColor="#7d482a" />
          </radialGradient>

          {/* Neck & Limb Cylindrical Skin Shader */}
          <linearGradient id="ayeshaLimbSkin" x1="0%" y1="0%" x2="100%" y2="25%">
            <stop offset="0%" stopColor="#f7d9bf" />
            <stop offset="45%" stopColor="#dfac86" />
            <stop offset="82%" stopColor="#b87c54" />
            <stop offset="100%" stopColor="#8c5432" />
          </linearGradient>

          {/* Soft Cheek Blush */}
          <radialGradient id="ayeshaCheekBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.24" />
            <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>

          {/* Deep Espresso Layered Hair with Warm Window Sunlight Rim */}
          <linearGradient id="ayeshaHairGrad" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#3b2316" />
            <stop offset="28%" stopColor="#23140d" />
            <stop offset="68%" stopColor="#140b07" />
            <stop offset="100%" stopColor="#090504" />
          </linearGradient>

          {/* Sage-Teal Embroidered Lawn Kurta PBR Fabric Shader */}
          <linearGradient id="ayeshaKurtaGrad" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="24%" stopColor="#0d9488" />
            <stop offset="65%" stopColor="#0f766e" />
            <stop offset="92%" stopColor="#115e59" />
            <stop offset="100%" stopColor="#042f2e" />
          </linearGradient>

          {/* Ivory & Zari-Gold Chiffon Dupatta Gradient */}
          <linearGradient id="ayeshaDupattaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.94" />
            <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.88" />
            <stop offset="85%" stopColor="#fde68a" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
          </linearGradient>

          {/* Luminous Warm Window Sunlight Rim (Golden Hour Dawn) */}
          <linearGradient id="ayeshaSunlightRim" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </linearGradient>

          {/* Deep Amber-Espresso 3D Iris Shader with Limbal Ring */}
          <radialGradient id="ayeshaIris3D" cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#854d0e" />
            <stop offset="35%" stopColor="#451a03" />
            <stop offset="75%" stopColor="#291307" />
            <stop offset="100%" stopColor="#090504" />
          </radialGradient>

          {/* High-Luster 18K Yellow Gold with Mirror Specular */}
          <linearGradient id="ayeshaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="18%" stopColor="#d97706" />
            <stop offset="38%" stopColor="#fbbf24" />
            <stop offset="52%" stopColor="#ffffff" />
            <stop offset="68%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Luminous Natural Pearl Gradient */}
          <radialGradient id="ayeshaPearlGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#fffbeb" />
            <stop offset="80%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          {/* Natural Manicure Fingernail Gloss */}
          <linearGradient id="ayeshaNailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe4e6" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#fecdd3" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#fda4af" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.5" />
          </linearGradient>

          {/* Scalloped Organza Lace Cuff Semi-Transparent Shader */}
          <linearGradient id="ayeshaOrganzaLace" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.88" />
          </linearGradient>

          {/* Polished Walnut Dining Table Surface Gradient */}
          <linearGradient id="walnutTableSurface" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#853d14" />
            <stop offset="22%" stopColor="#6b2f0d" />
            <stop offset="58%" stopColor="#4a1f07" />
            <stop offset="88%" stopColor="#2e1204" />
            <stop offset="100%" stopColor="#1c0a02" />
          </linearGradient>

          {/* 3D Bullnose Front Table Edge Bevel Gradient */}
          <linearGradient id="walnutBullnoseEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="28%" stopColor="#78350f" />
            <stop offset="68%" stopColor="#3f1a06" />
            <stop offset="100%" stopColor="#140701" />
          </linearGradient>

          {/* 3D Turned Cylindrical Walnut Table Leg Shader */}
          <linearGradient id="walnutLeg3D" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#120601" />
            <stop offset="24%" stopColor="#4a1f07" />
            <stop offset="44%" stopColor="#6b2f0d" />
            <stop offset="68%" stopColor="#2e1204" />
            <stop offset="100%" stopColor="#0d0401" />
          </linearGradient>

          {/* AEROPRO 16″ CNC UNIBODY DESIGN TOKENS & SHADERS (Space Black Anodized Oxide Seal) */}
          <linearGradient id="aeroProLidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0e0f12" />
            <stop offset="22%" stopColor="#18191d" />
            <stop offset="50%" stopColor="#24262c" />
            <stop offset="72%" stopColor="#494d57" />
            <stop offset="88%" stopColor="#18191d" />
            <stop offset="100%" stopColor="#0e0f12" />
          </linearGradient>

          {/* Multi-Stop PVD Vapor-Deposited Chrome Mirror Reflection Gradient */}
          <linearGradient id="aeroProMirrorLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#090a0d" />
            <stop offset="22%" stopColor="#5c6270" />
            <stop offset="46%" stopColor="#ffffff" />
            <stop offset="54%" stopColor="#1b1d22" />
            <stop offset="78%" stopColor="#7b8291" />
            <stop offset="100%" stopColor="#121317" />
          </linearGradient>

          {/* Central Cylindrical Barrel Clutch Hinge Gradient */}
          <linearGradient id="aeroProHingeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#272a33" />
            <stop offset="35%" stopColor="#141519" />
            <stop offset="70%" stopColor="#0c0d10" />
            <stop offset="100%" stopColor="#050608" />
          </linearGradient>

          {/* 6063-T6 Aerospace Aluminum Chassis Edge & Side Wall Gradient */}
          <linearGradient id="aeroProEdgeWall" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#282a32" />
            <stop offset="32%" stopColor="#1a1b20" />
            <stop offset="70%" stopColor="#141519" />
            <stop offset="100%" stopColor="#0a0b0d" />
          </linearGradient>

          {/* Ray-Traced Directional Shadow Gradient on Table (Attenuates with Distance from Base) */}
          <linearGradient id="laptopCastShadowGrad" x1="0%" y1="0%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#080201" stopOpacity="0.78" />
            <stop offset="35%" stopColor="#120502" stopOpacity="0.48" />
            <stop offset="70%" stopColor="#1a0904" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1a0904" stopOpacity="0" />
          </linearGradient>

          {/* Ray-Traced Screen Area Light Spill (Soft Emission from Active Display facing Ayesha) */}
          <radialGradient id="screenAreaLightSpill" cx="0%" cy="50%" r="85%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#0284c7" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#0369a1" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Rasai Metallic Backlid Chrome Shaders */}
          <linearGradient id="rasaiLidChromeOuter" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="35%" stopColor="#e2e8f0" />
            <stop offset="68%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="rasaiLidChromeInner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="rasaiLidChromeLower" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="55%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="rasaiLidChromeArrow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="40%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Soft Blue/White Screen Light Spill Cast by Laptop Facing Ayesha */}
          <radialGradient id="laptopScreenSpill" cx="25%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.45" />
            <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="78%" stopColor="#bae6fd" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>

          {/* 3D Titanium Smartphone Side Rail Shader */}
          <linearGradient id="phoneTitaniumRail" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Pakistani Rs. 1,000 Banknote Gradient (Deep Cerulean & Indigo) */}
          <linearGradient id="pkr1000Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="45%" stopColor="#0369a1" />
            <stop offset="80%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          {/* Pakistani Rs. 500 Banknote Gradient (Emerald & Jade) */}
          <linearGradient id="pkr500Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="55%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Pakistani Banknote Clipping Boundaries (Strictly locks text & graphics inside note outline) */}
          <clipPath id="pkr1000Clip">
            <rect x="0" y="0" width="98" height="46" rx="1.5" />
          </clipPath>
          <clipPath id="pkr500Clip">
            <rect x="0" y="0" width="94" height="44" rx="1.5" />
          </clipPath>
        </defs>

        {/* ================================================================= */}
        {/* 1. UPHOLSTERED DINING CHAIR BACKREST (Behind Ayesha)               */}
        {/* ================================================================= */}
        <g id="ayesha-chair-back" transform="translate(475, 420)">
          <rect
            x="0"
            y="0"
            width="165"
            height="270"
            rx="24"
            fill="#291811"
            stroke="#452719"
            strokeWidth="3"
          />
          <rect
            x="12"
            y="14"
            width="141"
            height="240"
            rx="18"
            fill="#3e2418"
            stroke="#5c3624"
            strokeWidth="1.5"
          />
          {/* Tufted Cushion Stitching */}
          <line x1="82" y1="24" x2="82" y2="244" stroke="#23130c" strokeWidth="1.5" opacity="0.6" />
          <line x1="20" y1="110" x2="144" y2="110" stroke="#23130c" strokeWidth="1.5" opacity="0.6" />
          <circle cx="82" cy="110" r="4" fill="#1c0f09" />
        </g>

        {/* ================================================================= */}
        {/* 2. AYESHA TORSO, LAWN KURTA, DUPATTA & ARTICULATED LEFT ARM       */}
        {/* ================================================================= */}
        <g id="ayesha-upper-body">
          {/* Volumetric Back Hair Base & Falling Shoulder Strands */}
          <path
            d="M 488 345 C 455 385, 452 460, 474 515 C 504 532, 582 528, 608 495 C 622 445, 616 380, 582 345 Z"
            fill="url(#ayeshaHairGrad)"
          />
          {/* Layered Hair Depth Shadow & Loose Shoulder Curls */}
          <path
            d="M 470 410 C 454 445, 456 490, 472 522 C 478 520, 484 510, 480 488 C 476 462, 474 435, 478 412 Z"
            fill="#090504"
            opacity="0.82"
          />
          <path
            d="M 464 458 C 458 488, 466 524, 476 534"
            fill="none"
            stroke="#23140d"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Left Arm (Further from camera, resting near laptop/teacup) */}
          <g id="ayesha-left-arm">
            {/* Upper Left Sleeve with Anatomical Fabric Folds */}
            <path
              d="M 492 468 C 465 480, 438 522, 422 575 L 464 588 C 478 545, 498 510, 516 490 Z"
              fill="url(#ayeshaKurtaGrad)"
              stroke="#042f2e"
              strokeWidth="1.6"
            />
            {/* Upper Arm Inseam & Tension Crease */}
            <path
              d="M 470 495 C 452 525, 442 555, 436 578"
              fill="none"
              stroke="#042f2e"
              strokeWidth="1.6"
              opacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M 454 532 C 464 544, 476 550, 488 546"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="1.1"
              opacity="0.35"
              strokeLinecap="round"
            />

            {/* Left Forearm & Wrist extending onto Walnut Table */}
            <path
              d="M 422 575 C 406 605, 378 628, 344 638 L 354 658 C 396 652, 434 626, 464 588 Z"
              fill="url(#ayeshaLimbSkin)"
              stroke="#7d482a"
              strokeWidth="1.2"
            />
            {/* Forearm Muscle & Tendon Shading */}
            <path
              d="M 416 592 C 396 616, 376 634, 352 642"
              fill="none"
              stroke="#a66843"
              strokeWidth="1.2"
              opacity="0.4"
              strokeLinecap="round"
            />

            {/* Scalloped Organza Lace Cuff with Gold Zari Border */}
            <path
              d="M 416 572 L 465 586 L 458 602 L 410 586 Z"
              fill="url(#ayeshaOrganzaLace)"
              stroke="#0d9488"
              strokeWidth="1"
            />
            <path
              d="M 416 572 L 465 586"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.6"
              strokeDasharray="4 2"
            />
            {/* Delicate Lace Cutwork Eyelets on Cuff */}
            <circle cx="424" cy="580" r="1.2" fill="#ffffff" opacity="0.8" />
            <circle cx="434" cy="583" r="1.2" fill="#ffffff" opacity="0.8" />
            <circle cx="444" cy="586" r="1.2" fill="#ffffff" opacity="0.8" />
            <circle cx="454" cy="589" r="1.2" fill="#ffffff" opacity="0.8" />

            {/* Fully Articulated Sculpted Left Hand & Fingers Resting on Wood */}
            {/* Palm Base & Thumb */}
            <path
              d="M 344 638 C 332 638, 322 642, 316 646 C 314 649, 318 652, 328 650 L 344 646 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1.1"
            />
            {/* Index Finger */}
            <path
              d="M 330 645 C 318 646, 306 648, 296 650 C 294 652, 296 655, 300 655 C 310 654, 322 652, 334 651 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1"
            />
            <ellipse cx="298" cy="652.5" rx="2.5" ry="1.2" fill="url(#ayeshaNailGrad)" />
            <ellipse cx="297.5" cy="652" rx="1.2" ry="0.6" fill="#ffffff" opacity="0.65" />

            {/* Middle Finger (Longest, gently resting on table) */}
            <path
              d="M 334 651 C 320 653, 304 655, 292 657 C 290 659, 292 662, 296 662 C 308 661, 322 659, 336 657 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1"
            />
            <ellipse cx="294" cy="659.5" rx="2.5" ry="1.2" fill="url(#ayeshaNailGrad)" />
            <ellipse cx="293.5" cy="659" rx="1.2" ry="0.6" fill="#ffffff" opacity="0.65" />

            {/* Ring Finger */}
            <path
              d="M 336 657 C 322 659, 310 662, 300 664 C 298 666, 300 668, 304 668 C 314 666, 324 664, 338 662 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1"
            />
            <ellipse cx="302" cy="666" rx="2.3" ry="1.1" fill="url(#ayeshaNailGrad)" />

            {/* Little Finger */}
            <path
              d="M 338 662 C 326 665, 316 668, 308 670 C 306 672, 308 674, 312 674 C 320 672, 330 669, 342 666 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1"
            />
            <ellipse cx="310" cy="672" rx="2.1" ry="1" fill="url(#ayeshaNailGrad)" />

            {/* Finger Knuckle Creases */}
            <line x1="318" y1="648" x2="319" y2="652" stroke="#a66843" strokeWidth="0.8" opacity="0.6" />
            <line x1="314" y1="655" x2="315" y2="659" stroke="#a66843" strokeWidth="0.8" opacity="0.6" />
          </g>

          {/* Main Torso & Embroidered Sage-Teal Lawn Kurta */}
          <path
            d="M 482 458 C 515 446, 568 446, 598 462 C 624 515, 630 595, 626 670 L 458 670 C 456 595, 464 515, 482 458 Z"
            fill="url(#ayeshaKurtaGrad)"
            stroke="#042f2e"
            strokeWidth="1.8"
          />

          {/* Realistic Anatomical Fabric Drape & Tension Creases (Across Bust & Midriff) */}
          <path
            d="M 486 525 C 510 545, 546 544, 570 524"
            fill="none"
            stroke="#042f2e"
            strokeWidth="2"
            opacity="0.45"
            strokeLinecap="round"
          />
          <path
            d="M 488 532 C 512 550, 548 548, 568 530"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1"
            opacity="0.3"
            strokeLinecap="round"
          />
          <path
            d="M 494 572 C 522 586, 558 584, 588 568"
            fill="none"
            stroke="#042f2e"
            strokeWidth="1.8"
            opacity="0.4"
            strokeLinecap="round"
          />
          <path
            d="M 496 578 C 524 592, 560 590, 590 574"
            fill="none"
            stroke="#5eead4"
            strokeWidth="1.1"
            opacity="0.25"
            strokeLinecap="round"
          />

          {/* Intricate Gold Zari Neckline (Gala) with Mughal Vine Filigree */}
          <path
            d="M 508 456 Q 534 496 564 456"
            fill="none"
            stroke="url(#ayeshaGoldGrad)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          {/* Inner Resham Floral Embroidery Accents on Gala */}
          <path
            d="M 514 460 Q 534 490 558 460"
            fill="none"
            stroke="#fde68a"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          {/* Symmetrical Resham Floral Paisley Motifs Framing Gala */}
          <path
            d="M 504 468 C 498 480, 506 488, 514 480 C 518 474, 510 466, 504 468 Z"
            fill="#0f766e"
            stroke="#fbbf24"
            strokeWidth="1"
          />
          <circle cx="508" cy="478" r="1.4" fill="#fbbf24" />
          <path
            d="M 568 468 C 574 480, 566 488, 558 480 C 554 474, 562 466, 568 468 Z"
            fill="#0f766e"
            stroke="#fbbf24"
            strokeWidth="1"
          />
          <circle cx="564" cy="478" r="1.4" fill="#fbbf24" />

          {/* Embroidered Kurta Placket (Patti) with Gold Border & Stitch Tracks */}
          <rect x="531" y="482" width="8" height="74" fill="#0f766e" stroke="url(#ayeshaGoldGrad)" strokeWidth="1.2" rx="1.5" />
          <line x1="535" y1="484" x2="535" y2="554" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 2" />

          {/* Luminous Natural Pearl Buttons with Gold Prong Settings */}
          <circle cx="535" cy="494" r="2.6" fill="url(#ayeshaPearlGrad)" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="535" cy="494" r="0.8" fill="#ffffff" />
          <circle cx="535" cy="512" r="2.6" fill="url(#ayeshaPearlGrad)" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="535" cy="512" r="0.8" fill="#ffffff" />
          <circle cx="535" cy="530" r="2.6" fill="url(#ayeshaPearlGrad)" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="535" cy="530" r="0.8" fill="#ffffff" />
          <circle cx="535" cy="548" r="2.6" fill="url(#ayeshaPearlGrad)" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="535" cy="548" r="0.8" fill="#ffffff" />

          {/* Draped Ivory Chiffon Dupatta with Translucent Sheen & Soft Drop Shadow */}
          <path
            d="M 474 460 C 494 452, 518 466, 532 504 C 546 548, 578 595, 620 625 L 626 670 L 550 670 C 518 620, 486 558, 468 492 Z"
            fill="url(#ayeshaDupattaGrad)"
            stroke="#f59e0b"
            strokeWidth="1.4"
          />
          {/* Chiffon Secondary Drape Layer & Natural Fabric Waves */}
          <path
            d="M 488 472 C 506 512, 532 575, 564 645 C 576 652, 594 656, 612 654"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.4"
            opacity="0.65"
            strokeLinecap="round"
          />
          <path
            d="M 502 520 C 522 562, 546 618, 578 668"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1"
            opacity="0.45"
            strokeLinecap="round"
          />

          {/* Metallic Kiran / Gota Lace Border Trim Along Dupatta Hem */}
          <path
            d="M 480 462 C 502 514, 534 584, 570 666"
            fill="none"
            stroke="url(#ayeshaGoldGrad)"
            strokeWidth="2.8"
            strokeDasharray="6 3"
          />
          {/* Shimmering Gota Fringe Tassels */}
          <path
            d="M 482 464 C 504 516, 536 586, 572 668"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity="0.85"
          />
        </g>

        {/* ================================================================= */}
        {/* 3. AYESHA NECK, SCULPTED HEAD & MINIMALIST MODERN GOLD JEWELRY     */}
        {/* ================================================================= */}
        <g
          id="ayesha-head-group"
          transform={`translate(538, 442) rotate(${-headPitch.toFixed(1)}) translate(-538, -442)`}
        >
          {/* Graceful Neck Cylinder with Sternocleidomastoid & Clavicle Shading */}
          <path
            d="M 522 412 L 520 464 C 528 476, 548 476, 556 464 L 554 412 Z"
            fill="url(#ayeshaLimbSkin)"
            stroke="#7d482a"
            strokeWidth="1.2"
          />
          {/* Sternocleidomastoid Muscle Shadow & Throat Contour */}
          <path
            d="M 526 422 C 532 442, 538 456, 542 466"
            fill="none"
            stroke="#8c5432"
            strokeWidth="1.2"
            opacity="0.45"
            strokeLinecap="round"
          />
          {/* Supraclavicular Notch & Clavicle Bone Hollow */}
          <path
            d="M 534 466 Q 540 470 546 466"
            fill="none"
            stroke="#7d482a"
            strokeWidth="1.2"
            opacity="0.5"
            strokeLinecap="round"
          />
          {/* Chin Cast Shadow on Upper Neck */}
          <path
            d="M 522 416 C 530 430, 546 432, 554 422 L 554 412 L 522 412 Z"
            fill="#5c3018"
            opacity="0.42"
          />

          {/* Minimalist Modern 18K Gold Collarbone Chain Seated in Clavicle Hollow */}
          <path
            d="M 522 454 C 530 468, 546 468, 554 454"
            fill="none"
            stroke="url(#ayeshaGoldGrad)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Delicate Gold Bail / Pendant Loop */}
          <rect x="537.2" y="465" width="1.6" height="2.8" rx="0.6" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.4" />
          {/* Floating Solitary Natural Drop Pearl Pendant */}
          <ellipse cx="538" cy="470.5" rx="2.4" ry="3.4" fill="url(#ayeshaPearlGrad)" stroke="#b45309" strokeWidth="0.65" />
          <ellipse cx="537.4" cy="469.2" rx="0.85" ry="1.3" fill="#ffffff" opacity="0.92" />

          {/* Sculpted 3/4 Female Facial Cranium & Refined Jawline */}
          <path
            d="M 502 336
               C 492 355, 490 382, 494 402
               C 497 416, 510 428, 526 428
               C 548 428, 568 412, 574 388
               C 578 362, 568 332, 542 326
               C 520 322, 508 326, 502 336 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1.3"
          />

          {/* Soft Rose Cheek Blush & Cheekbone Highlight */}
          <ellipse cx="512" cy="392" rx="15" ry="9" fill="url(#ayeshaCheekBlush)" />
          <ellipse cx="508" cy="382" rx="8" ry="4" fill="#fff7ed" opacity="0.38" transform="rotate(-12 508 382)" />

          {/* Cool Blue/White Laptop Screen Specular Key-Light Rim Along Jaw & Brow */}
          <path
            d="M 501 338 C 492 356, 490 384, 496 406 C 500 416, 511 425, 523 426"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.8"
            opacity="0.55"
            strokeLinecap="round"
          />

          {/* 3D Anatomical Sculpted Nose Bridge, Alar Cartilage & Nostril (Solid-Filled Skin so Nose is Never Transparent) */}
          <path
            d="M 502 364 C 496 374, 490 382, 488 388 C 486 392, 490 395, 494 395 C 499 395, 503 393, 506 391 Z"
            fill="url(#ayeshaSkin3D)"
          />
          <path
            d="M 502 364 C 496 374, 490 382, 488 388 C 486 392, 490 395, 494 395 C 499 395, 503 393, 506 391"
            fill="#a66843"
            opacity="0.18"
          />
          {/* Sculpted Bridge, Supratip Break & Rounded Nasal Lobule */}
          <path
            d="M 502 364 C 496 374, 489 383, 488 389 C 487.5 392.5, 491 394.5, 495 394.5"
            fill="none"
            stroke="#7d482a"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Crisp Specular Dorsum Highlight */}
          <path
            d="M 501 366 L 490 387"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.1"
            opacity="0.8"
            strokeLinecap="round"
          />
          {/* Rounded Nasal Tip (Lobule) Specular Catchlight */}
          <circle cx="489.5" cy="389" r="1.4" fill="#ffffff" opacity="0.75" />
          {/* Alar Crease & Curved Nostril Wing */}
          <path
            d="M 496 391 C 499 389, 504 390, 506 393"
            fill="none"
            stroke="#8c502b"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* Shaded Nostril Aperture Under Columella */}
          <ellipse cx="493.8" cy="393.2" rx="2.4" ry="1.1" fill="#3b1806" opacity="0.85" transform="rotate(-15 493.8 393.2)" />
          {/* Philtrum Columns Leading to Cupid's Bow */}
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
          {/* Far Left Brow */}
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

          {/* Near Right Brow */}
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
          <g className="animate-ayesha-blink">
            {/* Far Left Eye */}
            <ellipse cx="500" cy="369" rx="5.8" ry="4" fill="#ffffff" stroke="#451a03" strokeWidth="0.9" />
            {/* Inner Canthus Tear Duct */}
            <circle cx="505" cy="369.5" r="0.8" fill="#fda4af" />
            {/* 3D Iris with Limbal Ring */}
            <circle cx="499" cy="369" r="3" fill="url(#ayeshaIris3D)" stroke="#090504" strokeWidth="0.6" />
            <circle cx="499" cy="369" r="1.4" fill="#000000" />
            <circle cx="497.6" cy="367.6" r="1.1" fill="#ffffff" />
            <path d="M 493 367 Q 500 362 506 367" fill="none" stroke="#090504" strokeWidth="1.9" strokeLinecap="round" />
            {/* Lower Lash Accents */}
            <path d="M 495 372 Q 499 373 504 371" fill="none" stroke="#451a03" strokeWidth="0.8" opacity="0.6" />

            {/* Near Right Eye */}
            <ellipse cx="527" cy="369" rx="7.8" ry="4.8" fill="#ffffff" stroke="#451a03" strokeWidth="1" />
            {/* Inner Canthus */}
            <circle cx="520" cy="370" r="1" fill="#fda4af" />
            {/* 3D Iris with Limbal Ring & Radial Striations */}
            <circle cx="525" cy="369" r="3.8" fill="url(#ayeshaIris3D)" stroke="#090504" strokeWidth="0.7" />
            <circle cx="525" cy="369" r="1.8" fill="#000000" />
            {/* Dual Specular Window Catchlights */}
            <circle cx="523.5" cy="367.2" r="1.4" fill="#ffffff" />
            <circle cx="526.8" cy="370.4" r="0.75" fill="#ffffff" opacity="0.9" />
            {/* Elegant Upper Eyelash Wing with Defined Liner */}
            <path
              d="M 518 368 Q 527 361 538 366 L 542 364"
              fill="none"
              stroke="#090504"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            {/* Delicate Eyelid Crease */}
            <path
              d="M 519 363 Q 527 359 536 363"
              fill="none"
              stroke="#7d482a"
              strokeWidth="0.9"
              opacity="0.75"
            />
            {/* Fine Lower Eyelashes */}
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
            d={
              notificationActive
                ? 'M 494 406 Q 504 403 515 405 Q 506 414 494 406 Z'
                : 'M 494 407 Q 503 404 513 406 Q 504 412 494 407 Z'
            }
            fill="#be123c"
            stroke="#881337"
            strokeWidth="0.8"
          />
          {/* Vermilion Border Highlight on Cupid's Bow */}
          <path
            d="M 495 406 Q 500 404 504 405 Q 508 404 513 406"
            fill="none"
            stroke="#fda4af"
            strokeWidth="0.8"
            opacity="0.85"
          />
          {/* Lower Lip Central Gloss Shine */}
          <ellipse cx="504" cy="409.5" rx="3.5" ry="1.2" fill="#ffffff" opacity="0.45" />
          {/* Lip Parting Line */}
          <path
            d={notificationActive ? 'M 495 406 Q 504 408 514 404' : 'M 495 407 Q 503 407 512 406'}
            fill="none"
            stroke="#4c0519"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          {/* Labiomental Groove (Under-Lip Shadow) */}
          <path
            d="M 499 414 Q 504 416 509 414"
            fill="none"
            stroke="#7d482a"
            strokeWidth="0.9"
            opacity="0.55"
          />

          {/* Sculpted Anatomical Ear with Helix, Antihelix, Concha, Tragus & Lobe */}
          {/* Outer Helix & Anatomical Ear Shell */}
          <path
            d="M 557 372 C 559 364, 571 364, 574 374 C 576 382, 572 393, 565 397 C 560 399, 555 394, 556 387 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1.1"
          />
          {/* Inner Concha Bowl Depth Shadow */}
          <path
            d="M 559 377 C 564 377, 566 384, 561 388 Z"
            fill="#5c280b"
            opacity="0.45"
          />
          {/* Curved Antihelix Ridge */}
          <path
            d="M 567 372 C 569 378, 568 386, 563 391"
            fill="none"
            stroke="#a66843"
            strokeWidth="0.95"
            opacity="0.75"
            strokeLinecap="round"
          />
          {/* Tragus Projection Guarding Ear Canal */}
          <path
            d="M 556 379 C 559 380, 559 384, 556 386"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="0.9"
          />
          {/* Earlobe Piercing Hole */}
          <circle cx="562" cy="395.5" r="0.65" fill="#451a03" />

          {/* Minimalist Modern Jewelry: Sculpted 18K Gold Hoop Earring with Baroque Pearl Drop */}
          {/* 18K Gold Hoop Earring Piercing Natural Earlobe */}
          <ellipse
            cx="562"
            cy="400"
            rx="3.5"
            ry="4.5"
            fill="none"
            stroke="url(#ayeshaGoldGrad)"
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
          {/* Gold Connector Jump Ring */}
          <circle cx="562" cy="404.5" r="1.1" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.5" />
          {/* Dangling Baroque Freshwater Pearl */}
          <ellipse
            cx="562"
            cy="410"
            rx="2.5"
            ry="3.6"
            fill="url(#ayeshaPearlGrad)"
            stroke="#b45309"
            strokeWidth="0.7"
          />
          <ellipse cx="561.3" cy="408.6" rx="0.9" ry="1.4" fill="#ffffff" opacity="0.92" />

          {/* Multi-Layered Flowing Hair: Crown Volume, Side-Parted Bangs & Loose Temple Wisps */}
          {/* Main Crown Volume */}
          <path
            d="M 494 352
               C 496 324, 522 310, 554 316
               C 584 322, 598 350, 594 392
               C 590 424, 578 452, 570 468
               C 567 435, 573 396, 565 372
               C 557 352, 536 344, 514 342
               C 504 342, 498 346, 494 352 Z"
            fill="url(#ayeshaHairGrad)"
          />
          {/* Distinct Hair Parting & Strand Contour Lines */}
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

          {/* Loose Temple Wisps & Soft Curls Framing the Face */}
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

          {/* Luminous Warm Morning Window Sunlight Rim Highlighting Crown & Shoulder */}
          <path
            d="M 508 328 C 530 318, 560 322, 578 340"
            fill="none"
            stroke="url(#ayeshaSunlightRim)"
            strokeWidth="3.2"
            opacity="0.85"
            strokeLinecap="round"
          />
          <path
            d="M 564 348 C 582 368, 592 396, 588 432"
            fill="none"
            stroke="url(#ayeshaSunlightRim)"
            strokeWidth="2.2"
            opacity="0.75"
            strokeLinecap="round"
          />
        </g>

        {/* ================================================================= */}
        {/* 4. WALNUT DINING TABLE & HOME PROPS (Cash, Phone, Chai, Laptop)    */}
        {/* ================================================================= */}
        <g id="gulberg-table-and-props">
          {/* 3D Turned & Tapered Cylindrical Walnut Table Legs (Behind Apron) */}
          <g id="walnut-table-legs">
            {/* Left Front Turned Leg */}
            <path
              d="M 60 755 L 98 755 L 92 1080 L 66 1080 Z"
              fill="url(#walnutLeg3D)"
              stroke="#120601"
              strokeWidth="1.2"
            />
            {/* Turned Decorative Leg Rings & Specular Vertical Highlight */}
            <ellipse cx="79" cy="776" rx="20" ry="4.5" fill="#4a1f07" stroke="#1c0a02" strokeWidth="1" />
            <ellipse cx="79" cy="792" rx="18.5" ry="3.8" fill="#5c280b" stroke="#1c0a02" strokeWidth="1" />
            <line x1="74" y1="760" x2="76" y2="1075" stroke="#9a3412" strokeWidth="1.6" opacity="0.38" />

            {/* Inner Recessed Left Back Leg (Depth Perspective) */}
            <path
              d="M 118 758 L 144 758 L 140 1080 L 122 1080 Z"
              fill="#140701"
              opacity="0.88"
            />

            {/* Right Front Turned Leg */}
            <path
              d="M 838 755 L 876 755 L 870 1080 L 844 1080 Z"
              fill="url(#walnutLeg3D)"
              stroke="#120601"
              strokeWidth="1.2"
            />
            <ellipse cx="857" cy="776" rx="20" ry="4.5" fill="#4a1f07" stroke="#1c0a02" strokeWidth="1" />
            <ellipse cx="857" cy="792" rx="18.5" ry="3.8" fill="#5c280b" stroke="#1c0a02" strokeWidth="1" />
            <line x1="852" y1="760" x2="854" y2="1075" stroke="#9a3412" strokeWidth="1.6" opacity="0.32" />

            {/* Inner Recessed Right Back Leg */}
            <path
              d="M 792 758 L 818 758 L 814 1080 L 796 1080 Z"
              fill="#140701"
              opacity="0.88"
            />
          </g>

          {/* 3D Recessed Table Apron with Carved Corner Blocks & Bead Molding */}
          <g id="walnut-table-apron">
            {/* Deep Drop Shadow Cast by Bullnose Overhang onto Apron */}
            <rect x="14" y="732" width="942" height="32" fill="#230e03" stroke="#120601" strokeWidth="1.5" />
            <rect x="14" y="732" width="942" height="7" fill="#090300" opacity="0.72" />
            {/* Recessed Center Apron Panel */}
            <rect
              x="110"
              y="738"
              width="716"
              height="20"
              rx="2"
              fill="#1a0902"
              stroke="#4a1f07"
              strokeWidth="1"
            />
            <line x1="112" y1="757" x2="824" y2="757" stroke="#78350f" strokeWidth="1" opacity="0.55" />
            {/* Left & Right Carved Corner Blocks with Rosette Medallions */}
            <g transform="translate(56, 733)">
              <rect x="0" y="0" width="46" height="30" rx="2" fill="#2e1204" stroke="#5c280b" strokeWidth="1.2" />
              <rect x="5" y="4" width="36" height="22" rx="1.5" fill="#1c0a02" stroke="#78350f" strokeWidth="0.8" />
              <circle cx="23" cy="15" r="5.5" fill="#4a1f07" stroke="#9a3412" strokeWidth="0.9" />
              <circle cx="23" cy="15" r="2" fill="#b45309" />
            </g>
            <g transform="translate(834, 733)">
              <rect x="0" y="0" width="46" height="30" rx="2" fill="#2e1204" stroke="#5c280b" strokeWidth="1.2" />
              <rect x="5" y="4" width="36" height="22" rx="1.5" fill="#1c0a02" stroke="#78350f" strokeWidth="0.8" />
              <circle cx="23" cy="15" r="5.5" fill="#4a1f07" stroke="#9a3412" strokeWidth="0.9" />
              <circle cx="23" cy="15" r="2" fill="#b45309" />
            </g>
          </g>

          {/* Polished Walnut Tabletop Perspective Surface */}
          <polygon
            points="42,652 918,652 962,724 8,724"
            fill="url(#walnutTableSurface)"
            stroke="#290f04"
            strokeWidth="1.5"
          />

          {/* Multi-Layered Organic Walnut Wood Grain & Cathedral Heartwood Lines */}
          <g opacity="0.34" fill="none" strokeLinecap="round">
            <path d="M 48 662 Q 260 656 485 663 T 922 661" stroke="#230e03" strokeWidth="1.6" />
            <path d="M 38 672 C 190 666, 360 677, 540 671 C 710 665, 830 674, 932 670" stroke="#9a3412" strokeWidth="1.1" />
            <path d="M 30 683 C 180 676, 310 692, 465 684 C 630 676, 790 688, 942 682" stroke="#1c0a02" strokeWidth="2" />
            {/* Cathedral Arch Grain Figure on Left & Right Planks */}
            <path d="M 110 696 C 210 682, 310 682, 395 696 C 315 704, 205 704, 110 696 Z" stroke="#230e03" strokeWidth="1.5" />
            <path d="M 145 696 C 220 687, 295 687, 360 696" stroke="#b45309" strokeWidth="0.9" />
            <path d="M 530 701 C 640 688, 760 688, 865 701 C 765 709, 635 709, 530 701 Z" stroke="#1c0a02" strokeWidth="1.5" />
            <path d="M 20 712 Q 310 704 590 713 T 952 710" stroke="#230e03" strokeWidth="1.8" />
            <path d="M 16 719 Q 440 714 956 718" stroke="#9a3412" strokeWidth="1" />
          </g>

          {/* Glossy Window Sunlight Specular Reflection Across Polished Walnut Surface */}
          <polygon
            points="95,653 335,653 430,723 140,723"
            fill="#fef3c7"
            opacity="0.09"
          />
          <polygon
            points="125,653 235,653 305,723 175,723"
            fill="#fde68a"
            opacity="0.08"
          />

          {/* Far Back Bevel Edge of Table */}
          <line x1="42" y1="652.5" x2="918" y2="652.5" stroke="#b45309" strokeWidth="1.6" opacity="0.65" />

          {/* 3D Bullnose Front Edge of Table (Thickness = 11px) */}
          <g id="walnut-bullnose-front-edge">
            <rect
              x="6"
              y="723"
              width="956"
              height="11"
              rx="4.5"
              fill="url(#walnutBullnoseEdge)"
              stroke="#140701"
              strokeWidth="1.2"
            />
            {/* Top Specular Highlight Along Bullnose Lip */}
            <line x1="12" y1="724.5" x2="956" y2="724.5" stroke="#f59e0b" strokeWidth="1.4" opacity="0.55" />
            <line x1="80" y1="724.5" x2="460" y2="724.5" stroke="#fef3c7" strokeWidth="1.2" opacity="0.45" />
          </g>

          {/* Soft Contact Shadows Under Ayesha's Resting Left & Right Forearms on Table */}
          <ellipse cx="342" cy="659" rx="42" ry="8" fill="#090300" opacity="0.48" />
          <ellipse cx="488" cy="669" rx="46" ry="9" fill="#090300" opacity="0.52" />

          {/* --------------------------------------------------------------- */}
          {/* PROP A: 16″ CNC UNIBODY WORKSTATION (ERGONOMIC VIEW FACING AYESHA) */}
          {/* Display screen and backlit chiclet keyboard deck oriented toward */}
          {/* Ayesha on the right, with I/O array facing camera and screen    */}
          {/* area light spilling across the walnut table to Ayesha's hands.   */}
          {/* --------------------------------------------------------------- */}
          <g id="table-laptop" transform="translate(64, 526)" role="img" aria-label="16″ CNC Unibody Workstation facing Ayesha">
            {/* 1. DIRECTIONAL CAST SHADOW (PENUMBRA UNDER ROOM SUNLIGHT) */}
            <polygon
              points="54,126 195,119 265,130 180,146 54,136"
              fill="url(#laptopCastShadowGrad)"
              filter="url(#laptopCastShadowFilter)"
            />

            {/* 2. CONTACT AMBIENT OCCLUSION SHADOW DIRECTLY UNDER CHASSIS (UMBRA) */}
            <polygon
              points="52,132 210,123 242,156 70,169"
              fill="#090300"
              opacity="0.88"
              filter="url(#laptopContactShadowFilter)"
            />

            {/* 4 Precision Elastomeric Anti-Slip Rubber Feet Anchoring Base */}
            <ellipse cx="58" cy="130" rx="4.5" ry="1.8" fill="#08090c" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
            <ellipse cx="206" cy="122" rx="4.5" ry="1.8" fill="#08090c" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
            <ellipse cx="76" cy="164" rx="5" ry="2" fill="#08090c" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
            <ellipse cx="230" cy="151" rx="5" ry="2" fill="#08090c" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />

            {/* 3. RAY-TRACED SCREEN AREA LIGHT (EMISSION SPILL TOWARD AYESHA) */}
            <polygon
              points="198,114 206,36 340,95 365,160 215,148"
              fill="url(#screenAreaLightSpill)"
              opacity="0.75"
            />

            {/* 4. SOLID UNIBODY LOWER BASE CHASSIS (6063-T6 ANODIZED ALLOY) */}
            {/* Top Deck Surface (Angled toward Ayesha, keyboard well & palm rest) */}
            <polygon
              points="54,126 212,118 236,148 72,160"
              fill="#14151a"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.6"
            />

            {/* Front Lip Wall (Ergonomic edge facing front-left) */}
            <polygon
              points="72,160 236,148 236,155 72,167"
              fill="url(#aeroProEdgeWall)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.5"
            />
            {/* Diamond-Cut Specular Chamfer Along Front Lip */}
            <line x1="72" y1="160" x2="236" y2="148" stroke="rgba(255,255,255,0.45)" strokeWidth="0.75" />

            {/* CNC Milled Thumb Groove Centered on Front Lip */}
            <polygon
              points="144,155 168,153 168,155.5 144,157.5"
              fill="#090a0d"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="0.4"
            />

            {/* Left Profile Side Wall (Facing Viewer with I/O Array) */}
            <polygon
              points="54,126 72,160 72,167 54,133"
              fill="url(#aeroProEdgeWall)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.6"
            />
            {/* Diamond-Cut Specular Chamfer Along Top Left Wall Edge */}
            <line x1="54" y1="126" x2="72" y2="160" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />

            {/* MagSafe 3 Fast-Charge Port with Amber Status LED */}
            <polygon points="57,132 61,139 61,141.5 57,134.5" fill="#07080a" stroke="rgba(255,255,255,0.3)" strokeWidth="0.35" />
            <circle cx="59" cy="136.5" r="0.7" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 2px #fbbf24)' }} />

            {/* Dual Thunderbolt 4 / USB-C 40Gb/s Receptacles with Grounding Collars */}
            <polygon points="62,142 65,147 65,149.5 62,144.5" fill="#050608" stroke="rgba(255,255,255,0.3)" strokeWidth="0.35" />
            <line x1="63.5" y1="144.5" x2="64.5" y2="146" stroke="#94a3b8" strokeWidth="0.4" />
            <polygon points="66,149 69,154 69,156.5 66,151.5" fill="#050608" stroke="rgba(255,255,255,0.3)" strokeWidth="0.35" />
            <line x1="67.5" y1="151.5" x2="68.5" y2="153" stroke="#94a3b8" strokeWidth="0.4" />

            {/* 3.5mm High-Impedance Pro Audio Jack with Gold Contact Ring */}
            <ellipse cx="70.5" cy="159" rx="0.9" ry="0.8" fill="#040507" stroke="#fbbf24" strokeWidth="0.3" />

            {/* Right Profile Side Wall (Facing Ayesha / Table Depth) */}
            <polygon
              points="212,118 236,148 236,155 212,125"
              fill="#0d0e12"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.4"
            />

            {/* 5. KEYBOARD DECK & TRACKPAD (ORIENTED FACING AYESHA) */}
            {/* Frosted Glass Force Touch Trackpad (Closest to Ayesha's hands on right palm rest) */}
            <polygon
              points="168,136 216,133 224,146 174,149"
              fill="#181920"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.5"
            />
            {/* Trackpad Subtle Haptic Center Line */}
            <line x1="195" y1="134" x2="199" y2="148" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />

            {/* Recessed Keyboard Well Inset into Top Chassis */}
            <polygon
              points="68,130 196,123 206,138 76,146"
              fill="#0a0b0e"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.5"
            />
            {/* Soft Ambient Backlight Glow Well Underneath Keys */}
            <polygon
              points="69,131 195,124 205,137 77,145"
              fill="#38bdf8"
              opacity="0.08"
            />

            {/* 5 Rows of Backlit Chiclet Keycaps Facing Ayesha */}
            {/* Row 1: Function / Esc Row */}
            <line x1="71" y1="132" x2="194" y2="125" stroke="#1f2129" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="71" y1="132" x2="194" y2="125" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" strokeDasharray="3 1.5" />

            {/* Row 2: Numbers Row */}
            <line x1="72.5" y1="134.5" x2="196" y2="127.5" stroke="#1f2129" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="72.5" y1="134.5" x2="196" y2="127.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" strokeDasharray="4 1.5" />

            {/* Row 3: QWERTY Row */}
            <line x1="74" y1="137" x2="198" y2="130" stroke="#1f2129" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="74" y1="137" x2="198" y2="130" stroke="rgba(255,255,255,0.32)" strokeWidth="0.4" strokeDasharray="4.2 1.5" />

            {/* Row 4: Home Row (ASDF) */}
            <line x1="75.5" y1="139.8" x2="200" y2="132.8" stroke="#1f2129" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="75.5" y1="139.8" x2="200" y2="132.8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" strokeDasharray="4.5 1.5" />

            {/* Row 5: Bottom Row with Spacebar Centered Toward Ayesha */}
            <line x1="77" y1="142.8" x2="116" y2="140.8" stroke="#1f2129" strokeWidth="1.5" strokeLinecap="round" />
            {/* Ergonomic Wide Spacebar */}
            <polygon
              points="120,141.2 164,139 165,142 121,144.2"
              fill="#252833"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.4"
            />
            <line x1="168" y1="138.8" x2="203" y2="137" stroke="#1f2129" strokeWidth="1.5" strokeLinecap="round" />

            {/* Backlight Glow Bleed Between Key Rows */}
            <line x1="71" y1="133.2" x2="195" y2="126.2" stroke="#38bdf8" strokeWidth="0.25" opacity="0.4" />
            <line x1="73" y1="135.8" x2="197" y2="128.8" stroke="#38bdf8" strokeWidth="0.25" opacity="0.4" />
            <line x1="75" y1="138.4" x2="199" y2="131.4" stroke="#38bdf8" strokeWidth="0.25" opacity="0.4" />
            <line x1="77" y1="141.2" x2="202" y2="134.2" stroke="#38bdf8" strokeWidth="0.25" opacity="0.4" />

            {/* 6. CENTRAL CYLINDRICAL BARREL CLUTCH HINGE */}
            <rect
              x="62"
              y="123"
              width="136"
              height="5"
              rx="2"
              fill="url(#aeroProHingeGrad)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
              transform="rotate(-2.8 62 123)"
            />

            {/* 7. 16″ CNC UNIBODY DISPLAY LID (OPENING TOWARD AYESHA) */}
            {/* Outer Display Lid Frame */}
            <polygon
              points="60,42 210,32 202,119 54,126"
              fill="#14161c"
              stroke="#282a32"
              strokeWidth="1"
            />

            {/* 3D Top Diamond-Cut Chamfer Bevel Lip */}
            <line x1="60" y1="42" x2="210" y2="32" stroke="#ffffff" strokeWidth="0.8" opacity="0.85" />
            {/* 3D Left Profile Edge Lip */}
            <line x1="54" y1="126" x2="60" y2="42" stroke="#ffffff" strokeWidth="0.7" opacity="0.5" />

            {/* Active Retina Display (Facing Inward to Ayesha) */}
            <polygon
              points="64,46 206,36 198,114 58,121"
              fill="#060911"
              stroke="#1e293b"
              strokeWidth="0.6"
            />
            {/* Inner Bezel Accent Glow */}
            <polygon
              points="65,47 205,37 197,113 59,120"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.5"
              opacity="0.35"
            />

            {/* ACTIVE DISPLAY UI: RASAI NDR RESOLUTION CONSOLE (FACING AYESHA) */}
            {/* Title Bar & Window Management Dots */}
            <g id="laptop-screen-ui">
              {/* Traffic Light Dots */}
              <circle cx="69" cy="49" r="1.1" fill="#ef4444" />
              <circle cx="73" cy="48.7" r="1.1" fill="#f59e0b" />
              <circle cx="77" cy="48.4" r="1.1" fill="#10b981" />
              <text x="84" y="50" fill="#94a3b8" fontSize="3.2" fontFamily="monospace" transform="rotate(-3.8 84 50)">RASAI // LAHORE GATEWAY</text>
              <line x1="65" y1="52.5" x2="204" y2="43.2" stroke="#334155" strokeWidth="0.5" />

              {/* Left Navigation Sidebar */}
              <polygon points="65,53 92,51.2 89,112 60,119" fill="#0b1120" opacity="0.8" />
              <line x1="68" y1="57.5" x2="86" y2="56.2" stroke="#38bdf8" strokeWidth="0.9" />
              <line x1="68" y1="62" x2="83" y2="61" stroke="#64748b" strokeWidth="0.8" />
              <line x1="68" y1="66.5" x2="85" y2="65.5" stroke="#64748b" strokeWidth="0.8" />
              <line x1="67" y1="71" x2="82" y2="70" stroke="#64748b" strokeWidth="0.8" />
              <line x1="67" y1="75.5" x2="84" y2="74.5" stroke="#64748b" strokeWidth="0.8" />

              {/* Metric Card 1: Dispatch Status */}
              <polygon points="96,56 148,52.5 146,69.5 94,73" fill="#0f172a" stroke="#1e293b" strokeWidth="0.4" />
              <polygon points="99,59 124,57.2 123,62.2 98,64" fill="#0284c7" opacity="0.6" />
              <text x="101" y="62" fill="#ffffff" fontSize="2.6" fontFamily="monospace" transform="rotate(-3.8 101 62)">DISPATCH #9042</text>
              {/* Telemetry Pulse Line */}
              <polyline points="98,69 108,66.5 114,70 122,65.5 130,68 138,63.5 144,65.5" fill="none" stroke="#22d3ee" strokeWidth="0.8" />

              {/* Metric Card 2: Ayesha Khan Gulberg Destination */}
              <polygon points="152,52 196,49 194,66 150,69" fill="#0f172a" stroke="#1e293b" strokeWidth="0.4" />
              <text x="155" y="56" fill="#38bdf8" fontSize="2.6" fontFamily="monospace" transform="rotate(-3.8 155 56)">AYESHA KHAN</text>
              <text x="155" y="60.5" fill="#94a3b8" fontSize="2.1" fontFamily="monospace" transform="rotate(-3.8 155 60.5)">GULBERG III // LAHORE</text>
              <text x="155" y="65" fill="#34d399" fontSize="2.4" fontFamily="monospace" transform="rotate(-3.8 155 65)">Rs. 4,500 COD</text>

              {/* Lower Telemetry Log Area */}
              <polygon points="94,76 196,69.2 192,110 90,117" fill="#070b14" stroke="#1e293b" strokeWidth="0.4" />
              <line x1="96" y1="82" x2="175" y2="76.5" stroke="#38bdf8" strokeWidth="0.7" opacity="0.8" />
              <line x1="96" y1="86" x2="160" y2="81.5" stroke="#22c55e" strokeWidth="0.7" opacity="0.8" />
              <line x1="95" y1="90" x2="182" y2="84" stroke="#94a3b8" strokeWidth="0.6" opacity="0.6" />
              <line x1="95" y1="94" x2="150" y2="90" stroke="#64748b" strokeWidth="0.6" opacity="0.6" />
              <line x1="94" y1="98" x2="170" y2="92.5" stroke="#38bdf8" strokeWidth="0.6" opacity="0.7" />
              {/* Cyan Blinking Terminal Cursor */}
              <rect x="94" y="102" width="2.8" height="4" fill="#22d3ee" transform="rotate(-3.8 94 102)" />
            </g>

            {/* Diagonal Screen Glass Specular Reflection */}
            <polygon
              points="105,43 145,40 180,115 140,118"
              fill="#ffffff"
              opacity="0.06"
            />
            {/* Screen Glass Inner Hairline */}
            <polygon
              points="64.5,46.5 205.5,36.5 197.5,113.5 58.5,120.5"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.4"
            />

            {/* WebCam Notch / Sensor Dot at Top Bezel Center */}
            <polygon points="132,38 142,37.3 142,39.5 132,40.2" fill="#000000" />
            <circle cx="137" cy="38.7" r="0.6" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.2" />
            <circle cx="140" cy="38.5" r="0.3" fill="#22c55e" />
          </g>

          {/* --------------------------------------------------------------- */}
          {/* PROP B: 3D Bone-China Chai Cup, Saucer & Karak Steam             */}
          {/* --------------------------------------------------------------- */}
          <g id="table-chai-cup" transform="translate(310, 622)">
            {/* Ambient Occlusion Contact Shadow on Walnut Table */}
            <ellipse cx="26" cy="48" rx="33" ry="8" fill="#090300" opacity="0.68" />
            {/* Glossy Saucer Reflection on Polished Wood */}
            <ellipse cx="26" cy="51" rx="26" ry="5" fill="#fef3c7" opacity="0.12" />

            {/* 3D Fluted Porcelain Saucer Base & Gold Rim */}
            <ellipse cx="26" cy="45" rx="30" ry="7.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
            <ellipse cx="26" cy="43.5" rx="29" ry="6.5" fill="#f8fafc" stroke="#d97706" strokeWidth="1" />
            {/* Inner Saucer Well & Cup Contact Shadow */}
            <ellipse cx="26" cy="44" rx="18" ry="4" fill="#94a3b8" opacity="0.55" />

            {/* 3D Sculpted Cup Body with Cylindrical Shading */}
            <path
              d="M 7 14 L 45 14 C 45 35, 38 44, 26 44 C 14 44, 7 35, 7 14 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Right-Side Cylindrical Shadow on Porcelain Cup */}
            <path
              d="M 28 14 L 45 14 C 45 35, 38 44, 26 44 C 33 41, 35 30, 34 14 Z"
              fill="#cbd5e1"
              opacity="0.65"
            />
            {/* Left-Side Window Specular Highlight Strip on Cup */}
            <path
              d="M 11 17 C 11 29, 14 37, 20 41"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Ornate Gold Zari Motif Band Around Cup */}
            <path
              d="M 8.5 22 Q 26 26 43.5 22"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              opacity="0.85"
            />

            {/* 3D Sculpted Ear Handle with Gold Accent */}
            <path
              d="M 43 18 C 55 17, 55 36, 40 36"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 43 18 C 54 17.5, 54 35, 40 35.5"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Cup Rim & Rich Steaming Karak Chai Liquid Inside */}
            <ellipse cx="26" cy="14" rx="19" ry="5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.4" />
            <ellipse cx="26" cy="14.5" rx="16.5" ry="3.8" fill="#92400e" />
            <ellipse cx="24" cy="14" rx="12" ry="2.4" fill="#b45309" />
            {/* Specular Liquid Meniscus Highlight */}
            <path d="M 14 14 Q 24 12 35 14" fill="none" stroke="#fef3c7" strokeWidth="1" opacity="0.65" />

            {/* Continuous Delicate Karak Tea Steam (Exact Scene 1 Implementation) */}
            <foreignObject
              x="9"
              y="-110"
              width="34"
              height="125"
              className="pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <div className="ayesha-tea-smoke-container">
                <span /><span /><span /><span />
                <span /><span /><span /><span />
                <span /><span /><span /><span />
              </div>
            </foreignObject>
          </g>

          {/* --------------------------------------------------------------- */}
          {/* PROP C: Crisp Rs. 4,500 Pakistani Cash Ready on Table            */}
          {/* Authentic State Bank of Pakistan Notes: Quaid on Left, White      */}
          {/* Watermark Field on Right, SBP Urdu Script, Denomination Corners    */}
          {/* --------------------------------------------------------------- */}
          <g id="table-cod-cash-bundle" transform="translate(378, 648)">
            {/* Shadow under Cash Stack */}
            <ellipse cx="52" cy="24" rx="58" ry="12" fill="#090502" opacity="0.65" />

            {/* 4x Rs. 1,000 Blue SBP Notes Fanned (Aspect Ratio ~2.1:1 matching real 155mm x 65mm note) */}
            {[-12, -5, 2, 9].map((angle, idx) => (
              <g
                key={idx}
                transform={`translate(${idx * 6}, ${-idx * 2}) rotate(${angle} 45 15)`}
                clipPath="url(#pkr1000Clip)"
              >
                {/* Note Paper White/Pale Border Edge */}
                <rect
                  x="0"
                  y="0"
                  width="98"
                  height="46"
                  rx="1.5"
                  fill="#f0f9ff"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                />
                {/* Main Blue Intaglio Guilloche Field */}
                <rect
                  x="2"
                  y="2"
                  width="94"
                  height="42"
                  rx="1"
                  fill="url(#pkr1000Grad)"
                />

                {/* SBP Center Urdu Header: بینک دولت پاکستان */}
                <text x="51" y="8" fill="#f8fafc" fontSize="3.8" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="0.2">
                  بینک دولت پاکستان
                </text>
                <text x="51" y="12.5" fill="#bae6fd" fontSize="2.8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                  ایک ہزار روپیہ
                </text>

                {/* Top-Right Serial Number: e.g. A1563319 */}
                <text x="93" y="7.5" fill="#0f172a" fontSize="3.2" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                  A1563319
                </text>

                {/* Vertical Windowed Security Thread (silver metallic dashed line) */}
                <line x1="64" y1="2" x2="64" y2="44" stroke="#e0f2fe" strokeWidth="1.4" strokeDasharray="3 1.6" />

                {/* LEFT SIDE: Quaid-e-Azam Muhammad Ali Jinnah Portrait in Sherwani & Jinnah Cap */}
                <g id={`quaid-portrait-1000-${idx}`} transform="translate(14, 12)">
                  {/* Subtle portrait background halo */}
                  <ellipse cx="14" cy="16" rx="13" ry="15" fill="#0284c7" opacity="0.3" />
                  {/* Karakuli / Jinnah Karakul Fur Cap */}
                  <path d="M 6 8 C 8 2, 20 2, 22 8 L 24 13 L 4 13 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
                  <path d="M 7 9 Q 14 5 21 9" stroke="#334155" strokeWidth="0.6" fill="none" />
                  {/* Forehead and Realistic Face Contour */}
                  <path d="M 7 13 L 21 13 L 21 21 C 21 27, 18 30, 14 30 C 10 30, 7 27, 7 21 Z" fill="#e0f2fe" />
                  {/* Eyebrows, Almond Eyes with Catchlight & Sharp Nose */}
                  <path d="M 9 17 Q 11 16 13 17" stroke="#0f172a" strokeWidth="0.6" fill="none" />
                  <path d="M 16 17 Q 18 16 20 17" stroke="#0f172a" strokeWidth="0.6" fill="none" />
                  <circle cx="11" cy="18.5" r="0.8" fill="#0f172a" />
                  <circle cx="18" cy="18.5" r="0.8" fill="#0f172a" />
                  <path d="M 14.5 17.5 L 14.5 22.5 L 16 23.5" stroke="#0369a1" strokeWidth="0.6" fill="none" />
                  <path d="M 12 25.5 Q 14.5 26.5 17 25.5" stroke="#0369a1" strokeWidth="0.6" fill="none" />
                  {/* Sherwani High Band Collar (Bandgala) */}
                  <path d="M 5 29 L 23 29 L 26 34 L 2 34 Z" fill="#024268" stroke="#0f172a" strokeWidth="0.5" />
                  <line x1="14" y1="29" x2="14" y2="34" stroke="#38bdf8" strokeWidth="0.5" />
                </g>

                {/* RIGHT SIDE: White/Pale Watermark Field & Crescent/Star Emblem */}
                <rect x="68" y="4" width="26" height="38" rx="1" fill="#f8fafc" opacity="0.92" />
                {/* Micro Watermark Quaid Silhouette in pale blue inside watermark window */}
                <path d="M 77 14 C 79 10, 84 10, 86 14 L 87 18 L 75 18 Z" fill="#bae6fd" opacity="0.75" />
                <path d="M 77 18 C 77 18, 80 17, 83 18 C 85 19, 85 24, 84 27 C 82 29, 79 29, 77 27 Z" fill="#bae6fd" opacity="0.55" />
                {/* SBP Crescent & Star Emblem inside watermark box */}
                <circle cx="81" cy="33" r="3.2" fill="none" stroke="#0284c7" strokeWidth="0.5" />
                <path d="M 82 31.5 A 2.2 2.2 0 1 1 80 34.5 A 1.8 1.8 0 1 0 82 31.5 Z" fill="#0284c7" />

                {/* Numerals in Standard SBP Positions */}
                <text x="92" y="41" fill="#0f172a" fontSize="7.5" fontFamily="sans-serif" fontWeight="900" textAnchor="end">
                  1000
                </text>
                <text x="5" y="41" fill="#ffffff" fontSize="4.8" fontFamily="sans-serif" fontWeight="900">
                  ۱۰۰۰
                </text>
                <text x="5" y="7.5" fill="#ffffff" fontSize="4.8" fontFamily="sans-serif" fontWeight="900">
                  1000
                </text>
              </g>
            ))}

            {/* 1x Rs. 500 Emerald Green SBP Note on Top (Angled realistically on top of stack) */}
            <g transform="translate(24, -8) rotate(16 45 15)" clipPath="url(#pkr500Clip)">
              <rect
                x="0"
                y="0"
                width="94"
                height="44"
                rx="1.5"
                fill="#f0fdf4"
                stroke="#86efac"
                strokeWidth="0.5"
              />
              <rect
                x="2"
                y="2"
                width="90"
                height="40"
                rx="1"
                fill="url(#pkr500Grad)"
              />

              {/* SBP Urdu Header: Centered in middle zone */}
              <text x="49" y="8" fill="#f8fafc" fontSize="3.8" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="0.2">
                بینک دولت پاکستان
              </text>
              <text x="49" y="12.5" fill="#a7f3d0" fontSize="2.8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                پانچ سو روپیہ
              </text>

              {/* Top-Right Serial Number: e.g. H8260026 */}
              <text x="89" y="7.5" fill="#022c22" fontSize="3.2" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                H8260026
              </text>

              {/* Windowed Metallic Security Thread */}
              <line x1="61" y1="2" x2="61" y2="42" stroke="#d1fae5" strokeWidth="1.4" strokeDasharray="3 1.6" />

              {/* LEFT SIDE: Quaid-e-Azam Portrait in Green Sherwani & Jinnah Cap */}
              <g id="quaid-portrait-500" transform="translate(13, 11)">
                <ellipse cx="14" cy="16" rx="13" ry="15" fill="#059669" opacity="0.3" />
                <path d="M 6 8 C 8 2, 20 2, 22 8 L 24 13 L 4 13 Z" fill="#022c22" stroke="#064e3b" strokeWidth="0.5" />
                <path d="M 7 9 Q 14 5 21 9" stroke="#10b981" strokeWidth="0.6" fill="none" />
                <path d="M 7 13 L 21 13 L 21 21 C 21 27, 18 30, 14 30 C 10 30, 7 27, 7 21 Z" fill="#d1fae5" />
                <path d="M 9 17 Q 11 16 13 17" stroke="#022c22" strokeWidth="0.6" fill="none" />
                <path d="M 16 17 Q 18 16 20 17" stroke="#022c22" strokeWidth="0.6" fill="none" />
                <circle cx="11" cy="18.5" r="0.8" fill="#022c22" />
                <circle cx="18" cy="18.5" r="0.8" fill="#022c22" />
                <path d="M 14.5 17.5 L 14.5 22.5 L 16 23.5" stroke="#047857" strokeWidth="0.6" fill="none" />
                <path d="M 12 25.5 Q 14.5 26.5 17 25.5" stroke="#047857" strokeWidth="0.6" fill="none" />
                <path d="M 5 29 L 23 29 L 26 34 L 2 34 Z" fill="#064e3b" stroke="#022c22" strokeWidth="0.5" />
              </g>

              {/* RIGHT SIDE: White Watermark Field & Emblem */}
              <rect x="65" y="4" width="25" height="36" rx="1" fill="#f0fdf4" opacity="0.94" />
              <path d="M 74 13 C 76 9, 81 9, 83 13 L 84 17 L 72 17 Z" fill="#a7f3d0" opacity="0.75" />
              <path d="M 74 17 C 74 17, 77 16, 80 17 C 82 18, 82 23, 81 26 C 79 28, 76 28, 74 26 Z" fill="#a7f3d0" opacity="0.55" />
              <circle cx="77" cy="31.5" r="3" fill="none" stroke="#059669" strokeWidth="0.5" />
              <path d="M 78 30 A 2 2 0 1 1 76 33 A 1.6 1.6 0 1 0 78 30 Z" fill="#059669" />

              {/* Numerals */}
              <text x="88" y="39" fill="#022c22" fontSize="7.5" fontFamily="sans-serif" fontWeight="900" textAnchor="end">
                500
              </text>
              <text x="5" y="39" fill="#ffffff" fontSize="4.8" fontFamily="sans-serif" fontWeight="900">
                ۵۰۰
              </text>
              <text x="5" y="7.5" fill="#ffffff" fontSize="4.8" fontFamily="sans-serif" fontWeight="900">
                500
              </text>
            </g>

            {/* Crisp Floating Callout Pill Above Cash */}
            <g transform="translate(2, -32)">
              <rect
                x="0"
                y="0"
                width="116"
                height="22"
                rx="6"
                fill="#090d16"
                fillOpacity="0.92"
                stroke="#10b981"
                strokeWidth="1.2"
              />
              <text
                x="58"
                y="14.5"
                textAnchor="middle"
                fill="#ecfdf5"
                fontSize="9.5"
                fontFamily="sans-serif"
                fontWeight="bold"
                letterSpacing="0.6"
              >
                Rs. 4,500 CASH
              </text>
            </g>
          </g>

          {/* --------------------------------------------------------------- */}
          {/* PROP D: Ayesha's 3D Smartphone Resting on the Walnut Table       */}
          {/* Lights up Calm Emerald Green when Rasai Intercepts!              */}
          {/* --------------------------------------------------------------- */}
          <g
            ref={tablePhoneGroupRef}
            id="ayesha-table-phone"
            transform={`translate(${(238 + clampedPickup * 45).toFixed(1)}, ${(646 - clampedPickup * 38).toFixed(1)}) rotate(${(-8 + clampedPickup * 18).toFixed(1)})`}
          >
            <g transform="translate(-8, 24)">
              {/* Ambient Green Screen Halo when Notification Arrives */}
              <ellipse
                ref={tablePhoneHaloRef}
                cx="35"
                cy="22"
                rx="38"
                ry="48"
                fill="#10b981"
                opacity={notificationActive ? 0.48 : 0}
                style={{ mixBlendMode: 'screen' }}
              />

              {/* Multi-Layered Ambient Occlusion & Contact Shadow on Walnut Table */}
              <polygon
                points="11,2 43,-4 58,45 26,51"
                fill="#090300"
                opacity="0.78"
              />
              <ellipse cx="35" cy="24" rx="28" ry="32" fill="#090300" opacity="0.45" />

              {/* 3D Extruded Titanium Rails & Sidewalls (Portrait Smartphone) */}
              {/* Left-Side Long Titanium Rail (Showing Action & Volume Buttons) */}
              <polygon
                points="14,0 28,48 28,54.5 14,6.5"
                fill="#64748b"
                stroke="#1e293b"
                strokeWidth="0.8"
              />

              {/* Front-Bottom Short Titanium Sidewall (Bottom Edge with USB-C & Speakers) */}
              <polygon
                points="28,48 54,43.5 54,50 28,54.5"
                fill="url(#phoneTitaniumRail)"
                stroke="#0f172a"
                strokeWidth="0.9"
              />

              {/* Physical Side Buttons on Left Titanium Long Rail */}
              {/* Action Button */}
              <polygon points="16,8.5 17.5,13.5 17.5,15.5 16,10.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
              {/* Volume Up Button */}
              <polygon points="19,17.5 21,24.5 21,26.5 19,19.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
              {/* Volume Down Button */}
              <polygon points="22.5,29.5 24.5,36.5 24.5,38.5 22.5,31.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />

              {/* Bottom Edge: USB-C Port Centered on the Bottom of the Phone */}
              <polygon points="38,48.5 44,47.5 44,49.8 38,50.8" fill="#020617" stroke="#94a3b8" strokeWidth="0.4" />
              <line x1="39.5" y1="49.3" x2="42.5" y2="48.8" stroke="#cbd5e1" strokeWidth="0.4" />

              {/* Bottom Edge: Speaker & Microphone Micro-Perforations on Bottom Side */}
              <circle cx="31" cy="50.4" r="0.7" fill="#0f172a" />
              <circle cx="33.5" cy="50.0" r="0.7" fill="#0f172a" />
              <circle cx="36" cy="49.6" r="0.7" fill="#0f172a" />
              <circle cx="46" cy="47.9" r="0.7" fill="#0f172a" />
              <circle cx="48.5" cy="47.5" r="0.7" fill="#0f172a" />
              <circle cx="51" cy="47.1" r="0.7" fill="#0f172a" />

              {/* Top Chamfered Titanium Bezel Rim (Portrait Screen Perimeter) */}
              <polygon
                points="14,0 40,-4.5 54,43.5 28,48"
                fill="#070a12"
                stroke={notificationActive ? '#34d399' : '#94a3b8'}
                strokeWidth="1.3"
              />

              {/* Smartphone Illuminated OLED Screen (Preserves tablePhoneScreenRef for rAF) */}
              <polygon
                ref={tablePhoneScreenRef}
                points="16.5,2.2 38.5,-1.6 51.5,41.8 29.5,45.6"
                fill="#0b141a"
              />

              {/* =============================================================== */}
              {/* EXACT SYNCHRONIZED WHATSAPP BUSINESS SCREEN REPLICA (220 x 434) */}
              {/* Mapped 1:1 onto the 3D table phone screen polygon               */}
              {/* =============================================================== */}
              <defs>
                <clipPath id="tablePhoneScreenOuterClip">
                  <rect x="0" y="0" width="220" height="434" rx="10" />
                </clipPath>
                <clipPath id="tablePhoneChatViewportClip">
                  <rect x="0" y="76" width="220" height="336" />
                </clipPath>
              </defs>

              <g
                transform="matrix(0.1, -0.017273, 0.029954, 0.1, 16.5, 2.2)"
                clipPath="url(#tablePhoneScreenOuterClip)"
              >
                {/* Base Dark WhatsApp Screen Canvas */}
                <rect x="0" y="0" width="220" height="434" fill="#0b141a" />

                {/* 1. Top Status Bar (Exact Match: 11:43/11:44 + Camera Ring + 5G + Battery) */}
                <rect x="0" y="0" width="220" height="28" fill="#070a12" />
                <line x1="0" y1="28" x2="220" y2="28" stroke="#1e293b" strokeWidth="1.2" />
                <text
                  ref={tablePhoneClockRef}
                  x="14"
                  y="18.5"
                  fill="#e2e8f0"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  11:43
                </text>
                {/* Sensor, Earpiece Speaker Pill & Glowing Front Camera Ring */}
                <circle cx="84" cy="14" r="3.2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                <rect
                  x="94"
                  y="11.5"
                  width="28"
                  height="5"
                  rx="2.5"
                  fill="#0f172a"
                  stroke="#475569"
                  strokeWidth="1"
                />
                <circle cx="132" cy="14" r="6.2" fill="#020617" stroke="#94a3b8" strokeWidth="1.4" />
                <circle cx="132" cy="14" r="3.8" fill="#0c1e3e" stroke="#38bdf8" strokeWidth="1" />
                <circle cx="130.8" cy="12.8" r="1.1" fill="#7dd3fc" />
                {/* 5G & Emerald Battery */}
                <text
                  x="168"
                  y="18"
                  fill="#cbd5e1"
                  fontSize="10.5"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  5G
                </text>
                <rect
                  x="186"
                  y="9"
                  width="19"
                  height="10"
                  rx="2"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                />
                <rect x="188" y="11" width="15" height="6" rx="1" fill="#34d399" />

                {/* 2. WhatsApp Business Header Bar (#075e54 with Emerald 'R' & Rasai ✓) */}
                <rect x="0" y="28" width="220" height="48" fill="#075e54" />
                <line x1="0" y1="76" x2="220" y2="76" stroke="#064e3b" strokeWidth="1.5" />
                <circle cx="24" cy="52" r="13" fill="#34d399" />
                <text
                  x="24"
                  y="56.5"
                  textAnchor="middle"
                  fill="#022c22"
                  fontSize="13"
                  fontFamily="sans-serif"
                  fontWeight="900"
                >
                  R
                </text>
                <text
                  x="44"
                  y="48"
                  fill="#ffffff"
                  fontSize="12.5"
                  fontFamily="sans-serif"
                  fontWeight="800"
                >
                  Rasai
                </text>
                <circle cx="86" cy="44" r="5.8" fill="#34d399" />
                <text
                  x="86"
                  y="47.2"
                  textAnchor="middle"
                  fill="#022c22"
                  fontSize="8"
                  fontFamily="sans-serif"
                  fontWeight="900"
                >
                  ✓
                </text>
                <text
                  x="44"
                  y="62.5"
                  fill="#a7f3d0"
                  fontSize="9"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  Official WhatsApp Business
                </text>
                <text
                  ref={tablePhoneHeaderClockRef}
                  x="208"
                  y="54"
                  textAnchor="end"
                  fill="#a7f3d0"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  11:43 AM
                </text>

                {/* 3. Synchronized Clipped WhatsApp Chat Body */}
                <g clipPath="url(#tablePhoneChatViewportClip)">
                  <g ref={tablePhoneChatTrackRef} transform="translate(0, 0)">
                    {/* Amber Ghost Scan Pill */}
                    <rect
                      x="18"
                      y="86"
                      width="184"
                      height="19"
                      rx="9.5"
                      fill="#1e293b"
                      stroke="#f59e0b"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <text
                      x="110"
                      y="98.5"
                      textAnchor="middle"
                      fill="#fcd34d"
                      fontSize="7.6"
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      GHOST SCAN INTERCEPTED • 2.8 KM AWAY
                    </text>

                    {/* Incoming Rasai Message Bubble (#1f2c34) */}
                    <rect
                      x="10"
                      y="114"
                      width="200"
                      height="132"
                      rx="12"
                      fill="#1f2c34"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    <text
                      x="20"
                      y="133"
                      fill="#6ee7b7"
                      fontSize="10.5"
                      fontFamily="sans-serif"
                      fontWeight="700"
                    >
                      Assalam-o-Alaikum Ayesha!
                    </text>
                    <text x="20" y="150" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">
                      Our courier marked &ldquo;Customer Unavailable&rdquo;
                    </text>
                    <text x="20" y="163" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">
                      for parcel #LP-9042 (COD Rs. 4,500),
                    </text>
                    <text x="20" y="176" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">
                      but Rasai detected rider was 2.8 km away.
                    </text>
                    <text
                      x="20"
                      y="196"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="700"
                    >
                      We blocked the return. Are you home
                    </text>
                    <text
                      x="20"
                      y="209"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="700"
                    >
                      right now?
                    </text>
                    <text
                      x="200"
                      y="236"
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      11:43 AM
                    </text>

                    {/* Quick-Reply Interactive Buttons (Visible before Step 1 Reply) */}
                    <g ref={tablePhoneQuickRepliesRef}>
                      {/* Button 1: Bright Emerald */}
                      <rect
                        x="10"
                        y="256"
                        width="200"
                        height="35"
                        rx="9"
                        fill="#10b981"
                        stroke="#a7f3d0"
                        strokeWidth="1"
                      />
                      <text
                        x="110"
                        y="277"
                        textAnchor="middle"
                        fill="#022c22"
                        fontSize="9.2"
                        fontFamily="sans-serif"
                        fontWeight="900"
                      >
                        ✓ Yes, I&apos;m Home (Rs. 4,500 Cash Ready)
                      </text>
                      {/* Button 2: Dark with Emerald Border */}
                      <rect
                        x="10"
                        y="298"
                        width="200"
                        height="35"
                        rx="9"
                        fill="#1f2c34"
                        stroke="#10b981"
                        strokeOpacity="0.5"
                        strokeWidth="1"
                      />
                      <text
                        x="110"
                        y="319"
                        textAnchor="middle"
                        fill="#6ee7b7"
                        fontSize="9"
                        fontFamily="sans-serif"
                        fontWeight="700"
                      >
                        📍 Share Exact Gulberg Doorstep Pin
                      </text>
                      {/* Button 3: Dark with Slate Border */}
                      <rect
                        x="10"
                        y="340"
                        width="200"
                        height="35"
                        rx="9"
                        fill="#1f2c34"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x="110"
                        y="361"
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontFamily="sans-serif"
                        fontWeight="600"
                      >
                        📅 Reschedule Time Slot
                      </text>
                    </g>

                    {/* Scene 4 Step 1: Ayesha Outgoing Reply Bubble + Gulberg III Map Card */}
                    <g
                      ref={tablePhoneReplyBubbleRef}
                      style={{ display: 'none', opacity: 0 }}
                    >
                      <rect
                        x="22"
                        y="256"
                        width="188"
                        height="142"
                        rx="12"
                        fill="#005c4b"
                        stroke="#10b981"
                        strokeOpacity="0.45"
                        strokeWidth="1.2"
                      />
                      <text
                        x="32"
                        y="275"
                        fill="#ecfdf5"
                        fontSize="9.2"
                        fontFamily="sans-serif"
                        fontWeight="700"
                      >
                        ✓ Yes, I&apos;m home! Rs. 4,500 cash is ready.
                      </text>
                      {/* Mini Vector Map Card */}
                      <rect
                        x="32"
                        y="284"
                        width="168"
                        height="86"
                        rx="8"
                        fill="#071915"
                        stroke="#34d399"
                        strokeOpacity="0.4"
                        strokeWidth="1"
                      />
                      <line x1="32" y1="304" x2="200" y2="304" stroke="#0f352c" strokeWidth="4" />
                      <line x1="32" y1="332" x2="200" y2="332" stroke="#0d2b24" strokeWidth="3" />
                      <line x1="76" y1="284" x2="66" y2="350" stroke="#0f352c" strokeWidth="3.5" />
                      <line x1="154" y1="284" x2="162" y2="350" stroke="#0d2b24" strokeWidth="3" />
                      <rect
                        x="92"
                        y="308"
                        width="48"
                        height="18"
                        rx="2"
                        fill="#0f2f26"
                        stroke="#10b981"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                      />
                      <circle cx="116" cy="318" r="9" fill="none" stroke="#34d399" strokeWidth="1.2" opacity="0.6" />
                      <path
                        d="M116,318 C112,312 109,309 109,305 C109,301 112,298 116,298 C120,298 123,301 123,305 C123,309 120,312 116,318 Z"
                        fill="#10b981"
                        stroke="#ecfdf5"
                        strokeWidth="1"
                      />
                      <circle cx="116" cy="305" r="2.2" fill="#052e16" />
                      <rect x="32" y="350" width="168" height="20" rx="4" fill="#09221c" />
                      <text
                        x="40"
                        y="363"
                        fill="#ffffff"
                        fontSize="7.8"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        📍 Flat 4B, Gulberg III
                      </text>
                      <text
                        x="198"
                        y="390"
                        textAnchor="end"
                        fill="#a7f3d0"
                        fontSize="7.5"
                        fontFamily="sans-serif"
                      >
                        Live Doorstep Pin Attached • 11:44 AM ✓✓
                      </text>
                    </g>

                    {/* Scene 4 Step 2: Rasai Priority Run-Sheet Confirmation Bubble */}
                    <g
                      ref={tablePhoneConfirmBubbleRef}
                      style={{ display: 'none', opacity: 0 }}
                    >
                      <rect
                        x="10"
                        y="406"
                        width="200"
                        height="104"
                        rx="12"
                        fill="#1f2c34"
                        stroke="#10b981"
                        strokeOpacity="0.4"
                        strokeWidth="1.2"
                      />
                      <rect
                        x="20"
                        y="416"
                        width="162"
                        height="16"
                        rx="8"
                        fill="#064e3b"
                        stroke="#34d399"
                        strokeOpacity="0.4"
                        strokeWidth="0.8"
                      />
                      <text
                        x="101"
                        y="427"
                        textAnchor="middle"
                        fill="#6ee7b7"
                        fontSize="7.2"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        ✓ 07:30 AM PRIORITY RUN-SHEET LOCKED
                      </text>
                      <text x="20" y="446" fill="#e2e8f0" fontSize="8.8" fontFamily="sans-serif">
                        Shukriya Ayesha! Your exact Gulberg III
                      </text>
                      <text x="20" y="459" fill="#ffffff" fontSize="8.8" fontFamily="sans-serif" fontWeight="700">
                        pin is locked for #LP-9042 (Rs. 4,500).
                      </text>
                      <text x="20" y="472" fill="#6ee7b7" fontSize="8.8" fontFamily="sans-serif" fontWeight="700">
                        Guaranteed delivery tomorrow 10:00 AM.
                      </text>
                      <text
                        x="200"
                        y="498"
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        11:44 AM
                      </text>
                    </g>
                  </g>
                </g>

                {/* 4. Bottom Home Indicator Bar */}
                <rect x="0" y="412" width="220" height="22" fill="#070a12" />
                <rect x="72" y="420" width="76" height="4.5" rx="2.25" fill="#475569" />
              </g>

              {/* Diagonal Specular Glass Screen Reflection on Top of Display */}
              <polygon
                points="20,6 30,4 40,38 30,40"
                fill="#ffffff"
                opacity="0.09"
                pointerEvents="none"
              />
            </g>
          </g>
        </g>

        {/* ================================================================= */}
        {/* 5. AYESHA FOREGROUND RIGHT ARM & GOLD WRISTWATCH                   */}
        {/* ================================================================= */}
        <g
          ref={rightArmRef}
          id="ayesha-right-arm"
          transform={`translate(585, 488) rotate(${armReachDeg.toFixed(1)}) translate(-585, -488)`}
        >
          {/* Right Shoulder & Anatomical Lawn Kurta Sleeve */}
          <path
            d="M 562 472 C 596 476, 618 518, 610 578 L 564 584 C 566 534, 558 498, 548 482 Z"
            fill="url(#ayeshaKurtaGrad)"
            stroke="#042f2e"
            strokeWidth="1.6"
          />
          {/* Sleeve Fabric Drape & Tension Creases */}
          <path
            d="M 584 496 C 594 522, 598 550, 596 576"
            fill="none"
            stroke="#042f2e"
            strokeWidth="1.6"
            opacity="0.5"
            strokeLinecap="round"
          />
          <path
            d="M 570 538 C 582 546, 595 548, 606 540"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.1"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Scalloped Organza Lace Sleeve Cuff with Gold Zari Border */}
          <path
            d="M 560 574 L 610 570 L 608 588 L 558 592 Z"
            fill="url(#ayeshaOrganzaLace)"
            stroke="#0d9488"
            strokeWidth="1"
          />
          <path
            d="M 560 574 L 610 570"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.6"
            strokeDasharray="4 2"
          />
          {/* Lace Cutwork Eyelets on Right Cuff */}
          <circle cx="568" cy="582" r="1.2" fill="#ffffff" opacity="0.8" />
          <circle cx="578" cy="580" r="1.2" fill="#ffffff" opacity="0.8" />
          <circle cx="588" cy="578" r="1.2" fill="#ffffff" opacity="0.8" />
          <circle cx="598" cy="576" r="1.2" fill="#ffffff" opacity="0.8" />

          {/* Forearm & Wrist Reaching Toward Table / Phone */}
          <path
            d="M 564 586 C 554 618, 528 642, 496 650 L 504 668 C 546 662, 582 635, 604 584 Z"
            fill="url(#ayeshaLimbSkin)"
            stroke="#7d482a"
            strokeWidth="1.2"
          />
          {/* Forearm Muscle, Extensor Tendon & Radius Bone Shading */}
          <path
            d="M 552 602 C 538 624, 520 638, 502 646"
            fill="none"
            stroke="#a66843"
            strokeWidth="1.2"
            opacity="0.45"
            strokeLinecap="round"
          />
          <path
            d="M 558 608 C 542 630, 526 648, 508 658"
            fill="none"
            stroke="#8c502b"
            strokeWidth="0.9"
            opacity="0.35"
            strokeLinecap="round"
          />

          {/* Fully Sculpted Minimalist Modern 18K Gold Wristwatch Perfectly Aligned on Wrist */}
          <g id="ayesha-wrist-watch" transform="translate(506, 654) rotate(-29)">
            {/* Watch Cast Shadow on Wrist Skin */}
            <path
              d="M -6.5 -11 C -1 -12, 1 -12, 6.5 -11 L 6 12 C 1 12.8, -1 12.8, -6 12 Z"
              fill="#451a03"
              opacity="0.32"
            />

            {/* Seamless Curved 18K Gold Bracelet Wrapping from Edge to Edge Across Wrist */}
            <path
              d="M -4.5 -11.5 C -1 -12.4, 1 -12.4, 4.5 -11.5 L 4 12 C 1 12.8, -1 12.8, -4 12 Z"
              fill="url(#ayeshaGoldGrad)"
              stroke="#78350f"
              strokeWidth="0.8"
            />
            {/* Articulated Gold Jubilee Link Segments */}
            <line x1="-4.3" y1="-8.5" x2="4.3" y2="-8.5" stroke="#78350f" strokeWidth="0.75" />
            <line x1="-4.1" y1="-5.5" x2="4.1" y2="-5.5" stroke="#78350f" strokeWidth="0.75" />
            <line x1="-3.9" y1="5.5" x2="3.9" y2="5.5" stroke="#78350f" strokeWidth="0.75" />
            <line x1="-3.9" y1="8.5" x2="3.9" y2="8.5" stroke="#78350f" strokeWidth="0.75" />
            {/* Specular Center Track Highlight on Links */}
            <line x1="0" y1="-11" x2="0" y2="-5.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.65" />
            <line x1="0" y1="5.5" x2="0" y2="11.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.65" />

            {/* Sculpted 18K Gold Case Lugs */}
            <path d="M -3.5 -5 L -4 -9.5 L -2 -9.5 L -1.5 -5 Z" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />
            <path d="M 3.5 -5 L 4 -9.5 L 2 -9.5 L 1.5 -5 Z" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />
            <path d="M -3.5 5 L -4 9.5 L -2 9.5 L -1.5 5 Z" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />
            <path d="M 3.5 5 L 4 9.5 L 2 9.5 L 1.5 5 Z" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />

            {/* 3 o'clock Crown Knurled Winder */}
            <rect x="6.4" y="-1.4" width="1.6" height="2.8" rx="0.5" fill="#b45309" stroke="#78350f" strokeWidth="0.4" />

            {/* Ultra-Slim Polished 18K Gold Bezel */}
            <circle cx="0" cy="0" r="6.8" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.9" />
            <circle cx="0" cy="0" r="5.8" fill="none" stroke="#fef08a" strokeWidth="0.5" opacity="0.85" />

            {/* Luminous Natural Mother-of-Pearl Dial */}
            <circle cx="0" cy="0" r="5.2" fill="url(#ayeshaPearlGrad)" stroke="#92400e" strokeWidth="0.55" />

            {/* Dial Hour Markers (12, 3, 6, 9 Gold Cabochon Studs) */}
            <circle cx="0" cy="-3.6" r="0.6" fill="#78350f" />
            <circle cx="3.6" cy="0" r="0.6" fill="#78350f" />
            <circle cx="0" cy="3.6" r="0.6" fill="#78350f" />
            <circle cx="-3.6" cy="0" r="0.6" fill="#78350f" />

            {/* Lancet Polished Gold Hands (Set to 11:42 AM) */}
            <line x1="0" y1="0" x2="-1.2" y2="-2.8" stroke="#451a03" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="0" y1="0" x2="2.6" y2="1.2" stroke="#451a03" strokeWidth="0.85" strokeLinecap="round" />
            <circle cx="0" cy="0" r="0.85" fill="#d97706" />

            {/* Curved Watch Glass Reflection */}
            <path
              d="M -3.8 -3.2 A 4.8 4.8 0 0 1 3.5 -3.2 Q 0 -1.5 -3.8 -3.2 Z"
              fill="#ffffff"
              opacity="0.4"
            />
          </g>

          {/* Fully Articulated Sculpted Right Hand & Extended Fingers */}
          {/* Palm Base, Hypothenar & Thenar Eminence */}
          <path
            d="M 504 650 C 494 650, 482 652, 474 654 C 470 658, 478 664, 492 664 L 506 662 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1.1"
          />

          {/* Opposable Thumb Reaching Forward */}
          <path
            d="M 488 648 C 478 646, 466 648, 456 652 C 454 654, 456 657, 460 657 C 470 655, 480 653, 492 652 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1"
          />
          <ellipse cx="458" cy="654.2" rx="2.4" ry="1.2" fill="url(#ayeshaNailGrad)" />
          <ellipse cx="457.4" cy="653.8" rx="1.1" ry="0.6" fill="#ffffff" opacity="0.7" />

          {/* Index Finger (Reaching toward table phone) */}
          <path
            d="M 494 652 C 478 652, 460 654, 442 657 C 438 658, 439 662, 444 662 C 460 660, 478 658, 496 657 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1"
          />
          <ellipse cx="443" cy="659.5" rx="2.5" ry="1.2" fill="url(#ayeshaNailGrad)" />
          <ellipse cx="442.4" cy="659" rx="1.2" ry="0.6" fill="#ffffff" opacity="0.7" />

          {/* Middle Finger (Longest reach toward table phone) */}
          <path
            d="M 496 657 C 478 658, 458 660, 438 663 C 434 664, 435 668, 440 668 C 458 666, 478 664, 498 662 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1"
          />
          <ellipse cx="439.5" cy="665.5" rx="2.5" ry="1.2" fill="url(#ayeshaNailGrad)" />
          <ellipse cx="439" cy="665" rx="1.2" ry="0.6" fill="#ffffff" opacity="0.7" />

          {/* Ring Finger with Minimalist Modern Solitary 18K Gold Band Ring */}
          <path
            d="M 498 662 C 480 664, 462 666, 445 669 C 442 670, 443 673, 448 673 C 464 671, 480 669, 500 667 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1"
          />
          <ellipse cx="446.5" cy="671.2" rx="2.3" ry="1.1" fill="url(#ayeshaNailGrad)" />
          {/* Solitary 18K Gold Ring Band on Ring Finger */}
          <rect x="466" y="666.5" width="2.8" height="4.8" rx="0.8" fill="url(#ayeshaGoldGrad)" stroke="#78350f" strokeWidth="0.6" />
          <line x1="467.4" y1="666.8" x2="467.4" y2="671" stroke="#ffffff" strokeWidth="0.6" opacity="0.8" />

          {/* Little Finger (Pinky) Curled Delicately */}
          <path
            d="M 500 667 C 486 669, 472 672, 456 675 C 453 676, 455 678, 459 678 C 472 676, 486 673, 502 670 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1"
          />
          <ellipse cx="457.5" cy="676.8" rx="2.1" ry="1" fill="url(#ayeshaNailGrad)" />

          {/* Fine Knuckle Joint Accents */}
          <line x1="472" y1="655" x2="473" y2="659" stroke="#a66843" strokeWidth="0.8" opacity="0.6" />
          <line x1="468" y1="662" x2="469" y2="666" stroke="#a66843" strokeWidth="0.8" opacity="0.6" />
        </g>
      </g>
    );
  }
);

CustomerAyesha.displayName = 'CustomerAyesha';

export default CustomerAyesha;
