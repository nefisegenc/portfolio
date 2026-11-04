// Bug Hunt: defend the server core through five waves of bugs. Hold the
// action button to fire the debugger blaster (it locks onto the nearest
// bug), grab the power-ups bugs drop, and chain kills for a combo.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CanvasTexture, Color, Matrix4, Object3D, RepeatWrapping, SRGBColorSpace, Vector3 } from "three";
import { useT } from "../../../i18n";
import { cameraState, playerState } from "../../input";
import { Underside } from "../../Island";
import { Box, Cyl, FONT, GlowMat, Shadowed } from "../../parts";
import { playSound } from "../../sound";
import { COUNTDOWN, tickCountdown } from "../countdown";
import { arcadeLink, useArcade } from "../state";
import { ARENA_RADIUS, CORE_HP, CORE_RADIUS, HUNT, KINDS, START, WAVES, huntBounds, portals, spawnGap, waveList } from "./arena";

const MAX_BUGS = 48;
const MAX_SHOTS = 48;
const MAX_SPARKS = 320;
const SHOT_SPEED = 26;
const RANGE = 14;
const PINK = "#EC4899";
const CYAN = "#22D3EE";
const POWERS = { rapid: "#FACC15", triple: CYAN, emp: PINK };

// The camera hangs behind and above the player, always facing north, so
// movement keys map straight onto the arena.
const CAM_YAW = 0;
const cam = { position: new Vector3(), target: new Vector3(), stiffness: 6, fov: 50 };

// --- Simulation --------------------------------------------------------------

const newWorld = () => ({
    bugs: [],
    shots: [],
    sparks: [],
    drops: [],
    core: CORE_HP,
    coreFlash: 0,
    emp: 0,
});

const newGame = () => ({
    count: COUNTDOWN,
    wave: 0,
    queue: [],
    spawnT: 0,
    between: 0.6,
    portal: 0,
    score: 0,
    combo: 0,
    comboT: 0,
    cooldown: 0,
    rapid: 0,
    triple: 0,
    waveCore: CORE_HP,
    shake: 0,
    over: false,
    published: "",
});

const spawnBug = (w, kind, x, z) => {
    if (w.bugs.length >= MAX_BUGS) return;
    const k = KINDS[kind];
    w.bugs.push({ kind, x, z, hp: k.hp, flash: 0, wobble: Math.random() * 10, heading: 0, minion: 3 });
};

const burst = (w, x, y, z, color, count, power = 4) => {
    const c = new Color(color);
    for (let i = 0; i < count && w.sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = power * (0.4 + Math.random() * 0.8);
        w.sparks.push({
            x,
            y,
            z,
            vx: Math.cos(a) * v,
            vy: 2 + Math.random() * power,
            vz: Math.sin(a) * v,
            life: 0.5 + Math.random() * 0.5,
            color: c,
        });
    }
};

const multiplier = (g) => Math.min(5, 1 + Math.floor(g.combo / 4));

const kill = (w, g, bug, store) => {
    const k = KINDS[bug.kind];
    g.combo += 1;
    g.comboT = 1.8;
    g.score += k.points * multiplier(g);
    burst(w, bug.x, HUNT.y + k.size, bug.z, k.color, bug.kind === "boss" ? 140 : bug.kind === "tank" ? 50 : 16, bug.kind === "boss" ? 9 : 5);
    playSound("bugDie", bug.kind === "tank" || bug.kind === "boss");
    if (bug.kind === "boss") {
        g.shake = 0.9;
        store.say("hunt.bossDown", null, PINK);
    }
    if (bug.kind === "splitter") {
        spawnBug(w, "mite", bug.x + 0.4, bug.z);
        spawnBug(w, "mite", bug.x - 0.4, bug.z);
    }
    const chance = { mite: 0.03, beetle: 0.08, splitter: 0.1, tank: 0.6, boss: 0 }[bug.kind];
    if (Math.random() < chance) {
        const roll = Math.random();
        w.drops.push({ x: bug.x, z: bug.z, kind: roll < 0.2 ? "emp" : roll < 0.6 ? "rapid" : "triple", life: 9 });
    }
};

// One frame of the hunt: waves, bugs, shots, power-ups and the core.
const stepHunt = (w, g, dt, store) => {
    const px = playerState.x;
    const pz = playerState.z;

    // Waves: a short break, then the next wave's bugs come through the portals.
    if (g.between > 0) {
        g.between -= dt;
        if (g.between <= 0) {
            g.wave += 1;
            g.queue = waveList(g.wave);
            g.waveCore = w.core;
            g.spawnT = 0.5;
            playSound("wave");
            store.say(g.wave === WAVES ? "hunt.lastWave" : "hunt.wave", { n: g.wave, total: WAVES }, CYAN);
        }
    } else if (g.queue.length) {
        g.spawnT -= dt;
        if (g.spawnT <= 0) {
            const kind = g.queue.shift();
            const p = portals[g.portal++ % portals.length];
            spawnBug(w, kind, p.x, p.z);
            if (kind === "boss") {
                store.say("hunt.boss", null, PINK);
                g.shake = 0.5;
            }
            g.spawnT = spawnGap(g.wave);
        }
    } else if (w.bugs.length === 0) {
        const perfect = w.core >= g.waveCore;
        const bonus = 150 * g.wave + (perfect ? 250 : 0);
        g.score += bonus;
        if (g.wave === WAVES) {
            g.over = true;
            g.score += w.core * 10;
            playSound("finish");
            store.say("hunt.victory", null, "#22C55E");
            store.finish(g.score, { victory: true, wave: g.wave });
            return;
        }
        store.say(perfect ? "hunt.perfect" : "hunt.cleared", { n: bonus }, perfect ? "#FACC15" : CYAN);
        w.core = Math.min(CORE_HP, w.core + 10);
        g.between = 3;
    }

    // Combo decays if kills stop coming.
    g.comboT -= dt;
    if (g.comboT <= 0) g.combo = 0;
    g.rapid = Math.max(0, g.rapid - dt);
    g.triple = Math.max(0, g.triple - dt);

    // Bugs crawl to the core, weaving a little and keeping apart.
    for (const b of w.bugs) {
        const k = KINDS[b.kind];
        b.wobble += dt * (4 + k.speed);
        b.flash = Math.max(0, b.flash - dt);
        const dx = HUNT.x - b.x;
        const dz = HUNT.z - b.z;
        const d = Math.hypot(dx, dz) || 1;
        const side = Math.sin(b.wobble * 0.5) * 0.5;
        let vx = (dx / d) * k.speed + (-dz / d) * side;
        let vz = (dz / d) * k.speed + (dx / d) * side;
        for (const o of w.bugs) {
            if (o === b) continue;
            const ox = b.x - o.x;
            const oz = b.z - o.z;
            const od = Math.hypot(ox, oz);
            const min = k.size + KINDS[o.kind].size;
            if (od > 0 && od < min) {
                vx += (ox / od) * 2;
                vz += (oz / od) * 2;
            }
        }
        b.x += vx * dt;
        b.z += vz * dt;
        b.heading = Math.atan2(dx, dz);
        // The boss drops mites as it goes.
        if (b.kind === "boss") {
            b.minion -= dt;
            if (b.minion <= 0) {
                b.minion = 2.6;
                spawnBug(w, "mite", b.x + 1.5, b.z);
                spawnBug(w, "mite", b.x - 1.5, b.z);
            }
        }
        if (d < CORE_RADIUS + k.size * 0.8) {
            b.bit = true;
            w.core = Math.max(0, w.core - k.damage);
            w.coreFlash = 0.4;
            g.shake = Math.max(g.shake, 0.25);
            burst(w, b.x, HUNT.y + 0.6, b.z, k.color, 18);
            playSound("coreHit");
        }
    }
    w.bugs = w.bugs.filter((b) => !b.bit);
    if (w.core <= 0 && !g.over) {
        g.over = true;
        playSound("gameOver");
        store.say("hunt.down", null, "#EF4444");
        store.finish(g.score, { victory: false, wave: g.wave });
        return;
    }

    // Firing: lock onto the nearest bug in range and fire while held.
    g.cooldown -= dt;
    let target = null;
    let best = RANGE;
    for (const b of w.bugs) {
        const d = Math.hypot(b.x - px, b.z - pz);
        if (d < best) {
            best = d;
            target = b;
        }
    }
    const firing = arcadeLink.holding;
    const yaw = target ? Math.atan2(target.x - px, target.z - pz) : playerState.rotY;
    arcadeLink.aimYaw = firing || target ? yaw : null;
    if (firing && g.cooldown <= 0) {
        g.cooldown = g.rapid > 0 ? 0.075 : 0.16;
        const spread = g.triple > 0 ? [-0.2, 0, 0.2] : [0];
        for (const a of spread) {
            if (w.shots.length >= MAX_SHOTS) break;
            const dirX = Math.sin(yaw + a);
            const dirZ = Math.cos(yaw + a);
            w.shots.push({ x: px + dirX * 0.7, z: pz + dirZ * 0.7, vx: dirX * SHOT_SPEED, vz: dirZ * SHOT_SPEED, life: 0.7 });
        }
        playSound("laser");
    }

    // Shots fly, and hit the first bug they touch.
    for (const s of w.shots) {
        s.x += s.vx * dt;
        s.z += s.vz * dt;
        s.life -= dt;
        for (const b of w.bugs) {
            if (b.hp <= 0) continue;
            if (Math.hypot(b.x - s.x, b.z - s.z) < KINDS[b.kind].size + 0.25) {
                b.hp -= 1;
                b.flash = 0.08;
                s.life = 0;
                burst(w, s.x, HUNT.y + 0.6, s.z, CYAN, 3, 2);
                if (b.hp <= 0) kill(w, g, b, store);
                else playSound("bugHit");
                break;
            }
        }
    }
    w.shots = w.shots.filter((s) => s.life > 0);
    w.bugs = w.bugs.filter((b) => b.hp > 0);

    // Power-ups: walk over them to pick them up.
    for (const p of w.drops) {
        p.life -= dt;
        if (Math.hypot(p.x - px, p.z - pz) < 1.2) {
            p.life = 0;
            playSound("powerup");
            if (p.kind === "rapid") g.rapid = 7;
            if (p.kind === "triple") g.triple = 7;
            if (p.kind === "emp") {
                // Clears every bug near the player in one blast.
                w.emp = 0.01;
                playSound("emp");
                g.shake = 0.6;
                for (const b of w.bugs) {
                    if (b.kind !== "boss" && Math.hypot(b.x - px, b.z - pz) < 10) {
                        b.hp = 0;
                        kill(w, g, b, store);
                    }
                }
                w.bugs = w.bugs.filter((b) => b.hp > 0);
            }
            store.say(`hunt.${p.kind}`, null, POWERS[p.kind]);
        }
    }
    w.drops = w.drops.filter((p) => p.life > 0);

    // HUD, when something it shows has changed.
    const summary = `${g.score}|${g.wave}|${multiplier(g)}|${Math.ceil(w.core)}|${g.rapid > 0}|${g.triple > 0}`;
    if (summary !== g.published) {
        g.published = summary;
        store.update({
            score: g.score,
            detail: {
                wave: Math.max(1, g.wave),
                waves: WAVES,
                combo: multiplier(g),
                core: w.core / CORE_HP,
                rapid: g.rapid > 0,
                triple: g.triple > 0,
            },
        });
    }
};

// Sparks and the EMP ring run whether or not a game is on, so the last
// explosions finish playing out.
const stepEffects = (w, dt) => {
    for (const p of w.sparks) {
        p.vy -= 12 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.life -= dt;
    }
    w.sparks = w.sparks.filter((p) => p.life > 0);
    w.coreFlash = Math.max(0, w.coreFlash - dt);
    if (w.emp > 0) w.emp = w.emp > 1 ? 0 : w.emp + dt * 2.2;
};

// --- Looks -------------------------------------------------------------------

const makeGridTexture = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0B0A14";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#22D3EE";
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(9, 9);
    return tex;
};

// Bodies glow in their own colour: tint the emissive light by the
// instance colour.
const glowByInstance = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif",
    );
};

const Platform = () => {
    const t = useT();
    const grid = useMemo(() => makeGridTexture(), []);
    const corners = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        return [Math.sin(a) * (ARENA_RADIUS + 0.4), Math.cos(a) * (ARENA_RADIUS + 0.4), a];
    });
    return (
        <group position={[HUNT.x, HUNT.y, HUNT.z]}>
            <mesh position-y={-0.6} rotation-y={Math.PI / 6} receiveShadow>
                <cylinderGeometry args={[ARENA_RADIUS + 0.8, ARENA_RADIUS + 0.4, 1.2, 6]} />
                <meshStandardMaterial attach="material-0" color="#1C1730" flatShading />
                <meshStandardMaterial attach="material-1" map={grid} emissive={CYAN} emissiveMap={grid} emissiveIntensity={0.9} roughness={0.4} />
                <meshStandardMaterial attach="material-2" color="#1C1730" />
            </mesh>
            <Underside radius={ARENA_RADIUS} />
            {corners.map(([x, z, a], i) => {
                const [nx, nz] = corners[(i + 1) % 6];
                return (
                    <group key={i}>
                        <Box args={[0.5, 2.4, 0.5]} position={[x, 1.2, z]} color="#1C1730" />
                        <Box args={[0.6, 0.18, 0.6]} position={[x, 2.45, z]}>
                            <GlowMat color={PINK} strength={1.4} />
                        </Box>
                        <mesh position={[(x + nx) / 2, 0.06, (z + nz) / 2]} rotation-y={a + Math.PI / 6}>
                            <boxGeometry args={[ARENA_RADIUS + 0.4, 0.12, 0.16]} />
                            <GlowMat color={PINK} strength={1} />
                        </mesh>
                    </group>
                );
            })}
            <group position={[0, 0, -ARENA_RADIUS - 0.6]}>
                <Box args={[0.3, 4.2, 0.3]} position={[-3.2, 2.1, 0]} color="#1C1730" />
                <Box args={[0.3, 4.2, 0.3]} position={[3.2, 2.1, 0]} color="#1C1730" />
                <Box args={[7, 1.5, 0.25]} position={[0, 4.1, 0]} color="#0B0A14" />
                <Text font={FONT} fontSize={0.95} position={[0, 4.12, 0.14]} anchorY="middle">
                    {t("game.bugs").toUpperCase()}
                    <GlowMat color="#22C55E" strength={1.6} />
                </Text>
            </group>
        </group>
    );
};

const Portal = ({ p }) => {
    const swirl = useRef();
    useFrame(({ clock }) => (swirl.current.rotation.z = clock.elapsedTime * 2));
    return (
        <group position={[p.x, HUNT.y + 1.7, p.z]} rotation-y={p.angle}>
            <mesh>
                <torusGeometry args={[1.5, 0.16, 10, 36]} />
                <GlowMat color={PINK} strength={1.4} />
            </mesh>
            <mesh ref={swirl}>
                <circleGeometry args={[1.4, 6]} />
                <meshBasicMaterial color="#7C3AED" transparent opacity={0.55} toneMapped={false} />
            </mesh>
            <Box args={[0.3, 1.7, 0.3]} position={[0, -0.85 - 0.1, 0]} color="#1C1730" />
        </group>
    );
};

// The server: a rack tower with blinking lights, a spinning crystal and a
// shield ring that turns from green to red as it takes damage.
const Core = ({ ringRef, crystalRef, lightRef }) => (
    <group position={[HUNT.x, HUNT.y, HUNT.z]}>
        <Shadowed>
            <Cyl args={[CORE_RADIUS + 0.2, CORE_RADIUS + 0.4, 0.5, 8]} position-y={0.25} color="#1C1730" />
            <Box args={[1.6, 3.2, 1.6]} position-y={2} color="#14111F" />
        </Shadowed>
        {Array.from({ length: 4 }, (_, side) =>
            Array.from({ length: 5 }, (_, row) => (
                <Box
                    key={`${side}${row}`}
                    args={[1.1, 0.12, 0.04]}
                    position={[Math.sin((side * Math.PI) / 2) * 0.82, 0.8 + row * 0.5, Math.cos((side * Math.PI) / 2) * 0.82]}
                    rotation-y={(side * Math.PI) / 2}
                >
                    <GlowMat color={row % 2 ? CYAN : "#22C55E"} strength={1.3} />
                </Box>
            )),
        )}
        <mesh ref={crystalRef} position-y={4.3}>
            <octahedronGeometry args={[0.6, 0]} />
            <GlowMat color={CYAN} strength={1.8} />
        </mesh>
        <mesh ref={ringRef} position-y={1.2} rotation-x={Math.PI / 2}>
            <torusGeometry args={[CORE_RADIUS + 0.5, 0.09, 8, 48]} />
            <meshBasicMaterial color="#22C55E" toneMapped={false} />
        </mesh>
        <pointLight ref={lightRef} position-y={3} color={CYAN} intensity={30} distance={16} />
    </group>
);

// The blaster in the player's hand (arm space: the arm points down).
export const Blaster = () => (
    <group position={[0, -0.5, 0.02]}>
        <Box args={[0.11, 0.26, 0.14]} color="#1C1730" />
        <Cyl args={[0.035, 0.035, 0.3, 8]} position-y={-0.26} color="#94A3B8" />
        <mesh position-y={-0.42}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <GlowMat color={CYAN} strength={3} />
        </mesh>
    </group>
);

const LEGS = 6;
const tmp = new Object3D();
const part = new Object3D();
const shot = new Object3D();
shot.rotation.order = "YXZ";
const body = new Matrix4();
const out = new Matrix4();
const white = new Color("#FFFFFF");
const KIND_COLOR = Object.fromEntries(Object.entries(KINDS).map(([kind, k]) => [kind, new Color(k.color)]));

export const BugHunt = () => {
    const active = useArcade((s) => s.active === "bugs");
    const run = useArcade((s) => s.run);
    const world = useRef(newWorld());
    const game = useRef(null);
    const parts = useRef({});
    const set = (key) => (el) => (parts.current[key] = el);

    useEffect(() => {
        world.current = newWorld();
        if (!active) {
            game.current = null;
            arcadeLink.aimYaw = null;
            return;
        }
        arcadeLink.teleport = { x: START.x, z: START.z, rotY: Math.PI };
        arcadeLink.lock = { x: START.x, y: HUNT.y, z: START.z, rotY: Math.PI };
        arcadeLink.floor = HUNT.y;
        arcadeLink.bounds = huntBounds;
        game.current = newGame();
        playSound("beep");
        useArcade.getState().update({ score: 0, detail: { wave: 1, waves: WAVES, combo: 1, core: 1, rapid: false, triple: false } });
    }, [active, run]);

    useLayoutEffect(() => {
        // Instanced meshes start with everything hidden.
        Object.values(parts.current).forEach((m) => {
            if (m?.isInstancedMesh) m.count = 0;
        });
    }, []);

    useFrame(({ clock }, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const t = clock.elapsedTime;
        const w = world.current;
        const g = game.current;
        const store = useArcade.getState();
        const m = parts.current;

        if (g && store.status === "countdown") {
            if (tickCountdown(g, dt)) arcadeLink.lock = null;
        } else if (g && store.status === "playing" && !g.over) {
            stepHunt(w, g, dt, store);
        }
        stepEffects(w, dt);

        // Camera and the player's lean towards the target.
        if (g) {
            cameraState.yaw = CAM_YAW;
            const shake = g.shake > 0 ? g.shake : 0;
            g.shake = Math.max(0, g.shake - dt);
            // Portrait screens see less of the arena sideways, so pull back.
            const far = window.innerHeight > window.innerWidth ? 1.35 : 1;
            cam.position.set(playerState.x + (Math.random() - 0.5) * shake, HUNT.y + 13.5 * far, playerState.z + 9.5 * far);
            cam.target.set(playerState.x, HUNT.y + 0.5, playerState.z - 1.5);
            arcadeLink.camera = cam;
            arcadeLink.focus = { x: HUNT.x, z: HUNT.z };
        }

        // Bugs: glowing bodies, dark heads, bright eyes and scuttling legs.
        let n = 0;
        let l = 0;
        for (const b of w.bugs) {
            const k = KINDS[b.kind];
            const s = k.size;
            const bob = Math.abs(Math.sin(b.wobble * 2)) * 0.05 * s;
            tmp.position.set(b.x, HUNT.y + s * 0.55 + bob, b.z);
            tmp.rotation.set(0, b.heading, 0);
            tmp.scale.set(s, s * 0.7, s * 1.2);
            tmp.updateMatrix();
            m.body.setMatrixAt(n, tmp.matrix);
            m.body.setColorAt(n, b.flash > 0 ? white : KIND_COLOR[b.kind]);
            body.copy(tmp.matrix);
            // Head, eyes and legs are placed in the body's space.
            part.position.set(0, 0.15, 0.95);
            part.rotation.set(0, 0, 0);
            part.scale.set(0.55, 0.75, 0.45);
            part.updateMatrix();
            m.head.setMatrixAt(n, out.copy(body).multiply(part.matrix));
            [-1, 1].forEach((side, e) => {
                part.position.set(side * 0.22, 0.38, 1.25);
                part.scale.set(0.16, 0.22, 0.12);
                part.updateMatrix();
                m.eyes.setMatrixAt(n * 2 + e, out.copy(body).multiply(part.matrix));
            });
            for (let i = 0; i < LEGS; i++) {
                const side = i < 3 ? -1 : 1;
                const row = (i % 3) - 1;
                part.position.set(side * 0.85, -0.3, row * 0.55);
                part.rotation.set(Math.sin(b.wobble * 3 + i * 2) * 0.5, 0, side * 0.9);
                part.scale.set(0.08, 0.7, 0.08);
                part.updateMatrix();
                m.legs.setMatrixAt(l++, out.copy(body).multiply(part.matrix));
            }
            n++;
        }
        m.body.count = n;
        m.head.count = n;
        m.eyes.count = n * 2;
        m.legs.count = l;
        [m.body, m.head, m.eyes, m.legs].forEach((mesh) => {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        });

        // Shots
        w.shots.forEach((s, i) => {
            // Capsules lie along their flight.
            shot.position.set(s.x, HUNT.y + 1.1, s.z);
            shot.rotation.set(Math.PI / 2, Math.atan2(s.vx, s.vz), 0);
            shot.updateMatrix();
            m.shots.setMatrixAt(i, shot.matrix);
        });
        m.shots.count = w.shots.length;
        m.shots.instanceMatrix.needsUpdate = true;

        // Sparks
        w.sparks.forEach((p, i) => {
            tmp.position.set(p.x, p.y, p.z);
            tmp.rotation.set(p.life * 9, p.life * 7, 0);
            tmp.scale.setScalar(Math.max(0.02, p.life * 0.16));
            tmp.updateMatrix();
            m.sparks.setMatrixAt(i, tmp.matrix);
            m.sparks.setColorAt(i, p.color);
        });
        m.sparks.count = w.sparks.length;
        m.sparks.instanceMatrix.needsUpdate = true;
        if (m.sparks.instanceColor) m.sparks.instanceColor.needsUpdate = true;

        // Power-ups bob and spin; they blink before they vanish.
        m.drops.children.forEach((el, i) => {
            const p = w.drops[i];
            el.visible = Boolean(p) && (p.life > 2 || Math.sin(t * 20) > 0);
            if (!p) return;
            el.position.set(p.x, HUNT.y + 0.7 + Math.sin(t * 3 + i) * 0.15, p.z);
            el.rotation.y = t * 2.5;
            el.children.forEach((c) => (c.visible = c.name === p.kind));
        });

        // The core: crystal spin, shield colour by health, red flash when bitten.
        m.crystal.rotation.y = t * 1.5;
        m.crystal.position.y = 4.3 + Math.sin(t * 2) * 0.15;
        const health = w.core / CORE_HP;
        m.ring.material.color.setRGB(w.coreFlash > 0 ? 1 : 1 - health, w.coreFlash > 0 ? 0.15 : 0.3 + health * 0.6, 0.2);
        m.ring.rotation.z = t;
        m.light.color.set(w.coreFlash > 0 ? "#EF4444" : CYAN);

        // EMP blast ring
        m.emp.visible = w.emp > 0;
        if (w.emp > 0) {
            m.emp.position.set(playerState.x, HUNT.y + 0.4, playerState.z);
            m.emp.scale.setScalar(1 + w.emp * 10);
            m.emp.material.opacity = 1 - w.emp;
        }
    });

    return (
        <group>
            <Platform />
            {portals.map((p, i) => (
                <Portal key={i} p={p} />
            ))}
            <Core ringRef={set("ring")} crystalRef={set("crystal")} lightRef={set("light")} />
            <instancedMesh ref={set("body")} args={[undefined, undefined, MAX_BUGS]} castShadow frustumCulled={false}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial roughness={0.35} emissive="#FFFFFF" emissiveIntensity={0.55} onBeforeCompile={glowByInstance} />
            </instancedMesh>
            <instancedMesh ref={set("head")} args={[undefined, undefined, MAX_BUGS]} frustumCulled={false}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#14111F" roughness={0.4} />
            </instancedMesh>
            <instancedMesh ref={set("eyes")} args={[undefined, undefined, MAX_BUGS * 2]} frustumCulled={false}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color="#F8FAFC" toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={set("legs")} args={[undefined, undefined, MAX_BUGS * LEGS]} frustumCulled={false}>
                <cylinderGeometry args={[1, 1, 1, 5]} />
                <meshStandardMaterial color="#14111F" />
            </instancedMesh>
            <instancedMesh ref={set("shots")} args={[undefined, undefined, MAX_SHOTS]} frustumCulled={false}>
                <capsuleGeometry args={[0.07, 0.55, 4, 8]} />
                <meshBasicMaterial color={CYAN} toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={set("sparks")} args={[undefined, undefined, MAX_SPARKS]} frustumCulled={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial emissive="#FFFFFF" emissiveIntensity={1.2} onBeforeCompile={glowByInstance} />
            </instancedMesh>
            <group ref={set("drops")}>
                {Array.from({ length: 6 }, (_, i) => (
                    <group key={i} visible={false}>
                        <mesh name="rapid">
                            <octahedronGeometry args={[0.35, 0]} />
                            <GlowMat color={POWERS.rapid} strength={3} />
                        </mesh>
                        <mesh name="triple">
                            <tetrahedronGeometry args={[0.4, 0]} />
                            <GlowMat color={POWERS.triple} strength={3} />
                        </mesh>
                        <mesh name="emp">
                            <icosahedronGeometry args={[0.35, 0]} />
                            <GlowMat color={POWERS.emp} strength={3} />
                        </mesh>
                    </group>
                ))}
            </group>
            <mesh ref={set("emp")} rotation-x={-Math.PI / 2} visible={false}>
                <ringGeometry args={[0.9, 1, 48]} />
                <meshBasicMaterial color={PINK} transparent toneMapped={false} />
            </mesh>
        </group>
    );
};
