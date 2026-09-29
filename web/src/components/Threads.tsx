import React, { useEffect, useRef } from 'react';

interface ThreadsProps {
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  color?: string | number[];
  className?: string;
  style?: React.CSSProperties;
}

export const Threads: React.FC<ThreadsProps> = ({
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = true,
  color = [0.1, 0.75, 0.45], // Emerald / Green
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableMouseInteraction || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = -1000;
      mouseRef.current.targetY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const numThreads = 35;
    let time = 0;

    // Resolve color
    const [r, g, b] = Array.isArray(color)
      ? [Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255)]
      : [16, 185, 129]; // fallback emerald #10b981

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      const centerY = height * 0.5;
      const baseAmp = 45 * amplitude;
      const step = 6;

      for (let i = 0; i < numThreads; i++) {
        const offset = (i / numThreads) * Math.PI * 2;
        const threadYOffset = (i - numThreads / 2) * (1.5 + distance);
        const alpha = 0.08 + 0.35 * Math.sin((i / numThreads) * Math.PI);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 1.2;

        let prevX = 0;
        let prevY = centerY;

        for (let x = 0; x <= width + step; x += step) {
          const progress = x / width;
          const wave1 = Math.sin(progress * 4.5 + time + offset) * baseAmp;
          const wave2 = Math.cos(progress * 2.2 - time * 0.8 + offset * 0.5) * (baseAmp * 0.6);
          const wave3 = Math.sin(progress * 8.0 + time * 1.5) * (baseAmp * 0.25);

          let y = centerY + threadYOffset + wave1 + wave2 + wave3;

          // Mouse attraction/distortion
          if (enableMouseInteraction) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 200;
            if (dist < maxDist) {
              const force = (1 - dist / maxDist) * 35;
              y += (mouseRef.current.y > y ? 1 : -1) * force;
            }
          }

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            const cx = (prevX + x) / 2;
            const cy = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cx, cy);
          }

          prevX = x;
          prevY = y;
        }

        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [amplitude, distance, enableMouseInteraction, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      style={style}
    />
  );
};

export default Threads;
