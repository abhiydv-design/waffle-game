export type BatterIngredient={id:'flour'|'egg'|'butter'|'sugar'|'vanilla'|'baking-powder'|'milk';name:string;gesture:'Tilt hand'|'Closed fist'|'Open palm'|'Two fingers';instruction:string;asset:string};

export const BATTER_INGREDIENTS:BatterIngredient[]=[
 {id:'flour',name:'Flour',gesture:'Tilt hand',instruction:'Tilt your hand to pour',asset:'/assets/waffle/ingredient-flour.png'},
 {id:'egg',name:'Egg',gesture:'Closed fist',instruction:'Make a fist to crack',asset:'/assets/waffle/ingredient-eggs.png'},
 {id:'sugar',name:'Sugar',gesture:'Tilt hand',instruction:'Tilt your hand to pour',asset:'/assets/waffle/ingredient-sugar.png'},
 {id:'baking-powder',name:'Baking Powder',gesture:'Two fingers',instruction:'Show two fingers to measure',asset:'/assets/waffle/ingredient-baking-powder.png'},
 {id:'vanilla',name:'Vanilla',gesture:'Tilt hand',instruction:'Tilt your hand to pour',asset:'/assets/waffle/ingredient-vanilla.png'},
 {id:'butter',name:'Butter',gesture:'Open palm',instruction:'Open your palm to add',asset:'/assets/waffle/ingredient-butter.png'},
 {id:'milk',name:'Milk',gesture:'Tilt hand',instruction:'Tilt your hand to pour',asset:'/assets/waffle/ingredient-milk.png'},
];

export const BATTER_TOTAL=BATTER_INGREDIENTS.length;

export const BOWL_STATES=Array.from({length:8},(_,index)=>`/assets/waffle/bowl-state-${index}.png`);
export const MIXING_BOWL_STATES=Array.from({length:5},(_,index)=>`/assets/waffle/mixing-bowl-${index}.png`);

const VOICE_ALIASES:Record<BatterIngredient['id'],string[]>={
 flour:['flour','floor','flower','atta','aata','ata','aatta','maida','mayda','आटा','मैदा','पीठ','മാവ്','മൈദ','పిండి','మైదా','ఫ్లోర్'],
 egg:['egg','eggs','anda','andaa','अंडा','अंडे','अंडं','एग','മുട്ട','എഗ്ഗ്','గుడ్డు','గుడ్లు','ఎగ్'],
 butter:['butter','batar','makhan','makkhan','makhhan','makkan','मक्खन','मख्खन','माखन','बटर','लोणी','വെണ്ണ','ബട്ടർ','వెన్న','బటర్'],
 sugar:['sugar','shugar','chini','cheeni','chinni','shakkar','sakkar','चीनी','चिनी','शक्कर','शुगर','साखर','പഞ്ചസാര','ഷുഗർ','చక్కెర','షుగర్'],
 vanilla:['vanilla','vanila','वनीला','व्हॅनिला','വാനില','വനില','వనిల్లా','వెనిల్లా'],
 'baking-powder':['baking powder','baking','bakingpowder','बेकिंग पाउडर','बेकिंग पावडर','ബേക്കിംഗ് പൗഡർ','ബേക്കിങ് പൗഡർ','బేకింగ్ పౌడర్'],
 milk:['milk','doodh','dudh','दूध','दुध','പാൽ','പാല്','పాలు','మిల్క్'],
};
function normalizeVoice(value:string){return value.normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\s-]/gu,' ').replace(/\s+/g,' ').trim()}
function distance(a:string,b:string){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=saved}}return row[b.length]}
export function matchBatterIngredient(transcript:string){const normalized=normalizeVoice(transcript),words=normalized.split(' '),joined=words.join('');return BATTER_INGREDIENTS.find(item=>VOICE_ALIASES[item.id].some(alias=>{const candidate=normalizeVoice(alias),compact=candidate.replace(/\s/g,'');if(normalized.includes(candidate)||joined.includes(compact))return true;if(candidate.length<4||candidate.includes(' '))return false;return words.some(word=>word.length>=3&&distance(word,candidate)<=Math.min(2,Math.floor(candidate.length/3))) }))}
export function isAddCommand(transcript:string){return /\b(add|pour|crack|put|daalo|dalo)\b|डालो|डालिए|मिलाओ|घाला|टाका|ചേർക്കുക|ഇടുക|జోడించు|వేయండి/i.test(transcript)}
