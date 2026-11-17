// Stability: the world's patience with the echoes you leave in it. Echoes that walk into each other,
// and machines left running with nobody feeding them, drain it. At zero the room fails and the run
// restarts, which is how the game keeps its threat without ever killing a body.

import { STABILITY, ECHO, MACHINE } from './config.js';

export function createStability() {
  const state = {
    value: STABILITY.start,
    lastDrain: 0,
    interference: 0,
    overloaded: false,
    failed: false,
  };

  /**
   * Drains stability this step for every pair of different recordings walking into each other, and
   * for every machine left running with nobody feeding it. Echoes of the same recording may stand
   * together freely: that is how two plates are held at once.
   */
  function update(step, echoes, machines, pairs = []) {
    let drain = 0;
    let close = 0;

    for (const [a, b] of pairs) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < ECHO.interferenceDist) {
        const force = 1 - d / ECHO.interferenceDist;
        drain += ECHO.interferenceDrain * force;
        close += 1;
      }
    }

    let overloaded = false;
    for (const machine of machines) {
      if (machine.online && machine.overload >= MACHINE.overloadGrace * 0.75) {
        drain += MACHINE.overloadDrain;
        overloaded = true;
      }
    }

    state.interference = close;
    state.overloaded = overloaded;
    state.lastDrain = drain;

    if (drain > 0) {
      state.value = Math.max(0, state.value - drain * step);
      if (state.value <= 0) state.failed = true;
    } else {
      // With nothing disturbing it, the room slowly settles back toward calm.
      state.value = Math.min(STABILITY.start, state.value + 1.6 * step);
    }
  }

  /** Rewards a cleared room with a little calm back, never above the cap. */
  function restore(amount = STABILITY.restoreOnClear) {
    state.value = Math.min(STABILITY.start, state.value + amount);
  }

  function reset() {
    state.value = STABILITY.start;
    state.lastDrain = 0;
    state.interference = 0;
    state.overloaded = false;
    state.failed = false;
  }

  return { state, update, restore, reset };
}
