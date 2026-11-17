'use strict';

// The minigame handlers instantiate the same mc_exit as the battle screen.
window.PvzMinigameConfirm = class {
  static pauseAction(x,y){
    if(y<465.6||y>=530.6)return null;
    if(x>=180.35&&x<350.35)return 'exit';
    if(x>=411.8&&x<581.8)return 'replay';
    if(x>=643.25&&x<813.25)return 'continue';
    return null;
  }
  constructor(canvas,{isPaused,redraw,replay,exit}) {
    this.canvas=canvas;this.isPaused=isPaused;this.redraw=redraw;
    this.replay=replay;this.exit=exit;this.active=null;this.press=null;this.hover=null;
    const paths=['assets/game/mc-exit-background-4715.svg',
      'assets/game/mc-exit-yes-4731-1.webp',
      'assets/game/mc-exit-cancel-4727-1.webp',
      'assets/game/mc-exit-text-4736-1.webp',
      'assets/game/mc-exit-text-4736-2.webp',
      'assets/game/mc-exit-yes-4731-2.webp',
      'assets/game/mc-exit-yes-4731-3.webp',
      'assets/game/mc-exit-cancel-4727-2.webp',
      'assets/game/mc-exit-cancel-4727-3.webp'];
    this.images=paths.map(path=>{const image=new Image();
      image.onload=()=>{if(this.active)this.redraw();};image.src=path;return image;});
    canvas.addEventListener('pointerdown',event=>{
      if(!this.active||!this.isPaused())return;
      event.preventDefault();event.stopImmediatePropagation();
      if(this.press)return;
      const button=this.buttonAt(event);
      if(!button)return;
      this.press={pointerId:event.pointerId,button,inside:true,action:this.active};
      if(event.pointerType!=='mouse')this.hover=null;
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      this.redraw();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.active||!this.isPaused())return;
      const button=this.buttonAt(event);
      if(this.press?.pointerId===event.pointerId)this.press.inside=button===this.press.button;
      if(event.pointerType==='mouse')this.hover=button;
      this.redraw();
    });
    canvas.addEventListener('pointerup',event=>this.endPress(event));
    canvas.addEventListener('pointercancel',event=>this.endPress(event));
    canvas.addEventListener('lostpointercapture',event=>this.endPress(event));
    canvas.addEventListener('pointerleave',()=>{if(this.hover){this.hover=null;if(this.active)this.redraw();}});
    window.addEventListener('blur',()=>{if(this.press||this.hover){this.press=null;this.hover=null;if(this.active)this.redraw();}});
  }
  buttonAt(event){
    const rect=this.canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*1024/rect.width,y=(event.clientY-rect.top)*768/rect.height;
    if(y<480||y>=545)return null;
    return x>=361.25&&x<531.25?'yes':x>=565.75&&x<735.75?'cancel':null;
  }
  endPress(event){
    if(!this.press||this.press.pointerId!==event.pointerId)return;
    const press=this.press;this.press=null;
    if(event.type!=='pointerup'||!this.active||!this.isPaused()||this.active!==press.action||this.buttonAt(event)!==press.button){this.redraw();return;}
    this.reset();
    if(press.button==='cancel'){this.redraw();return;}
    if(press.action==='replay')this.replay();else this.exit();
  }
  show(action){this.press=null;this.hover=null;this.active=action;this.redraw();}
  reset(){this.active=null;this.press=null;this.hover=null;}
  draw(ctx){
    if(!this.active)return;
    const [bg,yesUp,cancelUp,exitText,replayText,yesOver,yesDown,cancelOver,cancelDown]=this.images;
    const selected=name=>this.press?.button===name&&this.press.inside?2:this.hover===name?1:0;
    const yes=[yesUp,yesOver,yesDown][selected('yes')];
    const cancel=[cancelUp,cancelOver,cancelDown][selected('cancel')];
    if(bg.naturalWidth)ctx.drawImage(bg,0,0,1024,768);
    if(yes.naturalWidth)ctx.drawImage(yes,361.25,480);
    if(cancel.naturalWidth)ctx.drawImage(cancel,565.75,480);
    const prompt=this.active==='replay'?replayText:exitText;
    if(prompt.naturalWidth)ctx.drawImage(prompt,332.95,323.95);
  }
};

// The four minigames share mc_pause and its four Flash buttons.
window.PvzMinigamePauseButtons = class {
  constructor(canvas,{isActive,redraw,activate}){
    this.canvas=canvas;this.isActive=isActive;this.redraw=redraw;this.activate=activate;
    this.press=null;this.hover=null;
    this.rects={exit:[180.35,465.6,170,65],replay:[411.8,465.6,170,65],
      continue:[643.25,465.6,170,65],help:[854.95,260.45,73,73]};
    this.art={};
    for(const name of Object.keys(this.rects))this.art[name]=['up','over','down'].map(state=>{
      const image=new Image();image.onload=()=>{if(this.isActive())this.redraw();};
      image.src=`assets/minigame-help/pause-${name}-${state}.webp`;return image;
    });
    canvas.addEventListener('pointerdown',event=>{
      if(!this.isActive())return;
      const name=this.buttonAt(event);if(!name)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(this.press)return;
      this.press={pointerId:event.pointerId,button:name,inside:true};
      if(event.pointerType!=='mouse')this.hover=null;
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      this.redraw();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.isActive())return;
      const name=this.buttonAt(event);
      if(this.press?.pointerId===event.pointerId)this.press.inside=name===this.press.button;
      if(event.pointerType==='mouse')this.hover=name;
      this.redraw();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>this.endPress(event));
    canvas.addEventListener('pointerleave',()=>{if(this.hover){this.hover=null;if(this.isActive())this.redraw();}});
    window.addEventListener('blur',()=>{if(this.press||this.hover){this.press=null;this.hover=null;if(this.isActive())this.redraw();}});
  }
  buttonAt(event){
    const r=this.canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
    return Object.keys(this.rects).find(name=>{const [a,b,w,h]=this.rects[name];return x>=a&&x<a+w&&y>=b&&y<b+h;})||null;
  }
  endPress(event){
    if(!this.press||this.press.pointerId!==event.pointerId)return;
    const press=this.press;this.press=null;
    if(event.type==='pointerup'&&this.isActive()&&this.buttonAt(event)===press.button){
      this.hover=null;this.activate(press.button);
    }
    this.redraw();
  }
  reset(){this.press=null;this.hover=null;}
  draw(ctx){
    for(const [name,[x,y]] of Object.entries(this.rects)){
      const index=this.press?.button===name&&this.press.inside?2:this.hover===name?1:0;
      const image=this.art[name][index];if(image.naturalWidth)ctx.drawImage(image,x,y);
    }
  }
};

window.PvzMinigamePauseTrigger = class {
  constructor(canvas,{isActive,redraw,activate,kind='pause',enabled=()=>true,rect=null}){
    this.canvas=canvas;this.isActive=isActive;this.redraw=redraw;this.activate=activate;this.kind=kind;this.enabled=enabled;this.press=null;
    this.rect=rect||(kind==='audio'?[946,10,68,68]:[10,10,68,68]);
    const load=(prefix)=>['up','down'].map(state=>{const image=new Image();image.onload=()=>this.redraw();image.src=`assets/minigame-help/${prefix}-${state}.webp`;return image;});
    this.art=kind==='audio'?{on:load('audio-on'),off:load('audio-off')}:{on:load(kind==='pronunciation'?'pronunciation-trigger':'pause-trigger')};
    canvas.addEventListener('pointerdown',event=>{
      if(!this.isActive()||!this.contains(event))return;
      event.preventDefault();event.stopImmediatePropagation();if(this.press)return;
      this.press={pointerId:event.pointerId,inside:true};
      try{canvas.setPointerCapture(event.pointerId);}catch{}
      this.redraw();
    });
    canvas.addEventListener('pointermove',event=>{
      if(this.press?.pointerId!==event.pointerId)return;
      this.press.inside=this.contains(event);this.redraw();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
      if(this.press?.pointerId!==event.pointerId)return;
      this.press=null;
      if(type==='pointerup'&&this.isActive()&&this.contains(event))this.activate();
      this.redraw();
    });
    window.addEventListener('blur',()=>{if(this.press){this.press=null;this.redraw();}});
  }
  contains(event){
    const r=this.canvas.getBoundingClientRect(),x=(event.clientX-r.left)*1024/r.width,y=(event.clientY-r.top)*768/r.height;
    const [left,top,width,height]=this.rect;
    return x>=left&&x<left+width&&y>=top&&y<top+height;
  }
  reset(){this.press=null;}
  draw(ctx,fallback){const image=this.art[this.kind==='audio'&&!this.enabled()?'off':'on'][this.press?.inside?1:0],[x,y]=this.rect;if(image.naturalWidth)ctx.drawImage(image,x,y);else if(fallback)ctx.drawImage(fallback,x,y);}
};

// Retain the original display object across a press/release click.
window.PvzMinigameGameClick = class {
  constructor(canvas,{isActive,targetAt,token,activate}){
    this.canvas=canvas;this.isActive=isActive;this.targetAt=targetAt;this.token=token;this.activate=activate;this.press=null;
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>this.end(event));
    window.addEventListener('blur',()=>this.reset());
  }
  coordinates(event){const r=this.canvas.getBoundingClientRect();return [(event.clientX-r.left)*1024/r.width,(event.clientY-r.top)*768/r.height];}
  down(event){
    if(this.press||!this.isActive())return;
    const target=this.targetAt(...this.coordinates(event));if(!target)return;
    this.press={pointerId:event.pointerId,target,token:this.token()};
    try{this.canvas.setPointerCapture(event.pointerId);}catch{}
  }
  end(event){
    if(!this.press||this.press.pointerId!==event.pointerId)return;
    const press=this.press;this.press=null;
    if(event.type==='pointerup'&&this.isActive()&&this.token()===press.token&&this.targetAt(...this.coordinates(event))===press.target)this.activate(press.target);
  }
  reset(){this.press=null;}
};
