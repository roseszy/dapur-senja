// A tiny seeded random source (mulberry32) so the same seed always deals the same orders and
// the same screenshot scenes: the game never reads Math.random for anything that shapes play.
/** Make a random function from a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item from a list with the seeded random. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}
