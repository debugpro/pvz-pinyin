'use strict';

// Storage can be unavailable in private browsing or when quota is exceeded.
// Keep the result playable, but make the missing save visible to the player.
window.PvzMinigameStorageNotice = {
  show() {
    let notice=document.getElementById('minigame-storage-warning');
    if(!notice){
      notice=document.createElement('p');
      notice.id='minigame-storage-warning';
      notice.setAttribute('role','status');
      notice.textContent='成绩无法保存，请检查浏览器存储设置。';
      document.querySelector('.stage').append(notice);
    }
    notice.hidden=false;
  },
  clear(){const notice=document.getElementById('minigame-storage-warning');if(notice)notice.hidden=true;},
};

// SWF 3738 frame 22 and SWF 3754 frame 1: button placements and hitTest shapes.
const SUCCESS_BUTTONS = [
  {x:200.5,y:460.8,w:170,h:65}, // cover_btn
  {x:430.35,y:460.8,w:170,h:65}, // replay_btn
  {x:662.35,y:460.8,w:170,h:65}, // gate_btn
];
const FAIL_BUTTONS = [
  {x:284.75,y:537.05,w:170,h:52}, // btn_back
  {x:567.25,y:537.05,w:170,h:52}, // btn_replay
];
const inside = (x,y,r) => x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;

// The three minigames place the same two SWF result sprites on their stages.
window.PvzMinigameResult = {
  async load() {
    const response = await fetch('minigame-result-assets.json');
    if (!response.ok) throw new Error(`结算资源读取失败：HTTP ${response.status}`);
    const manifest = await response.json();
    const image = path => new Promise((resolve, reject) => {
      const value = new Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error(`结算图片加载失败：${path}`));
      value.src = path;
    });
    const [success, fail] = await Promise.all([
      Promise.all(manifest.success.map(image)), image(manifest.fail[0]),
    ]);
    return {success, fail};
  },
  draw(ctx, assets, won, startedAt, failureFade = false, buttons = null) {
    if (!assets) return;
    if (!won) {
      ctx.save();
      if (failureFade) ctx.globalAlpha *= 1 - 0.5 * Math.min(1, Math.max(0, (performance.now() - startedAt) / 1000));
      ctx.drawImage(assets.fail, 0, 0, 1024, 768);
      buttons?.draw(ctx, false);
      ctx.restore();
      return;
    }
    // Match, Joint, and Roll success handlers enter this shared timeline at SWF frame 22.
    const frame = Math.min(assets.success.length - 1,
      21 + Math.floor((performance.now() - startedAt) * 30 / 1000));
    ctx.drawImage(assets.success[frame], 0, 0, 1024, 768);
    buttons?.draw(ctx, true);
  },
  drawAttack(ctx, image, startedAt) {
    if (!image) return;
    // The native JSON specifies three columns and five rows even though the
    // embedded sheet has only four rows. copyPixels leaves the destination
    // unchanged for its three wholly out-of-bounds source rectangles.
    const step = Math.floor(Math.max(0, performance.now() - startedAt) / 60) % 15;
    const frame = Math.min(step, 11);
    ctx.drawImage(image, (frame % 3) * 130, Math.floor(frame / 3) * 200,
      130, 200, 0, 0, 130, 200);
  },
  click(canvas, event, won, {exit, replay, finish}) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 1024 / rect.width;
    const y = (event.clientY - rect.top) * 768 / rect.height;
    if (!won) {
      if (inside(x,y,FAIL_BUTTONS[0])) exit();
      else if (inside(x,y,FAIL_BUTTONS[1])) replay();
      return;
    }
    if (inside(x,y,SUCCESS_BUTTONS[0])) exit();
    else if (inside(x,y,SUCCESS_BUTTONS[1])) replay();
    else if (inside(x,y,SUCCESS_BUTTONS[2])) finish();
  },
};

window.PvzMinigameResultButtons = class {
  constructor(canvas,{isActive,isWon,redraw,activate}){
    this.canvas=canvas;this.isActive=isActive;this.isWon=isWon;this.redraw=redraw;this.activate=activate;this.press=null;this.hover=null;
    this.art={};
    for(const name of ['exit','replay','finish','fail-exit','fail-replay'])this.art[name]=['up','over','down'].map(state=>{
      const image=new Image();image.onload=()=>{if(this.isActive())this.redraw();};
      image.src=`assets/minigame-result/button-${name}-${state}.webp`;return image;
    });
    canvas.addEventListener('pointerdown',event=>{
      if(!this.isActive())return;
      event.preventDefault();event.stopImmediatePropagation();
      if(this.press)return;const name=this.buttonAt(event);if(!name)return;
      this.press={pointerId:event.pointerId,name,won:this.isWon(),inside:true};
      if(event.pointerType!=='mouse')this.hover=null;
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      this.redraw();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.isActive())return;
      const name=this.buttonAt(event);
      if(this.press?.pointerId===event.pointerId)this.press.inside=name===this.press.name;
      if(event.pointerType==='mouse')this.hover=name;
      this.redraw();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>this.end(event));
    canvas.addEventListener('pointerleave',()=>{if(this.hover){this.hover=null;if(this.isActive())this.redraw();}});
    window.addEventListener('blur',()=>{if(this.press||this.hover){this.press=null;this.hover=null;if(this.isActive())this.redraw();}});
  }
  buttonAt(event){
    const r=this.canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
    const names=this.isWon()?['exit','replay','finish']:['fail-exit','fail-replay'];
    const rects=this.isWon()?SUCCESS_BUTTONS:FAIL_BUTTONS;
    const index=rects.findIndex(rect=>inside(x,y,rect));return index<0?null:names[index];
  }
  end(event){
    if(!this.press||this.press.pointerId!==event.pointerId)return;
    const press=this.press;this.press=null;
    if(event.type==='pointerup'&&this.isActive()&&this.isWon()===press.won&&this.buttonAt(event)===press.name){
      this.hover=null;this.activate(press.name.replace('fail-',''));
    }
    this.redraw();
  }
  reset(){this.press=null;this.hover=null;}
  draw(ctx,won){
    const names=won?['exit','replay','finish']:['fail-exit','fail-replay'],rects=won?SUCCESS_BUTTONS:FAIL_BUTTONS;
    names.forEach((name,i)=>{
      const index=this.press?.name===name&&this.press.inside?2:this.hover===name?1:0;
      const image=this.art[name][index],rect=rects[i];if(image.naturalWidth)ctx.drawImage(image,rect.x,rect.y);
    });
  }
};
