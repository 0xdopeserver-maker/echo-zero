// The body the player drives: a soft point of light that slides along walls. It knows only how to
// move and where it stands; whether it is recording, or what it touches, is the room's business.

import { PLAYER } from './config.js';
import { slideCircle } from './collision.js';

export function createPlayer(geometry) {
  const player = {
    x: geometry.start.x,
    y: geometry.start.y,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    facing: { x: 0, y: 1 },
    moving: false,
    bob: 0,
  };

  /** Moves by the movement vector for one step, sliding along whatever it meets. */
  function move(direction, step, solids) {
    if (direction.x === 0 && direction.y === 0) {
      player.moving = false;
      return;
    }
    player.moving = true;
    player.facing = direction;
    player.bob += step * 9;
    const to = {
      x: player.x + direction.x * player.speed * step,
      y: player.y + direction.y * player.speed * step,
    };
    const after = slideCircle(solids, player, to, player.radius);
    player.x = after.x;
    player.y = after.y;
  }

  /** Puts the body back where the room starts, with nothing carried over. */
  function reset(to) {
    player.x = to.x;
    player.y = to.y;
    player.facing = { x: 0, y: 1 };
    player.moving = false;
    player.bob = 0;
  }

  return { player, move, reset };
}
