'use strict';

const canvas = document.querySelector('#roll-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayText = document.querySelector('#overlay-text');
const overlayButton = document.querySelector('#overlay-button');
const soundButton = document.querySelector('#sound');
const musicButton = document.querySelector('#music');
const pauseButton = document.querySelector('#pause');
const restartButton = document.querySelector('#restart');
const progressLabel = document.querySelector('#progress');
const message = document.querySelector('#message');
const audio = new Audio();
let audioNeedsGesture = false;
let audioAttempt = 0;
let audioResumePending=false,suspendedAudioAttempt=null,audioPlayPending=false;
const pronunciationRetryEvents=new WeakSet();
const music = new Audio();
const effect = new Audio();
let guideAudio = new Audio();
// AIR Sound.play creates a channel per playback; an older channel can still
// complete after the instance's current-channel field is replaced.
const olderGuideChannels = new Set();
const hiddenGuideChannels = new Set();
const olderGuideNeedsGesture = new Set();
let guideNeedsGesture = false;
let guideAttempt = 0;
const spawnPoints = [[656, 92], [656, 216], [656, 350], [656, 474],
                     [880, 92], [880, 216], [880, 350], [880, 474]];
const zombieScale = 0.8; // RollZombie.onAdded scales its bitmap to 80%.
const zombieFrameMs = 60; // RollZombie.play(60) starts a 60 ms Timer.
const zombieMoveStartFrame = 29;
const zombieStep = 1.2;
const targetX = 100; // ARM ZomBieRoll.onFrameHander loss boundary.
let guideArt;
let guideArtStartedAt = 0;
let guideArrowStartedAt = null;
let content;
let pictures;
let background;
let panel;
let zombieSheet;
let zombieDeathSheet;
let ui;
let progressFrame = 13;
let order = [];
let questionPool = [];
let questionIndex = 0;
let selected = [];
let zombies = [];
let mistakes = 0;
let mode = 'loading';
let lastTick = 0;
let requestId = 0;
let pronunciationTimer = 0;
let questionAudioSrc = '';
let pendingAudioSrc = '';
let transitionId = 0;
let transitionDue=0,transitionRemaining=0,transitionCallback=null;
let hiddenAt=document.hidden?performance.now():null;
function clearTransition(){clearTimeout(transitionId);transitionId=0;transitionCallback=null;transitionRemaining=0;}
function scheduleTransition(callback,delay){
  clearTransition();transitionCallback=callback;transitionRemaining=delay;
  if(document.hidden)return;
  transitionDue=performance.now()+delay;
  transitionId=setTimeout(()=>{transitionId=0;transitionCallback=null;callback();},delay);
}
let transitionKind = null;
let resultArt;
let resultStartedAt = 0;
let resultFrameId = 0;
let resultPauseVisible = false;
let pausedZombieFrame = 0;
let pausedZombieLast = 0;
let pausedGuideFrame = 0;
let guidePending = false;
const guideDelaySeconds = 1;
let guidePhase = null;
let guideStep = 0;
let guideElapsed = 0;
let pausedGuideTimer = 0;
let pausedGuideStartedAt = 0;
let hiddenPausedGuide = false;
function schedulePausedGuide(){
  pausedGuideStartedAt=performance.now();
  pausedGuideTimer=setTimeout(()=>{
    pausedGuideTimer=0;pausedGuideStartedAt=0;
    if(mode==='paused'&&guidePending)beginGuide();
  },Math.max(0,(guideDelaySeconds-guideElapsed)*1000));
}
let guideTarget = null;
let guideReady = false;
let rollPress = null;
let nativeGuided = (() => {
  try { return localStorage.getItem('pvz-pinyin-roll-best') !== null; }
  catch { return false; }
})();

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`图片加载失败：${path}`));
    image.src = path;
  });
}

function question() { return content.questions[order[questionIndex]]; }

function setOverlay(title, body, action, handler) {
  overlayTitle.textContent = title;
  overlayText.textContent = body;
  overlayButton.textContent = action;
  overlayButton.disabled = false;
  overlayButton.onclick = handler;
  overlay.hidden = false;
}

function playSound(resume=false, source=questionAudioSrc) {
  if (!content || mode === 'loading') return;
  resume=resume===true;
  const attempt=++audioAttempt;
  audioNeedsGesture=false;
  if(!resume){
    pendingAudioSrc=source;
    if(source && audio.getAttribute('src')!==source){audio.src=source;audio.load();}
    audio.currentTime=0;audioResumePending=false;
  }
  if(document.hidden){audioResumePending=true;suspendedAudioAttempt=attempt;return;}
  audioPlayPending=true;
  audio.play().then(()=>{if(attempt===audioAttempt){audioResumePending=false;audioPlayPending=false;}}).catch(error => {
    if(attempt===audioAttempt)audioPlayPending=false;
    if(attempt!==audioAttempt)return;
    audioNeedsGesture=error?.name==='NotAllowedError';
    message.textContent = '点击“重听发音”即可播放声音。';
  });
}

function soundEnabled() { return PvzVolume.enabled('music'); }

function updateMusicButton() {
  musicButton.textContent = soundEnabled() ? '♫ 音乐开' : '♪ 音乐关';
  musicButton.setAttribute('aria-pressed', String(soundEnabled()));
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(!audio.paused||audioPlayPending){audio.pause();audioPlayPending=false;audioResumePending=true;suspendedAudioAttempt=++audioAttempt;}
  }else if(suspendedAudioAttempt!==null){
    const attempt=suspendedAudioAttempt;suspendedAudioAttempt=null;
    if(attempt===audioAttempt)playSound(true);
  }
});
function playMusic() {
  if (document.hidden || (mode !== 'playing' && mode !== 'transition')) return;
  music.volume=PvzVolume.volume('music');
  if (music.paused) music.play().catch(() => {});
}

function playGuideSound(path, onEnded) {
  guideResumePending=false;
  if(!guideAudio.paused || guidePlayPending || guideNeedsGesture){
    olderGuideChannels.add(guideAudio);
    if(guideNeedsGesture)olderGuideNeedsGesture.add(guideAudio);
    guideAudio=new Audio();
  } else guideAudio.pause();
  const channel=guideAudio;
  guideArtStartedAt = performance.now() - 1000 / 30;
  channel.onended = () => {
    olderGuideChannels.delete(channel);hiddenGuideChannels.delete(channel);olderGuideNeedsGesture.delete(channel);
    guideArtStartedAt = performance.now();
    onEnded();
  };
  guideAudio.src = path;
  guideAudio.currentTime = 0;
  guideAudio.muted = false;
  tryGuideSound();
}

let suspendedGuideSrc=null,guidePlayPending=false,guideResumePending=false;
function handleOlderGuideFailure(channel,error){
  if(!olderGuideChannels.has(channel))return;
  if(error?.name==='NotAllowedError')olderGuideNeedsGesture.add(channel);
  else if(error?.name==='AbortError'){
    // Background suspension can abort an unresolved play() promise.
    if(document.hidden)hiddenGuideChannels.add(channel);
    else if(channel.paused)olderGuideNeedsGesture.add(channel);
  }else channel.onended?.();
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    for(const channel of olderGuideChannels){
      // A play() request may still be pending even if paused is true.
      if(!channel.paused || !olderGuideNeedsGesture.has(channel)){
        hiddenGuideChannels.add(channel);channel.pause();
      }
    }
    if(!guideAudio.paused||guidePlayPending){suspendedGuideSrc=guideAudio.src;guidePlayPending=false;guideAttempt++;guideAudio.pause();}
  }else if(suspendedGuideSrc){
    const src=suspendedGuideSrc;suspendedGuideSrc=null;
    if(guideAudio.src===src&&guideAudio.onended){guideResumePending=true;tryGuideSound();}
  }
  if(!document.hidden){for(const channel of hiddenGuideChannels)channel.play().catch(error=>handleOlderGuideFailure(channel,error));hiddenGuideChannels.clear();}
});
function tryGuideSound() {
  if(document.hidden){suspendedGuideSrc=guideAudio.src;return;}
  const channel=guideAudio,attempt=++guideAttempt;
  if (guideNeedsGesture&&!guideResumePending) guideArtStartedAt = performance.now() - 1000 / 30;
  guideNeedsGesture=false;
  guidePlayPending=true;
  channel.play().then(()=>{if(attempt===guideAttempt){guidePlayPending=false;guideResumePending=false;}}).catch(error => {
    if(channel!==guideAudio){
      handleOlderGuideFailure(channel,error);
      return;
    }
    if(attempt!==guideAttempt)return;
    guidePlayPending=false;
    if(error?.name==='NotAllowedError')guideNeedsGesture=true;
    else guideAudio.onended?.();
  });
}

function retryGuideChannels(){
  if(document.hidden)return;
  for(const channel of [...olderGuideNeedsGesture]){
    olderGuideNeedsGesture.delete(channel);
    channel.play().catch(error=>handleOlderGuideFailure(channel,error));
  }
  if(guideNeedsGesture)tryGuideSound();
}

function findGuideTarget() {
  // showGuide indexes the word by guide step, independently of the answer.
  const expected = [...question().word][guideStep - 1];
  return zombies.find(zombie => zombie.letter === expected) || null;
}

function beginGuide() {
  guideArtStartedAt=performance.now();
  guidePending = false;
  guidePhase = 'spotlight';
  guideStep = 0;
  guideTarget = null;
  guideReady = false;
  startPausedGuideAnimation();
  playGuideSound(content.sounds.guideGame3, () => {
    if (guidePhase !== 'spotlight' || guideStep !== 0) return;
    guideReady = true;
    draw();
  });
  draw();
}

function advanceGuide() {
  guideStep += 1;
  guideTarget = guideStep <= [...question().word].length ? findGuideTarget() : null;
  if (guideStep > [...question().word].length) {
    guidePhase = 'closing';
    guideTarget = null;
  }
}

function beginGuideOutro() {
  guidePhase = 'outro';
  startPausedGuideAnimation();
  playGuideSound(content.sounds.guideOver, () => {
    if (guidePhase !== 'outro' && guidePhase !== 'spotlight') return;
    // A delayed showGuide may have started while this channel was playing.
    if (guidePhase === 'outro') guidePhase = null;
    transitionKind = 'next';
    scheduleTransition(nextQuestion,1000);
    draw();
  });
  draw();
}

function guideArrowImage(now=performance.now()) {
  const elapsed=Math.max(0,now-(guideArrowStartedAt??now));
  return ui.guideArrow[Math.floor(elapsed*30/1000)%ui.guideArrow.length];
}

function drawGuide() {
  if (!guidePhase) return;
  let arrow=null;
  if (guidePhase === 'spotlight') {
    if (guideStep === 0) {
      // The first step hides the arrow and centers guide_mc on mc_card.
      ctx.drawImage(ui.guideMask,189.5+65-1527,65-1079,3613,2049);
    } else if (guideTarget) {
      // Subsequent steps place the arrow at (x+30,y), and guide_mc at
      // (x+55,y+117) over the character carried by the zombie.
      ctx.drawImage(ui.guideMask, guideTarget.x + 55 - 1527,
        guideTarget.y + 117 - 1079, 3613, 2049);
      arrow=guideArrowImage();
    }
  }
  // FaceRollGame places talk_mc at (-76,192.9); export bounds start at x=7.
  guideArt.draw(ctx,guidePhase === 'outro' ? 2 : 5,-76,192.9,guideArtStartedAt);
  // The arrow is added to ZomBieRoll above FaceRollGame and its talk_mc.
  if(arrow)ctx.drawImage(arrow,guideTarget.x+30,guideTarget.y);
}

function draw() {
  if (!content || !ui || document.hidden) return;
  // initQuestion enters GameOver before replacing the previous question when
  // the round index reaches eight, so its picture and title remain on stage.
  const shownIndex = order.length ? Math.min(questionIndex, content.rounds - 1) : -1;
  ctx.clearRect(0, 0, 1024, 768);
  ctx.drawImage(background, 0, 0, 1024, 768);
  // FaceRollGame places the zombie container behind the top interface.
  if (order.length && questionIndex < content.rounds) {
    for (const zombie of zombies) {
      const frame = (zombie.dying?content.deathFrames:content.zombieFrames)[zombie.frameIndex];
      const width = frame[2] * zombieScale;
      const height = frame[3] * zombieScale;
      ctx.drawImage(zombie.dying?zombieDeathSheet:zombieSheet, ...frame, zombie.x, zombie.y, width, height);
      if(zombie.dying)continue;
      // RollZombie.info centers the 80px text in a 100px area at y=60.
      ctx.font = '80px PvzJoint, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = zombie.selected ? '#ffcc00' : '#ffffc1';
      ctx.fillText(zombie.letter, zombie.x + 50, zombie.y + 60);
    }
  }
  audioTrigger.draw(ctx,soundEnabled() ? ui.musicOn : ui.musicOff);
  pauseTrigger.draw(ctx,ui.pause);
  ctx.drawImage(panel, 179, 8);
  pronunciationTrigger.draw(ctx,ui.soundIcon);
  if (shownIndex >= 0)
    // The mc_card container is at (189.5,0); initQuestion sets Bitmap.y=5.
    ctx.drawImage(pictures[order[shownIndex]], 189.5, 5);
  ctx.drawImage(ui.progressFrames[progressFrame], 1, 145);
  if (shownIndex >= 0) {
    // txt_title is placed at (366.95,12.1), with a 89.55px text box.
    // onAdded applies the embedded pinyin font, 80px, and bold formatting.
    ctx.fillStyle = '#724701';
    ctx.font = 'bold 80px PvzJoint, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(selected.join(''), 366.95, 54.875);
    // initQuestion adds SymbolUnderLine at (362 + index*45, 99).
    if(mode!=='lost')for(let i=selected.length;i<[...content.questions[order[shownIndex]].word].length;i++)
      ctx.drawImage(ui.underline,362+i*45,99);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  drawGuide();
  if (mode === 'won' || mode === 'lost')
    PvzMinigameResult.draw(ctx, resultArt, mode === 'won', resultStartedAt, false, resultButtons);
  if (mode === 'paused'||resultPauseVisible) {ctx.drawImage(ui.pausePanel, 0, 0, 1024, 768);pauseButtons.draw(ctx);pauseSliders.draw(ctx);miniHelp.draw(ctx);}
  miniConfirm.draw(ctx);
}

function animateResult() {
  if (mode !== 'won') return;
  if(document.hidden){resultFrameId=requestAnimationFrame(animateResult);return;}
  draw();
  if (performance.now() - resultStartedAt < 1100)
    resultFrameId = requestAnimationFrame(animateResult);
}

function stopLoop() {
  cancelAnimationFrame(requestId);
  requestId = 0;
  lastTick = 0;
}

function advanceZombies(delta,guideWasActive=false,guideStartsInMs=Infinity) {
  for (const zombie of zombies) {
    let tickAtMs=zombieFrameMs-zombie.clockMs;
    zombie.clockMs += delta * 1000;
    while (zombie.clockMs >= zombieFrameMs) {
      zombie.clockMs -= zombieFrameMs;
      // On creation the clip shows frame 1, while its timer counter starts
      // at int(Math.random()*50); the first tick advances that counter.
      zombie.timerFrame=(zombie.timerFrame ?? zombie.frameIndex)+1;
      zombie.frameIndex=zombie.timerFrame;
      if(zombie.dying){
        if(zombie.frameIndex>=content.deathFrames.length){zombie.finished=true;break;}
      }else{
        zombie.frameIndex %= content.zombieFrames.length;
        zombie.timerFrame=zombie.frameIndex;
        // showGuide sets the native static guide flag; timerHandler still
        // advances frames but does not move until the final guide click.
        if (zombie.frameIndex >= zombieMoveStartFrame && !guideWasActive && tickAtMs<guideStartsInMs)
          zombie.x -= zombieStep;
        if(zombie.x<targetX){end(false);return false;}
      }
      tickAtMs+=zombieFrameMs;
    }
    if (zombie.x < targetX) {
      end(false);
      return false;
    }
  }
  zombies=zombies.filter(zombie=>!zombie.finished);
  return true;
}

function loop(now) {
  if (mode !== 'playing' && mode !== 'transition') return;
  if(document.hidden){lastTick=0;requestId=requestAnimationFrame(loop);return;}
  // Each RollZombie has a 60 ms Timer independent of screen refresh.
  const delta = Math.max(0, (now - (lastTick || now)) / 1000);
  lastTick = now;
  const guideWasActive=guidePhase==='spotlight';
  const guideStartsInMs=guidePending
    ? Math.max(0,(guideDelaySeconds-guideElapsed)*1000) : Infinity;
  guideElapsed += delta;
  if (guidePending && guideElapsed >= guideDelaySeconds) beginGuide();
  if(!advanceZombies(delta,guideWasActive,guideStartsInMs))return;
  draw();
  requestId = requestAnimationFrame(loop);
}

function startPausedGuideAnimation(){
  if(mode==='paused'&&guidePhase&&!pausedGuideFrame)
    pausedGuideFrame=requestAnimationFrame(animatePausedGuide);
}
function animatePausedGuide(){
  pausedGuideFrame=0;
  if(mode!=='paused'||!guidePhase)return;
  // New zombies created during pause have their own rendering loop.
  if(!document.hidden&&!pausedZombieLast)draw();
  startPausedGuideAnimation();
}

function animatePausedZombies(now){
  if(mode!=='paused'||!pausedZombieLast)return;
  if(document.hidden){pausedZombieFrame=requestAnimationFrame(animatePausedZombies);return;}
  const delta=Math.max(0,now-pausedZombieLast)/1000;
  pausedZombieLast=now;
  if(!advanceZombies(delta,guidePhase==='spotlight'))return;
  draw();
  pausedZombieFrame=requestAnimationFrame(animatePausedZombies);
}

function nextQuestion() {
  clearTimeout(pausedGuideTimer);pausedGuideTimer=0;pausedGuideStartedAt=0;
  clearTransition();
  const wasPaused=mode==='paused';
  const advance=mode==='transition'||(wasPaused&&transitionKind==='next');
  transitionKind = null;
  if (advance) questionIndex += 1;
  if (questionIndex >= content.rounds) {
    end(true);
    return;
  }
  selected = [];
  guidePhase = null;
  guideTarget = null;
  guideReady = false;
  guidePending = !nativeGuided && questionIndex === 0;
  // initQuestion creates arrow_mc before its delayed showGuide callback.
  guideArrowStartedAt = !nativeGuided ? performance.now() : null;
  guideElapsed = 0;
  const q = question();
  const points = nativeRandomSort(spawnPoints).slice(0, q.letters.length);
  zombies = q.letters.map((letter, index) => ({
    letter, x: points[index][0], y: points[index][1], selected: false,
    spawnIndex: spawnPoints.indexOf(points[index]),
    frameIndex: 1, timerFrame: Math.floor(Math.random()*50), clockMs: 0,
  })).sort((a,b)=>a.spawnIndex-b.spawnIndex);
  questionAudioSrc = q.sound;
  mode = wasPaused ? 'paused' : 'playing';
  progressLabel.textContent = `${questionIndex + 1} / ${content.rounds} 题`;
  message.textContent = '点击正确字母，完成图片对应的拼音。';
  pauseButton.disabled = false;
  pauseButton.textContent = wasPaused ? '▶ 继续' : 'Ⅱ 暂停';
  soundButton.disabled = false;
  overlay.hidden = true;
  draw();
  // initQuestion captures this question's URL for the independent timer.
  // A later question can replace the stored timer ID without cancelling it.
  const soundPath=q.sound;
  pronunciationTimer=setTimeout(()=>playSound(false,soundPath),nativeGuided?2000:9000);
  playMusic();
  stopLoop();
  if(wasPaused){cancelAnimationFrame(pausedZombieFrame);pausedZombieLast=performance.now();pausedZombieFrame=requestAnimationFrame(animatePausedZombies);}
  else requestId = requestAnimationFrame(loop);
}

function start() {
  PvzMinigameStorageNotice.clear();
  clearTimeout(pronunciationTimer);pronunciationTimer=0;
  rollPress=null;
  clearTimeout(pausedGuideTimer);pausedGuideTimer=0;pausedGuideStartedAt=0;
  resultPauseVisible=false;cancelAnimationFrame(pausedZombieFrame);pausedZombieFrame=0;pausedZombieLast=0;
  cancelAnimationFrame(pausedGuideFrame);pausedGuideFrame=0;
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();pronunciationTrigger.reset();
  clearTransition();
  transitionKind = null;
  stopLoop();
  cancelAnimationFrame(resultFrameId);
  audioAttempt++;suspendedAudioAttempt=null;audioResumePending=false;audioPlayPending=false;audioNeedsGesture=false;audio.pause();
  effect.pause();
  effect.currentTime = 0;
  music.pause();
  music.currentTime = 0;
  guideAudio.pause();
  guideAudio.onended = null;
  for(const channel of olderGuideChannels){channel.pause();channel.onended=null;}
  olderGuideChannels.clear();hiddenGuideChannels.clear();olderGuideNeedsGesture.clear();
  guideAttempt++;guideNeedsGesture=false;guidePlayPending=false;
  guideResumePending=false;suspendedGuideSrc=null;
  mode = 'ready';
  // onAdded creates the complete index array once; onReplayHandler1 sorts
  // that same array again before starting the next run.
  if(questionPool.length!==content.questions.length)
    questionPool=content.questions.map((_,index)=>index);
  questionPool=nativeRandomSort(questionPool);
  order=questionPool.slice(0,content.rounds);
  questionIndex = 0;
  mistakes = 0;
  progressFrame = 13; // Native onAdded sets the meter to frame 14.
  guidePending = false;
  guidePhase = null;
  guideStep = 0;
  guideTarget = null;
  guideReady = false;
  restartButton.disabled = false;
  nextQuestion();
}

function end(won) {
  clearTimeout(pronunciationTimer);pronunciationTimer=0;
  resultPauseVisible=mode==='paused';
  cancelAnimationFrame(pausedZombieFrame);pausedZombieFrame=0;pausedZombieLast=0;
  cancelAnimationFrame(pausedGuideFrame);pausedGuideFrame=0;
  clearTimeout(pausedGuideTimer);pausedGuideTimer=0;pausedGuideStartedAt=0;
  stopLoop();
  clearTransition();
  transitionKind = null;
  audioAttempt++;suspendedAudioAttempt=null;audioResumePending=false;audioPlayPending=false;audioNeedsGesture=false;audio.pause();
  music.pause();
  guideAudio.pause();
  guideAudio.onended = null;
  for(const channel of olderGuideChannels){channel.pause();channel.onended=null;}
  olderGuideChannels.clear();hiddenGuideChannels.clear();olderGuideNeedsGesture.clear();
  guideAttempt++;guideNeedsGesture=false;guidePlayPending=false;
  guideResumePending=false;suspendedGuideSrc=null;
  guidePending = false;
  guidePhase = null;
  guideReady = false;
  // ZomBieRoll.GameOver calls release(), which stops and removes every
  // RollZombie from its container before showing either result panel.
  zombies = [];
  mode = won ? 'won' : 'lost';
  resultStartedAt = performance.now();
  pauseButton.disabled = true;
  soundButton.disabled = true;
  if (won) {
    try {
      const saved = localStorage.getItem('pvz-pinyin-roll-best');
      if (saved === null || mistakes < Number(saved))
        localStorage.setItem('pvz-pinyin-roll-best', String(mistakes));
    } catch { PvzMinigameStorageNotice.show(); }
  }
  effect.src = won ? content.sounds.win : content.sounds.fail;
  effect.volume=PvzVolume.volume('effects');
  effect.currentTime = 0;
  effect.play().catch(() => {});
  overlay.hidden = true;
  message.textContent = won ? '本局完成' : '本局结束';
  draw();
  if (won) resultFrameId = requestAnimationFrame(animateResult);
}

function playAnswerEffect(correct) {
  effect.src=`audio/game/${correct?'RightSound':'WrongSound'}.mp3`;
  effect.volume=PvzVolume.volume('effects');
  effect.play().catch(()=>{});
}

function finishCorrectWord() {
  transitionKind = null;
  message.textContent = `答对了：${question().word}。准备下一题。`;
  // GameRight plays RollDie once and switches every RollZombie to the
  // 39-frame death atlas; each retains its existing 60ms timer phase.
  for(const item of zombies){item.dying=true;item.frameIndex=0;item.timerFrame=0;}
  effect.src=content.sounds.death;effect.volume=PvzVolume.volume('effects');
  effect.currentTime=0;effect.play().catch(()=>{});
  // GameRight marks this instance as played only when a word is complete.
  if (!nativeGuided) {
    nativeGuided = true;
    transitionKind = 'guide';
    beginGuideOutro();
  } else {
    transitionKind = 'next';
    scheduleTransition(nextQuestion,3000);
  }
}

function selectZombie(zombie) {
  if (mode !== 'playing' || (guidePhase === 'spotlight' && guideStep === 0)) return;
  // onClickHandler advances the tutorial before checking selection or answer.
  if (guidePhase === 'spotlight') advanceGuide();
  if (zombie.selected) { draw(); return; }
  const expected = [...question().word][selected.length];
  if (zombie.letter !== expected) {
    playAnswerEffect(false);
    mistakes += 1;
    selected = [];
    zombies.forEach(item => { item.selected = false; });
    message.textContent = `选错了，重新拼这一题。提示：先找“${[...question().word][0]}”。`;
    draw();
    return;
  }
  playAnswerEffect(true);
  zombie.selected = true;
  selected.push(zombie.letter);
  progressFrame = Math.min(31, (questionIndex + 1) * 4 - 1);
  if (selected.length === [...question().word].length) {
    mode = 'transition';
    // Native onClickHandler sets frame 4 × (currentIndex + 1).
    progressFrame = Math.min(31, (questionIndex + 1) * 4 - 1);
    message.textContent = `答对了：${question().word}`;
    progressLabel.textContent = `${questionIndex + 1} / ${content.rounds} 题`;
    draw();
    // Native onClickHandler calls GameRight after 800 ms. GameRight then
    // schedules initQuestion 3000 ms later once the guide has finished.
    transitionKind = 'right';
    scheduleTransition(finishCorrectWord,800);
  } else {
    message.textContent = `已选 ${selected.join('')}，继续找下一个字母。`;
    draw();
  }
}

const miniConfirm=new PvzMinigameConfirm(canvas,{isPaused:()=>mode==='paused'||mode==='won'||mode==='lost',
  redraw:()=>{if(ui)draw();},replay:()=>start(),exit:()=>{location.href='game.html?world=3';}});
const resultButtons=new PvzMinigameResultButtons(canvas,{
  isActive:()=>(mode==='won'||mode==='lost')&&!resultPauseVisible&&!miniConfirm.active,
  isWon:()=>mode==='won',redraw:()=>{if(ui)draw();},
  activate:action=>{if(action==='finish')location.href='game.html?world=4';else miniConfirm.show(action);},
});
const miniHelp=new PvzMinigameHelp(canvas,{number:3,isPaused:()=>(mode==='paused'||resultPauseVisible)&&!miniConfirm.active,redraw:()=>{if(ui)draw();}});
const pauseButtons=new PvzMinigamePauseButtons(canvas,{
  isActive:()=>(mode==='paused'||resultPauseVisible)&&!miniHelp.active&&!miniConfirm.active,
  redraw:()=>{if(ui)draw();},
  activate:action=>{
    if(action==='help'){miniHelp.open();return;}
    if(action==='continue'){
      if(resultPauseVisible){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();pronunciationTrigger.reset();draw();}
      else resume();
      return;
    }
    miniConfirm.show(action);
  },
});
const pauseTrigger=new PvzMinigamePauseTrigger(canvas,{
  isActive:()=>(mode==='playing'||mode==='transition')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(ui)draw();},activate:()=>pauseButton.click(),
});
const audioTrigger=new PvzMinigamePauseTrigger(canvas,{
  kind:'audio',enabled:()=>soundEnabled(),
  isActive:()=>(mode==='playing'||mode==='transition')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(ui)draw();},activate:()=>{musicButton.click();},
});
const pronunciationTrigger=new PvzMinigamePauseTrigger(canvas,{
  kind:'pronunciation',rect:[98.95,20.45,90,92],
  isActive:()=>mode==='playing'&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(ui)draw();},activate:()=>playSound(),
});
const pauseSliders=new PvzPauseSliders(canvas,{
  isActive:()=>(mode==='paused'||resultPauseVisible)&&!miniHelp.active&&!miniConfirm.active,redraw:()=>{if(ui)draw();},
  onChange:channel=>{if(channel==='music'){music.volume=PvzVolume.volume('music');updateMusicButton();}
    else effect.volume=PvzVolume.volume('effects');},
});
// Shape 3547 opening, in the guide sprite's local coordinates.
const rollGuideOpening = new Path2D('M54.45 -54.55 Q31.9 -77.1 0 -77.1 -31.9 -77.1 -54.45 -54.55 -77 -32 -77 -0.1 -77 31.8 -54.45 54.35 -31.9 76.9 0 76.9 31.9 76.9 54.45 54.35 77 31.8 77 -0.1 77 -32 54.45 -54.55 Z');
const rollArrowMasks = new WeakMap();
function rollArrowContains(image,x,y){
  const px=Math.floor(x),py=Math.floor(y),w=image.naturalWidth,h=image.naturalHeight;
  if(px<0||py<0||px>=w||py>=h)return false;
  let data=rollArrowMasks.get(image);
  if(!data){const surface=document.createElement('canvas');surface.width=w;surface.height=h;
    const context=surface.getContext('2d');context.drawImage(image,0,0);
    data=context.getImageData(0,0,w,h).data;rollArrowMasks.set(image,data);}
  return data[(py*w+px)*4+3]!==0;
}
let rollGuideHitContext=null;
function rollGuideImageContains(image,x,y){
  const px=Math.floor(x),py=Math.floor(y);
  if(px<0||py<0||px>=image.naturalWidth||py>=image.naturalHeight)return false;
  if(!rollGuideHitContext){const surface=document.createElement('canvas');
    surface.width=surface.height=1;rollGuideHitContext=surface.getContext('2d',{willReadFrequently:true});}
  rollGuideHitContext.clearRect(0,0,1,1);
  rollGuideHitContext.drawImage(image,-px,-py);
  return rollGuideHitContext.getImageData(0,0,1,1).data[3]!==0;
}
function rollTargetAt(x,y){
  if(guidePhase==='outro')return null;
  if(guidePhase==='spotlight'||guidePhase==='closing'){
    // talk_mc remains above the game after the spotlight is removed.
    if(rollGuideImageContains(guideArt.bubbles[4],x-181.9,y-192.9)||
       rollGuideImageContains(guideArt.frameAt(guideArtStartedAt),x+69,y-329.9))return null;
  }
  if(guidePhase==='spotlight'){
    const center=guideStep===0 ? {x:254.5,y:65} :
      guideTarget && {x:guideTarget.x+55,y:guideTarget.y+117};
    if(!center || !ctx.isPointInPath(rollGuideOpening,x-center.x,y-center.y))return null;
    if(guideStep===0)
      return guideReady&&x>=189.5&&x<=319.5&&y>=5&&y<=116?'guide-picture':null;
    // arrow_mc is a mouse-enabled root child above FaceRollGame.
    const arrow=guideArrowImage();
    if(rollArrowContains(arrow,x-guideTarget.x-30,y-guideTarget.y))return null;
  }
  return [...zombies].reverse().find(zombie=>
    x>=zombie.x&&x<=zombie.x+212&&y>=zombie.y&&y<=zombie.y+169.6)||null;
}
canvas.addEventListener('pointerdown',event=>{
  // During pause, mc_pause is reparented above the root arrow and guide.
  if(miniHelp.active||miniConfirm.active||resultPauseVisible||mode==='paused'||!guidePhase)return;
  const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
  const block=()=>{event.preventDefault();event.stopImmediatePropagation();};
  if(guidePhase==='spotlight'&&guideStep>0&&guideTarget&&
     rollArrowContains(guideArrowImage(),x-guideTarget.x-30,y-guideTarget.y)){block();return;}
  const bubble=guidePhase==='outro'?1:4;
  if(rollGuideImageContains(guideArt.bubbles[bubble],x-181.9,y-192.9)||
     rollGuideImageContains(guideArt.frameAt(guideArtStartedAt),x+69,y-329.9)){block();return;}
  if(guidePhase==='spotlight'){
    const center=guideStep===0?{x:254.5,y:65}:
      guideTarget&&{x:guideTarget.x+55,y:guideTarget.y+117};
    if(!center||!ctx.isPointInPath(rollGuideOpening,x-center.x,y-center.y))block();
  }
},{capture:true});
canvas.addEventListener('pointerdown', event => {
  if(resultPauseVisible){
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*1024/rect.width,y=(event.clientY-rect.top)*768/rect.height;
    const action=PvzMinigameConfirm.pauseAction(x,y);
    if(action==='continue'){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();pronunciationTrigger.reset();draw();}
    else if(action)miniConfirm.show(action);
    return;
  }
  if (mode === 'won' || mode === 'lost') {
    PvzMinigameResult.click(canvas, event, mode === 'won', {
      exit: () => miniConfirm.show('exit'), replay: () => miniConfirm.show('replay'),
      finish: () => { location.href = 'game.html?world=4'; },
    });
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 1024 / rect.width;
  const y = (event.clientY - rect.top) * 768 / rect.height;
  // The full-stage pause layer blocks controls behind it.
  if (mode === 'paused') return;
  if ((mode === 'playing' || mode === 'transition' || mode === 'paused') && y >= 10 && y <= 78) {
    if (x >= 10 && x <= 78) { pauseButton.click(); return; }
    if (x >= 946 && x <= 1014) { musicButton.click(); return; }
  }
  if (mode !== 'playing') return;
  if(rollPress)return;
  const target=rollTargetAt(x,y);if(!target)return;
  if(pronunciationRetryEvents.has(event))return;
  rollPress={pointerId:event.pointerId,target,questionIndex,guidePhase,guideStep};
  try{canvas.setPointerCapture(event.pointerId);}catch{}
});
function endRollPress(event){
  if(!rollPress||rollPress.pointerId!==event.pointerId)return;
  const press=rollPress;rollPress=null;
  if(event.type!=='pointerup'||mode!=='playing'||questionIndex!==press.questionIndex||guidePhase!==press.guidePhase||guideStep!==press.guideStep)return;
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*1024/rect.width,y=(event.clientY-rect.top)*768/rect.height;
  if(rollTargetAt(x,y)!==press.target)return;
  if(press.target==='guide-picture'){advanceGuide();draw();}else selectZombie(press.target);
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endRollPress);
window.addEventListener('blur',()=>{rollPress=null;});

soundButton.addEventListener('click', playSound);
musicButton.addEventListener('click', () => {
  PvzVolume.toggleMusic();
  updateMusicButton();
  music.volume=PvzVolume.volume('music');
  if(music.paused)playMusic();
  draw();
});
pauseButton.addEventListener('click', () => {
  if (mode === 'playing' || mode === 'transition') {
    rollPress=null;
    if(mode==='transition'&&(transitionKind==='right'||transitionKind==='next'))
      clearTransition();
    mode = 'paused';
    stopLoop();
    startPausedGuideAnimation();
    if(guidePending){
      schedulePausedGuide();
    }
    music.volume=0;
    pauseButton.textContent = '▶ 继续';
    message.textContent = '已暂停';
    draw();
  } else if (mode === 'paused') resume();
});
function resume() {
  cancelAnimationFrame(pausedGuideFrame);pausedGuideFrame=0;
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();pronunciationTrigger.reset();
  if(pausedZombieLast){
    const delta=Math.max(0,performance.now()-pausedZombieLast)/1000;
    cancelAnimationFrame(pausedZombieFrame);pausedZombieFrame=0;pausedZombieLast=0;
    if(!advanceZombies(delta,guidePhase==='spotlight')){resultPauseVisible=false;draw();return;}
  }
  if(pausedGuideStartedAt){
    guideElapsed+=Math.max(0,performance.now()-pausedGuideStartedAt)/1000;
    clearTimeout(pausedGuideTimer);pausedGuideTimer=0;pausedGuideStartedAt=0;
    if(guidePending&&guideElapsed>=guideDelaySeconds)beginGuide();
  }
  mode = transitionKind ? 'transition' : 'playing';
  cancelAnimationFrame(pausedGuideFrame);pausedGuideFrame=0;
  pauseButton.textContent = 'Ⅱ 暂停';
  message.textContent = '继续拼读';
  if (guideNeedsGesture||olderGuideNeedsGesture.size)retryGuideChannels();
  if(transitionKind==='right')finishCorrectWord();
  else if(transitionKind==='next')scheduleTransition(nextQuestion,3000);
  playMusic();
  draw();
  requestId = requestAnimationFrame(loop);
}
restartButton.addEventListener('click', start);
document.addEventListener('visibilitychange', () => {
  lastTick=0;
  const now=performance.now();
  if (document.hidden) {
    if(hiddenAt===null)hiddenAt=now;
    if(transitionId){transitionRemaining=Math.max(0,transitionDue-now);clearTimeout(transitionId);transitionId=0;}
    if(pausedGuideTimer){
      guideElapsed+=Math.max(0,now-pausedGuideStartedAt)/1000;
      clearTimeout(pausedGuideTimer);pausedGuideTimer=0;pausedGuideStartedAt=0;hiddenPausedGuide=true;
    }
    music.pause();
  } else {
    if(hiddenAt!==null){
      const shift=start=>start+Math.max(0,now-Math.max(hiddenAt,start));
      if(mode==='won')resultStartedAt=shift(resultStartedAt);
      if(guidePhase)guideArtStartedAt=shift(guideArtStartedAt);
      if(guideArrowStartedAt!==null)guideArrowStartedAt=shift(guideArrowStartedAt);
      if(mode==='paused'&&pausedZombieLast)pausedZombieLast=now;
      hiddenAt=null;
    }
    if(transitionCallback&&!transitionId)scheduleTransition(transitionCallback,transitionRemaining);
    if(hiddenPausedGuide){hiddenPausedGuide=false;if(mode==='paused'&&guidePending)schedulePausedGuide();}
    if(mode === 'playing' || mode === 'transition')playMusic();
  }
});
window.addEventListener('storage', event => {
  if (['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key)) {
    updateMusicButton();
    music.volume=PvzVolume.volume('music');
    if(music.paused)playMusic();
  }
});
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && mode !== 'loading') {
    event.preventDefault();
    playSound();
  }
});

fetch('roll-assets.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(async data => {
  content = data;
  const nativeFont=new FontFace('PvzJoint','url(assets/joint/joint-font.ttf)');
  await nativeFont.load();
  document.fonts.add(nativeFont);
  music.src = data.sounds.fight;
  music.loop = true;
  music.volume = PvzVolume.volume('music');
  effect.volume = PvzVolume.volume('effects');
  updateMusicButton();
  [background, panel, zombieSheet, zombieDeathSheet, pictures, ui] = await Promise.all([
    loadImage(data.background), loadImage(data.panel), loadImage(data.zombieSheet), loadImage(data.deathSheet),
    Promise.all(data.questions.map(q => loadImage(q.picture))),
    Promise.all([data.pause, data.soundIcon, data.musicOn, data.musicOff,
      data.pausePanel, data.underline, ...data.progressFrames,
      data.guide.mask, ...data.guide.talk, ...data.guide.arrow].map(loadImage)).then(images => ({
      pause: images[0], soundIcon: images[1], musicOn: images[2], musicOff: images[3],
      pausePanel: images[4], underline:images[5], progressFrames: images.slice(6, 6 + data.progressFrames.length),
      guideMask: images[6 + data.progressFrames.length],
      guideTalk: images.slice(7 + data.progressFrames.length,
        7 + data.progressFrames.length + data.guide.talk.length),
      guideArrow: images.slice(7 + data.progressFrames.length + data.guide.talk.length),
    })),
  ]);
  guideArt = await PvzGuideArt.load();
  resultArt = await PvzMinigameResult.load();
  start();
  document.addEventListener('pointerdown', () => {
    if (music.paused) playMusic();
  }, {capture:true});
  document.addEventListener('pointerdown',event=>{
    if(['playing','transition','paused'].includes(mode)&&
       (guideNeedsGesture||olderGuideNeedsGesture.size))retryGuideChannels();
    if(!['playing','transition','paused'].includes(mode))return;
    // The sound icon's own handler will issue this request once.
    if(mode==='playing'&&event.target===canvas){
      const rect=canvas.getBoundingClientRect();
      const x=(event.clientX-rect.left)*1024/rect.width;
      const y=(event.clientY-rect.top)*768/rect.height;
      if(x>=99&&x<=189&&y>=20&&y<=112)return;
    }
    if(audioNeedsGesture){pronunciationRetryEvents.add(event);playSound(audioResumePending,pendingAudioSrc);}
  },{capture:true});
}).catch(error => {
  mode = 'error';
  message.textContent = String(error);
  setOverlay('加载失败', error.message || String(error), '重试', () => location.reload());
});
