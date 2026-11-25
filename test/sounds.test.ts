import { describe, expect, it } from "vitest";
import { soundProblem } from "@gamehearth/sdk/platform";
import { breakableCount, parseLevel } from "../src/levels";
import { ballRadius, brickHeight, cellCenter, createWorld, paddleY, step, wall, type Ball, type Input, type World } from "../src/play";
import { newRun } from "../src/rules";
import { collisionGapMs, endCue, maxCollisionSounds, maxSounds, soundGate, sounds, stepCue, type Cue } from "../client/src/sounds";

const idle: Input = { move: 0, dir: 0, launch: false };
const never = () => 0.99;
const platformLimit = 12;

function worldWith(text: string): World {
  const world = createWorld(newRun());
  const level = parseLevel(text);
  world.bricks = level.cells;
  world.rows = level.rows;
  world.left = breakableCount(level.cells);
  return world;
}

function ball(x: number, y: number, dx: number, dy: number): Ball {
  const length = Math.hypot(dx, dy);
  return { x, y, dx: dx / length, dy: dy / length, resting: false };
}

function eventsOver(world: World, frames: number): string[] {
  const types: string[] = [];
  for (let frame = 0; frame < frames; frame++) {
    types.push(...step(world, 16, idle, never).map((event) => event.type));
  }
  return types;
}

function busiestSecond(times: readonly number[]): number {
  let most = 0;
  for (let first = 0; first < times.length; first++) {
    let last = first;
    while (last < times.length && (times[last] as number) - (times[first] as number) < 1000) {
      last++;
    }
    most = Math.max(most, last - first);
  }
  return most;
}

describe("Sound", () => {
  it("has a different sound for every moment, each one the platform can play", () => {
    const cues = Object.keys(sounds) as Cue[];
    expect(cues).toHaveLength(10);
    for (const cue of cues) {
      expect(soundProblem(sounds[cue]), cue).toBeUndefined();
    }
    expect(new Set(cues.map((cue) => JSON.stringify(sounds[cue]))).size).toBe(cues.length);
  });

  it("picks one sound per frame for what happened, the most important one first", () => {
    expect(stepCue([])).toBeUndefined();
    expect(stepCue([{ type: "bounce" }])).toBe("bounce");
    expect(stepCue([{ type: "paddle" }])).toBe("paddle");
    expect(stepCue([{ type: "hit", index: 3, left: 2 }])).toBe("crack");
    expect(stepCue([{ type: "hit", index: 3, left: 0 }])).toBe("broken");
    expect(stepCue([{ type: "caught", kind: "breit" }])).toBe("extra");
    expect(stepCue([{ type: "lost" }])).toBe("lost");
    expect(stepCue([{ type: "bounce" }, { type: "paddle" }])).toBe("paddle");
    expect(stepCue([{ type: "bounce" }, { type: "hit", index: 3, left: 1 }, { type: "hit", index: 4, left: 0 }])).toBe("broken");
    expect(stepCue([{ type: "hit", index: 3, left: 0 }, { type: "caught", kind: "ball" }])).toBe("extra");
  });

  it("leaves the end of a level and of the game to their own sound", () => {
    expect(stepCue([{ type: "hit", index: 3, left: 0 }, { type: "cleared" }])).toBeUndefined();
    expect(stepCue([{ type: "bounce" }, { type: "over" }])).toBeUndefined();
    expect(endCue({ kind: "cleared", level: 2, score: 500 })).toBe("cleared");
    expect(endCue({ kind: "won", score: 9000, best: 9000 })).toBe("won");
    expect(endCue({ kind: "won", score: 9000, best: 12_000 })).toBe("won");
    expect(endCue({ kind: "over", score: 700, best: 700 })).toBe("best");
    expect(endCue({ kind: "over", score: 700, best: 900 })).toBe("over");
    expect(endCue({ kind: "over", score: 0, best: 0 })).toBe("over");
    expect(endCue({ kind: "over", score: 0, best: undefined })).toBe("over");
    expect(endCue({ kind: "start", run: null })).toBeUndefined();
    expect(endCue({ kind: "pause", run: newRun() })).toBeUndefined();
  });

  it("reports every contact with a wall, the ceiling, a gray brick or the paddle once, not in every frame", () => {
    const left = worldWith("#........1");
    left.balls = [ball(wall + ballRadius + 4, 300, -1, -0.2)];
    expect(eventsOver(left, 20)).toEqual(["bounce"]);
    const ceiling = worldWith("#........1");
    ceiling.balls = [ball(200, wall + ballRadius + 4, 0.2, -1)];
    expect(eventsOver(ceiling, 20)).toEqual(["bounce"]);
    const gray = worldWith("#........1");
    const target = cellCenter(0);
    gray.balls = [ball(target.x, target.y + brickHeight / 2 + ballRadius + 2, 0, -1)];
    expect(eventsOver(gray, 20)).toEqual(["bounce"]);
    const paddle = worldWith("#........1");
    paddle.balls = [ball(paddle.paddleX, paddleY - ballRadius - 4, 0, 1)];
    expect(eventsOver(paddle, 20)).toEqual(["paddle"]);
  });

  it("spaces out collision sounds and keeps room for the important moments", () => {
    const gate = soundGate();
    expect(gate("bounce", 0)).toBe(true);
    expect(gate("paddle", collisionGapMs - 1)).toBe(false);
    expect(gate("lost", collisionGapMs - 1)).toBe(true);
    const full = soundGate();
    let played = 0;
    for (let now = 0; now < 1000; now += collisionGapMs) {
      played += full("crack", now) ? 1 : 0;
    }
    expect(played).toBe(maxCollisionSounds);
    expect(full("broken", 990)).toBe(false);
    expect(full("extra", 990)).toBe(true);
    expect(full("lost", 995)).toBe(true);
    expect(full("cleared", 999)).toBe(false);
    expect(full("broken", 1600)).toBe(true);
  });

  it("never plays more than the platform allows, even when three balls rattle between the ceiling and gray bricks", () => {
    const world = worldWith("##########\n.........1");
    world.balls = [ball(60, 30, 0.3, -1), ball(180, 24, -0.5, 1), ball(300, 38, 0.8, 0.6)];
    const gate = soundGate();
    const cues: number[] = [];
    const played: number[] = [];
    for (let now = 0; now < 10_000; now += 16) {
      const cue = stepCue(step(world, 16, idle, never));
      if (cue === undefined) {
        continue;
      }
      cues.push(now);
      if (gate(cue, now)) {
        played.push(now);
      }
    }
    expect(busiestSecond(cues)).toBeGreaterThan(platformLimit);
    expect(maxSounds).toBeLessThan(platformLimit);
    expect(busiestSecond(played)).toBeLessThanOrEqual(maxSounds);
    expect(played.length).toBeGreaterThanOrEqual(10 * (maxCollisionSounds - 1));
  });
});
