const origin='https://pixel-codename-kieran.kieranlx167.chatgpt.site';
const json=(data,status)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function proxyRoomRequest(request,send=fetch){
 const url=new URL(request.url),path=url.searchParams.get('path')||'';
 if(!/^rooms(?:\/[A-Z2-9]{6}(?:\/(?:join|actions))?)?$/.test(path))return json({error:'房间地址无效'},404);
 if(!['GET','POST'].includes(request.method))return json({error:'请求方法不支持'},405);
 if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'请求来源不匹配'},403);
 if(Number(request.headers.get('content-length'))>600000)return json({error:'请求过大'},413);
 let body;if(request.method==='POST'){body=await request.text();if(new TextEncoder().encode(body).length>600000)return json({error:'请求过大'},413);}
 const headers=new Headers({Accept:'application/json'});if(body!==undefined)headers.set('Content-Type','application/json');
 const token=request.headers.get('authorization');if(token)headers.set('Authorization',token);
 try{
  const upstream=await send(`${origin}/api/${path}`,{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!upstream.headers.get('content-type')?.includes('application/json'))return json({error:'房间服务暂不可用，请稍后重试'},502);
  return new Response(await upstream.text(),{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'房间服务连接失败，请稍后重试'},502);}
}
export default async function handler(req,res){
 const headers=new Headers();for(const [k,v] of Object.entries(req.headers)){if(typeof v==='string')headers.set(k,v);}
 let body;if(req.method==='POST'){if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>600000){res.statusCode=413;res.end('{"error":"请求过大"}');return;}chunks.push(chunk);}body=Buffer.concat(chunks).toString();}}
 const request=new Request(`https://${req.headers.host}${req.url}`,{method:req.method,headers,...(body!==undefined?{body}:{})});
 const response=await proxyRoomRequest(request);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await response.text());
}
