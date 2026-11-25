import Phaser from "phaser";
import { connectSolo } from "@gamehearth/sdk/client";
import { createWorld, height, runFromWorld, width, type GameEvent, type World } from "../../src/play";
import { afterLevel, freshSave, newRun, readSave, type Run, type Save } from "../../src/rules";
import { mountControls } from "./controls";
import { colors, WallScene, zoom } from "./scene";
import { endCue, soundGate, sounds, stepCue, type Cue } from "./sounds";
import { texts } from "./texts";
import { keyAction, levelText, livesLabel, livesText, menuFor, pointsText, recordLine, type MenuChoice, type MenuScreen } from "./view";

const saveEveryMs = 1000;

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (node === null) {
    throw new Error(`#${id} is missing in index.html`);
  }
  return node;
}

async function start(): Promise<void> {
  try {
    const game = await connectSolo<Save, "punkte">();
    const t = texts(game.language);
    document.documentElement.lang = game.language;
    document.title = t.name;
    let save = readSave(game.saved);
    let world: World | undefined;
    let paused = true;
    let screen: MenuScreen = { kind: "start", run: save.run };
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let stored = JSON.stringify(save);
    const gate = soundGate();

    const sound = (cue: Cue | undefined) => {
      if (cue !== undefined && gate(cue, performance.now())) {
        game.sound(sounds[cue]);
      }
    };

    const store = async (next: Save) => {
      save = next;
      const text = JSON.stringify(next);
      if (text === stored) {
        return;
      }
      try {
        await game.save(next);
        stored = text;
      } catch (error) {
        console.error(error);
      }
    };

    const report = async (score: number) => {
      try {
        await game.record("punkte", score);
      } catch (error) {
        console.error(error);
      }
    };

    const field = byId("field");
    const menu = byId("menu");
    const entries = byId("entries");
    const pauseButton = byId("pause") as HTMLButtonElement;
    pauseButton.textContent = t.pause;

    const playing = () => world !== undefined && world.phase === "playing";

    const currentRun = (): Run | null => (world !== undefined && world.phase === "playing" ? runFromWorld(world) : save.run);

    const persist = async () => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      await store(world !== undefined && world.phase === "playing" ? { format: 1, run: runFromWorld(world) } : save);
    };

    const persistSoon = () => {
      saveTimer ??= setTimeout(() => void persist(), saveEveryMs);
    };

    const showHud = () => {
      const run = currentRun();
      byId("level").textContent = run === null ? "" : levelText(t, run.level);
      byId("score").textContent = run === null ? "" : pointsText(t, run.score);
      const lives = byId("lives");
      lives.textContent = run === null ? "" : livesText(run.lives);
      lives.setAttribute("aria-label", run === null ? "" : livesLabel(t, run.lives));
    };

    const showMenu = (next: MenuScreen) => {
      screen = next;
      paused = true;
      controls.enabled = false;
      const content = menuFor(t, next);
      byId("heading").textContent = content.heading;
      byId("message").textContent = content.message;
      byId("record").textContent = recordLine(t, game.best.punkte);
      entries.replaceChildren(
        ...content.entries.map((entry) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = entry.label;
          button.addEventListener("click", () => void choose(entry.id));
          return button;
        }),
      );
      pauseButton.hidden = true;
      menu.hidden = false;
      entries.querySelector("button")?.focus();
      showHud();
    };

    const hideMenu = () => {
      menu.hidden = true;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      pauseButton.hidden = false;
      paused = false;
      controls.enabled = true;
      showHud();
    };

    const play = (run: Run) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      world = createWorld(run);
      phaser.scene.start("mauer", { world });
      hideMenu();
    };

    const startNew = async () => {
      const run = newRun();
      await store({ format: 1, run });
      play(run);
    };

    const pauseGame = () => {
      if (paused || world === undefined || world.phase !== "playing") {
        return;
      }
      showMenu({ kind: "pause", run: runFromWorld(world) });
      void persist();
    };

    const levelDone = async (done: World) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      paused = true;
      controls.enabled = false;
      const next = afterLevel(done.level, done.score, done.lives);
      await report(done.score);
      const end: MenuScreen = next === null ? { kind: "won", score: done.score, best: game.best.punkte } : { kind: "cleared", level: done.level, score: done.score };
      sound(endCue(end));
      await store({ format: 1, run: next });
      showMenu(end);
    };

    const gameOver = async (done: World) => {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      paused = true;
      controls.enabled = false;
      await report(done.score);
      const end: MenuScreen = { kind: "over", score: done.score, best: game.best.punkte };
      sound(endCue(end));
      await store(freshSave());
      showMenu(end);
    };

    const handle = async (current: World, events: readonly GameEvent[]) => {
      const happened = events.map((event) => event.type === "hit" && event.left === 0 ? "destroyed" : event.type);
      sound(stepCue(events));
      showHud();
      if (happened.includes("cleared")) {
        await levelDone(current);
      } else if (happened.includes("over")) {
        await gameOver(current);
      } else if (happened.includes("lost")) {
        await persist();
      } else if (happened.includes("destroyed")) {
        persistSoon();
      }
    };

    const choose = async (choice: MenuChoice) => {
      const run = currentRun();
      switch (choice) {
        case "weiterspielen":
        case "naechstes":
          if (save.run !== null) {
            play(save.run);
          }
          break;
        case "fortsetzen":
          hideMenu();
          break;
        case "neu":
          if (run !== null) {
            showMenu({ kind: "confirm", run, back: screen.kind === "pause" ? "pause" : "start" });
          } else {
            await startNew();
          }
          break;
        case "neu-sicher":
          if (run !== null) {
            await report(run.score);
          }
          await startNew();
          break;
        case "zurueck":
          if (screen.kind === "confirm") {
            showMenu(screen.back === "pause" ? { kind: "pause", run: screen.run } : { kind: "start", run: screen.run });
          }
          break;
      }
    };

    const controls = mountControls(field, width, pauseGame);
    const scene = new WallScene({ controls, paused: () => paused, onStep: (current, events) => void handle(current, events) }, t);
    const phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: field,
      width: width * zoom,
      height: height * zoom,
      backgroundColor: colors.background,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
      audio: { noAudio: true },
      scene,
    });

    pauseButton.addEventListener("click", pauseGame);
    addEventListener("keydown", (event) => {
      if (!event.defaultPrevented && !event.repeat && screen.kind === "pause" && paused && keyAction(event.key) === "pause") {
        event.preventDefault();
        hideMenu();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseGame();
        void persist();
      }
    });
    addEventListener("blur", () => {
      if (playing()) {
        pauseGame();
      }
    });
    addEventListener("pagehide", () => void persist());

    showMenu(screen);
  } catch (error) {
    const fallback = byId("fallback");
    fallback.textContent = `${texts(navigator.language).fallback} ${error instanceof Error ? error.message : ""}`;
    fallback.hidden = false;
  }
}

void start();
