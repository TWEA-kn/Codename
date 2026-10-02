import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../server/standalone.js';
test('standalone HTTP preserves rooms across restarts and checks origins and authentication',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codename-'));let app;
 try {
 app=await startServer({port:0,databasePath:join(dir,'rooms.sqlite')});
 const post=(path,body,origin)=>fetch(app.url+path,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
 assert.equal((await post('/api/rooms',{profile:{name:'Host',avatar:0},mode:'coop'},'https://evil.test')).status,403);
 const response=await post('/api/rooms',{profile:{name:'Host',avatar:0},mode:'coop'});assert.equal(response.status,201);
 const created=await response.json();const path='/api/rooms/'+created.room.code;
 assert.equal((await fetch(app.url+path)).status,401);
 assert.equal((await fetch(app.url+'/api/nope')).status,404);
 assert.equal((await post('/api/rooms',{padding:'x'.repeat(610000)})).status,413);
 await app.close();app=await startServer({port:0,databasePath:join(dir,'rooms.sqlite')});
 const restored=await fetch(app.url+path,{headers:{Authorization:'Bearer '+created.token}});assert.equal(restored.status,200);assert.equal((await restored.json()).room.code,created.room.code);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
