import React, { useEffect, useRef } from 'react';

export interface StarfieldCanvasProps {
  warpSpeed?: boolean;
  className?: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  prevZ: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

export const StarfieldCanvas: React.FC<StarfieldCanvasProps> = ({
  warpSpeed = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetSpeedRef = useRef<number>(2.0);
  const currentSpeedRef = useRef<number>(2.0);

  useEffect(() => {
    targetSpeedRef.current = warpSpeed ? 36.0 : 2.0;
  }, [warpSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = 1;

    const updateSize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : null;
      width = Math.max(1, rect && rect.width > 0 ? rect.width : window.innerWidth);
      height = Math.max(1, rect && rect.height > 0 ? rect.height : window.innerHeight);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && canvas.parentElement
        ? new ResizeObserver(() => updateSize())
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Wide 3D frustum so stars cover 100% of width AND height on portrait mobile (<1200px) and ultrawide
    const numStars = 560;
    const stars: Star[] = [];
    const palette = [
      [255, 255, 255],
      [230, 242, 255],
      [195, 232, 255],
      [245, 240, 225],
    ];

    for (let i = 0; i < numStars; i++) {
      const col = palette[i % palette.length];
      const z = Math.random() * 1200 + 5;
      stars.push({
        x: (Math.random() - 0.5) * 3200,
        y: (Math.random() - 0.5) * 3200,
        z,
        prevZ: z,
        size: Math.random() * 1.65 + 0.55,
        baseAlpha: 0.38 + Math.random() * 0.62,
        twinkleSpeed: 1.5 + Math.random() * 3.5,
        twinklePhase: Math.random() * Math.PI * 2,
        colorR: col[0],
        colorG: col[1],
        colorB: col[2],
      });
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      // Delta-time normalized to 60Hz baseline so 120Hz/144Hz/240Hz runs with sub-frame silkiness
      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const dt60 = dtSec * 60;

      const lerpFactor = 1 - Math.pow(1 - 0.08, dt60);
      currentSpeedRef.current += (targetSpeedRef.current - currentSpeedRef.current) * lerpFactor;
      const speed = currentSpeedRef.current;
      const isWarping = speed > 4.5;
      const warpRatio = Math.min(1, Math.max(0, (speed - 2.0) / 32.0));

      // Deep #010101 space background across entire hero section width & height
      ctx.fillStyle = '#010101';
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxDim = Math.max(width, height);

      // Subtle atmospheric space haze during warp
      if (warpRatio > 0.01) {
        const maxR = maxDim * 0.78;
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, `rgba(27, 32, 36, ${0.75 * warpRatio})`);
        grad.addColorStop(0.55, `rgba(14, 18, 22, ${0.45 * warpRatio})`);
        grad.addColorStop(1, 'rgba(1, 1, 1, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Use max(width, height) * 0.62 so even at z=1200, stars span [-0.99*maxDim, +0.99*maxDim] in both axes
      const fov = maxDim * 0.62;
      const timeSec = now * 0.001;

      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        star.prevZ = star.z;
        star.z -= speed * dt60;

        if (star.z <= 2) {
          star.x = (Math.random() - 0.5) * 3200;
          star.y = (Math.random() - 0.5) * 3200;
          star.z = 1200;
          star.prevZ = 1200;
        }

        const k = fov / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        if (px < -80 || px > width + 80 || py < -80 || py > height + 80) continue;

        const depthAlpha = Math.min(1, Math.max(0.1, (1200 - star.z) / 900));
        const twinkle = 0.78 + 0.22 * Math.sin(timeSec * star.twinkleSpeed + star.twinklePhase);
        const alpha = depthAlpha * star.baseAlpha * twinkle;
        const radius = Math.max(0.5, (1 - star.z / 1200) * star.size * (1 + warpRatio * 0.45));

        if (isWarping) {
          const streakZ = star.z + speed * (1.8 + warpRatio * 2.6);
          const prevK = fov / streakZ;
          const prevPx = star.x * prevK + cx;
          const prevPy = star.y * prevK + cy;

          ctx.beginPath();
          ctx.strokeStyle = `rgba(${star.colorR}, ${star.colorG}, ${star.colorB}, ${alpha})`;
          ctx.lineWidth = radius * 1.35;
          ctx.lineCap = 'round';
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.25)})`;
          ctx.arc(px, py, radius * 0.85, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${star.colorR}, ${star.colorG}, ${star.colorB}, ${alpha})`;
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();

          if (star.size > 1.55 && star.z < 550) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(${star.colorR}, ${star.colorG}, ${star.colorB}, ${alpha * 0.24})`;
            ctx.arc(px, py, radius * 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full block pointer-events-none select-none ${className}`}
      style={{ zIndex: 0, width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
};

export default StarfieldCanvas;
