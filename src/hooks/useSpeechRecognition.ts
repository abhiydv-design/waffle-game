import {useCallback,useEffect,useRef,useState} from 'react';

export type SpeechStatus='idle'|'requesting'|'listening'|'unsupported'|'denied'|'error';

export function useSpeechRecognition(onFinal:(text:string)=>void,language='en-IN'){
 const [status,setStatus]=useState<SpeechStatus>('idle'),[transcript,setTranscript]=useState(''),[errorMessage,setErrorMessage]=useState('');
 const instance=useRef<any>(null),callback=useRef(onFinal),shouldListen=useRef(false),restartTimer=useRef<number>();callback.current=onFinal;
 const stop=useCallback(()=>{shouldListen.current=false;window.clearTimeout(restartTimer.current);instance.current?.stop();instance.current=null;setStatus('idle')},[]);
 const start=useCallback(async()=>{const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR){setStatus('unsupported');setErrorMessage('Use Chrome or Edge for voice recognition.');return}shouldListen.current=true;setStatus('requesting');setErrorMessage('');
  try{if(navigator.mediaDevices?.getUserMedia){const permissionStream=await navigator.mediaDevices.getUserMedia({audio:true});permissionStream.getTracks().forEach(track=>track.stop())}}
  catch{shouldListen.current=false;setStatus('denied');setErrorMessage('Microphone permission was denied.');return}
  const launch=()=>{if(!shouldListen.current)return;try{const recognition=new SR();recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=3;recognition.lang=language;recognition.onstart=()=>{setStatus('listening');setErrorMessage('')};recognition.onresult=(event:any)=>{let live='';for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i],text=result[0]?.transcript||'';live+=text;if(result.isFinal&&text.trim())callback.current(text.trim())}if(live.trim())setTranscript(live.trim())};recognition.onerror=(event:any)=>{if(event.error==='not-allowed'||event.error==='service-not-allowed'){shouldListen.current=false;setStatus('denied');setErrorMessage('Allow microphone and speech recognition in browser settings.')}else if(event.error==='audio-capture'){shouldListen.current=false;setStatus('error');setErrorMessage('No working microphone was found.')}else if(event.error==='network'){shouldListen.current=false;setStatus('error');setErrorMessage('Speech service needs an internet connection.')}else if(event.error!=='no-speech'&&event.error!=='aborted'){setStatus('error');setErrorMessage(`Voice error: ${event.error}`)}};recognition.onend=()=>{instance.current=null;if(shouldListen.current)restartTimer.current=window.setTimeout(launch,350);else setStatus('idle')};recognition.start();instance.current=recognition}catch{shouldListen.current=false;setStatus('error');setErrorMessage('Voice recognition could not start.')}};launch()
 },[language]);
 useEffect(()=>stop,[stop]);
 return {status,transcript,errorMessage,start,stop,supported:!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)};
}
