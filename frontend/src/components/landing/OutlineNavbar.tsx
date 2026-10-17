import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface OutlineNavbarProps {
  /**
   * Navigation items (4 items for SVG stroke bracketing)
   * @default ['Home', 'Contact', 'About', 'FAQ']
   */
  items?: NavItem[];
  /**
   * Currently active item index
   */
  activeIndex?: number;
  /**
   * Callback fired when an item is clicked
   */
  onSelect?: (index: number, item: NavItem) => void;
  /**
   * Override theme mode: 'auto' (default), 'dark', or 'light'
   */
  themeMode?: 'auto' | 'dark' | 'light';
  /**
   * Additional wrapper classes
   */
  className?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { label: 'Home', href: '#' },
  { label: 'Contact', href: '#contact' },
  { label: 'About', href: '#next' },
  { label: 'FAQ', href: '#faq' },
];

// Stroke definitions for the 4 button hover states
const STROKE_STATES: Record<number, { array: string; offset: number }> = {
  0: { array: '0 2 8 73.3 8 10.7', offset: 0 },
  1: { array: '0 12.6 9.5 49.3 9.5 31.6', offset: 0 },
  2: { array: '0 24.5 8.5 27.5 8.5 55.5', offset: 0 },
  3: { array: '0 34.7 6.9 10.2 6.9 76', offset: 0 },
};

// Full border around the entire navbar when idle (prevents border from being shrunk or pushed to the left)
const IDLE_STROKE = {
  array: '100 0',
  offset: 0,
};

/**
 * Uiverse.io Outline Navbar (by SelfMadeSystem).
 * Complete perimeter border around the entire navbar when idle; dynamically glides and brackets buttons on hover.
 * Fully compatible with Dark and Light modes using the NDR brand palette.
 */
export const OutlineNavbar: React.FC<OutlineNavbarProps> = ({
  items = DEFAULT_ITEMS,
  activeIndex,
  onSelect,
  themeMode = 'auto',
  className = '',
}) => {
  const { theme: contextTheme } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [internalActive, setInternalActive] = useState<number | undefined>(activeIndex);

  const effectiveTheme = themeMode === 'auto' ? contextTheme : themeMode;
  const isDark = effectiveTheme === 'dark';

  const strokeConfig =
    hoveredIndex !== null && STROKE_STATES[hoveredIndex]
      ? STROKE_STATES[hoveredIndex]
      : IDLE_STROKE;

  const handleItemClick = (index: number, item: NavItem, e: React.MouseEvent) => {
    if (!item.href || item.href === '#') {
      e.preventDefault();
    }
    setInternalActive(index);
    item.onClick?.();
    onSelect?.(index, item);
  };

  return (
    <div
      className={`uiverse-nav nav relative w-[400px] h-[60px] select-none ${
        isDark ? 'uiverse-nav-dark' : 'uiverse-nav-light'
      } ${className}`}
    >
      <div
        className={`uiverse-nav-container container absolute inset-0 flex flex-row justify-around items-center px-2 rounded-lg backdrop-blur-xl transition-all duration-300 ${
          isDark
            ? 'bg-[#141414]/85 border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
            : 'bg-[#f4efe8]/90 border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.18)]'
        }`}
      >
        {items.slice(0, 4).map((item, index) => {
          const isCurrent = (activeIndex ?? internalActive) === index;
          return (
            <a
              key={item.label}
              href={item.href || '#'}
              onClick={(e) => handleItemClick(index, item, e)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`uiverse-nav-btn btn relative px-4 py-2 text-xs font-semibold tracking-[0.05em] uppercase rounded-md cursor-pointer transition-all duration-200 z-10 ${
                isDark
                  ? `text-[#f4efe8] hover:bg-white/15 hover:text-white ${
                      isCurrent ? 'bg-white/20 text-white' : ''
                    }`
                  : `text-[#0b0b0b] hover:bg-white/40 hover:text-[#0b0b0b] ${
                      isCurrent ? 'bg-white/50 text-[#0b0b0b]' : ''
                    }`
              }`}
            >
              {item.label}
            </a>
          );
        })}

        {/* Animated Outline SVG (Full perimeter when idle, morphs to bracket buttons on hover) */}
        <svg
          className="uiverse-nav-outline outline absolute inset-0 pointer-events-none w-[400px] h-[60px] rounded-lg"
          overflow="visible"
          width="400"
          height="60"
          viewBox="0 0 400 60"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            className="uiverse-nav-rect rect"
            pathLength="100"
            x="0"
            y="0"
            width="400"
            height="60"
            rx="8"
            ry="8"
            fill="transparent"
            strokeWidth="3"
            style={{
              stroke: '#ffffff',
              strokeDasharray: strokeConfig.array,
              strokeDashoffset: strokeConfig.offset,
              transition: 'stroke-dashoffset 0.5s ease, stroke-dasharray 0.5s ease, stroke 0.3s ease',
              filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))',
            }}
          />
        </svg>
      </div>
    </div>
  );
};

export default OutlineNavbar;
