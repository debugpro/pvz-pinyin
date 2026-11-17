'use strict';

const returnWorld=Number(new URLSearchParams(location.search).get('world'));
if(Number.isInteger(returnWorld)&&returnWorld>=1&&returnWorld<=4)
  document.querySelectorAll('.shop-back,.shop-close').forEach(link=>{
    link.href=`game.html?world=${returnWorld}`;
  });

// Shop leaves the SoundManager background channel running from Gate.
const shopMusic=new Audio('audio/game/bg_sound.mp3');
shopMusic.loop=true;
try{
  const handoff=JSON.parse(sessionStorage.getItem('pvz-shop-music-handoff')||'null');
  sessionStorage.removeItem('pvz-shop-music-handoff');
  const age=Date.now()-handoff?.at;
  if(Number.isFinite(handoff?.time)&&handoff.time>=0&&age>=0&&age<30000){
    const seek=()=>{
      const elapsed=handoff.playing?Math.max(0,Date.now()-handoff.at)/1000:0;
      const position=handoff.time+elapsed;
      shopMusic.currentTime=Number.isFinite(shopMusic.duration)&&shopMusic.duration>0
        ? position%shopMusic.duration : position;
    };
    if(shopMusic.readyState>=1)seek();else shopMusic.addEventListener('loadedmetadata',seek,{once:true});
  }
}catch{}
function playShopMusic(){
  if(document.hidden)return;
  shopMusic.volume=PvzVolume.volume('music');
  if(shopMusic.paused)shopMusic.play().catch(()=>{});
}
for(const link of document.querySelectorAll('.shop-back,.shop-close')){
  link.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    try{
      sessionStorage.setItem('pvz-gate-music-handoff',JSON.stringify({
        time:shopMusic.currentTime,at:Date.now(),playing:!shopMusic.paused,
      }));
    }catch{}
  });
}
document.addEventListener('pointerdown',playShopMusic,{passive:true});
document.addEventListener('keydown',playShopMusic);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)shopMusic.pause();else playShopMusic();
});
window.addEventListener('storage',event=>{
  if(['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key))
    shopMusic.volume=PvzVolume.volume('music');
});
playShopMusic();

// Shop.onNext/onPre move FaceShop.mc_all by 300 pixels per page.
const windowElement=document.querySelector('#product-window');
const track=document.querySelector('#product-track');
const previous=document.querySelector('#shop-previous');
const next=document.querySelector('#shop-next');
const message=document.querySelector('#shop-message');
const buyChoice=document.querySelector('#shop-buy-choice');
const SHOP_MASK_WIDTH=837.7;
let page=0;
let pointer=null;
let suppressClick=false;
let messageTimer=0;
let choiceFocus=null,choiceBlocked=[];

function closeBuyChoice(){
  clearArtButtonsWithin(buyChoice);
  buyChoice.hidden=true;
  for(const [element,wasInert] of choiceBlocked)element.inert=wasInert;
  choiceBlocked=[];
  if(choiceFocus?.isConnected)choiceFocus.focus();
  choiceFocus=null;
}

function positionTrack(extra=0) {
  track.style.left=`${(-1-page*300)/SHOP_MASK_WIDTH*100+extra}%`;
}
function setPage(value) {
  page=Math.max(0,Math.min(2,value));
  track.style.transition='left .5s cubic-bezier(.333333,.666667,.666667,1)';
  positionTrack();
  previous.hidden=page===0;
  next.hidden=page===2;
  if(previous.hidden)clearArtButtonsWithin(previous);
  if(next.hidden)clearArtButtonsWithin(next);
}
function showMessage(text) {
  message.textContent=text;
  message.hidden=false;
  clearTimeout(messageTimer);
  messageTimer=setTimeout(()=>{message.hidden=true;},3500);
}

previous.addEventListener('click',()=>setPage(page-1));
next.addEventListener('click',()=>setPage(page+1));
document.querySelector('#shop-restore').addEventListener('click',()=>{
  showMessage('浏览器无法读取原 iOS 的购买记录；本地关卡已开放。');
});
function activateProduct(product){
  if(!product)return;
  if(product.dataset.product==='0'){
    showMessage('原版 iOS 内购无法在浏览器进行；可返回选关页游玩。');
    return;
  }
  if(!buyChoice.hidden)closeBuyChoice();
  choiceFocus=document.activeElement;
  choiceBlocked=[...buyChoice.parentElement.children]
    .filter(element=>element!==buyChoice)
    .map(element=>[element,element.inert]);
  for(const [element] of choiceBlocked)element.inert=true;
  clearArtButtonsWithin(buyChoice);
  buyChoice.hidden=false;
  buyChoice.querySelector('.choice-all').focus();
}
// The purchase preview has already passed the original parent check. Keep
// its selected product when handing off to this static web store.
const purchaseIntent=new URLSearchParams(location.search).get('purchase');
if(purchaseIntent==='all')activateProduct(document.querySelector('[data-product="0"]'));
else if(purchaseIntent==='current'&&Number.isInteger(returnWorld)&&returnWorld>=2&&returnWorld<=4)
  activateProduct(document.querySelector(`[data-product="${returnWorld}"]`));
windowElement.addEventListener('click',event=>{
  if(suppressClick)return;
  activateProduct(event.target.closest('[data-product]'));
});
buyChoice.querySelector('.choice-all').addEventListener('click',()=>{
  closeBuyChoice();
  showMessage('原版 iOS 内购无法在浏览器进行；可返回选关页游玩。');
});
buyChoice.querySelector('.choice-current').addEventListener('click',()=>{
  closeBuyChoice();
  showMessage('原版 iOS 内购无法在浏览器进行；可返回选关页游玩。');
});
windowElement.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false||pointer)return;
  const width=windowElement.getBoundingClientRect().width;
  const currentLeft=parseFloat(getComputedStyle(track).left);
  pointer={id:event.pointerId,x:event.clientX,delta:0,dragging:false,
    startOffset:currentLeft/width*SHOP_MASK_WIDTH};
  track.style.transition='none';
  track.style.left=`${currentLeft}px`;
});
windowElement.addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  pointer.delta=event.clientX-pointer.x;
  if(Math.abs(pointer.delta)>.5&&!pointer.dragging){
    pointer.dragging=true;
    windowElement.setPointerCapture(event.pointerId);
  }
  if(!pointer.dragging)return;
  const width=windowElement.getBoundingClientRect().width;
  track.style.left=`${(pointer.startOffset/SHOP_MASK_WIDTH+pointer.delta/width)*100}%`;
});
function endDrag(event) {
  if(!pointer||pointer.id!==event.pointerId)return;
  const delta=pointer.delta;
  const dragging=pointer.dragging;
  const startOffset=pointer.startOffset;
  pointer=null;
  if(event.type==='pointercancel'||event.type==='lostpointercapture'||event.type==='blur'){
    suppressClick=dragging;
    if(suppressClick)setTimeout(()=>{suppressClick=false;},0);
    setPage(page);return;
  }
  // onContentUpHandler truncates (mc_all.x - 95) / 200, clamps to
  // -2..0, then tweens mc_all.x to 95 + index * 300.
  const stageDelta=delta/windowElement.getBoundingClientRect().width*SHOP_MASK_WIDTH;
  const currentPosition=startOffset+1+stageDelta;
  const nativeIndex=Math.trunc(currentPosition/200);
  const targetPage=Math.max(0,Math.min(2,-nativeIndex));
  const nearTarget=Math.abs(currentPosition+targetPage*300)<5;
  const product=dragging&&nearTarget
    ? document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-product]') : null;
  suppressClick=dragging||!nearTarget;
  if(suppressClick)setTimeout(()=>{suppressClick=false;},0);
  setPage(targetPage);
  if(product&&windowElement.contains(product))activateProduct(product);
}
windowElement.addEventListener('pointerup',endDrag);
windowElement.addEventListener('pointercancel',endDrag);
// A press can leave the product window before it becomes a captured drag.
// Finish it at the window as well, and abandon interrupted captured drags.
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);
windowElement.addEventListener('lostpointercapture',endDrag);
window.addEventListener('blur',()=>{if(pointer)endDrag({type:'blur',pointerId:pointer.id});});
windowElement.addEventListener('click',event=>{
  if(!suppressClick)return;
  event.preventDefault();
  event.stopPropagation();
  suppressClick=false;
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!buyChoice.hidden){closeBuyChoice();return;}
  if(!buyChoice.hidden)return;
  if(event.key==='ArrowLeft')setPage(page-1);
  if(event.key==='ArrowRight')setPage(page+1);
});

setPage(0);
