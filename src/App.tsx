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
import { BATTER_INGREDIENTS, BATTER_TOTAL, BOWL_STATES, MIXING_BOWL_STATES, isAddCommand, matchBatterIngredient } from './game/recipe';
import {
  DONENESS_LABEL, HEAT_PER_SECOND, ORDERS, TOPPINGS, donenessFor, matchCommand, matchTopping, randomOrder, scoreRound,
  type Doneness, type ToppingId, type WaffleOrder,
} from './game/serving';
import type { GameFeedback } from './game/types';
import { trackEvent } from './game/analytics';
import { currentStreak, dailyNumber, dailyOrder, formatCountdown, loadStats, msUntilTomorrow, recordDaily, todaysEntry, type Stats } from './game/daily';
import { useGameAudio, type GameSound } from './hooks/useGameAudio';
import { useHandTracking, type HandAction } from './hooks/useHandTracking';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

type Phase = 'batter' | 'cooking' | 'toppings' | 'served';
type Result = { stars: number; notes: string[]; seconds: number; daily: number | null; streak: number };
type Mode = 'daily' | 'practice';

const BEST_KEY = 'waffle-morning-best';
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

  const [feedback, setFeedback] = useState<GameFeedback>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Refs mirror state so gesture / voice callbacks always read the latest values.
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedbackTimer = useRef<number>();
  const timers = useRef<number[]>([]);
  const selectedRef = useRef(selected); selectedRef.current = selected;
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

  const mixing = added.size === BATTER_TOTAL;
  const stage = phase === 'batter' ? (mixing ? 'mixing' : 'ingredients') : phase;
  const stageRef = useRef(stage); stageRef.current = stage;

  // ---------- Batter ----------
  const choose = useCallback((id: string) => {
    const item = BATTER_INGREDIENTS.find(x => x.id === id);
    if (!item || addedRef.current.has(id)) { play('duplicate'); showFeedback(`${item?.name || 'Ingredient'} is already in the bowl`, 'warning'); return; }
    setSelected(id);
    play('pickup');
    showFeedback(`${item.name} picked. ${item.instruction}`, 'info');
  }, [play, showFeedback]);

  const addSelected = useCallback((source: 'mouse' | 'voice' | 'gesture', action?: HandAction) => {
    const id = selectedRef.current, item = BATTER_INGREDIENTS.find(x => x.id === id);
    if (!id || !item) { showFeedback('Pick an ingredient first', 'warning'); play('error'); return; }
    if (action && action !== item.gesture) { showFeedback(`${item.name} needs: ${item.gesture}`, 'warning'); play('error'); return; }
    const sound: GameSound = item.id === 'egg' ? 'crack' : item.id === 'baking-powder' ? 'sprinkle' : item.id === 'butter' ? 'add' : 'pour';
    play(sound);
    setAdded(current => {
      const next = new Set(current);
      next.add(id);
      if (next.size === BATTER_TOTAL) later(() => { trackEvent('stage_reached', { stage: 'mixing' }); play('complete'); showFeedback('All in! Now stir the batter in circles', 'success'); }, 600);
      return next;
    });
    selectedRef.current = null;
    setSelected(null);
    showFeedback(`${item.name} added to the bowl`, 'success');
    if (source === 'voice') play('mic');
  }, [later, play, showFeedback]);

  const stir = useCallback(() => {
    if (addedRef.current.size !== BATTER_TOTAL || mixRef.current >= 100) return;
    play('mix');
    setMixProgress(value => {
      const next = Math.min(100, value + 25);
      if (next === 100) showFeedback('Batter is smooth!', 'success');
      return next;
    });
  }, [play, showFeedback]);

  // Smooth batter → waffle maker.
  useEffect(() => {
    if (mixProgress !== 100 || phase !== 'batter') return;
    const timer = window.setTimeout(() => { setPhase('cooking'); setCookStep('open'); play('click'); trackEvent('stage_reached', { stage: 'cooking' }); }, 1500);
    return () => window.clearTimeout(timer);
  }, [mixProgress, phase, play]);

  // ---------- Cooking ----------
  const pour = useCallback(() => {
    if (stepRef.current !== 'open') return;
    setCookStep('pouring'); play('pour');
    later(() => { setCookStep('poured'); showFeedback('Batter in. Close the lid!', 'success'); }, 1300);
  }, [later, play, showFeedback]);

  const closeLid = useCallback(() => {
    const step = stepRef.current, done = donenessFor(heatRef.current);
    if (!(step === 'poured' || (step === 'opened' && (done === 'raw' || done === 'half')))) return;
    setCookStep('closing'); play('lid');
    later(() => { setCookStep('cooking'); showFeedback('Watch the needle. Open it when it hits gold', 'info'); }, 700);
  }, [later, play, showFeedback]);

  const openLid = useCallback(() => {
    if (stepRef.current !== 'cooking') return;
    const done = donenessFor(heatRef.current);
    setCookStep('opened');
    play('lid');
    if (done === 'perfect') { play('complete'); showFeedback('Perfect golden waffle!', 'success'); }
    else if (done === 'burnt') { trackEvent('waffle_burnt'); play('burn'); showFeedback('Oh no, it burnt. Try a new batch', 'warning'); }
    else { play('duplicate'); showFeedback(`${DONENESS_LABEL[done]}. Close the lid to cook more`, 'warning'); }
  }, [play, showFeedback]);

  const serveWaffle = useCallback(() => {
    if (stepRef.current !== 'opened') return;
    setServedDoneness(donenessFor(heatRef.current));
    setPhase('toppings');
    trackEvent('stage_reached', { stage: 'toppings', doneness: donenessFor(heatRef.current) });
    play('click');
    showFeedback(`Now add ${orderRef.current.customer}’s toppings`, 'info');
  }, [play, showFeedback]);

  const retryBatch = useCallback(() => {
    if (stepRef.current !== 'opened' || donenessFor(heatRef.current) !== 'burnt') return;
    setRetries(r => r + 1); setHeat(0); setCookStep('open'); play('click');
    showFeedback('Fresh maker, luckily there’s batter left', 'info');
  }, [play, showFeedback]);

  // Heat rises while the lid is closed; the machine opens itself once fully burnt.
  useEffect(() => {
    if (cookStep !== 'cooking') return;
    const interval = window.setInterval(() => setHeat(h => Math.min(100, h + HEAT_PER_SECOND / 10)), 100);
    return () => window.clearInterval(interval);
  }, [cookStep]);

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
      if (zone === 'perfect') play('ding');
      if (zone === 'burnt') { play('burn'); showFeedback('Smoke! Open the lid now', 'warning'); }
      lastZone.current = zone;
    }
    if (heat >= 100) openLid();
  }, [heat, cookStep, openLid, play, showFeedback]);

  // ---------- Toppings ----------
  const addTopping = useCallback((id: ToppingId) => {
    if (phaseRef.current !== 'toppings') return;
    const topping = TOPPINGS.find(t => t.id === id)!, current = orderRef.current;
    if (toppingsRef.current.includes(id)) { play('duplicate'); showFeedback(`${topping.name} is already on`, 'warning'); return; }
    if (!current.toppings.includes(id)) {
      setMistakes(m => m + 1); play('error');
      showFeedback(`${current.customer} didn’t order ${topping.name.toLowerCase()}`, 'warning');
      return;
    }
    const next = [...toppingsRef.current, id];
    toppingsRef.current = next;
    setToppings(next);
    play(topping.drizzle ? 'pour' : 'sprinkle');
    if (current.toppings.every(t => next.includes(t))) showFeedback('Looks just like the order. Serve it!', 'success');
    else showFeedback(`${topping.name} added`, 'success');
  }, [play, showFeedback]);

  const serveOrder = useCallback(() => {
    if (phaseRef.current !== 'toppings') return;
    const current = orderRef.current;
    if (!current.toppings.every(t => toppingsRef.current.includes(t))) { play('error'); showFeedback('Add every topping on the ticket first', 'warning'); return; }
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    const score = scoreRound({ doneness: servedDoneness, retries, mistakes, seconds });
    let daily: number | null = null, streak = 0;
    if (modeRef.current === 'daily') {
      const updated = recordDaily({ stars: score.stars, seconds, orderId: current.id });
      setStats(updated);
      daily = dailyNumber();
      streak = currentStreak(updated);
    }
    setResult({ ...score, seconds, daily, streak });
    trackEvent('round_served', { mode: modeRef.current, order: current.id, stars: score.stars, seconds, doneness: servedDoneness, retries, mistakes, streak });
    setPhase('served');
    play('complete');
    later(() => { setShowResult(true); play('star'); }, 1300);
    setBest(previous => {
      if (previous !== null && previous >= score.stars) return previous;
      saveBest(score.stars);
      return score.stars;
    });
  }, [later, mistakes, play, retries, servedDoneness, showFeedback]);

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
  };

  const startMode = (next: Mode) => {
    trackEvent('round_start', { mode: next });
    setMode(next);
    resetRound(next === 'daily' ? dailyOrder() : randomOrder(orderRef.current.id));
    setStarted(true);
    play('click');
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
    <main className={`game-shell batter-only ${stage === 'mixing' ? 'mixing-phase' : ''} ${stage === 'cooking' ? 'maker-phase' : ''} ${stage === 'toppings' ? 'topping-phase' : ''} ${stage === 'served' ? 'served-phase' : ''}`}>
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

      {tracking.cursor && playing && <div className="hand-cursor" style={{ left: `${tracking.cursor.x * 100}%`, top: `${tracking.cursor.y * 100}%` }}><span /></div>}

      {feedback && playing && (
        <div key={feedback.id} className={`game-toast ${feedback.tone}`}>
          <b>{feedback.tone === 'success' ? 'Nice' : feedback.tone === 'warning' ? 'Careful' : 'Tip'}</b>
          <span>{feedback.message}</span>
        </div>
      )}

      {showResult && result && (
        <CompletionModal order={order} stars={result.stars} notes={result.notes} seconds={result.seconds} best={best}
          daily={result.daily} streak={result.streak} countdown={countdown} onPractice={() => startMode('practice')} />
      )}

      {!started && (
        <StartScreen order={dailyOrder(new Date(now))} dailyNo={dailyNumber(new Date(now))} today={todaysEntry(stats, new Date(now))}
          streak={currentStreak(stats, new Date(now))} countdown={countdown} loading={loading}
          onDaily={() => startMode('daily')} onPractice={() => startMode('practice')} />
      )}
    </main>
  );
}
