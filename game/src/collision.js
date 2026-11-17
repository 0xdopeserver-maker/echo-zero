// The solids of a room: its walls and every door that is still shut. The player and the echoes ask
// this module whether a circle may stand where it wants to, so walls and doors can never disagree.

/** The axis-aligned rectangles a circle of the given radius collides with, doors included. */
export function solidsOf(geometry, doorState) {
  const solids = geometry.walls.slice();
  for (const door of geometry.doors) {
    if (doorState[door.id] === true) continue;
    solids.push({ x: door.x, y: door.y, w: door.w, h: door.h });
  }
  return solids;
}

/** True when a circle at (x, y) touches any of the solid rectangles. */
export function hitsSolid(solids, x, y, radius) {
  for (const s of solids) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/**
 * Slides a circle from where it stands to where it wants to be: each axis is tried on its own, so a
 * body stopped by a wall keeps moving along it instead of sticking. Returns the position reached.
 */
export function slideCircle(solids, from, to, radius) {
  let x = from.x;
  let y = from.y;
  if (!hitsSolid(solids, to.x, y, radius)) x = to.x;
  if (!hitsSolid(solids, x, to.y, radius)) y = to.y;
  return { x, y };
}
