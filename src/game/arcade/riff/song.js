// Riff Rush's song: 120 bpm in E minor, about seventy seconds. Each bar is
// sixteen steps; the chart is built from short patterns, one per bar, of
// [step, lanes, length in steps (for held notes)]. Lanes are frets 1–5,
// low to high, and play the E minor pentatonic.
export const BPM = 120;
export const STEP = 60 / BPM / 4;
export const BAR = STEP * 16;
export const LANES = 5;
export const LANE_COLORS = ["#22C55E", "#EF4444", "#FACC15", "#3B82F6", "#F97316"];
export const LANE_FREQS = [329.63, 392, 440, 493.88, 587.33];

// Backing: Em – C – G – D, one chord a bar.
export const ROOTS = [82.41, 65.41, 98, 73.42];

const P = {
    v1: [
        [0, [0]],
        [3, [1]],
        [6, [2]],
        [8, [1]],
        [10, [0]],
        [12, [2]],
        [14, [3]],
    ],
    v2: [
        [0, [0]],
        [2, [0]],
        [4, [1]],
        [6, [2]],
        [8, [3]],
        [11, [2]],
        [14, [1]],
    ],
    v3: [
        [0, [2]],
        [3, [3]],
        [6, [2]],
        [8, [1]],
        [10, [2]],
        [12, [0], 3],
    ],
    v4: [
        [0, [1]],
        [2, [2]],
        [4, [3]],
        [6, [4]],
        [8, [3]],
        [10, [2]],
        [12, [1]],
        [14, [0]],
    ],
    c1: [
        [0, [0, 2]],
        [4, [1]],
        [6, [2]],
        [8, [1, 3]],
        [12, [2]],
        [14, [3]],
    ],
    c2: [
        [0, [2, 4]],
        [3, [3]],
        [6, [2]],
        [8, [0, 2]],
        [10, [1]],
        [12, [2], 3],
    ],
    c3: [
        [0, [0, 2]],
        [2, [1]],
        [4, [2]],
        [6, [3]],
        [8, [1, 3]],
        [10, [2]],
        [12, [3]],
        [14, [4]],
    ],
    c4: [
        [0, [3, 4], 6],
        [8, [2, 3], 6],
    ],
    b1: [
        [0, [0]],
        [1, [1]],
        [2, [2]],
        [3, [3]],
        [4, [4]],
        [6, [3]],
        [8, [2]],
        [9, [1]],
        [10, [0]],
        [12, [1]],
        [13, [2]],
        [14, [3]],
    ],
    b2: [
        [0, [4]],
        [1, [3]],
        [2, [2]],
        [3, [1]],
        [4, [0]],
        [6, [1]],
        [8, [2]],
        [9, [3]],
        [10, [4]],
        [12, [3]],
        [14, [2]],
    ],
    end: [[0, [0, 2, 4], 12]],
};

// Bar by bar, after a two-bar count-in with no notes.
export const SECTIONS = [
    { name: "intro", bars: [null, null] },
    { name: "verse", bars: ["v1", "v2", "v1", "v3", "v1", "v2", "v4", "v3"] },
    { name: "chorus", bars: ["c1", "c2", "c1", "c3", "c1", "c2", "c3", "c4"] },
    { name: "verse", bars: ["v4", "v2", "v4", "v3"] },
    { name: "bridge", bars: ["b1", "b2", "b1", "b2"] },
    { name: "chorus", bars: ["c3", "c2", "c3", "c1", "c3", "c2", "b1", "c4"] },
    { name: "outro", bars: ["end"] },
];

const BARS = SECTIONS.flatMap((s) => s.bars.map((pattern) => ({ pattern, section: s.name })));
export const TOTAL_BARS = BARS.length + 1;
export const SONG_LENGTH = TOTAL_BARS * BAR;
export const sectionAt = (bar) => BARS[Math.min(bar, BARS.length - 1)]?.section ?? "outro";

// Every note: { time, lane, length (seconds, 0 for a tap), bar }.
export const CHART = BARS.flatMap(({ pattern }, bar) =>
    (P[pattern] ?? []).flatMap(([step, lanes, length = 0]) =>
        lanes.map((lane) => ({ time: (bar * 16 + step) * STEP, lane, length: length * STEP, bar }))
    )
).sort((a, b) => a.time - b.time || a.lane - b.lane);
