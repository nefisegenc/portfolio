// The Sky Circuit: a closed road floating below and beside the arcade, with
// a climb to a ramp, a gap to jump, a downhill run and a chicane. The road is
// sampled every ~25 cm; everything on it is placed by distance along the
// road (s) and sideways offset from its centre line (d, positive to the left).
import { CatmullRomCurve3, Vector3 } from "three";

export const CIRCUIT = { x: -85, y: -8, z: 70 };
export const ROAD_HALF = 4.2;
export const LAPS = 3;
export const KART_RADIUS = 0.7;

// Control points in circuit space. 0 is the start line; 7 is the crest
// where the ramp's lip sits.
const POINTS = [
    [14, 0, 33],
    [-6, 0, 34],
    [-24, 0.5, 30],
    [-40, 1.5, 20],
    [-46, 2.5, 4],
    [-40, 4, -12],
    [-26, 6, -20],
    [-12, 8.5, -24],
    [6, 5.5, -26],
    [22, 3, -30],
    [38, 1, -26],
    [48, 0, -12],
    [46, 0, 6],
    [40, 1, 16],
    [36, 1, 26],
    [26, 0.5, 32],
];
const LIP_POINT = 7;
const RAMP_LENGTH = 11;
const RAMP_RISE = 2.2;
export const GAP_LENGTH = 15;

const curve = new CatmullRomCurve3(
    POINTS.map(([x, y, z]) => new Vector3(x + CIRCUIT.x, y + CIRCUIT.y, z + CIRCUIT.z)),
    true,
    "centripetal",
);
export const TRACK_LENGTH = curve.getLength();
export const SAMPLES = 1000;
export const STEP = TRACK_LENGTH / SAMPLES;

const raw = Array.from({ length: SAMPLES }, (_, i) => {
    const u = i / SAMPLES;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const h = Math.hypot(t.x, t.z);
    // tx/tz: horizontal direction of travel; lx/lz: towards the left edge.
    return { i, s: u * TRACK_LENGTH, x: p.x, y: p.y, z: p.z, tx: t.x / h, tz: t.z / h, lx: t.z / h, lz: -t.x / h };
});

const nearestTo = ([x, , z]) => {
    let best = 0;
    let bestD = Infinity;
    raw.forEach((p, i) => {
        const d = (p.x - x - CIRCUIT.x) ** 2 + (p.z - z - CIRCUIT.z) ** 2;
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    });
    return best;
};

// Distance along the road of each control point.
export const pointS = POINTS.map((p) => raw[nearestTo(p)].s);
export const LIP_S = pointS[LIP_POINT];
export const RAMP_START_S = LIP_S - RAMP_LENGTH;
export const GAP_END_S = LIP_S + GAP_LENGTH;

export const wrapS = (s) => ((s % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
export const indexAt = (s) => Math.floor(wrapS(s) / STEP) % SAMPLES;

// The ramp is the last stretch before the lip, rising more steeply than the road.
const rampLift = (s) => (s > RAMP_START_S && s <= LIP_S ? RAMP_RISE * ((s - RAMP_START_S) / RAMP_LENGTH) ** 1.4 : 0);

export const track = raw.map((p) => ({
    ...p,
    road: !(p.s > LIP_S && p.s < GAP_END_S),
    ramp: p.s > RAMP_START_S && p.s <= LIP_S,
    y: p.y + rampLift(p.s),
}));

export const sampleAt = (s) => track[indexAt(s)];

// Road height at a distance along the track, smoothed between samples.
export const heightAt = (s) => {
    const w = wrapS(s) / STEP;
    const i = Math.floor(w) % SAMPLES;
    const f = w - Math.floor(w);
    return track[i].y * (1 - f) + track[(i + 1) % SAMPLES].y * f;
};

// World position of a point on the road.
export const roadPoint = (s, d = 0) => {
    const p = sampleAt(s);
    return { x: p.x + p.lx * d, y: heightAt(s), z: p.z + p.lz * d, heading: Math.atan2(p.tx, p.tz) };
};

// Finds the nearest sample to (x, z), searching around a previous index.
export const nearestIndex = (x, z, hint, range = 30) => {
    let best = hint;
    let bestD = Infinity;
    for (let k = -range; k <= range; k++) {
        const i = (hint + k + SAMPLES) % SAMPLES;
        const p = track[i];
        const d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return best;
};

// Signed offset of (x, z) from the centre line at sample i.
export const lateral = (x, z, i) => {
    const p = track[i];
    return (x - p.x) * p.lx + (z - p.z) * p.lz;
};

// How fast the road can be taken here: from the tightest bend in the next
// stretch, so drivers brake before corners rather than in them.
const curvature = track.map((p, i) => {
    const a = track[(i - 8 + SAMPLES) % SAMPLES];
    const b = track[(i + 8) % SAMPLES];
    let dh = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz);
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    return Math.abs(dh) / (16 * STEP);
});
export const cornerSpeed = track.map((_, i) => {
    let k = 0;
    for (let j = 0; j < 60; j++) k = Math.max(k, curvature[(i + j) % SAMPLES]);
    return Math.sqrt(30 / Math.max(k, 0.001));
});

// --- Things on the road -----------------------------------------------------

const at = (point, offset = 0) => wrapS(pointS[point] + offset);

export const boostPads = [
    { s: at(1, -4), d: 0 },
    { s: RAMP_START_S - 9, d: 0 },
    { s: at(15, 2), d: 0 },
];

export const nitroCans = [
    { s: at(2, 2), d: -2.4 },
    { s: at(9, 8), d: 2.6 },
    { s: at(13, 6), d: 0 },
];

export const cones = [
    { s: at(3, -2), d: 2.4 },
    { s: at(3, 1), d: 1.4 },
    { s: at(3, 4), d: 2.6 },
    { s: at(3, 7), d: 1.2 },
    { s: at(12, -3), d: -2 },
    { s: at(12, 0), d: 0 },
    { s: at(12, 3), d: 2 },
    { s: at(14, -1), d: -2.8 },
];

export const oilSlicks = [
    { s: at(11, 2), d: -1.6, r: 1.6 },
    { s: at(14, 6), d: 1.6, r: 1.5 },
];

// Blocks that slide from side to side across the climb.
export const sliders = [
    { s: at(4, 7), amp: 2.9, speed: 1.5, phase: 0 },
    { s: at(5, 3), amp: 2.9, speed: 1.9, phase: 1.7 },
];
export const sliderOffset = (b, t) => Math.sin(t * b.speed + b.phase) * b.amp;

// Pendulum hammers that swing across the downhill run.
export const hammers = [
    { s: at(9, -2), speed: 2.1, phase: 0 },
    { s: at(10, -6), speed: 2.4, phase: 2.2 },
];
export const HAMMER_HEIGHT = 5.2;
export const hammerAngle = (h, t) => Math.sin(t * h.speed + h.phase) * 1.0;
// Where the hammer's head is across the road.
export const hammerOffset = (h, t) => Math.sin(hammerAngle(h, t)) * (HAMMER_HEIGHT - 0.9);
