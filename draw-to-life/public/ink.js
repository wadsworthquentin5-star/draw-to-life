export const W=1400,H=900;
let sequence=0;
// Drawing IDs are local identifiers, not credentials. This also works over iPad LAN HTTP.
const strokeId=()=>`stroke-${Date.now().toString(36)}-${++sequence}`;
export function bounds(item) {
  if(item.type==='text') return {left:item.x,top:item.y-28,right:item.x+item.text.length*16,bottom:item.y+8};
  const p=item.points||[];
  return {left:Math.min(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),right:Math.max(...p.map(v=>v.x)),bottom:Math.max(...p.map(v=>v.y))};
}
export function union(items) {
  const b=items.map(bounds);return b.length?{left:Math.min(...b.map(v=>v.left)),top:Math.min(...b.map(v=>v.top)),right:Math.max(...b.map(v=>v.right)),bottom:Math.max(...b.map(v=>v.bottom))}:{left:0,top:0,right:W,bottom:H};
}
export function paint(ctx,item) {
  ctx.save();ctx.strokeStyle=item.color||'#222321';ctx.fillStyle=item.color||'#222321';ctx.lineWidth=item.width||3;ctx.lineCap='round';ctx.lineJoin='round';
  if(item.type==='text'){ctx.font='28px "Segoe Print", "Comic Sans MS", cursive';ctx.fillText(item.text,item.x,item.y);ctx.restore();return;}
  const p=item.points;if(!p?.length){ctx.restore();return;}ctx.beginPath();
  if(item.type==='circle') {const a=p[0],b=p.at(-1);ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(1,Math.abs(b.x-a.x)/2),Math.max(1,Math.abs(b.y-a.y)/2),0,0,Math.PI*2);}
  else {ctx.moveTo(p[0].x,p[0].y);for(const v of p.slice(1))ctx.lineTo(v.x,v.y);if(p.length===1)ctx.lineTo(p[0].x+.1,p[0].y);}
  ctx.stroke();
  if(item.type==='arrow'&&p.length>1){const a=p[0],b=p.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x-17*Math.cos(angle-.45),b.y-17*Math.sin(angle-.45));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-17*Math.cos(angle+.45),b.y-17*Math.sin(angle+.45));ctx.stroke();}
  ctx.restore();
}
export class Ink {
  constructor(canvas,onChange,onLabel,onSelect) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onChange=onChange;this.onLabel=onLabel;this.onSelect=onSelect;
    this.pages={sketch:[],work:[]};this.undoStacks={sketch:[],work:[]};this.redoStacks={sketch:[],work:[]};this.page='sketch';this.tool='pen';this.color='#222321';this.actorIds=new Set();this.pencilOnly=false;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
    canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',e=>this.up(e));
  }
  get items(){return this.pages[this.page];}
  resize(){const r=this.canvas.getBoundingClientRect(),d=devicePixelRatio||1;this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.scale=Math.min(r.width/W,r.height/H);this.ox=(r.width-W*this.scale)/2;this.oy=(r.height-H*this.scale)/2;this.draw();}
  toWorld(e){const r=this.canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(W,(e.clientX-r.left-this.ox)/this.scale)),y:Math.max(0,Math.min(H,(e.clientY-r.top-this.oy)/this.scale))};}
  toScreen(p){return {x:p.x*this.scale+this.ox,y:p.y*this.scale+this.oy};}
  checkpoint(){this.undoStacks[this.page].push(structuredClone(this.items));if(this.undoStacks[this.page].length>50)this.undoStacks[this.page].shift();this.redoStacks[this.page]=[];}
  down(e){
    if(e.button!==0||this.pointer!==undefined||this.pencilOnly&&e.pointerType!=='pen')return;e.preventDefault();const p=this.toWorld(e);
    if(this.tool==='text'){this.onLabel(p);return;}
    this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.start=p;
    if(this.tool==='select'){this.selection={...p,end:p};return;}
    this.checkpoint();
    if(this.tool==='eraser'){this.erase(p);return;}
    this.current={id:strokeId(),type:this.tool,color:this.color,width:3,points:[p]};this.items.push(this.current);this.draw();
  }
  move(e){if(e.pointerId!==this.pointer)return;e.preventDefault();const p=this.toWorld(e);
    if(this.tool==='select')this.selection.end=p;
    else if(this.tool==='eraser')this.erase(p);
    else if(this.current){if(this.current.type==='pen'){for(const q of (e.getCoalescedEvents?.()||[e]))this.current.points.push(this.toWorld(q));}else this.current.points=[this.start,p];}
    this.draw();
  }
  up(e){if(e.pointerId!==this.pointer)return;this.pointer=undefined;
    if(this.selection){const s=this.selection,b={left:Math.min(s.x,s.end.x),right:Math.max(s.x,s.end.x),top:Math.min(s.y,s.end.y),bottom:Math.max(s.y,s.end.y)};this.actorIds=new Set(this.items.filter(i=>{const q=bounds(i);return i.type!=='text'&&q.left>=b.left&&q.right<=b.right&&q.top>=b.top&&q.bottom<=b.bottom;}).map(i=>i.id));this.selection=null;this.onSelect(this.actorIds);}
    else this.onChange(this.page);
    this.current=null;this.draw();
  }
  erase(p){this.pages[this.page]=this.items.filter(i=>{const b=bounds(i);if(p.x<b.left-15||p.x>b.right+15||p.y<b.top-15||p.y>b.bottom+15)return true;if(i.type==='text'||i.type==='circle')return false;for(let n=0;n<i.points.length;n++){const a=i.points[n],b=i.points[n+1]||a,dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<18)return false;}return true;});}
  addText(p,text){this.checkpoint();this.items.push({id:strokeId(),type:'text',x:p.x,y:p.y,text,color:this.color});this.draw();this.onChange(this.page);}
  switchPage(page){this.page=page;this.current=null;this.selection=null;this.draw();}
  undo(){if(!this.undoStacks[this.page].length)return;this.redoStacks[this.page].push(structuredClone(this.items));this.pages[this.page]=this.undoStacks[this.page].pop();this.draw();this.onChange(this.page);}
  redo(){if(!this.redoStacks[this.page].length)return;this.undoStacks[this.page].push(structuredClone(this.items));this.pages[this.page]=this.redoStacks[this.page].pop();this.draw();this.onChange(this.page);}
  clear(){this.checkpoint();this.pages[this.page]=[];if(this.page==='sketch')this.actorIds.clear();this.draw();this.onChange(this.page);}
  draw(){const c=this.ctx,d=devicePixelRatio||1;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.canvas.width,this.canvas.height);c.setTransform(d*this.scale,0,0,d*this.scale,d*this.ox,d*this.oy);for(const item of this.items)paint(c,item);
    if(this.page==='sketch'&&this.actorIds.size){const group=this.items.filter(i=>this.actorIds.has(i.id));if(group.length){const b=union(group);c.save();c.strokeStyle='#a1b57f';c.lineWidth=1.5;c.setLineDash([8,7]);c.strokeRect(b.left-14,b.top-14,b.right-b.left+28,b.bottom-b.top+28);c.restore();}}
    if(this.selection){const s=this.selection;c.save();c.fillStyle='#cfdfb12b';c.strokeStyle='#8a9e69';c.setLineDash([7,7]);c.strokeRect(s.x,s.y,s.end.x-s.x,s.end.y-s.y);c.fillRect(s.x,s.y,s.end.x-s.x,s.end.y-s.y);c.restore();}
  }
  export(items=this.items,crop=false){const b=crop?union(items):{left:0,top:0,right:W,bottom:H},pad=crop?25:0;const out=document.createElement('canvas');out.width=Math.max(20,Math.ceil(b.right-b.left+2*pad));out.height=Math.max(20,Math.ceil(b.bottom-b.top+2*pad));const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,out.width,out.height);c.translate(pad-b.left,pad-b.top);items.forEach(i=>paint(c,i));return out.toDataURL('image/png');}
}
export function demoDrawing(){
  const items=[],actorIds=[];
  const line=(points,actor=false,color='#222321',type='pen')=>{const item={id:strokeId(),type,color,width:3,points:points.map(([x,y])=>({x,y}))};items.push(item);if(actor)actorIds.push(item.id);};
  const circle=(x,y,r,actor=true)=>line([[x-r,y-r],[x+r,y+r]],actor,'#222321','circle');
  const text=(x,y,value,color='#222321')=>items.push({id:strokeId(),type:'text',x,y,text:value,color});
  line([[140,580],[1230,580]],false,'#8f9486','arrow');
  line([[200,579],[200,410]]);line([[156,410],[156,366],[200,339],[244,366],[244,410],[156,410]]);text(169,387,'CITY');text(187,620,'0');
  circle(369,540,36);circle(513,540,36);line([[369,540],[413,492],[466,540],[369,540],[423,506],[499,506],[513,540]],true);line([[487,488],[499,506]],true);
  circle(445,398,19);line([[438,418],[410,451],[453,470],[429,518]],true);line([[422,438],[469,457],[485,488]],true);line([[410,451],[396,489],[444,490]],true);
  line([[548,482],[645,482]],false,'#517a46','arrow');text(565,445,'v₀ = 15 m/s','#517a46');
  line([[770,374],[890,374]],false,'#6079bb','arrow');text(746,335,'a = 4 m/s²','#6079bb');
  text(341,645,'x₀ = 5 m');text(385,690,'t = 0 s');text(1020,645,'x = ?');text(1020,690,'t = 2 s');text(1005,464,'v = ?','#517a46');line([[1014,490],[1160,490]],false,'#517a46','arrow');text(1155,625,'east');
  return {items,actorIds};
}
