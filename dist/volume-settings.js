'use strict';

// Shared equivalents of the AIR DBClient background/effect volume values.
window.PvzVolume = (() => {
  const memory=new Map();let storageReadable=true;
  function read(key){
    if(memory.has(key))return memory.get(key);
    try{const value=localStorage.getItem(key);storageReadable=true;return value;}
    catch{storageReadable=false;return null;}
  }
  function write(key,value){
    try{localStorage.setItem(key,value);if(storageReadable)memory.delete(key);else memory.set(key,value);}
    catch{memory.set(key,value);}
  }
  function number(key, fallback) {
    const raw=read(key);
    const value=raw===null?fallback:Number(raw);
    return Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
  }
  function enabled(channel) {
    return read(channel==='music'?'pvz-sound':'pvz-game-voice')!=='off';
  }
  function volume(channel) {
    if(!enabled(channel))return 0;
    const key=channel==='music'?'pvz-music-volume':'pvz-effects-volume';
    const last=channel==='music'?'pvz-music-last-volume':'pvz-effects-last-volume';
    return number(key,.3)||number(last,.3)||.3;
  }
  function toggleMusic() {
    const next=!enabled('music');
    write('pvz-sound',next?'on':'off');
    return next;
  }
  function set(channel,value) {
    value=Math.max(0,Math.min(1,value));
    const key=channel==='music'?'pvz-music-volume':'pvz-effects-volume';
    const last=channel==='music'?'pvz-music-last-volume':'pvz-effects-last-volume';
    const flag=channel==='music'?'pvz-sound':'pvz-game-voice';
    const previous=volume(channel);
    if(value>0)write(last,String(value));
    else if(previous>0)write(last,String(previous));
    write(key,String(value));
    write(flag,value>0?'on':'off');
  }
  return {enabled,volume,toggleMusic,set};
})();
