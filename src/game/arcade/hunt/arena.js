// Bug Hunt's arena: a neon server room on a floating platform north-west of
// the arcade. Bugs crawl in through four portals towards the server core in
// the middle; the player defends it with a blaster.
export const HUNT = { x: -82, y: 4, z: -38 };
export const ARENA_RADIUS = 13;
export const WALK_LIMIT = 12.2;
export const CORE_RADIUS = 1.7;
export const CORE_HP = 100;
export const WAVES = 5;

// Portals stand at the arena's edge, on the diagonals.
export const portals = [45, 135, 225, 315].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: HUNT.x + Math.sin(a) * (ARENA_RADIUS - 0.8), z: HUNT.z + Math.cos(a) * (ARENA_RADIUS - 0.8), angle: a };
});

// Where the player starts each game, south of the core.
export const START = { x: HUNT.x, z: HUNT.z + 5 };

// Keeps the player on the platform and out of the core.
export const huntBounds = (pos) => {
    let dx = pos.x - HUNT.x;
    let dz = pos.z - HUNT.z;
    let r = Math.hypot(dx, dz);
    if (r > WALK_LIMIT) {
        dx *= WALK_LIMIT / r;
        dz *= WALK_LIMIT / r;
        r = WALK_LIMIT;
    }
    const min = CORE_RADIUS + 0.45;
    if (r < min) {
        const k = min / (r || 0.001);
        dx *= k;
        dz *= k;
    }
    pos.x = HUNT.x + dx;
    pos.z = HUNT.z + dz;
};

// Bug kinds: hit points, speed, size, colour, points, damage to the core.
export const KINDS = {
    mite: { hp: 1, speed: 3.4, size: 0.42, color: "#EF4444", points: 10, damage: 2 },
    beetle: { hp: 3, speed: 2.1, size: 0.64, color: "#F97316", points: 25, damage: 5 },
    splitter: { hp: 3, speed: 1.9, size: 0.64, color: "#22C55E", points: 40, damage: 5 },
    tank: { hp: 12, speed: 1.15, size: 1.05, color: "#8B5CF6", points: 120, damage: 12 },
    boss: { hp: 90, speed: 0.75, size: 1.9, color: "#EC4899", points: 1000, damage: 40 },
};

// What each wave sends (shuffled, the same way every time), and how quickly.
const WAVE_MIX = [
    { mite: 6, beetle: 4 },
    { mite: 8, beetle: 5, splitter: 3 },
    { mite: 10, beetle: 6, splitter: 4, tank: 1 },
    { mite: 12, beetle: 7, splitter: 5, tank: 3 },
    { mite: 10, beetle: 6, tank: 2 },
];
export const waveList = (n) => {
    const list = Object.entries(WAVE_MIX[n - 1]).flatMap(([kind, count]) => Array(count).fill(kind));
    let seed = n * 97;
    for (let i = list.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    // The last wave brings the boss early on.
    if (n === WAVES) list.splice(4, 0, "boss");
    return list;
};
export const spawnGap = (n) => Math.max(0.35, 1.1 - n * 0.15);
