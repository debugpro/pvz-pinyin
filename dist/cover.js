'use strict';

const byId = id => document.getElementById(id);
const startButton = byId('start');
const continueButton = byId('continue');
const restartButton = byId('restart');
const settingsDialog = byId('settings-dialog');
const restartDialog = byId('restart-dialog');

function seenIntro() {
  try { return localStorage.getItem('pvz-intro-seen') === '1'; }
  catch { return false; }
}

function refreshCover() {
  const returning = seenIntro();
  startButton.hidden = returning;
  continueButton.hidden = !returning;
  restartButton.hidden = !returning;
}

function begin() {
  const returning = seenIntro();
  if (!returning) {
    try { localStorage.setItem('pvz-intro-seen', '1'); } catch { /* Optional storage. */ }
  }
  location.href = returning ? 'game.html' : 'story.html?mode=intro&autoplay=1';
}

function closeDialogs() {
  settingsDialog.hidden = true;
  restartDialog.hidden = true;
}

const coverMusic=new Audio('audio/game/bg_sound.mp3');
coverMusic.loop=true;
function playCoverMusic(){
  coverMusic.volume=PvzVolume.volume('music');
  if(document.hidden)return;
  if(coverMusic.paused)coverMusic.play().catch(()=>{});
}
const coverSliderCanvas=byId('cover-sliders');
const coverSliderContext=coverSliderCanvas.getContext('2d');
let coverSliders;
function drawCoverSliders(){
  coverSliderContext.clearRect(0,0,1024,768);
  if(coverSliders&&!settingsDialog.hidden)coverSliders.draw(coverSliderContext);
}
coverSliders=new PvzPauseSliders(coverSliderCanvas,{
  isActive:()=>!settingsDialog.hidden,
  onChange:(channel)=>{if(channel==='music')playCoverMusic();},
  redraw:drawCoverSliders,
  // FaceCover.mc_setup (192.35,86.35), mc_content (51,24.25),
  // Cover.onAddedhandler HSlider positions (254,97) and (254,153).
  sliders:[{channel:'music',x:497.35,y:207.6},{channel:'effects',x:497.35,y:263.6}]
});
startButton.addEventListener('click', begin);
continueButton.addEventListener('click', begin);
byId('settings').addEventListener('click', () => {
  settingsDialog.hidden = false;
  drawCoverSliders();
  byId('settings-close').focus();
});
byId('settings-close').addEventListener('click', closeDialogs);
// Browsers may reject more than one autoplay attempt, including an attempt
// made while another media element is still being initialized.
document.addEventListener('pointerdown',playCoverMusic,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)coverMusic.pause();else playCoverMusic();
});
window.addEventListener('pageshow',event=>{if(event.persisted){refreshCover();playCoverMusic();}});
window.addEventListener('storage',event=>{
  if(event.key===null||event.key==='pvz-intro-seen')refreshCover();
  if(event.key===null||['pvz-sound','pvz-music-volume','pvz-music-last-volume'].includes(event.key)){
    coverMusic.volume=PvzVolume.volume('music');
    drawCoverSliders();
  }
});
playCoverMusic();
restartButton.addEventListener('click', () => {
  byId('restart-error').hidden = true;
  restartDialog.hidden = false;
  byId('restart-cancel').focus();
});
byId('restart-cancel').addEventListener('click', closeDialogs);
byId('restart-confirm').addEventListener('click', () => {
  // The native confirmation clears the game's saved progress, then reveals
  // Start again. Keep independent sound preferences.
  try { for (const key of [
    'pvz-intro-seen', 'pvz-game-completed', 'pvz-game-scores', 'pvz-completed',
    'pvz-garden-layout', 'pvz-pinyin-roll-best', 'pvz-pinyin-pull-best', 'pvz-pinyin-pull-played',
    'pvz-pinyin-pull-last-score',
    'pvz-pinyin-match-won', 'pvz-pinyin-joint-won',
    'pvz-pinyin-joint-guided',
  ]) localStorage.removeItem(key); }
  catch { byId('restart-error').hidden = false; return; }
  closeDialogs();
  refreshCover();
  startButton.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeDialogs();
});

refreshCover();
