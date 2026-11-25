// Dapur Senja (Sunset Kitchen) — every fixed number and fact of the game in one place:
// the canvas size, the kitchen layout, the ingredients, the menu and the pacing.
// Nothing here reads the clock or the network: the same numbers always build the same game.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'dapur-senja-best';

/** The sunset palette the whole kitchen is painted in. */
export const COLORS = {
  wall: '#2b1d33',
  wallGlow: '#ff9e5e',
  floorA: '#7a4a2b',
  floorB: '#6e4025',
  counter: '#8a5a33',
  counterEdge: '#5d3a1e',
  board: '#e8c98f',
  stove: '#3d3d4d',
  steel: '#c9c9d4',
  plate: '#f5f0e6',
  window: '#4a2c4d',
  text: '#fff3e0',
  textDark: '#3a2415',
  good: '#7ee787',
  warn: '#ffb454',
  bad: '#ff6b5e',
};

/** Where the chef may walk: the kitchen floor inside the walls. */
export const FLOOR = { x: 24, y: 108, width: 1232, height: 524 };

/** One ingredient crate, chopping board, stove, plate slot or window: a rectangle the chef stands in front of. */
export const STATIONS = {
  crates: [
    { id: 'tomato', name: 'Tomat', x: 60, y: 128, w: 100, h: 88 },
    { id: 'lettuce', name: 'Selada', x: 176, y: 128, w: 100, h: 88 },
    { id: 'onion', name: 'Bawang', x: 292, y: 128, w: 100, h: 88 },
    { id: 'cheese', name: 'Keju', x: 408, y: 128, w: 100, h: 88 },
    { id: 'bread', name: 'Roti', x: 524, y: 128, w: 100, h: 88 },
    { id: 'patty', name: 'Daging', x: 640, y: 128, w: 100, h: 88 },
  ],
  board: { id: 'board', name: 'Talenan', x: 60, y: 300, w: 170, h: 110 },
  stove: { id: 'stove', name: 'Kompor', x: 1050, y: 300, w: 170, h: 110 },
  plates: [
    { id: 'plate0', name: 'Piring 1', x: 380, y: 470, w: 150, h: 96 },
    { id: 'plate1', name: 'Piring 2', x: 560, y: 470, w: 150, h: 96 },
  ],
  window: { id: 'window', name: 'Jendela Saji', x: 950, y: 470, w: 270, h: 96 },
  trash: { id: 'trash', name: 'Tempat Sampah', x: 60, y: 470, w: 150, h: 96 },
};

/** The front point of a station: where the chef stands to use it. */
export function stationFront(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h + 34 };
}

/** Every ingredient: what it looks like, whether it must be chopped or cooked, and how long that takes. */
export const INGREDIENTS = {
  tomato: { id: 'tomato', name: 'Tomat', color: '#e63946', chop: true, chopSeconds: 3, choppedName: 'Tomat Iris' },
  lettuce: { id: 'lettuce', name: 'Selada', color: '#70c94e', chop: true, chopSeconds: 3, choppedName: 'Selada Iris' },
  onion: { id: 'onion', name: 'Bawang', color: '#c9a7eb', chop: true, chopSeconds: 3, choppedName: 'Bawang Iris' },
  cheese: { id: 'cheese', name: 'Keju', color: '#ffd23f', chop: false, choppedName: 'Keju' },
  bread: { id: 'bread', name: 'Roti', color: '#e8b06a', chop: false, choppedName: 'Roti' },
  patty: { id: 'patty', name: 'Daging', color: '#8d5a3b', cook: true, cookSeconds: 6, burnSeconds: 11, choppedName: 'Daging Panggang' },
};

/** The menu: each dish is a set of finished ingredients, a price in coins and a base score. */
export const DISHES = {
  burger: {
    id: 'burger', name: 'Burger Senja', price: 120, score: 100,
    needs: ['bread', 'pattyCooked', 'tomatoChopped', 'lettuceChopped'],
  },
  salad: {
    id: 'salad', name: 'Salad Segar', price: 90, score: 90,
    needs: ['lettuceChopped', 'tomatoChopped', 'onionChopped'],
  },
  grillcheese: {
    id: 'grillcheese', name: 'Roti Keju Panggang', price: 60, score: 60,
    needs: ['bread', 'cheese'],
  },
  cheeseburger: {
    id: 'cheeseburger', name: 'Burger Keju', price: 140, score: 120,
    needs: ['bread', 'pattyCooked', 'cheese', 'tomatoChopped'],
  },
};
export const DISH_LIST = [DISHES.burger, DISHES.salad, DISHES.grillcheese, DISHES.cheeseburger];

/** How a shift runs: length, lives, order pacing and how fast the kitchen gets busier. */
export const SHIFT = {
  lengthSeconds: 180,
  lives: 3,
  startOrders: 2,
  maxOrders: 4,
  spawnEveryStart: 16,
  spawnEveryEnd: 9,
  orderTimeStart: 55,
  orderTimeEnd: 34,
  expireCoinLoss: 30,
  comboWindowSeconds: 20,
  tipPerSecondLeft: 1,
};

/** The chef: size and walking speed. */
export const CHEF = { radius: 22, speed: 270 };
