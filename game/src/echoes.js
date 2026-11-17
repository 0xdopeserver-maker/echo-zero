// Echoes: the bodies left behind by a finished recording. Each one carries its own track and a
// clock in samples. Reaching the end of the track does not end the echo: it stands at its last
// sample, holding whatever it was holding, which is the whole point of leaving one behind.

import { ECHO } from './config.js';

export function createEchoes() {
  const list = [];
  let nextId = 1;

  /** Leaves a new echo on the floor, replaying the track from its first sample. */
  function spawn(track, at) {
    const echo = {
      id: nextId++,
      track,
      index: 0,
      finished: track.frames.length <= 1,
      x: at.x,
      y: at.y,
      radius: ECHO.radius,
      interacting: false,
      trail: [],
      glow: 0,
      age: 0,
    };
    list.push(echo);
    return echo;
  }

  /**
   * Echoes carrying the same track cannot interfere: they are the same one body, and standing close
   * together is exactly how two plates get held at once. Only different recordings disturb each
   * other, which is what keeps the rule about placing echoes, not about avoiding them.
   */
  function interferencePairs() {
    const pairs = [];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[i].track === list[j].track) continue;
        pairs.push([list[i], list[j]]);
      }
    }
    return pairs;
  }

  /** Removes every echo: a reset clears the room's memory of them. */
  function clear() {
    list.length = 0;
  }

  /** Advances one step: each echo moves one sample along its own track. */
  function step(step) {
    for (const echo of list) {
      echo.age += step;
      echo.glow = Math.min(1, echo.age * 1.6);
      const frames = echo.track.frames;
      if (!echo.finished) {
        echo.index += 1;
        if (echo.index >= frames.length) {
          echo.index = frames.length - 1;
          echo.finished = true;
        }
      }
      const frame = frames[echo.index];
      echo.x = frame.x;
      echo.y = frame.y;
      echo.interacting = frame.k === 1;
      echo.trail.push({ x: echo.x, y: echo.y, life: ECHO.trailFade });
      if (echo.trail.length > 14) echo.trail.shift();
      for (const point of echo.trail) point.life -= step;
      echo.trail = echo.trail.filter((point) => point.life > 0);
    }
  }

  /** The echoes still replaying, which the room may count for its own rules. */
  function playing() {
    return list.filter((echo) => !echo.finished);
  }

  return { list, spawn, clear, step, playing, interferencePairs };
}
