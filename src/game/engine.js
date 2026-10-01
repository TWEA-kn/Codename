export const other = team => team === 'red' ? 'blue' : 'red';
const shuffle = (items,rng) => {const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const remaining = (g,t) => g.cards.filter(c=>c.type===t&&!c.revealed).length;
export function createGame(words,first='red',rng=Math.random){
 const unique=[...new Set(words.map(w=>w.trim()).filter(Boolean))];
 if(unique.length<25)throw new Error('开局至少需要 25 个不重复的词语');
 if(!['red','blue'].includes(first))throw new Error('请选择有效的先手队伍');
 const types=shuffle([...Array(9).fill(first),...Array(8).fill(other(first)),...Array(7).fill('neutral'),'assassin'],rng);
 return {cards:shuffle(unique,rng).slice(0,25).map((word,id)=>({id,word,type:types[id],revealed:false})),turn:first,phase:'clue',clue:null,guessesLeft:0,guessesMade:0,winner:null,reason:null,round:1};
}
export function giveClue(g,word,count){
 if(g.phase!=='clue')throw new Error('当前不是给提示阶段');
 word=word.trim();if(!word||word.length>20||/\s/.test(word))throw new Error('请输入一个 1–20 字符、不含空格的提示词');
 if(g.cards.some(c=>!c.revealed&&c.word.toLowerCase()===word.toLowerCase()))throw new Error('提示不能直接使用尚未揭开的棋盘词语');
 if(count!=='infinity'&&(!Number.isInteger(count)||count<0||count>9))throw new Error('请选择提示数量');
 return {...g,phase:'guess',clue:{word,count},guessesLeft:count===0||count==='infinity'?Infinity:count+1,guessesMade:0};
}
const advance = g => ({...g,turn:other(g.turn),phase:'clue',clue:null,guessesLeft:0,guessesMade:0,round:g.round+1});
export function endTurn(g){if(g.phase!=='guess'||g.guessesMade<1)throw new Error('至少猜一次后才能结束回合');return advance(g);}
export function revealCard(g,id){
 if(g.phase!=='guess')throw new Error('请先给出提示');
 const card=g.cards.find(c=>c.id===id);if(!card||card.revealed)throw new Error('这张卡不能再猜');
 const next={...g,cards:g.cards.map(c=>c.id===id?{...c,revealed:true}:c),guessesMade:g.guessesMade+1,guessesLeft:g.guessesLeft-1};
 if(card.type==='assassin')return {...next,phase:'ended',winner:other(g.turn),reason:'assassin'};
 for(const team of ['red','blue'])if(remaining(next,team)===0)return {...next,phase:'ended',winner:team,reason:'complete'};
 return card.type!==g.turn||next.guessesLeft===0?advance(next):next;
}
