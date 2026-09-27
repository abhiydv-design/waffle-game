import type { WaffleOrder } from './serving';

export type ShareInfo = {
  order: WaffleOrder;
  stars: number;
  seconds: number;
  daily: number | null;   // daily special number, or null for practice
  streak: number;
};

const W = 1080, H = 1350;
const DISPLAY = "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif";
const BODY = "'Nunito', system-ui, sans-serif";

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const siteUrl = () => (typeof window === 'undefined' ? '' : window.location.origin);

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lit: boolean) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = lit ? '#f2a41a' : '#e7d6b5';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = lit ? '#c47a0c' : '#d6c29c';
  ctx.stroke();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, family: string, weight = 800) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxWidth && s > 20);
}

export async function renderShareCard(info: ShareInfo): Promise<Blob> {
  try { await Promise.all([document.fonts.load(`800 60px 'Baloo 2'`), document.fonts.load(`800 30px 'Nunito'`)]); } catch { /* fallback fonts */ }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background and card frame
  ctx.fillStyle = '#7c3d20';
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 36, 36, W - 72, H - 72, 56);
  ctx.fillStyle = '#fff7e3';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#e9a957';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c86b2f';
  ctx.font = `900 30px ${BODY}`;
  ctx.fillText('WAFFLE MORNING', W / 2, 128);
  ctx.fillStyle = '#7c3d20';
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText(info.daily ? `Daily Special #${info.daily}` : 'Practice round', W / 2, 200);

  // Finished waffle photo
  const photo = await loadImage(info.order.image);
  const px = 96, py = 240, pw = W - 192, ph = 600;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 36);
  ctx.clip();
  const scale = Math.max(pw / photo.width, ph / photo.height);
  const sw = pw / scale, sh = ph / scale;
  ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2 + sh * 0.06, sw, sh, px, py, pw, ph);
  ctx.restore();
  roundRect(ctx, px, py, pw, ph, 36);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#f0c98d';
  ctx.stroke();

  // Order name and stars
  ctx.fillStyle = '#7c3d20';
  fitText(ctx, `${info.order.customer}’s ${info.order.name}`, W - 200, 56, DISPLAY);
  ctx.fillText(`${info.order.customer}’s ${info.order.name}`, W / 2, 922);
  [0, 1, 2].forEach(i => star(ctx, W / 2 + (i - 1) * 130, 1010, 52, i < info.stars));

  // Stats row
  const stats = [
    ['TIME', formatTime(info.seconds)],
    ['STARS', `${info.stars} / 3`],
    ...(info.daily ? [['STREAK', `${info.streak} day${info.streak === 1 ? '' : 's'}`]] : []),
  ];
  const colW = (W - 200) / stats.length;
  stats.forEach(([label, value], i) => {
    const cx = 100 + colW * (i + 0.5);
    ctx.fillStyle = '#a57a5b';
    ctx.font = `900 24px ${BODY}`;
    ctx.fillText(label, cx, 1112);
    ctx.fillStyle = '#7c3d20';
    ctx.font = `800 46px ${DISPLAY}`;
    ctx.fillText(value, cx, 1164);
  });

  // Footer
  ctx.fillStyle = '#c86b2f';
  ctx.font = `800 30px ${BODY}`;
  ctx.fillText(`Can you beat it?  ${siteUrl().replace(/^https?:\/\//, '')}`, W / 2, 1258);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not render card'))), 'image/png'));
}

export function shareText(info: ShareInfo) {
  const stars = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);
  const title = info.daily ? `Waffle Morning #${info.daily} 🧇` : 'Waffle Morning 🧇';
  const streak = info.daily && info.streak > 1 ? ` · 🔥${info.streak}-day streak` : '';
  return `${title}\n${info.order.name}: ${stars} in ${formatTime(info.seconds)}${streak}\n${siteUrl()}`;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** Uses the phone's share sheet when it can take images; otherwise downloads the card and copies the text. */
export async function shareResult(info: ShareInfo): Promise<ShareOutcome> {
  const text = shareText(info);
  let blob: Blob;
  try { blob = await renderShareCard(info); } catch { return 'failed'; }
  const file = new File([blob], `waffle-morning${info.daily ? `-${info.daily}` : ''}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'Waffle Morning' });
      return 'shared';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked */ }
  return 'downloaded';
}
