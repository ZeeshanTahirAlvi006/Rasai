import React, { forwardRef } from 'react';

export interface TapeDispenserGunProps extends React.SVGProps<SVGGElement> {
  /**
   * 'table': Resting horizontally on the workbench table / cutting mat with ambient shadow.
   * 'box': Positioned along the package seam with box contact shadow.
   * 'none': No shadow rendered under the dispenser gun.
   */
  variant?: 'table' | 'box' | 'none';
  /**
   * Optional scaling multiplier (defaults to 1).
   */
  scale?: number;
}

/**
 * Shared Industrial Packing Tape Dispenser Gun Component.
 * Used identically for both the resting workbench dispenser and the active parcel sealing roller.
 */
export const TapeDispenserGun = forwardRef<SVGGElement, TapeDispenserGunProps>(
  (
    {
      variant = 'box',
      scale = 1,
      children,
      transform,
      ...restProps
    },
    ref
  ) => {
    const innerTransform = scale !== 1 ? `scale(${scale})` : undefined;

    return (
      <g ref={ref} transform={transform} {...restProps}>
        <g transform={innerTransform}>
          {/* Ambient Table Shadow */}
          {variant === 'table' && (
            <ellipse
              cx="14"
              cy="40"
              rx="38"
              ry="14"
              fill="url(#softShadowRadial)"
              opacity="0.85"
            />
          )}

          {/* Parcel Top Contact Shadow */}
          {variant === 'box' && (
            <ellipse
              cx="10"
              cy="24"
              rx="28"
              ry="6"
              fill="#000000"
              opacity="0.35"
            />
          )}

          {/* Heavy Pistol Grip Handle with Ergonomic Ribbing */}
          <rect
            x="-14"
            y="8"
            width="14"
            height="32"
            rx="3"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="1.2"
            transform="rotate(12 -7 24)"
          />
          <rect
            x="-11"
            y="16"
            width="8"
            height="3"
            rx="0.8"
            fill="#334155"
            opacity="0.7"
            transform="rotate(12 -7 24)"
          />
          <rect
            x="-11"
            y="23"
            width="8"
            height="3"
            rx="0.8"
            fill="#334155"
            opacity="0.7"
            transform="rotate(12 -7 24)"
          />
          <rect
            x="-11"
            y="30"
            width="8"
            height="3"
            rx="0.8"
            fill="#334155"
            opacity="0.7"
            transform="rotate(12 -7 24)"
          />

          {/* Red Metal Housing Chassis Frame */}
          <path
            d="M -8 16 L 30 6 L 36 24 L -2 28 Z"
            fill="url(#tapeGunGrad)"
            stroke="#991b1b"
            strokeWidth="1.2"
          />

          {/* Heavy Brown Tape Spool Roll (4-Layer: Roll, Spool Layer, Core, Spindle Hub) */}
          <circle
            cx="6"
            cy="-4"
            r="24"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="1.4"
          />
          <circle cx="6" cy="-4" r="16.5" fill="#ca8a04" />
          <circle
            cx="6"
            cy="-4"
            r="9"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          <circle cx="6" cy="-4" r="4.5" fill="#1e293b" />

          {/* Front Rubber Applicator Guide Roller (Presses tape onto seam) */}
          <rect
            x="26"
            y="16"
            width="9"
            height="8"
            rx="2"
            fill="#334155"
            stroke="#1e293b"
            strokeWidth="0.8"
          />

          {/* Serrated Stainless Steel Cutter Blade */}
          <line
            x1="28"
            y1="8"
            x2="33"
            y2="22"
            stroke="url(#penChromeGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {children}
        </g>
      </g>
    );
  }
);

TapeDispenserGun.displayName = 'TapeDispenserGun';

export default TapeDispenserGun;
