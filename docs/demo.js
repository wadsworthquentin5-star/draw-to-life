import {DEMO_STEPS,normaliseBox,selectInkIds} from './demo-model.js';
import {DemoSimulation} from './demo-simulation.js?v=motorcycle-ink-2';

const $=id=>document.getElementById(id), W=1400,H=1000;
const canvas=$('ink-canvas'),ctx=canvas.getContext('2d'),board=$('board'),surface=$('canvas-viewport')||board;
let tool='move',strokes=[],history=[],imageRect=null,imageSelected=false,imageObjectURL=null,placedImage=null;
let selectedIds=[],selection=null,pointer=null,serial=0,images=[],selectedImageId=null;
const camera={scale:1,offsetX:0,offsetY:0},viewport={width:0,height:0},touches=new Map();
let cameraReady=false,pinch=null,touchNavigation=false,lastPenTime=-Infinity;
let phase='place',stepIndex=0,stepChecked=false,checkedIds=new Set(),busy=false,generation=0,simulation=null;
let toastTimer,loadingTimers=[],imageLoadVersion=0;

const TOOL_DEFINITIONS = Object.freeze({
  move: { cursor: 'grab', hint: 'Drag blank space to pan. Drag or resize any image.' },
  pen: { cursor: 'crosshair', hint: 'Pen stays on. Pinch to zoom; choose Box only when finished.' },
  box: { cursor: 'crosshair', hint: 'Drag a box fully around your handwritten step.' },
  eraser: { cursor: 'cell', hint: 'Drag across a stroke to erase it.' },
});

const TOOL_SHORTCUTS = Object.freeze({ p: 'pen', b: 'box', m: 'move', e: 'eraser' });

class ContentBounds {
  constructor() {
    this.left = Infinity;
    this.top = Infinity;
    this.right = -Infinity;
    this.bottom = -Infinity;
  }

  includePoint({ x, y }) {
    this.left = Math.min(this.left, x);
    this.top = Math.min(this.top, y);
    this.right = Math.max(this.right, x);
    this.bottom = Math.max(this.bottom, y);
    return this;
  }

  includeRectangle(rectangle) {
    this.includePoint(rectangle);
    this.includePoint({
      x: rectangle.x + rectangle.width,
      y: rectangle.y + rectangle.height,
    });
    return this;
  }

  get empty() {
    return !Number.isFinite(this.left);
  }

  get center() {
    return { x: (this.left + this.right) / 2, y: (this.top + this.bottom) / 2 };
  }

  static collect(references, ink) {
    const bounds = new ContentBounds();
    for (const reference of references) bounds.includeRectangle(reference.rect);
    for (const stroke of ink) {
      for (const point of stroke.points) bounds.includePoint(point);
    }
    return bounds;
  }
}

class CameraController {
  constructor(state, dimensions, element) {
    this.state = state;
    this.dimensions = dimensions;
    this.element = element;
  }

  get center() {
    return { x: this.dimensions.width / 2, y: this.dimensions.height / 2 };
  }

  localPoint(event) {
    const rectangle = this.element.getBoundingClientRect();
    return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
  }

  worldPoint(point) {
    return {
      x: (point.x - this.state.offsetX) / this.state.scale,
      y: (point.y - this.state.offsetY) / this.state.scale,
    };
  }

  screenPoint(point) {
    return {
      x: point.x * this.state.scale + this.state.offsetX,
      y: point.y * this.state.scale + this.state.offsetY,
    };
  }

  anchor(worldPoint, screenPoint = this.center) {
    this.state.offsetX = screenPoint.x - worldPoint.x * this.state.scale;
    this.state.offsetY = screenPoint.y - worldPoint.y * this.state.scale;
  }

  initialize() {
    this.state.scale = clamp(Math.min(this.dimensions.width / W, this.dimensions.height / H), .15, 4);
    this.anchor({ x: W / 2, y: H / 2 });
  }

  measure(preserveCenter) {
    const center = preserveCenter ? this.worldPoint(this.center) : null;
    const rectangle = this.element.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, 2);
    this.dimensions.width = Math.max(1, rectangle.width);
    this.dimensions.height = Math.max(1, rectangle.height);
    this.element.width = Math.round(this.dimensions.width * density);
    this.element.height = Math.round(this.dimensions.height * density);
    if (center) this.anchor(center);
    else this.initialize();
  }

  zoom(nextScale, anchorPoint = this.center) {
    const fixed = this.worldPoint(anchorPoint);
    this.state.scale = clamp(nextScale, this.state.scale < .15 ? .0001 : .15, 4);
    this.anchor(fixed, anchorPoint);
  }

  fit(bounds) {
    const fittedScale = Math.min(
      Math.max(1, this.dimensions.width - 100) / Math.max(80, bounds.right - bounds.left),
      Math.max(1, this.dimensions.height - 100) / Math.max(80, bounds.bottom - bounds.top),
    );
    this.state.scale = clamp(fittedScale, .0001, 4);
    this.anchor(bounds.center);
    return fittedScale;
  }

  get zoomLabel() {
    const percent = this.state.scale * 100;
    const value = percent < 1 ? percent.toFixed(2) : percent < 10 ? percent.toFixed(1) : Math.round(percent);
    return `${value}%`;
  }
}

class CanvasRenderer {
  constructor(element, context, transform) {
    this.element = element;
    this.context = context;
    this.transform = transform;
  }

  prepare() {
    const context = this.context;
    const density = Math.min(devicePixelRatio || 1, 2);
    const { scale, offsetX, offsetY } = this.transform;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.element.width, this.element.height);
    context.setTransform(density * scale, 0, 0, density * scale, density * offsetX, density * offsetY);
  }

  stroke(stroke) {
    const points = stroke.points;
    if (!points.length) return;
    const context = this.context;
    context.strokeStyle = '#282d23';
    context.lineWidth = 4.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    if (points.length === 1) context.lineTo(points[0].x + .1, points[0].y);
    context.stroke();
  }

  selection(rectangle, selected) {
    const context = this.context;
    context.save();
    context.strokeStyle = '#86a75f';
    context.lineWidth = 2.5;
    context.fillStyle = '#b5d08f18';
    context.setLineDash(selected ? [9, 7] : [6, 6]);
    context.fillRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.restore();
  }

  draw(ink, rectangle, selected) {
    this.prepare();
    for (const stroke of ink) this.stroke(stroke);
    if (rectangle) this.selection(rectangle, selected);
  }
}

class ReferenceLayer {
  constructor(host, transform) {
    this.host = host;
    this.transform = transform;
  }

  mount(item, reuseTemplate) {
    const card = reuseTemplate ? $('image-card') : document.createElement('div');
    const image = reuseTemplate ? $('problem-image') : document.createElement('img');
    const handle = reuseTemplate ? $('resize-image') : document.createElement('button');
    card.classList.add('image-card');
    card.dataset.imageId = item.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Inserted image. Use Move to reposition or resize.');
    image.classList.add('problem-image');
    image.src = item.src;
    image.alt = 'Your inserted problem image';
    image.draggable = false;
    handle.classList.add('resize-image');
    handle.setAttribute('aria-label', 'Resize this image');
    handle.textContent = '↘';
    if (!reuseTemplate) {
      card.append(image, handle);
      this.host.append(card);
    }
    card.hidden = false;
    Object.assign(item, { card, img: image, handle });
  }

  layout(references) {
    for (const item of references) {
      const point = this.transform.screenPoint(item.rect);
      Object.assign(item.card.style, {
        left: point.x + 'px',
        top: point.y + 'px',
        width: item.rect.width * this.transform.state.scale + 'px',
        height: item.rect.height * this.transform.state.scale + 'px',
      });
    }
  }

  select(references, selectedId) {
    for (const item of references) {
      const active = item.id === selectedId;
      item.card.classList.toggle('selected', active);
      item.card.setAttribute('aria-pressed', String(active));
    }
  }

  dispose(references) {
    for (const item of references) {
      if (item.objectURL) URL.revokeObjectURL(item.src);
      if (item.card !== $('image-card')) item.card.remove();
    }
  }
}

class EventBindings {
  listen(target, names, callback, options) {
    for (const name of Array.isArray(names) ? names : [names]) {
      target.addEventListener(name, callback, options);
    }
    return this;
  }

  actions(definitions) {
    for (const [id, callback] of Object.entries(definitions)) $(id).onclick = callback;
    return this;
  }
}

const cameraController = new CameraController(camera, viewport, canvas);
const canvasRenderer = new CanvasRenderer(canvas, ctx, camera);
const referenceLayer = new ReferenceLayer(surface, cameraController);
const eventBindings = new EventBindings();

function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function local(event){return cameraController.localPoint(event);}
function localToWorld(p){return cameraController.worldPoint(p);}
function world(event){return localToWorld(local(event));}
function screen(p){return cameraController.screenPoint(p);}
function checkpoint(){history.push(structuredClone(strokes));if(history.length>40)history.shift();}
function redraw(){render();positionImage();positionCheck();if($('zoom-level'))$('zoom-level').textContent=cameraController.zoomLabel;}
function initialCamera(){cameraController.initialize();cameraReady=true;}
function resize(){
  cameraController.measure(cameraReady);
  cameraReady=true;
  redraw();
}
function zoomAt(nextScale,anchor={x:viewport.width/2,y:viewport.height/2}){
  cameraController.zoom(nextScale,anchor);redraw();
}
function resetZoom(){cancelInteraction();zoomAt(1);}
function fitContent(){
  cancelInteraction();
  const bounds=ContentBounds.collect(images,strokes);
  if(bounds.empty){initialCamera();redraw();return;}
  const fitScale=cameraController.fit(bounds);
  if(fitScale<.0001)toast('These items are extremely far apart. Use Move to pan between regions.');
  redraw();
}
const fitView=fitContent,resetView=resetZoom;
function render(){
  canvasRenderer.draw(strokes,selection,selectedIds.length>0);
  $('writing-hint').hidden=phase!=='guided'||strokes.length>0;
  $('empty-state').hidden=images.length>0||strokes.length>0;
}
function syncImageAliases(){const item=images.find(item=>item.id===selectedImageId)||images.at(-1);imageRect=item?.rect||null;placedImage=item?.image||null;imageObjectURL=item?.objectURL?item.src:null;imageSelected=!!selectedImageId;}
function positionImage(){referenceLayer.layout(images);}
function positionCheck(){
  const button=$('selection-check');button.hidden=true;
  let box;
  if(busy)return;
  if(imageSelected&&imageRect&&['place','overview'].includes(phase))box={left:imageRect.x,top:imageRect.y,right:imageRect.x+imageRect.width,bottom:imageRect.y+imageRect.height};
  else if(phase==='guided'&&!stepChecked&&selection&&selectedIds.length)box=selection;
  else return;
  const edge=screen({x:box.right,y:(box.top+box.bottom)/2}),below=screen({x:(box.left+box.right)/2,y:box.bottom}),surfaceX=surface.offsetLeft||0,surfaceY=surface.offsetTop||0;
  if(edge.x<-90||screen({x:box.left,y:box.top}).x>viewport.width||below.y<0||screen({x:box.left,y:box.top}).y>viewport.height)return;
  edge.x+=surfaceX;edge.y+=surfaceY;below.x+=surfaceX;below.y+=surfaceY;
  const width=board.clientWidth,maxY=surfaceY+viewport.height-48;
  const side=edge.x+100<width;button.classList.toggle('side',side);
  button.style.left=`${clamp(side?edge.x+14:below.x-44,8,width-98)}px`;
  button.style.top=`${clamp(side?edge.y-19:below.y+16,65,maxY)}px`;button.hidden=false;
}
function selectImage(selected,id=selectedImageId||images.at(-1)?.id){
  selectedImageId=selected&&images.some(item=>item.id===id)?id:null;syncImageAliases();
  referenceLayer.select(images,selectedImageId);
  if(selectedImageId){selection=null;selectedIds=[];render();}positionCheck();
}
function setTool(next){
  if(!Object.hasOwn(TOOL_DEFINITIONS,next))return;
  cancelInteraction();
  tool=next;document.body.dataset.tool=next;document.querySelectorAll('button[data-tool]').forEach(b=>{const active=b.dataset.tool===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  clearSelection();
  $('tool-hint').textContent=TOOL_DEFINITIONS[next].hint;
  canvas.style.cursor=TOOL_DEFINITIONS[next].cursor;
}
function clearSelection(){selection=null;selectedIds=[];selectImage(false);$('selection-help').hidden=true;render();}
function cancelLoading(){generation++;for(const timer of loadingTimers)clearTimeout(timer);loadingTimers=[];setBusy(false);}
function setBusy(value){if(value)cancelInteraction();busy=value;for(const id of ['visualize','selection-check','next-step'])$(id).disabled=value;positionCheck();}
function panel(){ $('story-panel').hidden=false;resize(); }
function loading(title,copy,duration,done){
  cancelLoading();const version=generation;setBusy(true);panel();
  $('overview-card').hidden=true;$('loading-card').hidden=false;$('loading-title').textContent=title;$('loading-copy').textContent=copy;$('loading-progress').style.width='8%';
  [35,68,92].forEach((amount,index)=>loadingTimers.push(setTimeout(()=>{if(version===generation)$('loading-progress').style.width=amount+'%';},duration*(index+1)/4)));
  loadingTimers.push(setTimeout(()=>{if(version!==generation)return;$('loading-card').hidden=true;setBusy(false);done();},duration));
}
function scrollPanel(){if(matchMedia('(max-width:760px)').matches)$('story-panel').scrollIntoView({block:'start',behavior:'smooth'});else $('story-panel').scrollTop=0;}
function resetFlow(){
  cancelInteraction();
  cancelLoading();simulation?.destroy();simulation=null;strokes=[];history=[];checkedIds=new Set();stepIndex=0;stepChecked=false;phase='place';clearSelection();
  for(const id of ['loading-card','overview-card','video-card','guidance-offer','guidance-card','complete-card','step-feedback','next-step'])$(id).hidden=true;
  $('story-panel').hidden=true;$('phase-caption').textContent='01 / PLACE YOUR PROBLEM';setTool('move');render();resize();
}
function createImageCard(item){
  referenceLayer.mount(item,images.length===0);
}
async function placeImage(src,{objectURL=false,version=imageLoadVersion}={}){
  if(version!==imageLoadVersion){if(objectURL)URL.revokeObjectURL(src);return;}
  const image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('That image could not be opened. Use a PNG, JPG or WebP image.'));image.src=src;});
    if(version!==imageLoadVersion){if(objectURL)URL.revokeObjectURL(src);return;}
    if(image.naturalWidth*image.naturalHeight>24000000)throw new Error('Use an image smaller than 24 megapixels.');
    const center=localToWorld({x:viewport.width/2,y:viewport.height/2});
    const fit=Math.min(1,viewport.width*.72/image.naturalWidth,viewport.height*.6/image.naturalHeight)/camera.scale;
    const width=image.naturalWidth*fit,height=image.naturalHeight*fit,item={id:`image-${++serial}`,rect:{x:center.x-width/2,y:center.y-height/2,width,height},image,src,objectURL};
    createImageCard(item);images.push(item);$('empty-state').hidden=true;
    setTool('move');selectImage(true,item.id);redraw();
    toast('Image added. Drag it anywhere with Move; use the corner to resize.');
  }catch(error){if(objectURL)URL.revokeObjectURL(src);if(version===imageLoadVersion)toast(error.message);}
}
function upload(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Choose a PNG, JPG or WebP image.');return;}if(file.size>12*1024*1024){toast('Choose an image smaller than 12 MB.');return;}placeImage(URL.createObjectURL(file),{objectURL:true,version:imageLoadVersion});}

function capturePointer(owner,id){try{owner.setPointerCapture(id);}catch{}}
function releasePointer(active){
  const owner=active.owner||(['image','resize'].includes(active.kind)?$('image-card'):canvas);
  try{if(owner.hasPointerCapture(active.id))owner.releasePointerCapture(active.id);}catch{}
}
function cancelPointer(){if(pointer)finishPointer({pointerId:pointer.id,type:'cancel'});}
function cancelInteraction(){
  const activeTouches=[...touches.entries()];touches.clear();pinch=null;touchNavigation=false;cancelPointer();
  for(const [id,touch] of activeTouches)releasePointer({id,owner:touch.owner});
}
function rollbackTouchAction(){
  if(!pointer||pointer.pointerType!=='touch')return;
  if(pointer.before){strokes=pointer.before;history=pointer.historyBefore||history.slice(0,pointer.historyLength);}
  if(pointer.kind==='box'){selection=null;selectedIds=[];}
  pointer=null;
}
function canStartPointer(event){
  if(event.button!==0||event.isPrimary===false)return false;
  if(pointer){
    if(event.pointerType==='pen'){
      if(pointer.pointerType==='touch')rollbackTouchAction();else cancelPointer();
      cancelInteraction();
    }else{
      if(event.pointerId!==pointer.id||event.pointerType!==pointer.pointerType)return false;
      cancelPointer();
    }
  }
  return true;
}
function editableTarget(node){const element=node?.nodeType===3?node.parentElement:node;return !!(element?.isContentEditable||element?.closest?.('input,textarea,select'));}
function clearNativeSelection(){
  const native=window.getSelection?.();
  if(native&&!editableTarget(native.anchorNode)&&!editableTarget(native.focusNode)&&(board.contains(native.anchorNode)||board.contains(native.focusNode)))native.removeAllRanges();
}
function erase(point){
  strokes=strokes.filter(stroke=>!stroke.points.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<18/camera.scale));
  selectedIds=[];selection=null;positionCheck();render();
}
function beginPan(event,owner=surface){pointer={id:event.pointerId,pointerType:event.pointerType,kind:'pan',owner,startLocal:local(event),offsetX:camera.offsetX,offsetY:camera.offsetY};capturePointer(owner,event.pointerId);}
function beginPinch(){
  const pair=[...touches.entries()].slice(0,2);if(pair.length<2)return;
  rollbackTouchAction();touchNavigation=true;selection=null;selectedIds=[];
  const [a,b]=pair.map(([,touch])=>touch),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  pinch={ids:pair.map(([id])=>id),distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),scale:camera.scale,anchor:localToWorld(center)};redraw();
}
function movePinch(){
  const [a,b]=pinch.ids.map(id=>touches.get(id));if(!a||!b)return;
  const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};camera.scale=clamp(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,pinch.scale<.15?.0001:.15,4);
  camera.offsetX=center.x-pinch.anchor.x*camera.scale;camera.offsetY=center.y-pinch.anchor.y*camera.scale;redraw();
}
function pointerDown(event){
  if(event.cancelable!==false)event.preventDefault();clearNativeSelection();
  if(busy)return;
  const card=event.target.closest?.('.image-card'),item=images.find(item=>item.card===card),owner=card||canvas;
  if(event.pointerType==='touch'){
    if(pointer?.pointerType==='pen'||Date.now()-lastPenTime<250)return;
    if(pointer?.id===event.pointerId)cancelPointer();
    touches.set(event.pointerId,{...local(event),owner});capturePointer(owner,event.pointerId);
    if(touches.size>=2){beginPinch();return;}
    if(touchNavigation){beginPan(event,owner);return;}
  }
  if(!canStartPointer(event))return;
  if(event.pointerType==='pen'){lastPenTime=Date.now();if(touches.size||pinch)cancelInteraction();}
  const p=world(event);$('selection-help').hidden=true;
  if(item&&tool==='move'){
    selectImage(true,item.id);const resizing=event.target.closest?.('.resize-image');
    pointer={id:event.pointerId,pointerType:event.pointerType,kind:resizing?'resize':'image',owner:card,item,start:p,rect:{...item.rect}};capturePointer(card,event.pointerId);return;
  }
  selectImage(false);
  if(tool==='move'||event.pointerType==='touch'&&$('pencil-only').checked){clearSelection();beginPan(event,owner);return;}
  pointer={id:event.pointerId,pointerType:event.pointerType,kind:tool,owner,start:p};capturePointer(owner,event.pointerId);
  if(tool==='box'){selectedIds=[];selection=normaliseBox(p,p);}
  else if(tool==='pen'||tool==='eraser'){
    pointer.historyLength=history.length;pointer.historyBefore=history.slice();checkpoint();pointer.before=history.at(-1);
    if(tool==='pen'){selection=null;selectedIds=[];const stroke={id:`ink-${++serial}`,type:'pen',points:[p]};strokes.push(stroke);pointer.stroke=stroke;}
    else erase(p);
  }
  redraw();
}
function pointerMove(event){
  if(touches.has(event.pointerId)){const previous=touches.get(event.pointerId);touches.set(event.pointerId,{...previous,...local(event)});}
  if(pinch){if(event.cancelable!==false)event.preventDefault();movePinch();return;}
  if(pointer?.id!==event.pointerId)return;if(event.cancelable!==false)event.preventDefault();if(pointer.pointerType==='pen')clearNativeSelection();const p=world(event);
  if(pointer.kind==='pan'){const at=local(event);camera.offsetX=pointer.offsetX+at.x-pointer.startLocal.x;camera.offsetY=pointer.offsetY+at.y-pointer.startLocal.y;}
  else if(pointer.kind==='image'){pointer.item.rect.x=pointer.rect.x+p.x-pointer.start.x;pointer.item.rect.y=pointer.rect.y+p.y-pointer.start.y;}
  else if(pointer.kind==='resize'){
    const r=pointer.rect,aspect=r.height/r.width,dx=p.x-pointer.start.x,dy=p.y-pointer.start.y;
    pointer.item.rect.width=Math.max(40,r.width+(dx+dy*aspect)/(1+aspect*aspect));pointer.item.rect.height=pointer.item.rect.width*aspect;
  }
  else if(pointer.kind==='pen'){const coalesced=event.getCoalescedEvents?.(),events=coalesced?.length?coalesced:[event];for(const e of events)pointer.stroke.points.push(world(e));}
  else if(pointer.kind==='box')selection=normaliseBox(pointer.start,p);
  else if(pointer.kind==='eraser')erase(p);
  redraw();
}
function finishPointer(event){
  const touch=touches.get(event.pointerId);
  if(touch){
    touches.delete(event.pointerId);
    if(pinch||touchNavigation){
      if(pointer?.id===event.pointerId)pointer=null;
      pinch=null;releasePointer({id:event.pointerId,owner:touch.owner});
      if(touches.size>=2)beginPinch();
      else if(touches.size===1){
        const [id,remaining]=[...touches.entries()][0];pointer={id,pointerType:'touch',kind:'pan',owner:remaining.owner,startLocal:{x:remaining.x,y:remaining.y},offsetX:camera.offsetX,offsetY:camera.offsetY};
      }else touchNavigation=false;
      redraw();return;
    }
  }
  if(pointer?.id!==event.pointerId)return;
  const active=pointer,wasBox=active.kind==='box',completed=event.type==='pointerup';pointer=null;releasePointer(active);
  if(active.pointerType==='pen')lastPenTime=Date.now();
  if(completed&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
    if(wasBox)selection=normaliseBox(active.start,world(event));
    else if(active.kind==='pen')active.stroke.points.push(world(event));
  }
  if(wasBox){
    if(completed){
      selectedIds=selectInkIds(strokes.filter(s=>!checkedIds.has(s.id)),selection);
      $('selection-help').hidden=false;
      $('selection-help').textContent=phase!=='guided'?'Start guidance after the visualization to check a handwritten step.':stepChecked?'Use Next step to continue the script.':selectedIds.length?'Step selected. Tap the black Check bubble.':'Include the whole handwritten step in the box. Previously checked ink is not selected again.';
    }else{selection=null;selectedIds=[];$('selection-help').hidden=true;}
  }
  redraw();
}
eventBindings
  .listen(surface, 'pointerdown', pointerDown, { passive: false })
  .listen(surface, 'pointermove', pointerMove, { passive: false })
  .listen(surface, ['pointerup', 'pointercancel', 'lostpointercapture'], finishPointer)
  .listen(window, ['pointerup', 'pointercancel'], finishPointer, true)
  .listen(window, 'pointermove', event => {
    if (!surface.contains(event.target)) pointerMove(event);
  }, { passive: false })
  .listen(window, 'blur', cancelInteraction)
  .listen(document, 'visibilitychange', () => {
    if (document.hidden) cancelInteraction();
  })
  .listen(document, 'selectionchange', clearNativeSelection)
  .listen(surface, ['touchstart', 'touchmove', 'touchend', 'touchcancel'], event => {
    if (event.cancelable !== false) event.preventDefault();
    clearNativeSelection();
  }, { passive: false })
  .listen(surface, ['contextmenu', 'dragstart', 'selectstart', 'dblclick'], event => {
    if (!editableTarget(event.target)) event.preventDefault();
  })
  .listen(surface, 'wheel', event => {
    event.preventDefault();
    cancelInteraction();
    zoomAt(camera.scale * Math.exp(-event.deltaY * .0015), local(event));
  }, { passive: false })
  .listen(surface, 'keydown', event => {
    const card = event.target.closest?.('.image-card');
    const item = images.find(item => item.card === card);
    if (item && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setTool('move');
      selectImage(true, item.id);
    }
  });

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
      simulation?.destroy();simulation=new DemoSimulation($('video-canvas'),null,frame=>{
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
  if((images.length||strokes.length||phase!=='place')&&!confirm('Restart with a blank board? This clears all images and handwriting.'))return;
  imageLoadVersion++;resetFlow();
  referenceLayer.dispose(images);
  images=[];selectedImageId=null;syncImageAliases();
  $('problem-image').removeAttribute('src');$('image-card').hidden=true;$('empty-state').hidden=false;initialCamera();redraw();
  toast('Blank board ready. Use Add image to insert your problem.');
}

const openImagePicker = () => $('image-input').click();

eventBindings.actions({
  'add-image': openImagePicker,
  'empty-upload': openImagePicker,
  'zoom-in': () => {
    cancelInteraction();
    zoomAt(camera.scale * 1.25);
  },
  'zoom-out': () => {
    cancelInteraction();
    zoomAt(camera.scale / 1.25);
  },
  'zoom-reset': resetZoom,
  'fit-content': fitContent,
  'choose-box': () => {
    setTool('box');
    board.scrollIntoView({ block: 'start', behavior: 'smooth' });
    toast('Drag a box around the whole handwritten step.');
  },
  'selection-check': () => imageSelected ? checkImage() : checkInk(),
  'visualize': visualize,
  'start-guidance': startGuidance,
  'next-step': nextStep,
  'restart': restart,
  'run-again': restart,
  'play-video': () => {
    if (!simulation) return;
    simulation.playing ? simulation.pause() : simulation.play();
  },
  'replay-video': () => simulation?.replay(),
  'undo': () => {
    if (busy || !history.length) return;
    cancelInteraction();
    strokes = history.pop();
    clearSelection();
    render();
  },
  'clear-ink': () => {
    if (!strokes.length || busy) return;
    if (!confirm('Clear the handwriting? You can undo this.')) return;
    cancelInteraction();
    checkpoint();
    strokes = [];
    clearSelection();
    render();
  },
  'about': () => $('about-dialog').showModal(),
  'close-about': () => $('about-dialog').close(),
});

$('image-input').onchange = event => {
  for (const file of event.target.files) upload(file);
  event.target.value = '';
};

$('video-timeline').oninput = event => {
  simulation?.seek(Number(event.target.value) / 1000);
  if (Number(event.target.value) === 1000) offerGuidance();
};

document.querySelectorAll('button[data-tool]').forEach(button => {
  button.onclick = event => {
    if (event?.target && event.target.closest('button[data-tool]') !== button) return;
    setTool(button.dataset.tool);
  };
});

eventBindings
  .listen(document, 'paste', event => {
    if (document.querySelector('dialog[open]')) return;
    const file = [...event.clipboardData?.items || []]
      .find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
    if (file) {
      event.preventDefault();
      upload(file);
    }
  })
  .listen(board, 'dragover', event => event.preventDefault())
  .listen(board, 'drop', event => {
    event.preventDefault();
    for (const file of event.dataTransfer.files) upload(file);
  })
  .listen(document, 'keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey ||
        document.querySelector('dialog[open]') || editableTarget(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      cancelInteraction();
      $('undo').click();
    } else if (event.key === 'Escape') {
      cancelInteraction();
      clearSelection();
    } else if (!event.ctrlKey && !event.metaKey) {
      const mode = TOOL_SHORTCUTS[event.key.toLowerCase()];
      if (mode) {
        event.preventDefault();
        setTool(mode);
      }
    }
  })
  .listen(window, 'pagehide', () => {
    cancelInteraction();
    simulation?.pause();
  });

canvas.tabIndex = 0;
canvas.setAttribute('contenteditable', 'false');
new ResizeObserver(resize).observe(surface);
setTool('move');
resize();
