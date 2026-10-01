import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,act,projectRoom} from '../server/rooms.js';
const words=Array.from({length:40},(_,i)=>`词${i}`);
function setup(mode='classic'){
 const r=newRoom('ABCDEF',{name:'A',avatar:0},mode);r.words=words;
 const total=mode==='coop'?2:4;
 for(let i=1;i<total;i++)joinRoom(r,{name:`P${i}`,avatar:i});
 for(const p of r.players)act(r,p.id,{type:'ready',ready:true});
 act(r,r.host,{type:'start'});return r;
}
test('four real players required; seats and host controls enforced',()=>{
 const r=newRoom('ABCDEF',{name:'A',avatar:0},'classic');
 assert.throws(()=>act(r,r.host,{type:'start'}));joinRoom(r,{name:'B',avatar:1});
 assert.throws(()=>act(r,r.players[1].id,{type:'configure',mode:'coop'}));
 assert.throws(()=>act(r,r.players[1].id,{type:'seat',seat:0}));
});
test('classic projection never leaks hidden keys or credentials to guesser',()=>{
 const r=setup();const p=r.players.find(p=>p.seat===1);const v=projectRoom(r,p.id);
 assert(v.game.cards.every(c=>c.type==='unknown'));assert(!JSON.stringify(v).includes(r.players[0].token));
 assert(!('words' in v));assert(!('keys' in v.game.cards[0]));
 assert.throws(()=>act(r,p.id,{type:'clue',word:'测试',count:2,gameId:r.game.id,step:r.game.step}));
 assert.throws(()=>act(r,r.host,{type:'seat',seat:1}));
});
test('cooperative layout contains 15 joint targets and hides partner key',()=>{
 const r=setup('coop'),g=r.game;
 assert.equal(g.cards.filter(c=>c.keys.includes('green')).length,15);
 for(const side of [0,1]){assert.equal(g.cards.filter(c=>c.keys[side]==='green').length,9);assert.equal(g.cards.filter(c=>c.keys[side]==='assassin').length,3);}
 const a=projectRoom(r,r.players[0].id),b=projectRoom(r,r.players[1].id);
 assert(a.game.canClue);assert(b.game.cards.every(c=>c.type==='unknown'));
 assert(!JSON.stringify(a).includes('keys'));
});
test('cooperative correct guess, neutral turn, stale command and assassin loss',()=>{
 const r=setup('coop');const [a,b]=r.players;
 const move=(p,x)=>act(r,p.id,{...x,gameId:r.game.id,step:r.game.step});
 move(a,{type:'clue',word:'联想',count:2});
 const right=r.game.cards.find(c=>c.keys[0]==='green');move(b,{type:'guess',cardId:right.id});assert(right.solved);
 assert.throws(()=>act(r,b.id,{type:'guess',cardId:right.id,gameId:r.game.id,step:0}));
 const neutral=r.game.cards.find(c=>c.keys[0]==='neutral'&&c.keys[1]==='green');move(b,{type:'guess',cardId:neutral.id});
 assert.equal(r.game.turn,1);assert.equal(r.game.round,2);assert(!neutral.solved);
 move(b,{type:'clue',word:'伙伴',count:2});
 const bad=r.game.cards.find(c=>c.keys[1]==='assassin'&&!c.solved);move(a,{type:'guess',cardId:bad.id});
 assert.equal(r.game.winner,'loss');assert.equal(r.game.phase,'ended');
});
test('game pauses on disconnect and leaving frees room',()=>{
 const r=setup('coop');r.players[1].lastSeen=0;
 assert(projectRoom(r,r.host).paused);assert.throws(()=>act(r,r.host,{type:'clue',word:'伙伴',count:1,gameId:r.game.id,step:0}));
 act(r,r.players[1].id,{type:'leave'});assert.equal(r.players.length,1);assert.equal(r.game,null);
});

test('co-op skips a completed clue side and expires after ninth turn',()=>{
 const r=setup('coop');const [a,b]=r.players;const g=r.game;
 g.cards.filter(c=>c.keys[0]==='green').forEach(c=>c.solved=true);g.turn=1;
 act(r,b.id,{type:'clue',word:'剩余',count:1,gameId:g.id,step:g.step});
 const neutral=g.cards.find(c=>c.keys[1]==='neutral'&&!c.solved);
 act(r,a.id,{type:'guess',cardId:neutral.id,gameId:g.id,step:g.step});
 assert.equal(g.turn,1);assert.equal(g.round,2);
 g.round=9;act(r,b.id,{type:'clue',word:'最后',count:1,gameId:g.id,step:g.step});
 const next=g.cards.find(c=>c.keys[1]==='neutral'&&!c.solved&&!c.misses.includes(1));
 act(r,a.id,{type:'guess',cardId:next.id,gameId:g.id,step:g.step});assert.equal(g.reason,'time');assert.equal(g.winner,'loss');
});
