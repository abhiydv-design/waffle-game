import {useCallback,useRef,useState} from 'react';

export type GameSound='hover'|'click'|'pickup'|'pour'|'crack'|'add'|'sprinkle'|'mix'|'duplicate'|'error'|'mic'|'tracking'|'gesture'|'complete';
const notes:Record<GameSound,number[]>={hover:[520],click:[330],pickup:[440,554],pour:[330,294,262],crack:[170,420],add:[523,659],sprinkle:[784,880,988],mix:[294,330,349],duplicate:[250],error:[180,150],mic:[440,660],tracking:[392,523],gesture:[587,784],complete:[523,659,784,1047]};

export function useGameAudio(){
 const [enabled,setEnabled]=useState(true);const context=useRef<AudioContext|null>(null);
 const play=useCallback((sound:GameSound)=>{if(!enabled)return;const Ctx=window.AudioContext||(window as any).webkitAudioContext;if(!Ctx)return;const ctx=context.current||(context.current=new Ctx());if(ctx.state==='suspended')ctx.resume();const now=ctx.currentTime;
  notes[sound].forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=sound==='error'||sound==='duplicate'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,now+index*.075);gain.gain.setValueAtTime(.0001,now+index*.075);gain.gain.exponentialRampToValueAtTime(sound==='complete'?.11:.06,now+index*.075+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+index*.075+.16);oscillator.connect(gain).connect(ctx.destination);oscillator.start(now+index*.075);oscillator.stop(now+index*.075+.18)})
 },[enabled]);
 const toggle=useCallback(()=>setEnabled(x=>!x),[]);
 return {enabled,toggle,play};
}
