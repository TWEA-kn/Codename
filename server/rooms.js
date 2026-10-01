import {createGame,giveClue,revealCard,endTurn} from '../src/game/engine.js';
import {mergeWords,parseWordPack} from '../src/game/wordpacks.js';
import classic from '../src/data/wordpacks/classic.json' with {type:'json'};
import nature from '../src/data/wordpacks/nature.json' with {type:'json'};
import food from '../src/data/wordpacks/food.json' with {type:'json'};
import space from '../src/data/wordpacks/space.json' with {type:'json'};
import english from '../src/data/wordpacks/english.json' with {type:'json'};
import valorant from '../src/data/wordpacks/valorant.json' with {type:'json'};
import anime from '../src/data/wordpacks/anime.json' with {type:'json'};
export const packs=[classic,nature,food,space,english,valorant,anime];
const need=(condition,message)=>{if(!condition)throw new Error(message);};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const capacity=r=>r.mode==='coop'?2:4;
const online=p=>Date.now()-p.lastSeen<35000;
const log=(r,text,team='neutral')=>{r.logs.push({id:crypto.randomUUID(),text,team,time:new Date().toISOString()});r.logs=r.logs.slice(-100);};
function player(profile,seat){need(typeof profile?.name==='string'&&profile.name.trim().length>0&&profile.name.trim().length<=16,'昵称需为 1–16 个字符');return {id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID(),name:profile.name.trim(),avatar:Number.isInteger(profile.avatar)&&profile.avatar>=0&&profile.avatar<9?profile.avatar:0,agentAvatar:Math.floor(Math.random()*9),seat,ready:false,lastSeen:Date.now()};}
export function newRoom(code,profile,mode='classic'){
 need(['classic','coop'].includes(mode),'请选择两人合作或四人对战');const p=player(profile,0);
 return {code,host:p.id,mode,players:[p],packIds:['classic'],packNames:['经典词库'],words:classic.words,first:'random',game:null,logs:[],revision:0,recentActions:[]};
}
export function joinRoom(r,profile){need(!r.game,'房间正在对局，请等待返回大厅');need(r.players.length<capacity(r),'房间已满');const seat=Array.from({length:capacity(r)},(_,i)=>i).find(i=>!r.players.some(p=>p.seat===i));const p=player(profile,seat);const available=shuffle(Array.from({length:9},(_,i)=>i).filter(i=>!r.players.some(p=>p.agentAvatar===i)));p.agentAvatar=available[0];r.players.push(p);if(!r.host)r.host=p.id;log(r,`${p.name} 加入房间`);return p;}
function coopGame(words){
 const pairs=[...Array.from({length:3},()=>['green','green']),...Array.from({length:5},()=>['green','neutral']),['green','assassin'],...Array.from({length:5},()=>['neutral','green']),['assassin','green'],['assassin','assassin'],['neutral','assassin'],['assassin','neutral'],...Array.from({length:7},()=>['neutral','neutral'])];
 const keys=shuffle(pairs);return {cards:shuffle(words).slice(0,25).map((word,id)=>({id,word,keys:keys[id],solved:false,misses:[]})),turn:0,phase:'clue',round:1,clue:null,guessesMade:0,guessesLeft:0,winner:null,reason:null};
}
function nextCoop(g){if(g.round>=9){g.phase='ended';g.winner='loss';g.reason='time';}else{g.round++;g.turn=1-g.turn;if(!g.cards.some(c=>!c.solved&&c.keys[g.turn]==='green'))g.turn=1-g.turn;g.phase='clue';g.clue=null;g.guessesMade=0;g.guessesLeft=0;}}
function roles(r){const g=r.game;if(!g)return {};if(r.mode==='coop')return {cluer:r.players.find(p=>p.seat===g.turn)?.id,guesser:r.players.find(p=>p.seat!==g.turn)?.id};const base=g.turn==='red'?0:2;return {cluer:r.players.find(p=>p.seat===base)?.id,guesser:r.players.find(p=>p.seat===base+1)?.id};}
export function act(r,id,a){
 const p=r.players.find(p=>p.id===id);need(p,'你已离开这个房间');const host=()=>need(r.host===id,'只有房主可以操作');const lobby=()=>need(!r.game,'请先返回大厅');
 if(a.type==='leave'){r.players=r.players.filter(x=>x.id!==id);if(r.host===id)r.host=r.players[0]?.id??null;r.game=null;r.players.forEach(x=>x.ready=false);log(r,`${p.name} 离开房间，对局已结束`);return;}
 if(a.type==='claimHost'){need(!online(r.players.find(x=>x.id===r.host)),'房主仍在线');r.host=id;log(r,`${p.name} 接任房主`);return;}
 if(a.type==='lobby'){host();r.game=null;r.players.forEach(x=>x.ready=false);log(r,'房主返回大厅');return;}
 if(a.type==='remove'){host();lobby();const target=r.players.find(x=>x.id===a.playerId);need(target&&target.id!==id&&!online(target),'只能移除离线玩家');r.players=r.players.filter(x=>x.id!==target.id);return;}
 if(a.type==='ready'){lobby();p.ready=!!a.ready;return;}
 if(a.type==='seat'){lobby();need(Number.isInteger(a.seat)&&a.seat>=0&&a.seat<capacity(r),'角色无效');need(!r.players.some(x=>x.seat===a.seat&&x.id!==id),'这个位置已有人');p.seat=a.seat;p.ready=false;return;}
 if(a.type==='configure'){
  host();lobby();
  if(a.mode!==undefined){need(['classic','coop'].includes(a.mode),'模式无效');need(a.mode!=='coop'||r.players.length<=2,'两人合作房间最多 2 人');r.mode=a.mode;r.players.forEach((x,i)=>x.seat=i);}
  if(a.first!==undefined){need(['random','red','blue'].includes(a.first),'先手无效');r.first=a.first;}
  if(a.packIds!==undefined){need(Array.isArray(a.packIds)&&a.packIds.length>0&&a.packIds.length<=20,'请选择 1–20 套词库');const custom=(a.customPacks||[]).map(x=>({...parseWordPack(JSON.stringify(x)),id:x.id}));const selected=a.packIds.map(id=>packs.find(p=>p.id===id)||custom.find(p=>p.id===id));need(selected.every(Boolean),'词库不存在，请重新选择');const words=mergeWords(selected);need(words.length>=25&&words.length<=10000,'词库需包含 25–10000 个不重复词');r.words=words;r.packIds=selected.map(p=>p.id);r.packNames=selected.map(p=>p.name);}
  r.players.forEach(x=>x.ready=false);return;
 }
 if(a.type==='start'){
  host();lobby();need(r.players.length===capacity(r)&&r.players.every(x=>x.ready&&online(x)),'等待所有玩家加入并准备');need(r.words.length>=25,'词库不足 25 个词');
  r.game=r.mode==='coop'?coopGame(r.words):createGame(r.words,r.first==='random'?(Math.random()<0.5?'red':'blue'):r.first);r.game.id=crypto.randomUUID();r.game.step=0;r.logs=[];log(r,r.mode==='coop'?'合作开始 · 9 回合内找齐 15 个目标':'红蓝对战开始');return;
 }
 const g=r.game;need(g&&g.phase!=='ended','当前没有进行中的对局');need(r.players.every(online),'有玩家离线，等待重新连接');need(a.gameId===g.id&&a.step===g.step,'回合已更新，请根据最新棋盘操作');const {cluer,guesser}=roles(r);
 if(a.type==='clue'){
  need(id===cluer&&g.phase==='clue','现在不能给提示');
  const valid=giveClue({...g,cards:g.cards.map(c=>({...c,revealed:r.mode==='coop'?c.solved:c.revealed}))},a.word,a.count);
  Object.assign(g,{phase:valid.phase,clue:valid.clue,guessesLeft:valid.guessesLeft===Infinity?null:valid.guessesLeft,guessesMade:0});log(r,`${p.name} 提示：${valid.clue.word} · ${a.count==='infinity'?'∞':a.count}`);
 }else if(a.type==='guess'){
  need(id===guesser&&g.phase==='guess','现在不能猜词');const c=g.cards.find(x=>x.id===a.cardId);need(c,'卡牌不存在');
  if(r.mode==='classic'){const result=revealCard({...g,guessesLeft:g.guessesLeft===null?Infinity:g.guessesLeft},a.cardId);Object.assign(g,result);if(g.guessesLeft===Infinity)g.guessesLeft=null;log(r,`${p.name} 翻开「${c.word}」· ${{red:'红队',blue:'蓝队',neutral:'中立',assassin:'刺客'}[c.type]}`,c.type);}
  else{need(!c.solved&&!c.misses.includes(g.turn),'这张卡本回合不能再猜');const type=c.keys[g.turn];g.guessesMade++;if(g.guessesLeft!==null)g.guessesLeft--;log(r,`${p.name} 猜「${c.word}」· ${{green:'目标',neutral:'中立',assassin:'刺客'}[type]}`,type);
   if(type==='green'){c.solved=true;if(g.cards.filter(c=>c.solved).length===15){g.phase='ended';g.winner='win';g.reason='complete';}else if(g.guessesLeft===0)nextCoop(g);}
   else if(type==='assassin'){g.phase='ended';g.winner='loss';g.reason='assassin';c.hit=true;}
   else{c.misses.push(g.turn);nextCoop(g);}
  }
 }else if(a.type==='pass'){
  need(id===guesser&&g.phase==='guess','现在不能结束猜测');need(g.guessesMade>0,'至少猜一次后才能结束');if(r.mode==='coop')nextCoop(g);else Object.assign(g,endTurn(g));log(r,`${p.name} 结束猜测`);
 }else throw new Error('未知操作');
 g.step++;if(g.phase==='ended')log(r,g.winner==='win'?'合作成功！':g.winner==='loss'?'本次合作结束':`${g.winner==='red'?'红队':'蓝队'}获胜！`);
}
export function projectRoom(r,id){
 const p=r.players.find(x=>x.id===id);need(p,'房间不存在或你已离开');const {cluer,guesser}=roles(r),g=r.game;const paused=!!g&&g.phase!=='ended'&&r.players.some(x=>!online(x));
 const v={code:r.code,host:r.host,mode:r.mode,revision:r.revision,me:id,first:r.first,packIds:r.packIds,packNames:r.packNames,wordCount:r.words.length,players:r.players.map(({token,lastSeen,...x})=>({...x,online:online({lastSeen})})),logs:r.logs,paused,game:null};
 if(g){const canClue=!paused&&g.phase==='clue'&&id===cluer,canGuess=!paused&&g.phase==='guess'&&id===guesser;const ended=g.phase==='ended';v.game={id:g.id,step:g.step,turn:g.turn,phase:g.phase,round:g.round,clue:g.clue,guessesMade:g.guessesMade,guessesLeft:g.guessesLeft,winner:g.winner,reason:g.reason,canClue,canGuess,cluer,guesser,
  remaining:r.mode==='coop'?{green:15-g.cards.filter(c=>c.solved).length}:{red:g.cards.filter(c=>c.type==='red'&&!c.revealed).length,blue:g.cards.filter(c=>c.type==='blue'&&!c.revealed).length},
  cards:g.cards.map(c=>r.mode==='classic'?{id:c.id,word:c.word,revealed:c.revealed,blocked:c.revealed,type:c.revealed||p.seat%2===0||ended?c.type:'unknown'}:{id:c.id,word:c.word,revealed:c.solved||!!c.hit,blocked:c.solved||c.misses.includes(g.turn),type:c.solved?'green':c.hit?'assassin':ended||canClue?c.keys[p.seat]:c.misses.includes(g.turn)?'neutral':'unknown'})};}
 return v;
}
