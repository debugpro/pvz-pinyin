'use strict';

const canvas = document.querySelector('#match-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayText = document.querySelector('#overlay-text');
const overlayButton = document.querySelector('#overlay-button');
const soundButton = document.querySelector('#sound');
const pauseButton = document.querySelector('#pause');
const restartButton = document.querySelector('#restart');
const progressLabel = document.querySelector('#progress');
const message = document.querySelector('#message');
let guideArt;
let guideArtStartedAt = 0;
let guideArrowStartedAt = null;
let retainedGuideArrow = null;
let content;
let images;
let zombies = [];
let dying = [];
let zombieDepth = 0;
let selected = [];
let waveIndex = 0;
let elapsed = 0;
let flipOffset = 0,pausedFlipLast = 0,pausedFlipFrame = 0;
let nextWaveAt = 5;
let letters = [];
let mode = 'loading';
let lastTick = 0;
let frameId = 0;
let matchedPairs = 0;
let misses = 0;
let audioEnabled = PvzVolume.enabled('music');
let resultArt;
let resultStartedAt = 0;
let resultDeathStartedAt = 0;
let hiddenAt=document.hidden?performance.now():null;
let resultFrameId = 0;
let successTimer = 0;
let resultPauseVisible = false;
const music = new Audio();
const effect = new Audio();
const guideAudio = new Audio();
let guideNeedsGesture = false;
let guideAttempt = 0;
let guidePending = false;
let guidePhase = null;
let guideStep = 0;
let guideReady = false;
let guideOutroAt = null;
// Gate.onSel passes `played` from this gate's saved score. The flag is kept
// for this page instance's replays once both tutorial cards are clicked.
let nativeGuided = (() => {
  try { return localStorage.getItem('pvz-pinyin-match-won') === '1'; }
  catch { return false; }
})();

function playMusic() {
  if(document.hidden || mode !== 'playing')return;
  music.volume=PvzVolume.volume('music');
  music.play().catch(() => {});
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`素材加载失败：${path}`));
    image.src = path;
  });
}

function setOverlay(title, body, action, handler) {
  overlayTitle.textContent = title;
  overlayText.textContent = body;
  overlayButton.textContent = action;
  overlayButton.disabled = false;
  overlayButton.onclick = handler;
  overlay.hidden = false;
}

function labelOf(type) { return letters[type]; }

function shuffledLetters() {
  return shuffleSessionPool('match', content.letters, content.letterSwaps);
}

function playGuideSound(path, onEnded) {
  guideResumePending=false;
  guideAudio.pause();
  guideArtStartedAt = performance.now() - 1000 / 30;
  guideAudio.onended = () => {
    guideArtStartedAt = performance.now();
    onEnded();
  };
  guideAudio.src = path;
  guideAudio.currentTime = 0;
  guideAudio.muted = false;
  tryGuideSound();
}

let suspendedGuideSrc=null,guidePlayPending=false,guideResumePending=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(!guideAudio.paused||guidePlayPending){suspendedGuideSrc=guideAudio.src;guidePlayPending=false;guideAttempt++;guideAudio.pause();}
  }else if(suspendedGuideSrc){
    const src=suspendedGuideSrc;suspendedGuideSrc=null;
    if(guideAudio.src===src&&guideAudio.onended){guideResumePending=true;tryGuideSound();}
  }
});
function tryGuideSound() {
  if(document.hidden){suspendedGuideSrc=guideAudio.src;return;}
  const attempt=++guideAttempt;
  if (guideNeedsGesture&&!guideResumePending) guideArtStartedAt = performance.now() - 1000 / 30;
  guideNeedsGesture=false;
  guidePlayPending=true;
  guideAudio.play().then(()=>{if(attempt===guideAttempt){guidePlayPending=false;guideResumePending=false;}}).catch(error => {
    if(attempt!==guideAttempt)return;
    guidePlayPending=false;
    if(error?.name==='NotAllowedError')guideNeedsGesture=true;
    else guideAudio.onended?.();
  });
}

function beginGuide() {
  guideArtStartedAt=performance.now();
  guidePending = false;
  guidePhase = 'spotlight';
  guideStep = 0;
  guideReady = false;
  playGuideSound(content.sounds.guideStep1, () => {
    if (guidePhase !== 'spotlight' || guideStep !== 0) return;
    guideReady = true;
    draw();
  });
  draw();
}

function guideClicked(zombie) {
  if (guidePhase !== 'spotlight' || !guideReady || zombie !== zombies[guideStep]) return false;
  guideStep += 1;
  if (guideStep >= 2) {
    nativeGuided = true;
    guidePhase = 'closing';
    retainedGuideArrow = null;
    guideOutroAt = elapsed + flipOffset + 1;
  }
  return true;
}

function beginGuideOutro() {
  guideOutroAt = null;
  guidePhase = 'outro';
  playGuideSound(content.sounds.guideOver, () => {
    if (guidePhase !== 'outro') return;
    guidePhase = null;
    draw();
  });
  draw();
}

const matchFrontTextures=new Map();
function matchFrontTexture(type){
  const letter=labelOf(type);
  if(matchFrontTextures.has(letter))return matchFrontTextures.get(letter);
  const rect=content.glyphs[letter];
  const texture=document.createElement('canvas');texture.width=78;texture.height=122;
  const paint=texture.getContext('2d');
  paint.drawImage(images.cardFront,0,0);
  paint.drawImage(images.glyphSheet,rect.x,rect.y,rect.w,rect.h,
    38-rect.w/2,60-rect.h/2,rect.w,rect.h);
  matchFrontTextures.set(letter,texture);
  return texture;
}
function drawMatchCard(image,x,y,angle) {
  // FaceMatchCard rotates around its (47,60) placement, with local bounds
  // (-38,-60)..(40,62). AIR uses a 55-degree root perspective.
  if(angle===0){ctx.drawImage(image,x-38,y-60);return;}
  if(angle===180){ctx.save();ctx.translate(x,y);ctx.scale(-1,1);ctx.drawImage(image,-38,-60);ctx.restore();return;}
  const radians=angle*Math.PI/180,cosine=Math.cos(radians),sine=Math.sin(radians);
  const focal=512/Math.tan(55*Math.PI/360);
  const project=(u,v)=>{
    const scale=focal/(focal-u*sine);
    return [512+(x+u*cosine-512)*scale,384+(y+v-384)*scale];
  };
  for(let column=0;column<78;column+=2){
    const width=Math.min(2,78-column),left=column-38;
    const a=project(left,-60),b=project(left+width,-60),c=project(left,62);
    ctx.save();ctx.transform((b[0]-a[0])/width,(b[1]-a[1])/width,
      (c[0]-a[0])/122,(c[1]-a[1])/122,a[0],a[1]);
    ctx.drawImage(image,column,0,width,122,0,0,width,122);ctx.restore();
  }
}
function drawZombie(zombie) {
  const x = zombie.x, y = zombie.y;
  const ageTicks = Math.floor((elapsed - zombie.bornAt) * 1000 / 30);
  if(zombie.birthEnabled&&ageTicks<15){
    // Match creates the Bitmap without bitmapData; the first timer tick
    // supplies frame 1. The JSON's fourth column lies outside the sheet.
    if(ageTicks>0){const frame=ageTicks%4===3?ageTicks-1:ageTicks;
      ctx.drawImage(images.create,(frame%4)*240,Math.floor(frame/4)*240,240,240,x-75,y-60,240,240);}
    return;
  }
  const ticks = ageTicks-(zombie.birthEnabled?15:0);
  const frame = ticks ? ((zombie.walkPhase || 0) + ticks) % 63 : 0;
  const bob = walkBob(zombie.walkPhase || 0, ticks);
  const sourceX = (frame % 10) * 100;
  const sourceY = Math.floor(frame / 10) * 100;
  // Zombie.init adds these children at native size and in display-list order.
  ctx.drawImage(images.walk, sourceX, sourceY, 100, 100, x + 8, y + 75, 100, 100);
  ctx.drawImage(images.shadow, x + 10, y + 120);
  ctx.drawImage(images.body, x + 3, y);
  // FaceMatchCard is placed at (47, 60); its SWF bounds are x=-38..40,
  // y=-60..62. The exported 78×122 bitmap therefore starts at (x+9, y).
  const duration = zombie.flipDirection === 'front' ? content.flipFrontSeconds : content.flipBackSeconds;
  const progress = zombie.flipDirection ? Math.min(1, (elapsed + flipOffset - zombie.flipStart) / duration) : 0;
  const showingFront = zombie.flipDirection === 'front' ? progress > 0.5 :
    zombie.flipDirection === 'back' ? progress <= 0.5 : zombie.front;
  const angle=zombie.flipDirection==='front'?180*(1-progress):
    zombie.flipDirection==='back'?180*progress:zombie.front?0:180;
  // ZombieCard.init adds the centered glyph to FaceMatchCard, so the glyph
  // follows the paper's rotation when onUpdate makes it visible.
  drawMatchCard(showingFront ? matchFrontTexture(zombie.type) : images.cardBack,x+47,y+60+bob,angle);
  ctx.drawImage(images.hand, x + 4, y + 50+bob);
}

function drawDying(zombie) {
  const frame = Math.min(content.deathFrames - 1,
                         Math.floor(deathAge(zombie) * 1000 / content.deathStepMs));
  const [tileWidth, tileHeight] = content.deathTile;
  ctx.drawImage(images.death,
                (frame % content.deathColumns) * tileWidth,
                Math.floor(frame / content.deathColumns) * tileHeight,
                tileWidth, tileHeight,
                zombie.x, zombie.y - 14, tileWidth, tileHeight);
}

function drawGuide() {
  if (!guidePhase) return;
  if (guidePhase === 'spotlight') {
    const zombie = zombies[guideStep];
    if (zombie) {
      // ZombieMatch.showGuide places guideMC at (x+20,y-50), then the
      // arrow at (x+50,y+65), relative to the highlighted zombie.
      ctx.drawImage(images.guideMask, zombie.x + 20 - 1527,
        zombie.y - 50 - 1079, 3613, 2049);
    }
  }
  // FaceMatchGame places talk_mc at (58,193.9); its visible bounds begin
  // seven pixels to the right. Frame 1 introduces Match, frame 2 ends it.
  guideArt.draw(ctx,guidePhase === 'outro' ? 2 : 1,58,193.9,guideArtStartedAt);
}
function guideArrowAt(){
  const zombie=guidePhase==='spotlight'?zombies[guideStep]:null;
  const position=zombie?{x:zombie.x+50,y:zombie.y+65}:retainedGuideArrow;
  if(!position)return null;
  const frame=Math.floor(Math.max(0,performance.now()-(guideArrowStartedAt??performance.now()))*30/1000)%images.guideArrow.length;
  return {image:images.guideArrow[frame],...position};
}

function draw() {
  if (!images || document.hidden) return;
  ctx.clearRect(0, 0, 1024, 768);
  ctx.drawImage(images.background, 0, 0, 1024, 768);
  for(const zombie of [...zombies,...dying].sort((a,b)=>(a.depth??0)-(b.depth??0))){
    if(zombie.isDying)drawDying(zombie);else drawZombie(zombie);
  }
  pauseTrigger.draw(ctx,images.pause);
  audioTrigger.draw(ctx,audioEnabled ? images.musicOn : images.musicOff);
  drawGuide();
  if (mode === 'won' || mode === 'lost')
    PvzMinigameResult.draw(ctx, resultArt, mode === 'won', resultStartedAt, true, resultButtons);
  if (mode === 'lost') PvzMinigameResult.drawAttack(ctx, images.attack, resultStartedAt);
  if (mode === 'paused'||resultPauseVisible) {ctx.drawImage(images.pausePanel, 0, 0, 1024, 768);pauseButtons.draw(ctx);pauseSliders.draw(ctx);}
  const arrow=guideArrowAt();if(arrow)ctx.drawImage(arrow.image,arrow.x,arrow.y);
  if (mode === 'paused'||resultPauseVisible) miniHelp.draw(ctx);
  miniConfirm.draw(ctx);
}

function animateResult() {
  if (mode !== 'winning' && mode !== 'won' && mode !== 'lost') return;
  if(document.hidden){resultFrameId=requestAnimationFrame(animateResult);return;}
  pruneDying();
  draw();
  if (mode === 'winning' || mode === 'lost' || performance.now() - resultStartedAt < 1100)
    resultFrameId = requestAnimationFrame(animateResult);
}
function deathAge(zombie){
  if(zombie.deathFrozen)return zombie.frozenDeathAge||0;
  const resultTime=['winning','won','lost'].includes(mode)?Math.max(0,performance.now()-resultDeathStartedAt)/1000:0;
  return Math.max(0,elapsed-zombie.deathStart+(zombie.deathPauseOffset||0)+(zombie.deathPhase||0)+resultTime);
}
function pruneDying(){
  dying=dying.filter(zombie=>deathAge(zombie)<content.deathFrames*content.deathStepMs/1000);
}

function spawnWave(bornAt = elapsed) {
  const row = content.rows[waveIndex];
  row.forEach((type, lane) => {
    if (type) zombies.push({type, depth:++zombieDepth, x: content.spawnX,
                            y: content.laneY[lane], front: false,
                            flipDirection: null, flipStart: 0,
                            bornAt, bornClock:bornAt+flipOffset, birthEnabled: true, walkPhase: null});
  });
  waveIndex += 1;
  progressLabel.textContent = `${waveIndex} / ${content.rows.length} 轮`;
  if (row.some(Boolean)) message.textContent = `第 ${waveIndex} 轮僵尸出现，找出相同的字母牌。`;
}

function resolvePair() {
  if (selected.length !== 2) return;
  const [first, second] = selected;
  if (first.type === second.type) {
    zombies = zombies.filter(item => item !== first && item !== second);
    dying.push(...[first,second].map(zombie=>({...zombie,isDying:true,deathStart:elapsed,
      deathPhase:deathTimerPhase(zombie,elapsed+flipOffset),
      deathPauseOffset:0,deathFrozen:mode==='paused'})));
    matchedPairs += 1;
    message.textContent = `配对成功：${labelOf(first.type)}，已完成 ${matchedPairs} 对。`;
  } else {
    first.flipDirection = second.flipDirection = 'back';
    first.flipStart = second.flipStart = elapsed + flipOffset;
    misses += 1;
    message.textContent = '字母不同，再试一次。';
  }
  selected = [];
  // check() calls success as soon as the last wave's active array is empty;
  // the removed zombies' death timers are independent of that condition.
  if(waveIndex===content.rows.length&&!zombies.length)end(true);
}

function advanceFlips(){
  const independentTime=elapsed+flipOffset;
  if(guidePending&&independentTime>=2)beginGuide();
  if(guideOutroAt!==null&&independentTime>=guideOutroAt)beginGuideOutro();
  for(const zombie of zombies){
    if(!zombie.flipDirection)continue;
    const duration=zombie.flipDirection==='front'?content.flipFrontSeconds:content.flipBackSeconds;
    if(elapsed+flipOffset-zombie.flipStart+1e-9>=duration){
      zombie.front=zombie.flipDirection==='front';zombie.flipDirection=null;
    }
  }
  if(selected.length===2&&selected.every(zombie=>zombie.front&&!zombie.flipDirection))resolvePair();
}
function hasPausedWork(){
  return !!guidePhase||!!retainedGuideArrow||guidePending||guideOutroAt!==null||zombies.some(zombie=>zombie.flipDirection)||
    dying.some(zombie=>!zombie.deathFrozen);
}
function advancePausedFlips(now){
  if(!pausedFlipLast)return;
  const dt=Math.max(0,now-pausedFlipLast)/1000;
  flipOffset+=dt;
  for(const zombie of dying)if(!zombie.deathFrozen)zombie.deathPauseOffset+=dt;
  pausedFlipLast=now;
  advanceFlips();
  pruneDying();
}
function animatePausedFlips(now){
  if(mode!=='paused')return;
  if(document.hidden){pausedFlipFrame=requestAnimationFrame(animatePausedFlips);return;}
  advancePausedFlips(now);draw();
  if(mode==='paused'&&hasPausedWork())pausedFlipFrame=requestAnimationFrame(animatePausedFlips);
  else pausedFlipFrame=0;
}
function deathTimerPhase(zombie,now){
  if(!Number.isFinite(zombie.bornClock))return 0;
  return (Math.max(0,now-zombie.bornClock)*1000%30)/1000;
}
function movingWalkTicks(ticks){
  const n=Math.max(0,ticks);
  return Math.floor(n/63)*51+Math.max(0,n%63-11);
}
function walkBob(phase,ticks){
  const prefix=n=>{
    const count=(lo,hi)=>Math.max(0,Math.min(n,hi)-lo+1);
    return 0.5*(count(5,19)-count(21,35)+count(41,49)-count(51,59));
  };
  return prefix((phase+Math.max(0,ticks))%63)-prefix(phase);
}
function loop(now) {
  if (mode !== 'playing') return;
  if(document.hidden){lastTick=0;frameId=requestAnimationFrame(loop);return;}
  const realDt = Math.max(0,(now - (lastTick || now)) / 1000);
  lastTick = now;
  const wasGuiding=guidePhase==='spotlight';
  const guideStartsNow=guidePending&&elapsed<2&&elapsed+realDt>=2;
  elapsed += realDt;
  advanceFlips();if(mode!=='playing')return;
  while (waveIndex < content.rows.length && elapsed >= nextWaveAt) {
    // Native Timer keeps ticking, but it skips a wave while talk_mc is visible.
    if (!guidePhase) spawnWave(nextWaveAt);
    nextWaveAt += content.spawnIntervalMs / 1000;
  }
  for (const zombie of zombies) {
    const ageSteps = Math.floor((elapsed - zombie.bornAt) * 1000 / 30);
    if(zombie.birthEnabled&&ageSteps<15)continue;
    if(zombie.walkPhase===null)zombie.walkPhase=Math.floor(Math.random()*63);
    const walkSteps = ageSteps-(zombie.birthEnabled?15:0);
    const previous=zombie.walkSteps||0;
    let movingUntil=walkSteps;
    if(wasGuiding)movingUntil=previous;
    else if(guideStartsNow)movingUntil=Math.min(walkSteps,Math.floor((2-zombie.bornAt)*1000/30)-(zombie.birthEnabled?15:0));
    movingUntil=Math.max(previous,movingUntil);
    const phase=zombie.walkPhase||0;
    zombie.x-=content.speedPerFrame*(movingWalkTicks(phase+movingUntil)-movingWalkTicks(phase+previous));
    zombie.walkSteps=walkSteps;
    if (zombie.x < content.lossX) { end(false); return; }
  }
  pruneDying();
  if (mode === 'playing') {
    draw();
    frameId = requestAnimationFrame(loop);
  }
}

let suspendedMusicSrc=null;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(!music.paused){suspendedMusicSrc=music.src;music.pause();}
  }else if(suspendedMusicSrc){
    const src=suspendedMusicSrc;suspendedMusicSrc=null;
    if(music.src===src && ['playing','transition','guide','paused'].includes(mode))
      music.play().catch(()=>{});
  }else if(!document.hidden)playMusic();
});
document.addEventListener('visibilitychange',()=>{
  lastTick=0;
  const now=performance.now();
  if(document.hidden){if(hiddenAt===null)hiddenAt=now;pausedFlipLast=0;}
  else if(hiddenAt!==null){
    const shift=start=>start+Math.max(0,now-Math.max(hiddenAt,start));
    if(['winning','won','lost'].includes(mode)){resultStartedAt=shift(resultStartedAt);resultDeathStartedAt=shift(resultDeathStartedAt);}
    if(guidePhase)guideArtStartedAt=shift(guideArtStartedAt);
    if(guideArrowStartedAt!==null)guideArrowStartedAt=shift(guideArrowStartedAt);
    if(mode==='paused')pausedFlipLast=now;
    hiddenAt=null;
  }
});

function start() {
  if(guideArrowStartedAt===null)guideArrowStartedAt=performance.now();
  const arrow=guideArrowAt();if(arrow)retainedGuideArrow={x:arrow.x,y:arrow.y};
  // release() removes only the active array; older dying display children
  // continue through init() on the same container.
  const survivingDeaths=dying.map(zombie=>({zombie,age:deathAge(zombie)}))
    .filter(({zombie,age})=>zombie.deathFrozen||age<content.deathFrames*content.deathStepMs/1000);
  clearTimeout(successTimer);successTimer=0;
  PvzMinigameStorageNotice.clear();
  gameplayClick.reset();
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
  resultPauseVisible=false;
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(pausedFlipFrame);pausedFlipFrame=0;pausedFlipLast=0;flipOffset=0;
  cancelAnimationFrame(resultFrameId);
  effect.pause();
  effect.currentTime = 0;
  music.pause();
  music.currentTime = 0;
  zombies = [];
  dying=survivingDeaths.map(({zombie,age})=>{
    zombie.deathStart=(zombie.deathPauseOffset||0)+(zombie.deathPhase||0)-age;
    return zombie;
  });
  selected = [];
  waveIndex = 0;
  elapsed = 0;
  nextWaveAt = content.spawnIntervalMs / 1000;
  letters = shuffledLetters();
  matchedPairs = 0;
  misses = 0;
  guideAudio.pause();
  guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  guidePending = !nativeGuided;
  guidePhase = null;
  guideStep = 0;
  guideReady = false;
  guideOutroAt = null;
  // ZombieMatch.init invokes onMatchTimerHandler once immediately, then
  // lets the five-second Timer fire from the start of this run.
  spawnWave();
  mode = 'playing';
  lastTick = 0;
  overlay.hidden = true;
  pauseButton.disabled = false;
  soundButton.disabled = false;
  pauseButton.textContent = 'Ⅱ 暂停';
  restartButton.disabled = false;
  progressLabel.textContent = `0 / ${content.rows.length} 轮`;
  message.textContent = '第一轮僵尸已出现。翻开两张相同字母的牌。';
  draw();
  playMusic();
  frameId = requestAnimationFrame(loop);
}

function end(won) {
  const arrow=guideArrowAt();if(arrow)retainedGuideArrow={x:arrow.x,y:arrow.y};
  resultPauseVisible=mode==='paused';
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(pausedFlipFrame);pausedFlipFrame=0;pausedFlipLast=0;
  music.pause();
  guideAudio.pause();
  guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  // gameOver calls release() before either result branch. Previously removed
  // dying zombies keep their independent timers.
  zombies=[];selected=[];guidePhase=null;guidePending=false;guideOutroAt=null;
  mode = won ? 'winning' : 'lost';
  resultStartedAt = performance.now();
  resultDeathStartedAt = resultStartedAt;
  pauseButton.disabled = true;
  if (won) {
    overlay.hidden = true;
    draw();
    resultFrameId=requestAnimationFrame(animateResult);
    // gameOver(true) schedules success after 1000 ms.
    successTimer=setTimeout(()=>{
      successTimer=0;if(mode!=='winning')return;
      mode='won';resultStartedAt=performance.now();
      try { localStorage.setItem('pvz-pinyin-match-won', '1'); } catch { PvzMinigameStorageNotice.show(); }
      effect.src=content.sounds.win;effect.volume=PvzVolume.volume('effects');effect.play().catch(()=>{});
      message.textContent='本局完成';draw();cancelAnimationFrame(resultFrameId);resultFrameId=requestAnimationFrame(animateResult);
    },1000);
    return;
  }
  overlay.hidden = true;
  effect.src = won ? content.sounds.win : content.sounds.fail;
  effect.volume=PvzVolume.volume('effects');
  effect.play().catch(() => {});
  message.textContent = won ? '本局完成' : '本局结束';
  draw();
  resultFrameId = requestAnimationFrame(animateResult);
}

const miniConfirm=new PvzMinigameConfirm(canvas,{isPaused:()=>mode==='paused'||mode==='won'||mode==='lost'||resultPauseVisible,
  redraw:()=>{if(images)draw();},replay:()=>start(),exit:()=>{location.href='game.html?world=1';}});
const resultButtons=new PvzMinigameResultButtons(canvas,{
  isActive:()=>(mode==='won'||mode==='lost')&&!resultPauseVisible&&!miniConfirm.active,
  isWon:()=>mode==='won',redraw:()=>{if(images)draw();},
  activate:action=>{if(action==='finish')location.href='game.html?world=2';else miniConfirm.show(action);},
});
const miniHelp=new PvzMinigameHelp(canvas,{number:1,isPaused:()=>(mode==='paused'||resultPauseVisible)&&!miniConfirm.active,redraw:()=>{if(images)draw();}});
const pauseButtons=new PvzMinigamePauseButtons(canvas,{
  isActive:()=>(mode==='paused'||resultPauseVisible)&&!miniHelp.active&&!miniConfirm.active,
  redraw:()=>{if(images)draw();},
  activate:action=>{
    if(action==='help'){miniHelp.open();return;}
    if(action==='continue'){
      if(resultPauseVisible){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();draw();}
      else resume();
      return;
    }
    miniConfirm.show(action);
  },
});
const pauseTrigger=new PvzMinigamePauseTrigger(canvas,{
  isActive:()=>(mode==='playing')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(images)draw();},activate:()=>pauseButton.click(),
});
const audioTrigger=new PvzMinigamePauseTrigger(canvas,{
  kind:'audio',enabled:()=>audioEnabled,
  isActive:()=>(mode==='playing')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(images)draw();},activate:()=>{soundButton.click();},
});
const pauseSliders=new PvzPauseSliders(canvas,{
  isActive:()=>(mode==='paused'||resultPauseVisible)&&!miniHelp.active&&!miniConfirm.active,redraw:()=>{if(images)draw();},
  onChange:channel=>{if(channel==='music'){audioEnabled=PvzVolume.enabled('music');
    soundButton.textContent=audioEnabled?'♫ 音乐开':'♪ 音乐关';music.volume=PvzVolume.volume('music');}
    else effect.volume=PvzVolume.volume('effects');},
});
function matchBitmapHit(image,x,y,left,top,width=image.width,height=image.height){
  return x>=left&&x<left+width&&y>=top&&y<top+height;
}
function matchZombieHit(item,x,y){
  const age=Math.floor((elapsed-item.bornAt)*1000/30);
  if(item.birthEnabled&&age<15)return false;
  const ticks=age-(item.birthEnabled?15:0),phase=item.walkPhase||0;
  const bob=walkBob(phase,ticks);
  if(x>=item.x+9&&x<=item.x+87&&y>=item.y+bob&&y<=item.y+bob+122)return true;
  // The click listener belongs to the Zombie Sprite, whose body, hand,
  // shadow and walking bitmap are also part of its display list.
  return matchBitmapHit(images.body,x,y,item.x+3,item.y)||
    matchBitmapHit(images.hand,x,y,item.x+4,item.y+50+bob)||
    matchBitmapHit(images.shadow,x,y,item.x+10,item.y+120)||
    matchBitmapHit(images.walk,x,y,item.x+8,item.y+75,100,100);
}
function matchTargetAt(x,y){
  if (guidePhase === 'outro' || guidePhase === 'closing') return null;
  if(guidePhase==='spotlight'){
    const target=zombies[guideStep];
    // Allow the whole highlighted zombie to be selected. The spotlight is
    // centred above it, so limiting hits to the visible hole leaves most of
    // the card inaccessible, particularly on touchscreens.
    return target&&matchZombieHit(target,x,y)?target:null;
  }
  for(const item of [...zombies,...dying].sort((a,b)=>(b.depth??0)-(a.depth??0))){
    if(item.isDying){
      const [width,height]=content.deathTile;
      if(x>=item.x&&x<item.x+width&&y>=item.y-14&&y<item.y-14+height)return null;
    }else if(item.birthEnabled&&Math.floor((elapsed-item.bornAt)*1000/30)<15){
      const ticks=Math.floor((elapsed-item.bornAt)*1000/30);
      // Before the first tick the Match Bitmap has no BitmapData.
      if(ticks>0&&x>=item.x-75&&x<item.x+165&&y>=item.y-60&&y<item.y+180){
        return null;
      }
    }else if(matchZombieHit(item,x,y))return item;
  }
  return null;
}
function selectMatchZombie(zombie){
  if (!zombie) return;
  // A card already being flipped still covers cards behind it.
  if (zombie.flipDirection) return;
  if (guidePhase === 'spotlight') {
    // A tap is also a valid way to advance while the introductory voice is
    // still playing or awaiting browser audio permission.
    guideReady=true;
    if(!guideClicked(zombie))return;
  }
  if(zombie.birthEnabled&&Math.floor((elapsed-zombie.bornAt)*1000/30)<15){draw();return;}
  if (zombie.front) {
    const index=selected.indexOf(zombie);
    if(index<0)return;
    selected.splice(index,1);
    zombie.flipDirection='back';
    zombie.flipStart=elapsed+flipOffset;
    message.textContent='已取消选择。';
    draw();
    return;
  }
  if (selected.length >= 2) return;
  zombie.flipDirection = 'front';
  zombie.flipStart = elapsed + flipOffset;
  selected.push(zombie);
  message.textContent = selected.length === 1 ? '第一张已翻开，再选一张。' : '正在核对两张牌…';
  draw();
}
const gameplayClick=new PvzMinigameGameClick(canvas,{
  isActive:()=>mode==='playing'&&!resultPauseVisible&&!miniHelp.active&&!miniConfirm.active,
  targetAt:matchTargetAt,token:()=>`${guidePhase}:${guideStep}`,activate:selectMatchZombie,
});
canvas.addEventListener('pointerdown',event=>{
  if(miniHelp.active||miniConfirm.active)return;
  const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
  const block=()=>{event.preventDefault();event.stopImmediatePropagation();};
  if(mode==='playing'&&!resultPauseVisible&&guidePhase==='spotlight'){
    const target=zombies[guideStep];
    if(target&&matchZombieHit(target,x,y))return;
  }
  const arrow=guideArrowAt();
  if(arrow&&PvzGuideHit.image(arrow.image,x-arrow.x,y-arrow.y)){block();return;}
  if(mode!=='playing'||resultPauseVisible||!guidePhase)return;
  if(PvzGuideHit.talk(guideArt,guidePhase==='outro'?2:1,x,y,58,193.9,guideArtStartedAt)){block();return;}
  if(guidePhase==='spotlight'){
    const target=zombies[guideStep];
    if(!target||!PvzGuideHit.contains(ctx,x,y,target.x+20,target.y-50))block();
  }
},{capture:true});
canvas.addEventListener('pointerdown', event => {
  if(resultPauseVisible){
    const bounds=canvas.getBoundingClientRect();
    const x=(event.clientX-bounds.left)*1024/bounds.width;
    const y=(event.clientY-bounds.top)*768/bounds.height;
    const action=PvzMinigameConfirm.pauseAction(x,y);
    if(action==='continue'){
      resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();draw();
    }else if(action)miniConfirm.show(action);
    return;
  }
  if (mode === 'won' || mode === 'lost') {
    PvzMinigameResult.click(canvas, event, mode === 'won', {
      exit: () => miniConfirm.show('exit'), replay: () => miniConfirm.show('replay'),
      finish: () => { location.href = 'game.html?world=2'; },
    });
    return;
  }
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * 1024 / bounds.width;
  const y = (event.clientY - bounds.top) * 768 / bounds.height;
  // The full-stage pause layer blocks controls behind it.
  if (mode === 'paused') return;
  if ((mode === 'playing' || mode === 'paused') && y >= 10 && y <= 78) {
    if (x >= 10 && x <= 78) { pauseButton.click(); return; }
    if (x >= 946 && x <= 1014) { soundButton.click(); return; }
  }
  if (mode !== 'playing') return;
  gameplayClick.down(event);
});

function resume() {
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
  advancePausedFlips(performance.now());cancelAnimationFrame(pausedFlipFrame);pausedFlipFrame=0;pausedFlipLast=0;
  if(resultPauseVisible){resultPauseVisible=false;draw();return;}
  mode = 'playing';
  overlay.hidden = true;
  pauseButton.textContent = 'Ⅱ 暂停';
  lastTick = 0;
  playMusic();
  if (guideNeedsGesture)tryGuideSound();
  draw();
  frameId = requestAnimationFrame(loop);
}
pauseButton.addEventListener('click', () => {
  if (mode === 'playing') {
    gameplayClick.reset();
    mode = 'paused';
    cancelAnimationFrame(frameId);
    pausedFlipLast=performance.now();
    if(hasPausedWork()){
      pausedFlipFrame=requestAnimationFrame(animatePausedFlips);
    }
    music.volume=0;
    pauseButton.textContent = '▶ 继续';
    draw();
  } else if (mode === 'paused') resume();
});
restartButton.addEventListener('click', start);
soundButton.addEventListener('click', () => {
  audioEnabled = PvzVolume.toggleMusic();
  soundButton.textContent = audioEnabled ? '♫ 音乐开' : '♪ 音乐关';
  music.volume=PvzVolume.volume('music');
  if (music.paused) playMusic();
  draw();
});
window.addEventListener('storage', event => {
  if(!['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key))return;
  audioEnabled=PvzVolume.enabled('music');music.volume=PvzVolume.volume('music');
  if(images)draw();
});

fetch('match-assets.json').then(response => {
  if (!response.ok) throw new Error(`资源清单读取失败：HTTP ${response.status}`);
  return response.json();
}).then(async manifest => {
  content = manifest;
  music.src = manifest.sounds.fight;
  music.loop = true;
  const names = ['background', 'body', 'hand', 'walk', 'death', 'attack', 'create', 'shadow', 'glyphSheet',
    'cardBack', 'cardFront', 'pause', 'musicOn', 'musicOff', 'pausePanel'];
  const loaded = await Promise.all(names.map(name => loadImage(manifest[name])));
  images = Object.fromEntries(names.map((name, index) => [name, loaded[index]]));
  images.guideMask = await loadImage(manifest.guide.mask);
  images.guideTalk = await Promise.all(manifest.guide.talk.map(loadImage));
  images.guideArrow = await Promise.all(manifest.guide.arrow.map(loadImage));
  guideArt = await PvzGuideArt.load();
  resultArt = await PvzMinigameResult.load();
  start();
  document.addEventListener('pointerdown', () => {
    if (mode !== 'playing') return;
    if (music.paused) playMusic();
    if (guideNeedsGesture)tryGuideSound();
  }, {capture:true});
}).catch(error => {
  mode = 'error';
  setOverlay('加载失败', error.message, '重试', () => location.reload());
});
