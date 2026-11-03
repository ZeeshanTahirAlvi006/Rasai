// src/components/auth/RasaiBrandHeader.tsx
// Top-of-screen branding bar: English "rasai" on top left, borderless logo in center, Urdu "رسائی" on top right
import React from 'react';
import { Link } from 'react-router';
import { RasaiLogo } from './RasaiLogo';
import { RasaiUrduCalligraphy } from '../common/RasaiUrduCalligraphy';

interface RasaiBrandHeaderProps {
  className?: string;
}

export const RasaiBrandHeader: React.FC<RasaiBrandHeaderProps> = ({ className = '' }) => {
  return (
    <header className={`rasai-screen-header ${className}`}>
      <div className="rasai-header-inner">
        {/* Top Left: English "rasai" */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          title="Return to Home"
        >
          <span
            style={{
              fontFamily: 'var(--font-sans, "Inter Tight", "Inter", sans-serif)',
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              lineHeight: 1,
              textTransform: 'lowercase',
              transition: 'opacity 0.2s ease',
            }}
            className="hover:opacity-80"
          >
            rasai
          </span>
        </Link>

        {/* Center: Logo emblem without any borders or container box */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: 0,
            transition: 'transform 0.3s ease',
          }}
          className="hover:scale-105"
          title="Rasai"
        >
          <RasaiLogo size={46} />
        </Link>

        {/* Top Right: Urdu "رسائی" */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          title="Return to Home"
        >
          <RasaiUrduCalligraphy
            height={26}
            variant="white"
            className="hover:opacity-80 transition-opacity"
          />
        </Link>
      </div>
    </header>
  );
};

export default RasaiBrandHeader;
