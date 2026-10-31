import React, { forwardRef } from 'react';

export interface AutoRickshawProps extends React.SVGProps<SVGGElement> {
  /**
   * Speed in seconds per wheel revolution (default 0.8s). Lower = faster.
   */
  speed?: number;
}

const ROOF_TOP = (x: number) => 70 + 0.02 * (x - 60);

const css = `
.rk-spin   { transform-box: fill-box; transform-origin: center; animation: rk-spin var(--rk-speed, 0.8s) linear infinite; }
.rk-bob    { animation: rk-bob calc(var(--rk-speed, 0.8s) * 0.5) ease-in-out infinite alternate; }
.rk-beam   { animation: rk-flicker 2.6s steps(1) infinite; mix-blend-mode: screen; }
.rk-glow   { transform-box: fill-box; transform-origin: center; animation: rk-pulse 1.8s ease-in-out infinite; mix-blend-mode: screen; }
.rk-tail   { animation: rk-tail-glow 1.8s ease-in-out infinite; mix-blend-mode: screen; }
.rk-blink  { animation: rk-blink 1.1s steps(1) infinite; }
.rk-puff   { transform-box: fill-box; transform-origin: center; animation: rk-puff 1.5s ease-out infinite; opacity: 0; }

@keyframes rk-spin   { to { transform: rotate(360deg); } }
@keyframes rk-bob    { from { transform: translateY(0); } to { transform: translateY(1.4px); } }
@keyframes rk-flicker{ 0%,100% { opacity: .95; } 47% { opacity: .78; } 49% { opacity: .95; } 83% { opacity: .85; } }
@keyframes rk-pulse  { 0%,100% { opacity: .75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes rk-tail-glow { 0%,100% { opacity: .55; } 50% { opacity: .95; } }
@keyframes rk-blink  { 0%,55% { opacity: 1; } 56%,100% { opacity: .25; } }
@keyframes rk-puff   { 0% { opacity: .5; transform: translate(0,0) scale(1); }
                       100% { opacity: 0; transform: translate(-70px,-16px) scale(4.5); } }

@media (prefers-reduced-motion: reduce) {
  .rk-spin,.rk-bob,.rk-beam,.rk-glow,.rk-tail,.rk-blink,.rk-puff { animation: none; }
}
`;

/** Wheel drawn at 52-unit radius and scaled to r. */
function Wheel({ cx, cy, r = 40 }: { cx: number; cy: number; r?: number }) {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r / 52})`}>
      <g className="rk-spin">
        <circle r="52" fill="#141414" />
        <circle r="47" fill="none" stroke="#2e2e2e" strokeWidth="8" strokeDasharray="7 5" />
        <circle r="40" fill="#0d0d0d" />
        <circle r="33" fill="url(#rk-rim)" stroke="#8d949b" strokeWidth="1.5" />
        {angles.map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <circle cx="0" cy="-21" r="6.5" fill="#1b1b1b" />
            <circle cx="0" cy="-30" r="1.8" fill="#6a7077" />
          </g>
        ))}
        <circle r="10" fill="url(#rk-rim)" stroke="#6a7077" strokeWidth="1.5" />
        <circle r="3.5" fill="#44494f" />
      </g>
      <path
        d="M-40 -28 A49 49 0 0 1 -10 -49"
        stroke="rgba(255,255,255,.14)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Pakistani Auto Rickshaw (3-wheeler), side view, facing RIGHT.
 * Authentic proportions, spinning wheels, bobbing body, flickering beam,
 * exhaust puffs, and detailed CNG cabin.
 */
export const AutoRickshaw = forwardRef<SVGGElement, AutoRickshawProps>(
  ({ speed = 0.8, style, transform, ...restProps }, ref) => {
    const ribs: number[] = [];
    for (let x = 108; x <= 436; x += 12) ribs.push(x);
    const louvers = [0, 1, 2, 3, 4];
    const coils = [0, 1, 2, 3, 4, 5];

    return (
      <g
        ref={ref}
        id="auto-rickshaw-component"
        transform={transform}
        style={{
          ['--rk-speed' as string]: `${speed}s`,
          ...style,
        }}
        {...restProps}
      >
        <defs>
          <style>{css}</style>
          <linearGradient id="rk-orange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fba02b" />
            <stop offset="1%" stopColor="#e07408" />
          </linearGradient>
          <linearGradient id="rk-tan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6cc9b" />
            <stop offset="1%" stopColor="#c8a56b" />
          </linearGradient>
          <linearGradient id="rk-cabin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6e6bd" />
            <stop offset="1%" stopColor="#d9b97a" />
          </linearGradient>
          <linearGradient id="rk-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f1f3f5" />
            <stop offset="0.5" stopColor="#aab1b8" />
            <stop offset="1" stopColor="#dfe3e7" />
          </linearGradient>
          <linearGradient id="rk-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#cfeaf2" stopOpacity=".75" />
            <stop offset="1" stopColor="#8fb8c6" stopOpacity=".45" />
          </linearGradient>
          <linearGradient id="rk-beamgrad" gradientUnits="userSpaceOnUse" x1="558" y1="0" x2="880" y2="0">
            <stop offset="0%" stopColor="#fff6c4" stopOpacity=".9" />
            <stop offset="0.5" stopColor="#ffe9a0" stopOpacity=".35" />
            <stop offset="1" stopColor="#ffe9a0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="rk-lampglow">
            <stop offset="0%" stopColor="#fff8d0" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ffe9a0" stopOpacity=".6" />
            <stop offset="1" stopColor="#ffe9a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rk-tailglow">
            <stop offset="0%" stopColor="#ff3b30" stopOpacity=".9" />
            <stop offset="1" stopColor="#ff3b30" stopOpacity="0" />
          </radialGradient>
          <filter id="rk-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <clipPath id="rk-bodyclip">
            <rect x="62" y="296" width="130" height="34" />
          </clipPath>
        </defs>

        {/* ---------- rickshaw (local coords: rear edge x=60, nose x≈560) ---------- */}
        <g transform="translate(130 0)">
          {/* ground shadow */}
          <ellipse cx="310" cy="397" rx="270" ry="7" fill="#000" opacity=".5" filter="url(#rk-blur)" />

          {/* ================= BODY (behind wheels) ================= */}
          <g className="rk-bob">
            {/* exhaust */}
            <rect x="46" y="320" width="18" height="6" rx="3" fill="#2a2a2a" />
            {[0, 0.5, 1].map((d) => (
              <circle key={d} className="rk-puff" cx="44" cy="323" r="3.5" fill="#cfd3d8" style={{ animationDelay: `${d}s` }} />
            ))}

            {/* cabin interior (passenger door opening + driver cab) */}
            <polygon points="190,89 470,98 470,232 190,232" fill="url(#rk-cabin)" />
            {/* rear bench */}
            <rect x="198" y="128" width="22" height="82" rx="6" fill="#f2e3c0" />
            <rect x="198" y="206" width="120" height="24" rx="6" fill="#f2e3c0" />
            {[204, 212].map((x) => (
              <line key={x} x1={x} y1="134" x2={x} y2="212" stroke="#8a5a2b" strokeWidth="2.5" />
            ))}
            {[214, 230, 246, 262, 278, 294, 310].map((x) => (
              <line key={x} x1={x} y1="209" x2={x} y2="228" stroke="#8a5a2b" strokeWidth="2.5" />
            ))}
            {/* driver seat */}
            <rect x="372" y="204" width="62" height="26" rx="6" fill="#7a5230" />
            {[386, 402, 418].map((x) => (
              <line key={x} x1={x} y1="208" x2={x} y2="226" stroke="#4d321a" strokeWidth="2" />
            ))}

            {/* rear canvas panel + oval window */}
            <path d="M62 85 L190 89 L190 232 L62 232 Z" fill="#4b3a2c" />
            <path d="M92 86 L92 232 M160 88 L160 232" stroke="#3a2c20" strokeWidth="2" />
            <ellipse cx="126" cy="150" rx="28" ry="25" fill="#efe3cf" stroke="#2f2318" strokeWidth="3" />
            <ellipse cx="118" cy="142" rx="14" ry="9" fill="#fff" opacity=".35" />

            {/* rear lower body (orange) + louvers */}
            <path d="M60 232 L190 232 L190 330 L76 330 Q60 330 60 314 Z" fill="url(#rk-orange)" />
            {louvers.map((i) => (
              <rect key={i} x="70" y={244 + i * 9} width="40" height="3" rx="1.5" fill="#b85a05" />
            ))}

            {/* door lower panel (tan) with stripes + handle */}
            <rect x="190" y="232" width="142" height="86" fill="url(#rk-tan)" />
            <rect x="190" y="234" width="142" height="3" fill="#f6efd8" />
            <rect x="190" y="240" width="142" height="3" fill="#d4720c" />
            <rect x="296" y="258" width="20" height="5" rx="2.5" fill="#6b4a2b" />

            {/* pillars */}
            <rect x="184" y="86" width="14" height="146" rx="3" fill="url(#rk-orange)" />
            <rect x="332" y="90" width="14" height="142" fill="url(#rk-orange)" />

            {/* rear wheel well */}
            <g clipPath="url(#rk-bodyclip)">
              <circle cx="122" cy="355" r="44" fill="#1c130c" />
            </g>

            {/* chassis rail */}
            <rect x="76" y="330" width="450" height="10" rx="4" fill="#2b2420" />

            {/* Dual-Chamber Automotive Taillight & Volumetric Bloom */}
            <circle className="rk-tail" cx="57.5" cy="253" r="18" fill="url(#rk-tailglow)" />
            <rect x="53" y="246" width="9" height="22" rx="3.5" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            {/* Ruby Red Brake Lamp */}
            <rect x="54.5" y="248" width="6" height="10" rx="1.5" fill="#dc2626" stroke="#991b1b" strokeWidth="0.6" />
            <rect x="55.5" y="249.5" width="4" height="2" rx="0.5" fill="#fca5a5" opacity="0.8" />
            {/* Amber Turn Signal Lamp */}
            <rect x="54.5" y="259" width="6" height="7" rx="1.5" fill="#f59e0b" stroke="#b45309" strokeWidth="0.6" />

            {/* front tan cowl + orange beltline */}
            <path d="M346 232 L502 238 Q536 242 552 264 L556 318 L346 318 Z" fill="url(#rk-tan)" />
            <path d="M346 232 L502 238 Q536 242 552 264 L546 270 Q532 252 502 247 L346 241 Z" fill="url(#rk-orange)" />
            <path d="M360 258 L498 263 Q530 266 546 282" stroke="#f2f2f2" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <rect x="372" y="276" width="32" height="10" rx="2" fill="#16a34a" />
            <text x="388" y="284" fontSize="7" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="sans-serif">AUTO</text>
            <ellipse cx="508" cy="276" rx="8" ry="5" fill="#c9a24a" stroke="#7a5a1a" strokeWidth="1.5" />

            {/* orange sill under door and cab */}
            <rect x="190" y="318" width="366" height="12" fill="url(#rk-orange)" />

            {/* handlebar */}
            <line x1="508" y1="240" x2="490" y2="202" stroke="#1d1d1d" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="487" cy="197" r="4.5" fill="#111" />

            {/* windshield (edge-on) + wiper */}
            <polygon points="466,92 480,94 516,238 502,240" fill="url(#rk-orange)" />
            <polygon points="478,102 491,104 524,232 512,233" fill="url(#rk-glass)" stroke="#2a2a2a" strokeWidth="1.5" />
            <line x1="520" y1="232" x2="492" y2="222" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />

            {/* side mirror */}
            <line x1="506" y1="156" x2="520" y2="150" stroke="#222" strokeWidth="3" />
            <rect x="518" y="128" width="13" height="30" rx="6.5" fill="#1b1b1b" stroke="#3b3b3b" strokeWidth="1.5" />
            <rect x="522" y="134" width="3" height="14" rx="1.5" fill="#fff" opacity=".35" />

            {/* roof shell */}
            <path d="M58 84 Q58 69 76 69 L440 77 Q488 80 510 108 L500 112 Q484 96 440 91 L76 83 Q58 83 58 84 Z" fill="url(#rk-orange)" />
            <path d="M64 86 L440 93" stroke="#c9650a" strokeWidth="2" opacity=".6" />
            {/* ribbed tan roof rack */}
            <polygon
              points={`100,${ROOF_TOP(100) - 9} 440,${ROOF_TOP(440) - 9} 440,${ROOF_TOP(440) - 1} 100,${ROOF_TOP(100) - 1}`}
              fill="#dcc48f"
              stroke="#a88f5a"
              strokeWidth="1.5"
            />
            {ribs.map((x) => (
              <line key={x} x1={x} y1={ROOF_TOP(x) - 9} x2={x} y2={ROOF_TOP(x) - 1} stroke="#a88f5a" strokeWidth="2" />
            ))}
          </g>

          {/* ================= WHEELS ================= */}
          <Wheel cx={122} cy={355} r={40} />
          <Wheel cx={497} cy={355} r={40} />

          {/* ================= BODY (in front of wheels) ================= */}
          <g className="rk-bob">
            {/* rear fender lip */}
            <path d="M83.4 330 A46 46 0 0 1 160.6 330" stroke="#f08a1c" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M80 330 A50 50 0 0 1 164 330" stroke="#8a4505" strokeWidth="1.5" fill="none" opacity=".6" />

            {/* front fork + coil spring */}
            <line x1="512" y1="306" x2="497" y2="355" stroke="#33373b" strokeWidth="5" strokeLinecap="round" />
            {coils.map((i) => {
              const t = i / 5;
              const x = 511 - t * 12;
              const y = 312 + t * 32;
              return (
                <line
                  key={i}
                  x1={x - 6.5}
                  y1={y - 2}
                  x2={x + 6.5}
                  y2={y + 2}
                  stroke="#f08a1c"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              );
            })}

            {/* front fender */}
            <path
              d="M436 322 C436 296 462 288 497 288 C528 288 548 300 562 322 L558 330 L542 328 C534 314 518 306 497 306 C474 306 462 314 458 328 L438 328 Z"
              fill="url(#rk-orange)"
              stroke="#a85205"
              strokeWidth="1.5"
            />
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={516 + i * 6}
                y1={294 + i * 4}
                x2={520 + i * 6}
                y2={304 + i * 5}
                stroke="#9d4a04"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}

            {/* amber indicator */}
            <rect className="rk-blink" x="524" y="262" width="9" height="15" rx="3" fill="#ffb21f" stroke="#a86a00" strokeWidth="1.5" />

            {/* Halogen Headlight with Prismatic Fresnel Lens & Chrome Bezel */}
            <circle className="rk-glow" cx="554" cy="283" r="32" fill="url(#rk-lampglow)" />
            {/* Chrome Housing Bezel */}
            <ellipse cx="546" cy="283" rx="10" ry="15" fill="url(#rk-rim)" stroke="#475569" strokeWidth="2" />
            {/* Deep Parabolic Reflector & Prismatic Lens */}
            <ellipse cx="552" cy="283" rx="6" ry="12.5" fill="#fef08a" stroke="url(#rk-rim)" strokeWidth="1.2" />
            <line x1="552" y1="273" x2="552" y2="293" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
            <line x1="554" y1="275" x2="554" y2="291" stroke="#ffffff" strokeWidth="0.8" opacity="0.8" />
            {/* High-Intensity Halogen Bulb Core */}
            <circle cx="553" cy="283" r="3.5" fill="#ffffff" />
            <circle cx="553" cy="283" r="1.5" fill="#fffbeb" />
            {/* Specular Rim Glint */}
            <path d="M 548 271 C 551 273, 552 277, 552 281" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </g>
      </g>
    );
  }
);

AutoRickshaw.displayName = 'AutoRickshaw';
export default AutoRickshaw;
