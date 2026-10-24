// Island layout: eleven landmarks spread evenly around the plaza. Angles are measured clockwise
// from north (-z); every
// landmark's front (+z in its local space) faces the central plaza.

export const ISLAND_RADIUS = 28;
export const WALK_RADIUS = 26;
export const PLAZA_RADIUS = 4.6;
export const ENTRANCE_DISTANCE = 4.4;
export const INTERACT_RADIUS = 3.2;
export const SPAWN = { x: 0, z: 6, yaw: 0 };

const deg = (d) => (d * Math.PI) / 180;

// Rotate a local (x, z) offset by a Y rotation, matching three.js.
export const rotateY = (x, z, rot) => [
    x * Math.cos(rot) + z * Math.sin(rot),
    -x * Math.sin(rot) + z * Math.cos(rot),
];

const defs = [
    {
        id: "soap",
        kind: "soap",
        angle: 343.6,
        radius: 17,
        color: "#5E8C3A",
        label: "The Soap Opera",
        labelHeight: 5.4,
        colliders: [[0, -0.4, 2.7], [-3.1, 1.6, 0.9], [2.9, 1.3, 0.7], [-3.4, -2.3, 0.4], [3.3, -2.0, 0.45], [3.6, 0.4, 0.35]],
    },
    {
        id: "nature",
        kind: "nature",
        angle: 16.4,
        radius: 17,
        color: "#A0562B",
        label: "Nature Kahve",
        labelHeight: 8,
        colliders: [[0, -0.4, 2.7], [-3.0, 0.6, 0.85], [-3.0, 2.3, 0.75], [2.45, 1.5, 0.4]],
    },
    {
        id: "rime",
        kind: "rime",
        angle: 81.8,
        radius: 17,
        color: "#3D5A9E",
        label: "Rime",
        labelHeight: 5.8,
        colliders: [[0, -0.5, 3.1], [-3.1, 0.9, 0.7], [3.1, 0.9, 0.7]],
    },
    {
        id: "param",
        kind: "param",
        angle: 114.5,
        radius: 17.5,
        color: "#6D4AFF",
        label: "Param",
        labelHeight: 10.8,
        colliders: [[0, -0.3, 2.7]],
    },
    {
        id: "paramtech",
        kind: "paramtech",
        angle: 147.3,
        radius: 17,
        color: "#12B5A5",
        label: "ParamTech",
        labelHeight: 5.6,
        colliders: [[0, -0.4, 2.8], [3.0, 0.6, 0.6]],
    },
    {
        id: "home",
        kind: "home",
        angle: 180.0,
        radius: 17,
        color: "#F07A4A",
        label: "About Me",
        labelTr: "Hakkımda",
        labelHeight: 6,
        colliders: [[0, -0.3, 2.5], [2.6, 1.9, 0.4], [-2.6, 1.3, 0.7], [-1.9, 1.6, 0.35]],
    },
    {
        id: "isimiz",
        kind: "isimiz",
        angle: 212.7,
        radius: 17,
        color: "#E9A23B",
        label: "İşimiz Var Gücümüz Var",
        shortLabel: "İşimiz Var",
        labelHeight: 7.3,
        colliders: [[0, -0.3, 2.5], [-2.2, 1.0, 0.7], [-2.3, 2.7, 0.45]],
    },
    {
        id: "mobile",
        kind: "mobile",
        angle: 245.5,
        radius: 17,
        color: "#1E88E5",
        label: "Mini Catalog App",
        labelHeight: 6.8,
        colliders: [[0, -0.5, 1.9], [-2.6, 1.2, 0.55], [-1.9, 1.9, 0.45]],
    },
    {
        id: "tasks",
        kind: "tasks",
        angle: 278.2,
        radius: 17,
        color: "#14B8A6",
        label: "Task Tracker",
        labelHeight: 7.2,
        colliders: [[0, -0.5, 1.9]],
    },
    {
        id: "arts",
        kind: "arts",
        angle: 310.9,
        radius: 17,
        color: "#2F8FEF",
        label: "My Arts",
        labelTr: "Tasarımlarım",
        labelHeight: 5.4,
        colliders: [[0, -0.6, 2.6], [-2.9, 1.5, 0.6], [2.95, 1.3, 0.6], [2.6, -0.9, 0.5]],
    },
    {
        id: "hypatia",
        kind: "hypatia",
        angle: 49.1,
        radius: 17.5,
        color: "#B24BD8",
        label: "Hypatia",
        labelHeight: 7.4,
        colliders: [[0, -0.3, 3.0]],
    },
];

export const landmarks = defs.map((d) => {
    const a = deg(d.angle);
    const x = Math.sin(a) * d.radius;
    const z = -Math.cos(a) * d.radius;
    const rotY = Math.atan2(-x, -z);
    const toCenter = { x: -Math.sin(a), z: Math.cos(a) };
    const entrance = {
        x: x + toCenter.x * ENTRANCE_DISTANCE,
        z: z + toCenter.z * ENTRANCE_DISTANCE,
    };
    const colliders = d.colliders.map(([lx, lz, r]) => {
        const [wx, wz] = rotateY(lx, lz, rotY);
        return { x: x + wx, z: z + wz, r };
    });
    return {
        ...d,
        x,
        z,
        rotY,
        toCenter,
        entrance,
        colliders,
        type: d.id === "home" ? "about" : "project",
    };
});

export const projectLandmarks = landmarks.filter((l) => l.type === "project");
export const getLandmark = (id) => landmarks.find((l) => l.id === id);

// Deterministic random so the island looks the same on every visit.
export const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const distToSegment = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

// Paths run from the plaza edge to each landmark entrance.
export const paths = landmarks.map((l) => ({
    from: { x: -l.toCenter.x * PLAZA_RADIUS, z: -l.toCenter.z * PLAZA_RADIUS },
    to: l.entrance,
}));

// True when a spot is free for scenery (trees, rocks, flowers).
export const isOpenGround = (x, z, margin = 0, maxRadius = WALK_RADIUS - 0.4) => {
    const r = Math.hypot(x, z);
    if (r < PLAZA_RADIUS + 1.6 + margin) return false;
    if (r > maxRadius) return false;
    for (const l of landmarks) {
        if (Math.hypot(x - l.x, z - l.z) < 6.2 + margin) return false;
        if (Math.hypot(x - l.entrance.x, z - l.entrance.z) < 2.6 + margin) return false;
    }
    for (const p of paths) {
        if (distToSegment(x, z, p.from.x, p.from.z, p.to.x, p.to.z) < 1.7 + margin) return false;
    }
    return true;
};
