// The kitchen itself: the chef, the stations, what the chef carries, and every rule of play.
// One fixed step moves the chef, works the board and stove, spawns and ages orders, and scores
// serves. It returns the sound events the step caused, so the loop can play them.
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, CHEF, DISHES, FLOOR, INGREDIENTS, SHIFT, STATIONS, stationFront,
} from './config.js';
import {
  createOrder, findMatchingOrder, orderTimeFor, resetOrderIds, servePayout, spawnEveryFor,
} from './orders.js';

/** The distance at which the chef can use a station. */
const REACH = 96;

/** The station whose rectangle a point falls inside, if any (for clicks on a station). */
function stationAtPoint(x, y) {
  const all = [
    ...STATIONS.crates.map((c) => ({ kind: 'crate', station: c })),
    { kind: 'board', station: STATIONS.board },
    { kind: 'stove', station: STATIONS.stove },
    ...STATIONS.plates.map((p) => ({ kind: 'plate', station: p })),
    { kind: 'window', station: STATIONS.window },
    { kind: 'trash', station: STATIONS.trash },
  ];
  return all.find(({ station }) => x >= station.x && x <= station.x + station.w && y >= station.y && y <= station.y + station.h) ?? null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** A fresh, empty kitchen for a new shift. */
export function createKitchen(random) {
  resetOrderIds();
  const state = {
    random,
    chef: { x: 640, y: 380, carried: null, face: 1, walking: false },
    board: { item: null, progress: 0, chopping: false },
    burners: [{ item: null, progress: 0 }, { item: null, progress: 0 }],
    plates: [{ items: [] }, { items: [] }],
    orders: [],
    spawnTimer: 6,
    elapsed: 0,
    timeLeft: SHIFT.lengthSeconds,
    score: 0,
    coins: 0,
    lives: SHIFT.lives,
    combo: 1,
    comboTimer: 0,
    served: 0,
    expired: 0,
    message: '',
    messageTimer: 0,
    moveTarget: null,
    path: [],
    useOnArrive: false,
    over: false,
    overReason: '',
    chopTick: 0,
  };
  for (let i = 0; i < SHIFT.startOrders; i += 1) state.orders.push(createOrder(random, 0));
  return state;
}

/** Start a fresh shift in the same kitchen object. */
export function resetKitchen(state, random) {
  const fresh = createKitchen(random);
  Object.keys(fresh).forEach((key) => { state[key] = fresh[key]; });
}

function say(state, text, seconds = 2.2) {
  state.message = text;
  state.messageTimer = seconds;
}

/** The station the chef is standing at: the one whose front point is nearest, within reach.
 * Front points are used (not the rectangles) because the board sits above the trash and the
 * stove above the window — from the board's front the trash's rectangle is nearer, but the
 * board's front is where the chef stands. */
function nearestStation(state) {
  const { x, y } = state.chef;
  let best = null;
  let bestDistance = Infinity;
  const candidates = [
    ...STATIONS.crates.map((c) => ({ kind: 'crate', station: c })),
    { kind: 'board', station: STATIONS.board },
    { kind: 'stove', station: STATIONS.stove },
    ...STATIONS.plates.map((p) => ({ kind: 'plate', station: p })),
    { kind: 'window', station: STATIONS.window },
    { kind: 'trash', station: STATIONS.trash },
  ];
  for (const candidate of candidates) {
    const front = stationFront(candidate.station);
    const d = distance(x, y, front.x, front.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = { ...candidate, d };
    }
  }
  return bestDistance <= REACH ? best : null;
}

/** The finished item a raw ingredient becomes: chopped, cooked, or itself. */
export function finishName(item) {
  if (item.state === 'chopped') return `${item.id}Chopped`;
  if (item.state === 'cooked') return `${item.id}Cooked`;
  return item.id;
}

/** What the chef is carrying, as a short label for the HUD. */
export function carriedLabel(carried) {
  if (!carried) return '';
  if (carried.kind === 'plate') return `Piring (${carried.items.length} bahan)`;
  const def = INGREDIENTS[carried.id];
  if (carried.state === 'chopped') return def.choppedName;
  if (carried.state === 'cooked') return def.choppedName;
  return def.name;
}

function tryUse(state, events) {
  const near = nearestStation(state);
  if (!near) return;
  const chef = state.chef;
  const carried = chef.carried;

  if (near.kind === 'crate') {
    if (carried) { say(state, 'Tangan sudah penuh!'); events.push('wrong'); return; }
    chef.carried = { kind: 'ingredient', id: near.station.id, state: 'raw' };
    events.push('pickup');
    return;
  }

  if (near.kind === 'board') {
    const board = state.board;
    if (board.chopping) return;
    if (!board.item && carried && carried.kind === 'ingredient') {
      const def = INGREDIENTS[carried.id];
      if (!def.chop) { say(state, `${def.name} tidak perlu dicincang`); events.push('wrong'); return; }
      board.item = carried;
      board.progress = 0;
      chef.carried = null;
      events.push('place');
      return;
    }
    if (board.item && !board.item.done && !carried) {
      board.chopping = true;
      events.push('chopTick');
      return;
    }
    if (board.item && board.item.done && !carried) {
      chef.carried = board.item;
      state.board = { item: null, progress: 0, chopping: false };
      events.push('pickup');
      return;
    }
    return;
  }

  if (near.kind === 'stove') {
    if (carried && carried.kind === 'ingredient' && carried.id === 'patty' && carried.state === 'raw') {
      const free = state.burners.find((b) => !b.item);
      if (!free) { say(state, 'Kompor penuh!'); events.push('wrong'); return; }
      free.item = carried;
      free.progress = 0;
      chef.carried = null;
      events.push('cookStart');
      return;
    }
    if (!carried) {
      const ready = state.burners.find((b) => b.item && b.progress >= 1 && !b.item.burnt);
      if (ready) {
        chef.carried = { kind: 'ingredient', id: 'patty', state: 'cooked' };
        ready.item = null;
        ready.progress = 0;
        events.push('pickup');
        return;
      }
      const cooking = state.burners.find((b) => b.item);
      if (cooking) {
        if (cooking.item.burnt) say(state, 'Gosong! Buang ke tempat sampah');
        else say(state, 'Belum matang…');
        events.push('wrong');
      }
      return;
    }
    return;
  }

  if (near.kind === 'plate') {
    const slot = state.plates[Number(near.station.id.slice(-1))];
    if (carried && carried.kind === 'ingredient') {
      if (slot.items.length >= 4) { say(state, 'Piring sudah penuh!'); events.push('wrong'); return; }
      const finished = finishName(carried);
      if (slot.items.includes(finished)) { say(state, 'Bahan itu sudah ada di piring'); events.push('wrong'); return; }
      slot.items.push(finished);
      chef.carried = null;
      events.push('place');
      return;
    }
    if (carried && carried.kind === 'plate') {
      if (slot.items.length > 0) { say(state, 'Piring di sini sudah terisi'); events.push('wrong'); return; }
      slot.items = carried.items;
      chef.carried = null;
      events.push('place');
      return;
    }
    if (!carried && slot.items.length > 0) {
      chef.carried = { kind: 'plate', items: slot.items };
      slot.items = [];
      events.push('pickup');
      return;
    }
    return;
  }

  if (near.kind === 'window') {
    if (!carried || carried.kind !== 'plate') { say(state, 'Bawa piring jadi ke sini'); events.push('wrong'); return; }
    const order = findMatchingOrder(carried.items, state.orders);
    if (!order) {
      say(state, 'Tidak ada pesanan yang cocok — cek papan pesanan!');
      events.push('wrong');
      return;
    }
    const payout = servePayout(order, state.combo);
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.coins += payout.coins;
    state.score += payout.score;
    state.served += 1;
    state.combo = Math.min(5, state.combo + 1);
    state.comboTimer = SHIFT.comboWindowSeconds;
    chef.carried = null;
    say(state, `${order.name} tersaji! +${payout.coins} koin (tip ${payout.tip})`, 2.6);
    events.push('serve');
    events.push('coin');
    return;
  }

  if (near.kind === 'trash') {
    if (!carried) return;
    chef.carried = null;
    say(state, carried.kind === 'plate' ? 'Piring dibuang' : 'Dibuang ke tempat sampah');
    events.push('place');
  }
}

/** Move the chef, honouring the floor walls and the station counters. */
function moveChef(state, dx, dy, dt) {
  const chef = state.chef;
  const speed = CHEF.speed * dt;
  const len = Math.hypot(dx, dy) || 1;
  const nx = chef.x + (dx / len) * speed;
  const ny = chef.y + (dy / len) * speed;
  function blocked(x, y) {
    if (x < FLOOR.x + CHEF.radius || x > FLOOR.x + FLOOR.width - CHEF.radius) return true;
    if (y < FLOOR.y + CHEF.radius || y > FLOOR.y + FLOOR.height - CHEF.radius) return true;
    for (const rect of solids()) {
      const r = CHEF.radius - 2;
      if (x > rect.x - r && x < rect.x + rect.w + r && y > rect.y - r && y < rect.y + rect.h + r) return true;
    }
    return false;
  }
  if (!blocked(nx, chef.y)) chef.x = nx;
  if (!blocked(chef.x, ny)) chef.y = ny;
  chef.x = clamp(chef.x, FLOOR.x + CHEF.radius, FLOOR.x + FLOOR.width - CHEF.radius);
  chef.y = clamp(chef.y, FLOOR.y + CHEF.radius, FLOOR.y + FLOOR.height - CHEF.radius);
  if (dx !== 0) chef.face = dx > 0 ? 1 : -1;
  chef.walking = dx !== 0 || dy !== 0;
}

/** Every solid rectangle the chef walks around. */
function solids() {
  return [
    ...STATIONS.crates,
    STATIONS.board,
    STATIONS.stove,
    ...STATIONS.plates,
    STATIONS.window,
    STATIONS.trash,
  ];
}

/** Walking straight at a station pins the chef against its edge, so click and scripted walks
 * go by a path instead: a breadth-first search over a coarse grid of the floor, with the
 * station counters as obstacles, returns the waypoints from the chef to the target. */
const PATH_CELL = 32;
const PATH_COLS = Math.ceil(CANVAS_WIDTH / PATH_CELL);
const PATH_ROWS = Math.ceil(CANVAS_HEIGHT / PATH_CELL);

function pathCellBlocked(col, row) {
  const x = col * PATH_CELL + PATH_CELL / 2;
  const y = row * PATH_CELL + PATH_CELL / 2;
  if (x < FLOOR.x + CHEF.radius || x > FLOOR.x + FLOOR.width - CHEF.radius) return true;
  if (y < FLOOR.y + CHEF.radius || y > FLOOR.y + FLOOR.height - CHEF.radius) return true;
  for (const rect of solids()) {
    const r = CHEF.radius;
    if (x > rect.x - r && x < rect.x + rect.w + r && y > rect.y - r && y < rect.y + rect.h + r) return true;
  }
  return false;
}

function nearestFreeCell(col, row) {
  if (!pathCellBlocked(col, row)) return { col, row };
  for (let radius = 1; radius < 8; radius += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      for (let dr = -radius; dr <= radius; dr += 1) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < PATH_COLS && r >= 0 && r < PATH_ROWS && !pathCellBlocked(c, r)) return { col: c, row: r };
      }
    }
  }
  return { col, row };
}

function findPath(fromX, fromY, toX, toY) {
  const start = nearestFreeCell(Math.floor(fromX / PATH_CELL), Math.floor(fromY / PATH_CELL));
  const goal = nearestFreeCell(Math.floor(toX / PATH_CELL), Math.floor(toY / PATH_CELL));
  const key = (col, row) => row * PATH_COLS + col;
  const cameFrom = new Map();
  const seen = new Set([key(start.col, start.row)]);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.shift();
    if (cell.col === goal.col && cell.row === goal.row) {
      const cells = [cell];
      let current = key(cell.col, cell.row);
      while (cameFrom.has(current)) {
        const prev = cameFrom.get(current);
        cells.unshift(prev);
        current = key(prev.col, prev.row);
      }
      const points = cells.slice(1).map((c) => ({ x: c.col * PATH_CELL + PATH_CELL / 2, y: c.row * PATH_CELL + PATH_CELL / 2 }));
      points.push({ x: toX, y: toY });
      return points;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { col: cell.col + dc, row: cell.row + dr };
      if (next.col < 0 || next.col >= PATH_COLS || next.row < 0 || next.row >= PATH_ROWS) continue;
      const nextKey = key(next.col, next.row);
      if (seen.has(nextKey) || pathCellBlocked(next.col, next.row)) continue;
      seen.add(nextKey);
      cameFrom.set(nextKey, cell);
      queue.push(next);
    }
  }
  return [{ x: toX, y: toY }];
}

/** Advance the whole kitchen one fixed step. Returns the sound events this step caused. */
export function stepKitchen(state, input, dt) {
  const events = [];
  if (state.over) return events;

  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT.lengthSeconds - state.elapsed);

  // Movement: keys first, otherwise follow the path to a click target.
  let dx = input.moveX;
  let dy = input.moveY;
  if ((dx !== 0 || dy !== 0) && state.moveTarget) {
    // The player took over the walk: drop the path.
    state.moveTarget = null;
    state.path = [];
    state.useOnArrive = false;
  }
  if (dx === 0 && dy === 0 && state.moveTarget) {
    if (state.path.length === 0) {
      state.path = findPath(state.chef.x, state.chef.y, state.moveTarget.x, state.moveTarget.y);
    }
    const waypoint = state.path[0];
    const tx = waypoint.x - state.chef.x;
    const ty = waypoint.y - state.chef.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 10) {
      state.path.shift();
      if (state.path.length === 0) {
        state.moveTarget = null;
        if (state.useOnArrive) {
          state.useOnArrive = false;
          tryUse(state, events);
        }
      }
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  if (dx !== 0 || dy !== 0) moveChef(state, dx, dy, dt);
  else state.chef.walking = false;

  if (input.click) {
    const clicked = stationAtPoint(input.click.x, input.click.y);
    const near = clicked ?? nearestStation({ chef: { x: input.click.x, y: input.click.y } });
    if (near) {
      const front = stationFront(near.station);
      state.moveTarget = front;
      state.path = [];
      state.useOnArrive = true;
    } else {
      state.moveTarget = { x: clamp(input.click.x, FLOOR.x, FLOOR.x + FLOOR.width), y: clamp(input.click.y, FLOOR.y, FLOOR.y + FLOOR.height) };
      state.path = [];
      state.useOnArrive = false;
    }
  }
  if (input.interact && !state.moveTarget) tryUse(state, events);

  // Chopping: only while the chef stands at the board.
  const board = state.board;
  if (board.chopping && board.item) {
    const near = nearestStation(state);
    if (near && near.kind === 'board') {
      const def = INGREDIENTS[board.item.id];
      board.progress += dt / def.chopSeconds;
      state.chopTick += dt;
      if (state.chopTick > 0.45) {
        state.chopTick = 0;
        events.push('chopTick');
      }
      if (board.progress >= 1) {
        board.item = { kind: 'ingredient', id: board.item.id, state: 'chopped', done: true };
        board.chopping = false;
        board.progress = 1;
        events.push('chopDone');
        say(state, `${INGREDIENTS[board.item.id].choppedName} siap!`);
      }
    } else {
      board.chopping = false;
    }
  }

  // Stove: patties cook, then burn.
  let anyCooking = false;
  for (const burner of state.burners) {
    if (!burner.item) continue;
    const def = INGREDIENTS.patty;
    burner.progress += dt / def.cookSeconds;
    if (burner.progress >= 1 && !burner.item.cooked) {
      burner.item.cooked = true;
      say(state, 'Daging matang — angkat sebelum gosong!');
    }
    if (burner.progress >= def.burnSeconds / def.cookSeconds && !burner.item.burnt) {
      burner.item.burnt = true;
      say(state, 'Daging gosong! Buang ke tempat sampah');
      events.push('wrong');
    }
    if (!burner.item.burnt) anyCooking = true;
  }
  if (anyCooking) events.push('sizzle');
  else events.push('sizzleStop');

  // Orders: new ones arrive, old ones run out.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.orders.length < SHIFT.maxOrders) {
    state.orders.push(createOrder(state.random, state.elapsed));
    state.spawnTimer = spawnEveryFor(state.elapsed);
  }
  for (const order of state.orders) order.timeLeft -= dt;
  const expired = state.orders.filter((order) => order.timeLeft <= 0);
  if (expired.length > 0) {
    state.orders = state.orders.filter((order) => order.timeLeft > 0);
    state.expired += expired.length;
    state.lives -= expired.length;
    state.coins = Math.max(0, state.coins - SHIFT.expireCoinLoss * expired.length);
    state.combo = 1;
    say(state, `Pesanan ${expired[0].name} kedaluwarsa! -1 nyawa`, 2.6);
    events.push('expire');
  }

  // Combo fades if the chef stops serving quickly.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 1;
  }
  if (state.messageTimer > 0) state.messageTimer -= dt;
  else state.message = '';

  // The shift ends when the timer runs out or the last life is lost.
  if (state.timeLeft <= 0) {
    state.over = true;
    state.overReason = 'Shift selesai!';
    events.push('gameOver');
  } else if (state.lives <= 0) {
    state.over = true;
    state.overReason = 'Semua pesanan terlewat!';
    events.push('gameOver');
  }
  return events;
}

/** The order whose card the plate in hand would complete, for the renderer's hint. */
export function orderForPlate(state) {
  if (!state.chef.carried || state.chef.carried.kind !== 'plate') return null;
  return findMatchingOrder(state.chef.carried.items, state.orders);
}
