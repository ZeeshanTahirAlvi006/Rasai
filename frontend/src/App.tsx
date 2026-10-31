// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ShipmentInspectionProvider } from './context/ShipmentInspectionContext';
import LandingPage from './pages/LandingPage';
import TerminalAppShell from './components/layout/TerminalAppShell';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const RegisterOtpPage = lazy(() => import('./pages/auth/RegisterOtpPage'));

// Core Operations
const ExecutiveOverviewPage = lazy(() => import('./pages/dashboard/ExecutiveOverviewPage'));
const NdrTriagePage = lazy(() => import('./pages/dashboard/NdrTriagePage'));
const ShipmentsDirectoryPage = lazy(() => import('./pages/dashboard/ShipmentsDirectoryPage'));

// Customer Comms
const ConversationsTab = lazy(() => import('./components/shipments/ConversationsTab'));
const OutboxTab = lazy(() => import('./components/shipments/OutboxTab'));

// Logistics
const ManifestsTab = lazy(() => import('./components/shipments/ManifestsTab'));

// Finance & Disputes
const DisputesTab = lazy(() => import('./components/shipments/DisputesTab'));

// Diagnostics
const CarrierHealthGrid = lazy(() => import('./components/CarrierHealthGrid'));
const CarriersPollerTab = lazy(() => import('./components/shipments/CarriersPollerTab'));
const CircuitBreakerSimulator = lazy(() => import('./components/CircuitBreakerSimulator'));
const EventLedgerTab = lazy(() => import('./components/shipments/EventLedgerTab'));
const TrackingPortal = lazy(() => import('./components/TrackingPortal'));

// Settings
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      data-theme={isDark ? 'black' : 'light'}
      className={`min-h-screen font-sans transition-colors duration-150 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-xs text-zinc-500">INITIALIZING TERMINAL...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/track" element={<div className="p-4"><TrackingPortal /></div>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<RegisterOtpPage />} />

          {/* Authenticated Command Center Shell */}
          <Route element={<TerminalAppShell />}>
            {/* Core Operations */}
            <Route path="/dashboard" element={<ExecutiveOverviewPage />} />
            <Route path="/triage" element={<NdrTriagePage />} />
            <Route path="/shipments" element={<ShipmentsDirectoryPage />} />

            {/* Customer Comms */}
            <Route path="/conversations" element={<ConversationsTab />} />
            <Route path="/outbox" element={<OutboxTab />} />

            {/* Logistics */}
            <Route path="/manifests" element={<ManifestsTab />} />

            {/* Finance & Disputes */}
            <Route path="/disputes" element={<DisputesTab />} />

            {/* Diagnostics */}
            <Route path="/system/carrier-health" element={<CarrierHealthGrid />} />
            <Route path="/system/poller" element={<CarriersPollerTab />} />
            <Route path="/system/simulator" element={<CircuitBreakerSimulator />} />
            <Route path="/system/ledger" element={<EventLedgerTab />} />
            <Route path="/system/tracking" element={<TrackingPortal />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Redirects & Fallback */}
            <Route path="/carrier-health" element={<Navigate to="/system/carrier-health" replace />} />
          </Route>

          {/* Catch-all redirect to /dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ShipmentInspectionProvider>
        <AppContent />
      </ShipmentInspectionProvider>
    </ThemeProvider>
  );
};

export default App;
