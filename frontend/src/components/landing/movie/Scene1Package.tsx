// src/components/landing/movie/Scene1Package.tsx
// Sealed 3D isometric kraft COD parcel from Scene 1 with authentic stencils, tape, and Leopards shipping label.

import React from 'react';

export interface Scene1PackageProps extends React.SVGProps<SVGGElement> {
  /**
   * Whether to render the criss-cross bungee shock cords with steel tie-down hooks.
   */
  showStraps?: boolean;
}

/**
 * Authentic 3D Isometric Shipping Parcel from Scene 1.
 * - Multi-stop kraft cardboard gradients (boxFrontGrad, boxTopGrad, boxSideGrad)
 * - Micro-flute kraft grain patterns with angled and skewed surface orientations
 * - Center top seam sealed with brown translucent fiberglass packing tape
 * - Crisp Leopards COD Express shipping label featuring Rs. 4,500 Cash-On-Delivery
 * - Bilingual "FRAGILE / احتیاط" warning stamp & circular "VERIFIED LAHORE DISPATCH" ink stamp
 * - Manufacturer copper staples & side-face handling stencils (This Way Up, Umbrella, Recycled)
 * - Heavy-duty criss-cross elastic bungee shock cords with steel J-hooks
 */
export const Scene1Package: React.FC<Scene1PackageProps> = ({
  showStraps = true,
  transform,
  ...restProps
}) => {
  return (
    <g id="scene1-cod-package" transform={transform} {...restProps}>
      <defs>
        {/* 3D Parcel Cardboard Shaders */}
        <linearGradient id="s1pkg_boxFrontGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#bd8147" />
          <stop offset="100%" stopColor="#99602b" />
        </linearGradient>

        <linearGradient id="s1pkg_boxTopGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#d1a66b" />
          <stop offset="100%" stopColor="#b4854b" />
        </linearGradient>

        <linearGradient id="s1pkg_boxSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7a4b1f" />
          <stop offset="100%" stopColor="#553111" />
        </linearGradient>

        {/* Brown Translucent Packing Tape with Central Sunlight Sheen */}
        <linearGradient id="s1pkg_tapeStripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e29b43" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#fff3db" stopOpacity="0.82" />
          <stop offset="70%" stopColor="#b66714" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#824304" stopOpacity="0.9" />
        </linearGradient>

        {/* Cardboard Kraft Grain Pattern (Front Face) */}
        <pattern id="s1pkg_kraftGrain" width="40" height="10" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="40" y2="2" stroke="#5a330e" strokeWidth="0.8" opacity="0.22" />
          <line x1="0" y1="4" x2="40" y2="4" stroke="#fef3c7" strokeWidth="0.5" opacity="0.12" />
          <line x1="0" y1="7" x2="40" y2="7" stroke="#3b1f0b" strokeWidth="0.7" opacity="0.18" />
          <line x1="0" y1="9" x2="40" y2="9" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
          <circle cx="8" cy="3" r="0.8" fill="#3b1f0b" opacity="0.28" />
          <circle cx="28" cy="8" r="0.9" fill="#3b1f0b" opacity="0.24" />
          <circle cx="18" cy="5" r="0.6" fill="#fef3c7" opacity="0.32" />
        </pattern>

        {/* Top Face Angled Flute Pattern (-29.05° isometric angle) */}
        <pattern
          id="s1pkg_kraftGrainTop"
          width="30"
          height="15"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-29.05)"
        >
          <line x1="0" y1="3" x2="30" y2="3" stroke="#5a330e" strokeWidth="0.8" opacity="0.22" />
          <line x1="0" y1="7" x2="30" y2="7" stroke="#fef3c7" strokeWidth="0.5" opacity="0.14" />
          <line x1="0" y1="11" x2="30" y2="11" stroke="#3b1f0b" strokeWidth="0.7" opacity="0.18" />
          <circle cx="12" cy="5" r="0.7" fill="#3b1f0b" opacity="0.25" />
          <circle cx="24" cy="12" r="0.6" fill="#fef3c7" opacity="0.28" />
        </pattern>

        {/* Side Face Skewed Flute Pattern */}
        <pattern
          id="s1pkg_kraftGrainSide"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
          patternTransform="skewY(-29.05)"
        >
          <line x1="0" y1="4" x2="24" y2="4" stroke="#3b1f0b" strokeWidth="1" opacity="0.32" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="#fef3c7" strokeWidth="0.5" opacity="0.12" />
          <line x1="0" y1="20" x2="24" y2="20" stroke="#251205" strokeWidth="0.8" opacity="0.25" />
        </pattern>

        {/* Fiberglass Reinforced Packing Tape Grid */}
        <pattern id="s1pkg_tapeFiber" width="12" height="12" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="12" y2="12" stroke="#ffffff" strokeWidth="0.6" opacity="0.3" />
          <line x1="12" y1="0" x2="0" y2="12" stroke="#ffffff" strokeWidth="0.6" opacity="0.3" />
          <line x1="0" y1="6" x2="12" y2="6" stroke="#ffffff" strokeWidth="0.4" opacity="0.2" />
        </pattern>
      </defs>

      {/* Ground / Rack Contact Ambient Shadow */}
      <polygon points="-4,72 116,72 148,55 142,50 -2,68" fill="#020617" opacity="0.6" />

      {/* ===================================================================
          1. 3D BASE FACES (Front: 116x72, Top: dx=30, dy=-17, Side: dx=30, dy=-17)
         =================================================================== */}
      {/* Front Face */}
      <polygon points="0,0 116,0 116,72 0,72" fill="url(#s1pkg_boxFrontGrad)" />
      {/* Top Face */}
      <polygon points="0,0 30,-17 146,-17 116,0" fill="url(#s1pkg_boxTopGrad)" />
      {/* Side Face */}
      <polygon points="116,0 146,-17 146,55 116,72" fill="url(#s1pkg_boxSideGrad)" />

      {/* 2. Micro-Flute Kraft Texture Overlays */}
      <polygon points="0,0 116,0 116,72 0,72" fill="url(#s1pkg_kraftGrain)" />
      <polygon points="0,0 30,-17 146,-17 116,0" fill="url(#s1pkg_kraftGrainTop)" />
      <polygon points="116,0 146,-17 146,55 116,72" fill="url(#s1pkg_kraftGrainSide)" />

      {/* 3. Authentic Fold Creases & Sunlight Rim Highlights */}
      <line x1="0" y1="0" x2="116" y2="0" stroke="#fef08a" strokeWidth="1.2" opacity="0.5" />
      <line x1="116" y1="0" x2="116" y2="72" stroke="#251205" strokeWidth="2.2" opacity="0.75" />
      <line x1="0" y1="0" x2="0" y2="72" stroke="#3b1f0b" strokeWidth="1.8" opacity="0.6" />
      <line x1="116" y1="0" x2="146" y2="-17" stroke="#fef08a" strokeWidth="2" opacity="0.75" />
      <line x1="146" y1="-17" x2="146" y2="55" stroke="#fef08a" strokeWidth="1.6" opacity="0.6" />
      <line x1="0" y1="0" x2="30" y2="-17" stroke="#fef08a" strokeWidth="1.1" opacity="0.35" />

      {/* 4. Manufacturer Joint Heavy Copper Staples along Left Seam */}
      {[12, 34, 56].map((stapleY, idx) => (
        <rect
          key={idx}
          x="2"
          y={stapleY}
          width="2"
          height="8.5"
          rx="0.6"
          fill="#b45309"
          stroke="#78350f"
          strokeWidth="0.6"
        />
      ))}

      {/* 5. Box Manufacturer's Certificate (BMC) Circular Ink Stamp */}
      <g transform="translate(62, 54)">
        <circle cx="0" cy="0" r="11" fill="none" stroke="#3b1f0b" strokeWidth="0.9" strokeDasharray="8 2 10 2" opacity="0.55" />
        <circle cx="0" cy="0" r="8.5" fill="none" stroke="#3b1f0b" strokeWidth="0.5" opacity="0.5" />
        <text x="0" y="-4.5" fill="#3b1f0b" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" opacity="0.6">
          BOX CERTIFICATE
        </text>
        <text x="0" y="-1.5" fill="#3b1f0b" fontSize="2" fontFamily="sans-serif" textAnchor="middle" opacity="0.55">
          SINGLEWALL
        </text>
        <text x="0" y="2" fill="#3b1f0b" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" opacity="0.6">
          BURST 200 LBS
        </text>
        <text x="0" y="5.5" fill="#3b1f0b" fontSize="1.9" fontFamily="sans-serif" textAnchor="middle" opacity="0.5">
          LAHORE PK
        </text>
      </g>

      {/* 6. Handling Stencils on Isometric Side Face (Skewed to match perspective) */}
      <g transform="translate(121, -3) skewY(-29.05)">
        {/* THIS WAY UP Arrows */}
        <g transform="translate(4, 5)">
          <line x1="0" y1="12" x2="0" y2="2" stroke="#251205" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <path d="M-2.2 5 L0 1 L2.2 5" fill="none" stroke="#251205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </g>
        <g transform="translate(14, 5)">
          <line x1="0" y1="12" x2="0" y2="2" stroke="#251205" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <path d="M-2.2 5 L0 1 L2.2 5" fill="none" stroke="#251205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </g>
        {/* Keep Dry Umbrella */}
        <g transform="translate(6, 22)">
          <path d="M0 4.5 Q 4.5 -1.5 9 4.5 Z" fill="#251205" opacity="0.8" />
          <line x1="4.5" y1="3" x2="4.5" y2="10" stroke="#251205" strokeWidth="1" opacity="0.8" />
          <path d="M4.5 10 Q 3.5 12 2 11.2" fill="none" stroke="#251205" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>
        {/* Stencil Legend */}
        <text x="11" y="38" fill="#251205" fontSize="3.8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" opacity="0.8">
          MAX: 35 KG
        </text>
        <text x="11" y="47" fill="#251205" fontSize="4.2" fontFamily="sans-serif" textAnchor="middle" opacity="0.75">
          ♲ RECYCLED
        </text>
        <text x="11" y="55" fill="#251205" fontSize="3.2" fontFamily="sans-serif" textAnchor="middle" opacity="0.65">
          LOT #PK-409
        </text>
      </g>

      {/* 7. Top Flute Edge Cut Line & Sealed Brown Packing Tape */}
      <line x1="15" y1="-8.5" x2="131" y2="-8.5" stroke="#3b1f0b" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.6" />

      {/* Sealed Packing Tape across Top Seam */}
      <polygon
        points="10,-6 24,-13.5 136,-13.5 122,-6"
        fill="url(#s1pkg_tapeStripGrad)"
        opacity="0.95"
      />
      <polygon
        points="10,-6 24,-13.5 136,-13.5 122,-6"
        fill="url(#s1pkg_tapeFiber)"
        opacity="0.45"
      />

      {/* Front Face Tape Overlap Lip */}
      <polygon
        points="52,0 66,0 66,22 52,22"
        fill="url(#s1pkg_tapeStripGrad)"
        opacity="0.92"
      />
      <polygon
        points="52,0 66,0 66,22 52,22"
        fill="url(#s1pkg_tapeFiber)"
        opacity="0.45"
      />

      {/* ===================================================================
          8. CRISP SHIPPING LABEL ON FRONT FACE (LEOPARDS COD EXPRESS)
         =================================================================== */}
      <g transform="translate(8, 10)">
        {/* Label Drop Shadow */}
        <rect x="1" y="1.5" width="62" height="42" rx="2" fill="#000000" fillOpacity="0.32" />
        {/* Label White Cardstock */}
        <rect width="62" height="42" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
        {/* Slate Navy Header Ribbon */}
        <rect x="0" y="0" width="62" height="8.5" fill="#0f172a" rx="1.5" />
        <text x="3.5" y="6" fill="#f59e0b" fontSize="3.8" fontFamily="sans-serif" fontWeight="bold" letterSpacing="0.4">
          LEOPARDS COD EXPRESS
        </text>

        {/* Barcode Graphic */}
        <g transform="translate(3.5, 11)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#000" strokeWidth="1" />
          <line x1="2" y1="0" x2="2" y2="8" stroke="#000" strokeWidth="0.5" />
          <line x1="4" y1="0" x2="4" y2="8" stroke="#000" strokeWidth="1.2" />
          <line x1="6.5" y1="0" x2="6.5" y2="8" stroke="#000" strokeWidth="0.6" />
          <line x1="9" y1="0" x2="9" y2="8" stroke="#000" strokeWidth="1.2" />
          <line x1="11.5" y1="0" x2="11.5" y2="8" stroke="#000" strokeWidth="0.5" />
          <line x1="14" y1="0" x2="14" y2="8" stroke="#000" strokeWidth="1" />
          <line x1="17" y1="0" x2="17" y2="8" stroke="#000" strokeWidth="1.4" />
          <line x1="20" y1="0" x2="20" y2="8" stroke="#000" strokeWidth="0.6" />
        </g>

        {/* Destination & Tracking Details */}
        <text x="27" y="14.5" fill="#0f172a" fontSize="3.6" fontFamily="sans-serif" fontWeight="bold">
          DEST: LAHORE, PK
        </text>
        <text x="27" y="19" fill="#475569" fontSize="3" fontFamily="sans-serif">
          TRK: #PK-8842
        </text>

        {/* Red COD Highlight Badge */}
        <rect x="3" y="22.5" width="56" height="16.5" rx="1.5" fill="#fef2f2" stroke="#ef4444" strokeWidth="0.6" />
        <text x="5" y="28" fill="#991b1b" fontSize="3.2" fontFamily="sans-serif" fontWeight="bold">
          CASH ON DELIVERY (COD):
        </text>
        <text x="5" y="36" fill="#b91c1c" fontSize="6.4" fontFamily="sans-serif" fontWeight="900">
          RS. 4,500 /-
        </text>
      </g>

      {/* ===================================================================
          9. BILINGUAL FRAGILE STAMP (Top-Right of Front Face)
         =================================================================== */}
      <g transform="translate(76, 8) rotate(-4)">
        <rect width="36" height="15" rx="2" fill="none" stroke="#dc2626" strokeWidth="1.1" strokeDasharray="2,1.2" />
        <text x="4" y="6.8" fill="#dc2626" fontSize="4.6" fontFamily="sans-serif" fontWeight="900" letterSpacing="0.8">
          FRAGILE
        </text>
        <text x="6" y="12.4" fill="#dc2626" fontSize="4.2" fontFamily="sans-serif" fontWeight="bold">
          احتیـــاط
        </text>
      </g>

      {/* ===================================================================
          10. CIRCULAR "VERIFIED LAHORE DISPATCH" STAMP (From Scene 1)
         =================================================================== */}
      <g transform="translate(94, 44) rotate(-9)">
        <circle cx="0" cy="0" r="16" fill="none" stroke="#09090b" strokeWidth="1.4" strokeDasharray="30 1.5 18 1.5 12 1.5" opacity="0.92" />
        <circle cx="0" cy="0" r="13.5" fill="#09090b" fillOpacity="0.04" stroke="#09090b" strokeWidth="0.7" opacity="0.85" />
        <circle cx="0" cy="0" r="11" fill="none" stroke="#09090b" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.75" />
        <text x="0" y="-7.5" fill="#09090b" fontSize="3" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.8" opacity="0.85">
          ★ ★ ★
        </text>
        <text x="0" y="-3.5" fill="#09090b" fontSize="2.8" fontFamily="sans-serif" fontWeight="800" textAnchor="middle" letterSpacing="0.6" opacity="0.8">
          VERIFIED
        </text>
        <text x="0" y="0.5" fill="#09090b" fontSize="3.4" fontFamily="sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="0.6">
          NDR-OPS
        </text>
        <text x="0" y="4" fill="#09090b" fontSize="2.4" fontFamily="sans-serif" fontWeight="600" textAnchor="middle" opacity="0.75">
          LAHORE DISPATCH
        </text>
        <text x="0" y="7.5" fill="#09090b" fontSize="2" fontFamily="sans-serif" textAnchor="middle" opacity="0.7">
          PK-409 • EXP
        </text>
      </g>

      {/* ===================================================================
          11. HEAVY-DUTY BUNGEE SHOCK CORDS & STEEL J-HOOKS (BIKE TIE-DOWN)
         =================================================================== */}
      {showStraps && (
        <g id="bungee-tie-downs">
          {/* Diagonal Strap 1: Top-Left to Bottom-Right */}
          <line x1="8" y1="-8" x2="114" y2="72" stroke="#020617" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="8" y1="-8" x2="114" y2="72" stroke="#eab308" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />

          {/* Diagonal Strap 2: Bottom-Left to Top-Right */}
          <line x1="4" y1="70" x2="124" y2="-6" stroke="#020617" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="4" y1="70" x2="124" y2="-6" stroke="#eab308" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />

          {/* Steel J-Hooks Anchored to Rack */}
          <path d="M 4 70 C 2 73, 2 77, 5 78 C 8 79, 9 76, 7 74" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 114 72 C 116 75, 116 78, 119 79 C 122 80, 123 77, 121 75" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="-8" r="2" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="124" cy="-6" r="2" fill="#475569" stroke="#cbd5e1" strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
};

export default Scene1Package;
