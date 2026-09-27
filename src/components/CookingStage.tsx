import { DONENESS_LABEL, HEAT_ZONES, donenessFor, type Doneness } from '../game/serving';

export type CookStep = 'open' | 'pouring' | 'poured' | 'closing' | 'cooking' | 'opened';

const MAKER_ART: Record<Exclude<CookStep, 'opened'>, string> = {
  open: '/assets/waffle/maker-open.png',
  pouring: '/assets/waffle/maker-pour.png',
  poured: '/assets/waffle/maker-pour.png',
  closing: '/assets/waffle/maker-closed.png',
  cooking: '/assets/waffle/maker-working.png',
};

const RESULT_ART: Record<Doneness, string> = {
  raw: '/assets/waffle/waffle-half.png',
  half: '/assets/waffle/waffle-half.png',
  perfect: '/assets/waffle/waffle-perfect.png',
  burnt: '/assets/waffle/waffle-burnt.png',
};

export const COOKING_ART = [...Object.values(MAKER_ART), ...Object.values(RESULT_ART)];

type Props = {
  step: CookStep;
  heat: number;
  onPour: () => void;
  onClose: () => void;
  onOpen: () => void;
  onServe: () => void;
  onRetry: () => void;
};

export function CookingStage({ step, heat, onPour, onClose, onOpen, onServe, onRetry }: Props) {
  const doneness = donenessFor(heat);
  const art = step === 'opened' ? RESULT_ART[doneness] : MAKER_ART[step];
  const inWindow = step === 'cooking' && doneness === 'perfect';
  const smoking = step === 'cooking' && doneness === 'burnt';

  // Clicking the machine itself performs whatever the next step is.
  const primary =
    step === 'open' ? onPour :
    step === 'poured' ? onClose :
    step === 'cooking' ? onOpen :
    step === 'opened' ? (doneness === 'burnt' ? onRetry : doneness === 'perfect' ? onServe : onClose) :
    undefined;

  const heading =
    step === 'open' ? 'Pour the batter' :
    step === 'pouring' ? 'Pouring…' :
    step === 'poured' ? 'Close the lid' :
    step === 'closing' ? 'Heating up…' :
    step === 'cooking' ? (inWindow ? 'Open it now!' : smoking ? 'It’s burning!' : 'Cooking…') :
    DONENESS_LABEL[doneness];

  const tip =
    step === 'open' ? 'Tilt your hand, say “pour”, or tap the machine.' :
    step === 'poured' ? 'Make a fist, say “close”, or tap the machine.' :
    step === 'cooking' ? 'Open your palm or say “open” when the needle reaches gold.' :
    step === 'opened' && doneness === 'perfect' ? 'Serve it to start adding toppings.' :
    step === 'opened' && doneness === 'burnt' ? 'Make a fresh batch, or serve it anyway.' :
    step === 'opened' ? 'Close the lid to cook it a little longer.' :
    ' ';

  return (
    <>
      <aside className={`cook-card ${inWindow ? 'in-window' : ''} ${smoking ? 'smoking' : ''}`}>
        <div className="cook-card-title">
          <span>Waffle maker</span>
          <b>{heading}</b>
        </div>
        <div className="cook-body">
          <div className="heat-meter" role="meter" aria-label="Cooking progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(heat)}>
            <div className="heat-zones">
              <i style={{ width: `${HEAT_ZONES.half}%` }} className="zone-raw" />
              <i style={{ width: `${HEAT_ZONES.perfect - HEAT_ZONES.half}%` }} className="zone-half" />
              <i style={{ width: `${HEAT_ZONES.burnt - HEAT_ZONES.perfect}%` }} className="zone-perfect" />
              <i style={{ width: `${100 - HEAT_ZONES.burnt}%` }} className="zone-burnt" />
            </div>
            <span className="heat-needle" style={{ left: `${Math.min(100, heat)}%` }} />
          </div>
          <div className="heat-legend"><span>Raw</span><span>Golden</span><span>Burnt</span></div>
          <p>{tip}</p>
          <div className="cook-actions">
            {step === 'open' && <button data-hand-press onClick={onPour}>Pour batter</button>}
            {step === 'poured' && <button data-hand-press onClick={onClose}>Close lid</button>}
            {step === 'cooking' && <button data-hand-press className={inWindow ? 'go' : ''} onClick={onOpen}>Open lid</button>}
            {step === 'opened' && doneness === 'perfect' && <button data-hand-press className="go" onClick={onServe}>Serve waffle</button>}
            {step === 'opened' && (doneness === 'raw' || doneness === 'half') && (
              <>
                <button data-hand-press onClick={onClose}>Cook longer</button>
                <button data-hand-press className="quiet" onClick={onServe}>Serve anyway</button>
              </>
            )}
            {step === 'opened' && doneness === 'burnt' && (
              <>
                <button data-hand-press onClick={onRetry}>New batch</button>
                <button data-hand-press className="quiet" onClick={onServe}>Serve anyway</button>
              </>
            )}
          </div>
        </div>
      </aside>

      <section className="cooking-stage">
        <button
          className={`maker-art step-${step} ${primary ? 'clickable' : ''}`}
          onClick={primary}
          disabled={!primary}
          data-hand-press={primary ? '' : undefined}
          aria-label={heading}
        >
          <img key={art} src={art} alt="" />
          {smoking && <span className="smoke" aria-hidden="true"><i /><i /><i /></span>}
        </button>
      </section>
    </>
  );
}
