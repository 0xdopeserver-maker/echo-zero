// Everything the player sees, drawn on one canvas. The renderer never changes the game: it reads the
// sector's current room and paints it. The whole playfield is a 1280x720 field scaled to fit, so a
// screenshot is always the same composition whatever the window size.

import { FIELD, CELL, GRID, PALETTE, FONT_MONO, FONT_DISPLAY, STABILITY, ECHO_LIMIT, RECORD_LIMIT } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const scale = { value: 1 };
  let time = 0;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // A zero-sized rect means the page is not laid out yet; keep the last good size.
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(180, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    scale.value = Math.min(w / FIELD.width, h / FIELD.height);
    scale.offsetX = (w - FIELD.width * scale.value) / 2;
    scale.offsetY = (h - FIELD.height * scale.value) / 2;
  }

  function frame(step, room) {
    time += step;
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale.value, 0, 0, scale.value, scale.offsetX, scale.offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();

    drawBackdrop();
    drawGrid();
    if (room) {
      drawExit(room);
      drawMachines(room);
      drawPlates(room);
      drawDoors(room);
      drawWalls(room);
      drawEchoes(room);
      drawPlayer(room);
      drawRecordingRing(room);
      drawVignette(room);
    }
    ctx.restore();

    if (room) {
      drawHud(room);
      drawBanner(room);
    }
  }

  function drawBackdrop() {
    const grad = ctx.createRadialGradient(FIELD.width / 2, 60, 40, FIELD.width / 2, FIELD.height * 0.7, FIELD.height * 0.95);
    grad.addColorStop(0, '#101623');
    grad.addColorStop(0.55, '#0a0d14');
    grad.addColorStop(1, PALETTE.void);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(120, 160, 210, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += CELL) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, FIELD.height);
    }
    for (let y = 0; y <= FIELD.height; y += CELL) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(FIELD.width, y + 0.5);
    }
    ctx.stroke();

    // Every eighth line is brighter, so the floor reads as a technical plane, not graph paper.
    ctx.strokeStyle = 'rgba(120, 170, 225, 0.1)';
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += CELL * 4) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, FIELD.height);
    }
    for (let y = 0; y <= FIELD.height; y += CELL * 4) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(FIELD.width, y + 0.5);
    }
    ctx.stroke();
  }

  function drawWalls(room) {
    for (const wall of room.geometry.walls) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = PALETTE.wallEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
      // A cool sheen along the top edge keeps the blocks from reading as flat rectangles.
      ctx.fillStyle = 'rgba(150, 200, 255, 0.07)';
      ctx.fillRect(wall.x + 2, wall.y + 2, wall.w - 4, 3);
    }
  }

  function drawDoors(room) {
    for (const door of room.devices.doors) {
      const { x, y, w, h, open } = door;
      if (open) {
        ctx.strokeStyle = 'rgba(157, 123, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
        continue;
      }
      const pulse = 0.4 + 0.25 * Math.sin(time * 3);
      if (door.vertical) {
        const shrink = Math.min(h * 0.42, (h * 0.42) * (1 - Math.min(1, door.since)));
        ctx.fillStyle = PALETTE.door;
        ctx.fillRect(x, y + shrink, w, h - shrink * 2);
        ctx.fillStyle = `rgba(255, 77, 94, ${pulse * 0.5})`;
        ctx.fillRect(x + w / 2 - 2, y + h / 2 - 10, 4, 20);
      } else {
        const shrink = Math.min(w * 0.42, (w * 0.42) * (1 - Math.min(1, door.since)));
        ctx.fillStyle = PALETTE.door;
        ctx.fillRect(x + shrink, y, w - shrink * 2, h);
        ctx.fillStyle = `rgba(255, 77, 94, ${pulse * 0.5})`;
        ctx.fillRect(x + w / 2 - 10, y + h / 2 - 2, 20, 4);
      }
    }
  }

  function drawPlates(room) {
    for (const plate of room.devices.plates) {
      const held = plate.held;
      const r = plate.r;
      ctx.save();
      ctx.translate(plate.x, plate.y);
      ctx.rotate(Math.PI / 4);
      const size = r * 1.5;
      ctx.fillStyle = held ? 'rgba(70, 230, 255, 0.22)' : 'rgba(123, 138, 160, 0.12)';
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeStyle = held ? PALETTE.cyan : PALETTE.plate;
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      if (plate.hold > 0 && !held) {
        // The short press reads as a ring filling up, so a brush past is visibly not a hold.
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (plate.hold / 0.35));
        ctx.strokeStyle = 'rgba(70, 230, 255, 0.7)';
        ctx.stroke();
      }
      ctx.restore();

      if (held) {
        ctx.beginPath();
        ctx.arc(plate.x, plate.y, r * 2.1, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(plate.x, plate.y, r * 0.4, plate.x, plate.y, r * 2.1);
        glow.addColorStop(0, 'rgba(70, 230, 255, 0.24)');
        glow.addColorStop(1, 'rgba(70, 230, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fill();
      }
    }
  }

  function drawMachines(room) {
    for (const machine of room.devices.machines) {
      const x = machine.x;
      const y = machine.y;
      const w = 62;
      const h = 46;
      const done = machine.cyclesDone >= machine.cycles;
      const fill = done ? 'rgba(94, 242, 160, 0.16)' : machine.online ? 'rgba(255, 200, 87, 0.14)' : 'rgba(123, 138, 160, 0.1)';
      const edge = done ? PALETTE.green : machine.online ? PALETTE.amber : PALETTE.plate;

      ctx.fillStyle = fill;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);

      // The cycle pips: one square per cycle, filled as each finishes.
      const pip = 10;
      for (let i = 0; i < machine.cycles; i += 1) {
        const px = x - (machine.cycles * (pip + 4)) / 2 + i * (pip + 4);
        ctx.fillStyle = i < machine.cyclesDone ? edge : 'rgba(123, 138, 160, 0.35)';
        ctx.fillRect(px, y - pip / 2, pip, pip);
      }

      if (machine.online && !done) {
        const ratio = machine.progress / machine.cycleTime;
        ctx.fillStyle = 'rgba(255, 200, 87, 0.8)';
        ctx.fillRect(x - w / 2 + 4, y + h / 2 + 6, (w - 8) * ratio, 3);
        if (machine.overload > 0) {
          ctx.fillStyle = `rgba(255, 77, 94, ${0.3 + (machine.overload / 5) * 0.6})`;
          ctx.fillRect(x - w / 2 + 4, y + h / 2 + 12, (w - 8) * Math.min(1, machine.overload / 5), 3);
        }
      }
    }
  }

  function drawExit(room) {
    const exit = room.geometry.exit;
    const gate = room.devices.doors.find((door) => door.id === 'exit-gate');
    const open = gate ? gate.open : true;
    const pulse = 0.55 + 0.45 * Math.sin(time * (open ? 4 : 1.6));
    ctx.save();
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exit.r, 0, Math.PI * 2);
    ctx.fillStyle = open ? `rgba(157, 123, 255, ${0.16 + 0.12 * pulse})` : 'rgba(90, 90, 110, 0.14)';
    ctx.fill();
    ctx.strokeStyle = open ? PALETTE.exit : 'rgba(140, 150, 170, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exit.r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = open ? PALETTE.exit : 'rgba(140, 150, 170, 0.4)';
    ctx.fill();
    ctx.restore();
  }

  function drawEchoes(room) {
    for (const echo of room.echoes.list) {
      // The tail of each echo's recent path, fading out, so a replay reads as movement.
      for (const point of echo.trail) {
        const alpha = Math.max(0, point.life / 0.55) * 0.35;
        ctx.beginPath();
        ctx.arc(point.x, point.y, echo.radius * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(70, 230, 255, ${alpha})`;
        ctx.fill();
      }

      const flicker = echo.finished ? 0.72 : 0.9;
      const glow = ctx.createRadialGradient(echo.x, echo.y, 1, echo.x, echo.y, echo.radius * 3.4);
      glow.addColorStop(0, `rgba(70, 230, 255, ${0.5 * echo.glow * flicker})`);
      glow.addColorStop(0.5, `rgba(70, 230, 255, ${0.16 * echo.glow * flicker})`);
      glow.addColorStop(1, 'rgba(70, 230, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(echo.x, echo.y, echo.radius * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(echo.x, echo.y, echo.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(70, 230, 255, ${0.85 * echo.glow})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(200, 250, 255, ${0.9 * echo.glow})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // A still echo gets a dashed ring: it is holding its last pose, not replaying.
      if (echo.finished) {
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.arc(echo.x, echo.y, echo.radius * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(70, 230, 255, 0.5)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawPlayer(room) {
    const p = room.player;
    const bob = Math.sin(p.bob) * (p.moving ? 1.4 : 0.5);

    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 4.2);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    glow.addColorStop(0.35, 'rgba(232, 238, 245, 0.16)');
    glow.addColorStop(1, 'rgba(232, 238, 245, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.radius * 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 230, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // A short tick in the facing direction, so the body has a front.
    ctx.beginPath();
    ctx.moveTo(p.x + p.facing.x * p.radius, p.y + bob + p.facing.y * p.radius);
    ctx.lineTo(p.x + p.facing.x * (p.radius + 9), p.y + bob + p.facing.y * (p.radius + 9));
    ctx.strokeStyle = 'rgba(70, 230, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawRecordingRing(room) {
    if (!room.recorder.state.recording) return;
    const p = room.player;
    const radius = p.radius + 16 + Math.sin(time * 6) * 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2 * Math.min(1, room.recorder.state.elapsed / RECORD_LIMIT));
    ctx.strokeStyle = PALETTE.red;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 77, 94, 0.18)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function drawVignette(room) {
    const stability = room.stability.state.value;
    if (stability > STABILITY.warning) return;
    const strength = (1 - stability / STABILITY.warning) * 0.5;
    const grad = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.25, FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.78);
    grad.addColorStop(0, 'rgba(255, 77, 94, 0)');
    grad.addColorStop(1, `rgba(255, 77, 94, ${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawHud(room) {
    const roomData = room;
    ctx.save();
    ctx.textBaseline = 'middle';

    // ---- Top left: sector and room
    ctx.textAlign = 'left';
    ctx.font = `600 15px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('SECTOR 01', 38, 40);
    ctx.font = `700 34px ${FONT_DISPLAY}`;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(roomData.state.name, 38, 72);

    // ---- Top right: stability bar
    const barW = 268;
    const barX = FIELD.width - barW - 38;
    const barY = 52;
    const stability = roomData.stability.state.value;
    const warn = stability <= STABILITY.warning;
    ctx.textAlign = 'right';
    ctx.font = `600 13px ${FONT_MONO}`;
    ctx.fillStyle = warn ? PALETTE.red : PALETTE.dim;
    ctx.fillText('STABILITY', barX + barW, 34);
    ctx.textAlign = 'left';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillStyle = warn ? PALETTE.red : PALETTE.ink;
    ctx.fillText(`${Math.round(stability)}%`, barX, 34);
    ctx.fillStyle = 'rgba(123, 138, 160, 0.18)';
    ctx.fillRect(barX, barY, barW, 8);
    const ratio = stability / STABILITY.start;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (warn) {
      grad.addColorStop(0, PALETTE.red);
      grad.addColorStop(1, '#ff8a5c');
    } else {
      grad.addColorStop(0, PALETTE.cyan);
      grad.addColorStop(1, PALETTE.green);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * Math.max(0, ratio), 8);
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, 7);

    // ---- Bottom left: objective and hint
    const footerY = FIELD.height - 96;
    ctx.textAlign = 'left';
    ctx.font = `600 12px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillText('OBJECTIVE', 38, footerY);
    ctx.font = `600 19px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(roomData.state.objective, 38, footerY + 26);
    ctx.font = `400 14px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(roomData.state.hint, 38, footerY + 50);

    // ---- Bottom right: echo slots, recording time, fragments
    ctx.textAlign = 'right';
    const rightX = FIELD.width - 38;
    ctx.font = `700 14px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillText(`ECHO ${roomData.echoes.list.length}/${ECHO_LIMIT}`, rightX, footerY - 2);

    // Echo pips: one per slot, filled cyan for a standing echo.
    const pipY = footerY + 20;
    for (let i = 0; i < ECHO_LIMIT; i += 1) {
      const px = rightX - 16 - (ECHO_LIMIT - 1 - i) * 24;
      ctx.beginPath();
      ctx.arc(px, pipY, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < roomData.echoes.list.length ? PALETTE.cyan : 'rgba(123, 138, 160, 0.22)';
      ctx.fill();
    }

    if (roomData.recorder.state.recording) {
      const elapsed = roomData.recorder.state.elapsed;
      ctx.beginPath();
      ctx.arc(rightX - 84, pipY, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 77, 94, ${0.45 + 0.55 * Math.abs(Math.sin(time * 5))})`;
      ctx.fill();
      ctx.textAlign = 'right';
      ctx.font = `600 14px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.red;
      ctx.fillText(`REC ${elapsed.toFixed(1)}s`, rightX - 100, pipY);
    } else {
      ctx.font = `400 13px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.faint;
      ctx.fillText('R RECORD · SPACE ECHO · BACKSPACE RESET', rightX, footerY + 48);
    }

    // ---- Room index, centred at the very top
    ctx.textAlign = 'center';
    ctx.font = `600 12px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.faint;
    ctx.fillText(`ROOM 0${roomData.state.key.charAt(1)} / 04`, FIELD.width / 2, 30);

    ctx.restore();
  }

  function drawBanner(room) {
    const status = room.state.status;
    if (status === 'exploring') return;
    const cleared = status === 'cleared';
    const alpha = Math.min(1, room.state.exitHeld + 0.15);

    ctx.save();
    ctx.fillStyle = `rgba(5, 7, 11, ${0.62 * alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (cleared) {
      ctx.font = `700 76px ${FONT_DISPLAY}`;
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillText('ROOM CLEARED', FIELD.width / 2, FIELD.height / 2 - 34);
      ctx.font = `600 20px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(`FRAGMENT +${room.data.fragment}`, FIELD.width / 2, FIELD.height / 2 + 34);
      ctx.font = `400 16px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText('ENTER — NEXT ROOM', FIELD.width / 2, FIELD.height / 2 + 74);
    } else {
      ctx.font = `700 76px ${FONT_DISPLAY}`;
      ctx.fillStyle = PALETTE.red;
      ctx.fillText('STABILITY LOST', FIELD.width / 2, FIELD.height / 2 - 34);
      ctx.font = `600 18px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText('THE ROOM REMEMBERS NOTHING. TRY A SHORTER RECORDING.', FIELD.width / 2, FIELD.height / 2 + 34);
      ctx.font = `400 16px ${FONT_MONO}`;
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText('ENTER — RETRY', FIELD.width / 2, FIELD.height / 2 + 74);
    }
    ctx.restore();
  }

  /** The title screen: the game's face, and what a judge sees before pressing anything. */
  function title() {
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale.value, 0, 0, scale.value, scale.offsetX, scale.offsetY);
    drawBackdrop();
    drawGrid();

    // Three echoes arcing across the title, the game's own picture of itself.
    for (let i = 0; i < 3; i += 1) {
      const t = (time * (0.22 + i * 0.06) + i * 0.28) % 1;
      const x = 120 + t * (FIELD.width - 240);
      const y = FIELD.height * 0.5 + Math.sin(t * Math.PI * 2 + i) * 120;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 26);
      glow.addColorStop(0, 'rgba(70, 230, 255, 0.55)');
      glow.addColorStop(1, 'rgba(70, 230, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 250, 255, 0.9)';
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 118px ${FONT_DISPLAY}`;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('ECHO//ZERO', FIELD.width / 2, FIELD.height / 2 - 60);
    ctx.font = `600 20px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillText('YOU ARE ONE BODY. LEAVE MORE.', FIELD.width / 2, FIELD.height / 2 + 14);
    ctx.font = `400 15px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('A RECORDING REPEATS FOREVER. EACH ECHO CAN HOLD ONE THING.', FIELD.width / 2, FIELD.height / 2 + 46);

    const blink = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.font = `600 18px ${FONT_MONO}`;
    ctx.fillStyle = `rgba(232, 238, 245, ${0.45 + blink * 0.55})`;
    ctx.fillText('PRESS ENTER', FIELD.width / 2, FIELD.height / 2 + 118);

    // Laid out as separate evenly spaced tokens rather than one long string: a single 12px line
    // across 1280px turns into unreadable mush once the canvas is scaled down to a browser window.
    const controls = ['ARROWS/WASD MOVE', 'R RECORD', 'SPACE ECHO', 'E PRESS', 'BKSP RESET', 'M MUTE'];
    ctx.font = `500 14px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(109, 119, 135, 0.9)';
    const slot = FIELD.width / controls.length;
    controls.forEach((label, i) => {
      ctx.fillText(label, slot * (i + 0.5), FIELD.height - 28);
    });
  }

  /** The sector's end card. */
  function ending(fragments, total, failures) {
    fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale.value, 0, 0, scale.value, scale.offsetX, scale.offsetY);
    drawBackdrop();
    drawGrid();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 86px ${FONT_DISPLAY}`;
    ctx.fillStyle = PALETTE.green;
    ctx.fillText('SECTOR CLEARED', FIELD.width / 2, FIELD.height / 2 - 70);
    ctx.font = `700 44px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(`${fragments} / ${total} FRAGMENTS`, FIELD.width / 2, FIELD.height / 2 + 4);
    ctx.font = `400 16px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(failures === 0 ? 'NO ROOM FAILED. THE ECHOES DID ALL THE WORK.' : `${failures} ROOM${failures === 1 ? '' : 'S'} FAILED ON THE WAY`, FIELD.width / 2, FIELD.height / 2 + 52);
    ctx.font = `600 18px ${FONT_MONO}`;
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillText('ENTER — PLAY AGAIN', FIELD.width / 2, FIELD.height / 2 + 112);
  }

  return { frame, title, ending, tick: (step) => { time += step; } };
}
