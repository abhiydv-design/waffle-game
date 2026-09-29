export type Mood = 'waiting' | 'happy' | 'delighted' | 'excited' | 'impatient' | 'worried' | 'confused' | 'sad';

export type HairStyle = 'short' | 'long' | 'bun' | 'curly' | 'ponytail' | 'spiky';
export type Accessory = 'none' | 'glasses' | 'cap' | 'earrings' | 'headband';

export type CustomerLook = {
  skin: string;
  hair: string;
  style: HairStyle;
  shirt: string;
  backdrop: string;
  accessory: Accessory;
  accent: string;
};

/** One look per customer name used in ORDERS. */
export const CUSTOMER_LOOKS: Record<string, CustomerLook> = {
  Aarav: { skin: '#c68a5b', hair: '#2b1b12', style: 'short', shirt: '#3f7fbf', backdrop: '#d9ecf7', accessory: 'glasses', accent: '#27313d' },
  Meera: { skin: '#b97c52', hair: '#1f130c', style: 'long', shirt: '#d8577a', backdrop: '#fbe0e8', accessory: 'earrings', accent: '#f2b632' },
  Kabir: { skin: '#a86c43', hair: '#1a100a', style: 'spiky', shirt: '#4f9d63', backdrop: '#dff1e2', accessory: 'cap', accent: '#e25b3a' },
  Diya: { skin: '#d49a6a', hair: '#3a2416', style: 'ponytail', shirt: '#8e62c9', backdrop: '#ebe2f8', accessory: 'headband', accent: '#f2a41a' },
  Rohan: { skin: '#9a603b', hair: '#140c07', style: 'curly', shirt: '#e08a2e', backdrop: '#fcebd3', accessory: 'none', accent: '#000' },
  Anaya: { skin: '#c28253', hair: '#24160d', style: 'bun', shirt: '#2f9c9a', backdrop: '#dcf2f1', accessory: 'earrings', accent: '#e9c34a' },
  Ishaan: { skin: '#b3774c', hair: '#2e1c11', style: 'short', shirt: '#c2453b', backdrop: '#f8e0dc', accessory: 'none', accent: '#000' },
};

export const lookFor = (name: string) => CUSTOMER_LOOKS[name] ?? CUSTOMER_LOOKS.Aarav;

/** Things customers say. A random line is picked each time so they don't repeat too often. */
export const LINES = {
  greet: ['Hi! One {order}, please!', 'Good morning! Can I get a {order}?', 'I’d love a {order} today!'],
  added: ['Ooh, looking good!', 'Yum, keep going!', 'Nice!'],
  mixing: ['Smells great already!', 'Stir it smooth, please!'],
  pour: ['Here we go!', 'I can’t wait!'],
  golden: ['Ooh, it smells amazing!', 'That smell!'],
  burning: ['Is something burning?!', 'Uh oh… smoke!'],
  burnt: ['Oh no… that one’s burnt.', 'I’ll wait for a fresh one.'],
  perfect: ['Look at that golden colour!', 'Perfect!'],
  undercooked: ['Hmm, still looks a bit pale.', 'A little longer, maybe?'],
  wrong: ['I didn’t order that…', 'Hmm, that’s not on my order.'],
  mistake: ['Hmm?', 'Wait, what?'],
  topping: ['Yes! That one!', 'Mmm, perfect!'],
  impatient: ['Um… is it coming soon?', 'I’m getting hungry…', 'Tick tock…'],
  served3: ['This is perfect! Thank you!', 'Best waffle ever!'],
  served2: ['Yum, thanks!', 'Tasty, thank you!'],
  served1: ['Well… thanks, I guess.', 'I’ve had better…'],
} as const;

export function line(kind: keyof typeof LINES, orderName = '') {
  const options = LINES[kind];
  return options[Math.floor(Math.random() * options.length)].replace('{order}', orderName);
}
