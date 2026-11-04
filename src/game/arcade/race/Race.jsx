// Sky Circuit race: three laps against three rivals. The player's kart is
// simulated here (the player controller just shows the character in it):
// throttle, steering, nitro, jumps, walls, falls and everything on the road
// that gets in the way.
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { input } from "../../input";
import { Box, Cyl, GlowMat, Shadowed } from "../../parts";
import { playSound } from "../../sound";
import { engineHum, engineLoop, screechLoop } from "../audio";
import { COUNTDOWN, tickCountdown } from "../countdown";
import { Driver, KartModel } from "../Props";
import { arcadeLink, useArcade } from "../state";
import { RaceTrack } from "./RaceTrack";
import {
    GAP_END_S,
    HAMMER_HEIGHT,
    KART_RADIUS,
    LAPS,
    LIP_S,
    ROAD_HALF,
    SAMPLES,
    TRACK_LENGTH,
    boostPads,
    cones,
    cornerSpeed,
    hammerAngle,
    hammerOffset,
    hammers,
    heightAt,
    indexAt,
    lateral,
    nearestIndex,
    nitroCans,
    oilSlicks,
    roadPoint,
    sliderOffset,
    sliders,
    track,
} from "./track";

const KART = { accel: 18, brake: 32, coast: 5, max: 21, nitro: 27, boost: 29, reverse: 5, steer: 2.1, gravity: 18 };
const ORANGE = "#F97316";
const RIVALS = [
    { color: "#22C55E", skill: 0.95, start: -4, lane: 1.8 },
    { color: "#3B82F6", skill: 0.9, start: -8, lane: -1.8 },
    { color: "#EAB308", skill: 0.98, start: -16, lane: 1.8 },
];
const PLAYER_START = { dist: -12, lane: -1.8 };

const damp = (lambda, dt) => 1 - Math.exp(-lambda * dt);

// The chase camera this game hands to the player controller.
const cam = { position: new Vector3(), target: new Vector3(), stiffness: 9, fov: 50 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
};
// Signed distance along the road from b to a, the short way round.
const deltaS = (a, b) => {
    let d = (a - b) % TRACK_LENGTH;
    if (d > TRACK_LENGTH / 2) d -= TRACK_LENGTH;
    if (d < -TRACK_LENGTH / 2) d += TRACK_LENGTH;
    return d;
};

// The circuit's outline for the HUD's map.
const MAP = (() => {
    const pts = track.filter((_, i) => i % 6 === 0);
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    const x = Math.min(...xs) - 6;
    const z = Math.min(...zs) - 6;
    return {
        viewBox: `${x.toFixed(1)} ${z.toFixed(1)} ${(Math.max(...xs) - x + 6).toFixed(1)} ${(Math.max(...zs) - z + 6).toFixed(1)}`,
        d: `M${pts.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join("L")}Z`,
    };
})();

const newPlayer = () => {
    const p = roadPoint(PLAYER_START.dist, PLAYER_START.lane);
    return {
        x: p.x,
        y: p.y,
        z: p.z,
        heading: p.heading,
        speed: 0,
        vy: 0,
        grounded: true,
        idx: indexAt(PLAYER_START.dist),
        dist: PLAYER_START.dist,
        steer: 0,
        nitro: 0.35,
        boost: 0,
        stun: 0,
        spin: 0,
        hitCooldown: 0,
        lastSafe: indexAt(PLAYER_START.dist),
        wheel: 0,
        shake: 0,
        finished: false,
    };
};

const newRival = (r) => ({ ...r, dist: r.start, d: r.lane, speed: 0, wheel: 0, finishedAt: null });

// --- Things on the road ---------------------------------------------------------

const Hammer = ({ hammerRef, h }) => {
    const p = roadPoint(h.s);
    return (
        <group position={[p.x, p.y, p.z]} rotation-y={p.heading}>
            <Shadowed>
                {[-1, 1].map((s) => (
                    <Box
                        key={s}
                        args={[0.4, HAMMER_HEIGHT + 0.6, 0.4]}
                        position={[s * (ROAD_HALF + 0.6), (HAMMER_HEIGHT + 0.6) / 2, 0]}
                        color="#1C1730"
                    />
                ))}
                <Box args={[ROAD_HALF * 2 + 1.6, 0.4, 0.4]} position={[0, HAMMER_HEIGHT + 0.4, 0]} color="#1C1730" />
            </Shadowed>
            <group ref={hammerRef} position-y={HAMMER_HEIGHT}>
                <Cyl args={[0.08, 0.08, HAMMER_HEIGHT - 0.9, 8]} position-y={-(HAMMER_HEIGHT - 0.9) / 2} color="#94A3B8" />
                <group position-y={-(HAMMER_HEIGHT - 0.9)} rotation-x={Math.PI / 2}>
                    <Cyl args={[0.75, 0.75, 1.5, 18]} color="#EF4444" castShadow />
                    {[-0.78, 0.78].map((y) => (
                        <Cyl key={y} args={[0.78, 0.78, 0.12, 18]} position-y={y} color="#FACC15" />
                    ))}
                </group>
            </group>
        </group>
    );
};

const Slider = ({ sliderRef }) => (
    <group ref={sliderRef}>
        <Box args={[2.6, 1.4, 1.2]} position-y={0.7} color="#7C3AED" castShadow />
        <Box args={[2.7, 0.18, 1.3]} position-y={1.45}>
            <GlowMat color="#22D3EE" strength={2} />
        </Box>
    </group>
);

const Cone = ({ coneRef }) => (
    <group ref={coneRef}>
        <mesh position-y={0.36} castShadow>
            <coneGeometry args={[0.24, 0.72, 12]} />
            <meshStandardMaterial color="#F97316" />
        </mesh>
        <Cyl args={[0.18, 0.2, 0.08, 12]} position-y={0.36} color="#F8FAFC" />
        <Box args={[0.5, 0.05, 0.5]} position-y={0.025} color="#F97316" />
    </group>
);

const BoostPad = ({ s, d }) => {
    const p = roadPoint(s, d);
    return (
        <group position={[p.x, p.y + 0.03, p.z]} rotation-y={p.heading}>
            <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[3, 2.6]} />
                <meshBasicMaterial color="#0B0A14" />
            </mesh>
            {[-0.8, 0, 0.8].map((z) => (
                <mesh key={z} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                    <circleGeometry args={[0.7, 3]} />
                    <GlowMat color="#22D3EE" strength={3} />
                </mesh>
            ))}
        </group>
    );
};

const Oil = ({ s, d, r }) => {
    const p = roadPoint(s, d);
    return (
        <mesh position={[p.x, p.y + 0.025, p.z]} rotation-x={-Math.PI / 2} scale={[1, 0.75, 1]}>
            <circleGeometry args={[r, 20]} />
            <meshStandardMaterial color="#0B0A14" roughness={0.05} metalness={0.6} />
        </mesh>
    );
};

const NitroCan = ({ canRef }) => (
    <group ref={canRef}>
        <Cyl args={[0.28, 0.28, 0.75, 14]} position-y={0.4}>
            <meshStandardMaterial color="#2563EB" emissive="#22D3EE" emissiveIntensity={0.8} metalness={0.4} roughness={0.3} />
        </Cyl>
        <Cyl args={[0.12, 0.12, 0.18, 10]} position-y={0.86} color="#E5E7EB" />
    </group>
);

const RivalKart = ({ kartRef, color }) => (
    <group ref={kartRef}>
        <KartModel color={color} />
        <Driver color={color} />
    </group>
);

// The player's kart for one frame.
const drive = (p, dt, g, store, world) => {
    const control = !p.finished && p.stun <= 0;
    let throttle = 0;
    let steer = 0;
    if (control) {
        throttle = clamp((input.forward ? 1 : 0) - (input.back ? 1 : 0) - input.joystick.y, -1, 1);
        steer = clamp((input.left ? 1 : 0) - (input.right ? 1 : 0) - input.joystick.x, -1, 1);
    } else if (p.finished) {
        // Victory lap on autopilot.
        throttle = p.speed < 11 ? 0.6 : 0;
        steer = clamp(angleDiff(p.heading, Math.atan2(track[(p.idx + 20) % SAMPLES].x - p.x, track[(p.idx + 20) % SAMPLES].z - p.z)) * 2, -1, 1);
    }
    p.stun = Math.max(0, p.stun - dt);
    p.hitCooldown = Math.max(0, p.hitCooldown - dt);
    p.boost = Math.max(0, p.boost - dt);
    if (p.stun > 0) p.heading += p.spin * dt;

    const nitroOn = control && (arcadeLink.holding || input.run) && p.nitro > 0 && throttle >= 0;
    let max = KART.max;
    if (p.grounded) {
        if (throttle > 0) p.speed += (p.speed < 0 ? KART.brake : KART.accel) * throttle * dt;
        else if (throttle < 0) p.speed += (p.speed > 0 ? KART.brake : KART.accel * 0.5) * throttle * dt;
        else p.speed -= Math.sign(p.speed) * Math.min(Math.abs(p.speed), KART.coast * dt);
        if (nitroOn) {
            p.nitro = Math.max(0, p.nitro - dt * 0.38);
            max = KART.nitro;
            p.speed += 20 * dt;
        }
        if (p.boost > 0) {
            max = KART.boost;
            p.speed = Math.min(KART.boost, p.speed + 40 * dt);
        }
        if (p.speed > max) p.speed = Math.max(max, p.speed - 14 * dt);
        p.speed = Math.max(-KART.reverse, p.speed);
    }
    p.steer += (steer - p.steer) * damp(10, dt);
    const grip = p.grounded ? 1 : 0.35;
    p.heading += p.steer * KART.steer * grip * clamp(p.speed / 6, -1, 1) * (p.speed > 16 ? 0.85 : 1) * dt;

    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    const prevS = track[p.idx].s;
    p.idx = nearestIndex(p.x, p.z, p.idx);
    p.dist += deltaS(track[p.idx].s, prevS);
    const sample = track[p.idx];
    let d = lateral(p.x, p.z, p.idx);
    const roadY = heightAt(sample.s);

    // Walls: scrape along them, or bounce off if hit square on.
    let scraping = false;
    const limit = ROAD_HALF - KART_RADIUS;
    if (sample.road && Math.abs(d) > limit && p.y < roadY + 1.2) {
        const push = Math.abs(d) - limit;
        p.x -= sample.lx * push * Math.sign(d);
        p.z -= sample.lz * push * Math.sign(d);
        const trackHeading = Math.atan2(sample.tx, sample.tz) + (p.speed < 0 ? Math.PI : 0);
        const into = Math.abs(Math.sin(angleDiff(trackHeading, p.heading))) * Math.abs(p.speed);
        if (into > 7 && p.hitCooldown === 0) {
            playSound("crash");
            p.shake = 0.35;
            p.hitCooldown = 0.5;
            p.speed *= 0.6;
        }
        p.heading += angleDiff(p.heading, trackHeading) * 0.15;
        p.speed *= 1 - 0.8 * dt;
        d = Math.sign(d) * limit;
        scraping = true;
    }

    // Height: follow the road, leave it over a crest or the ramp's lip, land again.
    if (p.grounded) {
        const follow = (roadY - p.y) / dt;
        if (!sample.road || follow < p.vy - KART.gravity * dt * 1.6) {
            p.grounded = false;
            if (p.vy > 1.5) playSound("jump");
        } else {
            p.y = roadY;
            p.vy = clamp(follow, -15, 15);
        }
    }
    if (!p.grounded) {
        p.vy -= KART.gravity * dt;
        p.y += p.vy * dt;
        if (sample.road && p.y <= roadY) {
            if (p.vy < -5) {
                playSound("land");
                p.shake = Math.min(0.5, -p.vy * 0.04);
                p.speed *= 0.93;
            }
            p.y = roadY;
            p.vy = 0;
            p.grounded = true;
        }
        // Fell off the circuit: back to the last safe spot.
        if (p.y < track[p.lastSafe].y - 10) {
            const back = roadPoint(track[p.lastSafe].s);
            playSound("fall");
            store.say("race.fell", null, "#EF4444");
            Object.assign(p, { x: back.x, y: back.y, z: back.z, heading: back.heading, speed: 0, vy: 0, grounded: true, idx: p.lastSafe });
            p.dist += deltaS(track[p.lastSafe].s, sample.s);
        }
    }
    if (p.grounded && sample.road && !(sample.s > LIP_S - 25 && sample.s < GAP_END_S)) p.lastSafe = p.idx;

    // Things on the road (only when down on it).
    if (p.grounded) {
        const s = sample.s;
        boostPads.forEach((b) => {
            if (Math.abs(deltaS(s, b.s)) < 1.3 && Math.abs(d - b.d) < 1.6) {
                if (p.boost < 0.6) playSound("boost");
                p.boost = 1;
            }
        });
        nitroCans.forEach((c, i) => {
            const st = world.cans[i];
            if (st.taken === 0 && Math.abs(deltaS(s, c.s)) < 1.2 && Math.abs(d - c.d) < 1.2) {
                st.taken = 8;
                p.nitro = Math.min(1, p.nitro + 0.45);
                playSound("pickup");
            }
        });
        cones.forEach((c, i) => {
            const st = world.cones[i];
            if (!st.hit && Math.abs(deltaS(s, c.s)) < 0.9 && Math.abs(d - c.d) < 0.9) {
                st.hit = true;
                st.t = 0;
                const side = Math.sign(c.d - d) || 1;
                st.vx = Math.sin(p.heading) * p.speed * 0.6 + sample.lx * side * 3;
                st.vz = Math.cos(p.heading) * p.speed * 0.6 + sample.lz * side * 3;
                st.vy = 6;
                p.speed *= 0.88;
                playSound("cone");
            }
        });
        if (p.hitCooldown === 0) {
            for (const o of oilSlicks) {
                if (Math.abs(deltaS(s, o.s)) < o.r * 0.9 && Math.abs(d - o.d) < o.r * 0.8 && Math.abs(p.speed) > 6) {
                    p.stun = 0.9;
                    p.spin = (Math.random() < 0.5 ? -1 : 1) * 9;
                    p.speed *= 0.6;
                    p.hitCooldown = 1.2;
                    playSound("splash");
                    store.say("race.spin", null, "#94A3B8");
                }
            }
            for (const b of sliders) {
                const off = sliderOffset(b, g.now);
                if (Math.abs(deltaS(s, b.s)) < 0.6 + KART_RADIUS && Math.abs(d - off) < 1.3 + KART_RADIUS) {
                    p.speed = -4;
                    p.stun = 0.5;
                    p.spin = 0;
                    p.hitCooldown = 0.8;
                    p.shake = 0.45;
                    playSound("crash");
                }
            }
            for (const h of hammers) {
                const a = hammerAngle(h, g.now);
                if (Math.abs(a) < 0.65 && Math.abs(deltaS(s, h.s)) < 0.75 + KART_RADIUS && Math.abs(d - hammerOffset(h, g.now)) < 1.6) {
                    const swing = Math.cos(g.now * h.speed + h.phase);
                    p.x += sample.lx * Math.sign(swing) * 1.6;
                    p.z += sample.lz * Math.sign(swing) * 1.6;
                    p.speed = -3;
                    p.stun = 0.8;
                    p.spin = Math.sign(swing) * 5;
                    p.hitCooldown = 1;
                    p.shake = 0.6;
                    playSound("crash");
                    store.say("race.bonk", null, "#EF4444");
                }
            }
        }
    }

    // Bumping into rivals.
    world.rivals.forEach((rv) => {
        const pt = roadPoint(rv.dist, rv.d);
        const dx = p.x - pt.x;
        const dz = p.z - pt.z;
        const dist = Math.hypot(dx, dz);
        if (dist < KART_RADIUS * 2 && Math.abs(p.y - pt.y) < 1) {
            const push = KART_RADIUS * 2 - dist;
            p.x += (dx / (dist || 1)) * push;
            p.z += (dz / (dist || 1)) * push;
            rv.d -= Math.sign(lateral(p.x, p.z, p.idx) - rv.d) * push * 0.5;
            if (p.hitCooldown === 0) {
                p.speed *= 0.92;
                p.hitCooldown = 0.3;
                playSound("bump");
            }
        }
    });

    p.wheel += (p.speed * dt) / 0.2;
    // Engine note rises with speed; tyres squeal in hard corners and on walls.
    const sp = Math.abs(p.speed);
    engineLoop.set(0.05 + Math.min(sp, 25) * 0.0025, 50 + sp * 6.5 + (nitroOn ? 40 : 0), 450 + sp * 70);
    engineHum.set(0.035, 26 + sp * 2.2, 260);
    const squeal = p.grounded && (scraping || (Math.abs(p.steer) > 0.7 && sp > 13) || p.stun > 0) ? 0.06 : 0;
    screechLoop.set(squeal, 2400 + Math.random() * 400);
};

// --- The race -----------------------------------------------------------------

export const Race = () => {
    const active = useArcade((s) => s.active === "race");
    const run = useArcade((s) => s.run);
    const player = useRef(newPlayer());
    const rivals = useRef(RIVALS.map(newRival));
    const game = useRef(null);
    const refs = useRef({ hammers: [], sliders: [], cones: [], cans: [], rivals: [] });
    const coneState = useRef(cones.map(() => ({ hit: false, t: 0, vx: 0, vz: 0, vy: 0 })));
    const canState = useRef(nitroCans.map(() => ({ taken: 0 })));

    useEffect(() => {
        player.current = newPlayer();
        rivals.current = RIVALS.map(newRival);
        coneState.current = cones.map(() => ({ hit: false, t: 0, vx: 0, vz: 0, vy: 0 }));
        canState.current = nitroCans.map(() => ({ taken: 0 }));
        if (!active) {
            game.current = null;
            arcadeLink.race = null;
            arcadeLink.focus = null;
            return;
        }
        const p = player.current;
        arcadeLink.teleport = { x: p.x, z: p.z, rotY: p.heading };
        game.current = { count: COUNTDOWN, time: 0, published: -1, place: 3, lap: 0, done: false };
        playSound("beep");
        useArcade.getState().update({ detail: { lap: 1, laps: LAPS, place: 3, racers: 4 } });
    }, [active, run]);

    useFrame(({ clock }, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const t = clock.elapsedTime;
        const r = refs.current;

        // Moving obstacles animate whether or not anyone is racing.
        hammers.forEach((h, i) => r.hammers[i] && (r.hammers[i].rotation.z = hammerAngle(h, t)));
        sliders.forEach((b, i) => {
            const el = r.sliders[i];
            if (!el) return;
            const p = roadPoint(b.s, sliderOffset(b, t));
            el.position.set(p.x, p.y, p.z);
            el.rotation.y = p.heading;
        });
        cones.forEach((c, i) => {
            const el = r.cones[i];
            const st = coneState.current[i];
            if (!el) return;
            const p = roadPoint(c.s, c.d);
            if (st.hit) {
                // Knocked flying: a simple throw under gravity.
                st.t += dt;
                el.position.set(p.x + st.vx * st.t, p.y + st.vy * st.t - 7 * st.t * st.t, p.z + st.vz * st.t);
                el.rotation.set(st.t * 9, 0, st.t * 6);
                el.visible = st.t < 1.6;
            } else {
                el.position.set(p.x, p.y, p.z);
                el.rotation.set(0, 0, 0);
                el.visible = true;
            }
        });
        nitroCans.forEach((c, i) => {
            const el = r.cans[i];
            const st = canState.current[i];
            if (!el) return;
            st.taken = Math.max(0, st.taken - dt);
            const p = roadPoint(c.s, c.d);
            el.position.set(p.x, p.y + 0.3 + Math.sin(t * 3 + i) * 0.15, p.z);
            el.rotation.y = t * 2;
            el.visible = st.taken === 0;
        });

        const g = game.current;
        const p = player.current;
        const store = useArcade.getState();

        // Rivals sit on the grid until the lights go out.
        const racing = g && store.status !== "countdown";
        rivals.current.forEach((rv, k) => {
            if (racing) {
                const i = indexAt(rv.dist);
                const lead = rv.dist - p.dist;
                // Keep the pack close: rivals ease off when far ahead, push when behind.
                const rubber = clamp(1 - lead / 260, 0.86, 1.14);
                let target = Math.min(KART.max * rv.skill * rubber, cornerSpeed[i]);
                if (boostPads.some((b) => Math.abs(deltaS(rv.dist, b.s)) < 1.5)) rv.speed = Math.max(rv.speed, 24);
                rv.speed += clamp(target - rv.speed, -KART.brake * dt, KART.accel * 0.8 * dt);
                rv.dist += rv.speed * dt;
                // Steer round the cones and oil a little way ahead.
                let lane = rv.lane;
                for (const o of [...cones, ...oilSlicks]) {
                    const ahead = deltaS(o.s, rv.dist);
                    if (ahead > 0 && ahead < 16 && Math.abs(o.d - rv.d) < 1.9) lane = o.d > 0 ? o.d - 2.4 : o.d + 2.4;
                }
                rv.d += clamp(clamp(lane, -ROAD_HALF + 1, ROAD_HALF - 1) - rv.d, -2 * dt, 2 * dt);
                rv.wheel += (rv.speed * dt) / 0.2;
                if (rv.dist >= LAPS * TRACK_LENGTH && rv.finishedAt === null) rv.finishedAt = g.time;
            }
            const el = r.rivals[k];
            if (!el) return;
            const s = rv.dist;
            const pt = roadPoint(s, rv.d);
            let y = pt.y;
            const sMod = ((s % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
            // Rivals always clear the gap, with a hop.
            if (sMod > LIP_S && sMod < GAP_END_S) {
                const f = (sMod - LIP_S) / (GAP_END_S - LIP_S);
                y = heightAt(LIP_S) * (1 - f) + heightAt(GAP_END_S) * f + Math.sin(f * Math.PI) * 2.4;
            }
            el.position.set(pt.x, y, pt.z);
            el.rotation.y = pt.heading;
        });

        if (!g) return;
        // Moving obstacles' collisions use the same clock as their animation.
        g.now = t;

        if (store.status === "countdown") {
            // Rev the engine on the grid.
            const rev = input.forward || input.joystick.y < -0.3 ? 1 : 0;
            engineLoop.set(0.05 + rev * 0.04, 55 + rev * 70, 500 + rev * 900);
            engineHum.set(0.03, 28 + rev * 20, 300);
            tickCountdown(g, dt);
        } else {
            g.time += dt;
            drive(p, dt, g, store, { rivals: rivals.current, cones: coneState.current, cans: canState.current });
        }

        // Lap, place and the HUD.
        const lap = clamp(Math.floor(p.dist / TRACK_LENGTH) + 1, 1, LAPS);
        if (!p.finished && lap !== g.lap) {
            if (g.lap > 0) {
                playSound("lap");
                store.say(lap === LAPS ? "game.finalLap" : "game.lap", { n: lap, total: LAPS }, ORANGE);
            }
            g.lap = lap;
        }
        const ahead = rivals.current.filter((rv) => (rv.finishedAt !== null && !p.finished) || rv.dist > p.dist).length;
        const place = p.finished ? g.place : ahead + 1;
        if (!p.finished && p.dist >= LAPS * TRACK_LENGTH) {
            p.finished = true;
            g.place = place;
            playSound("finish");
            store.finish(Math.round(g.time * 100) / 100, { place });
        }
        const tick = Math.floor(g.time * 10);
        if (tick !== g.published && store.status !== "done") {
            g.published = tick;
            store.update({ time: g.time, detail: { lap, laps: LAPS, place, racers: 4 } });
        }
        arcadeLink.race = {
            map: MAP,
            speed: Math.abs(p.speed),
            nitro: p.nitro,
            dots: [
                ...rivals.current.map((rv) => {
                    const pt = roadPoint(rv.dist, rv.d);
                    return { x: pt.x, z: pt.z, color: rv.color };
                }),
                { x: p.x, z: p.z, color: ORANGE, me: true },
            ],
        };

        // Show the player in the kart, and chase it with the camera.
        const roadPitch = p.grounded ? Math.atan2(heightAt(track[p.idx].s + 1) - heightAt(track[p.idx].s - 1), 2) : clamp(p.vy * 0.04, -0.4, 0.4);
        arcadeLink.lock = { x: p.x, y: p.y, z: p.z, rotY: p.heading, pitch: -roadPitch, roll: -p.steer * clamp(p.speed / 20, 0, 1) * 0.12 };
        arcadeLink.kart = { speed: p.speed, steer: p.steer, wheel: p.wheel };
        arcadeLink.focus = { x: p.x, z: p.z };
        const dx = Math.sin(p.heading);
        const dz = Math.cos(p.heading);
        cam.position.set(p.x - dx * 7, p.y + 2.8, p.z - dz * 7);
        cam.target.set(p.x + dx * 5, p.y + 0.9, p.z + dz * 5);
        if (p.shake > 0) {
            p.shake -= dt;
            cam.position.x += (Math.random() - 0.5) * p.shake;
            cam.position.y += (Math.random() - 0.5) * p.shake;
        }
        cam.fov = 50 + clamp((p.speed - 12) / 13, 0, 1) * 14;
        arcadeLink.camera = cam;
    });

    const r = refs.current;
    return (
        <group>
            <RaceTrack />
            {hammers.map((h, i) => (
                <Hammer key={i} h={h} hammerRef={(el) => (r.hammers[i] = el)} />
            ))}
            {sliders.map((_, i) => (
                <Slider key={i} sliderRef={(el) => (r.sliders[i] = el)} />
            ))}
            {cones.map((_, i) => (
                <Cone key={i} coneRef={(el) => (r.cones[i] = el)} />
            ))}
            {nitroCans.map((_, i) => (
                <NitroCan key={i} canRef={(el) => (r.cans[i] = el)} />
            ))}
            {boostPads.map((b, i) => (
                <BoostPad key={i} {...b} />
            ))}
            {oilSlicks.map((o, i) => (
                <Oil key={i} {...o} />
            ))}
            {RIVALS.map((rv, i) => (
                <RivalKart key={i} color={rv.color} kartRef={(el) => (r.rivals[i] = el)} />
            ))}
        </group>
    );
};
