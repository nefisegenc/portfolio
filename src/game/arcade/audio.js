// Arcade sound: a soundtrack per game, one-shot effects and sustained loops
// (engine, tyres, rolling ball). All synthesised, like the island's music.
import { addEffects, audioTime, getAudio, makeLoop, noiseBurst, tone, trackOut } from "../sound";
import { BAR, ROOTS, STEP as RIFF_STEP, TOTAL_BARS, sectionAt } from "./riff/song";

// --- Instruments -------------------------------------------------------------

const kick = (start, volume = 0.55) => tone({ freq: 130, to: 42, type: "sine", start, decay: 0.2, volume, bus: trackOut() });
const snare = (start, volume = 0.22, long = false) => {
    noiseBurst({ start, freq: 1900, q: 0.6, duration: long ? 0.28 : 0.13, volume, bus: trackOut() });
    tone({ freq: 230, to: 150, type: "triangle", start, decay: 0.08, volume: volume * 0.4, bus: trackOut() });
};
const hat = (start, volume = 0.05, open = false) => noiseBurst({ start, freq: 9000, q: 0.9, duration: open ? 0.13 : 0.03, volume, bus: trackOut() });
const note = (freq, start, { type = "sawtooth", decay = 0.12, volume = 0.08, filter = 900, attack = 0.005 } = {}) =>
    tone({ freq, start, type, decay, volume, filter, attack, bus: trackOut() });

// --- Soundtracks ---------------------------------------------------------------

// Race: driving electronic at 140 bpm in A minor (16th-note steps).
const RACE_ROOTS = [110, 87.31, 130.81, 98];
const RACE_ARPS = [
    [440, 523.25, 659.25, 880],
    [349.23, 440, 523.25, 698.46],
    [523.25, 659.25, 783.99, 1046.5],
    [392, 493.88, 587.33, 783.99],
];
export const raceMusic = {
    step: 60 / 140 / 4,
    play(i, t) {
        const s = i % 16;
        const bar = Math.floor(i / 16) % 4;
        if (s % 4 === 0) kick(t);
        if (s === 4 || s === 12) snare(t);
        if (s % 2 === 1) hat(t, 0.035);
        if (s % 4 === 2) hat(t, 0.05, true);
        if (s % 4 !== 0) note(RACE_ROOTS[bar], t, { decay: 0.09, volume: 0.1, filter: 700 });
        if (Math.floor(i / 64) % 2 === 1 && s % 2 === 0) {
            note(RACE_ARPS[bar][(s / 2) % 4], t, { type: "square", decay: 0.1, volume: 0.035, filter: 2600 });
        }
    },
};

// Bowling: a laid-back funk groove at 100 bpm, swung 8th notes.
const BOWL_CHORDS = [
    { root: 73.42, notes: [174.61, 220, 261.63] }, // Dm7
    { root: 98, notes: [246.94, 293.66, 349.23] }, // G7
    { root: 65.41, notes: [164.81, 196, 246.94] }, // Cmaj7
    { root: 110, notes: [138.59, 164.81, 196] }, // A7
];
const BASS_LINE = [0, null, null, 2, 1.5, null, 1, 0.75];
export const bowlingMusic = {
    step: 60 / 100 / 2,
    play(i, start) {
        const s = i % 8;
        const t = start + (s % 2 ? 0.07 : 0);
        const chord = BOWL_CHORDS[Math.floor(i / 8) % 4];
        if (s === 0 || s === 3 || s === 5) kick(t, 0.45);
        if (s === 2 || s === 6) snare(t, 0.16);
        hat(t, s % 2 ? 0.025 : 0.04);
        if (BASS_LINE[s] !== null) note(chord.root * BASS_LINE[s] * 2, t, { type: "triangle", decay: 0.28, volume: 0.16, filter: 600 });
        if (s === 1 || s === 4) {
            chord.notes.forEach((f) => note(f, t, { type: "sine", decay: 0.55, volume: 0.04, filter: 3000 }));
        }
    },
};

// Bug Hunt: synthwave at 120 bpm in E minor (16th-note steps).
const HUNT_ROOTS = [82.41, 65.41, 98, 73.42];
const HUNT_ARPS = [
    [329.63, 392, 493.88, 659.25],
    [261.63, 329.63, 392, 523.25],
    [392, 493.88, 587.33, 783.99],
    [293.66, 369.99, 440, 587.33],
];
export const huntMusic = {
    step: 60 / 120 / 4,
    play(i, t) {
        const s = i % 16;
        const bar = Math.floor(i / 16) % 4;
        if (s % 4 === 0) kick(t, 0.5);
        if (s === 4 || s === 12) snare(t, 0.2, true);
        if (s % 2 === 1) hat(t, 0.03);
        note(HUNT_ROOTS[bar] * (s % 2 ? 2 : 1), t, { decay: 0.1, volume: 0.09, filter: 800 });
        note(HUNT_ARPS[bar][s % 4] * (s % 8 < 4 ? 1 : 2), t, { type: "square", decay: 0.09, volume: 0.03, filter: 3200 });
        if (s === 0) HUNT_ARPS[bar].slice(0, 3).forEach((f) => note(f / 2, t, { attack: 0.3, decay: 1.6, volume: 0.025, filter: 1400 }));
    },
};

// Head to Head: a stadium stomp at 128 bpm in C major (16th-note steps):
// big drums, hand claps, a bouncing bass and a chant every other bar.
const HEAD_ROOTS = [130.81, 110, 87.31, 98];
const HEAD_CHANT = { 0: 392, 4: 392, 8: 329.63, 10: 349.23, 12: 392 };
export const headMusic = {
    step: 60 / 128 / 4,
    play(i, t) {
        const s = i % 16;
        const bar = Math.floor(i / 16);
        const root = HEAD_ROOTS[bar % 4];
        if (s % 4 === 0) kick(t, 0.5);
        if (s === 4 || s === 12) {
            snare(t, 0.14);
            noiseBurst({ start: t, freq: 1500, q: 0.9, duration: 0.07, volume: 0.12, bus: trackOut() });
        }
        if (s % 2 === 1) hat(t, 0.028);
        if (s === 0 || s === 8) note(root / 2, t, { type: "triangle", decay: 0.3, volume: 0.16, filter: 500 });
        if (s % 4 === 2) note(root, t, { type: "triangle", decay: 0.16, volume: 0.13, filter: 700 });
        if (bar % 2 === 1 && HEAD_CHANT[s]) note(HEAD_CHANT[s], t, { type: "square", decay: 0.16, volume: 0.035, filter: 2400 });
    },
};

// Hi-hat clicks on the beat while Riff Rush counts in, and nothing at all
// once a show is over.
export const countIn = { step: 0.5, play: (i, t) => hat(t, 0.06) };
export const silence = { step: 1, play: () => {} };

// Riff Rush's backing band: drums, bass and pads under the player's guitar,
// following the song's bars. It notes when its first step sounds so the
// chart can be timed against the audio clock.
const RIFF_LEAD = [329.63, 392, 493.88, 587.33];
export const riffMusic = {
    step: RIFF_STEP,
    startedAt: null,
    play(i, t) {
        if (i === 0) riffMusic.startedAt = (audioTime() ?? 0) + t;
        const bar = Math.floor(i / 16);
        const s = i % 16;
        if (bar >= TOTAL_BARS) return;
        const root = ROOTS[bar % 4];
        const outro = bar === TOTAL_BARS - 1;
        if (outro) {
            if (s === 0) {
                kick(t, 0.6);
                noiseBurst({ start: t, freq: 6000, q: 0.5, duration: 1.8, volume: 0.16, bus: trackOut() });
                note(root, t, { decay: 1.8, volume: 0.14, filter: 600 });
            }
            return;
        }
        if (s % 4 === 0) kick(t, 0.5);
        if (s === 6 || s === 10) kick(t, 0.35);
        if (s === 4 || s === 12) snare(t, 0.2);
        // The pre-chorus drives harder into the chorus.
        if (sectionAt(bar) === "pre" && s % 4 === 2) snare(t, 0.08);
        if (s % 2 === 1) hat(t, 0.03);
        if (s % 4 === 2) hat(t, 0.045, true);
        if (s % 2 === 0) note(root * (s % 8 === 6 ? 2 : 1), t, { decay: 0.16, volume: 0.12, filter: 520 });
        if (s === 0) RIFF_LEAD.slice(0, 3).forEach((f) => note(f / 2, t, { attack: 0.2, decay: BAR * 0.9, volume: 0.02, filter: 1200 }));
        // A snare fill into each new section.
        if (s >= 12 && sectionAt(bar) !== sectionAt(bar + 1)) snare(t, 0.1 + (s - 12) * 0.04);
    },
};

// The player's guitar: two detuned saws through a soft clipper, a pluck
// with a sustain for held notes.
let clipCurve = null;
const distortion = (ctx) => {
    if (!clipCurve) {
        clipCurve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
            const x = (i / 1023) * 2 - 1;
            clipCurve[i] = Math.tanh(x * 6);
        }
    }
    const node = ctx.createWaveShaper();
    node.curve = clipCurve;
    return node;
};

export const guitar = (freq, length = 0) => {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;
    const sustain = Math.max(0.18, length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.12);
    gain.gain.setValueAtTime(0.09, t + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + sustain + 0.25);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + sustain);
    const drive = distortion(ctx);
    const pre = ctx.createGain();
    pre.gain.value = 0.5;
    [1, 1.006, 0.5].forEach((ratio, k) => {
        const osc = ctx.createOscillator();
        osc.type = k === 2 ? "square" : "sawtooth";
        osc.frequency.setValueAtTime(freq * ratio, t);
        osc.connect(pre);
        osc.start(t);
        osc.stop(t + sustain + 0.3);
    });
    pre.connect(drive).connect(lp).connect(gain).connect(out);
};

// --- Loops ------------------------------------------------------------------

export const engineLoop = makeLoop({ source: "osc", wave: "sawtooth", freq: 60 });
export const engineHum = makeLoop({ source: "osc", wave: "square", freq: 30 });
export const screechLoop = makeLoop({ source: "noise", filter: "bandpass", freq: 2600, q: 7 });
export const rollLoop = makeLoop({ source: "noise", filter: "lowpass", freq: 200, q: 0.7 });
export const crowdLoop = makeLoop({ source: "noise", filter: "bandpass", freq: 700, q: 0.5 });

export const silenceLoops = () => {
    engineLoop.set(0);
    engineHum.set(0);
    screechLoop.set(0);
    rollLoop.set(0);
    crowdLoop.set(0);
};

// --- Effects ----------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);

// A referee's whistle: a high tone with a fast trill.
const whistle = (start, length) => {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(2850, t);
    const trill = ctx.createOscillator();
    trill.frequency.value = 36;
    const depth = ctx.createGain();
    depth.gain.value = 170;
    trill.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    gain.gain.setValueAtTime(0.07, t + length);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.06);
    osc.connect(gain).connect(out);
    [osc, trill].forEach((o) => {
        o.start(t);
        o.stop(t + length + 0.1);
    });
};

const applause = (length, density, volume) => {
    for (let i = 0; i < density; i++) {
        noiseBurst({ start: rand(0, length), duration: 0.03, freq: rand(1200, 2600), q: 1.4, volume: rand(0.04, 0.09) * volume });
    }
};

addEffects({
    // Countdowns
    beep: () => tone({ freq: 523.25, type: "square", decay: 0.18, volume: 0.07, filter: 2000 }),
    go: () => {
        tone({ freq: 1046.5, type: "square", decay: 0.45, volume: 0.08, filter: 3000 });
        tone({ freq: 1568, type: "square", decay: 0.45, volume: 0.04, filter: 3000 });
    },
    // Bowling
    ballDrop: () => {
        tone({ freq: 95, to: 50, type: "sine", decay: 0.18, volume: 0.35 });
        noiseBurst({ duration: 0.08, freq: 300, q: 0.8, volume: 0.15 });
    },
    pins: (count = 5) => {
        tone({ freq: 120, to: 60, type: "sine", decay: 0.2, volume: 0.3 });
        const n = Math.max(3, Math.min(14, count + 4));
        for (let i = 0; i < n; i++) {
            const start = rand(0, 0.35) * (i / n + 0.2);
            noiseBurst({ start, duration: rand(0.05, 0.12), freq: rand(1800, 4200), q: 2.2, volume: rand(0.1, 0.2) });
            tone({ freq: rand(700, 1500), start, type: "triangle", decay: 0.07, volume: 0.06 });
        }
    },
    gutter: () => {
        tone({ freq: 70, to: 45, type: "triangle", decay: 0.35, volume: 0.25 });
        noiseBurst({ duration: 0.4, freq: 220, q: 0.6, volume: 0.12 });
    },
    sweep: () => noiseBurst({ duration: 0.6, freq: 500, to: 250, q: 0.7, volume: 0.09, attack: 0.15 }),
    strike: () => {
        noiseBurst({ duration: 1.8, freq: 1100, q: 0.35, volume: 0.22, attack: 0.25 });
        applause(1.8, 40, 1.2);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            tone({ freq: f, start: 0.1 + i * 0.09, type: "square", decay: 0.4, volume: 0.05, filter: 2400 })
        );
    },
    spare: () => {
        noiseBurst({ duration: 1.1, freq: 1100, q: 0.35, volume: 0.14, attack: 0.2 });
        applause(1.1, 22, 0.9);
    },
    // Race
    lightLow: () => tone({ freq: 440, type: "square", decay: 0.3, volume: 0.08, filter: 1800 }),
    lightGo: () => tone({ freq: 880, type: "square", decay: 0.7, volume: 0.09, filter: 2600 }),
    boost: () => {
        noiseBurst({ duration: 0.6, freq: 300, to: 3500, q: 1.1, volume: 0.22 });
        tone({ freq: 300, to: 900, type: "sawtooth", decay: 0.4, volume: 0.05, filter: 2000 });
    },
    nitro: () => noiseBurst({ duration: 0.9, freq: 500, to: 2600, q: 0.7, volume: 0.2, attack: 0.05 }),
    jump: () => tone({ freq: 200, to: 500, type: "triangle", decay: 0.25, volume: 0.1 }),
    land: () => {
        tone({ freq: 90, to: 45, type: "sine", decay: 0.25, volume: 0.4 });
        noiseBurst({ duration: 0.15, freq: 400, q: 0.7, volume: 0.18 });
    },
    crash: () => {
        noiseBurst({ duration: 0.35, freq: 700, q: 0.5, volume: 0.3 });
        [320, 470, 610].forEach((f) => tone({ freq: f, to: f * 0.8, type: "square", decay: 0.25, volume: 0.04, filter: 2400 }));
    },
    cone: () => tone({ freq: 520, to: 300, type: "triangle", decay: 0.12, volume: 0.1 }),
    splash: () => noiseBurst({ duration: 0.5, freq: 900, to: 400, q: 0.8, volume: 0.15 }),
    fall: () => tone({ freq: 1200, to: 150, type: "sine", decay: 1.1, volume: 0.1 }),
    pickup: () => [880, 1318.5].forEach((f, i) => tone({ freq: f, start: i * 0.06, type: "square", decay: 0.15, volume: 0.05, filter: 3500 })),
    lap: () => [659.25, 987.77].forEach((f, i) => tone({ freq: f, start: i * 0.1, type: "triangle", decay: 0.4, volume: 0.1 })),
    finish: () => {
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
            tone({ freq: f, start: i * 0.11, type: "square", decay: i === 5 ? 0.9 : 0.15, volume: 0.07, filter: 2800 })
        );
        applause(2, 40, 1);
    },
    // Bug Hunt
    laser: () => {
        tone({ freq: rand(1300, 1600), to: 380, type: "square", decay: 0.08, volume: 0.035, filter: 3000 });
    },
    bugHit: () => tone({ freq: 300, to: 180, type: "square", decay: 0.05, volume: 0.04, filter: 1500 }),
    bugDie: (big) => {
        noiseBurst({ duration: big ? 0.45 : 0.18, freq: big ? 400 : 900, to: 120, q: 0.9, volume: big ? 0.25 : 0.14 });
        tone({ freq: big ? 260 : 520, to: 80, type: "sawtooth", decay: big ? 0.35 : 0.15, volume: 0.06, filter: 1500 });
    },
    coreHit: () => {
        tone({ freq: 220, to: 110, type: "sawtooth", decay: 0.35, volume: 0.09, filter: 1200 });
        noiseBurst({ duration: 0.25, freq: 300, q: 0.6, volume: 0.15 });
    },
    wave: () =>
        [329.63, 392, 493.88].forEach((f) => tone({ freq: f, to: f * 2, type: "sawtooth", attack: 0.05, decay: 0.7, volume: 0.05, filter: 2200 })),
    powerup: () =>
        [659.25, 830.61, 987.77, 1318.5].forEach((f, i) =>
            tone({ freq: f, start: i * 0.05, type: "square", decay: 0.18, volume: 0.05, filter: 3500 })
        ),
    emp: () => {
        noiseBurst({ duration: 1.2, freq: 200, to: 4000, q: 0.6, volume: 0.25 });
        tone({ freq: 80, to: 30, type: "sine", decay: 1, volume: 0.4 });
    },
    hurt: () => {
        tone({ freq: 180, to: 90, type: "square", decay: 0.18, volume: 0.07, filter: 1200 });
        noiseBurst({ duration: 0.15, freq: 600, q: 0.8, volume: 0.15 });
    },
    spit: () => noiseBurst({ duration: 0.18, freq: 1400, to: 500, q: 2.5, volume: 0.1 }),
    overheat: () => {
        noiseBurst({ duration: 0.9, freq: 3500, to: 1500, q: 0.7, volume: 0.15, attack: 0.03 });
        tone({ freq: 880, to: 440, type: "square", decay: 0.3, volume: 0.04, filter: 2000 });
    },
    gameOver: () =>
        [392, 349.23, 311.13, 261.63].forEach((f, i) => tone({ freq: f, start: i * 0.2, type: "square", decay: 0.35, volume: 0.06, filter: 1800 })),
    // Riff Rush
    clunk: () => noiseBurst({ duration: 0.12, freq: 700, q: 3, volume: 0.12 }),
    crowd: (level = 1) => {
        noiseBurst({ duration: 1.4, freq: 1000, q: 0.35, volume: 0.16 * level, attack: 0.2 });
        applause(1.4, Math.round(24 * level), level);
    },
    boo: () => tone({ freq: 140, to: 110, type: "sawtooth", attack: 0.2, decay: 1.2, volume: 0.06, filter: 500 }),
    cheer: () => {
        [659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, start: i * 0.09, decay: 0.6, volume: 0.12, type: "triangle" }));
        applause(1.2, 20, 0.8);
    },
    // Head to Head
    whistle: () => whistle(0, 0.32),
    finalWhistle: () => {
        whistle(0, 0.24);
        whistle(0.36, 0.24);
        whistle(0.72, 0.8);
    },
    swing: () => noiseBurst({ duration: 0.09, freq: 1400, to: 600, q: 1.2, volume: 0.05 }),
    kickBall: () => {
        tone({ freq: 150, to: 55, type: "sine", decay: 0.14, volume: 0.42 });
        noiseBurst({ duration: 0.05, freq: 1100, q: 0.9, volume: 0.16 });
    },
    header: () => {
        tone({ freq: 340, to: 170, type: "triangle", decay: 0.12, volume: 0.14 });
        noiseBurst({ duration: 0.04, freq: 900, q: 1, volume: 0.1 });
    },
    bump: () => tone({ freq: 120, to: 70, type: "sine", decay: 0.1, volume: 0.14 }),
    thud: (level = 0.5) => tone({ freq: 95, to: 50, type: "sine", decay: 0.12, volume: 0.08 + 0.25 * level }),
    hop: () => tone({ freq: 240, to: 520, type: "triangle", decay: 0.14, volume: 0.06 }),
    post: () =>
        [880, 1320, 1760].forEach((f, i) => tone({ freq: f, type: "square", decay: 0.5 - i * 0.1, volume: 0.04, filter: 3200 })),
    forceShot: () => {
        noiseBurst({ duration: 0.5, freq: 400, to: 4000, q: 0.8, volume: 0.25 });
        tone({ freq: 110, to: 40, type: "sawtooth", decay: 0.4, volume: 0.12, filter: 900 });
    },
    knock: () => {
        tone({ freq: 160, to: 60, type: "square", decay: 0.25, volume: 0.1, filter: 1200 });
        noiseBurst({ duration: 0.2, freq: 500, q: 0.7, volume: 0.2 });
    },
    zap: () => {
        noiseBurst({ duration: 0.25, freq: 2500, to: 800, q: 2, volume: 0.15 });
        tone({ freq: 600, to: 200, type: "sawtooth", decay: 0.2, volume: 0.05, filter: 2000 });
    },
    goalRoar: () => {
        noiseBurst({ duration: 2.4, freq: 900, q: 0.35, volume: 0.28, attack: 0.15 });
        applause(2.4, 50, 1.3);
        [261.63, 329.63, 392].forEach((f) => tone({ freq: f, type: "sawtooth", attack: 0.02, decay: 1.2, volume: 0.05, filter: 1600 }));
    },
    itemSpawn: () => [784, 1046.5].forEach((f, i) => tone({ freq: f, start: i * 0.08, type: "sine", decay: 0.25, volume: 0.07 })),
    freeze: () =>
        [1568, 1318.5, 1046.5, 784].forEach((f, i) => tone({ freq: f, start: i * 0.05, type: "square", decay: 0.2, volume: 0.04, filter: 4000 })),
});
