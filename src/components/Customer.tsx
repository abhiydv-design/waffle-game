import { lookFor, type CustomerLook, type Mood } from '../game/customers';

const INK = '#3a1f12';

function Hair({ look, layer }: { look: CustomerLook; layer: 'back' | 'front' }) {
  const h = look.hair;
  if (layer === 'back') {
    if (look.style === 'long') return <path d="M28 54c0-22 14-34 32-34s32 12 32 34v34c-6 6-14 8-22 8H50c-8 0-16-2-22-8z" fill={h} />;
    if (look.style === 'ponytail') return <path d="M84 40c14 4 20 18 16 34-2 8-8 12-12 10 4-10 2-24-8-32z" fill={h} />;
    if (look.style === 'bun') return <circle cx="60" cy="22" r="11" fill={h} />;
    return null;
  }
  switch (look.style) {
    case 'spiky':
      return <path d="M31 52c-1-10 2-18 6-22l2 6 5-12 4 9 6-12 4 10 6-11 3 11 7-8 1 10 7-4c3 6 5 14 3 23-6-9-16-13-27-13s-21 4-27 13z" fill={h} />;
    case 'curly':
      return (
        <g fill={h}>
          {[[34, 44], [40, 34], [50, 28], [60, 26], [70, 28], [80, 34], [86, 44], [45, 38], [75, 38]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="9" />)}
        </g>
      );
    case 'long':
      return <path d="M32 52c0-18 12-28 28-28s28 10 28 28c-8-4-12-12-14-18-8 8-22 12-42 18z" fill={h} />;
    case 'ponytail':
      return <path d="M32 52c0-18 12-28 28-28s28 10 28 28c-10-10-24-14-40-10-6 2-12 6-16 10z" fill={h} />;
    default:
      return <path d="M32 52c0-18 12-28 28-28s28 10 28 28c-6-8-14-12-28-12s-22 4-28 12z" fill={h} />;
  }
}

function Face({ mood }: { mood: Mood }) {
  const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' };
  const dots = (r = 3.3) => (
    <g className="customer-eyes">
      <circle cx="49" cy="57" r={r} fill={INK} /><circle cx="71" cy="57" r={r} fill={INK} />
      <circle cx="50.2" cy="55.8" r={r * 0.33} fill="#fff" /><circle cx="72.2" cy="55.8" r={r * 0.33} fill="#fff" />
    </g>
  );
  const blush = <g fill="#f08a7a" opacity=".45"><ellipse cx="42" cy="66" rx="5" ry="3" /><ellipse cx="78" cy="66" rx="5" ry="3" /></g>;
  switch (mood) {
    case 'delighted':
      return (
        <g>
          <path d="M44 58q5-6 10 0M66 58q5-6 10 0" {...stroke} />
          <path d="M47 50l7-2M73 50l-7-2" {...stroke} strokeWidth={2.5} />
          <path d="M48 65h24q-1 13-12 13t-12-13z" fill={INK} />
          <path d="M53 74q7-5 14 0q-3 4-7 4t-7-4z" fill="#e8626b" />
          {blush}
        </g>
      );
    case 'happy':
      return (
        <g>
          {dots()}
          <path d="M44 49q5-3 10-1M66 48q5-2 10 1" {...stroke} strokeWidth={2.5} />
          <path d="M50 66q10 9 20 0" {...stroke} />
          {blush}
        </g>
      );
    case 'excited':
      return (
        <g>
          {dots(4.2)}
          <path d="M43 46q6-4 12-1M65 45q6-3 12 1" {...stroke} strokeWidth={2.5} />
          <ellipse cx="60" cy="70" rx="5.5" ry="6.5" fill={INK} />
          <ellipse cx="60" cy="73" rx="3.5" ry="2.5" fill="#e8626b" />
          {blush}
        </g>
      );
    case 'impatient':
      return (
        <g>
          <path d="M45 56a4 4 0 0 0 8 0zM67 56a4 4 0 0 0 8 0z" fill={INK} />
          <path d="M44 51h10M66 51h10" {...stroke} strokeWidth={2.5} />
          <path d="M44 47l10 3M76 47l-10 3" {...stroke} strokeWidth={2.5} />
          <path d="M54 71h13" {...stroke} />
        </g>
      );
    case 'worried':
      return (
        <g>
          {dots(3.6)}
          <path d="M44 49l10-4M76 49l-10-4" {...stroke} strokeWidth={2.5} />
          <path d="M50 71q2.5-3 5 0t5 0t5 0t5 0" {...stroke} strokeWidth={2.5} />
          <path d="M86 40q3 5 0 8q-3-3 0-8z" fill="#8ec9f0" />
        </g>
      );
    case 'confused':
      return (
        <g>
          {dots()}
          <path d="M44 50q5-2 10 0M66 45q5-3 10 1" {...stroke} strokeWidth={2.5} />
          <path d="M52 71q4-4 8 0t8 0" {...stroke} strokeWidth={2.5} />
          <text x="94" y="36" fontSize="22" fontWeight="900" fill={INK} fontFamily="Nunito, system-ui, sans-serif">?</text>
        </g>
      );
    case 'sad':
      return (
        <g>
          {dots(3)}
          <path d="M44 50l10-3M76 50l-10-3" {...stroke} strokeWidth={2.5} />
          <path d="M51 74q9-8 18 0" {...stroke} />
          <path d="M47 62q2.5 4 0 6q-2.5-2 0-6z" fill="#8ec9f0" />
        </g>
      );
    default:
      return (
        <g>
          {dots()}
          <path d="M44 49h10M66 49h10" {...stroke} strokeWidth={2.5} />
          <path d="M53 68q7 4 14 0" {...stroke} />
        </g>
      );
  }
}

function Accessory({ look }: { look: CustomerLook }) {
  const a = look.accent;
  switch (look.accessory) {
    case 'glasses':
      return (
        <g fill="rgba(255,255,255,.18)" stroke={a} strokeWidth="2.6">
          <circle cx="49" cy="57" r="8" /><circle cx="71" cy="57" r="8" />
          <path d="M57 56q3-2 6 0" fill="none" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M31 46c2-16 14-24 29-24s27 8 29 24z" fill={a} />
          <path d="M60 46h36q-2 6-10 6H60z" fill={a} />
          <circle cx="60" cy="23" r="3" fill="#fff" opacity=".7" />
        </g>
      );
    case 'earrings':
      return <g fill={a}><circle cx="32" cy="66" r="3" /><circle cx="88" cy="66" r="3" /></g>;
    case 'headband':
      return <path d="M33 44q27-16 54 0" stroke={a} strokeWidth="6" fill="none" strokeLinecap="round" />;
    default:
      return null;
  }
}

export function CustomerFace({ name, mood, size = 96 }: { name: string; mood: Mood; size?: number }) {
  const look = lookFor(name);
  const id = `cust-${name}`;
  return (
    <svg className={`customer-face mood-${mood}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${name} looks ${mood}`}>
      <defs><clipPath id={id}><circle cx="60" cy="60" r="60" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect width="120" height="120" fill={look.backdrop} />
        <g className="customer-body">
          <Hair look={look} layer="back" />
          <path d="M16 124c4-26 22-38 44-38s40 12 44 38z" fill={look.shirt} />
          <path d="M52 78h16v12q-8 5-16 0z" fill={look.skin} />
          <circle cx="32" cy="58" r="5.5" fill={look.skin} />
          <circle cx="88" cy="58" r="5.5" fill={look.skin} />
          <circle cx="60" cy="56" r="28" fill={look.skin} />
          <Hair look={look} layer="front" />
          <Face mood={mood} />
          <Accessory look={look} />
        </g>
      </g>
    </svg>
  );
}

export function CustomerCorner({ name, mood, speech }: { name: string; mood: Mood; speech: { text: string; id: number } | null }) {
  return (
    <aside className={`customer-corner mood-${mood}`} aria-live="polite">
      {speech && <div key={speech.id} className="customer-bubble">{speech.text}</div>}
      <div className="customer-portrait">
        <CustomerFace name={name} mood={mood} />
      </div>
      <span className="customer-name">{name}</span>
    </aside>
  );
}
