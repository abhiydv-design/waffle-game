import { PiCheckBold } from 'react-icons/pi';
import { TOPPINGS, type Doneness, type ToppingId, type WaffleOrder } from '../game/serving';

/** Where each sprite topping sits on the plated waffle (percent of the plate box). */
const SPRITE_SPOTS: Partial<Record<ToppingId, { left: number; top: number; size: number }>> = {
  strawberry: { left: 32, top: 48, size: 50 },
  blueberry: { left: 67, top: 52, size: 44 },
  banana: { left: 38, top: 62, size: 52 },
  cream: { left: 55, top: 42, size: 44 },
  'ice-cream': { left: 50, top: 46, size: 46 },
};

export function ChocolateIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="22" y="4" width="20" height="10" rx="3" fill="#c33b2c" />
      <path d="M18 18c0-3 3-5 6-5h16c3 0 6 2 6 5v36c0 4-3 6-6 6H24c-3 0-6-2-6-6z" fill="#5a2c17" />
      <rect x="22" y="26" width="20" height="18" rx="3" fill="#f3d9a8" />
      <path d="M26 35c3-4 9-4 12 0" stroke="#5a2c17" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 14c4 4 4 9 1 12" stroke="#8a4a26" strokeWidth="2" fill="none" />
    </svg>
  );
}

/** A wavy strand from (x0,y0) to (x1,y1): alternating curves give a hand-poured look. */
function strand(x0: number, y0: number, x1: number, y1: number, amp: number, waves: number) {
  const dx = (x1 - x0) / waves, dy = (y1 - y0) / waves;
  const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  let d = `M${x0} ${y0}`;
  for (let i = 0; i < waves; i++) {
    const side = i % 2 ? -1 : 1, a = amp * (0.7 + ((i * 37) % 10) / 20);
    const cx = x0 + dx * (i + 0.5) + nx * a * side, cy = y0 + dy * (i + 0.5) + ny * a * side;
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(x0 + dx * (i + 1)).toFixed(1)} ${(y0 + dy * (i + 1)).toFixed(1)}`;
  }
  return d;
}

const HONEY = [
  strand(40, 60, 162, 70, 5, 3), strand(30, 94, 172, 102, 6, 4), strand(34, 128, 168, 134, 5, 4), strand(56, 158, 148, 164, 4, 3),
];
const CHOCOLATE = [
  strand(62, 30, 126, 176, 4, 4), strand(102, 22, 166, 150, 4, 4), strand(32, 72, 86, 176, 4, 3),
  strand(138, 30, 72, 176, 4, 4), strand(102, 22, 34, 150, 4, 4), strand(170, 74, 116, 176, 4, 3),
];
const DRIPS: Record<'honey' | 'chocolate', [number, number, number][]> = {
  honey: [[70, 64, 7], [128, 98, 8], [96, 131, 7], [150, 69, 6]],
  chocolate: [[92, 102, 7], [128, 80, 6], [70, 128, 6], [118, 138, 7]],
};

function Drizzle({ color, variant }: { color: string; variant: number }) {
  const kind = variant === 0 ? 'honey' : 'chocolate';
  const paths = kind === 'honey' ? HONEY : CHOCOLATE;
  const width = kind === 'honey' ? 7 : 5.5;
  const id = `drizzle-clip-${kind}`;
  return (
    <svg className={`drizzle drizzle-${kind}`} viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={id}><ellipse cx="100" cy="100" rx="86" ry="84" /></clipPath></defs>
      <g clipPath={`url(#${id})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={`s${i}`} d={d} stroke="rgba(40,15,5,.3)" strokeWidth={width + 1.5} transform="translate(0 2.5)" />)}
        {paths.map((d, i) => <path key={`c${i}`} className="drizzle-strand" style={{ animationDelay: `${i * 0.08}s` }} d={d} stroke={color} strokeWidth={width} opacity={kind === 'honey' ? 0.88 : 0.96} />)}
        {paths.map((d, i) => <path key={`h${i}`} d={d} stroke="rgba(255,255,255,.45)" strokeWidth={1.3} transform="translate(-.8 -1.2)" />)}
        {DRIPS[kind].map(([x, y, r], i) => (
          <g key={`d${i}`}>
            <ellipse cx={x} cy={y + 2} rx={r * 0.9} ry={r * 0.75} fill="rgba(40,15,5,.25)" />
            <ellipse cx={x} cy={y} rx={r * 0.9} ry={r * 0.72} fill={color} opacity={kind === 'honey' ? 0.9 : 0.97} />
            <ellipse cx={x - r * 0.3} cy={y - r * 0.25} rx={r * 0.3} ry={r * 0.18} fill="rgba(255,255,255,.55)" />
          </g>
        ))}
      </g>
    </svg>
  );
}

type Props = {
  order: WaffleOrder;
  doneness: Doneness;
  added: ToppingId[];
  onAdd: (id: ToppingId) => void;
  onServe: () => void;
};

export function ToppingStage({ order, doneness, added, onAdd, onServe }: Props) {
  const complete = order.toppings.every(id => added.includes(id));
  return (
    <>
      <aside className="order-ticket">
        <div className="order-head">
          <span>Order for {order.customer}</span>
          <b>{order.name}</b>
        </div>
        <ul>
          {order.toppings.map(id => {
            const topping = TOPPINGS.find(t => t.id === id)!;
            const done = added.includes(id);
            return (
              <li key={id} className={done ? 'done' : ''}>
                <span className="check">{done && <PiCheckBold />}</span>
                {topping.name}
              </li>
            );
          })}
        </ul>
        <button data-hand-press className="serve-order" disabled={!complete} onClick={onServe}>
          {complete ? 'Serve order' : `${added.length}/${order.toppings.length} toppings`}
        </button>
      </aside>

      <section className="plate-stage" aria-label="Waffle on a plate">
        {/* Plate and waffle are one photo, recoloured to match how the waffle was cooked */}
        <img className="plate-art plated-photo" src={`/assets/waffle/plated/plate-${doneness}.png`} alt="" />
        <div className="plate-waffle">
          {added.map((id, index) => {
            const topping = TOPPINGS.find(t => t.id === id)!;
            if (topping.drizzle) return <Drizzle key={id} color={topping.drizzle} variant={id === 'chocolate' ? 1 : 0} />;
            const spot = SPRITE_SPOTS[id]!;
            return (
              <img
                key={id}
                className="plate-topping"
                src={topping.asset!}
                alt={topping.name}
                style={{ left: `${spot.left}%`, top: `${spot.top}%`, width: `${spot.size}%`, zIndex: 3 + index }}
              />
            );
          })}
        </div>
      </section>

      <nav className="topping-tray" aria-label="Toppings">
        {TOPPINGS.map(topping => {
          const used = added.includes(topping.id);
          return (
            <button
              key={topping.id}
              data-hand-press
              data-topping={topping.id}
              aria-label={topping.name}
              className={`tray-item ${used ? 'used' : ''}`}
              disabled={used}
              onClick={() => onAdd(topping.id)}
            >
              <span className="tray-art">{topping.asset ? <img src={topping.asset} alt="" /> : <ChocolateIcon />}</span>
              <span className="tray-name">{topping.name}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
