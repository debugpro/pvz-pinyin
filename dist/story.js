'use strict';

const frame = document.querySelector('#story-frame');
const loading = document.querySelector('#loading');
const narration = document.querySelector('#narration');
const streamAudio = new Audio();
streamAudio.preload = 'auto';
// Python's simple static server does not support byte ranges. Blob URLs let
// the browser seek inside the original MP3s after the files are downloaded.
const audioUrls = new Map();
function audioUrl(path) {
  if (!audioUrls.has(path)) {
    const pending = fetch(path).then(response => {
      if (!response.ok) throw new Error(`配音读取失败：HTTP ${response.status}`);
      return response.blob();
    }).then(blob => URL.createObjectURL(blob)).catch(() => {
      if (audioUrls.get(path) === pending) audioUrls.delete(path);
      return path;
    });
    audioUrls.set(path, pending);
  }
  return audioUrls.get(path);
}
const chapters = document.querySelector('#chapters');
const playButton = document.querySelector('#play');
const previousButton = document.querySelector('#previous');
const nextButton = document.querySelector('#next');
const seek = document.querySelector('#seek');
const time = document.querySelector('#time');
const status = document.querySelector('#status');
const screen = document.querySelector('.screen');
const storyParams = new URLSearchParams(location.search);
const introMode = storyParams.get('mode') === 'intro';
if (introMode) document.body.classList.add('story-intro');
let manifest;
let currentClip = 0;
let currentFrame = 0;
let playing = false;
let playbackStarted = false;
let startedAt = 0;
let elapsed = 0;
let animationRequest = 0;
let imageToken = 0;
let playbackToken = 0;
let clipToken = 0;
let audioReady = Promise.resolve();
let transitioning = false;
let trailingNarration = null;
let backgroundResume=false,backgroundTail=null,backgroundAnimations=null,resumeAfterBlock=false;
let backgroundAudioPositions=null;
let tailAttempt=0,tailPending=false,tailBlocked=null;
function tryTrailingNarration(tail){
  if(trailingNarration!==tail)return;
  const attempt=++tailAttempt;tailBlocked=null;
  if(document.hidden){backgroundTail=tail;return;}
  tailPending=true;
  tail.play().then(()=>{if(attempt===tailAttempt)tailPending=false;}).catch(error=>{
    if(trailingNarration!==tail||attempt!==tailAttempt)return;
    tailPending=false;
    if(error?.name==='NotAllowedError')tailBlocked=tail;
    else trailingNarration=null;
  });
}
document.addEventListener('pointerdown',()=>{
  if(tailBlocked&&trailingNarration===tailBlocked)tryTrailingNarration(tailBlocked);
},{capture:true,passive:true});
const preloaded = new Map();

function labelTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function clipDuration() {
  const visual = (manifest.clips[currentClip].frames.length - 1) / manifest.frameRate;
  return Math.max(visual, Number.isFinite(narration.duration) ? narration.duration : 0,
    manifest.clips[currentClip].streamSound && Number.isFinite(streamAudio.duration)
      ? streamAudio.duration : 0);
}

function updateTimeline() {
  seek.max = String(Math.ceil(clipDuration() * manifest.frameRate));
  seek.value = String(Math.min(Number(seek.max), Math.floor(elapsed * manifest.frameRate)));
  time.textContent = `${labelTime(elapsed)} / ${labelTime(clipDuration())}`;
}

function preloadAround(index) {
  const clip = manifest.clips[currentClip];
  for (let i = index; i <= Math.min(index + 8, clip.frames.length - 1); i += 1) {
    const path = clip.frames[i];
    if (!preloaded.has(path)) {
      const image = new Image();
      image.src = path;
      preloaded.set(path, image);
    }
  }
  while (preloaded.size > 24) preloaded.delete(preloaded.keys().next().value);
}

function showFrame(index) {
  const clip = manifest.clips[currentClip];
  currentFrame = Math.max(0, Math.min(clip.frames.length - 1, index));
  const path = clip.frames[currentFrame];
  const frameError = '画面加载失败，请刷新页面重试。';
  const frameLoaded = () => {
    loading.hidden = true;
    if (status.textContent === frameError) status.textContent = '';
  };
  if (frame.getAttribute('src') !== path) {
    const token = ++imageToken;
    frame.onload = () => { if (token === imageToken) frameLoaded(); };
    frame.onerror = () => { if (token === imageToken) { loading.hidden = true; status.textContent = frameError; } };
    frame.src = path;
    if (frame.complete && frame.naturalWidth) frameLoaded();
  } else if (frame.complete && frame.naturalWidth) frameLoaded();
  updateTimeline();
  preloadAround(currentFrame + 1);
}

function pause() {
  if (!playing) return;
  playbackToken += 1;
  if (playbackStarted)
    elapsed = Math.min(clipDuration(), (performance.now() - startedAt) / 1000);
  playing = false;
  playbackStarted = false;
  narration.pause();
  streamAudio.pause();
  cancelAnimationFrame(animationRequest);
  playButton.textContent = '▶ 播放';
  playButton.setAttribute('aria-label', '播放');
  updateTimeline();
}

function tick() {
  if (!playing) return;
  const clip = manifest.clips[currentClip];
  elapsed = (performance.now() - startedAt) / 1000;
  const index = Math.min(clip.frames.length - 1, Math.floor(elapsed * manifest.frameRate));
  if (index !== currentFrame) showFrame(index);
  else updateTimeline();
  // op1..op4 dispatch their `end` event on the last frame. Movie.onEnd
  // exposes the next button even when the separate narration is still playing.
  if (introMode && index === clip.frames.length - 1) {
    nextButton.disabled = false;
    nextButton.hidden = false;
  }
  if (elapsed >= clipDuration() && (narration.paused || narration.ended) &&
      (!manifest.clips[currentClip].streamSound || streamAudio.paused || streamAudio.ended)) {
    pause();
    if (introMode) { nextButton.disabled = false; nextButton.hidden = false; }
    return;
  }
  animationRequest = requestAnimationFrame(tick);
}

async function play(resume=false) {
  resume=resume===true||resumeAfterBlock;resumeAfterBlock=false;
  if(document.hidden){backgroundResume=true;return;}
  if (playing) return pause();
  const token = ++playbackToken;
  const clip = manifest.clips[currentClip];
  if (!resume && elapsed >= clipDuration() - 1 / manifest.frameRate) {
    elapsed = 0;
    showFrame(0);
    if (introMode) { nextButton.disabled = true; nextButton.hidden = true; }
  }
  playing = true;
  playbackStarted = false;
  playButton.textContent = 'Ⅱ 暂停';
  playButton.setAttribute('aria-label', '暂停');
  try {
    await audioReady;
    if (token !== playbackToken) return;
    const audioStarts = [];
    const narrationTime=resume&&backgroundAudioPositions?backgroundAudioPositions.narration:elapsed;
    const streamTime=resume&&backgroundAudioPositions?backgroundAudioPositions.stream:elapsed;
    if (!Number.isFinite(narration.duration) || narrationTime < narration.duration - 0.05) {
      narration.currentTime = narrationTime;
      audioStarts.push(narration.play());
    }
    if (clip.streamSound &&
        (!Number.isFinite(streamAudio.duration) || streamTime < streamAudio.duration - 0.05)) {
      streamAudio.currentTime = streamTime;
      audioStarts.push(streamAudio.play());
    }
    await Promise.all(audioStarts);
    if (token !== playbackToken) return;
    document.body.classList.remove('audio-gesture-needed');
    status.textContent = '';
  } catch (error) {
    if (token !== playbackToken) return;
    if (error?.name === 'NotAllowedError') {
      // Navigation from the cover may lose the gesture needed for audio.
      // Leave the first frame ready so one click starts sound and picture.
      playing = false;
      resumeAfterBlock=resume;
      playbackStarted = false;
      narration.pause();
      streamAudio.pause();
      document.body.classList.add('audio-gesture-needed');
      playButton.textContent = '▶ 播放';
      playButton.setAttribute('aria-label', '播放');
      status.textContent = '点击“播放”以开启剧情配音。';
      return;
    }
    status.textContent = '浏览器未能播放配音，画面会继续播放。';
  }
  if (token !== playbackToken) return;
  backgroundAudioPositions=null;
  // Audio loading and play() can take a long time on mobile. Start the visual
  // clock only after playback has actually been allowed to begin.
  startedAt = performance.now() - elapsed * 1000;
  playbackStarted = true;
  animationRequest = requestAnimationFrame(tick);
}

function selectClip(index) {
  resumeAfterBlock=false;
  backgroundResume=false;
  backgroundAudioPositions=null;
  pause();
  const token = ++clipToken;
  currentClip = index;
  currentFrame = 0;
  elapsed = 0;
  preloaded.clear();
  loading.hidden = false;
  narration.removeAttribute('src');
  narration.load();
  streamAudio.pause();
  streamAudio.removeAttribute('src');
  streamAudio.load();
  const clip = manifest.clips[index];
  audioReady = Promise.all([audioUrl(clip.sound),
    clip.streamSound ? audioUrl(clip.streamSound) : Promise.resolve(null)])
    .then(([mainUrl, streamUrl]) => {
      if (token !== clipToken) return;
      narration.src = mainUrl;
      narration.load();
      if (streamUrl) {
        streamAudio.src = streamUrl;
        streamAudio.load();
      }
    });
  seek.max = String(manifest.clips[index].frames.length - 1);
  for (const [i, button] of [...chapters.children].entries()) button.setAttribute('aria-current', String(i === index));
  previousButton.disabled = index === 0;
  nextButton.disabled = introMode || index === manifest.clips.length - 1;
  if (introMode) {
    nextButton.hidden = true;
    nextButton.textContent = index === manifest.clips.length - 1 ? '进入关卡 →' : '继续 →';
  }
  status.textContent = '';
  showFrame(0);
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    if(playing){
      backgroundAudioPositions={narration:narration.currentTime,stream:streamAudio.currentTime};
      backgroundResume=true;pause();
    }
    if(trailingNarration&&(!trailingNarration.paused||tailPending)){
      backgroundTail=trailingNarration;tailAttempt++;tailPending=false;trailingNarration.pause();
    }
    if(!backgroundAnimations){
      backgroundAnimations=(screen.getAnimations?.({subtree:true})||[])
        .filter(animation=>animation.playState==='running');
      for(const animation of backgroundAnimations)animation.pause();
    }
  }else{
    for(const animation of backgroundAnimations||[])if(animation.playState==='paused')animation.play();
    backgroundAnimations=null;
    const tail=backgroundTail;backgroundTail=null;
    if(tail&&trailingNarration===tail)tryTrailingNarration(tail);
    if(backgroundResume){backgroundResume=false;play(true);}
  }
});

playButton.addEventListener('click', play);
previousButton.addEventListener('click', () => selectClip(currentClip - 1));
async function advanceIntro() {
  if (transitioning) return;
  if (currentClip === manifest.clips.length - 1) {
    location.href = 'game.html?world=1';
    return;
  }
  transitioning = true;
  const nextIndex = currentClip + 1;
  const preview = new Image();
  preview.src = manifest.clips[nextIndex].frames[0];
  try { await preview.decode(); } catch { /* showFrame reports a missing asset. */ }
  const outgoing = frame.cloneNode(false);
  outgoing.removeAttribute('id');
  outgoing.alt = '';
  outgoing.setAttribute('aria-hidden', 'true');
  // Sound.play() in the AIR code does not stop the old SoundChannel when the
  // next page is selected. Let any remaining narration finish during the slide.
  if (!narration.paused && !narration.ended) {
    tailAttempt++;tailPending=false;tailBlocked=null;trailingNarration?.pause();
    const tail = new Audio(narration.currentSrc || narration.src);
    tail.currentTime = narration.currentTime;
    tail.volume = narration.volume;
    trailingNarration = tail;
    tail.onended = () => { if (trailingNarration === tail){trailingNarration = null;tailBlocked=null;} };
    tryTrailingNarration(tail);
  }
  selectClip(nextIndex);
  screen.append(outgoing);
  loading.hidden = true;
  // Movie.onMove subtracts 50 stage pixels per frame until x crosses zero.
  // The incoming page starts at x=1025 on a 1024-wide stage: 21 frames at 30 fps.
  const duration = 21 / manifest.frameRate * 1000;
  const options = {duration, easing:'steps(21, end)', fill:'forwards'};
  const entering = frame.animate([
    {transform:'translateX(100.098%)'}, {transform:'translateX(-2.441%)'}], options);
  const leaving = outgoing.animate([
    {transform:'translateX(0)'}, {transform:'translateX(-102.539%)'}], options);
  if(document.hidden){
    entering.pause();leaving.pause();
    (backgroundAnimations||=[]).push(entering,leaving);
  }
  try { await Promise.all([entering.finished, leaving.finished]); }
  catch { /* Continue if the browser interrupts an animation. */ }
  finally {
    entering.cancel(); leaving.cancel(); outgoing.remove(); transitioning = false;
  }
  play();
}
nextButton.addEventListener('click', () => {
  if (introMode) advanceIntro();
  else selectClip(currentClip + 1);
});
seek.addEventListener('input', () => {
  const index = Number(seek.value);
  elapsed = index / manifest.frameRate;
  if (playing) startedAt = performance.now() - elapsed * 1000;
  if (narration.readyState >= 1) {
    try { narration.currentTime = Math.min(elapsed, narration.duration); } catch { /* Audio metadata may still be loading. */ }
  }
  if (manifest.clips[currentClip].streamSound && streamAudio.readyState >= 1) {
    try { streamAudio.currentTime = Math.min(elapsed, streamAudio.duration); } catch { /* Audio metadata may still be loading. */ }
  }
  showFrame(index);
});
narration.addEventListener('loadedmetadata', updateTimeline);
streamAudio.addEventListener('loadedmetadata', updateTimeline);
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && event.target !== seek && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    play();
  }
});

fetch('story-assets.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => {
  manifest = data;
  if (introMode) {
    chapters.hidden = true;
    previousButton.hidden = true;
    screen.append(nextButton);
    document.querySelector('.timeline').hidden = true;
    document.querySelector('.heading p').textContent = '播放结束后点击继续，依次观看四段剧情。';
  }
  data.clips.forEach((clip, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${index + 1}. ${clip.title}`;
    button.addEventListener('click', () => selectClip(index));
    chapters.append(button);
  });
  const requested = Number(storyParams.get('clip'));
  selectClip(Number.isInteger(requested) && requested >= 0 && requested < data.clips.length ? requested : 0);
  if (introMode || storyParams.get('autoplay') === '1') play();
}).catch(error => {
  loading.replaceChildren(document.createTextNode('剧情资源加载失败'));
  const retry=document.createElement('button');retry.type='button';retry.textContent='重试';
  retry.addEventListener('click',()=>location.reload());loading.append(retry);
  loading.classList.add('load-error');loading.hidden=false;
  status.textContent = String(error);
});
