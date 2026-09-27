import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';

export type TrackingStatus='idle'|'loading'|'tracking'|'lost'|'denied'|'error';
export type HandAction='Pinch'|'Open palm'|'Closed fist'|'Two fingers'|'Tilt hand'|'Circle';

export function useHandTracking(videoRef:RefObject<HTMLVideoElement>,onAction:(action:HandAction,x:number,y:number)=>void){
 const [status,setStatus]=useState<TrackingStatus>('idle'),[cursor,setCursor]=useState<{x:number,y:number}|null>(null),[gesture,setGesture]=useState('No hand');const stream=useRef<MediaStream|null>(null),active=useRef(false),callback=useRef(onAction),lastAction=useRef(0),pinched=useRef(false),trail=useRef<{x:number;y:number}[]>([]);callback.current=onAction;
 const stop=useCallback(()=>{active.current=false;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setStatus('idle');setCursor(null)},[]);
 const start=useCallback(async()=>{if(active.current)return;setStatus('loading');try{const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'}});stream.current=media;active.current=true;if(videoRef.current){videoRef.current.srcObject=media;await videoRef.current.play()}
  const vision=await import('@mediapipe/tasks-vision'),files=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'),recognizer=await vision.GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.58,minHandPresenceConfidence:.55,minTrackingConfidence:.55});let last=-1,lostFrames=0;
  const emit=(action:HandAction,x:number,y:number)=>{const now=Date.now();if(now-lastAction.current<1150)return;lastAction.current=now;setGesture(`${action} detected`);callback.current(action,x,y)};
  const detect=()=>{if(!active.current||!videoRef.current)return;const video=videoRef.current;if(video.readyState>=2&&video.currentTime!==last){last=video.currentTime;const result=recognizer.recognizeForVideo(video,performance.now()),lm=result.landmarks?.[0],raw=result.gestures?.[0]?.[0]?.categoryName;if(lm){lostFrames=0;setStatus('tracking');const tip=lm[8],thumb=lm[4],x=1-tip.x,y=tip.y,isPinch=Math.hypot(tip.x-thumb.x,tip.y-thumb.y)<.052;setCursor({x,y});trail.current.push({x:tip.x,y:tip.y});trail.current=trail.current.slice(-30);const wrist=lm[0],middle=lm[9],dx=middle.x-wrist.x,dy=middle.y-wrist.y,isTilt=Math.abs(dx)>.16&&Math.abs(dx)>Math.abs(dy)*.72;
    if(isPinch&&!pinched.current)emit('Pinch',x,y);pinched.current=isPinch;
    if(!isPinch&&raw==='Open_Palm')emit('Open palm',x,y);else if(!isPinch&&raw==='Closed_Fist')emit('Closed fist',x,y);else if(!isPinch&&raw==='Victory')emit('Two fingers',x,y);else if(!isPinch&&isTilt)emit('Tilt hand',x,y);
    let circleDetected=false;if(trail.current.length===30){const xs=trail.current.map(p=>p.x),ys=trail.current.map(p=>p.y),width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys),start=trail.current[0],end=trail.current[29];if(width>.16&&height>.14&&Math.hypot(start.x-end.x,start.y-end.y)<.12){circleDetected=true;emit('Circle',x,y);trail.current=[]}}
    if(!circleDetected&&!isPinch&&!isTilt&&raw)setGesture(raw.replace(/_/g,' '));
   }else{lostFrames++;pinched.current=false;if(lostFrames>8){setStatus('lost');setCursor(null);setGesture('Move your hand into view')}}}requestAnimationFrame(detect)};detect();
 }catch(error:any){active.current=false;setStatus(error?.name==='NotAllowedError'?'denied':'error')}},[videoRef]);
 useEffect(()=>stop,[stop]);return {status,cursor,gesture,start,stop};
}
