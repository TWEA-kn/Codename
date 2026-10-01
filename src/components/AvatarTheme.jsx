import {createContext,useContext,useState} from 'react';

export const agentNames=['奇乐','幽影','蝰蛇','芮娜','夜露','猎枭','零','雷兹','捷风'];
const ThemeContext=createContext(null);
export const useAvatarTheme=()=>useContext(ThemeContext);
export function AvatarTheme({children,enabled}){
 const [assignment]=useState(()=>{
  const ids=agentNames.map((_,i)=>i);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
 });
 return <ThemeContext.Provider value={enabled?assignment:null}>{children}</ThemeContext.Provider>;
}
