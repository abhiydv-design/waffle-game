import { useEffect, useState } from 'react';
import { trackEvent } from '../game/analytics';

export function DesktopOnly() {
  const url = window.location.origin;
  const [status, setStatus] = useState('');
  useEffect(() => { trackEvent('mobile_blocked'); }, []);
  const sendToComputer = async () => {
    trackEvent('mobile_send_link');
    if (navigator.share) {
      try { await navigator.share({ title: 'Waffle Morning', text: 'Open this on my computer', url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); setStatus('Link copied'); } catch { setStatus(url); }
  };
  const copy = async () => {
    trackEvent('mobile_copy_link');
    try { await navigator.clipboard.writeText(url); setStatus('Link copied'); } catch { setStatus(url); }
  };
  return (
    <main className="desktop-only">
      <img className="desktop-only-bg" src="/assets/waffle/background-kitchen.png" alt="" />
      <section className="desktop-only-card">
        <img className="desktop-only-icon" src="/favicon.svg" alt="" />
        <p>Waffle Morning</p>
        <h1>Made for computers</h1>
        <span className="desktop-only-copy">
          The kitchen needs a big screen, a mouse and a webcam for hand gestures. Open it on your laptop or desktop to start cooking.
        </span>
        <div className="desktop-only-link">{url.replace(/^https?:\/\//, '')}</div>
        <div className="desktop-only-actions">
          <button onClick={sendToComputer}>Send link to my computer</button>
          <button className="quiet" onClick={copy}>Copy link</button>
        </div>
        <small aria-live="polite">{status || '\u00a0'}</small>
      </section>
    </main>
  );
}
