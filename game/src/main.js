// The loop and the scenes: title, a room being played, and the sector's end card. Time is fed to the
// simulation in fixed steps so a slow frame only means a skipped picture, never a skipped rule.

import { STEP, FIELD, ECHO_LIMIT } from './config.js';
import { createInput, ACTION_RECORD, ACTION_ECHO, ACTION_INTERACT, ACTION_RESET, ACTION_CONFIRM } from './input.js';
import { createSector, ROOM_CLEARED, ROOM_FAILED } from './sector.js';
import { createRenderer } from './render.js';
import { createSound } from './sound.js';

const canvas = document.getElementById('screen');
const statusEl = document.getElementById('status');

const input = createInput(window);
const renderer = createRenderer(canvas);
const sound = createSound();

const SCENE_TITLE = 'title';
const SCENE_PLAY = 'play';
const SCENE_END = 'end';

const game = { scene: SCENE_TITLE, sector: null, elapsed: 0, accumulator: 0, transition: 0 };

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function startSector() {
  const made = createSector();
  game.sector = made;
  game.scene = SCENE_PLAY;
  game.transition = 0;
  announce(`Sector one, room one. ${made.sector.room.state.objective}`);
}

function updatePlay(step) {
  const { sector } = game;
  const room = sector.sector.room;

  if (room.state.status === ROOM_CLEARED || room.state.status === ROOM_FAILED) {
    game.transition += step;
    // The press is taken once per branch, not swallowed by the condition below: reading it inside
    // the `&&` threw the action away whenever the banner was still fading in, which is every press
    // a player can reasonably make.
    const confirm = input.takeAction() === ACTION_CONFIRM;
    if (confirm && game.transition > 0.2) {
      if (room.state.status === ROOM_CLEARED) {
        const result = sector.advance();
        sound.openDoor();
        if (sector.sector.finished) {
          game.scene = SCENE_END;
          announce(`Sector cleared with ${sector.sector.fragments} fragments.`);
        } else if (result.moved) {
          announce(`Room cleared. ${sector.sector.room.state.objective}`);
        }
      } else {
        sector.retry();
        announce(`Room failed. ${sector.sector.room.state.objective}`);
      }
    }
    renderer.frame(step, room);
    input.clearActions();
    return;
  }

  let direction = input.movement();
  const action = input.takeAction();

  if (game.aim) {
    const dx = game.aim.x - room.player.x;
    const dy = game.aim.y - room.player.y;
    if (Math.hypot(dx, dy) < 6) {
      game.aim = null;
      direction = { x: 0, y: 0 };
    } else if (Math.abs(dx) > Math.abs(dy)) {
      direction = { x: Math.sign(dx), y: 0 };
    } else {
      direction = { x: 0, y: Math.sign(dy) };
    }
  }

  if (action === ACTION_RECORD) {
    if (room.isRecording()) {
      const result = room.leaveEcho();
      if (result.ok) {
        sound.leaveEcho();
        announce(`Echo left. ${room.echoes.list.length} of ${ECHO_LIMIT} standing.`);
      } else {
        announce(result.reason === 'full' ? 'Memory full. Reset the room to clear an echo.' : 'Nothing recorded yet.');
      }
    } else {
      room.startRecording();
      sound.startRecording();
      announce('Recording. Walk the route you want the echo to repeat, then press R or SPACE.');
    }
  } else if (action === ACTION_ECHO) {
    if (room.isRecording()) {
      const result = room.leaveEcho();
      if (result.ok) {
        sound.leaveEcho();
        announce(`Echo left. ${room.echoes.list.length} of ${ECHO_LIMIT} standing.`);
      } else {
        announce(result.reason === 'full' ? 'Memory full. Reset the room to clear an echo.' : 'Nothing recorded yet.');
      }
    } else {
      announce('Press R to record first.');
    }
  } else if (action === ACTION_INTERACT) {
    if (room.interact()) sound.pressPlate();
  } else if (action === ACTION_RESET) {
    room.reset();
    sound.stopRecording();
    announce(`Room reset. ${room.state.objective}`);
  }

  const before = {
    plates: room.devices.plates.filter((p) => p.held).length,
    doors: room.devices.doors.filter((d) => d.open).length,
  };

  const outcome = room.step(direction, action);

  const after = {
    plates: room.devices.plates.filter((p) => p.held).length,
    doors: room.devices.doors.filter((d) => d.open).length,
  };
  if (after.plates > before.plates) sound.pressPlate();
  if (after.doors > before.doors) sound.openDoor();

  if (outcome?.cleared) {
    sound.clear();
    game.transition = 0;
    announce(`Room cleared. ${room.state.objective}`);
  } else if (outcome?.failed) {
    sound.fail();
    game.transition = 0;
    announce('Stability lost. Press Enter to retry.');
  }

  renderer.frame(step, room);
}

function updateTitle(step) {
  renderer.tick(step);
  renderer.title();
  if (input.takeAction() === ACTION_CONFIRM) {
    input.clearActions();
    startSector();
  }
}

function updateEnd(step) {
  renderer.tick(step);
  // game.sector holds createSector()'s wrapper ({ sector, load, advance, retry, restart }); the
  // record with fragments/totalFragments/failures is one level in, same as the debug getter returns.
  const { sector } = game.sector;
  renderer.ending(sector.fragments, sector.totalFragments, sector.failures);
  if (input.takeAction() === ACTION_CONFIRM) {
    input.clearActions();
    startSector();
  }
}

/** One frame of the page: advance the simulation in fixed steps, then draw the current room. */
function frame(now) {
  const seconds = Math.min(0.1, (now - (frame.last ?? now)) / 1000);
  frame.last = now;
  game.accumulator += seconds;

  let steps = 0;
  while (game.accumulator >= STEP && steps < 6) {
    if (game.scene === SCENE_TITLE) updateTitle(STEP);
    else if (game.scene === SCENE_PLAY) updatePlay(STEP);
    else updateEnd(STEP);
    game.accumulator -= STEP;
    steps += 1;
  }

  requestAnimationFrame(frame);
}

// A page in a background tab gets no animation frames at all, which would leave the canvas blank
// and the game unplayable for anyone who opens it in a tab they are not looking at. This timer
// keeps the loop alive when frames stop, and does nothing while they are being delivered.
let fallback = null;
function startFallback() {
  if (fallback !== null) return;
  fallback = setInterval(() => {
    const now = performance.now();
    if (now - (frame.last ?? 0) > 120) {
      frame.last = now - STEP * 1000;
      frame(now);
    }
  }, 100);
}
startFallback();

// The page may be embedded in a frame that gives it no window: the canvas still draws at its own size.
window.addEventListener('resize', () => renderer.title());

// M mutes, and is handled here because it is a setting rather than an action.
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') {
    const muted = sound.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
});

// A first click or key press is what browsers allow audio to start on.
window.addEventListener('pointerdown', () => sound.pressPlate(), { once: true });

canvas.width = FIELD.width;
canvas.height = FIELD.height;

// A read-only window onto the live game, for driving the same code from outside during testing.
// Nothing in the game reads it, so removing it changes no behaviour.
window.__echo = {
  get scene() { return game.scene; },
  get room() { return game.sector ? game.sector.sector.room : null; },
  get sector() { return game.sector ? game.sector.sector : null; },
  start: () => startSector(),
  press: (action) => input.__queue(action),
  // Steers the player toward a point with the same movement the keys produce, so a test can play a
  // room at full speed without waiting on real-time key holds. It presses nothing on its own.
  aim: (x, y) => {
    game.aim = { x, y };
  },
  clearAim: () => { game.aim = null; },
};

announce('Echo Zero. Press Enter to begin.');
frame(performance.now());
