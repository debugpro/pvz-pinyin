'use strict';

// MatchData and JointData keep their shuffled arrays for the AIR session.
const nativeShufflePools = new Map();
function shuffleSessionPool(key, entries, swapCount) {
  const signature = JSON.stringify(entries);
  const storageKey = `pvz-shuffle-${key}`;
  let state = nativeShufflePools.get(storageKey);
  if (!state) {
    try { state = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
  }
  const valid = state?.signature === signature && Array.isArray(state.order) &&
    state.order.length === entries.length && new Set(state.order).size === entries.length &&
    state.order.every(index => Number.isInteger(index) && index >= 0 && index < entries.length);
  const order = valid ? state.order.slice() : entries.map((_, index) => index);
  for (let i = 0; i < swapCount; i++) {
    const a = Math.floor(Math.random() * order.length);
    const b = Math.floor(Math.random() * order.length);
    [order[a], order[b]] = [order[b], order[a]];
  }
  state = {signature, order};
  nativeShufflePools.set(storageKey, state);
  try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  return order.map(index => entries[index]);
}
