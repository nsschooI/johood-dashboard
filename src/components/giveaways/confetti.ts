"use client";

import { prefersReducedMotion } from "@/lib/motion";

const COLORS = ["#e11d48", "#fb7185", "#fbbf24", "#fff1e6", "#f59e0b", "#be123c"];

/**
 * A short confetti burst on a full-screen canvas (no library). Pieces fly
 * up from `origin` (viewport px), tumble and fall; the canvas removes itself.
 */
export function confetti(origin?: { x: number; y: number }) {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "70" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const ox = origin?.x ?? w / 2;
  const oy = origin?.y ?? h * 0.6;
  const pieces = Array.from({ length: Math.min(160, Math.round(w / 4)) }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 7 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.25,
    };
  });

  const start = performance.now();
  const frame = (t: number) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, w, h);
    for (const p of pieces) {
      p.vy += 0.28;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tilt += 0.12;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 1800) / 900);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(Math.cos(p.tilt)), p.size, (p.size / 2) * Math.abs(Math.cos(p.tilt)) + 0.5);
      }
      ctx.restore();
    }
    if (elapsed < 2700) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
