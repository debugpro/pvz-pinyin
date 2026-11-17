'use strict';

const canvas = document.querySelector('#joint-canvas');
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
const music = new Audio();
const effect = new Audio();
const pronunciation = new Audio();
let pronunciationAttempt=0,pronunciationNeedsGesture=false;
let suspendedPronunciationAttempt=null,pronunciationPlayPending=false;
const guideAudio = new Audio();
let guideNeedsGesture = false;
let guideAttempt = 0;
let guideArt;
let guideArtStartedAt = 0;
let guideArrowStartedAt = null;
let retainedGuideArrow = null;
let content;
let images;
let words = [];
let cards = [];
let zombies = [];
let dying = [];
let lastDyingPair = [];
let zombieDepth = 0;
let selected = [];
let nextCard = 1;
let waveIndex = 0;
let completed = 0;
let misses = 0;
let elapsed = 0;
let independentOffset=0,pausedIndependentLast=0,pausedIndependentFrame=0;
let resolveAt = null;
let winAt = null;
let nextWaveAt = 5;
let guidePending = false;
let guidePhase = null;
let guideStep = 0;
let guideOutroAt = null;
// Gate.onSel passes `played` from this gate's saved score. showGuide sets
// the flag after the zombie and card tutorial picks, for this instance's replays only.
let nativePlayed = (() => {
  try { return localStorage.getItem('pvz-pinyin-joint-won') === '1'; }
  catch { return false; }
})();
let mode = 'loading';
let lastTick = 0;
let frameId = 0;
let audioEnabled = PvzVolume.enabled('music');
let resultArt;
let resultStartedAt = 0;
let resultDeathStartedAt = 0;
let hiddenAt=document.hidden?performance.now():null;
let resultFrameId = 0;
let successTimer = 0;
let resultPauseVisible=false;

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

function shuffleOriginal(entries) {
  return shuffleSessionPool('joint', entries, 20);
}

function playMusic() {
  if(document.hidden || mode !== 'playing')return;
  music.volume=PvzVolume.volume('music');
  music.play().catch(() => {});
}

function playPronunciation(path) {
  if (!path) return;
  pronunciationAttempt++;pronunciationNeedsGesture=false;
  pronunciation.src = path;
  pronunciation.currentTime = 0;
  tryPronunciation();
}
function tryPronunciation(){
  const attempt=++pronunciationAttempt;
  pronunciationNeedsGesture=false;
  if(document.hidden){suspendedPronunciationAttempt=attempt;return;}
  pronunciationPlayPending=true;
  pronunciation.play().then(()=>{if(attempt===pronunciationAttempt)pronunciationPlayPending=false;}).catch(error=>{
    if(attempt===pronunciationAttempt)pronunciationPlayPending=false;
    if(attempt===pronunciationAttempt&&error?.name==='NotAllowedError')pronunciationNeedsGesture=true;
  });
}
function stopPronunciation(){
  pronunciationAttempt++;suspendedPronunciationAttempt=null;pronunciationPlayPending=false;pronunciationNeedsGesture=false;pronunciation.pause();
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(!pronunciation.paused||pronunciationPlayPending){pronunciation.pause();pronunciationPlayPending=false;suspendedPronunciationAttempt=++pronunciationAttempt;}
  }else if(suspendedPronunciationAttempt!==null){
    const attempt=suspendedPronunciationAttempt;suspendedPronunciationAttempt=null;
    if(attempt===pronunciationAttempt)tryPronunciation();
  }
});
document.addEventListener('pointerdown',()=>{
  if(pronunciationNeedsGesture)tryPronunciation();
},{passive:true});

function playWord(word) {
  playPronunciation(word?.sound);
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
  retainedGuideArrow = null;
  guideStep = 0;
  guidePhase = 'speech';
  playGuideSound(content.sounds.guideGame2, () => {
    if (guidePhase !== 'speech') return;
    guideStep = 1;
    guidePhase = 'spotlight';
    draw();
  });
  draw();
}

function guideZombieClicked(zombie) {
  if (guidePhase !== 'spotlight' || guideStep !== 1 || zombie !== zombies[0]) return false;
  guideStep = 2;
  return true;
}

function guideCardClicked(card) {
  if (guidePhase !== 'spotlight' || guideStep !== 2 || card !== cards[2]) return false;
  guideStep = 3;
  nativePlayed = true;
  guidePhase = 'closing';
  retainedGuideArrow = null;
  guideOutroAt = elapsed + independentOffset + 3;
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

function addCard(entering = false) {
  if (nextCard > 10) return;
  const y = 98 + cards.length * 126;
  // ZombieJoint.careateCard uses TweenLite.from(y:800, duration:2) for
  // replacement cards; the five cards created at start have no tween.
  cards.push({word: words[nextCard], fromY: entering ? 800 : y, toY: y,
    moveStart: entering ? elapsed+independentOffset : null, moveDuration: entering ? 2 : 0});
  nextCard += 1;
}

function cardY(card) {
  if (card.moveStart === null) return card.toY;
  // The original passes Linear.easeNone to both TweenLite.from and .to.
  const progress = Math.max(0, Math.min(1, (elapsed+independentOffset - card.moveStart) / card.moveDuration));
  return card.fromY + (card.toY - card.fromY) * progress;
}

function drawCard(card) {
  const y = cardY(card);
  ctx.drawImage(images.card, 0, y, 216, 126);
  ctx.fillStyle = '#993300';
  ctx.font = '60px PvzJoint';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // FaceJointCard's editable text box begins at (42,29.35), has width 128
  // and height 64.15, and uses centered 60 px GB Pinyinok-C text.
  ctx.fillText(card.word.code, 104, y + 61.4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawZombie(zombie) {
  const ageTicks = Math.floor((elapsed - zombie.bornAt) * 1000 / content.walkStepMs);
  if(zombie.birthEnabled&&ageTicks<15){
    const frame=ageTicks%4===3?ageTicks-1:ageTicks;
    ctx.drawImage(images.create,(frame%4)*240,Math.floor(frame/4)*240,240,240,zombie.x-75,zombie.y-60,240,240);
    return;
  }
  const ticks = ageTicks-(zombie.birthEnabled?15:0);
  const frame = ticks ? ((zombie.walkPhase || 0) + ticks) % 63 : 0;
  const bob = walkBob(zombie.walkPhase || 0, ticks);
  const sourceX = (frame % 10) * 100;
  const sourceY = Math.floor(frame / 10) * 100;
  const x = zombie.x, y = zombie.y;
  // JointZombie.init places the walk bitmap at (8,75), body at (3,0),
  // FaceMatchCard at (47,60), and hand bitmap at (4,50). The card art's
  // SWF bounds are about (-38,-60)..(40,62) relative to its origin.
  ctx.drawImage(images.walk, sourceX, sourceY, 100, 100, x + 8, y + 75, 100, 100);
  ctx.drawImage(images.body, x + 3, y, 83, 101);
  ctx.drawImage(zombie.selected ? images.zombieCardSelected : images.zombieCard,
    x + 47 - 38, y + bob, 78, 122);
  ctx.fillStyle = '#993300';
  ctx.font = '60px PvzJoint';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(zombie.half, x + 47, y + 60 + bob);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.drawImage(images.hand, x + 4, y + 50 + bob, 88, 26);
}

function drawDyingZombie(zombie) {
  const frame = Math.min(content.deathFrames - 1,
    Math.floor(deathAge(zombie) * 1000 / content.deathStepMs));
  const [width, height] = content.deathTile;
  ctx.drawImage(images.death, (frame % content.deathColumns) * width,
    Math.floor(frame / content.deathColumns) * height, width, height,
    zombie.x - 70, zombie.y - 14, width, height);
}

function deathAge(zombie) {
  if (zombie.deathFrozen) return 0;
  const resultTime = ['winning','won','lost'].includes(mode)
    ? Math.max(0, performance.now() - resultDeathStartedAt) / 1000 : 0;
  return Math.max(0, elapsed + independentOffset - zombie.deathStart + (zombie.deathPhase||0) + resultTime);
}

function pruneDying() {
  dying = dying.filter(zombie => deathAge(zombie) <
    content.deathFrames * content.deathStepMs / 1000);
}

function drawGuide() {
  if (!guidePhase) return;
  if (guidePhase === 'spotlight' || guidePhase === 'speech') {
    const zombie = guideStep === 1 ? zombies[0] : null;
    const card = guidePhase === 'speech' ? cards[0] : guideStep === 2 ? cards[2] : null;
    if (zombie || card) {
      // Opening narration highlights card 0; later steps highlight zombie 0
      // and card 2. The mask origin is offset by (50,50) or (107,55).
      const x = zombie ? zombie.x : 0;
      const y = zombie ? zombie.y : cardY(card);
      const maskX = zombie ? 50 : 107;
      const maskY = zombie ? 50 : 55;
      ctx.drawImage(images.guideMask, x + maskX - 1527,
        y + maskY - 1079, 3613, 2049);
    }
  }
  // FaceGameJoint places talk_mc at (58,193.9); its rendered bounds start
  // 7 px to the right. Frame 3 introduces Joint, frame 2 ends the guide.
  guideArt.draw(ctx,guidePhase === 'outro' ? 2 : 3,58,193.9,guideArtStartedAt);
}
function guideArrowAt(){
  // showGuide's initial speech branch hides the existing root arrow; it is
  // shown again when the narration advances to the first spotlight.
  if(guidePhase==='speech')return null;
  const zombie=guidePhase==='spotlight'&&guideStep===1?zombies[0]:null;
  const card=guidePhase==='spotlight'&&guideStep===2?cards[2]:null;
  const position=zombie?{x:zombie.x+20,y:zombie.y-50}:
    card?{x:20,y:cardY(card)-50}:retainedGuideArrow;
  if(!position)return null;
  const frame=Math.floor(Math.max(0,performance.now()-(guideArrowStartedAt??performance.now()))*30/1000)%images.guideArrow.length;
  return {image:images.guideArrow[frame],...position};
}

function draw() {
  if (!images || document.hidden) return;
  ctx.clearRect(0, 0, 1024, 768);
  ctx.drawImage(images.background, 0, 0, 1024, 768);
  // FaceGameJoint places a black rail at (1,82), then tape sprite 3545.
  ctx.fillStyle = '#000';
  ctx.fillRect(1, 82, 227, 694);
  ctx.drawImage(images.tape, 0, 82);
  for (const card of cards) drawCard(card);
  // Both live and dying zombies remain in the same native display container.
  for (const zombie of [...zombies,...dying].sort((a,b)=>a.depth-b.depth)) {
    if(zombie.isDying)drawDyingZombie(zombie);else drawZombie(zombie);
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

function spawnWave(bornAt = elapsed) {
  content.rows[waveIndex].forEach((token, lane) => {
    if (token === '0') return;
    const [number, side] = token.split('_');
    const word = words[Number(number)];
    zombies.push({number: Number(number), side, depth: ++zombieDepth,
                  half: side === 'a' ? [...word.code][0] : [...word.code][1],
                  x: content.spawnX, y: content.laneY[lane],
                  bornAt, bornClock:bornAt+independentOffset, birthEnabled: true, walkPhase: null, selected: false});
  });
  waveIndex += 1;
  if (content.rows[waveIndex - 1].some(token => token !== '0')) {
    message.textContent = `第 ${waveIndex} 轮僵尸出现。依次选出一张拼音卡的两个字符。`;
  }
}

function resolvePair() {
  resolveAt = null;
  if (selected.length !== 2) return;
  const combined = selected.map(zombie => zombie.half).join('');
  const cardIndex = cards.findIndex(card => card.word.code === combined);
  if (cardIndex >= 0) {
    const word = cards.splice(cardIndex, 1)[0].word;
    cards.forEach((card, index) => {
      card.fromY = cardY(card);
      card.toY = 98 + index * 126;
      card.moveStart = elapsed+independentOffset;
      card.moveDuration = 1;
    });
    lastDyingPair=selected.map(zombie => ({...zombie,isDying:true,
      deathStart: elapsed + independentOffset,
      deathPhase: deathTimerPhase(zombie,elapsed+independentOffset), deathFrozen: mode === 'paused'}));
    dying.push(...lastDyingPair);
    zombies = zombies.filter(zombie => !selected.includes(zombie));
    completed += 1;
    playWord(word);
    addCard(true);
    message.textContent = `拼成 ${combined}，已完成 ${completed} / 10 组。`;
  } else {
    selected.forEach(zombie => { zombie.selected = false; });
    misses += 1;
    message.textContent = `${combined} 不在左侧卡列中，请按卡片重新组合。`;
  }
  selected = [];
  progressLabel.textContent = `${completed} / 10 组`;
  if (completed === 10 && !cards.length) winAt = elapsed+independentOffset+2.5;
}

function advanceIndependent(){
  const time=elapsed+independentOffset;
  if(guidePending&&time>=2)beginGuide();
  if(guideOutroAt!==null&&time>=guideOutroAt)beginGuideOutro();
  if(resolveAt!==null&&time+1e-9>=resolveAt)resolvePair();
  pruneDying();
  if(winAt!==null&&time+1e-9>=winAt){winAt=null;end(true);}
}
function advancePausedIndependent(now){
  if(!pausedIndependentLast)return;
  independentOffset+=Math.max(0,now-pausedIndependentLast)/1000;
  pausedIndependentLast=now;advanceIndependent();
}
function hasIndependentWork(){
  const time=elapsed+independentOffset;
  return !!guidePhase||!!retainedGuideArrow||guidePending||guideOutroAt!==null||resolveAt!==null||winAt!==null||dying.some(zombie=>!zombie.deathFrozen)||
    cards.some(card=>card.moveStart!==null&&time<card.moveStart+card.moveDuration);
}
function animatePausedIndependent(now){
  if(mode!=='paused')return;
  if(document.hidden){pausedIndependentFrame=requestAnimationFrame(animatePausedIndependent);return;}
  advancePausedIndependent(now);draw();
  if(mode==='paused'&&hasIndependentWork())pausedIndependentFrame=requestAnimationFrame(animatePausedIndependent);
  else pausedIndependentFrame=0;
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
  const realDt=Math.max(0,(now-(lastTick||now))/1000);
  lastTick = now;
  const wasGuiding=guidePhase==='speech'||guidePhase==='spotlight';
  const guideStartsNow=guidePending&&elapsed<2&&elapsed+realDt>=2;
  elapsed += realDt;
  advanceIndependent();if(mode!=='playing')return;
  while (waveIndex < content.rows.length && elapsed >= nextWaveAt) {
    // The native 5-second Timer keeps ticking during the guide, but
    // onMatchTimerHandler only spawns when talk_mc is hidden.
    if (!['speech', 'spotlight', 'closing', 'outro'].includes(guidePhase)) spawnWave(nextWaveAt);
    nextWaveAt += content.spawnIntervalMs / 1000;
  }
  for (const zombie of zombies) {
    const ageSteps = Math.floor((elapsed - zombie.bornAt) * 1000 / content.walkStepMs);
    if(zombie.birthEnabled&&ageSteps<15)continue;
    if(zombie.walkPhase===null)zombie.walkPhase=Math.floor(Math.random()*63);
    const walkSteps = ageSteps-(zombie.birthEnabled?15:0);
    const previous=zombie.walkSteps||0;
    let movingUntil=walkSteps;
    if(wasGuiding)movingUntil=previous;
    else if(guideStartsNow)movingUntil=Math.min(walkSteps,Math.floor((2-zombie.bornAt)*1000/content.walkStepMs)-(zombie.birthEnabled?15:0));
    movingUntil=Math.max(previous,movingUntil);
    const phase=zombie.walkPhase||0;
    zombie.x-=content.speedPerFrame*(movingWalkTicks(phase+movingUntil)-movingWalkTicks(phase+previous));
    zombie.walkSteps=walkSteps;
    if (zombie.x < content.lossX) { end(false); return; }
  }
  if (mode === 'playing') { draw(); frameId = requestAnimationFrame(loop); }
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
  if(document.hidden){if(hiddenAt===null)hiddenAt=now;pausedIndependentLast=0;}
  else if(hiddenAt!==null){
    const shift=start=>start+Math.max(0,now-Math.max(hiddenAt,start));
    if(['winning','won','lost'].includes(mode)){resultStartedAt=shift(resultStartedAt);resultDeathStartedAt=shift(resultDeathStartedAt);}
    if(guidePhase)guideArtStartedAt=shift(guideArtStartedAt);
    if(guideArrowStartedAt!==null)guideArrowStartedAt=shift(guideArrowStartedAt);
    if(mode==='paused')pausedIndependentLast=now;
    hiddenAt=null;
  }
});

function start() {
  if(guideArrowStartedAt===null)guideArrowStartedAt=performance.now();
  const arrow=guideArrowAt();if(arrow)retainedGuideArrow={x:arrow.x,y:arrow.y};
  // release() removes only the last pair; older dying children remain in the
  // same display container while start() resets the game clock.
  const survivingDeaths=dying.filter(zombie=>!lastDyingPair.includes(zombie))
    .map(zombie=>({zombie,age:deathAge(zombie)}))
    .filter(({zombie,age})=>zombie.deathFrozen||age<content.deathFrames*content.deathStepMs/1000);
  clearTimeout(successTimer);successTimer=0;
  PvzMinigameStorageNotice.clear();
  gameplayClick.reset();
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
  resultPauseVisible=false;cancelAnimationFrame(pausedIndependentFrame);pausedIndependentFrame=0;pausedIndependentLast=0;independentOffset=0;
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(resultFrameId);
  music.pause(); music.currentTime = 0;
  effect.pause(); effect.currentTime = 0;
  stopPronunciation();
  guideAudio.pause(); guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  words = shuffleOriginal(content.words);
  cards = [];
  zombies = [];
  dying = survivingDeaths.map(({zombie,age})=>{
    zombie.deathStart=(zombie.deathPhase||0)-age;
    return zombie;
  });
  lastDyingPair = [];
  selected = [];
  nextCard = 1;
  waveIndex = 0;
  completed = 0;
  misses = 0;
  elapsed = 0;
  resolveAt = null;
  winAt = null;
  nextWaveAt = content.spawnIntervalMs / 1000;
  guidePending = !nativePlayed;
  guidePhase = null;
  guideStep = 0;
  guideOutroAt = null;
  for (let i = 0; i < 5; i += 1) addCard();
  // ZombieJoint.start calls onMatchTimerHandler once immediately after
  // creating the five cards; subsequent timer ticks occur every 5 seconds.
  spawnWave();
  mode = 'playing';
  lastTick = 0;
  overlay.hidden = true;
  pauseButton.disabled = false;
  soundButton.disabled = false;
  restartButton.disabled = false;
  pauseButton.textContent = 'Ⅱ 暂停';
  progressLabel.textContent = '0 / 10 组';
  message.textContent = '第一轮僵尸已出现。请选择两个僵尸拼成左侧卡片上的拼音。';
  draw();
  playMusic();
  frameId = requestAnimationFrame(loop);
}

function end(won) {
  const arrow=guideArrowAt();if(arrow)retainedGuideArrow={x:arrow.x,y:arrow.y};
  resultPauseVisible=mode==='paused';
  cancelAnimationFrame(pausedIndependentFrame);pausedIndependentFrame=0;pausedIndependentLast=0;
  cancelAnimationFrame(frameId);
  music.pause();
  stopPronunciation();
  guideAudio.pause(); guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  // gameOver calls release() before either result branch. It removes active
  // zombies, the last dying pair and the remaining cards from their container.
  zombies=[];dying=dying.filter(zombie=>!lastDyingPair.includes(zombie));
  lastDyingPair=[];selected=[];cards=[];
  guidePending=false;guideOutroAt=null;resolveAt=null;winAt=null;
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
      try { localStorage.setItem('pvz-pinyin-joint-won', '1'); } catch { PvzMinigameStorageNotice.show(); }
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
  redraw:()=>{if(images)draw();},replay:()=>start(),exit:()=>{location.href='game.html?world=2';}});
const resultButtons=new PvzMinigameResultButtons(canvas,{
  isActive:()=>(mode==='won'||mode==='lost')&&!resultPauseVisible&&!miniConfirm.active,
  isWon:()=>mode==='won',redraw:()=>{if(images)draw();},
  activate:action=>{if(action==='finish')location.href='game.html?world=3';else miniConfirm.show(action);},
});
const miniHelp=new PvzMinigameHelp(canvas,{number:2,isPaused:()=>(mode==='paused'||resultPauseVisible)&&!miniConfirm.active,redraw:()=>{if(images)draw();}});
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
function jointBitmapHit(image,x,y,left,top,width=image.width,height=image.height){
  return x>=left&&x<left+width&&y>=top&&y<top+height;
}
function jointZombieHit(item,x,y){
  const age=Math.floor((elapsed-item.bornAt)*1000/content.walkStepMs);
  if(item.birthEnabled&&age<15)return false;
  const ticks=age-(item.birthEnabled?15:0),phase=item.walkPhase||0;
  const bob=walkBob(phase,ticks);
  if(x>=item.x+9&&x<=item.x+87&&y>=item.y+bob&&y<=item.y+bob+122)return true;
  return jointBitmapHit(images.body,x,y,item.x+3,item.y)||
    jointBitmapHit(images.hand,x,y,item.x+4,item.y+50+bob)||
    jointBitmapHit(images.walk,x,y,item.x+8,item.y+75,100,100);
}
function jointTargetAt(x,y){
  if (guidePhase === 'speech' || guidePhase === 'outro') return null;
  if(guidePhase==='spotlight'){
    const zombie=guideStep===1?zombies[0]:null,card=guideStep===2?cards[2]:null;
    if(!zombie&&!card)return null;
    const left=zombie?zombie.x:0,top=zombie?zombie.y:cardY(card);
    if(PvzGuideHit.talk(guideArt,3,x,y,58,193.9,guideArtStartedAt)||
       !PvzGuideHit.contains(ctx,x,y,left+(zombie?50:107),top+(zombie?50:55)))return null;
    const arrow=guideArrowAt();
    if(arrow&&PvzGuideHit.image(arrow.image,x-arrow.x,y-arrow.y))return null;
  }
  // A dead zombie loses its click listener but its bitmap remains in the
  // display list until its timer ends; it can still intercept a mouse hit.
  let zombie=null;
  for(const item of [...zombies,...dying].sort((a,b)=>(b.depth??0)-(a.depth??0))){
    if(item.isDying){
      const [width,height]=content.deathTile;
      if(x>=item.x-70&&x<item.x-70+width&&y>=item.y-14&&y<item.y-14+height)return null;
    }else if(item.birthEnabled&&Math.floor((elapsed-item.bornAt)*1000/content.walkStepMs)<15){
      // The birth bitmap is already populated when JointZombie is added.
      if(x>=item.x-75&&x<item.x+165&&y>=item.y-60&&y<item.y+180){zombie=item;break;}
    }else if(jointZombieHit(item,x,y)){zombie=item;break;}
  }
  if(!zombie&&x>=0&&x<216&&guidePhase==='spotlight')
    return [...cards].reverse().find(item=>y>=cardY(item)&&y<cardY(item)+126)||null;
  return zombie||null;
}
function selectJointTarget(target){
  if(cards.includes(target)){guideCardClicked(target);return;}
  const zombie=target;
  if (!zombie) return;
  if (selected.length >= 2) return;
  if (guidePhase === 'spotlight' && !guideZombieClicked(zombie)) return;
  if (zombie.selected) {
    zombie.selected = false;
    selected = selected.filter(item => item !== zombie);
    message.textContent = '已取消选择。';
  } else {
    // Native isSelect ignores writes until the birth animation has finished;
    // the game handler nevertheless appends the object and plays its sound.
    const beingBorn=zombie.birthEnabled&&Math.floor((elapsed-zombie.bornAt)*1000/content.walkStepMs)<15;
    if(!beingBorn)zombie.selected = true;
    selected.push(zombie);
    playPronunciation(content.partSounds[zombie.half]);
    message.textContent = selected.length === 1 ? `先选了“${zombie.half}”，再选第二个字符。` : '正在检查拼音组合…';
    if (selected.length === 2) resolveAt = elapsed+independentOffset+0.5;
  }
  draw();
}
const gameplayClick=new PvzMinigameGameClick(canvas,{
  isActive:()=>mode==='playing'&&!resultPauseVisible&&!miniHelp.active&&!miniConfirm.active,
  targetAt:jointTargetAt,token:()=>`${guidePhase}:${guideStep}`,activate:selectJointTarget,
});
canvas.addEventListener('pointerdown',event=>{
  if(miniHelp.active||miniConfirm.active)return;
  const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
  const block=()=>{event.preventDefault();event.stopImmediatePropagation();};
  const arrow=guideArrowAt();
  if(arrow&&PvzGuideHit.image(arrow.image,x-arrow.x,y-arrow.y)){block();return;}
  if(mode!=='playing'||resultPauseVisible||!guidePhase)return;
  if(PvzGuideHit.talk(guideArt,guidePhase==='outro'?2:3,x,y,58,193.9,guideArtStartedAt)){block();return;}
  if(guidePhase==='speech'||guidePhase==='spotlight'){
    const zombie=guidePhase==='spotlight'&&guideStep===1?zombies[0]:null;
    const card=guidePhase==='speech'?cards[0]:guideStep===2?cards[2]:null;
    if(!zombie&&!card){block();return;}
    const left=zombie?zombie.x:0,top=zombie?zombie.y:cardY(card);
    if(!PvzGuideHit.contains(ctx,x,y,left+(zombie?50:107),top+(zombie?50:55)))block();
  }
},{capture:true});
canvas.addEventListener('pointerdown', event => {
  if(resultPauseVisible){
    const bounds=canvas.getBoundingClientRect();
    const x=(event.clientX-bounds.left)*1024/bounds.width,y=(event.clientY-bounds.top)*768/bounds.height;
    const action=PvzMinigameConfirm.pauseAction(x,y);
    if(action==='continue'){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();draw();}
    else if(action)miniConfirm.show(action);
    return;
  }
  if (mode === 'won' || mode === 'lost') {
    PvzMinigameResult.click(canvas, event, mode === 'won', {
      exit: () => miniConfirm.show('exit'), replay: () => miniConfirm.show('replay'),
      finish: () => { location.href = 'game.html?world=3'; },
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
  advancePausedIndependent(performance.now());cancelAnimationFrame(pausedIndependentFrame);pausedIndependentFrame=0;pausedIndependentLast=0;
  if(resultPauseVisible){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();draw();return;}
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
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
    pausedIndependentLast=performance.now();
    if(hasIndependentWork()){
      pausedIndependentFrame=requestAnimationFrame(animatePausedIndependent);
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

fetch('joint-assets.json').then(response => {
  if (!response.ok) throw new Error(`资源清单读取失败：HTTP ${response.status}`);
  return response.json();
}).then(async manifest => {
  content = manifest;
  music.src = manifest.sounds.fight;
  music.loop = true;
  const nativeFont = new FontFace('PvzJoint', `url(${manifest.font})`);
  await nativeFont.load();
  document.fonts.add(nativeFont);
  const names = ['background', 'card', 'body', 'walk', 'hand', 'death', 'attack', 'create', 'glyphSheet',
    'pause', 'musicOn', 'musicOff', 'tape', 'pausePanel',
    'zombieCard', 'zombieCardSelected'];
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
