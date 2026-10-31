import React, { useEffect } from 'react';
import HeroSection from '../components/landing/HeroSection';
import MovieTheater from '../components/landing/movie/MovieTheater';
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
      className={`relative w-full min-h-screen transition-colors duration-500 overflow-x-clip ${
        isDark ? 'bg-[#0b0b0b] text-white' : 'bg-[#0b0b0b] text-white'
      }`}
    >
      {/* Custom Scrollbar (hidden during story scenes, visible elsewhere) */}
      <CustomScrollbar />

      {/* Hero Section with Kinetic Emblem and Live Pakistan Clock */}
      <HeroSection
        ctaLabel="WATCH STORY"
        ctaHref="#movie-theater"
        timezoneLabel="Pakistan"
        timezoneIana="Asia/Karachi"
        navLinks={[
          { label: 'STORY', href: '#movie-theater' },
          { label: 'CONSOLE', href: '/dashboard' },
        ]}
      />

      {/* Target anchor for hero scroll down */}
      <div id="next" className="relative -top-2" />

      {/* Full-Screen Pure Scroll-Driven Cinematic Story (Scenes 1 & 2) */}
      <MovieTheater />
    </main>
  );
};

export default LandingPage;
