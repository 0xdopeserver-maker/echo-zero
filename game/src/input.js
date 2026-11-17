// Reading the keyboard: the movement vector of the arrows or WASD, and the one-shot actions. A
// press is consumed when it is taken, so holding a key down never repeats an action by accident.

export const ACTION_RECORD = 'record';
export const ACTION_ECHO = 'echo';
export const ACTION_INTERACT = 'interact';
export const ACTION_RESET = 'reset';
export const ACTION_CONFIRM = 'confirm';

const MOVE_KEYS = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1],
};

const ACTION_KEYS = {
  KeyR: ACTION_RECORD,
  Space: ACTION_ECHO,
  KeyE: ACTION_INTERACT,
  Backspace: ACTION_RESET,
  Enter: ACTION_CONFIRM,
};

/** Creates the input reader; the listener belongs to the window, so the canvas needs no focus. */
export function createInput(target = window) {
  const held = new Set();
  const actions = new Set();

  target.addEventListener('keydown', (event) => {
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    const action = ACTION_KEYS[event.code];
    if (action) {
      if (!event.repeat) actions.add(action);
      event.preventDefault();
    }
  });

  target.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });

  target.addEventListener('blur', () => held.clear());

  /** The unit-ish movement the keys ask for this frame; diagonal is not faster than straight. */
  function movement() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const vec = MOVE_KEYS[code];
      if (vec) {
        x += vec[0];
        y += vec[1];
      }
    }
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  /** Takes the pressed action, if any: one action per frame, oldest press first. */
  function takeAction() {
    for (const action of actions) {
      actions.delete(action);
      return action;
    }
    return null;
  }

  function clearActions() {
    actions.clear();
  }

  /** Queues an action from outside the keyboard; the test harness uses it, the game never does. */
  function queue(action) {
    actions.add(action);
  }

  return { movement, takeAction, clearActions, __queue: queue };
}
