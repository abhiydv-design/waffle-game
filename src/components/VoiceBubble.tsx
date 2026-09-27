type Props = { enabled: boolean; listening: boolean; transcript: string; message: string; hint: string; onToggle: () => void };

export function VoiceBubble({ enabled, listening, transcript, message, hint, onToggle }: Props) {
  return (
    <section className={`voice-bubble ${listening ? 'listening' : ''}`}>
      <div className="voice-status">
        <div className="voice-bars"><i /><i /><i /></div>
        <div className="voice-copy">
          <b>{listening ? transcript || 'Listening…' : message}</b>
          <span>{hint}</span>
        </div>
      </div>
      <button className={`voice-toggle ${listening ? 'listening' : enabled ? 'active' : ''}`} onClick={onToggle}>
        <span>{listening ? 'Stop listening' : enabled ? 'Microphone ready' : 'Enable microphone'}</span>
      </button>
    </section>
  );
}
