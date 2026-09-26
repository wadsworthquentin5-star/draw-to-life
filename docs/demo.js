import {DEMO_STEPS,normaliseBox,selectInkIds} from './demo-model.js';
import {DemoSimulation} from './demo-simulation.js';

const $=id=>document.getElementById(id), W=1400,H=1000;
const canvas=$('ink-canvas'),ctx=canvas.getContext('2d'),board=$('board');
let tool='move',strokes=[],history=[],imageRect=null,imageSelected=false,imageObjectURL=null,placedImage=null;
let selectedIds=[],selection=null,pointer=null,scale=1,offsetX=0,offsetY=0,serial=0;
let phase='place',stepIndex=0,stepChecked=false,checkedIds=new Set(),busy=false,generation=0,simulation=null;
let toastTimer,loadingTimers=[],imageLoadVersion=0;
// No image is created, loaded, or placed until the user inserts one.

function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function world(event){const r=canvas.getBoundingClientRect();return {x:clamp((event.clientX-r.left-offsetX)/scale,0,W),y:clamp((event.clientY-r.top-offsetY)/scale,0,H)};}
function screen(p){return {x:p.x*scale+offsetX,y:p.y*scale+offsetY+canvas.offsetTop};}
function checkpoint(){history.push(structuredClone(strokes));if(history.length>40)history.shift();}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);scale=Math.min(r.width/W,r.height/H);offsetX=(r.width-W*scale)/2;offsetY=(r.height-H*scale)/2;render();positionImage();positionCheck();}
function render(){
  const d=Math.min(devicePixelRatio||1,2);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(d*scale,0,0,d*scale,d*offsetX,d*offsetY);
  for(const stroke of strokes){const points=stroke.points;if(!points.length)continue;ctx.strokeStyle='#282d23';ctx.lineWidth=4.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);if(points.length===1)ctx.lineTo(points[0].x+.1,points[0].y);ctx.stroke();}
  if(selection){ctx.save();ctx.strokeStyle='#86a75f';ctx.lineWidth=2.5;ctx.fillStyle='#b5d08f18';ctx.setLineDash(selectedIds.length?[9,7]:[6,6]);ctx.fillRect(selection.left,selection.top,selection.width,selection.height);ctx.strokeRect(selection.left,selection.top,selection.width,selection.height);ctx.restore();}
  $('writing-hint').hidden=phase!=='guided'||strokes.length>0;
}
function positionImage(){if(!imageRect)return;const p=screen({x:imageRect.x,y:imageRect.y});Object.assign($('image-card').style,{left:p.x+'px',top:p.y+'px',width:imageRect.width*scale+'px',height:imageRect.height*scale+'px'});}
function positionCheck(){
  const button=$('selection-check');button.hidden=true;
  let box;
  if(busy)return;
  if(imageSelected&&imageRect&&['place','overview'].includes(phase))box={left:imageRect.x,top:imageRect.y,right:imageRect.x+imageRect.width,bottom:imageRect.y+imageRect.height};
  else if(phase==='guided'&&!stepChecked&&selection&&selectedIds.length)box=selection;
  else return;
  const edge=screen({x:box.right,y:(box.top+box.bottom)/2}),below=screen({x:(box.left+box.right)/2,y:box.bottom});
  const width=board.clientWidth,maxY=canvas.offsetTop+canvas.clientHeight-48;
  const side=edge.x+100<width;button.classList.toggle('side',side);
  button.style.left=`${clamp(side?edge.x+14:below.x-44,8,width-98)}px`;
  button.style.top=`${clamp(side?edge.y-19:below.y+16,65,maxY)}px`;button.hidden=false;
}
function selectImage(selected){imageSelected=selected;$('image-card').classList.toggle('selected',selected);$('image-card').setAttribute('aria-pressed',String(selected));if(selected){selection=null;selectedIds=[];render();}positionCheck();}
function setTool(next){
  tool=next;document.body.dataset.tool=next;document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(next!=='move')selectImage(false);
  $('tool-hint').textContent={move:'Drag or resize the image. Click it to select.',pen:'Handwrite your step, then switch to Box step.',box:'Drag a box fully around your new handwritten step.',eraser:'Drag across a stroke to erase it.'}[next];
  canvas.style.cursor=next==='pen'?'crosshair':next==='eraser'?'cell':next==='box'?'crosshair':'default';
}
function clearSelection(){selection=null;selectedIds=[];selectImage(false);$('selection-help').hidden=true;render();}
function cancelLoading(){generation++;for(const timer of loadingTimers)clearTimeout(timer);loadingTimers=[];setBusy(false);}
function setBusy(value){busy=value;for(const id of ['visualize','selection-check','next-step'])$(id).disabled=value;positionCheck();}
function panel(){ $('story-panel').hidden=false;resize(); }
function loading(title,copy,duration,done){
  cancelLoading();const version=generation;setBusy(true);panel();
  $('overview-card').hidden=true;$('loading-card').hidden=false;$('loading-title').textContent=title;$('loading-copy').textContent=copy;$('loading-progress').style.width='8%';
  [35,68,92].forEach((amount,index)=>loadingTimers.push(setTimeout(()=>{if(version===generation)$('loading-progress').style.width=amount+'%';},duration*(index+1)/4)));
  loadingTimers.push(setTimeout(()=>{if(version!==generation)return;$('loading-card').hidden=true;setBusy(false);done();},duration));
}
function scrollPanel(){if(matchMedia('(max-width:760px)').matches)$('story-panel').scrollIntoView({block:'start',behavior:'smooth'});else $('story-panel').scrollTop=0;}
function resetFlow(){
  const activePointer=pointer;pointer=null;
  if(activePointer){const owner=['image','resize'].includes(activePointer.kind)?$('image-card'):canvas;if(owner.hasPointerCapture(activePointer.id))owner.releasePointerCapture(activePointer.id);}
  cancelLoading();simulation?.destroy();simulation=null;strokes=[];history=[];checkedIds=new Set();stepIndex=0;stepChecked=false;phase='place';clearSelection();
  for(const id of ['loading-card','overview-card','video-card','guidance-offer','guidance-card','complete-card','step-feedback','next-step'])$(id).hidden=true;
  $('story-panel').hidden=true;$('phase-caption').textContent='01 / PLACE YOUR PROBLEM';setTool('move');render();resize();
}
async function placeImage(src,{objectURL=false,version=++imageLoadVersion}={}){
  if(version!==imageLoadVersion){if(objectURL)URL.revokeObjectURL(src);return;}
  const image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('That image could not be opened. Use a PNG, JPG or WebP image.'));image.src=src;});
    if(version!==imageLoadVersion){if(objectURL)URL.revokeObjectURL(src);return;}
    if(image.naturalWidth*image.naturalHeight>24000000)throw new Error('Use an image smaller than 24 megapixels.');
    if(imageObjectURL)URL.revokeObjectURL(imageObjectURL);imageObjectURL=objectURL?src:null;
    resetFlow();placedImage=image;$('problem-image').src=src;$('image-card').hidden=false;$('empty-state').hidden=true;
    const width=Math.min(1020,750*image.naturalWidth/image.naturalHeight),height=width*image.naturalHeight/image.naturalWidth;
    imageRect={x:(W-width)/2,y:100,width,height};positionImage();selectImage(false);
    toast('Image placed. Drag it with Move, then click it and tap Check.');
  }catch(error){if(objectURL)URL.revokeObjectURL(src);if(version===imageLoadVersion)toast(error.message);}
}
function upload(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Choose a PNG, JPG or WebP image.');return;}if(file.size>12*1024*1024){toast('Choose an image smaller than 12 MB.');return;}const version=++imageLoadVersion;placeImage(URL.createObjectURL(file),{objectURL:true,version});}

$('image-card').addEventListener('pointerdown',event=>{
  if(tool!=='move'||busy||event.button!==0||pointer)return;event.preventDefault();selectImage(true);
  const p=world(event),resizing=event.target===$('resize-image');pointer={id:event.pointerId,kind:resizing?'resize':'image',start:p,rect:{...imageRect}};$('image-card').setPointerCapture(event.pointerId);
});
$('image-card').addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId||!['image','resize'].includes(pointer.kind))return;const p=world(event),r=pointer.rect;
  if(pointer.kind==='image'){imageRect.x=clamp(r.x+p.x-pointer.start.x,0,W-r.width);imageRect.y=clamp(r.y+p.y-pointer.start.y,0,H-r.height);}
  else{const aspect=r.height/r.width,maxWidth=Math.min(W-r.x,(H-r.y)/aspect);imageRect.width=clamp(r.width+p.x-pointer.start.x,Math.min(240,maxWidth),maxWidth);imageRect.height=imageRect.width*aspect;}
  positionImage();positionCheck();
});
for(const name of ['pointerup','pointercancel'])$('image-card').addEventListener(name,event=>{if(pointer?.id===event.pointerId){pointer=null;positionCheck();}});
$('image-card').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setTool('move');selectImage(true);}});

function erase(point){
  strokes=strokes.filter(stroke=>!stroke.points.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<22));
  selectedIds=[];selection=null;positionCheck();render();
}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||pointer||busy||($('pencil-only').checked&&event.pointerType!=='pen'))return;
  event.preventDefault();const p=world(event);selectImage(false);$('selection-help').hidden=true;
  if(tool==='move'){clearSelection();return;}
  canvas.setPointerCapture(event.pointerId);pointer={id:event.pointerId,kind:tool,start:p};
  if(tool==='box'){selectedIds=[];selection=normaliseBox(p,p);}
  else if(tool==='pen'){checkpoint();selection=null;selectedIds=[];const stroke={id:`ink-${++serial}`,type:'pen',points:[p]};strokes.push(stroke);pointer.stroke=stroke;}
  else if(tool==='eraser'){checkpoint();erase(p);}
  positionCheck();render();
});
canvas.addEventListener('pointermove',event=>{
  if(pointer?.id!==event.pointerId)return;event.preventDefault();const p=world(event);
  if(pointer.kind==='pen'){const events=event.getCoalescedEvents?.()||[event];for(const e of events)pointer.stroke.points.push(world(e));}
  else if(pointer.kind==='box')selection=normaliseBox(pointer.start,p);
  else if(pointer.kind==='eraser')erase(p);
  render();
});
function finishPointer(event){
  if(pointer?.id!==event.pointerId)return;const wasBox=pointer.kind==='box';pointer=null;
  if(wasBox){
    selectedIds=selectInkIds(strokes.filter(s=>!checkedIds.has(s.id)),selection);
    $('selection-help').hidden=false;
    $('selection-help').textContent=phase!=='guided'?'Start guidance after the visualization to check a handwritten step.':stepChecked?'Use Next step to continue the script.':selectedIds.length?'Step selected. Tap the black Check bubble.':'Include the whole handwritten step in the box. Previously checked ink is not selected again.';
  }
  render();positionCheck();
}
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);

function checkImage(){
  if(!imageRect||busy)return;phase='reviewing';selectImage(false);$('phase-caption').textContent='02 / UNDERSTAND THE PROBLEM';
  loading('Reviewing your problem…','Showing the prepared motorcycle overview.',950,()=>{phase='overview';$('overview-card').hidden=false;scrollPanel();});
}
async function visualize(){
  if(phase!=='overview'||busy)return;phase='generating';
  loading('Preparing your visualization…','A little motion makes the problem easier to see.',1900,async()=>{
    try{
      const image=placedImage;if(phase!=='generating')return;
      if(!image)throw new Error('Insert your motorcycle problem image first.');
      phase='clip';$('video-card').hidden=false;$('phase-caption').textContent='03 / SEE IT IN MOTION';
      simulation?.destroy();simulation=new DemoSimulation($('video-canvas'),image,frame=>{
        $('video-time').textContent=`${frame.time.toFixed(2)} s`;$('video-timeline').value=String(frame.time/2*1000);$('play-video').textContent=frame.playing?'Ⅱ':'▶';
      },offerGuidance);
      scrollPanel();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)simulation.play();else toast('Tap Play to watch the prepared clip.');
    }catch(error){phase='overview';$('overview-card').hidden=false;toast(error.message);}
  });
}
function offerGuidance(){if(phase!=='clip')return;phase='offer';$('guidance-offer').hidden=false;$('guidance-offer').scrollIntoView({block:'nearest',behavior:'smooth'});}
function renderStep(){
  const step=DEMO_STEPS[stepIndex];$('step-count').textContent=`STEP ${stepIndex+1} OF 3`;$('step-dots').textContent=DEMO_STEPS.map((_,i)=>i<=stepIndex?'●':'○').join(' ');
  $('step-title').textContent=step.title;$('step-prompt').textContent=step.prompt;
  $('expected-writing').textContent=step.expectedWriting+(step.optionalWriting?`\nOptional: ${step.optionalWriting}`:'');
  $('step-feedback').hidden=true;$('step-feedback').replaceChildren();$('next-step').hidden=true;stepChecked=false;
  clearSelection();setTool('pen');$('phase-caption').textContent=`04 / HANDWRITE & BOX · STEP ${stepIndex+1}`;
}
function startGuidance(){
  if(!['offer','clip'].includes(phase))return;simulation?.pause();phase='guided';$('guidance-offer').hidden=true;$('guidance-card').hidden=false;
  // Keep the reference nearby while opening enough white space for the student's ink.
  if(imageRect){const aspect=imageRect.height/imageRect.width,width=Math.min(680,300/aspect);imageRect={x:70,y:30,width,height:width*aspect};positionImage();}
  renderStep();render();$('guidance-card').scrollIntoView({block:'nearest',behavior:'smooth'});toast('Handwrite the formula. Then choose Box step and draw a rectangle around it.');
}
function checkInk(){
  if(phase!=='guided'||stepChecked||busy||!selection||!selectedIds.length)return;
  const ids=[...selectedIds],version=generation,index=stepIndex;setBusy(true);$('selection-check').hidden=true;
  toast('Checking this demo step…');
  loadingTimers.push(setTimeout(()=>{
    if(version!==generation||phase!=='guided'||index!==stepIndex)return;setBusy(false);
    if(!ids.every(id=>strokes.some(s=>s.id===id))){toast('The selection changed. Box your step again.');return;}
    const step=DEMO_STEPS[stepIndex],feedback=$('step-feedback');stepChecked=true;ids.forEach(id=>checkedIds.add(id));
    feedback.className=step.status;feedback.hidden=false;feedback.replaceChildren();
    const caption=document.createElement('p');caption.className='scripted-caption';caption.textContent='Scripted demo response';
    const title=document.createElement('div');title.className='feedback-title';title.textContent=step.feedbackTitle;
    const detail=document.createElement('p');detail.textContent=step.explanation;feedback.append(caption,title,detail);
    if(step.correction){const correction=document.createElement('div');correction.className='answer';correction.textContent=step.correction;feedback.append(correction);}
    $('next-step').textContent=['Next: substitute the values →','Correct it & finish →','Finish the demo →'][stepIndex];$('next-step').hidden=false;
    positionCheck();feedback.scrollIntoView({block:'nearest',behavior:'smooth'});
  },700));
}
function nextStep(){
  if(!stepChecked||busy)return;
  if(stepIndex<2){stepIndex++;renderStep();$('guidance-card').scrollIntoView({block:'nearest',behavior:'smooth'});}
  else{phase='complete';$('guidance-card').hidden=true;$('complete-card').hidden=false;clearSelection();$('phase-caption').textContent='05 / DEMO COMPLETE';$('complete-card').scrollIntoView({block:'nearest',behavior:'smooth'});}
}
function restart(){
  if((imageRect||strokes.length||phase!=='place')&&!confirm('Restart with a blank board? This clears the image and handwriting.'))return;
  imageLoadVersion++;resetFlow();imageRect=null;placedImage=null;
  if(imageObjectURL)URL.revokeObjectURL(imageObjectURL);imageObjectURL=null;
  $('problem-image').removeAttribute('src');$('image-card').hidden=true;$('empty-state').hidden=false;positionCheck();
  toast('Blank board ready. Use Add image to insert your problem.');
}

$('add-image').onclick=$('empty-upload').onclick=()=>$('image-input').click();
$('image-input').onchange=event=>{upload(event.target.files[0]);event.target.value='';};
document.addEventListener('paste',event=>{if(document.querySelector('dialog[open]'))return;const file=[...event.clipboardData?.items||[]].find(i=>i.kind==='file'&&i.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();upload(file);}});
board.addEventListener('dragover',event=>event.preventDefault());board.addEventListener('drop',event=>{event.preventDefault();upload(event.dataTransfer.files[0]);});
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>setTool(button.dataset.tool));
$('choose-box').onclick=()=>{setTool('box');board.scrollIntoView({block:'start',behavior:'smooth'});toast('Drag a box around the whole handwritten step.');};
$('selection-check').onclick=()=>imageSelected?checkImage():checkInk();$('visualize').onclick=visualize;$('start-guidance').onclick=startGuidance;$('next-step').onclick=nextStep;
$('restart').onclick=restart;$('run-again').onclick=restart;
$('play-video').onclick=()=>{if(!simulation)return;simulation.playing?simulation.pause():simulation.play();};$('replay-video').onclick=()=>simulation?.replay();
$('video-timeline').oninput=event=>{simulation?.seek(Number(event.target.value)/1000);if(Number(event.target.value)===1000)offerGuidance();};
$('undo').onclick=()=>{if(busy||!history.length)return;strokes=history.pop();clearSelection();render();};
$('clear-ink').onclick=()=>{if(!strokes.length||busy)return;if(!confirm('Clear the handwriting? You can undo this.'))return;checkpoint();strokes=[];clearSelection();render();};
$('about').onclick=()=>$('about-dialog').showModal();$('close-about').onclick=()=>$('about-dialog').close();
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(event.target.tagName))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();$('undo').click();}else if(event.key==='Escape'){clearSelection();}else if(!event.ctrlKey&&!event.metaKey){const mode={p:'pen',b:'box',m:'move',e:'eraser'}[event.key.toLowerCase()];if(mode)setTool(mode);}});
window.addEventListener('pagehide',()=>{simulation?.destroy();if(imageObjectURL)URL.revokeObjectURL(imageObjectURL);});
new ResizeObserver(resize).observe(board);setTool('move');resize();
