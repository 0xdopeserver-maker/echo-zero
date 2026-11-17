// Sound, made from a few oscillators so the game loads no audio file and plays offline. Every call
// is a short tone with an envelope; nothing loops and nothing is sampled.

import { AUDIO } from './config.js';

export function createSound() {
  let context = null;
  let master = null;
  let muted = false;

  /** Browsers only allow audio after a gesture, so the context is made on the first tone. */
  function ensure() {
    if (context) return context;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = AUDIO.master;
    master.connect(context.destination);
    return context;
  }

  function tone(freq, seconds, type = 'sine', gain = 0.5, slideTo = null) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + seconds);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  return {
    startRecording() { tone(AUDIO.tone.record, 0.16, 'triangle', 0.25); },
    stopRecording() { tone(AUDIO.tone.record * 0.75, 0.2, 'triangle', 0.22); },
    leaveEcho() { tone(AUDIO.tone.echo, 0.36, 'sine', 0.32, AUDIO.tone.echo * 1.9); },
    pressPlate() { tone(AUDIO.tone.plate, 0.1, 'square', 0.16); },
    openDoor() { tone(AUDIO.tone.door, 0.5, 'sawtooth', 0.16, AUDIO.tone.door * 1.6); },
    clear() {
      tone(AUDIO.tone.clear, 0.22, 'sine', 0.3);
      setTimeout(() => tone(AUDIO.tone.clear * 1.5, 0.34, 'sine', 0.26), 130);
    },
    fail() { tone(AUDIO.tone.fail, 0.85, 'sawtooth', 0.3, 55); },
    warn() { tone(AUDIO.tone.warn, 0.3, 'square', 0.12, AUDIO.tone.warn * 0.6); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
  };
}
