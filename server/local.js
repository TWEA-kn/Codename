import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {api} from './api.js';
export function localRooms(){
 mkdirSync('.local',{recursive:true});const db=new DatabaseSync('.local/rooms.sqlite');
 db.exec('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms(updated_at)');
 const DB={prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...args),run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})};}};}};
 return {name:'local-rooms',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  if(!req.url.startsWith('/api/'))return next();try{const chunks=[];for await(const c of req)chunks.push(c);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await api(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'房间服务暂不可用'}));}
 });}};
}
