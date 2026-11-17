/* Derived from Adobe AVMplus ArrayClass.cpp, Mozilla Public License 2.0.
 * Source: https://github.com/adobe/avmplus/blob/master/core/ArrayClass.cpp
 * License: https://www.mozilla.org/en-US/MPL/2.0/
 */
'use strict';

// AVMplus ArraySort::qsort uses a midpoint pivot and processes the smaller
// partition first. Its ordering of equal keys can differ from Array.sort.
// Reference: https://github.com/adobe/avmplus/blob/master/core/ArrayClass.cpp
function nativeArraySort(items, comparator) {
  const result = [...items];
  const compare = (a, b) => comparator(result[a], result[b]);
  const swap = (a, b) => { [result[a], result[b]] = [result[b], result[a]]; };
  const pending = [];
  let lo = 0, hi = result.length - 1;
  if (hi <= lo) return result;
  for (;;) {
    const size = hi - lo + 1;
    if (size === 3) {
      if (compare(lo, lo + 1) > 0) {
        swap(lo, lo + 1);
        if (compare(lo + 1, lo + 2) > 0) {
          swap(lo + 1, lo + 2);
          if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
        }
      } else if (compare(lo + 1, lo + 2) > 0) {
        swap(lo + 1, lo + 2);
        if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
      }
    } else if (size === 2) {
      if (compare(lo, lo + 1) > 0) swap(lo, lo + 1);
    } else if (size >= 4) {
      swap(lo + Math.floor(size / 2), lo);
      let left = lo, right = hi + 1;
      for (;;) {
        do { left++; } while (left <= hi && compare(left, lo) <= 0);
        do { right--; } while (right > lo && compare(right, lo) >= 0);
        if (right < left) break;
        swap(left, right);
      }
      swap(lo, right);
      // The native indices are uint32_t, including the partition-size tests.
      if (((right - 1 - lo) >>> 0) >= ((hi - left) >>> 0)) {
        if (lo + 1 < right) pending.push([lo, right - 1]);
        if (left < hi) { lo = left; continue; }
      } else {
        if (left < hi) pending.push([left, hi]);
        if (lo + 1 < right) { hi = right - 1; continue; }
      }
    }
    if (!pending.length) return result;
    [lo, hi] = pending.pop();
  }
}

function nativeRandomSort(items, random = Math.random) {
  return nativeArraySort(items, () => random() <= .4 ? -1 : 1);
}
