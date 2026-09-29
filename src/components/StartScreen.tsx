import { PiCameraFill, PiMicrophoneFill, PiCheckBold } from 'react-icons/pi';
import type { DailyEntry } from '../game/daily';
import { formatTime } from '../game/shareCard';
import { TOPPINGS, type WaffleOrder } from '../game/serving';

type Props = {
  order: WaffleOrder;
  dailyNo: number;
  today: DailyEntry | null;
  streak: number;
  countdown: string;
  loading: boolean;
  starting: boolean;
  controls: { camera: boolean; mic: boolean };
  voiceSupported: boolean;
  onToggle: (key: 'camera' | 'mic') => void;
  onDaily: () => void;
  onPractice: () => void;
};

function Controls({ controls, voiceSupported, onToggle }: Pick<Props, 'controls' | 'voiceSupported' | 'onToggle'>) {
  return (
    <div className="intro-controls">
      <span className="intro-controls-title">Play with</span>
      <div className="intro-toggles">
        <button className={`control-toggle ${controls.camera ? 'on' : ''}`} onClick={() => onToggle('camera')} aria-pressed={controls.camera}>
          <PiCameraFill /><span><b>Hand gestures</b><small>Camera</small></span><i>{controls.camera && <PiCheckBold />}</i>
        </button>
        <button className={`control-toggle ${controls.mic && voiceSupported ? 'on' : ''}`} onClick={() => onToggle('mic')} aria-pressed={controls.mic && voiceSupported} disabled={!voiceSupported}>
          <PiMicrophoneFill /><span><b>Voice</b><small>{voiceSupported ? 'Microphone' : 'Needs Chrome or Edge'}</small></span><i>{controls.mic && voiceSupported && <PiCheckBold />}</i>
        </button>
      </div>
      <small className="intro-privacy">Mouse always works too. Video and audio stay on your computer and are never recorded.</small>
    </div>
  );
}

const list = (items: string[]) => items.join(', ').replace(/, ([^,]*)$/, ' and $1');

export function StartScreen({ order, dailyNo, today, streak, countdown, loading, starting, controls, voiceSupported, onToggle, onDaily, onPractice }: Props) {
  const wantsDevices = controls.camera || (controls.mic && voiceSupported);
  const busy = loading || starting;
  const label = (text: string) => loading ? 'Loading…' : starting ? 'Waiting for permission…' : text;
  const toppings = list(order.toppings.map(id => TOPPINGS.find(t => t.id === id)!.name));
  return (
    <div className="start-layer">
      <section className="start-card intro-card">
        <div className="intro-top">
          <p>Waffle Morning · Daily #{dailyNo}</p>
          {streak > 0 && <span className="streak-pill" title="Daily streak">🔥 {streak}</span>}
        </div>

        {today ? (
          <>
            <h1>Special served!</h1>
            <div className="intro-order done">
              <b>{order.customer}’s {order.name}</b>
              <span className="intro-stars">{'★'.repeat(today.stars)}<i>{'★'.repeat(3 - today.stars)}</i> in {formatTime(today.seconds)}</span>
            </div>
            <p className="next-special">Next special in <b>{countdown}</b></p>
            <Controls controls={controls} voiceSupported={voiceSupported} onToggle={onToggle} />
            <button className="start-button" disabled={busy} onClick={onPractice}>{label('Practice a random order')}</button>
          </>
        ) : (
          <>
            <h1>{loading ? 'Warming up…' : 'Today’s special'}</h1>
            <div className="intro-order">
              <b>{order.customer} wants a {order.name}</b>
              <span>{toppings}</span>
            </div>
            <Controls controls={controls} voiceSupported={voiceSupported} onToggle={onToggle} />
            <button className="start-button" disabled={busy} onClick={onDaily}>{label(wantsDevices ? 'Allow & cook today’s special' : 'Cook today’s special')}</button>
            <button className="text-button" disabled={busy} onClick={onPractice}>or practice a random order</button>
            <small>Everyone gets the same special today. Your first serve counts.</small>
          </>
        )}
      </section>
    </div>
  );
}
