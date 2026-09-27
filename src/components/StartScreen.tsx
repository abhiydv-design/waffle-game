import { TOPPINGS, type WaffleOrder } from '../game/serving';

export function StartScreen({ order, loading, onStart }: { order: WaffleOrder; loading: boolean; onStart: () => void }) {
  const toppings = order.toppings.map(id => TOPPINGS.find(t => t.id === id)!.name);
  return (
    <div className="start-layer">
      <section className="start-card intro-card">
        <p>Waffle Kitchen</p>
        <h1>{loading ? 'Warming up the kitchen…' : 'New order!'}</h1>
        <div className="intro-order">
          <b>{order.customer} wants a {order.name}</b>
          <span>{toppings.join(', ').replace(/, ([^,]*)$/, ' and $1')}</span>
        </div>
        <ol className="intro-steps">
          <li>Add all 7 ingredients to the bowl</li>
          <li>Stir the batter smooth</li>
          <li>Cook it golden, not burnt</li>
          <li>Add the toppings and serve</li>
        </ol>
        <button className="start-button" disabled={loading} onClick={onStart}>
          {loading ? 'Loading…' : 'Start cooking'}
        </button>
        <small>Play with your mouse, touch, hand gestures or voice.</small>
      </section>
    </div>
  );
}
