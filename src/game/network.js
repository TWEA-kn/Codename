import {useEffect,useRef,useState} from 'react';
const key='cn-online-session';
function saved(){try{const s=JSON.parse(sessionStorage.getItem(key));const invite=new URLSearchParams(location.search).get('room');return invite&&invite!==s?.code?null:s;}catch{return null;}}
async function request(path,method='GET',body,token){
 const response=await fetch(path,{method,cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const data=await response.json();if(!response.ok){const e=new Error(data.error||'连接失败，请重试');e.status=response.status;throw e;}return data;
}
export function useRoom(){
 const [session,setSession]=useState(saved),[room,setRoom]=useState(null),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false),[error,setError]=useState('');
 const sessionRef=useRef(session);sessionRef.current=session;
 const accept=r=>setRoom(old=>old?.code===r.code&&old.revision>r.revision?old:r);
 function save(s){sessionRef.current=s;setSession(s);try{s?sessionStorage.setItem(key,JSON.stringify(s)):sessionStorage.removeItem(key);}catch{}if(!s){setRoom(null);setConnected(false);}}
 useEffect(()=>{if(!session)return;let stopped=false,timer;
 async function poll(){try{const d=await request(`/api/rooms/${session.code}`,'GET',null,session.token);if(stopped)return;accept(d.room);setConnected(true);setError('');}catch(e){if(stopped)return;setConnected(false);setError(e.status===401||e.status===404?e.message:'连接中断，正在自动重连…');if(e.status===401||e.status===404){save(null);return;}}if(!stopped)timer=setTimeout(poll,1000);}
 poll();return()=>{stopped=true;clearTimeout(timer);};},[session]);
 async function enter(profile,mode,code){if(busy)return;setBusy(true);setError('');try{const d=await request(code?`/api/rooms/${code.toUpperCase()}/join`:'/api/rooms','POST',{profile,mode});save({code:d.room.code,token:d.token});accept(d.room);setConnected(true);return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 async function action(a){if(busy||!session)return false;setBusy(true);setError('');const s=session;try{const d=await request(`/api/rooms/${s.code}/actions`,'POST',{...a,actionId:crypto.randomUUID(),gameId:room?.game?.id,step:room?.game?.step},s.token);if(sessionRef.current?.token!==s.token)return false;if(d.left)save(null);else accept(d.room);setConnected(true);return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 return {room,session,busy,connected,error,setError,enter,action,forget:()=>save(null)};
}
