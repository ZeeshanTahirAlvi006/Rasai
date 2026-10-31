// src/components/landing/movie/HondaCD70.tsx
// High-fidelity vector illustration of the iconic Atlas Honda CD 70 motorcycle,
// utilizing PBR shaders, authentic red fuel tank, chrome fenders, and rotating wheels.

import React, { forwardRef } from 'react';
import { Scene1Package } from './Scene1Package';

export interface HondaCD70Props extends React.SVGProps<SVGGElement> {
  frontWheelRef?: React.RefObject<SVGGElement | null>;
  rearWheelRef?: React.RefObject<SVGGElement | null>;
  isMoving?: boolean;
  showCargoRack?: boolean;
  cargoContent?: React.ReactNode;
}

/**
 * Authentic Atlas Honda CD 70 Motorcycle Component.
 * - Precision-engineered chassis with red frame, candy-red teardrop fuel tank & side covers
 * - Concentric chrome fenders front & rear with authentic mudflap & bracket
 * - 36-wire rotating spoke wheels with high-tensile nipples, chrome rims & road tire tread
 * - 72cc horizontal 4-stroke engine block with cooling fins & round HONDA crankcase
 * - Long tubular chrome exhaust pipe with brushed aluminum heat shield
 * - Telescopic front suspension with red fork covers and box halogen headlight
 * - Dual black commuter seat with white stamped "HONDA" logo and rear luggage rack
 */
export const HondaCD70 = forwardRef<SVGGElement, HondaCD70Props>(
  (
    {
      frontWheelRef,
      rearWheelRef,
      isMoving = true,
      showCargoRack = true,
      cargoContent,
      transform,
      ...restProps
    },
    ref
  ) => {
    return (
      <g
        ref={ref}
        id="honda-cd70-motorcycle"
        transform={transform}
        {...restProps}
      >
        <defs>
          {/* PBR Chrome Gradient */}
          <linearGradient id="chromeMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="75%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Candy Red Tank & Frame Gradient */}
          <linearGradient id="hondaRedTank" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="18%" stopColor="#ef4444" />
            <stop offset="55%" stopColor="#b91c1c" />
            <stop offset="85%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>

          {/* Headlight Volumetric Cone Beam */}
          <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#fde047" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </linearGradient>

          {/* Cardboard Kraft Box Gradient */}
          <linearGradient id="cardboardBox" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="55%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Wheel Hub Cast Alloy */}
          <linearGradient id="wheelAlloy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Convex Rearview Mirror Reflective Glass */}
          <linearGradient id="rearviewMirrorGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#bae6fd" />
            <stop offset="65%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Prismatic Fresnel Headlight Glass Lens */}
          <linearGradient id="cd70FresnelLens" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#fde047" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0.95" />
          </linearGradient>

          {/* Glowing Tungsten Halogen Bulb Core */}
          <radialGradient id="cd70HalogenBulb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#fffbeb" />
            <stop offset="55%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
        </defs>

        {/* Calibrated transform to seat seamlessly in Scene 2 (Wheelbase 360px at hubs 780,800 and 1140,800) */}
        <g id="MotorcycleCD70" transform="translate(780, 800) scale(0.947368) translate(-235, -442)">
          {/* ============================================================= */}
          {/* 1. REAR WHEEL ASSEMBLY (Hub at 235, 442)                       */}
          {/* ============================================================= */}
          <g id="cd70-rear-wheel-assembly" transform="translate(235, 442)">
            {/* Ground Contact Shadow */}
            <ellipse cx="0" cy="80" rx="76" ry="8" fill="#020617" opacity="0.6" />

            {/* Rotating Wheel Group (Controlled via rearWheelRef or internal rAF) */}
            <g ref={rearWheelRef}>
              {/* Outer Black Road Tire (2.25-17) */}
              <circle r="74" fill="none" stroke="#111827" strokeWidth="18" />
              <circle r="74" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
              <circle r="66" fill="none" stroke="#09090b" strokeWidth="1.5" />

              {/* Chrome Metal 17" Rim */}
              <circle r="63" fill="none" stroke="url(#chromeMetal)" strokeWidth="5" />
              <circle r="60.5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.8" />

              {/* 36 Criss-Cross High-Tensile Wire Spokes */}
              {Array.from({ length: 18 }).map((_, i) => (
                <g key={`rw-spoke-${i}`}>
                  <line
                    x1="0"
                    y1="-62"
                    x2="0"
                    y2="62"
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                    transform={`rotate(${i * 10})`}
                  />
                  <line
                    x1="-2"
                    y1="-62"
                    x2="2"
                    y2="62"
                    stroke="#f8fafc"
                    strokeWidth="0.8"
                    opacity="0.85"
                    transform={`rotate(${i * 10 + 5})`}
                  />
                </g>
              ))}

              {/* Cast Aluminum Drum Hub & Fasteners */}
              <circle r="18" fill="url(#chromeMetal)" stroke="#1e293b" strokeWidth="2" />
              <circle r="8" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
            </g>
          </g>

          {/* ============================================================= */}
          {/* 2. FRONT WHEEL ASSEMBLY (Hub at 615, 442)                      */}
          {/* ============================================================= */}
          <g id="cd70-front-wheel-assembly" transform="translate(615, 442)">
            {/* Ground Contact Shadow */}
            <ellipse cx="0" cy="80" rx="76" ry="8" fill="#020617" opacity="0.6" />

            {/* Rotating Wheel Group (Controlled via frontWheelRef or internal rAF) */}
            <g ref={frontWheelRef}>
              {/* Outer Black Road Tire (2.25-17) */}
              <circle r="74" fill="none" stroke="#111827" strokeWidth="17" />
              <circle r="74" fill="none" stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
              <circle r="66" fill="none" stroke="#09090b" strokeWidth="1.5" />

              {/* Chrome Metal 17" Rim */}
              <circle r="63" fill="none" stroke="url(#chromeMetal)" strokeWidth="5" />
              <circle r="60.5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.8" />

              {/* 36 Criss-Cross High-Tensile Wire Spokes */}
              {Array.from({ length: 18 }).map((_, i) => (
                <g key={`fw-spoke-${i}`}>
                  <line
                    x1="0"
                    y1="-62"
                    x2="0"
                    y2="62"
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                    transform={`rotate(${i * 10})`}
                  />
                  <line
                    x1="-2"
                    y1="-62"
                    x2="2"
                    y2="62"
                    stroke="#f8fafc"
                    strokeWidth="0.8"
                    opacity="0.85"
                    transform={`rotate(${i * 10 + 5})`}
                  />
                </g>
              ))}

              {/* Cast Aluminum Drum Hub */}
              <circle r="16" fill="url(#chromeMetal)" stroke="#1e293b" strokeWidth="2" />
              <circle r="7" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
            </g>
          </g>

          {/* ============================================================= */}
          {/* 3. CONCENTRIC CHROME FENDERS (MUDGUARDS)                       */}
          {/* ============================================================= */}
          {/* Concentric Rear Chrome Mudguard */}
          <path
            d="M 152 435 A 86 86 0 0 1 316 415"
            fill="none"
            stroke="url(#chromeMetal)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M 154 434 A 84 84 0 0 1 314 416"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            opacity="0.95"
            strokeLinecap="round"
          />

          {/* Concentric Front Chrome Mudguard */}
          <path
            d="M 532 420 A 84 84 0 0 1 692 405"
            fill="none"
            stroke="url(#chromeMetal)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M 534 419 A 82 82 0 0 1 690 406"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            opacity="0.95"
            strokeLinecap="round"
          />
          {/* Black Rubber Front Mudflap */}
          <polygon points="530,420 536,423 532,438 524,435" fill="#18181b" stroke="#09090b" strokeWidth="0.8" />

          {/* ============================================================= */}
          {/* 4. REAR LUGGAGE CARRIER RACK & AUTHENTIC SCENE 1 COD PARCEL   */}
          {/* ============================================================= */}
          {showCargoRack && (
            <g id="DeliveryCargo">
              {/* Chrome Luggage Platform Support Structure Underneath */}
              <path
                d="M 166 332 L 166 350 L 325 350 M 186 350 L 235 442 M 212 350 L 235 442 M 166 340 L 210 340"
                fill="none"
                stroke="url(#chromeMetal)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="166" cy="332" r="3.5" fill="url(#chromeMetal)" stroke="#334155" strokeWidth="1" />

              {/* Authentic Sealed 3D Shipping Parcel from Scene 1 */}
              {cargoContent ? (
                cargoContent
              ) : (
                <Scene1Package transform="translate(180, 276)" showStraps={true} />
              )}
            </g>
          )}

          {/* ============================================================= */}
          {/* 5. RED FRAME, SIDE COVERS & "CD 70" BADGING                   */}
          {/* ============================================================= */}
          <path
            d="M 272 356 L 420 356 L 538 302 L 468 426 L 348 426 Z"
            fill="none"
            stroke="#b91c1c"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          {/* CD-70 Side Panel */}
          <polygon
            points="342,374 415,374 405,428 358,428"
            fill="url(#hondaRedTank)"
            stroke="#450a0a"
            strokeWidth="1.5"
          />
          {/* Speed Wing Decals */}
          <polygon points="348,386 398,384 388,396 346,398" fill="#38bdf8" />
          <polygon points="348,392 392,390 385,398 346,400" fill="#facc15" />
          <text x="356" y="416" fill="#ffffff" fontSize="10" fontWeight="bold" fontStyle="italic">
            CD 70
          </text>

          {/* ============================================================= */}
          {/* 6. ENGINE: 72cc HORIZONTAL 4-STROKE POWERPLANT               */}
          {/* ============================================================= */}
          <g id="Engine">
            <rect x="405" y="416" width="96" height="44" rx="6" fill="url(#chromeMetal)" stroke="#334155" strokeWidth="2" />
            {[...Array(5)].map((_, i) => (
              <line
                key={i}
                x1="445"
                y1={422 + i * 7}
                x2="498"
                y2={420 + i * 7}
                stroke="#1e293b"
                strokeWidth="2.5"
              />
            ))}
            {/* Round Aluminum Magneto / Crankcase Cover */}
            <circle cx="392" cy="452" r="32" fill="url(#chromeMetal)" stroke="#475569" strokeWidth="2" />
            <circle cx="392" cy="452" r="14" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
            <text x="377" y="455" fill="#0f172a" fontSize="7.5" fontWeight="900" letterSpacing="0.8">
              HONDA
            </text>
          </g>

          {/* ============================================================= */}
          {/* 7. CHAIN GUARD, CHROME DUAL SHOCKS & EXHAUST SYSTEM          */}
          {/* ============================================================= */}
          <path
            d="M 235 436 L 362 432 L 362 458 L 235 454 Z"
            fill="#94a3b8"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Rear Shock Absorber */}
          <line x1="278" y1="356" x2="242" y2="438" stroke="#1e293b" strokeWidth="9" />
          <line
            x1="278"
            y1="356"
            x2="242"
            y2="438"
            stroke="url(#chromeMetal)"
            strokeWidth="11"
            strokeDasharray="5 5"
          />

          {/* Chrome Silencer Exhaust Pipe */}
          <path
            d="M 495 445 C 535 445, 535 492, 495 492 L 128 490"
            fill="none"
            stroke="url(#chromeMetal)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <rect x="215" y="482" width="145" height="12" rx="4" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />

          {/* ============================================================= */}
          {/* 8. FRONT FORKS & CLASSIC CD 70 HEADLIGHT                      */}
          {/* ============================================================= */}
          <line x1="528" y1="282" x2="615" y2="442" stroke="url(#chromeMetal)" strokeWidth="10" strokeLinecap="round" />
          <line x1="532" y1="286" x2="568" y2="352" stroke="#b91c1c" strokeWidth="13" strokeLinecap="round" />

          {/* Classic Atlas Honda CD 70 Prismatic Box Headlight Assembly */}
          <g id="CD70HeadlightAssembly" transform="translate(548, 288)">
            {/* Matte Black Outer Housing Bucket with Side Fastener */}
            <path d="M 0 6 L 27 0 L 27 44 L 0 38 Z" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
            <circle cx="8" cy="22" r="2.8" fill="url(#chromeMetal)" stroke="#090d16" strokeWidth="0.8" />

            {/* Deep Parabolic Chrome Reflector Dish */}
            <ellipse cx="26" cy="22" rx="6" ry="21" fill="url(#chromeMetal)" stroke="#1e293b" strokeWidth="1.5" />

            {/* Fluted Prismatic Fresnel Glass Lens */}
            <ellipse cx="27" cy="22" rx="4.5" ry="19.5" fill="url(#cd70FresnelLens)" stroke="url(#chromeMetal)" strokeWidth="2.8" />
            {/* Vertical Prismatic Refractive Ribs */}
            <line x1="26" y1="8" x2="26" y2="36" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
            <line x1="28" y1="6" x2="28" y2="38" stroke="#ffffff" strokeWidth="1" opacity="0.85" />
            <line x1="24.5" y1="12" x2="24.5" y2="32" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />

            {/* Glowing Tungsten Halogen Bulb Filament Hot-Spot */}
            <circle cx="26" cy="22" r="3.8" fill="url(#cd70HalogenBulb)" />
            <circle cx="26.5" cy="22" r="1.4" fill="#ffffff" />

            {/* Chrome Front Bezel Specular Glint */}
            <path d="M 28 4 C 30 10, 30 18, 29 24" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />

            {/* Classic Side Amber Indicator Lamp with Mounting Stalk */}
            <rect x="3" y="-8" width="10" height="7" rx="1.5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <ellipse cx="8" cy="-5" rx="6.5" ry="5.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
            <ellipse cx="8" cy="-5" rx="3.5" ry="2.5" fill="#fef08a" opacity="0.85" />
          </g>

          {/* ============================================================= */}
          {/* 9. DUAL COMMUTER SEAT WITH "HONDA" STAMP                      */}
          {/* ============================================================= */}
          <path
            d="M 272 336 C 315 335, 385 338, 422 346 L 420 366 L 270 362 C 264 355, 265 340, 272 336 Z"
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth="2"
          />
          <text x="278" y="354" fill="#d4d4d8" fontSize="7" fontWeight="bold">
            HONDA
          </text>

          {/* ============================================================= */}
          {/* 10. ICONIC TEARDROP RED FUEL TANK WITH GOLDEN HONDA WING      */}
          {/* ============================================================= */}
          <path
            d="M 418 346 C 425 310, 482 296, 540 315 C 555 320, 558 342, 540 348 C 502 354, 445 352, 418 346 Z"
            fill="url(#hondaRedTank)"
            stroke="#450a0a"
            strokeWidth="1.5"
          />
          {/* Tank Top Specular Sunlight Sheen */}
          <path
            d="M 442 316 C 472 307, 512 310, 535 320"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Tank Multi-Color Graphics & Golden Feather */}
          <polygon points="438,334 528,326 518,338 432,340" fill="#facc15" />
          <polygon points="452,330 532,322 526,330 448,334" fill="#ffffff" />
          <text x="482" y="334" fill="#111827" fontSize="8" fontWeight="900">
            HONDA
          </text>

          {/* ============================================================= */}
          {/* 11. CHROME HANDLEBARS & REARVIEW MIRROR                       */}
          {/* ============================================================= */}
          <path
            d="M 534 290 C 528 268, 516 264, 495 268"
            fill="none"
            stroke="url(#chromeMetal)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Mirror Stem & Mounting Nut on Right Handlebar */}
          <line x1="515" y1="265" x2="508" y2="225" stroke="url(#chromeMetal)" strokeWidth="3" />
          <polygon points="513,266 517,266 518,261 512,261" fill="#94a3b8" stroke="#334155" strokeWidth="0.8" />
          <circle cx="508" cy="225" r="3" fill="#475569" stroke="url(#chromeMetal)" strokeWidth="1" />
          {/* Mirror Housing & Reflective Convex Glass Face */}
          <g transform="rotate(-15 505 218)">
            <ellipse
              cx="505"
              cy="218"
              rx="8"
              ry="12"
              fill="#1e293b"
              stroke="url(#chromeMetal)"
              strokeWidth="2.5"
            />
            <ellipse cx="505" cy="218" rx="6.5" ry="10.5" fill="url(#rearviewMirrorGlass)" />
            <path
              d="M 501 210 Q 507 218 503 226"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          </g>
        </g>
      </g>
    );
  }
);

HondaCD70.displayName = 'HondaCD70';

export default HondaCD70;
