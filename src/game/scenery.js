// Scatters trees, rocks and flowers across the island. Deterministic, so the
// same positions feed both the renderer and the player's collision checks.
import { isOpenGround, landmarks, PLAZA_RADIUS, WALK_RADIUS, rotateY, seeded } from "../data/world";
import { arcadeColliders, onArcadeApproach } from "../data/arcade";

const rand = seeded(20260930);
const between = (a, b) => a + rand() * (b - a);

const scatter = (count, attempts, { minR = PLAZA_RADIUS + 2, maxR = WALK_RADIUS - 0.4, margin = 0, spacing = 0, avoid = [] }) => {
    const out = [];
    for (let i = 0; i < attempts && out.length < count; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(between((minR / maxR) ** 2, 1)) * maxR;
        const x = Math.sin(a) * r;
        const z = -Math.cos(a) * r;
        if (!isOpenGround(x, z, margin, maxR)) continue;
        const tooClose = [...out, ...avoid].some((p) => Math.hypot(p.x - x, p.z - z) < spacing);
        if (tooClose) continue;
        out.push({ x, z });
    }
    return out;
};

const TREE_GREENS = ["#5E9E47", "#6FB14F", "#86C05A", "#4F8F42"];
const BLOSSOM = ["#F6A5C0", "#F9C4D6"];

// Keep the view from the spawn point clear.
const inSpawnView = (p) => Math.abs(p.x) < 4.5 && p.z > 2 && p.z < 15;

// Applied after the random draws so the rest of the island keeps its layout.
const offApproach = (margin) => (p) => !onArcadeApproach(p.x, p.z, margin);

export const trees = scatter(40, 900, { spacing: 2.6, margin: 0.4 }).filter((p) => !inSpawnView(p)).map((p) => {
    const kind = rand() < 0.32 ? "pine" : "round";
    const blossom = kind === "round" && rand() < 0.18;
    return {
        ...p,
        kind,
        scale: between(0.85, 1.35),
        rotation: rand() * Math.PI * 2,
        color: blossom ? BLOSSOM[Math.floor(rand() * BLOSSOM.length)] : TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)],
    };
}).filter(offApproach(2.2));

export const rocks = [
    ...scatter(12, 400, { spacing: 2, margin: 0.2, avoid: trees }),
    ...scatter(10, 300, { minR: WALK_RADIUS - 1, maxR: WALK_RADIUS + 0.9, spacing: 3, avoid: trees }),
].map((p) => ({ ...p, scale: between(0.35, 0.8), rotation: rand() * Math.PI * 2 })).filter(offApproach(2.2));

export const bushes = scatter(26, 600, { spacing: 1.6, margin: -0.4, avoid: [...trees, ...rocks] }).map((p) => ({
    ...p,
    scale: between(0.45, 0.75),
    color: TREE_GREENS[Math.floor(rand() * TREE_GREENS.length)],
})).filter(offApproach(1.8));

const FLOWER_COLORS = ["#FF8FAB", "#FFD166", "#FFFFFF", "#B79CFF", "#FF9F68"];

// Flowers grow in small clusters.
export const flowers = scatter(34, 800, { spacing: 1.2, margin: -0.9 }).flatMap((c) => {
    const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
    return Array.from({ length: 5 }, () => ({
        x: c.x + between(-0.6, 0.6),
        z: c.z + between(-0.6, 0.6),
        color,
        scale: between(0.8, 1.2),
    }));
}).filter(offApproach(1.2));

export const grass = scatter(420, 4000, { minR: 3, spacing: 0, margin: -1.2 }).map((p) => ({
    ...p,
    scale: between(0.7, 1.3),
    rotation: rand() * Math.PI,
})).filter(offApproach(1.1));

export const grassPatches = scatter(18, 400, { minR: 6, spacing: 4, margin: -1.2 }).map((p) => ({
    ...p,
    radius: between(1.4, 2.6),
}));

// Lamps ring the plaza between the paths (one gives way to the arcade path).
const LAMP_COUNT = 11;
export const lamps = Array.from({ length: LAMP_COUNT }, (_, i) => {
    const a = ((180 + (i + 0.5) * (360 / LAMP_COUNT)) * Math.PI) / 180;
    return { x: Math.sin(a) * (PLAZA_RADIUS + 0.7), z: -Math.cos(a) * (PLAZA_RADIUS + 0.7) };
}).filter(offApproach(1));

export const WELCOME_SIGN = { x: -1.1, z: 3.45, rot: 0.4 };

// Poster boards stand beside each project's entrance.
export const POSTER_OFFSET = { x: 2.3, z: 3.3, rot: -0.5 };

export const posters = landmarks
    .filter((l) => l.type === "project")
    .map((l) => {
        const [wx, wz] = rotateY(POSTER_OFFSET.x, POSTER_OFFSET.z, l.rotY);
        return { id: l.id, x: l.x + wx, z: l.z + wz };
    });

export const colliders = [
    { x: 0, z: 0, r: 2.3 }, // fountain
    { x: WELCOME_SIGN.x, z: WELCOME_SIGN.z, r: 0.5 },
    ...landmarks.flatMap((l) => l.colliders),
    ...posters.map((p) => ({ x: p.x, z: p.z, r: 0.45 })),
    ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.scale })),
    ...rocks.map((r) => ({ x: r.x, z: r.z, r: r.scale * 0.9 })),
    ...lamps.map((l) => ({ x: l.x, z: l.z, r: 0.25 })),
    ...arcadeColliders,
];
