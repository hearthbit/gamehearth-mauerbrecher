# Mauerbrecher

Mauerbrecher (brick breaker) is a single-player game for Gamehearth, the self-hosted game platform. You play alone on the phone (portrait) or on the computer, even without a connection to the server; the platform keeps your save and your best score.

## Rules

### Goal

At the bottom there is a paddle, at the top a wall of bricks. A ball bounces off the paddle and smashes the bricks. Once all bricks that can break are gone, the level is done. There are 10 levels; whoever clears level 10 has won.

### Controls

| What | On the phone | With the keyboard |
|---|---|---|
| Move the paddle | put your finger anywhere on the field and drag left or right; the paddle makes the same movement | hold the left and right arrow keys (or A and D) |
| Launch the ball | tap briefly | space bar (or up arrow, W) |
| Pause | "Pause" button at the top right | P or Esc (press again to keep playing) |

At the start of every level and after every lost ball, the ball lies on the paddle and waits until you launch it. Depending on where the ball hits the paddle, it flies back: in the middle straight up, at the edge at an angle to the side. That way you can aim.

### Bricks

| Color | still needs |
|---|---|
| green | 1 hit |
| yellow | 2 hits |
| red | 3 hits |
| gray | does not break |

A damaged brick changes its color: a red one turns yellow after the first hit, then green, then it is gone. Gray bricks are in the way but don't count: a level is done as soon as only gray bricks are left.

### Points

Every hit on a brick that can break gives 10 points. So a green brick gives 10, a yellow one 20 in total, a red one 30 in total. Gray bricks give nothing. The points carry on across all levels.

### Extras

From roughly every seventh brick that breaks, an extra slowly falls down. If you catch it with the paddle, it takes effect; if it falls past, it is gone.

| Extra | Color | what it does |
|---|---|---|
| WIDE ("BREIT") | green | the paddle is one and a half times as wide for 20 seconds |
| +BALL | orange | an additional ball starts from the paddle; at most 3 balls are in play at the same time |
| SLOW ("LANGSAM") | purple | all balls fly much slower for 15 seconds |

How long WIDE and SLOW still last is shown at the top right of the field. If you catch the same extra again, its time starts over.

### Lives and end of the game

- You have 3 lives, shown as hearts in the bar at the top.
- If a ball falls out at the bottom while another one is still in play, nothing else happens.
- If the last ball falls out, a life is gone. Running and falling extras end, and a new ball lies on the paddle.
- Once the last life is gone, the game is over.
- There are no extra lives; you take the remaining lives into the next level.
- Every level is a little faster than the previous one.

### Leaderboard

The points go into the leaderboard; more is better. The points are reported when a level is done, when the game is over, after the win and when you abort a running game with "New game" ("Neues Spiel"). The platform always keeps the best value of these.

### Stopping and continuing

- You can stop at any time, even in the middle of a level. On the next start the menu shows "Continue" ("Weiterspielen"), and it continues exactly where you left off: the same level, the same points and lives, exactly the bricks that are still standing (damaged ones stay damaged), the balls at the same place and in the same direction, the paddle in its place, running extras with their remaining time and extras that are falling right now.
- So a ball that was already below the paddle when you stopped also falls out after you come back.
- If a level changes while someone has stopped in it (see "Changing levels"), that level starts over when continuing; points and lives stay.
- The game saves after destroyed bricks (at most once per second), after a lost ball, after every level, when pausing and when you leave the app, each time only if something has changed.
- If you leave the app or switch to another window, the game pauses by itself.
- "New game" asks first before a running game is lost.
- After the end of the game and after the win, the next game starts at level 1 again.

### Sound

The game has sounds, but they stay off until you turn on the sound switch ("Ton" / "Sound") in the menu of the game page; on an iPhone the ringer switch must be on too. Nothing in the game can only be heard.

| When | Sound |
|---|---|
| the ball bounces off a wall, the ceiling or a gray brick | a soft knock |
| the ball hits the paddle | a short beep |
| a brick takes a hit and stays | a higher beep |
| a brick breaks | a rising chirp |
| you catch an extra | a coin |
| the last ball falls out and a life is gone | a falling whistle |
| a level is done | a short jingle |
| level 10 is done, you won | a fanfare |
| the game is over | a sad melody |
| the game is over with your best score | a bright fanfare instead of the sad melody |

Every contact makes one sound, not a long buzz. When a lot happens at the same moment, only the most important sound plays.

### Decided by the agent, please check

These points were not in the description; I decided them this way. If something should be different, just say so:

- The paddle follows the movement of the finger, not its position. So you can put your finger anywhere and don't cover the ball.
- Points are given per hit (10), not per whole brick. There is no extra bonus for cleared levels.
- Extras fall from about 15% of the broken bricks, at most 3 at the same time. WIDE lasts 20 seconds, SLOW 15 seconds (balls 40% slower).
- If a ball flies around for 12 seconds without touching the paddle or a breakable brick (for example between gray bricks), it gets a small nudge in a new direction, so that nothing gets stuck.
- Which sound plays when (see "Sound"). After the win the fanfare for the win plays, also with a new best score. When balls rattle a lot (for example three balls between gray bricks), collision sounds are thinned out: at most 8 per second and at least 0.08 seconds apart, at most 10 sounds per second in total. That keeps it from rattling and stays below the platform's limit of 12 sounds per second.

## Languages

German (the default) and English. The platform picks the language of each device; in `npm run dev` the selector at the top switches it. Points are written the way the language does it: 12.340 in German, 12,340 in English.

## Cover

The cover is pixel art in 4:3, `client/public/cover.svg` (CC0). The platform shows it for the game, for example in the game list.

## Try it out

You need Node 22 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5180. The game is shown there in a phone frame, below it the save and the best scores to look at and delete. With `npm run dev -- --host` it also works with a real phone on the Wi-Fi.

## Changing levels

The 10 levels are text grids in `src/levels.ts`, each row exactly 10 characters, at most 12 rows: `.` empty, `1` green, `2` yellow, `3` red, `#` gray. The tests check that every breakable brick can be reached by the ball and that a computer player clears every level.

## Layout

| Path | Content |
|---|---|
| `src/levels.ts` | the 10 levels as text grids and their check |
| `src/play.ts` | all of the movement without Phaser: ball, paddle, bricks, extras, lives, level done; one step per frame (`step`) |
| `src/rules.ts` | reading and writing the save (`readSave`, `runAt`, `afterLevel`), points per hit |
| `client/src/main.ts` | connects the game to the platform (`connectSolo`), menu, saving and reporting the points |
| `client/src/scene.ts` | draws the world from `src/play.ts` with Phaser 4 (no Phaser physics) |
| `client/src/controls.ts` | finger dragging and tapping on the field, arrow keys, A/D, space bar, P/Esc |
| `client/src/view.ts` | menus, points and keys without Phaser and without a browser |
| `client/src/sounds.ts` | which sound plays when, and how many per second, without Phaser and without a browser |
| `client/src/texts.ts` | every text of the game, in German and English |
| `client/public/cover.svg` | the cover; the build copies it into the client folder |
| `test/` | tests for levels, movement, save, texts and sounds; a computer player clears every level |

The table in `AGENTS.md` describes the template's example, not this game; this one here is authoritative.

## Develop

This game is easy to build on with an AI agent (Claude Code, Cursor, Copilot …). The instructions for the agent are in [AGENTS.md](AGENTS.md).

| Command | What it does |
|---|---|
| `npm run dev` | starts the game locally in the browser, with a view of the save and the best scores |
| `npm test` | tests |
| `npm run typecheck` | type check |
| `npm run check` | checks the game like the platform does; enters new best score names in `ids.lock` (belongs in the repo) |
| `npm run pack` | builds the game package for a catalog |

## License

Code under MIT, graphics under CC0 (see [LICENSE](LICENSE) and `manifest.json`).
