// The four rooms of Sector 01, as plain data. A room is a grid of walls, a set of plates (pads the
// player or an echo can stand on), doors that open when their plates are held, machines that must
// run for a while, and an exit that opens once the room's condition is met. The gameplay code reads
// this file and nothing here knows how any of it is simulated, so a room is added by adding data.
//
// Every room is built so the player is never the one holding a plate at the end: an echo is left on
// each plate and the player walks out through the open gate. That is the rule the sector teaches.

import { CELL, GRID } from './config.js';

/** A wall rectangle in cell units: x, y, width, height. */
const box = (x, y, w, h) => ({ x, y, w, h });

export const SECTOR_ONE = {
  id: 'sector-01',
  name: 'SECTOR 01 // AWAKENING',
  rooms: [
    // ---- ROOM 1: the whole idea in its simplest form. One plate, one echo, one gate.
    {
      key: 'r1-record',
      name: 'ROOM 001',
      title: 'RECORD',
      objective: 'LEAVE AN ECHO ON THE PLATE, THEN WALK OUT',
      hint: 'R records your body. SPACE leaves the recording as an echo that repeats it.',
      walls: [box(0, 0, 40, 2), box(0, 20, 40, 2), box(0, 2, 2, 18), box(38, 2, 2, 18)],
      plates: [{ id: 'a', x: 7.5, y: 10.5 }],
      doors: [{ id: 'exit-gate', x: 26, y: 8, w: 1.5, h: 6, vertical: false, needs: ['a'] }],
      machines: [],
      exit: { x: 33.5, y: 10.5 },
      start: { x: 15.5, y: 10.5 },
      fragment: 1,
    },
    // ---- ROOM 2: two plates at once. One body cannot hold both, so two echoes must.
    {
      key: 'r2-hold',
      name: 'ROOM 002',
      title: 'REPETITION',
      objective: 'TWO PLATES, TWO ECHOES, ONE GATE',
      hint: 'An echo cannot take new orders. Plan the whole walk before you leave it.',
      walls: [
        box(0, 0, 40, 2), box(0, 20, 40, 2), box(0, 2, 2, 18), box(38, 2, 2, 18),
        box(20, 2, 1.5, 5), box(20, 15, 1.5, 5),
      ],
      plates: [
        { id: 'a', x: 6.5, y: 6.5 },
        { id: 'b', x: 6.5, y: 14.5 },
      ],
      doors: [{ id: 'exit-gate', x: 20, y: 7, w: 1.5, h: 8, vertical: false, needs: ['a', 'b'] }],
      machines: [],
      exit: { x: 33.5, y: 10.5 },
      start: { x: 13.5, y: 10.5 },
      fragment: 1,
    },
    // ---- ROOM 3: a machine that must be fed for a while, so the echo has to hold it down.
    {
      key: 'r3-overload',
      name: 'ROOM 003',
      title: 'INSTABILITY',
      objective: 'KEEP THE CYCLER FED UNTIL IT FINISHES, THEN LEAVE',
      hint: 'A machine left running with nobody on it will overload and drain stability.',
      walls: [
        box(0, 0, 40, 2), box(0, 20, 40, 2), box(0, 2, 2, 18), box(38, 2, 2, 18),
        box(17, 2, 1.5, 6), box(17, 14, 1.5, 6),
      ],
      plates: [{ id: 'feed', x: 9.5, y: 10.5 }],
      doors: [{ id: 'exit-gate', x: 17, y: 8, w: 1.5, h: 6, vertical: false, needs: ['cycler'] }],
      machines: [{ id: 'cycler', x: 9.5, y: 10.5, plate: 'feed', cycles: 3, cycleTime: 1.8 }],
      exit: { x: 33.5, y: 10.5 },
      start: { x: 13.5, y: 10.5 },
      fragment: 2,
    },
    // ---- ROOM 4: everything, and the memory limit bites — three echoes is all the room keeps.
    {
      key: 'r4-zero',
      name: 'ROOM 004',
      title: 'ZERO',
      objective: 'BOTH PLATES AND THE CORE, WITH EVERY ECHO YOU HAVE',
      hint: 'Three echoes is the limit. The last one you leave is the one you cannot control.',
      walls: [
        box(0, 0, 40, 2), box(0, 20, 40, 2), box(0, 2, 2, 18), box(38, 2, 2, 18),
        box(14, 2, 1.5, 6), box(14, 14, 1.5, 6),
        box(26, 2, 1.5, 6), box(26, 14, 1.5, 6),
      ],
      plates: [
        { id: 'a', x: 7.5, y: 6.5 },
        { id: 'b', x: 7.5, y: 14.5 },
        { id: 'core-plate', x: 20, y: 10.5 },
      ],
      doors: [
        { id: 'exit-gate', x: 26, y: 8, w: 1.5, h: 6, vertical: false, needs: ['core-plate', 'a', 'b'] },
      ],
      machines: [{ id: 'core', x: 20, y: 10.5, plate: 'core-plate', cycles: 2, cycleTime: 2.0 }],
      exit: { x: 34.5, y: 10.5 },
      start: { x: 20, y: 16.5 },
      fragment: 3,
    },
  ],
};

/** Turns the room data into pixel geometry the simulation and the renderer both use. */
export function roomGeometry(room) {
  const walls = room.walls.map((r) => ({
    x: r.x * CELL,
    y: r.y * CELL,
    w: r.w * CELL,
    h: r.h * CELL,
  }));
  const plates = room.plates.map((p) => ({ id: p.id, x: p.x * CELL, y: p.y * CELL, r: 20 }));
  const doors = room.doors.map((d) => ({
    id: d.id,
    x: d.x * CELL,
    y: d.y * CELL,
    w: (d.w ?? 1) * CELL,
    h: (d.h ?? 1) * CELL,
    needs: d.needs ?? [],
    vertical: d.vertical !== false,
    locked: d.locked === true,
  }));
  const machines = room.machines.map((m) => ({
    id: m.id,
    x: m.x * CELL,
    y: m.y * CELL,
    plate: m.plate,
    cycles: m.cycles,
    cycleTime: m.cycleTime,
    manual: m.manual === true,
    need: m.need ?? null,
  }));
  return {
    walls,
    plates,
    doors,
    machines,
    exit: { x: room.exit.x * CELL, y: room.exit.y * CELL, r: 22 },
    start: { x: room.start.x * CELL, y: room.start.y * CELL },
  };
}

export const ROOM_COUNT = SECTOR_ONE.rooms.length;
export const GRID_CELLS = GRID.cols * GRID.rows;
