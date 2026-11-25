# Instructions for AI agents

This repo is a single-player game for **Gamehearth**, a self-hosted game platform. It runs entirely in the browser, with its own game loop and optionally Phaser physics; there is no server that computes the rules. From the platform the game gets only two things: a **save** to continue playing and **best scores** for the leaderboard. It is played without a room and also offline. Here you build a game together with a person. Read this whole file before you change anything.

## Who you work with

The person probably can't program. They know their game, not the code.

- Talk to the person in the language they write in, and write the whole `README.md` in it. The game speaks the person's language first and English second; for an English-speaking person only English. Deviate only if the person wants it. Everything players read comes in every language of the game: all texts in the game (also the hidden labels for screen readers) and `name`, `description` and every `label` in `manifest.json` (see "Languages"). Code, identifiers, IDs, comments and tests are in English. Labels this file quotes from the example (such as a button group name) change with the language of your game.
- Talk about the game, not about code. Ask what should happen ("What happens when the ball falls out at the bottom?"), not how it is built.
- Settle the rules completely before you build them: controls on the phone and with the keyboard, goal, levels or endless, lives, when the game is over, what counts as the best score (higher or lower is better), what should be kept when continuing. Write the rules in everyday language in `README.md` and have them confirmed.
- Work in small steps and show something to try out after each step (`npm run dev`, see below). Say in one sentence what changed and what the person should try.
- Use technical terms only with an explanation. Translate error messages into one sentence about what is wrong and what you do about it.
- If the person is not available right now, decide open points sensibly yourself and write them into `README.md` under "Decided by the agent, please check" (in the README's language) so they can confirm or change them later.
- Before the first release, ask about the license and the name (see "Publishing").

## Layout

| Path | Content |
|---|---|
| `manifest.json` | name, version, languages, cover, best scores (`stats`), license of the game |
| `src/levels.ts` | the levels as text grids and their check (start, mushrooms, reachability) |
| `src/rules.ts` | the rules without Phaser: read the save, start a run, level done, best time |
| `client/src/main.ts` | connects the game to the platform (`connectSolo`), starts Phaser and the menu |
| `client/src/scene.ts` | the level in Phaser 4 with arcade physics: walls, character, mushrooms, time |
| `client/src/controls.ts` | d-pad and keyboard |
| `client/src/view.ts` | everything the UI decides, without Phaser and without a browser (no `document`, no `HTMLElement`; texts, menu, time format, steering); the tests and `npm run typecheck` check it without a DOM |
| `client/src/texts.ts` | every text of the game, one block per language |
| `client/index.html` | field, d-pad and the menu as HTML |
| `client/public/cover.svg` | the cover of the game (4:3); the build copies `client/public/` into the client folder |
| `test/` | tests for levels, rules and UI logic (Vitest) |
| `dist/client/` | the built UI (created by `npm run build`, do not change by hand) |

The table describes the example. Describe the layout of your game in `README.md` (section "Layout", in the README's language) as soon as it differs; this file stays as it is.

The template contains a small example game, **Mushroom Hunt**: a character runs through 3 mazes and collects all mushrooms, the total time is the best score. It shows the most important patterns. Replace it completely with the person's game (see "Replacing the example").

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | starts the game locally at http://localhost:5180, below it the save and the best scores |
| `npm test` | tests |
| `npm run typecheck` | type check of rules and UI |
| `npm run check` | checks the game like the platform does: manifest including `stats`, license, built UI and the source for things that fail in the isolated frame. It does not play by itself; that is what your tests are for |
| `npm run pack` | builds the game package `dist/<id>-<version>.zip`, only if `check` reports no errors |

`npm run dev` runs until it is stopped. Start it in the background and read its output: the address is there (usually http://localhost:5180; if the port is taken, for example because `dev` is already running, a different one), and errors from the UI show up there as a block of text you can fix directly. If a `dev` is already running for this game, keep using it instead of starting a second one. When the UI changes, `dev` rebuilds and reloads the frame. Stop `dev` at the end together with its child processes (on Windows, for example `taskkill /T /F` on the process at the port from the output).

**Save in `dev`.** `dev` stores the save and the best scores in `.gamehearth/dev-save.json` in the game folder (listed in `.gitignore`). The file has the form `{ "saved": <save or null>, "best": { "<name>": <value> } }` and is created on the first save; you may also create it yourself. The page shows both below the game, with "Delete save", "Delete best scores" and "Reload". To check a specific spot (for example Level 3), write the matching save into the file and reload the game. A best score the manifest does not know and an invalid save show up as errors on the page and in the terminal.

### Checking the UI

In `dev` the game runs as isolated as on the platform: in a sandbox iframe without its own origin, also at `/p1`. Some built-in browsers of AI tools do not load such iframes (for example the browser pane of the Claude app: the frame stays empty, the requests fail with `net::ERR_BLOCKED_BY_CLIENT`). There the code does not run at all; a terminal without errors then proves nothing. What helps:

- If you have Playwright or a remote-controlled Chrome, operate the page yourself. With Playwright you reach the game with `page.locator(".seat").frameLocator("iframe")`; the menu consists of real buttons (`getByRole("button", { name: "Start game" })`), you steer with the arrow keys after clicking into the game once. Via the Chrome DevTools protocol isolated frames are missing from `Page.getFrameTree`; you reach them with `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false })`. Playwright does not belong in the game's `package.json`: install it in a separate folder outside the game (`npm i playwright-core` there) and launch the Chromium that is installed on the machine, or use the remote-controlled Chrome. The frames side by side are always 360 × 640; also open a single seat (`/p1`) at a small phone size such as 320 × 568.
- Errors and `console.log` of the UI show up in the terminal of `dev` with the place in the source. Read them there.
- What can be decided without Phaser (rules, levels, save, texts, time format) belongs in `src/` and `client/src/view.ts` and is tested in `test/`. The more is there, the less you have to look at in the browser.
- If you could not see the game yourself, say so explicitly at handover and ask the person to open http://localhost:5180 in their normal browser and tell you what they see. That is the most important test anyway.

## Workflow

1. Settle the rules with the person and write them into `README.md`.
2. Design the save and the best scores: what must be kept when continuing? Which value goes into the leaderboard, is higher or lower better? Enter the best scores under `stats` in `manifest.json`.
3. Write rules, levels and save without Phaser in `src/`, plus tests in `test/`, especially for edge cases (last level, empty levels, broken save).
4. `npm test` and `npm run typecheck`.
5. Adapt the UI: first `client/src/view.ts` (with tests), then `client/src/scene.ts`, `client/src/main.ts` and `client/index.html`.
6. `npm run check` until no more errors come. Read warnings and decide deliberately.
7. `npm run dev`, the person plays it. Work in the feedback, repeat from step 3.

Before every handover to the person, `npm test`, `npm run typecheck` and `npm run check` must pass without errors.

## The most important rules

The game talks to the platform only via `connectSolo` from `@gamehearth/sdk/client`:

```ts
import { connectSolo } from "@gamehearth/sdk/client";

const game = await connectSolo<Save, "points">();
game.saved;                        // the last stored save or undefined
game.best.points;                  // own best score or undefined
await game.save(save);             // store the save
await game.record("points", 1200); // report a value; the platform keeps the better one
```

1. **Only `connectSolo`, never `connect`.** `connect` is for games with rules on the server; the platform rejects it here. `manifest.json` has `"mode": "single"`, `"server": false` and `"players": { "min": 1, "max": 1 }`; don't change that. There are no game options (`options` in the manifest) here: the game builds variants like difficulty or start level into its own menu. Bots (`bot`) and playing on without seats that are away (`"away": "play-on"`) exist only for multiplayer games with rules on the server.
2. **No storage of its own.** `localStorage`, `sessionStorage`, `indexedDB` and cookies don't exist in the isolated frame. Everything that should stay goes into the save (`game.save`), best scores via `game.record`.
3. **The save is plain JSON** (objects, arrays, texts, numbers, `true`/`false`), at most 64 KB, not `null`. No `Date`, no classes, no `Map`/`Set`. `game.saved` gives you your own copy on every read.
4. **The save carries a format number** (`format: 1` in the example) and is checked on loading (`readSave` in `src/rules.ts`). After an update the new version reads the save of the old one; if it does not understand it, it starts cleanly from scratch instead of crashing. If you change the shape, raise the number or keep reading the old format.
5. **Save at sensible points.** After a level is done, when pausing, on important finds; not in every frame. Saving is fast, the platform keeps it on the device right away and sends it to the server later. A player can close the app at any time; whatever is not saved by then is gone. Also save when the window disappears (`visibilitychange` with `document.hidden`), but don't rely on that alone: when closing, the message does not always arrive any more. In fast games, rate-limited saving after important events helps (at most once per second). **Only save when something has changed** (like `store` in `client/src/main.ts`): the platform treats every new save as the newest, and an old save stored again unchanged on a device nobody played on would otherwise push out a newer one from another device. If time or progress runs in the middle of a section, save that too (like the level time in the example), otherwise reloading saves time or lives.
6. **Best scores are in the manifest.** Under `stats` every name with `label` (shown in the leaderboard), `better` (`"higher"` or `"lower"`) and optionally `format` (`"number"` or `"time"`, times in milliseconds). At most 10. The name must never change after the first release, otherwise all previous best scores are gone. The platform rejects `game.record` with a different name, `check` reports it as an error. `npm run check` lists all names the game ever had in `ids.lock` and enters new ones itself; the file belongs in the repo. In CI, `check` only verifies it and fails if a name is missing.
7. **Report every finished value**, also a worse one; the platform itself keeps the better one. For points that means: after every section done (for example a level), at the end of the game and when someone aborts a running game. Best scores come from the device and can be faked; within your own circle that does not matter.
8. **`save` and `record` can fail** (error in the save, full storage) and then throw an error with an explanation. Catch it, log it with `console.error` (in `dev` it then shows up in the terminal) and let the game keep running instead of getting stuck. At the end, first report the best score, then save; that way the best score is not lost if saving fails.
9. **Time and randomness are free.** Without server rules you may use `Math.random()`, `Date.now()` and Phaser's time (`delta` in `update`). For game time use `delta` and limit a single frame (like `frameMs` in the example), otherwise the time jumps after switching tabs.
10. **Only your own files.** No `fetch` to the outside, no images, fonts or scripts from other addresses, no WebSocket. Everything comes from your own build.

### What the platform does itself

The game does not take care of this: the game list shows "Play" ("Spielen") instead of "Create room" ("Raum anlegen"). The platform preloads the game into the browser so it starts offline, syncs the save and the best scores with the server as soon as it is reachable, and shows a leaderboard of all accounts on the game page. In the platform's menu you can delete the save and your own best scores, for example when a broken save keeps the game from starting.

## The UI

- **Phaser 4, not Phaser 3.** Examples on the web are often Phaser 3. Stick to the patterns in `client/src/scene.ts`; error messages about unknown methods usually come from Phaser 3 code. Don't create new objects per frame in `update()`, but reuse them.
- **Physics:** the example uses arcade physics (`this.physics.add.sprite`, `staticGroup`, `collider`, `overlap`). A new game or a new level restarts the scene (`phaser.scene.start("level", data)`), which clears away all objects. If something moves fast (a ball that tunnels through thin bricks) or the save should capture a scene exactly, better compute the movement yourself as pure functions in `src/` and let Phaser only draw; that can be saved exactly and tested without a browser.
- **Menus and texts** are easiest as HTML above the field (like `#menu` in the example): real buttons, usable with the keyboard and easy to test.
- **Every control works with touch and keyboard.** The d-pad takes the direction from the position of the finger relative to the center, the keys form a stack (hold left, tap up, keep going left); when the window is left, everything is released.
- **Screen:** the manifest says `"screen": "small"` (phone in portrait); `dev` shows the game in such a frame. Phaser scales the field into the free space with `Scale.FIT`. So it stays sharp on phones with dense screens, the example draws at the resolution of the device (`zoom` from `devicePixelRatio` in `client/src/main.ts`), zooms the camera and gives texts the same `resolution`.
- **Graphics:** easiest to draw with Phaser (like the textures in `scene.ts`). Your own files go into `client/public/` and need a CC0, CC-BY or CC-BY-SA license; no images from the internet without a clear license. Sound comes from the platform (see "Sound").
- **Cover:** `cover` in `manifest.json` names the picture the platform shows for the game, a file in the built client folder (the example's `client/public/cover.svg` ends up as `dist/client/cover.svg`). PNG, WebP or SVG, aspect ratio 4:3, at most 256 KB; `npm run check` checks it. Without image tools, pixel art as SVG is easiest: `<rect>` elements on `viewBox="0 0 64 48"` with `shape-rendering="crispEdges"`. Replace it with a picture of your game.

## Sound

The platform plays the sounds; the game only names them: `game.sound("coin")` with a name from the SDK (`tap`, `blip`, `select`, `move`, `coin`, `hit`, `pop`, `start`, `tick`, `error`, `win`, `lose`) or `game.sound({ notes: [{ freq: 440, length: 0.1 }] })` with notes of your own (SDK README, "Sound"). `connectSolo` offers it as well. No audio files and no Phaser audio (`audio: { noAudio: true }` stays).

- Sounds are for events, not for every frame: Mushroom Hunt plays `start` when a level starts, `pop` for every mushroom, `coin` for a level done and `win` at the end of the run (`finishSound` in `client/src/view.ts`). The platform plays at most 12 per second.
- In multiplayer games with a TV, shared sounds come from the TV and personal ones from the phone; here there is only one device.
- Sound is off by default; players turn it on in the menu of the game page, and on an iPhone the ringer switch must be on too. So nothing important may only be heard. `game.soundOn` says whether it is on.
- In `npm run dev` the "Sound" switch at the top turns it on (also off by default); the header names the last sound played, so you can check it without speakers.

## Languages

The example speaks English and German; the German is only an example of a translation. Replace it with the languages of your game (see "Who you work with").

- **`manifest.json`:** `"languages": ["de", "en"]` lists the languages, the first is the default; for an English-speaking person `["en"]`. `name`, `description` and every `label` under `stats` are one text for all languages or one text per language: `"label": { "de": "Bestzeit", "en": "Best time" }`. `npm run check` reports a missing language as an error and plain texts in a game with several languages as a warning; a text that is the same in every language (a proper name, a number) may stay plain. The name of the game is such a proper name only if it really is one (Mau-Mau); a title that describes the game (Higher or Lower) gets one text per language, in `manifest.json` and in `client/src/texts.ts` (`new --name` writes it into both as one text).
- **UI:** every text players see or hear is in `client/src/texts.ts`, made with `defineTexts` from `@gamehearth/sdk/client`: one block per language with the same keys (a key missing in one language is a type error), functions for numbers and plurals. After `connectSolo()`, `const t = texts(game.language)` takes the language the platform chose; `client/src/main.ts` passes `t` to the scene, the controls and the functions in `client/src/view.ts`, and sets the title and the menu heading. Numbers and times follow the language too (decimal comma in German, see `formatTime`). Write the blocks in the order of `languages`: the first block is the fallback for every other language (`test/view.test.ts` checks that). Test the main texts in every language in `test/view.test.ts`.
- The language does not change while playing; when the player switches it, the platform reloads the game, so save before that happens (see rule 5). In `npm run dev` the selector at the top switches the frame (also `/p1`) and reloads it; look at every language there.

## Typical errors

| Message or symptom | Cause and fix |
|---|---|
| `connectSolo() is only for single-player games without a reducer` | `manifest.json` does not have `"mode": "single"` and `"server": false` |
| `It calls connectSolo() from @gamehearth/sdk/client, not connect()` | replace `connect` with `connectSolo` |
| `The best score "…" does not exist` | add the name under `stats` in `manifest.json` or fix the typo in the code |
| `The save is not plain JSON` | a `Date`, `undefined`, `NaN` or a class in the save; store it as a number or text |
| `The save is … KB` | save less: only what is needed to continue playing |
| Warning: `uses localStorage` | use `game.save` and `game.saved` instead |
| After an update the game no longer starts | an old save does not fit the new shape; check it on loading and otherwise start from scratch (`readSave`) |
| The time jumps after switching tabs | limit `delta` per frame (`frameMs`) |
| `… has no text for "en"` | add the text in the missing language to this entry in `manifest.json`; remove a language from `languages` only if the person asked for that |
| `cover: … must have the aspect ratio 4:3` or `cover: … is missing in the built client folder` | fix the size (`viewBox`) of the picture, or put it into `client/public/` and build again |
| The character gets stuck at corners | steer the character to the middle of the lane (`steerTowardLane`) or make its body smaller |
| UI stays empty, `dev` shows an error from the iframe | read the error message with file and line in the output of `dev` |
| In the browser console: `Unrecognized Content-Security-Policy directive 'webrtc'` | harmless: the platform's isolation forbids WebRTC also for browsers that know the rule; Chromium does not know it yet |

## Replacing the example

Once your own game stands, nothing of Mushroom Hunt may be left:

- `manifest.json`: set `languages`, `name`, `description`, `roles.player` (inputs, screen) and `stats` to fit. The names of the example (`best-time`) were never published in this game: if they go away, also take them out of `ids.lock`, otherwise `check` reports them as missing. If no IDs remain at all, delete `ids.lock`; `check` creates it again with the game's first ID. After the first release you never remove anything there again. `mode`, `server` and `players` stay. The `id` comes from the folder name. If it does not fit (for example `my-game`), change it now in `manifest.json` and `package.json`: only lowercase letters, digits and hyphens. After the first release it never changes again.
- `package.json`: `description`, in English like the code.
- `src/`, `client/src/`, `client/index.html`, `test/`: rules, UI and tests of your own game. You may keep or change the file names. `client/src/texts.ts` gets the languages of your game; the example's German goes away unless German is one of them. `client/public/cover.svg`: a cover of your game.
- `README.md`: rules of your own game; remove the note "still contains the example" at the top.
- Finally search for leftovers: `Mushroom Hunt`, `Pilzsuche`, `Pilze`, `Mushroom` and `mushroom` in `src/`, `client/`, `test/`, `README.md`, `manifest.json` and `package.json`; also `best-time`, `levelTexts`, `LevelScene` and `figure`, unless your game needs these names itself for good reason.
- `AGENTS.md` and `CLAUDE.md` stay as they are. They mention Mushroom Hunt as the template's example.
- The original example then stays available for reference under `node_modules/gamehearth/templates/single/`, for example how `client/src/scene.ts` sets up physics and textures or how `client/src/controls.ts` reads fingers and keys.

## More details

These files always match the installed version. Read them before you use something that is not in here:

- `node_modules/@gamehearth/sdk/README.md`: the full contract, especially the section on `connectSolo` and best scores
- `node_modules/gamehearth/README.md`: `dev`, `check`, `pack` and catalogs

Don't change anything in `node_modules` and don't switch off any checks. If the contract does not allow something, tell the person what does not work.

## Publishing

Before the first release, ask the person:

- **License:** preset are MIT for the code and CC0 for graphics (see `LICENSE` and `manifest.json`). Explain briefly: everyone may then use, change and pass on the game. Other allowed licenses: any OSI license for code, CC0, CC-BY or CC-BY-SA for graphics.
- **Name in the `LICENSE`:** who is named as the author; this is publicly visible.

Steps:

1. Raise the version in `manifest.json` and `package.json` (`0.1.0` → `0.2.0`), commit.
2. Upload the repo to GitHub. A tag starts the release CI: `git tag v0.2.0 && git push origin v0.2.0`. It builds the game package with `check` and `pack` and attaches it to a release.
3. For a Gamehearth server to install the game, it needs a **catalog**: a repo of its own with a `catalog.json`. Create it and add the game with `npx gamehearth catalog add catalog.json <package-url> --name "My catalog"`. On the server, an admin adds the raw URL of the `catalog.json` in the admin view ("Verwaltung") and installs the game. Details in `node_modules/gamehearth/README.md`.
4. It is played with an account: in the game list the game shows "Play" ("Spielen").
