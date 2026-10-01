import {useEffect,useRef} from 'react';
export function useRoomTools(net){
 const current=useRef(net);current.current=net;
 useEffect(()=>{const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
 const tools=[{name:'read_game_room',description:'Read the current player-visible room state; never includes hidden partner answers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({room:current.current.room})},{name:'set_player_ready',description:'Set your own ready status in the current lobby.',inputSchema:{type:'object',properties:{ready:{type:'boolean'}},required:['ready'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(typeof input?.ready!=='boolean')throw new Error('ready must be boolean');if(!current.current.room||current.current.room.game)throw new Error('Join a lobby first');const ok=await current.current.action({type:'ready',ready:input.ready});if(!ok)throw new Error('Ready status was not updated');return {ready:input.ready};}}];
 for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 return()=>lifecycle.abort();},[]);
}
