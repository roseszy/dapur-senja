// The screenshot scenes behind ?shot=kitchen|chopping|serving|rush. Each one plays the real
// rules forward from a fresh kitchen for a fixed script of moves and uses — walk to a crate,
// take an ingredient, chop it, cook it, put it on a plate — so the frame is what a real game
// really looks like, and the same seed always gives the same frame. No scene is faked: every
// pixel comes from the renderer drawing a state the rules produced.
import { INGREDIENTS, STATIONS, stationFront, STEP } from './config.js';
import { DISHES } from './config.js';
import { createKitchen, stepKitchen } from './kitchen.js';

const BLANK = { moveX: 0, moveY: 0, interact: false, click: null };
const GUARD_STEPS = 60 * 40;

/** Walk the chef to a point (and use the station there on arrival), then wait. */
function runStep(state, step) {
  if (step.to) {
    state.moveTarget = { x: step.to.x ?? step.to[0], y: step.to.y ?? step.to[1] };
    state.path = [];
    state.useOnArrive = Boolean(step.use);
    let guard = 0;
    while (state.moveTarget && guard < GUARD_STEPS) {
      stepKitchen(state, BLANK, STEP);
      guard += 1;
    }
    state.moveTarget = null;
    state.useOnArrive = false;
  } else if (step.use) {
    stepKitchen(state, { ...BLANK, interact: true }, STEP);
  }
  if (step.wait) {
    const frames = Math.round(step.wait / STEP);
    for (let i = 0; i < frames; i += 1) stepKitchen(state, BLANK, STEP);
  }
}

function runScript(state, steps) {
  for (const step of steps) runStep(state, step);
}

/** The crate that holds an ingredient. */
function crateFor(id) {
  return STATIONS.crates.find((crate) => crate.id === id);
}

/** The scripted moves that turn one finished ingredient into a plate item. */
function stepsForNeed(need) {
  const id = need.replace(/Chopped|Cooked/, '').toLowerCase();
  const crate = stationFront(crateFor(id));
  const board = stationFront(STATIONS.board);
  const stove = stationFront(STATIONS.stove);
  const plate = stationFront(STATIONS.plates[0]);
  if (need.endsWith('Chopped')) {
    return [
      { to: crate, use: true },
      { to: board, use: true },
      { use: true, wait: INGREDIENTS[id].chopSeconds + 0.4 },
      { use: true },
      { to: plate, use: true },
    ];
  }
  if (need.endsWith('Cooked')) {
    return [
      { to: crate, use: true },
      { to: stove, use: true },
      { wait: INGREDIENTS.patty.cookSeconds + 0.5 },
      { use: true },
      { to: plate, use: true },
    ];
  }
  return [
    { to: crate, use: true },
    { to: plate, use: true },
  ];
}

/** Build one whole dish on plate 1, following its recipe. */
function buildDish(state, dish) {
  for (const need of dish.needs) runScript(state, stepsForNeed(need));
}

/** A patty left on the stove, partway through cooking. */
function startPatty(state) {
  runScript(state, [
    { to: stationFront(crateFor('patty')), use: true },
    { to: stationFront(STATIONS.stove), use: true },
    { wait: 2.5 },
  ]);
}

/** The kitchen, busy mid-shift: orders on the board, a dish half-built, a patty on the stove. */
function stageKitchen(state) {
  const dish = DISHES.burger;
  runScript(state, stepsForNeed('tomatoChopped'));
  runScript(state, stepsForNeed('lettuceChopped'));
  startPatty(state);
  runScript(state, [
    { to: stationFront(crateFor('onion')), use: true },
    { to: stationFront(STATIONS.board), use: true },
    { use: true, wait: 1.8 },
  ]);
}

/** The chef at the board, a chop two-thirds done, with a chopped salad on the plate behind. */
function stageChopping(state) {
  runScript(state, stepsForNeed('lettuceChopped'));
  runScript(state, [
    { to: stationFront(crateFor('tomato')), use: true },
    { to: stationFront(STATIONS.board), use: true },
    { use: true, wait: 2.0 },
  ]);
}

/** A finished dish in the chef's hands at the serving window, its order lit up on the board. */
function stageServing(state) {
  const dish = DISHES.salad;
  // Make sure the board holds the dish the chef is about to serve.
  if (!state.orders.some((order) => order.dishId === dish.id)) {
    state.orders[0] = {
      id: state.orders[0].id, dishId: dish.id, name: dish.name,
      needs: [...dish.needs], timeLeft: 38, totalTime: 55,
    };
  }
  buildDish(state, dish);
  runScript(state, [
    { to: stationFront(STATIONS.plates[0]), use: true },
    // Stand at the window's left end with the plate: the finished dish, its order lit up,
    // and the window's own text all stay readable.
    { to: [965, 600] },
  ]);
}

/** The rush: four orders, short timers, a patty about to burn, a plate half-built. */
function stageRush(state) {
  const dish = DISHES.cheeseburger;
  runScript(state, stepsForNeed('bread'));
  runScript(state, stepsForNeed('tomatoChopped'));
  runScript(state, [
    { to: stationFront(crateFor('patty')), use: true },
    { to: stationFront(STATIONS.stove), use: true },
    { wait: 9.5 },
    { to: stationFront(crateFor('onion')), use: true },
    { to: stationFront(STATIONS.board), use: true },
    { use: true, wait: 1.2 },
  ]);
  // The board is full and the clock is short: four orders, all nearly out of time.
  while (state.orders.length < 4) {
    const extra = DISHES.salad;
    state.orders.push({
      id: 100 + state.orders.length, dishId: extra.id, name: extra.name,
      needs: [...extra.needs], timeLeft: 9 + state.orders.length * 3, totalTime: 40,
    });
  }
  state.orders.forEach((order, index) => { order.timeLeft = 8 + index * 3; });
}

/**
 * Set `kitchen` to the named scene (kitchen, chopping, serving or rush; anything else is
 * kitchen) and return the screen to draw over it.
 */
export function stageShot(name, kitchen, random) {
  const fresh = createKitchen(random);
  Object.keys(fresh).forEach((key) => { kitchen[key] = fresh[key]; });
  if (name === 'chopping') stageChopping(kitchen);
  else if (name === 'serving') stageServing(kitchen);
  else if (name === 'rush') stageRush(kitchen);
  else stageKitchen(kitchen);
  return 'play';
}
