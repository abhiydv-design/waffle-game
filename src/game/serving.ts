export type ToppingId = 'strawberry' | 'blueberry' | 'banana' | 'honey' | 'cream' | 'ice-cream' | 'chocolate';

export type Topping = {
  id: ToppingId;
  name: string;
  /** Sprite shown in the tray. Chocolate has no artwork, so it is drawn in SVG. */
  asset: string | null;
  /** Sauces are drawn as drizzles on the waffle instead of placing a sprite. */
  drizzle?: string;
};

export const TOPPINGS: Topping[] = [
  { id: 'strawberry', name: 'Strawberry', asset: '/assets/waffle/strawberry.png' },
  { id: 'blueberry', name: 'Blueberry', asset: '/assets/waffle/blueberry.png' },
  { id: 'banana', name: 'Banana', asset: '/assets/waffle/banana.png' },
  { id: 'cream', name: 'Whipped Cream', asset: '/assets/waffle/whipped-cream.png' },
  { id: 'ice-cream', name: 'Ice Cream', asset: '/assets/waffle/ice-cream.png' },
  { id: 'honey', name: 'Honey', asset: '/assets/waffle/honey.png', drizzle: '#e9a21f' },
  { id: 'chocolate', name: 'Chocolate', asset: null, drizzle: '#4a2414' },
];

export type WaffleOrder = { id: string; name: string; customer: string; toppings: ToppingId[]; image: string };

/** Every order matches one of the finished-waffle illustrations exactly. */
export const ORDERS: WaffleOrder[] = [
  { id: 'banana-honey', name: 'Banana Honey Waffle', customer: 'Aarav', toppings: ['banana', 'honey'], image: '/assets/waffle/final-banana-honey.png' },
  { id: 'banana-cream', name: 'Banana Cream Waffle', customer: 'Meera', toppings: ['banana', 'cream'], image: '/assets/waffle/final-banana-cream.png' },
  { id: 'blueberry-scoop', name: 'Blueberry Scoop', customer: 'Kabir', toppings: ['blueberry', 'ice-cream'], image: '/assets/waffle/final-blueberry-icecream.png' },
  { id: 'honey-scoop', name: 'Honey Scoop', customer: 'Diya', toppings: ['ice-cream', 'honey'], image: '/assets/waffle/final-icecream.png' },
  { id: 'choco-cream', name: 'Choco Cream Waffle', customer: 'Rohan', toppings: ['chocolate', 'cream'], image: '/assets/waffle/final-chocolate-cream.png' },
  { id: 'choco-banana', name: 'Choco Banana Honey', customer: 'Anaya', toppings: ['chocolate', 'banana', 'honey'], image: '/assets/waffle/final-chocolate-banana-honey.png' },
  { id: 'strawberry-supreme', name: 'Strawberry Supreme', customer: 'Ishaan', toppings: ['strawberry', 'cream', 'chocolate'], image: '/assets/waffle/final-strawberry.png' },
];

export function randomOrder(previous?: string) {
  const pool = ORDERS.filter(order => order.id !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- Cooking ---------- */

export type Doneness = 'raw' | 'half' | 'perfect' | 'burnt';

/** Heat runs 0–100 while the lid is closed. The perfect window is roughly two seconds wide. */
export const HEAT_ZONES = { half: 35, perfect: 65, burnt: 86 };
export const HEAT_PER_SECOND = 8.5;

export function donenessFor(heat: number): Doneness {
  if (heat >= HEAT_ZONES.burnt) return 'burnt';
  if (heat >= HEAT_ZONES.perfect) return 'perfect';
  if (heat >= HEAT_ZONES.half) return 'half';
  return 'raw';
}

export const DONENESS_LABEL: Record<Doneness, string> = {
  raw: 'Still raw',
  half: 'Pale and soft',
  perfect: 'Golden and crisp',
  burnt: 'Burnt',
};

/* ---------- Scoring ---------- */

export type RoundResult = { doneness: Doneness; retries: number; mistakes: number; seconds: number };

export function scoreRound({ doneness, retries, mistakes }: RoundResult) {
  const notes: string[] = [];
  let penalty = 0;
  if (doneness === 'perfect') notes.push('Cooked to a perfect golden brown');
  else if (doneness === 'half') { penalty += 1; notes.push('Waffle was a little underdone'); }
  else { penalty += 2; notes.push(doneness === 'burnt' ? 'Served a burnt waffle' : 'Served a raw waffle'); }
  if (retries > 0) { penalty += 1; notes.push(`Burnt ${retries} batch${retries > 1 ? 'es' : ''} before this one`); }
  if (mistakes >= 2) { penalty += 1; notes.push(`${mistakes} wrong toppings picked`); }
  else if (mistakes === 0) notes.push('Every topping was right');
  return { stars: Math.max(1, 3 - penalty), notes };
}

/* ---------- Voice ---------- */

const TOPPING_ALIASES: Record<ToppingId, string[]> = {
  strawberry: ['strawberry', 'strawberries', 'straw berry', 'स्ट्रॉबेरी', 'സ്ട്രോബെറി', 'స్ట్రాబెర్రీ'],
  blueberry: ['blueberry', 'blueberries', 'blue berry', 'ब्लूबेरी', 'ബ്ലൂബെറി', 'బ్లూబెర్రీ'],
  banana: ['banana', 'bananas', 'kela', 'kele', 'केला', 'केले', 'പഴം', 'ബനാന', 'అరటి'],
  honey: ['honey', 'shahad', 'shehad', 'shahed', 'शहद', 'मध', 'തേൻ', 'తేనె'],
  cream: ['whipped cream', 'whip cream', 'cream', 'malai', 'क्रीम', 'मलाई', 'ക്രീം', 'క్రీమ్'],
  'ice-cream': ['ice cream', 'icecream', 'ice-cream', 'आइसक्रीम', 'आइस क्रीम', 'ഐസ്ക്രീം', 'ఐస్ క్రీమ్'],
  chocolate: ['chocolate', 'choco', 'chocolate sauce', 'चॉकलेट', 'चोकलेट', 'ചോക്ലേറ്റ്', 'చాక్లెట్'],
};

const normalize = (value: string) =>
  value.normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Picks the topping with the longest matching alias, so "ice cream" beats "cream". */
export function matchTopping(transcript: string): Topping | undefined {
  const heard = normalize(transcript);
  let best: { topping: Topping; length: number } | undefined;
  for (const topping of TOPPINGS) {
    for (const alias of TOPPING_ALIASES[topping.id]) {
      const candidate = normalize(alias);
      if (heard.includes(candidate) && (!best || candidate.length > best.length)) best = { topping, length: candidate.length };
    }
  }
  return best?.topping;
}

export type CookCommand = 'pour' | 'close' | 'open' | 'serve' | 'retry' | 'mix';

const COMMANDS: [CookCommand, RegExp][] = [
  ['retry', /\b(again|retry|restart|new batch)\b|फिर से|दोबारा/i],
  ['serve', /\b(serve|plate|done|finish|ready)\b|परोसो|सर्व/i],
  ['pour', /\b(pour|daalo|dalo)\b|डालो|डालिए/i],
  ['close', /\b(close|shut|cook|band)\b|बंद/i],
  ['open', /\b(open|kholo|khol)\b|खोलो|खोल/i],
  ['mix', /\b(mix|stir|whisk|milao)\b|मिलाओ|फेंटो/i],
];

export function matchCommand(transcript: string): CookCommand | undefined {
  return COMMANDS.find(([, pattern]) => pattern.test(transcript))?.[0];
}
