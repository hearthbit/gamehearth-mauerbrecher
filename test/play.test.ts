import { describe, expect, it } from "vitest";
import { breakableCount, columns, levels, parseLevel, solid } from "../src/levels";
import {
  ballRadius,
  ballSpeed,
  brickHeight,
  brickTop,
  brickWidth,
  calmLimitMs,
  cellCenter,
  createWorld,
  currentPaddleWidth,
  currentSpeed,
  height,
  maxBalls,
  paddleSpeed,
  paddleWidth,
  paddleY,
  runFromWorld,
  slowFactor,
  slowMs,
  step,
  wall,
  wideMs,
  widePaddleWidth,
  width,
  type Ball,
  type Input,
  type Random,
  type World,
} from "../src/play";
import { newRun, readSave, runAt, startLives } from "../src/rules";

const idle: Input = { move: 0, dir: 0, launch: false };
const never: Random = () => 0.99;
const always: Random = () => 0;

function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function worldWith(text: string): World {
  const world = createWorld(newRun());
  const level = parseLevel(text);
  world.bricks = level.cells;
  world.rows = level.rows;
  world.left = breakableCount(level.cells);
  return world;
}

function flying(world: World, x: number, y: number, dx: number, dy: number): Ball {
  const length = Math.hypot(dx, dy);
  const ball: Ball = { x, y, dx: dx / length, dy: dy / length, resting: false };
  world.balls = [ball];
  return ball;
}

function run(world: World, ms: number, input: Input = idle, random: Random = never): string[] {
  const types: string[] = [];
  for (let t = 0; t < ms; t += 16) {
    for (const event of step(world, Math.min(16, ms - t), input, random)) {
      types.push(event.type);
    }
  }
  return types;
}

function insideBrick(world: World, ball: Ball): boolean {
  for (let index = 0; index < world.bricks.length; index++) {
    if (world.bricks[index] === 0) {
      continue;
    }
    const left = wall + (index % columns) * brickWidth;
    const top = brickTop + Math.floor(index / columns) * brickHeight;
    const overlapX = Math.min(ball.x + ballRadius, left + brickWidth) - Math.max(ball.x - ballRadius, left);
    const overlapY = Math.min(ball.y + ballRadius, top + brickHeight) - Math.max(ball.y - ballRadius, top);
    if (overlapX > 1e-6 && overlapY > 1e-6) {
      return true;
    }
  }
  return false;
}

describe("Start of a level", () => {
  it("puts the ball on the paddle in the middle and sets up all bricks", () => {
    const world = createWorld(newRun());
    expect(world.paddleX).toBe(width / 2);
    expect(world.balls).toEqual([{ x: width / 2, y: paddleY - ballRadius, dx: 0, dy: -1, resting: true }]);
    expect(world.left).toBe(50);
    expect(world.lives).toBe(startLives);
    expect(world.phase).toBe("playing");
  });

  it("takes over a saved state and writes it back the same way", () => {
    const saved = { ...runAt(4, 1230, 2) };
    saved.bricks = saved.bricks.replace("3333333333", "321321321.");
    const world = createWorld(saved);
    expect(world.left).toBe(breakableCount(levels[4]?.cells ?? []) - 1);
    const { motion, ...rest } = runFromWorld(world);
    expect(rest).toEqual(saved);
    expect(motion?.balls).toEqual([expect.objectContaining({ resting: true })]);
  });

  it("rejects bricks that do not fit the level", () => {
    expect(() => createWorld({ level: 0, score: 0, lives: 3, bricks: "1" })).toThrow("do not fit");
  });

  it("gets a little faster with every level", () => {
    expect(ballSpeed(9)).toBeGreaterThan(ballSpeed(0));
  });
});

describe("Paddle", () => {
  it("follows the finger and stays between the walls", () => {
    const world = createWorld(newRun());
    step(world, 16, { move: -40, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(width / 2 - 40);
    step(world, 16, { move: -1000, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(wall + paddleWidth / 2);
    step(world, 16, { move: 1000, dir: 0, launch: false }, never);
    expect(world.paddleX).toBe(width - wall - paddleWidth / 2);
  });

  it("moves evenly with the arrow keys", () => {
    const world = createWorld(newRun());
    step(world, 100, { move: 0, dir: 1, launch: false }, never);
    expect(world.paddleX).toBeCloseTo(width / 2 + paddleSpeed * 0.1);
  });

  it("carries the resting ball along", () => {
    const world = createWorld(newRun());
    step(world, 16, { move: 50, dir: 0, launch: false }, never);
    expect(world.balls[0]?.x).toBe(world.paddleX);
    expect(world.balls[0]?.resting).toBe(true);
  });

  it("sends the ball back at an angle depending on where it hits: middle straight, edge steeply to the side", () => {
    for (const [offset, sign] of [
      [0, 0],
      [25, 1],
      [-25, -1],
    ] as const) {
      const world = worldWith("1.........");
      const ball = flying(world, width / 2 + offset, paddleY - ballRadius - 3, 0, 1);
      step(world, 16, idle, never);
      expect(ball.dy).toBeLessThan(0);
      expect(Math.sign(Math.round(ball.dx * 100))).toBe(sign);
    }
  });

  it("lets the ball pass when the paddle is somewhere else", () => {
    const world = worldWith("1.........");
    const ball = flying(world, 40, paddleY - ballRadius - 3, 0, 1);
    world.paddleX = width - 60;
    step(world, 16, idle, never);
    expect(ball.dy).toBeGreaterThan(0);
  });
});

describe("Ball", () => {
  it("stays put until it is launched", () => {
    const world = createWorld(newRun());
    run(world, 1000);
    expect(world.balls[0]?.resting).toBe(true);
    step(world, 16, { move: 0, dir: 0, launch: true }, seeded(1));
    const ball = world.balls[0];
    expect(ball?.resting).toBe(false);
    expect(ball?.dy).toBeLessThan(0);
    expect(ball?.y).toBeLessThan(paddleY - ballRadius);
  });

  it("bounces off the walls and the ceiling", () => {
    const world = worldWith("1.........");
    const left = flying(world, wall + ballRadius + 1, 300, -1, -1);
    step(world, 16, idle, never);
    expect(left.dx).toBeGreaterThan(0);
    const right = flying(world, width - wall - ballRadius - 1, 300, 1, -1);
    step(world, 16, idle, never);
    expect(right.dx).toBeLessThan(0);
    const top = flying(world, width - 30, wall + ballRadius + 1, 0.3, -1);
    step(world, 16, idle, never);
    expect(top.dy).toBeGreaterThan(0);
  });

  it("smashes a brick and gets 10 points", () => {
    const world = worldWith("1111111111\n1111111111");
    const target = cellCenter(15);
    const ball = flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 2, 0, -1);
    const events = step(world, 16, idle, never).map((event) => ({ ...event }));
    expect(events).toEqual([{ type: "hit", index: 15, left: 0 }]);
    expect(world.bricks[15]).toBe(0);
    expect(world.score).toBe(10);
    expect(world.left).toBe(19);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("needs 3 hits for a red brick, every hit gives 10 points", () => {
    const world = worldWith("3........1");
    const target = cellCenter(0);
    for (const left of [2, 1, 0]) {
      flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
      step(world, 16, idle, never);
      expect(world.bricks[0]).toBe(left);
    }
    expect(world.score).toBe(30);
    expect(world.left).toBe(1);
  });

  it("cannot smash gray bricks and gets no points for them", () => {
    const world = worldWith("#........1");
    const target = cellCenter(0);
    const ball = flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, never);
    expect(world.bricks[0]).toBe(solid);
    expect(world.score).toBe(0);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("bounces off the side of a brick", () => {
    const world = worldWith("..........\n.....1....");
    const target = cellCenter(15);
    const ball = flying(world, target.x - brickWidth / 2 - ballRadius - 1, target.y, 1, 0.6);
    step(world, 16, idle, never);
    expect(ball.dx).toBeLessThan(0);
    expect(world.bricks[15]).toBe(0);
  });

  it("does not fly through a brick even in a long frame", () => {
    const world = worldWith("..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n.....1....");
    const target = cellCenter(105);
    const ball = flying(world, target.x, target.y + 30, 0, -1);
    world.level = 9;
    step(world, 100, idle, never);
    expect(world.bricks[105]).toBe(0);
    expect(ball.dy).toBeGreaterThan(0);
  });

  it("hits only one brick at the joint between two bricks and bounces back cleanly", () => {
    const world = worldWith("1111111111");
    const seam = wall + 5 * brickWidth;
    const ball = flying(world, seam, brickTop + brickHeight + ballRadius + 1, 0, -1);
    step(world, 16, idle, never);
    expect(breakableCount(world.bricks)).toBe(9);
    expect(ball.dy).toBeGreaterThan(0);
    expect(ball.dx).toBe(0);
  });
});

describe("Lives", () => {
  it("costs a life when the last ball falls out at the bottom; then a new ball lies on the paddle", () => {
    const world = worldWith("1.........");
    world.wideLeft = 5000;
    world.slowLeft = 5000;
    world.falling.push({ kind: "ball", x: 100, y: 300 });
    flying(world, 40, height - 2, 0, 1);
    const events = run(world, 100);
    expect(events).toEqual(["lost"]);
    expect(world.lives).toBe(2);
    expect(world.balls).toHaveLength(1);
    expect(world.balls[0]?.resting).toBe(true);
    expect(world.falling).toEqual([]);
    expect(world.wideLeft).toBe(0);
    expect(world.slowLeft).toBe(0);
    expect(world.phase).toBe("playing");
  });

  it("costs no life as long as another ball is still in play", () => {
    const world = worldWith("1.........");
    const keep: Ball = { x: 200, y: 300, dx: 0.6, dy: -0.8, resting: false };
    flying(world, 40, height - 2, 0, 1);
    world.balls.push(keep);
    const events = run(world, 100);
    expect(events).toEqual([]);
    expect(world.lives).toBe(startLives);
    expect(world.balls).toEqual([keep]);
  });

  it("is over with the last life", () => {
    const world = worldWith("1.........");
    world.lives = 1;
    flying(world, 40, height - 2, 0, 1);
    const events = run(world, 200);
    expect(events).toEqual(["over"]);
    expect(world.lives).toBe(0);
    expect(world.phase).toBe("over");
    expect(run(world, 200, { move: 30, dir: 0, launch: true })).toEqual([]);
  });
});

describe("Level done", () => {
  it("is done when all breakable bricks are gone; gray ones don't count", () => {
    const world = worldWith("#1######..");
    const target = cellCenter(1);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    const events = run(world, 32);
    expect(events).toEqual(["hit", "cleared"]);
    expect(world.phase).toBe("cleared");
    expect(world.left).toBe(0);
    expect(run(world, 500)).toEqual([]);
  });
});

describe("Extras", () => {
  it("sometimes falls from a destroyed brick", () => {
    const world = worldWith("1111111111");
    const target = cellCenter(3);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, always);
    expect(world.falling).toHaveLength(1);
    expect(world.falling[0]).toMatchObject({ kind: "breit", x: target.x });
    expect(world.falling[0]?.y).toBeGreaterThanOrEqual(target.y);
    expect(world.falling[0]?.y).toBeLessThan(target.y + 2);
    const none = worldWith("1111111111");
    flying(none, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(none, 16, idle, never);
    expect(none.falling).toEqual([]);
  });

  it("does not fall from damaged bricks, only from destroyed ones", () => {
    const world = worldWith("2222222222");
    const target = cellCenter(3);
    flying(world, target.x, target.y + brickHeight / 2 + ballRadius + 1, 0, -1);
    step(world, 16, idle, always);
    expect(world.falling).toEqual([]);
  });

  it("makes the paddle wider for 20 seconds", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "breit", x: world.paddleX, y: paddleY - 20 });
    const events = run(world, 400);
    expect(events).toContain("caught");
    expect(currentPaddleWidth(world)).toBe(widePaddleWidth);
    world.wideLeft = 100;
    run(world, 200);
    expect(currentPaddleWidth(world)).toBe(paddleWidth);
    expect(wideMs).toBe(20_000);
  });

  it("makes all balls slower for 15 seconds", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "langsam", x: world.paddleX, y: paddleY - 10 });
    run(world, 200);
    expect(currentSpeed(world)).toBeCloseTo(ballSpeed(0) * slowFactor);
    expect(world.slowLeft).toBeGreaterThan(slowMs - 300);
    world.slowLeft = 100;
    run(world, 200);
    expect(currentSpeed(world)).toBe(ballSpeed(0));
  });

  it("brings a second ball into play, at most 3 at once", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    for (let i = 0; i < 4; i++) {
      world.falling.push({ kind: "ball", x: world.paddleX, y: paddleY - 4 });
      run(world, 16);
    }
    expect(world.balls).toHaveLength(maxBalls);
    expect(world.balls.every((ball) => !ball.resting)).toBe(true);
  });

  it("disappears if it is not caught", () => {
    const world = worldWith("1.........");
    flying(world, 300, 200, 0.6, -0.8);
    world.falling.push({ kind: "ball", x: 30, y: paddleY + 20 });
    world.paddleX = width - 60;
    run(world, 1000);
    expect(world.falling).toEqual([]);
    expect(world.balls).toHaveLength(1);
  });
});

describe("Safety net", () => {
  it("gives a ball that hits nothing for a long time a small nudge in a new direction", () => {
    const world = worldWith("1.........");
    const ball = flying(world, 200, 300, 0, -1);
    world.calm = calmLimitMs;
    step(world, 16, idle, () => 0.5);
    expect(ball.dx).not.toBe(0);
    expect(Math.abs(ball.dy)).toBeGreaterThanOrEqual(0.5);
    expect(world.calm).toBe(0);
  });
});

describe("All levels can be played through", () => {
  it.each(levels.map((_level, index) => [index + 1, index] as const))("level %i: a computer player clears it in at most 15 minutes of game time without a ball ending up inside a brick or outside", (_number, index) => {
    const random = seeded(1000 + index);
    const world = createWorld(runAt(index, 0, startLives));
    let aim = 0;
    let elapsed = 0;
    while (world.phase === "playing" && elapsed < 15 * 60_000) {
      world.lives = startLives;
      const target = world.balls.filter((ball) => !ball.resting && ball.dy > 0).sort((a, b) => b.y - a.y)[0];
      if (elapsed % 1500 < 16) {
        aim = (random() - 0.5) * 50;
      }
      const goal = target === undefined ? world.paddleX : target.x + aim;
      step(world, 16, { move: goal - world.paddleX, dir: 0, launch: true }, random);
      elapsed += 16;
      for (const ball of world.balls) {
        expect(insideBrick(world, ball)).toBe(false);
        expect(ball.x).toBeGreaterThanOrEqual(wall + ballRadius - 1e-6);
        expect(ball.x).toBeLessThanOrEqual(width - wall - ballRadius + 1e-6);
        expect(ball.y).toBeGreaterThanOrEqual(wall + ballRadius - 1e-6);
        expect(Math.abs(ball.dy)).toBeGreaterThanOrEqual(0.49);
      }
    }
    expect(world.phase).toBe("cleared");
    expect(world.score).toBe((levels[index]?.cells ?? []).filter((cell) => cell > 0).reduce((sum, cell) => sum + cell * 10, 0));
  });
});

describe("Review: continue exactly there", () => {
  function roundTrip(world: World): World {
    const save = readSave(JSON.parse(JSON.stringify({ format: 1, run: runFromWorld(world) })));
    return createWorld(save.run as NonNullable<typeof save.run>);
  }

  it("keeps balls, paddle, running and falling extras across saving and loading", () => {
    const world = createWorld(newRun());
    const random = seeded(7);
    step(world, 16, { move: 0, dir: 0, launch: true }, random);
    for (let index = 0; index < 400; index++) {
      step(world, 16, { move: 0, dir: index % 50 < 25 ? 1 : -1, launch: false }, random);
    }
    world.wideLeft = 4000;
    world.slowLeft = 2500;
    world.falling.push({ kind: "ball", x: 100, y: 300 });
    const back = roundTrip(world);
    for (const key of ["score", "lives", "bricks", "paddleX", "balls", "falling", "wideLeft", "slowLeft", "calm"] as const) {
      expect(back[key], key).toEqual(world[key]);
    }
  });

  it("loses a life even if the ball was already below the paddle when the game was saved", () => {
    const world = createWorld(runAt(0, 120, 1));
    world.balls = [{ x: 180, y: paddleY + 20, dx: 0, dy: 1, resting: false }];
    const back = roundTrip(world);
    const events: string[] = [];
    for (let index = 0; index < 200 && !events.includes("over"); index++) {
      events.push(...step(back, 16, idle, never).map((event) => event.type));
    }
    expect(events).toContain("over");
  });

  it("puts the ball on the paddle for a save without movement or with broken movement", () => {
    const run = runAt(2, 300, 2);
    expect(createWorld(run).balls).toEqual([expect.objectContaining({ resting: true })]);
    const broken = createWorld({ ...run, motion: { paddleX: Number.NaN, balls: [], falling: [], wideLeft: 0, slowLeft: 0, calm: 0 } });
    expect(broken.balls).toEqual([expect.objectContaining({ resting: true })]);
  });
});
