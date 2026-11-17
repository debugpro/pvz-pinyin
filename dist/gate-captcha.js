'use strict';

window.GateCaptcha = (() => {
  const overlay=document.querySelector('#gate-captcha');
  const scene=document.querySelector('#gate-captcha-scene');
  const ids=[20619,20624,20629,20634,20639,20644,20649,20654,20659,20664];
  let assetsPromise=null, generation=0, state=null, shakeFrame=0;
  let blockedSiblings=[],previousFocus=null;
  function loadAssets(){
    assetsPromise ||= fetch('captcha-assets.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();
    }).then(async assets=>{
      const paths=[...Object.values(assets.panels).map(item=>item.path),
        ...Object.values(assets.digits).flat(),...Object.values(assets.buttons).flat()];
      await Promise.all(paths.map(path=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error(`无法加载 ${path}`));image.src=path;
      })));
      return assets;
    }).catch(error=>{assetsPromise=null;throw error;});
    return assetsPromise;
  }
  function position(element,x,y,w,h){
    element.style.left=`${x/1024*100}%`;element.style.top=`${y/768*100}%`;
    element.style.width=`${w/1024*100}%`;element.style.height=`${h/768*100}%`;
    scene.append(element);return element;
  }
  function picture(path,x,y,w,h){
    const img=document.createElement('img');img.alt='';img.draggable=false;img.src=path;
    return position(img,x,y,w,h);
  }
  function button(ident,label,x,y,w,h,action){
    const paths=state.assets.buttons[String(ident)],hit=state.assets.buttonHit[String(ident)];
    const wrapper=document.createElement('div');wrapper.style.position='absolute';
    const node=document.createElement('button');node.type='button';node.setAttribute('aria-label',label);
    node.className='captcha-button';
    node.style.clipPath=`polygon(${hit.map(([px,py])=>`${px}% ${py}%`).join(',')})`;
    const art=document.createElement('span');art.className='captcha-art';art.setAttribute('aria-hidden','true');
    ['up','over','down'].forEach((name,index)=>art.style.setProperty(`--captcha-${name}`,`url('${paths[index]}')`));
    registerArtButton(node);node.addEventListener('click',action);
    wrapper.append(node,art);position(wrapper,x,y,w,h);return node;
  }
  function reset(){
    state.sample=Array.from({length:4},()=>Math.floor(Math.random()*10));state.input=[];
  }
  function close(){generation++;cancelAnimationFrame(shakeFrame);shakeFrame=0;state=null;clearArtButtonsWithin(scene);scene.replaceChildren();scene.style.transform='';overlay.hidden=true;for(const [element,wasInert] of blockedSiblings)element.inert=wasInert;blockedSiblings=[];if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;}
  function shake(){
    cancelAnimationFrame(shakeFrame);let start=null,advanced=0,velocity=3;
    function tick(now){
      if(!state)return;
      if(start===null)start=now;
      const target=Math.min(7,Math.floor((now-start)*30/1000)+1);
      while(advanced<target){
        state.shakeX+=velocity;
        if(state.shakeX>2||state.shakeX<=-2)velocity=-velocity;
        if(++advanced===7)state.shakeX=0;
      }
      scene.style.transform=state.shakeX?`translateX(${state.shakeX/1024*100}%)`:'';
      if(advanced===7){shakeFrame=0;return;}
      shakeFrame=requestAnimationFrame(tick);
    }
    shakeFrame=requestAnimationFrame(tick);
  }
  function render(){
    if(!state)return;
    const focused=scene.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
    const {assets}=state;clearArtButtonsWithin(scene);scene.replaceChildren();
    if(state.mode==='alert'){
      picture(assets.panels.alert.path,218,139,588,459);
      button(20676,'继续',452,464,119,77,()=>{if(state){state.mode='input';render();scene.querySelector('[aria-label="数字 0"]')?.focus();}});
      return;
    }
    picture(assets.panels.input.path,218,117,588,491);
    button(20578,'关闭',700.3,109.35,60,56,close);
    state.sample.forEach((digit,i)=>picture(assets.digits.sample[digit],362+i*80,270.2,57,57));
    state.input.forEach((digit,i)=>picture(assets.digits.input[digit],442.5+i*40,350.75,58,37));
    ids.forEach((id,i)=>button(id,`数字 ${i}`,322+(i%5)*80,421+Math.floor(i/5)*70,61,63,()=>{
      if(!state)return;
      state.input.push(i);
      if(state.input.length===4){
        if(state.input.every((value,index)=>value===state.sample[index])){
          const callback=state.callback;close();callback?.();return;
        }
        reset();render();shake();return;
      }
      render();
    }));
    if(focused)scene.querySelectorAll('button').forEach(node=>{if(node.getAttribute('aria-label')===focused)node.focus();});
  }
  async function open(callback){
    close();const owner=++generation;previousFocus=document.activeElement;
    blockedSiblings=[...overlay.parentElement.children].filter(element=>element!==overlay).map(element=>[element,element.inert]);
    for(const [element] of blockedSiblings)element.inert=true;
    overlay.hidden=false;
    try{
      const assets=await loadAssets();if(owner!==generation)return;
      state={assets,callback,mode:'alert',sample:[],input:[],shakeX:0};reset();render();scene.querySelector('button')?.focus();
    }catch(error){if(owner===generation){
      const box=document.createElement('div');box.className='gate-captcha-error';box.setAttribute('role','alert');
      const message=document.createElement('div');message.textContent=`验证素材加载失败：${error.message}`;
      const retry=document.createElement('button');retry.type='button';retry.textContent='重试';retry.addEventListener('click',()=>open(callback));
      const back=document.createElement('button');back.type='button';back.textContent='返回';back.addEventListener('click',close);
      box.append(message,retry,back);scene.replaceChildren(box);retry.focus();
    }}
  }
  return {open,close};
})();
