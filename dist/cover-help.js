'use strict';

// Cover.onHelpClickHandler shifts mc_content to the second, native help page.
const coverHelp=byId('cover-help'),coverHelpIndex=byId('cover-help-index');
const coverHelpFaq=byId('cover-help-faq'),coverFaqScroll=byId('cover-faq-scroll');
const coverShare=byId('cover-share'),coverShareToggle=byId('cover-share-toggle');
const coverHelpMovie=byId('cover-help-movie'),coverHelpFrame=byId('cover-help-movie-frame');
const coverHelpCanvas=byId('cover-help-movie-canvas'),coverHelpContext=coverHelpCanvas.getContext('2d');
const coverHelpLoading=byId('cover-help-movie-loading');
const coverHelpLoadingText=byId('cover-help-movie-loading-text'),coverHelpRetry=byId('cover-help-movie-retry');
const coverHelpTouch=byId('cover-help-movie-touch'),coverHelpBack=byId('cover-help-movie-back');
const coverHelpNext=byId('cover-help-movie-next'),coverHelpReplay=byId('cover-help-movie-replay');
const coverHelpClose=byId('cover-help-movie-close');
let coverHelpState=null,coverHelpManifest=null;
let coverHelpHiddenAt=document.hidden?performance.now():null;
function scheduleCoverHelpTimer(state,key,delay,callback){
  state[key+'Remaining']=Math.max(0,delay);state[key+'Callback']=callback;
  if(document.hidden){state[key+'Suspended']=true;return;}
  state[key+'Suspended']=false;state[key+'Due']=performance.now()+state[key+'Remaining'];
  state[key]=setTimeout(()=>{state[key]=0;if(coverHelpState===state)callback();},state[key+'Remaining']);
}
document.addEventListener('visibilitychange',()=>{
  const now=performance.now(),state=coverHelpState;
  if(document.hidden){
    if(coverHelpHiddenAt===null)coverHelpHiddenAt=now;
    if(state?.type==='battle'){
      for(const key of ['timer','audioTimer'])if(state[key]){
        state[key+'Remaining']=Math.max(0,state[key+'Due']-now);
        clearTimeout(state[key]);state[key]=0;state[key+'Suspended']=true;
      }
      if(state.audio&&(!state.audio.paused||state.audioPending)){
        state.resumeAudio=true;state.audioPending=false;state.audioAttempt=(state.audioAttempt||0)+1;state.audio.pause();
      }
    }
  }else{
    if(coverFaqThrow&&coverFaqThrowStart!==null&&coverHelpHiddenAt!==null)
      coverFaqThrowStart+=Math.max(0,now-Math.max(coverHelpHiddenAt,coverFaqThrowStart));
    if(state?.type==='battle'&&coverHelpHiddenAt!==null){
      const hiddenDuration=Math.max(0,now-Math.max(coverHelpHiddenAt,state.pageStart??now));
      if(Number.isFinite(state.pageStart))state.pageStart+=hiddenDuration;
      if(Number.isFinite(state.audioStart))state.audioStart+=hiddenDuration;
      if(Number.isFinite(state.pageEnd))state.pageEnd+=hiddenDuration;
      for(const key of ['timer','audioTimer'])if(state[key+'Suspended'])
        scheduleCoverHelpTimer(state,key,state[key+'Remaining'],state[key+'Callback']);
      if(state.resumeAudio){state.resumeAudio=false;playCoverHelpSound(state,state.token);}
    }
    coverHelpHiddenAt=null;
  }
});
let coverSlideCleanup=null;
function cloneCoverPage(page){
  const clone=page.cloneNode(true);
  clone.hidden=false;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
  clone.querySelector('.cover-help-backdrop')?.remove();
  const sourceCanvas=page.querySelector('canvas'),copyCanvas=clone.querySelector('canvas');
  if(sourceCanvas&&copyCanvas)copyCanvas.getContext('2d').drawImage(sourceCanvas,0,0);
  const sourceScroll=page.querySelector('.cover-faq-scroll'),copyScroll=clone.querySelector('.cover-faq-scroll');
  if(sourceScroll&&copyScroll)copyScroll.scrollTop=sourceScroll.scrollTop;
  return clone;
}
function slideCoverPage(from,to,apply,delta){
  coverSlideCleanup?.();
  const beforeScroll=from.querySelector('.cover-faq-scroll')?.scrollTop;
  const before=cloneCoverPage(from);
  apply();
  const after=cloneCoverPage(to);
  const overlay=document.createElement('div');overlay.className='cover-slide';
  overlay.setAttribute('aria-hidden','true');
  const backdrop=document.createElement('img');backdrop.className='cover-slide-backdrop';
  backdrop.src='assets/cover/help-backdrop.svg';overlay.append(backdrop);
  const windowElement=document.createElement('div');windowElement.className='cover-slide-window';
  const beforeLayer=document.createElement('div'),afterLayer=document.createElement('div');
  beforeLayer.className=afterLayer.className='cover-slide-page';
  beforeLayer.append(before);afterLayer.append(after);windowElement.append(beforeLayer,afterLayer);overlay.append(windowElement);
  document.querySelector('.cover-stage').append(overlay);
  if(beforeScroll!==undefined){const scroll=before.querySelector('.cover-faq-scroll');if(scroll)scroll.scrollTop=beforeScroll;}
  settingsDialog.style.visibility='hidden';coverHelp.style.visibility='hidden';
  // Percentages are relative to the full 1024 px stage, because the page
  // layer retains that width inside the fixed-width SWF mask.
  const offset=delta/1024*100;
  const options={duration:200,easing:'cubic-bezier(0.333333,0.666667,0.666667,1)',fill:'forwards'};
  const outgoing=beforeLayer.animate([{transform:'translateX(0)'},{transform:`translateX(${-offset}%)`}],options);
  const incoming=afterLayer.animate([{transform:`translateX(${offset}%)`},{transform:'translateX(0)'}],options);
  let done=false;
  const cleanup=()=>{
    if(done)return;done=true;outgoing.cancel();incoming.cancel();overlay.remove();
    settingsDialog.style.visibility='';coverHelp.style.visibility='';
    if(coverSlideCleanup===cleanup)coverSlideCleanup=null;
  };
  coverSlideCleanup=cleanup;
  Promise.allSettled([outgoing.finished,incoming.finished]).then(cleanup);
}
const coverHelpRows=[87.5,135.95,192.95,244.95,298.95,354.95,408.95,460.45];
const coverHelpNames=['常见问题','闯关小游戏说明1','闯关小游戏说明2','翻翻乐说明','拼拼乐说明','推推乐说明','抓抓乐说明','客服咨询'];
for(let i=0;i<coverHelpRows.length;i++){
  const button=document.createElement('button');button.type='button';button.className='cover-help-entry';
  button.style.top=`${(coverHelpRows[i]+9.55)/523.55*100}%`;
  if(i===7)button.style.left=`${15.2/532*100}%`;
  button.setAttribute('aria-label',coverHelpNames[i]);button.addEventListener('click',()=>openCoverHelpEntry(i));
  byId('cover-help-entries').append(button);
}
function showCoverHelpIndex(){
  cancelCoverFaqDrag();
  stopCoverFaqThrow();
  coverHelp.hidden=false;coverHelpIndex.hidden=false;coverHelpFaq.hidden=true;coverShare.hidden=true;setCoverFaqPosition(0);
}
function closeCoverHelp(){slideCoverPage(coverHelp,settingsDialog,()=>{coverHelp.hidden=true;settingsDialog.hidden=false;drawCoverSliders();},-615);}
byId('settings-help').addEventListener('click',()=>slideCoverPage(settingsDialog,coverHelp,()=>{settingsDialog.hidden=true;showCoverHelpIndex();},615));
byId('cover-help-settings').addEventListener('click',closeCoverHelp);
let coverShareMemory=null;
function readCoverShare(){
  if(coverShareMemory!==null)return coverShareMemory;
  try{return localStorage.getItem('pvz-share-data')==='on';}
  catch{return false;}
}
function updateCoverShare(){
  const enabled=readCoverShare();
  byId('cover-share-image').src=`assets/cover/share-${enabled?'on':'off'}.webp`;
  coverShareToggle.setAttribute('aria-pressed',String(enabled));
}
byId('settings-share').addEventListener('click',()=>{
  slideCoverPage(settingsDialog,coverHelp,()=>{
    settingsDialog.hidden=true;coverHelp.hidden=false;coverHelpIndex.hidden=true;coverHelpFaq.hidden=true;coverShare.hidden=false;updateCoverShare();
  },615);
});
byId('cover-share-back').addEventListener('click',closeCoverHelp);
coverShareToggle.addEventListener('click',()=>{
  const enabled=!readCoverShare();
  try{localStorage.setItem('pvz-share-data',enabled?'on':'off');coverShareMemory=null;}
  catch{coverShareMemory=enabled;}
  // Reads can be blocked even when writes succeed.
  try{localStorage.getItem('pvz-share-data');}catch{coverShareMemory=enabled;}
  updateCoverShare();
});
byId('cover-faq-back').addEventListener('click',()=>slideCoverPage(coverHelp,coverHelp,showCoverHelpIndex,-642));
function updateCoverFaqArrows(){
  byId('cover-faq-up').hidden=coverFaqScroll.scrollTop<=1;
  byId('cover-faq-down').hidden=coverFaqScroll.scrollTop+coverFaqScroll.clientHeight>=coverFaqScroll.scrollHeight-1;
}
coverFaqScroll.addEventListener('scroll',updateCoverFaqArrows);
// AIR translates touch and mouse input into the same TouchScroll gesture.
let coverFaqDrag=null,coverFaqThrow=0,coverFaqThrowStart=null,coverFaqOverscroll=0;
function coverFaqPosition(){return coverFaqScroll.scrollTop+coverFaqOverscroll;}
function setCoverFaqPosition(position){
  const max=Math.max(0,coverFaqScroll.scrollHeight-coverFaqScroll.clientHeight);
  const clamped=Math.max(0,Math.min(max,position));
  coverFaqScroll.scrollTop=clamped;
  coverFaqOverscroll=position-clamped;
  coverFaqScroll.querySelector('img').style.transform=`translateY(${-coverFaqOverscroll}px)`;
}
function stopCoverFaqThrow(){
  if(coverFaqThrow)cancelAnimationFrame(coverFaqThrow);
  coverFaqThrow=0;coverFaqThrowStart=null;
}
function coverFaqThrowDuration(start,velocity,stageScale,max){
  const stageVelocity=velocity/stageScale;
  const easeAtCheckpoint=1-Math.pow(2,-0.5);
  let duration=Math.abs(stageVelocity)/300;
  const end=start+velocity*0.05/easeAtCheckpoint*duration;
  if(end<0||end>max){
    const top=end<0,bound=top?0:max;
    // Native coordinates move the content, opposite to scrollTop.
    const slow=top?(stageVelocity>-45&&stageVelocity<15):
      (stageVelocity>-15&&stageVelocity<45);
    const alreadyOutside=top?start<0:start>max;
    const boundaryDuration=alreadyOutside||slow?0.75:
      Math.abs((bound-start)*easeAtCheckpoint/(velocity*0.05));
    duration=Math.min(Math.max(duration,boundaryDuration),boundaryDuration+1);
  }
  return Math.max(0.3,Math.min(10,duration));
}
function throwCoverFaq(drag){
  const elapsed=performance.now()-drag.sampleTime;
  if((!drag.moved&&!coverFaqOverscroll)||elapsed<=0)return;
  const start=coverFaqPosition();
  const velocity=drag.moved?(start-drag.sampleScroll)*1000/elapsed:0;
  const stageScale=document.querySelector('.cover-stage').getBoundingClientRect().width/1024;
  if(!stageScale)return;
  const max=coverFaqScroll.scrollHeight-coverFaqScroll.clientHeight;
  const easeAtCheckpoint=1-Math.pow(2,-0.5);
  const distance=velocity*0.05/easeAtCheckpoint;
  const duration=coverFaqThrowDuration(start,velocity,stageScale,max);
  const change=distance*duration;
  const correction=Math.max(0,Math.min(max,start+change))-start-change;
  coverFaqThrowStart=performance.now();
  function tick(now){
    if(document.hidden){coverFaqThrow=requestAnimationFrame(tick);return;}
    const progress=Math.min(1,(now-coverFaqThrowStart)/(duration*1000));
    const ratio=progress===1?1:1-Math.pow(2,-10*progress);
    setCoverFaqPosition(start+change*ratio+correction*ratio*ratio);
    if(progress<1)coverFaqThrow=requestAnimationFrame(tick);
    else{coverFaqThrow=0;coverFaqThrowStart=null;}
  }
  coverFaqThrow=requestAnimationFrame(tick);
}
coverFaqScroll.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||coverFaqDrag)return;
  event.preventDefault();
  stopCoverFaqThrow();
  const now=performance.now(),scroll=coverFaqPosition();
  coverFaqDrag={id:event.pointerId,y:event.clientY,scroll,sampleScroll:scroll,sampleTime:now,lastScroll:scroll,lastTime:now,moved:false};
  coverFaqScroll.setPointerCapture(event.pointerId);
  coverFaqScroll.classList.add('dragging');
});
coverFaqScroll.addEventListener('pointermove',event=>{
  if(coverFaqDrag?.id!==event.pointerId)return;
  if(!coverFaqDrag.moved){
    const scale=document.querySelector('.cover-stage').getBoundingClientRect().width/1024;
    if(Math.abs(event.clientY-coverFaqDrag.y)<7*scale)return;
    // The native handler applies the threshold-crossing move using the
    // original press position, then continues tracking from that same anchor.
    coverFaqDrag.moved=true;
  }
  let position=coverFaqDrag.scroll+coverFaqDrag.y-event.clientY;
  const max=Math.max(0,coverFaqScroll.scrollHeight-coverFaqScroll.clientHeight);
  if(position<0)position/=2;
  else if(position>max)position=max+(position-max)/2;
  setCoverFaqPosition(position);
  const now=performance.now();
  if(now-coverFaqDrag.sampleTime>50){
    coverFaqDrag.sampleScroll=coverFaqDrag.lastScroll;coverFaqDrag.sampleTime=coverFaqDrag.lastTime;
    coverFaqDrag.lastScroll=coverFaqPosition();coverFaqDrag.lastTime=now;
  }
});
function endCoverFaqDrag(event){
  if(coverFaqDrag?.id!==event.pointerId)return;
  const drag=coverFaqDrag;
  coverFaqDrag=null;coverFaqScroll.classList.remove('dragging');
  if(event.type==='pointerup')throwCoverFaq(drag);
  else if(coverFaqOverscroll){drag.sampleScroll=coverFaqPosition();drag.sampleTime=performance.now()-1;drag.moved=true;throwCoverFaq(drag);}
}
coverFaqScroll.addEventListener('pointerup',endCoverFaqDrag);
coverFaqScroll.addEventListener('pointercancel',endCoverFaqDrag);
coverFaqScroll.addEventListener('lostpointercapture',endCoverFaqDrag);
function cancelCoverFaqDrag(){
  if(!coverFaqDrag)return;
  const id=coverFaqDrag.id;
  endCoverFaqDrag({type:'pointercancel',pointerId:id});
  if(coverFaqScroll.hasPointerCapture(id))coverFaqScroll.releasePointerCapture(id);
}
window.addEventListener('blur',cancelCoverFaqDrag);
coverFaqScroll.addEventListener('wheel',()=>{stopCoverFaqThrow();if(coverFaqOverscroll)setCoverFaqPosition(coverFaqScroll.scrollTop);},{passive:true});
function openCoverHelpEntry(index){
  if(index===0){slideCoverPage(coverHelp,coverHelp,()=>{coverHelpIndex.hidden=true;coverHelpFaq.hidden=false;setCoverFaqPosition(0);requestAnimationFrame(updateCoverFaqArrows);},642);return;}
  if(index===7){window.open('http://www.popcap.com.cn/helpform.html','_blank','noopener,noreferrer');return;}
  if(index===1||index===2){openCoverBattleHelp(index===1?1:2);return;}
  openCoverMinigameHelp(index-2);
}
function stopCoverHelpMovie(){
  const state=coverHelpState;coverHelpState=null;
  clearArtButtonsWithin(coverHelpMovie);coverHelpMovie.classList.remove('minigame-help-movie','is-loading');
  coverHelpLoading.hidden=true;delete coverHelpMovie.dataset.helpGroup;
  if(state){clearTimeout(state.timer);clearTimeout(state.audioTimer);stopCoverHelpFrames(state);state.controller?.abort();state.audio?.pause();if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);}
  coverHelpFrame.onload=null;coverHelpFrame.onerror=null;
  coverHelpMovie.hidden=true;coverHelpFrame.hidden=false;coverHelpFrame.removeAttribute('src');
}
function stopCoverHelpFrames(state){
  const player=state?.framePlayer;if(!player)return;
  state.framePlayer=null;player.controller.abort();cancelAnimationFrame(player.raf);
  player.frame?.close();player.decoder?.close();coverHelpCanvas.hidden=true;
}
function showCoverHelpLoading(message='正在加载帮助…',retry=false){
  coverHelpLoadingText.textContent=message;coverHelpRetry.hidden=!retry;
  coverHelpLoading.hidden=false;coverHelpMovie.classList.add('is-loading');
}
function failCoverBattleHelp(state,message){
  if(coverHelpState!==state)return;
  state.token=Symbol();stopCoverHelpFrames(state);
  clearTimeout(state.timer);clearTimeout(state.audioTimer);
  state.timer=state.audioTimer=0;state.timerSuspended=state.audioTimerSuspended=false;
  state.resumeAudio=false;state.audioPending=false;state.audioBlocked=false;
  state.audioAttempt=(state.audioAttempt||0)+1;state.audio?.pause();
  state.pageStart=state.audioStart=state.pageEnd=null;
  coverHelpFrame.onload=null;coverHelpFrame.onerror=null;coverHelpFrame.hidden=true;
  coverHelpFrame.removeAttribute('src');resetCoverHelpMovieButtons();showCoverHelpLoading(message,true);
}
function rejectCoverHelpAudio(state,player){
  if(coverHelpState!==state||state.audio!==player)return;
  player.pause();state.audio=null;
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);
  state.audioUrl=null;failCoverBattleHelp(state,'帮助声音加载失败');
}
function restartCoverHelpAsImage(state,section,token,begin){
  if(coverHelpState!==state||state.token!==token)return;
  stopCoverHelpFrames(state);clearTimeout(state.timer);clearTimeout(state.audioTimer);
  state.timer=state.audioTimer=0;state.timerSuspended=state.audioTimerSuspended=false;
  state.resumeAudio=false;state.audioPending=false;state.audioAttempt=(state.audioAttempt||0)+1;
  state.audio?.pause();state.pageStart=state.audioStart=state.pageEnd=null;
  resetCoverHelpMovieButtons();showCoverHelpLoading();
  coverHelpFrame.hidden=false;coverHelpFrame.onload=begin;coverHelpFrame.src=section.path;
}
async function startCoverHelpFrames(state,section,token,begin){
  const player={controller:new AbortController(),decoder:null,frame:null,index:-1,decoding:false,raf:0};
  state.framePlayer=player;
  const current=()=>coverHelpState===state&&state.token===token&&state.framePlayer===player;
  try{
    const response=await fetch(section.path,{signal:player.controller.signal});
    if(!response.ok)throw new Error(`说明动画 ${response.status}`);
    const data=await response.arrayBuffer();if(!current())return;
    let decoder,first;
    if(typeof ImageDecoder==='function'){
      try{
        decoder=new ImageDecoder({data:data.slice(0),type:'image/webp'});player.decoder=decoder;player.nativeDecoder=true;
        await decoder.tracks.ready;if(!current())return;
        first=await decoder.decode({frameIndex:0});
      }catch(error){if(!current())return;decoder?.close();player.decoder=null;}
    }
    if(!first){decoder=new PvzWebPFrameDecoder({data,checkpointBase:section.path.replace(/\.webp$/,'')});player.decoder=decoder;player.nativeDecoder=false;first=await decoder.decode({frameIndex:0});}
    if(!current()){first.image.close();return;}
    player.frame=first.image;player.index=0;
    coverHelpCanvas.style.left='-5.561523%';coverHelpCanvas.style.width='106.25%';coverHelpCanvas.style.height='106.3802%';
    coverHelpCanvas.hidden=false;coverHelpFrame.hidden=true;begin();
    function draw(now){
      if(!current())return;
      if(document.hidden){player.raf=requestAnimationFrame(draw);return;}
      const elapsed=Math.max(0,now-state.pageStart);let frame=0,offset=0;
      while(frame<section.durations.length-1&&elapsed>=offset+section.durations[frame])offset+=section.durations[frame++];
      if(frame!==player.index&&!player.decoding){
        player.decoding=true;
        player.decoder.decode({frameIndex:frame}).then(result=>{
          if(!current()){result.image.close();return;}
          player.frame?.close();player.frame=result.image;player.index=frame;player.decoding=false;
        }).catch(()=>{
          if(!current())return;
          if(player.nativeDecoder){recoverCoverHelpFrames(state,player,section,frame,current,token,begin);return;}
          restartCoverHelpAsImage(state,section,token,begin);
        });
      }
      coverHelpContext.clearRect(0,0,coverHelpCanvas.width,coverHelpCanvas.height);
      coverHelpContext.drawImage(player.frame,0,0);
      player.raf=requestAnimationFrame(draw);
    }
    player.raf=requestAnimationFrame(draw);
  }catch(error){
    if(!current())return;
    restartCoverHelpAsImage(state,section,token,begin);
  }
}
async function recoverCoverHelpFrames(state,player,section,index,current,token,begin){
  try{
    player.decoder?.close();player.decoder=null;player.nativeDecoder=false;
    const response=await fetch(section.path,{signal:player.controller.signal});
    if(!response.ok)throw new Error(`说明动画 ${response.status}`);
    const data=await response.arrayBuffer();if(!current())return;
    const decoder=new PvzWebPFrameDecoder({data,checkpointBase:section.path.replace(/\.webp$/,'')});player.decoder=decoder;
    const result=await decoder.decode({frameIndex:index});
    if(!current()){result.image.close();return;}
    player.frame?.close();player.frame=result.image;player.index=index;player.decoding=false;
  }catch(error){
    if(!current())return;
    restartCoverHelpAsImage(state,section,token,begin);
  }
}
function returnFromCoverHelpMovie(){stopCoverHelpMovie();showCoverHelpIndex();}
function resetCoverHelpMovieButtons(){
  coverHelpTouch.hidden=true;coverHelpBack.hidden=false;coverHelpNext.hidden=true;
  coverHelpReplay.hidden=true;coverHelpClose.hidden=true;
}
function openCoverMinigameHelp(number){
  stopCoverHelpMovie();coverHelpMovie.hidden=false;
  coverHelpMovie.classList.add('minigame-help-movie');
  const state={type:'minigame',number,page:0,count:number===4?4:3};coverHelpState=state;
  showCoverMinigameHelpPage(state);
}
function showCoverMinigameHelpPage(state){
  if(coverHelpState!==state)return;resetCoverHelpMovieButtons();coverHelpTouch.hidden=false;
  coverHelpFrame.hidden=false;
  coverHelpNext.hidden=state.number===2?state.page===0:state.page+1>=state.count;
  const width=state.number===3?1056:1025,offset=state.number===3?-31.9:0;
  coverHelpFrame.style.left=`${offset/1024*100}%`;coverHelpFrame.style.width=`${width/1024*100}%`;coverHelpFrame.style.height='100%';
  coverHelpFrame.src=`assets/minigame-help/help-${state.number}-${String(state.page+1).padStart(2,'0')}-bare.webp`;
}
function advanceCoverMinigameHelp(){
  const state=coverHelpState;if(state?.type!=='minigame')return;
  if(++state.page>=state.count)returnFromCoverHelpMovie();else showCoverMinigameHelpPage(state);
}
coverHelpTouch.addEventListener('click',advanceCoverMinigameHelp);
coverHelpBack.addEventListener('click',returnFromCoverHelpMovie);
async function openCoverBattleHelp(number,page=0){
  stopCoverHelpMovie();coverHelpMovie.hidden=false;resetCoverHelpMovieButtons();
  showCoverHelpLoading();coverHelpMovie.dataset.helpGroup=number;
  coverHelpFrame.hidden=true;
  const state={type:'battle',number,page,timer:0,audioTimer:0,audio:null,audioUrl:null,controller:new AbortController()};coverHelpState=state;
  try{
    coverHelpManifest ||= fetch('game-assets.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error(`游戏说明素材 ${response.status}`);return response.json();});
    const manifest=await coverHelpManifest;if(coverHelpState!==state)return;
    state.help=manifest[`help_g${number}`];if(!state.help)throw Error('游戏说明缺少素材');
    // A Blob permits seeking when the static HTTP server lacks range support.
    const response=await fetch(state.help.audio.path,{signal:state.controller.signal});if(!response.ok)throw Error('音频加载失败');
    const blob=await response.blob();if(coverHelpState!==state)return;
    state.audioUrl=URL.createObjectURL(blob);state.audio=new Audio(state.audioUrl);
    const player=state.audio;player.addEventListener('error',()=>rejectCoverHelpAudio(state,player),{once:true});
    player.preload='auto';
    if(coverHelpState===state)showCoverBattleHelpPage(state);
  }catch(error){coverHelpManifest=null;if(coverHelpState===state&&error?.name!=='AbortError')failCoverBattleHelp(state,'帮助素材加载失败');}
}
function showCoverBattleHelpPage(state){
  if(coverHelpState!==state)return;clearTimeout(state.timer);clearTimeout(state.audioTimer);stopCoverHelpFrames(state);state.audio?.pause();
  state.timer=state.audioTimer=0;state.timerSuspended=state.audioTimerSuspended=false;state.resumeAudio=false;
  state.pageStart=state.audioStart=state.pageEnd=null;state.audioPending=false;
  state.audioBlocked=false;
  resetCoverHelpMovieButtons();
  showCoverHelpLoading();
  const section=state.help.animations[state.page],token=Symbol();state.token=token;
  coverHelpFrame.style.left='-5.561523%';coverHelpFrame.style.width='106.25%';coverHelpFrame.style.height='106.3802%';
  coverHelpFrame.onerror=()=>{
    if(coverHelpState!==state||state.token!==token)return;
    // A failed preload must not interrupt an animation that can still play.
    // The final-frame request below retries it when the animation finishes.
    if(coverHelpFrame.getAttribute('src')===state.help.frames[state.page] &&
       (state.pageEnd===null||performance.now()<state.pageEnd))return;
    failCoverBattleHelp(state,'帮助画面加载失败');
  };
  // Preload the stopped page while the animation is being decoded so that
  // switching from the canvas does not briefly reveal an older image.
  coverHelpFrame.onload=null;coverHelpFrame.hidden=true;coverHelpFrame.src=state.help.frames[state.page];
  const begin=()=>{
    if(coverHelpState!==state||state.token!==token)return;
    coverHelpLoading.hidden=true;coverHelpMovie.classList.remove('is-loading');
    if(state.page+1<state.help.frames.length)coverHelpNext.hidden=false;
    const duration=section.durations.reduce((a,b)=>a+b,0),stream=state.help.audio,startFrame=state.help.starts[state.page];
    const delay=Math.max(0,stream.firstAudioFrame-startFrame)*1000/stream.frameRate;
    const seek=stream.seekSamples?.[startFrame];
    const offset=Number.isFinite(seek)?seek/stream.sampleRate:
      stream.latencySamples/stream.sampleRate+Math.max(0,startFrame-stream.firstAudioFrame)/stream.frameRate;
    state.pageStart=performance.now();state.audioStart=state.pageStart+delay;state.audioOffset=offset;state.pageEnd=state.pageStart+duration;
    scheduleCoverHelpTimer(state,'audioTimer',delay,()=>{
      if(coverHelpState!==state||state.token!==token||!state.audio)return;
      const play=()=>playCoverHelpSound(state,token);
      if(state.audio.readyState<1)state.audio.addEventListener('loadedmetadata',play,{once:true});else play();
    });
    scheduleCoverHelpTimer(state,'timer',duration,async()=>{
      if(coverHelpState!==state||state.token!==token)return;
      state.audio?.pause();coverHelpFrame.onload=null;coverHelpFrame.src=state.help.frames[state.page];
      try{await coverHelpFrame.decode();}catch{/* The image error handler closes an unavailable page. */}
      if(coverHelpState!==state||state.token!==token)return;
      stopCoverHelpFrames(state);coverHelpFrame.hidden=false;
      if(state.page===state.help.frames.length-1){coverHelpReplay.hidden=false;coverHelpClose.hidden=false;}
      else coverHelpNext.hidden=false;
    });
  };
  startCoverHelpFrames(state,section,token,begin);
}
function playCoverHelpSound(state,token){
  if(coverHelpState!==state||state.token!==token||!state.audio)return;
  if(document.hidden){state.resumeAudio=true;return;}
  if(performance.now()>=state.pageEnd)return;
  state.audioBlocked=false;
  const attempt=state.audioAttempt=(state.audioAttempt||0)+1;
  const player=state.audio;
  player.currentTime=state.audioOffset+Math.max(0,performance.now()-state.audioStart)/1000;
  player.volume=1;
  state.audioPending=true;
  player.play().then(()=>{if(state.audioAttempt===attempt)state.audioPending=false;}).catch(error=>{
    if(coverHelpState===state&&state.token===token&&state.audio===player&&state.audioAttempt===attempt){
      state.audioPending=false;
      if(error?.name==='NotAllowedError')state.audioBlocked=true;
      else if(error?.name==='NotSupportedError')rejectCoverHelpAudio(state,player);
    }
  });
}
document.addEventListener('pointerdown',()=>{
  const state=coverHelpState;
  if(state?.audioBlocked)playCoverHelpSound(state,state.token);
},{passive:true});
coverHelpNext.addEventListener('click',()=>{const s=coverHelpState;if(s?.type==='minigame')advanceCoverMinigameHelp();else if(s?.type==='battle'&&s.page+1<s.help.frames.length){s.page++;showCoverBattleHelpPage(s);}});
coverHelpRetry.addEventListener('click',()=>{const state=coverHelpState;if(state?.type!=='battle')return;if(state.audio)showCoverBattleHelpPage(state);else openCoverBattleHelp(state.number,state.page);});
coverHelpReplay.addEventListener('click',()=>{const s=coverHelpState;if(s?.type==='battle'){s.page=0;showCoverBattleHelpPage(s);}});
coverHelpClose.addEventListener('click',returnFromCoverHelpMovie);
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!coverHelpMovie.hidden){event.preventDefault();returnFromCoverHelpMovie();}
  else if(!coverHelp.hidden){event.preventDefault();if(!coverHelpFaq.hidden)showCoverHelpIndex();else closeCoverHelp();}
});
