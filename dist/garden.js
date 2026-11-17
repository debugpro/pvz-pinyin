const canvas=document.querySelector('#garden-canvas');
const ctx=canvas.getContext('2d');
const status=document.querySelector('#garden-status');
const prevButton=document.querySelector('#garden-prev');
const nextButton=document.querySelector('#garden-next');
const shovelButton=document.querySelector('#garden-shovel');
const STORAGE_KEY='pvz-garden-layout';
let layout,gameAssets,soundAssets,slots=Array(23).fill(null),selected=null,scroll=0;
let nativeScrollX=60,targetNativeScrollX=60,lastScrollFrame=0,scrollFrameBalance=0,lastGardenPaintTick=-1;
let dragging=false,dragPoint=null,images=new Map(),ready=false;
let dragStartedAt=0;
let gardenHiddenAt=document.hidden?performance.now():null;
let pendingPointer=null,plantOrder=[];
let shovelDragging=false,shovelPoint=null,shovelPointerId=null;
const plantedAt=Array(23).fill(0);
const music=new Audio();
let gardenStorageError=false,gardenStorageUnreadable=false,gardenLayoutInvalid=false;
let gardenLayoutDirty=false;
const gardenImageRequests=new Map();
const gardenFailedImages=new Set();
const gardenFailedPlantImages=new Set();
const gardenPlantRetries=new Set();
let gardenInitialLoadPending=false,gardenInitialRetryRequested=false;
function loadGardenImage(path){
  if(images.has(path))return Promise.resolve(images.get(path));
  if(gardenImageRequests.has(path))return gardenImageRequests.get(path);
  const request=new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{gardenFailedImages.delete(path);images.set(path,img);resolve(img);};
    img.onerror=()=>{gardenFailedImages.add(path);reject(new Error(`无法加载图片：${path}`));};
    img.src=path;
  });
  gardenImageRequests.set(path,request);
  return request;
}
function gardenRead(key){
  try{return localStorage.getItem(key);}
  catch{gardenStorageError=true;gardenStorageUnreadable=true;return null;}
}
function gardenProgress(key,fallback,validate){
  const raw=gardenRead(key);if(raw===null)return fallback;
  try{const value=JSON.parse(raw);if(validate(value))return value;}catch{}
  gardenStorageError=true;return fallback;
}
const completed=new Set(gardenProgress('pvz-game-completed',[],value=>Array.isArray(value)&&value.every(id=>typeof id==='string')));
const gateScores=gardenProgress('pvz-game-scores',{},value=>value!==null&&typeof value==='object'&&!Array.isArray(value));
const returnWorld=Number(new URLSearchParams(location.search).get('world'));
if(Number.isInteger(returnWorld)&&returnWorld>=1&&returnWorld<=4)
  document.querySelector('#garden-back').href=`game.html?world=${returnWorld}`;

document.querySelector('#garden-back').addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  try{sessionStorage.setItem('pvz-garden-back-effect',String(Date.now()));}catch{}
});

function unlocked(card){
  if(card.name==='card_0_0')return true;
  if(card.name==='card_4_5')return gardenRead('pvz-pinyin-pull-last-score')!==null||
    gardenRead('pvz-pinyin-pull-played')==='1'||
    gardenRead('pvz-pinyin-pull-best')!==null;
  const [,world,gate]=card.name.split('_');
  const id=`gate${world}_${gate}`;
  return Object.prototype.hasOwnProperty.call(gateScores,id)
    ? Number(gateScores[id])>0 : completed.has(id);
}
function planted(card){return slots.includes(card.name);}
function setStatus(message){
  if(gardenStorageError){status.classList.add('error');status.textContent=`${message} 花园进度无法读取或保存，请检查浏览器存储。`;}
  else status.textContent=message;
}
function soundEnabled(){return PvzVolume.enabled('music');}
function playMusic(){
  if(document.hidden)return;
  music.volume=PvzVolume.volume('music');
  if(ready&&music.paused)music.play().catch(()=>{});
}
function playGardenSound(name){
  if(!soundAssets?.[name])return;
  // Garden.onDown/onUp play these Sound objects directly, without a
  // SoundTransform or SoundManager's shared effect channel.
  const effect=new Audio(soundAssets[name]);
  effect.play().catch(()=>{});
}
function image(path){return images.get(path);}
function part(id,frame=0){
  const paths=layout.parts[String(id)];
  return image(paths?.[Math.min(frame,(paths?.length||1)-1)]);
}
function sprite(name,frame=0){
  const source=gameAssets[name];
  return image(source?.frames?.[frame%source.frames.length]);
}
function idleName(name){
  const match=/^(specialPlant|plant)_(\d+)$/.exec(name);
  if(!match)return name;
  const motion=match[1]==='plant'
    ? `plant_motion_${match[2]}_idle` : `special_motion_${match[2]}_idle`;
  return gameAssets[motion]?motion:name;
}
function requestGardenPlantImage(path){
  if(images.has(path)||gardenImageRequests.has(path))return;
  loadGardenImage(path).then(()=>{
    gardenPlantRetries.delete(path);
    gardenFailedPlantImages.delete(path);
    if(!gardenFailedPlantImages.size&&!gardenStorageError)status.classList.remove('error');
  }).catch(error=>{
    gardenPlantRetries.delete(path);
    gardenFailedPlantImages.add(path);
    console.error(error);status.classList.add('error');setStatus('植物图片加载失败，网络恢复后将重试，也可刷新页面。');
  });
}
function requestGardenPlant(name){
  const source=gameAssets[idleName(name)];
  const paths=source?.sheet?[source.sheet]:source?.frames||[];
  for(const path of paths)requestGardenPlantImage(path);
}
window.addEventListener('online',()=>{
  if(!ready){startGardenLoad();return;}
  // Keep failed requests cached during an outage to avoid retrying each frame.
  // The browser's online event retries each failed plant once.
  for(const path of gardenFailedPlantImages){
    if(gardenPlantRetries.has(path))continue;
    gardenPlantRetries.add(path);
    gardenImageRequests.delete(path);
    requestGardenPlantImage(path);
  }
});
function paintSprite(name,x,y,frame=0){
  const source=gameAssets[idleName(name)];
  if(source?.sheet){
    const img=image(source.sheet);
    if(!img){
      requestGardenPlant(name);
      return;
    }
    const w=source.frameWidth,h=source.frameHeight;
    const index=frame%source.frameCount;
    const bounds=layout.plantBounds[name];
    ctx.drawImage(img,(index%source.columns)*source.frameWidth,
      Math.floor(index/source.columns)*source.frameHeight,
      source.frameWidth,source.frameHeight,x+bounds[0],y+bounds[2],w,h);
    return;
  }
  const img=sprite(name,0);if(!img)return;
  const w=img.width,h=img.height;
  const bounds=layout.plantBounds[name];
  ctx.drawImage(img,x+bounds[0],y+bounds[2],w,h);
}
function animationFrame(time){return Math.floor(time/(1000/30));}
function cardRect(card){return {x:60+card.x-scroll,y:545+card.y,w:120,h:80};}
const cardMask={x:50,y:530,w:920,h:190};
function render(time=0){
  if(!ready)return;
  if(document.hidden){requestAnimationFrame(render);return;}
  const paintTick=Math.floor(time/(1000/30));
  if(paintTick===lastGardenPaintTick){requestAnimationFrame(render);return;}
  lastGardenPaintTick=paintTick;
  if(lastScrollFrame){
    scrollFrameBalance+=Math.min(time-lastScrollFrame,100);
    while(scrollFrameBalance>=1000/30){
      scrollFrameBalance-=1000/30;
      if(nativeScrollX!==targetNativeScrollX){
        nativeScrollX+=(targetNativeScrollX-nativeScrollX)*0.4;
        if(Math.abs(targetNativeScrollX-nativeScrollX)<2)nativeScrollX=targetNativeScrollX;
        scroll=60-nativeScrollX;
      }
    }
  }
  lastScrollFrame=time;
  ctx.clearRect(0,0,1024,768);
  const background=sprite('bg_garden');
  if(background)ctx.drawImage(background,30,0,1024,768,0,0,1024,768);
  const hole=part(5290);
  for(let i=0;i<layout.holes.length;i++){
    const slot=layout.holes[i];
    if(hole)ctx.drawImage(hole,slot.x+layout.holeBounds[0],
      slot.y+layout.holeBounds[2]);
  }
  // The native hole and plant containers are separate; plants are children
  // of _plantSp in insertion order, not interleaved with the holes.
  for(const i of plantOrder){
    const slot=layout.holes[i];
    const card=layout.cards.find(item=>item.name===slots[i]);
    if(card)paintSprite(card.plant,slot.x,slot.y,
      animationFrame(Math.max(0,time-plantedAt[i])));
  }
  if(dragging&&selected&&dragPoint){
    const card=layout.cards.find(item=>item.name===selected);
    if(card)paintSprite(card.plant,dragPoint.x,dragPoint.y,
      animationFrame(Math.max(0,time-dragStartedAt)));
  }
  ctx.save();ctx.beginPath();ctx.rect(cardMask.x,cardMask.y,cardMask.w,cardMask.h);ctx.clip();
  for(const card of layout.cards){
    const rect=cardRect(card);
    if(rect.x+rect.w<cardMask.x||rect.x>cardMask.x+cardMask.w)continue;
    const locked=!unlocked(card),used=planted(card);
    const bg=part(5299,locked?1:0),art=part(card.art,locked?1:0);
    if(bg)ctx.drawImage(bg,rect.x,rect.y);
    if(art)ctx.drawImage(art,rect.x,rect.y);
    if(locked||used){const lock=part(5309);if(lock)ctx.drawImage(lock,rect.x,rect.y);}
    if(selected===card.name){const frame=part(5306);if(frame)ctx.drawImage(frame,rect.x,rect.y);}
  }
  ctx.restore();
  if(shovelDragging&&shovelPoint){
    const shovelImage=part(5399);
    if(shovelImage)ctx.drawImage(shovelImage,shovelPoint.x+layout.shovelBounds[0],
      shovelPoint.y+layout.shovelBounds[2]);
  }
  requestAnimationFrame(render);
}
function save(){
  if(gardenStorageUnreadable||gardenLayoutInvalid){gardenStorageError=true;gardenLayoutDirty=true;return;}
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(slots));gardenLayoutDirty=false;}
  catch{gardenStorageError=true;gardenLayoutDirty=true;}
}
function refreshGardenLayout(){
  if(!ready||gardenLayoutDirty||gardenStorageUnreadable||gardenLayoutInvalid)return;
  try{
    const raw=localStorage.getItem(STORAGE_KEY),saved=raw===null?Array(23).fill(null):JSON.parse(raw);
    if(!Array.isArray(saved)||saved.length!==23||saved.some(name=>name!==null&&
       (typeof name!=='string'||!layout.cards.some(card=>card.name===name))))throw Error('Invalid garden layout');
    const now=performance.now();
    for(let i=0;i<slots.length;i++)if(slots[i]!==saved[i])plantedAt[i]=saved[i]?now:0;
    plantOrder=plantOrder.filter(i=>saved[i]&&saved[i]===slots[i]);
    for(let i=0;i<saved.length;i++)if(saved[i]&&!plantOrder.includes(i))plantOrder.push(i);
    slots=saved;
    for(const card of layout.cards)if(planted(card))requestGardenPlant(card.plant);
  }catch{gardenStorageError=true;gardenLayoutInvalid=true;setStatus('花园布局更新失败。');}
}
function point(event){
  const box=canvas.getBoundingClientRect();
  return {x:(event.clientX-box.left)*1024/box.width,y:(event.clientY-box.top)*768/box.height};
}
function cardAt({x,y}){
  if(y<cardMask.y||y>cardMask.y+cardMask.h||x<cardMask.x||x>cardMask.x+cardMask.w)return null;
  return [...layout.cards].reverse().find(card=>{
    const r=cardRect(card);return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
  });
}
function holeAt({x,y}){
  const [left,right,top,bottom]=layout.holeBounds;
  return layout.holes.findIndex(hole=>x>=hole.x+left&&x<=hole.x+right&&
    y>=hole.y+top&&y<=hole.y+bottom);
}
function plantAt({x,y},time=performance.now()){
  return plantOrder.find(index=>{
    const name=slots[index];
    const card=layout.cards.find(item=>item.name===name);
    if(!card)return false;
    const motion=gameAssets[idleName(card.plant)];
    const frame=animationFrame(Math.max(0,time-plantedAt[index]));
    const bounds=motion?.nativeBounds?.[frame%(motion.frameCount||1)] ||
      layout.plantBounds[card.plant];
    const [left,right,top,bottom]=bounds;
    const hole=layout.holes[index];
    return x>=hole.x+left&&x<=hole.x+right&&
      y>=hole.y+top&&y<=hole.y+bottom;
  }) ?? -1;
}
function place(index){
  if(index<0)return;
  if(!selected)return;
  if(slots[index]){selected=null;setStatus('坑位已有植物。');return;}
  const old=slots.indexOf(selected);
  if(old>=0){slots[old]=null;plantedAt[old]=0;plantOrder=plantOrder.filter(i=>i!==old);}
  slots[index]=selected;save();
  plantOrder.push(index);
  // onUp moves the same clip created by onMove into the hole; it does not
  // restart the plant's child timeline when the player releases the pointer.
  plantedAt[index]=dragStartedAt;
  playGardenSound('putdown_sound');
  const card=layout.cards.find(item=>item.name===selected);
  setStatus(`已种下 ${card.plant.startsWith('special')?'特殊植物':'植物'}。`);
  selected=null;
}
canvas.addEventListener('pointerdown',event=>{
  if(!ready||pendingPointer||shovelDragging||!event.isPrimary)return;
  refreshGardenLayout();
  const location=point(event);
  const plantedIndex=plantAt(location);
  if(plantedIndex>=0){
    slots[plantedIndex]=null;plantedAt[plantedIndex]=0;
    plantOrder=plantOrder.filter(index=>index!==plantedIndex);save();
    playGardenSound('putup_sound');
    setStatus('植物已移回卡栏。');
    return;
  }
  if(location.x<cardMask.x||location.x>cardMask.x+cardMask.w||
     location.y<cardMask.y||location.y>cardMask.y+cardMask.h)return;
  event.preventDefault();
  pendingPointer={id:event.pointerId,start:location,scrollX:nativeScrollX,card:cardAt(location)};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  if(!pendingPointer||pendingPointer.id!==event.pointerId)return;
  const location=point(event);
  if(dragging){dragPoint=location;return;}
  if(Math.abs(location.y-pendingPointer.start.y)<50&&location.y>520){
    nativeScrollX=Math.max(-150,Math.min(60,pendingPointer.scrollX+location.x-pendingPointer.start.x));
    targetNativeScrollX=nativeScrollX;scroll=60-nativeScrollX;
    return;
  }
  const card=pendingPointer.card;
  if(!card||!unlocked(card)||planted(card))return;
  selected=card.name;dragging=true;dragPoint=location;dragStartedAt=performance.now();
  setStatus('把植物拖到坑位后松手。');
});
canvas.addEventListener('pointerup',event=>{
  if(!pendingPointer||pendingPointer.id!==event.pointerId)return;
  pendingPointer=null;
  refreshGardenLayout();
  if(!dragging){selected=null;return;}
  if(planted({name:selected})){dragging=false;dragPoint=null;selected=null;return;}
  const index=holeAt(point(event));
  dragging=false;dragPoint=null;
  if(index>=0)place(index);
  else selected=null;
});
function cancelGardenDrag(){
  const wasActive=!!pendingPointer||dragging;
  pendingPointer=null;dragging=false;dragPoint=null;selected=null;
  if(wasActive&&!shovelDragging)refreshGardenLayout();
}
canvas.addEventListener('pointercancel',event=>{
  if(pendingPointer?.id===event.pointerId)cancelGardenDrag();
});
canvas.addEventListener('lostpointercapture',event=>{
  if(pendingPointer?.id===event.pointerId)cancelGardenDrag();
});
prevButton.addEventListener('click',()=>{targetNativeScrollX=60;});
nextButton.addEventListener('click',()=>{targetNativeScrollX=-150;});
function endShovel(){
  const wasActive=shovelDragging;
  shovelDragging=false;shovelPoint=null;shovelPointerId=null;shovelButton.setAttribute('aria-pressed','false');
  if(wasActive&&!pendingPointer)refreshGardenLayout();
}
shovelButton.addEventListener('pointerdown',event=>{
  if(!ready||pendingPointer||shovelDragging||!event.isPrimary)return;
  event.preventDefault();selected=null;dragging=false;dragPoint=null;pendingPointer=null;
  shovelDragging=true;shovelPointerId=event.pointerId;shovelPoint=point(event);
  shovelButton.setPointerCapture(event.pointerId);
  shovelButton.setAttribute('aria-pressed','true');
  setStatus('将铲子拖到植物上松手。');
});
shovelButton.addEventListener('pointermove',event=>{
  if(shovelDragging&&event.pointerId===shovelPointerId)shovelPoint=point(event);
});
shovelButton.addEventListener('pointerup',event=>{
  if(!shovelDragging||event.pointerId!==shovelPointerId)return;
  refreshGardenLayout();
  const index=plantAt(point(event));
  endShovel();
  if(index<0)return;
  slots[index]=null;plantedAt[index]=0;plantOrder=plantOrder.filter(i=>i!==index);save();
  playGardenSound('putup_sound');setStatus('植物已移回卡栏。');
});
shovelButton.addEventListener('pointercancel',event=>{if(event.pointerId===shovelPointerId)endShovel();});
shovelButton.addEventListener('lostpointercapture',event=>{if(event.pointerId===shovelPointerId)endShovel();});
window.addEventListener('blur',()=>{cancelGardenDrag();endShovel();});
async function load(){
  const loadJson=path=>fetch(path).then(response=>{
    if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  });
  [layout,gameAssets,soundAssets]=await Promise.all([
    loadJson('garden-layout.json'),loadJson('game-assets.json'),loadJson('game-sounds.json')]);
  const raw=gardenRead(STORAGE_KEY);
  if(raw!==null){
    try{
      const saved=JSON.parse(raw);
      if(!Array.isArray(saved)||saved.length!==23||saved.some(name=>name!==null&&typeof name!=='string'))throw Error('Invalid garden layout');
      gardenLayoutInvalid=saved.some(name=>name!==null&&!layout.cards.some(card=>card.name===name));
      if(gardenLayoutInvalid)gardenStorageError=true;
      slots=saved.map(name=>layout.cards.some(card=>card.name===name)?name:null);
    }catch{gardenStorageError=true;gardenLayoutInvalid=true;}
  }
  plantOrder=slots.flatMap((name,index)=>name?[index]:[]);
  const names=['bg_garden',...new Set(layout.cards
    .filter(card=>unlocked(card)||slots.includes(card.name))
    .map(card=>idleName(card.plant)))];
  const paths=new Set(Object.values(layout.parts).flat());
  for(const name of names){
    const source=gameAssets[name];
    if(!source)throw new Error(`缺少素材索引：${name}`);
    if(source.sheet)paths.add(source.sheet);
    else for(const path of source?.frames||[])paths.add(path);
  }
  await Promise.all([...paths].map(loadGardenImage));
  ready=true;
  // Storage events received before ready are deliberately ignored; reconcile
  // progress and layout now so a slow load cannot show an earlier snapshot.
  refreshGardenProgress();
  refreshGardenLayout();
  music.src=soundAssets.bg_sound;
  music.loop=true;
  music.volume=PvzVolume.volume('music');
  playMusic();
  setStatus(`已种植 ${slots.filter(Boolean).length} / 23 个坑位；已解锁 ${layout.cards.filter(unlocked).length} / 18 张植物卡。`);
  requestAnimationFrame(render);
}
function startGardenLoad(){
  if(ready)return;
  if(gardenInitialLoadPending){gardenInitialRetryRequested=true;return;}
  gardenInitialLoadPending=true;
  for(const path of gardenFailedImages)gardenImageRequests.delete(path);
  load().then(()=>{
    if(!gardenStorageError)status.classList.remove('error');
  }).catch(error=>{
    console.error(error);status.classList.add('error');setStatus('花园资源加载失败，网络恢复后将重试，也可刷新页面。');
  }).finally(()=>{
    gardenInitialLoadPending=false;
    if(gardenInitialRetryRequested){gardenInitialRetryRequested=false;if(!ready)startGardenLoad();}
  });
}
startGardenLoad();
document.addEventListener('pointerdown',playMusic,{passive:true});
document.addEventListener('keydown',playMusic);
document.addEventListener('visibilitychange',()=>{
  const now=performance.now();
  if(document.hidden){
    if(gardenHiddenAt===null)gardenHiddenAt=now;
    music.pause();
  }else{
    if(gardenHiddenAt!==null){
      const shift=start=>start+Math.max(0,now-Math.max(gardenHiddenAt,start));
      for(let i=0;i<slots.length;i++)if(slots[i])plantedAt[i]=shift(plantedAt[i]);
      if(dragging)dragStartedAt=shift(dragStartedAt);
      gardenHiddenAt=null;lastScrollFrame=0;lastGardenPaintTick=-1;
    }
    playMusic();
  }
});
window.addEventListener('storage',event=>{
  if(['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key))playMusic();
  if((event.key===null||event.key===STORAGE_KEY)&&!pendingPointer&&!shovelDragging)refreshGardenLayout();
  if(event.key===null||['pvz-game-completed','pvz-game-scores','pvz-pinyin-pull-last-score','pvz-pinyin-pull-played','pvz-pinyin-pull-best'].includes(event.key))refreshGardenProgress();
});
window.addEventListener('pageshow',event=>{if(event.persisted){refreshGardenProgress();if(!pendingPointer&&!shovelDragging)refreshGardenLayout();}});

function refreshGardenProgress(){
  if(!ready)return;
  try{
    const savedCompleted=JSON.parse(localStorage.getItem('pvz-game-completed')??'[]');
    const savedScores=JSON.parse(localStorage.getItem('pvz-game-scores')??'{}');
    if(!Array.isArray(savedCompleted)||!savedCompleted.every(id=>typeof id==='string')||
       !savedScores||typeof savedScores!=='object'||Array.isArray(savedScores))throw Error('Invalid progress');
    completed.clear();for(const id of savedCompleted)completed.add(id);
    for(const key of Object.keys(gateScores))delete gateScores[key];
    for(const [key,value] of Object.entries(savedScores))
      Object.defineProperty(gateScores,key,{value,writable:true,enumerable:true,configurable:true});
    for(const card of layout.cards)if(unlocked(card)||planted(card))requestGardenPlant(card.plant);
  }catch{
    gardenStorageError=true;
    setStatus('花园进度更新失败。');
  }
}
