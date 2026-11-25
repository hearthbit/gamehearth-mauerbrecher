import type { ExtraKind } from "../../src/play";
import { levelCount, type Run } from "../../src/rules";
import type { Texts } from "./texts";

export type KeyAction = "left" | "right" | "launch" | "pause";
export type Steer = "left" | "right";

export const tapMaxMs = 300;
export const tapMaxDistance = 12;

const keyActions: Record<string, KeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
  " ": "launch",
  ArrowUp: "launch",
  w: "launch",
  W: "launch",
  p: "pause",
  P: "pause",
  Escape: "pause",
};

export function keyAction(key: string): KeyAction | undefined {
  return Object.hasOwn(keyActions, key) ? keyActions[key] : undefined;
}

export function pressKey(keys: readonly Steer[], key: Steer): Steer[] {
  return [...keys.filter((held) => held !== key), key];
}

export function releaseKey(keys: readonly Steer[], key: Steer): Steer[] {
  return keys.filter((held) => held !== key);
}

export function steerDirection(keys: readonly Steer[]): number {
  const top = keys.at(-1);
  return top === "left" ? -1 : top === "right" ? 1 : 0;
}

export function isTap(durationMs: number, distance: number): boolean {
  return durationMs <= tapMaxMs && distance <= tapMaxDistance;
}

export function toField(screenPixels: number, shownWidth: number, fieldWidth: number): number {
  return shownWidth > 0 ? (screenPixels * fieldWidth) / shownWidth : 0;
}

export function frameMs(deltaMs: number): number {
  return Math.min(Math.max(deltaMs, 0), 100);
}

export function formatPoints(t: Texts, points: number): string {
  const digits = String(Math.max(0, Math.round(points)));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, t.thousands);
}

export function pointsText(t: Texts, points: number): string {
  return t.points(points, formatPoints(t, points));
}

export function levelText(t: Texts, level: number): string {
  return t.level(level + 1, levelCount);
}

export function livesText(lives: number): string {
  return "♥".repeat(Math.max(0, lives));
}

export function livesLabel(t: Texts, lives: number): string {
  return t.livesLeft(lives);
}

export function effectsText(t: Texts, wideLeft: number, slowLeft: number): string {
  const parts: string[] = [];
  if (wideLeft > 0) {
    parts.push(t.wide(Math.ceil(wideLeft / 1000)));
  }
  if (slowLeft > 0) {
    parts.push(t.slow(Math.ceil(slowLeft / 1000)));
  }
  return parts.join("   ");
}

export function extraLabel(t: Texts, kind: ExtraKind): string {
  const labels: Record<ExtraKind, string> = { breit: t.extraWide, ball: t.extraBall, langsam: t.extraSlow };
  return labels[kind];
}

export function restingHint(t: Texts, justLost: boolean, lives: number): string {
  if (!justLost) {
    return t.launch;
  }
  return `${t.ballLost(lives)}\n${t.launch}`;
}

export function recordLine(t: Texts, best: number | undefined): string {
  return best === undefined ? t.noBest : t.best(pointsText(t, best));
}

export type MenuScreen =
  | { kind: "start"; run: Run | null }
  | { kind: "pause"; run: Run }
  | { kind: "confirm"; run: Run; back: "start" | "pause" }
  | { kind: "cleared"; level: number; score: number }
  | { kind: "over"; score: number; best: number | undefined }
  | { kind: "won"; score: number; best: number | undefined };

export type MenuChoice = "weiterspielen" | "fortsetzen" | "neu" | "neu-sicher" | "zurueck" | "naechstes";

export interface MenuEntry {
  id: MenuChoice;
  label: string;
}

export interface Menu {
  heading: string;
  message: string;
  entries: MenuEntry[];
}

function runSummary(t: Texts, run: Run): string {
  return t.runSummary(run.level + 1, pointsText(t, run.score), livesLabel(t, run.lives));
}

export function isBest(score: number, best: number | undefined): boolean {
  return best !== undefined && best === score && score > 0;
}

function bestNote(t: Texts, score: number, best: number | undefined): string {
  return isBest(score, best) ? t.isBest : "";
}

export function menuFor(t: Texts, screen: MenuScreen): Menu {
  switch (screen.kind) {
    case "start":
      if (screen.run === null) {
        return { heading: t.name, message: t.howTo, entries: [{ id: "neu", label: t.startGame }] };
      }
      return {
        heading: t.name,
        message: t.welcomeBack(runSummary(t, screen.run)),
        entries: [
          { id: "weiterspielen", label: t.continueGame },
          { id: "neu", label: t.newGame },
        ],
      };
    case "pause":
      return {
        heading: t.paused,
        message: t.progressSaved(runSummary(t, screen.run)),
        entries: [
          { id: "fortsetzen", label: t.resume },
          { id: "neu", label: t.newGame },
        ],
      };
    case "confirm":
      return {
        heading: t.confirmHeading,
        message: t.confirmMessage(screen.run.level + 1, pointsText(t, screen.run.score)),
        entries: [
          { id: "neu-sicher", label: t.startOver },
          { id: "zurueck", label: t.back },
        ],
      };
    case "cleared":
      return {
        heading: t.cleared(screen.level + 1),
        message: t.youHave(pointsText(t, screen.score)),
        entries: [{ id: "naechstes", label: t.nextLevel(screen.level + 2) }],
      };
    case "over":
      return {
        heading: t.over,
        message: `${t.youScored(pointsText(t, screen.score))}${bestNote(t, screen.score, screen.best)}`,
        entries: [{ id: "neu", label: t.newGame }],
      };
    case "won":
      return {
        heading: t.won,
        message: `${t.allCleared(levelCount, pointsText(t, screen.score))}${bestNote(t, screen.score, screen.best)}`,
        entries: [{ id: "neu", label: t.playAgain }],
      };
  }
}
