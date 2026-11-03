import React, { useEffect, useRef, useCallback } from 'react';
import { LOGO_PATHS, FRAME_TRANSFORMS } from './logoData';
import { RasaiUrduCalligraphy } from '../common/RasaiUrduCalligraphy';

export interface RasaiChoreographyProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onWarpChange?: (isWarp: boolean) => void;
  onAudioCue?: (cue: 'riser' | 'flyby1' | 'flyby2' | 'flyby3' | 'boom') => void;
}

declare global {
  interface Window {
    __seek?: (t: number) => void;
    __renderAt?: (t: number) => void;
    __getCurrentTime?: () => number;
  }
}

const TOTAL_DURATION = 12.3; // 0–10.0s logo choreography + 9.5–12.3s left shift & stacked text glare reveal

// ============================================================================
// SEEDED DETERMINISTIC PRNG (mulberry32)
// ============================================================================
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// EASING & INTERPOLATION UTILITIES
// ============================================================================
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function invLerp(a: number, b: number, v: number): number {
  return clamp((v - a) / (b - a), 0, 1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = invLerp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
}

interface Vec2 {
  x: number;
  y: number;
}

function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function catmullRomVec2(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  return {
    x: catmullRomScalar(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRomScalar(p0.y, p1.y, p2.y, p3.y, t),
  };
}

// Pre-smoothed camera transforms to eliminate 24fps quantization stepping at 120Hz/144Hz/240Hz+
const SMOOTH_FRAME_TRANSFORMS: ReadonlyArray<readonly [number, number, number]> = (() => {
  const n = FRAME_TRANSFORMS.length;
  const out: Array<readonly [number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    let sSum = 0;
    let dxSum = 0;
    let dySum = 0;
    let wSum = 0;
    for (let k = -2; k <= 2; k++) {
      const idx = clamp(i + k, 0, n - 1);
      const w = k === 0 ? 0.4 : Math.abs(k) === 1 ? 0.22 : 0.08;
      sSum += FRAME_TRANSFORMS[idx][0] * w;
      dxSum += FRAME_TRANSFORMS[idx][1] * w;
      dySum += FRAME_TRANSFORMS[idx][2] * w;
      wSum += w;
    }
    out.push([sSum / wSum, dxSum / wSum, dySum / wSum]);
  }
  return out;
})();

// ============================================================================
// DETERMINISTIC PRE-GENERATED PARTICLE CATALOGS (<= 600 total particles)
// ============================================================================
interface DriftStar {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  size: number;
  len: number;
  alpha: number;
  tStart: number;
  tEnd: number;
}

interface BurstStar {
  angle: number;
  r0: number;
  speed: number;
  lenScale: number;
  width: number;
  alpha: number;
  phase: number;
}

interface DustMote {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

interface SparkleParticle {
  uPos: number;
  tBirth: number;
  life: number;
  offsetN: number;
  driftX: number;
  driftY: number;
  size: number;
}

const DRIFT_STARS: DriftStar[] = (() => {
  const rng = mulberry32(0x10402401);
  const arr: DriftStar[] = [];
  for (let i = 0; i < 110; i++) {
    arr.push({
      x0: rng() * 1400 - 100,
      y0: rng() * 820 - 50,
      vx: 110 + rng() * 190,
      vy: -(65 + rng() * 120),
      size: 0.9 + rng() * 1.4,
      len: 16 + rng() * 55,
      alpha: 0.25 + rng() * 0.65,
      tStart: 2.25 + rng() * 0.6,
      tEnd: 3.35 + rng() * 0.55,
    });
  }
  return arr;
})();

const BURST_STARS: BurstStar[] = (() => {
  const rng = mulberry32(0x20804202);
  const arr: BurstStar[] = [];
  for (let i = 0; i < 240; i++) {
    arr.push({
      angle: rng() * Math.PI * 2,
      r0: 18 + rng() * 210,
      speed: 240 + rng() * 620,
      lenScale: 0.22 + rng() * 0.42,
      width: 0.9 + rng() * 1.5,
      alpha: 0.35 + rng() * 0.65,
      phase: rng() * 0.45,
    });
  }
  return arr;
})();

const DUST_MOTES: DustMote[] = (() => {
  const rng = mulberry32(0x90901234);
  const arr: DustMote[] = [];
  for (let i = 0; i < 95; i++) {
    arr.push({
      x0: rng() * 1280,
      y0: rng() * 720,
      vx: (rng() - 0.45) * 18,
      vy: (rng() - 0.55) * 14,
      r: 1.0 + rng() * 2.1,
      alpha: 0.18 + rng() * 0.52,
    });
  }
  return arr;
})();

const ORBIT1_SPARKLES: SparkleParticle[] = (() => {
  const rng = mulberry32(0x44118822);
  const arr: SparkleParticle[] = [];
  for (let i = 0; i < 55; i++) {
    const uPos = 0.05 + rng() * 0.75;
    arr.push({
      uPos,
      tBirth: 3.7 + uPos * 1.55 + (rng() - 0.5) * 0.15,
      life: 0.35 + rng() * 0.55,
      offsetN: (rng() - 0.5) * 48,
      driftX: (rng() - 0.5) * 26,
      driftY: (rng() - 0.5) * 26,
      size: 1.4 + rng() * 2.4,
    });
  }
  return arr;
})();

const ORBIT2_SPARKLES: SparkleParticle[] = (() => {
  const rng = mulberry32(0x77339955);
  const arr: SparkleParticle[] = [];
  for (let i = 0; i < 85; i++) {
    const uPos = 0.12 + rng() * 0.85;
    arr.push({
      uPos,
      tBirth: 6.1 + uPos * 2.05 + (rng() - 0.5) * 0.18,
      life: 0.4 + rng() * 0.65,
      offsetN: (rng() - 0.5) * 54,
      driftX: (rng() - 0.5) * 30,
      driftY: (rng() - 0.5) * 30,
      size: 1.3 + rng() * 2.5,
    });
  }
  return arr;
})();

const FLARE_RAYS: ReadonlyArray<{ angle: number; len: number; width: number; alpha: number }> = (() => {
  const rng = mulberry32(0x88509400);
  const rays: Array<{ angle: number; len: number; width: number; alpha: number }> = [];
  for (let i = 0; i < 110; i++) {
    rays.push({
      angle: (i / 110) * Math.PI * 2 + (rng() - 0.5) * 0.04,
      len: 110 + rng() * 240,
      width: 0.6 + rng() * 1.2,
      alpha: 0.18 + rng() * 0.48,
    });
  }
  return rays;
})();

// ============================================================================
// FLIGHT TRAJECTORY SPLINES (1280x720 Reference Coordinates)
// ============================================================================
// First Flying Arrow (3.50s -> 5.55s):
// Enters bottom-left, loops up the left side of the logo, arcs over the top heading right
const FLIGHT1_KEYFRAMES: ReadonlyArray<{ t: number; x: number; y: number; scale: number }> = [
  { t: 3.45, x: 185, y: 790, scale: 0.95 },
  { t: 3.75, x: 355, y: 655, scale: 1.05 },
  { t: 4.00, x: 392, y: 600, scale: 1.12 },
  { t: 4.25, x: 325, y: 472, scale: 1.08 },
  { t: 4.50, x: 314, y: 344, scale: 1.05 },
  { t: 4.75, x: 352, y: 206, scale: 1.05 },
  { t: 5.00, x: 468, y: 128, scale: 1.06 },
  { t: 5.25, x: 618, y: 128, scale: 1.05 },
  { t: 5.50, x: 756, y: 208, scale: 0.98 },
  { t: 5.75, x: 855, y: 292, scale: 0.78 },
];

// Second Orbit (5.50s -> 8.35s):
// Continues from upper-right (5.5s) -> behind right/center (6.0-6.5s) -> lower-left front (7.0s)
// -> lower-right bank (7.5s) -> up the main diagonal shaft to the arrowhead (8.0-8.3s)
const FLIGHT2_KEYFRAMES: ReadonlyArray<{ t: number; x: number; y: number; scale: number }> = [
  { t: 5.50, x: 756, y: 208, scale: 0.95 },
  { t: 5.75, x: 855, y: 292, scale: 0.76 },
  { t: 6.00, x: 835, y: 365, scale: 0.66 },
  { t: 6.25, x: 615, y: 335, scale: 0.64 },
  { t: 6.50, x: 310, y: 412, scale: 0.78 },
  { t: 6.75, x: 132, y: 505, scale: 1.04 },
  { t: 7.00, x: 172, y: 625, scale: 1.24 },
  { t: 7.25, x: 355, y: 590, scale: 1.18 },
  { t: 7.50, x: 562, y: 432, scale: 1.12 },
  { t: 7.75, x: 708, y: 300, scale: 1.06 },
  { t: 8.00, x: 848, y: 172, scale: 1.02 },
  { t: 8.25, x: 992, y: 48, scale: 0.92 },
  { t: 8.40, x: 1055, y: 15, scale: 0.80 },
];

function evalTrajectory(
  keyframes: ReadonlyArray<{ t: number; x: number; y: number; scale: number }>,
  time: number
): { x: number; y: number; tx: number; ty: number; scale: number } {
  const n = keyframes.length;
  const tClamped = clamp(time, keyframes[0].t, keyframes[n - 1].t);
  let idx = 0;
  while (idx < n - 2 && keyframes[idx + 1].t < tClamped) {
    idx++;
  }
  const k0 = keyframes[Math.max(0, idx - 1)];
  const k1 = keyframes[idx];
  const k2 = keyframes[Math.min(n - 1, idx + 1)];
  const k3 = keyframes[Math.min(n - 1, idx + 2)];
  const localT = clamp((tClamped - k1.t) / Math.max(0.0001, k2.t - k1.t), 0, 1);

  const pos = catmullRomVec2(k0, k1, k2, k3, localT);
  const dt = 0.015;
  const posAhead = catmullRomVec2(k0, k1, k2, k3, clamp(localT + dt, 0, 1));
  const posBehind = catmullRomVec2(k0, k1, k2, k3, clamp(localT - dt, 0, 1));
  const dx = posAhead.x - posBehind.x;
  const dy = posAhead.y - posBehind.y;
  const len = Math.hypot(dx, dy) || 1;
  const scale = catmullRomScalar(k0.scale, k1.scale, k2.scale, k3.scale, localT);

  return {
    x: pos.x,
    y: pos.y,
    tx: dx / len,
    ty: dy / len,
    scale,
  };
}

// ============================================================================
// OFFSCREEN PRE-RENDERED SPRITES (No per-frame filter blurs)
// ============================================================================
interface SpriteBank {
  softGlow: HTMLCanvasElement;
  blueCore: HTMLCanvasElement;
  hexBokeh: HTMLCanvasElement;
  sparkle: HTMLCanvasElement;
}

function createSpriteBank(): SpriteBank {
  // 1. Soft white radial glow (256x256)
  const softGlow = document.createElement('canvas');
  softGlow.width = 256;
  softGlow.height = 256;
  const sgCtx = softGlow.getContext('2d');
  if (sgCtx) {
    const g = sgCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.18, 'rgba(255, 255, 255, 0.78)');
    g.addColorStop(0.45, 'rgba(240, 246, 255, 0.28)');
    g.addColorStop(0.75, 'rgba(210, 228, 255, 0.06)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sgCtx.fillStyle = g;
    sgCtx.fillRect(0, 0, 256, 256);
  }

  // 2. Blue-white lens flare core (#EDF4FE) (256x256)
  const blueCore = document.createElement('canvas');
  blueCore.width = 256;
  blueCore.height = 256;
  const bcCtx = blueCore.getContext('2d');
  if (bcCtx) {
    const g = bcCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.14, 'rgba(237, 244, 254, 0.95)');
    g.addColorStop(0.32, 'rgba(185, 215, 252, 0.45)');
    g.addColorStop(0.65, 'rgba(120, 165, 220, 0.12)');
    g.addColorStop(1, 'rgba(100, 150, 210, 0)');
    bcCtx.fillStyle = g;
    bcCtx.fillRect(0, 0, 256, 256);
  }

  // 3. Hexagonal bokeh sprite (128x128)
  const hexBokeh = document.createElement('canvas');
  hexBokeh.width = 128;
  hexBokeh.height = 128;
  const hbCtx = hexBokeh.getContext('2d');
  if (hbCtx) {
    hbCtx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      const px = 64 + Math.cos(a) * 54;
      const py = 64 + Math.sin(a) * 54;
      if (i === 0) hbCtx.moveTo(px, py);
      else hbCtx.lineTo(px, py);
    }
    hbCtx.closePath();
    const g = hbCtx.createRadialGradient(64, 64, 10, 64, 64, 56);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    g.addColorStop(0.75, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    hbCtx.fillStyle = g;
    hbCtx.fill();
  }

  // 4. Tiny sparkle dot sprite (64x64)
  const sparkle = document.createElement('canvas');
  sparkle.width = 64;
  sparkle.height = 64;
  const spCtx = sparkle.getContext('2d');
  if (spCtx) {
    const g = spCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(255, 255, 255, 0.65)');
    g.addColorStop(0.6, 'rgba(220, 235, 255, 0.15)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    spCtx.fillStyle = g;
    spCtx.fillRect(0, 0, 64, 64);
  }

  return { softGlow, blueCore, hexBokeh, sparkle };
}

// ============================================================================
// HIGH-FPS CAMERA TRANSFORM INTERPOLATOR (1280x720 Reference Space)
// Uses Catmull-Rom spline interpolation over smoothed keyframes for >120fps fluidity
// ============================================================================
function getLogoTransformAtTime(t: number): { s: number; dx: number; dy: number } {
  const maxIdx = SMOOTH_FRAME_TRANSFORMS.length - 1;
  const fExact = clamp(t * 24, 0, maxIdx);
  const f1 = Math.floor(fExact);
  const f0 = Math.max(0, f1 - 1);
  const f2 = Math.min(maxIdx, f1 + 1);
  const f3 = Math.min(maxIdx, f1 + 2);
  const frac = fExact - f1;

  const tr0 = SMOOTH_FRAME_TRANSFORMS[f0];
  const tr1 = SMOOTH_FRAME_TRANSFORMS[f1];
  const tr2 = SMOOTH_FRAME_TRANSFORMS[f2];
  const tr3 = SMOOTH_FRAME_TRANSFORMS[f3];

  return {
    s: catmullRomScalar(tr0[0], tr1[0], tr2[0], tr3[0], frac),
    dx: catmullRomScalar(tr0[1], tr1[1], tr2[1], tr3[1], frac),
    dy: catmullRomScalar(tr0[2], tr1[2], tr2[2], tr3[2], frac),
  };
}

// ============================================================================
// HELPER: DRAW 3D FACETED FLYING ARROW + RIBBON + HAIRLINES (High-density 88-step spine)
// ============================================================================
function drawFlyingArrowAndTrail(
  ctx: CanvasRenderingContext2D,
  sprites: SpriteBank,
  keyframes: ReadonlyArray<{ t: number; x: number; y: number; scale: number }>,
  tCurrent: number,
  tTrailSpan: number,
  headAlpha: number,
  trailAlpha: number,
  numHairlines: number
) {
  if (headAlpha <= 0.005 && trailAlpha <= 0.005) return;

  const steps = 88;
  const spine: Array<{ x: number; y: number; tx: number; ty: number; scale: number; u: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps; // 0 = tail, 1 = head
    const tSample = tCurrent - (1 - u) * tTrailSpan;
    const pt = evalTrajectory(keyframes, tSample);
    spine.push({ ...pt, u });
  }

  const head = spine[spine.length - 1];

  // 1. Soft outer glow along the ribbon trail
  if (trailAlpha > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 6; i < spine.length; i += 6) {
      const p = spine[i];
      const r = (18 + 38 * Math.pow(p.u, 1.5)) * p.scale;
      const a = trailAlpha * 0.14 * Math.pow(p.u, 1.6);
      if (a > 0.005) {
        ctx.globalAlpha = a;
        ctx.drawImage(sprites.softGlow, p.x - r, p.y - r, r * 2, r * 2);
      }
    }

    // 2. Thick motion-blurred glowing white ribbon body
    const leftPts: Vec2[] = [];
    const rightPts: Vec2[] = [];
    for (let i = 0; i < spine.length; i++) {
      const p = spine[i];
      const nx = -p.ty;
      const ny = p.tx;
      const halfW = (2.5 + 24 * Math.pow(p.u, 1.35)) * p.scale;
      leftPts.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
      rightPts.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
    }

    ctx.beginPath();
    ctx.moveTo(leftPts[0].x, leftPts[0].y);
    for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i].x, leftPts[i].y);
    for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
    ctx.closePath();

    const tail = spine[0];
    const ribGrad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    ribGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    ribGrad.addColorStop(0.35, `rgba(235, 240, 245, ${0.38 * trailAlpha})`);
    ribGrad.addColorStop(0.75, `rgba(250, 252, 255, ${0.78 * trailAlpha})`);
    ribGrad.addColorStop(1, `rgba(255, 255, 255, ${0.95 * trailAlpha})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ribGrad;
    ctx.fill();

    // 3. Concentric / twisted crisp hairlines tracing the loop
    for (let h = 0; h < numHairlines; h++) {
      const freq = 5.2 + h * 1.9;
      const phase = h * 2.1;
      const ampBase = 14 + h * 9;
      ctx.beginPath();
      for (let i = 0; i < spine.length; i++) {
        const p = spine[i];
        const nx = -p.ty;
        const ny = p.tx;
        const wave = Math.sin(p.u * freq + phase) * ampBase * (1 - p.u * 0.55) * p.scale;
        const hx = p.x + nx * wave;
        const hy = p.y + ny * wave;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha * (0.62 - h * 0.14)})`;
      ctx.lineWidth = (1.6 - h * 0.3) * head.scale;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. 3D Faceted Arrowhead (Left bright facet + Right shaded bevel facet)
  if (headAlpha > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(headAlpha, 0, 1);

    const tx = head.tx;
    const ty = head.ty;
    const nx = -ty; // left normal
    const ny = tx;
    const s = head.scale;

    const headLen = 115 * s;
    const wingLen = 138 * s;
    const wingSpan = 88 * s;
    const neckSpan = 22 * s;

    const tipX = head.x + tx * (headLen * 0.42);
    const tipY = head.y + ty * (headLen * 0.42);
    const notchX = tipX - tx * headLen;
    const notchY = tipY - ty * headLen;

    const leftWingX = tipX - tx * wingLen + nx * wingSpan;
    const leftWingY = tipY - ty * wingLen + ny * wingSpan;
    const rightWingX = tipX - tx * wingLen - nx * wingSpan;
    const rightWingY = tipY - ty * wingLen - ny * wingSpan;

    const leftNeckX = notchX + nx * neckSpan;
    const leftNeckY = notchY + ny * neckSpan;
    const rightNeckX = notchX - nx * neckSpan;
    const rightNeckY = notchY - ny * neckSpan;

    // Soft bloom under arrowhead
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = headAlpha * 0.45;
    const glowR = 110 * s;
    ctx.drawImage(sprites.softGlow, head.x - glowR, head.y - glowR, glowR * 2, glowR * 2);
    ctx.restore();

    // Left facet (bright white)
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftWingX, leftWingY);
    ctx.lineTo(leftNeckX, leftNeckY);
    ctx.lineTo(notchX, notchY);
    ctx.closePath();
    ctx.fillStyle = '#FAFAFA';
    ctx.fill();

    // Right facet (shaded 3D bevel)
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(notchX, notchY);
    ctx.lineTo(rightNeckX, rightNeckY);
    ctx.lineTo(rightWingX, rightWingY);
    ctx.closePath();
    const bevelGrad = ctx.createLinearGradient(tipX, tipY, rightWingX, rightWingY);
    bevelGrad.addColorStop(0, '#E2E4E7');
    bevelGrad.addColorStop(1, '#B4B8BC');
    ctx.fillStyle = bevelGrad;
    ctx.fill();

    // Crisp center ridge highlight
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(notchX, notchY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const RasaiChoreography: React.FC<RasaiChoreographyProps> = ({
  className = '',
  autoPlay = true,
  loop = false,
  onWarpChange,
  onAudioCue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoSlideRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLDivElement>(null);
  const urduGlareRef = useRef<HTMLSpanElement>(null);
  const engGlareRef = useRef<HTMLSpanElement>(null);

  const starBgCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgElementRef = useRef<SVGSVGElement>(null);
  const svgTransformGroupRef = useRef<SVGGElement>(null);
  const arrowGroupRef = useRef<SVGGElement>(null);
  const ghostStop0Ref = useRef<SVGStopElement>(null);
  const ghostStop1Ref = useRef<SVGStopElement>(null);
  const ghostStop2Ref = useRef<SVGStopElement>(null);

  const spritesRef = useRef<SpriteBank | null>(null);
  const currentTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const lastWarpStateRef = useRef<boolean>(false);
  const firedCuesRef = useRef<Set<string>>(new Set());
  const activeRafRef = useRef<number>(0);

  // Dirty-tracking refs so we never write unchanged DOM/SVG styles or clear idle canvases
  const lastPostKeyRef = useRef<string>('');
  const lastGhostKeyRef = useRef<string>('');
  const lastCameraKeyRef = useRef<string>('');
  const starWasActiveRef = useRef<boolean>(true);
  const bgWasActiveRef = useRef<boolean>(true);

  // Cached layout & canvas contexts to prevent Forced Synchronous Layout (reflow) on every frame
  const layoutMetricsRef = useRef<{
    viewW: number;
    viewH: number;
    stageW: number;
    stageScale: number;
    dpr: number;
  }>({
    viewW: typeof window !== 'undefined' ? window.innerWidth : 1280,
    viewH: typeof window !== 'undefined' ? window.innerHeight : 720,
    stageW: 320,
    stageScale: 0.5,
    dpr: 1,
  });

  const canvasCtxsRef = useRef<{
    star: CanvasRenderingContext2D | null;
    bg: CanvasRenderingContext2D | null;
    fg: CanvasRenderingContext2D | null;
  }>({
    star: null,
    bg: null,
    fg: null,
  });

  const measureLayoutAndCanvases = useCallback(() => {
    if (typeof window === 'undefined') return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rootRect = containerRef.current?.getBoundingClientRect();
    const viewW = Math.max(1, rootRect && rootRect.width > 0 ? rootRect.width : window.innerWidth);
    const viewH = Math.max(1, rootRect && rootRect.height > 0 ? rootRect.height : window.innerHeight);
    const stageW = logoSlideRef.current?.offsetWidth || Math.min(420, Math.max(175, viewW * 0.56));
    // Match stage canvas resolution to actual physical stage size (instead of oversized 2560x1440 on mobile)
    const stageScale = Math.min(dpr, Math.max(0.3, (stageW * dpr) / 1280));

    layoutMetricsRef.current = { viewW, viewH, stageW, stageScale, dpr };
    lastPostKeyRef.current = '';

    if (textRevealRef.current) {
      const emblemVisualW = stageW * (836 / 1280);
      const emblemVisualH = stageW * (604 / 1280);
      textRevealRef.current.style.setProperty('--emblem-w', `${emblemVisualW.toFixed(1)}px`);
      textRevealRef.current.style.setProperty('--emblem-h', `${emblemVisualH.toFixed(1)}px`);
    }

    const starBgCanvas = starBgCanvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!starBgCanvas || !bgCanvas || !fgCanvas) return;

    const starTargetW = Math.round(viewW * dpr);
    const starTargetH = Math.round(viewH * dpr);
    if (starBgCanvas.width !== starTargetW || starBgCanvas.height !== starTargetH) {
      starBgCanvas.width = starTargetW;
      starBgCanvas.height = starTargetH;
      starWasActiveRef.current = true;
    }

    const targetW = Math.max(1, Math.round(1280 * stageScale));
    const targetH = Math.max(1, Math.round(720 * stageScale));
    if (bgCanvas.width !== targetW || bgCanvas.height !== targetH) {
      bgCanvas.width = targetW;
      bgCanvas.height = targetH;
      bgWasActiveRef.current = true;
    }
    if (fgCanvas.width !== targetW || fgCanvas.height !== targetH) {
      fgCanvas.width = targetW;
      fgCanvas.height = targetH;
    }

    if (!canvasCtxsRef.current.star) {
      canvasCtxsRef.current.star = starBgCanvas.getContext('2d');
    }
    if (!canvasCtxsRef.current.bg) {
      canvasCtxsRef.current.bg = bgCanvas.getContext('2d');
    }
    if (!canvasCtxsRef.current.fg) {
      canvasCtxsRef.current.fg = fgCanvas.getContext('2d');
    }
  }, []);

  // ==========================================================================
  // PURE FRAME RENDERER: render(t) (t in seconds, 0.000 -> 12.300)
  // ==========================================================================
  const render = useCallback(
    (rawT: number) => {
      const tFull = clamp(rawT, 0, TOTAL_DURATION);
      const t = clamp(tFull, 0, 10.0); // Core 10-second logo reveal timeline
      currentTimeRef.current = tFull;

      if (!spritesRef.current && typeof document !== 'undefined') {
        spritesRef.current = createSpriteBank();
      }
      const sprites = spritesRef.current;

      // Notify parent warp state (2.3s -> 5.0s) so full-hero StarfieldCanvas enters hyperspace
      const isWarp = t >= 2.3 && t <= 5.0;
      if (isWarp !== lastWarpStateRef.current) {
        lastWarpStateRef.current = isWarp;
        onWarpChange?.(isWarp);
      }

      // Optional audio sync cues
      if (onAudioCue) {
        const cues: Array<{ id: 'riser' | 'flyby1' | 'flyby2' | 'flyby3' | 'boom'; time: number }> = [
          { id: 'riser', time: 1.5 },
          { id: 'flyby1', time: 5.5 },
          { id: 'flyby2', time: 6.5 },
          { id: 'flyby3', time: 7.5 },
          { id: 'boom', time: 8.75 },
        ];
        for (const c of cues) {
          if (t >= c.time && t < c.time + 0.15 && !firedCuesRef.current.has(c.id)) {
            firedCuesRef.current.add(c.id);
            onAudioCue(c.id);
          }
        }
      }

      // ----------------------------------------------------------------------
      // POST-COMPLETION CHOREOGRAPHY (tFull = 9.55s -> 12.25s):
      // Dirty-checked so 0 HTML DOM style writes occur during t = 0..9.55s
      // ----------------------------------------------------------------------
      const shiftProgress = easeInOutCubic(invLerp(9.55, 10.75, tFull));
      const textAppearProgress = easeOutCubic(invLerp(10.15, 12.0, tFull));
      const glareProgress = invLerp(10.1, 12.15, tFull);
      const glareIntensity =
        glareProgress > 0 && glareProgress < 1
          ? Math.pow(Math.sin(glareProgress * Math.PI), 1.35)
          : 0;

      const { viewW, viewH, stageW, stageScale, dpr } = layoutMetricsRef.current;
      const postKey = `${shiftProgress.toFixed(4)}_${textAppearProgress.toFixed(4)}_${glareIntensity.toFixed(4)}`;

      if (postKey !== lastPostKeyRef.current) {
        lastPostKeyRef.current = postKey;
        const emblemVisualW = stageW * (836 / 1280);
        const gapPx = clamp(stageW * 0.09, 16, 44);
        const textW = emblemVisualW;

        if (logoSlideRef.current) {
          const emblemShiftX = -shiftProgress * ((textW + gapPx) * 0.5);
          logoSlideRef.current.style.transform = `translate3d(calc(-52.656% + ${emblemShiftX.toFixed(2)}px), -50%, 0)`;
        }

        if (textRevealRef.current) {
          const textTargetCenterX = (emblemVisualW + gapPx) * 0.5;
          const emergeOffsetX = lerp(-28, 0, textAppearProgress);
          const textScale = lerp(0.74, 1.0, textAppearProgress);

          textRevealRef.current.style.opacity = textAppearProgress.toFixed(4);
          textRevealRef.current.style.transform = `translate3d(calc(-50% + ${(textTargetCenterX + emergeOffsetX).toFixed(2)}px), -50%, 0) scale3d(${textScale.toFixed(4)}, ${textScale.toFixed(4)}, 1)`;
        }

        // Specular glare effect constrained strictly to the alphabets (zero on background)
        if (urduGlareRef.current && engGlareRef.current) {
          if (glareIntensity > 0.001) {
            const pos = lerp(-35, 135, easeInOutCubic(glareProgress));
            const urduGrad = `linear-gradient(112deg, transparent 0%, transparent calc(${pos}% - 24%), rgba(190, 225, 255, 0.45) calc(${pos}% - 12%), rgba(255, 255, 255, 1) calc(${pos}% - 2%), rgba(255, 255, 255, 1) calc(${pos}% + 2%), rgba(190, 225, 255, 0.45) calc(${pos}% + 12%), transparent calc(${pos}% + 24%), transparent 100%)`;

            urduGlareRef.current.style.backgroundImage = urduGrad;
            urduGlareRef.current.style.opacity = (glareIntensity * 1.0).toFixed(4);

            const engPos = pos - 10;
            const engGrad = `linear-gradient(112deg, transparent 0%, transparent calc(${engPos}% - 24%), rgba(190, 225, 255, 0.45) calc(${engPos}% - 12%), rgba(255, 255, 255, 1) calc(${engPos}% - 2%), rgba(255, 255, 255, 1) calc(${engPos}% + 2%), rgba(190, 225, 255, 0.45) calc(${engPos}% + 12%), transparent calc(${engPos}% + 24%), transparent 100%)`;

            engGlareRef.current.style.backgroundImage = engGrad;
            engGlareRef.current.style.opacity = (glareIntensity * 1.0).toFixed(4);
          } else {
            urduGlareRef.current.style.opacity = '0';
            engGlareRef.current.style.opacity = '0';
          }
        }
      }

      // ----------------------------------------------------------------------
      // 1. CAMERA ZOOM-OUT & SLOW PUSH-IN TRANSFORM ON GPU COMPOSITOR
      //    Uses CSS translate3d/scale3d on the SVG layer to avoid main-thread SVG path re-tessellation
      // ----------------------------------------------------------------------
      const { s, dx, dy } = getLogoTransformAtTime(t);
      const cameraKey = `${s.toFixed(4)}_${dx.toFixed(2)}_${dy.toFixed(2)}`;
      if (cameraKey !== lastCameraKeyRef.current) {
        lastCameraKeyRef.current = cameraKey;
        if (svgElementRef.current) {
          const dxPct = (dx / 12.8).toFixed(3);
          const dyPct = (dy / 7.2).toFixed(3);
          svgElementRef.current.style.transform = `translate3d(${dxPct}%, ${dyPct}%, 0) scale3d(${s.toFixed(5)}, ${s.toFixed(5)}, 1)`;
        }
      }

      // ----------------------------------------------------------------------
      // 4. ARROW GHOSTS (Dirty-checked so SVG stops/styles only update during active transitions)
      // ----------------------------------------------------------------------
      let ghostFactor = 0;
      if (t >= 1.4 && t < 2.35) {
        ghostFactor = smoothStep(1.4, 2.35, t);
      } else if (t >= 2.35 && t < 5.0) {
        ghostFactor = 1;
      } else if (t >= 5.0 && t < 5.45) {
        ghostFactor = 1 - smoothStep(5.0, 5.42, t);
      }

      let popBrightness = 1;
      if (t >= 1.15 && t <= 1.55) {
        popBrightness = 1 + 0.16 * Math.sin(((t - 1.15) / 0.4) * Math.PI);
      } else if (t >= 5.32 && t <= 5.58) {
        popBrightness = 1 + 0.2 * Math.sin(((t - 5.32) / 0.26) * Math.PI);
      }

      const ghostKey = `${ghostFactor.toFixed(3)}_${popBrightness.toFixed(3)}`;
      if (ghostKey !== lastGhostKeyRef.current) {
        lastGhostKeyRef.current = ghostKey;
        if (ghostStop0Ref.current && ghostStop1Ref.current && ghostStop2Ref.current) {
          const midR = Math.round(lerp(220, 128, ghostFactor) * popBrightness);
          const midG = Math.round(lerp(220, 132, ghostFactor) * popBrightness);
          const midB = Math.round(lerp(220, 136, ghostFactor) * popBrightness);

          const headR = Math.round(lerp(248, 76, ghostFactor) * popBrightness);
          const headG = Math.round(lerp(248, 80, ghostFactor) * popBrightness);
          const headB = Math.round(lerp(248, 84, ghostFactor) * popBrightness);

          const footV = clamp(Math.round(218 * popBrightness), 0, 255);
          ghostStop0Ref.current.setAttribute('stop-color', `rgb(${footV}, ${footV}, ${footV})`);
          ghostStop1Ref.current.setAttribute(
            'stop-color',
            `rgb(${clamp(midR, 0, 255)}, ${clamp(midG, 0, 255)}, ${clamp(midB, 0, 255)})`
          );
          ghostStop2Ref.current.setAttribute(
            'stop-color',
            `rgb(${clamp(headR, 0, 255)}, ${clamp(headG, 0, 255)}, ${clamp(headB, 0, 255)})`
          );
        }
        if (arrowGroupRef.current) {
          const bevelOpacity = lerp(1, 0.32, ghostFactor);
          arrowGroupRef.current.style.setProperty('--arrow-bevel-opacity', bevelOpacity.toFixed(3));
        }
      }

      // ----------------------------------------------------------------------
      // PREPARE FULL-HERO STAR/HYPERSPACE CANVAS & 1280x720 LOGO STAGE CANVASES
      // ----------------------------------------------------------------------
      if (!sprites) return;
      if (!canvasCtxsRef.current.star || !canvasCtxsRef.current.bg || !canvasCtxsRef.current.fg) {
        measureLayoutAndCanvases();
      }
      const starCtx = canvasCtxsRef.current.star;
      const bgCtx = canvasCtxsRef.current.bg;
      const fgCtx = canvasCtxsRef.current.fg;
      if (!starCtx || !bgCtx || !fgCtx) return;

      const starActive = (t >= 2.25 && t <= 5.1) || t >= 9.0;
      const bgActive = t >= 5.5 && t <= 6.55;
      const starSaved = starActive || starWasActiveRef.current;
      const bgSaved = bgActive || bgWasActiveRef.current;

      if (starSaved) {
        const coverScale = Math.max(viewW / 1280, viewH / 720);
        const coverOffsetX = (viewW - 1280 * coverScale) * 0.5;
        const coverOffsetY = (viewH - 720 * coverScale) * 0.5;

        starCtx.save();
        starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        starCtx.clearRect(0, 0, viewW, viewH);
        starCtx.setTransform(
          dpr * coverScale,
          0,
          0,
          dpr * coverScale,
          dpr * coverOffsetX,
          dpr * coverOffsetY
        );
        starWasActiveRef.current = starActive;
      }

      if (bgSaved) {
        bgCtx.save();
        bgCtx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
        bgCtx.clearRect(0, 0, 1280, 720);
        bgWasActiveRef.current = bgActive;
      }

      fgCtx.save();
      fgCtx.setTransform(stageScale, 0, 0, stageScale, 0, 0);
      fgCtx.clearRect(0, 0, 1280, 720);

      // ----------------------------------------------------------------------
      // FULL-HERO HYPERSPACE HAZE (2.30–5.00s) ON starCtx
      // ----------------------------------------------------------------------
      if (t >= 2.3 && t <= 5.1) {
        const hazeEnv =
          t < 4.05 ? smoothStep(2.3, 4.05, t) : 1 - smoothStep(4.15, 5.05, t);
        if (hazeEnv > 0.01) {
          const hGrad = starCtx.createRadialGradient(640, 360, 20, 640, 360, 760);
          hGrad.addColorStop(0, `rgba(27, 32, 36, ${0.85 * hazeEnv})`);
          hGrad.addColorStop(0.55, `rgba(14, 18, 22, ${0.52 * hazeEnv})`);
          hGrad.addColorStop(1, 'rgba(1, 1, 1, 0)');
          starCtx.fillStyle = hGrad;
          starCtx.fillRect(-300, -300, 1880, 1320);
        }
      }

      // ----------------------------------------------------------------------
      // 5. FULL-HERO HYPERSPACE STARS & RADIAL STARBURST (2.30–5.00s) ON starCtx
      // ----------------------------------------------------------------------
      if (t >= 2.25 && t <= 5.05) {
        starCtx.save();
        starCtx.globalCompositeOperation = 'lighter';

        // 5a. 2.3–3.5s: Diagonal drift toward upper-right across the entire hero screen
        if (t <= 3.9) {
          const driftEnv =
            t < 2.65 ? smoothStep(2.25, 2.65, t) : 1 - smoothStep(3.35, 3.9, t);
          for (let i = 0; i < DRIFT_STARS.length; i++) {
            const st = DRIFT_STARS[i];
            if (t < st.tStart || t > st.tEnd + 0.4) continue;
            const dt = t - st.tStart;
            const x = ((st.x0 + st.vx * dt) % 1400 + 1400) % 1400 - 60;
            const y = ((st.y0 + st.vy * dt) % 820 + 820) % 820 - 50;
            const a = st.alpha * driftEnv;
            if (a <= 0.01) continue;

            const stretch = smoothStep(2.5, 3.4, t);
            const lx = st.len * stretch * 0.82;
            const ly = -st.len * stretch * 0.57;

            starCtx.strokeStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`;
            starCtx.lineWidth = st.size;
            starCtx.beginPath();
            starCtx.moveTo(x - lx, y - ly);
            starCtx.lineTo(x, y);
            starCtx.stroke();

            starCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a * 1.3).toFixed(3)})`;
            starCtx.beginPath();
            starCtx.arc(x, y, st.size * 0.9, 0, Math.PI * 2);
            starCtx.fill();
          }
        }

        // 5b. 3.3–5.0s: Radial starburst from ~(610, 390) across the entire hero screen
        // Zero per-star createLinearGradient allocations (eliminates 240 gradient allocations/frame)
        if (t >= 3.25) {
          const burstEnv =
            t < 4.15 ? smoothStep(3.25, 4.05, t) : 1 - smoothStep(4.35, 5.02, t);
          if (burstEnv > 0.01) {
            const cx = 610;
            const cy = 390;
            for (let i = 0; i < BURST_STARS.length; i++) {
              const bs = BURST_STARS[i];
              const localT = Math.max(0, t - 3.25 - bs.phase * 0.5);
              const dist = bs.r0 + bs.speed * Math.pow(localT, 1.45);
              const rInner = dist % 860;
              const streakLen = (28 + rInner * bs.lenScale) * burstEnv;
              const rMid = rInner + streakLen * 0.45;
              const rOuter = rInner + streakLen;

              const cosA = Math.cos(bs.angle);
              const sinA = Math.sin(bs.angle);
              const x0 = cx + cosA * rInner;
              const y0 = cy + sinA * rInner;
              const xm = cx + cosA * rMid;
              const ym = cy + sinA * rMid;
              const x1 = cx + cosA * rOuter;
              const y1 = cy + sinA * rOuter;

              const alpha = bs.alpha * burstEnv * clamp(rInner / 120, 0.15, 1);

              starCtx.lineWidth = bs.width;
              starCtx.strokeStyle = `rgba(240, 245, 255, ${(alpha * 0.35).toFixed(3)})`;
              starCtx.beginPath();
              starCtx.moveTo(x0, y0);
              starCtx.lineTo(xm, ym);
              starCtx.stroke();

              starCtx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(3)})`;
              starCtx.beginPath();
              starCtx.moveTo(xm, ym);
              starCtx.lineTo(x1, y1);
              starCtx.stroke();

              starCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.2).toFixed(3)})`;
              starCtx.beginPath();
              starCtx.arc(x1, y1, bs.width * 0.85, 0, Math.PI * 2);
              starCtx.fill();
            }
          }
        }

        starCtx.restore();
      }

      // ----------------------------------------------------------------------
      // 10. FULL-HERO SETTLE DRIFTING DUST PARTICLES (9.10–12.30s) ON starCtx
      // ----------------------------------------------------------------------
      if (t >= 9.0) {
        const dustEnv = smoothStep(9.05, 9.55, t);
        starCtx.save();
        starCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < DUST_MOTES.length; i++) {
          const dm = DUST_MOTES[i];
          const dt = tFull - 9.0;
          const x = (dm.x0 + dm.vx * dt + 1280) % 1280;
          const y = (dm.y0 + dm.vy * dt + 720) % 720;
          const r = dm.r * 3.2;
          starCtx.globalAlpha = dm.alpha * dustEnv;
          starCtx.drawImage(sprites.sparkle, x - r, y - r, r * 2, r * 2);
        }
        starCtx.restore();
      }

      // ----------------------------------------------------------------------
      // 7a. SECOND ORBIT — FAR HALF BEHIND LOGO (5.55–6.45s) ON bgCtx (16:9 stage)
      // ----------------------------------------------------------------------
      if (t >= 5.5 && t <= 6.55) {
        const backEnv =
          t < 5.75 ? smoothStep(5.5, 5.75, t) : 1 - smoothStep(6.25, 6.55, t);
        drawFlyingArrowAndTrail(
          bgCtx,
          sprites,
          FLIGHT2_KEYFRAMES,
          t,
          0.55,
          0.65 * backEnv,
          0.6 * backEnv,
          3
        );
      }

      // ======================================================================
      // FOREGROUND ADDITIVE & COMPOSITE EFFECTS (OVER SVG LOGO)
      // ======================================================================
      const toScreen = (rx: number, ry: number): Vec2 => ({
        x: 640 + dx + s * (rx - 640),
        y: 360 + dy + s * (ry - 360),
      });

      // ----------------------------------------------------------------------
      // 2. ARROW CRACKLE (0.40–1.00s & 1.05–1.55s at 90Hz high-FPS refresh)
      // ----------------------------------------------------------------------
      if (t >= 0.4 && t <= 1.6) {
        const crackleEnv =
          t <= 1.0
            ? Math.sin(invLerp(0.4, 1.0, t) * Math.PI)
            : 0.85 * Math.sin(invLerp(1.0, 1.6, t) * Math.PI);
        if (crackleEnv > 0.05) {
          const frameSeed = Math.floor(t * 90) * 7919 + 101;
          const rng = mulberry32(frameSeed);
          fgCtx.save();
          fgCtx.globalCompositeOperation = 'lighter';

          const numArcs = 3 + Math.floor(rng() * 3);
          for (let a = 0; a < numArcs; a++) {
            const onRightEdge = rng() > 0.32;
            let curRx = onRightEdge ? 1086 + (rng() - 0.5) * 4 : 985 + rng() * 100;
            let curRy = onRightEdge ? 36 + rng() * 125 : 40 + rng() * 135;

            const segs = 5 + Math.floor(rng() * 5);
            fgCtx.beginPath();
            const pStart = toScreen(curRx, curRy);
            fgCtx.moveTo(pStart.x, pStart.y);

            for (let k = 0; k < segs; k++) {
              curRx += (rng() - 0.48) * 14;
              curRy += 8 + rng() * 14;
              const pt = toScreen(curRx, curRy);
              fgCtx.lineTo(pt.x, pt.y);
            }
            fgCtx.strokeStyle = `rgba(255, 255, 255, ${0.85 * crackleEnv})`;
            fgCtx.lineWidth = 1.6;
            fgCtx.stroke();

            const gPt = toScreen(curRx, curRy);
            fgCtx.globalAlpha = 0.35 * crackleEnv;
            fgCtx.drawImage(sprites.softGlow, gPt.x - 28, gPt.y - 28, 56, 56);
          }
          fgCtx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // 3. LIGHT SWEEP & HEXAGONAL BOKEH (1.00–2.20s)
      // ----------------------------------------------------------------------
      if (t >= 0.95 && t <= 2.2) {
        const sweepU = easeOutCubic(invLerp(0.95, 1.95, t));
        const sweepEnv =
          t < 1.3
            ? smoothStep(0.95, 1.25, t)
            : 1 - smoothStep(1.4, 2.18, t);

        if (sweepEnv > 0.01) {
          fgCtx.save();
          fgCtx.globalCompositeOperation = 'lighter';

          const restCx = lerp(520, 1045, sweepU);
          const restCy = lerp(475, 68, sweepU);
          const center = toScreen(restCx, restCy);

          const angle = Math.atan2(55 - 545, 1060 - 430);
          fgCtx.save();
          fgCtx.translate(center.x, center.y);
          fgCtx.rotate(angle);

          const streakLen = 360 * s;
          const streakW = 68 * s;
          fgCtx.globalAlpha = 0.95 * sweepEnv;
          fgCtx.drawImage(
            sprites.softGlow,
            -streakLen,
            -streakW,
            streakLen * 2,
            streakW * 2
          );
          fgCtx.globalAlpha = 0.85 * sweepEnv;
          fgCtx.drawImage(
            sprites.softGlow,
            -streakLen * 0.55,
            -streakW * 0.45,
            streakLen * 1.1,
            streakW * 0.9
          );
          fgCtx.restore();

          if (t >= 1.0 && t <= 1.6) {
            const bokehEnv = Math.sin(invLerp(1.0, 1.6, t) * Math.PI);
            const bokehList = [
              { x: 86, y: 665, r: 46, a: 0.065 },
              { x: 262, y: 580, r: 22, a: 0.075 },
              { x: 358, y: 505, r: 34, a: 0.055 },
              { x: 462, y: 435, r: 16, a: 0.06 },
              { x: 562, y: 368, r: 28, a: 0.05 },
            ];
            for (const b of bokehList) {
              fgCtx.globalAlpha = b.a * bokehEnv;
              fgCtx.drawImage(sprites.hexBokeh, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
            }
          }

          fgCtx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // 6. FIRST FLYING ARROW (3.50–5.65s)
      // ----------------------------------------------------------------------
      if (t >= 3.45 && t <= 5.75) {
        const headAlpha =
          t < 3.7 ? smoothStep(3.45, 3.7, t) : 1 - smoothStep(5.38, 5.68, t);
        const trailAlpha =
          t < 3.75 ? smoothStep(3.45, 3.75, t) : 1 - smoothStep(5.35, 5.72, t);

        drawFlyingArrowAndTrail(
          fgCtx,
          sprites,
          FLIGHT1_KEYFRAMES,
          t,
          0.95,
          headAlpha,
          trailAlpha,
          3
        );

        fgCtx.save();
        fgCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < ORBIT1_SPARKLES.length; i++) {
          const sp = ORBIT1_SPARKLES[i];
          const age = t - sp.tBirth;
          if (age < 0 || age > sp.life) continue;
          const lifeU = age / sp.life;
          const env = Math.sin(lifeU * Math.PI);
          const basePt = evalTrajectory(FLIGHT1_KEYFRAMES, 3.6 + sp.uPos * 1.85);
          const nx = -basePt.ty;
          const ny = basePt.tx;
          const sx = basePt.x + nx * sp.offsetN + sp.driftX * age;
          const sy = basePt.y + ny * sp.offsetN + sp.driftY * age;
          const r = sp.size * 3.0;
          fgCtx.globalAlpha = 0.75 * env * trailAlpha;
          fgCtx.drawImage(sprites.sparkle, sx - r, sy - r, r * 2, r * 2);
        }
        fgCtx.restore();
      }

      // ----------------------------------------------------------------------
      // 7b. SECOND ORBIT — NEAR/FRONT HALF (6.20–8.60s)
      // ----------------------------------------------------------------------
      if (t >= 6.15 && t <= 8.65) {
        const frontIn = smoothStep(6.15, 6.48, t);
        const headOut = 1 - smoothStep(8.12, 8.36, t);
        const trailOut = 1 - smoothStep(8.18, 8.62, t);

        drawFlyingArrowAndTrail(
          fgCtx,
          sprites,
          FLIGHT2_KEYFRAMES,
          Math.min(t, 8.38),
          0.88,
          frontIn * headOut,
          frontIn * trailOut,
          3
        );

        fgCtx.save();
        fgCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < ORBIT2_SPARKLES.length; i++) {
          const sp = ORBIT2_SPARKLES[i];
          const age = t - sp.tBirth;
          if (age < 0 || age > sp.life) continue;
          const lifeU = age / sp.life;
          const env = Math.sin(lifeU * Math.PI);
          const basePt = evalTrajectory(FLIGHT2_KEYFRAMES, 5.9 + sp.uPos * 2.35);
          const nx = -basePt.ty;
          const ny = basePt.tx;
          const sx = basePt.x + nx * sp.offsetN + sp.driftX * age;
          const sy = basePt.y + ny * sp.offsetN + sp.driftY * age;
          const r = sp.size * 3.2;
          fgCtx.globalAlpha = 0.82 * env * trailOut;
          fgCtx.drawImage(sprites.sparkle, sx - r, sy - r, r * 2, r * 2);
        }
        fgCtx.restore();
      }

      // ----------------------------------------------------------------------
      // 8. TIP GLINT (8.30–8.58s at arrowhead tip/neck ~(1005, 88))
      // ----------------------------------------------------------------------
      if (t >= 8.28 && t <= 8.6) {
        const glintEnv = Math.sin(invLerp(8.28, 8.6, t) * Math.PI);
        if (glintEnv > 0.01) {
          const gx = 1005;
          const gy = 88;
          fgCtx.save();
          fgCtx.globalCompositeOperation = 'lighter';

          const r = 135 * glintEnv;
          fgCtx.globalAlpha = 0.95 * glintEnv;
          fgCtx.drawImage(sprites.softGlow, gx - r, gy - r, r * 2, r * 2);

          const streakW = 360 * glintEnv;
          const streakH = 14;
          fgCtx.globalAlpha = 0.85 * glintEnv;
          fgCtx.drawImage(
            sprites.blueCore,
            gx - streakW,
            gy - streakH,
            streakW * 2,
            streakH * 2
          );

          for (let k = 0; k < 18; k++) {
            const ang = (k / 18) * Math.PI * 2 + 0.2;
            const len = (55 + (k % 3) * 45) * glintEnv;
            fgCtx.strokeStyle = `rgba(255, 255, 255, ${0.45 * glintEnv})`;
            fgCtx.lineWidth = 1.2;
            fgCtx.beginPath();
            fgCtx.moveTo(gx, gy);
            fgCtx.lineTo(gx + Math.cos(ang) * len, gy + Math.sin(ang) * len);
            fgCtx.stroke();
          }

          fgCtx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // 9. LENS FLARE (8.50–9.42s)
      // ----------------------------------------------------------------------
      if (t >= 8.48 && t <= 9.45) {
        const flareEnv =
          t < 8.78
            ? smoothStep(8.48, 8.76, t)
            : 1 - easeInOutCubic(invLerp(8.82, 9.42, t));

        if (flareEnv > 0.005) {
          const driftU = easeOutCubic(invLerp(8.55, 9.3, t));
          const coreX = lerp(582, 442, driftU);
          const coreY = 348;

          fgCtx.save();
          fgCtx.globalCompositeOperation = 'lighter';

          const streakGrad = fgCtx.createLinearGradient(0, coreY, 1280, coreY);
          streakGrad.addColorStop(0, 'rgba(160, 200, 250, 0)');
          streakGrad.addColorStop(
            clamp((coreX - 240) / 1280, 0.05, 0.9),
            `rgba(200, 228, 255, ${0.55 * flareEnv})`
          );
          streakGrad.addColorStop(
            clamp(coreX / 1280, 0.1, 0.95),
            `rgba(255, 255, 255, ${0.95 * flareEnv})`
          );
          streakGrad.addColorStop(
            clamp((coreX + 260) / 1280, 0.15, 0.98),
            `rgba(200, 228, 255, ${0.55 * flareEnv})`
          );
          streakGrad.addColorStop(1, 'rgba(160, 200, 250, 0)');

          fgCtx.globalAlpha = 0.65 * flareEnv;
          fgCtx.drawImage(sprites.blueCore, -100, coreY - 26, 1480, 52);

          fgCtx.globalAlpha = 1;
          fgCtx.fillStyle = streakGrad;
          fgCtx.fillRect(0, coreY - 2.2, 1280, 4.4);

          const rayEnv =
            t < 8.8
              ? smoothStep(8.52, 8.78, t)
              : 1 - smoothStep(8.82, 9.32, t);
          if (rayEnv > 0.01) {
            // Single shared radial gradient for all 110 rays (replaces 110 createLinearGradient calls/frame)
            const maxRayR = 350 * (0.88 + 0.22 * driftU);
            const sharedRayGrad = fgCtx.createRadialGradient(coreX, coreY, 0, coreX, coreY, maxRayR);
            sharedRayGrad.addColorStop(0, `rgba(237, 244, 254, ${(0.35 * rayEnv).toFixed(3)})`);
            sharedRayGrad.addColorStop(0.55, `rgba(200, 222, 250, ${(0.16 * rayEnv).toFixed(3)})`);
            sharedRayGrad.addColorStop(1, 'rgba(180, 210, 245, 0)');
            fgCtx.strokeStyle = sharedRayGrad;

            for (let i = 0; i < FLARE_RAYS.length; i++) {
              const ray = FLARE_RAYS[i];
              const rLen = ray.len * (0.88 + 0.22 * driftU);
              const rx1 = coreX + Math.cos(ray.angle) * rLen;
              const ry1 = coreY + Math.sin(ray.angle) * rLen;

              fgCtx.lineWidth = ray.width;
              fgCtx.beginPath();
              fgCtx.moveTo(coreX, coreY);
              fgCtx.lineTo(rx1, ry1);
              fgCtx.stroke();
            }
          }

          const haloRadius = lerp(195, 285, driftU);
          const haloX = lerp(575, 515, driftU);
          const haloY = 348;
          fgCtx.beginPath();
          fgCtx.arc(haloX, haloY, haloRadius, 0, Math.PI * 2);
          fgCtx.strokeStyle = `rgba(210, 228, 250, ${0.22 * flareEnv})`;
          fgCtx.lineWidth = 26;
          fgCtx.stroke();

          const ghostArcRadius = 115 + 25 * driftU;
          const chromaColors = [
            { r: ghostArcRadius + 6, color: `rgba(255, 95, 75, ${0.22 * flareEnv})` },
            { r: ghostArcRadius + 2, color: `rgba(110, 245, 130, ${0.22 * flareEnv})` },
            { r: ghostArcRadius - 2, color: `rgba(90, 165, 255, ${0.25 * flareEnv})` },
          ];
          for (const ch of chromaColors) {
            fgCtx.beginPath();
            fgCtx.arc(coreX + 45, coreY - 6, ch.r, -0.75, 0.65);
            fgCtx.strokeStyle = ch.color;
            fgCtx.lineWidth = 5;
            fgCtx.stroke();
          }

          const bokehGhost = [
            { x: 885 + driftU * 25, y: 455, r: 34, a: 0.16 },
            { x: 945 + driftU * 35, y: 492, r: 58, a: 0.11 },
            { x: 745 + driftU * 15, y: 385, r: 22, a: 0.14 },
          ];
          for (const bg of bokehGhost) {
            fgCtx.globalAlpha = bg.a * flareEnv;
            fgCtx.drawImage(sprites.blueCore, bg.x - bg.r, bg.y - bg.r, bg.r * 2, bg.r * 2);
          }

          const coreR1 = 220 * flareEnv;
          const coreR2 = 95 * flareEnv;
          fgCtx.globalAlpha = 0.92 * flareEnv;
          fgCtx.drawImage(
            sprites.blueCore,
            coreX - coreR1,
            coreY - coreR1,
            coreR1 * 2,
            coreR1 * 2
          );
          fgCtx.globalAlpha = 1.0 * flareEnv;
          fgCtx.drawImage(
            sprites.softGlow,
            coreX - coreR2,
            coreY - coreR2,
            coreR2 * 2,
            coreR2 * 2
          );

          fgCtx.restore();
        }
      }

      if (starSaved) starCtx.restore();
      if (bgSaved) bgCtx.restore();
      fgCtx.restore();
    },
    [measureLayoutAndCanvases, onAudioCue, onWarpChange]
  );

  // ==========================================================================
  // HIGH-REFRESH R-A-F LOOP (>60 / 120 / 144 / 240 FPS), ?t=, window.__seek(t)
  // WITH INTERSECTION-OBSERVER VIEWPORT HIBERNATION
  // ==========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let startWallTime = performance.now();
    let isInViewport = true;

    measureLayoutAndCanvases();

    // Expose window.__seek(t) for frame-accurate scrubbing & verification
    window.__seek = (t: number) => {
      isPausedRef.current = true;
      if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
      measureLayoutAndCanvases();
      render(clamp(t, 0, TOTAL_DURATION));
    };
    window.__renderAt = window.__seek;
    window.__getCurrentTime = () => currentTimeRef.current;

    // Re-measure and re-render current frame on viewport resize
    const handleResize = () => {
      measureLayoutAndCanvases();
      if (isPausedRef.current || !isInViewport) {
        render(currentTimeRef.current);
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(() => handleResize())
        : null;
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Check URL query parameter ?t=4.25
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('t');
    if (tParam !== null && !Number.isNaN(parseFloat(tParam))) {
      isPausedRef.current = true;
      render(clamp(parseFloat(tParam), 0, TOTAL_DURATION));
      return () => {
        if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
        window.removeEventListener('resize', handleResize);
        resizeObserver?.disconnect();
      };
    }

    // Respect prefers-reduced-motion by jumping to final settled lockup state
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      isPausedRef.current = true;
      render(TOTAL_DURATION);
      return () => {
        if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
        window.removeEventListener('resize', handleResize);
        resizeObserver?.disconnect();
      };
    }

    if (!autoPlay) {
      render(0);
      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver?.disconnect();
      };
    }

    isPausedRef.current = false;
    firedCuesRef.current.clear();

    const tick = (now: number) => {
      if (isPausedRef.current || !isInViewport || document.hidden) return;
      const elapsedSec = (now - startWallTime) / 1000;
      if (elapsedSec >= TOTAL_DURATION) {
        if (loop) {
          startWallTime = now;
          firedCuesRef.current.clear();
          render(0);
          activeRafRef.current = requestAnimationFrame(tick);
        } else {
          render(TOTAL_DURATION);
          isPausedRef.current = true;
        }
        return;
      }
      render(elapsedSec);
      activeRafRef.current = requestAnimationFrame(tick);
    };

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined' && containerRef.current
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              const wasInViewport = isInViewport;
              isInViewport = entry.isIntersecting;
              if (!isInViewport && activeRafRef.current) {
                cancelAnimationFrame(activeRafRef.current);
                activeRafRef.current = 0;
              } else if (isInViewport && !wasInViewport && !isPausedRef.current) {
                startWallTime = performance.now() - currentTimeRef.current * 1000;
                activeRafRef.current = requestAnimationFrame(tick);
              }
            },
            { threshold: 0.01 }
          )
        : null;

    if (intersectionObserver && containerRef.current) {
      intersectionObserver.observe(containerRef.current);
    }

    render(0);
    activeRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [autoPlay, loop, measureLayoutAndCanvases, render]);

  const handleReplay = () => {
    if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
    measureLayoutAndCanvases();
    firedCuesRef.current.clear();
    isPausedRef.current = false;
    const startWall = performance.now();
    const step = (now: number) => {
      if (isPausedRef.current) return;
      const elapsed = (now - startWall) / 1000;
      if (elapsed >= TOTAL_DURATION) {
        render(TOTAL_DURATION);
        isPausedRef.current = true;
        return;
      }
      render(elapsed);
      activeRafRef.current = requestAnimationFrame(step);
    };
    render(0);
    activeRafRef.current = requestAnimationFrame(step);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleReplay}
      role="button"
      tabIndex={0}
      aria-label="Rasai animated brand reveal. Click to replay."
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleReplay();
        }
      }}
      className={`relative w-full h-full flex items-center justify-center bg-transparent overflow-hidden select-none cursor-pointer ${className}`}
    >
      {/* FULL-SCREEN HERO STAR / HYPERSPACE / DUST CANVAS:
          Covers 100% of width AND 100% of height on EVERY viewport (<1200px, mobile portrait, desktop) */}
      <canvas
        ref={starBgCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
        style={{ zIndex: 1, width: '100%', height: '100%' }}
      />

      {/* Responsive Brand Lockup:
          - During t=0..9.55s: Logo is 100% dead-center on mobile, tablet, and desktop.
          - After t=9.55s: Logo glides to the left side and stacked Urdu ("رسائی" in font-urdu
            matching the mobile header) + English ("rasai") emerges from the background with glare. */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {/* LOGO STAGE (Centered at 50%/50% during 0..9.55s, then slides left) */}
        <div
          ref={logoSlideRef}
          className="absolute left-1/2 top-1/2 z-20 will-change-transform"
          style={{ transform: 'translate3d(-52.656%, -50%, 0)' }}
        >
          <div
            id="rasai-stage-16x9"
            className="relative w-[56vw] sm:w-[46vw] md:w-[38vw] lg:w-[31vw] xl:w-[27vw] max-w-[420px] min-w-[175px] aspect-video bg-transparent overflow-visible"
          >
            {/* LAYER 1: Behind-Logo Far Orbit Canvas */}
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            />

            {/* LAYER 2: Inline SVG Logo split into #body and #arrow in 1280x720 reference space */}
            <svg
              ref={svgElementRef}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1280 720"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible will-change-transform"
              style={{ zIndex: 2, transformOrigin: '50% 50%' }}
            >
              <defs>
                <linearGradient
                  id="grad-body-outer"
                  x1="248"
                  y1="497"
                  x2="660"
                  y2="96"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#d2d2d2" />
                  <stop offset="60%" stopColor="#dcdcdc" />
                  <stop offset="100%" stopColor="#eeeeee" />
                </linearGradient>
                <linearGradient
                  id="grad-body-inner"
                  x1="376"
                  y1="497"
                  x2="895"
                  y2="136"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#dcdcdc" />
                  <stop offset="65%" stopColor="#eaeaea" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient
                  id="grad-body-lower"
                  x1="524"
                  y1="639"
                  x2="922"
                  y2="290"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#d4d4d4" />
                  <stop offset="55%" stopColor="#e2e2e2" />
                  <stop offset="100%" stopColor="#f2f2f2" />
                </linearGradient>
                <linearGradient
                  id="grad-arrow-main"
                  x1="380"
                  y1="570"
                  x2="1050"
                  y2="60"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop ref={ghostStop0Ref} offset="0%" stopColor="#dadada" />
                  <stop ref={ghostStop1Ref} offset="42%" stopColor="#dcdcdc" />
                  <stop ref={ghostStop2Ref} offset="100%" stopColor="#f8f8f8" />
                </linearGradient>
              </defs>

              <g ref={svgTransformGroupRef} id="logo-camera-rig">
                {/* #body = everything except the diagonal arrow stroke */}
                <g id="body">
                  <path d={LOGO_PATHS.bodyOuter.d} fill="url(#grad-body-outer)" />
                  {LOGO_PATHS.bodyOuter.bevels.map((b, i) => (
                    <path key={`bo-${i}`} d={b.d} fill={b.fill} />
                  ))}

                  <path d={LOGO_PATHS.bodyInner.d} fill="url(#grad-body-inner)" />

                  <path d={LOGO_PATHS.bodyLower.d} fill="url(#grad-body-lower)" />
                  {LOGO_PATHS.bodyLower.bevels.map((b, i) => (
                    <path key={`bl-${i}`} d={b.d} fill={b.fill} />
                  ))}
                </g>

                {/* #arrow = the long diagonal stroke ending in the arrowhead */}
                <g ref={arrowGroupRef} id="arrow">
                  <path d={LOGO_PATHS.arrow.d} fill="url(#grad-arrow-main)" />
                  {LOGO_PATHS.arrow.bevels.map((b, i) => (
                    <path
                      key={`ar-${i}`}
                      d={b.d}
                      fill={b.fill}
                      style={{ opacity: 'var(--arrow-bevel-opacity, 1)' }}
                    />
                  ))}
                </g>
              </g>
            </svg>

            {/* LAYER 3: Foreground Stacked Canvas (Crackle, Sweep, Flying Arrows, Glint, Lens Flare) */}
            <canvas
              ref={fgCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 3 }}
            />
          </div>
        </div>

        {/* STACKED URDU ("رسائی" matching mobile header font-urdu) + ENGLISH ("rasai") LOCKUP
            Sized to match --emblem-w and --emblem-h so logo and text take equal space on the screen */}
        <div
          ref={textRevealRef}
          className="absolute left-1/2 top-1/2 z-10 pointer-events-none will-change-[transform,opacity]"
          style={{
            opacity: 0,
            transform: 'translate3d(-50%, -50%, 0) scale3d(0.74, 0.74, 1)',
            minWidth: 'var(--emblem-w, 220px)',
            minHeight: 'var(--emblem-h, 160px)',
          }}
        >
          <div
            className="relative flex flex-col items-center justify-center overflow-visible select-none text-white whitespace-nowrap"
            style={{
              width: 'var(--emblem-w, 220px)',
              minHeight: 'var(--emblem-h, 160px)',
              gap: 'calc(var(--emblem-h, 160px) * 0.16)',
            }}
          >
            {/* Top Half: Urdu calligraphy (matching authentic brand calligraphy) */}
            <div className="relative flex items-center justify-center w-full">
              <RasaiUrduCalligraphy
                variant="white"
                style={{
                  height: 'calc(var(--emblem-h, 160px) * 0.44)',
                }}
                className="select-none flex items-center justify-center pb-1 sm:pb-2"
              />
              <span
                ref={urduGlareRef}
                aria-hidden="true"
                className="absolute inset-0 select-none flex items-center justify-center w-full pb-1 sm:pb-2 pointer-events-none"
                style={{
                  height: 'calc(var(--emblem-h, 160px) * 0.44)',
                  WebkitMaskImage: 'url(/rasai_urdu_white.png)',
                  maskImage: 'url(/rasai_urdu_white.png)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  opacity: 0,
                  mixBlendMode: 'screen',
                }}
              />
            </div>

            {/* Bottom Half: English "rasai" matched in visual width & weight to the emblem */}
            <div className="relative flex items-center justify-center w-full">
              <span
                className="font-sans font-bold leading-[0.95] tracking-[-0.03em] text-white lowercase select-none flex items-center justify-center w-full pt-1 sm:pt-1.5"
                style={{
                  fontSize: 'calc(var(--emblem-h, 160px) * 0.46)',
                }}
              >
                rasai
              </span>
              <span
                ref={engGlareRef}
                aria-hidden="true"
                className="absolute inset-0 font-sans font-bold leading-[0.95] tracking-[-0.03em] lowercase select-none flex items-center justify-center w-full pt-1 sm:pt-1.5 pointer-events-none"
                style={{
                  fontSize: 'calc(var(--emblem-h, 160px) * 0.46)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mixBlendMode: 'screen',
                  opacity: 0,
                }}
              >
                rasai
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RasaiChoreography;
