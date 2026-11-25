import { describe, expect, it } from "vitest";
import { gridText, levels } from "../src/levels";
import { afterLevel, freshSave, levelCount, newRun, readBricks, readSave, runAt, startLives } from "../src/rules";

const firstBricks = gridText(levels[0]?.cells ?? []);

describe("Reading the save", () => {
  it("starts fresh without a save", () => {
    expect(readSave(undefined)).toEqual({ format: 1, run: null });
    expect(readSave({ format: 1, run: null })).toEqual(freshSave());
  });

  it("takes over level, points, lives and the standing bricks", () => {
    const bricks = firstBricks.replace("1111111111", "..11111111");
    const save = { format: 1, run: { level: 0, score: 20, lives: 2, bricks } };
    expect(readSave(save)).toEqual(save);
  });

  it("accepts damaged bricks, but no bricks that need more hits than in the level", () => {
    const plan = levels[4];
    expect(plan).toBeDefined();
    const bricks = gridText(plan?.cells ?? []);
    const damaged = bricks.replace("3333333333", "321321321.");
    expect(readSave({ format: 1, run: { level: 4, score: 0, lives: 3, bricks: damaged } }).run?.bricks).toBe(damaged);
    const stronger = bricks.replace("1111111111", "3111111111");
    expect(readSave({ format: 1, run: { level: 4, score: 0, lives: 3, bricks: stronger } }).run).toEqual(runAt(4, 0, 3));
  });

  it("starts fresh on an unknown or broken save instead of crashing; if only the bricks don't fit, the level starts over", () => {
    const good = { level: 0, score: 0, lives: 3, bricks: firstBricks };
    expect(readSave({ format: 2, run: good })).toEqual(freshSave());
    expect(readSave("Level 3")).toEqual(freshSave());
    expect(readSave(null)).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, level: levelCount } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, level: -1 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, score: -10 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, score: 1.5 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, lives: 0 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, lives: 4 } })).toEqual(freshSave());
    expect(readSave({ format: 1, run: { ...good, bricks: 42 } })).toEqual({ format: 1, run: runAt(0, 0, 3) });
    expect(readSave({ format: 1, run: { ...good, bricks: "1111111111" } })).toEqual({ format: 1, run: runAt(0, 0, 3) });
    expect(readSave({ format: 1, run: "Level 3" })).toEqual(freshSave());
  });

  it("discards bricks that do not fit the level", () => {
    expect(readBricks(0, firstBricks.replace("1111111111", "111111111"))).toBeUndefined();
    expect(readBricks(0, firstBricks.replace("1111111111", "11111111x1"))).toBeUndefined();
    expect(readBricks(0, firstBricks.replace("1111111111", "#111111111"))).toBeUndefined();
    expect(readBricks(3, gridText(levels[3]?.cells ?? []).replace("#1#1##1#1#", ".1#1##1#1#"))).toBeUndefined();
    expect(readBricks(levelCount, firstBricks)).toBeUndefined();
  });

  it("discards a save without breakable bricks, because such a level would already be done", () => {
    const empty = firstBricks.replace(/1/g, ".");
    expect(readBricks(0, empty)).toBeUndefined();
    const onlySolid = gridText((levels[3]?.cells ?? []).map((cell) => (cell > 0 ? 0 : cell)));
    expect(readBricks(3, onlySolid)).toBeUndefined();
  });
});

describe("Run", () => {
  it("starts in level 1 with 0 points, 3 lives and all bricks", () => {
    expect(newRun()).toEqual({ level: 0, score: 0, lives: startLives, bricks: firstBricks });
    expect(startLives).toBe(3);
  });

  it("goes on to the next level with points and lives after a level is done", () => {
    expect(afterLevel(0, 500, 2)).toEqual({ level: 1, score: 500, lives: 2, bricks: gridText(levels[1]?.cells ?? []) });
  });

  it("is won after level 10", () => {
    expect(levelCount).toBe(10);
    expect(afterLevel(levelCount - 2, 100, 1)?.level).toBe(levelCount - 1);
    expect(afterLevel(levelCount - 1, 100, 1)).toBeNull();
  });

  it("knows no level after the last one", () => {
    expect(() => runAt(levelCount, 0, 3)).toThrow("There is no level 11");
  });

  it("stays small and plain JSON as a save", () => {
    const save = { format: 1, run: runAt(levelCount - 1, 123_456, 3) };
    const text = JSON.stringify(save);
    expect(JSON.parse(text)).toEqual(save);
    expect(text.length).toBeLessThan(400);
  });
});

describe("Review: level changed", () => {
  it("starts the level over instead of discarding the whole run when the bricks no longer fit the level", () => {
    const run = runAt(2, 860, 3);
    const changed = { ...run, bricks: `${run.bricks}/${"1".repeat(run.bricks.split("/")[0]?.length ?? 0)}` };
    expect(readSave({ format: 1, run: changed })).toEqual({ format: 1, run: runAt(2, 860, 3) });
  });
});
