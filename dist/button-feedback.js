'use strict';

// Flash buttons show their down frame while a pointer is pressed over them.
const pressedArtButtons = new Map();
function updateArtButton(button) {
  button.classList.toggle('is-pressed',
    [...pressedArtButtons.values()].some(press => press.button === button && press.inside));
}
function releaseArtButton(pointerId) {
  const press = pressedArtButtons.get(pointerId);
  if (!press) return;
  pressedArtButtons.delete(pointerId);
  updateArtButton(press.button);
}
function clearArtButtonsWithin(container) {
  for (const [pointerId, press] of pressedArtButtons) {
    if (container.contains(press.button)) releaseArtButton(pointerId);
  }
}
function registerArtButton(button) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    releaseArtButton(event.pointerId);
    pressedArtButtons.set(event.pointerId, {button, inside:true});
    updateArtButton(button);
  });
  button.addEventListener('lostpointercapture', event => releaseArtButton(event.pointerId));
}
for (const button of document.querySelectorAll('.cover-button, .gate-button, .card-cover a, .card-cover button, .gate-mission button, .gate-buy-action, .shop-control, .choice-button, .product-price, .controls #garden-back, .controls #garden-shovel, .controls #garden-prev, .controls #garden-next, #cover-help-movie-back, #cover-help-movie-next')) registerArtButton(button);
document.addEventListener('pointermove', event => {
  const press = pressedArtButtons.get(event.pointerId);
  if (!press) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const inside = !!target && press.button.contains(target);
  if (inside !== press.inside) {
    press.inside = inside;
    updateArtButton(press.button);
  }
}, true);
document.addEventListener('pointerup', event => releaseArtButton(event.pointerId), true);
document.addEventListener('pointercancel', event => releaseArtButton(event.pointerId), true);
window.addEventListener('blur', () => {
  for (const press of pressedArtButtons.values()) press.button.classList.remove('is-pressed');
  pressedArtButtons.clear();
});
