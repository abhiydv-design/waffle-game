import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraPanel } from './components/CameraPanel';
import { CenterStage } from './components/CenterStage';
import { CompletionModal } from './components/CompletionModal';
import { COOKING_ART, CookingStage, type CookStep } from './components/CookingStage';
import { GestureGuide } from './components/GestureGuide';
import { RecipePanel } from './components/RecipePanel';
import { StartScreen } from './components/StartScreen';
import { ToppingStage } from './components/ToppingStage';
import { TopBar } from './components/TopBar';
import { VoiceBubble } from './components/VoiceBubble';
import { CustomerCorner } from './components/Customer';
import { Coach, type CoachStep, type Place } from './components/Coach';
import { Bursts, type Burst } from './components/Bursts';
import { line, type Mood } from './game/customers';
import { BATTER_INGREDIENTS, BATTER_TOTAL, BOWL_STATES, MIXING_BOWL_STATES, isAddCommand, matchBatterIngredient } from './game/recipe';
import {
  DONENESS_LABEL, HEAT_PER_SECOND, HEAT_ZONES, ORDERS, TOPPINGS, donenessFor, matchCommand, matchTopping, randomOrder, scoreRound,
  type Doneness, type ToppingId, type WaffleOrder,
} from './game/serving';
import type { GameFeedback } from './game/types';
import { trackEvent } from './game/analytics';
import { currentStreak, dailyNumber, dailyOrder, formatCountdown, loadStats, msUntilTomorrow, recordDaily, todaysEntry, type Stats } from './game/daily';
import { useGameAudio, type GameSound } from './hooks/useGameAudio';
import { useHandTracking, type HandAction } from './hooks/useHandTracking';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

type Phase = 'batter' | 'cooking' | 'toppings' | 'served';
type Result = { stars: number; notes: string[]; seconds: number; daily: number | null; streak: number; quote: string };
type Mode = 'daily' | 'practice';

const BEST_KEY = 'waffle-morning-best';
const TUTORIAL_KEY = 'waffle-morning-tutorial-done';
const CAMERA_INVITE_KEY = 'waffle-morning-camera-invite';
const flag = (key: string) => { try { return !!localStorage.getItem(key); } catch { return false; } };
const setFlag = (key: string) => { try { localStorage.setItem(key, '1'); } catch { /* storage unavailable */ } };
const GOLDEN_MID = (HEAT_ZONES.perfect + HEAT_ZONES.burnt) / 2;
const IDLE_MS = 20000;
const CONTROLS_KEY = 'waffle-morning-controls';
type Controls = { camera: boolean; mic: boolean };
const readControls = (): Controls => { try { return { camera: true, mic: true, ...JSON.parse(localStorage.getItem(CONTROLS_KEY) || '{}') }; } catch { return { camera: true, mic: true }; } };
const readBest = () => { try { const v = Number(localStorage.getItem(BEST_KEY)); return v > 0 ? v : null; } catch { return null; } };
const saveBest = (stars: number) => { try { localStorage.setItem(BEST_KEY, String(stars)); } catch { /* storage unavailable */ } };

const BACKGROUNDS = {
  ingredients: '/assets/waffle/background-kitchen.png',
  mixing: '/assets/waffle/background-batter-mixing.png',
  table: '/assets/waffle/background-waffle-maker.png',
};

export default function App() {
  // ---------- Round state ----------
  const [mode, setMode] = useState<Mode>('daily');
  const [order, setOrder] = useState<WaffleOrder>(() => dailyOrder());
  const [stats, setStats] = useState<Stats>(loadStats);
  const [now, setNow] = useState(() => Date.now());
  const [phase, setPhase] = useState<Phase>('batter');
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [controls, setControls] = useState<Controls>(readControls);
  const [loading, setLoading] = useState(true);
  const startedAt = useRef(Date.now());

  // Batter
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [mixProgress, setMixProgress] = useState(0);

  // Cooking
  const [cookStep, setCookStep] = useState<CookStep>('open');
  const [heat, setHeat] = useState(0);
  const [retries, setRetries] = useState(0);
  const [servedDoneness, setServedDoneness] = useState<Doneness>('perfect');

  // Toppings & result
  const [toppings, setToppings] = useState<ToppingId[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [best, setBest] = useState<number | null>(readBest);

  // Customer, combos and tutorial
  const [flash, setFlash] = useState<{ mood: Mood; id: number } | null>(null);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [tutorial, setTutorial] = useState(() => !flag(TUTORIAL_KEY));
  const tutorialRef = useRef(tutorial); tutorialRef.current = tutorial;
  const [clock, setClock] = useState(() => Date.now());
  const lastProgress = useRef(Date.now());
  const idleSpoken = useRef(false);
  const combos = useRef<string[]>([]);
  const chain = useRef({ last: 0, count: 0 });
  const mixStartedAt = useRef(0);
  const mistakesRef = useRef(0);
  const zoneSpoken = useRef<string>('');

  const [feedback, setFeedback] = useState<GameFeedback>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Refs mirror state so gesture / voice callbacks always read the latest values.
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedbackTimer = useRef<number>();
  const timers = useRef<number[]>([]);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const cameraOnRef = useRef(false);
  const addedRef = useRef(added); addedRef.current = added;
  const mixRef = useRef(mixProgress); mixRef.current = mixProgress;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const stepRef = useRef(cookStep); stepRef.current = cookStep;
  const heatRef = useRef(heat); heatRef.current = heat;
  const orderRef = useRef(order); orderRef.current = order;
  const toppingsRef = useRef(toppings); toppingsRef.current = toppings;

  const { enabled: soundEnabled, toggle: toggleSound, play, startLoop, stopLoop, setBurning } = useGameAudio();
  const modeRef = useRef(mode); modeRef.current = mode;

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  const showFeedback = useCallback((message: string, tone: 'success' | 'warning' | 'info' = 'info') => {
    window.clearTimeout(feedbackTimer.current);
    setFeedback({ message, tone, id: Date.now() });
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2400);
  }, []);

  /** Customer reaction: a temporary expression, and optionally a speech bubble. */
  const react = useCallback((mood: Mood, kind?: Parameters<typeof line>[0]) => {
    const id = Date.now() + Math.random();
    setFlash({ mood, id });
    window.setTimeout(() => setFlash(current => (current?.id === id ? null : current)), 2400);
    if (kind) {
      setBubble({ text: line(kind, orderRef.current.name), id });
      window.setTimeout(() => setBubble(current => (current?.id === id ? null : current)), 3000);
    }
  }, []);

  const progress = useCallback(() => { lastProgress.current = Date.now(); idleSpoken.current = false; }, []);

  const burst = useCallback((text: string, tone: Burst['tone'] = 'gold') => {
    const id = Date.now() + Math.random();
    setBursts(list => [...list, { id, text, tone }]);
    window.setTimeout(() => setBursts(list => list.filter(b => b.id !== id)), 1500);
    combos.current.push(text);
    play('star');
    trackEvent('combo', { name: text });
  }, [play]);

  const mixing = added.size === BATTER_TOTAL;
  const stage = phase === 'batter' ? (mixing ? 'mixing' : 'ingredients') : phase;
  const stageRef = useRef(stage); stageRef.current = stage;

  // ---------- Batter ----------
  const choose = useCallback((id: string) => {
    const item = BATTER_INGREDIENTS.find(x => x.id === id);
    if (!item || addedRef.current.has(id)) { play('duplicate'); react('confused', 'mistake'); showFeedback(`${item?.name || 'Ingredient'} is already in the bowl`, 'warning'); return; }
    progress();
    setSelected(id);
    play('pickup');
    showFeedback(cameraOnRef.current ? `${item.name} picked. ${item.instruction}, or click the bowl` : `${item.name} picked. Now click the bowl`, 'info');
  }, [play, progress, react, showFeedback]);

  const addSelected = useCallback((source: 'mouse' | 'voice' | 'gesture', action?: HandAction) => {
    const id = selectedRef.current, item = BATTER_INGREDIENTS.find(x => x.id === id);
    if (!id || !item) { showFeedback('Pick an ingredient first', 'warning'); play('error'); react('confused'); chain.current.count = 0; return; }
    if (action && action !== item.gesture) { showFeedback(`${item.name} needs: ${item.gesture}`, 'warning'); play('error'); react('confused'); chain.current.count = 0; return; }
    progress();
    // Quick adds in a row build a combo.
    const t = Date.now();
    chain.current.count = t - chain.current.last < 3500 ? chain.current.count + 1 : 1;
    chain.current.last = t;
    if (chain.current.count >= 3) burst(`Combo ×${chain.current.count}!`, 'gold');
    const sound: GameSound = item.id === 'egg' ? 'crack' : item.id === 'baking-powder' ? 'sprinkle' : item.id === 'butter' ? 'add' : 'pour';
    play(sound);
    setAdded(current => {
      const next = new Set(current);
      next.add(id);
      if (next.size === 1) react('happy', 'added'); else react('happy');
      if (next.size === BATTER_TOTAL) later(() => { trackEvent('stage_reached', { stage: 'mixing' }); react('excited', 'mixing'); play('complete'); showFeedback('All in! Now stir the batter in circles', 'success'); }, 600);
      return next;
    });
    selectedRef.current = null;
    setSelected(null);
    showFeedback(`${item.name} added to the bowl`, 'success');
    if (source === 'voice') play('mic');
  }, [burst, later, play, progress, react, showFeedback]);

  const stir = useCallback(() => {
    if (addedRef.current.size !== BATTER_TOTAL || mixRef.current >= 100) return;
    play('mix');
    progress();
    if (mixRef.current === 0) mixStartedAt.current = Date.now();
    const next = Math.min(100, mixRef.current + 25);
    mixRef.current = next;
    setMixProgress(next);
    if (next === 100) {
      showFeedback('Batter is smooth!', 'success');
      react('happy');
      if (Date.now() - mixStartedAt.current < 6000) burst('Speedy stir!', 'green');
    }
  }, [burst, play, progress, react, showFeedback]);

  // Smooth batter → waffle maker.
  useEffect(() => {
    if (mixProgress !== 100 || phase !== 'batter') return;
    const timer = window.setTimeout(() => { setPhase('cooking'); setCookStep('open'); play('click'); trackEvent('stage_reached', { stage: 'cooking' }); }, 1500);
    return () => window.clearTimeout(timer);
  }, [mixProgress, phase, play]);

  // ---------- Cooking ----------
  const pour = useCallback(() => {
    if (stepRef.current !== 'open') return;
    setCookStep('pouring'); play('pour'); progress(); react('excited', 'pour');
    later(() => { setCookStep('poured'); showFeedback('Batter in. Close the lid!', 'success'); }, 1300);
  }, [later, play, progress, react, showFeedback]);

  const closeLid = useCallback(() => {
    const step = stepRef.current, done = donenessFor(heatRef.current);
    if (!(step === 'poured' || (step === 'opened' && (done === 'raw' || done === 'half')))) return;
    setCookStep('closing'); play('lid'); progress(); zoneSpoken.current = '';
    later(() => { setCookStep('cooking'); showFeedback('Watch the needle. Open it when it hits gold', 'info'); }, 700);
  }, [later, play, progress, showFeedback]);

  const openLid = useCallback(() => {
    if (stepRef.current !== 'cooking') return;
    const done = donenessFor(heatRef.current);
    setCookStep('opened');
    play('lid');
    progress();
    if (done === 'perfect') {
      play('complete'); showFeedback('Perfect golden waffle!', 'success'); react('delighted', 'perfect');
      if (Math.abs(heatRef.current - GOLDEN_MID) <= 3.5) burst('Perfect timing!', 'gold'); else burst('Golden!', 'green');
    }
    else if (done === 'burnt') { trackEvent('waffle_burnt'); play('burn'); showFeedback('Oh no, it burnt. Try a new batch', 'warning'); react('sad', 'burnt'); }
    else { play('duplicate'); showFeedback(`${DONENESS_LABEL[done]}. Close the lid to cook more`, 'warning'); react('worried', 'undercooked'); }
  }, [burst, play, progress, react, showFeedback]);

  const serveWaffle = useCallback(() => {
    if (stepRef.current !== 'opened') return;
    setServedDoneness(donenessFor(heatRef.current));
    setPhase('toppings');
    progress();
    trackEvent('stage_reached', { stage: 'toppings', doneness: donenessFor(heatRef.current) });
    play('click');
    showFeedback(`Now add ${orderRef.current.customer}’s toppings`, 'info');
  }, [play, progress, showFeedback]);

  const retryBatch = useCallback(() => {
    if (stepRef.current !== 'opened' || donenessFor(heatRef.current) !== 'burnt') return;
    setRetries(r => r + 1); setHeat(0); setCookStep('open'); play('click');
    showFeedback('Fresh maker, luckily there’s batter left', 'info');
  }, [play, showFeedback]);

  // Heat rises while the lid is closed; the machine opens itself once fully burnt.
  useEffect(() => {
    if (cookStep !== 'cooking') return;
    const speed = tutorial ? HEAT_PER_SECOND * 0.7 : HEAT_PER_SECOND;
    const interval = window.setInterval(() => setHeat(h => Math.min(100, h + speed / 10)), 100);
    return () => window.clearInterval(interval);
  }, [cookStep, tutorial]);

  // Frying sound for as long as the lid is closed; it crackles harder once burning.
  useEffect(() => {
    if (cookStep === 'cooking' && soundEnabled) startLoop();
    else stopLoop();
  }, [cookStep, soundEnabled, startLoop, stopLoop]);
  useEffect(() => { setBurning(cookStep === 'cooking' && donenessFor(heat) === 'burnt'); }, [cookStep, heat, setBurning]);

  const lastZone = useRef<Doneness>('raw');
  useEffect(() => {
    if (cookStep !== 'cooking') { lastZone.current = donenessFor(heat); return; }
    const zone = donenessFor(heat);
    if (zone !== lastZone.current) {
      if (zone === 'perfect') { play('ding'); if (zoneSpoken.current !== 'perfect') { zoneSpoken.current = 'perfect'; react('excited', 'golden'); } }
      if (zone === 'burnt') { play('burn'); showFeedback('Smoke! Open the lid now', 'warning'); if (zoneSpoken.current !== 'burnt') { zoneSpoken.current = 'burnt'; react('worried', 'burning'); } }
      lastZone.current = zone;
    }
    if (heat >= 100) openLid();
  }, [heat, cookStep, openLid, play, react, showFeedback]);

  // ---------- Toppings ----------
  const addTopping = useCallback((id: ToppingId) => {
    if (phaseRef.current !== 'toppings') return;
    const topping = TOPPINGS.find(t => t.id === id)!, current = orderRef.current;
    if (toppingsRef.current.includes(id)) { play('duplicate'); react('confused'); showFeedback(`${topping.name} is already on`, 'warning'); return; }
    if (!current.toppings.includes(id)) {
      mistakesRef.current += 1;
      setMistakes(m => m + 1); play('error'); react('confused', 'wrong');
      showFeedback(`${current.customer} didn’t order ${topping.name.toLowerCase()}`, 'warning');
      return;
    }
    const next = [...toppingsRef.current, id];
    toppingsRef.current = next;
    setToppings(next);
    play(topping.drizzle ? 'pour' : 'sprinkle');
    progress();
    if (current.toppings.every(t => next.includes(t))) {
      showFeedback('Looks just like the order. Serve it!', 'success');
      react('delighted', 'topping');
      if (mistakesRef.current === 0) burst('Flawless!', 'pink');
    }
    else { showFeedback(`${topping.name} added`, 'success'); react('happy', next.length === 1 ? 'topping' : undefined); }
  }, [burst, play, progress, react, showFeedback]);

  const serveOrder = useCallback(() => {
    if (phaseRef.current !== 'toppings') return;
    const current = orderRef.current;
    if (!current.toppings.every(t => toppingsRef.current.includes(t))) { play('error'); showFeedback('Add every topping on the ticket first', 'warning'); return; }
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    const score = scoreRound({ doneness: servedDoneness, retries, mistakes, seconds });
    if (combos.current.length) score.notes.push(`Bonus moves: ${[...new Set(combos.current.map(c => c.startsWith('Combo') ? 'Ingredient combo' : c))].join(', ').replace(/!/g, '')}`);
    const quote = line(score.stars === 3 ? 'served3' : score.stars === 2 ? 'served2' : 'served1');
    react(score.stars === 3 ? 'delighted' : score.stars === 2 ? 'happy' : 'sad');
    if (tutorialRef.current) { setFlag(TUTORIAL_KEY); setTutorial(false); trackEvent('tutorial_completed'); }
    let daily: number | null = null, streak = 0;
    if (modeRef.current === 'daily') {
      const updated = recordDaily({ stars: score.stars, seconds, orderId: current.id });
      setStats(updated);
      daily = dailyNumber();
      streak = currentStreak(updated);
    }
    setResult({ ...score, seconds, daily, streak, quote });
    trackEvent('round_served', { mode: modeRef.current, order: current.id, stars: score.stars, seconds, doneness: servedDoneness, retries, mistakes, streak });
    setPhase('served');
    play('complete');
    later(() => { setShowResult(true); play('star'); }, 1300);
    setBest(previous => {
      if (previous !== null && previous >= score.stars) return previous;
      saveBest(score.stars);
      return score.stars;
    });
  }, [later, mistakes, play, react, retries, servedDoneness, showFeedback]);

  // ---------- Voice ----------
  const voiceCommand = useCallback((text: string) => {
    const current = stageRef.current, command = matchCommand(text);
    if (current === 'ingredients') {
      const item = matchBatterIngredient(text);
      if (!item) { play('error'); showFeedback(`I couldn't match “${text}” to an ingredient`, 'warning'); return; }
      choose(item.id);
      if (isAddCommand(text)) later(() => { selectedRef.current = item.id; addSelected('voice'); }, 300);
      return;
    }
    if (current === 'mixing') { if (command === 'mix') stir(); else showFeedback('Say “mix” or stir in circles', 'info'); return; }
    if (current === 'cooking') {
      if (command === 'pour') pour();
      else if (command === 'close') closeLid();
      else if (command === 'open') openLid();
      else if (command === 'serve') serveWaffle();
      else if (command === 'retry') retryBatch();
      else showFeedback('Try “pour”, “close”, “open” or “serve”', 'info');
      return;
    }
    if (current === 'toppings') {
      if (command === 'serve') { serveOrder(); return; }
      const topping = matchTopping(text);
      if (topping) addTopping(topping.id);
      else { play('error'); showFeedback(`I couldn't match “${text}” to a topping`, 'warning'); }
    }
  }, [addSelected, addTopping, choose, closeLid, later, openLid, play, pour, retryBatch, serveOrder, serveWaffle, showFeedback, stir]);

  const speech = useSpeechRecognition(voiceCommand);

  // ---------- Hand gestures ----------
  const handAction = useCallback((action: HandAction, x: number, y: number) => {
    const current = stageRef.current;
    if (action === 'Pinch') {
      const target = document.elementFromPoint(x * window.innerWidth, y * window.innerHeight);
      const ingredient = target?.closest<HTMLElement>('[data-ingredient]');
      if (current === 'ingredients' && ingredient?.dataset.ingredient) { choose(ingredient.dataset.ingredient); return; }
      const press = target?.closest<HTMLButtonElement>('[data-hand-press]');
      if (press && !press.disabled) { press.click(); return; }
      showFeedback(current === 'toppings' ? 'Point at a topping, then pinch' : current === 'ingredients' ? 'Point at an ingredient, then pinch' : 'Point at a button, then pinch', 'info');
      return;
    }
    if (current === 'ingredients') { if (action !== 'Circle') addSelected('gesture', action); return; }
    if (current === 'mixing') { if (action === 'Circle') stir(); return; }
    if (current === 'cooking') {
      if (action === 'Tilt hand') pour();
      else if (action === 'Closed fist') closeLid();
      else if (action === 'Open palm') openLid();
      return;
    }
    if (current === 'toppings' && action === 'Open palm') serveOrder();
  }, [addSelected, choose, closeLid, openLid, pour, serveOrder, showFeedback, stir]);

  const tracking = useHandTracking(videoRef, handAction);
  const cameraOn = tracking.status === 'tracking' || tracking.status === 'lost' || tracking.status === 'loading';
  cameraOnRef.current = tracking.status === 'tracking' || tracking.status === 'lost';

  // ---------- Loading & lifecycle ----------
  useEffect(() => {
    const load = (src: string) => new Promise<void>(resolve => { const image = new Image(); image.onload = image.onerror = () => resolve(); image.src = src; });
    const critical = [BACKGROUNDS.ingredients, BACKGROUNDS.mixing, ...BATTER_INGREDIENTS.map(i => i.asset), ...BOWL_STATES, ...MIXING_BOWL_STATES];
    const later = [BACKGROUNDS.table, '/assets/waffle/plate.png', ...COOKING_ART, ...TOPPINGS.flatMap(t => t.asset ? [t.asset] : []), ...ORDERS.map(o => o.image)];
    let alive = true;
    Promise.all(critical.map(load)).then(() => { if (alive) setLoading(false); later.forEach(load); });
    const fallback = window.setTimeout(() => setLoading(false), 4000);
    return () => { alive = false; window.clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (tracking.status === 'tracking') play('tracking');
    if (tracking.status === 'lost') showFeedback('Move your hand into view', 'warning');
  }, [tracking.status, play, showFeedback]);

  useEffect(() => () => { window.clearTimeout(feedbackTimer.current); timers.current.forEach(window.clearTimeout); }, []);

  const resetRound = (nextOrder: WaffleOrder) => {
    timers.current.forEach(window.clearTimeout); timers.current = [];
    stopLoop();
    setOrder(nextOrder);
    setPhase('batter'); setAdded(new Set()); setSelected(null); setMixProgress(0);
    setCookStep('open'); setHeat(0); setRetries(0); setServedDoneness('perfect');
    setToppings([]); toppingsRef.current = []; setMistakes(0); setResult(null); setShowResult(false);
    setFeedback(null); startedAt.current = Date.now();
    combos.current = []; chain.current = { last: 0, count: 0 }; mistakesRef.current = 0; mixRef.current = 0;
    zoneSpoken.current = ''; setFlash(null); setBubble(null); setBursts([]); progress();
  };

  const startMode = (next: Mode) => {
    trackEvent('round_start', { mode: next });
    setMode(next);
    resetRound(next === 'daily' ? dailyOrder() : randomOrder(orderRef.current.id));
    setStarted(true);
    play('click');
    later(() => react('happy', 'greet'), 500);
  };

  const skipTutorial = () => { setFlag(TUTORIAL_KEY); setTutorial(false); trackEvent('tutorial_skipped', { stage: stageRef.current }); };

  const toggleControl = (key: keyof Controls) => setControls(current => {
    const next = { ...current, [key]: !current[key] };
    try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    play('click');
    return next;
  });

  /**
   * Asks for camera and microphone together (one browser prompt), then starts the round.
   * If the player says no, the round still starts with mouse controls.
   */
  const launch = async (next: Mode) => {
    const wantCamera = controls.camera && tracking.status !== 'tracking' && tracking.status !== 'loading';
    const wantMic = controls.mic && speech.supported && speech.status !== 'listening';
    let allowed = true;
    if ((wantCamera || wantMic) && navigator.mediaDevices?.getUserMedia) {
      setStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: wantCamera, audio: wantMic });
        stream.getTracks().forEach(track => track.stop());
      } catch {
        allowed = false;
      }
      setStarting(false);
    }
    startMode(next);
    if (!allowed) {
      trackEvent('permissions_denied', { camera: wantCamera, mic: wantMic });
      later(() => showFeedback('Camera or mic was blocked. Mouse controls are ready', 'warning'), 300);
      return;
    }
    if (wantCamera) { trackEvent('camera_enabled', { from: 'start' }); tracking.start(); }
    if (wantMic) { trackEvent('mic_enabled', { from: 'start' }); setVoiceEnabled(true); speech.start(); }
  };

  // "New order" goes back to the intro so players can pick the daily special or practice.
  const backToMenu = () => {
    resetRound(dailyOrder());
    setStats(loadStats());
    setStarted(false);
  };

  // Countdown to the next daily special, ticking only while it's on screen.
  const countdownVisible = !started || showResult;
  useEffect(() => {
    if (!countdownVisible) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [countdownVisible]);
  const countdown = formatCountdown(msUntilTomorrow(new Date(now)));

  const toggleMic = () => {
    if (speech.status === 'listening') speech.stop();
    else { setVoiceEnabled(true); speech.start(); play('mic'); trackEvent('mic_enabled'); }
  };

  // ---------- Customer mood ----------
  const roundLive = started && stage !== 'served' && !showResult;
  useEffect(() => {
    if (!roundLive) return;
    const id = window.setInterval(() => {
      setClock(Date.now());
      // Customers get impatient when nothing has happened for a while (not during the tutorial or while cooking).
      if (!tutorialRef.current && stepRef.current !== 'cooking' && !idleSpoken.current && Date.now() - lastProgress.current > IDLE_MS) {
        idleSpoken.current = true;
        react('impatient', 'impatient');
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [roundLive, react]);

  const baseMood: Mood =
    stage === 'served' && result ? (result.stars === 3 ? 'delighted' : result.stars === 2 ? 'happy' : 'sad') :
    stage === 'cooking' && cookStep === 'cooking' && donenessFor(heat) === 'burnt' ? 'worried' :
    stage === 'cooking' && cookStep === 'cooking' && donenessFor(heat) === 'perfect' ? 'excited' :
    !tutorial && cookStep !== 'cooking' && clock - lastProgress.current > IDLE_MS ? 'impatient' :
    'waiting';
  const mood = flash?.mood ?? baseMood;

  // ---------- First-play tutorial ----------
  const firstMissing = BATTER_INGREDIENTS.find(item => !added.has(item.id));
  const orderDone = order.toppings.every(t => toppings.includes(t));
  const coachText = (text: string, step: number, target: string, id = `${step}`, prefer?: Place): CoachStep => ({ id, text, step, total: 10, target, prefer });
  const coach: CoachStep = !tutorial || !started || showResult ? null :
    stage === 'ingredients' && !selected && added.size === 0 && firstMissing ? coachText(`Welcome! Click the ${firstMissing.name.toLowerCase()} to pick it up.`, 1, `.table-ingredient[data-ingredient="${firstMissing.id}"]`) :
    stage === 'ingredients' && selected && added.size === 0 ? coachText('Now click the bowl to add it.', 2, '.fixed-bowl') :
    stage === 'ingredients' && added.size < 3 ? coachText('Great! Add the rest the same way. This list shows what’s still needed.', 3, '.recipe-card') :
    stage === 'mixing' && mixProgress < 100 ? coachText('Hold the mouse button and drag circles inside the bowl to stir.', 4, '.stir-pad') :
    stage === 'cooking' && cookStep === 'open' ? coachText('Click the waffle maker to pour in the batter.', 5, '.maker-art') :
    stage === 'cooking' && cookStep === 'poured' ? coachText('Click it again to close the lid.', 6, '.maker-art') :
    stage === 'cooking' && cookStep === 'cooking' && donenessFor(heat) !== 'perfect' && donenessFor(heat) !== 'burnt' ? coachText('The needle shows how cooked it is. Wait for the golden zone…', 7, '.heat-meter', '7', 'right') :
    stage === 'cooking' && cookStep === 'cooking' ? coachText('Now! Click the machine to open the lid.', 7, '.maker-art', '7b') :
    stage === 'cooking' && cookStep === 'opened' && donenessFor(heat) === 'perfect' ? coachText('Perfect! Serve it to add the toppings.', 8, '.cook-actions') :
    stage === 'cooking' && cookStep === 'opened' && donenessFor(heat) === 'burnt' ? coachText('Burnt! Click “New batch” and try opening a bit sooner.', 8, '.cook-actions', '8b') :
    stage === 'cooking' && cookStep === 'opened' ? coachText('Still pale. Click “Cook longer” to close the lid again.', 8, '.cook-actions', '8c') :
    stage === 'toppings' && !orderDone ? coachText(`Add everything on ${order.customer}’s ticket from the tray below.`, 9, '.order-ticket') :
    stage === 'toppings' && orderDone ? coachText('All done! Serve the order.', 10, '.serve-order') :
    null;

  // After the first round, invite mouse players to try hand gestures once.
  const showCameraInvite = !cameraOn && !flag(CAMERA_INVITE_KEY);
  const acceptCameraInvite = () => {
    setFlag(CAMERA_INVITE_KEY);
    setControls(current => { const next = { ...current, camera: true }; try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ } return next; });
    trackEvent('camera_enabled', { from: 'invite' });
    tracking.start();
  };

  // ---------- Stage-specific coaching ----------
  const cookDone = donenessFor(heat);
  const guide: { gesture?: string; instruction?: string } =
    stage === 'cooking'
      ? cookStep === 'open' ? { gesture: 'Tilt hand', instruction: 'Tilt your hand to pour the batter' }
      : cookStep === 'poured' || (cookStep === 'opened' && (cookDone === 'raw' || cookDone === 'half')) ? { gesture: 'Closed fist', instruction: 'Make a fist to close the lid' }
      : cookStep === 'cooking' ? { gesture: 'Open palm', instruction: 'Open your palm to lift the lid' }
      : { gesture: 'Pinch', instruction: 'Point at a button and pinch' }
    : stage === 'toppings'
      ? order.toppings.every(t => toppings.includes(t)) ? { gesture: 'Open palm', instruction: 'Open your palm to serve' } : { gesture: 'Pinch', instruction: 'Point at a topping and pinch' }
    : {};

  const cameraHint =
    stage === 'ingredients' ? 'Point to an ingredient and pinch to select' :
    stage === 'mixing' ? 'Move your index finger in a circle' :
    stage === 'cooking' ? 'Tilt to pour, fist to close, palm to open' :
    'Point at a topping and pinch';

  const voiceHint =
    stage === 'ingredients' ? 'Say an ingredient, like “add milk”' :
    stage === 'mixing' ? 'Say “mix” to stir' :
    stage === 'cooking' ? 'Say “pour”, “close”, “open” or “serve”' :
    'Say a topping, then “serve”';

  const background =
    stage === 'served' ? order.image :
    stage === 'mixing' ? BACKGROUNDS.mixing :
    stage === 'ingredients' ? BACKGROUNDS.ingredients :
    BACKGROUNDS.table;

  const playing = stage !== 'served';

  return (
    <main className={`game-shell batter-only ${cameraOn ? '' : 'camera-off'} ${stage === 'mixing' ? 'mixing-phase' : ''} ${stage === 'cooking' ? 'maker-phase' : ''} ${stage === 'toppings' ? 'topping-phase' : ''} ${stage === 'served' ? 'served-phase' : ''}`}>
      <img key={background} className="kitchen-background scene-background" src={background} alt="" />
      <div className="game-vignette" />
      <TopBar sound={soundEnabled} onSound={() => { trackEvent('sound_toggled', { on: !soundEnabled }); toggleSound(); }} onReset={backToMenu} />

      {stage === 'ingredients' && <RecipePanel added={added} selected={selected} onChoose={choose} />}

      {phase === 'batter' && (
        <CenterStage
          added={added}
          selected={selected}
          mixProgress={mixProgress}
          onChoose={choose}
          onAddSelected={() => addSelected('mouse')}
          onStir={stir}
          gestures={cameraOnRef.current}
          onDropIngredient={id => { selectedRef.current = id; setSelected(id); window.setTimeout(() => addSelected('mouse'), 0); }}
        />
      )}

      {stage === 'cooking' && (
        <CookingStage step={cookStep} heat={heat} onPour={pour} onClose={closeLid} onOpen={openLid} onServe={serveWaffle} onRetry={retryBatch} />
      )}

      {stage === 'toppings' && (
        <ToppingStage order={order} doneness={servedDoneness} added={toppings} onAdd={addTopping} onServe={serveOrder} />
      )}

      {playing && (
        <>
          <CameraPanel videoRef={videoRef} status={tracking.status} gesture={tracking.gesture} hint={cameraHint} onEnable={() => { play('click'); trackEvent('camera_enabled'); tracking.start(); }} onContinue={() => showFeedback('Mouse and touch controls are ready', 'info')} />
          <GestureGuide selected={selected} ready={mixing} detected={tracking.gesture} {...guide} />
          <VoiceBubble enabled={voiceEnabled} listening={speech.status === 'listening' || speech.status === 'requesting'} transcript={speech.transcript} message={speech.errorMessage || 'Voice control ready'} hint={voiceHint} onToggle={toggleMic} />
        </>
      )}

      {started && playing && <CustomerCorner name={order.customer} mood={mood} speech={bubble} />}
      <Bursts bursts={bursts} />
      <Coach step={coach} onSkip={skipTutorial} />

      {tracking.cursor && playing && <div className="hand-cursor" style={{ left: `${tracking.cursor.x * 100}%`, top: `${tracking.cursor.y * 100}%` }}><span /></div>}

      {feedback && playing && (
        <div key={feedback.id} className={`game-toast ${feedback.tone}`}>
          <b>{feedback.tone === 'success' ? 'Nice' : feedback.tone === 'warning' ? 'Careful' : 'Tip'}</b>
          <span>{feedback.message}</span>
        </div>
      )}

      {showResult && result && (
        <CompletionModal order={order} stars={result.stars} notes={result.notes} seconds={result.seconds} best={best}
          daily={result.daily} streak={result.streak} countdown={countdown} onPractice={() => startMode('practice')}
          mood={mood} quote={result.quote} cameraInvite={showCameraInvite} onCameraInvite={acceptCameraInvite}
          onDismissInvite={() => setFlag(CAMERA_INVITE_KEY)} />
      )}

      {!started && (
        <StartScreen order={dailyOrder(new Date(now))} dailyNo={dailyNumber(new Date(now))} today={todaysEntry(stats, new Date(now))}
          streak={currentStreak(stats, new Date(now))} countdown={countdown} loading={loading}
          starting={starting} controls={controls} voiceSupported={speech.supported} onToggle={toggleControl}
          onDaily={() => launch('daily')} onPractice={() => launch('practice')} />
      )}
    </main>
  );
}
