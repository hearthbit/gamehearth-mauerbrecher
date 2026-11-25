import { describe, expect, it } from "vitest";
import { newRun, runAt } from "../src/rules";
import { texts } from "../client/src/texts";
import {
  effectsText,
  extraLabel,
  formatPoints,
  frameMs,
  isTap,
  keyAction,
  levelText,
  livesLabel,
  livesText,
  menuFor,
  pointsText,
  pressKey,
  recordLine,
  releaseKey,
  restingHint,
  steerDirection,
  tapMaxDistance,
  tapMaxMs,
  toField,
} from "../client/src/view";

const de = texts("de");
const en = texts("en");

function labels(screen: Parameters<typeof menuFor>[1]): string[] {
  return menuFor(de, screen).entries.map((entry) => entry.label);
}

describe("Display", () => {
  it("writes points with a thousands separator", () => {
    expect(formatPoints(de, 0)).toBe("0");
    expect(formatPoints(de, 980)).toBe("980");
    expect(formatPoints(de, 12_340)).toBe("12.340");
    expect(formatPoints(de, 1_234_567)).toBe("1.234.567");
    expect(pointsText(de, 1)).toBe("1 Punkt");
    expect(pointsText(de, 1230)).toBe("1.230 Punkte");
  });

  it("shows level, lives and running extras in the header", () => {
    expect(levelText(de, 0)).toBe("Level 1/10");
    expect(levelText(de, 9)).toBe("Level 10/10");
    expect(livesText(3)).toBe("♥♥♥");
    expect(livesText(0)).toBe("");
    expect(livesLabel(de, 2)).toBe("2 Leben übrig");
    expect(effectsText(de, 0, 0)).toBe("");
    expect(effectsText(de, 12_001, 0)).toBe("Breit 13 s");
    expect(effectsText(de, 500, 4000)).toBe("Breit 1 s   Langsam 4 s");
    expect([extraLabel(de, "breit"), extraLabel(de, "ball"), extraLabel(de, "langsam")]).toEqual(["BREIT", "+BALL", "LANGSAM"]);
  });

  it("says how to launch the ball and, after a lost ball, how many lives are left", () => {
    expect(restingHint(de, false, 3)).toBe("Tippen oder Leertaste:\nBall abschießen");
    expect(restingHint(de, true, 2)).toBe("Ball verloren! Noch 2 Leben.\nTippen oder Leertaste:\nBall abschießen");
  });

  it("names the best score", () => {
    expect(recordLine(de, undefined)).toBe("Noch keine Bestleistung.");
    expect(recordLine(de, 4560)).toBe("Bestleistung: 4.560 Punkte");
  });

  it("speaks English when the platform passes en, with a thousands comma", () => {
    expect(formatPoints(en, 1_234_567)).toBe("1,234,567");
    expect(pointsText(en, 1)).toBe("1 point");
    expect(pointsText(en, 1230)).toBe("1,230 points");
    expect(levelText(en, 0)).toBe("Level 1/10");
    expect(livesLabel(en, 1)).toBe("1 life left");
    expect(livesLabel(en, 2)).toBe("2 lives left");
    expect(effectsText(en, 500, 4000)).toBe("Wide 1 s   Slow 4 s");
    expect([extraLabel(en, "breit"), extraLabel(en, "ball"), extraLabel(en, "langsam")]).toEqual(["WIDE", "+BALL", "SLOW"]);
    expect(restingHint(en, false, 3)).toBe("Tap or space bar:\nlaunch the ball");
    expect(restingHint(en, true, 1)).toBe("Ball lost! 1 life left.\nTap or space bar:\nlaunch the ball");
    expect(recordLine(en, undefined)).toBe("No best score yet.");
    expect(recordLine(en, 4560)).toBe("Best score: 4,560 points");
  });

  it("falls back to German for other languages", () => {
    expect(pointsText(texts("fr"), 1230)).toBe("1.230 Punkte");
    expect(pointsText(texts("en-US"), 1230)).toBe("1,230 points");
  });
});

describe("Menu", () => {
  it("offers only start game on the first start and explains the controls", () => {
    const menu = menuFor(de, { kind: "start", run: null });
    expect(menu.heading).toBe("Mauerbrecher");
    expect(menu.entries).toEqual([{ id: "neu", label: "Spiel starten" }]);
    expect(menu.message).toContain("Leertaste");
  });

  it("offers continue with level, points and lives when coming back", () => {
    const run = { ...runAt(3, 1230, 2) };
    const menu = menuFor(de, { kind: "start", run });
    expect(menu.message).toBe("Willkommen zurück! Level 4, 1.230 Punkte, 2 Leben übrig.");
    expect(menu.entries.map((entry) => entry.id)).toEqual(["weiterspielen", "neu"]);
  });

  it("asks before a new game if a save would be lost", () => {
    const menu = menuFor(de, { kind: "confirm", run: runAt(6, 2500, 1), back: "pause" });
    expect(menu.heading).toBe("Neues Spiel?");
    expect(menu.message).toContain("Level 7");
    expect(menu.message).toContain("2.500 Punkte");
    expect(menu.entries.map((entry) => entry.id)).toEqual(["neu-sicher", "zurueck"]);
  });

  it("shows pause, level done, game over and win", () => {
    expect(labels({ kind: "pause", run: newRun() })).toEqual(["Weiter", "Neues Spiel"]);
    expect(menuFor(de, { kind: "pause", run: newRun() }).message).toContain("gespeichert");
    expect(menuFor(de, { kind: "cleared", level: 2, score: 900 })).toEqual({
      heading: "Level 3 geschafft!",
      message: "Du hast 900 Punkte.",
      entries: [{ id: "naechstes", label: "Weiter mit Level 4" }],
    });
    expect(menuFor(de, { kind: "over", score: 700, best: 900 }).message).toBe("Du hast 700 Punkte geschafft.");
    expect(menuFor(de, { kind: "over", score: 900, best: 900 }).message).toBe("Du hast 900 Punkte geschafft. Das ist deine Bestleistung!");
    expect(menuFor(de, { kind: "over", score: 0, best: 0 }).message).toBe("Du hast 0 Punkte geschafft.");
    expect(menuFor(de, { kind: "won", score: 5000, best: 5000 })).toEqual({
      heading: "Gewonnen!",
      message: "Alle 10 Level geschafft, 5.000 Punkte. Das ist deine Bestleistung!",
      entries: [{ id: "neu", label: "Nochmal spielen" }],
    });
  });

  it("shows every menu in English when the platform passes en", () => {
    expect(menuFor(en, { kind: "start", run: null })).toEqual({
      heading: "Wall Breaker",
      message: "Drag the paddle with your finger or move it with the arrow keys. Tap or press the space bar to launch the ball.",
      entries: [{ id: "neu", label: "Start game" }],
    });
    const back = menuFor(en, { kind: "start", run: runAt(3, 1230, 2) });
    expect(back.message).toBe("Welcome back! Level 4, 1,230 points, 2 lives left.");
    expect(back.entries.map((entry) => entry.label)).toEqual(["Continue", "New game"]);
    expect(menuFor(en, { kind: "pause", run: runAt(0, 10, 1) })).toEqual({
      heading: "Paused",
      message: "Level 1, 10 points, 1 life left. Your progress is saved.",
      entries: [
        { id: "fortsetzen", label: "Resume" },
        { id: "neu", label: "New game" },
      ],
    });
    expect(menuFor(en, { kind: "confirm", run: runAt(6, 2500, 1), back: "pause" })).toEqual({
      heading: "New game?",
      message: "Your progress in Level 7 will be lost. Your 2,500 points still go on the leaderboard.",
      entries: [
        { id: "neu-sicher", label: "Yes, start over" },
        { id: "zurueck", label: "Back" },
      ],
    });
    expect(menuFor(en, { kind: "cleared", level: 2, score: 900 })).toEqual({
      heading: "Level 3 cleared!",
      message: "You have 900 points.",
      entries: [{ id: "naechstes", label: "On to Level 4" }],
    });
    expect(menuFor(en, { kind: "over", score: 900, best: 900 })).toEqual({
      heading: "Game over",
      message: "You scored 900 points. That's your best score!",
      entries: [{ id: "neu", label: "New game" }],
    });
    expect(menuFor(en, { kind: "won", score: 5000, best: 9000 })).toEqual({
      heading: "You won!",
      message: "All 10 levels cleared, 5,000 points.",
      entries: [{ id: "neu", label: "Play again" }],
    });
  });
});

describe("Controls", () => {
  it("knows arrow keys, A/D, space bar and pause", () => {
    expect(keyAction("ArrowLeft")).toBe("left");
    expect(keyAction("d")).toBe("right");
    expect(keyAction(" ")).toBe("launch");
    expect(keyAction("ArrowUp")).toBe("launch");
    expect(keyAction("Escape")).toBe("pause");
    expect(keyAction("p")).toBe("pause");
    expect(keyAction("x")).toBeUndefined();
    expect(keyAction("constructor")).toBeUndefined();
  });

  it("moves in the direction of the most recently pressed key that is still held", () => {
    let keys = pressKey([], "left");
    expect(steerDirection(keys)).toBe(-1);
    keys = pressKey(keys, "right");
    expect(steerDirection(keys)).toBe(1);
    keys = releaseKey(keys, "right");
    expect(steerDirection(keys)).toBe(-1);
    expect(steerDirection(releaseKey(keys, "left"))).toBe(0);
  });

  it("counts a short tap without swiping as a launch, but not a drag", () => {
    expect(isTap(120, 3)).toBe(true);
    expect(isTap(tapMaxMs, tapMaxDistance)).toBe(true);
    expect(isTap(tapMaxMs + 1, 0)).toBe(false);
    expect(isTap(100, tapMaxDistance + 1)).toBe(false);
  });

  it("converts finger distances on the screen into distances on the field", () => {
    expect(toField(100, 360, 360)).toBe(100);
    expect(toField(100, 720, 360)).toBe(50);
    expect(toField(-30, 180, 360)).toBe(-60);
    expect(toField(10, 0, 360)).toBe(0);
  });

  it("counts at most 100 ms per frame so that nothing jumps after switching tabs", () => {
    expect(frameMs(16)).toBe(16);
    expect(frameMs(5000)).toBe(100);
    expect(frameMs(-3)).toBe(0);
  });
});

describe("Name of the game", () => {
  it("is translated, because it describes the game", () => {
    expect(texts("de").name).toBe("Mauerbrecher");
    expect(texts("en").name).toBe("Wall Breaker");
  });
});
