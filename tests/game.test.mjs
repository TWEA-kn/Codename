import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, giveClue, revealCard, endTurn} from '../src/game/engine.js';
import {parseWordPack, mergeWords} from '../src/game/wordpacks.js';
const words = Array.from({length:50},(_,i)=>`词语${i}`);
const start = () => createGame(words,'red',()=>0.42);
test('board has 25 distinct words and exact role counts',()=>{
 const g=start(); assert.equal(new Set(g.cards.map(c=>c.word)).size,25);
 for(const [t,n] of [['red',9],['blue',8],['neutral',7],['assassin',1]]) assert.equal(g.cards.filter(c=>c.type===t).length,n);
 assert.throws(()=>createGame(['太少']));
});
test('clue validation rejects blank, board word and invalid count',()=>{
 const g=start(); assert.throws(()=>giveClue(g,' ',2)); assert.throws(()=>giveClue(g,g.cards[0].word,2)); assert.throws(()=>giveClue(g,'提示',12));
 assert.equal(giveClue(g,'提示',2).guessesLeft,3);
});
test('correct word continues, neutral and opponent switch turn',()=>{
 const g=giveClue(start(),'提示',2);
 const hit=revealCard(g,g.cards.find(c=>c.type==='red').id); assert.equal(hit.turn,'red'); assert.equal(hit.guessesLeft,2);
 for(const t of ['neutral','blue']) {const n=revealCard(g,g.cards.find(c=>c.type===t).id);assert.equal(n.turn,'blue');assert.equal(n.phase,'clue');}
});
test('assassin ends game and blocks all subsequent actions',()=>{
 const g=giveClue(start(),'提示',2);const done=revealCard(g,g.cards.find(c=>c.type==='assassin').id);
 assert.equal(done.winner,'blue');assert.equal(done.phase,'ended');assert.throws(()=>endTurn(done));assert.throws(()=>revealCard(done,0));
});
test('all own cards revealed wins, including on opposing turn',()=>{
 let g=giveClue(start(),'提示','infinity');for(const c of g.cards.filter(c=>c.type==='red'))g=revealCard(g,c.id);
 assert.equal(g.winner,'red');
 const base=start(); base.cards.filter(c=>c.type==='blue').slice(1).forEach(c=>c.revealed=true);
 const h=giveClue(base,'提示',1);assert.equal(revealCard(h,h.cards.find(c=>c.type==='blue'&&!c.revealed).id).winner,'blue');
});
test('cannot end before one guess or reveal twice; ordinary guesses exhaust',()=>{
 const g=giveClue(start(),'提示',1);assert.throws(()=>endTurn(g));
 const reds=g.cards.filter(c=>c.type==='red');const h=revealCard(g,reds[0].id);assert.throws(()=>revealCard(h,reds[0].id));assert.equal(endTurn(h).turn,'blue');
 assert.equal(revealCard(h,reds[1].id).turn,'blue');
});
test('zero and infinity allow unlimited guesses but mistakes still end turn',()=>{
 for(const n of [0,'infinity']){const g=giveClue(start(),'提示',n);assert.equal(g.guessesLeft,Infinity);assert.equal(revealCard(g,g.cards.find(c=>c.type==='neutral').id).turn,'blue');}
});
test('packs normalize, deduplicate, combine and reject malformed inputs',()=>{
 const p=parseWordPack(JSON.stringify({name:'我的词库',words:[...words,' 词语1 ']}));assert.equal(p.words.length,50);
 assert.equal(mergeWords([p,p]).length,50);assert.throws(()=>parseWordPack('a\nb\na'));assert.throws(()=>parseWordPack('{bad'));
 assert.throws(()=>parseWordPack(JSON.stringify({words:[...words,123]})));
 assert.equal(parseWordPack(words.join('\n'),'测试').name,'测试');
});
