'use strict';

// A review entry point for the original unpurchased-world scene. Normal world
// access remains unchanged until web purchase state has an equivalent.
window.GateBuyPanel = (() => {
  const panel=document.querySelector('#gate-buy-panel');
  const base=document.querySelector('#gate-buy-base');
  const preview=document.querySelector('#gate-buy-preview');
  const flower=document.querySelector('#gate-buy-flower');
  const error=document.querySelector('#gate-buy-error');
  let generation=0, player=null, flowerFrame=0, activeWorld=null, controller=null;
  let blockedSiblings=[],previousFocus=null;
  let narration=null,narrationBlocked=false,narrationWasPlaying=false,flowerClock=null;
  function stopNarration(){narrationBlocked=false;narrationWasPlaying=false;narration?.pause();narration=null;}
  function playNarration(){
    const sound=narration;if(!sound)return;
    if(document.hidden){narrationWasPlaying=true;return;}
    narrationBlocked=false;
    sound.play().catch(error=>{
      if(narration===sound&&error?.name==='NotAllowedError')narrationBlocked=true;
    });
  }
  document.addEventListener('pointerdown',()=>{if(narrationBlocked)playNarration();},{capture:true,passive:true});
  document.addEventListener('keydown',()=>{if(narrationBlocked)playNarration();},{capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(!narration)return;
    if(document.hidden){narrationWasPlaying=!narration.paused;if(narrationWasPlaying)narration.pause();}
    else if(narrationWasPlaying){narrationWasPlaying=false;playNarration();}
  });
  function close() {
    generation++;
    controller?.abort();controller=null;
    stopNarration();
    player?.stop();player=null;
    cancelAnimationFrame(flowerFrame);flowerFrame=0;
    flowerClock?.dispose();flowerClock=null;
    clearArtButtonsWithin(panel);
    window.GateCaptcha?.close();
    panel.hidden=true;
    for(const [element,wasInert] of blockedSiblings)element.inert=wasInert;
    blockedSiblings=[];
    if(previousFocus?.isConnected)previousFocus.focus();
    previousFocus=null;
  }
  async function open(world, {hasPreviousPurchase=false}={}) {
    if (![2,3,4].includes(world)) throw new Error('无此世界的购买面板');
    close();
    const owner=++generation;
    controller=new AbortController();
    activeWorld=world;
    previousFocus=document.activeElement;
    blockedSiblings=[...panel.parentElement.children].filter(element=>element!==panel)
      .map(element=>[element,element.inert]);
    for(const [element] of blockedSiblings)element.inert=true;
    narration=new Audio(`assets/gate/buy-stage-${world}.mp3`);playNarration();
    panel.hidden=false;error.hidden=true;
    document.querySelector('#gate-buy-back').focus();
    preview.getContext('2d').clearRect(0,0,preview.width,preview.height);
    flower.getContext('2d').clearRect(0,0,flower.width,flower.height);
    base.src=`assets/gate/buy-panel-${hasPreviousPurchase?'previous':'base'}-${world}.webp`;
    document.querySelector('#gate-buy-all').hidden=hasPreviousPurchase;
    const bounds={2:[133.9,242.45,550,400],3:[153.9,254.45,530,371],4:[153.9,259.45,530,366]}[world];
    preview.style.left=`${bounds[0]/1024*100}%`;preview.style.top=`${bounds[1]/768*100}%`;
    preview.style.width=`${bounds[2]/1024*100}%`;preview.style.height=`${bounds[3]/768*100}%`;
    const sheet=new Image();
    sheet.onload=()=>{
      if(owner!==generation)return;
      const context=flower.getContext('2d');let last=-1;flowerClock=GatePreview.visibleClock();
      function frame(now){
        if(owner!==generation)return;
        const elapsed=flowerClock.elapsed(now);
        if(elapsed===null){flowerFrame=requestAnimationFrame(frame);return;}
        const n=Math.floor(elapsed*30/1000)%60;
        if(n!==last){last=n;context.clearRect(0,0,82,67);context.drawImage(sheet,n%10*82,Math.floor(n/10)*67,82,67,0,0,82,67);}
        flowerFrame=requestAnimationFrame(frame);
      }
      flowerFrame=requestAnimationFrame(frame);
    };
    sheet.onerror=()=>{if(owner===generation){error.textContent='面板动画加载失败，请刷新重试。';error.hidden=false;}};
    sheet.src='assets/gate/buy-flower-60.webp';
    try {
      const started=await GatePreview.start(preview,world,e=>{
        if(owner===generation){error.textContent=`展示动画加载失败：${e.message}`;error.hidden=false;}
      },controller.signal);
      if(owner!==generation){started.stop();return;}
      player=started;
    } catch(e) {
      if(owner===generation){error.textContent=`展示动画加载失败：${e.message}`;error.hidden=false;}
    }
  }
  document.querySelector('#gate-buy-back').addEventListener('click',()=>{
    close();
    const url=new URL(location.href);url.searchParams.set('world','1');
    url.searchParams.delete('previewPurchase');url.searchParams.delete('previewPurchased');
    history.replaceState(history.state,'',url);
    if(content?.levels)showWorld(1);
  });
  for(const [id,choice] of [['#gate-buy-current','current'],['#gate-buy-all','all']]){
    document.querySelector(id).addEventListener('click',()=>{
      const world=activeWorld;
      if(choice==='current')stopNarration();
      GateCaptcha.open(()=>{
        handoffGateMusicToShop();
        location.href=`shop.html?world=${world}&purchase=${choice}`;
      });
    });
  }
  const world=Number(new URLSearchParams(location.search).get('previewPurchase'));
  if([2,3,4].includes(world))open(world,{hasPreviousPurchase:new URLSearchParams(location.search).get('previewPurchased')==='1'});
  return {open,close};
})();
