// Head to Head: one-on-one head-ball in a floodlit stadium floating
// north-east of the islands. You play Frontend against the Backend Bot; the
// ball is a bug curled up tight, and whoever lets it into their goal takes
// the blame. The match itself is flat: x runs along the pitch (your goal on
// the left), y is height above the grass.
import { rotateY } from "../../../data/world";
import { playSound } from "../../sound";
import { COUNTDOWN } from "../countdown";

export const STADIUM = { x: 48, y: 4, z: -62 };
// Turned so the camera looks across the pitch back towards the islands.
export const STADIUM_YAW = Math.atan2(STADIUM.x, STADIUM.z);

// Stadium space (x along the pitch, z towards the camera) to world space.
export const stadiumToWorld = (x, y, z = 0) => {
    const [wx, wz] = rotateY(x, z, STADIUM_YAW);
    return [STADIUM.x + wx, STADIUM.y + y, STADIUM.z + wz];
};

// World facing (a player's rotY) for a direction in stadium space.
export const stadiumYaw = (dx, dz) => {
    const [wx, wz] = rotateY(dx, dz, STADIUM_YAW);
    return Math.atan2(wx, wz);
};

// --- The pitch ---------------------------------------------------------------

// Goal lines at x = ±HALF; the nets' backs (and the walls above them) at ±WALL.
export const HALF = 8.2;
export const WALL = 9.5;
// Underside of the crossbar; the goals' roofs slope up towards the back so
// the ball rolls off them back into play.
export const BAR = 3.2;
export const ROOF_RISE = 0.4;
const BAR_R = 0.07;
// The pitch is a neon cage: the ball bounces off the ceiling and the walls
// above the goals straight back into play.
export const CEILING = 7.6;
export const GOAL_WIDTH = 3.4;

export const BALL_R = 0.3;
// The players are big heads on a single boot: the head does most of the
// work, the boot kicks.
export const HEAD_Y = 1.05;
export const HEAD_R = 0.75;
const BODY_LOW = 0.2;
const BODY_HIGH = 0.45;
const BODY_R = 0.3;
const ITEM_R = 0.45;

const MATCH_TIME = 90;
const GOLDEN_TIME = 30;
const START_X = 4.2;
// After a goal: a moment in slow motion, then the celebration.
const PAUSE = 2.6;
const SLOW_MO = 0.8;

// Frontend in purple, Backend in terminal green.
export const TEAMS = ["#C084FC", "#4ADE80"];

// --- Movement ----------------------------------------------------------------

const SPEED = 6;
const BOT_SPEED = 5.4;
const ACCEL = 50;
const AIR_ACCEL = 26;
const JUMP = 9.2;
const GRAVITY = 26;

// A lively ball: bouncy off the grass, the walls and the ceiling.
const BALL_GRAVITY = 15;
const AIR_DRAG = 0.08;
const ROLL_FRICTION = 0.9;
const GROUND_BOUNCE = 0.72;
const WALL_BOUNCE = 0.85;
const CEILING_BOUNCE = 0.85;
const NET_BOUNCE = 0.25;
const ROOF_BOUNCE = 0.7;
const MAX_BALL = 25;

// A kick swings the boot through the space in front of the player.
export const KICK_TIME = 0.28;
const KICK_X = 0.62;
const KICK_Y = 0.3;
// The kicking leg's swing, `k` from 0 to 1 through a kick: it winds back,
// swings through and drops back down.
export const kickAngle = (k) => (k < 0.2 ? 0.8 * (k / 0.2) : k < 0.55 ? 0.8 - 2.6 * ((k - 0.2) / 0.35) : -1.8 * (1 - (k - 0.55) / 0.45));
const KICK_COOLDOWN = 0.36;
const KICK_REACH = 0.45;
// How far out the boot meets a ball `front` metres ahead, 0 (tucked in)
// to 1 (full stretch).
const reachOf = (front) => (front - 0.45) / 0.7;
// A full force meter turns the next kick into a flat, fast shot that
// bowls over whoever it hits ("git push --force").
const FORCE_SPEED = 19;
const FORCE_TIME = 0.9;

const SUBSTEPS = 4;
const IDLE = { move: 0, jump: false, kick: false };

// --- Setup -------------------------------------------------------------------

const newPlayer = (side) => ({
    // -1: you, defending the left goal; 1: the bot, defending the right.
    side,
    facing: -side,
    x: side * START_X,
    y: 0,
    vx: 0,
    vy: 0,
    kick: 0,
    kicked: false,
    cooldown: 0,
    force: 0,
    stun: 0,
    frozen: 0,
    coffee: 0,
    // When it last touched the ball, so a ball resting on a head doesn't
    // fill the force meter (or rattle) every frame.
    touch: -1,
    // The bot's face: 1 pleased, -1 upset, for `moodTime` seconds.
    mood: 0,
    moodTime: 0,
    // Seconds left of a squash (a header, a landing), for the looks.
    squash: 0,
});

export const newGame = () => ({
    count: COUNTDOWN,
    time: MATCH_TIME,
    golden: false,
    over: false,
    pause: 0,
    blame: false,
    scorer: 0,
    goals: [0, 0],
    // `force`: seconds of force shot left; `by`: who shot it; `ghost`:
    // a player the ball passes through for a moment after bowling them over.
    ball: { x: 0, y: 4.2, vx: 0, vy: 0, spin: 0, force: 0, by: null, last: null, ghost: null, ghostTime: 0 },
    players: [newPlayer(-1), newPlayer(1)],
    // Firewall seconds left in front of each goal.
    walls: [0, 0],
    item: null,
    nextItem: 12,
    shake: 0,
    cheer: { side: 0, time: 0 },
    ai: { target: START_X, jumpCool: 0, jitter: 0, jitterTime: 0, sprint: false, idle: 0 },
    clock: 0,
    lastThud: 0,
    published: "",
});

// The ball drops in the middle, drifting towards whoever just conceded.
export const kickoff = (g, toward = 0) => {
    Object.assign(g.ball, { x: 0, y: 4.2, vx: toward * 0.7, vy: 0, force: 0, by: null, last: null, ghost: null, ghostTime: 0 });
    for (const p of g.players) {
        Object.assign(p, { x: p.side * START_X, y: 0, vx: 0, vy: 0, kick: 0, kicked: false, stun: 0, frozen: 0 });
    }
    g.item = null;
    g.ai.target = START_X;
    playSound("whistle");
};

// --- Particles -----------------------------------------------------------------

const burst = (fx, x, y, color, count, speed, { up = 0, life = 0.6, size = 0.12, gravity = 9, spread = 1 } = {}) => {
    for (let i = 0; i < count && fx.length < 240; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.6);
        fx.push({
            x,
            y,
            z: (Math.random() - 0.5) * spread,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v + up,
            vz: (Math.random() - 0.5) * speed,
            life: life * (0.6 + Math.random() * 0.4),
            size,
            gravity,
            color,
        });
    }
};

// --- Physics -------------------------------------------------------------------

const speedOf = (g, p) => {
    let speed = p.side < 0 ? SPEED : BOT_SPEED;
    // The bot eases off when well ahead and digs in when well behind, and
    // sprints to get back round a ball that's slipped past it.
    if (p.side > 0) {
        const lead = g.goals[1] - g.goals[0];
        if (lead >= 2) speed *= 0.9;
        if (lead <= -2) speed *= 1.07;
        if (g.ai.sprint) speed *= 1.2;
    }
    return speed * (p.coffee > 0 ? 1.3 : 1);
};

const movePlayer = (g, p, ctrl, h) => {
    const held = p.frozen > 0 || p.stun > 0;
    const top = held ? 0 : ctrl.move * speedOf(g, p);
    const accel = (p.y > 0 ? AIR_ACCEL : ACCEL) * h;
    p.vx += Math.max(-accel, Math.min(accel, top - p.vx));
    if (p.frozen > 0) p.vx = 0;
    if (!held && ctrl.jump && p.y === 0) {
        p.vy = JUMP * (p.coffee > 0 ? 1.1 : 1);
        playSound("hop");
    }
    const wasX = p.x;
    p.vy -= GRAVITY * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (p.y <= 0) {
        // A thump on landing squashes the head for a moment.
        if (p.vy < -5) p.squash = 0.12;
        p.y = 0;
        p.vy = 0;
    }
    const limit = WALL - HEAD_R - 0.05;
    if (Math.abs(p.x) > limit) {
        p.x = Math.sign(p.x) * limit;
        p.vx = 0;
    }
    // Into the goal only low down: a head would hit the crossbar.
    const mouth = HALF - HEAD_R;
    const cap = BAR - HEAD_Y - HEAD_R - 0.02;
    if (Math.abs(p.x) > mouth && p.y > cap) {
        if (Math.abs(wasX) <= mouth) {
            p.x = Math.sign(p.x) * mouth;
            p.vx = 0;
        } else {
            p.y = cap;
            p.vy = Math.min(p.vy, 0);
        }
    }
};

// Two heads can't overlap (one can sail over the other in a jump), nor
// close in on a ball wedged between them.
const separate = (a, c, ball) => {
    const span = 2 * HEAD_R;
    const dy = c.y - a.y;
    if (Math.abs(dy) >= span) return;
    let gap = Math.sqrt(span * span - dy * dy);
    if (ball.x > Math.min(a.x, c.x) && ball.x < Math.max(a.x, c.x)) {
        const fit = HEAD_R + BALL_R;
        const level = ball.y - ((a.y + c.y) / 2 + HEAD_Y);
        if (Math.abs(level) < fit) gap = Math.max(gap, 2 * Math.sqrt(fit * fit - level * level) + 0.04);
    }
    const dx = c.x - a.x;
    if (Math.abs(dx) >= gap) return;
    const push = ((gap - Math.abs(dx)) / 2) * (dx >= 0 ? 1 : -1);
    a.x -= push;
    c.x += push;
};

// Bounces the ball off a moving circle. `minOut` makes sure it leaves with
// some pace (headers have punch, and nothing lets the ball settle on it).
const bounceOff = (b, cx, cy, r, vx, vy, e, minOut) => {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const min = r + BALL_R;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2) || 0.0001;
    const nx = dx / d;
    const ny = dy / d;
    b.x = cx + nx * min;
    b.y = cy + ny * min;
    let rvx = b.vx - vx;
    let rvy = b.vy - vy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
        rvx -= (1 + e) * vn * nx;
        rvy -= (1 + e) * vn * ny;
    }
    const out = rvx * nx + rvy * ny;
    if (out < minOut) {
        rvx += (minOut - out) * nx;
        rvy += (minOut - out) * ny;
    }
    b.vx = rvx + vx;
    b.vy = rvy + vy;
    return true;
};

// Bounces the ball off a fixed bar from (x1, y1) to (x2, y2); returns the
// impact speed, or 0 if it missed.
const hitBar = (b, x1, y1, x2, y2, e) => {
    const sx = x2 - x1;
    const sy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((b.x - x1) * sx + (b.y - y1) * sy) / (sx * sx + sy * sy)));
    const dx = b.x - (x1 + sx * t);
    const dy = b.y - (y1 + sy * t);
    const min = BAR_R + BALL_R;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return 0;
    const d = Math.sqrt(d2) || 0.0001;
    const nx = dx / d;
    const ny = dy / d;
    b.x = x1 + sx * t + nx * min;
    b.y = y1 + sy * t + ny * min;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return 0.001;
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
    return -vn;
};

const bodyPoint = (b, p) => Math.max(p.y + BODY_LOW, Math.min(p.y + BODY_HIGH, b.y));

const overlaps = (b, p) =>
    Math.hypot(b.x - p.x, b.y - p.y - HEAD_Y) < HEAD_R + BALL_R || Math.hypot(b.x - p.x, b.y - bodyPoint(b, p)) < BODY_R + BALL_R;

const touched = (g, p, sound, gain) => {
    g.ball.last = p;
    if (g.clock - p.touch > 0.15) {
        playSound(sound);
        p.force = Math.min(1, p.force + gain);
        if (sound === "header") p.squash = 0.16;
    }
    p.touch = g.clock;
};

// A kick off the grass, `reach` from 0 (ball tucked in close: a chip) to
// 1 (met at full stretch: a drive): [forward speed, upward speed].
const groundKick = (reach) => {
    const r = Math.max(0, Math.min(1, reach));
    return [7.5 + r * 5, 9.5 - r * 4.5];
};

const kickBall = (g, p, ctx) => {
    const b = g.ball;
    const f = p.facing;
    const height = b.y - p.y;
    if (p.force >= 1) {
        b.vx = f * FORCE_SPEED;
        b.vy = height > 1 ? 0.2 : 1;
        b.force = FORCE_TIME;
        b.by = p;
        p.force = 0;
        g.shake = Math.max(g.shake, 0.3);
        playSound("forceShot");
        burst(ctx.fx, b.x, b.y, TEAMS[p.side < 0 ? 0 : 1], 18, 6, { life: 0.5 });
        ctx.store.say("head.force", null, TEAMS[p.side < 0 ? 0 : 1]);
    } else {
        if (height < 0.7 && p.y < 0.05) {
            // Off the grass, where the foot meets the ball sets the shot: a
            // ball tucked in close is chipped up and over, one met at full
            // stretch is driven low and hard.
            const [vx, vy] = groundKick(reachOf((b.x - p.x) * f));
            b.vx = f * vx + p.vx * 0.35;
            b.vy = vy;
        } else {
            // A volley: flatter and harder.
            b.vx = f * 12 + p.vx * 0.3;
            b.vy = 3.4;
        }
        b.force = 0;
        p.force = Math.min(1, p.force + 0.09);
        playSound("kickBall");
        burst(ctx.fx, b.x, b.y, "#E2E8F0", 6, 2.5, { life: 0.35, size: 0.08 });
    }
    b.last = p;
    p.touch = g.clock;
};

// The ball against one player: their kick, a force shot bowling them over,
// or a bounce off their head or body.
const touchBall = (g, p, ctx) => {
    const b = g.ball;
    if (b.ghost === p && b.ghostTime > 0) return;
    const swing = KICK_TIME - p.kick;
    if (p.kick > 0 && !p.kicked && swing > 0.03 && swing < 0.2) {
        if (Math.hypot(b.x - (p.x + p.facing * KICK_X), b.y - (p.y + KICK_Y)) < KICK_REACH + BALL_R) {
            p.kicked = true;
            kickBall(g, p, ctx);
            return;
        }
    }
    if (b.force > 0 && b.by !== p && overlaps(b, p)) {
        // Knocked flat and sent flying back, while the ball pops up off them
        // for whoever follows it in.
        p.stun = 0.9;
        p.vx = b.vx > 0 ? 6 : -6;
        p.vy = 4;
        p.kick = 0;
        b.vx *= -0.25;
        b.vy = 5;
        b.force = 0;
        b.ghost = p;
        b.ghostTime = 0.12;
        g.shake = Math.max(g.shake, 0.45);
        playSound("knock");
        burst(ctx.fx, b.x, b.y, "#FDE047", 14, 5, { life: 0.45 });
        return;
    }
    // Only part of the player's own speed goes into the ball, so a jumping
    // header doesn't send it into orbit.
    if (bounceOff(b, p.x, p.y + HEAD_Y, HEAD_R, p.vx * 0.6, p.vy * 0.6, 0.65, 4.2)) {
        // Headers go the way the player faces.
        b.vx += p.facing * 1.3;
        touched(g, p, "header", 0.06);
    }
    if (bounceOff(b, p.x, bodyPoint(b, p), BODY_R, p.vx, p.vy * 0.6, 0.3, 1.2)) touched(g, p, "bump", 0.02);
};

const moveBall = (b, h) => {
    b.vy -= (b.force > 0 ? BALL_GRAVITY * 0.12 : BALL_GRAVITY) * h;
    const drag = 1 - AIR_DRAG * h;
    b.vx *= drag;
    b.vy *= drag;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > MAX_BALL) {
        b.vx *= MAX_BALL / speed;
        b.vy *= MAX_BALL / speed;
    }
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.spin -= (b.vx / BALL_R) * h;
    b.force = Math.max(0, b.force - h);
    b.ghostTime = Math.max(0, b.ghostTime - h);
};

const thud = (g, speed) => {
    if (speed < 3 || g.clock - g.lastThud < 0.08) return;
    g.lastThud = g.clock;
    playSound("thud", Math.min(1, speed / 14));
};

// Grass, walls, crossbars and firewalls.
const boundBall = (g, h, ctx) => {
    const b = g.ball;
    if (b.y < BALL_R) {
        b.y = BALL_R;
        if (b.vy < 0) {
            thud(g, -b.vy);
            b.vy = -b.vy > 1.2 ? -b.vy * GROUND_BOUNCE : 0;
        }
        b.vx *= 1 - ROLL_FRICTION * h;
    }
    if (b.y > CEILING - BALL_R) {
        b.y = CEILING - BALL_R;
        if (b.vy > 0) {
            thud(g, b.vy);
            b.vy = -b.vy * CEILING_BOUNCE;
        }
    }
    if (Math.abs(b.x) > WALL - BALL_R) {
        const s = Math.sign(b.x);
        const inNet = b.y < BAR + ROOF_RISE;
        b.x = s * (WALL - BALL_R);
        if (b.vx * s > 0) {
            if (!inNet) thud(g, Math.abs(b.vx));
            b.vx = -b.vx * (inNet ? NET_BOUNCE : WALL_BOUNCE);
        }
        b.force = 0;
    }
    for (const s of [-1, 1]) {
        const impact = hitBar(b, s * HALF, BAR, s * WALL, BAR + ROOF_RISE, ROOF_BOUNCE);
        if (impact > 0) {
            b.force = 0;
            if (impact > 4 && g.clock - g.lastThud > 0.12) {
                g.lastThud = g.clock;
                playSound("post");
                burst(ctx.fx, b.x, b.y, "#F8FAFC", 8, 3, { life: 0.3, size: 0.07 });
            }
        }
    }
    g.walls.forEach((left, i) => {
        if (left <= 0) return;
        const s = i === 0 ? -1 : 1;
        const line = s * (HALF - 0.1);
        if (b.y < BAR + 0.2 && s * b.x > s * line - BALL_R) {
            b.x = line - s * BALL_R;
            if (b.vx * s > 0) b.vx = -b.vx * 0.85 - s * 2;
            b.force = 0;
            playSound("zap");
            burst(ctx.fx, b.x, b.y, "#F97316", 10, 4, { life: 0.4 });
        }
    });
};

// When something solid pins the ball against a player (the grass under
// them, a wall, the crossbar), the player gives way: a ball under their
// feet squirts out sideways, otherwise they're shoved back off it.
const unsqueeze = (g) => {
    const b = g.ball;
    for (const p of g.players) {
        if ((b.ghost === p && b.ghostTime > 0) || !overlaps(b, p)) continue;
        const side = b.x >= p.x ? 1 : -1;
        if (b.y < p.y + BODY_LOW) {
            b.x = p.x + side * (BODY_R + BALL_R + 0.02);
            b.vx = side * Math.max(Math.abs(b.vx), 2.5);
        } else {
            // Far enough sideways to clear the head at the ball's height.
            const fit = HEAD_R + BALL_R + 0.02;
            const level = b.y - (p.y + HEAD_Y);
            const clear = Math.max(BODY_R + BALL_R + 0.02, Math.sqrt(Math.max(0, fit * fit - level * level)));
            p.x = b.x - side * clear;
        }
    }
};

const checkGoal = (g, ctx) => {
    const b = g.ball;
    if (Math.abs(b.x) < HALF + BALL_R || b.y > BAR) return false;
    // Into your goal (left) is the bot's goal, and the other way round.
    const scorer = b.x < 0 ? 1 : 0;
    g.goals[scorer] += 1;
    g.scorer = scorer;
    g.pause = PAUSE;
    g.blame = false;
    g.shake = 0.6;
    g.cheer = { side: scorer, time: 2.6 };
    g.item = null;
    const bot = g.players[1];
    bot.mood = scorer === 1 ? 1 : -1;
    bot.moodTime = PAUSE + 0.4;
    playSound("goalRoar");
    ctx.store.say("head.goal", null, TEAMS[scorer]);
    const x = Math.sign(b.x) * HALF;
    burst(ctx.fx, x, 1.4, TEAMS[scorer], 40, 7, { up: 3, life: 1.4, size: 0.14, gravity: 6, spread: 3 });
    burst(ctx.fx, x, 1.4, "#FACC15", 24, 6, { up: 3, life: 1.4, size: 0.12, gravity: 6, spread: 3 });
    return true;
};

const tickPlayer = (p, dt) => {
    p.kick = Math.max(0, p.kick - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.stun = Math.max(0, p.stun - dt);
    p.frozen = Math.max(0, p.frozen - dt);
    p.coffee = Math.max(0, p.coffee - dt);
    p.moodTime = Math.max(0, p.moodTime - dt);
    if (p.moodTime === 0) p.mood = 0;
    p.squash = Math.max(0, p.squash - dt);
};

const startKick = (p, ctrl) => {
    if (!ctrl.kick || p.kick > 0 || p.cooldown > 0 || p.frozen > 0 || p.stun > 0) return;
    p.kick = KICK_TIME;
    p.kicked = false;
    p.cooldown = KICK_COOLDOWN;
    playSound("swing");
};

const stepPhysics = (g, dt, mine, theirs, ctx, live) => {
    const [you, bot] = g.players;
    startKick(you, mine);
    startKick(bot, theirs);
    const h = dt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) {
        movePlayer(g, you, mine, h);
        movePlayer(g, bot, theirs, h);
        separate(you, bot, g.ball);
        moveBall(g.ball, h);
        touchBall(g, you, ctx);
        touchBall(g, bot, ctx);
        boundBall(g, h, ctx);
        unsqueeze(g);
        if (live && checkGoal(g, ctx)) break;
    }
    for (const p of g.players) {
        tickPlayer(p, dt);
        // The force meter also fills slowly on its own.
        if (live) p.force = Math.min(1, p.force + dt * 0.018);
    }
    g.walls[0] = Math.max(0, g.walls[0] - dt);
    g.walls[1] = Math.max(0, g.walls[1] - dt);
};

// --- Power-ups -----------------------------------------------------------------

const ITEM_KINDS = ["coffee", "wall", "freeze"];
export const ITEM_COLORS = { coffee: "#F59E0B", wall: "#F97316", freeze: "#22D3EE" };

// One floats over the pitch now and then; heading it, or hitting it with
// the ball, wins it for whoever touched the ball last.
const stepItems = (g, dt, ctx) => {
    const it = g.item;
    if (!it) {
        g.nextItem -= dt;
        if (g.nextItem > 0) return;
        g.item = {
            kind: ITEM_KINDS[Math.floor(Math.random() * ITEM_KINDS.length)],
            x: (Math.random() - 0.5) * 9,
            y: 3.1 + Math.random() * 1.3,
            life: 10,
        };
        g.nextItem = 15 + Math.random() * 6;
        playSound("itemSpawn");
        return;
    }
    it.life -= dt;
    if (it.life <= 0) {
        g.item = null;
        return;
    }
    const b = g.ball;
    let taker = null;
    if (Math.hypot(b.x - it.x, b.y - it.y) < BALL_R + ITEM_R) taker = b.last ?? g.players[0];
    for (const p of g.players) {
        if (Math.hypot(p.x - it.x, p.y + HEAD_Y - it.y) < HEAD_R + ITEM_R) taker = p;
    }
    if (!taker) return;
    g.item = null;
    const team = taker.side < 0 ? 0 : 1;
    if (it.kind === "coffee") taker.coffee = 8;
    if (it.kind === "wall") g.walls[team] = 6.5;
    if (it.kind === "freeze") g.players[1 - team].frozen = 2.6;
    playSound(it.kind === "freeze" ? "freeze" : "powerup");
    ctx.store.say(`head.${it.kind}`, null, TEAMS[team]);
    burst(ctx.fx, it.x, it.y, ITEM_COLORS[it.kind], 20, 5, { life: 0.6 });
};

// --- The Backend Bot ---------------------------------------------------------

// Where the ball will be over the next second and a bit, ignoring players.
const PATH = Array.from({ length: 40 }, () => ({ x: 0, y: 0, t: 0 }));
const PATH_STEP = 1 / 30;

const forecast = (b) => {
    let { x, y, vx, vy } = b;
    const h = PATH_STEP / 2;
    PATH.forEach((pt, i) => {
        for (let k = 0; k < 2; k++) {
            vy -= BALL_GRAVITY * h;
            vx *= 1 - AIR_DRAG * h;
            x += vx * h;
            y += vy * h;
            if (y < BALL_R) {
                y = BALL_R;
                vy = Math.abs(vy) > 1.2 ? Math.abs(vy) * GROUND_BOUNCE : 0;
                vx *= 1 - ROLL_FRICTION * h;
            }
            if (y > CEILING - BALL_R) {
                y = CEILING - BALL_R;
                vy = -Math.abs(vy) * CEILING_BOUNCE;
            }
            if (Math.abs(x) > WALL - BALL_R) {
                x = Math.sign(x) * (WALL - BALL_R);
                vx = -vx * (y < BAR ? NET_BOUNCE : WALL_BOUNCE);
            }
        }
        pt.x = x;
        pt.y = y;
        pt.t = (i + 1) * PATH_STEP;
    });
};

const botControls = { move: 0, jump: false, kick: false };
// Seconds from take-off until a jump has risen `h` metres.
const riseTime = (h) => (JUMP - Math.sqrt(Math.max(0, JUMP * JUMP - 2 * GRAVITY * h))) / GRAVITY;
const chance = (rate, dt) => Math.random() < 1 - Math.exp(-rate * dt);

// The bot goes for the ball unless you're clearly closer to it (or the ball
// is near its goal, or loose in its half): it runs to the first point on
// the ball's path it can reach in time, on its own goal's side so a touch
// sends it your way. While you have the ball it guards its goal a few steps
// in front of it instead. It heads balls in the air, jumps to block shots,
// sprints and hops to get back round a ball that's slipped past it, and
// times its kicks to chip over you or drive under the bar, all with a
// slight lag and a little inaccuracy.
const thinkBot = (g, dt) => {
    const out = botControls;
    out.move = 0;
    out.jump = false;
    out.kick = false;
    const [you, bot] = g.players;
    const b = g.ball;
    const ai = g.ai;
    if (bot.frozen > 0 || bot.stun > 0) return out;
    forecast(b);
    const speed = speedOf(g, bot);
    // Where it can play the ball: low ones with the boot (ball in front of
    // it), the rest with its head, a little to its own goal's side.
    let reach = null;
    for (const pt of PATH) {
        if (pt.y > HEAD_Y + HEAD_R + 1.7) continue;
        const x = pt.x + (pt.y < 0.75 ? KICK_X + 0.1 : 0.4);
        if (Math.abs(x - bot.x) <= speed * pt.t + 0.25) {
            reach = { x, y: pt.y, t: pt.t };
            break;
        }
    }
    const behind = b.x > bot.x + 0.1;
    ai.sprint = behind && b.x > -2;
    const yourGap = Math.abs(b.x - you.x);
    // A ball left lying about for a moment is fair game too.
    ai.idle = Math.hypot(b.vx, b.vy) < 1.5 ? ai.idle + dt : 0;
    const engage = Math.abs(b.x - bot.x) < yourGap + 0.4 || b.x > HALF - 3 || (b.x > 0 && yourGap > 1.5) || ai.idle > 1.2;
    let spot;
    // How high it has to jump to head the ball, and how long until it's there.
    let lift = 0;
    let when = 0;
    if (behind) spot = b.x + 0.9;
    else if (engage && reach) {
        spot = reach.x;
        lift = reach.y - HEAD_Y;
        when = reach.t;
    } else spot = Math.max(b.x + 2.6, 3.4);
    ai.jitterTime -= dt;
    if (ai.jitterTime <= 0) {
        ai.jitter = (Math.random() - 0.5) * 0.7;
        ai.jitterTime = 0.6;
    }
    spot = Math.max(-HALF + 0.6, Math.min(WALL - 0.5, spot + ai.jitter));
    const lead = g.goals[1] - g.goals[0];
    ai.target += (spot - ai.target) * Math.min(1, dt * (lead >= 2 ? 4 : 6));
    const gap = ai.target - bot.x;
    if (Math.abs(gap) > 0.12) out.move = Math.sign(gap) * Math.min(1, Math.abs(gap) * 2.5 + 0.3);

    ai.jumpCool -= dt;
    if (bot.y === 0 && ai.jumpCool <= 0) {
        const dx = b.x - bot.x;
        // Balls at head height or lower it plays standing; higher ones it
        // jumps for, timed to meet them on the way up.
        const header = lift > 0.85 && when < riseTime(lift - 0.55) + 0.04 && Math.abs(spot - bot.x) < 0.8;
        const block = b.vx > 4 && b.y > HEAD_Y + HEAD_R + 0.1 && b.y < HEAD_Y + HEAD_R + 1.8 && -dx > 0.6 && -dx < 2.8;
        const hop = behind && dx < 1.6 && b.y < 1.1;
        if ((header || block || hop) && chance(10, dt)) {
            out.jump = true;
            ai.jumpCool = 0.35;
        }
    }
    // It picks its moment so the shot clears you and dips under the bar.
    const front = bot.x - b.x;
    if (front > 0.2 && front < 1.2 && b.y - bot.y < 0.95) {
        const aim = b.y - bot.y < 0.7 ? shotReach(b.x, you) : null;
        const ready = aim === null || Math.abs(reachOf(front) - aim) < 0.18 || front > 1.05;
        if (ready && chance(9, dt)) out.kick = true;
    }
    return out;
};

// The best kick off the grass from `x` towards your goal: the reach (see
// groundKick) whose path clears your head, if you're in the way, and is
// lowest under the bar on reaching the goal line; null if none gets there.
const shotReach = (x, you) => {
    let best = null;
    let bestScore = Infinity;
    for (let r = 0; r <= 1.001; r += 0.125) {
        const [vx, vy] = groundKick(r);
        const height = (d) => {
            const t = d / vx;
            return BALL_R + vy * t - (BALL_GRAVITY / 2) * t * t;
        };
        const atGoal = height(x + HALF);
        if (atGoal < BALL_R || atGoal > BAR - BALL_R - 0.1) continue;
        const gap = x - you.x;
        if (gap > 0 && gap < 5 && height(gap) < you.y + HEAD_Y + HEAD_R + BALL_R) continue;
        if (atGoal < bestScore) {
            bestScore = atGoal;
            best = r;
        }
    }
    return best;
};

// --- The match -----------------------------------------------------------------

const endMatch = (g, store) => {
    g.over = true;
    const [mine, theirs] = g.goals;
    const outcome = mine > theirs ? "win" : mine < theirs ? "loss" : "draw";
    playSound("finalWhistle");
    if (outcome === "win") playSound("crowd", 1.3);
    // Only wins count as records: by goal difference, then goals scored.
    const score = outcome === "win" ? (mine - theirs) * 100 + mine : 0;
    store.finish(score, { goals: [mine, theirs], outcome, golden: g.golden });
};

// What the HUD shows, pushed to the store only when it changes.
export const publish = (g, store) => {
    const you = g.players[0];
    const time = Math.max(0, Math.ceil(g.time));
    const force = Math.round(you.force * 20) / 20;
    const powers = { coffee: you.coffee > 0, wall: g.walls[0] > 0, frozen: you.frozen > 0 };
    const summary = `${g.goals.join(":")}|${time}|${g.golden}|${force}|${Object.values(powers).join()}`;
    if (summary === g.published) return;
    g.published = summary;
    store.update({
        score: g.goals[0],
        time,
        detail: {
            goals: [...g.goals],
            time,
            golden: g.golden,
            force,
            powers,
        },
    });
};

// One frame of the match. `mine` holds the player's controls; `ctx` the
// arcade store and the particle list.
export const stepMatch = (g, dt, mine, ctx) => {
    if (g.over) return;
    g.clock += dt;
    g.shake = Math.max(0, g.shake - dt);
    g.cheer.time = Math.max(0, g.cheer.time - dt);
    if (g.pause > 0) {
        g.pause -= dt;
        const slow = g.pause > PAUSE - SLOW_MO ? 0.3 : 1;
        stepPhysics(g, dt * slow, IDLE, IDLE, ctx, false);
        // Then whose fault it was.
        if (!g.blame && g.pause < PAUSE - 1.1) {
            g.blame = true;
            ctx.store.say(g.scorer === 0 ? "head.blameBack" : "head.blameFront", null, TEAMS[g.scorer]);
        }
        if (g.pause <= 0) {
            if (g.golden) {
                endMatch(g, ctx.store);
                return;
            }
            kickoff(g, g.scorer === 0 ? 1 : -1);
        }
        publish(g, ctx.store);
        return;
    }
    g.time -= dt;
    if (g.time <= 0) {
        if (!g.golden && g.goals[0] === g.goals[1]) {
            g.golden = true;
            g.time = GOLDEN_TIME;
            playSound("whistle");
            ctx.store.say("head.golden", null, "#FACC15");
        } else {
            g.time = 0;
            publish(g, ctx.store);
            endMatch(g, ctx.store);
            return;
        }
    }
    stepPhysics(g, dt, mine, thinkBot(g, dt), ctx, true);
    stepItems(g, dt, ctx);
    publish(g, ctx.store);
};

// Before kick-off the ball hangs over the centre spot.
export const holdForKickoff = (g, dt) => {
    g.clock += dt;
    g.ball.y = 4.2 + Math.sin(g.clock * 3) * 0.08;
};
