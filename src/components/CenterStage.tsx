import { useRef, type PointerEvent } from 'react';
import { BATTER_INGREDIENTS, BATTER_TOTAL, BOWL_STATES, MIXING_BOWL_STATES } from '../game/recipe';

type Props = {
  added: Set<string>;
  selected: string | null;
  mixProgress: number;
  onChoose: (id: string) => void;
  onDropIngredient: (id: string) => void;
  onAddSelected: () => void;
  onStir: () => void;
};

export function CenterStage({ added, selected, mixProgress, onChoose, onDropIngredient, onAddSelected, onStir }: Props) {
  const firstMissing = BATTER_INGREDIENTS.findIndex(item => !added.has(item.id));
  const bowlStep = firstMissing === -1 ? BATTER_TOTAL : firstMissing;
  const mixing = added.size === BATTER_TOTAL;
  const ready = mixProgress === 100;
  const mixingStep = Math.min(4, Math.floor(mixProgress / 25));
  const picked = BATTER_INGREDIENTS.find(item => item.id === selected);

  // Pointer stirring: accumulate the angle swept around the bowl centre; every full turn counts as one stir.
  const stir = useRef<{ angle: number; swept: number } | null>(null);
  const angleOf = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2));
  };
  const stirStart = (event: PointerEvent<HTMLDivElement>) => {
    if (ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stir.current = { angle: angleOf(event), swept: 0 };
  };
  const stirMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!stir.current || ready) return;
    const angle = angleOf(event);
    let delta = angle - stir.current.angle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    stir.current.angle = angle;
    stir.current.swept += Math.abs(delta);
    if (stir.current.swept >= 2 * Math.PI) {
      stir.current.swept = 0;
      onStir();
    }
  };
  const stirEnd = () => { stir.current = null; };

  return (
    <section className={`batter-stage ${mixing ? 'mixing-stage' : ''}`}>
      {!mixing && (
        <>
          <div className="objective"><span>Make Waffle Batter</span><b>{added.size}/{BATTER_TOTAL}</b></div>
          <div className="ingredient-table">
            {BATTER_INGREDIENTS.map(item => (
              <button
                key={item.id}
                draggable={!added.has(item.id)}
                data-ingredient={item.id}
                className={`table-ingredient ingredient-${item.id} ${added.has(item.id) ? 'used' : ''} ${selected === item.id ? 'picked' : ''}`}
                onClick={() => onChoose(item.id)}
                onDragStart={event => {
                  event.dataTransfer.setData('text/ingredient', item.id);
                  event.dataTransfer.effectAllowed = 'move';
                  onChoose(item.id);
                }}
                aria-label={`${item.name}${added.has(item.id) ? ' added' : ''}`}
              >
                <img src={item.asset} alt="" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          {picked && (
            <div key={picked.id} className={`selection-callout callout-${picked.id}`}>
              <b>{picked.name}</b>
              <span>{picked.instruction}, or tap the bowl</span>
              <button data-hand-press onClick={onAddSelected}>Add to bowl</button>
            </div>
          )}
        </>
      )}
      <div
        className={`fixed-bowl ${picked ? 'awaiting-drop' : ''}`}
        onClick={() => { if (!mixing && selected) onAddSelected(); }}
        onDragOver={event => { if (!mixing) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}
        onDrop={event => {
          if (mixing) return;
          event.preventDefault();
          const id = event.dataTransfer.getData('text/ingredient');
          if (id) onDropIngredient(id);
        }}
      >
        {mixing
          ? MIXING_BOWL_STATES.map((src, index) => (
              <img key={src} className={`mixing-bowl-image ${index === mixingStep ? 'visible' : ''}`} src={src} alt={index === mixingStep ? `${mixProgress}% mixed waffle batter` : ''} aria-hidden={index !== mixingStep} />
            ))
          : <img className="bowl-state-image" src={BOWL_STATES[bowlStep]} alt={`Bowl with ${bowlStep} of ${BATTER_TOTAL} ingredients`} />}
      </div>
      {mixing && !ready && (
        <div
          className="stir-pad"
          onPointerDown={stirStart}
          onPointerMove={stirMove}
          onPointerUp={stirEnd}
          onPointerCancel={stirEnd}
          aria-label="Drag in circles to stir the batter"
        />
      )}
      {mixing && (
        <div className={`mix-card ${ready ? 'complete' : ''}`}>
          <div className="mix-heading"><span>{ready ? 'Batter Ready!' : 'Mix the Batter'}</span><b>{mixProgress}%</b></div>
          <p>{ready ? 'Smooth batter. Off to the waffle maker…' : 'Circle your index finger, or drag circles inside the bowl'}</p>
          <div className="mix-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mixProgress}><i style={{ width: `${mixProgress}%` }} /></div>
        </div>
      )}
    </section>
  );
}
