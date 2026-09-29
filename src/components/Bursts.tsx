export type Burst = { id: number; text: string; tone: 'gold' | 'green' | 'pink' };

/** Big celebratory text that pops in the middle of the screen and fades away. */
export function Bursts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="burst-layer" aria-live="polite">
      {bursts.map(burst => (
        <div key={burst.id} className={`burst tone-${burst.tone}`}>
          <span>{burst.text}</span>
          <i /><i /><i /><i /><i /><i />
        </div>
      ))}
    </div>
  );
}
