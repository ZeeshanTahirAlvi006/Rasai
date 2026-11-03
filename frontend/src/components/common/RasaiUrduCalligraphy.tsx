// src/components/common/RasaiUrduCalligraphy.tsx
// Official authentic Rasai Urdu calligraphy extracted from the master identity typography
import React from 'react';

export interface RasaiUrduCalligraphyProps {
  /** Height in pixels or CSS string (default: 26) */
  height?: number | string;
  /** Width in pixels or CSS string. If omitted, aspect-ratio (2.091 : 1) preserves geometry */
  width?: number | string;
  /** Color variant: 'white' for dark theme, 'dark' for light theme, or 'warm' for original warm-white */
  variant?: 'white' | 'dark' | 'warm';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const RasaiUrduCalligraphy: React.FC<RasaiUrduCalligraphyProps> = ({
  height = 26,
  width,
  variant = 'white',
  className = '',
  style = {},
  title = 'رسائی',
}) => {
  const imgSrc =
    variant === 'dark'
      ? '/rasai_urdu_dark.png'
      : variant === 'warm'
      ? '/rasai_urdu.png'
      : '/rasai_urdu_white.png';

  const numericHeight = typeof height === 'number' ? `${height}px` : height;
  const computedWidth =
    width !== undefined
      ? typeof width === 'number'
        ? `${width}px`
        : width
      : undefined;

  return (
    <img
      src={imgSrc}
      alt={title}
      title={title}
      draggable={false}
      loading="eager"
      decoding="async"
      className={`inline-block select-none pointer-events-none object-contain ${className}`}
      style={{
        height: numericHeight,
        width: computedWidth || 'auto',
        aspectRatio: '1058 / 506',
        maxHeight: '100%',
        ...style,
      }}
    />
  );
};

export default RasaiUrduCalligraphy;
