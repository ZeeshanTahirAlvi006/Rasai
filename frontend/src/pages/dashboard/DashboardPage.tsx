import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import TrackingPortal from '../../components/TrackingPortal';
import CarrierHealthGrid from '../../components/CarrierHealthGrid';
import CircuitBreakerSimulator from '../../components/CircuitBreakerSimulator';
import ShipmentConsole from '../../components/shipments/ShipmentConsole';

interface DashboardPageProps {
  initialTab?: 'track' | 'health' | 'simulator' | 'shipments';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ initialTab = 'shipments' }) => {
  const [activeTab, setActiveTab] = useState<'track' | 'health' | 'simulator' | 'shipments'>(initialTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Animated Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px]"></div>
      </div>

      {/* Main Header / Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">
        {activeTab === 'track' && <TrackingPortal />}
        {activeTab === 'health' && <CarrierHealthGrid />}
        {activeTab === 'simulator' && <CircuitBreakerSimulator />}
        {activeTab === 'shipments' && <ShipmentConsole />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Rasai • Non Delivery Reporting System</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Leopards</span>
            <span>•</span>
            <span>PostEx</span>
            <span>•</span>
            <span>Trax</span>
            <span>•</span>
            <span>TCS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
