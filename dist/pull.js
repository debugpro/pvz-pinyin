'use strict';

const canvas = document.querySelector('#pull-canvas');
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
const audio = new Audio();
let audioNeedsGesture = false;
let audioAttempt = 0;
let audioResumePending=false,suspendedAudioAttempt=null,audioPlayPending=false;
const pronunciationRetryEvents=new WeakSet();
const guideAudio = new Audio();
let guideNeedsGesture = false;
let guideAttempt = 0;
const music = new Audio();
const effect = new Audio();
const pivot = {x: 574, y: 117};
// FFDec's 91×1311 clamp image starts at SWF bounds (-44, -547.15).
const clampArt = {left: -44, ropeTop: -547, clawTop: 103, arrowTop: 200};
const grid = {left: 240, top: 393, dx: 82, dy: 100, rows: 4, columns: 9};
const rowTypes = [[0, 0, 1, 0, 1, 0, 1, 0, 0],
                  [0, 1, 0, 0, 10, 0, 0, 1, 0],
                  [10, 0, 0, 1, 5, 0, 0, 1, 0],
                  [0, 10, 0, 1, 0, 0, 10, 1, 0]];
let guideArt;
let guideArtStartedAt = 0;
let content;
let images;
let order = [];
let questionIndex = 0;
let cards = [];
// Cards remain in their display container after being removed from collision checks.
let displayCards = [];
let scorePopups = [];
let collected = '';
let score = 0;
let seconds = 70;
// AIR's one-second Timer updates an integer counter; adding time does not
// reset the interval until its next tick.
let timerPhase = 0;
let countdownTip = null;
let angle = -30;
let angleDirection = 1;
let reach = 0;
let shot = 'ready';
let caught = null;
let mode = 'loading';
let lastTick = 0;
let frameId = 0;
let motionBalance = 0;
let nextId = 0;
let pendingNext = false;
let nextDue = 0, nextRemaining = 0;
let hiddenAt=document.hidden?performance.now():null;
function scheduleNext(delay){
  nextRemaining=Math.max(0,delay);
  if(document.hidden)return;
  nextDue=performance.now()+nextRemaining;
  nextId=setTimeout(nextQuestion,nextRemaining);
}
let audioEnabled = PvzVolume.enabled('music');
let resultStars = 0;
let resultStartedAt = 0;
let resultFrameId = 0;
let resultPauseVisible = false;
// Gate.onSel passes the saved star result as `played`; scores below 20
// earn no stars and must not suppress the next visit's tutorial.
let nativeGuided = (() => {
  try {
    const last=localStorage.getItem('pvz-pinyin-pull-last-score');
    return Number(last ?? localStorage.getItem('pvz-pinyin-pull-best') ?? 0) >= 20;
  }
  catch { return false; }
})();

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`素材加载失败：${path}`));
    image.src = path;
  });
}

function current() { return content.questions[order[questionIndex]]; }

function setOverlay(title, body, action, handler) {
  overlayTitle.textContent = title;
  overlayText.textContent = body;
  overlayButton.textContent = action;
  overlayButton.disabled = false;
  overlayButton.onclick = handler;
  overlay.hidden = false;
}

function playSound(resume=false) {
  if (!content) return;
  resume=resume===true;
  const attempt=++audioAttempt;
  audioNeedsGesture=false;
  if(!resume){audio.currentTime=0;audioResumePending=false;}
  if(document.hidden){audioResumePending=true;suspendedAudioAttempt=attempt;return;}
  audioPlayPending=true;
  audio.play().then(()=>{if(attempt===audioAttempt){audioResumePending=false;audioPlayPending=false;}}).catch(error => {
    if(attempt===audioAttempt)audioPlayPending=false;
    if(attempt===audioAttempt)audioNeedsGesture=error?.name==='NotAllowedError';
  });
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
  if(document.hidden)return;
  if (!content||!['guide','playing','transition'].includes(mode))return;
  music.volume=PvzVolume.volume('music');
  if(music.paused)music.play().catch(()=>{});
}
function setPullMusic(name) {
  music.pause();music.src=content.sounds[name];music.loop=true;playMusic();
}

function makeCards(question) {
  // ZombiePull.start sorts each existing row in place before dealing; the
  // reordered template is used again by the next round and replay.
  const types = rowTypes.flatMap((row, rowIndex) => {
    row.splice(0,row.length,...nativeRandomSort(row));
    return row.map((type, column) =>
      ({type, x: grid.left + column * grid.dx, y: grid.top + rowIndex * grid.dy}));
  });
  const letters = [...question.title];
  const distractors = [...question.distractors];
  let letterIndex = 0;
  for (const card of types) {
    if (card.type === 1) {
      card.type = 'letter';
      card.label = letterIndex < letters.length ? letters[letterIndex++] :
        distractors[Math.floor(Math.random() * distractors.length)];
    } else if (card.type === 5) {
      card.type = Math.random() <= 0.5 ? 'time' : 'bonus';
      card.label = card.type === 'time' ? '+20' : '50';
    } else if (card.type === 10) {
      card.type = 'score5';
      card.variant = Math.floor(Math.random() * 4) + 1;
      card.label = '+5';
    }
  }
  return types.filter(card => card.type);
}

function hookPosition() {
  const radians = angle * Math.PI / 180;
  return {x: pivot.x - Math.sin(radians) * reach,
          y: pivot.y + Math.cos(radians) * reach};
}

function hitPosition() {
  const radians = angle * Math.PI / 180;
  const hook = hookPosition();
  // FacePullGame places the hit object at local y = 153.9 in mc_clamp.
  return {x: hook.x - Math.sin(radians) * 153.9,
          y: hook.y + Math.cos(radians) * 153.9};
}

function cardBox(card) {
  return card.type === 'letter' ? 7 : card.type === 'time' ? 6 :
    card.type === 'bonus' ? 5 : card.variant;
}

function drawCard(card, x = card.x, y = card.y) {
  const box = cardBox(card);
  const [left, , top] = content.boxBounds[String(box)];
  ctx.drawImage(images.boxes[box], x + left, y + top);
  if (card.type === 'letter') {
    ctx.fillStyle = '#000';
    // box7's DefineEditText 3494 requests 60px 方正粗圆简体. The SWF
    // names that device font but embeds no glyphs for it.
    ctx.font = '60px "方正粗圆简体", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.label, x, y - 5.5);
  }
}

function draw() {
  if (!images || document.hidden) return;
  ctx.clearRect(0, 0, 1024, 768);
  ctx.drawImage(images.background, 0, 0, 1024, 768);
  ctx.drawImage(images.wagon, 397, 16, 259, 264);
  // mc_timer is placed at (41.95,535.8); its art starts 394 px above that.
  // AIR advances to frame 71 - remaining seconds, including the native digits.
  const meterFrame = Math.max(0, Math.min(70, 70 - seconds));
  ctx.drawImage(images.meterFrames[meterFrame], 42, 142);
  const hook = hookPosition();
  ctx.save();
  ctx.translate(hook.x, hook.y);
  ctx.rotate(angle * Math.PI / 180);
  ctx.drawImage(images.rope, clampArt.left, clampArt.ropeTop);
  if (shot === 'ready' && (mode === 'playing' || mode === 'guide'))
    ctx.drawImage(images.aimArrow, clampArt.left, clampArt.arrowTop);
  ctx.drawImage(images.claw, clampArt.left, clampArt.clawTop);
  ctx.restore();
  // FacePullGame places indicator 3845 at (818.4,-130). Draw its backing
  // shape 3842, then the live word in DefineEditText 3844's 80px Arial.
  ctx.drawImage(images.indicator, 622, 92);
  if (content && order.length && questionIndex < content.questions.length) {
    ctx.save();
    ctx.font = '80px Arial, sans-serif';
    ctx.fontKerning = 'normal';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // calScore colors each collected target character red in indicator.txt.
    const letters=[...current().title];
    const marked=letters.map(()=>false);
    for(const char of collected){
      const index=letters.findIndex((letter,i)=>letter===char&&!marked[i]);
      if(index>=0)marked[index]=true;
    }
    const total=ctx.measureText(letters.join('')).width;
    const left=818.95-total/2;
    for(let i=0;i<letters.length;i++){
      ctx.fillStyle=marked[i]?'#ff0000':'#000000';
      // Include kerning against the preceding letter even though each glyph
      // is drawn separately to preserve the collected-letter colors.
      const end=ctx.measureText(letters.slice(0,i+1).join('')).width;
      ctx.fillText(letters[i],left+end-ctx.measureText(letters[i]).width,137.925);
    }
    ctx.restore();
  }
  ctx.fillStyle = '#fff';
  // FacePullGame.txt_timer: Arial 50, centered in its original text bounds.
  ctx.font = '50px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), 210.825, 40.525);
  ctx.textAlign = 'left';
  ctx.drawImage(images.sun, 98, 14);
  // The collision array and display container have separate lifetimes.
  for(const card of displayCards){
    const position=card===caught&&card.moving ? hitPosition() : card;
    drawCard(card,position.x,position.y);
  }
  const now=performance.now();
  scorePopups=scorePopups.filter(popup=>now-popup.started<popup.duration*1000);
  for(const popup of scorePopups){
    const t=Math.min(1,(now-popup.started)/(popup.duration*1000));
    const rise=30*(1-(1-t)*(1-t));
    ctx.drawImage(images.scorePopups[popup.name],popup.x-2.65,popup.y-rise-(popup.name==='timer20'?2.25:2.05));
  }
  if(countdownTip){
    const elapsed=(now-countdownTip.started)/1000;
    const frame=images.countdownFrames[String(countdownTip.number)][Math.min(29,Math.floor(elapsed*30))];
    // Each exported clip includes its full scaling range around an 80px
    // registration box; mc_timeTips itself is at (530.05,340.95). Frame 30
    // calls stop(), so it remains visible until another countdown tick.
    ctx.drawImage(frame,530.05-(frame.naturalWidth-80)/2,340.95-(frame.naturalHeight-80)/2);
  }
  pauseTrigger.draw(ctx,images.pause);
  audioTrigger.draw(ctx,audioEnabled ? images.musicOn : images.musicOff);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (mode === 'guide') {
    // ZombiePull.start places guideMC at (1200,440), then shows talk frame 54.
    ctx.drawImage(images.guideMask, 1200 - 1527, 440 - 1079, 3613, 2049);
    // FacePullGame places talk_mc at (-76,192.9), with export x offset 7.
    guideArt.draw(ctx,6,-76,192.9,guideArtStartedAt);
  }
  if (mode === 'ended') {
    if (resultStars === 0) {ctx.drawImage(images.result.fail, 0, 0, 1024, 768);resultButtons.draw(ctx,false);}
    else {
      const frame = Math.min(resultStars * 8,
        Math.floor((performance.now() - resultStartedAt) * 30 / 1000));
      ctx.drawImage(images.result.success[frame], 0, 0, 1024, 768);resultButtons.draw(ctx,true);
    }
  }
  if (mode === 'paused'||resultPauseVisible) {ctx.drawImage(images.pausePanel, 0, 0, 1024, 768);pauseButtons.draw(ctx);pauseSliders.draw(ctx);miniHelp.draw(ctx);}
  miniConfirm.draw(ctx);
}

function animateResult() {
  if (mode !== 'ended' && mode !== 'paused') return;
  if(document.hidden){resultFrameId=requestAnimationFrame(animateResult);return;}
  draw();
  const now=performance.now();
  const resultMoving=mode==='ended'&&resultStars>0&&now-resultStartedAt<resultStars*8*1000/30;
  if (resultMoving || hasIndependentAnimation(now))
    resultFrameId = requestAnimationFrame(animateResult);
  else resultFrameId=0;
}

function hasIndependentAnimation(now=performance.now()) {
  return scorePopups.some(popup=>now-popup.started<popup.duration*1000) ||
    !!countdownTip && now-countdownTip.started<1000;
}

function scoreCatch(card, position=hitPosition()) {
  if (!card) { message.textContent = '没抓到字牌，调整角度再试。'; return; }
  const popupName=card.type==='time'?'timer20':card.type==='bonus'?'score50':
    card.type==='score5'?'score5':'score20';
  scorePopups.push({name:popupName,x:position.x,y:position.y,started:performance.now(),duration:.8});
  if (card.type === 'time') {
    seconds = Math.min(70, seconds + 20);
    message.textContent = '抓到时间牌，增加 20 秒。';
  } else if (card.type === 'bonus') {
    score += 50;
    message.textContent = '抓到奖励牌，增加 50 分。';
  } else if (card.type === 'score5') {
    score += 5;
    message.textContent = '抓到普通分数牌，增加 5 分。';
  } else {
    // box7 always awards 20 points, even if its character is a distractor.
    score += 20;
    if (current().title.includes(card.label)) {
      collected += card.label;
      message.textContent = `抓到“${card.label}”，已收集 ${collected}。`;
      if (collected.length >= current().title.length) {
        score += 100;
        scorePopups.push({name:'score100',x:600,y:200,started:performance.now(),duration:.6});
        mode = 'transition';
        pendingNext = true;
        message.textContent = `完成 ${current().title}，奖励 100 分！`;
        scheduleNext(1000);
      }
    } else {
      message.textContent = `抓到“${card.label}”，增加 20 分。`;
    }
  }
}

function stepHook() {
  if (shot === 'ready') {
    angle += angleDirection;
    if (angle > 40) angleDirection = -1;
    else if (angle < -40) angleDirection = 1;
    return;
  }
  if (shot === 'out' && reach + 10 > 500) shot = 'back';
  const speed = 5 + (reach + 10) * 30 / 500;
  if (shot === 'out') {
    reach += speed;
    const hit = hitPosition();
    const radians = angle * Math.PI / 180;
    const halfWidth = Math.abs(Math.cos(radians)) * 13.8 + Math.abs(Math.sin(radians)) * 8;
    const halfHeight = Math.abs(Math.sin(radians)) * 13.8 + Math.abs(Math.cos(radians)) * 8;
    // The original enumerates the array and splices each hit while still
    // iterating. Advancing the index also skips the item shifted into it.
    for(let index=0;index<cards.length;index++){
      const card=cards[index];
      const [left, right, top, bottom] = content.boxBounds[String(cardBox(card))];
      if(hit.x + halfWidth < card.x + left ||
         hit.x - halfWidth > card.x + right ||
         hit.y + halfHeight < card.y + top ||
         hit.y - halfHeight > card.y + bottom)continue;
      caught = cards.splice(index, 1)[0];
      caught.moving=false;
      shot = 'back';
      effect.src='audio/game/click_sound.mp3';
      effect.volume=PvzVolume.volume('effects');
      effect.play().catch(()=>{});
    }
  } else {
    reach -= speed * (caught ? 0.25 : 0.5);
    if(caught)caught.moving=true;
    // onFrameHandler completes the return only after y is below 117.
    // The hook angle stays within ±41°, so that is equivalent to reach < 0.
    if (reach < 0) {
      // The captured card is positioned at the hit point before the clamp
      // resets; calScore places its popup at that card position.
      const catchPosition=hitPosition();
      reach = 0;
      shot = 'ready';
      scoreCatch(caught,catchPosition);
      if(caught)displayCards=displayCards.filter(card=>card!==caught);
      caught = null;
    }
  }
}

function loop(now) {
  if (!['playing', 'guide', 'transition'].includes(mode)) return;
  if(document.hidden){lastTick=0;frameId=requestAnimationFrame(loop);return;}
  // The AIR Timer runs independently of display frames. Only cap the
  // animation catch-up; a slow frame must not make the clock run slowly.
  const elapsed = Math.max(0, (now - (lastTick || now)) / 1000);
  const dt = Math.min(elapsed, 0.05);
  lastTick = now;
  if (mode === 'playing' || mode === 'transition') {
    timerPhase += elapsed;
    while (timerPhase >= 1) {
      timerPhase -= 1;
      --seconds;
      // ZombiePull.onTimerHandler switches music whenever the counter hits 10.
      if (seconds === 10) setPullMusic('urgent');
      if(seconds>=0&&seconds<=5)countdownTip={number:seconds,started:performance.now()};
      // AIR displays frame 71 for zero, then ends on the next tick.
      if (seconds < 0) { end(); return; }
    }
  }
  motionBalance += dt;
  while (motionBalance >= 1 / 30 && ['playing','guide','transition'].includes(mode)) {
    motionBalance -= 1 / 30;
    stepHook();
  }
  draw();
  frameId = requestAnimationFrame(loop);
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
  if(document.hidden){if(hiddenAt===null)hiddenAt=now;}
  else if(hiddenAt!==null){
    const shift=start=>start+Math.max(0,now-Math.max(hiddenAt,start));
    for(const popup of scorePopups)popup.started=shift(popup.started);
    if(countdownTip)countdownTip.started=shift(countdownTip.started);
    if(mode==='guide')guideArtStartedAt=shift(guideArtStartedAt);
    if(mode==='ended')resultStartedAt=shift(resultStartedAt);
    hiddenAt=null;
  }
  if(!pendingNext)return;
  if(document.hidden){
    if(nextId){nextRemaining=Math.max(0,nextDue-performance.now());clearTimeout(nextId);nextId=0;}
  }else if(!nextId)scheduleNext(nextRemaining);
});

let suspendedGuideSrc=null,guidePlayPending=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(!guideAudio.paused||guidePlayPending){suspendedGuideSrc=guideAudio.src;guidePlayPending=false;guideAttempt++;guideAudio.pause();}
  }else if(suspendedGuideSrc){
    const src=suspendedGuideSrc;suspendedGuideSrc=null;
    if(guideAudio.src===src&&guideAudio.onended)tryGuideSound();
  }
});
function tryGuideSound() {
  if(document.hidden){suspendedGuideSrc=guideAudio.src;return;}
  const attempt=++guideAttempt;
  guideNeedsGesture=false;
  guidePlayPending=true;
  guideAudio.play().then(()=>{if(attempt===guideAttempt)guidePlayPending=false;}).catch(error=>{
    if(attempt!==guideAttempt)return;
    guidePlayPending=false;
    if(error?.name==='NotAllowedError')guideNeedsGesture=true;
    else onGuideOver();
  });
}

function onGuideOver() {
  if (mode !== 'guide') return;
  nativeGuided = true;
  guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  mode = 'playing';
  pauseButton.disabled = false;
  lastTick = 0;
  draw();
  playSound();
}

function nextQuestion() {
  clearTimeout(nextId);
  nextId=0;nextDue=0;nextRemaining=0;
  const wasPaused=mode==='paused';
  if (pendingNext) questionIndex += 1;
  pendingNext=false;
  if (questionIndex >= content.questions.length) { end(); return; }
  // start removes every child from the card container before dealing.
  scorePopups = [];
  collected = '';
  cards = makeCards(current());
  displayCards = [...cards];
  caught = null;
  shot = 'ready';
  reach = 0;
  motionBalance = 0;
  audioAttempt++;suspendedAudioAttempt=null;audioResumePending=false;audioPlayPending=false;audioNeedsGesture=false;
  audio.src = current().sound;
  audio.load();
  mode = wasPaused ? 'paused' : !nativeGuided && questionIndex === 0 ? 'guide' : 'playing';
  overlay.hidden = true;
  progressLabel.textContent = `${questionIndex + 1} / ${content.questions.length} 题`;
  pauseButton.disabled = mode === 'guide';
  soundButton.disabled = false;
  message.textContent = `目标：${current().title}；点击画面发射抓钩。`;
  if (mode === 'guide') guideArtStartedAt=performance.now();
  draw();
  if (mode === 'guide') {
    guideAudio.src = content.guide.sound;
    guideAudio.currentTime = 0;
    guideAudio.muted = false;
    guideAudio.onended = onGuideOver;
    tryGuideSound();
  } else playSound();
  cancelAnimationFrame(frameId);
  lastTick = 0;
  if(!wasPaused)frameId = requestAnimationFrame(loop);
}

function start() {
  PvzMinigameStorageNotice.clear();
  gameplayClick.reset();
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
  resultPauseVisible=false;
  clearTimeout(nextId);
  nextId=0;nextDue=0;nextRemaining=0;
  pendingNext = false;
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(resultFrameId);
  effect.pause();
  effect.currentTime = 0;
  guideAudio.pause();
  guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  mode = 'intro';
  // ZombiePull.start indexes PullData.q directly; randSort shuffles rows of
  // cards, not the question list itself.
  order = content.questions.map((_, index) => index);
  questionIndex = 0;
  score = 0;
  scorePopups = [];
  seconds = content.seconds;
  timerPhase = 0;
  countdownTip = null;
  // onAdded and onReplayHandler1 set rotation to -30 degrees. Replay
  // leaves the existing rotationSpeed untouched.
  angle = -30;
  motionBalance = 0;
  restartButton.disabled = false;
  nextQuestion();
  setPullMusic('background');
}

function end() {
  resultPauseVisible=mode==='paused';
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(resultFrameId);resultFrameId=0;
  clearTimeout(nextId);
  nextId=0;nextDue=0;nextRemaining=0;
  pendingNext = false;
  audioAttempt++;suspendedAudioAttempt=null;audioResumePending=false;audioPlayPending=false;audioNeedsGesture=false;audio.pause();
  music.pause();
  guideAudio.pause();
  guideAudio.onended = null;guideAttempt++;guideNeedsGesture=false;
  mode = 'ended';
  pauseButton.disabled = true;
  soundButton.disabled = true;
  try {
    localStorage.setItem('pvz-pinyin-pull-played', '1');
    localStorage.setItem('pvz-pinyin-pull-last-score', String(score));
    const best = Number(localStorage.getItem('pvz-pinyin-pull-best') || 0);
    if (score > best) localStorage.setItem('pvz-pinyin-pull-best', String(score));
  } catch { PvzMinigameStorageNotice.show(); }
  const stars = score >= 200 ? 3 : score >= 100 ? 2 : score >= 20 ? 1 : 0;
  effect.src=content.sounds[stars?'win':'fail'];
  effect.volume=PvzVolume.volume('effects');effect.play().catch(()=>{});
  resultStars = stars;
  resultStartedAt = performance.now();
  overlay.hidden = true;
  message.textContent = `得到 ${score} 分，评级：${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
  draw();
  if (stars > 0 || hasIndependentAnimation()) resultFrameId = requestAnimationFrame(animateResult);
}

const miniConfirm=new PvzMinigameConfirm(canvas,{isPaused:()=>mode==='paused'||mode==='ended',
  redraw:()=>{if(images)draw();},replay:()=>start(),exit:()=>{location.href='game.html?world=4';}});
const resultButtons=new PvzMinigameResultButtons(canvas,{
  isActive:()=>(mode==='ended')&&!resultPauseVisible&&!miniConfirm.active,
  isWon:()=>resultStars>0,redraw:()=>{if(images)draw();},
  activate:action=>{if(action==='finish')location.href='finale.html';else miniConfirm.show(action);},
});
const miniHelp=new PvzMinigameHelp(canvas,{number:4,isPaused:()=>(mode==='paused'||resultPauseVisible)&&!miniConfirm.active,redraw:()=>{if(images)draw();}});
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
  isActive:()=>(mode==='playing'||mode==='transition')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(images)draw();},activate:()=>pauseButton.click(),
});
const audioTrigger=new PvzMinigamePauseTrigger(canvas,{
  kind:'audio',enabled:()=>audioEnabled,
  isActive:()=>(mode==='playing'||mode==='transition'||mode==='guide')&&!resultPauseVisible&&!miniConfirm.active&&!miniHelp.active,
  redraw:()=>{if(images)draw();},activate:()=>{audioEnabled=PvzVolume.toggleMusic();music.volume=PvzVolume.volume('music');if(music.paused)playMusic();draw();},
});
const pauseSliders=new PvzPauseSliders(canvas,{
  isActive:()=>(mode==='paused'||resultPauseVisible)&&!miniHelp.active&&!miniConfirm.active,redraw:()=>{if(images)draw();},
  onChange:channel=>{if(channel==='music'){audioEnabled=PvzVolume.enabled('music');
    music.volume=PvzVolume.volume('music');}else effect.volume=PvzVolume.volume('effects');},
});
const gameplayClick=new PvzMinigameGameClick(canvas,{
  isActive:()=>mode==='playing'&&shot==='ready'&&!resultPauseVisible&&!miniHelp.active&&!miniConfirm.active,
  targetAt:(x,y)=>x>=0&&x<1024&&y>=0&&y<768&&
    !(y>=10&&y<78&&((x>=10&&x<78)||(x>=946&&x<1014)))?'stage':null,
  token:()=>questionIndex,
  activate:()=>{shot='out';message.textContent='抓钩已发射。';},
});
canvas.addEventListener('pointerdown',event=>{
  // The guide shape sits above the in-game buttons. Its opening is centered
  // at (1200,440), entirely outside the 1024-pixel stage.
  if(mode==='guide'&&!resultPauseVisible&&!miniHelp.active&&!miniConfirm.active){
    event.preventDefault();event.stopImmediatePropagation();
  }
},{capture:true});
canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 1024 / rect.width;
  const y = (event.clientY - rect.top) * 768 / rect.height;
  if(resultPauseVisible){
    const action=PvzMinigameConfirm.pauseAction(x,y);
    if(action==='continue'){resultPauseVisible=false;miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();draw();}
    else if(action)miniConfirm.show(action);
    return;
  }
  if (mode === 'ended') {
    if (resultStars === 0) {
      if (y >= 537.05 && y <= 589.05 && x >= 284.75 && x <= 454.75) miniConfirm.show('exit');
      else if (y >= 537.05 && y <= 589.05 && x >= 567.25 && x <= 737.25) miniConfirm.show('replay');
    } else if (y >= 460.8 && y <= 525.8) {
      if (x >= 200.5 && x <= 370.5) miniConfirm.show('exit');
      else if (x >= 430.35 && x <= 600.35) miniConfirm.show('replay');
      else if (x >= 662.35 && x <= 832.35) location.href = 'finale.html';
    }
    return;
  }
  // The full-stage pause layer blocks controls behind it.
  if (mode === 'paused') return;
  if ((mode === 'playing' || mode === 'transition' || mode === 'paused' || mode === 'guide') && y >= 10 && y <= 78) {
    if (x >= 10 && x <= 78) { pauseButton.click(); return; }
    if (x >= 946 && x <= 1014) {
      audioEnabled = PvzVolume.toggleMusic();
      music.volume=PvzVolume.volume('music');
      if(music.paused)playMusic();
      draw();
      return;
    }
  }
  if (mode !== 'playing' || shot !== 'ready') return;
  if(!pronunciationRetryEvents.has(event))gameplayClick.down(event);
});
pauseButton.addEventListener('click', () => {
  if (mode === 'playing' || mode === 'transition') {
    gameplayClick.reset();
    mode = 'paused';
    cancelAnimationFrame(frameId);
    // The background channel keeps playing at zero volume. The separate
    // pronunciation SoundChannel is not stopped or restarted.
    music.volume=0;
    pauseButton.textContent = '▶ 继续';
    draw();
    if(hasIndependentAnimation())resultFrameId=requestAnimationFrame(animateResult);
  } else if (mode === 'paused') resume();
});
function resume() {
  miniHelp.reset();miniConfirm.reset();resultButtons.reset();pauseButtons.reset();pauseTrigger.reset();audioTrigger.reset();
  cancelAnimationFrame(resultFrameId);resultFrameId=0;
  mode = pendingNext ? 'transition' : 'playing';
  overlay.hidden = true;
  pauseButton.textContent = 'Ⅱ 暂停';
  draw();
  lastTick = 0;
  playMusic();
  frameId = requestAnimationFrame(loop);
}
restartButton.addEventListener('click', start);
soundButton.addEventListener('click', playSound);
window.addEventListener('storage',event=>{
  if(!['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key))return;
  audioEnabled=PvzVolume.enabled('music');music.volume=PvzVolume.volume('music');
  if(images)draw();
});

Promise.all([fetch('pull-assets.json').then(response => {
  if (!response.ok) throw new Error(`题库读取失败：HTTP ${response.status}`);
  return response.json();
})]).then(async ([manifest]) => {
  content = manifest;
  const [background, wagon, claw, rope, aimArrow, indicator, sun, pause, musicOn, musicOff, pausePanel, meterFrames, boxes, resultSuccess, resultFail, guideMask, guideTalk, scoreImages, countdownImages] = await Promise.all([
    ...[manifest.background, manifest.wagon, manifest.claw, manifest.rope,
        manifest.aimArrow, manifest.indicator, manifest.sun, manifest.pause,
        manifest.musicOn, manifest.musicOff, manifest.pausePanel].map(loadImage),
    Promise.all(manifest.meterFrames.map(loadImage)),
    Promise.all(Array.from({length: 7}, (_, index) =>
      loadImage(manifest.boxes[String(index + 1)]))),
    Promise.all(manifest.result.success.map(loadImage)),
    loadImage(manifest.result.fail[0]),
    loadImage(manifest.guide.mask), loadImage(manifest.guide.talk),
    Promise.all(Object.entries(manifest.scorePopups).map(async ([name,path])=>[name,await loadImage(path)])),
    Promise.all(Object.entries(manifest.countdownFrames).map(async ([number,paths])=>[number,await Promise.all(paths.map(loadImage))])),
  ]);
  images = {background, wagon, claw, rope, aimArrow, indicator, sun, pause, musicOn,
    musicOff, pausePanel, meterFrames, boxes: [null, ...boxes],
    result: {success: resultSuccess, fail: resultFail}, guideMask, guideTalk,
    scorePopups:Object.fromEntries(scoreImages),countdownFrames:Object.fromEntries(countdownImages)};
  guideArt = await PvzGuideArt.load();
  start();
  // iPad browsers may defer the first pronunciation until a user gesture.
  document.addEventListener('pointerdown', () => {
    if(music.paused)playMusic();
  }, {capture:true});
  document.addEventListener('pointerdown',event=>{
    if(mode==='guide'&&guideNeedsGesture)tryGuideSound();
    if(mode==='playing'&&audioNeedsGesture){pronunciationRetryEvents.add(event);playSound(audioResumePending);}
  },{capture:true});
}).catch(error => {
  mode = 'error';
  setOverlay('加载失败', error.message, '重试', () => location.reload());
});
