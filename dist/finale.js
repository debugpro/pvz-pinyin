'use strict';

const stageFrame=document.querySelector('#finale-frame');
const playButton=document.querySelector('#finale-play');
const returnButton=document.querySelector('#finale-return');
const errorMessage=document.querySelector('#finale-error');
let manifest=null;
let frames=[];
let narration=null;
let startedAt=0;
let animationId=0;
let running=false,suspendedAt=null,resumeNeeded=false;
const frameCache=new Map(),failedFrames=new Set();
const FRAME_LOOKAHEAD=12;

function loadImage(path){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error(`无法加载结局画面：${path}`));
    image.src=path;
  });
}

function preloadFrames(index){
  const keep=new Set(frames.slice(index,Math.min(frames.length,index+FRAME_LOOKAHEAD+1)));
  for(const path of frameCache.keys())if(!keep.has(path))frameCache.delete(path);
  for(const path of keep){
    if(frameCache.has(path)||failedFrames.has(path))continue;
    const image=new Image();
    // A request may finish after its frame was evicted and requested again.
    // Only the currently retained request can mark that path as failed.
    image.onerror=()=>{if(frameCache.get(path)===image)failedFrames.add(path);};
    image.src=path;
    frameCache.set(path,image);
  }
}

function showFinaleError(error){
  cancelAnimationFrame(animationId);
  running=false;resumeNeeded=false;suspendedAt=null;
  narration?.pause();
  errorMessage.replaceChildren(document.createTextNode(error.message || String(error)));
  const retry=document.createElement('button');retry.type='button';retry.textContent='重试';
  retry.addEventListener('click',()=>location.reload());errorMessage.append(retry);
  errorMessage.hidden=false;
}

function paint(now){
  if(document.hidden||resumeNeeded){animationId=requestAnimationFrame(paint);return;}
  const elapsed=Math.max(0,now-startedAt);
  const index=Math.min(frames.length-1,Math.floor(elapsed*manifest.frameRate/1000));
  const path=frames[index];
  preloadFrames(index);
  const image=frameCache.get(path);
  if(failedFrames.has(path)){showFinaleError(Error(`无法加载结局画面：${path}`));return;}
  if(image?.complete&&image.naturalWidth&&stageFrame.getAttribute('src')!==path)stageFrame.src=path;
  if(elapsed>=manifest.returnAfterMs)returnButton.hidden=false;
  if(index<frames.length-1||returnButton.hidden||!image?.complete||!image.naturalWidth)
    animationId=requestAnimationFrame(paint);
}

async function play(){
  playButton.hidden=true;
  if(resumeNeeded){
    try{await narration.play();}
    catch{playButton.hidden=false;return;}
    if(document.hidden){narration.pause();resumeNeeded=false;return;}
    if(suspendedAt!==null)startedAt+=performance.now()-suspendedAt;
    suspendedAt=null;resumeNeeded=false;
    return;
  }
  const timing=manifest.audioTiming;
  const delay=(timing.firstFrame-1)*1000/manifest.frameRate;
  try{
    // The first nonempty SoundStreamBlock is later than the first SWF frame;
    // LatencySeek is the number of initial MP3 samples to discard.
    narration.currentTime=timing.latencySamples/timing.sampleRate;
    if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
    await narration.play();
  }catch{
    playButton.hidden=false;
    return;
  }
  cancelAnimationFrame(animationId);
  startedAt=performance.now()-delay;
  running=true;
  if(document.hidden){suspendedAt=performance.now();narration.pause();}
  returnButton.hidden=true;
  animationId=requestAnimationFrame(paint);
}

document.addEventListener('visibilitychange',()=>{
  if(!running)return;
  const now=performance.now();
  if(document.hidden){
    if(suspendedAt===null)suspendedAt=now;
    narration.pause();
  }else if(suspendedAt!==null&&!resumeNeeded){
    resumeNeeded=true;
    narration.play().then(()=>{
      if(document.hidden){narration.pause();resumeNeeded=false;return;}
      if(suspendedAt!==null)startedAt+=performance.now()-suspendedAt;
      suspendedAt=null;resumeNeeded=false;
    }).catch(()=>{if(document.hidden)resumeNeeded=false;else playButton.hidden=false;});
  }
});

playButton.addEventListener('click',play);
returnButton.addEventListener('click',()=>{
  narration?.pause();
  location.href='index.html';
});

async function init(){
  const response=await fetch('finale-assets.json',{cache:'no-store'});
  if(!response.ok)throw Error('无法加载结局资源清单');
  manifest=await response.json();
  if(manifest.frameRate!==30||manifest.frames?.length!==186||
     manifest.returnAfterMs!==8000||!manifest.audioTiming)
    throw Error('结局资源清单与原版时间轴不一致');
  frames=manifest.frames;
  const first=await loadImage(frames[0]);
  frameCache.set(frames[0],first);
  stageFrame.src=frames[0];
  preloadFrames(0);
  // Blob URLs support seeking even with static servers that omit byte ranges.
  const audioResponse=await fetch(manifest.audio);
  if(!audioResponse.ok)throw Error('无法加载结局配音');
  narration=new Audio(URL.createObjectURL(await audioResponse.blob()));
  narration.preload='auto';
  // GameAllOver's embedded stream is not routed through SoundManager's
  // background/effects channels or assigned a volume by its parent module.
  narration.volume=1;
  await play();
}

init().catch(showFinaleError);
