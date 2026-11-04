// Riff Rush's song: 120 bpm in E minor, about two minutes. Each bar is
// sixteen steps; the chart is built from short patterns, one per bar,
// written as "step:frets" pairs: frets are digits 0–3, low to high (two
// digits make a chord), and "~n" holds the note for n steps. The four
// frets play E, G, B and D.
export const BPM = 120;
export const STEP = 60 / BPM / 4;
export const BAR = STEP * 16;
export const LANES = 4;
export const LANE_COLORS = ["#22C55E", "#EF4444", "#FACC15", "#3B82F6"];
// One key per fret, side by side on the keyboard (1–4 work too).
export const FRET_KEYS = ["A", "S", "D", "F"];
export const LANE_FREQS = [329.63, 392, 493.88, 587.33];

// Backing: Em – C – G – D, one chord a bar.
export const ROOTS = [82.41, 65.41, 98, 73.42];

const P = {
    // Verses: from plain quarter notes to steadier eighths.
    v1: "0:0 4:1 8:2 12:1",
    v2: "0:0 3:1 6:2 8:1 10:0 12:2 14:3",
    v3: "0:2 3:3 6:2 8:1 10:2 12:0~3",
    v4: "0:1 2:2 4:3 6:2 8:1 10:0 12:1 14:2",
    v5: "0:3 2:2 4:1 6:0 8:1~2 12:2 14:3",
    // Pre-chorus: a climbing build.
    p1: "0:0 2:1 4:0 6:1 8:2 10:3 12:2 14:3",
    p2: "0:1 2:2 4:1 6:2 8:3 10:2 12:3 13:2 14:3 15:2",
    // Chorus: chords and held notes.
    c1: "0:02 4:1 6:2 8:13 12:2 14:3",
    c2: "0:13 3:2 6:1 8:02 10:1 12:2~3",
    c3: "0:02 2:1 4:2 6:3 8:13 10:2 12:3 14:2",
    c4: "0:23~6 8:12~6",
    // Solo: sixteenth-note runs.
    b1: "0:0 1:1 2:2 3:3 4:2 6:1 8:0 9:1 10:2 11:3 12:2 14:1",
    b2: "0:3 1:2 2:1 3:0 4:1 6:2 8:3 9:2 10:1 11:0 12:1 14:2",
    b3: "0:01 2:23 4:01 6:23 8:12 10:0 12:3 14:12",
    b4: "0:0 1:1 2:2 3:3 4:0 5:1 6:2 7:3 8:3~6",
    // Outro: ringing chords.
    o1: "0:02~6 8:13~6",
    o2: "0:03~12",
};

const parse = (pattern) =>
    pattern.split(" ").map((note) => {
        const [step, frets] = note.split(":");
        const [lanes, hold = "0"] = frets.split("~");
        return [Number(step), [...lanes].map(Number), Number(hold)];
    });

// Bar by bar, after a two-bar count-in with no notes.
export const SECTIONS = [
    { name: "intro", bars: [null, null] },
    { name: "verse", bars: ["v1", "v1", "v2", "v3", "v1", "v2", "v4", "v3"] },
    { name: "pre", bars: ["p1", "p1", "p2", "p2"] },
    { name: "chorus", bars: ["c1", "c2", "c1", "c3", "c1", "c2", "c3", "c4"] },
    { name: "verse", bars: ["v4", "v2", "v5", "v3", "v4", "v2", "v5", "v3"] },
    { name: "pre", bars: ["p1", "p2", "p1", "p2"] },
    { name: "chorus", bars: ["c1", "c2", "c3", "c3", "c1", "c2", "c3", "c4"] },
    { name: "bridge", bars: ["b1", "b2", "b1", "b2", "b3", "b3", "b1", "b4"] },
    { name: "chorus", bars: ["c3", "c2", "c3", "c1", "c3", "c2", "c3", "c4"] },
    { name: "outro", bars: ["o1", "o2"] },
];

// The song eases you in: the first verse keeps only notes on every other
// beat, the first pre-chorus those on the beat, the first chorus those on
// eighth notes, all with chords played as single notes. From the second
// verse on, it's the full chart. (The grid each level keeps, in steps.)
const EASE_IN = [0, 0, 1, 2];
const GRID = [8, 4, 2, 1];
const BARS = SECTIONS.flatMap((s, i) => s.bars.map((pattern) => ({ pattern, section: s.name, level: EASE_IN[i] ?? 3 })));
export const TOTAL_BARS = BARS.length + 1;
export const SONG_LENGTH = TOTAL_BARS * BAR;
export const sectionAt = (bar) => BARS[Math.min(bar, BARS.length - 1)]?.section ?? "outro";

// Every note: { time, lane, length (seconds, 0 for a tap), bar }.
export const CHART = BARS.flatMap(({ pattern, level }, bar) =>
    (pattern ? parse(P[pattern]) : [])
        .filter(([step]) => step % GRID[level] === 0)
        .flatMap(([step, lanes, length]) =>
            (level < 3 ? lanes.slice(0, 1) : lanes).map((lane) => ({ time: (bar * 16 + step) * STEP, lane, length: length * STEP, bar }))
        )
).sort((a, b) => a.time - b.time || a.lane - b.lane);
