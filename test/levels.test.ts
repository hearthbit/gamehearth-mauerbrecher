import { describe, expect, it } from "vitest";
import { breakableCount, cellFromSymbol, columns, gridText, levelPlans, levels, maxRows, parseLevel, solid, symbolFromCell, unreachableBricks } from "../src/levels";

describe("Levels", () => {
  it("has 10 levels", () => {
    expect(levelPlans).toHaveLength(10);
    expect(levels).toHaveLength(10);
  });

  it.each(levels.map((level, index) => [index + 1, level] as const))("level %i is valid: 10 bricks wide, at most 12 rows, every breakable brick reachable", (_number, level) => {
    expect(level.rows).toBeGreaterThan(0);
    expect(level.rows).toBeLessThanOrEqual(maxRows);
    expect(level.cells).toHaveLength(level.rows * columns);
    expect(breakableCount(level.cells)).toBeGreaterThan(0);
    expect(unreachableBricks(level)).toEqual([]);
  });

  it("does not get easier from level to level: later levels need at least as many hits in total as level 1", () => {
    const hits = levels.map((level) => level.cells.filter((cell) => cell > 0).reduce((sum, cell) => sum + cell, 0));
    for (const total of hits.slice(1)) {
      expect(total).toBeGreaterThanOrEqual(hits[0] ?? 0);
    }
  });

  it("translates symbols and bricks in both directions", () => {
    expect(cellFromSymbol(".")).toBe(0);
    expect(cellFromSymbol("1")).toBe(1);
    expect(cellFromSymbol("3")).toBe(3);
    expect(cellFromSymbol("#")).toBe(solid);
    expect(cellFromSymbol("4")).toBeUndefined();
    expect([0, 1, 2, 3, solid].map(symbolFromCell).join("")).toBe(".123#");
  });

  it("writes the bricks as a short text with / between the rows", () => {
    const level = parseLevel("1.2.3.#...\n..........");
    expect(gridText(level.cells)).toBe("1.2.3.#.../..........");
    expect(parseLevel(gridText(level.cells))).toEqual(level);
  });

  it("reports broken levels clearly", () => {
    expect(() => parseLevel("111")).toThrow("exactly 10 bricks");
    expect(() => parseLevel("11111x1111")).toThrow('Unknown character "x"');
    expect(() => parseLevel("..........\n##########")).toThrow("at least one brick");
    expect(() => parseLevel("")).toThrow("1 to 12 rows");
    expect(() => parseLevel(Array.from({ length: 13 }, () => "1111111111").join("\n"))).toThrow("1 to 12 rows");
  });

  it("finds bricks that are locked in behind indestructible bricks", () => {
    const level = parseLevel("##########\n#1########\n##########");
    expect(unreachableBricks(level)).toEqual([11]);
    const open = parseLevel("##########\n#1.......#\n####.#####");
    expect(unreachableBricks(open)).toEqual([]);
  });

  it("accepts bricks above a gap if they can be reached from above", () => {
    const level = parseLevel("1111111111\n.#########");
    expect(unreachableBricks(level)).toEqual([]);
  });
});
