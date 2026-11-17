// The recorder: while it runs it samples the player's body once a step into a track of positions and
// interactions. Playback reads the track back by index, so a room replays it exactly, never by
// guessing at a clock. It replays its recorded body once and then stands still at its last sample,
// which is what lets an echo hold a plate for good.

export function createRecorder() {
  const state = {
    recording: false,
    elapsed: 0,
    frames: [],
    lastInteraction: 0,
  };

  /** Starts a fresh track. Recording over an old one throws it away, as the room intends. */
  function begin() {
    state.recording = true;
    state.elapsed = 0;
    state.frames = [];
    state.lastInteraction = 0;
  }

  /** Stops the track and returns it, or null when nothing was recorded. */
  function finish() {
    state.recording = false;
    if (state.frames.length === 0) return null;
    return { frames: state.frames, duration: state.elapsed, interactions: state.lastInteraction };
  }

  /** Cancels a run in progress without producing a track. */
  function cancel() {
    state.recording = false;
    state.elapsed = 0;
    state.frames = [];
    state.lastInteraction = 0;
  }

  /** Records one sample of the player's body; `interacted` marks a frame that pressed something. */
  function sample(step, player, interacted) {
    if (!state.recording) return;
    state.elapsed += step;
    if (interacted) state.lastInteraction = state.frames.length;
    state.frames.push({
      x: Math.round(player.x * 100) / 100,
      y: Math.round(player.y * 100) / 100,
      fx: player.facing.x,
      fy: player.facing.y,
      k: interacted ? 1 : 0,
    });
  }

  return { state, begin, finish, cancel, sample };
}
