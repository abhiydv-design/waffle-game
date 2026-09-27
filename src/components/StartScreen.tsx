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
  onDaily: () => void;
  onPractice: () => void;
};

const list = (items: string[]) => items.join(', ').replace(/, ([^,]*)$/, ' and $1');

export function StartScreen({ order, dailyNo, today, streak, countdown, loading, onDaily, onPractice }: Props) {
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
            <button className="start-button" disabled={loading} onClick={onPractice}>{loading ? 'Loading…' : 'Practice a random order'}</button>
          </>
        ) : (
          <>
            <h1>{loading ? 'Warming up…' : 'Today’s special'}</h1>
            <div className="intro-order">
              <b>{order.customer} wants a {order.name}</b>
              <span>{toppings}</span>
            </div>
            <ol className="intro-steps">
              <li>Add all 7 ingredients to the bowl</li>
              <li>Stir the batter smooth</li>
              <li>Cook it golden, not burnt</li>
              <li>Add the toppings and serve</li>
            </ol>
            <button className="start-button" disabled={loading} onClick={onDaily}>{loading ? 'Loading…' : 'Cook today’s special'}</button>
            <button className="text-button" disabled={loading} onClick={onPractice}>or practice a random order</button>
            <small>Everyone gets the same special today. Your first serve counts.</small>
          </>
        )}
      </section>
    </div>
  );
}
