// The room's machinery: plates that stay pressed while a body stands on them, doors that open on
// the plates they name, and machines that run a cycle at a time and overload when left running
// with no body to feed them. Everything here is a pure function of who stands where this step.

import { PLATE, MACHINE } from './config.js';

/** True when a body is close enough to a plate to hold it down. */
function bodyOnPlate(body, plate) {
  const dx = body.x - plate.x;
  const dy = body.y - plate.y;
  const reach = plate.r + body.radius * 0.4;
  return dx * dx + dy * dy <= reach * reach;
}

export function createDevices(geometry) {
  const plates = geometry.plates.map((p) => ({ ...p, held: false, hold: 0, holders: 0 }));
  const doors = geometry.doors.map((d) => ({ ...d, open: false, since: 0 }));
  const machines = geometry.machines.map((m) => ({
    ...m,
    running: false,
    progress: 0,
    cyclesDone: 0,
    overload: 0,
    online: false,
    manualHeld: false,
  }));

  /** Every body in the room this step, the player's and each echo's. */
  function bodies(player, echoes, interactSeen) {
    const list = [{ x: player.x, y: player.y, radius: player.radius, kind: 'player', interacting: interactSeen }];
    for (const echo of echoes) {
      list.push({ x: echo.x, y: echo.y, radius: echo.radius, kind: 'echo', interacting: echo.interacting, echo });
    }
    return list;
  }

  /** Works out this step's held plates, open doors and machine progress. */
  function update(step, player, echoes, interactSeen) {
    const all = bodies(player, echoes, interactSeen);

    for (const plate of plates) {
      plate.holders = 0;
      let touched = false;
      for (const body of all) {
        if (!bodyOnPlate(body, plate)) continue;
        plate.holders += 1;
        touched = true;
      }
      // The plate stands held only after a short press, so a brush past cannot open a door.
      plate.hold = touched ? Math.min(PLATE.holdTime, plate.hold + step) : 0;
      plate.held = plate.hold >= PLATE.holdTime;
    }

    const plateHeld = Object.fromEntries(plates.map((p) => [p.id, p.held]));

    for (const machine of machines) {
      const feedPlate = plateHeld[machine.plate] === true;
      machine.manualHeld = all.some(
        (body) => body.kind === 'player' && body.interacting && near(machine, body),
      );
      machine.running = feedPlate || machine.manualHeld || machine.online;
      if (machine.cyclesDone < machine.cycles) {
        machine.online = true;
      }
      if (machine.online) {
        machine.progress += step;
        if (machine.progress >= machine.cycleTime) {
          machine.progress -= machine.cycleTime;
          machine.cyclesDone += 1;
        }
      }
      if (machine.cyclesDone >= machine.cycles) {
        machine.online = false;
        machine.running = false;
      }
      // A machine online with nobody feeding it is overloaded, and overload eats stability.
      const fed = feedPlate || machine.manualHeld;
      if (machine.online && !fed) {
        machine.overload = Math.min(MACHINE.overloadGrace, machine.overload + step);
        machine.running = true;
      } else {
        machine.overload = Math.max(0, machine.overload - step * 0.45);
      }
    }

    const machineDone = Object.fromEntries(machines.map((m) => [m.id, m.cyclesDone >= m.cycles]));

    for (const door of doors) {
      const needs = door.needs ?? [];
      // A need may name a plate or a machine: the gate opens on held plates and finished cycles.
      let open = needs.every((need) => plateHeld[need] === true || machineDone[need] === true);
      door.since = open ? door.since + step : 0;
      door.open = open;
    }

    return { plateHeld, machineDone };
  }

  /** True when the body stands on a plate it has not already been recorded pressing. */
  function plateUnder(body) {
    return plates.find((plate) => bodyOnPlate(body, plate)) ?? null;
  }

  /** True when an interaction means something where the body stands. */
  function interactTargetAt(body) {
    for (const machine of machines) {
      if (machine.manual && near(machine, body)) return machine;
    }
    return null;
  }

  function near(machine, body) {
    const dx = machine.x - body.x;
    const dy = machine.y - body.y;
    const reach = body.radius + 46;
    return dx * dx + dy * dy <= reach * reach;
  }

  function reset() {
    for (const plate of plates) {
      plate.held = false;
      plate.hold = 0;
      plate.holders = 0;
    }
    for (const door of doors) {
      door.open = false;
      door.since = 0;
    }
    for (const machine of machines) {
      machine.running = false;
      machine.progress = 0;
      machine.cyclesDone = 0;
      machine.overload = 0;
      machine.online = false;
      machine.manualHeld = false;
    }
  }

  return { plates, doors, machines, update, plateUnder, interactTargetAt, reset };
}
