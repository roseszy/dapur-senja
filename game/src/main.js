// Boot and the one loop: input is read every frame, the kitchen advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=kitchen|chopping|serving|rush (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSoundBank } from './audio.js';
import { createInput } from './input.js';
import { createKitchen, resetKitchen, stepKitchen } from './kitchen.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const sounds = createSoundBank();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playEvents(events) {
  for (const event of events) {
    if (event === 'sizzle') sounds.startSizzle();
    else if (event === 'sizzleStop') sounds.stopSizzle();
    else if (typeof sounds[event] === 'function') sounds[event]();
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const screen = stageShot(name, kitchen, createRandom(seed));
  window.__kitchen = kitchen;
  let painted = 0;
  function paint() {
    renderer.draw(kitchen, screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  window.__kitchen = kitchen;
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const frameInput = input.read();
    if (frameInput.confirm || frameInput.interact) sounds.unlock();
    if (frameInput.restart && screen !== SCREEN_TITLE) {
      resetKitchen(kitchen, createRandom(seed));
      screen = SCREEN_PLAY;
      announce('Shift baru dimulai. Ambil bahan dari peti!');
    } else if (screen === SCREEN_TITLE && (frameInput.confirm || frameInput.interact)) {
      screen = SCREEN_PLAY;
      announce('Shift dimulai. Ambil bahan dari peti, cincang, masak, sajikan!');
    } else if (screen === SCREEN_PLAY && frameInput.pause) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (screen === SCREEN_PAUSED && frameInput.pause) {
      screen = SCREEN_PLAY;
      announce('Lanjut memasak.');
    } else if (screen === SCREEN_OVER && (frameInput.confirm || frameInput.interact)) {
      resetKitchen(kitchen, createRandom(seed));
      screen = SCREEN_PLAY;
      announce('Shift baru dimulai.');
    }
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        playEvents(stepKitchen(kitchen, frameInput, STEP));
        frameInput.interact = false;
        frameInput.click = null;
      }
      if (kitchen.over) {
        screen = SCREEN_OVER;
        if (kitchen.score > best) {
          best = kitchen.score;
          saveBest(best);
        }
        announce(`Shift selesai! Skor ${kitchen.score}, koin ${kitchen.coins}, ${kitchen.served} hidangan disajikan.`);
      }
    }
    renderer.draw(kitchen, screen, best);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
