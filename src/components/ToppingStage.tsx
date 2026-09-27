import { PiCheckBold } from 'react-icons/pi';
import { TOPPINGS, type Doneness, type ToppingId, type WaffleOrder } from '../game/serving';

const WAFFLE_COLORS: Record<Doneness, { base: string; pocket: string; rim: string }> = {
  raw: { base: '#f4dca6', pocket: '#e6c483', rim: '#d9b36e' },
  half: { base: '#ecc27a', pocket: '#d9a555', rim: '#c98f43' },
  perfect: { base: '#dd9a45', pocket: '#bb7226', rim: '#a55f1c' },
  burnt: { base: '#6b3f22', pocket: '#4a2915', rim: '#3a1f10' },
};

/** Where each sprite topping sits on the plated waffle (percent of the plate box). */
const SPRITE_SPOTS: Partial<Record<ToppingId, { left: number; top: number; size: number }>> = {
  strawberry: { left: 30, top: 50, size: 40 },
  blueberry: { left: 68, top: 52, size: 36 },
  banana: { left: 36, top: 62, size: 42 },
  cream: { left: 54, top: 44, size: 36 },
  'ice-cream': { left: 56, top: 48, size: 38 },
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

function PlatedWaffle({ doneness }: { doneness: Doneness }) {
  const c = WAFFLE_COLORS[doneness];
  return (
    <svg className="plated-waffle" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <pattern id="waffle-grid" width="16" height="16" patternUnits="userSpaceOnUse" x="4" y="4">
          <rect width="16" height="16" fill={c.base} />
          <rect x="3" y="3" width="10" height="10" rx="2" fill={c.pocket} />
        </pattern>
        <clipPath id="waffle-clip"><circle cx="100" cy="100" r="80" /></clipPath>
      </defs>
      <circle cx="100" cy="104" r="82" fill="rgba(60,25,8,.25)" />
      <circle cx="100" cy="100" r="82" fill={c.rim} />
      <g clipPath="url(#waffle-clip)">
        <rect width="200" height="200" fill="url(#waffle-grid)" />
        <path d="M100 18v164M18 100h164" stroke={c.rim} strokeWidth="4" />
      </g>
    </svg>
  );
}

function Drizzle({ color, variant }: { color: string; variant: number }) {
  // Honey zig-zags across; chocolate criss-crosses diagonally. Both are clipped to the waffle.
  const paths = variant === 0
    ? 'M34 62L166 74L30 94L170 108L32 126L168 140L44 158L150 168'
    : 'M52 36L140 172M84 26L170 140M30 76L108 178M148 36L60 172M116 26L30 140M170 76L92 178';
  return (
    <svg className="drizzle" viewBox="0 0 200 200" aria-hidden="true">
      <defs><clipPath id={`drizzle-clip-${variant}`}><circle cx="100" cy="100" r="84" /></clipPath></defs>
      <g clipPath={`url(#drizzle-clip-${variant})`}>
        <path d={paths} stroke="rgba(40,15,5,.28)" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 3)" />
        <path d={paths} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={paths} stroke="rgba(255,255,255,.35)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1 -1.5)" />
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
        <img className="plate-art" src="/assets/waffle/plate.png" alt="" />
        <div className="plate-waffle">
          <PlatedWaffle doneness={doneness} />
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
