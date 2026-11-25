// Everything the player sees, painted on one canvas: the sunset kitchen, the order board,
// the stations with their ingredients, the chef, the HUD and the title / pause / game-over
// screens. Pure drawing: it never changes the world, so the same state always paints the same frame.
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, COLORS, FLOOR, INGREDIENTS, SHIFT, STATIONS, stationFront,
} from './config.js';
import { carriedLabel, orderForPlate } from './kitchen.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function bar(ctx, x, y, w, h, fraction, fill, back = 'rgba(0,0,0,0.45)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (fraction > 0) {
    roundRect(ctx, x, y, w * Math.max(0, Math.min(1, fraction)), h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** One ingredient, drawn as a small picture: a tomato, lettuce leaves, onion rings, cheese, bread or a patty. */
export function drawIngredientIcon(ctx, id, state, x, y, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'tomato') {
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.5, -r * 0.4); ctx.lineTo(r * 0.5, -r * 0.4); ctx.closePath(); ctx.fill();
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#70c94e';
    for (const [ox, oy] of [[-r * 0.4, 0], [r * 0.4, 0], [0, -r * 0.35], [0, r * 0.35]]) {
      ctx.beginPath(); ctx.arc(ox, oy, r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#4a9e2e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.stroke();
  } else if (id === 'onion') {
    ctx.fillStyle = '#c9a7eb';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5eefc';
    ctx.lineWidth = 2.5;
    for (const rr of [r * 0.65, r * 0.35]) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.lineTo(r, r * 0.7); ctx.lineTo(0, -r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a91c';
    for (const [hx, hy] of [[-r * 0.3, r * 0.25], [r * 0.25, r * 0.35], [0, -r * 0.3]]) {
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'bread') {
    ctx.fillStyle = '#e8b06a';
    roundRect(ctx, -r, -r * 0.55, size, size * 0.7, r * 0.4);
    ctx.fill();
    ctx.fillStyle = '#c98d4a';
    roundRect(ctx, -r, r * 0.15, size, size * 0.4, r * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#a86f33';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.5); ctx.lineTo(-r * 0.4, r * 0.1); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, r * 0.1); ctx.stroke();
  } else if (id === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#1c1c1c' : state === 'cooked' ? '#6b4226' : '#8d5a3b';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    if (state === 'cooked') {
      ctx.strokeStyle = '#4a2c17';
      ctx.lineWidth = 3;
      for (const off of [-r * 0.4, 0, r * 0.4]) {
        ctx.beginPath(); ctx.moveTo(off, -r * 0.7); ctx.lineTo(off, r * 0.7); ctx.stroke();
      }
    }
  }
  if (state === 'chopped') {
    // One diagonal slice line: the ingredient has been cut, not crossed out.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.5); ctx.lineTo(r * 0.7, -r * 0.5); ctx.stroke();
  }
  ctx.restore();
}

/** A white plate with the finished ingredients piled on it. */
function drawPlate(ctx, items, x, y, size) {
  ctx.fillStyle = COLORS.plate;
  ctx.beginPath(); ctx.ellipse(x, y, size / 2, size / 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8cfba';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, size / 2.6, size / 3.4, 0, 0, Math.PI * 2); ctx.stroke();
  items.forEach((item, index) => {
    const id = item.replace(/Chopped|Cooked/, '').toLowerCase();
    const state = item.endsWith('Chopped') ? 'chopped' : item.endsWith('Cooked') ? 'cooked' : 'raw';
    drawIngredientIcon(ctx, id, state, x + (index - (items.length - 1) / 2) * size * 0.32, y - 4, size * 0.42);
  });
}

function drawStationBase(ctx, rect, label, highlight) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = COLORS.counter;
  ctx.fill();
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.strokeStyle = highlight ? COLORS.warn : COLORS.counterEdge;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h - 13, 14, COLORS.text, 'center');
}

function drawOrderBoard(ctx, state) {
  roundRect(ctx, 12, 8, CANVAS_WIDTH - 24, 92, 14);
  ctx.fillStyle = 'rgba(20,12,28,0.85)';
  ctx.fill();
  ctx.strokeStyle = COLORS.wallGlow;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'PESANAN', 30, 30, 20, COLORS.wallGlow);
  text(ctx, `${state.orders.length} aktif`, 30, 62, 14, COLORS.text, 'left', 'normal');
  const match = orderForPlate(state);
  state.orders.forEach((order, index) => {
    const x = 170 + index * 272;
    const y = 16;
    const w = 260;
    const h = 76;
    const urgent = order.timeLeft < 12;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = order.id === match?.id ? 'rgba(126,231,135,0.35)' : urgent ? 'rgba(255,107,94,0.3)' : 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.lineWidth = order.id === match?.id ? 3 : 1.5;
    ctx.strokeStyle = order.id === match?.id ? COLORS.good : urgent ? COLORS.bad : 'rgba(255,255,255,0.35)';
    ctx.stroke();
    text(ctx, order.name, x + 12, y + 18, 17, COLORS.text);
    order.needs.forEach((need, n) => {
      const id = need.replace(/Chopped|Cooked/, '').toLowerCase();
      const needState = need.endsWith('Chopped') ? 'chopped' : need.endsWith('Cooked') ? 'cooked' : 'raw';
      drawIngredientIcon(ctx, id, needState, x + 22 + n * 34, y + 46, 26);
    });
    const seconds = Math.max(0, Math.ceil(order.timeLeft));
    text(ctx, `${seconds} dtk`, x + w - 12, y + 18, 16, urgent ? COLORS.bad : COLORS.text, 'right');
    bar(ctx, x + 12, y + 64, w - 24, 7, order.timeLeft / order.totalTime, urgent ? COLORS.bad : COLORS.good);
  });
  if (state.orders.length === 0) text(ctx, 'Belum ada pesanan…', 200, 54, 16, COLORS.text, 'left', 'normal');
}

function drawKitchenFloor(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#3a2338');
  gradient.addColorStop(0.35, '#5b2f2a');
  gradient.addColorStop(1, '#2b1d33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Sunset glow through the kitchen windows.
  const glow = ctx.createRadialGradient(640, 60, 20, 640, 60, 520);
  glow.addColorStop(0, 'rgba(255,158,94,0.5)');
  glow.addColorStop(1, 'rgba(255,158,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 400);
  // Checkerboard floor tiles.
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(FLOOR.x + col * 77, FLOOR.y + row * 66, 77, 66);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let col = 0; col <= 16; col += 1) {
    ctx.beginPath(); ctx.moveTo(FLOOR.x + col * 77, FLOOR.y); ctx.lineTo(FLOOR.x + col * 77, FLOOR.y + FLOOR.height); ctx.stroke();
  }
  for (let row = 0; row <= 8; row += 1) {
    ctx.beginPath(); ctx.moveTo(FLOOR.x, FLOOR.y + row * 66); ctx.lineTo(FLOOR.x + FLOOR.width, FLOOR.y + row * 66); ctx.stroke();
  }
}

function drawCrates(ctx, state) {
  for (const crate of STATIONS.crates) {
    const def = INGREDIENTS[crate.id];
    const near = state.chef && Math.hypot(state.chef.x - (crate.x + crate.w / 2), state.chef.y - (crate.y + crate.h)) < 110;
    drawStationBase(ctx, crate, crate.name, near);
    drawIngredientIcon(ctx, crate.id, 'raw', crate.x + crate.w / 2, crate.y + 30, 44);
    text(ctx, def.chop ? 'cincang' : def.cook ? 'panggang' : 'siap pakai', crate.x + crate.w / 2, crate.y + 58, 11, '#ffd9a0', 'center', 'normal');
  }
}

function drawBoardAndStove(ctx, state) {
  const board = STATIONS.board;
  // When the board holds an ingredient, its status takes the label's place: one line, no stack.
  const boardBusy = state.board.item !== null;
  drawStationBase(ctx, board, boardBusy ? '' : board.name, boardBusy);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, board.x + 16, board.y + 12, board.w - 32, 52, 8);
  ctx.fill();
  if (state.board.item) {
    drawIngredientIcon(ctx, state.board.item.id, state.board.item.done ? 'chopped' : 'raw', board.x + board.w / 2, board.y + 38, 44);
    if (state.board.chopping || state.board.progress > 0) {
      bar(ctx, board.x + 20, board.y + 68, board.w - 40, 10, state.board.progress, COLORS.good);
      text(ctx, state.board.chopping ? 'Mencincang…' : 'Dicincang ✓', board.x + board.w / 2, board.y + board.h - 13, 13, COLORS.text, 'center', 'normal');
    }
  } else {
    text(ctx, 'Taruh bahan di sini', board.x + board.w / 2, board.y + 38, 13, '#8a6a45', 'center', 'normal');
  }

  const stove = STATIONS.stove;
  drawStationBase(ctx, stove, stove.name, state.burners.some((b) => b.item));
  state.burners.forEach((burner, index) => {
    const bx = stove.x + 22 + index * 76;
    const by = stove.y + 14;
    ctx.fillStyle = '#22222e';
    ctx.beginPath(); ctx.arc(bx + 26, by + 24, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#55556a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx + 26, by + 24, 26, 0, Math.PI * 2); ctx.stroke();
    if (burner.item) {
      const burnt = burner.item.burnt;
      const cooked = burner.progress >= 1;
      drawIngredientIcon(ctx, 'patty', burnt ? 'burnt' : cooked ? 'cooked' : 'raw', bx + 26, by + 24, 40);
      const fraction = Math.min(1, burner.progress);
      bar(ctx, bx, by + 56, 52, 8, fraction, burnt ? COLORS.bad : cooked ? COLORS.good : COLORS.warn);
      text(ctx, burnt ? 'GOSONG!' : cooked ? 'Matang!' : 'Memanggang…', bx + 26, by + 70, 11, burnt ? COLORS.bad : COLORS.text, 'center', 'normal');
    }
  });
}

function drawPlatesWindowTrash(ctx, state) {
  for (const [index, slot] of STATIONS.plates.entries()) {
    drawStationBase(ctx, slot, slot.name, state.plates[index].items.length > 0);
    if (state.plates[index].items.length > 0) {
      drawPlate(ctx, state.plates[index].items, slot.x + slot.w / 2, slot.y + 36, 110);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(slot.x + slot.w / 2, slot.y + 36, 52, 30, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'Piring kosong', slot.x + slot.w / 2, slot.y + 38, 12, 'rgba(255,255,255,0.6)', 'center', 'normal');
    }
  }
  const win = STATIONS.window;
  drawStationBase(ctx, win, win.name, false);
  ctx.fillStyle = COLORS.window;
  roundRect(ctx, win.x + 14, win.y + 10, win.w - 28, 52, 8);
  ctx.fill();
  text(ctx, 'ANTAR DI SINI', win.x + win.w / 2, win.y + 36, 16, '#ffd9a0', 'center');
  const match = orderForPlate(state);
  if (match) text(ctx, `→ ${match.name} ✓`, win.x + win.w / 2, win.y + 62, 14, COLORS.good, 'center');
  const trash = STATIONS.trash;
  drawStationBase(ctx, trash, trash.name, false);
  ctx.fillStyle = '#4a4a55';
  roundRect(ctx, trash.x + 46, trash.y + 12, 58, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#33333e';
  roundRect(ctx, trash.x + 40, trash.y + 8, 70, 10, 5);
  ctx.fill();
}

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = chef.walking ? Math.sin(performance.now() / 90) * 3 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 20 - bob, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body: white apron over a warm shirt.
  ctx.fillStyle = '#f5f0e6';
  roundRect(ctx, -18, -6, 36, 30, 12);
  ctx.fill();
  ctx.fillStyle = '#ff9e5e';
  ctx.fillRect(-18, 6, 36, 6);
  // Head and chef hat.
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath(); ctx.arc(0, -16, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-8, -26, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -26, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -30, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -30, 26, 8);
  // Eyes look where the chef faces.
  ctx.fillStyle = '#2b1d33';
  ctx.beginPath(); ctx.arc(chef.face * 4 - 4, -16, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chef.face * 4 + 4, -16, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // What the chef carries, floating above the hat.
  const carried = chef.carried;
  if (carried) {
    const cy = chef.y - 58 + bob;
    if (carried.kind === 'plate') {
      drawPlate(ctx, carried.items, chef.x, cy, 64);
    } else {
      const def = INGREDIENTS[carried.id];
      drawIngredientIcon(ctx, carried.id, carried.state === 'chopped' ? 'chopped' : carried.state === 'cooked' ? 'cooked' : 'raw', chef.x, cy, 40);
      text(ctx, carriedLabel(carried), chef.x, cy - 26, 13, COLORS.text, 'center');
    }
  }
  // Click target marker.
  if (state.moveTarget) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(state.moveTarget.x, state.moveTarget.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(state.moveTarget.x - 14, state.moveTarget.y); ctx.lineTo(state.moveTarget.x + 14, state.moveTarget.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(state.moveTarget.x, state.moveTarget.y - 14); ctx.lineTo(state.moveTarget.x, state.moveTarget.y + 14); ctx.stroke();
  }
}

/** A small heart, filled or dimmed, for the lives display. */
function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -11, 0, -5);
  ctx.bezierCurveTo(5, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? COLORS.bad : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, state) {
  roundRect(ctx, 12, 648, CANVAS_WIDTH - 24, 60, 12);
  ctx.fillStyle = 'rgba(20,12,28,0.85)';
  ctx.fill();
  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = Math.floor(state.timeLeft % 60).toString().padStart(2, '0');
  const timeColor = state.timeLeft < 30 ? COLORS.bad : COLORS.text;
  text(ctx, `Waktu ${minutes}:${seconds}`, 30, 672, 22, timeColor);
  text(ctx, 'SHIFT', 30, 694, 11, '#c9a7eb', 'left', 'normal');
  text(ctx, `Skor ${state.score}`, 220, 678, 20, COLORS.text);
  text(ctx, `Koin ${state.coins}`, 420, 678, 20, '#ffd23f');
  if (state.combo > 1) text(ctx, `Kombo x${state.combo}`, 620, 678, 20, COLORS.warn);
  for (let i = 0; i < SHIFT.lives; i += 1) drawHeart(ctx, 830 + i * 30, 678, 22, i < state.lives);
  text(ctx, `Disajikan: ${state.served}`, 980, 678, 16, COLORS.text, 'left', 'normal');
  if (state.message) {
    text(ctx, state.message, CANVAS_WIDTH / 2, 632, 18, '#ffe9a8', 'center');
  }
  text(ctx, 'WASD / Panah: jalan   •   E / Spasi: pakai stasiun   •   Klik: jalan ke stasiun   •   P: jeda   •   R: ulang', CANVAS_WIDTH / 2, 700, 12, 'rgba(255,243,224,0.75)', 'center', 'normal');
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(20,10,24,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  roundRect(ctx, 340, 130, 600, 440, 20);
  ctx.fillStyle = '#2b1d33';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();
  text(ctx, title, 640, 190, 44, accent, 'center');
  lines.forEach((line, index) => {
    text(ctx, line.text, 640, 250 + index * 34, line.size ?? 18, line.color ?? COLORS.text, 'center', line.weight ?? 'normal');
  });
}

/** Paint one frame of the game: kitchen, orders, chef and HUD, plus any screen overlay. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, screen, best) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawKitchenFloor(ctx);
      drawOrderBoard(ctx, state);
      drawCrates(ctx, state);
      drawBoardAndStove(ctx, state);
      drawPlatesWindowTrash(ctx, state);
      drawChef(ctx, state);
      drawHud(ctx, state);
      if (screen === SCREEN_TITLE) {
        drawOverlay(ctx, 'DAPUR SENJA', [
          { text: 'Dapur kecil di ujung senja — masak cepat, sajikan tepat waktu!', size: 19, color: '#ffd9a0' },
          { text: 'Ambil bahan dari peti, cincang di talenan, panggang daging di kompor,', size: 17 },
          { text: 'rakit di piring, lalu antar ke jendela saji sebelum pesanan kedaluwarsa.', size: 17 },
          { text: 'Pesanan yang kedaluwarsa mengurangi 1 nyawa. Shift berlangsung 3 menit.', size: 17 },
          { text: '', size: 17 },
          { text: 'WASD / Panah bergerak  •  E / Spasi berinteraksi  •  Klik stasiun untuk jalan', size: 16, color: '#c9a7eb' },
          { text: `Skor terbaik: ${best}`, size: 17, color: COLORS.good },
          { text: 'Tekan ENTER atau klik untuk mulai memasak!', size: 20, color: COLORS.warn },
        ], COLORS.wallGlow);
      } else if (screen === SCREEN_PAUSED) {
        drawOverlay(ctx, 'JEDA', [
          { text: 'Istirahat sebentar — dapurnya menunggu.', size: 19, color: '#ffd9a0' },
          { text: 'Tekan P untuk lanjut memasak', size: 18 },
        ], COLORS.warn);
      } else if (screen === SCREEN_OVER) {
        drawOverlay(ctx, 'SHIFT SELESAI', [
          { text: state.overReason, size: 20, color: '#ffd9a0' },
          { text: `Skor akhir: ${state.score}`, size: 24, color: COLORS.text },
          { text: `Koin: ${state.coins}   •   Hidangan disajikan: ${state.served}   •   Pesanan terlewat: ${state.expired}`, size: 17 },
          { text: `Skor terbaik: ${Math.max(best, state.score)}`, size: 18, color: COLORS.good },
          { text: 'Tekan R atau ENTER untuk main lagi', size: 19, color: COLORS.warn },
        ], COLORS.good);
      }
    },
  };
}
