// Keyboard and mouse, read fresh every frame. WASD or arrows walk, E or Space interacts,
// P pauses, R restarts, Enter starts. Clicking the canvas walks the chef there; clicking a
// station walks the chef to its front and uses it on arrival.
/** The actions the game reads from input. */
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';

/** Attach listeners to the canvas and return the frame's input. */
export function createInput(canvas) {
  const keys = new Set();
  let clickTarget = null;
  let interactQueued = false;
  let confirmQueued = false;
  let pauseQueued = false;
  let restartQueued = false;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    keys.add(event.key);
    if (key === 'e' || event.key === ' ') interactQueued = true;
    if (event.key === 'Enter') confirmQueued = true;
    if (key === 'p') pauseQueued = true;
    if (key === 'r') restartQueued = true;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
    keys.delete(event.key);
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    clickTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    interactQueued = true;
  });

  return {
    /** Read this frame's movement, actions and click target, then clear the one-shot queues. */
    read() {
      const left = keys.has('a') || keys.has('ArrowLeft');
      const right = keys.has('d') || keys.has('ArrowRight');
      const up = keys.has('w') || keys.has('ArrowUp');
      const down = keys.has('s') || keys.has('ArrowDown');
      const frame = {
        moveX: (right ? 1 : 0) - (left ? 1 : 0),
        moveY: (down ? 1 : 0) - (up ? 1 : 0),
        interact: interactQueued,
        confirm: confirmQueued,
        pause: pauseQueued,
        restart: restartQueued,
        click: clickTarget,
      };
      interactQueued = false;
      confirmQueued = false;
      pauseQueued = false;
      restartQueued = false;
      clickTarget = null;
      return frame;
    },
  };
}
