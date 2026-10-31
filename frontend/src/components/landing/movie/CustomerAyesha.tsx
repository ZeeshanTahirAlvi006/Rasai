// src/components/landing/movie/CustomerAyesha.tsx
// 3D Realistic Anatomical SVG Rig & Interior Props for Customer Ayesha in her Gulberg Flat.
// Features multi-stop subsurface skin shading, expressive eyes with catchlights, layered hair,
// embroidered kurta with fabric folds, walnut table, laptop, steaming chai, and Rs. 4,500 COD cash.

import React, { forwardRef } from 'react';

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
            .animate-ayesha-blink {
              animation: ayeshaEyeBlink 4.2s ease-in-out infinite;
              transform-box: fill-box;
              transform-origin: center;
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

          {/* Brushed Anodized Space-Silver / Titanium 3D Laptop Lid Gradient */}
          <linearGradient id="laptopLid3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="26%" stopColor="#94a3b8" />
            <stop offset="54%" stopColor="#cbd5e1" />
            <stop offset="78%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* 3D Machined Aluminum Laptop Chassis Edge Gradient */}
          <linearGradient id="laptopDeckEdge3D" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="30%" stopColor="#94a3b8" />
            <stop offset="72%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Soft Blue/White Screen Light Spill Cast by Laptop Facing Ayesha */}
          <radialGradient id="laptopScreenSpill" cx="25%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.42" />
            <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="78%" stopColor="#bae6fd" stopOpacity="0.06" />
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
        {/* 2. AYESHA TORSO, KURTA, DUPATTA & LEFT ARM                         */}
        {/* ================================================================= */}
        <g id="ayesha-upper-body">
          {/* Flowing Hair Back Layer */}
          <path
            d="M 488 345 C 460 390, 462 465, 480 515 C 510 525, 580 520, 600 495 C 612 450, 608 385, 582 345 Z"
            fill="url(#ayeshaHairGrad)"
          />

          {/* Left Arm (Further from camera, resting near laptop/teacup) */}
          <g id="ayesha-left-arm">
            {/* Upper Left Sleeve */}
            <path
              d="M 492 468 C 465 480, 440 525, 425 575 L 462 588 C 475 548, 495 512, 514 492 Z"
              fill="#0f766e"
              stroke="#042f2e"
              strokeWidth="1.5"
            />
            {/* Left Forearm & Wrist extending onto Table */}
            <path
              d="M 425 575 C 410 605, 382 628, 348 638 L 356 658 C 398 652, 436 628, 462 588 Z"
              fill="url(#ayeshaLimbSkin)"
              stroke="#7d482a"
              strokeWidth="1.2"
            />
            {/* Embroidered Kurta Cuff */}
            <path
              d="M 420 572 L 463 586 L 456 600 L 414 585 Z"
              fill="#115e59"
              stroke="#fbbf24"
              strokeWidth="1.2"
            />
            {/* Sculpted Left Hand resting gracefully on table */}
            <path
              d="M 348 638 C 330 638, 314 644, 308 652 C 306 658, 318 662, 336 660 L 358 658 Z"
              fill="url(#ayeshaSkin3D)"
              stroke="#7d482a"
              strokeWidth="1.1"
            />
          </g>

          {/* Main Torso & Embroidered Sage-Teal Kurta */}
          <path
            d="M 482 458 C 515 446, 568 446, 598 462 C 622 515, 628 595, 624 670 L 460 670 C 458 595, 464 515, 482 458 Z"
            fill="url(#ayeshaKurtaGrad)"
            stroke="#042f2e"
            strokeWidth="1.8"
          />

          {/* Subtle Anatomical Bust & Torso Fabric Drape Creases */}
          <path
            d="M 488 535 C 512 552, 548 550, 568 532"
            fill="none"
            stroke="#042f2e"
            strokeWidth="1.8"
            opacity="0.45"
            strokeLinecap="round"
          />
          <path
            d="M 495 578 C 525 590, 562 588, 590 572"
            fill="none"
            stroke="#5eead4"
            strokeWidth="1.2"
            opacity="0.25"
            strokeLinecap="round"
          />

          {/* Traditional Gold Zari Embroidered Kurta Neckline (Gala) */}
          <path
            d="M 510 456 Q 534 494 562 456"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 535 478 L 535 552"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.2"
            strokeDasharray="5 4"
          />
          {/* Tiny Pearl Buttons on Placket */}
          <circle cx="535" cy="492" r="2.3" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
          <circle cx="535" cy="510" r="2.3" fill="#fef3c7" stroke="#b45009" strokeWidth="0.8" />
          <circle cx="535" cy="528" r="2.3" fill="#fef3c7" stroke="#b45009" strokeWidth="0.8" />

          {/* Draped Ivory & Gold-Edged Chiffon Dupatta Across Shoulder */}
          <path
            d="M 476 462 C 495 455, 520 468, 532 505 C 546 548, 578 595, 618 625 L 624 668 L 552 668 C 520 620, 488 558, 470 492 Z"
            fill="url(#ayeshaDupattaGrad)"
            stroke="#f59e0b"
            strokeWidth="1.6"
          />
          {/* Dupatta Zari Border Trim */}
          <path
            d="M 482 464 C 504 515, 536 585, 572 665"
            fill="none"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeDasharray="8 4"
            opacity="0.75"
          />
        </g>

        {/* ================================================================= */}
        {/* 3. AYESHA NECK & EXPRESSIVE SCULPTED HEAD (Facing Left/Window)     */}
        {/* ================================================================= */}
        <g
          id="ayesha-head-group"
          transform={`translate(538, 442) rotate(${-headPitch.toFixed(1)}) translate(-538, -442)`}
        >
          {/* Graceful Neck Cylinder with Clavicle Shadow */}
          <path
            d="M 522 412 L 520 462 C 528 474, 548 474, 556 462 L 554 412 Z"
            fill="url(#ayeshaLimbSkin)"
            stroke="#7d482a"
            strokeWidth="1.2"
          />
          {/* Chin Cast Shadow on Neck */}
          <path
            d="M 522 418 C 530 430, 545 432, 554 422 L 554 412 L 522 412 Z"
            fill="#5c3018"
            opacity="0.38"
          />

          {/* Sculpted 3/4 Female Facial Cranium & Jawline (Facing Left toward Phone & Window) */}
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

          {/* Soft Rose Cheek Blush, Sunlit Cheekbone Highlight & Cool Blue/White Laptop Screen Key-Light Rim */}
          <ellipse cx="512" cy="392" rx="14" ry="9" fill="url(#ayeshaCheekBlush)" />
          <ellipse cx="508" cy="382" rx="8" ry="4" fill="#fff7ed" opacity="0.35" transform="rotate(-12 508 382)" />
          <path
            d="M 501 338 C 492 356, 490 384, 496 406 C 500 416, 511 425, 523 426"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.8"
            opacity="0.45"
            strokeLinecap="round"
          />

          {/* Sculpted Nose Bridge & Tip (Facing Left) */}
          <path
            d="M 502 368 C 495 378, 488 386, 489 391 C 490 395, 497 396, 503 395"
            fill="none"
            stroke="#8c502b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M 501 370 L 492 388"
            fill="none"
            stroke="#fff7ed"
            strokeWidth="1.1"
            opacity="0.6"
            strokeLinecap="round"
          />

          {/* Expressive Arched Eyebrows */}
          <path
            d="M 493 360 Q 500 355 508 358"
            fill="none"
            stroke="#1e110a"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 516 359 Q 528 353 540 359"
            fill="none"
            stroke="#1e110a"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Eyes with Eyelashes, Dark Brown Iris & Dual Catchlights */}
          <g className="animate-ayesha-blink">
            {/* Far Left Eye */}
            <ellipse cx="500" cy="369" rx="5.5" ry="3.8" fill="#ffffff" stroke="#451a03" strokeWidth="0.9" />
            <circle cx="499" cy="369" r="2.8" fill="#291307" />
            <circle cx="499" cy="369" r="1.4" fill="#090504" />
            <circle cx="497.8" cy="367.8" r="1" fill="#ffffff" />
            <path d="M 493 368 Q 500 363 506 368" fill="none" stroke="#090504" strokeWidth="1.8" strokeLinecap="round" />

            {/* Near Right Eye */}
            <ellipse cx="527" cy="369" rx="7.5" ry="4.5" fill="#ffffff" stroke="#451a03" strokeWidth="1" />
            <circle cx="525" cy="369" r="3.6" fill="#3b1b0a" />
            <circle cx="525" cy="369" r="1.8" fill="#090504" />
            {/* Dual Specular Window Catchlights */}
            <circle cx="523.5" cy="367.5" r="1.3" fill="#ffffff" />
            <circle cx="526.8" cy="370.5" r="0.65" fill="#ffffff" opacity="0.85" />
            {/* Upper Eyelash Wing */}
            <path
              d="M 518 368 Q 527 362 537 367 L 540 365"
              fill="none"
              stroke="#090504"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            {/* Subtle Eyelid Crease */}
            <path
              d="M 519 364 Q 527 360 535 364"
              fill="none"
              stroke="#7d482a"
              strokeWidth="0.9"
              opacity="0.7"
            />
          </g>

          {/* Expressive Rose Lips (Gentle expectant expression, slight smile on notification) */}
          <path
            d={
              notificationActive
                ? 'M 495 406 Q 504 404 514 405 Q 506 413 495 406 Z'
                : 'M 495 407 Q 503 405 512 407 Q 504 411 495 407 Z'
            }
            fill="#be123c"
            stroke="#881337"
            strokeWidth="0.8"
          />
          <path
            d={notificationActive ? 'M 496 406 Q 504 409 514 404' : 'M 496 407 Q 503 408 512 407'}
            fill="none"
            stroke="#4c0519"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* Right Ear & Gold Jhumka Earring */}
          <path
            d="M 562 372 C 570 370, 574 382, 568 394 C 564 400, 558 398, 558 392"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1.1"
          />
          {/* Traditional Gold Stud & Hanging Jhumka Bell */}
          <circle cx="562" cy="394" r="2.8" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
          <path
            d="M 557 404 C 557 398, 567 398, 567 404 Z"
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth="0.8"
          />
          <circle cx="559" cy="406" r="1.1" fill="#fef08a" />
          <circle cx="562" cy="407" r="1.1" fill="#fef08a" />
          <circle cx="565" cy="406" r="1.1" fill="#fef08a" />

          {/* Swept Front Hair Crown & Side-Parted Bangs */}
          <path
            d="M 494 352
               C 496 326, 522 312, 554 318
               C 582 324, 596 352, 592 392
               C 588 424, 576 452, 568 468
               C 566 435, 572 396, 564 372
               C 556 352, 535 344, 514 342
               C 504 342, 498 346, 494 352 Z"
            fill="url(#ayeshaHairGrad)"
          />
          {/* Warm Window Sunlight Specular Hair Highlight */}
          <path
            d="M 508 330 C 528 322, 555 326, 572 342"
            fill="none"
            stroke="#a16207"
            strokeWidth="2.5"
            opacity="0.45"
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
          {/* PROP A: Back-Angled 3D Unibody Laptop                            */}
          {/* (Screen & Keyboard both face Ayesha; viewer only sees lid back)   */}
          {/* --------------------------------------------------------------- */}
          <g id="table-laptop" transform="translate(64, 526)">
            {/* Cool Blue/White Screen Light Pool Spilling Toward Ayesha Across Table */}
            <ellipse
              cx="210"
              cy="148"
              rx="145"
              ry="28"
              fill="url(#laptopScreenSpill)"
            />
            <polygon
              points="160,118 310,95 345,168 150,158"
              fill="url(#laptopScreenSpill)"
            />

            {/* Multi-Layered Ambient Occlusion & Cast Shadow Under Laptop Base */}
            <polygon
              points="38,154 186,136 216,148 54,168"
              fill="#090300"
              opacity="0.75"
            />
            <ellipse cx="125" cy="154" rx="88" ry="14" fill="#090300" opacity="0.48" />

            {/* Elastomeric Anti-Slip Rubber Feet Under Unibody Base */}
            <ellipse cx="50" cy="162" rx="7" ry="2.2" fill="#020617" />
            <ellipse cx="188" cy="144" rx="7" ry="2.2" fill="#020617" />

            {/* 3D Machined Aluminum Lower Base Chassis (Only Rear & Side Thickness Visible) */}
            {/* Left Profile Edge of Base Chassis (Showing thickness, ports & charging light) */}
            <polygon
              points="42,148 58,162 58,168 42,154"
              fill="url(#laptopDeckEdge3D)"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            {/* Rear Face of Base Chassis Under Hinge */}
            <polygon
              points="42,154 186,138 186,144 42,154"
              fill="#334155"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            {/* Specular Bottom Lip Along Base */}
            <line x1="42" y1="154" x2="186" y2="138" stroke="#64748b" strokeWidth="0.8" />

            {/* Ports on Left Side Chassis Profile */}
            {/* MagSafe 3 Port with Emerald Charging LED */}
            <polygon points="46,151 51,155 51,157 46,153" fill="#0f172a" stroke="#cbd5e1" strokeWidth="0.4" />
            <circle cx="48.5" cy="153.5" r="0.9" fill="#10b981" />
            {/* Dual Thunderbolt / USB-C Ports */}
            <polygon points="53,157 56,159.5 56,161.5 53,159" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.4" />

            {/* Black Anodized Clutch Hinge Cylinder Spanning the Base-to-Lid Joint */}
            <rect
              x="45"
              y="144"
              width="142"
              height="6.5"
              rx="2.5"
              fill="#090d16"
              stroke="#1e293b"
              strokeWidth="0.8"
              transform="rotate(-5.5 45 144)"
            />
            <line x1="58" y1="145" x2="175" y2="134" stroke="#334155" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />

            {/* ------------------------------------------------------------- */}
            {/* 3D Tilted Display Lid (Back Facing Camera, Screen Facing Ayesha) */}
            {/* ------------------------------------------------------------- */}
            {/* Sliver of Active Screen Glow Visible Around Right/Top Rim Facing Ayesha */}
            <polygon
              points="162,2 166,4 189,134 185,133"
              fill="#7dd3fc"
              opacity="0.9"
            />
            <line x1="164" y1="3" x2="188" y2="134" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />

            {/* 3D Top & Left Chamfered Metallic Edge Bevels */}
            <polygon
              points="20,18 162,2 165,4 23,20"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth="0.7"
            />
            <polygon
              points="20,18 23,20 46,150 43,148"
              fill="#cbd5e1"
              stroke="#475569"
              strokeWidth="0.7"
            />

            {/* Main Brushed Anodized Aluminum Lid Back Surface (Facing Viewer) */}
            <polygon
              points="22,19 164,3 186,133 44,149"
              fill="url(#laptopLid3D)"
              stroke="#64748b"
              strokeWidth="1.2"
            />

            {/* Subtle Diagonal Specular Window Sunlight Sheen Across Brushed Metal Lid */}
            <polygon
              points="42,16 96,9 138,138 84,145"
              fill="#ffffff"
              opacity="0.22"
            />
            <polygon
              points="104,8 126,5 164,136 144,138"
              fill="#ffffff"
              opacity="0.12"
            />

            {/* Chamfered Specular Hairline Around Lid Perimeter */}
            <polygon
              points="24,20.5 162,5 183.5,131.5 45.5,147"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="0.7"
              opacity="0.65"
            />

            {/* Polished Mirror-Chrome / Backlit Emblem Centered on Lid Back */}
            <g transform="translate(105, 68) rotate(-6) skewX(8)">
              {/* Outer Glowing Emblem Bevel */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#0f172a"
                fillOpacity="0.25"
                stroke="#f8fafc"
                strokeWidth="1.2"
              />
              {/* Polished Chrome Diamond/Compass Emblem Core */}
              <polygon
                points="0,-9 8,0 0,9 -8,0"
                fill="#f8fafc"
                stroke="#bae6fd"
                strokeWidth="0.8"
              />
              <polygon
                points="0,-5 4.5,0 0,5 -4.5,0"
                fill="#38bdf8"
                opacity="0.85"
              />
              {/* Top Leaf/Accent */}
              <path d="M 1 -10 C 4 -14, 8 -14, 7 -10 C 5 -8, 2 -8, 1 -10 Z" fill="#f8fafc" />
            </g>
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
              <circle cx="12" cy="11" r="3.5" fill="#10b981" />
              <text
                x="21"
                y="14.5"
                fill="#ecfdf5"
                fontSize="9.5"
                fontFamily="sans-serif"
                fontWeight="bold"
                letterSpacing="0.5"
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
                cy="16"
                rx="58"
                ry="26"
                fill="#10b981"
                opacity={notificationActive ? 0.48 : 0}
                style={{ mixBlendMode: 'screen' }}
              />

              {/* Multi-Layered Ambient Occlusion & Contact Shadow on Walnut Table */}
              <polygon
                points="-3,15 56,5 73,26 13,36"
                fill="#090300"
                opacity="0.78"
              />
              <ellipse cx="36" cy="22" rx="38" ry="12" fill="#090300" opacity="0.45" />

              {/* 3D Extruded Titanium Bottom & Front-Left Sidewall Rail (6.5px Thickness) */}
              <polygon
                points="-1,9 57,-1 71,19 13,29 13,35.5 -1,15.5"
                fill="url(#phoneTitaniumRail)"
                stroke="#1e293b"
                strokeWidth="0.9"
              />
              {/* Front-Bottom Titanium Sidewall Extrusion (Showing USB-C & Speaker Grille) */}
              <polygon
                points="13,29 71,19 71,25.5 13,35.5"
                fill="url(#phoneTitaniumRail)"
                stroke="#0f172a"
                strokeWidth="0.9"
              />
              {/* Left-Side Titanium Rail Extrusion (Showing Volume & Action Buttons) */}
              <polygon
                points="-1,9 13,29 13,35.5 -1,15.5"
                fill="#64748b"
                stroke="#1e293b"
                strokeWidth="0.8"
              />

              {/* Physical Side Buttons on Left Titanium Rail */}
              <polygon points="2,14.5 5,18.8 5,21 2,16.7" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
              <polygon points="6.5,21 10,26 10,28.2 6.5,23.2" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />

              {/* Bottom Edge USB-C Port & Speaker Micro-Perforations */}
              <polygon points="39,26.5 46,25.3 46,27.5 39,28.7" fill="#020617" stroke="#94a3b8" strokeWidth="0.4" />
              <circle cx="29" cy="29.3" r="0.7" fill="#0f172a" />
              <circle cx="32" cy="28.8" r="0.7" fill="#0f172a" />
              <circle cx="35" cy="28.3" r="0.7" fill="#0f172a" />
              <circle cx="50" cy="25.7" r="0.7" fill="#0f172a" />
              <circle cx="53" cy="25.2" r="0.7" fill="#0f172a" />
              <circle cx="56" cy="24.7" r="0.7" fill="#0f172a" />

              {/* Top Chamfered Titanium Bezel Rim */}
              <polygon
                points="-1,9 57,-1 71,19 13,29"
                fill="#0f172a"
                stroke={notificationActive ? '#34d399' : '#94a3b8'}
                strokeWidth="1.3"
              />

              {/* Smartphone Illuminated OLED Screen (Preserves tablePhoneScreenRef for rAF) */}
              <polygon
                ref={tablePhoneScreenRef}
                points="2.5,9.8 55.2,0.8 67.2,17.8 14.5,26.8"
                fill={notificationActive ? '#064e3b' : '#0f172a'}
              />

              {/* Diagonal Specular Glass Screen Reflection */}
              <polygon
                points="16,7.5 34,4.5 46,21.2 28,24.2"
                fill="#ffffff"
                opacity="0.12"
              />

              {/* Dynamic Island / Front Camera Pill Cutout on Upper Left of Screen */}
              <polygon
                points="6.5,14.5 9.5,14 13,19 10,19.5"
                fill="#020617"
                stroke="#334155"
                strokeWidth="0.4"
              />
              <circle cx="8.5" cy="15.5" r="0.7" fill="#0ea5e9" opacity="0.85" />

              {/* Lock-Screen Clock Display (11:42) */}
              <text
                x="17"
                y="15"
                fill="#f8fafc"
                fontSize="5.2"
                fontFamily="monospace"
                fontWeight="900"
                transform="rotate(-9.5 17 15) skewX(18)"
                opacity="0.92"
              >
                11:42
              </text>

              {/* WhatsApp Notification Banner Card on OLED Screen */}
              <polygon
                points="24,9.5 54,4.5 60,13 30,18"
                fill={notificationActive ? '#10b981' : '#1e293b'}
                stroke={notificationActive ? '#a7f3d0' : '#475569'}
                strokeWidth="0.6"
              />
              {/* Notification WhatsApp Badge Dot & Message Lines */}
              <circle cx="30" cy="12.5" r="1.8" fill={notificationActive ? '#022c22' : '#10b981'} />
              <line
                x1="34"
                y1="10.8"
                x2="52"
                y2="7.8"
                stroke={notificationActive ? '#022c22' : '#e2e8f0'}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line
                x1="35.5"
                y1="13.5"
                x2="55"
                y2="10.2"
                stroke={notificationActive ? '#ecfdf5' : '#94a3b8'}
                strokeWidth="1"
                strokeLinecap="round"
              />

              {/* Home Bar Indicator at Right/Bottom of Screen */}
              <line
                x1="58"
                y1="9"
                x2="63"
                y2="16"
                stroke="#cbd5e1"
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity="0.75"
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
          {/* Right Shoulder & Embroidered Sleeve */}
          <path
            d="M 562 472 C 594 476, 616 518, 608 578 L 564 584 C 566 535, 558 500, 548 482 Z"
            fill="url(#ayeshaKurtaGrad)"
            stroke="#042f2e"
            strokeWidth="1.6"
          />
          {/* Gold Cuff Trim */}
          <path
            d="M 562 576 L 609 572 L 607 586 L 560 590 Z"
            fill="#0f766e"
            stroke="#fbbf24"
            strokeWidth="1.4"
          />
          {/* Forearm & Hand Reaching Toward Table / Phone */}
          <path
            d="M 565 586 C 554 618, 530 642, 496 650 L 504 668 C 546 662, 584 635, 604 584 Z"
            fill="url(#ayeshaLimbSkin)"
            stroke="#7d482a"
            strokeWidth="1.2"
          />
          {/* Gold Ladies Wristwatch */}
          <g transform="translate(524, 638) rotate(-25)">
            <rect x="-4" y="-9" width="8" height="18" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="6" fill="#fef3c7" stroke="#b45309" strokeWidth="1.2" />
            <line x1="0" y1="0" x2="2" y2="-3" stroke="#78350f" strokeWidth="1" />
            <line x1="0" y1="0" x2="-3" y2="1" stroke="#78350f" strokeWidth="1" />
          </g>
          {/* Right Hand & Sculpted Fingers */}
          <path
            d="M 496 650 C 476 650, 458 656, 452 664 C 450 670, 464 674, 484 671 L 506 668 Z"
            fill="url(#ayeshaSkin3D)"
            stroke="#7d482a"
            strokeWidth="1.1"
          />
        </g>
      </g>
    );
  }
);

CustomerAyesha.displayName = 'CustomerAyesha';

export default CustomerAyesha;
