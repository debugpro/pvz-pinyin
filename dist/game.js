const canvas = document.querySelector('#battle-canvas');
let ctx = canvas.getContext('2d');
const writingLossOverlay = document.querySelector('#writing-loss-overlay');
const writingLossContext = writingLossOverlay.getContext('2d');
const selectView = document.querySelector('#level-select');
const battleView = document.querySelector('#battle-view');
const cardCover = document.querySelector('#card-cover');
const cardCoverTitle = document.querySelector('#card-cover-title');
const cardCoverLearn = document.querySelector('#card-cover-learn');
const cardCoverPractice = document.querySelector('#card-cover-practice');
const cardCoverWrite = document.querySelector('#card-cover-write');
const learningView = document.querySelector('#learning-view');
const learningStrip = document.querySelector('#learning-strip');
const learningPrevious = document.querySelector('#learning-previous');
const learningNext = document.querySelector('#learning-next');
const learningConfirm = document.querySelector('#learning-confirm');
const cardTestView = document.querySelector('#card-test');
const cardTestCards = document.querySelector('#card-test-cards');
const cardTestConfirm = document.querySelector('#card-test-confirm');
const cardTestResult = document.querySelector('#card-test-result');
const cardTestTitle = document.querySelector('#card-test-title');
const cardTestAudioHint = document.querySelector('#card-test-audio-hint');
const cardTestSunflower=document.querySelector('#card-test-sunflower');
const cardTestSunflowerImage=new Image();cardTestSunflowerImage.src='assets/cardtest/end-sunflower.webp';
const practiceWriteView = document.querySelector('#practice-write');
const practiceWriteError = document.querySelector('#practice-write-error');
const practiceWriteCanvas = document.querySelector('#practice-write-canvas');
const practiceWriteContext = practiceWriteCanvas.getContext('2d');
const practiceResultCanvas = document.querySelector('#practice-write-result-animation');
const practiceResultContext = practiceResultCanvas.getContext('2d');
const practiceWriteEnd = document.querySelector('#practice-write-end');
const practiceWriteConfirm = document.querySelector('#practice-write-confirm');
let practiceWriting = null;
const levelGrid = document.querySelector('#level-grid');
const worldTabs = document.querySelector('#world-tabs');
const gateLevelsImage = document.querySelector('#gate-levels-image');
const gateLocks = document.querySelector('#gate-locks');
const gateMission = document.querySelector('#gate-mission');
const gateMissionLabel = document.querySelector('#gate-mission-label');
const gateMissionYes = document.querySelector('#gate-mission-yes');
const gatePurchaseTip = document.querySelector('#gate-purchase-tip');
const gatePurchaseTipImage = document.querySelector('#gate-purchase-tip-image');
const gatePurchaseTipMan = document.querySelector('#gate-purchase-tip-man');
const gatePurchaseTipHand = document.querySelector('#gate-purchase-tip-hand');
const gateTipNext = document.querySelector('#gate-tip-next');
const gateTipBuy = document.querySelector('#gate-tip-buy');
const gateTipClose = document.querySelector('#gate-tip-close');
const stageLabel = document.querySelector('#stage-label');
const writingOverlay = document.querySelector('#writing-overlay');
const writingCanvas = document.querySelector('#writing-canvas');
const writingContext = writingCanvas.getContext('2d');
const writingResultCanvas = document.querySelector('#writing-result-canvas');
const writingResultContext = writingResultCanvas.getContext('2d');
const writingProgress = document.querySelector('#writing-progress');

const WORLD_NAMES = ['阳光花园', '神秘埃及', '海盗港湾', '狂野西部'];
// Game.onNextGate dispatches each world's final stage to a different minigame.
const WORLD_FINALE = {1:{stage:4,page:'match.html'},2:{stage:6,page:'joint.html'},
  3:{stage:5,page:'roll.html'},4:{stage:5,page:'pull.html'}};
const WORLD_FINALE_NAMES = ['翻翻乐', '拼拼乐', '推推乐', '抓抓乐'];
// Pixel bounds of each card's locked (frame 2) SWF sprite inside gate list 6440.
const GATE_LOCK_ART = {
  1:[[70,9,139,207],[295,6,144,210],[524,0,139,216],[70,234,139,212],[296,232,145,214]],
  2:[[6,21,166,194],[208,7,139,209],[399,11,140,205],[585,23,139,193],
     [70,250,139,196],[266,245,212,201],[507,235,181,211]],
  3:[[54,15,181,204],[279,15,181,201],[508,11,181,199],
     [51,241,181,203],[279,239,181,205],[510,237,181,207]],
  4:[[54,15,181,204],[279,12,181,204],[508,6,181,204],
     [54,240,181,204],[284,240,181,204],[524,240,147,204]]
};
// Plant_N.makeBullet writes these integer values to the native bullet.damage field.
const PLANT_DAMAGE = [0,1,1,1,1,1,2,2,1,1,1,2,1];
// Plant_N._atksound is copied onto every makeBullet/makeSkillBullet result.
const PLANT_ATTACK_SOUND = [null,
  'plant_attack_sound1','plant_attack_sound2','plant_attack_sound2',
  'plant_attack_sound1','plant_attack_sound3','plant_attack_sound2',
  'plant_attack_sound4','plant_attack_sound3','plant_attack_sound1',
  'plant_attack_sound1','plant_attack_sound2','plant_attack_sound1'];
const PLANT_HIT_SOUND = [null,
  'hit_sound','hit_sound','hit_sound2','hit_sound',
  'hit_sound','hit_sound5','hit_sound9','hit_sound7',
  'hit_sound','hit_sound','hit_sound5','hit_sound'];
// Game.onSkillUse plays these once when the sattack frame event arrives.
const SKILL_SOUND = {1:'plant_sattack_sound1',2:'plant_attack_sound2',
  3:'plant_attack_sound2',4:'plant_sattack_sound1',
  5:'plant_sattack_sound2',6:'plant_attack_sound2',
  7:'plant_sattack_sound3',11:'plant_attack_sound2'};
// Plant_N.makeBullet writes these native `type` integers.
const PLANT_BULLET_TYPE = [0,0,1,1,0,3,4,5,8,7,10,4,11];
// Plant_N.makeBullet and makeSkillBullets write the native `effect` field.
const PLANT_BULLET_EFFECT = [0,0,0,0,2,0,0,0,0,0,0,2,0];
const SKILL_BULLET_EFFECT = {3:1,11:2};
// Plant_N constructor px/py values, added to the plant's stage x/y by Game.newbullet.
const PLANT_MUZZLE = [null,[35,-45],[30,-103],[20,-119],[34,-42],[34,-42],
  [16,-70],[64,-54],[-10,-48],[35,-45],[35,-45],[16,-70],[35,-45]];
// Game.damageHandle uses x += dir * 20 per SWF frame for these types.
const LINEAR_BULLET_TYPES = new Set([0,5,7,8,10]);
const ARC_BULLET_TYPES = new Set([1,4]);
// Direct damage from the verified makeSkillBullet(s) constructors.
// Plant_7 and Plant_8 use zero direct damage and kill through the type 6/9 collision branches.
const SKILL_BULLET_DAMAGE = {2:2,3:1,6:3,7:0,8:0,10:5,11:3};
// Plant_1/9/10/12 makeBullet use the same AOT constructor slot (+7000).
const BULLET_VISUAL = {1:'bullet_1',2:'bullet_2',3:'bullet_3',4:'bullet_4',5:'bullet_5',
  6:'bullet_6',7:'bullet_7',8:'bullet_8',9:'bullet_1',10:'bullet_1',11:'bullet_9',12:'bullet_1'};
const SKILL_BULLET_VISUAL = {2:'bullet_2_1',3:'bullet_3_1',6:'bullet_6_1',
  7:'bullet_7_1',8:'bullet_8_1',10:'bullet_10',11:'bullet_9_1'};
const SKILL_VOLLEY_VISUAL = {2:'bullet_2',6:'bullet_6_2',11:'bullet_9_2'};
// The twenty Zombie_N AIR classes reuse twelve SWF bodies and eight hat symbols.
// This order follows the Zombie_1..Zombie_20 metadata in the ARM executable.
const ZOMBIE_VISUAL = [null,
  [1,0],[1,1],[1,2],[2,0],[2,3],[2,4],[3,0],[4,0],[5,0],
  [5,5],[5,6],[6,0],[7,0],[8,0],[9,0],[9,7],[9,8],[10,0],[11,0],[12,0]];
// Zombie_N constructors position their hat child relative to the zombie's origin.
const ZOMBIE_HAT_OFFSET = {2:[-65,-92],3:[-65,-92],5:[-68,-88],6:[-68,-88],
  10:[-65,-85],11:[-62,-82],16:[-77,-96],17:[-77,-92]};
// These constructors set Zombie_N.type = 1; the others retain type = 0.
const ZOMBIE_TYPE_ONE = new Set([3,6,11,17]);
const BROKEN_ZOMBIE_IDS = new Set([7,8,12,14,18,20]);
// Zombie_N.Damage constructs these half-life effects at the listed stage offsets.
const BROKEN_EFFECTS = {
  7:{sprite:'zombie_3_wand',offset:[-74,-65],frames:20},
  12:{sprite:'zombie_6_barrel',offset:[-135,-45],frames:20},
  14:{sprite:'zombie_8_bird',offset:[-153,-154],frames:40},
  18:{sprite:'zombie_10_coat',offset:[-73,-54],frames:10},
  20:{sprite:'zombie_12_zombieDown',offset:[-107,-93],frames:40},
};
// SWF special-plant frame scripts dispatch their damage/freeze events here.
const SPECIAL_EVENT_FRAME = {1:18,2:50,3:32,4:11,5:10};
const FREEZE_FRAMES = 180;
const BUTTER_HIT_FRAMES = 240;
// froze_icon's SWF shape starts at (-39.65,-27.15). Game.onFrozeStart
// positions it at (zombie.x + 15, specialPlant.y + 10).
const FREEZE_ICON_OFFSET = [-24.65,-17.15];
// bullet_3_1's second frame places nested sprite 7393 at (-28,-25).
// Game.damageHandle moves the bullet to zombie (-20,-60) on impact.
const BUTTER_HIT_OFFSET = [-48,-85];
// _maxlife assignments from Zombie_1..Zombie_20 AOT constructors.
const ZOMBIE_LIFE = [0,1,2,4,1,2,3,4,5,1,2,3,3,1,5,1,2,3,4,1,3];
// Game.onScale grows the victory light by .02 per 30 fps frame from .1 to 1.
// onLighton waits 3000 ms after a click; Game.onTimer waits 1000 ms
// after a zombie reaches the house before Game.fail.
const WIN_SCALE_FRAMES=45;
// Game.init places the 68×68 native controls at these stage coordinates.
const PAUSE_BUTTON_RECT={x:10,y:5,w:68,h:68};
const AUDIO_BUTTON_RECT={x:950,y:5,w:68,h:68};
// DefineButton2 hitTest bounds plus their SWF PlaceObject2 translations.
const HELP_BUTTON_RECT={x:840.45,y:263.5,w:73,h:73};
const HELP_BACK_RECT={x:9.25,y:5.2,w:68,h:68};
const HELP_NEXT_RECT={x:937.7,y:347.5,w:73,h:73};
const HELP_REPLAY_RECT={x:291.15,y:373.9,w:170,h:65};
const HELP_CLOSE_RECT={x:595.2,y:373.9,w:170,h:65};
let progressStorageError=false,progressReadError=false;
// Results that could not be fully persisted must survive a later refresh.
const pendingCompleted=new Set(),pendingScores=new Map();
function readStorage(key){
  try{return localStorage.getItem(key);}catch{return null;}
}
function writeStorage(key,value){
  try{localStorage.setItem(key,value);return true;}catch{return false;}
}
function readProgress(key,fallback,validate){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null)return fallback;
    const value=JSON.parse(raw);
    if(validate(value))return value;
  }catch{}
  progressStorageError=true;progressReadError=true;
  return fallback;
}
const completed = new Set(readProgress('pvz-game-completed',[],value=>Array.isArray(value)&&value.every(id=>typeof id==='string')));
const gateScores = readProgress('pvz-game-scores',{},value=>value!==null&&typeof value==='object'&&!Array.isArray(value));
function refreshGateProgress(){
  try{
    const savedCompleted=JSON.parse(localStorage.getItem('pvz-game-completed')??'[]');
    const savedScores=JSON.parse(localStorage.getItem('pvz-game-scores')??'{}');
    if(!Array.isArray(savedCompleted)||!savedCompleted.every(id=>typeof id==='string')||
       !savedScores||typeof savedScores!=='object'||Array.isArray(savedScores))throw Error('Invalid progress');
    completed.clear();for(const id of savedCompleted)completed.add(id);
    for(const key of Object.keys(gateScores))delete gateScores[key];
    for(const [key,value] of Object.entries(savedScores))
      Object.defineProperty(gateScores,key,{value,writable:true,enumerable:true,configurable:true});
    for(const id of pendingCompleted)completed.add(id);
    for(const [id,score] of pendingScores)gateScores[id]=score;
    // A transient storage denial or corrupted save can be fixed externally.
    // Resume writes only after both records have been read and validated.
    progressReadError=false;
    progressStorageError=pendingCompleted.size>0||pendingScores.size>0;
  }catch{progressStorageError=true;progressReadError=true;}
}

let content;
let spriteIndex;
let soundIndex;
let handwritingIndex;
let writeAssetIndex;
let writeResultIndex;
let writeDemoIndex;
let zombieMotion;
let cardCoverContent;
let learningAssets;
let cardTestAssets;
let currentWorld = 1;
let game = null;
let coverLevel = null;
let learningState = null;
let cardTestState = null;
let audio = null;
let pronunciationBlocked=null,pronunciationAttempt=0,pronunciationOnFailure=null;
let suspendedPronunciation=null,pronunciationPlayPending=false;
const pronunciationRetryEvents=new WeakSet();
let tipAudio = null;
let tipAudioBlocked=null,tipAudioAttempt=0;
let suspendedTipAudio=null,tipAudioPending=false;
let helpAudio = null;
let helpAudioUrl = null;
let voiceEnabled = readStorage('pvz-game-voice') !== 'off';
let musicEnabled = readStorage('pvz-sound') !== 'off';
function storedVolume(key,fallback=.3) {
  const raw=readStorage(key);
  const value=raw===null?fallback:Number(raw);
  return Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
}
let lastMusicVolume=storedVolume('pvz-music-last-volume')||.3;
let musicVolume=musicEnabled?(storedVolume('pvz-music-volume')||lastMusicVolume):0;
let lastEffectsVolume=storedVolume('pvz-effects-last-volume')||.3;
let effectsVolume=voiceEnabled?(storedVolume('pvz-effects-volume')||lastEffectsVolume):0;
let volumeDrag=null;
const battleMusic = new Audio();
battleMusic.loop = true;
let battleMusicActive=false,battleMusicBlocked=false,battleMusicAttempt=0;
const gateMusic = new Audio();
gateMusic.loop = true;
let activeEffect=null,suspendedEffect=null,effectAttempt=0,effectPending=false;
let previousFrame = 0;
let simulationRemainder = 0;
let battleHiddenAt=document.hidden?performance.now():null;
let helpAnimation = null;
let helpImageRequest=0;
const images = new Map();
let remarkFrameCache=null;
const cardTextures = new Map();
const cardHitMasks = new WeakMap();
const slowedFrames = new Map();
const writingImages = new Map();
const writingResultImages = new Map();

function spritePath(name, frame = 0) {
  const sprite=spriteIndex?.[name],frames=sprite?.frames;
  if(!frames?.length)return null;
  const index=frame%frames.length;
  return sprite.trimmed?.[index]?.path||frames[index];
}
function imageFor(name, frame = 0) {
  if(name==='remark_panel_base'&&spriteIndex?.[name]?.deltas){
    const sprite=spriteIndex[name],index=frame%sprite.frames.length;
    const base=images.get(sprite.frames[0]),delta=sprite.deltas[index];
    const patch=delta?images.get(delta.path):null;
    if(!base||(delta&&!patch))return null;
    if(!remarkFrameCache){
      const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;
      remarkFrameCache={canvas,context:canvas.getContext('2d'),index:-1,base:null,patch:null};
    }
    const cache=remarkFrameCache;
    if(cache.index!==index||cache.base!==base||cache.patch!==patch){
      const context=cache.context;
      context.globalCompositeOperation='copy';context.drawImage(base,0,0);
      if(patch){context.save();context.beginPath();context.rect(delta.x,delta.y,patch.width,patch.height);
        context.clip();context.drawImage(patch,delta.x,delta.y);context.restore();}
      context.globalCompositeOperation='source-over';
      cache.index=index;cache.base=base;cache.patch=patch;
    }
    return cache.canvas;
  }
  const path = spritePath(name, frame);
  return path ? images.get(path) : null;
}
function cardImage(name,back,penVisible) {
  if(back||penVisible)return imageFor(name,back?1:0);
  const path=spriteIndex?.[name]?.faceWithoutPen;
  return (path&&images.get(path))||imageFor(name,0);
}
function cardTexture(choice, mode, back) {
  const penVisible=mode===1&&game.cardPenVisible;
  const key=`${mode}:${choice}:${back}:${penVisible}`;
  if(cardTextures.has(key))return cardTextures.get(key);
  const name=mode===1?`com.webelephant.module.Game.card_${choice}`:
    'com.webelephant.module.Game.card_0';
  const image=cardImage(name,back,penVisible);
  if(!image)return null;
  const surface=document.createElement('canvas');
  surface.width=image.width;surface.height=image.height;
  const paint=surface.getContext('2d');
  paint.drawImage(image,0,0);
  if(mode!==1&&!back){
    // The original card_0 text field's placement matrix has scaleX = -1.
    // Its 180° card rotation makes the final lettering read left to right.
    paint.save();paint.translate(surface.width/2,surface.height/2);
    paint.scale(-1,1);paint.font='80px PvZPinyin';
    paint.fillStyle='#1188ff';paint.textAlign='center';paint.textBaseline='middle';
    paint.fillText(displayPinyin(choice),0,0);paint.restore();
  }
  cardTextures.set(key,surface);
  return surface;
}
function drawRotatedCard(texture,centerX,centerY,angle) {
  // AIR's default root projection is 55° with its vanishing point at the
  // center of the 1024×768 stage. Narrow strips approximate its 3D quad.
  const focal=512/Math.tan(55*Math.PI/360);
  const radians=angle*Math.PI/180;
  const cosine=Math.cos(radians),sine=Math.sin(radians);
  const width=texture.width,height=texture.height;
  if(angle===0){
    ctx.drawImage(texture,centerX-width/2,centerY-height/2);
    return;
  }
  if(angle===180){
    ctx.save();ctx.translate(centerX,centerY);ctx.scale(-1,1);
    ctx.drawImage(texture,-width/2,-height/2);ctx.restore();
    return;
  }
  const project=(u,v)=>{
    const scale=focal/(focal-u*sine);
    return [512+(centerX+u*cosine-512)*scale,
      384+(centerY+v-384)*scale];
  };
  for(let x=0;x<width;x+=2){
    const strip=Math.min(2,width-x),left=x-width/2,right=left+strip;
    const topLeft=project(left,-height/2);
    const topRight=project(right,-height/2);
    const bottomLeft=project(left,height/2);
    ctx.save();
    ctx.setTransform((topRight[0]-topLeft[0])/strip,
      (topRight[1]-topLeft[1])/strip,
      (bottomLeft[0]-topLeft[0])/height,
      (bottomLeft[1]-topLeft[1])/height,topLeft[0],topLeft[1]);
    ctx.drawImage(texture,x,0,strip,height,0,0,strip,height);
    ctx.restore();
  }
}
function stopHelpAnimation() {
  const animation=helpAnimation;
  helpAnimation=null;
  if(animation){
    clearTimeout(animation.audioTimer);clearTimeout(animation.stopTimer);
    animation.controller?.abort();
    if(animation.element){
      animation.element.onload=null;animation.element.onerror=null;
      animation.element.removeAttribute('src');animation.element.remove();
    }
  }
  helpAudio?.pause();
  animation?.frame?.close();
  animation?.decoder?.close();
}
function failHelpAnimation(state) {
  if(helpAnimation!==state)return;
  if(game)game.helpAnimationError=true;
  stopHelpAnimation();
}
function rejectBattleHelpAudio(owner,player){
  if(game!==owner||helpAudio!==player)return;
  player.pause();helpAudio=null;
  if(helpAudioUrl)URL.revokeObjectURL(helpAudioUrl);
  helpAudioUrl=null;
  if(owner.helpPage!==null){owner.helpAudioError=true;stopHelpAnimation();}
}
function loadBattleHelpAudio(owner){
  if(game!==owner)return Promise.reject(new Error('Battle changed'));
  if(helpAudio)return Promise.resolve();
  if(owner.helpAudioPromise)return owner.helpAudioPromise;
  const path=spriteIndex?.[`help_g${owner.level.mode===1?1:2}`]?.audio?.path;
  if(!path)return Promise.reject(new Error('Help audio is missing'));
  const pending=fetch(path).then(response=>{
    if(!response.ok)throw new Error(`Help audio ${response.status}`);
    return response.blob();
  }).then(blob=>{
    const url=URL.createObjectURL(blob);
    if(game!==owner){URL.revokeObjectURL(url);return;}
    const player=new Audio(url);helpAudioUrl=url;helpAudio=player;
    player.addEventListener('error',()=>rejectBattleHelpAudio(owner,player),{once:true});
    player.preload='auto';
  });
  owner.helpAudioPromise=pending;
  pending.then(()=>{if(owner.helpAudioPromise===pending)owner.helpAudioPromise=null;},
               ()=>{if(owner.helpAudioPromise===pending)owner.helpAudioPromise=null;});
  return pending;
}
function stopTipAudio() {
  tipAudioBlocked=null;tipAudioAttempt++;
  suspendedTipAudio=null;tipAudioPending=false;
  if(!tipAudio)return;
  tipAudio.pause();
  tipAudio.currentTime=0;
  tipAudio=null;
}
function tryTipAudio(player){
  if(tipAudio!==player)return;
  tipAudioBlocked=null;
  const attempt=++tipAudioAttempt;
  if(document.hidden){suspendedTipAudio=player;return;}
  tipAudioPending=true;
  player.play().then(()=>{if(tipAudioAttempt===attempt)tipAudioPending=false;}).catch(error=>{
    if(tipAudio===player&&tipAudioAttempt===attempt){tipAudioPending=false;if(error?.name==='NotAllowedError')tipAudioBlocked=player;}
  });
}
function startTipAudio(path){
  stopTipAudio();tipAudio=new Audio(path);tryTipAudio(tipAudio);
}
document.addEventListener('pointerdown',()=>{
  if(tipAudioBlocked)tryTipAudio(tipAudioBlocked);
},{capture:true,passive:true});
function startHelpSound(state) {
  if(!helpAudio || helpAnimation!==state)return;
  const help=spriteIndex[`help_g${game.level.mode===1?1:2}`];
  const stream=help?.audio;
  if(!stream)return;
  const firstFrame=help.starts[state.page];
  const delay=Math.max(0,stream.firstAudioFrame-firstFrame)*1000/stream.frameRate;
  const seek=stream.seekSamples?.[firstFrame];
  const offset=Number.isFinite(seek)?seek/stream.sampleRate:
    stream.latencySamples/stream.sampleRate+Math.max(0,firstFrame-stream.firstAudioFrame)/stream.frameRate;
  state.soundStart=state.start+delay;
  state.soundOffset=offset;
  const begin=()=>{
    if(helpAnimation!==state)return;
    if(helpAudio.readyState<1)helpAudio.addEventListener('loadedmetadata',()=>playHelpSound(state),{once:true});
    else playHelpSound(state);
  };
  if(delay)scheduleHelpTimer(state,'audioTimer',delay,begin);
  else begin();
}
function scheduleHelpTimer(state,key,delay,callback){
  state[key+'Remaining']=Math.max(0,delay);state[key+'Callback']=callback;
  if(document.hidden){state[key+'Suspended']=true;return;}
  state[key+'Suspended']=false;state[key+'Due']=performance.now()+state[key+'Remaining'];
  state[key]=setTimeout(()=>{state[key]=null;if(helpAnimation===state)callback();},state[key+'Remaining']);
}
function playHelpSound(state) {
  if(helpAnimation!==state || !helpAudio)return;
  if(document.hidden){state.resumeSound=true;return;}
  if(performance.now()-state.start>=state.total)return;
  state.soundBlocked=false;
  const attempt=state.soundAttempt=(state.soundAttempt||0)+1;
  const player=helpAudio,owner=game;
  player.currentTime=state.soundOffset+Math.max(0,performance.now()-state.soundStart)/1000;
  // SWF stream audio plays on the help clip with its default transform.
  player.volume=1;
  state.soundPending=true;
  player.play().then(()=>{if(state.soundAttempt===attempt)state.soundPending=false;}).catch(error=>{
    if(helpAnimation===state && helpAudio===player && state.soundAttempt===attempt){
      state.soundPending=false;
      if(error?.name==='NotAllowedError')state.soundBlocked=true;
      else if(error?.name==='NotSupportedError')rejectBattleHelpAudio(owner,player);
    }
  });
}
document.addEventListener('pointerdown',()=>{
  const state=helpAnimation;
  if(state?.soundBlocked)playHelpSound(state);
},{capture:true,passive:true});
function beginHelpAnimation(state) {
  if(helpAnimation!==state)return;
  state.start=performance.now();
  scheduleHelpTimer(state,'stopTimer',state.total,()=>{
    if(helpAnimation===state)stopHelpAnimation();
  });
  startHelpSound(state);
}
function useHelpImage(state,path) {
  if(helpAnimation!==state)return;
  const element=new Image();
  element.style.cssText='position:absolute;left:-5.5615%;top:0;width:106.25%;'+
    'height:106.3802%;pointer-events:none;z-index:1';
  canvas.parentElement.append(element);
  state.element=element;
  element.onload=()=>beginHelpAnimation(state);
  element.onerror=()=>failHelpAnimation(state);
  element.src=path;
}
function showHelpPage(page) {
  battleHelpPress=null;
  stopHelpAnimation();
  if(!game)return;
  const owner=game,request=++helpImageRequest;
  const name=`help_g${owner.level.mode===1?1:2}`;
  const help=spriteIndex?.[name];
  for(const path of help?.frames||[])images.delete(path);
  game.helpPage=page;
  owner.helpImageError=false;
  owner.helpAnimationError=false;
  owner.helpAudioError=false;
  if(page===null)return;
  stopAudio();
  const path=help?.frames?.[page];
  if(path)loadImage(path,()=>game===owner&&owner.helpPage===page&&helpImageRequest===request)
    .catch(()=>{if(game===owner&&owner.helpPage===page&&helpImageRequest===request)owner.helpImageError=true;});
  const section=help?.animations?.[page];
  if(!section)return;
  const state={page,frame:null,frameIndex:-1,decoder:null,decoding:false,
    durations:section.durations,total:section.durations.reduce((a,b)=>a+b,0),start:0};
  helpAnimation=state;
  state.controller=new AbortController();
  loadBattleHelpAudio(owner).catch(()=>{const error=new Error('Help audio failed');error.helpAudioLoad=true;throw error;}).then(()=>{
    if(helpAnimation!==state)return null;
    return fetch(section.path,{signal:state.controller.signal});
  }).then(response=>{
    if(helpAnimation!==state)return null;
    if(!response.ok)throw new Error(`Help animation ${response.status}`);
    return response.arrayBuffer();
  }).then(async data=>{
    if(helpAnimation!==state)return;
    let decoder,first;
    if(typeof ImageDecoder==='function'){
      try{
        decoder=new ImageDecoder({data:data.slice(0),type:'image/webp'});
        state.decoder=decoder;state.nativeDecoder=true;
        await decoder.tracks.ready;
        if(helpAnimation!==state)return;
        first=await decoder.decode({frameIndex:0});
      }catch(error){
        if(helpAnimation!==state)return;
        decoder?.close();state.decoder=null;
      }
    }
    if(!first){
      decoder=new PvzWebPFrameDecoder({data,checkpointBase:section.path.replace(/\.webp$/,'')});
      state.decoder=decoder;state.nativeDecoder=false;first=await decoder.decode({frameIndex:0});
    }
    if(helpAnimation!==state){first.image.close();return;}
    state.frame=first.image;state.frameIndex=0;beginHelpAnimation(state);
  }).catch(error=>{
    if(helpAnimation!==state)return;
    if(error?.helpAudioLoad){owner.helpAudioError=true;stopHelpAnimation();return;}
    state.frame?.close();state.frame=null;
    state.decoder?.close();state.decoder=null;
    useHelpImage(state,section.path);
  });
}
function drawHelpAnimation(state) {
  if(state?.element){
    if(state.start && performance.now()-state.start>=state.total){
      stopHelpAnimation();return false;
    }
    return !!state.start;
  }
  if(!state?.frame)return false;
  const elapsed=performance.now()-state.start;
  if(elapsed>=state.total){stopHelpAnimation();return false;}
  let offset=0,index=0;
  while(index<state.durations.length-1 &&
        elapsed>=offset+state.durations[index])offset+=state.durations[index++];
  if(index!==state.frameIndex && !state.decoding){
    state.decoding=true;
    state.decoder.decode({frameIndex:index}).then(result=>{
      if(helpAnimation!==state){result.image.close();return;}
      state.frame?.close();state.frame=result.image;state.frameIndex=index;
      state.decoding=false;
    }).catch(()=>{
      if(helpAnimation!==state)return;
      if(state.nativeDecoder){recoverHelpDecoder(state,index);return;}
      failHelpAnimation(state);
    });
  }
  ctx.drawImage(state.frame,-56.95,0);
  return true;
}
async function recoverHelpDecoder(state,index){
  try{
    state.decoder?.close();state.decoder=null;state.nativeDecoder=false;
    const path=spriteIndex[`help_g${game.level.mode===1?1:2}`].animations[state.page].path;
    const response=await fetch(path,{signal:state.controller.signal});
    if(!response.ok)throw new Error(`Help animation ${response.status}`);
    const data=await response.arrayBuffer();
    if(helpAnimation!==state)return;
    const decoder=new PvzWebPFrameDecoder({data,checkpointBase:path.replace(/\.webp$/,'')});state.decoder=decoder;
    const result=await decoder.decode({frameIndex:index});
    if(helpAnimation!==state){result.image.close();return;}
    state.frame?.close();state.frame=result.image;state.frameIndex=index;state.decoding=false;
  }catch(error){failHelpAnimation(state);}
}
function loadImage(path, shouldCache=()=>true) {
  if (!path) return Promise.resolve();
  if (images.has(path)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { if(shouldCache())images.set(path, img); resolve(); };
    img.onerror = () => reject(new Error(`无法加载游戏图片：${path}`));
    img.src = path;
  });
}
async function loadLevelImages(level) {
  const loadingGame=game;
  // Only retain the current stage's full-size grass frames.
  const grassFrames=spriteIndex.game_bg1_grass?.frames||[];
  const grassStart=level.world===1 && level.stage<=3?[0,49,98][level.stage-1]:145;
  const grassEnd=level.world===1 && level.stage<=3?[49,98,146][level.stage-1]:146;
  const names = [`game_bg${level.world}_base`,
    ...(level.world===1?['game_bg1_grass','game_bg1_grass_without_lanes']:[]),
    'game_ground_lane', 'sunshine', 'energy_bar', 'zombie_shadow',
    'com.webelephant.module.Game.card_0', 'btn_audio', 'audio_on_button', 'audio_off_button', 'btn_pause', 'confirm_panel',
    'pause_exit','pause_replay','pause_continue','pause_help',
    `help_loading_back_g${level.mode===1?1:2}`,
    'mc_exit_bg', 'mc_exit_yes', 'mc_exit_cancel', 'mc_exit_text',
    'arrow_mc', 'victory_light_background', `victory_light_reward_${level.world}_${level.stage}`, 'faint_mc', 'result_icon',
    'pause_slider_back','pause_slider_front','pause_slider_thumb',
    ...(level.world===2&&level.stage===2?['game_tip']:[]),
    'game_over','game_over_base','game_over_back','game_over_replay','remark_next',
    'remark_panel_base',`remark_reward_${level.world}`,
    ...(level.mode===1 ? level.letters.map(letter=>
      `com.webelephant.module.Game.card_${letter.text}`) : []),
    ...(level.specialPlant ? [`specialPlant_${level.specialPlant}`,
      `special_motion_${level.specialPlant}_idle`,
      `special_motion_${level.specialPlant}_active`] : []),
    ...(level.specialPlant===1 ? ['froze_icon'] : []),
    ...(level.plants.includes(3) ? ['butter_hit'] : []),
    ...(level.plants.includes(5) ? ['hit_5'] : []),
    ...(level.plants.includes(8) ? ['hit_8','hit_8_1'] : []),
    ...level.plants.flatMap(id => {
      const bullets=[BULLET_VISUAL[id],SKILL_BULLET_VISUAL[id],
        SKILL_VOLLEY_VISUAL[id]].filter(Boolean);
      return [`plant_${id}`, `plant_motion_${id}_idle`,
        `plant_motion_${id}_attack`, `plant_motion_${id}_super`,
        `plant_motion_${id}_click`,
        ...bullets,...bullets.map(name=>`bullet_hit_${name}`),
        ...bullets.map(name=>`bullet_flight_${name}`)];
    }),
    ...level.zombies.flatMap(zombie => {
      const [body, hat] = ZOMBIE_VISUAL[zombie.id] || [1,0];
      const walk=zombieMotion.sources[String(body)];
      const death=zombieMotion.deathSources[String(body)];
      const broken=zombieMotion.brokenSources[String(body)];
      const eat=`zombie_eat_${body}_normal`;
      const eatBroken=zombieMotion.eatSources?.[String(body)]?.broken&&
        `zombie_eat_${body}_broken`;
      return [walk,death,broken,eat,eatBroken,hat&&`zombie_hat${hat}`,
        hat&&zombieMotion.hatDropSources[String(hat)],
        BROKEN_EFFECTS[zombie.id]?.sprite].filter(Boolean);
    })];
  const paths = [...new Set(names.flatMap(name => {
    const sprite=spriteIndex[name];
    if(name==='remark_panel_base'&&sprite?.deltas)
      return [sprite.frames[0],...sprite.deltas.filter(Boolean).map(delta=>delta.path)];
    if(name==='game_bg1_grass'){
      return (sprite?.trimmed?.map(item=>item.path)||sprite?.frames||[]).slice(grassStart,grassEnd);
    }
    if(sprite?.trimmed)return sprite.trimmed.map(item=>item.path);
    return [...(sprite?.sheet?[sprite.sheet]:sprite?.frames||[]),
      ...(sprite?.faceWithoutPen?[sprite.faceWithoutPen]:[])];
  }))];
  const needed=new Set(paths);
  for(const path of images.keys())if(!needed.has(path))images.delete(path);
  cardTextures.clear();
  slowedFrames.clear();
  remarkFrameCache=null;
  // Hundreds of Image objects at once can put unnecessary pressure on a
  // tablet when their data and decoded surfaces arrive together. Stop
  // starting queued requests as soon as the player leaves or one fails.
  let cursor=0,failed=false;
  async function loadNext(){
    while(game===loadingGame&&!failed&&cursor<paths.length){
      const path=paths[cursor++];
      try{await loadImage(path,()=>game===loadingGame&&!failed);}
      catch(error){failed=true;throw error;}
    }
  }
  await Promise.all(Array.from({length:Math.min(8,paths.length)},loadNext));
}
function zombieSprite(id) {
  const body=(ZOMBIE_VISUAL[id] || [1])[0];
  return zombieMotion.sources[String(body)];
}
function zombieDeathSprite(id) {
  const body=(ZOMBIE_VISUAL[id] || [1])[0];
  return zombieMotion.deathSources[String(body)];
}
function walkPosition(body, frame) {
  const frames=zombieMotion.walks[String(body)];
  const cycles=Math.floor(frame/frames.length);
  const local=frame-cycles*frames.length;
  const index=Math.floor(local), blend=local-index;
  const next=Math.min(index+1,frames.length-1);
  return cycles*(frames.at(-1)-frames[0])+frames[index]+(frames[next]-frames[index])*blend;
}
function drawSprite(name, x, baseline, maxWidth, maxHeight, frame = 0) {
  const sprite=spriteIndex?.[name];
  if (sprite?.sheet) {
    const img=images.get(sprite.sheet);
    if (!img) return;
    const scale=Math.min(maxWidth/sprite.frameWidth,maxHeight/sprite.frameHeight,1);
    const w=sprite.frameWidth*scale,h=sprite.frameHeight*scale;
    const index=frame%sprite.frameCount;
    ctx.drawImage(img,(index%sprite.columns)*sprite.frameWidth,
      Math.floor(index/sprite.columns)*sprite.frameHeight,sprite.frameWidth,sprite.frameHeight,
      x-w/2,baseline-h,w,h);
    return;
  }
  const img = imageFor(name, frame);
  if (!img) return;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, x - w / 2, baseline - h, w, h);
}
function slowedSpriteFrame(name,frame,dim=false,slowed=true) {
  const sprite=spriteIndex?.[name];
  if(!sprite)return null;
  const index=frame%(sprite.frameCount||sprite.frames?.length||1);
  const key=`${name}:${index}:${dim?'dim':''}:${slowed?'slow':''}`;
  if(slowedFrames.has(key)){
    const cached=slowedFrames.get(key);
    slowedFrames.delete(key);slowedFrames.set(key,cached);
    return cached;
  }
  const image=sprite.sheet?images.get(sprite.sheet):imageFor(name,index);
  if(!image)return null;
  const width=sprite.sheet?sprite.frameWidth:image.width;
  const height=sprite.sheet?sprite.frameHeight:image.height;
  const tinted=document.createElement('canvas');
  tinted.width=width;tinted.height=height;
  const context=tinted.getContext('2d',{willReadFrequently:true});
  if(sprite.sheet)
    context.drawImage(image,(index%sprite.columns)*width,
      Math.floor(index/sprite.columns)*height,width,height,0,0,width,height);
  else context.drawImage(image,0,0);
  // Apply AIR's red-channel removal and death darkening directly so Safari
  // versions without CanvasRenderingContext2D.filter render the same effect.
  const pixels=context.getImageData(0,0,width,height);
  for(let i=0;i<pixels.data.length;i+=4){
    if(slowed)pixels.data[i]=0;
    if(dim){pixels.data[i]*=.1;pixels.data[i+1]*=.1;pixels.data[i+2]*=.1;}
  }
  context.putImageData(pixels,0,0);
  slowedFrames.set(key,tinted);
  if(slowedFrames.size>128)slowedFrames.delete(slowedFrames.keys().next().value);
  return tinted;
}
function drawRegisteredSprite(name, x, y, offset, frame = 0, slowed = false, dim = false) {
  const sprite=spriteIndex?.[name];
  if(!sprite||!offset)return;
  const left=x+offset[0],top=y+offset[1];
  if(slowed||dim){
    const tinted=slowedSpriteFrame(name,frame,dim,slowed);
    if(tinted)ctx.drawImage(tinted,left,top);
    return;
  }
  if(sprite.sheet){
    const img=images.get(sprite.sheet);
    if(!img)return;
    const index=frame%sprite.frameCount;
    ctx.drawImage(img,(index%sprite.columns)*sprite.frameWidth,
      Math.floor(index/sprite.columns)*sprite.frameHeight,sprite.frameWidth,sprite.frameHeight,
      left,top,sprite.frameWidth,sprite.frameHeight);
  }else{
    const img=imageFor(name,frame);
    if(img)ctx.drawImage(img,left,top);
  }
}
function drawZombieShadow(x,y,body,slowed=false,dim=false){
  const shadow=slowed||dim?slowedSpriteFrame('zombie_shadow',0,dim,slowed):imageFor('zombie_shadow');
  const offset=zombieMotion.shadowOffsets[String(body)];
  // DefineShape 4936's RECT begins at (-29.75, 31.35) from the parent origin.
  if(shadow&&offset)ctx.drawImage(shadow,x+offset[0]-29.75,y+offset[1]+31.35);
}
function box(x, y, w, h, fill, stroke = null, radius = 10) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function label(text, x, y, size = 24, color = '#fff', align = 'left', weight = 800) {
  ctx.font = `${weight} ${size}px system-ui,-apple-system,"PingFang SC",sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y);
}
function stopAudio(){
  pronunciationBlocked=null;pronunciationOnFailure=null;pronunciationAttempt++;
  suspendedPronunciation=null;pronunciationPlayPending=false;
  audio?.pause();
}
function tryPronunciation(player,onFailure){
  if(audio!==player)return;
  if(onFailure!==undefined)pronunciationOnFailure=onFailure;
  pronunciationBlocked=null;
  const attempt=++pronunciationAttempt;
  if(document.hidden){suspendedPronunciation=player;return;}
  pronunciationPlayPending=true;
  player.play().then(()=>{if(pronunciationAttempt===attempt)pronunciationPlayPending=false;}).catch(error=>{
    if(audio!==player||pronunciationAttempt!==attempt)return;
    pronunciationPlayPending=false;
    if(error?.name==='NotAllowedError')pronunciationBlocked=player;
    pronunciationOnFailure?.(error);
  });
}
document.addEventListener('pointerdown',event=>{
  if(pronunciationBlocked){pronunciationRetryEvents.add(event);tryPronunciation(pronunciationBlocked);}
},{capture:true,passive:true});
function playAudio(path) {
  // PlaySound uses Sound.play() directly; SoundManager's two volume controls
  // affect its background/effects channels, not this pronunciation channel.
  if (!path) return;
  stopAudio();
  audio = new Audio(path);
  audio.volume = 1;
  tryPronunciation(audio);
}
function playEffect(name) {
  playEffectPath(soundIndex?.[name]);
}
function playEffectPath(path) {
  if (!path) return;
  // SoundManager.addEffSound stops _sc2 before replacing it with the new
  // SoundChannel, even when the saved effect volume is zero.
  effectAttempt++;effectPending=false;suspendedEffect=null;activeEffect?.pause();
  const effect = new Audio(path);
  effect.volume = effectsVolume;
  activeEffect=effect;
  effect.addEventListener?.('ended',()=>{if(activeEffect===effect)activeEffect=null;},{once:true});
  tryEffect(effect);
}
function tryEffect(effect){
  if(activeEffect!==effect)return;
  const attempt=++effectAttempt;
  if(document.hidden){suspendedEffect=effect;return;}
  effectPending=true;
  effect.play().then(()=>{if(effectAttempt===attempt)effectPending=false;}).catch(()=>{
    if(activeEffect===effect&&effectAttempt===attempt){effectPending=false;activeEffect=null;}
  });
}
function playGardenBackEffect(){
  try{
    const raw=sessionStorage.getItem('pvz-garden-back-effect');
    sessionStorage.removeItem('pvz-garden-back-effect');
    if(raw===null)return;
    const age=Date.now()-Number(raw);
    if(Number.isFinite(age)&&age>=0&&age<30000)playEffect('click_sound');
  }catch{}
}
function playGateMusic(){
  if(selectView.hidden||document.hidden||!soundIndex?.bg_sound)return;
  if(!gateMusic.src){
    gateMusic.src=soundIndex.bg_sound;
    try{
      const handoff=JSON.parse(sessionStorage.getItem('pvz-gate-music-handoff')||'null');
      sessionStorage.removeItem('pvz-gate-music-handoff');
      const age=Date.now()-handoff?.at;
      if(Number.isFinite(handoff?.time)&&handoff.time>=0&&age>=0&&age<30000){
        const seek=()=>{
          if(selectView.hidden)return;
          const elapsed=handoff.playing?Math.max(0,Date.now()-handoff.at)/1000:0;
          const position=handoff.time+elapsed;
          gateMusic.currentTime=Number.isFinite(gateMusic.duration)&&gateMusic.duration>0
            ? position%gateMusic.duration : position;
        };
        if(gateMusic.readyState>=1)seek();else gateMusic.addEventListener('loadedmetadata',seek,{once:true});
      }
    }catch{}
  }
  gateMusic.volume=musicEnabled?musicVolume:0;
  if(gateMusic.paused)gateMusic.play().catch(()=>{});
}
function stopGateMusic(){gateMusic.pause();gateMusic.currentTime=0;}
function tryBattleMusic(){
  if(document.hidden||!battleMusicActive||!battleMusic.src||!battleMusic.paused)return;
  battleMusicBlocked=false;
  const attempt=++battleMusicAttempt;
  battleMusic.play().catch(error=>{
    if(battleMusicActive&&battleMusicAttempt===attempt&&error?.name==='NotAllowedError')battleMusicBlocked=true;
  });
}
document.addEventListener('pointerdown',()=>{
  if(battleMusicBlocked)tryBattleMusic();
},{capture:true,passive:true});
function startBattleMusic(world) {
  // Game.init selects fight_sound for worlds 1–2, fight_sound2 for 3,
  // and fight_sound4 for 4, on SoundManager's background channel.
  const name=world<=2?'fight_sound':world===3?'fight_sound2':'fight_sound4';
  battleMusicAttempt++;battleMusicBlocked=false;battleMusicActive=true;
  battleMusic.pause();
  battleMusic.src=soundIndex?.[name]||'';
  battleMusic.volume=musicEnabled?musicVolume:0;
  tryBattleMusic();
}
function stopBattleMusic() {
  battleMusicActive=false;battleMusicBlocked=false;battleMusicAttempt++;
  battleMusic.pause();battleMusic.currentTime=0;
}
function toggleBattleMusic() {
  setChannelVolume('music',musicEnabled?0:lastMusicVolume);
}
function setChannelVolume(channel,value) {
  value=Math.max(0,Math.min(1,value));
  if(channel==='music'){
    musicVolume=value;musicEnabled=value>0;
    if(value>0){lastMusicVolume=value;writeStorage('pvz-music-last-volume',String(value));}
    writeStorage('pvz-music-volume',String(value));
    writeStorage('pvz-sound',musicEnabled?'on':'off');
    battleMusic.volume=value;
    gateMusic.volume=value;
    if(game&&!game.result&&battleMusic.src&&battleMusic.paused)
      tryBattleMusic();
  }else{
    effectsVolume=value;voiceEnabled=value>0;
    if(value>0){lastEffectsVolume=value;writeStorage('pvz-effects-last-volume',String(value));}
    writeStorage('pvz-effects-volume',String(value));
    writeStorage('pvz-game-voice',voiceEnabled?'on':'off');
    if(activeEffect)activeEffect.volume=value;
  }
}
function displayPinyin(value) {
  const source=String(value).replaceAll('v','ü');
  const match=source.match(/^(.+)([1-4])$/);
  if (!match) return source;
  const base=match[1], tone=Number(match[2])-1;
  let index=base.indexOf('a');
  if (index<0) index=base.indexOf('e');
  if (index<0 && base.includes('ou')) index=base.indexOf('o');
  if (index<0) index=Math.max(...[...base].map((char,i)=>'aeiouü'.includes(char)?i:-1));
  if (index<0) return base;
  const marks={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};
  return base.slice(0,index)+marks[base[index]][tone]+base.slice(index+1);
}
function shuffledIndices(length) {
  const indices=Array.from({length},(_,index)=>index);
  for(let index=0;index<length-1;index++){
    const other=index+Math.floor(Math.random()*(length-index));
    [indices[index],indices[other]]=[indices[other],indices[index]];
  }
  return indices;
}
function initialCardPositions(level) {
  const positions=Array.from({length:level.mode===1?level.letters.length:6},()=>550+Math.random()*130);
  if(level.mode!==1){
    // Two 126px cards share each column. Keep their random top/bottom order,
    // but give both a fully visible, independently clickable position.
    for(let column=0;column<3;column++){
      const firstAbove=positions[column]<=positions[column+3];
      positions[column]=firstAbove?550:680;
      positions[column+3]=firstAbove?680:550;
    }
  }
  return positions;
}
function shuffleLetterCards(owner) {
  const order=shuffledIndices(owner.options.length);
  for(const key of ['options','cardY','cardCurrentY']){
    const original=owner[key];owner[key]=order.map(index=>original[index]);
  }
}
function finishQuestionShuffle(owner) {
  if(game!==owner)return;
  if(owner.level.mode===1)shuffleLetterCards(owner);
  setQuestion();owner.nextQuestionAt=Infinity;
}
function setQuestion() {
  if (!game) return;
  const level = game.level;
  if (level.mode === 1) {
    const letters = level.letters;
    const correct = letters[game.questionOrder[game.questionIndex % letters.length]];
    game.question = {audio: correct.audio, parts:[correct.text],
      wrong:letters.map(item => item.text).filter(text => text !== correct.text)};
  } else {
    const source = level.questions[game.questionOrder[game.questionIndex % level.questions.length]];
    game.question = {
      audio: source.audio,
      parts: source.correct.map(part => part.text),
      wrong: source.wrong.map(part => part.text),
    };
  }
  game.phase = 0;
  setOptions();
}
function writingPosition(event) {
  const rect = writingCanvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*writingCanvas.width/rect.width-70,
    y:(event.clientY-rect.top)*writingCanvas.height/rect.height-143};
}
function loadWritingImages(code) {
  if (!writingImages.has(code)) {
    const asset=writeAssetIndex[code];
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error(`无法加载 ${asset.guide}`));image.src=asset.guide;
    });
    writingImages.set(code,promise);
    promise.catch(()=>{if(writingImages.get(code)===promise)writingImages.delete(code);});
  }
  return writingImages.get(code);
}
function loadWritingResultImage(kind) {
  if (!writingResultImages.has(kind)) {
    const path=writeResultIndex[kind].path;
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error(`无法加载 ${path}`));image.src=path;
    });
    writingResultImages.set(kind,promise);
    promise.catch(()=>{if(writingResultImages.get(kind)===promise)writingResultImages.delete(kind);});
  }
  return writingResultImages.get(kind);
}
function drawWritingGuide(context,writing){
  if(!writing.guide)return;
  const asset=writeAssetIndex[writing.template.code],demo=writing.demo;
  if(demo?.lastImage){const clip=demo.clip,index=demo.lastFrame%clip.perPage;
    context.drawImage(demo.lastImage,(index%clip.columns)*clip.width,
      Math.floor(index/clip.columns)*clip.height,clip.width,clip.height,
      asset.x,asset.y,clip.width,clip.height);
  }else context.drawImage(writing.guide,asset.x,asset.y);
}
function startWritingDemo(writing,isCurrent,redraw){
  const clip=writeDemoIndex?.[writing.template.code];
  if(!clip){writing.ready=true;redraw();return;}
  const demo={clip,pages:new Map(),frame:0,lastImage:null,lastFrame:0};writing.demo=demo;
  // showCard registers mouseDown on the transparent writing rectangle before
  // the demonstration child reaches its final frame.
  writing.ready=true;redraw();
  function load(page){
    if(page<0||page>=clip.pages.length)return Promise.resolve(null);
    if(!demo.pages.has(page)){
      const image=new Image();const promise=new Promise((resolve,reject)=>{
        image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`无法加载 ${clip.pages[page]}`));
      });demo.pages.set(page,{image,promise});image.src=clip.pages[page];
    }
    return demo.pages.get(page).promise;
  }
  load(0).then(()=>{
    if(!isCurrent()||writing.demo!==demo)return;
    demo.started=null;
    function animate(now){
      if(!isCurrent()||writing.demo!==demo)return;
      if(document.hidden){requestAnimationFrame(animate);return;}
      if(demo.started===null)demo.started=now;
      const frame=Math.floor((now-demo.started)*clip.fps/1000);
      // The native enter-frame listener returns to the guide when the child
      // reaches its last frame; drawing was already enabled by showCard.
      if(frame>=clip.frames-1){writing.demo=null;writing.ready=true;redraw();return;}
      const page=Math.floor(frame/clip.perPage);demo.frame=frame;
      for(const key of demo.pages.keys())if(key<page-1||key>page+1)demo.pages.delete(key);
      load(page).then(image=>{
        if(!isCurrent()||writing.demo!==demo||demo.frame!==frame)return;
        demo.lastImage=image;demo.lastFrame=frame;redraw();
      }).catch(error=>{if(isCurrent()&&writing.demo===demo){console.error(error);writing.demo=null;writing.ready=true;redraw();}});
      load(page+1).catch(()=>{});
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }).catch(error=>{if(isCurrent()&&writing.demo===demo){console.error(error);writing.demo=null;writing.ready=true;redraw();}});
}
function drawWritingStrokes(context,strokes) {
  // Both native showCard methods use a 30 px blue line with alpha 0.9.
  context.strokeStyle='rgba(0,0,255,.9)';context.lineWidth=30;
  context.lineCap='round';context.lineJoin='round';
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    context.beginPath();context.moveTo(stroke[0].x,stroke[0].y);
    // onStartDrawHandnelr first draws to (x+2,y+2), even for a tap.
    context.lineTo(stroke[0].x+2,stroke[0].y+2);
    for (const point of stroke.slice(1)) context.lineTo(point.x,point.y);
    context.stroke();
  }
}
function renderWriting() {
  const writing=game?.writing;
  if (!writing) return;
  const {points}=writing.template;
  writingContext.clearRect(0,0,writingCanvas.width,writingCanvas.height);
  writingContext.save();writingContext.translate(70,143);
  drawWritingGuide(writingContext,writing);
  drawWritingStrokes(writingContext,writing.strokes);
  if(writing.result?.kind==='wrong'&&writing.result.marker){
    const {x,y}=writing.result.marker;
    writingContext.strokeStyle='rgba(255,0,0,1)';
    writingContext.lineWidth=10;
    writingContext.beginPath();writingContext.arc(x,y,30,0,Math.PI*2);
    writingContext.stroke();
  }
  writingContext.restore();
  writingProgress.hidden=!writing.error;
  document.querySelector('#writing-error-text').textContent=writing.error?`书写素材加载失败：${writing.error}`:'';
}
function loadBattleWritingAssets(writing){
  if(writing.loading)return;
  writing.loading=true;writing.error='';renderWriting();
  const code=writing.template.code;
  Promise.all([loadWritingImages(code),loadWritingResultImage('right'),
    loadWritingResultImage('wrong')]).then(([guide,right,wrong])=>{
    if(game?.writing!==writing)return;
    writing.loading=false;writing.guide=guide;writing.resultImages={right,wrong};
    startWritingDemo(writing,()=>game?.writing===writing,renderWriting);
  }).catch(error=>{
    if(game?.writing!==writing)return;
    writing.loading=false;writing.error=error.message;renderWriting();
  });
}
function beginWriting(code) {
  const template=handwritingIndex?.get(code);
  if (!template||!writeAssetIndex?.[code]||!writeResultIndex) return false;
  stopBattleMainTimer(game);
  for(const zombie of game.zombies)zombie.pausedWalkPlaying=false;
  const writing={template,reached:new Set(),strokes:[],drawing:false,ready:false,error:'',
    bounds:writingBounds(template.points)};
  game.writing=writing;
  writingResultCanvas.hidden=true;
  document.querySelector('#writing-title').textContent=`描写 ${displayPinyin(code)}`;
  writingOverlay.hidden=false;
  renderWriting();
  loadBattleWritingAssets(writing);
  return true;
}
function finishCorrectAnswer(fromWriting = false, cardIndex = -1) {
  if(!fromWriting)playEffect('click_sound');
  game.feedback='答对了！植物发动攻击';game.feedbackUntil=game.time+2;
  if (fromWriting) {attackFromAnswer();startCardFlip(true);}
  else {
    const card=optionRect(cardIndex,game.options.length);
    game.pendingAttack={start:game.time,frame:0,rootDepth:nextRootDepth(),
      x:card.x+card.w/2,y:card.y+card.h/2};
  }
}
function startCardFlip(nextQuestion) {
  // FlipCard(1) turns a revealed card back from 180 to 0 degrees.
  game.resultIcons=[];
  game.cardFlip={start:game.time,frames:18,duration:18/zombieMotion.frameRate,
    startAngle:180,direction:-1,nextQuestion};
}
function revealCards() {
  if(game.paused||game.writing||game.pendingAttack||game.cardFlip||game.cardAngle!==0)return false;
  // PlaySound schedules FlipCard(0); onFlipCard then turns 0 to 180.
  game.cardFlip={start:game.time,frames:18,duration:18/zombieMotion.frameRate,
    startAngle:0,direction:1,nextQuestion:false};
  playAudio(game.question.audio);
  scheduleTutorialArrow(true);
  return true;
}
function scheduleTutorialArrow(revealing) {
  const {world,stage}=game.level;
  // PlaySound schedules addArrow(1) in 1-1 and addArrow(0) in 2-2.
  if(revealing&&world===1&&stage===1)scheduleHint(.5,false);
  if(world===2&&stage===2&&game.correctSelections<=1)
    scheduleHint(.1,false);
}
function scheduleHint(delay,cancellable) {
  const owner=game;
  const id=++owner.hintSequence;
  const timer={id,handle:null};
  owner.hintTimers.push(timer);
  if(cancellable)owner.hintCancelId=id;
  armHintTimer(owner,timer,delay*1000);
}
function armHintTimer(owner,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{
    if(game!==owner)return;
    owner.hintTimers=owner.hintTimers.filter(item=>item.id!==timer.id);
    if(owner.hintCancelId===timer.id)owner.hintCancelId=null;
    // The native callback checks that the battle timer still exists.
    if(!owner.ending&&!owner.result)showHint();
  },timer.remaining);
}
function clearHintTimers(owner) {
  if(!owner)return;
  for(const timer of owner.hintTimers||[])clearTimeout(timer.handle);
  owner.hintTimers=[];
}
function scheduleAutoReplay(delay=3) {
  const owner=game;
  const timer={handle:null};owner.autoReplays.push(timer);
  armAutoReplay(owner,timer,delay*1000);
}
function armAutoReplay(owner,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{
    owner.autoReplays=owner.autoReplays.filter(item=>item!==timer);
    // onConfirm sets the same _pause flag tested by PlaySound. The timeout
    // still fires, but does not play while the pause menu is open.
    if(game!==owner || owner.paused || owner.writing)return;
    // autoSel invokes PlaySound only while the answer and flip are idle.
    if(!owner.pendingAttack&&!owner.cardFlip&&owner.cardAngle===180){
      playAudio(owner.question.audio);scheduleTutorialArrow(false);
    }
  },timer.remaining);
}
function clearAutoReplays(owner) {
  if(!owner)return;
  for(const timer of owner.autoReplays||[])clearTimeout(timer.handle);
  owner.autoReplays=[];
}
function clearLaunchTimers(owner) {
  if(!owner)return;
  for(const timer of owner.launchTimers||[])clearTimeout(timer.handle);
  owner.launchTimers=[];
}
function clearCorpseTimers(owner) {
  if(!owner)return;
  for(const timer of owner.corpseTimers||[])clearTimeout(timer.handle);
  owner.corpseTimers=[];
  owner.pendingCorpses=[];
}
function scheduleCorpseRemoval(owner,effects) {
  const timer={handle:null,effects};owner.corpseTimers.push(timer);
  armCorpseRemoval(owner,timer,5000);
}
function armCorpseRemoval(owner,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{
    owner.corpseTimers=owner.corpseTimers.filter(item=>item!==timer);
    if(game!==owner)return;
    owner.effects=owner.effects.filter(effect=>!timer.effects.includes(effect));
  },timer.remaining);
}
function settleBattleCorpse(owner,corpse){
  // damageHandle dispatches the ice-end event before moving a dead zombie
  // into _DeadSp and scheduling RemoveZombie.
  corpse.effects[0].inBattle=false;
  corpse.zombie.removedFromBattle=true;
  corpse.effects[0].deadDepth=owner.deadDepth=(owner.deadDepth||0)+1;
  // The native check is against ice.parent at observation time, not whether
  // an ice clip happened to exist when Damage originally killed the zombie.
  if(corpse.hadIce && corpse.zombie.iceUntil>owner.time){
    corpse.effects[0].slow=false;
    corpse.effects[0].dim=false;
    if(corpse.zombie.detachedIce){
      owner.effects=owner.effects.filter(effect=>effect!==corpse.zombie.detachedIce);
      corpse.zombie.detachedIce=null;
      corpse.zombie.iceUntil=owner.time;
      corpse.zombie.iceFilterCleared=true;
      corpse.zombie.cyanFilter=false;
    }
  }
  scheduleCorpseRemoval(owner,corpse.effects);
}
function observeBattleDeath(zombie){
  const index=game.pendingCorpses.findIndex(corpse=>corpse.zombie===zombie);
  if(index<0)return;
  const [corpse]=game.pendingCorpses.splice(index,1);
  settleBattleCorpse(game,corpse);
}
function clearZombieIceFilter(owner,zombie){
  zombie.iceFilterCleared=true;
  zombie.cyanFilter=false;
  // onClearIce clears the original zombie's filters even if it has already
  // died. The webpage keeps its death drawing in a separate effect object.
  const corpse=owner.pendingCorpses.find(item=>item.zombie===zombie);
  if(corpse){corpse.effects[0].slow=false;corpse.effects[0].dim=false;}
}
function setBattlePaused(paused) {
  pauseButtonPress=null;pauseButtonHover=null;
  pauseEntryPress=null;
  audioEntryPress=null;
  battleCardPress=null;
  battleResultPress=null;battleResultHover=null;
  victoryRewardPress=null;
  battleTipPress=null;
  battleHelpPress=null;
  if(paused && !game.paused){
    for(const zombie of game.zombies)zombie.pausedWalkPlaying=false;
    // SoundManager.pauseBackgroundVolume mutes its channel without stopping
    // playback; onConfirm also stops the current pronunciation SoundChannel.
    battleMusic.volume=0;
    stopAudio();
  }else if(!paused && game.paused){
    battleMusic.volume=musicEnabled?musicVolume:0;
    // Timer.start() after stop() starts a new delay while retaining count.
    game.mainTimerFrames=0;
  }
  game.paused=paused;
  if(paused)stopBattleMainTimer(game);
  else startBattleMainTimer(game);
}
function scheduleTimedLaunches(owner,shots) {
  // Skill Timer and newbullet setTimeout callbacks continue while the main
  // battle timer is stopped. Movement still waits until the battle resumes.
  // One native Timer callback may create several bullets (plants 5 and 12).
  // Group those bullets so their creation and random draws stay together.
  const groups=new Map();
  for(const shot of shots){
    if(!groups.has(shot.launchAt))groups.set(shot.launchAt,[]);
    groups.get(shot.launchAt).push(shot);
  }
  for(const [launchAt,group] of groups){
    const delay=launchAt-owner.time;
    if(delay<=0)continue;
    const timer={handle:null,group};owner.launchTimers.push(timer);
    armTimedLaunch(owner,timer,delay*1000);
  }
}
function armTimedLaunch(owner,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{
      owner.launchTimers=owner.launchTimers.filter(item=>item!==timer);
      if(game!==owner)return;
      for(const shot of timer.group){
        if(!owner.shots.includes(shot) || shot.bulletDepth!==undefined)continue;
        if(shot.launchAt>owner.time)shot.launchAt=owner.time;
        activateBattleShot(owner,shot);
        if((owner.paused||owner.writing||owner.result) && shot.attackSound && !shot.soundPlayed){
          playEffect(shot.attackSound);
          shot.soundPlayed=true;
        }
      }
    },timer.remaining);
}
function activateBattleShot(owner,shot){
  if(shot.bulletDepth!==undefined)return;
  if(shot.randomYOffset){
    shot.y+=Math.floor(Math.random()*11)-5;
    shot.randomYOffset=false;
  }
  shot.bulletDepth=++owner.bulletDepth;
}
function scheduleWrongIconRemoval(icon,wrong,delay=2) {
  const owner=game;
  queueIconTimer(owner,delay*1000,()=>{
    owner.resultIcons=owner.resultIcons.filter(item=>item!==icon);
    wrong.locked=false;
  });
}
function queueIconTimer(owner,delay,callback){
  const timer={handle:null,callback};owner.iconTimers.push(timer);
  armIconTimer(owner,timer,delay);
}
function armIconTimer(owner,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{
    owner.iconTimers=owner.iconTimers.filter(item=>item!==timer);
    if(game===owner)timer.callback();
  },timer.remaining);
}
function clearIconTimers(owner) {
  if(!owner)return;
  for(const timer of owner.iconTimers||[])clearTimeout(timer.handle);
  owner.iconTimers=[];
}
function scheduleLetterWrong(wrong) {
  const owner=game;
  function schedule(delay,callback) {
    queueIconTimer(owner,delay,callback);
  }
  // FlipCard and setFliped are separate flash.utils.setTimeout callbacks.
  schedule(2000,()=>{wrong.flipStarted=true;startCardFlip(false);});
  schedule(3000,()=>{
    wrong.locked=false;
    if(owner.wrong===wrong)owner.wrong=null;
    if(owner.paused||owner.writing||!revealCards())
      owner.nextRevealAt=Math.floor(owner.time)+1;
  });
}
function clearQuestionTimer(owner) {
  if(!owner)return;
  if(owner.questionTimer!=null)clearTimeout(owner.questionTimer);
  owner.questionTimer=null;owner.questionTimerSuspended=false;owner.questionTimerRemaining=0;
}
function scheduleQuestionShuffle(owner,delay){
  owner.questionTimerRemaining=Math.max(0,delay);
  if(document.hidden){owner.questionTimerSuspended=true;return;}
  owner.questionTimerSuspended=false;owner.questionTimerDue=performance.now()+owner.questionTimerRemaining;
  owner.questionTimer=setTimeout(()=>{
    owner.questionTimer=null;
    if(game===owner)finishQuestionShuffle(owner);
  },owner.questionTimerRemaining);
}
function advanceCardFlip() {
  const flip=game.cardFlip;
  if(!flip)return;
  const frames=Math.floor((game.time-flip.start)*zombieMotion.frameRate+1e-9);
  if(flip.direction>0&&!flip.faceRevealed&&frames>=9){
    const level=game.level;
    game.cardPenVisible=level.mode===1&&level.write&&game.energyFrame===6&&
      (level.world>1||level.stage>2);
    flip.faceRevealed=true;
  }
  if(frames>=flip.frames){
    game.cardFlip=null;
    game.cardAngle=flip.direction>0?180:0;
    if(flip.nextQuestion){
      game.nextQuestionAt=game.time+(game.level.mode===1?.3:0);
      game.nextRevealAt=Math.ceil(game.nextQuestionAt+1e-9);
      if(game.level.mode!==1){
        setQuestion();game.nextQuestionAt=Infinity;
      }else if(!game.manualMainTimer){
        const owner=game;
        clearQuestionTimer(owner);
        scheduleQuestionShuffle(owner,300);
      }
    }
  }
}
function showHint() {
  const index=game.options.indexOf(game.question.parts[game.phase]);
  if(index>=0){
    const r=optionRect(index,game.options.length);
    game.hintPosition={x:r.x+r.w/2-30,
      y:r.y+r.h/2-(game.level.mode===1?180:120)};
  }
  game.hintVisible=true;
}
function plantForNearestZombie() {
  // Game.onSel and onSunShineMove scan living zombies from x=1200,
  // accepting only 250 < zombie.x < the current nearest x.
  const nearest=game.zombies.filter(zombie=>zombie.hp>0 &&
    zombie.x>250 && zombie.x<1200).reduce((best,zombie)=>
      !best||zombie.x<best.x?zombie:best,null);
  return game.plants.find(plant=>plant.row===nearest?.row)||game.plants[0];
}
function advanceQuestion(owner) {
  const count=owner.questionOrder.length;
  owner.questionIndex++;
  if(owner.questionIndex>=count){
    owner.questionIndex=0;
    owner.questionOrder=shuffledIndices(count);
  }
}
function attackFromAnswer() {
  // RAttack advances the question index when the sunshine reaches the
  // energy bar; a writing success calls RAttack directly.
  advanceQuestion(game);
  const plant=plantForNearestZombie();
  if (!plant) return;
  game.activePlant=plant;
  const superAttack = game.energyFrame === 6;
  game.energyFrame = superAttack ? 1 : game.energyFrame + 1;
  const state=superAttack?'super':'attack';
  const motion=spriteIndex?.[`plant_motion_${plant.id}_${state}`];
  plant.motionState=state;
  plant.motionStart=game.time;
  game.pendingPlantFires=game.pendingPlantFires.filter(event=>event.plant!==plant);
  game.pendingPlantFires.push({plant,superAttack,
    at:game.time+((motion?.eventFrame||1)-1)/zombieMotion.frameRate});
  if (superAttack) {game.feedback='超级攻击！';game.feedbackUntil=game.time+2;}
}
function firePlantAttack(plant,superAttack) {
  const shotStart=game.shots.length;
  if (superAttack && SKILL_SOUND[plant.id]) playEffect(SKILL_SOUND[plant.id]);
  // Game.SetTarget sorts the whole zombie array by x before taking three;
  // dead entries can remain until the next damageHandle pass.
  const skillTargets=superAttack && plant.id===8
    ? nativeArraySort(game.zombies.filter(zombie=>!zombie.removedFromBattle),(a,b)=>a.x-b.x).slice(0,3) : null;
  const [muzzleX,muzzleY]=PLANT_MUZZLE[plant.id];
  const shot={x:plant.x+muzzleX,y:plant.y+muzzleY,row:plant.row,
    bulletType:superAttack && [2,3,6,11].includes(plant.id) ? 2
      : superAttack && plant.id===7 ? 6
      : superAttack && plant.id===8 ? 9
      : PLANT_BULLET_TYPE[plant.id],ty:120+plant.row*100,
    effect:superAttack ? SKILL_BULLET_EFFECT[plant.id] ??
      PLANT_BULLET_EFFECT[plant.id] : PLANT_BULLET_EFFECT[plant.id],
    sprite:superAttack?SKILL_BULLET_VISUAL[plant.id]||BULLET_VISUAL[plant.id]:BULLET_VISUAL[plant.id],damage:superAttack
      ? SKILL_BULLET_DAMAGE[plant.id] ?? PLANT_DAMAGE[plant.id] ?? 1
      : PLANT_DAMAGE[plant.id] ?? 1,
    speed:(!superAttack || plant.id===10) && LINEAR_BULLET_TYPES.has(PLANT_BULLET_TYPE[plant.id])
      ? 20*zombieMotion.frameRate : 300,
    attackSound:(!superAttack || plant.id===9 || plant.id===10 || plant.id===12)
      ? PLANT_ATTACK_SOUND[plant.id] : null,
    hitSound:PLANT_HIT_SOUND[plant.id],
    skillType:superAttack && plant.id===7?6:superAttack && plant.id===8?9:0,
    target:skillTargets?.[0]||null,
    targets:skillTargets,targetIndex:0};
  if (skillTargets?.length) shot.row=skillTargets[0].row;
  if (!superAttack && ARC_BULLET_TYPES.has(shot.bulletType)) {
    // onMakeBullet tests position and lane, but does not check _dead. A dead
    // zombie can remain in the array until the next damageHandle pass.
    const arcTarget=game.zombies.filter(zombie=>!zombie.removedFromBattle && zombie.row===plant.row &&
      zombie.x>250 && zombie.x<1100).reduce((nearest,zombie)=>
      !nearest || zombie.x<nearest.x?zombie:nearest,null);
    shot.arcTarget=arcTarget;
    shot.arcGroundY=arcTarget?.y;
    const dx=(arcTarget?.x??shot.x)-shot.x;
    shot.dy=arcTarget ? -0.8*(dx/1100*.5+.2+dx*.4/600) : 0;
  }
  if (!superAttack && shot.bulletType===3) {
    // Plant_5.makeBullet starts with speed 38 and keeps the bullet after a hit.
    shot.boomerangSpeed=38;
    shot.boomerangAccel=-1;
    shot.hitTargets=new Set();
  }
  if (superAttack && (plant.id===3 || SKILL_VOLLEY_VISUAL[plant.id])) {
    // onSkill2 (2/6/11) and onSkill3 (3) both raise an initial bullet
    // by (+5,-40) per frame before releasing a shot above each zombie.
    // Plant 3's initial bullet is scaled 2×; its dropped bullets are 1×.
    game.shots.push({...shot,skillType:12,plantId:plant.id,
      scale:plant.id===3?2:1,launchAt:game.time});
  } else if (superAttack && (plant.id===1 || plant.id===4)) {
    // onSkill1: six 100 ms timer callbacks, each using ordinary makeBullet.
    for (let count=1;count<=6;count++)
      game.shots.push({...shot,randomYOffset:true,
        speed:20*zombieMotion.frameRate,launchAt:game.time+count*.1});
  } else if (superAttack && plant.id===5) {
    // onSkill4: five 100 ms timer callbacks, two returning bullets each.
    for (let count=1;count<=5;count++) {
      const launchAt=game.time+count*.1;
      for (const [x,speed,accel,rotation] of [[plant.x+muzzleX,38,-1,0],
        // damageHandle increments speed when des <= 290. The reverse skill
        // bullet has des = 5 and therefore turns back after slowing down.
        [plant.x-muzzleX,-22,1,180]])
        game.shots.push({...shot,x,randomYOffset:true,
          boomerangSpeed:speed,boomerangAccel:accel,rotation,
          hitTargets:new Set(),launchAt});
    }
  } else if (superAttack && plant.id===9) {
    // onSkill5: twelve timer callbacks, 50 ms apart, using makeBullet.
    for (let count=1;count<=12;count++)
      game.shots.push({...shot,randomYOffset:true,
        speed:20*zombieMotion.frameRate,launchAt:game.time+count*.05});
  } else if (superAttack && plant.id===10) {
    // onSkill6: three 1 s callbacks using makeSkillBullet and px1/py1.
    for (let count=1;count<=3;count++)
      game.shots.push({...shot,x:plant.x+60,y:plant.y-25,
        launchAt:game.time+count});
  } else if (plant.id===12) {
    // onMakeBullet calls newbullet1 once for a normal attack; onSkillUse
    // schedules three calls at 100, 200 and 300 ms for a super attack.
    for (const delay of superAttack?[.1,.2,.3]:[0])
      for (let row=0;row<3;row++)
        game.shots.push({...shot,y:120+plant.row*100,row,ty:120+row*100,
          // newbullet1 plays `atk` once after creating all three bullets.
          attackSound:row===2?shot.attackSound:null,
          launchAt:game.time+delay});
  } else if (!superAttack && (plant.id===9 || plant.id===10)) {
    // Type 7 schedules one more newbullet at 100 ms; type 10 schedules two.
    for (const delay of plant.id===9?[0,.1]:[0,.1,.2])
      game.shots.push({...shot,launchAt:game.time+delay});
  } else game.shots.push({...shot,launchAt:game.time});
  const newShots=game.shots.slice(shotStart);
  for(const launched of newShots)
    if(launched.launchAt<=game.time){
      activateBattleShot(game,launched);
      if(game.result&&launched.attackSound&&!launched.soundPlayed){
        playEffect(launched.attackSound);launched.soundPlayed=true;
      }
    }
  scheduleTimedLaunches(game,newShots);
}
function advanceSunshine(){
  const sun=game.pendingAttack;
  if(!sun)return;
  const frame=Math.floor((game.time-sun.start)*zombieMotion.frameRate+1e-9);
  while(sun.frame<frame){
    sun.frame++;
    sun.x+=(58-sun.x)*.1;
    sun.y+=(396-sun.y)*.1;
    if(Math.abs(58-sun.x)<3 && Math.abs(396-sun.y)<3){
      game.pendingAttack=null;attackFromAnswer();startCardFlip(true);break;
    }
  }
}
function advanceSkillPrelude(shot,frames){
  // onSkill2/onSkill3 are independent ENTER_FRAME handlers, so the rising
  // prelude can finish even after fail() removes damageHandle.
  shot.x+=5*frames;
  shot.y-=40*frames;
  if(shot.y < -1000){
    // onSkill2/onSkill3 only check x < 1050; an object marked dead can
    // still be present until damageHandle removes it on a later frame.
    for(const zombie of game.zombies.filter(item=>!item.removedFromBattle&&item.x<1050))
      game.shots.push({...shot,x:zombie.x-10,y:-50,row:zombie.row,
        sprite:SKILL_VOLLEY_VISUAL[shot.plantId]||shot.sprite,
        scale:shot.plantId===3?1:2,skillType:2,target:zombie,groundY:zombie.y,
        butter:shot.plantId===3,launchAt:game.time,pausedVisualTime:0,
        bulletDepth:++game.bulletDepth});
    shot.x=2000;
  }
}
function markWritingPoint(position,redraw=true) {
  const writing=game?.writing;
  if (!writing?.ready) return;
  // FightWritePlayer tests only the first remaining marker with
  // hitTestPoint(stageX, stageY, false). Its 30 px circle has a 60 px
  // bounding box; alpha .5 changes visibility, not the hit area.
  const index=writing.reached.size;
  const point=writing.template.points[index];
  if (point&&Math.abs(position.x-point[0])<=30&&Math.abs(position.y-point[1])<=30)
    writing.reached.add(index);
  writing.error='';
  if(redraw)renderWriting();
}
function writingBounds(points) {
  // showCard gets the bounds of all radius-30 markers, then expands that
  // rectangle by 20 px on each side before onMoveDraw checks containsPoint.
  const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
  return {left:Math.min(...xs)-50,right:Math.max(...xs)+50,
    top:Math.min(...ys)-50,bottom:Math.max(...ys)+50};
}
function remainingWritingPointsCovered(writing) {
  // Hit.testObject rasterizes the marker and pen graphics, then tests for
  // overlapping nontransparent pixels. Keep the guide image out of this test.
  const canvas=document.createElement('canvas'),padding=100;
  // Markers can extend past the local 900×520 region (for example f at y=15).
  // Give the offscreen collision raster room on every side, like Flash sprites.
  canvas.width=1100;canvas.height=720;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.translate(padding,padding);drawWritingStrokes(context,writing.strokes);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  return writing.template.points.slice(writing.reached.size).every(([localX,localY])=>{
    const cx=localX+padding,cy=localY+padding;
    for(let y=Math.max(0,Math.floor(cy-30));y<Math.min(canvas.height,Math.ceil(cy+30));y++)
      for(let x=Math.max(0,Math.floor(cx-30));x<Math.min(canvas.width,Math.ceil(cx+30));x++)
        if((x+.5-cx)**2+(y+.5-cy)**2<=900&&pixels[(y*canvas.width+x)*4+3]>0)
          return true;
    return false;
  });
}
function renderWritingResult(writing,now) {
  if(game?.writing!==writing||!writing.result)return;
  if(document.hidden){requestAnimationFrame(time=>renderWritingResult(writing,time));return;}
  const {kind,start}=writing.result,clip=writeResultIndex[kind];
  const frame=Math.floor((now-start)*clip.fps/1000);
  // onResultFrameHandler removes the clip as its final timeline frame starts.
  if(frame>=clip.frames-1){writingResultCanvas.hidden=true;return;}
  const image=writing.resultImages[kind];
  writingResultCanvas.hidden=false;
  writingResultContext.clearRect(0,0,clip.width,clip.height);
  writingResultContext.drawImage(image,(frame%clip.columns)*clip.width,
    Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,
    0,0,clip.width,clip.height);
  requestAnimationFrame(time=>renderWritingResult(writing,time));
}
function clearWriteFailTimer(owner) {
  if(!owner)return;
  if(owner.writeFailTimer!=null)clearTimeout(owner.writeFailTimer);
  owner.writeFailTimer=null;owner.writeFailSuspended=false;owner.writeFailRemaining=0;
}
function scheduleWriteFail(owner,delay){
  owner.writeFailRemaining=Math.max(0,delay);
  if(document.hidden){owner.writeFailSuspended=true;return;}
  owner.writeFailSuspended=false;owner.writeFailDue=performance.now()+owner.writeFailRemaining;
  owner.writeFailTimer=setTimeout(()=>{
    owner.writeFailTimer=null;
    if(game!==owner)return;
    owner.writeFailAt=null;
    startCardFlip(true);
  },owner.writeFailRemaining);
}
function clearWritingResultTimer(owner){
  const result=owner?.writing?.result;if(!result)return;
  if(result.timerHandle!=null)clearTimeout(result.timerHandle);
  result.timerHandle=null;result.timerSuspended=false;
}
function scheduleWritingResult(writing,delay){
  const result=writing.result;result.timerRemaining=Math.max(0,delay);
  if(document.hidden){result.timerSuspended=true;return;}
  result.timerSuspended=false;result.timerDue=performance.now()+result.timerRemaining;
  result.timerHandle=setTimeout(()=>{
    result.timerHandle=null;
    if(game?.writing===writing&&writing.result===result)completeWritingResult(writing);
  },result.timerRemaining);
}
function completeWritingResult(writing) {
  if(game?.writing!==writing)return;
  clearWritingResultTimer(game);
  const success=writing.result.kind==='right';
  game.writing=null;writingOverlay.hidden=true;writingResultCanvas.hidden=true;
  game.mainTimerFrames=0;
  startBattleMainTimer(game);
  if(success){finishCorrectAnswer(true);return;}
  // Game.onWriteFail resumes battle and flips to the next question 100 ms later.
  advanceQuestion(game);
  game.writeFailAt=game.time+.1;
  if(!game.manualMainTimer){
    scheduleWriteFail(game,100);
  }
  game.feedback='描写失败，进入下一题';game.feedbackUntil=game.time+2;
}
function startWritingResult(success,marker=null) {
  const writing=game?.writing;
  if(!writing||writing.result)return;
  const kind=success?'right':'wrong';
  writing.drawing=false;writing.ready=false;writing.demo=null;
  writing.result={kind,start:performance.now(),marker};
  renderWriting();
  renderWritingResult(writing,writing.result.start);
  // FightWritePlayer.gameOver uses setTimeout(Win/Fail, 2000) after adding
  // the original AnimationRight/AnimationWrong clip to the stage.
  scheduleWritingResult(writing,writeResultIndex[kind].durationMs);
}
function failWriting(marker) {
  startWritingResult(false,marker);
}
function setOptions() {
  const q = game.question;
  if(game.level.mode===1){
    if(!game.options.length)game.options=game.level.letters.map(letter=>letter.text);
  }else{
    // makeCardArray permutes indices 0..5, then maps each index into the
    // correct and wrong XML lists. Entries after the sixth are not used.
    const choices=[...q.parts,...q.wrong].slice(0,6);
    game.options=shuffledIndices(6).map(index=>choices[index]);
  }
}
function optionRect(index,count) {
  if (game?.level.mode===1) {
    const width=154,height=217;
    const centerY=game.cardCurrentY[index];
    return {x:(1024-count*width)/2+index*width,
      y:centerY-height/2,w:width,h:height};
  }
  // Game.makeCardArray: x = (i % 3) * 320 + 190; y moves from 850 to
  // 550 + random() * 130. card_0's original SWF frame is 216 × 126.
  return {x:index%3*320+190-108,
    y:game.cardCurrentY[index]-63,w:216,h:126};
}
function cardContains(index,x,y) {
  const r=optionRect(index,game.options.length);
  if(x<r.x||x>=r.x+r.w||y<r.y||y>=r.y+r.h)return false;
  const texture=cardTexture(game.options[index],game.level.mode,false);
  if(!texture)return false;
  let mask=cardHitMasks.get(texture);
  if(!mask){
    mask=texture.getContext('2d').getImageData(0,0,texture.width,texture.height).data;
    cardHitMasks.set(texture,mask);
  }
  // The face is rendered at 180 degrees, so its horizontal axis is reversed.
  const px=texture.width-1-Math.floor((x-r.x)*texture.width/r.w);
  const py=Math.floor((y-r.y)*texture.height/r.h);
  return mask[(py*texture.width+px)*4+3]!==0;
}
function cardAt(x,y) {
  if (!game) return -1;
  if(answerMarkerAt(x,y)||hintArrowAt(x,y)||battleEffectAt(x,y))return -1;
  for(let i=game.options.length-1;i>=0;i--)
    if(cardContains(i,x,y))return i;
  return -1;
}
function plantMotionFrame(plant) {
  const state=plant.motionState;
  const name=`plant_motion_${plant.id}_${state}`;
  const sprite=spriteIndex?.[name];
  const length=sprite?.frameCount||1;
  const elapsed=Math.max(0,Math.floor((game.time-plant.motionStart)*zombieMotion.frameRate+1e-9));
  return {name,sprite,frame:state==='idle'?elapsed%length:Math.min(length-1,elapsed)};
}
const plantHitCanvas=document.createElement('canvas');
plantHitCanvas.width=plantHitCanvas.height=1;
const plantHitContext=plantHitCanvas.getContext('2d',{willReadFrequently:true});
function battleEffectAt(x,y,minDepth=-Infinity){
  const sun=game?.pendingAttack;
  if(sun&&(sun.rootDepth??1)>minDepth){
    const frame=sun.frame+Math.floor((sun.pausedVisualTime||0)*zombieMotion.frameRate+1e-9);
    const image=imageFor('sunshine',frame);
    if(image){
      const px=Math.floor(x-(sun.x-image.width/2)),py=Math.floor(y-(sun.y+34-image.height));
      if(px>=0&&py>=0&&px<image.width&&py<image.height){
        plantHitContext.clearRect(0,0,1,1);
        plantHitContext.drawImage(image,px,py,1,1,0,0,1,1);
        if(plantHitContext.getImageData(0,0,1,1).data[3]>0)return true;
      }
    }
  }
  for(const effect of game?.effects||[]){
    if(effect.kind!=='hit-8'||(effect.rootDepth??Infinity)<=minDepth)continue;
    const sprite=spriteIndex?.[effect.sprite];
    if(!sprite?.sheet||!sprite.registration)continue;
    const image=images.get(sprite.sheet);if(!image)continue;
    const px=Math.floor((effect.flipX?effect.x-x:x-effect.x)-sprite.registration[0]);
    const py=Math.floor(y-effect.y-sprite.registration[1]);
    if(px<0||py<0||px>=sprite.frameWidth||py>=sprite.frameHeight)continue;
    const frame=Math.floor((game.time-effect.at)*zombieMotion.frameRate+1e-9)%sprite.frameCount;
    plantHitContext.clearRect(0,0,1,1);
    plantHitContext.drawImage(image,px+frame%sprite.columns*sprite.frameWidth,
      py+Math.floor(frame/sprite.columns)*sprite.frameHeight,1,1,0,0,1,1);
    if(plantHitContext.getImageData(0,0,1,1).data[3]>0)return true;
  }
  return false;
}
function hintArrowAt(x,y){
  if(!game?.hintVisible)return false;
  const frame=game.tick+Math.floor(game.hintPausedTime*zombieMotion.frameRate+1e-9);
  const image=imageFor('arrow_mc',frame);if(!image)return false;
  const px=Math.floor((x-game.hintPosition.x)*image.width/62);
  const py=Math.floor((y-game.hintPosition.y)*image.height/76);
  if(px<0||py<0||px>=image.width||py>=image.height)return false;
  plantHitContext.clearRect(0,0,1,1);
  plantHitContext.drawImage(image,px,py,1,1,0,0,1,1);
  return plantHitContext.getImageData(0,0,1,1).data[3]>0;
}
function answerMarkerAt(x,y,minDepth=-Infinity){
  const registration=spriteIndex?.result_icon?.registration;
  if(!registration)return false;
  for(const icon of game?.resultIcons||[]){
    if((icon.rootDepth??0)<=minDepth)continue;
    const image=imageFor('result_icon',icon.frame);if(!image)continue;
    const px=Math.floor(x-icon.x-registration[0]),py=Math.floor(y-icon.y-registration[1]);
    if(px<0||py<0||px>=image.width||py>=image.height)continue;
    plantHitContext.clearRect(0,0,1,1);
    plantHitContext.drawImage(image,px,py,1,1,0,0,1,1);
    if(plantHitContext.getImageData(0,0,1,1).data[3]>0)return true;
  }
  return false;
}
function plantAt(x,y) {
  // Game.PlantMove calls clickMovie on the clicked plant. Match Flash's
  // visible-shape hit area instead of accepting transparent atlas padding.
  for(let index=game.plants.length-1;index>=0;index--){
    const plant=game.plants[index];
    const {name,sprite,frame}=plantMotionFrame(plant);
    if(!sprite?.registration)continue;
    const left=plant.x+sprite.registration[0],top=plant.y+sprite.registration[1];
    const image=sprite.sheet?images.get(sprite.sheet):imageFor(name,frame);
    if(!image)continue;
    const width=sprite.sheet?sprite.frameWidth:image.width;
    const height=sprite.sheet?sprite.frameHeight:image.height;
    const pixelX=Math.floor(x-left),pixelY=Math.floor(y-top);
    if(pixelX<0||pixelY<0||pixelX>=width||pixelY>=height)continue;
    plantHitContext.clearRect(0,0,1,1);
    plantHitContext.drawImage(image,
      pixelX+(sprite.sheet?frame%sprite.columns*width:0),
      pixelY+(sprite.sheet?Math.floor(frame/sprite.columns)*height:0),
      1,1,0,0,1,1);
    if(plantHitContext.getImageData(0,0,1,1).data[3]>0)return plant;
  }
  return null;
}
function victoryRewardHit(x,y) {
  const elapsed=Math.max(0,Math.floor((game.time-game.ending.start)*zombieMotion.frameRate+1e-9));
  const rewardDepth=game.ending.rootDepth??Number.MAX_SAFE_INTEGER-1;
  if(battleEffectAt(x,y,rewardDepth)||answerMarkerAt(x,y,rewardDepth))return false;
  // onScale adds arrow_mc as a later sibling of light_mc. Its visible shape
  // receives the pointer before the reward underneath it.
  if(game.ending.clickedAt==null&&elapsed>=WIN_SCALE_FRAMES&&
      (game.ending.arrowDepth??Number.MAX_SAFE_INTEGER)>(game.ending.rootDepth??-1)){
    const arrow=imageFor('arrow_mc',elapsed-WIN_SCALE_FRAMES),pos=victoryPosition(elapsed);
    if(arrow){
      const ax=Math.floor(x-(pos.x-20)),ay=Math.floor(y-(pos.y-100));
      if(ax>=0&&ay>=0&&ax<arrow.width&&ay<arrow.height){
        plantHitContext.clearRect(0,0,1,1);
        plantHitContext.drawImage(arrow,ax,ay,1,1,0,0,1,1);
        if(plantHitContext.getImageData(0,0,1,1).data[3]>0)return false;
      }
    }
  }
  const name=`victory_light_reward_${game.level.world}_${game.level.stage}`;
  const sprite=spriteIndex[name];
  const frame=Math.floor((game.time-game.ending.start)*zombieMotion.frameRate+1e-9);
  const image=imageFor(name,frame);
  if(!image||!sprite?.registration)return false;
  // The stationary, full-scale reward is at (573,181). Its background light
  // is transparent until the click, so the world/stage artwork is the target.
  const px=Math.floor((x-573-sprite.registration[0])/sprite.scale);
  const py=Math.floor((y-181-sprite.registration[1])/sprite.scale);
  if(px<0||py<0||px>=image.width||py>=image.height)return false;
  plantHitContext.clearRect(0,0,1,1);
  plantHitContext.drawImage(image,px,py,1,1,0,0,1,1);
  return plantHitContext.getImageData(0,0,1,1).data[3]>0;
}
function clearPracticeWriting(){
  clearPressedLearningButtons(practiceWriteView);
  if(practiceWriting?.timer)clearTimeout(practiceWriting.timer);
  practiceWriting=null;practiceWriteView.hidden=true;practiceResultCanvas.hidden=true;
}
function showPracticeWriting(level){
  clearPracticeWriting();stopTipAudio();
  const questions=cardCoverContent[level.id]?.questions||[];
  practiceWriting={level,questions,index:0,writing:null,sunflowerStart:performance.now()};
  selectView.hidden=true;cardCover.hidden=true;learningView.hidden=true;cardTestView.hidden=true;battleView.hidden=true;
  document.body.classList.add('select-mode');practiceWriteView.hidden=false;
  practiceWriteEnd.hidden=true;practiceWriteConfirm.hidden=true;showPracticeCard();
}
function showPracticeCard(){
  const state=practiceWriting;if(!state)return;
  practiceWriteError.hidden=true;practiceWriteError.textContent='';
  practiceResultCanvas.hidden=true;practiceWriteContext.clearRect(0,0,practiceWriteCanvas.width,practiceWriteCanvas.height);
  if(state.index>=state.questions.length){state.writing=null;practiceWriteEnd.hidden=false;playEffectPath('assets/cardtest/end.mp3');
    animateLearningResultSunflower(document.querySelector('#practice-write-sunflower'),()=>practiceWriting===state&&!practiceWriteEnd.hidden&&!practiceWriteView.hidden,state);return;}
  const question=state.questions[state.index];
  const points=question.points.split('|').map(pair=>pair.split(',').map(Number));
  const w={template:{code:question.code,points},reached:new Set(),strokes:[],drawing:false,ready:false,bounds:writingBounds(points)};
  state.writing=w;practiceWriteEnd.hidden=true;
  Promise.all([loadWritingImages(question.code),loadWritingResultImage('right'),loadWritingResultImage('wrong')]).then(([guide,right,wrong])=>{
    if(practiceWriting!==state||state.writing!==w)return;
    w.guide=guide;w.resultImages={right,wrong};
    startWritingDemo(w,()=>practiceWriting===state&&state.writing===w,renderPracticeWriting);
  }).catch(error=>{
    if(practiceWriting!==state||state.writing!==w)return;
    practiceWriteError.textContent=`书写素材加载失败，请返回后重试：${error.message}`;
    practiceWriteError.hidden=false;
  });
}
function renderPracticeWriting(){
  const w=practiceWriting?.writing;if(!w)return;
  practiceWriteContext.clearRect(0,0,practiceWriteCanvas.width,practiceWriteCanvas.height);
  practiceWriteContext.save();practiceWriteContext.translate(70,170);
  drawWritingGuide(practiceWriteContext,w);
  drawWritingStrokes(practiceWriteContext,w.strokes);
  if(w.result?.kind==='wrong'&&w.result.marker){const {x,y}=w.result.marker;
    practiceWriteContext.strokeStyle='rgba(255,0,0,1)';practiceWriteContext.lineWidth=10;
    practiceWriteContext.beginPath();practiceWriteContext.arc(x,y,30,0,Math.PI*2);practiceWriteContext.stroke();}
  practiceWriteContext.restore();
}
function markPracticePoint(w,p){const i=w.reached.size,point=w.template.points[i];
  if(point&&Math.abs(p.x-point[0])<=30&&Math.abs(p.y-point[1])<=30)w.reached.add(i);
}
function finishPracticeAttempt(success,marker=null){
  const state=practiceWriting,w=state?.writing;if(!w||w.result)return;
  const kind=success?'right':'wrong',clip=writeResultIndex[kind];w.drawing=false;w.ready=false;w.demo=null;
  w.result={kind,marker,start:performance.now()};if(success)state.index++;
  playEffectPath(`assets/cardtest/${kind}.mp3`);renderPracticeWriting();practiceResultCanvas.hidden=false;
  function draw(now){if(practiceWriting!==state||state.writing!==w)return;
    if(document.hidden){requestAnimationFrame(draw);return;}
    const frame=Math.floor((now-w.result.start)*clip.fps/1000);
    if(frame>=clip.frames-1){practiceResultCanvas.hidden=true;showPracticeCard();return;}
    practiceResultContext.clearRect(0,0,clip.width,clip.height);
    practiceResultContext.drawImage(w.resultImages[kind],(frame%clip.columns)*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,0,0,clip.width,clip.height);
    requestAnimationFrame(draw);
  }requestAnimationFrame(draw);
}
let gateProgressRedrawPending=false;
function showWorld(world) {
  gateProgressRedrawPending=false;
  exitConfirmPointer=null;exitConfirmHover=null;
  pauseButtonPress=null;pauseButtonHover=null;
  pauseEntryPress=null;
  audioEntryPress=null;
  battleCardPress=null;
  battleResultPress=null;battleResultHover=null;
  victoryRewardPress=null;
  battleTipPress=null;
  battleHelpPress=null;
  if(typeof clearSpellTest==='function')clearSpellTest();
  currentWorld = world;
  document.querySelector('#progress-warning').hidden=!progressStorageError;
  document.querySelector('.gate-garden').href=`garden.html?world=${world}`;
  document.querySelector('.gate-shop').href=`shop.html?world=${world}`;
  document.querySelector('#gate-tip-buy').href=`shop.html?world=${world}`;
  if(coverLevel)stopTipAudio();
  clearPracticeWriting();
  cardCover.hidden = true;
  learningView.hidden = true;
  cardTestView.hidden = true;
  coverLevel = null;
  document.body.classList.add('select-mode');
  selectView.hidden = false;
  battleView.hidden = true;
  playGateMusic();
  gateMission.hidden = true;
  gatePurchaseTip.hidden = true;
  gateLevelsImage.src = `assets/gate/levels-${world}.png`;
  worldTabs.innerHTML = WORLD_NAMES.map((name, index) =>
    `<button type="button" data-world="${index+1}" style="left:${(211.55+index*174)/1024*100}%" aria-label="${name}" aria-pressed="${world===index+1}"><img src="assets/gate/world-${index+1}-${world===index+1?'active':'inactive'}.png" alt=""></button>`).join('');
  const finale = WORLD_FINALE[world];
  gateLocks.innerHTML = GATE_LOCK_ART[world].map(([x,y,w,h], index) => {
    const stage = index+1;
    const locked = !isGateUnlocked(world,stage);
    const score = gateScore(world,stage);
    if (!locked && score <= 1) return '';
    const layer = locked ? 'locked' : `star${Math.min(3,score-1)}`;
    return `<img src="assets/gate/card-${world}-${stage}-${layer}.png" alt="" style="left:${x/732*100}%;top:${y/446*100}%;width:${w/732*100}%;height:${h/446*100}%">`;
  }).join('');
  levelGrid.innerHTML = GATE_LOCK_ART[world].map(([x,y,w,h], index) => {
    const stage = index+1;
    const isFinale = stage > finale.stage;
    const locked = !isGateUnlocked(world,stage);
    const label = isFinale ? WORLD_FINALE_NAMES[world-1] : `第 ${stage} 关`;
    return `<button type="button" class="level-card" style="left:${x/732*100}%;top:${y/446*100}%;width:${w/732*100}%;height:${h/446*100}%" data-stage="${stage}" ${isFinale?`data-finale="${world}"`:`data-level="gate${world}_${stage}"`} ${locked?'data-locked="1" aria-disabled="true"':''} aria-label="${nameForGate(world, label)}${locked?' · 未解锁':''}"></button>`;
  }).join('');
}
function showCardCover(level) {
  if(!level)return;
  stopGateMusic();
  if(typeof clearSpellTest==='function')clearSpellTest();
  stopTipAudio();
  clearPracticeWriting();
  coverLevel=level;
  document.body.classList.add('select-mode');
  selectView.hidden=true;battleView.hidden=true;learningView.hidden=true;cardTestView.hidden=true;cardCover.hidden=false;
  const frame=({1:0,2:4,3:10,4:15})[level.world]+level.stage;
  cardCoverTitle.src=`assets/cardcover/title-${String(frame).padStart(2,'0')}.webp`;
  const data=cardCoverContent[level.id];
  const lesson=content.lessons.find(item=>item.id===data?.lesson);
  const route=lesson?`study.html#lesson/${encodeURIComponent(lesson.id)}`:'study.html';
  cardCoverLearn.href=route;
  cardCoverWrite.href=route;
  cardCoverPractice.href='study.html#spells';
  // CardCover.onAdded uses world and gate, independent of battle mode.
  const practice=level.world===4 && level.stage<=2;
  cardCoverLearn.hidden=practice;
  cardCoverPractice.hidden=!practice;
  cardCoverWrite.hidden=practice || level.world===4 ||
    (level.world===2 && level.stage===1);
  if(data?.sound){
    startTipAudio(data.sound);
  }
}
function playLearningPage() {
  if(!learningState)return;
  const question=learningState.questions[Math.floor(learningState.page/2)];
  const asset=learningAssets.pictures[question.picture];
  playAudio(asset?.audio[learningState.page%2]);
}
function renderLearningPages(animate=false) {
  const state=learningState;
  if(!state)return;
  learningStrip.innerHTML='';
  state.questions.forEach((question,index)=>{
    const asset=learningAssets.pictures[question.picture];
    if(!asset)return;
    for(let phase=0;phase<2;phase++){
      const page=index*2+phase;
      const el=document.createElement('div');el.className='learning-page';
      el.dataset.page=String(page);
      el.style.transform=`translateX(${page*100}%)`;
      const bg=document.createElement('img');bg.className='learning-card-base';bg.src=learningAssets.cardBackground;bg.alt='';
      const picture=document.createElement('img');picture.alt=question.title;
      picture.style.left=`${asset.registration[0]/1024*100}%`;
      picture.style.top=`${(asset.registration[1]+30)/768*100}%`;
      picture.style.width=`${asset.sizes[phase][0]/1024*100}%`;
      picture.style.height=`${asset.sizes[phase][1]/768*100}%`;
      picture.src=asset.frames[phase];
      el.append(bg,picture);learningStrip.append(el);
    }
  });
  learningPrevious.hidden=state.page===0;
  learningNext.hidden=false;
}
function showLearning(level) {
  const questions=cardCoverContent[level.id]?.questions||[];
  if(!questions.length)return;
  clearPressedLearningButtons(learningView);
  learningSwipe=null;
  stopTipAudio();
  learningState={level,questions,page:0,transition:null};
  cardCover.hidden=true;selectView.hidden=true;learningView.hidden=false;
  learningConfirm.hidden=true;
  learningStrip.style.transition='none';learningStrip.style.transform='translateX(0%)';
  void learningStrip.offsetWidth;learningStrip.style.transition='';
  renderLearningPages();playLearningPage();
}
function clearLearningTransition(state){
  if(!state)return;
  if(state.transition!=null)clearTimeout(state.transition);
  state.transition=null;state.transitionSuspended=false;state.transitionRemaining=0;
}
function scheduleLearningTransition(state,delay){
  state.transitionRemaining=Math.max(0,delay);
  if(document.hidden){state.transitionSuspended=true;return;}
  state.transitionSuspended=false;state.transitionDue=performance.now()+state.transitionRemaining;
  state.transition=setTimeout(()=>{
    if(learningState!==state)return;
    state.transition=null;playLearningPage();
  },state.transitionRemaining);
}
function moveLearningPage(delta) {
  const state=learningState;
  if(!state)return;
  const target=state.page+delta;
  if(target<0)return;
  if(target>=state.questions.length*2){
    clearLearningTransition(state);
    learningSwipe=null;
    clearPressedLearningButtons(learningView);
    stopAudio();
    learningView.hidden=true;learningState=null;
    if((state.level.world===1&&state.level.stage===1)||
       (state.level.world===4&&state.level.stage>2))showCardTest(state.level);
    else showSpellTest(state.level);
    return;
  }
  // CardPlayer2 releases the outgoing LearnCard2 before starting the tween.
  stopAudio();
  clearLearningTransition(state);
  learningStrip.style.transform=`translateX(${-target*100}%)`;
  state.page=target;learningPrevious.hidden=target===0;
  scheduleLearningTransition(state,800);
}
function testTimer(state,fn,delay) {
  const timer={handle:null,fn};state.timers.add(timer);armCardTestTimer(state,timer,delay);
}
function armCardTestTimer(state,timer,delay){
  timer.remaining=Math.max(0,delay);
  if(document.hidden){timer.suspended=true;return;}
  timer.suspended=false;timer.due=performance.now()+timer.remaining;
  timer.handle=setTimeout(()=>{state.timers.delete(timer);if(cardTestState===state)timer.fn();},timer.remaining);
}
function clearCardTest() {
  clearPressedLearningButtons(cardTestView);
  cardTestAudioHint.hidden=true;
  if(!cardTestState)return;
  for(const timer of cardTestState.timers)clearTimeout(timer.handle);
  stopAudio();
  cardTestState=null;cardTestView.hidden=true;
}
function testSound(path) {playEffectPath(`assets/cardtest/${path}.mp3`);}
const cardTestVoices=new Set();
const cardTestVoiceState=new WeakMap();
function tryCardTestVoice(player){
  const state=cardTestVoiceState.get(player);
  if(!state||!cardTestVoices.has(player))return;
  const attempt=++state.attempt;state.blocked=false;
  if(document.hidden){state.suspended=true;return;}
  state.suspended=false;state.pending=true;
  player.play().then(()=>{if(state.attempt===attempt)state.pending=false;}).catch(error=>{
    if(state.attempt!==attempt)return;
    state.pending=false;
    if(error?.name==='NotAllowedError')state.blocked=true;
    else cardTestVoices.delete(player);
  });
}
document.addEventListener('pointerdown',()=>{
  for(const player of cardTestVoices)if(cardTestVoiceState.get(player)?.blocked)tryCardTestVoice(player);
},{capture:true,passive:true});
function playCardTestPronunciation(code){
  // Card.transFront calls Card.play, which creates an independent Sound.
  const player=new Audio(`assets/learning/audio/${code}/${code}.mp3`);
  player.volume=1;cardTestVoices.add(player);cardTestVoiceState.set(player,{attempt:0,pending:false,suspended:false,blocked:false});
  const release=()=>cardTestVoices.delete(player);
  player.addEventListener('ended',release,{once:true});
  player.addEventListener('error',release,{once:true});
  tryCardTestVoice(player);
}
function renderTestCards() {
  const state=cardTestState;if(!state)return;
  for(const card of state.cards){
    if(card.removed){card.element?.remove();continue;}
    let button=card.element;
    if(!button){
      button=document.createElement('button');button.className='test-card';
      const rotor=document.createElement('span');rotor.className='test-rotor';
      const front=document.createElement('span');front.className='test-side test-side-front';
      const back=document.createElement('span');back.className='test-side test-side-back';
      const face=document.createElement('img');face.className='test-face';face.src=cardTestAssets.card1;face.alt='';front.append(face);
      const glyph=cardTestAssets.glyphs[card.code];
      if(glyph){const img=document.createElement('img');img.className='test-glyph';img.src=glyph.path;img.alt='';
        img.style.width=`${glyph.width/181*100}%`;img.style.height=`${glyph.height/255*100}%`;front.append(img);}
      const reverse=document.createElement('img');reverse.className='test-face';reverse.src=cardTestAssets.card2;reverse.alt='';back.append(reverse);
      rotor.append(front,back);button.append(rotor);card.rotor=rotor;
      button.addEventListener('click',()=>selectTestCard(card));card.element=button;cardTestCards.append(button);
    }
    button.type='button';button.style.left=`${card.x/1024*100}%`;button.style.top=`${card.y/768*100}%`;
    button.setAttribute('aria-label',card.face?card.code:'翻开卡片');
    card.rotor.style.transform=`rotateY(${card.face?0:-180}deg)`;
  }
}
function finishCardTestIntro() {
  const state=cardTestState;if(!state||state.phase!=='intro')return;
  cardTestTitle.hidden=true;
  cardTestAudioHint.hidden=true;
  // onStartSoundOver sorts the original vector before cleanFace appends the
  // matching cards in XML order. Sorting does not reorder display children.
  state.cards=nativeArraySort(state.cards,()=>Math.random()<=.5?-1:1);
  state.phase='moving';for(const card of state.cards)card.face=false;
  renderTestCards();
  testTimer(state,()=>{
    for(const card of state.cards){card.x=512;card.y=384;}
    renderTestCards();
    testTimer(state,()=>{
      state.cards.push(...state.questions.map(q=>({code:q.code,face:false,x:512,y:384,removed:false})));
      renderTestCards();
      testTimer(state,()=>{
        const n=state.questions.length,start=(1024-((n-1)*30+n*180))/2;
        state.cards.forEach((card,index)=>{card.x=start+(index%n)*210+90;card.y=Math.floor(index/n)*280+245;});
        renderTestCards();testTimer(state,()=>{state.phase='playing';},400);
      },1000);
    },400);
  },1000);
}
function showCardTest(level) {
  const questions=(cardCoverContent[level.id]?.questions||[]).slice(0,4);
  if(!questions.length)return;
  clearCardTest();stopTipAudio();learningView.hidden=true;cardCover.hidden=true;selectView.hidden=true;cardTestView.hidden=false;
  cardTestCards.innerHTML='';
  cardTestConfirm.hidden=true;cardTestResult.hidden=true;
  // CardTest.check hides the writing button for world 4 and for world 2-1,
  // and moves the remaining game button to stage x=454 rather than 554.
  const canWrite=level.world!==4&&!(level.world===2&&level.stage===1);
  document.querySelector('#card-test-write').hidden=!canWrite;
  document.querySelector('#card-test-play').style.left=`${(canWrite?554:454)/1024*100}%`;
  cardTestTitle.hidden=false;cardTestAudioHint.hidden=true;
  const n=questions.length,start=(1024-((n-1)*30+n*180))/2;
  const state={level,questions,cards:questions.map((q,i)=>({code:q.code,face:true,x:start+i*210+90,y:400,removed:false})),selected:[],phase:'intro',timers:new Set(),sunflowerStart:performance.now()};
  cardTestState=state;renderTestCards();
  stopAudio();audio=new Audio('assets/cardtest/start.mp3');
  audio.addEventListener('playing',()=>{if(cardTestState===state&&state.phase==='intro')cardTestAudioHint.hidden=true;});
  audio.addEventListener('ended',()=>{if(cardTestState===state)finishCardTestIntro();},{once:true});
  audio.addEventListener('error',()=>{if(cardTestState===state)finishCardTestIntro();},{once:true});
  tryPronunciation(audio,error=>{
    if(cardTestState!==state||state.phase!=='intro')return;
    if(error?.name==='NotAllowedError')cardTestAudioHint.hidden=false;
    else finishCardTestIntro();
  });
}
function animateLearningResultSunflower(canvas,isVisible,state){
  const context=canvas.getContext('2d');let lastFrame=-1;
  function draw(now){
    if(!isVisible())return;
    if(document.hidden){requestAnimationFrame(draw);return;}
    const frame=Math.floor((now-state.sunflowerStart)*30/1000)%60;
    if(frame!==lastFrame){
      context.clearRect(0,0,82,67);
      if(cardTestSunflowerImage.complete&&cardTestSunflowerImage.naturalWidth)
        context.drawImage(cardTestSunflowerImage,(frame%10)*82,Math.floor(frame/10)*67,82,67,0,0,82,67);
      lastFrame=frame;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
function selectTestCard(card) {
  const state=cardTestState;
  if(!state||state.phase!=='playing'||!cardTestConfirm.hidden||card.face||card.removed||performance.now()<(card.busyUntil||0))return;
  state.phase='flipping';card.face=true;state.selected.push(card);renderTestCards();
  playCardTestPronunciation(card.code);
  testTimer(state,()=>{
    if(state.selected.length<2){state.phase='playing';return;}
    const [first,second]=state.selected;const same=first.code===second.code;
    testSound(same?'right':'wrong');
    if(same){first.removed=true;second.removed=true;}
    else{first.face=false;second.face=false;first.busyUntil=second.busyUntil=performance.now()+300;}
    state.selected=[];renderTestCards();
    if(state.cards.every(item=>item.removed)){state.phase='result';cardTestResult.hidden=false;playEffectPath('assets/cardtest/end.mp3');animateLearningResultSunflower(cardTestSunflower,()=>cardTestState===state&&state.phase==='result'&&!cardTestView.hidden,state);}
    else state.phase='playing';
  },500);
}
function gateScore(world, stage) {
  const id = `gate${world}_${stage}`;
  if (stage <= WORLD_FINALE[world].stage)
    return Object.prototype.hasOwnProperty.call(gateScores,id)
      ? Number(gateScores[id]) || 0 : completed.has(id) ? 2 : 0;
  try {
    if (world === 1) return localStorage.getItem('pvz-pinyin-match-won') === '1' ? 4 : 0;
    if (world === 2) return localStorage.getItem('pvz-pinyin-joint-won') === '1' ? 4 : 0;
    if (world === 3) return localStorage.getItem('pvz-pinyin-roll-best') !== null ? 4 : 0;
    const last = localStorage.getItem('pvz-pinyin-pull-last-score');
    const points = Number(last ?? localStorage.getItem('pvz-pinyin-pull-best') ?? 0);
    return points >= 200 ? 4 : points >= 100 ? 3 : points >= 20 ? 2 :
      last !== null || localStorage.getItem('pvz-pinyin-pull-played') === '1' ||
      localStorage.getItem('pvz-pinyin-pull-best') !== null ? 1 : 0;
  } catch { return 0; }
}
function isGateUnlocked(world, stage) {
  return stage === 1 || gateScore(world,stage) > 0 || gateScore(world,stage-1) > 0 ||
    completed.has(`gate${world}_${stage-1}`);
}
function showMissionPrompt(world,stage) {
  // Gate.onSel chooses mc_mission frame by the preceding stage's global index.
  const frame=({1:0,2:5,3:12,4:18})[world]+stage-1;
  clearArtButtonsWithin(gateMission);
  gateMissionLabel.src=`assets/gate/mission-label-${String(frame).padStart(2,'0')}.webp`;
  gateMission.hidden=false;
}
function showGatePurchaseTip(page=1) {
  gatePurchaseTip.hidden=false;
  gatePurchaseTipImage.src=`assets/gate/purchase-tip-${page}.webp`;
  gatePurchaseTipMan.src=`assets/gate/purchase-tip-man-${page}.webp`;
  gatePurchaseTipHand.hidden=page!==1;
  gateTipNext.hidden=page!==1;
  gateTipBuy.hidden=gateTipClose.hidden=page!==2;
  // Gate plays these Sound objects directly, without a SoundTransform.
  startTipAudio(`assets/gate/purchase-tip-${page}.mp3`);
}
function nameForGate(world, label) { return `${WORLD_NAMES[world-1]} · ${label}`; }
async function startLevel(level) {
  writingOverlay.hidden=true;
  writingResultCanvas.hidden=true;
  writingLossOverlay.hidden=true;
  exitConfirmPointer=null;exitConfirmHover=null;
  pauseButtonPress=null;pauseButtonHover=null;
  pauseEntryPress=null;
  audioEntryPress=null;
  battleCardPress=null;
  battleResultPress=null;battleResultHover=null;
  victoryRewardPress=null;
  battleTipPress=null;
  battleHelpPress=null;
  clearIntroTimers(game);
  clearQuestionTimer(game);
  clearWriteFailTimer(game);
  clearWritingResultTimer(game);
  stopBattleMainTimer(game);
  clearEndingTimer(game);
  stopGateMusic();
  clearHintTimers(game);
  clearAutoReplays(game);
  clearLaunchTimers(game);
  clearCorpseTimers(game);
  clearIconTimers(game);
  volumeDrag=null;
  stopHelpAnimation();
  stopTipAudio();
  if(helpAudioUrl)URL.revokeObjectURL(helpAudioUrl);
  helpAudio=null;
  helpAudioUrl=null;
  document.body.classList.remove('select-mode');
  cardCover.hidden=true;selectView.hidden = true; battleView.hidden = false;
  stageLabel.textContent = `${WORLD_NAMES[level.world-1]} · 第 ${level.stage} 关`;
  const rows = activeRows(level);
  game = {level,time:0,tick:0,mainTimerFrames:0,mainTimerCount:0,mainTimerHandle:null,manualMainTimer:false,spawns:0,battleDepth:0,bulletDepth:0,zombies:[],plants:level.plants.map((id,index)=>({
    id,row:rows[index],x:290,y:160+rows[index]*100,
    motionState:'idle',motionStart:0})),shots:[],effects:[],writing:null,
    cardY:initialCardPositions(level),
    cardCurrentY:Array.from({length:level.mode===1?level.letters.length:6},()=>level.mode===1?880:850),
    preparing:true,introTick:0,grassExtraFrames:0,dealtCards:1,introMoving:[0],startGameAt:null,dealTimer:null,introStartTimer:null,awaitingTip:false,
    waitingForFirstQuestion:false,
    specials:level.specialPlant ? rows.map(row=>({id:level.specialPlant,row,
      x:level.specialPlant<=3?548:715,y:160+row*100,
      used:false,hitTargets:new Set(),triggerAt:0,activeUntil:0,effectAt:0,
      effectPending:false,target:null})) : [],
    spikeTargets:[],
    questionIndex:0,questionOrder:shuffledIndices(level.mode===1?level.letters.length:level.questions.length),question:null,phase:0,options:[],feedback:'答对拼音，植物就会攻击僵尸',feedbackUntil:3,
    paused:false,exitConfirm:null,helpPage:null,result:null,ending:null,loading:true,
    pendingAttack:null,resultIcons:[],iconTimers:[],corpseTimers:[],pendingCorpses:[],
    pendingPlantFires:[],activePlant:null,writeFailAt:null,writeFailTimer:null,
    wrong:null,wrongCount:0,correctSelections:0,cardFlip:null,autoReplays:[],launchTimers:[],
    hintTimers:[],hintSequence:0,hintCancelId:null,hintPosition:{x:0,y:0},hintVisible:false,
    hintPausedTime:0,
    nextQuestionAt:Infinity,nextRevealAt:Infinity,questionTimer:null,
    cardAngle:0,cardPenVisible:false,
    energyFrame:1,breachedRows:new Set(),laneStartedAt:[null,null,null],defence:3};
  const activeGame=game;
  // Both calls occur in Game.init, before the cards finish dealing.
  playEffect('start_sound');
  startBattleMusic(level.world);
  // Game.init plays grass_sound while selecting the first three lawn scenes.
  if(level.world===1 && level.stage<=3)playEffect('grass_sound');
  const helpSound=loadBattleHelpAudio(activeGame).catch(()=>{});
  setQuestion();
  try {
    await Promise.all([loadLevelImages(level),helpSound,
      document.fonts.load('80px PvZPinyin')]);
  } catch (error) {
    if (game !== activeGame) return;
    console.error(error);
    game.loadError = true;
    stopBattleMusic();
    return;
  }
  if (game !== activeGame) return;
  game.loading = false;
  scheduleNextIntroCard(game);
}
function clearIntroTimers(owner) {
  if(!owner)return;
  for(const key of ['dealTimer','introStartTimer']){
    if(owner[key]!=null)clearTimeout(owner[key]);
    owner[key]=null;owner[key+'Suspended']=false;owner[key+'Remaining']=0;
  }
}
function armIntroTimer(owner,key,delay){
  owner[key+'Remaining']=Math.max(0,delay);
  if(document.hidden){owner[key+'Suspended']=true;return;}
  owner[key+'Suspended']=false;owner[key+'Due']=performance.now()+owner[key+'Remaining'];
  owner[key]=setTimeout(()=>{
    owner[key]=null;
    if(game!==owner||!owner.preparing)return;
    if(key==='dealTimer'){
      owner.introMoving.push(owner.dealtCards++);scheduleNextIntroCard(owner);
    }else startPreparedBattle();
  },owner[key+'Remaining']);
}
function scheduleNextIntroCard(owner) {
  if(owner.manualMainTimer || !owner.preparing || owner.dealtCards>=owner.options.length)return;
  armIntroTimer(owner,'dealTimer',500);
}
function startPreparedBattle() {
  if(!game?.preparing)return;
  battleTipPress=null;
  clearIntroTimers(game);
  stopTipAudio();
  game.preparing=false;
  game.awaitingTip=false;
  game.tick=0;game.time=0;game.mainTimerFrames=0;game.mainTimerCount=0;
  // StartGame starts a 1000 ms Timer; its first onTimer calls autoSel/PlaySound.
  game.waitingForFirstQuestion=true;
  startBattleMainTimer(game);
}
function returnToLevels() {
  clearIntroTimers(game);
  clearQuestionTimer(game);
  clearWriteFailTimer(game);
  clearWritingResultTimer(game);
  stopBattleMainTimer(game);
  clearEndingTimer(game);
  clearHintTimers(game);
  clearAutoReplays(game);
  clearLaunchTimers(game);
  clearCorpseTimers(game);
  clearIconTimers(game);
  volumeDrag=null;
  stopHelpAnimation();
  stopTipAudio();
  stopBattleMusic();
  if(helpAudioUrl)URL.revokeObjectURL(helpAudioUrl);
  helpAudio=null;
  helpAudioUrl=null;
  stopAudio();
  writingOverlay.hidden=true;
  writingLossOverlay.hidden=true;
  const world = game?.level.world || currentWorld;
  game = null;
  images.clear();
  remarkFrameCache=null;
  cardTextures.clear();
  slowedFrames.clear();
  showWorld(world);
}
function nextRootDepth(){game.rootDepth=(game.rootDepth||0)+1;return game.rootDepth;}
function addResultIcon(index,correct) {
  // Game.onSel adds result_icon at the selected card's x/y. Mode 2's
  // incorrect icon is removed independently after 2000 ms.
  const rect=optionRect(index,game.options.length);
  const icon={x:rect.x+rect.w/2,y:rect.y+rect.h/2,frame:correct?0:1,rootDepth:nextRootDepth()};
  game.resultIcons.push(icon);
  return icon;
}
function answer(index) {
  if (!game || game.paused || game.result || game.ending?.type==='win' || game.loading ||
      game.preparing || game.waitingForFirstQuestion || game.pendingAttack ||
      game.cardFlip || game.cardAngle!==180 || game.writeFailAt!==null ||
      game.wrong?.locked) return;
  const choice = game.options[index];
  if (!choice) return;
  game.wrong=null;
  const correct = game.question.parts[game.phase];
  if (choice !== correct) {
    const icon=addResultIcon(index,false);
    // Game.onSel: wrong mode 1 flips after 2000 ms and unlocks after 3000 ms;
    // mode 2 removes its temporary icon after 2000 ms and replays at 3000 ms.
    game.wrongCount++;
    // Game.onSel calls makeFaint on the current plant after a wrong choice.
    // If no plant has attacked yet, it selects the route of the nearest zombie.
    if (!game.activePlant) game.activePlant=plantForNearestZombie();
    if (game.activePlant) {
      const plant=game.activePlant,{sprite,frame}=plantMotionFrame(plant);
      // makeFaint reads _p.height once, immediately after adding the clip.
      plant.faintHeight=sprite?.nativeHeights?.[frame];
      plant.faintAt=game.time;
    }
    const isLetter=game.level.mode===1;
    game.wrong={locked:true,lockUntil:game.time+(isLetter?3:2),audioAt:game.time+3,
      flipStarted:false};
    if(isLetter)scheduleLetterWrong(game.wrong);
    else scheduleWrongIconRemoval(icon,game.wrong);
    // Mode 2 schedules autoSel separately from the removable wrong icon and
    // from setSound's timeout; another selection does not cancel autoSel.
    if(!isLetter)scheduleAutoReplay();
    if(game.wrongCount>=2)scheduleHint(isLetter?4:1,true);
    game.feedback='再试一次，注意听发音';game.feedbackUntil=game.wrong.lockUntil;
    playEffect('faint_sound');
    return;
  }
  game.correctSelections++;
  game.wrongCount=0;
  const cancelledHint=game.hintTimers.find(timer=>timer.id===game.hintCancelId);
  if(cancelledHint)clearTimeout(cancelledHint.handle);
  game.hintTimers=game.hintTimers.filter(timer=>timer.id!==game.hintCancelId);
  game.hintCancelId=null;game.hintVisible=false;
  if (game.phase + 1 < game.question.parts.length) {
    addResultIcon(index,true);
    game.phase++;
    if(game.level.world===2&&game.level.stage===2&&game.correctSelections===1)
      scheduleHint(.1,false);
    playEffect('click_sound');
    game.feedback = '答对第一部分，再选下一部分'; game.feedbackUntil = game.time + 2;
  } else {
    if (game.cardPenVisible && beginWriting(correct)) {
      playEffect('click_sound');
      game.feedback='请描写拼音';game.feedbackUntil=game.time+2;
    } else {
      addResultIcon(index,true);
      finishCorrectAnswer(false,index);
    }
  }
}
function activeRows(level) {
  return level.world===1&&level.stage===1?[1]:level.plants.map((_,index)=>index);
}
// Game.damageHandle checks bullet.x against zombie.x-30..x+30 and
// bullet.y against zombie.y-80..y+70 before checkDamageble.
function bulletTouchesZombie(shot,zombie) {
  return shot.x>=zombie.x-30 && shot.x<=zombie.x+30 &&
    shot.y>=zombie.y-80 && shot.y<=zombie.y+70;
}
function bulletCanHitZombie(shot,zombie) {
  // damageHandle gates ordinary collision by pos before the hit rectangle.
  // Plant_12's type-11 bullets keep pos=-1 and may cross lanes. The native
  // rectangle branch also requires the zombie's x to be below 1050.
  return zombie.x<1050 && (shot.bulletType===11 || shot.row===zombie.row) &&
    bulletTouchesZombie(shot,zombie);
}
function advanceTrackingTarget(shot){
  shot.target=shot.targets?.[++shot.targetIndex]||null;
  if(!shot.target){shot.x=2000;return false;}
  shot.row=shot.target.row;
  return true;
}
function bulletHitSound(shot,zombie) {
  // Game.damageHandle uses the bullet's hit sound for type-1 zombies or
  // while the target's hat is on stage; otherwise it plays _sound11.
  const hasHat=ZOMBIE_VISUAL[zombie.id]?.[1] && !zombie.hatGone;
  return ZOMBIE_TYPE_ONE.has(zombie.id) || hasHat ? shot.hitSound : 'hit_sound1';
}
function specialTouchesZombie(special,zombie) {
  // damageHandle compares bullet.pos with zombie.pos before hit geometry.
  if(special.row!==zombie.row)return false;
  // Type 101 also accepts a zombie 10..110 pixels to the right of the plant.
  return (zombie.x<1050 && bulletTouchesZombie(special,zombie)) ||
    (special.id===2 && zombie.x-special.x>10 && zombie.x-special.x<=110);
}
function expireDroppedHats(owner) {
  owner.effects=owner.effects.filter(effect=>{
    if(effect.kind!=='dropped-hat' || owner.time-effect.at+1e-9<effect.duration)return true;
    if(effect.zombie.hatEffect===effect){
      effect.zombie.hatGone=true;
      effect.zombie.hatEffect=null;
    }
    return false;
  });
}
function damageZombie(zombie,amount,dimDeath=false) {
  if(zombie.hp<=0)return;
  const previousHp=zombie.hp;
  zombie.hp-=amount;
  const threshold=ZOMBIE_LIFE[zombie.id]*.5;
  const hat=ZOMBIE_VISUAL[zombie.id]?.[1];
  if(hat && zombie.hp<=threshold && !zombie.hatGone){
    // Damage reparents the hat to the zombie's parent and positions it in
    // stage coordinates. Further hits while it is on stage restart the clip.
    if(zombie.hatEffect)game.effects=game.effects.filter(effect=>effect!==zombie.hatEffect);
    zombie.hatDropAt=game.time;
    zombie.hatEffect={kind:'dropped-hat',hat,offset:ZOMBIE_HAT_OFFSET[zombie.id],
      x:zombie.x,y:zombie.y,at:game.time,duration:19/zombieMotion.frameRate,zombie,
      battleDepth:++game.battleDepth};
    game.effects.push(zombie.hatEffect);
  }
  const newlyBroken=BROKEN_ZOMBIE_IDS.has(zombie.id)&&
    previousHp>threshold&&zombie.hp<=threshold;
  if(newlyBroken)
    zombie.broken=true;
  const brokenEffect=newlyBroken&&BROKEN_EFFECTS[zombie.id];
  if(brokenEffect)game.effects.push({kind:'broken-effect',...brokenEffect,
    x:zombie.x,y:zombie.y,at:game.time,
    duration:(brokenEffect.frames-1)/zombieMotion.frameRate,
    battleDepth:++game.battleDepth});
  if(zombie.hp<=0) {
    // Zombie.Damage clears the display object's filters when death starts.
    zombie.cyanFilter=false;
    const corpse=[{kind:'death',body:ZOMBIE_VISUAL[zombie.id][0],
      sprite:zombieDeathSprite(zombie.id),
      // Damage clears the zombie's filters before the caller can apply the
      // electric-kill filter. Ice cleanup may clear that filter later.
      x:zombie.x,y:zombie.y,slow:false,dim:dimDeath,zombie,
      inBattle:true,battleDepth:zombie.battleDepth??0,
      at:game.time,duration:Infinity}];
    game.effects.push(...corpse);
    // An independent effect can kill between damageHandle scans. Direct
    // projectile collisions are observed during that same scan.
    game.pendingCorpses.push({zombie,effects:corpse,
      hadIce:zombie.iceUntil>game.time && !zombie.iceFilterCleared});
    playEffect('dead_sound');
  }
}
function slowZombie(zombie) {
  if(zombie.hp<=0) return;
  if(!zombie.slow)zombie.speed*=.3;
  zombie.slow=true;
  zombie.slowUntil=game.time+300/zombieMotion.frameRate;
  zombie.cyanFilter=true;
}
function addReturningHitEffect(shot,near) {
  const flipX=shot.rotation===180;
  const offset=near?10:8;
  game.effects.push({kind:'hit-8',sprite:'hit_5',rootDepth:nextRootDepth(),
    x:shot.x+(flipX?offset:-offset),y:shot.y,flipX,at:game.time,
    duration:4/zombieMotion.frameRate});
}
function applyAreaBulletDamage(shot,radius) {
  for(const zombie of game.zombies) {
    // A death already observed by damageHandle is spliced immediately in AIR;
    // the webpage defers its physical array removal to the end of the update.
    if(zombie.hp<=0&&!game.pendingCorpses.some(item=>item.zombie===zombie))continue;
    if(Math.abs(zombie.x-shot.x)>=radius ||
        Math.abs(zombie.y-shot.y)>=radius)continue;
    // Type-8's native ColorMatrixFilter multiplies dead zombies' RGB by .1.
    damageZombie(zombie,shot.damage,shot.bulletType===8);
    if(shot.effect===2)slowZombie(zombie);
    if(shot.bulletType===8){
      if(zombie.hp<=0){
        const corpse=game.pendingCorpses.find(item=>item.zombie===zombie);
        if(corpse){
          // The electric ColorMatrixFilter replaces the existing filters;
          // it does not remove the separate ice clip or end its timer.
          corpse.effects[0].slow=false;
          corpse.effects[0].dim=true;
          zombie.cyanFilter=false;
        }
      }
      game.effects.push({kind:'hit-8',sprite:'hit_8',rootDepth:nextRootDepth(),
        x:zombie.x,y:zombie.y,at:game.time,duration:23/zombieMotion.frameRate});
    }
  }
}
function applyFirstNearHit(shot, targets=game.zombies) {
  if (shot.skillType || shot.firstPulseDone) return;
  // damageHandle tests `first` before the ordinary hit box. The first
  // same-lane zombie at 250 < x < 290 enters the bullet's `arr`. Type 11
  // keeps the native wildcard pos=-1, so its first test accepts any lane.
  const trigger=targets.find(zombie=>zombie.hp>0 &&
    (shot.bulletType===11 || zombie.row===shot.row) &&
    !shot.hitTargets?.has(zombie) &&
    zombie.x>250 && zombie.x<290);
  if(!trigger)return;
  shot.firstPulseDone=true;
  shot.pulseTarget=trigger;
  playEffect(bulletHitSound(shot,trigger));
  // The first-hit branch moves ordinary projectiles before applying area
  // damage. Returning projectiles instead stay in flight and keep an arr.
  const returning=!!shot.hitTargets;
  if(returning){shot.hitTargets.add(trigger);addReturningHitEffect(shot,true);}
  else shot.x=trigger.x-20;
  if([4,5,8].includes(shot.bulletType)) {
    const radius=shot.bulletType===4?100:shot.bulletType===5?150:300;
    applyAreaBulletDamage(shot,radius);
    // The effect-2 near-hit branch continues to Damage the triggering
    // zombie after its type-4 area loop; its geometric-hit branch does not.
    if(shot.bulletType===4 && shot.effect===2)
      damageZombie(trigger,shot.damage);
  } else {
    damageZombie(trigger,shot.damage);
    if(shot.effect===2)slowZombie(trigger);
  }
  if(shot.bulletType!==8 && !returning)addBulletHitEffect(shot,trigger);
  // Non-returning bullets are marked destory after the first hit.
  if(!returning)shot.x=2000;
}
function applyBulletDamage(shot,hit) {
  // Native type 4/5/8 ordinary hits damage the area once. The geometric
  // target is already in that area and receives no second direct hit.
  if((shot.effect===0 && [4,5,8].includes(shot.bulletType)) ||
      (shot.effect===2 && shot.bulletType===4)) {
    applyAreaBulletDamage(shot,shot.bulletType===4?100:
      shot.bulletType===5?150:300);
    return;
  }
  if(shot.skillType===6 || shot.skillType===9)damageZombie(hit,hit.hp);
  else damageZombie(hit,shot.damage);
  if(shot.effect===2)slowZombie(hit);
}
function addBulletHitEffect(shot,zombie,ground=false) {
  if (shot.butter) {
    // On a miss the native clip remains on the ground; frame 240 stops it.
    if(ground)game.effects.push({kind:'ground-butter',x:shot.x,y:shot.y,
      at:game.time,duration:Infinity,bulletDepth:shot.bulletDepth});
    return;
  }
  const sprite=`bullet_hit_${shot.sprite}`;
  const hit=spriteIndex?.[sprite];
  if (!hit) return;
  game.effects.push({kind:'bullet-hit',sprite,parent:shot.sprite,
    x:shot.x,y:shot.y,
    scale:shot.scale||1,at:game.time,
    // The hit clip starts on frame 1; its last frame script immediately
    // removes the parent bullet, after frameCount - 1 frame advances.
    duration:(hit.frameCount-1)/zombieMotion.frameRate,bulletDepth:shot.bulletDepth});
}
function triggerSpecial(special, zombie) {
  // addSpeicalPlant assigns a shared hit sound to each plant; damageHandle
  // plays it when checkDamageble accepts a new collision.
  playEffect(({1:'hit_sound6',2:'hit_sound4',3:'hit_sound3',4:'hit_sound8',5:'hit_sound8'})[special.id]);
  special.hitTargets.add(zombie);
  const blockedSpike=special.id>=4 && ZOMBIE_VISUAL[zombie.id]?.[0]===7;
  if (special.id>=4 && !blockedSpike) game.spikeTargets.push(zombie);
  if(blockedSpike)special.disabled=true;
  // Repeating gotoAndStop(2) while the parent is already on frame 2 does
  // not recreate its active child or restart that child's timeline.
  if(!(special.id>=4 && special.activeUntil>game.time+1e-9)){
    special.triggerAt=game.time;
    special.activeUntil=game.time+
      ((spriteIndex?.[`special_motion_${special.id}_active`]?.frameCount || 20)-1)/30;
    special.effectAt=game.time+(SPECIAL_EVENT_FRAME[special.id]-1)/30;
    special.effectPending=true;
  }
  special.target=zombie;
  if (special.id<=3) special.used=true;
  if(special.used || blockedSpike)special.retireTick=game.tick;
}
function advanceDetachedSpecial(special,dt) {
  if(special.activeUntil<=game.time)return;
  special.triggerAt-=dt;
  special.activeUntil-=dt;
  if(special.effectPending){
    special.effectAt-=dt;
    if(game.time+1e-9>=special.effectAt)applySpecialEffect(special);
  }
}
function applySpecialEffect(special) {
  special.effectPending=false;
  if (special.id===1) {
    for (const other of game.zombies) {
      // The browser removes dead entries at the end of its update; native
      // damageHandle may already have spliced an observed death earlier in it.
      if(other.hp<=0&&!game.pendingCorpses.some(item=>item.zombie===other))continue;
      if(other.row===special.row && Math.abs(other.x-special.x)<=35){
        other.frozenAt=game.time;
        other.iceX=other.x;
        other.iceY=special.y??(other.y+50);
        other.iceDepth=++game.bulletDepth;
        // The new clip starts on frame 1; frame180 dispatches the end event.
        other.iceUntil=game.time+(FREEZE_FRAMES-1)/zombieMotion.frameRate;
        // onSel stops ice clips already present when writing begins; a clip
        // created later by an independent plant timeline was never stopped.
        other.iceWritingOwner=game.writing||null;
        other.frozenUntil=Math.max(other.iceUntil,other.butterUntil||0);
        other.iceFilterCleared=false;
        other.cyanFilter=true;
        if(other.hp<=0){
          // The ice is a separate _bulletSp child even when the target has
          // already died. It remains until its own end or death observation.
          const ice={kind:'detached-ice',zombie:other,x:other.iceX,y:other.iceY,
            at:game.time,duration:(FREEZE_FRAMES-1)/zombieMotion.frameRate,
            bulletDepth:other.iceDepth,writingOwner:game.writing||null};
          other.detachedIce=ice;game.effects.push(ice);
          const corpse=game.pendingCorpses.find(item=>item.zombie===other);
          if(corpse){
            corpse.hadIce=true;
            // onFrozeStart replaces filters on the same native zombie object.
            corpse.effects[0].slow=true;
            corpse.effects[0].dim=false;
            // Zombie.stopMove switches the parent back to its normal/broken
            // walking frame, then stops the newly selected child at frame 1.
            // onClearIce does not call Move for a dead zombie.
            corpse.effects[0].frozenWalk=true;
          }
        }
      }
    }
    game.feedback='冰冻植物启动';
  } else if (special.id===2) {
    for (const other of game.zombies) {
      const distance=other.x-special.x;
      if(other.hp>0 && other.row===special.row && distance>10 && distance<=110)
        damageZombie(other,other.hp);
    }
    game.feedback='窝瓜重击';
  } else if (special.id===3) {
    for (const other of game.zombies) {
      if(other.hp>0 && other.row===special.row && Math.abs(other.x-special.x)<=45)
        damageZombie(other,other.hp);
    }
    game.feedback='爆炸植物启动';
  } else {
    // onSpikeOn/onSpikeOnEx1 damage all zombies in _spikeArr, then clear it.
    // Separate spike plants can add the same zombie more than once.
    const targets=game.spikeTargets.splice(0);
    for (const other of targets)
      if (other.hp>0) damageZombie(other,special.id===4?1:2);
    game.feedback='尖刺植物命中僵尸';
  }
  special.target=null;
  game.feedbackUntil=game.time+2;
}
function expireDetachedIce(owner){
  owner.effects=owner.effects.filter(effect=>{
    if(effect.kind!=='detached-ice'||owner.time-effect.at+1e-9<effect.duration)return true;
    const zombie=effect.zombie;
    if(zombie.detachedIce===effect)zombie.detachedIce=null;
    clearZombieIceFilter(owner,zombie);
    return false;
  });
}
function clearEndingTimer(owner) {
  const ending=owner?.ending;if(!ending)return;
  if(ending.timerHandle!=null)clearTimeout(ending.timerHandle);
  ending.timerHandle=null;ending.timerSuspended=false;ending.timerRemaining=0;
}
function scheduleEndingTimer(owner,delay){
  const ending=owner.ending;
  ending.timerRemaining=Math.max(0,delay);
  if(document.hidden){ending.timerSuspended=true;return;}
  ending.timerSuspended=false;ending.timerDue=performance.now()+ending.timerRemaining;
  ending.timerHandle=setTimeout(()=>{
    ending.timerHandle=null;
    if(game===owner&&owner.ending===ending&&!owner.result)finish(ending.type==='win');
  },ending.timerRemaining);
}
function finish(won) {
  if (game.result) return;
  stopBattleMainTimer(game);
  clearEndingTimer(game);
  game.result = won ? 'win' : 'lose';
  game.resultAt = performance.now();
  // A confirmation already on the display list remains beneath the newly
  // added result panel until a result button raises that same dialog again.
  game.resultCoverConfirm=!!game.exitConfirm;
  exitConfirmPointer=null;exitConfirmHover=null;
  if(!won){stopBattleMusic();playEffect('fail_sound');}
}
function beginEnding(type,zombie=null) {
  if(game.result)return;
  if(type==='lose' && zombie && (!game.ending || game.ending.type==='lose')){
    // eatMovie changes the same display object to its entering animation.
    // A death awaiting damageHandle cannot be observed after onTimer splices
    // that zombie out of _zombies, so its detached web death drawing ends here.
    const index=game.pendingCorpses.findIndex(corpse=>corpse.zombie===zombie);
    if(index>=0){
      const [corpse]=game.pendingCorpses.splice(index,1);
      game.effects=game.effects.filter(effect=>!corpse.effects.includes(effect));
    }
  }
  if(game.ending){
    if(type==='lose' && game.ending.type==='lose' && zombie){
      (game.ending.otherEntering??=[]).push(game.ending.zombie);
      game.ending.zombie=zombie;
      game.zombies=game.zombies.filter(other=>other!==zombie);
    }
    return;
  }
  stopBattleMainTimer(game);
  game.ending={type,start:game.time,zombie,rootDepth:type==='win'?nextRootDepth():null};
  if(type==='lose'&&zombie){
    // onTimer removes the entering zombie from _zombies, but keeps its
    // display object on stage until fail() reparents it above the panel.
    game.zombies=game.zombies.filter(other=>other!==zombie);
  }
  if(type==='lose' && !game.manualMainTimer){
    scheduleEndingTimer(game,1000);
  }
  if(type==='win') {
    // onTimer stops the music and plays the win sound before the light and
    // delayed result panel, at the same point it saves progress.
    stopBattleMusic();
    playEffect('win_sound');
    // Another tab may have saved progress while this battle was running.
    // Refresh before adding this result so its unrelated levels are retained.
    refreshGateProgress();
    completed.add(game.level.id);
    gateScores[game.level.id]=game.defence+1;
    pendingCompleted.add(game.level.id);
    pendingScores.set(game.level.id,game.defence+1);
    const savedCompleted=!progressReadError&&writeStorage('pvz-game-completed',JSON.stringify([...completed]));
    const savedScore=!progressReadError&&writeStorage('pvz-game-scores',JSON.stringify(gateScores));
    progressStorageError=!savedCompleted||!savedScore;
    if(!progressStorageError){pendingCompleted.clear();pendingScores.clear();}
  }
}
function updateResultTimelines(dt) {
  // win()/fail() remove damageHandle, but do not stop independent clips or
  // the separate skill Timer. Keep their visuals running at fixed positions.
  game.resultVisualTime=(game.resultVisualTime||0)+dt;
  game.grassExtraFrames++;
  game.hintPausedTime+=dt;
  for(const plant of game.plants){
    plant.motionStart-=dt;
    if(plant.faintAt!==undefined)plant.faintAt-=dt;
  }
  for(let row=0;row<game.laneStartedAt.length;row++)
    if(game.laneStartedAt[row]!=null)game.laneStartedAt[row]-=dt;
  for(const shot of game.shots)
    if(shot.launchAt<=game.time+1e-9)
      shot.pausedVisualTime=(shot.pausedVisualTime||0)+dt;
  for(const shot of [...game.shots])
    if(shot.skillType===12&&shot.launchAt<=game.time+1e-9)
      advanceSkillPrelude(shot,dt*zombieMotion.frameRate);
  game.shots=game.shots.filter(shot=>shot.x<2000);
  for(const event of game.pendingPlantFires)event.at-=dt;
  const readyFires=game.pendingPlantFires.filter(event=>game.time+1e-9>=event.at);
  game.pendingPlantFires=game.pendingPlantFires.filter(event=>game.time+1e-9<event.at);
  for(const event of readyFires)firePlantAttack(event.plant,event.superAttack);
  if(game.pendingAttack){game.pendingAttack.start-=dt;advanceSunshine();}
  if(game.cardFlip){game.cardFlip.start-=dt;advanceCardFlip();}
  for(const effect of game.effects)
    if(['bullet-hit','hit-8','broken-effect','death','dropped-hat','ground-butter','detached-ice'].includes(effect.kind))effect.at-=dt;
  expireDetachedIce(game);
  expireDroppedHats(game);
  game.effects=game.effects.filter(effect=>
    (effect.kind!=='bullet-hit'&&effect.kind!=='hit-8'&&effect.kind!=='broken-effect')||
    game.time-effect.at+1e-9<effect.duration);
  const entering=game.ending?.type==='lose'?game.ending.zombie:null;
  for(const zombie of entering?[...game.zombies,...(game.ending.otherEntering||[]),entering]:game.zombies){
    if(zombie.iceUntil>game.time&&!zombie.iceFilterCleared){
      zombie.frozenAt-=dt;zombie.iceUntil-=dt;
      if(zombie.iceUntil<=game.time+1e-9){
        zombie.iceUntil=game.time;clearZombieIceFilter(game,zombie);
      }
    }
    if(zombie.butterUntil>game.time){
      zombie.butterAt-=dt;zombie.butterUntil-=dt;
      if(zombie.butterUntil<=game.time+1e-9)zombie.butterUntil=game.time;
    }
    zombie.frozenUntil=Math.max(zombie.iceUntil||0,zombie.butterUntil||0);
    if(!(zombie.frozenUntil>game.time))zombie.walkFrame+=dt*zombieMotion.frameRate;
  }
  for(const special of game.specials)advanceDetachedSpecial(special,dt);
}
function stopBattleMainTimer(owner) {
  if(!owner)return;
  if(owner.mainTimerHandle!=null){clearInterval(owner.mainTimerHandle);owner.mainTimerHandle=null;}
  owner.mainTimerSuspended=false;owner.mainTimerRemaining=0;
}
function armBattleMainTimer(owner,delay){
  owner.mainTimerDue=performance.now()+delay;
  const handle=setTimeout(()=>{
    if(owner.mainTimerHandle!==handle)return;
    onBattleTimer(owner);
    if(owner.mainTimerHandle!==handle)return;
    owner.mainTimerDue=performance.now()+1000;
    owner.mainTimerHandle=setInterval(()=>{
      owner.mainTimerDue=performance.now()+1000;
      onBattleTimer(owner);
    },1000);
  },delay);
  owner.mainTimerHandle=handle;
}
function startBattleMainTimer(owner) {
  if(!owner || owner.mainTimerHandle!=null || owner.mainTimerSuspended || owner.manualMainTimer || owner.loading ||
      owner.preparing || owner.paused || owner.writing || owner.ending || owner.result)return;
  owner.mainTimerFrames=0;
  if(document.hidden){owner.mainTimerSuspended=true;owner.mainTimerRemaining=1000;return;}
  armBattleMainTimer(owner,1000);
}
function onBattleTimer(owner) {
  if(document.hidden || game!==owner || owner.loading || owner.preparing || owner.paused || owner.writing || owner.ending || owner.result)return;
  owner.mainTimerCount++;
  const {level}=owner;
  // onTimer creates scheduled zombies each second. If the battlefield is
  // empty, it advances the next queued zombie early on that timer tick.
  while (!game.ending && game.spawns < level.zombies.length) {
    const source = level.zombies[game.spawns];
    if(source.time!==game.mainTimerCount && game.zombies.length>0)break;
    const rows=activeRows(level);
    const row=rows[Math.floor(Math.random()*rows.length)];
    game.zombies.push({id:source.id,row,x:1024,y:110+row*100,
      hp:ZOMBIE_LIFE[source.id],speed:source.speed,walkFrame:0,
      battleDepth:++game.battleDepth});
    game.spawns++;
  }
  if(game.spawns===level.zombies.length && game.zombies.length===0)beginEnding('win');
  // Native scans the live array by index and splices an entering zombie.
  // The increment after the splice skips the entry shifted into that index.
  for(let index=0;index<game.zombies.length;index++){
    const zombie=game.zombies[index];
    if (zombie.x<450 && !game.breachedRows.has(zombie.row)) {
      game.breachedRows.add(zombie.row);
      game.laneStartedAt[zombie.row]=game.time;
      game.defence--;
      game.energyFrame=Math.min(6,game.energyFrame+1);
      playEffect('warning_sound');
    }
    if (zombie.x<90) beginEnding('lose',zombie);
  }
  if(owner.waitingForFirstQuestion){owner.waitingForFirstQuestion=false;revealCards();}
  if(Number.isFinite(owner.nextRevealAt) && !Number.isFinite(owner.nextQuestionAt)){
    owner.nextRevealAt=Infinity;
    if(!revealCards() && (owner.cardFlip || owner.cardAngle===0))owner.nextRevealAt=Math.floor(owner.time)+1;
  }
}
function update(dt,realtime=false) {
  if (!game || game.loading) return;
  if(!realtime && !game.manualMainTimer){game.manualMainTimer=true;stopBattleMainTimer(game);clearIntroTimers(game);}
  // A result timer can complete while the pause or writing overlay is open.
  // Those handlers have already stopped their timelines; win/fail does not
  // resume them merely by removing damageHandle.
  if(game.result && !game.paused && !game.writing){updateResultTimelines(dt);return;}
  if(game.paused || game.writing){
    // The background MovieClips are not stopped with the battle Timer.
    game.grassExtraFrames++;
    for(let row=0;row<game.laneStartedAt.length;row++)
      if(game.laneStartedAt[row]!=null)game.laneStartedAt[row]-=dt;
    // StartGame creates arrow_mc after the card intro. Visibility changes and
    // battle pauses do not stop its independent timeline.
    if(!game.preparing)game.hintPausedTime+=dt;
    // Flash ENTER_FRAME listeners keep advancing after the battle Timer stops.
    if(game.cardFlip){game.cardFlip.start-=dt;advanceCardFlip();}
    // onConfirm pauses only objects whose desc is "plant" in the bullet
    // array. Ordinary bullet child timelines continue even while stationary.
    for(const shot of game.shots)
      if(shot.launchAt<=game.time+1e-9)
        shot.pausedVisualTime=(shot.pausedVisualTime||0)+dt;
    // onSunShineMove checks _pause, but the sunshine clip itself is not
    // stopped by the pause or writing handlers.
    if(game.pendingAttack)
      game.pendingAttack.pausedVisualTime=(game.pendingAttack.pausedVisualTime||0)+dt;
    // The faint clip is a separate child of Plant_N; pause stops _p.mc,
    // not this sibling. Its frame60 removes itself from the plant.
    for(const plant of game.plants)
      if(plant.faintAt!==undefined)plant.faintAt-=dt;
    // Detached hit clips, hats and independent effects are not among the
    // timelines stopped by onConfirm or by the writing overlay.
    for(const effect of game.effects)
      if(['bullet-hit','hit-8','broken-effect','death','dropped-hat','ground-butter'].includes(effect.kind))effect.at-=dt;
    if(game.paused || game.writing){
      for(const effect of game.effects)
        if(effect.kind==='detached-ice' && (!game.writing || effect.writingOwner===game.writing))effect.at-=dt;
      expireDetachedIce(game);
    }
    expireDroppedHats(game);
    game.effects=game.effects.filter(effect=>
      (effect.kind!=='bullet-hit' && effect.kind!=='hit-8' && effect.kind!=='broken-effect') ||
      game.time-effect.at+1e-9<effect.duration);
    // The pause menu does not stop the separately added ice clip. Entering
    // handwriting explicitly stops it, so only the menu advances its clock.
    if(game.paused || game.writing){
      for(const zombie of game.zombies){
        // onClearIce calls Move even with the pause menu open. The walk clip
        // resumes, while damageHandle still skips positional updates.
        if(zombie.pausedWalkPlaying)
          zombie.walkFrame+=dt*zombieMotion.frameRate;
        if(zombie.iceUntil==null || zombie.iceFilterCleared || zombie.iceUntil<=game.time ||
            (game.writing && zombie.iceWritingOwner!==game.writing))continue;
        zombie.frozenAt-=dt;
        zombie.iceUntil-=dt;
        if(zombie.iceUntil<=game.time+1e-9){
          zombie.iceUntil=game.time;
          clearZombieIceFilter(game,zombie);
          if(zombie.hp>0 && !(zombie.butterUntil>game.time)){
            zombie.pausedWalkAnchor=zombie.walkFrame;
            zombie.pausedWalkPlaying=true;
          }
        }
        zombie.frozenUntil=Math.max(zombie.iceUntil,zombie.butterUntil||0);
      }
    }
    // Advance detached plants after existing ice so newly created ice starts
    // on frame 1 instead of advancing during the same browser update.
    for(const special of game.specials)
      if(special.detachedFromBullets)advanceDetachedSpecial(special,dt);
    return;
  }
  if(game.preparing){
    if(game.awaitingTip)return;
    // Game.addCard pushes one card immediately, then another every 500 ms.
    // CardMove eases only cards already on stage; when the final card settles,
    // it schedules StartGame after 1000 ms.
    const introTime=++game.introTick/zombieMotion.frameRate;
    if(game.manualMainTimer){
      const dealt=Math.min(game.options.length,1+Math.floor(introTime*2+1e-9));
      while(game.dealtCards<dealt)game.introMoving.push(game.dealtCards++);
    }
    // CardMove shifts the head of its pending array when a card arrives;
    // its loop index still advances after the shift.
    for(let position=0;position<game.introMoving.length;position++){
      const index=game.introMoving[position];
      const target=game.cardY[index],current=game.cardCurrentY[index];
      const next=current+(target-current)*.2;
      game.cardCurrentY[index]=next;
      if(Math.abs(target-next)<3){
        game.cardCurrentY[index]=target;
        game.introMoving.shift();
      }
    }
    if(game.introMoving.length===0){
      if(game.level.world===2&&game.level.stage===2){
        // CardMove shows game_tip here and waits for onTip to call StartGame.
        game.awaitingTip=true;
        if(soundIndex?.tip_sound3){
          // CardMove plays tip_sound3 directly with the Sound default volume.
          startTipAudio(soundIndex.tip_sound3);
        }
        return;
      }
      if(game.manualMainTimer){
        if(game.startGameAt===null)game.startGameAt=introTime+1;
        if(introTime+1e-9>=game.startGameAt)startPreparedBattle();
      }else if(game.startGameAt===null){
        const owner=game;
        owner.startGameAt=introTime+1;
        armIntroTimer(owner,'introStartTimer',1000);
      }
    }
    return;
  }
  game.time = ++game.tick / zombieMotion.frameRate;
  for(const special of game.specials)
    if(special.retireTick!==undefined && game.tick>special.retireTick)
      special.detachedFromBullets=true;
  if(!realtime && !game.ending && ++game.mainTimerFrames>=zombieMotion.frameRate){
    game.mainTimerFrames=0;
    onBattleTimer(game);
  }
  // damageHandle scans _zombies in insertion order and keeps the same index
  // after splicing a dead entry. Independent effects can kill them in a
  // different order before this scan, so death time is not the display order.
  const pendingDeaths=game.pendingCorpses.splice(0);
  pendingDeaths.sort((a,b)=>(a.zombie.battleDepth??0)-(b.zombie.battleDepth??0));
  for(const corpse of pendingDeaths){
    settleBattleCorpse(game,corpse);
  }
  if(pendingDeaths.length){
    const removed=new Set(pendingDeaths.map(corpse=>corpse.zombie));
    game.zombies=game.zombies.filter(zombie=>!removed.has(zombie));
  }
  const entering=game.ending?.type==='lose'?game.ending.zombie:null;
  for(const zombie of entering?[...game.zombies,...(game.ending.otherEntering||[]),entering]:game.zombies){
    if(zombie.slow && game.time+1e-9>=zombie.slowUntil){
      zombie.speed/=.3;
      zombie.slow=false;
      zombie.cyanFilter=false;
    }
    if(zombie.iceUntil!=null && !zombie.iceFilterCleared && game.time+1e-9>=zombie.iceUntil){
      clearZombieIceFilter(game,zombie);
    }
  }
  if(game.ending){
    if(game.ending.type==='win') {
      if(game.ending.arrowDepth==null && game.time-game.ending.start+1e-9>=WIN_SCALE_FRAMES/zombieMotion.frameRate)
        game.ending.arrowDepth=nextRootDepth();
      if(game.manualMainTimer && game.ending.clickedAt!=null && game.time-game.ending.clickedAt>=3){finish(true);return;}
    }else if(game.manualMainTimer && game.time-game.ending.start>=1-1e-9){finish(false);return;}
  }
  const approach=1-Math.pow(.8,dt*zombieMotion.frameRate);
  game.cardCurrentY=game.cardCurrentY.map((current,index)=>{
    const target=game.cardY[index];
    return Math.abs(target-current)<3 ? target : current+(target-current)*approach;
  });
  if (game.wrong && game.level.mode===2 && game.time>=game.wrong.audioAt && !game.wrong.locked) {
    game.wrong=null;
  }
  advanceCardFlip();
  if(game.manualMainTimer && game.time+1e-9>=game.nextQuestionAt){
    finishQuestionShuffle(game);
  }
  if (game.manualMainTimer && game.writeFailAt!==null && game.time>=game.writeFailAt) {
    game.writeFailAt=null;
    startCardFlip(true);
  }
  // Game.onSunShineMove eases each axis by 10% per SWF frame.
  advanceSunshine();
  const readyFires=game.pendingPlantFires.filter(event=>game.time+1e-9>=event.at);
  game.pendingPlantFires=game.pendingPlantFires.filter(event=>game.time+1e-9<event.at);
  for (const event of readyFires) firePlantAttack(event.plant,event.superAttack);
  const {level} = game;
  // Native damageHandle updates zombie positions before scanning bullets.
  for (const zombie of game.zombies) {
    if (zombie.hp>0 && !(zombie.frozenUntil > game.time)) {
      const body=ZOMBIE_VISUAL[zombie.id]?.[0] || 1;
      const previousFrame=zombie.walkFrame;
      zombie.walkFrame+=dt*zombieMotion.frameRate;
      if(zombie.pausedWalkAnchor!=null){
        const positions=zombieMotion.walks[String(body)],count=positions.length;
        const origin=Math.floor(zombie.pausedWalkAnchor),current=Math.floor(zombie.walkFrame);
        // The last frame's setX script resets the stored ground marker.
        const reset=Math.floor((current+1)/count)>Math.floor((origin+1)/count);
        const marker=reset?positions[0]:positions[origin%count];
        zombie.x-=zombie.speed*(positions[current%count]-marker);
        delete zombie.pausedWalkAnchor;
        zombie.pausedWalkPlaying=false;
      }else{
        zombie.x-=zombie.speed*(walkPosition(body,zombie.walkFrame)-walkPosition(body,previousFrame));
      }
    }

  }
  // StartGame inserts special plants into the native bullet array before
  // later plant projectiles. Their collision checks therefore run first.
  for (const special of game.specials) {
    if (special.used || special.disabled) continue;
    const targets=game.zombies.filter(zombie=>zombie.hp>0 &&
      !special.hitTargets.has(zombie) && specialTouchesZombie(special,zombie));
    if (special.id>=4) {
      for (const target of targets) {
        triggerSpecial(special,target);
        if(special.disabled)break;
      }
    } else if (special.activeUntil<=game.time+1e-9 && targets.length) {
      triggerSpecial(special,targets[0]);
    }
  }
  for (const shot of game.shots) {
    if (shot.launchAt>game.time+1e-9) continue;
    activateBattleShot(game,shot);
    // damageHandle checks the recovery window only in its in-bounds branch.
    const outsideShotBounds=shot.x>1050 || shot.y>800 || shot.y< -300;
    if (shot.boomerangSpeed!==undefined && !outsideShotBounds &&
        shot.x>270 && shot.x<310) {
      shot.x=2000;
      continue;
    }
    // damageHandle tests ordinary bullet bounds before advancing the frame.
    // The rising skill prelude is driven by onSkill2/onSkill3 until y < -1000.
    if (shot.boomerangSpeed===undefined && shot.skillType!==12 && outsideShotBounds) {
      shot.x=2000;
      continue;
    }
    if (shot.attackSound && !shot.soundPlayed) {
      playEffect(shot.attackSound);
      shot.soundPlayed=true;
    }
    const age=game.time-shot.launchAt;
    // Integer game ticks can differ from launchAt by a few binary fractions.
    // A full native frame must move exactly one frame at collision boundaries.
    const stepDt=age>=dt-1e-9?dt:Math.max(0,age);
    if (shot.skillType===12) {
      advanceSkillPrelude(shot,stepDt*zombieMotion.frameRate);
      continue;
    }
    if (shot.skillType===2) {
      shot.y+=stepDt*30*zombieMotion.frameRate;
      if (shot.y>=(shot.groundY??shot.target.y)+55) {
        addBulletHitEffect(shot,shot.target,true);
        shot.x=2000;
        continue;
      }
    } else if (shot.skillType===9) {
      // damageHandle advances one `tar` entry when its target is dead or
      // detached, and destroys the bullet after the last entry.
      const targetOnStage=game.zombies.includes(shot.target) ||
        (game.ending?.type==='lose' &&
          (game.ending.zombie===shot.target || game.ending.otherEntering?.includes(shot.target)));
      if (!shot.target || shot.target.hp<=0 || !targetOnStage) {
        if(!advanceTrackingTarget(shot))continue;
      }
      const approach=1-Math.pow(.8,stepDt*zombieMotion.frameRate);
      shot.x+=(shot.target.x-shot.x)*approach;
      shot.y+=(shot.target.y-shot.y)*approach;
    } else if (shot.bulletType===11) {
      const step=10*stepDt*zombieMotion.frameRate;
      shot.y+=Math.max(-step,Math.min(step,shot.ty-shot.y));
      shot.x+=20*stepDt*zombieMotion.frameRate;
    } else if (ARC_BULLET_TYPES.has(shot.bulletType) && !shot.skillType) {
      const frames=stepDt*zombieMotion.frameRate;
      const reachedGround=shot.arcTarget && shot.y>=shot.arcGroundY+55;
      // ARM 0xEC8B4 adds encoded integer 0xCE (25) when target is null.
      shot.x+=(shot.arcTarget ? shot.arcTarget.x*.017+5 : 25)*frames;
      shot.y+=50*(shot.dy*frames+.05*frames*(frames+1)/2);
      shot.dy+=.05*frames;
      if (reachedGround) {
        addBulletHitEffect(shot,shot.arcTarget);
        shot.x=2000;
        continue;
      }
    } else if (shot.boomerangSpeed!==undefined) {
      const frames=stepDt*zombieMotion.frameRate;
      shot.x+=shot.boomerangSpeed*frames+shot.boomerangAccel*frames*(frames+1)/2;
      shot.boomerangSpeed+=shot.boomerangAccel*frames;
    } else shot.x += stepDt*(shot.skillType===6?20*zombieMotion.frameRate:shot.speed);
    // The native collision loop handles near and geometric hits for each
    // zombie in array order before moving on to the next zombie.
    // The damage loop checks geometry against every same-lane zombie.
    // Butter's damage/freeze branch additionally compares its saved target.
    for (const zombie of game.zombies) {
      if (!zombie) continue;
      // A preceding area hit can kill a different array entry. Native
      // damageHandle observes that death when a later bullet reaches it.
      if(zombie.hp<=0){observeBattleDeath(zombie);continue;}
      if(shot.skillType===6){
        // Type 6 calls Damage(_life) without setting destory. Its arr keeps
        // each zombie from being hit again while the projectile passes it.
        const near=!shot.firstPulseDone && zombie.row===shot.row &&
          zombie.x>250 && zombie.x<290;
        if(shot.piercedTargets?.has(zombie) || (!near&&!bulletCanHitZombie(shot,zombie)))continue;
        (shot.piercedTargets ||= new Set()).add(zombie);
        if(near)shot.firstPulseDone=true;
        playEffect(bulletHitSound(shot,zombie));
        damageZombie(zombie,zombie.hp);
        observeBattleDeath(zombie);
        continue;
      }
      if(shot.skillType===9){
        // checkDamageble records any same-lane collision before the type-9
        // branch tests whether the zombie is the current target.
        const near=!shot.firstPulseDone && zombie.row===shot.row &&
          zombie.x>250 && zombie.x<290;
        if(shot.trackingSeen?.has(zombie) || (!near&&!bulletCanHitZombie(shot,zombie)))continue;
        (shot.trackingSeen ||= new Set()).add(zombie);
        if(near)shot.firstPulseDone=true;
        playEffect(bulletHitSound(shot,zombie));
        if(zombie!==shot.target)continue;
        damageZombie(zombie,zombie.hp,true);
        game.effects.push({kind:'hit-8',sprite:'hit_8_1',rootDepth:nextRootDepth(),x:zombie.x,y:zombie.y,
          at:game.time,duration:23/zombieMotion.frameRate});
        observeBattleDeath(zombie);
        // The type-9 impact branch advances the shared target index before
        // continuing its current scan, and destroys the shot at the end.
        if(!advanceTrackingTarget(shot))break;
        continue;
      }
      applyFirstNearHit(shot,[zombie]);
      if(zombie.hp<=0)observeBattleDeath(zombie);
      if (shot.x>=2000) break;
      if (shot.hitTargets) {
        if (shot.hitTargets.has(zombie) || !bulletCanHitZombie(shot,zombie)) continue;
        const hitSound=bulletHitSound(shot,zombie);
        addReturningHitEffect(shot,false);
        damageZombie(zombie,shot.damage);
        observeBattleDeath(zombie);
        shot.hitTargets.add(zombie);
        playEffect(hitSound);
        continue;
      }
      const hit=zombie;
      if(hit===shot.pulseTarget || !bulletCanHitZombie(shot,hit))continue;
      const hitSound=bulletHitSound(shot,hit);
      if(shot.butter && hit!==shot.target){
        // The generic impact consumes the bullet before the target-specific
        // effect branch; the bystander is not damaged or frozen.
        game.effects.push({kind:'ground-butter',x:hit.x-20,y:shot.y,
          at:game.time,duration:Infinity,bulletDepth:shot.bulletDepth});
        shot.x=2000;
        playEffect(hitSound);
        break;
      }
      applyBulletDamage(shot,hit);
      const hitVisual=(shot.skillType===6 || shot.skillType===9)
        ? shot : {...shot,x:hit.x-20};
      addBulletHitEffect(hitVisual,hit);
      // A repeated effect-1 hit replaces the existing attached clip and
      // restarts its 240-frame freeze. A lethal hit leaves the clip on stage.
      if (shot.butter) {
        if(hit.hp>0){
          // The attached clip dispatches its end event on entering frame240.
          const until=game.time+(BUTTER_HIT_FRAMES-1)/zombieMotion.frameRate;
          hit.frozenUntil=Math.max(hit.iceUntil||0,until);
          hit.butterAt=game.time;
          hit.butterUntil=until;
          hit.butterDepth=shot.bulletDepth;
        }else{
          game.effects.push({kind:'ground-butter',x:hit.x-20,y:shot.y,
            at:game.time,duration:Infinity,bulletDepth:shot.bulletDepth});
        }
      }
      if(hit.hp<=0)observeBattleDeath(hit);
      // Type 9 keeps flying through its `tar` list. Its next update selects
      // the following target after this hit has killed the current one.
      if (shot.skillType!==9) shot.x=2000;
      playEffect(hitSound);
      if (shot.x>=2000) break;
    }
    // damageHandle clears `first` after the bullet's first collision scan,
    // even when no zombie met the near-hit condition.
    shot.firstPulseDone=true;
  }
  game.shots = game.shots.filter(shot => shot.x<2000);
  for (const special of game.specials)
    if (special.effectPending && game.time+1e-9>=special.effectAt) applySpecialEffect(special);
  // A zombie killed by an independent animation event has not yet passed the
  // next damageHandle scan. Keep it in _zombies for timers and targeting.
  const waitingDeaths=new Set(game.pendingCorpses.map(corpse=>corpse.zombie));
  game.zombies = game.zombies.filter(zombie => zombie.hp>0||waitingDeaths.has(zombie));
  expireDroppedHats(game);
  expireDetachedIce(game);
  game.effects=game.effects.filter(effect=>game.time-effect.at+1e-9<
    (effect.duration || 10/zombieMotion.frameRate));

}
const PAUSE_SLIDERS=[{channel:'music',x:427,y:335},{channel:'effects',x:427,y:396}];
function sliderVolume(channel) {
  return volumeDrag?.channel===channel?volumeDrag.value:
    channel==='music'?musicVolume:effectsVolume;
}
function drawPauseSliders() {
  const back=imageFor('pause_slider_back');
  const front=imageFor('pause_slider_front');
  const thumb=imageFor('pause_slider_thumb');
  if(!back||!front||!thumb)return;
  for(const slider of PAUSE_SLIDERS){
    const position=sliderVolume(slider.channel)*205;
    const width=position+20;
    // The SWF Scale9Bitmap uses horizontal cap widths 20 and 11 pixels.
    const left=width>=31?20:width*20/31;
    const right=width>=31?11:width-left;
    ctx.drawImage(back,slider.x,slider.y);
    ctx.drawImage(front,0,0,20,34,slider.x,slider.y,left,34);
    if(width>left+right)
      ctx.drawImage(front,20,0,210,34,slider.x+left,slider.y,width-left-right,34);
    ctx.drawImage(front,230,0,11,34,slider.x+width-right,slider.y,right,34);
    ctx.drawImage(thumb,slider.x+position,slider.y-4);
  }
}
let exitConfirmPointer=null, exitConfirmHover=null;
let pauseButtonPress=null, pauseButtonHover=null;
let pauseEntryPress=null;
let audioEntryPress=null;
let battleCardPress=null;
let battleResultPress=null,battleResultHover=null;
let victoryRewardPress=null;
let battleTipPress=null;
let battleHelpPress=null;
function battleHelpTargetAt(x,y){
  if(!game||game.helpPage===null)return null;
  if(pointInRect(x,y,HELP_BACK_RECT))return 'back';
  // During download the visible page is only a loading message; its hidden
  // navigation controls must not accept taps before the animation starts.
  if(helpAnimation&&!helpAnimation.start)return null;
  if(!helpAnimation&&(game.helpImageError||game.helpAnimationError||game.helpAudioError))return null;
  if(!helpAnimation&&!imageFor(`help_g${game.level.mode===1?1:2}`,game.helpPage))return null;
  const pages=spriteIndex[`help_g${game.level.mode===1?1:2}`]?.frames?.length||0;
  if(game.helpPage===pages-1){
    // The original mc_end is hidden until the clip reaches its final frame.
    if(helpAnimation)return null;
    if(pointInRect(x,y,HELP_REPLAY_RECT))return 'replay';
    if(pointInRect(x,y,HELP_CLOSE_RECT))return 'close';
  }else if(pointInRect(x,y,HELP_NEXT_RECT))return 'next';
  return null;
}
const BATTLE_RESULT_RECTS={
  win:{exit:{x:317.6,y:488.3,w:170,h:65},next:{x:542.15,y:488.3,w:170,h:65}},
  lose:{exit:{x:284.75,y:537.05,w:170,h:65},replay:{x:567.25,y:537.05,w:170,h:65}}
};
function battleResultButtonAt(x,y){
  const rects=BATTLE_RESULT_RECTS[game?.result];if(!rects)return null;
  if(game.result==='lose'&&performance.now()-game.resultAt<20*1000/zombieMotion.frameRate)return null;
  return Object.keys(rects).find(name=>pointInRect(x,y,rects[name]))||null;
}
function battleResultFrame(name){return battleResultPress?.button===name&&battleResultPress.inside?2:battleResultHover===name?1:0;}
function drawBattleResultButtons(result){
  for(const [name,rect] of Object.entries(BATTLE_RESULT_RECTS[result])){
    const asset=result==='win'?(name==='exit'?'pause_exit':'remark_next'):(name==='exit'?'game_over_back':'game_over_replay');
    const image=imageFor(asset,battleResultFrame(name));if(image)ctx.drawImage(image,rect.x,rect.y);
  }
}
const PAUSE_BUTTONS={
  exit:{x:195.6,y:460.35,w:170,h:65},replay:{x:427,y:460.35,w:170,h:65},
  continue:{x:658.4,y:460.35,w:170,h:65},help:HELP_BUTTON_RECT
};
function pauseButtonAt(x,y){return Object.keys(PAUSE_BUTTONS).find(name=>pointInRect(x,y,PAUSE_BUTTONS[name]))||null;}
function drawPauseButtons(){
  for(const [name,rect] of Object.entries(PAUSE_BUTTONS)){
    const index=pauseButtonPress?.button===name&&pauseButtonPress.inside?2:pauseButtonHover===name?1:0;
    const image=imageFor(`pause_${name}`,index);
    if(image)ctx.drawImage(image,rect.x,rect.y);
  }
}
const EXIT_YES_RECT={x:361.25,y:480,w:170,h:65};
const EXIT_CANCEL_RECT={x:565.75,y:480,w:170,h:65};
function exitConfirmButton(x,y){
  return pointInRect(x,y,EXIT_YES_RECT)?'yes':pointInRect(x,y,EXIT_CANCEL_RECT)?'cancel':null;
}
function exitConfirmButtonFrame(name){
  if(exitConfirmPointer?.button===name && exitConfirmPointer.inside)return 2;
  return exitConfirmHover===name?1:0;
}
function drawExitConfirm(action){
  const bg=imageFor('mc_exit_bg');
  const yes=imageFor('mc_exit_yes',exitConfirmButtonFrame('yes'));
  const cancel=imageFor('mc_exit_cancel',exitConfirmButtonFrame('cancel'));
  const prompt=imageFor('mc_exit_text',action==='replay'?1:0);
  if(bg)ctx.drawImage(bg,0,0,1024,768);
  if(yes)ctx.drawImage(yes,361.25,480);
  if(cancel)ctx.drawImage(cancel,565.75,480);
  if(prompt)ctx.drawImage(prompt,332.95,323.95);
}
function victoryPosition(elapsed){
  const frames=Math.min(WIN_SCALE_FRAMES,elapsed);
  let x=495,y=180,dy=-8;
  for(let i=0;i<frames;i++){
    dy+=.4;
    if(y<=180){y+=dy;x+=2;}else y=181;
  }
  return {x,y,scale:.1+.02*frames};
}
function drawVictoryLight(g,level,elapsed){
  const flashFrame=g.ending.clickedAt==null?0:
    Math.min(28,Math.floor((g.time-g.ending.clickedAt)*zombieMotion.frameRate+1e-9));
  const light=imageFor('victory_light_background',flashFrame);
  const name=`victory_light_reward_${level.world}_${level.stage}`,world=imageFor(name,elapsed);
  if(!light||!world)return;
  const {x,y,scale}=victoryPosition(elapsed);
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const base=spriteIndex.victory_light_background.registration,origin=spriteIndex[name].registration;
  ctx.drawImage(light,base[0],base[1]);
  const rewardScale=spriteIndex[name].scale;
  ctx.drawImage(world,origin[0],origin[1],world.width*rewardScale,world.height*rewardScale);
  ctx.restore();
}
function drawVictoryArrow(elapsed){
  const arrow=imageFor('arrow_mc',elapsed-WIN_SCALE_FRAMES),{x,y}=victoryPosition(elapsed);
  if(arrow)ctx.drawImage(arrow,x-20,y-100);
}
function drawBattle() {
  if (!game) return;
  const g=game, level=g.level;
  const lossAboveWriting=g.result==='lose' && !!g.writing;
  writingLossOverlay.hidden=!lossAboveWriting;
  ctx.clearRect(0,0,1024,768);
  const background=imageFor(`game_bg${level.world}_base`);
  if (background) ctx.drawImage(background,0,0,1024,768);
  else {ctx.fillStyle='#a67b4b';ctx.fillRect(0,0,1024,768);}
  if(level.world===1){
    const start=level.stage<=3?[0,49,98][level.stage-1]:145;
    const end=level.stage<=3?[48,97,145][level.stage-1]:145;
    const frame=Math.min(end,start+g.introTick+g.tick+g.grassExtraFrames);
    const split=frame===end && g.breachedRows.size>0;
    const grass=split?imageFor('game_bg1_grass_without_lanes',Math.min(level.stage,3)-1):
      imageFor('game_bg1_grass',frame);
    const origin=spriteIndex.game_bg1_grass?.registration;
    const trim=split?null:spriteIndex.game_bg1_grass?.trimmed?.[frame];
    if(grass&&origin)ctx.drawImage(grass,origin[0]+(trim?.x||0),origin[1]+(trim?.y||0));
    if(split){
      const positions=[[433.35,82.2],[435.2,184.75],[435.2,289.4]];
      const rows=level.stage===1?[1]:level.stage===2?[0,1]:[0,1,2];
      for(const row of rows){
        const started=g.laneStartedAt[row];
        const laneFrame=started==null?0:Math.floor((g.time-started)*zombieMotion.frameRate+1e-9);
        const image=imageFor('game_ground_lane',laneFrame);
        if(image)ctx.drawImage(image,...positions[row]);
      }
    }
  }else{
    const lane=spriteIndex.game_ground_lane;
    if(lane)for(let row=0;row<3;row++){
      const start=g.laneStartedAt[row];
      const frame=start==null?0:Math.floor((g.time-start)*zombieMotion.frameRate+1e-9);
      const image=imageFor('game_ground_lane',frame);
      if(image)ctx.drawImage(image,...lane.positions[row]);
    }
  }
  // Game.StartGame positions these display objects without changing their scale.
  for (const plant of g.preparing?[]:g.plants) {
    const state=plant.motionState;
    const {name:motion,frame}=plantMotionFrame(plant);
    if (spriteIndex?.[motion])
      drawRegisteredSprite(motion,plant.x,plant.y,
        spriteIndex[motion].registration,frame);
    else {
      const name=`plant_${plant.id}`;
      drawRegisteredSprite(name,plant.x,plant.y,
        spriteIndex?.[name]?.registration,state==='super'?2:state==='attack'?1:0);
    }
    const faintFrame=plant.faintAt===undefined?-1:
      Math.floor((g.time-plant.faintAt)*zombieMotion.frameRate+1e-9);
    if (faintFrame>=0 && faintFrame<59) {
      const faint=imageFor('faint_mc',faintFrame);
      const body=imageFor(`plant_${plant.id}`);
      const origin=spriteIndex.faint_mc?.registration;
      if(faint&&body&&origin)ctx.drawImage(faint,plant.x+origin[0],
        plant.y-(plant.faintHeight??body.height)+origin[1]);
    }
  }
  const drawSpecial=special=>{
    const active=special.activeUntil>g.time+1e-9;
    if (special.used && !active) return;
    const state=active?'active':'idle';
    const motion=`special_motion_${special.id}_${state}`;
    const frame=Math.max(0,Math.floor((g.time-(active?special.triggerAt:0)+
      (!active&&g.result?(g.resultVisualTime||0):0))*30+1e-9));
    if (spriteIndex?.[motion])
      drawRegisteredSprite(motion,special.x,special.y,
        spriteIndex[motion].registration,frame);
    else {
      const name=`specialPlant_${special.id}`;
      drawRegisteredSprite(name,special.x,special.y,
        spriteIndex?.[name]?.registration,active?1:0);
    }
  };
  // Four special plants are children of _DeadSp; type 2 is in _BattleSp.
  for(const special of g.preparing?[]:g.specials)
    if(special.id!==2)drawSpecial(special);
  // A newly dead zombie stays in _BattleSp until damageHandle reparents it.
  const drawDeath=effect=>{
    drawZombieShadow(effect.x,effect.y,effect.body,effect.slow,effect.dim);
    if(effect.frozenWalk){
      const zombie=effect.zombie;
      const broken=zombie.broken&&zombieMotion.brokenSources[String(effect.body)];
      drawRegisteredSprite(broken||zombieSprite(zombie.id),effect.x,effect.y,
        broken?zombieMotion.brokenOffsets[String(effect.body)]:zombieMotion.walkOffsets[String(effect.body)],
        0,effect.slow,effect.dim);
    }else{
      const offset=zombieMotion.deathOffsets[String(effect.body)];
      const scale=zombieMotion.deathScales?.[String(effect.body)]||[1,1];
      ctx.save();ctx.translate(effect.x+offset[0],effect.y+offset[1]);ctx.scale(scale[0],scale[1]);
      drawRegisteredSprite(effect.sprite,0,0,[0,0],
        Math.min(54,Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9)),effect.slow,effect.dim);
      ctx.restore();
    }
  };
  // StartGame places _DeadSp below _BattleSp and _bulletSp.
  for(const effect of g.effects.filter(effect=>effect.kind==='death'&&!effect.inBattle)
      .sort((a,b)=>(a.deadDepth??0)-(b.deadDepth??0)))drawDeath(effect);
  for(const special of g.preparing?[]:g.specials)
    if(special.id===2)drawSpecial(special);
  // _BattleSp draws children in addChild order, including detached hats and
  // the props added to the zombie's parent on reaching half health.
  const enteringZombie=g.ending?.type==='lose'?g.ending.zombie:null;
  const otherEntering=g.ending?.type==='lose'?(g.ending.otherEntering||[]):[];
  const pendingDeath=new Set(g.effects.filter(effect=>effect.kind==='death'&&effect.inBattle).map(effect=>effect.zombie));
  const battleZombies=[...g.zombies,...otherEntering,...(enteringZombie&&g.result!=='lose'?[enteringZombie]:[])]
    .filter(zombie=>!pendingDeath.has(zombie));
  const battleChildren=[...battleZombies.map(zombie=>({zombie,depth:zombie.battleDepth??0})),
    ...g.effects.filter(effect=>effect.kind==='dropped-hat'||effect.kind==='broken-effect'||(effect.kind==='death'&&effect.inBattle))
      .map(effect=>({effect,depth:effect.battleDepth??Infinity}))];
  battleChildren.sort((a,b)=>a.depth-b.depth);
  const drawBattleZombie=(zombie,deathFrame)=>{
    const body=ZOMBIE_VISUAL[zombie.id][0];
    const broken=zombie.broken&&zombieMotion.brokenSources[String(body)];
    drawZombieShadow(zombie.x,zombie.y,body,zombie.cyanFilter);
    if(deathFrame!=null && zombieMotion.eatOffsets?.[String(body)]){
      const state=zombie.broken&&zombieMotion.eatSources?.[String(body)]?.broken
        ?'broken':'normal';
      drawRegisteredSprite(`zombie_eat_${body}_${state}`,zombie.x,zombie.y,
        zombieMotion.eatOffsets[String(body)][state],deathFrame,zombie.cyanFilter);
    }else drawRegisteredSprite(broken||zombieSprite(zombie.id),zombie.x,zombie.y,
      broken?zombieMotion.brokenOffsets[String(body)]:zombieMotion.walkOffsets[String(body)],
      Math.floor(zombie.walkFrame),zombie.cyanFilter);
    const hat=ZOMBIE_VISUAL[zombie.id]?.[1];
    if(hat && zombie.hatDropAt===undefined && !zombie.hatGone &&
       zombie.hp>ZOMBIE_LIFE[zombie.id]*.5)
      drawRegisteredSprite(`zombie_hat${hat}`,zombie.x,zombie.y,ZOMBIE_HAT_OFFSET[zombie.id],0,zombie.cyanFilter);
  };
  for (const child of battleChildren) {
    if(child.effect){
      const effect=child.effect;
      if(effect.kind==='death'){drawDeath(effect);continue;}
      if(effect.kind==='broken-effect'){
        drawRegisteredSprite(effect.sprite,effect.x,effect.y,effect.offset,
          Math.min(effect.frames-1,Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9)));
        continue;
      }
      const drop=zombieMotion.hatDropOffsets[String(effect.hat)];
      const offset=effect.offset;
      const frame=Math.min(19,Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9));
      drawRegisteredSprite(zombieMotion.hatDropSources[String(effect.hat)],effect.x,effect.y,
        [offset[0]+drop[0],offset[1]+drop[1]],frame);
      continue;
    }
    const zombie=child.zombie;
    drawBattleZombie(zombie,(zombie===enteringZombie||otherEntering.includes(zombie))
      ?Math.floor((g.time-g.ending.start)*zombieMotion.frameRate+
        (g.result==='lose'?(performance.now()-g.resultAt)*zombieMotion.frameRate/1000:0)):null);
  }
  const bulletChildren=g.shots.filter(shot=>shot.launchAt<=g.time+1e-9)
    .map(shot=>({shot,depth:shot.bulletDepth??0}));
  for(const effect of g.effects)
    if(effect.kind==='bullet-hit'||effect.kind==='ground-butter'||effect.kind==='detached-ice')
      bulletChildren.push({effect,depth:effect.bulletDepth??Infinity});
  for(const zombie of enteringZombie?[...g.zombies,...otherEntering,enteringZombie]:g.zombies){
    if(zombie.iceUntil>g.time && zombie.frozenAt!==undefined && !zombie.detachedIce)
      bulletChildren.push({zombie,kind:'ice',depth:zombie.iceDepth??Infinity});
    if(zombie.butterUntil>g.time)
      bulletChildren.push({zombie,kind:'butter',depth:zombie.butterDepth??Infinity});
  }
  bulletChildren.sort((a,b)=>a.depth-b.depth);
  for (const child of bulletChildren) {
    if(child.effect){
      const effect=child.effect;
      if(effect.kind==='detached-ice'){
        drawRegisteredSprite('froze_icon',effect.x,effect.y,FREEZE_ICON_OFFSET,
          Math.min(FREEZE_FRAMES-1,Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9)));
      }else if(effect.kind==='ground-butter'){
        drawRegisteredSprite('butter_hit',effect.x,effect.y,[-28,-25],
          Math.min(BUTTER_HIT_FRAMES-1,Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9)));
      }else{
        const hit=spriteIndex?.[effect.sprite],parent=spriteIndex?.[effect.parent];
        const registration=parent?.registration,img=hit?.sheet&&images.get(hit.sheet);
        if(img&&registration){
          const frame=Math.min(hit.frameCount-1,
            Math.floor((g.time-effect.at)*zombieMotion.frameRate+1e-9));
          const scale=effect.scale;
          ctx.drawImage(img,(frame%hit.columns)*hit.frameWidth,
            Math.floor(frame/hit.columns)*hit.frameHeight,hit.frameWidth,hit.frameHeight,
            effect.x+registration[0]*scale,effect.y+registration[1]*scale,
            hit.frameWidth*scale,hit.frameHeight*scale);
        }
      }
      continue;
    }
    if(child.kind==='ice'){
      const zombie=child.zombie;
      drawRegisteredSprite('froze_icon',zombie.iceX??zombie.x,zombie.iceY??zombie.y,FREEZE_ICON_OFFSET,
        Math.min(FREEZE_FRAMES-1,Math.floor((g.time-zombie.frozenAt)*zombieMotion.frameRate)));
      continue;
    }
    if(child.kind==='butter'){
      const zombie=child.zombie;
      drawRegisteredSprite('butter_hit',zombie.x,zombie.y,BUTTER_HIT_OFFSET,
        Math.min(BUTTER_HIT_FRAMES-1,
          Math.floor((g.time-zombie.butterAt)*zombieMotion.frameRate)));
      continue;
    }
    const shot=child.shot;
    const registration=spriteIndex?.[shot.sprite]?.registration;
    const flight=spriteIndex?.[`bullet_flight_${shot.sprite}`];
    const flightImage=flight?.sheet&&images.get(flight.sheet);
    if (flightImage && registration) {
      const frame=Math.floor((g.time-shot.launchAt+(shot.pausedVisualTime||0))*
        zombieMotion.frameRate+1e-9)%flight.frameCount;
      const scale=shot.scale||1;
      ctx.save();
      ctx.translate(shot.x,shot.y);
      if (shot.rotation) ctx.rotate(shot.rotation*Math.PI/180);
      ctx.drawImage(flightImage,(frame%flight.columns)*flight.frameWidth,
        Math.floor(frame/flight.columns)*flight.frameHeight,
        flight.frameWidth,flight.frameHeight,
        registration[0]*scale,
        registration[1]*scale,
        flight.frameWidth*scale,flight.frameHeight*scale);
      ctx.restore();
      continue;
    }
    const bullet=imageFor(shot.sprite,0);
    if (bullet && registration) {
      const scale=shot.scale||1;
      ctx.save();
      ctx.translate(shot.x,shot.y);
      if (shot.rotation) ctx.rotate(shot.rotation*Math.PI/180);
      ctx.drawImage(bullet,registration[0]*scale,
        registration[1]*scale,bullet.width*scale,bullet.height*scale);
      ctx.restore();
    }
    else if (bullet) ctx.drawImage(bullet,shot.x-bullet.width/2,shot.y-bullet.height/2);
    else {ctx.fillStyle='#80d423';ctx.beginPath();ctx.arc(shot.x,shot.y,8,0,Math.PI*2);ctx.fill();}
  }
  const energy=imageFor('energy_bar',g.energyFrame-1);
  if(energy&&!g.preparing){
    ctx.save();
    // Game.RAttack/onTimer apply a yellow 20 px GlowFilter at full energy.
    if(g.energyFrame===6){ctx.shadowColor='#ffff00';ctx.shadowBlur=20;}
    ctx.drawImage(energy,20,245,82,196);
    ctx.restore();
  }
  const audioButton=imageFor(musicEnabled?'audio_on_button':'audio_off_button',audioEntryPress?.inside?2:0);
  if(audioButton)ctx.drawImage(audioButton,AUDIO_BUTTON_RECT.x,AUDIO_BUTTON_RECT.y,
    AUDIO_BUTTON_RECT.w,AUDIO_BUTTON_RECT.h);
  const pauseButton=imageFor('btn_pause',pauseEntryPress?.inside?2:0);
  if(pauseButton)ctx.drawImage(pauseButton,PAUSE_BUTTON_RECT.x,PAUSE_BUTTON_RECT.y,
    PAUSE_BUTTON_RECT.w,PAUSE_BUTTON_RECT.h);

  g.options.forEach((_,index) => {
    if(g.preparing&&index>=g.dealtCards)return;
    const choice=g.options[index];
    const {x,y,w,h}=optionRect(index,g.options.length);
    // Game.onFlipCard advances every card by 10 degrees on each 30 fps frame.
    const flipFrames=g.cardFlip
      ? Math.min(g.cardFlip.frames,
        Math.floor((g.time-g.cardFlip.start)*zombieMotion.frameRate+1e-9)) : 0;
    const angle=g.cardFlip
      ?g.cardFlip.startAngle+g.cardFlip.direction*flipFrames*10:g.cardAngle;
    const back=g.preparing || g.waitingForFirstQuestion ||
      (g.cardFlip
        ?(g.cardFlip.direction>0?flipFrames<9:flipFrames>=9)
        :g.cardAngle===0);
    if(g.cardFlip){
      const texture=cardTexture(choice,level.mode,back);
      if(texture){drawRotatedCard(texture,x+w/2,y+h/2,angle);return;}
    }
    ctx.save();ctx.translate(x+w/2,y+h/2);
    if(g.cardFlip)ctx.scale(Math.max(.03,Math.abs(Math.cos(angle*Math.PI/180))),1);
    if (level.mode===1) {
      const card=cardImage(`com.webelephant.module.Game.card_${choice}`,back,
        g.cardPenVisible);
      if (card) {
        ctx.save();if(!back)ctx.scale(-1,1);
        ctx.drawImage(card,-w/2,-h/2,w,h);ctx.restore();
      } else {box(-w/2,-h/2,w,h,'#f4dda0','#6e4a28',12);
        if(!back)label(displayPinyin(choice),0,0,41,'#473017','center',900);}
    } else {
      const card=cardImage('com.webelephant.module.Game.card_0',back,false);
      if(card){
        ctx.save();if(!back)ctx.scale(-1,1);
        ctx.drawImage(card,-w/2,-h/2,w,h);ctx.restore();
      }
      else box(-w/2,-h/2,w,h,'#f4dda0','#6e4a28',12);
      if(!back){
        // card_0 contains a centered DefineEditText (id 2544): font id 2543,
        // 1600 twips high, RGBA #1188ffff. Its mirrored placement matrix is
        // already accounted for by drawing the text in normal reading order.
        ctx.font='80px PvZPinyin';
        ctx.fillStyle='#1188ff';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(displayPinyin(choice),0,0);
      }
    }
    ctx.restore();
  });
  if(g.hintVisible){
    const frame=g.tick+Math.floor(g.hintPausedTime*zombieMotion.frameRate+1e-9);
    const arrow=imageFor('arrow_mc',frame);
    if(arrow)ctx.drawImage(arrow,g.hintPosition.x,g.hintPosition.y,62,76);
  }
  // Result marks, sunshine and electric hits are independent children of
  // Game; addChild puts each above the children already present.
  const victory=g.ending?.type==='win'&&!g.result?g.ending:null;
  const victoryElapsed=victory?Math.max(0,Math.floor((g.time-victory.start)*zombieMotion.frameRate+1e-9)):0;
  const rootChildren=[
    ...g.resultIcons.map(icon=>({kind:'icon',value:icon,depth:icon.rootDepth??0})),
    ...(g.pendingAttack?[{kind:'sun',value:g.pendingAttack,depth:g.pendingAttack.rootDepth??1}]:[]),
    ...g.effects.filter(effect=>effect.kind==='hit-8').map(effect=>({kind:'hit',value:effect,depth:effect.rootDepth??Infinity})),
    ...(victory?[{kind:'victory',depth:victory.rootDepth??Number.MAX_SAFE_INTEGER-1}]:[]),
    ...(victory&&victoryElapsed>=WIN_SCALE_FRAMES&&victory.clickedAt==null?
      [{kind:'victory-arrow',depth:victory.arrowDepth??Number.MAX_SAFE_INTEGER}]:[])
  ].sort((a,b)=>a.depth-b.depth);
  for(const child of rootChildren){
    const value=child.value;
    if(child.kind==='icon'){
      const image=imageFor('result_icon',value.frame),registration=spriteIndex?.result_icon?.registration;
      if(image&&registration)ctx.drawImage(image,value.x+registration[0],value.y+registration[1]);
    }else if(child.kind==='sun'){
      const frame=value.frame+Math.floor((value.pausedVisualTime||0)*zombieMotion.frameRate+1e-9);
      drawSprite('sunshine',value.x,value.y+34,Infinity,Infinity,frame);
    }else if(child.kind==='hit'){
      if(value.flipX){ctx.save();ctx.translate(value.x,value.y);ctx.scale(-1,1);}
      drawRegisteredSprite(value.sprite,value.flipX?0:value.x,value.flipX?0:value.y,
        spriteIndex[value.sprite].registration,Math.floor((g.time-value.at)*zombieMotion.frameRate+1e-9));
      if(value.flipX)ctx.restore();
    }else if(child.kind==='victory')drawVictoryLight(g,level,victoryElapsed);
    else if(child.kind==='victory-arrow')drawVictoryArrow(victoryElapsed);
  }
  // A failure timeout can fire while the pause panel is open. The native
  // result clip is added above that existing panel, so its fade reveals the
  // paused scene underneath until it becomes opaque.
  if(g.result && g.paused){
    const confirm=imageFor('confirm_panel');
    if(confirm){
      ctx.drawImage(confirm,0,0,1024,768);
      drawPauseButtons();drawPauseSliders();
      if(g.helpPage!==null){
        const help=imageFor(`help_g${level.mode===1?1:2}`,g.helpPage);
        if(!drawHelpAnimation(helpAnimation)&&help&&!helpAnimation&&!g.helpAnimationError&&!g.helpAudioError)ctx.drawImage(help,-56.95,0);
      }
    }
  }
  if(g.result && g.resultCoverConfirm && g.exitConfirm)drawExitConfirm(g.exitConfirm);
  if(g.result==='win'){
    const frame=Math.min(58,Math.floor((performance.now()-g.resultAt)/1000*zombieMotion.frameRate));
    const panel=imageFor('remark_panel_base',frame);
    const award=imageFor(`remark_reward_${level.world}`,level.stage-1);
    if(panel&&award){
      ctx.drawImage(panel,0,0,1024,768);
      ctx.drawImage(award,312,74);
      drawBattleResultButtons('win');
      if(progressStorageError)label('进度无法保存，请检查浏览器存储设置',512,725,20,'#fff','center');
      if(g.exitConfirm&&!g.resultCoverConfirm)drawExitConfirm(g.exitConfirm);
      return;
    }
  }
  if(g.result==='lose'){
    const base=imageFor('game_over_base'),back=imageFor('game_over_back'),replay=imageFor('game_over_replay');
    if(base&&back&&replay){
      const battleContext=ctx;
      if(lossAboveWriting){ctx=writingLossContext;ctx.clearRect(0,0,1024,768);}
      const frames=Math.floor((performance.now()-g.resultAt)*zombieMotion.frameRate/1000);
      ctx.save();ctx.globalAlpha=Math.min(1,Math.max(0,frames*.05));ctx.drawImage(base,0,0);ctx.restore();
      if(frames>=20)drawBattleResultButtons('lose');
      if(enteringZombie){
        const eatFrame=Math.floor((g.time-g.ending.start)*zombieMotion.frameRate+
          (performance.now()-g.resultAt)*zombieMotion.frameRate/1000);
        drawBattleZombie(enteringZombie,eatFrame);
      }
      if(g.exitConfirm&&!g.resultCoverConfirm)drawExitConfirm(g.exitConfirm);
      ctx=battleContext;return;
    }
  }
  if(g.paused){
    const confirm=imageFor('confirm_panel');
    if(confirm){
      ctx.drawImage(confirm,0,0,1024,768);
      drawPauseButtons();
      drawPauseSliders();
      if(g.helpPage!==null){
        const help=imageFor(`help_g${level.mode===1?1:2}`,g.helpPage);
        if(!drawHelpAnimation(helpAnimation)){
          // The still is the end of the page, not its first frame. Wait for
          // the animation to start before showing that still on completion.
          if(help&&!helpAnimation&&!g.helpAnimationError&&!g.helpAudioError)ctx.drawImage(help,-56.95,0);
          else{
            box(243,244,538,280,'#7b542d','#f1d68b',22);
            const failed=(g.helpImageError||g.helpAnimationError||g.helpAudioError)&&!helpAnimation;
            label(failed?(g.helpAudioError?'帮助声音加载失败':g.helpAnimationError?'帮助动画加载失败':'帮助图片加载失败'):'正在加载帮助…',512,325,30,'#fff','center');
            if(failed)label('点击重试',512,390,27,'#fff','center');
            const back=imageFor(`help_loading_back_g${level.mode===1?1:2}`);
            if(back)ctx.drawImage(back,HELP_BACK_RECT.x,HELP_BACK_RECT.y);
          }
        }
        return;
      }
      if(g.exitConfirm)drawExitConfirm(g.exitConfirm);
      return;
    }
  }
  if (g.loading || g.paused || g.result) {
    ctx.fillStyle='rgba(18,25,10,.70)';ctx.fillRect(0,0,1024,768);
    box(243,244,538,280,'#7b542d','#f1d68b',22);
    if (g.loading) {
      if(g.loadError){
        label('游戏图片加载失败',512,325,34,'#fff','center');
        label('点击重试',512,390,27,'#fff','center');
      }else label('正在加载游戏…',512,358,34,'#fff','center');
    }
    else if (g.paused) {label('战斗暂停',512,322,43,'#fff','center');box(372,389,280,72,'#d9b75f');label('继续游戏',512,425,27,'#302716','center');}
    else {
      label(g.result==='win'?'关卡完成！':'僵尸进屋了',512,312,43,'#fff','center');
      box(306,387,188,70,'#d9b75f');label('再玩一次',400,422,25,'#302716','center');
      box(529,387,188,70,'#d9b75f');label('返回选关',623,422,25,'#302716','center');
    }
  }
  if(g.awaitingTip){
    const tip=imageFor('game_tip');
    if(tip)ctx.drawImage(tip,-4.85,0);
  }
}
function frame(now) {
  // AIR dispatches battle events at the SWF frame rate, independent of display Hz.
  // Keep the stage still in the background; limit catch-up for a slow visible frame.
  if(document.hidden){previousFrame=0;requestAnimationFrame(frame);return;}
  const firstFrame=!previousFrame;
  const dt=previousFrame?Math.min((now-previousFrame)/1000,.25):0;
  previousFrame=now;
  const step=1/zombieMotion.frameRate;
  simulationRemainder+=dt;
  let advanced=false;
  while(simulationRemainder+1e-9>=step){
    update(step,true);advanced=true;
    simulationRemainder=Math.max(0,simulationRemainder-step);
  }
  if(firstFrame||advanced)drawBattle();
  requestAnimationFrame(frame);
}
function position(event) {
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*1024/rect.width,y:(event.clientY-rect.top)*768/rect.height};
}
function pointInRect(x,y,rect) {
  return x>=rect.x&&x<rect.x+rect.w&&y>=rect.y&&y<rect.y+rect.h;
}
function beginVolumeDrag(event,x,y) {
  for(const slider of PAUSE_SLIDERS){
    const current=sliderVolume(slider.channel);
    if(!pointInRect(x,y,{x:slider.x+current*205,y:slider.y-4,w:38,h:38}))continue;
    volumeDrag={channel:slider.channel,pointerId:event.pointerId,startX:x,
      origin:Math.trunc(current*205),value:current};
    event.preventDefault();
    try{canvas.setPointerCapture(event.pointerId);}catch{}
    return true;
  }
  return false;
}
function activateBattleResult(button){
  if(button==='exit'||button==='replay'){game.exitConfirm=button;game.resultCoverConfirm=false;return;}
  if(button!=='next')return;
  if(game.level.world===1&&game.level.stage===2){returnToLevels();showGatePurchaseTip();return;}
  const finale=WORLD_FINALE[game.level.world];
  if(finale?.stage===game.level.stage){window.location.href=finale.page;return;}
  const next=content.levels.find(level=>level.world===game.level.world&&level.stage===game.level.stage+1);
  if(next){returnToLevels();showCardCover(next);}else returnToLevels();
}
canvas.addEventListener('pointerdown',event=>{
  if (!game || (game.writing && !game.result)) return;
  if(pauseEntryPress||audioEntryPress||battleCardPress||victoryRewardPress||battleTipPress||battleHelpPress)return;
  if(volumeDrag){event.preventDefault();return;}
  if(game.loading){if(game.loadError)startLevel(game.level);return;}
  const {x,y}=position(event);
  if(game.exitConfirm&&!game.resultCoverConfirm){
    if(exitConfirmPointer)return;
    const button=exitConfirmButton(x,y);
    if(button){
      exitConfirmPointer={pointerId:event.pointerId,button,inside:true,owner:game,action:game.exitConfirm};
      if(event.pointerType!=='mouse')exitConfirmHover=null;
      try{canvas.setPointerCapture(event.pointerId);}catch{}
    }
    return;
  }
  if(game.awaitingTip){
    if(x>=0&&x<1024&&y>=0&&y<768){
      battleTipPress={pointerId:event.pointerId,owner:game};
      try{canvas.setPointerCapture(event.pointerId);}catch{}
    }
    return;
  }
  if(game.ending?.type==='win' && !game.result){
    const elapsed=(game.time-game.ending.start)*zombieMotion.frameRate;
    if(game.ending.type==='win' && elapsed>=WIN_SCALE_FRAMES && game.ending.clickedAt==null &&
       victoryRewardHit(x,y)){
      victoryRewardPress={pointerId:event.pointerId,owner:game,ending:game.ending};
      try{canvas.setPointerCapture(event.pointerId);}catch{}
    }
    return;
  }
  if (game.result) {
    if((game.result==='win'&&imageFor('remark_panel_base')&&imageFor(`remark_reward_${game.level.world}`,game.level.stage-1))||
       (game.result==='lose'&&imageFor('game_over'))){
      const button=battleResultButtonAt(x,y);
      if(button&&!battleResultPress){
        battleResultPress={pointerId:event.pointerId,owner:game,result:game.result,button,inside:true};
        if(event.pointerType!=='mouse')battleResultHover=null;
        try{canvas.setPointerCapture(event.pointerId);}catch{}
      }
      return;
    }
    if (y>=387&&y<=457&&x>=306&&x<=494) startLevel(game.level);
    else if (y>=387&&y<=457&&x>=529&&x<=717) returnToLevels();
    return;
  }
  if (game.paused) {
    if(game.helpPage!==null){
      const target=battleHelpTargetAt(x,y);
      if((game.helpImageError||game.helpAnimationError||game.helpAudioError)&&!helpAnimation&&target!=='back'&&target!=='close'){
        showHelpPage(game.helpPage);return;
      }
      if(target){
        battleHelpPress={pointerId:event.pointerId,owner:game,page:game.helpPage,target};
        try{canvas.setPointerCapture(event.pointerId);}catch{}
      }
      return;
    }
    if(beginVolumeDrag(event,x,y))return;
    const button=pauseButtonAt(x,y);
    if(button&&!pauseButtonPress){
      pauseButtonPress={pointerId:event.pointerId,button,inside:true,owner:game};
      if(event.pointerType!=='mouse')pauseButtonHover=null;
      try{canvas.setPointerCapture(event.pointerId);}catch{}
    }
    return;
  }
  if(battleEffectAt(x,y))return;
  if (x>=PAUSE_BUTTON_RECT.x&&x<=PAUSE_BUTTON_RECT.x+PAUSE_BUTTON_RECT.w&&
      y>=PAUSE_BUTTON_RECT.y&&y<=PAUSE_BUTTON_RECT.y+PAUSE_BUTTON_RECT.h) {
    pauseEntryPress={pointerId:event.pointerId,owner:game,inside:true};
    try{canvas.setPointerCapture(event.pointerId);}catch{}
    return;
  }
  if (x>=AUDIO_BUTTON_RECT.x&&x<=AUDIO_BUTTON_RECT.x+AUDIO_BUTTON_RECT.w&&
      y>=AUDIO_BUTTON_RECT.y&&y<=AUDIO_BUTTON_RECT.y+AUDIO_BUTTON_RECT.h) {
    audioEntryPress={pointerId:event.pointerId,owner:game,inside:true};
    try{canvas.setPointerCapture(event.pointerId);}catch{}
    return;
  }
  if(answerMarkerAt(x,y)||hintArrowAt(x,y))return;
  const index=cardAt(x,y);
  if(index>=0){
    // A blocked automatic pronunciation needs a user gesture. Use the first
    // card tap to play it instead of recording an answer before it is heard.
    if(pronunciationRetryEvents.has(event))return;
    if(pronunciationBlocked){tryPronunciation(pronunciationBlocked);return;}
    battleCardPress={pointerId:event.pointerId,owner:game,index,option:game.options[index],question:game.question,phase:game.phase};
    try{canvas.setPointerCapture(event.pointerId);}catch{}
    return;
  }
  const plant=plantAt(x,y);
  if(plant){
    // clickMovie switches the parent clip to frame 4, replacing the attack
    // child timeline. Its not-yet-dispatched attack event cannot then fire.
    game.pendingPlantFires=game.pendingPlantFires.filter(event=>event.plant!==plant);
    plant.motionState='click';plant.motionStart=game.time;
  }
});
function endBattleHelp(event){
  if(!battleHelpPress||battleHelpPress.pointerId!==event.pointerId)return;
  const press=battleHelpPress;battleHelpPress=null;
  if(event.type!=='pointerup'||game!==press.owner||!game.paused||game.result||game.helpPage!==press.page)return;
  const p=position(event);if(battleHelpTargetAt(p.x,p.y)!==press.target)return;
  if(press.target==='back'||press.target==='close')showHelpPage(null);
  else if(press.target==='replay')showHelpPage(0);
  else showHelpPage(press.page+1);
}
canvas.addEventListener('pointerup',endBattleHelp);
canvas.addEventListener('pointercancel',endBattleHelp);
canvas.addEventListener('lostpointercapture',endBattleHelp);
function endBattleTip(event){
  if(!battleTipPress||battleTipPress.pointerId!==event.pointerId)return;
  const press=battleTipPress;battleTipPress=null;
  if(event.type!=='pointerup'||game!==press.owner||!game.awaitingTip)return;
  const p=position(event);if(p.x>=0&&p.x<1024&&p.y>=0&&p.y<768)startPreparedBattle();
}
canvas.addEventListener('pointerup',endBattleTip);
canvas.addEventListener('pointercancel',endBattleTip);
canvas.addEventListener('lostpointercapture',endBattleTip);
function endVictoryReward(event){
  if(!victoryRewardPress||victoryRewardPress.pointerId!==event.pointerId)return;
  const press=victoryRewardPress;victoryRewardPress=null;
  if(event.type!=='pointerup'||game!==press.owner||game.ending!==press.ending||game.result||game.ending.clickedAt!=null)return;
  const p=position(event);if(!victoryRewardHit(p.x,p.y))return;
  game.ending.clickedAt=game.time;
  if(!game.manualMainTimer){
    scheduleEndingTimer(game,3000);
  }
}
canvas.addEventListener('pointerup',endVictoryReward);
canvas.addEventListener('pointercancel',endVictoryReward);
canvas.addEventListener('lostpointercapture',endVictoryReward);
function endBattleCardPress(event){
  if(!battleCardPress||battleCardPress.pointerId!==event.pointerId)return;
  const press=battleCardPress;battleCardPress=null;
  if(event.type!=='pointerup'||game!==press.owner||game.paused||game.result||game.ending?.type==='win'||game.writing||
     game.question!==press.question||game.phase!==press.phase||game.options[press.index]!==press.option)return;
  const p=position(event);if(cardAt(p.x,p.y)===press.index)answer(press.index);
}
canvas.addEventListener('pointerup',endBattleCardPress);
canvas.addEventListener('pointercancel',endBattleCardPress);
canvas.addEventListener('lostpointercapture',endBattleCardPress);
canvas.addEventListener('pointermove',event=>{
  if(game?.result&&(!game.exitConfirm||game.resultCoverConfirm)){
    const p=position(event),button=battleResultButtonAt(p.x,p.y);
    if(battleResultPress?.pointerId===event.pointerId)battleResultPress.inside=button===battleResultPress.button;
    if(event.pointerType==='mouse')battleResultHover=button;
  }else battleResultHover=null;
  if(audioEntryPress?.pointerId===event.pointerId){
    const p=position(event);audioEntryPress.inside=pointInRect(p.x,p.y,AUDIO_BUTTON_RECT);
  }
  if(pauseEntryPress?.pointerId===event.pointerId){
    const p=position(event);pauseEntryPress.inside=pointInRect(p.x,p.y,PAUSE_BUTTON_RECT);
  }
  if(game?.paused&&!game.exitConfirm&&game.helpPage===null){
    const p=position(event),button=pauseButtonAt(p.x,p.y);
    if(pauseButtonPress?.pointerId===event.pointerId)pauseButtonPress.inside=button===pauseButtonPress.button;
    if(event.pointerType==='mouse')pauseButtonHover=button;
  }else pauseButtonHover=null;
  if(game?.exitConfirm&&!game.resultCoverConfirm){
    const p=position(event),button=exitConfirmButton(p.x,p.y);
    if(exitConfirmPointer?.pointerId===event.pointerId)exitConfirmPointer.inside=button===exitConfirmPointer.button;
    if(event.pointerType==='mouse')exitConfirmHover=button;
  }else exitConfirmHover=null;
  if(!volumeDrag||event.pointerId!==volumeDrag.pointerId)return;
  const x=position(event).x;
  const pixels=Math.max(0,Math.min(205,Math.trunc(volumeDrag.origin+x-volumeDrag.startX)));
  volumeDrag.value=pixels/205;
  event.preventDefault();
});
function endBattleResult(event){
  if(!battleResultPress||battleResultPress.pointerId!==event.pointerId)return;
  const press=battleResultPress;battleResultPress=null;
  if(event.type!=='pointerup'||game!==press.owner||game.result!==press.result||(game.exitConfirm&&!game.resultCoverConfirm))return;
  const p=position(event);if(battleResultButtonAt(p.x,p.y)!==press.button)return;
  battleResultHover=null;activateBattleResult(press.button);
}
canvas.addEventListener('pointerup',endBattleResult);
canvas.addEventListener('pointercancel',endBattleResult);
canvas.addEventListener('lostpointercapture',endBattleResult);
// The native failure panel is added after FightWritePlayer. Forward its
// pointer events to the same result handlers used by the battle canvas.
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','pointerleave']){
  writingLossOverlay.addEventListener(type,event=>{
    if(type==='pointerdown'){
      try{writingLossOverlay.setPointerCapture(event.pointerId);}catch{}
    }
    canvas.dispatchEvent(new PointerEvent(type,{
      pointerId:event.pointerId,pointerType:event.pointerType,isPrimary:event.isPrimary,
      clientX:event.clientX,clientY:event.clientY,button:event.button,buttons:event.buttons,
      bubbles:true,cancelable:true
    }));
    event.preventDefault();
  });
}
function endAudioEntry(event){
  if(!audioEntryPress||audioEntryPress.pointerId!==event.pointerId)return;
  const press=audioEntryPress;audioEntryPress=null;
  if(event.type!=='pointerup'||game!==press.owner||game.paused||game.result||game.ending?.type==='win'||game.writing)return;
  const p=position(event);if(pointInRect(p.x,p.y,AUDIO_BUTTON_RECT)&&!battleEffectAt(p.x,p.y))toggleBattleMusic();
}
canvas.addEventListener('pointerup',endAudioEntry);
canvas.addEventListener('pointercancel',endAudioEntry);
canvas.addEventListener('lostpointercapture',endAudioEntry);
function endPauseEntry(event){
  if(!pauseEntryPress||pauseEntryPress.pointerId!==event.pointerId)return;
  const press=pauseEntryPress;pauseEntryPress=null;
  if(event.type!=='pointerup'||game!==press.owner||game.paused||game.result||game.ending?.type==='win'||game.writing)return;
  const p=position(event);if(pointInRect(p.x,p.y,PAUSE_BUTTON_RECT)&&!battleEffectAt(p.x,p.y))setBattlePaused(true);
}
canvas.addEventListener('pointerup',endPauseEntry);
canvas.addEventListener('pointercancel',endPauseEntry);
canvas.addEventListener('lostpointercapture',endPauseEntry);
function endPauseButton(event){
  if(!pauseButtonPress||pauseButtonPress.pointerId!==event.pointerId)return;
  const press=pauseButtonPress;pauseButtonPress=null;
  if(event.type!=='pointerup'||game!==press.owner||!game.paused||game.result||game.exitConfirm||game.helpPage!==null)return;
  const p=position(event);if(pauseButtonAt(p.x,p.y)!==press.button)return;
  pauseButtonHover=null;
  if(press.button==='continue')setBattlePaused(false);
  else if(press.button==='help')showHelpPage(0);
  else game.exitConfirm=press.button;
}
canvas.addEventListener('pointerup',endPauseButton);
canvas.addEventListener('pointercancel',endPauseButton);
canvas.addEventListener('lostpointercapture',endPauseButton);
function endExitConfirmPointer(event){
  if(!exitConfirmPointer||exitConfirmPointer.pointerId!==event.pointerId)return;
  const press=exitConfirmPointer;exitConfirmPointer=null;
  if(event.type!=='pointerup'||game!==press.owner||game.resultCoverConfirm||game.exitConfirm!==press.action)return;
  const p=position(event);
  if(exitConfirmButton(p.x,p.y)!==press.button)return;
  exitConfirmHover=null;
  if(press.button==='cancel'){game.exitConfirm=null;return;}
  if(press.action==='replay')startLevel(game.level);else returnToLevels();
}
canvas.addEventListener('pointerup',endExitConfirmPointer);
canvas.addEventListener('pointercancel',endExitConfirmPointer);
canvas.addEventListener('lostpointercapture',endExitConfirmPointer);
canvas.addEventListener('pointerleave',()=>{exitConfirmHover=null;pauseButtonHover=null;battleResultHover=null;});
function endVolumeDrag(event) {
  if(!volumeDrag||event.pointerId!==volumeDrag.pointerId)return;
  const {channel,value}=volumeDrag;volumeDrag=null;
  setChannelVolume(channel,value);
}
canvas.addEventListener('pointerup',endVolumeDrag);
canvas.addEventListener('pointercancel',endVolumeDrag);
canvas.addEventListener('lostpointercapture',endVolumeDrag);
writingCanvas.addEventListener('pointerdown',event=>{
  const writing=game?.writing;if(!writing?.ready||writing.drawing)return;
  const point=writingPosition(event),bounds=writing.bounds;
  if(point.x<bounds.left||point.x>bounds.right||point.y<bounds.top||point.y>bounds.bottom)return;
  event.preventDefault();writingCanvas.setPointerCapture(event.pointerId);
  writing.drawing=true;writing.pointerId=event.pointerId;writing.strokes.push([point]);
  markWritingPoint(point);
});
writingCanvas.addEventListener('pointermove',event=>{
  const writing=game?.writing;if(!writing?.drawing||writing.pointerId!==event.pointerId)return;
  event.preventDefault();
  const stroke=writing.strokes.at(-1);
  const samples=[...(event.getCoalescedEvents?.()||[])];
  const last=samples.at(-1);
  if(!last||last.clientX!==event.clientX||last.clientY!==event.clientY)
    samples.push(event);
  for(const sample of samples){
    const point=writingPosition(sample);
    stroke.push(point);
    const bounds=writing.bounds;
    if(point.x<bounds.left||point.x>bounds.right||
        point.y<bounds.top||point.y>bounds.bottom){
      writing.drawing=false;failWriting(point);return;
    }
    markWritingPoint(point,false);
  }
  renderWriting();
});
function endWriting(event){
  const writing=game?.writing;if(!writing?.drawing||writing.pointerId!==event.pointerId)return;
  writing.drawing=false;writing.pointerId=null;
  if(writing.reached.size!==writing.template.points.length){
    // checkAllPoint tests every remaining point marker against the pen
    // graphics. A covered marker that was missed by ordered touch input
    // makes this attempt fail; otherwise the player may keep drawing.
    if(remainingWritingPointsCovered(writing)){
      const [x,y]=writing.template.points[writing.reached.size];
      failWriting({x,y});
    }
    return;
  }
  startWritingResult(true);
}
writingCanvas.addEventListener('pointerup',endWriting);
function cancelWritingPointer(event){
  const writing=game?.writing;if(!writing?.drawing||writing.pointerId!==event.pointerId)return;
  writing.drawing=false;writing.pointerId=null;
}
writingCanvas.addEventListener('pointercancel',cancelWritingPointer);
writingCanvas.addEventListener('lostpointercapture',cancelWritingPointer);
document.querySelector('#writing-retry').addEventListener('click',()=>{
  const writing=game?.writing;if(writing?.error)loadBattleWritingAssets(writing);
});
document.querySelector('#writing-clear').addEventListener('click',()=>{
  if(!game?.writing)return;
  game.writing.reached.clear();game.writing.strokes=[];game.writing.drawing=false;game.writing.pointerId=null;
  game.writing.error='';
  renderWriting();
});
document.querySelector('#back-button').addEventListener('click',returnToLevels);
function handoffGateMusicToShop(){
  try{
    sessionStorage.setItem('pvz-shop-music-handoff',JSON.stringify({
      time:gateMusic.currentTime,at:Date.now(),playing:!gateMusic.paused,
    }));
  }catch{}
}
for(const link of document.querySelectorAll('.gate-shop,#gate-tip-buy')){
  link.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    handoffGateMusicToShop();
  });
}
document.addEventListener('pointerdown',playGateMusic,{passive:true});
document.addEventListener('keydown',playGateMusic);
document.addEventListener('visibilitychange',()=>{
  previousFrame=0;
  const now=performance.now();
  if(document.hidden){
    for(const player of cardTestVoices){
      const state=cardTestVoiceState.get(player);
      if(state&&(!player.paused||state.pending)){
        state.attempt++;state.pending=false;state.suspended=true;player.pause();
      }
    }
    const help=helpAnimation;
    if(help){
      for(const key of ['audioTimer','stopTimer'])if(help[key]!=null){
        help[key+'Remaining']=Math.max(0,help[key+'Due']-now);
        clearTimeout(help[key]);help[key]=null;help[key+'Suspended']=true;
      }
      if(helpAudio&&(!helpAudio.paused||help.soundPending)){
        help.resumeSound=true;help.soundPending=false;help.soundAttempt=(help.soundAttempt||0)+1;helpAudio.pause();
      }
    }
    if(tipAudio&&(!tipAudio.paused||tipAudioPending)){
      suspendedTipAudio=tipAudio;tipAudioPending=false;tipAudioAttempt++;tipAudio.pause();
    }
    if(activeEffect&&(!activeEffect.paused||effectPending)){
      suspendedEffect=activeEffect;effectPending=false;effectAttempt++;activeEffect.pause();
    }
    if(audio&&(!audio.paused||pronunciationPlayPending)){
      suspendedPronunciation=audio;pronunciationPlayPending=false;pronunciationAttempt++;audio.pause();
    }
    if(battleMusicActive){battleMusicAttempt++;battleMusic.pause();}
  }else{
    for(const player of cardTestVoices){
      const state=cardTestVoiceState.get(player);
      if(state?.suspended)tryCardTestVoice(player);
    }
    const help=helpAnimation;
    if(help&&battleHiddenAt!==null){
      const shift=start=>start+Math.max(0,now-Math.max(battleHiddenAt,start));
      if(help.start)help.start=shift(help.start);
      if(Number.isFinite(help.soundStart))help.soundStart=shift(help.soundStart);
      for(const key of ['audioTimer','stopTimer'])if(help[key+'Suspended'])
        scheduleHelpTimer(help,key,help[key+'Remaining'],help[key+'Callback']);
      if(help.resumeSound){help.resumeSound=false;playHelpSound(help);}
    }
    const tip=suspendedTipAudio;suspendedTipAudio=null;
    if(tip&&tipAudio===tip)tryTipAudio(tip);
    const effect=suspendedEffect;suspendedEffect=null;
    if(effect&&activeEffect===effect)tryEffect(effect);
    const player=suspendedPronunciation;suspendedPronunciation=null;
    if(player&&audio===player)tryPronunciation(player);
    if(battleMusicActive)tryBattleMusic();
  }
  if(document.hidden){if(battleHiddenAt===null)battleHiddenAt=now;}
  else if(battleHiddenAt!==null){
    if(game?.result&&Number.isFinite(game.resultAt))
      game.resultAt+=Math.max(0,now-Math.max(battleHiddenAt,game.resultAt));
    const result=game?.writing?.result;
    if(result&&Number.isFinite(result.start))
      result.start+=Math.max(0,now-Math.max(battleHiddenAt,result.start));
    const practiceResult=practiceWriting?.writing?.result;
    if(practiceResult&&Number.isFinite(practiceResult.start))
      practiceResult.start+=Math.max(0,now-Math.max(battleHiddenAt,practiceResult.start));
    for(const writing of [game?.writing,practiceWriting?.writing]){
      const demo=writing?.demo;
      if(demo&&Number.isFinite(demo.started))
        demo.started+=Math.max(0,now-Math.max(battleHiddenAt,demo.started));
    }
    for(const state of [practiceWriting,cardTestState,spellTestState]){
      if(state&&Number.isFinite(state.sunflowerStart))
        state.sunflowerStart+=Math.max(0,now-Math.max(battleHiddenAt,state.sunflowerStart));
    }
    for(const card of cardTestState?.cards||[]){
      if(Number.isFinite(card.busyUntil)&&card.busyUntil>battleHiddenAt)
        card.busyUntil+=now-battleHiddenAt;
    }
    battleHiddenAt=null;
  }
  if(game){
    if(document.hidden&&game.questionTimer!=null){
      game.questionTimerRemaining=Math.max(0,game.questionTimerDue-now);
      clearTimeout(game.questionTimer);game.questionTimer=null;game.questionTimerSuspended=true;
    }else if(!document.hidden&&game.questionTimerSuspended){
      scheduleQuestionShuffle(game,game.questionTimerRemaining);
    }
    for(const timer of game.iconTimers||[]){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armIconTimer(game,timer,timer.remaining);
    }
    for(const timer of game.corpseTimers||[]){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armCorpseRemoval(game,timer,timer.remaining);
    }
    for(const timer of game.launchTimers||[]){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armTimedLaunch(game,timer,timer.remaining);
    }
    for(const timer of game.autoReplays||[]){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armAutoReplay(game,timer,timer.remaining);
    }
    for(const timer of game.hintTimers||[]){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armHintTimer(game,timer,timer.remaining);
    }
    for(const key of ['dealTimer','introStartTimer']){
      if(document.hidden&&game[key]!=null){
        game[key+'Remaining']=Math.max(0,game[key+'Due']-now);
        clearTimeout(game[key]);game[key]=null;game[key+'Suspended']=true;
      }else if(!document.hidden&&game[key+'Suspended']){
        armIntroTimer(game,key,game[key+'Remaining']);
      }
    }
    if(document.hidden&&game.writeFailTimer!=null){
      game.writeFailRemaining=Math.max(0,game.writeFailDue-now);
      clearTimeout(game.writeFailTimer);game.writeFailTimer=null;game.writeFailSuspended=true;
    }else if(!document.hidden&&game.writeFailSuspended){
      scheduleWriteFail(game,game.writeFailRemaining);
    }
    const writingResult=game.writing?.result;
    if(document.hidden&&writingResult?.timerHandle!=null){
      writingResult.timerRemaining=Math.max(0,writingResult.timerDue-now);
      clearTimeout(writingResult.timerHandle);writingResult.timerHandle=null;writingResult.timerSuspended=true;
    }else if(!document.hidden&&writingResult?.timerSuspended){
      scheduleWritingResult(game.writing,writingResult.timerRemaining);
    }
    const ending=game.ending;
    if(document.hidden&&ending?.timerHandle!=null){
      ending.timerRemaining=Math.max(0,ending.timerDue-performance.now());
      clearTimeout(ending.timerHandle);ending.timerHandle=null;ending.timerSuspended=true;
    }else if(!document.hidden&&ending?.timerSuspended){
      scheduleEndingTimer(game,ending.timerRemaining);
    }
    if(document.hidden&&game.mainTimerHandle!=null){
      game.mainTimerRemaining=Math.max(0,game.mainTimerDue-performance.now());
      clearInterval(game.mainTimerHandle);game.mainTimerHandle=null;game.mainTimerSuspended=true;
    }else if(!document.hidden&&game.mainTimerSuspended){
      const remaining=game.mainTimerRemaining;
      game.mainTimerSuspended=false;game.mainTimerRemaining=0;
      if(!game.manualMainTimer&&!game.loading&&!game.preparing&&!game.paused&&!game.writing&&!game.ending&&!game.result)
        armBattleMainTimer(game,remaining);
    }
  }
  if(cardTestState){
    if(document.hidden&&!cardTestState.hiddenAnimations){
      cardTestState.hiddenAnimations=(cardTestView.getAnimations?.({subtree:true})||[])
        .filter(animation=>animation.playState==='running');
      for(const animation of cardTestState.hiddenAnimations)animation.pause();
    }else if(!document.hidden){
      for(const animation of cardTestState.hiddenAnimations||[])
        if(animation.playState==='paused')animation.play();
      cardTestState.hiddenAnimations=null;
    }
    for(const timer of cardTestState.timers){
      if(document.hidden&&timer.handle!=null){
        timer.remaining=Math.max(0,timer.due-now);clearTimeout(timer.handle);timer.handle=null;timer.suspended=true;
      }else if(!document.hidden&&timer.suspended)armCardTestTimer(cardTestState,timer,timer.remaining);
    }
  }
  if(learningState){
    const state=learningState;
    if(document.hidden){
      if(state.transition!=null){
        state.transitionRemaining=Math.max(0,state.transitionDue-now);
        clearTimeout(state.transition);state.transition=null;state.transitionSuspended=true;
      }
      if(!state.hiddenAnimations){
        state.hiddenAnimations=(learningView.getAnimations?.({subtree:true})||[])
          .filter(animation=>animation.playState==='running');
        for(const animation of state.hiddenAnimations)animation.pause();
      }
    }else{
      if(state.transitionSuspended)scheduleLearningTransition(state,state.transitionRemaining);
      for(const animation of state.hiddenAnimations||[])
        if(animation.playState==='paused')animation.play();
      state.hiddenAnimations=null;
    }
  }
  if(document.hidden)gateMusic.pause();else playGateMusic();
});
// A browser Back navigation can restore the old document from the back/forward
// cache after a minigame has saved its score. Rebuild the visible gate cards
// from storage without disturbing a battle, lesson, or an open gate dialog.
window.addEventListener('pageshow',event=>{
  if(event.persisted && content && !selectView.hidden && gateMission.hidden && gatePurchaseTip.hidden && document.querySelector('#gate-buy-panel').hidden){
    refreshGateProgress();
    showWorld(currentWorld);
  }
});
// Another tab can complete a level, save a minigame score, or clear progress
// while this document stays open. Update the in-memory battle progress even
// during play; rebuild the gate only when no other view or dialog is active.
function redrawPendingGateProgress(){
  if(gateProgressRedrawPending&&content&&!selectView.hidden&&gateMission.hidden&&gatePurchaseTip.hidden&&
     document.querySelector('#gate-buy-panel').hidden)showWorld(currentWorld);
}
window.addEventListener('storage',event=>{
  const keys=['pvz-game-completed','pvz-game-scores','pvz-pinyin-match-won',
    'pvz-pinyin-joint-won','pvz-pinyin-roll-best','pvz-pinyin-pull-played',
    'pvz-pinyin-pull-last-score','pvz-pinyin-pull-best'];
  if(event.key!==null&&!keys.includes(event.key))return;
  refreshGateProgress();
  gateProgressRedrawPending=true;
  redrawPendingGateProgress();
});
worldTabs.addEventListener('click',event=>{
  const button=event.target.closest('[data-world]');
  if(!button)return;
  const world=Number(button.dataset.world);
  if(world===currentWorld)return;
  playEffect('click_sound');
  showWorld(world);
});
levelGrid.addEventListener('click',event=>{
  const button=event.target.closest('.level-card');
  if(!button)return;
  playEffect('click_sound');
  if(button.dataset.locked){showMissionPrompt(currentWorld,Number(button.dataset.stage));return;}
  if(button.dataset.finale){location.href=WORLD_FINALE[Number(button.dataset.finale)].page;return;}
  const level=content.levels.find(item=>item.id===button.dataset.level);
  if(level)showCardCover(level);
});
document.querySelector('#card-cover-back').addEventListener('click',()=>showWorld(coverLevel?.world||currentWorld));
document.querySelector('#card-cover-play').addEventListener('click',()=>{if(coverLevel)startLevel(coverLevel);});
cardCoverLearn.addEventListener('click',event=>{if(coverLevel){event.preventDefault();showLearning(coverLevel);}});
cardCoverPractice.addEventListener('click',event=>{if(coverLevel){event.preventDefault();showSpellTest(coverLevel);}});
const pressedLearningButtons=new Map();
const learningPointersInside=new Set();
function updateLearningButton(button){
  button.classList.toggle('is-pressed',[...pressedLearningButtons].some(([id,current])=>current===button&&learningPointersInside.has(id)));
}
function clearPressedLearningButtons(container){
  for(const [id,button] of pressedLearningButtons){
    if(container.contains(button)){pressedLearningButtons.delete(id);learningPointersInside.delete(id);button.classList.remove('is-pressed');}
  }
}
for(const button of document.querySelectorAll(':is(.learning-view,.spell-test,.card-test,.practice-write) button')){
  if(!button.querySelector('.button-down'))continue;
  button.addEventListener('pointerdown',event=>{pressedLearningButtons.set(event.pointerId,button);learningPointersInside.add(event.pointerId);updateLearningButton(button);});
}
document.addEventListener('pointermove',event=>{
  const button=pressedLearningButtons.get(event.pointerId);if(!button)return;
  const target=document.elementFromPoint(event.clientX,event.clientY);
  if(target&&button.contains(target))learningPointersInside.add(event.pointerId);else learningPointersInside.delete(event.pointerId);
  updateLearningButton(button);
},true);
function releaseLearningButton(event){const button=pressedLearningButtons.get(event.pointerId);if(!button)return;pressedLearningButtons.delete(event.pointerId);learningPointersInside.delete(event.pointerId);updateLearningButton(button);}
document.addEventListener('pointerup',releaseLearningButton);
document.addEventListener('pointercancel',releaseLearningButton);
window.addEventListener('blur',()=>{for(const button of pressedLearningButtons.values())button.classList.remove('is-pressed');pressedLearningButtons.clear();learningPointersInside.clear();});
learningPrevious.addEventListener('click',()=>moveLearningPage(-1));
learningNext.addEventListener('click',()=>moveLearningPage(1));
let learningSwipe=null;
learningView.addEventListener('pointerdown',event=>{
  if(!learningState || !learningConfirm.hidden || event.target.closest('button')||learningSwipe)return;
  learningSwipe={id:event.pointerId,x:event.clientX,y:event.clientY};
});
learningView.addEventListener('pointerup',event=>{
  if(!learningSwipe||event.pointerId!==learningSwipe.id)return;
  const dx=event.clientX-learningSwipe.x,dy=event.clientY-learningSwipe.y;
  const threshold=learningView.getBoundingClientRect().width*40/1024;
  learningSwipe=null;
  if(!learningConfirm.hidden)return;
  if(Math.abs(dx)>=threshold && Math.abs(dx)>Math.abs(dy)*1.3)
    moveLearningPage(dx<0?1:-1);
});
learningView.addEventListener('pointercancel',event=>{if(learningSwipe?.id===event.pointerId)learningSwipe=null;});
// A mouse press can end outside the learning view without producing its
// pointerup. Discard that gesture so the next swipe is accepted.
window.addEventListener('pointerup',event=>{if(learningSwipe?.id===event.pointerId)learningSwipe=null;});
window.addEventListener('pointercancel',event=>{if(learningSwipe?.id===event.pointerId)learningSwipe=null;});
window.addEventListener('blur',()=>{learningSwipe=null;});
document.querySelector('#learning-back').addEventListener('click',()=>{learningSwipe=null;clearPressedLearningButtons(learningConfirm);learningConfirm.hidden=false;});
document.querySelector('#learning-cancel').addEventListener('click',()=>{clearPressedLearningButtons(learningConfirm);learningConfirm.hidden=true;});
document.querySelector('#learning-yes').addEventListener('click',()=>{
  const state=learningState;if(!state)return;
  clearLearningTransition(state);
  learningSwipe=null;
  clearPressedLearningButtons(learningView);
  stopAudio();learningState=null;learningView.hidden=true;showCardCover(state.level);
});
cardCoverWrite.addEventListener('click',event=>{event.preventDefault();if(coverLevel)showPracticeWriting(coverLevel);});
document.querySelector('#practice-write-back').addEventListener('click',()=>{
  const writing=practiceWriting?.writing;
  if(writing?.drawing)cancelPracticePointer({pointerId:writing.pointerId});
  clearPressedLearningButtons(practiceWriteConfirm);practiceWriteConfirm.hidden=false;
});
document.querySelector('#practice-write-cancel').addEventListener('click',()=>{clearPressedLearningButtons(practiceWriteConfirm);practiceWriteConfirm.hidden=true;});
document.querySelector('#practice-write-yes').addEventListener('click',()=>{const level=practiceWriting?.level;clearPracticeWriting();if(level)showCardCover(level);});
document.querySelector('#practice-write-again').addEventListener('click',()=>{const level=practiceWriting?.level;if(level)showPracticeWriting(level);});
document.querySelector('#practice-write-play').addEventListener('click',()=>{const level=practiceWriting?.level;clearPracticeWriting();if(level)startLevel(level);});
function practicePosition(event){const rect=practiceWriteCanvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*1024/rect.width-70,y:(event.clientY-rect.top)*768/rect.height-170};}
practiceWriteCanvas.addEventListener('pointerdown',event=>{
  const w=practiceWriting?.writing;if(!w?.ready||!practiceWriteConfirm.hidden||w.drawing)return;
  const p=practicePosition(event),b=w.bounds;
  if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom)return;
  event.preventDefault();practiceWriteCanvas.setPointerCapture(event.pointerId);w.drawing=true;w.pointerId=event.pointerId;
  w.strokes.push([p]);markPracticePoint(w,p);renderPracticeWriting();
});
practiceWriteCanvas.addEventListener('pointermove',event=>{
  const w=practiceWriting?.writing;if(!w?.drawing||w.pointerId!==event.pointerId)return;event.preventDefault();
  const samples=[...(event.getCoalescedEvents?.()||[])];const last=samples.at(-1);
  if(!last||last.clientX!==event.clientX||last.clientY!==event.clientY)samples.push(event);
  for(const sample of samples){const p=practicePosition(sample);w.strokes.at(-1).push(p);
    const b=w.bounds;if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom){finishPracticeAttempt(false,p);return;}
    markPracticePoint(w,p);
  }renderPracticeWriting();
});
function endPracticeDraw(event){const w=practiceWriting?.writing;if(!w?.drawing||w.pointerId!==event.pointerId)return;w.drawing=false;w.pointerId=null;
  if(w.reached.size===w.template.points.length){finishPracticeAttempt(true);return;}
  if(remainingWritingPointsCovered(w)){const [x,y]=w.template.points[w.reached.size];finishPracticeAttempt(false,{x,y});}
}
practiceWriteCanvas.addEventListener('pointerup',endPracticeDraw);
function cancelPracticePointer(event){
  const writing=practiceWriting?.writing;if(!writing?.drawing||writing.pointerId!==event.pointerId)return;
  writing.drawing=false;writing.pointerId=null;
}
practiceWriteCanvas.addEventListener('pointercancel',cancelPracticePointer);
practiceWriteCanvas.addEventListener('lostpointercapture',cancelPracticePointer);
window.addEventListener('blur',()=>{
  exitConfirmPointer=null;exitConfirmHover=null;
  pauseButtonPress=null;pauseButtonHover=null;
  pauseEntryPress=null;
  audioEntryPress=null;
  battleCardPress=null;
  battleResultPress=null;battleResultHover=null;
  victoryRewardPress=null;
  battleTipPress=null;
  battleHelpPress=null;
  if(volumeDrag)endVolumeDrag({pointerId:volumeDrag.pointerId});
  if(game?.writing?.drawing)cancelWritingPointer({pointerId:game.writing.pointerId});
  if(practiceWriting?.writing?.drawing)cancelPracticePointer({pointerId:practiceWriting.writing.pointerId});
});
document.querySelector('#card-test-back').addEventListener('click',()=>{clearPressedLearningButtons(cardTestConfirm);cardTestConfirm.hidden=false;});
document.querySelector('#card-test-cancel').addEventListener('click',()=>{clearPressedLearningButtons(cardTestConfirm);cardTestConfirm.hidden=true;});
document.querySelector('#card-test-yes').addEventListener('click',()=>{const level=cardTestState?.level;clearCardTest();if(level)showCardCover(level);});
document.querySelector('#card-test-play').addEventListener('click',()=>{const level=cardTestState?.level;clearCardTest();if(level)startLevel(level);});
document.querySelector('#card-test-write').addEventListener('click',()=>{const level=cardTestState?.level;clearCardTest();if(level)showPracticeWriting(level);});
gateMissionYes.addEventListener('click',()=>{clearArtButtonsWithin(gateMission);gateMission.hidden=true;redrawPendingGateProgress();});
gateTipNext.addEventListener('click',()=>showGatePurchaseTip(2));
gateTipClose.addEventListener('click',()=>{stopTipAudio();gatePurchaseTip.hidden=true;redrawPendingGateProgress();});
gateTipBuy.addEventListener('click',stopTipAudio);
document.addEventListener('keydown',event=>{
  if (!game) return;
  if(game.result){
    if(event.key==='Escape'&&game.exitConfirm&&!game.resultCoverConfirm){
      game.exitConfirm=null;exitConfirmPointer=null;exitConfirmHover=null;
    }
    if(event.code==='Space')event.preventDefault();
    return;
  }
  if (game.writing) {
    if (event.key==='Escape') returnToLevels();
    return;
  }
  if (/^[1-7]$/.test(event.key)) answer(Number(event.key)-1);
  if (event.code==='Space') {event.preventDefault();playAudio(game.question.audio);}
  if (event.key==='Escape') {
    if(game.helpPage!==null)showHelpPage(null);
    else if(game.exitConfirm&&!game.resultCoverConfirm){game.exitConfirm=null;exitConfirmPointer=null;exitConfirmHover=null;}
    else if(!game.result)setBattlePaused(!game.paused);
  }
});
// Revalidate manifests together so an updated script cannot run against an
// older cached sprite or motion index during local and static deployments.
const loadJson=path=>fetch(path,{cache:'no-store'}).then(response=>{
  if(!response.ok)throw new Error(`${path}（HTTP ${response.status}）`);
  return response.json();
});
Promise.all(['content.json','game-assets.json','game-sounds.json','native-content.json',
  'zombie-motion.json','write-assets.json','write-result-assets.json','write-demo-assets.json','cardcover-content.json','learning-assets.json','cardtest-assets.json'].map(loadJson))
  .then(([data,sprites,sounds,native,motion,writeAssets,resultAssets,demoAssets,coverContent,learnAssets,testAssets])=>{content=data;spriteIndex=sprites;soundIndex=sounds;zombieMotion=motion;writeAssetIndex=writeAssets;writeResultIndex=resultAssets;writeDemoIndex=demoAssets;cardCoverContent=coverContent;learningAssets=learnAssets;cardTestAssets=testAssets;handwritingIndex=new Map(native.handwriting.map(item=>[item.code,item]));const params=new URLSearchParams(location.search),previewWorld=Number(params.get('previewPurchase')),requestedWorld=Number(params.get('world'));const world=Number.isInteger(previewWorld)&&previewWorld>=2&&previewWorld<=4?previewWorld:requestedWorld;showWorld(Number.isInteger(world)&&world>=1&&world<=4?world:1);playGardenBackEffect();requestAnimationFrame(frame);})
  .catch(error=>{document.body.classList.add('select-mode');const label=document.querySelector('#gate-error');label.textContent=`资源加载失败，请刷新页面重试：${error.message}`;label.hidden=false;});
