'use strict';

// talk_mc (3696) contains a bubble and the independent 324-frame Dave clip.
window.PvzGuideArt = class {
  static async load() {
    const root='assets/minigame-guide/';
    const names=await fetch(root+'frames.json').then(response=>{
      if(!response.ok)throw new Error('教学动画清单加载失败');
      return response.json();
    });
    const load=path=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error(`教学动画加载失败：${path}`));image.src=path;
    });
    const unique=[...new Set(names)];
    const [bubbles,dave]=await Promise.all([
      Promise.all(Array.from({length:6},(_,i)=>load(root+`bubble-${i+1}.webp`))),
      Promise.all(unique.map(name=>load(root+name))),
    ]);
    const framesByName=new Map(unique.map((name,i)=>[name,dave[i]]));
    return new PvzGuideArt(bubbles,names.map(name=>framesByName.get(name)));
  }
  constructor(bubbles,frames){this.bubbles=bubbles;this.frames=frames;}
  frameAt(startedAt,now=performance.now()){
    return this.frames[Math.floor(Math.max(0,now-startedAt)*30/1000)%this.frames.length];
  }
  draw(ctx,bubble,originX,originY,startedAt){
    // 3696's shape begins at (257.9,0); Dave is at (7,306.6), and
    // the exported Dave clip's top bound is y=-169.6.
    ctx.drawImage(this.bubbles[bubble-1],originX+257.9,originY);
    ctx.drawImage(this.frameAt(startedAt),originX+7,originY+137);
  }
};

// Shape 3547 is shared by the three spotlight tutorials. Its visible hole
// remains interactive while the filled area catches pointer events.
window.PvzGuideHit = {
  opening: new Path2D('M54.45 -54.55 Q31.9 -77.1 0 -77.1 -31.9 -77.1 -54.45 -54.55 -77 -32 -77 -0.1 -77 31.8 -54.45 54.35 -31.9 76.9 0 76.9 31.9 76.9 54.45 54.35 77 31.8 77 -0.1 77 -32 54.45 -54.55 Z'),
  contains(ctx,x,y,cx,cy){return ctx.isPointInPath(this.opening,x-cx,y-cy);},
  image(image,x,y){
    if(!image)return false;
    const px=Math.floor(x),py=Math.floor(y),width=image.naturalWidth,height=image.naturalHeight;
    if(px<0||py<0||px>=width||py>=height)return false;
    if(!this.context){const surface=document.createElement('canvas');surface.width=surface.height=1;
      this.context=surface.getContext('2d',{willReadFrequently:true});}
    this.context.clearRect(0,0,1,1);this.context.drawImage(image,-px,-py);
    return this.context.getImageData(0,0,1,1).data[3]!==0;
  },
  talk(art,bubble,x,y,originX,originY,startedAt){
    return this.image(art.bubbles[bubble-1],x-originX-257.9,y-originY)||
      this.image(art.frameAt(startedAt),x-originX-7,y-originY-137);
  },
};
