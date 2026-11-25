import type { Sound } from "@gamehearth/sdk/client";
import type { GameEvent } from "../../src/play";
import { isBest, type MenuScreen } from "./view";

export type Cue = "bounce" | "paddle" | "crack" | "broken" | "extra" | "lost" | "cleared" | "won" | "over" | "best";

export const sounds: Record<Cue, Sound> = {
  bounce: { notes: [{ freq: 247, length: 0.03, wave: "triangle", volume: 0.5 }] },
  paddle: { notes: [{ freq: 392, length: 0.05, volume: 0.35 }] },
  crack: { notes: [{ freq: 587, length: 0.05, volume: 0.35 }] },
  broken: { notes: [{ freq: 880, to: 1320, length: 0.07, volume: 0.35 }] },
  extra: "coin",
  lost: { notes: [{ freq: 523, to: 131, length: 0.5, wave: "triangle", volume: 0.7 }] },
  cleared: {
    notes: [
      { freq: 784, length: 0.08 },
      { freq: 988, at: 0.08, length: 0.08 },
      { freq: 1175, at: 0.16, length: 0.08 },
      { freq: 1568, at: 0.24, length: 0.3 },
    ],
  },
  won: "win",
  over: "lose",
  best: {
    notes: [
      { freq: 1047, length: 0.07 },
      { freq: 1319, at: 0.07, length: 0.07 },
      { freq: 1568, at: 0.14, length: 0.07 },
      { freq: 2093, at: 0.21, length: 0.14 },
      { freq: 1568, at: 0.38, length: 0.07 },
      { freq: 2093, at: 0.45, length: 0.4 },
    ],
  },
};

const stepOrder: readonly Cue[] = ["lost", "extra", "broken", "crack", "paddle", "bounce"];

function eventCue(event: GameEvent): Cue | undefined {
  switch (event.type) {
    case "paddle":
      return "paddle";
    case "bounce":
      return "bounce";
    case "hit":
      return event.left > 0 ? "crack" : "broken";
    case "caught":
      return "extra";
    case "lost":
      return "lost";
    case "cleared":
    case "over":
      return undefined;
  }
}

export function stepCue(events: readonly GameEvent[]): Cue | undefined {
  if (events.some((event) => event.type === "cleared" || event.type === "over")) {
    return undefined;
  }
  const cues = events.map(eventCue);
  return stepOrder.find((cue) => cues.includes(cue));
}

export function endCue(screen: MenuScreen): Cue | undefined {
  switch (screen.kind) {
    case "cleared":
      return "cleared";
    case "won":
      return "won";
    case "over":
      return isBest(screen.score, screen.best) ? "best" : "over";
    default:
      return undefined;
  }
}

export const soundWindowMs = 1000;
export const maxSounds = 10;
export const maxCollisionSounds = 8;
export const collisionGapMs = 80;

const collisions: readonly Cue[] = ["bounce", "paddle", "crack", "broken"];

export type SoundGate = (cue: Cue, now: number) => boolean;

export function soundGate(): SoundGate {
  const recent: number[] = [];
  return (cue, now) => {
    while (recent.length > 0 && now - (recent[0] as number) >= soundWindowMs) {
      recent.shift();
    }
    const collision = collisions.includes(cue);
    if (recent.length >= (collision ? maxCollisionSounds : maxSounds)) {
      return false;
    }
    const last = recent.at(-1);
    if (collision && last !== undefined && now - last < collisionGapMs) {
      return false;
    }
    recent.push(now);
    return true;
  };
}
