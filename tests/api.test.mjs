import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.js';
function env(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,state TEXT NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL)');return {DB:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};}};}},ASSETS:{fetch:async()=>new Response('missing',{status:404})}};}
async function call(e,path,body,token){const res=await worker.fetch(new Request('https://game.test'+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})}),e);return {status:res.status,...await res.json()};}
async function joined(e,mode){const owner=await call(e,'/api/rooms',{profile:{name:'Host',avatar:0},mode});const clients=[owner];for(let i=1;i<(mode==='coop'?2:4);i++)clients.push(await call(e,`/api/rooms/${owner.room.code}/join`,{profile:{name:`Guest${i}`,avatar:i}}));return clients;}
async function action(e,c,body){const state=await call(e,`/api/rooms/${c.room.code}`,null,c.token);return call(e,`/api/rooms/${c.room.code}/actions`,{actionId:crypto.randomUUID(),gameId:state.room.game?.id,step:state.room.game?.step,...body},c.token);}
async function ready(e,cs){for(const c of cs)assert.equal((await action(e,c,{type:'ready',ready:true})).status,200);assert.equal((await action(e,cs[0],{type:'start'})).status,200);}

test('four authenticated clients complete a classic game; secrets stay private',async()=>{
 const e=env(),cs=await joined(e,'classic'),code=cs[0].room.code;
 await action(e,cs[0],{type:'configure',first:'red',packIds:['valorant']});await ready(e,cs);
 const spy=await call(e,`/api/rooms/${code}`,null,cs[0].token),guess=await call(e,`/api/rooms/${code}`,null,cs[1].token);
 assert(spy.room.game.cards.every(c=>c.type!=='unknown'));assert(guess.room.game.cards.every(c=>c.type==='unknown'));
 for(const c of cs)assert(!JSON.stringify(spy.room).includes(c.token));
 assert.equal((await call(e,`/api/rooms/${code}`,null,'forged')).status,401);
 assert.equal((await action(e,cs[1],{type:'clue',word:'战术',count:'infinity'})).status,400);
 await action(e,cs[0],{type:'clue',word:'战术',count:'infinity'});
 let last;for(const card of spy.room.game.cards.filter(c=>c.type==='red'))last=await action(e,cs[1],{type:'guess',cardId:card.id});
 assert.equal(last.room.game.winner,'red');assert.equal(last.room.game.phase,'ended');
 const other=await call(e,`/api/rooms/${code}`,null,cs[3].token);assert.equal(other.room.game.winner,'red');
 assert.equal(other.room.players[0].agentAvatar,spy.room.players[0].agentAvatar);
});

test('two clients cooperate to win and recover same identity after reconnect',async()=>{
 const e=env(),cs=await joined(e,'coop');await ready(e,cs);let state=(await call(e,`/api/rooms/${cs[0].room.code}`,null,cs[0].token)).room;
 while(state.game.phase!=='ended'){
  const giver=cs.find(c=>c.room.me===state.game.cluer),guesser=cs.find(c=>c.room.me===state.game.guesser);
  const view=(await call(e,`/api/rooms/${state.code}`,null,giver.token)).room;
  const targets=view.game.cards.filter(c=>c.type==='green'&&!c.revealed);
  await action(e,giver,{type:'clue',word:'默契',count:'infinity'});
  for(const card of targets)state=(await action(e,guesser,{type:'guess',cardId:card.id})).room;
  if(state.game.phase!=='ended')state=(await action(e,guesser,{type:'pass'})).room;
 }
 assert.equal(state.game.winner,'win');assert.equal(state.game.remaining.green,0);
 const recovered=await call(e,`/api/rooms/${state.code}`,null,cs[1].token);assert.equal(recovered.room.me,cs[1].room.me);assert.equal(recovered.room.game.winner,'win');
});

test('concurrent ready writes survive CAS retries and action replay is idempotent',async()=>{
 const e=env(),cs=await joined(e,'coop');await Promise.all(cs.map(c=>action(e,c,{type:'ready',ready:true})));
 assert.equal((await action(e,cs[0],{type:'start'})).status,200);
 const s=(await call(e,`/api/rooms/${cs[0].room.code}`,null,cs[0].token)).room;
 const body={type:'clue',word:'同步',count:2,gameId:s.game.id,step:s.game.step,actionId:crypto.randomUUID()};
 const responses=await Promise.all([call(e,`/api/rooms/${s.code}/actions`,body,cs[0].token),call(e,`/api/rooms/${s.code}/actions`,body,cs[0].token)]);
 assert(responses.every(r=>r.status===200));assert.equal(responses[1].room.game.step,1);
});
