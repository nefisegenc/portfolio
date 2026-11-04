// Procedural audio: no sound files, everything is synthesised with Web Audio.
// Music is a slow generative loop (pentatonic plucks over soft pads); effects
// follow what happens in the store. Browsers only allow audio after a user
// gesture, so the context is unlocked on the first click or key press.
import { useStore } from "../store";

let ctx = null;
let master = null;
let musicBus = null;
let trackBus = null;
let sfxBus = null;
let reverb = null;
let noise = null;
let musicTimer = null;
let nextBeat = 0;
let beat = 0;
let melodyIndex = 4;

const BEAT = 0.6;
// Frequencies for C major pentatonic across two octaves (C4…A5).
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const DAY_CHORDS = [
    [130.81, 196.0, 329.63], // C
    [110.0, 164.81, 261.63], // Am
    [87.31, 130.81, 220.0], // F
    [98.0, 146.83, 246.94], // G
];
const NIGHT_CHORDS = [DAY_CHORDS[1], DAY_CHORDS[2], DAY_CHORDS[0], DAY_CHORDS[3]];

const makeReverb = () => {
    const length = ctx.sampleRate * 1.6;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    const node = ctx.createConvolver();
    node.buffer = buffer;
    return node;
};

const makeNoise = () => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
};

const ensureContext = () => {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = useStore.getState().sound ? 1 : 0;
    master.connect(ctx.destination);

    reverb = makeReverb();
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    reverb.connect(wet).connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    musicBus.connect(reverb);

    // Game soundtracks play dry, without the island's reverb.
    trackBus = ctx.createGain();
    trackBus.gain.value = 0;
    trackBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);

    noise = makeNoise();
    return ctx;
};

// One enveloped oscillator note.
export const tone = ({ freq, to, type = "sine", start = 0, attack = 0.01, decay = 0.4, volume = 0.2, bus = sfxBus, filter }) => {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    let node = osc.connect(gain);
    if (filter) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = filter;
        node = node.connect(lp);
    }
    node.connect(bus);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
};

// A burst of filtered noise; `attack` > 0 swells in instead of starting hard.
export const noiseBurst = ({ start = 0, duration = 0.06, freq = 1200, to, q = 1.2, volume = 0.15, attack = 0, bus = sfxBus }) => {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = q;
    band.frequency.setValueAtTime(freq, t);
    if (to) band.frequency.exponentialRampToValueAtTime(to, t + duration);
    const gain = ctx.createGain();
    if (attack > 0) {
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(volume, t + attack);
    } else {
        gain.gain.setValueAtTime(volume, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + duration);
    src.connect(band).connect(gain).connect(bus);
    src.start(t, Math.random() * 0.5, attack + duration + 0.05);
};

const EFFECTS = {
    step: (run) =>
        noiseBurst({ duration: run ? 0.05 : 0.07, freq: 700 + Math.random() * 500, volume: run ? 0.12 : 0.09 }),
    jump: () => tone({ freq: 280, to: 620, type: "triangle", decay: 0.18, volume: 0.12 }),
    open: () => tone({ freq: 520, to: 880, decay: 0.12, volume: 0.1 }),
    close: () => tone({ freq: 660, to: 380, decay: 0.12, volume: 0.08 }),
    travel: () => noiseBurst({ duration: 0.55, freq: 300, to: 3200, q: 0.8, volume: 0.18 }),
    night: () => {
        tone({ freq: 659.25, decay: 0.6, volume: 0.08, type: "triangle" });
        tone({ freq: 523.25, start: 0.12, decay: 0.8, volume: 0.08, type: "triangle" });
    },
    discover: () =>
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
            tone({ freq, start: i * 0.08, decay: 0.7, volume: 0.13, type: i % 2 ? "triangle" : "sine" })
        ),
    complete: () =>
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
            tone({ freq, start: i * 0.12, decay: 1.1, volume: 0.14, type: "triangle" })
        ),
};

export const playSound = (name, arg) => {
    if (!ctx || ctx.state !== "running" || !useStore.getState().sound) return;
    EFFECTS[name]?.(arg);
};

// The bus game soundtracks play into.
export const trackOut = () => trackBus;

// Lets the arcade register its own effects for playSound.
export const addEffects = (effects) => Object.assign(EFFECTS, effects);

// A sustained sound (an engine, a rolling ball…) whose level and pitch the
// game updates every frame. Noise loops move their filter; oscillators move
// their pitch, with an optional filter cutoff. Built on first use.
export const makeLoop = ({ source = "noise", filter = "lowpass", freq = 400, q = 1, wave = "sawtooth" }) => {
    let nodes = null;
    const build = () => {
        let src;
        if (source === "noise") {
            src = ctx.createBufferSource();
            src.buffer = noise;
            src.loop = true;
        } else {
            src = ctx.createOscillator();
            src.type = wave;
            src.frequency.value = freq;
        }
        const f = ctx.createBiquadFilter();
        f.type = filter;
        f.frequency.value = freq;
        f.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(f).connect(gain).connect(sfxBus);
        src.start();
        nodes = { src, filter: f, gain };
    };
    return {
        set(level, pitch, cutoff) {
            if (!ctx || ctx.state !== "running") return;
            if (!nodes) {
                if (level <= 0) return;
                build();
            }
            const t = ctx.currentTime;
            nodes.gain.gain.setTargetAtTime(level, t, 0.05);
            if (pitch !== undefined) {
                const param = source === "noise" ? nodes.filter.frequency : nodes.src.frequency;
                param.setTargetAtTime(pitch, t, 0.04);
            }
            if (cutoff !== undefined && source !== "noise") nodes.filter.frequency.setTargetAtTime(cutoff, t, 0.04);
        },
    };
};

// --- Generative music -------------------------------------------------------

// A game can swap in its own soundtrack: { step: seconds per step,
// play(step, start) } scheduling one step's notes `start` seconds from now.
let track = null;
let trackStep = 0;

export const setMusicTrack = (next) => {
    if (track === next) return;
    track = next;
    trackStep = 0;
    if (!ctx) return;
    const t = ctx.currentTime;
    trackBus.gain.cancelScheduledValues(t);
    musicBus.gain.cancelScheduledValues(t);
    trackBus.gain.setTargetAtTime(track && musicTimer ? 0.9 : 0, t, 0.3);
    musicBus.gain.setTargetAtTime(!track && musicTimer ? 1 : 0, t, track ? 0.3 : 1.5);
};

// Schedules one step of whichever music is playing; returns its length.
const scheduleBeat = (time) => {
    if (track) {
        track.play(trackStep++, time - ctx.currentTime);
        return track.step;
    }
    const night = useStore.getState().night;
    const chords = night ? NIGHT_CHORDS : DAY_CHORDS;
    const start = time - ctx.currentTime;

    // A new pad chord every 8 beats.
    if (beat % 8 === 0) {
        const chord = chords[(beat / 8) % chords.length];
        chord.forEach((freq) => {
            tone({ freq, start, attack: 1.2, decay: BEAT * 8, volume: night ? 0.06 : 0.07, bus: musicBus, filter: 900 });
        });
    }

    // A gentle random walk over the scale for the melody.
    if (Math.random() < (night ? 0.3 : 0.55)) {
        const steps = [-2, -1, -1, 1, 1, 2, 0];
        melodyIndex = Math.max(0, Math.min(SCALE.length - 1, melodyIndex + steps[Math.floor(Math.random() * steps.length)]));
        const freq = SCALE[melodyIndex] * (night ? 0.5 : 1);
        tone({ freq, start, type: "triangle", attack: 0.01, decay: 1.4, volume: 0.07, bus: musicBus, filter: 2400 });
    }
    beat++;
    return BEAT;
};

const startMusic = () => {
    if (musicTimer || !ctx) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(track ? 0 : 1, ctx.currentTime, 1.5);
    trackBus.gain.cancelScheduledValues(ctx.currentTime);
    trackBus.gain.setTargetAtTime(track ? 0.9 : 0, ctx.currentTime, 0.3);
    nextBeat = ctx.currentTime + 0.1;
    musicTimer = setInterval(() => {
        while (nextBeat < ctx.currentTime + 0.4) nextBeat += scheduleBeat(nextBeat);
    }, 100);
};

const stopMusic = () => {
    if (!musicTimer || !ctx) return;
    clearInterval(musicTimer);
    musicTimer = null;
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    trackBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
};

// --- Wiring -----------------------------------------------------------------

const syncMusic = () => {
    const { phase, sound } = useStore.getState();
    if (ctx && ctx.state === "running" && sound && phase === "playing") startMusic();
    else stopMusic();
};

export const initSound = () => {
    const unlock = () => {
        if (!ensureContext()) return;
        ctx.resume().then(syncMusic);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend();
        else ctx.resume().then(syncMusic);
    });

    useStore.subscribe((state, prev) => {
        if (state.sound !== prev.sound && master) {
            master.gain.setTargetAtTime(state.sound ? 1 : 0, ctx.currentTime, 0.1);
        }
        if (state.phase !== prev.phase || state.sound !== prev.sound) syncMusic();
        if (state.night !== prev.night) playSound("night");
        if (state.travelTarget && !prev.travelTarget) playSound("travel");
        if (state.panel && !prev.panel) playSound("open");
        if (!state.panel && prev.panel) playSound("close");
        if (state.toasts.length > prev.toasts.length) {
            const latest = state.toasts[state.toasts.length - 1];
            playSound(latest.kind === "complete" ? "complete" : "discover");
        }
    });
};
