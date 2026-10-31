// src/components/auth/InteractiveGridBackground.tsx
// High-performance canvas rendering a 55px grid with magnetic gravitational warp where illumination is strictly circular
import React, { useEffect, useRef } from 'react';

interface InteractiveGridBackgroundProps {
  cardSelector?: string;
  cellSize?: number;
  radius?: number;
  maxWarp?: number;
}

export const InteractiveGridBackground: React.FC<InteractiveGridBackgroundProps> = ({
  cardSelector = '.uiverse-form',
  cellSize = 55,
  radius = 180,
  maxWarp = 20,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let isOverCard = false;

    // Elastic damped spring physics state
    let targetIntensity = 0;
    let currentIntensity = 0;
    let springVelocity = 0;

    const handleResize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      isOverCard = targetEl ? Boolean(targetEl.closest(cardSelector)) : false;
      targetIntensity = isOverCard ? 0 : 1;
    };

    const handlePointerLeave = () => {
      targetIntensity = 0;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

    const render = () => {
      // Smooth cursor lerp
      currentX += (mouseX - currentX) * 0.2;
      currentY += (mouseY - currentY) * 0.2;

      // Spring physics: acceleration = k * (target - current) - damping * velocity
      const springStiffness = 0.16;
      const springDamping = 0.76;
      const force = (targetIntensity - currentIntensity) * springStiffness;
      springVelocity = (springVelocity + force) * springDamping;
      currentIntensity += springVelocity;

      if (Math.abs(currentIntensity) < 0.0005 && Math.abs(springVelocity) < 0.0005) {
        currentIntensity = 0;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const viewW = width / dpr;
      const viewH = height / dpr;

      // Pure dark background base
      ctx.fillStyle = '#0c0c0c';
      ctx.fillRect(0, 0, viewW, viewH);

      const activeRadius = radius;
      const activeWarp = maxWarp * currentIntensity;
      const rSq = activeRadius * activeRadius;

      // Create a smooth radial gradient for circular line illumination
      const intensity = Math.max(0, currentIntensity);
      const radialStrokeGrad = ctx.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        activeRadius
      );
      radialStrokeGrad.addColorStop(0, `rgba(240, 244, 252, ${(0.88 * intensity).toFixed(3)})`);
      radialStrokeGrad.addColorStop(0.35, `rgba(210, 216, 228, ${(0.55 * intensity).toFixed(3)})`);
      radialStrokeGrad.addColorStop(0.7, `rgba(130, 138, 150, ${(0.22 * intensity).toFixed(3)})`);
      radialStrokeGrad.addColorStop(1, '#1e1e1e');

      // Displacement helper function for gravitational pull
      const getDistortion = (px: number, py: number) => {
        if (Math.abs(activeWarp) < 0.01) return { x: px, y: py };
        const dx = currentX - px;
        const dy = currentY - py;
        const distSq = dx * dx + dy * dy;
        if (distSq >= rSq || distSq < 1) return { x: px, y: py };

        const dist = Math.sqrt(distSq);
        const ratio = 1 - dist / activeRadius;
        // Smooth gravitational falloff: (1 - d/R)^2
        const pull = ratio * ratio * activeWarp;
        return {
          x: px + (dx / dist) * pull,
          y: py + (dy / dist) * pull,
        };
      };

      // 1. Vertical Grid Lines (Circular chord calculation)
      const xCount = Math.ceil(viewW / cellSize) + 1;
      for (let i = 0; i <= xCount; i++) {
        const baseX = i * cellSize;
        const distToMouseX = Math.abs(baseX - currentX);

        if (distToMouseX >= activeRadius || Math.abs(activeWarp) < 0.01) {
          // Standard dark line outside the circular zone
          ctx.strokeStyle = '#1e1e1e';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(baseX, 0);
          ctx.lineTo(baseX, viewH);
          ctx.stroke();
        } else {
          // Exact circular boundary chord length: halfChord = sqrt(R^2 - dx^2)
          const halfChordY = Math.sqrt(rSq - distToMouseX * distToMouseX);
          const yStart = Math.max(0, currentY - halfChordY);
          const yEnd = Math.min(viewH, currentY + halfChordY);

          // Straight dark sections outside the circle
          ctx.strokeStyle = '#1e1e1e';
          ctx.lineWidth = 1;

          if (yStart > 0) {
            ctx.beginPath();
            ctx.moveTo(baseX, 0);
            ctx.lineTo(baseX, yStart);
            ctx.stroke();
          }

          if (yEnd < viewH) {
            ctx.beginPath();
            ctx.moveTo(baseX, yEnd);
            ctx.lineTo(baseX, viewH);
            ctx.stroke();
          }

          // ONLY the segment within the circular boundary is warped and illuminated
          ctx.beginPath();
          ctx.moveTo(baseX, yStart);
          const stepY = 8;
          for (let y = yStart; y <= yEnd; y += stepY) {
            const distorted = getDistortion(baseX, y);
            ctx.lineTo(distorted.x, distorted.y);
          }
          ctx.lineTo(baseX, yEnd);

          ctx.strokeStyle = radialStrokeGrad;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }

      // 2. Horizontal Grid Lines (Circular chord calculation)
      const yCount = Math.ceil(viewH / cellSize) + 1;
      for (let j = 0; j <= yCount; j++) {
        const baseY = j * cellSize;
        const distToMouseY = Math.abs(baseY - currentY);

        if (distToMouseY >= activeRadius || Math.abs(activeWarp) < 0.01) {
          // Standard dark line outside the circular zone
          ctx.strokeStyle = '#1e1e1e';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          ctx.lineTo(viewW, baseY);
          ctx.stroke();
        } else {
          // Exact circular boundary chord length: halfChord = sqrt(R^2 - dy^2)
          const halfChordX = Math.sqrt(rSq - distToMouseY * distToMouseY);
          const xStart = Math.max(0, currentX - halfChordX);
          const xEnd = Math.min(viewW, currentX + halfChordX);

          // Straight dark sections outside the circle
          ctx.strokeStyle = '#1e1e1e';
          ctx.lineWidth = 1;

          if (xStart > 0) {
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            ctx.lineTo(xStart, baseY);
            ctx.stroke();
          }

          if (xEnd < viewW) {
            ctx.beginPath();
            ctx.moveTo(xEnd, baseY);
            ctx.lineTo(viewW, baseY);
            ctx.stroke();
          }

          // ONLY the segment within the circular boundary is warped and illuminated
          ctx.beginPath();
          ctx.moveTo(xStart, baseY);
          const stepX = 8;
          for (let x = xStart; x <= xEnd; x += stepX) {
            const distorted = getDistortion(x, baseY);
            ctx.lineTo(distorted.x, distorted.y);
          }
          ctx.lineTo(xEnd, baseY);

          ctx.strokeStyle = radialStrokeGrad;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [cardSelector, cellSize, radius, maxWarp]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};

export default InteractiveGridBackground;
