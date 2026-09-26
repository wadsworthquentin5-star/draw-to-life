import {paint,union} from './ink.js';
import {stateAt,motionBounds,format} from './physics.js';
export class Simulation {
  constructor(canvas,onFrame){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onFrame=onFrame;this.time=0;this.playing=false;this.raf=0;this.recording=false;}
  setScene(model,items,ids){this.pause();this.model=model;this.items=structuredClone(items);this.ids=new Set(ids);this.actor=this.items.filter(i=>this.ids.has(i.id));this.time=0;this.duration=Math.max(4,Math.min(16,model.t*4));this.frame();}
  frame(){if(!this.model)return;this.render(this.ctx,this.time);this.onFrame?.(this.time,stateAt(this.model,this.time),this.playing);}
  render(c,time){const m=this.model,w=c.canvas.width,h=c.canvas.height,state=stateAt(m,time);c.setTransform(1,0,0,1,0,0);c.fillStyle='#fafbf7';c.fillRect(0,0,w,h);
    if(!this.actor.length)return;
    const b=union(this.items),ab=union(this.actor),mb=motionBounds(m),travel=mb.max-mb.min,pxPerM=travel>0?Math.min(22,650/travel):1,dx=(state.x-m.x0)*pxPerM;
    const left=Math.min(b.left,ab.left+(mb.min-m.x0)*pxPerM)-40,right=Math.max(b.right,ab.right+(mb.max-m.x0)*pxPerM)+40,top=b.top-65,bottom=b.bottom+50;
    const scale=Math.min((w-36)/(right-left),(h-24)/(bottom-top)),ox=(w-(right-left)*scale)/2-left*scale,oy=(h-(bottom-top)*scale)/2-top*scale;
    c.setTransform(scale,0,0,scale,ox,oy);for(const i of this.items)if(!this.ids.has(i.id))paint(c,i);
    // Equal simulated time intervals show growing gaps when speed increases.
    for(let k=0;k<=8;k++){const t=m.t*k/8;if(t>time)break;const p=stateAt(m,t);c.beginPath();c.fillStyle='#bacd9b';c.arc((ab.left+ab.right)/2+(p.x-m.x0)*pxPerM,ab.bottom+14,4,0,Math.PI*2);c.fill();}
    c.save();c.globalAlpha=.14;this.actor.forEach(i=>paint(c,i));c.restore();c.save();c.translate(dx,0);this.actor.forEach(i=>paint(c,i));c.restore();
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#6e7a5e';c.font='13px Arial';c.textAlign='right';c.fillText(`t = ${time.toFixed(2)} s`,w-16,h-12);c.textAlign='left';
  }
  play(){if(!this.model)return;if(this.time>=this.model.t)this.time=0;this.playing=true;this.last=performance.now();cancelAnimationFrame(this.raf);const tick=now=>{if(!this.playing)return;this.time=Math.min(this.model.t,this.time+(now-this.last)/1000*this.model.t/this.duration);this.last=now;if(this.time>=this.model.t)this.playing=false;this.frame();if(this.playing)this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);this.frame();}
  pause(){this.playing=false;cancelAnimationFrame(this.raf);this.frame();}
  seek(fraction){this.pause();this.time=Math.max(0,Math.min(1,fraction))*this.model.t;this.frame();}
  async exportVideo(onStatus){
    if(this.recording)throw new Error('A video is already being recorded.');
    if(!globalThis.MediaRecorder||!this.canvas.captureStream)throw new Error('Video export is not supported in this browser. Use Chrome or Edge, or record your screen.');
    const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!type)throw new Error('This browser has no supported video encoder.');
    this.recording=true;this.pause();this.time=0;const stream=this.canvas.captureStream(30),chunks=[],recorder=new MediaRecorder(stream,{mimeType:type});
    onStatus('Recording your animation…');
    try{
      const blob=await new Promise((resolve,reject)=>{let timer;recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{clearTimeout(timer);resolve(new Blob(chunks,{type}));};recorder.onerror=e=>{clearTimeout(timer);reject(e.error||new Error('Video recording failed.'));};recorder.start();this.play();timer=setTimeout(()=>{this.seek(1);if(recorder.state!=='inactive')recorder.stop();},this.duration*1000+300);});
      onStatus('Video ready. Preview or download it below.');
      return {url:URL.createObjectURL(blob),filename:`draw-to-life.${type.includes('mp4')?'mp4':'webm'}`};
    }finally{stream.getTracks().forEach(t=>t.stop());this.recording=false;}
  }
}
