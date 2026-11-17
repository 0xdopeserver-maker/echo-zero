// Every tuning number, colour and text in ECHO//ZERO. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation runs at a fixed 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The grid each room is drawn on: 32 pixel cells, 40 by 22 of them. */
export const CELL = 32;
export const GRID = { cols: 40, rows: 22 };

export const PLAYER = {
  radius: 11,
  speed: 210,
  reach: 42,
};

/** Seconds a recording may run before it stops itself; the HUD shows the count down. */
export const RECORD_LIMIT = 8;

/** The most echoes a room holds at once, and the most the memory can keep in total. */
export const ECHO_LIMIT = 3;

export const ECHO = {
  radius: 9,
  /** How far one echo has to be from another for the two to disturb each other. */
  interferenceDist: 26,
  /** Stability lost per second while two echoes interfere. */
  interferenceDrain: 9,
  /** Stability lost per second while one echo stands inside another's recorded body. */
  overlapDrain: 6,
  /** A touch of glow left behind by an echo's path, in seconds. */
  trailFade: 0.55,
};

export const STABILITY = {
  start: 100,
  /** Stability a finished room restores, up to the cap. */
  restoreOnClear: 18,
  /** Below this the room tints red and a low tone plays. */
  warning: 35,
};

export const MACHINE = {
  /** Seconds a machine may run overloaded before the room fails. */
  overloadGrace: 5,
  /** Stability lost per second while a machine is overloaded. */
  overloadDrain: 7,
};

export const PLATE = {
  /** The plate has to stand held this long before it counts as pressed. */
  holdTime: 0.35,
};

export const RECORD = {
  /** Recording is sampled this many times a second, so playback is byte-for-byte repeatable. */
  sampleRate: 60,
};

export const PALETTE = {
  void: '#07080b',
  floor: '#0b0e14',
  floorAlt: '#0e121a',
  wall: '#1b2230',
  wallEdge: '#2b3648',
  ink: '#e8eef5',
  dim: '#6d7787',
  faint: '#39424f',
  cyan: '#46e6ff',
  cyanSoft: 'rgba(70, 230, 255, 0.16)',
  red: '#ff4d5e',
  redSoft: 'rgba(255, 77, 94, 0.18)',
  amber: '#ffc857',
  green: '#5ef2a0',
  plate: '#7b8aa0',
  door: '#3a2b52',
  exit: '#9d7bff',
};

export const FONT_MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best run is kept between visits (this browser only). */
export const BEST_KEY = 'echo-zero.best';

/** Sound is synthesised, never loaded: every tone is a few oscillator seconds at most. */
export const AUDIO = {
  master: 0.22,
  tone: { record: 520, echo: 720, plate: 420, door: 260, clear: 880, fail: 120, warn: 190 },
};
