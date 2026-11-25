// Every sound in Dapur Senja is synthesised live with WebAudio: short oscillator blips and
// filtered noise, no audio files and no network. The bank stays silent until the player first
// presses a key or clicks (browsers block audio before a gesture), and every call is guarded so
// a missing or suspended context never breaks the game.
/** Build the sound bank. Call `unlock()` from a user gesture before playing anything. */
export function createSoundBank() {
  let context = null;
  let sizzle = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(frequency, seconds, type, volume, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + when);
      oscillator.stop(ctx.currentTime + when + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  function noiseBurst(seconds, volume, filterFrequency) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFrequency;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    pickup() { tone(520, 0.08, 'sine', 0.12); },
    place() { tone(340, 0.08, 'triangle', 0.12); },
    chopTick() { noiseBurst(0.06, 0.18, 1800); },
    chopDone() { tone(880, 0.12, 'sine', 0.14); tone(1320, 0.14, 'sine', 0.1, 0.08); },
    cookStart() { noiseBurst(0.15, 0.1, 900); },
    serve() {
      tone(523, 0.12, 'triangle', 0.16);
      tone(659, 0.12, 'triangle', 0.16, 0.09);
      tone(784, 0.2, 'triangle', 0.18, 0.18);
    },
    coin() { tone(988, 0.07, 'square', 0.06); tone(1319, 0.12, 'square', 0.06, 0.06); },
    wrong() { tone(160, 0.18, 'sawtooth', 0.1); },
    expire() { tone(220, 0.3, 'sawtooth', 0.12); tone(174, 0.35, 'sawtooth', 0.12, 0.2); },
    gameOver() {
      tone(392, 0.2, 'triangle', 0.14);
      tone(330, 0.2, 'triangle', 0.14, 0.18);
      tone(262, 0.4, 'triangle', 0.14, 0.36);
    },
    startSizzle() {
      const ctx = ensure();
      if (!ctx || sizzle) return;
      try {
        const length = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        const gain = ctx.createGain();
        gain.gain.value = 0.035;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
        sizzle = { source, gain };
      } catch {
        sizzle = null;
      }
    },
    stopSizzle() {
      if (!sizzle) return;
      try { sizzle.source.stop(); } catch { /* already stopped */ }
      sizzle = null;
    },
  };
}
