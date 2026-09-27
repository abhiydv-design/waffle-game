import { useCallback, useEffect, useRef, useState } from 'react';

export type GameSound =
  | 'hover' | 'click' | 'pickup' | 'pour' | 'crack' | 'add' | 'sprinkle' | 'mix' | 'lid'
  | 'duplicate' | 'error' | 'mic' | 'tracking' | 'gesture' | 'complete' | 'sizzle' | 'ding' | 'burn' | 'star';

export type LoopSound = 'sizzle';

const SOUND_KEY = 'waffle-morning-sound';

/**
 * Every sound is synthesised with the Web Audio API: filtered noise for pours, sizzles and whisks,
 * inharmonic partials for the bell, short thumps for the lid. No audio files to download or license.
 */
class Kitchen {
  ctx: AudioContext;
  out: GainNode;
  noise: AudioBuffer;
  loop?: { src: AudioBufferSourceNode; gain: GainNode; crackle: number; burning: boolean };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(comp).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  get now() { return this.ctx.currentTime; }

  env(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone(freq: number, t: number, { type = 'sine' as OscillatorType, peak = 0.2, attack = 0.005, decay = 0.2, slideTo = 0 } = {}) {
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + attack + decay);
    this.env(gain, t, peak, attack, decay);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  hiss(t: number, dur: number, { type = 'bandpass' as BiquadFilterType, freq = 1000, q = 1, peak = 0.2, attack = 0.01, sweepTo = 0 } = {}) {
    const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    src.buffer = this.noise;
    src.loop = true;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    filter.Q.value = q;
    this.env(gain, t, peak, attack, Math.max(0.01, dur - attack));
    src.connect(filter).connect(gain).connect(this.out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
    return { filter, gain };
  }

  bell(freq: number, t: number, peak = 0.16, decay = 1.4) {
    // Inharmonic partials give a metallic "ding" rather than a beep.
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([ratio, level]) =>
      this.tone(freq * ratio, t, { peak: peak * level, attack: 0.002, decay: decay / Math.sqrt(ratio) }));
  }

  play(sound: GameSound) {
    const t = this.now + 0.01;
    switch (sound) {
      case 'hover':
        this.tone(1200, t, { peak: 0.03, decay: 0.04 });
        break;
      case 'click':
        this.hiss(t, 0.03, { freq: 3500, q: 2, peak: 0.12, attack: 0.002 });
        this.tone(700, t, { peak: 0.08, decay: 0.06, slideTo: 500 });
        break;
      case 'pickup':
        this.tone(320, t, { peak: 0.14, decay: 0.09, slideTo: 640 });
        this.hiss(t, 0.05, { freq: 2500, q: 1.5, peak: 0.05 });
        break;
      case 'pour': {
        // A stream of liquid: band-passed noise with a wobbling filter for the "glug".
        const { filter } = this.hiss(t, 1.1, { freq: 500, q: 3, peak: 0.28, attack: 0.08 });
        for (let i = 0; i < 9; i++) filter.frequency.setValueAtTime(420 + Math.random() * 520, t + 0.1 + i * 0.1);
        this.tone(160, t + 0.05, { peak: 0.06, decay: 0.3, slideTo: 110 });
        break;
      }
      case 'crack':
        this.hiss(t, 0.05, { type: 'highpass', freq: 2200, peak: 0.35, attack: 0.001 });
        this.hiss(t + 0.07, 0.04, { type: 'highpass', freq: 2800, peak: 0.25, attack: 0.001 });
        this.tone(140, t, { peak: 0.18, decay: 0.08, slideTo: 90 });
        this.hiss(t + 0.14, 0.35, { freq: 700, q: 2, peak: 0.08, attack: 0.03 }); // egg slides out
        break;
      case 'add':
        this.tone(190, t, { peak: 0.3, decay: 0.16, slideTo: 80 });
        this.hiss(t, 0.12, { type: 'lowpass', freq: 900, peak: 0.12 });
        break;
      case 'sprinkle':
        for (let i = 0; i < 12; i++) this.hiss(t + Math.random() * 0.45, 0.018, { freq: 4000 + Math.random() * 3000, q: 6, peak: 0.12, attack: 0.001 });
        break;
      case 'mix':
        for (let i = 0; i < 3; i++) this.hiss(t + i * 0.16, 0.15, { freq: 900, q: 1.2, peak: 0.16, attack: 0.03, sweepTo: 2600 });
        this.tone(1800, t + 0.1, { peak: 0.02, decay: 0.05 }); // whisk tapping the bowl
        break;
      case 'lid':
        this.tone(95, t, { peak: 0.45, decay: 0.2, slideTo: 60 });
        this.hiss(t, 0.06, { type: 'lowpass', freq: 1200, peak: 0.2, attack: 0.002 });
        this.tone(1450, t + 0.005, { peak: 0.04, decay: 0.25 });
        this.tone(2190, t + 0.005, { peak: 0.025, decay: 0.2 });
        break;
      case 'sizzle':
        this.hiss(t, 0.5, { type: 'highpass', freq: 3000, peak: 0.12, attack: 0.02 });
        break;
      case 'ding':
        this.bell(1318, t, 0.22, 1.8);
        break;
      case 'burn':
        this.tone(392, t, { type: 'triangle', peak: 0.12, decay: 0.25, slideTo: 370 });
        this.tone(349, t + 0.28, { type: 'triangle', peak: 0.12, decay: 0.25, slideTo: 330 });
        this.tone(311, t + 0.56, { type: 'triangle', peak: 0.13, decay: 0.7, slideTo: 262 });
        break;
      case 'duplicate':
        this.tone(220, t, { type: 'triangle', peak: 0.12, decay: 0.14, slideTo: 196 });
        break;
      case 'error':
        this.tone(233, t, { type: 'triangle', peak: 0.14, decay: 0.1 });
        this.tone(185, t + 0.11, { type: 'triangle', peak: 0.14, decay: 0.18 });
        break;
      case 'mic':
        this.tone(660, t, { peak: 0.08, decay: 0.08 });
        this.tone(990, t + 0.08, { peak: 0.08, decay: 0.12 });
        break;
      case 'tracking':
      case 'gesture':
        this.tone(784, t, { peak: 0.07, decay: 0.08 });
        this.tone(1175, t + 0.07, { peak: 0.06, decay: 0.12 });
        break;
      case 'complete':
        [523, 659, 784, 1047].forEach((f, i) => {
          this.tone(f, t + i * 0.09, { type: 'triangle', peak: 0.12, decay: 0.3 });
          this.tone(f * 2, t + i * 0.09, { peak: 0.03, decay: 0.2 });
        });
        this.bell(2093, t + 0.36, 0.08, 1.2);
        break;
      case 'star':
        [1568, 2093, 2637].forEach((f, i) => this.bell(f, t + i * 0.18, 0.09, 0.9));
        break;
    }
  }

  /** Continuous frying sound while the lid is closed, with crackles that speed up when burning. */
  startLoop() {
    if (this.loop) return;
    const src = this.ctx.createBufferSource(), hp = this.ctx.createBiquadFilter(), peakf = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    src.buffer = this.noise;
    src.loop = true;
    hp.type = 'highpass'; hp.frequency.value = 2400;
    peakf.type = 'peaking'; peakf.frequency.value = 6500; peakf.gain.value = 6;
    gain.gain.setValueAtTime(0.0001, this.now);
    gain.gain.exponentialRampToValueAtTime(0.07, this.now + 0.6);
    src.connect(hp).connect(peakf).connect(gain).connect(this.out);
    src.start();
    const loop = { src, gain, crackle: 0, burning: false };
    const tick = () => {
      if (this.loop !== loop) return;
      const t = this.now;
      const pops = loop.burning ? 5 : 2;
      for (let i = 0; i < pops; i++) this.hiss(t + Math.random() * 0.2, 0.012, { freq: 2500 + Math.random() * 5000, q: 4, peak: loop.burning ? 0.2 : 0.1, attack: 0.001 });
      loop.crackle = window.setTimeout(tick, 120 + Math.random() * 160);
    };
    this.loop = loop;
    tick();
  }

  setBurning(burning: boolean) {
    if (!this.loop || this.loop.burning === burning) return;
    this.loop.burning = burning;
    this.loop.gain.gain.setTargetAtTime(burning ? 0.11 : 0.07, this.now, 0.3);
  }

  stopLoop() {
    const loop = this.loop;
    if (!loop) return;
    this.loop = undefined;
    window.clearTimeout(loop.crackle);
    loop.gain.gain.setTargetAtTime(0.0001, this.now, 0.12);
    loop.src.stop(this.now + 0.6);
  }
}

export function useGameAudio() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  });
  const kitchen = useRef<Kitchen | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const get = useCallback(() => {
    if (!enabledRef.current) return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!kitchen.current) kitchen.current = new Kitchen(new Ctx());
    if (kitchen.current.ctx.state === 'suspended') kitchen.current.ctx.resume();
    return kitchen.current;
  }, []);

  const play = useCallback((sound: GameSound) => { get()?.play(sound); }, [get]);
  const startLoop = useCallback(() => { get()?.startLoop(); }, [get]);
  const stopLoop = useCallback(() => { kitchen.current?.stopLoop(); }, []);
  const setBurning = useCallback((burning: boolean) => { kitchen.current?.setBurning(burning); }, []);

  const toggle = useCallback(() => setEnabled(value => {
    const next = !value;
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* storage unavailable */ }
    if (!next) kitchen.current?.stopLoop();
    return next;
  }), []);

  useEffect(() => () => { kitchen.current?.stopLoop(); kitchen.current?.ctx.close(); }, []);

  return { enabled, toggle, play, startLoop, stopLoop, setBurning };
}
