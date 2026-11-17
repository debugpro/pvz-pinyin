'use strict';

// AbstructGame.decorator attaches the same two HSlider instances to each
// minigame's 1024×768 pause panel.
window.PvzPauseSliders = class {
  constructor(canvas,{isActive,onChange,redraw,sliders}) {
    this.canvas=canvas;this.isActive=isActive;this.onChange=onChange;
    this.redraw=redraw;this.drag=null;
    this.sliders=sliders||[{channel:'music',x:427,y:335},{channel:'effects',x:427,y:396}];
    this.images=[3515,3516,3517].map((id,index)=>{
      const img=new Image();img.onload=()=>this.redraw();
      img.src=`assets/game/pause-slider-${['back','front','thumb'][index]}-${id}.png`;
      return img;
    });
    canvas.addEventListener('pointerdown',event=>this.down(event));
    canvas.addEventListener('pointermove',event=>this.move(event));
    canvas.addEventListener('pointerup',event=>this.up(event));
    canvas.addEventListener('pointercancel',event=>this.up(event));
    canvas.addEventListener('lostpointercapture',event=>this.up(event));
    window.addEventListener('blur',()=>{if(this.drag)this.up({pointerId:this.drag.pointerId});});
  }
  point(event) {
    const rect=this.canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*1024/rect.width,
      y:(event.clientY-rect.top)*768/rect.height};
  }
  value(channel) {
    return this.drag?.channel===channel?this.drag.value:PvzVolume.volume(channel);
  }
  down(event) {
    if(this.drag){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!this.isActive()||this.images.some(image=>!image.naturalWidth))return;
    const {x,y}=this.point(event);
    for(const slider of this.sliders){
      const value=this.value(slider.channel),left=slider.x+value*205;
      if(x<left||x>=left+38||y<slider.y-4||y>=slider.y+34)continue;
      this.drag={channel:slider.channel,pointerId:event.pointerId,startX:x,
        origin:Math.trunc(value*205),value};
      event.preventDefault();event.stopImmediatePropagation();
      try{this.canvas.setPointerCapture(event.pointerId);}catch{}
      return;
    }
  }
  move(event) {
    if(!this.drag||event.pointerId!==this.drag.pointerId)return;
    const pixels=Math.max(0,Math.min(205,Math.trunc(
      this.drag.origin+this.point(event).x-this.drag.startX)));
    this.drag.value=pixels/205;event.preventDefault();this.redraw();
  }
  up(event) {
    if(!this.drag||event.pointerId!==this.drag.pointerId)return;
    const {channel,value}=this.drag;this.drag=null;
    PvzVolume.set(channel,value);this.onChange(channel,value);this.redraw();
  }
  draw(ctx) {
    const [back,front,thumb]=this.images;
    if(this.images.some(image=>!image.naturalWidth))return;
    for(const slider of this.sliders){
      const position=this.value(slider.channel)*205,width=position+20;
      const left=width>=31?20:width*20/31,right=width>=31?11:width-left;
      ctx.drawImage(back,slider.x,slider.y);
      ctx.drawImage(front,0,0,20,34,slider.x,slider.y,left,34);
      if(width>left+right)
        ctx.drawImage(front,20,0,210,34,slider.x+left,slider.y,width-left-right,34);
      ctx.drawImage(front,230,0,11,34,slider.x+width-right,slider.y,right,34);
      ctx.drawImage(thumb,slider.x+position,slider.y-4);
    }
  }
};
