import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type Place = 'top' | 'bottom' | 'left' | 'right';
export type CoachStep = { id: string; target: string; text: string; step: number; total: number; prefer?: Place } | null;

type Box = { left: number; top: number; width: number; height: number };

const BUBBLE_W = 270;
const GAP = 16;

/** Points at an element on screen with a pulsing ring and a hint bubble. Never blocks clicks. */
export function Coach({ step, onSkip }: { step: CoachStep; onSkip: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (!step) { setBox(null); return; }
    let last = '';
    const measure = () => {
      const el = document.querySelector(step.target);
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      const key = next ? `${Math.round(next.left)},${Math.round(next.top)},${Math.round(next.width)},${Math.round(next.height)}` : '';
      if (key !== last) { last = key; setBox(next); }
      frame.current = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame.current);
  }, [step]);

  if (!step || !box) return null;

  const vw = window.innerWidth, vh = window.innerHeight;
  const space: Record<Place, number> = {
    bottom: vh - (box.top + box.height),
    top: box.top,
    right: vw - (box.left + box.width),
    left: box.left,
  };
  // Prefer below/above for small targets, sides for big ones.
  const base: Place[] = box.height > vh * 0.45 ? ['right', 'left', 'bottom', 'top'] : ['bottom', 'top', 'right', 'left'];
  const order: Place[] = step.prefer ? [step.prefer, ...base.filter(p => p !== step.prefer)] : base;
  const place = order.find(p => space[p] > (p === 'left' || p === 'right' ? BUBBLE_W + GAP * 2 : 130)) ?? 'bottom';

  const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
  const clampX = (x: number) => Math.min(vw - BUBBLE_W - 12, Math.max(12, x));
  const style: CSSProperties =
    place === 'bottom' ? { left: clampX(cx - BUBBLE_W / 2), top: box.top + box.height + GAP } :
    place === 'top' ? { left: clampX(cx - BUBBLE_W / 2), bottom: vh - box.top + GAP } :
    place === 'right' ? { left: box.left + box.width + GAP, top: Math.max(12, Math.min(vh - 160, cy - 60)) } :
    { right: vw - box.left + GAP, top: Math.max(12, Math.min(vh - 160, cy - 60)) };
  const arrowOffset =
    place === 'bottom' || place === 'top' ? { left: Math.max(18, Math.min(BUBBLE_W - 18, cx - (style.left as number))) } :
    { top: Math.max(18, Math.min(120, cy - (style.top as number))) };

  const pad = 8;
  return (
    <div className="coach-layer" aria-live="polite">
      <div className="coach-ring" style={{ left: box.left - pad, top: box.top - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />
      <div key={step.id} className={`coach-bubble place-${place}`} style={{ ...style, width: BUBBLE_W }}>
        <i className="coach-arrow" style={arrowOffset} />
        <span className="coach-count">Tutorial · {step.step}/{step.total}</span>
        <p>{step.text}</p>
        <button onClick={onSkip}>Skip tutorial</button>
      </div>
    </div>
  );
}
