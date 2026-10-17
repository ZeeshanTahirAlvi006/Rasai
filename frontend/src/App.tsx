import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const RegisterOtpPage = lazy(() => import('./pages/auth/RegisterOtpPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

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
      <Suspense fallback={<div className="min-h-screen bg-[#0b0b0b]" />}>
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
      </Suspense>
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
