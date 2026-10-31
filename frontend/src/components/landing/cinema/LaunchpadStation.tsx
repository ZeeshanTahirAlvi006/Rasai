import React, { useState } from 'react';
import { Link } from 'react-router';
import { Calculator, ArrowRight, ShieldCheck, Zap, Sparkles, UserPlus, LayoutDashboard } from 'lucide-react';
import { soundEngine } from './SoundEngine';

export const LaunchpadStation: React.FC = () => {
  const [monthlyOrders, setMonthlyOrders] = useState<number>(6000);
  const [rtoRate, setRtoRate] = useState<number>(24);

  // Typical Pakistan COD e-commerce math:
  // Avg COD order value ~ Rs. 3,500
  // Courier return delivery fee + packaging loss ~ Rs. 280/order
  // Rasai rescues ~45% of NDR attempts before RTO
  const ordersInNdr = monthlyOrders * (rtoRate / 100);
  const ordersRescued = Math.round(ordersInNdr * 0.45);
  const pkrRecovered = Math.round(ordersRescued * 3500 + ordersRescued * 280);

  const formattedPkr = new Intl.NumberFormat('en-PK').format(pkrRecovered);

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center px-6 sm:px-12 py-16 overflow-hidden">
      {/* Background Lumina Logistics Highway Sunset Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 filter grayscale contrast-125 transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url('/slide-1.jpg')` }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/80 to-transparent" />
      <div className="absolute inset-0 z-1 bg-radial from-transparent via-[#0b0b0b]/60 to-[#0b0b0b]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#141414]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center gap-10">
        {/* Left Column: Interactive COD Savings Calculator */}
        <div className="flex-1 space-y-5">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[#c9a47a]">
            <Sparkles className="w-3.5 h-3.5 text-[#c9a47a]" />
            <span>FINAL STOP • COD MARGIN RECOVERY CALCULATOR</span>
          </div>

          <h2 className="font-sans text-3xl sm:text-5xl font-bold leading-[1.08] text-white tracking-tight">
            Stop Bleeding Margins on Ghost Delivery Attempts
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#f4efe8]/75 leading-relaxed font-light">
            Adjust your monthly shipment parameters to calculate the immediate Cash-on-Delivery revenue and
            return-fee savings Rasai protects for your store.
          </p>

          {/* Calculator Sliders */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            {/* Slider 1: Monthly Shipments */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="text-white/70">Monthly COD Orders:</span>
                <span className="text-[#dfc29f] font-bold">{monthlyOrders.toLocaleString()} parcels</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={monthlyOrders}
                onChange={(e) => {
                  soundEngine.playRelayClick();
                  setMonthlyOrders(Number(e.target.value));
                }}
                className="w-full accent-[#c9a47a] cursor-pointer"
              />
            </div>

            {/* Slider 2: RTO / NDR Rate */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="text-white/70">Current Failure / RTO Rate:</span>
                <span className="text-[#f59e0b] font-bold">{rtoRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="1"
                value={rtoRate}
                onChange={(e) => {
                  soundEngine.playRelayClick();
                  setRtoRate(Number(e.target.value));
                }}
                className="w-full accent-[#f59e0b] cursor-pointer"
              />
            </div>

            {/* Calculated Output Box */}
            <div className="mt-4 p-4 rounded-xl bg-black/60 border border-[#c9a47a]/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-white/50 tracking-wider">
                  Estimated Monthly Cash Recovered:
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#10b981]">
                  Rs. {formattedPkr}
                </div>
                <div className="text-[10px] font-mono text-[#c9a47a]">
                  ~{ordersRescued} high-value parcels rescued from Return-to-Origin
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dual Action Launchpad */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          {/* Card 1: Open NDR Console */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#dfc29f] uppercase tracking-wider mb-1">
                <LayoutDashboard className="w-4 h-4 text-[#c9a47a]" />
                Live Sandbox Console
              </div>
              <h3 className="font-sans text-xl text-white mb-2 font-bold">
                Inspect Real-Time NDR Telemetry
              </h3>
              <p className="font-sans text-xs text-[#f4efe8]/70 leading-relaxed font-light mb-4">
                Explore the active carrier health grid, trigger test state mutations, and inspect canonical event ledgers.
              </p>
            </div>
            <Link
              to="/dashboard"
              onClick={() => soundEngine.playRelayClick()}
              className="w-full py-3 px-4 rounded-xl border border-white/30 hover:border-white hover:bg-white hover:text-black text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <span>Open NDR Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Pilot Merchant Enrollment */}
          <div className="p-6 rounded-2xl bg-[#1c1917]/90 border border-[#c9a47a]/50 hover:border-[#c9a47a] shadow-[0_0_25px_rgba(201,164,122,0.15)] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#c9a47a] uppercase tracking-wider mb-1">
                <UserPlus className="w-4 h-4 text-[#c9a47a]" />
                Pilot Program Access
              </div>
              <h3 className="font-sans text-xl text-white mb-2 font-bold">
                Deploy Rasai for Your Store
              </h3>
              <p className="font-sans text-xs text-[#f4efe8]/70 leading-relaxed font-light mb-4">
                Zero-setup CSV imports or API webhooks. Protect your PostEx, Trax, Leopards, and TCS shipments today.
              </p>
            </div>
            <Link
              to="/register"
              onClick={() => soundEngine.playRelayClick()}
              className="w-full py-3 px-4 rounded-xl bg-[#c9a47a] hover:bg-[#dfc29f] text-black font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,164,122,0.3)]"
            >
              <span>Register Store for Pilot</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchpadStation;
