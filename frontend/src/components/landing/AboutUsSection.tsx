// src/components/landing/AboutUsSection.tsx
// Editorial About Us section emerging directly from Scene 5's closing volumetric cloud bookend.

import React from 'react';
import { Link } from 'react-router';
import { RasaiLogo } from '../auth/RasaiLogo';

const PILLARS = [
  {
    index: '01',
    title: 'Real-Time Ghost-Scan Interception',
    subtitle: 'MULTI-CARRIER TELEMETRY',
    body:
      'Ingests live status events across TCS, Leopards, Trax, and PostEx with adaptive circuit breakers—detecting unverified "Customer Unavailable" scans kilometers away from the buyer\'s doorstep.',
  },
  {
    index: '02',
    title: '60-Second WhatsApp Handshake',
    subtitle: 'VERIFIED CUSTOMER RESCUE',
    body:
      'Triggers an instant Meta WhatsApp utility conversation the moment a ghost scan occurs, capturing cash-ready confirmation and an exact rooftop GPS pin in one tap.',
  },
  {
    index: '03',
    title: '07:30 PKT Manifest & CPR Defense',
    subtitle: 'MORNING HUB EXECUTION',
    body:
      'Compiles rescued parcels into station-grouped morning run-sheets before 08:00 PKT rider departure while generating 100-point Carrier Performance Report (CPR) dossiers to reverse false RTO fees.',
  },
];

export const AboutUsSection: React.FC = () => {
  return (
    <section
      id="about-us"
      aria-label="About Rasai"
      className="relative w-full bg-[#07090e] text-[#f4efe8] overflow-hidden select-none"
    >
      {/* Top Volumetric Cloud Transition Seam (Blends seamlessly from Scene 5's closing cloud canvas) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,16,26,0.98) 0%, rgba(201,164,122,0.08) 38%, rgba(7,9,14,0) 100%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-24 pb-28">
        {/* Brand Eyebrow */}
        <div className="flex items-center gap-3 font-mono text-xs tracking-[0.24em] text-[#c9a47a] uppercase">
          <span>ABOUT US</span>
          <span className="h-[1px] w-10 bg-[#c9a47a]/40" />
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <span>rasai</span>
            <RasaiLogo size={15} className="text-[#c9a47a]" />
            <span className="font-sans tracking-normal">رسائی</span>
          </span>
        </div>

        {/* Editorial Headline & Mission */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="lg:col-span-7">
            <h2 className="font-sans text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12]">
              Built for Pakistan&apos;s{' '}
              <span className="text-[#fef08a]">Last-Mile Cash-on-Delivery</span> Reality.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="font-sans text-sm sm:text-base text-slate-300 leading-relaxed m-0">
              Across Pakistan, over 85% of e-commerce runs on Cash-on-Delivery. When an overloaded
              courier marks a parcel &ldquo;Customer Unavailable&rdquo; from under a flyover,
              merchants lose both the sale and double-shipping Return-to-Origin penalties. Rasai
              turns failed doorstep attempts into verified morning deliveries.
            </p>
          </div>
        </div>

        {/* 3 Architectural Pillars */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.index}
              className="rounded-2xl bg-[#0c111b]/90 border border-slate-800/90 hover:border-[#c9a47a]/50 transition-colors p-6 sm:p-7 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between font-mono text-[11px] text-[#c9a47a] tracking-widest uppercase">
                  <span>{pillar.subtitle}</span>
                  <span className="text-slate-500">{pillar.index}</span>
                </div>
                <h3 className="mt-3 font-sans text-lg sm:text-xl font-bold text-white tracking-tight">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 font-sans text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {pillar.body}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between font-mono text-[10px] text-emerald-400 tracking-wider uppercase">
                <span>VERIFIED PIPELINE</span>
                <span>PKT (UTC+5)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Console & Public Tracking Action Strip */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#0d1522] via-[#111c2d] to-[#0d1522] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] text-emerald-400 uppercase font-bold">
              LIVE NDR OPERATIONS TERMINAL
            </div>
            <p className="mt-1 font-sans text-base sm:text-lg font-semibold text-white m-0">
              Ready to rescue active NDRs and automate your 07:30 PKT station manifests?
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-black tracking-wider uppercase transition-colors no-underline shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
            >
              ENTER RASAI CONSOLE &rarr;
            </Link>
            <Link
              to="/track"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-semibold tracking-wider uppercase transition-colors no-underline"
            >
              TRACK PARCEL
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;
