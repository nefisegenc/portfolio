// Riff Rush: a rhythm game on a concert stage floating east of the island.
// Notes slide down the highway towards four frets; hit a fret's key as its
// note crosses the line, and hold it through long notes. Hits play the
// guitar part over the band; misses drain the crowd meter, and an empty
// meter gets you booed off before the song ends.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Color, Object3D, Vector3 } from "three";
import { seeded } from "../../../data/world";
import { useT } from "../../../i18n";
import { Underside } from "../../Island";
import { Box, Cyl, FONT, GlowMat, InstanceColors, Shadowed } from "../../parts";
import { isTouch } from "../../utils";
import { audioLatency, audioTime, playSound, setMusicTrack } from "../../sound";
import { guitar, riffMusic, silence } from "../audio";
import { COUNTDOWN, tickCountdown } from "../countdown";
import { arcadeLink, useArcade } from "../state";
import { BAR, BPM, CHART, FRET_KEYS, LANES, LANE_COLORS, LANE_FREQS, SONG_LENGTH, sectionAt } from "./song";
import { DECK, PLAYER_SPOT, STAGE, STAGE_YAW, stageToWorld } from "./stage";

const RADIUS = 15;
const HIGHWAY = { near: 7, far: -6.5, y: 0.7, lane: 1 };
// The song starts gentle and builds: notes start slow, with roomy timing,
// and speed up (and the timing tightens) over the first minute and a bit.
// `look` is how long a note takes to come down the highway.
const LOOK_SLOW = 3;
const LOOK_FAST = 1.8;
const ramp = (t) => {
    const k = Math.max(0, Math.min(1, (t - 4) / 70));
    return k * k * (3 - 2 * k);
};
const lookAhead = (t) => LOOK_SLOW + (LOOK_FAST - LOOK_SLOW) * ramp(t);
// Timing windows start half as wide again as they end up.
const leniency = (t) => 1.5 - 0.5 * ramp(t);
const WINDOWS = [
    { name: "perfect", time: 0.045, points: 100, rock: 0.035, weight: 1, color: "#FACC15" },
    { name: "great", time: 0.09, points: 70, rock: 0.03, weight: 0.8, color: "#22D3EE" },
    { name: "good", time: 0.14, points: 40, rock: 0.02, weight: 0.5, color: "#A3E635" },
];
const MISS = { rock: -0.03, color: "#EF4444" };
const OVERSTRUM = -0.015;
// The crowd can't turn on you in the first stretch of the song, while you
// find the beat, and early misses cost it less.
const GRACE = 18;
const BEAT = 60 / BPM;
const KEYS = Object.fromEntries(FRET_KEYS.flatMap((k, lane) => [[`Key${k}`, lane], [`Digit${lane + 1}`, lane]]));
const laneX = (lane) => (lane - (LANES - 1) / 2) * HIGHWAY.lane;
const MAX_TAILS = 24;
const MAX_SPARKS = 160;
const MAX_NOTES = 72;

const cam = { position: new Vector3(), target: new Vector3(), stiffness: 6, fov: 50 };
// The camera watches from the crowd (stage space, y and z), looking at the stage.
const EYE = { y: 4.6, z: 12.8 };
const LOOK = { y: 0.9, z: -2 };
// Narrow screens pull it back along its line of sight until all four lanes
// fit across the hit line (half the highway's width, plus a margin), and
// touch screens tilt it down until the hit line clears the fret buttons
// (in pixels from the bottom; they're smaller on short screens).
const HIT_HALF = 2.4;
const fretsClear = (height) => (height <= 520 ? 84 : 104);
const frame = (size) => {
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const across = tan * (size.width / Math.max(1, size.height));
    const eye = (k) => ({ y: LOOK.y + (EYE.y - LOOK.y) * k, z: LOOK.z + (EYE.z - LOOK.z) * k });
    let k = 1;
    while (k < 2 && Math.hypot(eye(k).y - HIGHWAY.y, eye(k).z - HIGHWAY.near) * across < HIT_HALF) k += 0.02;
    const from = eye(k);
    if (!isTouch) return { from, to: LOOK };
    // Angles below the horizon: the camera's line of sight, and the hit line.
    const sight = Math.atan2(from.y - LOOK.y, from.z - LOOK.z);
    const hit = Math.atan2(from.y - HIGHWAY.y, from.z - HIGHWAY.near);
    const below = 1 - (2 * fretsClear(size.height)) / size.height;
    const tilt = Math.max(sight, hit - Math.atan(below * tan));
    const reach = Math.hypot(from.y - LOOK.y, from.z - LOOK.z);
    return { from, to: { y: from.y - Math.sin(tilt) * reach, z: from.z - Math.cos(tilt) * reach } };
};

// --- Game ----------------------------------------------------------------------

const newGame = () => ({
    count: COUNTDOWN,
    goAt: null,
    clock: null,
    notes: CHART.map((n) => ({ ...n, state: "pending", heldTo: 0 })),
    next: 0,
    held: Array(LANES).fill(null),
    pressed: Array(LANES).fill(false),
    flash: Array(LANES).fill(0),
    score: 0,
    holdScore: 0,
    combo: 0,
    maxCombo: 0,
    rock: 0.7,
    judged: 0,
    weight: 0,
    judge: null,
    judgeId: 0,
    section: "intro",
    over: false,
    published: "",
});

const multiplier = (g) => Math.min(4, 1 + Math.floor(g.combo / 10));

const sparksAt = (sparks, lane, color, count) => {
    const c = new Color(color);
    for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * Math.PI;
        const v = 2 + Math.random() * 3;
        sparks.push({
            x: laneX(lane),
            y: HIGHWAY.y + 0.2,
            z: HIGHWAY.near,
            vx: Math.cos(a) * v * 0.6,
            vy: Math.sin(a) * v,
            vz: (Math.random() - 0.5) * 2,
            life: 0.4 + Math.random() * 0.3,
            color: c,
        });
    }
};

// Song time from the audio clock once the band has started (so notes line
// up with what you hear), or from the page clock when there's no audio.
const songTime = (g) => {
    if (g.goAt === null) return -1;
    if (g.clock === null) {
        if (riffMusic.startedAt !== null && audioTime() !== null) g.clock = "audio";
        else if (performance.now() / 1000 - g.goAt > 0.5) {
            g.clock = "page";
            g.pageStart = g.goAt + 0.1;
        } else return -1;
    }
    // Behind by the speakers' delay, so notes cross the line as you hear the beat.
    return g.clock === "audio" ? (audioTime() ?? 0) - riffMusic.startedAt - audioLatency() : performance.now() / 1000 - g.pageStart;
};

const judge = (g, entry, color, rock) => {
    g.judge = { key: `riff.${entry}`, color };
    g.judgeId += 1;
    g.rock = Math.max(0, Math.min(1, g.rock + rock));
};

// A fret pressed or released at song time `t`.
const fret = (g, sparks, lane, down, t) => {
    g.pressed[lane] = down;
    if (!down) {
        // Letting go of a long note early ends it there.
        const held = g.held[lane];
        if (held) {
            held.heldTo = Math.max(held.heldTo, t);
            held.state = held.heldTo >= held.time + held.length - 0.1 ? "done" : "dropped";
            g.held[lane] = null;
        }
        return;
    }
    // The closest unplayed note in this lane within reach.
    const easy = leniency(t);
    const reach = WINDOWS[2].time * easy;
    let best = null;
    for (let i = g.next; i < g.notes.length; i++) {
        const n = g.notes[i];
        if (n.time > t + reach) break;
        if (n.lane !== lane || n.state !== "pending" || Math.abs(n.time - t) > reach) continue;
        if (!best || Math.abs(n.time - t) < Math.abs(best.time - t)) best = n;
    }
    if (!best) {
        // Playing with no note there: the crowd notices.
        g.combo = 0;
        g.rock = Math.max(0, g.rock + OVERSTRUM);
        playSound("clunk");
        return;
    }
    const off = Math.abs(best.time - t);
    const win = WINDOWS.find((w) => off <= w.time * easy);
    best.state = best.length > 0 ? "holding" : "hit";
    best.heldTo = t;
    g.combo += 1;
    g.maxCombo = Math.max(g.maxCombo, g.combo);
    g.score += win.points * multiplier(g);
    g.judged += 1;
    g.weight += win.weight;
    g.flash[lane] = 0.18;
    if (best.length > 0) g.held[lane] = best;
    judge(g, win.name, win.color, win.rock);
    guitar(LANE_FREQS[lane], best.length);
    sparksAt(sparks, lane, LANE_COLORS[lane], win.name === "perfect" ? 14 : 8);
    arcadeLink.strum = performance.now();
    if (g.combo > 0 && g.combo % 25 === 0) playSound("crowd", 0.6);
};

// One frame of the song: misses, held notes, the crowd meter and the end.
const stepSong = (g, sparks, t, dt, store) => {
    const reach = WINDOWS[2].time * leniency(t);
    for (let i = g.next; i < g.notes.length; i++) {
        const n = g.notes[i];
        if (n.time > t - reach) break;
        if (n.state === "pending") {
            n.state = "missed";
            g.combo = 0;
            g.judged += 1;
            judge(g, "miss", MISS.color, MISS.rock * (0.45 + 0.55 * ramp(t)));
        }
    }
    while (g.next < g.notes.length && g.notes[g.next].state !== "pending" && g.notes[g.next].time < t - reach) g.next += 1;

    // Long notes score for as long as they're held.
    g.held.forEach((n, lane) => {
        if (!n) return;
        const end = n.time + n.length;
        const to = Math.min(t, end);
        g.holdScore += Math.max(0, to - n.heldTo) * 100 * multiplier(g);
        n.heldTo = to;
        if (Math.random() < 0.5) sparksAt(sparks, lane, LANE_COLORS[lane], 1);
        if (t >= end) {
            n.state = "done";
            g.held[lane] = null;
        }
    });
    g.flash = g.flash.map((f) => Math.max(0, f - dt));

    // Section calls.
    const section = sectionAt(Math.floor(t / BAR));
    if (section !== g.section) {
        g.section = section;
        if (section === "chorus") store.say("riff.chorus", null, "#F472B6");
        if (section === "bridge") store.say("riff.solo", null, "#FACC15");
    }

    if (t < GRACE) g.rock = Math.max(0.1, g.rock);
    const score = Math.round(g.score + g.holdScore);
    if (g.rock <= 0 && !g.over) {
        g.over = true;
        setMusicTrack(silence);
        playSound("boo");
        store.say("riff.booed", null, "#EF4444");
        store.finish(score, { failed: true, accuracy: Math.round((g.weight / Math.max(1, g.judged)) * 100), maxCombo: g.maxCombo, stars: 0 });
        return;
    }
    if (t > SONG_LENGTH && !g.over) {
        g.over = true;
        const accuracy = Math.round((g.weight / CHART.length) * 100);
        const stars = accuracy >= 95 ? 5 : accuracy >= 85 ? 4 : accuracy >= 70 ? 3 : accuracy >= 50 ? 2 : 1;
        playSound("crowd", 1.5);
        store.finish(score, { failed: false, accuracy, maxCombo: g.maxCombo, stars });
        return;
    }

    const detail = {
        combo: g.combo,
        mult: multiplier(g),
        rock: Math.round(g.rock * 50) / 50,
        progress: Math.round(Math.max(0, Math.min(1, t / SONG_LENGTH)) * 100) / 100,
        judge: g.judge,
        judgeId: g.judgeId,
    };
    const summary = `${score}|${detail.combo}|${detail.mult}|${detail.rock}|${detail.progress}|${detail.judgeId}`;
    if (summary !== g.published) {
        g.published = summary;
        store.update({ score, detail });
    }
};

// --- Looks -------------------------------------------------------------------

// Instance colours tint the emissive glow too, so notes shine in their colour.
const glowByInstance = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )\ntotalEmissiveRadiance *= vColor;\n#endif"
    );
};

// The guitar the player holds: neck along +x from the body.
export const Guitar = () => (
    <group>
        <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 20]} />
            <meshStandardMaterial color="#DC2626" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0.13, 0.04, 0]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 18]} />
            <meshStandardMaterial color="#DC2626" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[-0.02, -0.02, 0.032]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.09, 0.09, 0.01, 16]} />
            <meshStandardMaterial color="#F8FAFC" />
        </mesh>
        <Box args={[0.55, 0.05, 0.03]} position={[0.44, 0.03, 0]} color="#3B2A20" />
        <Box args={[0.12, 0.08, 0.035]} position={[0.75, 0.03, 0]} color="#111827" />
        <Box args={[0.7, 0.006, 0.006]} position={[0.35, 0.03, 0.035]}>
            <GlowMat color="#22D3EE" strength={2} />
        </Box>
    </group>
);

const Speaker = ({ x }) => (
    <group position={[x, DECK.top, -8.8]}>
        <Shadowed>
            <Box args={[1.6, 3, 1.3]} position-y={1.5} color="#0B0A14" />
        </Shadowed>
        {[0.75, 1.75, 2.55].map((y, i) => (
            <mesh key={y} position={[0, y, 0.66]}>
                <circleGeometry args={[i === 2 ? 0.25 : 0.45, 20]} />
                <meshStandardMaterial color="#1F2937" roughness={0.6} />
            </mesh>
        ))}
    </group>
);

// A robot drummer behind a kit, hitting on the beat.
const Drummer = ({ drummerRef }) => (
    <group position={[3.6, DECK.top, -9.9]}>
        <Cyl args={[0.45, 0.45, 0.5, 18]} position={[0, 0.45, 0.6]} rotation-x={Math.PI / 2} color="#7C3AED" />
        <Cyl args={[0.28, 0.28, 0.25, 16]} position={[-0.45, 0.85, 0.45]} color="#7C3AED" />
        <Cyl args={[0.3, 0.3, 0.02, 16]} position={[0.6, 1.25, 0.5]} color="#FACC15" />
        <Cyl args={[0.3, 0.3, 0.02, 16]} position={[-0.75, 1.3, 0.2]} color="#FACC15" />
        <group ref={drummerRef}>
            <Box args={[0.55, 0.65, 0.35]} position-y={0.95} color="#CBD5E1" />
            <mesh position-y={1.5}>
                <boxGeometry args={[0.4, 0.34, 0.34]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.5} roughness={0.3} />
            </mesh>
            <Box args={[0.3, 0.07, 0.02]} position={[0, 1.52, 0.18]}>
                <GlowMat color="#22D3EE" strength={2} />
            </Box>
        </group>
    </group>
);

const Stage = ({ set }) => {
    const t = useT();
    return (
        <group>
            {/* Platform */}
            <mesh position-y={-0.5} receiveShadow>
                <cylinderGeometry args={[RADIUS, RADIUS - 0.3, 1, 40]} />
                <meshStandardMaterial color="#1C1730" roughness={0.9} />
            </mesh>
            <Underside radius={RADIUS} />
            {/* Deck */}
            <Shadowed>
                <Box args={[16, DECK.top, DECK.front - DECK.back]} position={[0, DECK.top / 2, (DECK.front + DECK.back) / 2]} color="#14111F" />
            </Shadowed>
            <Box args={[16.1, 0.08, 0.1]} position={[0, DECK.top, DECK.front]}>
                <GlowMat color="#F472B6" strength={1.6} />
            </Box>
            {/* LED wall */}
            <group position={[0, DECK.top + 3.4, DECK.back - 0.2]}>
                <Box args={[15.4, 6.6, 0.3]} color="#05040A" />
                <instancedMesh ref={set("screen")} args={[undefined, undefined, 16 * 7]} position-z={0.17}>
                    <planeGeometry args={[0.88, 0.85]} />
                    <meshBasicMaterial toneMapped={false} />
                    <InstanceColors count={16 * 7} />
                </instancedMesh>
            </group>
            <Text font={FONT} fontSize={1.1} position={[0, DECK.top + 7.4, DECK.back - 0.2]} anchorY="middle">
                {t("game.riff").toUpperCase()}
                <GlowMat color="#F472B6" strength={1.8} />
            </Text>
            <Speaker x={-6.4} />
            <Speaker x={6.4} />
            <Drummer drummerRef={set("drummer")} />
            {/* Truss with moving lights */}
            {[-7.8, 7.8].map((x) => (
                <Box key={x} args={[0.35, 8.6, 0.35]} position={[x, 4.3, -6.9]} color="#334155" />
            ))}
            <Box args={[16, 0.35, 0.35]} position={[0, 8.5, -6.9]} color="#334155" />
            {[-5.4, -1.8, 1.8, 5.4].map((x, i) => (
                <group key={x} position={[x, 8.3, -6.9]} ref={set(`beam${i}`)}>
                    <Cyl args={[0.18, 0.24, 0.4, 10]} color="#0B0A14" />
                    <mesh position-y={-4.2}>
                        <coneGeometry args={[1.3, 8, 16, 1, true]} />
                        <meshBasicMaterial color={i % 2 ? "#22D3EE" : "#F472B6"} transparent opacity={0.13} depthWrite={false} toneMapped={false} />
                    </mesh>
                </group>
            ))}
            <pointLight ref={set("light0")} position={[-4, 6, -5]} color="#F472B6" intensity={40} distance={22} />
            <pointLight ref={set("light1")} position={[4, 6, -5]} color="#22D3EE" intensity={40} distance={22} />
        </group>
    );
};

// The fan crowd on both sides of the highway.
const CROWD = (() => {
    const rand = seeded(23);
    const out = [];
    for (let tries = 0; tries < 600 && out.length < 54; tries++) {
        const side = rand() < 0.5 ? -1 : 1;
        const x = side * (3.6 + rand() * 8);
        const z = -4 + rand() * 13;
        if (Math.hypot(x, z) > RADIUS - 1.2) continue;
        if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 0.95)) continue;
        out.push({ x, z, h: 0.85 + rand() * 0.3, phase: rand(), shade: 0.25 + rand() * 0.35 });
    }
    return out;
})();

const Highway = ({ set }) => {
    const length = HIGHWAY.near - HIGHWAY.far;
    const width = LANES * HIGHWAY.lane;
    return (
        <group position-y={HIGHWAY.y}>
            <mesh rotation-x={-Math.PI / 2} position-z={(HIGHWAY.near + HIGHWAY.far) / 2} receiveShadow>
                <planeGeometry args={[width + 0.3, length + 0.8]} />
                <meshStandardMaterial color="#0B0A14" roughness={0.3} metalness={0.3} />
            </mesh>
            {Array.from({ length: LANES + 1 }, (_, i) => (
                <mesh key={i} rotation-x={-Math.PI / 2} position={[(i - LANES / 2) * HIGHWAY.lane, 0.01, (HIGHWAY.near + HIGHWAY.far) / 2]}>
                    <planeGeometry args={[i === 0 || i === LANES ? 0.08 : 0.03, length + 0.8]} />
                    <meshBasicMaterial color={i === 0 || i === LANES ? "#F472B6" : "#475569"} toneMapped={false} />
                </mesh>
            ))}
            {/* Strike line and the four frets */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, HIGHWAY.near]}>
                <planeGeometry args={[width + 0.3, 0.06]} />
                <meshBasicMaterial color="#F8FAFC" toneMapped={false} />
            </mesh>
            {LANE_COLORS.map((c, lane) => (
                <group key={c} ref={set(`fret${lane}`)} position={[laneX(lane), 0.03, HIGHWAY.near]}>
                    <mesh rotation-x={-Math.PI / 2}>
                        <ringGeometry args={[0.28, 0.4, 32]} />
                        <meshBasicMaterial color={c} toneMapped={false} />
                    </mesh>
                    <mesh rotation-x={-Math.PI / 2} position-y={-0.005}>
                        <circleGeometry args={[0.28, 32]} />
                        <meshBasicMaterial color={c} transparent opacity={0.15} toneMapped={false} />
                    </mesh>
                    {/* The fret's key, so it's clear what to press. */}
                    <Text
                        font={FONT}
                        fontSize={0.34}
                        rotation-x={-Math.PI / 2}
                        position-y={0.015}
                        anchorX="center"
                        anchorY="middle"
                        color="#FFFFFF"
                        outlineWidth={0.03}
                        outlineColor="#0B0A14"
                    >
                        {FRET_KEYS[lane]}
                    </Text>
                </group>
            ))}
        </group>
    );
};

const tmp = new Object3D();

// Moves, fades and draws the sparks, compacting the list in place.
const drawSparks = (list, dt, mesh) => {
    let live = 0;
    for (const p of list) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy -= 9 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        tmp.position.set(p.x, p.y, p.z);
        tmp.rotation.set(p.life * 8, p.life * 5, 0);
        tmp.scale.setScalar(Math.max(0.02, p.life * 0.12));
        tmp.updateMatrix();
        mesh.setMatrixAt(live, tmp.matrix);
        mesh.setColorAt(live, p.color);
        list[live++] = p;
    }
    list.length = live;
    mesh.count = live;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};
const tint = new Color();
const GREY = new Color("#475569");
const LANE_TINTS = LANE_COLORS.map((c) => new Color(c));
const WHITE = new Color("#FFFFFF");
const SCREEN_COLORS = ["#F472B6", "#22D3EE", "#A78BFA", "#FACC15"].map((c) => new Color(c));

export const Riff = () => {
    const active = useArcade((s) => s.active === "riff");
    const run = useArcade((s) => s.run);
    const game = useRef(null);
    const sparks = useRef([]);
    const refs = useRef({});
    const set = (key) => (el) => (refs.current[key] = el);
    const spot = useMemo(() => stageToWorld(PLAYER_SPOT.x, DECK.top, PLAYER_SPOT.z), []);

    useEffect(() => {
        sparks.current = [];
        if (!active) {
            game.current = null;
            arcadeLink.fret = null;
            return;
        }
        const g = newGame();
        game.current = g;
        riffMusic.startedAt = null;
        const lock = { x: spot[0], y: spot[1], z: spot[2], rotY: STAGE_YAW };
        arcadeLink.teleport = { x: spot[0], z: spot[2], rotY: STAGE_YAW };
        arcadeLink.lock = lock;
        playSound("beep");
        useArcade.getState().update({ score: 0, detail: { combo: 0, mult: 1, rock: 0.7, progress: 0, judge: null, judgeId: 0 } });
        // Frets: keys here, touch buttons in the HUD.
        arcadeLink.fret = (lane, down) => {
            if (g.goAt === null || g.over) return;
            fret(g, sparks.current, lane, down, songTime(g));
        };
        const keyDown = (e) => {
            const lane = KEYS[e.code];
            if (lane === undefined || e.repeat || e.metaKey || e.ctrlKey) return;
            e.preventDefault();
            arcadeLink.fret?.(lane, true);
        };
        const keyUp = (e) => {
            const lane = KEYS[e.code];
            if (lane !== undefined) arcadeLink.fret?.(lane, false);
        };
        window.addEventListener("keydown", keyDown);
        window.addEventListener("keyup", keyUp);
        return () => {
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);
        };
    }, [active, run, spot]);

    useLayoutEffect(() => {
        ["notes", "caps", "tails", "sparks", "beats"].forEach((k) => refs.current[k] && (refs.current[k].count = 0));
    }, []);

    useFrame(({ clock, size }, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const now = clock.elapsedTime;
        const g = game.current;
        const store = useArcade.getState();
        const m = refs.current;

        let t = -1;
        if (g) {
            if (store.status === "countdown") {
                if (tickCountdown(g, dt)) {
                    // The band starts on "go"; the chart follows its clock.
                    g.goAt = performance.now() / 1000;
                    setMusicTrack(riffMusic);
                }
            } else {
                t = songTime(g);
                if (t >= 0 && store.status === "playing" && !g.over) stepSong(g, sparks.current, t, dt, store);
            }
            // Camera from the crowd, bobbing gently with the beat.
            const beat = t >= 0 ? (t / BEAT) % 1 : 0;
            arcadeLink.beat = beat;
            const { from, to } = frame(size);
            const [cx, cy, cz] = stageToWorld(0, from.y + Math.sin(beat * Math.PI * 2) * 0.04, from.z);
            const [tx, ty, tz] = stageToWorld(0, to.y, to.z);
            cam.position.set(cx, cy, cz);
            cam.target.set(tx, ty, tz);
            arcadeLink.camera = cam;
            arcadeLink.focus = { x: STAGE.x, z: STAGE.z };
            arcadeLink.lock = { x: spot[0], y: spot[1], z: spot[2], rotY: STAGE_YAW };
        }

        // Notes ride down the highway; held notes leave a tail that shrinks
        // as it's played.
        let n = 0;
        let tails = 0;
        const look = lookAhead(Math.max(0, t));
        const speed = (HIGHWAY.near - HIGHWAY.far) / look;
        if (g && t > -1) {
            for (let i = Math.max(0, g.next - 6); i < g.notes.length && n < MAX_NOTES; i++) {
                const note = g.notes[i];
                if (note.time > t + look) break;
                const tail = note.length * speed;
                const z = HIGHWAY.near - (note.time - t) * speed;
                if (note.state === "hit" || note.state === "done") continue;
                if (z - (note.state === "holding" ? tail : 0) > HIGHWAY.near + 2) continue;
                const lane = note.lane;
                const missed = note.state === "missed" || note.state === "dropped";
                if (note.state !== "holding") {
                    tmp.position.set(laneX(lane), HIGHWAY.y + 0.1, z);
                    tmp.rotation.set(0, 0, 0);
                    tmp.scale.set(1, 1, 1);
                    tmp.updateMatrix();
                    m.notes.setMatrixAt(n, tmp.matrix);
                    m.notes.setColorAt(n, missed ? GREY : LANE_TINTS[lane]);
                    tmp.position.y += 0.09;
                    tmp.updateMatrix();
                    m.caps.setMatrixAt(n, tmp.matrix);
                    n++;
                }
                if (note.length > 0 && tails < MAX_TAILS) {
                    const head = note.state === "holding" ? HIGHWAY.near : z;
                    const end = HIGHWAY.near - (note.time + note.length - t) * speed;
                    const len = Math.max(0, head - end);
                    if (len > 0.02) {
                        tmp.position.set(laneX(lane), HIGHWAY.y + 0.05, head - len / 2);
                        tmp.scale.set(1, 1, len);
                        tmp.updateMatrix();
                        m.tails.setMatrixAt(tails, tmp.matrix);
                        m.tails.setColorAt(tails, missed ? GREY : note.state === "holding" ? WHITE : LANE_TINTS[lane]);
                        tails++;
                    }
                }
            }
        }
        m.notes.count = n;
        m.caps.count = n;
        m.tails.count = tails;
        [m.notes, m.caps, m.tails].forEach((mesh) => {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        });

        // Beat lines scroll with the notes.
        let beats = 0;
        if (t > -1) {
            const first = Math.ceil(t / BEAT);
            for (let b = first; b * BEAT < t + look; b++) {
                tmp.position.set(0, HIGHWAY.y + 0.012, HIGHWAY.near - (b * BEAT - t) * speed);
                tmp.rotation.set(-Math.PI / 2, 0, 0);
                tmp.scale.set(1, b % 4 === 0 ? 2.5 : 1, 1);
                tmp.updateMatrix();
                m.beats.setMatrixAt(beats++, tmp.matrix);
            }
        }
        m.beats.count = beats;
        m.beats.instanceMatrix.needsUpdate = true;

        // Frets glow while pressed and flash on a hit.
        LANE_COLORS.forEach((_, lane) => {
            const el = m[`fret${lane}`];
            if (!el) return;
            const pressed = g?.pressed[lane];
            const flash = g?.flash[lane] ?? 0;
            el.scale.setScalar(1 + (pressed ? 0.12 : 0) + flash * 1.6);
            el.children[1].material.opacity = pressed ? 0.6 : 0.15 + flash * 3;
        });

        drawSparks(sparks.current, dt, m.sparks);

        // The show: screen, lights, beams, drummer and crowd move with the music.
        const beatTime = t >= 0 ? t : now;
        const pulse = Math.pow(1 - ((beatTime / BEAT) % 1), 3);
        const energy = g ? 0.4 + (g.rock ?? 0.5) * 0.6 : 0.3;
        if (m.screen) {
            const bar = Math.floor(beatTime / BEAT);
            for (let i = 0; i < 16 * 7; i++) {
                const col = i % 16;
                const row = Math.floor(i / 16);
                tmp.position.set((col - 7.5) * 0.92, (row - 3) * 0.9, 0);
                tmp.rotation.set(0, 0, 0);
                tmp.scale.setScalar(1);
                tmp.updateMatrix();
                m.screen.setMatrixAt(i, tmp.matrix);
                const wave = Math.sin(col * 0.6 + row * 0.4 - beatTime * 3) * 0.5 + 0.5;
                tint.copy(
                    SCREEN_COLORS[(((bar + Math.floor(col / 4)) % SCREEN_COLORS.length) + SCREEN_COLORS.length) % SCREEN_COLORS.length]
                ).multiplyScalar(0.15 + wave * 0.5 + pulse * 0.6);
                m.screen.setColorAt(i, tint);
            }
            m.screen.instanceMatrix.needsUpdate = true;
            m.screen.instanceColor.needsUpdate = true;
        }
        [0, 1, 2, 3].forEach((i) => {
            const el = m[`beam${i}`];
            if (!el) return;
            el.rotation.z = Math.sin(now * 0.9 + i * 1.7) * 0.5;
            el.rotation.x = 0.35 + Math.cos(now * 0.7 + i) * 0.25;
        });
        [m.light0, m.light1].forEach((el) => el && (el.intensity = 25 + pulse * 40 * energy));
        if (m.drummer) {
            m.drummer.position.y = pulse * 0.08;
            m.drummer.rotation.x = -pulse * 0.15;
        }
        if (m.crowd) {
            CROWD.forEach((c, i) => {
                const jump = Math.max(0, Math.sin((beatTime / BEAT + c.phase * 0.25) * Math.PI)) * 0.28 * energy;
                tmp.position.set(c.x, jump + c.h * 0.55, c.z);
                tmp.rotation.set(0, Math.atan2(-c.x, -8.4 - c.z), 0);
                tmp.scale.set(1, c.h, 1);
                tmp.updateMatrix();
                m.crowd.setMatrixAt(i, tmp.matrix);
                tmp.position.y = jump + c.h * 1.18;
                tmp.scale.setScalar(1);
                tmp.updateMatrix();
                m.heads.setMatrixAt(i, tmp.matrix);
            });
            m.crowd.instanceMatrix.needsUpdate = true;
            m.heads.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group position={[STAGE.x, STAGE.y, STAGE.z]} rotation-y={STAGE_YAW}>
            <Stage set={set} />
            <Highway set={set} />
            <instancedMesh ref={set("notes")} args={[undefined, undefined, MAX_NOTES]} frustumCulled={false}>
                <cylinderGeometry args={[0.34, 0.34, 0.16, 24]} />
                <meshStandardMaterial roughness={0.25} emissive="#FFFFFF" emissiveIntensity={0.6} onBeforeCompile={glowByInstance} />
                <InstanceColors count={MAX_NOTES} />
            </instancedMesh>
            <instancedMesh ref={set("caps")} args={[undefined, undefined, MAX_NOTES]} frustumCulled={false}>
                <cylinderGeometry args={[0.16, 0.2, 0.05, 20]} />
                <meshBasicMaterial color="#F8FAFC" toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={set("tails")} args={[undefined, undefined, MAX_TAILS]} frustumCulled={false}>
                <boxGeometry args={[0.16, 0.05, 1]} />
                <meshBasicMaterial toneMapped={false} />
                <InstanceColors count={MAX_TAILS} />
            </instancedMesh>
            <instancedMesh ref={set("beats")} args={[undefined, undefined, 8]} frustumCulled={false}>
                <planeGeometry args={[LANES * HIGHWAY.lane, 0.03]} />
                <meshBasicMaterial color="#64748B" toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={set("sparks")} args={[undefined, undefined, MAX_SPARKS]} frustumCulled={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial toneMapped={false} />
                <InstanceColors count={MAX_SPARKS} />
            </instancedMesh>
            <instancedMesh ref={set("crowd")} args={[undefined, undefined, CROWD.length]} frustumCulled={false}>
                <capsuleGeometry args={[0.22, 0.6, 4, 8]} />
                <meshStandardMaterial color="#2E2550" roughness={0.8} />
            </instancedMesh>
            <instancedMesh ref={set("heads")} args={[undefined, undefined, CROWD.length]} frustumCulled={false}>
                <sphereGeometry args={[0.2, 10, 8]} />
                <meshStandardMaterial color="#3B2F66" roughness={0.8} />
            </instancedMesh>
        </group>
    );
};
