const app = document.querySelector('#app');
const soundButton = document.querySelector('#sound-button');
const progressBadge = document.querySelector('#overall-progress');
const toastBox = document.querySelector('#toast');

const CHAPTERS = [
  { id: 'basic', name: '拼音启程', subtitle: '单韵母与第一组声母', number: 'WORLD 01', icon: '☀' },
  { id: 'initial', name: '声母花园', subtitle: '跟着植物认识声母', number: 'WORLD 02', icon: '✿' },
  { id: 'advanced', name: '发音小径', subtitle: '声母和复韵母组合', number: 'WORLD 03', icon: '❀' },
  { id: 'final', name: '韵母秘境', subtitle: '鼻韵母与整体认读', number: 'WORLD 04', icon: '✦' },
];

let content = null;
let battle = null;
let audioPlayer = null;
let toastTimer = null;
let soundOn = localStorage.getItem('pvz-sound') !== 'off';
let completed = loadCompleted();

function loadCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem('pvz-completed') || '[]')); }
  catch { return new Set(); }
}
function saveCompleted() {
  localStorage.setItem('pvz-completed', JSON.stringify([...completed]));
  progressBadge.textContent = `已完成 ${content.lessons.filter(l => completed.has(l.id)).length} / ${content.lessons.length} 课`;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function route() { return decodeURIComponent(location.hash.slice(1) || 'home').split('/'); }
function go(path) { location.hash = path; if (location.hash.slice(1) === path) render(); }
function button(label, action, value = '', className = 'primary-btn') {
  return `<button type="button" class="${className}" data-action="${action}" data-value="${escapeHtml(value)}">${label}</button>`;
}
function showToast(message) {
  toastBox.textContent = message; toastBox.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastBox.classList.remove('show'), 1900);
}
function speak(text) {
  if (!soundOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text); utter.lang = 'zh-CN'; utter.rate = .78; speechSynthesis.speak(utter);
}
function playAudio(path, fallback = '') {
  if (!soundOn) { showToast('声音已关闭'); return; }
  if (audioPlayer) { audioPlayer.pause(); audioPlayer = null; }
  if (!path) { speak(fallback); return; }
  audioPlayer = new Audio(path);
  audioPlayer.play().catch(() => speak(fallback));
}
function setSoundButton() {
  soundButton.textContent = soundOn ? '♫' : '♪';
  soundButton.classList.toggle('muted', !soundOn);
  soundButton.setAttribute('aria-label', soundOn ? '关闭声音' : '开启声音');
}
function home() {
  return `<section class="game-panel hero">
    <div class="hero-copy">
      <span class="eyebrow">听 · 读 · 拼 · 玩</span>
      <h1>植物守护<br><em>拼音大冒险</em></h1>
      <p>听一听发音，认一认拼音。答对题目，让植物击退来袭的僵尸！</p>
      <div class="hero-cta"><a class="primary-btn" id="native-start" href="game.html">开始原版冒险 →</a>${button('开始学习', 'chapter', 'basic', 'secondary-btn')}${button('拼读挑战', 'spells', '', 'secondary-btn')}</div>
    </div>
    <div class="hero-art" aria-hidden="true"><span class="speech">a · o · e !</span><img class="sunflower" src="assets/sunflower.png" alt=""><img class="zombie" src="assets/flag-zombie.png" alt=""></div>
  </section>
  <div class="section-title"><h2>选择冒险地图</h2><p>16 组原版拼音学习内容 · 可自由选择</p></div>
  <section class="chapters" aria-label="冒险地图">${CHAPTERS.map(c => {
    const lessons = content.lessons.filter(l => l.kind === c.id);
    const done = lessons.filter(l => completed.has(l.id)).length;
    return `<button class="chapter-card" data-action="chapter" data-value="${c.id}"><span class="chapter-num">${c.number}</span><strong>${c.name}</strong><small>${done} / ${lessons.length} 课已完成</small><span class="chapter-icon" aria-hidden="true">${c.icon}</span></button>`;
  }).join('')}</section>
  <section class="mode-strip"><div><strong>准备好拼出一个完整音节了吗？</strong><span>选声母、找韵母，用原版题库进行拼读练习。</span></div>${button('进入拼读挑战 →', 'spells', '', 'small-btn')}</section>`;
}
function chapterScreen(id) {
  const chapter = CHAPTERS.find(c => c.id === id); if (!chapter) return home();
  const lessons = content.lessons.filter(l => l.kind === id);
  return `<section class="game-panel section-screen"><div class="view-header">${button('← 返回地图', 'home', '', 'back-btn')}<span class="crumb">${chapter.number}</span></div>
    <h1>${chapter.name}</h1><p class="intro">${chapter.subtitle}。点开课程，先听发音，再去草坪上守护植物。</p>
    <div class="lesson-grid">${lessons.map((l, i) => `<button class="lesson-card ${completed.has(l.id) ? 'done' : ''}" data-action="lesson" data-value="${escapeHtml(l.id)}"><span class="lesson-index">第 ${i+1} 课 · ${l.items.length} 个拼音</span><strong>${escapeHtml(l.label)}</strong><small>${l.items.map(x => escapeHtml(x.symbol)).join('　')}</small>${completed.has(l.id) ? '<span class="status">✓ 已完成</span>' : ''}</button>`).join('')}</div>
  </section>`;
}
function lessonScreen(id) {
  const l = content.lessons.find(x => x.id === id); if (!l) return home();
  const chapter = CHAPTERS.find(c => c.id === l.kind);
  return `<section class="game-panel lesson-screen"><div class="lesson-content"><div class="view-header">${button('← 返回课程', 'chapter', l.kind, 'back-btn')}<span class="crumb">${chapter.name}</span></div>
    <span class="eyebrow">拼音学习卡</span><h1>${escapeHtml(l.label)}</h1><p class="lesson-subtitle">点卡片听发音。记住它们，就能在草坪上击退僵尸。</p>
    <div class="sound-list">${l.items.map((item,i) => `<button class="sound-card" data-action="sound" data-value="${i}"><span class="sound-symbol">${escapeHtml(item.symbol)}</span><span class="sound-examples">${item.examples.length ? item.examples.map(e => escapeHtml(e.text)).slice(0,2).join(' · ') : '点击听发音'}</span><span class="sound-play" aria-hidden="true">♫</span></button>`).join('')}</div>
    <p class="tip">小提示：答题时可以反复点击喇叭，听清楚再选择。</p>${button('去草坪守护植物 →', 'battle', l.id)}</div>
    <aside class="lesson-aside"><img src="assets/sunflower.png" alt="向日葵角色"></aside></section>`;
}
function spellsScreen() {
  return `<section class="game-panel section-screen"><div class="view-header">${button('← 返回地图', 'home', '', 'back-btn')}<span class="crumb">拼读挑战</span></div>
    <h1>把声母和韵母拼起来</h1><p class="intro">听一听音节，先选声母，再选韵母。每关随机抽取 5 题。</p>
    <div class="lesson-grid">${content.spells.map((s,i) => `<button class="lesson-card ${completed.has('spell:'+s.id) ? 'done' : ''}" data-action="spell" data-value="${escapeHtml(s.id)}"><span class="lesson-index">第 ${i+1} 关 · ${s.items.length} 题</span><strong>${escapeHtml(s.label)}</strong><small>${s.items.slice(0,4).map(q => escapeHtml(q.word)).join(' · ')}</small>${completed.has('spell:'+s.id) ? '<span class="status">✓ 已完成</span>' : ''}</button>`).join('')}</div></section>`;
}
function buildChoices(question, isSpell) {
  if (isSpell) {
    const key = battle.phase === 'initial' ? 'initial' : 'final';
    const values = battle.phase === 'initial' ? question.initialChoices : question.finalChoices;
    const correct = question[key];
    const pool = shuffle([...new Set(values.filter(x => x !== correct))]).slice(0,3);
    return shuffle([correct,...pool]);
  }
  const local = [...new Set(battle.source.items.map(x => x.symbol).filter(x => x !== question.symbol))];
  const pool = [...new Set(content.lessons.flatMap(l => l.items.map(q => q.symbol)))].filter(x => x !== question.symbol && !local.includes(x));
  return shuffle([question.symbol, ...shuffle(local).slice(0,3), ...shuffle(pool).slice(0,Math.max(0,3-local.length))]);
}
function startBattle(type, id) {
  const source = type === 'spell' ? content.spells.find(x => x.id === id) : content.lessons.find(x => x.id === id);
  if (!source) return go('home');
  const questions = type === 'spell' ? shuffle(source.items).slice(0,5) : shuffle(source.items);
  battle = {type, source, questions, index:0, hearts:3, phase:'initial', selectedInitial:'', locked:false, status:'', choices:[], version:Date.now()};
  battle.choices = buildChoices(questions[0], type === 'spell');
}
function battleScreen() {
  if (!battle) return home();
  const q = battle.questions[battle.index];
  const isSpell = battle.type === 'spell';
  const word = isSpell ? q.word : '听发音，选拼音';
  const right = `${Math.min((3-battle.hearts)*15+7,36)}%`;
  return `<section class="game-panel battle-screen"><div class="battle-top"><div><h1>${escapeHtml(battle.source.label)}</h1><p>${isSpell ? '拼读挑战' : '拼音守卫战'} · 第 ${battle.index+1} / ${battle.questions.length} 题</p></div><div class="battle-tools">${button('← 退出', isSpell ? 'spells' : 'lesson', isSpell ? '' : battle.source.id, 'back-btn')}<div class="hearts" aria-label="剩余 ${battle.hearts} 次机会">${[0,1,2].map(i => `<span class="${i >= battle.hearts ? 'lost' : ''}">♥</span>`).join('')}</div></div></div>
    <div class="battle-lawn" style="--zombie-right:${right}"><span class="lane">${battle.hearts === 1 ? '注意！僵尸快到啦' : '守住拼音草坪'}</span><img class="sunflower" src="assets/sunflower.png" alt="向日葵"><img class="zombie" id="battle-zombie" src="assets/flag-zombie.png" alt="僵尸"><div id="pea-layer"></div></div>
    <div class="battle-question"><div class="question-copy"><span class="label">${isSpell ? '拼出这个音节' : '听一听，找一找'}</span><h2 class="${isSpell ? 'spell-word' : ''}">${escapeHtml(word)}</h2><p>${isSpell ? (battle.phase === 'initial' ? '第一步：选声母' : '第二步：选韵母') : '点击喇叭可重复播放'}</p></div><button class="play-audio" data-action="hear" type="button">♫ 再听一次</button></div>
    ${isSpell ? `<div class="spell-fields"><span class="spell-slot">${escapeHtml(battle.selectedInitial || '?')}</span><span class="spell-plus">+</span><span class="spell-slot">${battle.phase === 'final' ? '?' : '？'}</span></div><div class="spell-options-label">${battle.phase === 'initial' ? '选择声母' : '选择韵母'}</div>` : ''}
    <div class="choices">${battle.choices.map((choice,i) => `<button type="button" class="choice" data-action="answer" data-value="${escapeHtml(choice)}" ${battle.locked ? 'disabled' : ''} aria-label="选项 ${i+1}：${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div>
    <p class="battle-status" id="battle-status">${escapeHtml(battle.status)}</p><div class="round-dots">${battle.questions.map((_,i)=>`<span class="${i < battle.index ? 'done' : i === battle.index ? 'active' : ''}"></span>`).join('')}</div></section>`;
}
function finish(win) {
  if (!battle) return;
  const id = battle.source.id;
  if (win) { completed.add(battle.type === 'spell' ? 'spell:'+id : id); saveCompleted(); }
  const path = battle.type === 'spell' ? `ending/spell/${id}/${win ? 'win' : 'lose'}` : `ending/lesson/${id}/${win ? 'win' : 'lose'}`;
  go(path);
}
function endingScreen(kind, id, outcome) {
  const win = outcome === 'win';
  const source = kind === 'spell' ? content.spells.find(x => x.id === id) : content.lessons.find(x => x.id === id);
  return `<section class="game-panel ending"><img src="assets/${win ? 'sunflower' : 'flag-zombie'}.png" alt=""><h1>${win ? '草坪守住啦！' : '再来一次吧！'}</h1><p>${win ? `完成了「${escapeHtml(source?.label || '')}」，植物们都在为你欢呼。` : '多听几遍发音，重新挑战就能击退僵尸。'}</p><div class="hero-cta">${button('再玩一次', kind === 'spell' ? 'spell' : 'battle', id)}${button(kind === 'spell' ? '返回拼读关卡' : '返回课程', kind === 'spell' ? 'spells' : 'chapter', kind === 'spell' ? '' : source?.kind, 'secondary-btn')}</div></section>`;
}
function render() {
  if (!content) return;
  saveCompleted(); setSoundButton();
  const [page, a, b, c] = route();
  if (page === 'home') app.innerHTML = home();
  else if (page === 'chapter') app.innerHTML = chapterScreen(a);
  else if (page === 'lesson') app.innerHTML = lessonScreen(a);
  else if (page === 'spells') app.innerHTML = spellsScreen();
  else if (page === 'battle' || page === 'spell') {
    const type = page === 'spell' ? 'spell' : 'lesson';
    if (!battle || battle.type !== type || battle.source.id !== a) startBattle(type,a);
    app.innerHTML = battleScreen();
  } else if (page === 'ending') app.innerHTML = endingScreen(a,b,c);
  else app.innerHTML = home();
}
function nextQuestion() {
  if (!battle) return;
  battle.index++;
  if (battle.index >= battle.questions.length) { finish(true); return; }
  battle.phase = 'initial'; battle.selectedInitial = ''; battle.locked = false; battle.status = '';
  battle.choices = buildChoices(battle.questions[battle.index], battle.type === 'spell');
  render();
}
function answer(value, element) {
  if (!battle || battle.locked) return;
  const q = battle.questions[battle.index];
  const correct = battle.type === 'spell' ? q[battle.phase] : q.symbol;
  if (value === correct) {
    element.classList.add('correct');
    if (battle.type === 'spell' && battle.phase === 'initial') {
      battle.locked = true; battle.selectedInitial = value; battle.status = '声母正确！接着选择韵母。';
      document.querySelector('#battle-status').textContent = battle.status;
      setTimeout(() => { if (!battle) return; battle.phase = 'final'; battle.locked = false; battle.choices = buildChoices(q,true); render(); }, 520);
      return;
    }
    battle.locked = true; battle.status = '答对了！植物发射一颗豌豆！';
    document.querySelector('#battle-status').textContent = battle.status;
    const pea = document.createElement('span'); pea.className = 'pea'; document.querySelector('#pea-layer').append(pea);
    document.querySelector('#battle-zombie').classList.add('hit');
    playAudio(q.audio, battle.type === 'spell' ? q.word : q.symbol);
    setTimeout(nextQuestion, 750);
  } else {
    element.classList.add('incorrect'); battle.hearts--; battle.status = `再听一次，正确答案是 ${correct}。`;
    document.querySelector('#battle-status').textContent = battle.status;
    document.querySelector('#battle-zombie').classList.add('wrong');
    if (battle.hearts <= 0) { battle.locked = true; setTimeout(() => finish(false), 900); }
    else { battle.locked = true; setTimeout(() => { if (!battle) return; battle.locked = false; render(); }, 800); }
  }
}
app.addEventListener('click', event => {
  if (event.target.closest('#native-start')) {
    if (localStorage.getItem('pvz-intro-seen') !== '1') {
      event.preventDefault();
      localStorage.setItem('pvz-intro-seen', '1');
      location.href = 'story.html?mode=intro&autoplay=1';
    }
    return;
  }
  const target = event.target.closest('[data-action]'); if (!target || !content) return;
  const action = target.dataset.action, value = target.dataset.value || '';
  if (action === 'home') go('home');
  else if (action === 'chapter') go(`chapter/${value}`);
  else if (action === 'lesson') go(`lesson/${value}`);
  else if (action === 'spells') go('spells');
  else if (action === 'battle' || action === 'spell') { battle = null; go(`${action}/${value}`); }
  else if (action === 'sound') { const l = content.lessons.find(x => x.id === route()[1]); const q = l?.items[Number(value)]; if (q) playAudio(q.audio,q.symbol); }
  else if (action === 'hear') { const q = battle?.questions[battle.index]; if (q) playAudio(q.audio,battle.type === 'spell' ? q.word : q.symbol); }
  else if (action === 'answer') answer(value,target);
});
soundButton.addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('pvz-sound',soundOn ? 'on' : 'off'); if (!soundOn && audioPlayer) audioPlayer.pause(); setSoundButton(); showToast(soundOn ? '声音已开启' : '声音已关闭'); });
document.querySelector('#brand-link').addEventListener('click', () => { battle = null; });
window.addEventListener('hashchange', () => { const [page] = route(); if (page !== 'battle' && page !== 'spell') battle = null; render(); });
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && battle && ['battle','spell'].includes(route()[0])) { event.preventDefault(); document.querySelector('[data-action="hear"]')?.click(); }
  if (/^[1-4]$/.test(event.key) && battle && ['battle','spell'].includes(route()[0])) { document.querySelectorAll('.choice')[Number(event.key)-1]?.click(); }
});
fetch('content.json').then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then(data => { content = data; render(); }).catch(error => { app.innerHTML = `<section class="game-panel section-screen"><h1>题库加载失败</h1><p>请通过本地服务器打开此目录，再刷新页面。</p><pre>${escapeHtml(error.message)}</pre></section>`; });
