import { useState } from 'react';
import { formatTime, shareResult, type ShareOutcome } from '../game/shareCard';
import { trackEvent } from '../game/analytics';
import type { Mood } from '../game/customers';
import { CustomerFace } from './Customer';
import type { WaffleOrder } from '../game/serving';

type Props = {
  order: WaffleOrder;
  stars: number;
  notes: string[];
  seconds: number;
  best: number | null;
  daily: number | null;
  streak: number;
  countdown: string;
  onPractice: () => void;
  mood: Mood;
  quote: string;
  cameraInvite: boolean;
  onCameraInvite: () => void;
  onDismissInvite: () => void;
};

const SHARE_LABEL: Record<ShareOutcome | 'working', string> = {
  working: 'Making your card…',
  shared: 'Shared!',
  downloaded: 'Card saved, result text copied',
  cancelled: '',
  failed: 'Couldn’t make the card, try again',
};

export function CompletionModal({ order, stars, notes, seconds, best, daily, streak, countdown, onPractice, mood, quote, cameraInvite, onCameraInvite, onDismissInvite }: Props) {
  const [status, setStatus] = useState<ShareOutcome | 'working' | null>(null);
  const [invite, setInvite] = useState(cameraInvite);
  const headline = stars === 3 ? 'Chef’s kiss!' : stars === 2 ? 'Tasty work!' : 'Served, at least';
  const share = async () => {
    setStatus('working');
    const outcome = await shareResult({ order, stars, seconds, daily, streak });
    setStatus(outcome);
    trackEvent('share', { outcome, mode: daily ? 'daily' : 'practice', stars });
  };
  return (
    <div className="modal-backdrop">
      <section className="completion-card" role="dialog" aria-labelledby="result-title">
        <div className="result-top">
          <p>{daily ? `Daily Special #${daily}` : 'Practice round'}</p>
          {daily && <span className="streak-pill">🔥 {streak} day{streak === 1 ? '' : 's'}</span>}
        </div>
        <h1 id="result-title">{headline}</h1>
        <div className="result-customer">
          <CustomerFace name={order.customer} mood={mood} size={64} />
          <blockquote><b>{order.customer}</b>“{quote}”</blockquote>
        </div>
        <div className="result-stars" aria-label={`${stars} out of 3 stars`}>
          {[1, 2, 3].map(n => <span key={n} className={n <= stars ? 'lit' : ''} style={{ animationDelay: `${n * 0.18}s` }}>★</span>)}
        </div>
        <img src={order.image} alt={`Finished ${order.name}`} />
        <ul className="result-notes">{notes.map(note => <li key={note}>{note}</li>)}</ul>
        <div className="result-meta">
          <span>Time <b>{formatTime(seconds)}</b></span>
          {best !== null && <span>Best <b>{'★'.repeat(best)}</b></span>}
        </div>
        <div className="result-actions">
          <button className="share-button" onClick={share} disabled={status === 'working'}>Share my waffle</button>
          <button className="quiet" onClick={onPractice}>{daily ? 'Practice more' : 'Next order'}</button>
        </div>
        <p className="share-status" aria-live="polite">{status ? SHARE_LABEL[status] : '\u00a0'}</p>
        {daily && <p className="next-special">Next special in <b>{countdown}</b></p>}
        {invite && (
          <div className="camera-invite">
            <span className="camera-invite-icon" aria-hidden="true">✋</span>
            <div><b>Next round, cook with your hands!</b><span>Pinch, make a fist, open your palm. Your webcam does the rest.</span></div>
            <button onClick={() => { setInvite(false); onCameraInvite(); }}>Try it</button>
            <button className="invite-close" aria-label="No thanks" onClick={() => { setInvite(false); onDismissInvite(); }}>×</button>
          </div>
        )}
      </section>
    </div>
  );
}
