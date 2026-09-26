import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { recognize } from './ai.mjs';

const publicFiles=new Map([
  ['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/app.js','app.js'],['/ink.js','ink.js'],
  ['/simulation.js','simulation.js'],['/physics.js','physics.js'],['/checker.js','checker.js'],['/favicon.svg','favicon.svg'],['/runtime.js','runtime.js']
]);
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml'};
export function createApp(options={}) {
  const key=options.key??process.env.GEMINI_API_KEY??'', pin=options.pin??process.env.CONTROL_PIN??'';
  const token=randomBytes(24).toString('hex'), model=options.model??process.env.GEMINI_MODEL??'gemini-3.5-flash-lite';
  const limit=Number(options.limit??process.env.MAX_AI_REQUESTS??200);
  let requests=0,active=0;
  const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
  const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const path=new URL(req.url,'http://localhost').pathname;
      if(req.method==='GET'&&path==='/api/config') return send(res,200,{aiEnabled:Boolean(key),pinRequired:Boolean(pin),token:pin?null:token,requestsLeft:Math.max(0,limit-requests)});
      if(req.method==='GET'&&publicFiles.has(path)) {
        const name=publicFiles.get(path),body=await readFile(new URL(`./public/${name}`,import.meta.url));
        res.writeHead(200,{'Content-Type':mime[name.split('.').at(-1)]}); return res.end(body);
      }
      if(req.method!=='POST'||!['/api/recognize','/api/transcribe','/api/unlock'].includes(path)) return send(res,404,{error:'Not found'});
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`) return send(res,403,{error:'Use this app from its own browser page.'});
      if(!req.headers['content-type']?.startsWith('application/json')) return send(res,415,{error:'JSON required.'});
      let size=0,body='';
      for await(const chunk of req) {size+=chunk.length;if(size>3200000){send(res,413,{error:'Drawing too large. Clear a few strokes and try again.'});return;}body+=chunk;}
      let data;try{data=JSON.parse(body);}catch{return send(res,400,{error:'Invalid JSON.'});}
      if(path==='/api/unlock') {if(!equal(data.pin,pin)) return send(res,401,{error:'That PIN does not match the server.'});return send(res,200,{token});}
      if(!equal(req.headers['x-session-token'],token)) return send(res,401,{error:'Unlock recognition with the server PIN.'});
      if(!key) return send(res,503,{error:'Handwriting recognition is not connected. Use typed labels or manual values.'});
      if(requests>=limit) return send(res,429,{error:'The server’s AI request limit has been reached. Manual entry still works.'});
      if(active>=2) return send(res,429,{error:'Recognition is busy. Wait for the current request.'});
      active++;requests++;
      try {const result=await recognize({image:data.image,kind:path==='/api/transcribe'?'step':'scene',key,model,fetchImpl:options.fetchImpl});send(res,200,result);}
      finally{active--;}
    }catch(error){if(!res.headersSent)send(res,error.status||502,{error:error.name==='TimeoutError'?'Recognition timed out. Try again or use manual entry.':error.message});else res.end();}
  });
  return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
  if(host!=='127.0.0.1'&&host!=='localhost'&&!process.env.CONTROL_PIN) {console.error('Set CONTROL_PIN in .env before exposing the app on your LAN.');process.exit(1);}
  const server=createApp();
  server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is in use. Set PORT=3001 in .env.`:err.message);process.exitCode=1;});
  server.listen(port,host,()=>{
    console.log(`Draw to Life → http://localhost:${port}`);
    console.log(process.env.GEMINI_API_KEY?'Handwriting recognition connected (requires Internet).':'Offline mode: typed labels, demo, animation and equation checking are ready.');
    if(host==='0.0.0.0') for(const addresses of Object.values(networkInterfaces())) for(const a of addresses||[]) if(a.family==='IPv4'&&!a.internal) console.log(`iPad on your LAN → http://${a.address}:${port}`);
  });
}
