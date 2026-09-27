import { BATTER_INGREDIENTS } from '../game/recipe';

type Props = { selected: string | null; ready: boolean; detected: string; gesture?: string; instruction?: string };

export function GestureGuide({ selected, ready, detected, gesture: forcedGesture, instruction: forcedInstruction }: Props) {
  const item = BATTER_INGREDIENTS.find(x => x.id === selected);
  const gesture = forcedGesture || (ready ? 'Circle' : item?.gesture || 'Pinch');
  const instruction = forcedInstruction || (ready ? 'Move your index finger in a circle' : item?.instruction || 'Point at an ingredient and pinch');
  return (
    <aside className={`gesture-guide gesture-${gesture.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="gesture-guide-title"><span>Gesture guide</span><b>{gesture}</b></div>
      <div className="gesture-animation" aria-hidden="true"><i /><i /><i /></div>
      <p>{instruction}</p>
      <small>{detected}</small>
    </aside>
  );
}
