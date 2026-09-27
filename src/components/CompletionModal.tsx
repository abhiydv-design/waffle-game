import type { WaffleOrder } from '../game/serving';

type Props = { order: WaffleOrder; stars: number; notes: string[]; seconds: number; best: number | null; onRestart: () => void };

export function CompletionModal({ order, stars, notes, seconds, best, onRestart }: Props) {
  const minutes = Math.floor(seconds / 60);
  const time = minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  const headline = stars === 3 ? 'Chef’s kiss!' : stars === 2 ? 'Tasty work!' : 'Served, at least';
  return (
    <div className="modal-backdrop">
      <section className="completion-card" role="dialog" aria-labelledby="result-title">
        <p>{order.customer}’s {order.name}</p>
        <h1 id="result-title">{headline}</h1>
        <div className="result-stars" aria-label={`${stars} out of 3 stars`}>
          {[1, 2, 3].map(n => <span key={n} className={n <= stars ? 'lit' : ''} style={{ animationDelay: `${n * 0.18}s` }}>★</span>)}
        </div>
        <img src={order.image} alt={`Finished ${order.name}`} />
        <ul className="result-notes">{notes.map(note => <li key={note}>{note}</li>)}</ul>
        <div className="result-meta">
          <span>Time <b>{time}</b></span>
          {best !== null && <span>Best <b>{'★'.repeat(best)}</b></span>}
        </div>
        <button onClick={onRestart}>Take the next order</button>
      </section>
    </div>
  );
}
