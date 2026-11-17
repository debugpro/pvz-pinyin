'use strict';

// HelpManager.getHelpMC returns one stopped timeline for each minigame.
window.PvzMinigameHelp = class {
  constructor(canvas,{number,isPaused,redraw}) {
    this.canvas=canvas;this.number=number;this.isPaused=isPaused;
    this.redraw=redraw;this.active=false;this.page=0;this.press=null;this.hover=null;
    this.offsetX=number===3?-31.9:0;
    const count=number===4?4:3;
    this.frames=Array(count).fill(null);this.frameError=false;
    this.buttons={};
    for(const button of ['back','next'])for(const state of ['up','over','down']){
      const image=new Image();image.onload=()=>{if(this.active)this.redraw()};
      image.src=`assets/minigame-help/help-${button}-${state}.webp`;
      this.buttons[`${button}-${state}`]=image;
    }
    canvas.addEventListener('pointerdown',event=>this.onPointerDown(event));
    canvas.addEventListener('pointermove',event=>this.onPointerMove(event));
    canvas.addEventListener('pointerleave',()=>{if(!this.press&&this.hover){this.hover=null;this.redraw();}});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>this.onPointerEnd(event));
    window.addEventListener('blur',()=>{if(this.press||this.hover){this.press=null;this.hover=null;if(this.active)this.redraw();}});
  }
  hasNext(){return this.number===2?this.page>0:this.page+1<this.frames.length;}
  visualAt(event){
    const rect=this.canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*1024/rect.width,y=(event.clientY-rect.top)*768/rect.height;
    if(x>=9.25&&x<77.25&&y>=5.2&&y<73.2)return 'back';
    if(this.hasNext()&&x>=937.7&&x<1010.7&&y>=347.5&&y<420.5)return 'next';
    return null;
  }
  targetAt(event){
    const rect=this.canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*1024/rect.width;
    const y=(event.clientY-rect.top)*768/rect.height;
    if(x<0||x>=1024||y<0||y>=768)return null;
    return x>=9.25&&x<77.25&&y>=5.2&&y<73.2?'back':'page';
  }
  onPointerDown(event) {
    if(!this.isPaused()||!this.active)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(this.press)return;
    const target=this.targetAt(event);if(!target)return;
    if(this.frameError&&target!=='back'){this.loadPage();return;}
    const visual=this.visualAt(event);
    this.press={pointerId:event.pointerId,target,page:this.page,visual,inside:!!visual};
    if(visual)this.redraw();
    try{this.canvas.setPointerCapture(event.pointerId);}catch{}
  }
  onPointerMove(event){
    if(!this.active||!this.isPaused())return;
    if(this.press&&this.press.pointerId===event.pointerId){
      const inside=!!this.press.visual&&this.visualAt(event)===this.press.visual;
      if(inside!==this.press.inside){this.press.inside=inside;this.redraw();}
    }else if(!this.press&&event.pointerType==='mouse'){
      const hover=this.visualAt(event);if(hover!==this.hover){this.hover=hover;this.redraw();}
    }
  }
  onPointerEnd(event){
    if(!this.press||this.press.pointerId!==event.pointerId)return;
    const press=this.press;this.press=null;this.hover=event.pointerType==='mouse'?this.visualAt(event):null;
    if(event.type!=='pointerup'||!this.active||!this.isPaused()||this.page!==press.page||this.targetAt(event)!==press.target){if(this.active)this.redraw();return;}
    if(press.target==='back'||this.page+1>=this.frames.length)this.reset();
    else {this.page++;this.loadPage();}
    this.redraw();
  }
  clearFrames(){
    for(const image of this.frames){
      if(!image)continue;
      image.onload=null;image.onerror=null;image.removeAttribute('src');
    }
    this.frames.fill(null);
  }
  loadPage(){
    this.clearFrames();this.frameError=false;
    const page=this.page,image=new Image();this.frames[page]=image;
    image.onload=()=>{if(this.active&&this.page===page&&this.frames[page]===image)this.redraw();};
    image.onerror=()=>{if(this.active&&this.page===page&&this.frames[page]===image){this.frameError=true;this.redraw();}};
    image.src=`assets/minigame-help/help-${this.number}-${String(page+1).padStart(2,'0')}-bare.webp`;
    this.redraw();
  }
  open(){this.press=null;this.hover=null;this.active=true;this.page=0;this.loadPage();}
  reset(){this.press=null;this.hover=null;this.active=false;this.page=0;this.frameError=false;this.clearFrames();}
  draw(ctx){
    if(!this.active)return;
    const frame=this.frames[this.page];
    if(frame?.naturalWidth)ctx.drawImage(frame,this.offsetX,0);
    else{
      ctx.save();ctx.fillStyle='#14231b';ctx.fillRect(0,0,1024,768);
      ctx.fillStyle='#fff';ctx.font='30px sans-serif';ctx.textAlign='center';
      ctx.fillText(this.frameError?'帮助图片加载失败，点击重试':'正在加载帮助…',512,384);ctx.restore();
    }
    for(const button of ['back','next']){
      if(button==='next'&&!this.hasNext())continue;
      const state=this.press?.visual===button&&this.press.inside?'down':!this.press&&this.hover===button?'over':'up';
      const image=this.buttons[`${button}-${state}`];
      if(image?.naturalWidth)ctx.drawImage(image,button==='back'?9.25:937.7,button==='back'?5.2:347.5);
    }
  }
};
