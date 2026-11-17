'use strict';

// Fit each 1024×768 scene inside the viewport without changing its coordinates.
const stage = document.querySelector('.stage, .canvas-wrap, .screen');
const topbar = document.querySelector('.topbar');
const main = document.querySelector('main');
// story.js adds the body class after this deferred script runs. Check the URL
// up front so a first animation frame cannot leave a stale inline width.
const storyIntro = stage?.matches('.screen') &&
  new URLSearchParams(location.search).get('mode') === 'intro';

function outerHeight(element) {
  if (getComputedStyle(element).display === 'none') return 0;
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().height +
    parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

function fitStage() {
  if (!stage || !main || storyIntro || document.body.classList.contains('story-intro')) return;
  if (stage.matches('.screen') &&
      matchMedia('(max-height: 520px) and (orientation: landscape)').matches) {
    stage.style.removeProperty('width');
    stage.style.removeProperty('margin-inline');
    return;
  }
  const mainStyle = getComputedStyle(main);
  const reserved = (topbar ? outerHeight(topbar) : 0) +
    Array.from(main.children).filter(element => element !== stage)
      .reduce((height, element) => height + outerHeight(element), 0) +
    parseFloat(mainStyle.paddingTop) + parseFloat(mainStyle.paddingBottom);
  const availableHeight = Math.max(120, window.innerHeight - reserved - 12);
  const availableWidth = main.clientWidth -
    parseFloat(mainStyle.paddingLeft) - parseFloat(mainStyle.paddingRight);
  const stageStyle = getComputedStyle(stage);
  const horizontalBorder = parseFloat(stageStyle.borderLeftWidth) + parseFloat(stageStyle.borderRightWidth);
  const verticalBorder = parseFloat(stageStyle.borderTopWidth) + parseFloat(stageStyle.borderBottomWidth);
  // The story viewer can scroll on a narrow portrait screen. Keep the
  // animation readable instead of shrinking it to fit every control at once.
  const portraitStory = stage.matches('.screen') &&
    window.innerWidth <= 700 && window.innerHeight > window.innerWidth;
  const stageWidth = Math.min(1024 + horizontalBorder, availableWidth,
    portraitStory ? Infinity :
      (availableHeight - verticalBorder) * 4 / 3 + horizontalBorder);
  stage.style.width = `${Math.max(0, stageWidth)}px`;
  stage.style.marginInline = 'auto';
}

let pending = false;
function scheduleFit() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; fitStage(); });
}

window.addEventListener('resize', scheduleFit);
const observer = new ResizeObserver(scheduleFit);
if (topbar) observer.observe(topbar);
if (main) {
  observer.observe(main);
  Array.from(main.children).filter(element => element !== stage)
    .forEach(element => observer.observe(element));
}
document.fonts.ready.then(scheduleFit);
scheduleFit();
