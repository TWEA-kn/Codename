import {newRoom,joinRoom,act,projectRoom} from './rooms.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const roomCode=()=>{const bytes=crypto.getRandomValues(new Uint8Array(6));const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...bytes].map(b=>chars[b%chars.length]).join('');};
export async function api(request,env){
 const url=new URL(request.url);if(!/^\/api\/rooms(?:\/|$)/.test(url.pathname))return null;
 if(!env.DB)return json({error:'房间服务暂不可用'},503);
 try{
  if(!['GET','POST'].includes(request.method))return json({error:'请求方法不支持'},405);
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'请求来源不匹配'},403);
  let body={};if(request.method==='POST'){if(Number(request.headers.get('content-length'))>600000)return json({error:'请求过大'},413);const raw=await request.text();if(raw.length>600000)return json({error:'请求过大'},413);try{body=JSON.parse(raw);}catch{return json({error:'请求格式无效'},400);}}
  if(url.pathname==='/api/rooms'&&request.method==='POST'){
   const r=newRoom(roomCode(),body.profile,body.mode);const now=Date.now();
   await env.DB.prepare('DELETE FROM rooms WHERE updated_at < ?').bind(now-86400000).run();
   await env.DB.prepare('INSERT INTO rooms (code, state, revision, updated_at) VALUES (?, ?, 0, ?)').bind(r.code,JSON.stringify(r),now).run();
   return json({room:projectRoom(r,r.host),token:r.players[0].token},201);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|actions))?$/);if(!match)return json({error:'房间地址无效'},404);
  const [,code,operation]=match;const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
  for(let retry=0;retry<6;retry++){
   const row=await env.DB.prepare('SELECT state, revision, updated_at FROM rooms WHERE code = ?').bind(code).first();if(!row||Date.now()-row.updated_at>86400000)return json({error:'房间不存在或已过期'},404);
   const r=JSON.parse(row.state);let player=r.players.find(p=>p.token===token);let changed=false,joined=false;
   if(operation==='join'&&request.method==='POST'){player=joinRoom(r,body.profile);changed=true;joined=true;}
   else{
    if(!player)return json({error:'你已离开房间，请重新加入'},401);
    if(operation==='actions'&&request.method==='POST'){
     if(typeof body.actionId!=='string'||body.actionId.length>80)return json({error:'操作标识无效'},400);
     if(r.recentActions.some(x=>x===`${player.id}:${body.actionId}`))return json({room:projectRoom(r,player.id)});
     act(r,player.id,body);r.recentActions=[...r.recentActions,`${player.id}:${body.actionId}`].slice(-80);changed=true;
    }else if(operation||request.method!=='GET')return json({error:'请求地址无效'},404);
    if(Date.now()-player.lastSeen>8000){player.lastSeen=Date.now();changed=true;}
   }
   if(!changed)return json({room:projectRoom(r,player.id)});
   r.revision=row.revision+1;
   const updated=await env.DB.prepare('UPDATE rooms SET state = ?, revision = ?, updated_at = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(r),r.revision,Date.now(),code,row.revision).run();
   if(updated.meta.changes){if(!r.players.some(p=>p.id===player.id))return json({left:true});return json({room:projectRoom(r,player.id),...(joined?{token:player.token}:{})});}
  }
  return json({error:'房间正在更新，请重试'},409);
 }catch(e){return json({error:e.message?.includes('SQLITE')?'房间服务暂时不可用':e.message||'操作失败'},400);}
}
