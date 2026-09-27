import type { RefObject } from 'react';
import type { TrackingStatus } from '../hooks/useHandTracking';

type Props = { videoRef: RefObject<HTMLVideoElement>; status: TrackingStatus; gesture: string; hint: string; onEnable: () => void; onContinue: () => void };

export function CameraPanel({ videoRef, status, gesture, hint, onEnable, onContinue }: Props) {
  const active = status === 'tracking';
  const unavailable = status === 'denied' || status === 'error';
  return (
    <aside className={`camera-card status-${status}`}>
      <div className="camera-heading">
        <span className="tracking-dot" />
        <b>{active ? 'Hand tracking' : status === 'lost' ? 'Hand not visible' : status === 'loading' ? 'Starting camera…' : 'Camera tracking'}</b>
      </div>
      <div className="camera-window">
        <video ref={videoRef} autoPlay muted playsInline />
        {status === 'idle' && <div className="camera-empty"><b>{hint}</b><button onClick={onEnable}>Enable Camera</button></div>}
        {unavailable && <div className="camera-empty"><b>Camera unavailable</b><span>You can still play with your mouse or touch.</span><button onClick={onContinue}>Continue</button></div>}
        {status === 'lost' && <div className="tracking-lost">Move your hand into view</div>}
      </div>
      <p>{active ? gesture : hint}</p>
    </aside>
  );
}
