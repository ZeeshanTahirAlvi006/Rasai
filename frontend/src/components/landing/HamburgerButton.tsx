import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export interface HamburgerButtonProps {
  /**
   * Controlled open/active state
   */
  isOpen?: boolean;
  /**
   * Default state for uncontrolled usage
   */
  defaultOpen?: boolean;
  /**
   * Callback fired when checked/open state changes
   */
  onChange?: (isOpen: boolean) => void;
  /**
   * Optional click handler
   */
  onClick?: (event: React.MouseEvent<HTMLLabelElement>) => void;
  /**
   * Additional Tailwind or CSS classes for the wrapper label
   */
  className?: string;
  /**
   * Size of the SVG icon in pixels
   * @default 32
   */
  size?: number | string;
  /**
   * Stroke color for the lines (overrides theme default if provided)
   */
  strokeColor?: string;
  /**
   * Stroke width
   * @default 3
   */
  strokeWidth?: number;
  /**
   * Accessible label for screen readers
   * @default "Toggle navigation menu"
   */
  ariaLabel?: string;
  /**
   * HTML id for linking label with the hidden input
   */
  id?: string;
}

/**
 * Animated Hamburger button from Uiverse.io by JulanDeAlb.
 * Morphs between hamburger and 'X' with 600ms cubic-bezier stroke transition.
 * Uses the exact colors of the logo / hero section (Sand #c9a47a and Warm White #f4efe8).
 */
export const HamburgerButton: React.FC<HamburgerButtonProps> = ({
  isOpen,
  defaultOpen = false,
  onChange,
  onClick,
  className = '',
  size = 32,
  strokeColor,
  strokeWidth = 3,
  ariaLabel = 'Toggle navigation menu',
  id = 'uiverse-hamburger-checkbox',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isControlled = isOpen !== undefined;
  const checked = isControlled ? isOpen : internalOpen;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    if (!isControlled) {
      setInternalOpen(nextVal);
    }
    onChange?.(nextVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const nextVal = !checked;
      if (!isControlled) {
        setInternalOpen(nextVal);
      }
      onChange?.(nextVal);
    }
  };

  // Logo / Hero Section color palette
  // Dark mode: #f4efe8 (warm white) idle, #c9a47a (sand) on hover/checked
  // Light mode: #0b0b0b (base black) idle, #a57e52 (sand) on hover/checked
  const defaultStroke = isDark ? '#f4efe8' : '#0b0b0b';
  const accentStroke = isDark ? '#c9a47a' : '#a57e52';
  const effectiveStroke = strokeColor || (checked || isHovered ? accentStroke : defaultStroke);

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <label
      htmlFor={id}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-expanded={checked}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hamburger inline-flex items-center justify-center cursor-pointer select-none rounded-lg p-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
        isDark
          ? 'hover:bg-[#c9a47a]/15 focus-visible:ring-[#c9a47a]'
          : 'hover:bg-[#c9a47a]/20 focus-visible:ring-[#a57e52]'
      } ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleCheckboxChange}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full origin-center pointer-events-none"
        style={{
          transform: checked ? 'rotate(-45deg)' : 'none',
          transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <path
          className="line line-top-bottom fill-none"
          style={{
            stroke: effectiveStroke,
            strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeDasharray: checked ? '20 300' : '12 63',
            strokeDashoffset: checked ? '-32.42px' : '0px',
            transition:
              'stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke 300ms ease',
          }}
          d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
        />
        <path
          className="line fill-none"
          style={{
            stroke: effectiveStroke,
            strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            transition: 'stroke 300ms ease',
          }}
          d="M7 16 27 16"
        />
      </svg>
    </label>
  );
};

export default HamburgerButton;
