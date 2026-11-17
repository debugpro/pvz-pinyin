// CardSpellTest uses the original XML and FaceSpellTest assets.
const spellTestView=document.querySelector('#spell-test');
const spellTestCards=document.querySelector('#spell-test-cards');
const spellTestTitle=document.querySelector('#spell-test-title');
const spellTestError=document.querySelector('#spell-test-error');
const spellTestPicture=document.querySelector('#spell-test-picture');
const spellTestEnd=document.querySelector('#spell-test-end');
const spellTestConfirm=document.querySelector('#spell-test-confirm');
const spellTestPrev=document.querySelector('#spell-test-prev');
const spellTestNext=document.querySelector('#spell-test-next');
const spellTestSound=document.querySelector('#spell-test-sound');
let spellTestState=null;
let spellTestDataPromise=null;
function clearSpellTimer(state){
  if(!state)return;
  if(state.timer!=null)clearTimeout(state.timer);
  state.timer=null;state.timerSuspended=false;state.timerCallback=null;
}
function scheduleSpellTimer(state,callback,delay){
  state.timerCallback=callback;state.timerRemaining=Math.max(0,delay);
  if(document.hidden){state.timerSuspended=true;return;}
  state.timerSuspended=false;state.timerDue=performance.now()+state.timerRemaining;
  state.timer=setTimeout(()=>{
    state.timer=null;state.timerCallback=null;
    if(spellTestState===state)callback();
  },state.timerRemaining);
}
document.addEventListener('visibilitychange',()=>{
  const state=spellTestState;if(!state)return;
  if(document.hidden){
    if(state.timer!=null){
      state.timerRemaining=Math.max(0,state.timerDue-performance.now());
      clearTimeout(state.timer);state.timer=null;state.timerSuspended=true;
    }
    if(!state.hiddenAnimations){
      state.hiddenAnimations=(spellTestView.getAnimations?.({subtree:true})||[])
        .filter(animation=>animation.playState==='running');
      for(const animation of state.hiddenAnimations)animation.pause();
    }
  }else{
    if(state.timerSuspended)scheduleSpellTimer(state,state.timerCallback,state.timerRemaining);
    for(const animation of state.hiddenAnimations||[])if(animation.playState==='paused')animation.play();
    state.hiddenAnimations=null;
  }
});
function clearSpellTest(){
  clearPressedLearningButtons(spellTestView);
  clearSpellTimer(spellTestState);
  if(spellTestState)stopAudio();
  spellSwipe=null;
  spellTestState=null;spellTestView.hidden=true;
}
function spellTestId(level){
  const number=({1:0,2:5,3:12,4:18})[level.world]+level.stage;
  return `spell${String(number).padStart(2,'0')}`;
}
function shuffleSpell(items){
  // Match AIR's ArraySort as well as CardSpellTest.randSort's comparator.
  return nativeRandomSort(items);
}
function shuffleSpellPositions(positions){
  for(let i=0;i<10;i++){
    const a=Math.floor(Math.random()*6),b=Math.floor(Math.random()*6);
    [positions[a],positions[b]]=[positions[b],positions[a]];
  }
  return positions;
}
async function showSpellTest(level){
  clearSpellTest();stopTipAudio();stopAudio();
  cardCover.hidden=true;learningView.hidden=true;cardTestView.hidden=true;selectView.hidden=true;battleView.hidden=true;practiceWriteView.hidden=true;
  document.body.classList.add('select-mode');spellTestView.hidden=false;spellTestEnd.hidden=true;spellTestConfirm.hidden=true;
  const state={level,questions:[],index:0,phase:'loading',timer:null,cardPositions:[0,1,2,3,4,5],sunflowerStart:performance.now()};spellTestState=state;
  spellTestCards.replaceChildren();spellTestTitle.textContent='';spellTestError.hidden=true;spellTestPicture.hidden=true;spellTestSound.hidden=true;spellTestPrev.hidden=true;spellTestNext.hidden=true;
  const canWrite=level.world!==4&&!(level.world===2&&level.stage===1);
  document.querySelector('#spell-test-write').hidden=!canWrite;

  try{
    spellTestDataPromise ||= Promise.all(['spelltest-content.json','spelltest-assets.json'].map(url=>fetch(url).then(response=>{if(!response.ok)throw Error(url);return response.json();})));
    const [data,assets]=await spellTestDataPromise;if(spellTestState!==state)return;
    state.assets=assets;state.questions=shuffleSpell(data[spellTestId(level)]||[]).slice(0,4);
    if(!state.questions.length)throw Error('拼读题库为空');startSpellQuestion();
  }catch(error){spellTestDataPromise=null;if(spellTestState===state){state.phase='error';spellTestError.hidden=false;console.error(error);}}
}
document.querySelector('#spell-test-retry').addEventListener('click',()=>{
  const state=spellTestState;if(state?.phase==='error')showSpellTest(state.level);
});
function spellChoiceSound(choice){if(choice?.audio)playAudio(`audio/mp3/${choice.audio}/${choice.audio}.mp3`);}
function startSpellQuestion(){
  const state=spellTestState;if(!state)return;
  clearSpellTimer(state);
  stopAudio();
  state.phase='initial';state.finalIndex=0;state.title='';state.serial=(state.serial||0)+1;spellTestEnd.hidden=true;spellTestPicture.hidden=true;
  spellTestSound.hidden=false;spellTestPrev.hidden=true;spellTestNext.hidden=true;renderSpellChoices();
}
function renderSpellChoices(){
  const state=spellTestState,q=state.questions[state.index];if(!q)return;
  spellTestTitle.textContent=state.title;
  // The native swapMc exchanges two random card positions ten times.
  const phase=state.phase,choices=phase==='initial'?q.initial:q.finals[state.finalIndex];
  shuffleSpellPositions(state.cardPositions);
  state.choicePhase=phase;
  state.phase='fading';
  spellTestCards.replaceChildren();
  const positions=[[272,332.05],[518.35,332.05],[764.7,332.05],[272,563.15],[518.35,563.15],[764.7,563.15]];
  choices.slice(0,6).forEach((choice,i)=>{
    const button=document.createElement('button');button.type='button';button.className='spell-test-card';
    const [x,y]=positions[state.cardPositions[i]];
    button.style.left=`${(x-100)/1024*100}%`;button.style.top=`${(y-99.55)/768*100}%`;
    button.style.opacity='0';button.style.transition='opacity 1s cubic-bezier(.333333,.666667,.666667,1)';
    const image=document.createElement('img');image.src='assets/spelltest/card.webp';image.alt='';
    const label=document.createElement('span');label.textContent=choice.text;button.append(image,label);
    button.addEventListener('click',()=>selectSpellChoice(choice,button));spellTestCards.append(button);
  });
  requestAnimationFrame(()=>{if(spellTestState===state&&state.phase==='fading')for(const button of spellTestCards.children)button.style.opacity='1';});
  scheduleSpellTimer(state,()=>{if(state.phase!=='fading')return;
    state.phase=phase;spellChoiceSound(choices.find(item=>item.correct));
  },1000);
}
function selectSpellChoice(choice,button){
  const state=spellTestState;if(!state||!['initial','final'].includes(state.phase)||!spellTestConfirm.hidden)return;
  const correct=choice.correct,initial=state.phase==='initial';
  state.phase='transition';playEffectPath(`assets/cardtest/${correct?'right':'wrong'}.mp3`);
  if(correct){
    const umlaut={ǖ:'ū',ǘ:'ú',ǚ:'ǔ',ǜ:'ù'};
    const value=/^[jqx]/.test(state.title)?choice.text.replace(/[ǖǘǚǜ]/g,char=>umlaut[char]):choice.text;
    state.title+=value;spellTestTitle.textContent=state.title;
  }
  // onClickHandler scales the selected card over .5 s; its callback then
  // fades that card for 1 s before advancing or re-enabling the choices.
  button.style.transition='transform .5s cubic-bezier(.333333,.666667,.666667,1)';button.style.transform='scale(.9)';
  scheduleSpellTimer(state,()=>{
    button.style.transition='opacity 1s cubic-bezier(.333333,.666667,.666667,1)';button.style.opacity='0';
    scheduleSpellTimer(state,()=>{
      if(!correct){button.hidden=true;state.phase=initial?'initial':'final';return;}
      if(initial){state.phase='final';renderSpellChoices();}
      else if(++state.finalIndex<state.questions[state.index].finals.length){state.phase='final';renderSpellChoices();}
      else showSpellPicture();
    },1000);
  },500);
}
function showSpellPicture(){
  const state=spellTestState,q=state?.questions[state.index];if(!q)return;
  state.phase='picture';spellTestCards.replaceChildren();spellTestTitle.textContent='';spellTestSound.hidden=true;
  const asset=state.assets[q.picture];
  if(asset){spellTestPicture.style.width=`${asset.size[0]/1024*100}%`;
    spellTestPicture.style.height=`${asset.size[1]/768*100}%`;
    spellTestPicture.src=asset.frames[0];spellTestPicture.style.left=`${asset.registration[0]/1024*100}%`;
    spellTestPicture.style.top=`${(asset.registration[1]+40)/768*100}%`;spellTestPicture.hidden=false;}
  spellTestPrev.hidden=true;spellTestNext.hidden=true;
  const serial=state.serial;
  function showNavigation(){if(spellTestState!==state||state.serial!==serial||state.phase!=='picture')return;
    spellTestPrev.hidden=state.index===0;spellTestNext.hidden=false;
  }
  if(!q.audio){showNavigation();return;}
  stopAudio();audio=new Audio(`audio/spell/${q.audio}.mp3`);audio.volume=1;
  audio.addEventListener('ended',showNavigation,{once:true});
  audio.addEventListener('error',showNavigation,{once:true});
  tryPronunciation(audio,showNavigation);
}
function nextSpellQuestion(){const state=spellTestState;if(!state||state.phase!=='picture')return;
  if(++state.index>=state.questions.length){stopAudio();state.phase='end';spellTestSound.hidden=true;spellTestPicture.hidden=true;spellTestPrev.hidden=true;spellTestNext.hidden=true;spellTestEnd.hidden=false;playEffectPath('assets/cardtest/end.mp3');animateLearningResultSunflower(document.querySelector('#spell-test-sunflower'),()=>spellTestState===state&&state.phase==='end'&&!spellTestView.hidden,state);return;}
  startSpellQuestion();
}
document.querySelector('#spell-test-next').addEventListener('click',nextSpellQuestion);
document.querySelector('#spell-test-prev').addEventListener('click',()=>{if(spellTestState?.index>0){spellTestState.index--;startSpellQuestion();}});
document.querySelector('#spell-test-sound').addEventListener('click',()=>{const s=spellTestState,q=s?.questions[s.index];if(!q)return;
  if(s.phase==='initial'||s.phase==='final'||s.phase==='fading')spellChoiceSound((s.choicePhase==='initial'?q.initial:q.finals[s.finalIndex]).find(item=>item.correct));
});
document.querySelector('#spell-test-back').addEventListener('click',()=>{spellSwipe=null;clearPressedLearningButtons(spellTestConfirm);spellTestConfirm.hidden=false;});
document.querySelector('#spell-test-cancel').addEventListener('click',()=>{clearPressedLearningButtons(spellTestConfirm);spellTestConfirm.hidden=true;});
document.querySelector('#spell-test-yes').addEventListener('click',()=>{const level=spellTestState?.level;clearSpellTest();if(level)showCardCover(level);});
document.querySelector('#spell-test-again').addEventListener('click',()=>{const level=spellTestState?.level;if(level)showSpellTest(level);});
document.querySelector('#spell-test-write').addEventListener('click',()=>{const level=spellTestState?.level;clearSpellTest();if(level)showPracticeWriting(level);});
document.querySelector('#spell-test-play').addEventListener('click',()=>{const level=spellTestState?.level;clearSpellTest();if(level)startLevel(level);});
let spellSwipe=null;
spellTestView.addEventListener('pointerdown',event=>{if(!spellSwipe&&spellTestConfirm.hidden&&spellTestState?.phase==='picture'&&!event.target.closest('button'))spellSwipe={id:event.pointerId,x:event.clientX,y:event.clientY};});
spellTestView.addEventListener('pointerup',event=>{if(!spellSwipe||event.pointerId!==spellSwipe.id)return;const dx=event.clientX-spellSwipe.x,dy=event.clientY-spellSwipe.y;spellSwipe=null;
  if(!spellTestConfirm.hidden||spellTestState?.phase!=='picture')return;
  if(Math.abs(dx)<spellTestView.clientWidth*40/1024||Math.abs(dx)<Math.abs(dy)*1.3)return;
  if(dx<0)nextSpellQuestion();else if(spellTestState?.index>0){spellTestState.index--;startSpellQuestion();}
});
spellTestView.addEventListener('pointercancel',event=>{if(spellSwipe?.id===event.pointerId)spellSwipe=null;});
window.addEventListener('pointerup',event=>{if(spellSwipe?.id===event.pointerId)spellSwipe=null;});
window.addEventListener('pointercancel',event=>{if(spellSwipe?.id===event.pointerId)spellSwipe=null;});
window.addEventListener('blur',()=>{spellSwipe=null;});
