'use strict';

// Decode the lossless ANMF frames used by the battle help animations without
// ImageDecoder. Frame rectangles are composited in order, preserving disposal.
window.PvzWebPFrameDecoder=class {
  constructor({data,checkpointBase=null}) {
    const bytes=new Uint8Array(data), view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const ascii=(at,n)=>String.fromCharCode(...bytes.subarray(at,at+n));
    const u24=at=>bytes[at]|bytes[at+1]<<8|bytes[at+2]<<16;
    if(bytes.length<12||ascii(0,4)!=='RIFF'||ascii(8,4)!=='WEBP'||view.getUint32(4,true)+8!==bytes.length)
      throw new Error('无效的 WebP 动画');
    let width=0,height=0;this.frames=[];this.closed=false;this.current=-1;this.previous=null;
    this.snapshotPool=[];this.liveSnapshots=new Set();
    this.checkpointBase=checkpointBase;this.sourceBytes=checkpointBase?bytes:null;this.checkpointHash=null;this.failedCheckpoints=new Set();
    for(let pos=12;pos+8<=bytes.length;){
      const tag=ascii(pos,4),size=view.getUint32(pos+4,true),body=pos+8,end=body+size;
      if(end>bytes.length)throw new Error('WebP 数据不完整');
      if(tag==='VP8X'){
        if(size<10)throw new Error('WebP 画布无效');
        width=u24(body+4)+1;height=u24(body+7)+1;
      }else if(tag==='ANMF'){
        if(size<24||ascii(body+16,4)!=='VP8L')throw new Error('不支持的 WebP 帧');
        const x=u24(body)*2,y=u24(body+3)*2,w=u24(body+6)+1,h=u24(body+9)+1;
        const flags=bytes[body+15];
        if(flags&~3||x+w>width||y+h>height)throw new Error('WebP 帧边界无效');
        const payload=bytes.subarray(body+16,end);
        this.frames.push({x,y,w,h,flags,payload});
      }
      pos=end+(size&1);
    }
    if(!width||!height||!this.frames.length)throw new Error('WebP 动画没有帧');
    this.canvas=document.createElement('canvas');this.canvas.width=width;this.canvas.height=height;
    this.context=this.canvas.getContext('2d');this.tracks={ready:Promise.resolve()};
  }
  async decode({frameIndex}) {
    if(this.closed||!Number.isInteger(frameIndex)||frameIndex<0||frameIndex>=this.frames.length)
      throw new Error('WebP 帧不可用');
    if(frameIndex<this.current){this.context.clearRect(0,0,this.canvas.width,this.canvas.height);this.current=-1;this.previous=null;}
    const checkpoint=Math.floor(frameIndex/30)*30;
    if(this.checkpointBase&&checkpoint>this.current+1&&checkpoint>0&&!this.failedCheckpoints.has(checkpoint)){
      if(this.checkpointHash===null){
        this.checkpointHash=await this.hashSource();
      }
      const path=`${this.checkpointBase}-${this.checkpointHash}-checkpoint-${String(checkpoint).padStart(3,'0')}.webp`;
      try{
        const image=await this.loadFrameImage(path);
        if(this.closed)throw new Error('WebP 解码已取消');
        if(image.naturalWidth!==this.canvas.width||image.naturalHeight!==this.canvas.height)
          throw new Error('WebP 检查点尺寸无效');
        this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.context.drawImage(image,0,0);this.current=checkpoint;this.previous=this.frames[checkpoint];
      }catch(error){if(this.closed)throw error;this.failedCheckpoints.add(checkpoint);}
    }
    while(this.current<frameIndex){
      const frame=this.frames[this.current+1];
      const header=new Uint8Array(12);
      header.set([82,73,70,70],0);new DataView(header.buffer).setUint32(4,4+frame.payload.length,true);
      header.set([87,69,66,80],8);
      const url=URL.createObjectURL(new Blob([header,frame.payload],{type:'image/webp'}));
      const image=await this.loadFrameImage(url,true);
      if(this.closed)throw new Error('WebP 解码已取消');
      if(this.previous&&(this.previous.flags&1)){
        const p=this.previous;this.context.clearRect(p.x,p.y,p.w,p.h);
      }
      if(frame.flags&2)this.context.clearRect(frame.x,frame.y,frame.w,frame.h);
      this.context.drawImage(image,frame.x,frame.y);
      this.previous=frame;this.current++;
    }
    const snapshot=this.snapshotPool.pop()||document.createElement('canvas');
    if(snapshot.width!==this.canvas.width||snapshot.height!==this.canvas.height){
      snapshot.width=this.canvas.width;snapshot.height=this.canvas.height;
    }
    const context=snapshot.getContext('2d');context.clearRect(0,0,snapshot.width,snapshot.height);
    context.drawImage(this.canvas,0,0);this.liveSnapshots.add(snapshot);
    snapshot.close=()=>{
      if(!this.liveSnapshots.delete(snapshot))return;
      if(this.closed){snapshot.width=0;snapshot.height=0;}
      else this.snapshotPool.push(snapshot);
    };
    return {image:snapshot};
  }
  async hashSource(){
    const bytes=this.sourceBytes,[table,t1,t2,t3]=PvzWebPFrameDecoder.crcTables;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    let crc=0xffffffff;
    for(let start=0;start<bytes.length;start+=262144){
      if(this.closed)throw new Error('WebP 解码已取消');
      const end=Math.min(start+262144,bytes.length);
      let i=start;
      for(;i+4<=end;i+=4){
        crc^=view.getUint32(i,true);
        crc=t3[crc&255]^t2[(crc>>>8)&255]^t1[(crc>>>16)&255]^table[crc>>>24];
      }
      for(;i<end;i++)crc=(crc>>>8)^table[(crc^bytes[i])&255];
      if(end<bytes.length)await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(this.closed)throw new Error('WebP 解码已取消');
    return ((crc^0xffffffff)>>>0).toString(16).padStart(8,'0');
  }
  loadFrameImage(url,revoke=false){
    return new Promise((resolve,reject)=>{
      const element=new Image();
      const release=()=>{element.onload=null;element.onerror=null;if(revoke)URL.revokeObjectURL(url);this.pending=null;};
      this.pending={cancel:()=>{release();element.removeAttribute('src');reject(new Error('WebP 解码已取消'));}};
      element.onload=()=>{release();resolve(element);};
      element.onerror=()=>{release();reject(new Error('WebP 帧解码失败'));};
      element.src=url;
    });
  }
  close(){
    if(this.closed)return;
    this.closed=true;this.pending?.cancel();this.pending=null;
    this.frames=[];this.previous=null;this.sourceBytes=null;
    for(const snapshot of [...this.snapshotPool,...this.liveSnapshots]){snapshot.width=0;snapshot.height=0;}
    this.snapshotPool=[];this.liveSnapshots.clear();
    this.canvas.width=0;this.canvas.height=0;this.context=null;
  }
};
const pvzCrcTable=Uint32Array.from({length:256},(_,i)=>{
  let crc=i;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  return crc>>>0;
});
PvzWebPFrameDecoder.crcTables=[pvzCrcTable];
for(let n=1;n<4;n++){
  const previous=PvzWebPFrameDecoder.crcTables[n-1];
  PvzWebPFrameDecoder.crcTables.push(Uint32Array.from(previous,crc=>
    (crc>>>8)^pvzCrcTable[crc&255]));
}
