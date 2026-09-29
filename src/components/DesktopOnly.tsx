import { useEffect, useState } from 'react';
import { trackEvent } from '../game/analytics';
import { dailyNumber, dailyOrder, formatCountdown, msUntilTomorrow } from '../game/daily';
import { TOPPINGS } from '../game/serving';

/** Phones and tablets see today's special as a teaser, with ways to send the link to a computer. */
export function DesktopOnly() {
  const url = window.location.origin;
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(() => new Date());
  const order = dailyOrder(now);
  const toppings = order.toppings.map(id => TOPPINGS.find(t => t.id === id)!.name).join(', ').replace(/, ([^,]*)$/, ' and $1');

  useEffect(() => {
    trackEvent('mobile_blocked');
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const copy = async () => {
    trackEvent('mobile_copy_link');
    try { await navigator.clipboard.writeText(url); setStatus('Link copied. Paste it on your computer'); } catch { setStatus(url); }
  };
  const sendToComputer = async () => {
    trackEvent('mobile_send_link');
    if (navigator.share) {
      try { await navigator.share({ title: 'Waffle Morning', text: `Today's special: ${order.name}. Cook it on my computer`, url }); return; }
      catch (error) { if ((error as DOMException)?.name === 'AbortError') return; }
    }
    copy();
  };

  return (
    <main className="desktop-only">
      <img className="desktop-only-bg" src="/assets/waffle/background-kitchen.png" alt="" />
      <section className="desktop-only-card">
        <div className="mobile-special">
          <img src={order.image} alt={order.name} />
          <span className="mobile-special-tag">Daily #{dailyNumber(now)}</span>
        </div>
        <p>Today’s special</p>
        <h1>{order.customer} wants a {order.name}</h1>
        <span className="mobile-toppings">{toppings}</span>
        <div className="mobile-countdown">Ends in <b>{formatCountdown(msUntilTomorrow(now))}</b></div>
        <span className="desktop-only-copy">
          Waffle Morning is played on a computer, with your mouse, hand gestures and voice. Send yourself the link and cook it today.
        </span>
        <div className="desktop-only-actions">
          <button onClick={sendToComputer}>Send link to my computer</button>
          <button className="quiet" onClick={copy}>Copy link</button>
        </div>
        <small aria-live="polite">{status || '\u00a0'}</small>
      </section>
    </main>
  );
}
