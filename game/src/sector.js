// The sector: which room is being played, how many fragments are banked, and what happens when a
// room is cleared or fails. A failed room only costs the room: the sector remembers every fragment.

import { SECTOR_ONE } from './rooms.js';
import { createRoom, ROOM_CLEARED } from './room.js';

export { ROOM_EXPLORING, ROOM_CLEARED, ROOM_FAILED } from './room.js';

export function createSector() {
  const sector = {
    name: SECTOR_ONE.name,
    index: 0,
    fragments: 0,
    totalFragments: SECTOR_ONE.rooms.reduce((sum, room) => sum + room.fragment, 0),
    cleared: new Set(),
    room: null,
    finished: false,
    failures: 0,
  };

  function load(index) {
    sector.index = Math.max(0, Math.min(SECTOR_ONE.rooms.length - 1, index));
    sector.room = createRoom(SECTOR_ONE.rooms[sector.index]);
  }

  /** Banks the room's fragment the first time only, then moves the sector to the next room. */
  function advance() {
    const room = sector.room;
    const first = room.state.status === ROOM_CLEARED && !sector.cleared.has(room.state.key);
    if (first) {
      sector.cleared.add(room.state.key);
      sector.fragments += room.data.fragment;
    }
    if (sector.index + 1 < SECTOR_ONE.rooms.length) {
      load(sector.index + 1);
      return { moved: true, first };
    }
    sector.finished = true;
    return { moved: false, first };
  }

  /** Puts the current room back to its first state and counts the failure on the sector. */
  function retry() {
    sector.failures += 1;
    sector.room.reset();
  }

  /** Restarts the whole sector from room one, keeping nothing. */
  function restart() {
    sector.fragments = 0;
    sector.cleared.clear();
    sector.finished = false;
    sector.failures = 0;
    load(0);
  }

  load(0);
  return { sector, load, advance, retry, restart };
}
