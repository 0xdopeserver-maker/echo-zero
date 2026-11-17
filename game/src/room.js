// One room, wired together: the walls in front of the player, the recorder that samples it, the
// echoes that replay it, the plates and doors that answer them, and the stability that pays for it.
// The room owns its own state so a reset is local and the sector only counts what was cleared.

import { STEP, RECORD_LIMIT, ECHO_LIMIT, MACHINE } from './config.js';
import { roomGeometry } from './rooms.js';
import { solidsOf } from './collision.js';
import { createPlayer } from './player.js';
import { createRecorder } from './recorder.js';
import { createEchoes } from './echoes.js';
import { createDevices } from './devices.js';
import { createStability } from './stability.js';

export const ROOM_EXPLORING = 'exploring';
export const ROOM_CLEARED = 'cleared';
export const ROOM_FAILED = 'failed';

export function createRoom(roomData) {
  const geometry = roomGeometry(roomData);
  const { player, move, reset: resetPlayer } = createPlayer(geometry);
  const recorder = createRecorder();
  const echoes = createEchoes();
  const devices = createDevices(geometry);
  const stability = createStability();

  const notes = [];
  const state = {
    key: roomData.key,
    name: roomData.name,
    title: roomData.title,
    objective: roomData.objective,
    hint: roomData.hint,
    fragment: roomData.fragment,
    status: ROOM_EXPLORING,
    interactSeen: false,
    exitHeld: 0,
    timeInRoom: 0,
    clearedAt: 0,
  };

  function note(text) {
    if (notes[notes.length - 1] === text) return;
    notes.push(text);
    if (notes.length > 3) notes.shift();
  }

  /** Begins a recording; an older one in the buffer is dropped, as the recorder is single-track. */
  function startRecording() {
    recorder.begin();
    state.interactSeen = false;
    note('RECORDING');
  }

  /** Finishes a recording and leaves the track on the floor as an echo, if there is room. */
  function leaveEcho() {
    const track = recorder.finish();
    if (!track) {
      note('NOTHING RECORDED');
      return { ok: false, reason: 'empty' };
    }
    if (echoes.list.length >= ECHO_LIMIT) {
      note('MEMORY FULL: RESET TO CLEAR');
      return { ok: false, reason: 'full' };
    }
    echoes.spawn(track, { x: track.frames[0].x, y: track.frames[0].y });
    note(`ECHO ${echoes.list.length}/${ECHO_LIMIT} LEFT`);
    return { ok: true };
  }

  /** Presses the machine the player stands at, if a machine answers to a press there. */
  function interact() {
    const target = devices.interactTargetAt(player);
    if (!target) {
      note('NOTHING TO PRESS HERE');
      return false;
    }
    state.interactSeen = true;
    return true;
  }

  /** Clears every echo and every device, and puts the player back at the room's start. */
  function reset() {
    recorder.cancel();
    echoes.clear();
    devices.reset();
    resetPlayer(geometry.start);
    state.status = ROOM_EXPLORING;
    state.interactSeen = false;
    state.exitHeld = 0;
    state.timeInRoom = 0;
    stability.reset();
    notes.length = 0;
    note('ROOM RESET');
  }

  /** One fixed step of the room: what the player does, then what the room does about it. */
  function step(direction, action) {
    if (state.status !== ROOM_EXPLORING) return null;

    if (recorder.state.recording && recorder.state.elapsed >= RECORD_LIMIT) {
      leaveEcho();
    }

    const solids = solidsOf(geometry, Object.fromEntries(devices.doors.map((d) => [d.id, d.open])));
    move(direction, STEP, solids);

    const { plateHeld, machineDone } = devices.update(STEP, player, echoes.list, state.interactSeen);

    recorder.sample(STEP, player, state.interactSeen);
    state.interactSeen = false;

    echoes.step(STEP);
    stability.update(STEP, echoes.list, devices.machines, echoes.interferencePairs());

    const dxExit = player.x - geometry.exit.x;
    const dyExit = player.y - geometry.exit.y;
    // A generous radius and a short dwell: the player arrives at 210 px a second, and a tight ring
    // meant you could run straight through the exit without the room ever noticing.
    const atExit = Math.hypot(dxExit, dyExit) < geometry.exit.r + player.radius + 14;

    // The exit answers only when the room's own condition is met: the gate is open and visible.
    const exitGate = devices.doors.find((door) => door.id === 'exit-gate');
    const gateOpen = exitGate ? exitGate.open : true;
    if (atExit && gateOpen) {
      state.exitHeld += STEP;
      if (state.exitHeld >= 0.2) {
        state.status = ROOM_CLEARED;
        stability.restore();
        return { cleared: true, plateHeld, machineDone };
      }
    } else {
      state.exitHeld = 0;
    }

    state.timeInRoom += STEP;

    const overloadedTooLong = devices.machines.some((m) => m.overload >= MACHINE.overloadGrace);
    if (stability.state.failed || overloadedTooLong) {
      state.status = ROOM_FAILED;
      return { failed: true };
    }
    return null;
  }

  return {
    geometry,
    data: roomData,
    player,
    recorder,
    echoes,
    devices,
    stability,
    state,
    notes,
    step,
    startRecording,
    leaveEcho,
    interact,
    reset,
    isRecording: () => recorder.state.recording,
  };
}
