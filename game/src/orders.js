// The order board: which dishes customers want, how long each order lasts, what it pays,
// and whether a finished plate matches an order. Orders arrive over the shift and get faster
// and shorter as the shift wears on.
import { DISH_LIST, DISHES, SHIFT } from './config.js';
import { pick } from './random.js';

let nextOrderId = 1;

/** How many seconds an order lasts at this point in the shift (shorter late in the shift). */
export function orderTimeFor(elapsedSeconds) {
  const progress = Math.min(1, elapsedSeconds / SHIFT.lengthSeconds);
  return SHIFT.orderTimeStart + (SHIFT.orderTimeEnd - SHIFT.orderTimeStart) * progress;
}

/** How often a new order arrives at this point in the shift. */
export function spawnEveryFor(elapsedSeconds) {
  const progress = Math.min(1, elapsedSeconds / SHIFT.lengthSeconds);
  return SHIFT.spawnEveryStart + (SHIFT.spawnEveryEnd - SHIFT.spawnEveryStart) * progress;
}

/** Deal a fresh order for the board. */
export function createOrder(random, elapsedSeconds) {
  const dish = pick(random, DISH_LIST);
  const totalTime = orderTimeFor(elapsedSeconds);
  return { id: nextOrderId, dishId: dish.id, name: dish.name, needs: [...dish.needs], timeLeft: totalTime, totalTime };
}

/** Reset the order counter (a fresh shift starts at order 1). */
export function resetOrderIds() {
  nextOrderId = 1;
}

/** The same multiset of finished items, in any order, is the same dish. */
export function plateMatchesOrder(plateItems, order) {
  if (plateItems.length !== order.needs.length) return false;
  const wanted = [...order.needs].sort();
  const have = [...plateItems].sort();
  return wanted.every((item, index) => item === have[index]);
}

/** Find the board order a finished plate completes, if any. */
export function findMatchingOrder(plateItems, orders) {
  for (const order of orders) {
    if (plateMatchesOrder(plateItems, order)) return order;
  }
  return null;
}

/** The coins a served dish pays: its price plus a tip for the time left on its order. */
export function servePayout(order, combo) {
  const dish = DISHES[order.dishId];
  const tip = Math.round(order.timeLeft * SHIFT.tipPerSecondLeft);
  const coins = dish.price + tip;
  const score = Math.round(dish.score * combo) + tip;
  return { coins, score, tip };
}
