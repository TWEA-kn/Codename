import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {api} from './api.js';

// Bind only to loopback: Nginx is the public entry point and sets proxy headers.
export async function startServer({port=3001,databasePath='.local/rooms.sqlite'}={}) {
 mkdirSync(dirname(resolve(databasePath)),{recursive:true});
 const db=new DatabaseSync(databasePath);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms(updated_at)');
 const DB={prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...args),run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})};}};}};
 const server=createServer(async(req,res)=>{
  const error=(status,message)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));};
  try {
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>600000){error(413,'请求过大');return;}chunks.push(chunk);}
   const scheme=req.headers['x-forwarded-proto']==='https'?'https':'http';
   const url=new URL(req.url,`${scheme}://${req.headers.host}`);
   const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
   const response=await api(request,{DB});
   if(!response){error(404,'请求地址无效');return;}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){console.error('Request failed:',e.message);if(!res.headersSent)error(500,'房间服务暂不可用');else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);}).catch(e=>{db.close();throw e;});
 let closed=false;
 return {url:`http://127.0.0.1:${server.address().port}`,async close(){if(closed)return;closed=true;await new Promise(ok=>{server.close(ok);server.closeIdleConnections();});db.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const app=await startServer({port:Number(process.env.PORT||3001),databasePath:process.env.DATABASE_PATH||'.local/rooms.sqlite'});
 console.log(`Room service listening at ${app.url}`);
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
