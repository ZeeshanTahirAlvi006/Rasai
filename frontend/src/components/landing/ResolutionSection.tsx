import React from 'react';
import { Link } from 'react-router';
import { useTheme } from '../../context/ThemeContext';

export const ResolutionSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const steps = [
    {
      index: '01',
      tag: 'TELEMETRY & GEOFENCING',
      title: 'Doorstep Rider Validation',
      description:
        'Prevents fake delivery scans. The moment a courier marks a parcel as "Customer Unavailable" or "Door Closed", the system checks GPS proximity against the customer coordinates. If the rider never entered the delivery geofence, the failure scan is intercepted immediately.',
    },
    {
      index: '02',
      tag: 'OMNI-CHANNEL ESCALATION',
      title: 'Instant Buyer Re-Engagement',
      description:
        'Before the rider departs the neighborhood, automated interactive WhatsApp prompts and priority IVR calls engage the recipient. The buyer verifies in two taps whether they are home or need a specific time slot.',
    },
    {
      index: '03',
      tag: 'DYNAMIC RESCHEDULING',
      title: 'Live Address & Slot Correction',
      description:
        'Recipients drop a live pin or select an alternate delivery window (e.g. evening or next morning). The courier dispatch console updates immediately, turning an imminent Return-To-Origin (RTO) into a completed cash-on-delivery transaction.',
    },
    {
      index: '04',
      tag: 'CIRCUIT BREAKER',
      title: 'Carrier Health Throttling',
      description:
        'Real-time circuit breakers monitor delivery exception rates across major logistics networks (Leopards, PostEx, Trax, TCS). When abnormal failure spikes occur in a specific zone, shipments automatically reroute to healthiest carriers.',
    },
  ];

  const carriers = ['LEOPARDS', 'POSTEX', 'TRAX', 'TCS', 'BLUEEX', 'SWYFT'];

  return (
    <section
      id="about"
      className={`min-h-screen px-7 py-28 md:py-36 relative transition-colors duration-500 ${isDark ? 'bg-base text-warm-white' : 'bg-[#fbf9f5] text-base'
        }`}
      aria-label="NDR Resolution Architecture"
    >
      <div id="next" className="absolute -top-12 left-0" />

      {/* Editorial Header */}
      <div className="max-w-6xl mx-auto mb-20 md:mb-28">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-sans text-[12px] font-semibold tracking-[0.2em] text-sand">
            How Rasai Resolves The Cash-On-Delivery Crisis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <h2
            className={`md:col-span-8 font-sans font-semibold text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[1.02] tracking-[-0.02em] ${isDark ? 'text-white' : 'text-[#0b0b0b]'
              }`}
          >
            Eliminating Failed Attempts And Rider Fraud Before Return To Origin
          </h2>
          <p
            className={`md:col-span-4 font-sans text-[13px] leading-relaxed font-light ${isDark ? 'text-warm-white/70' : 'text-[#0b0b0b]/70'
              }`}
          >
            Cash on Delivery accounts for over 80% of regional e-commerce shipments, but fake rider cancellation scans and address ambiguities erode margins. NDR intercepts exceptions in real time.
          </p>
        </div>
      </div>

      {/* 4-Step Architecture Grid */}
      <div
        className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16 border-t pt-16 mb-24 transition-colors ${isDark ? 'border-white/10' : 'border-slate-300'
          }`}
      >
        {steps.map((step) => (
          <div key={step.index} className="flex flex-col justify-between group">
            <div>
              <div
                className={`flex items-baseline justify-between border-b pb-4 mb-6 transition-colors ${isDark ? 'border-white/10' : 'border-slate-300'
                  }`}
              >
                <span className="font-sans text-[11px] font-semibold tracking-[0.2em] text-sand uppercase">
                  {step.tag}
                </span>
                <span
                  className={`font-sans text-[12px] font-light tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'
                    }`}
                >
                  {step.index}
                </span>
              </div>
              <h3
                className={`font-sans font-semibold text-[clamp(1.75rem,2.8vw,2.5rem)] leading-tight mb-4 uppercase ${isDark ? 'text-white' : 'text-slate-900'
                  }`}
              >
                {step.title}
              </h3>
              <p
                className={`font-sans text-[13px] leading-relaxed font-light ${isDark ? 'text-warm-white/75' : 'text-slate-600'
                  }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Carrier Network Strip */}
      <div
        className={`max-w-6xl mx-auto border-t border-b py-10 mb-20 transition-colors ${isDark ? 'border-white/10' : 'border-slate-300'
          }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <span
            className={`font-sans text-[11px] font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-white/50' : 'text-slate-500'
              }`}
          >
            INTEGRATED CARRIER TELEMETRY
          </span>
          <div className="flex flex-wrap items-center gap-8 md:gap-12">
            {carriers.map((carrier) => (
              <span
                key={carrier}
                className={`font-sans text-[13px] font-light tracking-[0.3em] uppercase transition-colors duration-200 ${isDark
                    ? 'text-white hover:text-sand'
                    : 'text-slate-800 hover:text-sky-600'
                  }`}
              >
                {carrier}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Editorial Call To Action (Anchored with id="contact") */}
      <div
        id="contact"
        className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pt-6"
      >
        <div>
          <span
            className={`font-sans font-semibold text-2xl md:text-3xl uppercase block mb-2 ${isDark ? 'text-white' : 'text-slate-900'
              }`}
          >
            READY TO RECOVER FAILED SHIPMENTS?
          </span>
          <span
            className={`font-sans text-xs tracking-wider uppercase block ${isDark ? 'text-white/60' : 'text-slate-600'
              }`}
          >
            Access live shipment tracking, carrier health diagnostics, and circuit breaker simulation.
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-3 font-sans text-xs font-semibold tracking-wider uppercase border px-6 py-3.5 transition-all duration-300 ${isDark
                ? 'text-white border-white/30 hover:border-white hover:bg-white hover:text-black'
                : 'text-slate-900 border-slate-900 hover:bg-slate-900 hover:text-white'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-sand" />
            <span>OPEN NDR CONSOLE</span>
          </Link>
          <Link
            to="/login"
            className={`font-sans text-xs font-semibold tracking-wider uppercase transition-colors duration-200 ${isDark ? 'text-white/70 hover:text-white' : 'text-slate-700 hover:text-slate-950'
              }`}
          >
            SIGN IN
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ResolutionSection;
