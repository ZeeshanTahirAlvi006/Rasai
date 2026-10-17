import React, { useEffect } from 'react';
import HeroSection from '../components/landing/HeroSection';
import Scene1Packing from '../components/landing/movie/Scene1Packing';
import CustomScrollbar from '../components/landing/CustomScrollbar';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Completely hide default browser scrollbar while on the landing page
  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar');
    document.body.classList.add('no-scrollbar');

    return () => {
      document.documentElement.classList.remove('no-scrollbar');
      document.body.classList.remove('no-scrollbar');
    };
  }, []);

  return (
    <main
      className={`min-h-screen transition-colors duration-500 ${
        isDark ? 'bg-[#0b0b0b] text-white' : 'bg-[#0b0b0b] text-white'
      }`}
    >
      {/* Custom Scrollbar (hidden during story scenes, visible elsewhere) */}
      <CustomScrollbar />

      {/* Hero Section with Kinetic Emblem and Live Pakistan Clock */}
      <HeroSection
        ctaLabel="WATCH STORY"
        ctaHref="#movie-scene-1"
        timezoneLabel="Pakistan"
        timezoneIana="Asia/Karachi"
        navLinks={[
          { label: 'STORY', href: '#movie-scene-1' },
          { label: 'CONSOLE', href: '/dashboard' },
        ]}
      />

      {/* Target anchor for hero scroll down */}
      <div id="next" className="relative -top-2" />

      {/* Full-Screen Pure Scroll-Driven Scene 1: The Packing */}
      <Scene1Packing />
    </main>
  );
};

export default LandingPage;
