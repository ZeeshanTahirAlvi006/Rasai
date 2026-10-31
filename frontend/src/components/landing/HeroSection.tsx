import React, { useState, useEffect } from 'react';
import StarfieldCanvas from './StarfieldCanvas';
import RasaiChoreography from './RasaiChoreography';
import HamburgerButton from './HamburgerButton';
import OutlineNavbar from './OutlineNavbar';
import WatchStoryButton from './WatchStoryButton';
import { useTheme } from '../../context/ThemeContext';

export interface HeroSectionProps {
  captionTitle?: string;
  captionDetail?: string;
  ctaLabel?: string;
  ctaHref?: string;
  navLinks?: Array<{ label: string; href: string }>;
  timezoneLabel?: string;
  timezoneIana?: string;
  pageIndex?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  ctaLabel = 'WATCH STORY',
  ctaHref = '#next',
  navLinks: _navLinks = [
    { label: 'CARRIERS', href: '#carriers' },
    { label: 'VERIFICATION', href: '#verification' },
    { label: 'RESOLUTION', href: '#resolution' },
  ],
  timezoneLabel = 'Pakistan',
  timezoneIana = 'Asia/Karachi',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [defaultWord = 'WATCH', hoverWord = 'STORY'] = ctaLabel.trim().split(/\s+/);

  // Clock state
  const [timeString, setTimeString] = useState<string>('--:--');
  // Mobile overlay state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  // Hyperspace warp speed state synced with RasaiChoreography (2.3s -> 5.0s)
  const [isWarpSpeed, setIsWarpSpeed] = useState<boolean>(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Live Local-Time Clock (Updated every 30 seconds)
  useEffect(() => {
    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: timezoneIana,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        setTimeString(formatter.format(new Date()));
      } catch {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setTimeString(`${hh}:${mm}`);
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, [timezoneIana]);

  return (
    <section
      className={`relative w-full h-screen min-h-dvh overflow-hidden select-none transition-colors duration-500 ${
        isDark ? 'bg-[#010101] text-white' : 'bg-[#010101] text-white'
      }`}
      aria-label="Hero Section"
    >
      {/* Full-Screen 3D Starry & Hyperspace Background covering 100% of Hero width & height on all devices */}
      <StarfieldCanvas warpSpeed={isWarpSpeed} className="z-0" />

      {/* Kinetic Emblem + Stacked Urdu/English Brand Reveal Stage */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10">
        <RasaiChoreography onWarpChange={setIsWarpSpeed} />
      </div>

      {/* Header section with Outline Navbar on left, live clock & CTA on right */}
      <header className="absolute top-0 left-0 w-full px-5 sm:px-7 py-4.5 z-60 flex items-center justify-between gap-4 animate-fade-in-header">
        {/* MOBILE BRAND (below 768px only) */}
        <span
          className={`md:hidden font-urdu text-[22px] select-none leading-none transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          رسائی
        </span>

        {/* LEFT: Outline Navbar (Desktop) */}
        <div className="hidden md:flex items-center">
          <OutlineNavbar
            items={[
              { label: 'Home', href: '#' },
              { label: 'Contact', href: '#contact' },
              { label: 'About', href: '#next' },
              { label: 'FAQ', href: '#faq' },
            ]}
          />
        </div>

        {/* RIGHT: Clock & CTA (Desktop) */}
        <div className="hidden md:flex items-center gap-5 lg:gap-7 shrink-0">
          <div
            className={`font-sans text-[12px] font-semibold tracking-[0.02em] uppercase whitespace-nowrap transition-colors ${
              isDark ? 'text-[#f4efe8]' : 'text-[#0b0b0b]'
            }`}
          >
            {timeString} {timezoneLabel}
          </div>
          <WatchStoryButton
            defaultText={defaultWord}
            hoverText={hoverWord}
            href={ctaHref}
          />
        </div>

        {/* MOBILE CONTROLS (Animated Hamburger) */}
        <div className="flex md:hidden items-center justify-end">
          <HamburgerButton
            isOpen={isMenuOpen}
            onChange={(open) => setIsMenuOpen(open)}
            ariaLabel={isMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            size={32}
          />
        </div>
      </header>

      {/* ====================================================================
          BOTTOM ROW (ANIMATED SCROLL TO EXPLORE ANCHOR)
          ==================================================================== */}
      <footer
        className="absolute bottom-4 sm:bottom-5.5 left-7 right-7 z-20 font-sans text-[11px] sm:text-[12px] font-semibold tracking-[0.06em] animate-fade-in-bottom select-none"
      >
        <div className="main__action flex justify-center items-center">
          <a
            href="#next"
            onClick={(e) => {
              e.preventDefault();
              const nextEl = document.getElementById('movie-scene-1') || document.getElementById('next');
              if (nextEl) {
                nextEl.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`main__scroll group flex flex-col items-center gap-1 cursor-pointer transition-colors duration-200 no-underline ${
              isDark
                ? 'text-[#f4efe8]/80 hover:text-[#c9a47a]'
                : 'text-slate-800/85 hover:text-[#a57e52]'
            }`}
            aria-label="Scroll to explore"
          >
            <div className="main__scroll-box w-5 h-5 flex items-center justify-center animate-scroll-down transition-transform duration-300">
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <path d="M11.9997 13.1716L7.04996 8.22186L5.63574 9.63607L11.9997 16L18.3637 9.63607L16.9495 8.22186L11.9997 13.1716Z" />
              </svg>
            </div>

            <span className="main__scroll-text uppercase tracking-[0.08em] whitespace-nowrap">
              SCROLL TO EXPLORE
            </span>
          </a>
        </div>
      </footer>

      {/* ====================================================================
          MOBILE FULL-SCREEN OVERLAY MENU
          ==================================================================== */}
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-between px-7 pt-24 pb-7 transition-all duration-300 ${
          isDark ? 'bg-[#141414] text-[#f4efe8]' : 'bg-[#f4efe8] text-[#0b0b0b]'
        } ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!isMenuOpen}
      >
        <nav className="flex flex-col gap-6" aria-label="Mobile Menu Links">
          {[
            { label: 'Home', href: '#' },
            { label: 'Contact', href: '#contact' },
            { label: 'About', href: '#next' },
            { label: 'FAQ', href: '#faq' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={`font-sans font-medium text-[clamp(2.5rem,10vw,4rem)] leading-[1.1] transition-opacity duration-200 tracking-[-0.01em] hover:opacity-60 ${
                isDark ? 'text-[#f4efe8]' : 'text-[#0b0b0b]'
              }`}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2">
            <WatchStoryButton
              defaultText={defaultWord}
              hoverText={hoverWord}
              href={ctaHref}
              onClick={() => setIsMenuOpen(false)}
            />
          </div>
        </nav>

        <div
          className={`flex justify-start items-center font-sans text-[12px] font-semibold uppercase tracking-[0.02em] ${
            isDark ? 'text-[#f4efe8]/70' : 'text-[#0b0b0b]/70'
          }`}
        >
          <span>
            {timeString} {timezoneLabel}
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
