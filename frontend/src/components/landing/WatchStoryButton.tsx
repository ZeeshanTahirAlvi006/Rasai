import React from 'react';

export interface WatchStoryButtonProps {
  /**
   * Default text shown when idle (5 characters recommended)
   * @default "WATCH"
   */
  defaultText?: string;
  /**
   * Text revealed on hover (matches length of defaultText)
   * @default "STORY"
   */
  hoverText?: string;
  /**
   * Target anchor or URL
   * @default "#movie-scene-1"
   */
  href?: string;
  /**
   * Optional click handler
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Additional classes for the outer wrapper
   */
  className?: string;
}

/**
 * Animated 5-box hover button adapted from Uiverse.io by mrhyddenn.
 * Shows "WATCH" by default and slides alternating boxes to reveal "STORY" on hover,
 * styled interchangeably in black (#0b0b0b) and white (#ffffff).
 */
export const WatchStoryButton: React.FC<WatchStoryButtonProps> = ({
  defaultText = 'WATCH',
  hoverText = 'STORY',
  href = '#movie-scene-1',
  onClick,
  className = '',
}) => {
  const defaultChars = defaultText.toUpperCase().split('');
  const hoverChars = hoverText.toUpperCase().split('');

  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={`${defaultText} ${hoverText}`}
      className={`button group inline-flex rounded-lg overflow-hidden border border-white/80 shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:border-white hover:shadow-[0_0_16px_rgba(255,255,255,0.3)] transition-shadow duration-300 no-underline ${className}`}
    >
      {defaultChars.map((char, index) => {
        const hoverChar = hoverChars[index] ?? '';
        // 2nd and 4th boxes (1-indexed) slide from top (-100%), others from bottom (100%)
        const isFromTop = index % 2 === 1;

        return (
          <div
            key={index}
            data-hover={hoverChar}
            className={`box w-[22px] h-[28px] flex justify-center items-center font-sans text-[12px] font-bold transition-all duration-800 cursor-pointer relative overflow-hidden bg-[#0b0b0b] text-white before:bg-white before:text-[#0b0b0b] before:content-[attr(data-hover)] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:flex before:items-center before:justify-center before:transition-transform before:duration-400 group-hover:before:translate-y-0 ${
              isFromTop ? 'before:-translate-y-full' : 'before:translate-y-full'
            }`}
          >
            {char}
          </div>
        );
      })}
    </a>
  );
};

export default WatchStoryButton;
