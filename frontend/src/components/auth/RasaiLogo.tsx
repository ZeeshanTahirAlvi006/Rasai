// src/components/auth/RasaiLogo.tsx
// Exact geometric emblem from the Rasai landing page
import React from 'react';
import { LOGO_PATHS } from '../landing/logoData';

interface RasaiLogoProps {
  size?: number;
  className?: string;
}

export const RasaiLogo: React.FC<RasaiLogoProps> = ({ size = 44, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="235 25 865 625"
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible', flexShrink: 0 }}
      aria-label="Rasai Logo"
    >
      <defs>
        <linearGradient
          id="rasai-grad-outer"
          x1="248"
          y1="497"
          x2="660"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#c8c8c8" />
          <stop offset="60%" stopColor="#e5e5e5" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient
          id="rasai-grad-inner"
          x1="376"
          y1="497"
          x2="895"
          y2="136"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#dcdcdc" />
          <stop offset="65%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient
          id="rasai-grad-lower"
          x1="524"
          y1="639"
          x2="922"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#b0b0b0" />
          <stop offset="55%" stopColor="#d6d6d6" />
          <stop offset="100%" stopColor="#f5f5f5" />
        </linearGradient>
        <linearGradient
          id="rasai-grad-arrow"
          x1="380"
          y1="570"
          x2="1050"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#d5d5d5" />
          <stop offset="42%" stopColor="#e8e8e8" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      <g id="rasai-logo-group">
        <path d={LOGO_PATHS.bodyOuter.d} fill="url(#rasai-grad-outer)" />
        {LOGO_PATHS.bodyOuter.bevels.map((b, i) => (
          <path key={`bo-${i}`} d={b.d} fill={b.fill} />
        ))}

        <path d={LOGO_PATHS.bodyInner.d} fill="url(#rasai-grad-inner)" />

        <path d={LOGO_PATHS.bodyLower.d} fill="url(#rasai-grad-lower)" />
        {LOGO_PATHS.bodyLower.bevels.map((b, i) => (
          <path key={`bl-${i}`} d={b.d} fill={b.fill} />
        ))}

        <path d={LOGO_PATHS.arrow.d} fill="url(#rasai-grad-arrow)" />
        {LOGO_PATHS.arrow.bevels.map((b, i) => (
          <path key={`ar-${i}`} d={b.d} fill={b.fill} />
        ))}
      </g>
    </svg>
  );
};

export default RasaiLogo;
