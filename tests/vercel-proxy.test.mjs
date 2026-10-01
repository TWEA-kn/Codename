import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyRoomRequest} from '../api/room-proxy.js';
const url='https://game.vercel.app/api/room-proxy?path=rooms';
test('forwards room creation without cross-origin headers or cookies',async()=>{
 let target,options;
 const response=await proxyRoomRequest(new Request(url,{method:'POST',headers:{Origin:'https://game.vercel.app',Cookie:'private=value','Content-Type':'application/json'},body:'{"mode":"coop"}'}),async(u,o)=>{target=u;options=o;return Response.json({room:{code:'ABCDEF'}},{status:201});});
 assert.equal(response.status,201);assert.equal(new URL(target).pathname,'/api/rooms');assert.equal(options.headers.get('Origin'),null);assert.equal(options.headers.get('Cookie'),null);assert.equal(options.body,'{"mode":"coop"}');assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('preserves player authorization and prohibits arbitrary proxy targets',async()=>{
 let token;await proxyRoomRequest(new Request(url+'/ABCDEF',{headers:{Authorization:'Bearer session'}}),async(u,o)=>{token=o.headers.get('Authorization');return Response.json({room:{}});});assert.equal(token,'Bearer session');
 for(const path of ['https://example.com','rooms/../../secret','rooms/ABCDEF/invalid']){const r=await proxyRoomRequest(new Request('https://game.vercel.app/api/room-proxy?path='+encodeURIComponent(path)),()=>{throw new Error('must not fetch');});assert.equal(r.status,404);}
});
test('rejects cross-origin actions and reports upstream failure safely',async()=>{
 const r=await proxyRoomRequest(new Request(url,{method:'POST',headers:{Origin:'https://other.test'},body:'{}'}));assert.equal(r.status,403);
 const down=await proxyRoomRequest(new Request(url),async()=>{throw new Error('network');});assert.equal(down.status,502);
});
