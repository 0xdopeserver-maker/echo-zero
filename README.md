# echo-zero

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/0xdopeserver-maker/echo-zero/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/0xdopeserver-maker/echo-zero/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

ECHO//ZERO is a top-down puzzle game where you are one body that can leave recordings of itself. Press R to record a path, walk it, press Space to leave it behind as an echo that repeats that path forever, then take your real body somewhere else. Each echo can hold exactly one thing — one pressure plate, one machine feed, one core — so every room is a question about what your past selves are for, and the last echo you leave is the one you can no longer steer.

Four rooms teach it in order: one plate, two plates, a timed cycler that needs a body standing still on its feed, and a final room that needs both plates and the core held at once with three echoes and no body to spare. Stability drains while a room is unsolved; losing it costs the room, not the sector's banked fragments, and Enter retries. Clear all four and you bank 7/7 fragments.

Plain canvas 2D, no libraries, no network, no build step — 15 ES modules served as static files. Screenshot-stable composition at 1280×720 whatever the window size.

## Run it

```sh
node serve.ts --port 8080
# then open http://localhost:8080
```

To build the submission output (game/, screenshots/ and dossier.json):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Controls: arrows or WASD to move, R to record, Space to leave an echo, E to press, Backspace to reset the room, Enter to advance, M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
