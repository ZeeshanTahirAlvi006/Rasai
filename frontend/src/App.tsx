import React from 'react';
import { Routes, Route } from 'react-router';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RegisterOtpPage from './pages/auth/RegisterOtpPage';
import DashboardPage from './pages/dashboard/DashboardPage';

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      data-theme={isDark ? 'black' : 'light'}
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#0b0b0b] text-white' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      <Routes>
        {/* Cinematic NDR Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Core Logistics Operations & Dashboard */}
        <Route path="/dashboard" element={<DashboardPage initialTab="shipments" />} />
        <Route path="/shipments" element={<DashboardPage initialTab="shipments" />} />
        <Route path="/carrier-health" element={<DashboardPage initialTab="health" />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<RegisterOtpPage />} />
      </Routes>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
