// The arcade: a second, smaller island west of the main one, joined to it by
// a rope bridge. Everything on it is laid out in the arcade's local space,
// where +z points back along the bridge towards the main island.
import { ISLAND_RADIUS, PLAZA_RADIUS, WALK_RADIUS, rotateY } from "./world";

export const ARCADE_RADIUS = 15;
export const ARCADE_WALK = 13.6;
export const ARCADE_COLOR = "#FF4F9A";

// Leaves the main island through the gap between the Mini Catalog App and the
// Task Tracker, the widest one on the ring.
const ANGLE = (261.8 * Math.PI) / 180;
const BRIDGE_GAP = 8;
const DISTANCE = ISLAND_RADIUS + BRIDGE_GAP + ARCADE_RADIUS;
export const BRIDGE_HALF_WIDTH = 1.05;

export const bridgeDir = { x: Math.sin(ANGLE), z: -Math.cos(ANGLE) };
const bridgeSide = { x: -bridgeDir.z, z: bridgeDir.x };

const cx = bridgeDir.x * DISTANCE;
const cz = bridgeDir.z * DISTANCE;
export const ARCADE = { x: cx, z: cz, rotY: Math.atan2(-cx, -cz) };

export const toWorld = (x, z) => {
    const [wx, wz] = rotateY(x, z, ARCADE.rotY);
    return [ARCADE.x + wx, ARCADE.z + wz];
};

export const toLocal = (x, z) => rotateY(x - ARCADE.x, z - ARCADE.z, -ARCADE.rotY);

// World facing (a player's rotY) for a direction given in arcade space.
export const worldYaw = (dx, dz) => {
    const [wx, wz] = rotateY(dx, dz, ARCADE.rotY);
    return Math.atan2(wx, wz);
};

// Distance from the main island's centre along the bridge, and sideways from it.
const along = (x, z) => x * bridgeDir.x + z * bridgeDir.z;
const side = (x, z) => x * bridgeSide.x + z * bridgeSide.z;
const fromAlongSide = (a, s) => [bridgeDir.x * a + bridgeSide.x * s, bridgeDir.z * a + bridgeSide.z * s];

export const BRIDGE_START = ISLAND_RADIUS - 0.6;
export const BRIDGE_END = DISTANCE - ARCADE_RADIUS + 0.6;
const WALK_START = WALK_RADIUS - 1.5;
const WALK_END = DISTANCE - ARCADE_WALK + 1.5;

export const bridgePoint = (a, s = 0) => fromAlongSide(a, s);

// The stone path from the plaza out to the bridge.
export const arcadePath = {
    from: { x: bridgeDir.x * PLAZA_RADIUS, z: bridgeDir.z * PLAZA_RADIUS },
    to: { x: bridgeDir.x * (BRIDGE_START + 0.4), z: bridgeDir.z * (BRIDGE_START + 0.4) },
};

// Keeps scenery off the path and the bridge's landing.
export const onArcadeApproach = (x, z, margin = 1.6) => {
    const a = along(x, z);
    return a > PLAZA_RADIUS && a < BRIDGE_START + 3 && Math.abs(side(x, z)) < margin;
};

// Which island a point belongs to: past the middle of the bridge is the arcade.
export const isOnArcadeSide = (x, z) => along(x, z) > (BRIDGE_START + BRIDGE_END) / 2;

// Pulls a position back onto solid ground: the main island, the bridge or the arcade.
export const clampToWalkable = (pos) => {
    const r = Math.hypot(pos.x, pos.z);
    if (r <= WALK_RADIUS) return;
    const dx = pos.x - ARCADE.x;
    const dz = pos.z - ARCADE.z;
    const ra = Math.hypot(dx, dz);
    if (ra <= ARCADE_WALK) return;
    const a = along(pos.x, pos.z);
    const s = side(pos.x, pos.z);
    if (a >= WALK_START && a <= WALK_END && Math.abs(s) <= BRIDGE_HALF_WIDTH) return;

    const options = [
        [(pos.x * WALK_RADIUS) / r, (pos.z * WALK_RADIUS) / r],
        [ARCADE.x + (dx * ARCADE_WALK) / ra, ARCADE.z + (dz * ARCADE_WALK) / ra],
        fromAlongSide(
            Math.min(WALK_END, Math.max(WALK_START, a)),
            Math.min(BRIDGE_HALF_WIDTH, Math.max(-BRIDGE_HALF_WIDTH, s))
        ),
    ];
    let best = options[0];
    let bestD = Infinity;
    for (const o of options) {
        const d = (o[0] - pos.x) ** 2 + (o[1] - pos.z) ** 2;
        if (d < bestD) {
            bestD = d;
            best = o;
        }
    }
    pos.x = best[0];
    pos.z = best[1];
};

// --- Layout (arcade space) ------------------------------------------------

export const ENTRY = { x: 0, z: 13.2 };
export const BOARD = { x: 0, z: -3.2 };
export const SIGNPOST = { along: BRIDGE_START - 2.2, side: 2.1 };

export const LANE = {
    x: -5.6,
    foulZ: 4.4,
    halfWidth: 0.75,
    gutter: 0.24,
    headPin: 8.4,
    pit: 9.5,
    length: 10.2,
};

export const TRACK = { radius: 11.5, halfWidth: 1.1, gates: 8, laps: 2 };
export const trackPoint = (angle, offset = 0) => [
    Math.sin(angle) * (TRACK.radius + offset),
    Math.cos(angle) * (TRACK.radius + offset),
];
// Gates sit half a step off the entrance axis so the path in stays clear.
export const gateAngle = (i) => ((i + 0.5) / TRACK.gates) * Math.PI * 2;
export const HURDLE_ANGLES = [1, 3, 5, 7].map((k) => (k / TRACK.gates) * Math.PI * 2);
export const HURDLE_HEIGHT = 0.55;

export const BUGS = {
    x: 5.6,
    z: -1.2,
    spacing: 1.8,
    fence: 3.1,
    duration: 30,
};
export const bugHoles = Array.from({ length: 9 }, (_, i) => ({
    x: BUGS.x + ((i % 3) - 1) * BUGS.spacing,
    z: BUGS.z + (Math.floor(i / 3) - 1) * BUGS.spacing,
}));

export const games = [
    { id: "bowling", color: "#8B5CF6", pad: { x: LANE.x, z: LANE.foulZ + 2.3 } },
    { id: "race", color: "#F97316", pad: { x: 2.7, z: 8.6 } },
    { id: "bugs", color: "#22C55E", pad: { x: BUGS.x, z: BUGS.z + BUGS.fence + 1.2 } },
].map((g) => {
    const [x, z] = toWorld(g.pad.x, g.pad.z);
    return { ...g, x, z };
});

export const ARCADE_LAMPS = [
    [-2.4, 9.4, "#22D3EE"],
    [2.4, 6.2, "#FACC15"],
    [-2.6, 1.2, ARCADE_COLOR],
    [2.6, -6.6, "#22D3EE"],
    [-2.2, -7.8, "#FACC15"],
];

// [x, z, scale]: three on the rim outside the track, two inside it.
export const ARCADE_TREES = [
    [13.7, 0, 1.1],
    [0, -13.7, 1.2],
    [-13.7, 0, 1],
    [-8.6, -2, 0.95],
    [7.9, 5.4, 0.9],
];

export const getGame = (id) => games.find((g) => g.id === id);
export const PAD_RADIUS = 1.3;

// Solid things on the arcade, in world space. A collider with `h` only
// blocks the player below that height, so hurdles can be jumped.
const local = [
    { x: BOARD.x, z: BOARD.z, r: 1.7 },
    ...ARCADE_LAMPS.map(([x, z]) => ({ x, z, r: 0.15 })),
    ...ARCADE_TREES.map(([x, z, s]) => ({ x, z, r: 0.35 * s })),
    // Bowling: the lane's side walls and back wall, as rows of circles.
    ...Array.from({ length: 12 }, (_, i) => [-1, 1].map((s) => ({
        x: LANE.x + s * (LANE.halfWidth + LANE.gutter + 0.25),
        z: LANE.foulZ - 0.4 - i * 0.92,
        r: 0.3,
    }))).flat(),
    ...[-1, 0, 1].map((s) => ({ x: LANE.x + s * 0.8, z: LANE.foulZ - LANE.length - 0.2, r: 0.55 })),
    // A rope fence around the bug field, open towards its pad.
    ...Array.from({ length: 14 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 8 + Math.PI / 16;
        return { x: BUGS.x + Math.sin(a) * BUGS.fence, z: BUGS.z + Math.cos(a) * BUGS.fence, r: 0.18 };
    }),
    // Gate posts.
    ...Array.from({ length: TRACK.gates }, (_, i) =>
        [-1, 1].map((s) => {
            const [x, z] = trackPoint(gateAngle(i), s * (TRACK.halfWidth + 0.2));
            return { x, z, r: 0.16 };
        })
    ).flat(),
    // Hurdles: a bar across the track.
    ...HURDLE_ANGLES.flatMap((a) =>
        [-0.75, 0, 0.75].map((o) => {
            const [x, z] = trackPoint(a, o);
            return { x, z, r: 0.38, h: HURDLE_HEIGHT };
        })
    ),
];

export const arcadeColliders = [
    ...local.map((c) => {
        const [x, z] = toWorld(c.x, c.z);
        return { ...c, x, z };
    }),
    (() => {
        const [x, z] = fromAlongSide(SIGNPOST.along, SIGNPOST.side);
        return { x, z, r: 0.3 };
    })(),
];
