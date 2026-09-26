import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {recognize,validateRecognition} from '../ai.mjs';
async function withServer(options,run){const server=createApp(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
const image='data:image/png;base64,aGVsbG8=';
test('public files work; server, env, traversal and unknown routes are never served',async()=>withServer({key:'',pin:''},async base=>{
  assert.equal((await fetch(base)).status,200);
  for(const path of ['/.env','/server.mjs','/ai.mjs','/../.env','/README.md','/api/nope'])assert.equal((await fetch(base+path)).status,404,path);
  assert.match((await fetch(base)).headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const config=await (await fetch(base+'/api/config')).json();assert.equal(config.aiEnabled,false);assert.ok(config.token);assert.equal(config.key,undefined);
  const r=await fetch(base+'/api/recognize',{method:'POST',headers:{'content-type':'application/json','x-session-token':config.token},body:JSON.stringify({image})});assert.equal(r.status,503);
}));
test('PIN and same-origin checks gate paid recognition',async()=>withServer({key:'test-secret',pin:'123456'},async base=>{
  const config=await(await fetch(base+'/api/config')).json();assert.equal(config.token,null);assert.equal(config.pinRequired,true);
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('/api/recognize',{image})).status,401);assert.equal((await post('/api/unlock',{pin:'wrong'})).status,401);
  const unlocked=await(await post('/api/unlock',{pin:'123456'})).json();assert.ok(unlocked.token);
  assert.equal((await post('/api/recognize',{image},{origin:'http://evil.example','x-session-token':unlocked.token})).status,403);
}));
test('recognizer uses image + schema and validates mocked provider output',async()=>{
  const draft={supported:true,reason:'',x0:5,v0:15,a:4,t:2,unknowns:['v','x'],actorBox:[.2,.3,.4,.6],warnings:[]};
  let called=false;
  const result=await recognize({image,key:'test',fetchImpl:async(url,options)=>{called=true;const body=JSON.parse(options.body);assert.ok(body.generationConfig.responseJsonSchema);assert.equal(body.contents[0].parts[1].inline_data.mime_type,'image/png');assert.equal(options.headers['x-goog-api-key'],'test');return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(draft)}]}}]})};}});
  assert.ok(called);assert.deepEqual(result,draft);
});
test('recognition is transcription only and leaves uncertain values reviewable',()=>{
  assert.deepEqual(validateRecognition({text:'v=15+4*2=21 m/s',uncertain:true},'step'),{text:'v=15+4*2=21 m/s',uncertain:true});
  const r=validateRecognition({supported:true,x0:'5',a:Infinity,actorBox:[-1,0,2,1]},'scene');assert.equal(r.x0,null);assert.equal(r.a,null);assert.equal(r.actorBox,null);
});
test('recognition failures and invalid image input have usable errors',async()=>{
  await assert.rejects(recognize({image,key:''}),/not connected/);
  await assert.rejects(recognize({image:'file:///secret',key:'test'}),/PNG/);
  await assert.rejects(recognize({image,key:'test',fetchImpl:async()=>({ok:false,status:429})}),/429/);
  await assert.rejects(recognize({image,key:'test',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'not json'}]}}]})})}),/invalid JSON/);
});
test('AI request cap prevents further provider calls',async()=>{
  let calls=0;await withServer({key:'test',pin:'',limit:1,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({text:'v=23 m/s',uncertain:false})}]}}]})};}},async base=>{
    const {token}=await(await fetch(base+'/api/config')).json();const post=()=>fetch(base+'/api/transcribe',{method:'POST',headers:{'content-type':'application/json','x-session-token':token},body:JSON.stringify({image})});assert.equal((await post()).status,200);assert.equal((await post()).status,429);assert.equal(calls,1);
  });
});
