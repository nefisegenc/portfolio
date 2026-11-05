// Sky Circuit race: three laps against three rivals. The player's kart is
// simulated here (the player controller just shows the character in it):
// throttle, steering, nitro, jumps, walls, falls and everything on the road
// that gets in the way. Obstacles are solid for everyone: karts are pushed
// out of them, knocked about by them, and rivals steer to dodge them.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Color, Object3D, SRGBColorSpace, Vector3 } from "three";
import { input } from "../../input";
import { Box, Cyl, GlowMat, InstanceColors, Shadowed } from "../../parts";
import { playSound } from "../../sound";
import { engineHum, engineLoop, screechLoop } from "../audio";
import { COUNTDOWN, tickCountdown } from "../countdown";
import { Driver, KartModel } from "../Props";
import { arcadeLink, useArcade } from "../state";
import { RaceTrack } from "./RaceTrack";
import {
    GAP_END_S,
    HAMMER_ARM,
    HAMMER_HEAD,
    HAMMER_HEIGHT,
    LAPS,
    LIP_S,
    ROAD_HALF,
    SAMPLES,
    SLIDER,
    TRACK_LENGTH,
    boostPads,
    cones,
    cornerSpeed,
    hammerAngle,
    hammerHead,
    hammers,
    heightAt,
    indexAt,
    lateral,
    nearestIndex,
    nitroCans,
    oilSlicks,
    roadPoint,
    sliderOffset,
    sliderVelocity,
    sliders,
    track,
} from "./track";

const KART = { accel: 18, brake: 32, coast: 5, max: 21, nitro: 27, boost: 29, reverse: 5, steer: 2.1, gravity: 18 };
// A kart for collisions: half its length and width, and the top of the
// driver's helmet.
const BODY = { halfS: 0.75, halfD: 0.5, top: 1.5 };
const ORANGE = "#F97316";
const RIVALS = [
    { color: "#22C55E", skill: 0.95, start: -4, lane: 1.8 },
    { color: "#3B82F6", skill: 0.9, start: -8, lane: -1.8 },
    { color: "#EAB308", skill: 0.98, start: -16, lane: 1.8 },
];
const PLAYER_START = { dist: -12, lane: -1.8 };
const MAX_SPARKS = 180;
const SPARK_COLORS = [new Color("#FDE68A"), new Color("#FB923C"), new Color("#FFFFFF")];

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
const wrap = (s) => ((s % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;

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
        lv: 0,
        vy: 0,
        grounded: true,
        idx: indexAt(PLAYER_START.dist),
        dist: PLAYER_START.dist,
        steer: 0,
        nitro: 0.35,
        boost: 0,
        stun: 0,
        spin: 0,
        touching: new Set(),
        lastSafe: indexAt(PLAYER_START.dist),
        wheel: 0,
        shake: 0,
        jolt: 0,
        finished: false,
    };
};

const newRival = (r) => ({
    ...r,
    dist: r.start,
    d: r.lane,
    speed: 0,
    lv: 0,
    stun: 0,
    spin: 0,
    spinV: 0,
    hop: 0,
    hopV: 0,
    touching: new Set(),
    finishedAt: null,
});

// --- Collisions -------------------------------------------------------------

// What a kart at road position (s, d), `h` above the road, is touching.
const contactsAt = (s, d, h, now) => {
    const out = [];
    sliders.forEach((b, i) => {
        const off = sliderOffset(b, now);
        const ds = deltaS(s, b.s);
        const dd = d - off;
        const ps = SLIDER.halfS + BODY.halfS - Math.abs(ds);
        const pd = SLIDER.halfD + BODY.halfD - Math.abs(dd);
        if (ps <= 0 || pd <= 0 || h > SLIDER.height) return;
        // Out the shallow way: back along the road if hit head on, sideways if clipped.
        if (ps < pd) out.push({ id: `s${i}`, kind: "front", depth: ps, sign: Math.sign(ds) || -1, d: off });
        else out.push({ id: `s${i}`, kind: "side", depth: pd, sign: Math.sign(dd) || 1, push: sliderVelocity(b, now), d: off });
    });
    hammers.forEach((hm, i) => {
        if (Math.abs(deltaS(s, hm.s)) > HAMMER_HEAD.halfS + BODY.halfS) return;
        const head = hammerHead(hm, now);
        // The nearest point of the kart's cross-section to the head's centre.
        const nd = clamp(head.d, d - BODY.halfD, d + BODY.halfD);
        const ny = clamp(head.y, h, h + BODY.top);
        const gap = Math.hypot(head.d - nd, head.y - ny);
        if (gap >= HAMMER_HEAD.radius) return;
        out.push({ id: `h${i}`, kind: "hammer", depth: HAMMER_HEAD.radius - gap, head });
    });
    oilSlicks.forEach((o, i) => {
        if (h < 0.3 && Math.abs(deltaS(s, o.s)) < o.r * 0.9 && Math.abs(d - o.d) < o.r * 0.8) out.push({ id: `o${i}`, kind: "oil" });
    });
    return out;
};

const sparkTmp = new Object3D();
const emitSparks = (sparks, x, y, z, count, power = 5) => {
    for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = power * (0.3 + Math.random() * 0.9);
        sparks.push({
            x,
            y,
            z,
            vx: Math.cos(a) * v,
            vy: 1.5 + Math.random() * power * 0.8,
            vz: Math.sin(a) * v,
            life: 0.3 + Math.random() * 0.45,
            color: SPARK_COLORS[i % SPARK_COLORS.length],
        });
    }
};

const stepSparks = (sparks, dt) => {
    let n = 0;
    for (const sp of sparks) {
        sp.life -= dt;
        if (sp.life <= 0) continue;
        sp.vy -= 14 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.z += sp.vz * dt;
        sparks[n++] = sp;
    }
    sparks.length = n;
};

// Knocks a cone flying when a kart runs into it.
const hitCones = (s, d, speed, heading, sample, coneState) => {
    let hit = false;
    cones.forEach((c, i) => {
        const st = coneState[i];
        if (st.hit || Math.abs(deltaS(s, c.s)) > 0.25 + BODY.halfS || Math.abs(d - c.d) > 0.25 + BODY.halfD) return;
        st.hit = true;
        st.t = 0;
        const side = Math.sign(c.d - d) || 1;
        st.vx = Math.sin(heading) * speed * 0.6 + sample.lx * side * 3;
        st.vz = Math.cos(heading) * speed * 0.6 + sample.lz * side * 3;
        st.vy = 6;
        hit = true;
    });
    return hit;
};

// --- Things on the road ---------------------------------------------------------

const makeHazardTexture = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#FACC15";
    for (let i = -4; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 32, 0);
        ctx.lineTo(i * 32 + 16, 0);
        ctx.lineTo(i * 32 + 16 + 128, 128);
        ctx.lineTo(i * 32 + 128, 128);
        ctx.fill();
    }
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
};

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
                <Cyl args={[0.08, 0.08, HAMMER_ARM, 8]} position-y={-HAMMER_ARM / 2} color="#94A3B8" />
                <group position-y={-HAMMER_ARM} rotation-x={Math.PI / 2}>
                    <Cyl args={[HAMMER_HEAD.radius, HAMMER_HEAD.radius, HAMMER_HEAD.halfS * 2, 20]} castShadow>
                        <meshStandardMaterial color="#DC2626" metalness={0.4} roughness={0.35} />
                    </Cyl>
                    {[-HAMMER_HEAD.halfS, HAMMER_HEAD.halfS].map((y) => (
                        <Cyl key={y} args={[HAMMER_HEAD.radius + 0.04, HAMMER_HEAD.radius + 0.04, 0.12, 20]} position-y={y}>
                            <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.25} />
                        </Cyl>
                    ))}
                </group>
            </group>
        </group>
    );
};

const Slider = ({ sliderRef, hazard }) => (
    <group ref={sliderRef}>
        <mesh position-y={SLIDER.height / 2} castShadow receiveShadow>
            <boxGeometry args={[SLIDER.halfD * 2, SLIDER.height, SLIDER.halfS * 2]} />
            <meshStandardMaterial map={hazard} roughness={0.6} />
        </mesh>
        <Box args={[SLIDER.halfD * 2 + 0.1, 0.16, SLIDER.halfS * 2 + 0.1]} position-y={SLIDER.height + 0.05}>
            <GlowMat color="#22D3EE" strength={1.6} />
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

// --- The player's kart -----------------------------------------------------------

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
    p.boost = Math.max(0, p.boost - dt);
    p.jolt = Math.max(0, p.jolt - dt * 2);
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

    // Move: forward along the heading, plus any sideways shove from a hit.
    const before = track[p.idx];
    p.x += (Math.sin(p.heading) * p.speed + before.lx * p.lv) * dt;
    p.z += (Math.cos(p.heading) * p.speed + before.lz * p.lv) * dt;
    p.lv *= 1 - damp(3.5, dt);
    p.idx = nearestIndex(p.x, p.z, p.idx);
    p.dist += deltaS(track[p.idx].s, before.s);
    const sample = track[p.idx];
    let d = lateral(p.x, p.z, p.idx);
    const roadY = heightAt(sample.s);

    // Walls: scrape along them in a shower of sparks, or bounce off if hit square on.
    let scraping = false;
    const limit = ROAD_HALF - BODY.halfD - 0.15;
    if (sample.road && Math.abs(d) > limit && p.y < roadY + 1.2) {
        const side = Math.sign(d);
        const push = Math.abs(d) - limit;
        p.x -= sample.lx * push * side;
        p.z -= sample.lz * push * side;
        if (p.lv * side > 0) p.lv = -p.lv * 0.3;
        const trackHeading = Math.atan2(sample.tx, sample.tz) + (p.speed < 0 ? Math.PI : 0);
        const into = Math.abs(Math.sin(angleDiff(trackHeading, p.heading))) * Math.abs(p.speed);
        if (into > 7 && !p.touching.has("wall")) {
            playSound("crash");
            p.shake = 0.35;
            p.jolt = 0.4;
            p.speed *= 0.6;
            emitSparks(world.sparks, p.x + sample.lx * side * 0.6, p.y + 0.4, p.z + sample.lz * side * 0.6, 14);
        }
        p.heading += angleDiff(p.heading, trackHeading) * 0.15;
        p.speed *= 1 - 0.8 * dt;
        if (Math.abs(p.speed) > 7 && Math.random() < 0.6)
            emitSparks(world.sparks, p.x + sample.lx * side * 0.6, p.y + 0.3, p.z + sample.lz * side * 0.6, 1, 3);
        d = side * limit;
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
                p.jolt = Math.min(0.6, -p.vy * 0.04);
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
            Object.assign(p, { x: back.x, y: back.y, z: back.z, heading: back.heading, speed: 0, lv: 0, vy: 0, grounded: true, idx: p.lastSafe });
            p.dist += deltaS(track[p.lastSafe].s, sample.s);
        }
    }
    if (p.grounded && sample.road && !(sample.s > LIP_S - 25 && sample.s < GAP_END_S)) p.lastSafe = p.idx;

    // Pick-ups only count down on the road.
    const s = sample.s;
    if (p.grounded) {
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
        if (hitCones(s, d, p.speed, p.heading, sample, world.cones)) {
            p.speed *= 0.88;
            playSound("cone");
        }
    }

    // Obstacles are solid at their real size and height, airborne or not.
    const touching = new Set(scraping ? ["wall"] : []);
    for (const c of contactsAt(s, d, p.y - roadY, g.now)) {
        const fresh = !p.touching.has(c.id);
        touching.add(c.id);
        if (c.kind === "front") {
            // Stopped by the block: back out of it, bouncing off if it was a real hit.
            p.x += sample.tx * c.depth * c.sign;
            p.z += sample.tz * c.depth * c.sign;
            const into = -c.sign * p.speed;
            if (into > 0) {
                if (fresh && into > 5) {
                    p.stun = 0.45;
                    p.spin = (Math.random() - 0.5) * 4;
                    p.shake = 0.55;
                    p.jolt = 0.6;
                    playSound("crash");
                    const at = roadPoint(s + c.sign * -0.8, d);
                    emitSparks(world.sparks, at.x, at.y + 0.6, at.z, 22, 6);
                }
                p.speed = -into * 0.3;
            }
        } else if (c.kind === "side") {
            // Clipped its side, or it slid into us: pushed out, and along with it.
            p.x += sample.lx * c.depth * c.sign;
            p.z += sample.lz * c.depth * c.sign;
            if (Math.sign(c.push) === c.sign) p.lv = c.push;
            if (fresh) {
                p.speed *= 0.85;
                p.jolt = 0.35;
                playSound("bump");
                const at = roadPoint(s, d - c.sign * BODY.halfD);
                emitSparks(world.sparks, at.x, at.y + 0.5, at.z, 10, 4);
            }
        } else if (c.kind === "hammer") {
            // Out of the head's way, and, if it was swinging into us, sent flying.
            const away = Math.sign(d - c.head.d) || c.head.dir;
            p.x += sample.lx * (c.depth + 0.05) * away;
            p.z += sample.lz * (c.depth + 0.05) * away;
            if (fresh) {
                const swatted = away === c.head.dir;
                p.lv = away * (swatted ? 11 : 5);
                p.speed *= swatted ? 0.3 : 0.6;
                if (swatted) {
                    p.vy = 5.5;
                    p.grounded = false;
                    store.say("race.bonk", null, "#EF4444");
                }
                p.stun = swatted ? 0.75 : 0.35;
                p.spin = away * (swatted ? 7 : 3);
                p.shake = swatted ? 0.8 : 0.4;
                p.jolt = 0.8;
                playSound("crash");
                const at = roadPoint(s, c.head.d);
                emitSparks(world.sparks, at.x, at.y + c.head.y, at.z, swatted ? 30 : 14, 7);
            }
        } else if (c.kind === "oil" && fresh && Math.abs(p.speed) > 6) {
            p.stun = 0.9;
            p.spin = (Math.random() < 0.5 ? -1 : 1) * 9;
            p.speed *= 0.6;
            playSound("splash");
            store.say("race.spin", null, "#94A3B8");
        }
    }

    // Bumping into rivals.
    world.rivals.forEach((rv, k) => {
        const pt = roadPoint(rv.dist, rv.d);
        const dx = p.x - pt.x;
        const dz = p.z - pt.z;
        const dist = Math.hypot(dx, dz);
        if (dist < BODY.halfS * 2 && Math.abs(p.y - pt.y - rv.hop) < 1) {
            const push = BODY.halfS * 2 - dist;
            p.x += (dx / (dist || 1)) * push * 0.6;
            p.z += (dz / (dist || 1)) * push * 0.6;
            rv.d -= Math.sign(lateral(p.x, p.z, p.idx) - rv.d) * push * 0.4;
            if (!p.touching.has(`r${k}`)) {
                p.speed *= 0.92;
                p.jolt = 0.3;
                playSound("bump");
            }
            touching.add(`r${k}`);
        }
    });
    p.touching = touching;

    p.wheel += (p.speed * dt) / 0.2;
    // Engine note rises with speed; tyres squeal in hard corners and on walls.
    const sp = Math.abs(p.speed);
    engineLoop.set(0.05 + Math.min(sp, 25) * 0.0025, 50 + sp * 6.5 + (nitroOn ? 40 : 0), 450 + sp * 70);
    engineHum.set(0.035, 26 + sp * 2.2, 260);
    const squeal = p.grounded && (scraping || (Math.abs(p.steer) > 0.7 && sp > 13) || p.stun > 0) ? 0.06 : 0;
    screechLoop.set(squeal, 2400 + Math.random() * 400);
};

// --- Rivals ------------------------------------------------------------------

// Picks a lane clear of whatever will be in the way by the time the rival gets there.
const chooseLane = (rv, now) => {
    let lane = rv.lane;
    for (const o of [...cones, ...oilSlicks]) {
        const ahead = deltaS(o.s, rv.dist);
        if (ahead > 0 && ahead < 16 && Math.abs(o.d - lane) < 1.9) lane = o.d > 0 ? o.d - 2.4 : o.d + 2.4;
    }
    for (const b of sliders) {
        const ahead = deltaS(b.s, rv.dist);
        if (ahead <= 0 || ahead > 22) continue;
        const off = sliderOffset(b, now + ahead / Math.max(rv.speed, 4));
        if (Math.abs(off - lane) < SLIDER.halfD + 1.3) lane = off > 0 ? off - SLIDER.halfD - 1.4 : off + SLIDER.halfD + 1.4;
    }
    for (const h of hammers) {
        const ahead = deltaS(h.s, rv.dist);
        if (ahead <= 0 || ahead > 24) continue;
        const head = hammerHead(h, now + ahead / Math.max(rv.speed, 4));
        // Low and sweeping when we arrive: get to the side it's leaving.
        if (head.y < BODY.top + HAMMER_HEAD.radius) lane = -head.dir * (ROAD_HALF - 1.1);
    }
    return clamp(lane, -ROAD_HALF + 1, ROAD_HALF - 1);
};

const driveRival = (rv, p, g, dt, world, near) => {
    const i = indexAt(rv.dist);
    rv.stun = Math.max(0, rv.stun - dt);
    const lead = rv.dist - p.dist;
    // Keep the pack close: rivals ease off when far ahead, push when behind.
    const rubber = clamp(1 - lead / 260, 0.86, 1.14);
    const target = rv.stun > 0 ? 0 : Math.min(KART.max * rv.skill * rubber, cornerSpeed[i]);
    if (rv.stun === 0 && boostPads.some((b) => Math.abs(deltaS(rv.dist, b.s)) < 1.5)) rv.speed = Math.max(rv.speed, 24);
    rv.speed += clamp(target - rv.speed, -KART.brake * dt, KART.accel * 0.8 * dt);
    rv.dist += rv.speed * dt;
    rv.d += clamp(chooseLane(rv, g.now) - rv.d, -3 * dt, 3 * dt) + rv.lv * dt;
    rv.lv *= 1 - damp(3.5, dt);
    rv.d = clamp(rv.d, -ROAD_HALF + BODY.halfD + 0.15, ROAD_HALF - BODY.halfD - 0.15);
    rv.hopV -= KART.gravity * dt;
    rv.hop = Math.max(0, rv.hop + rv.hopV * dt);
    if (rv.hop === 0) rv.hopV = 0;
    rv.spin += rv.spinV * dt;
    rv.spinV *= 1 - damp(2.5, dt);
    if (rv.stun === 0) rv.spin += angleDiff(rv.spin, 0) * damp(4, dt);

    // The same obstacles hit rivals that miss their dodge.
    const s = wrap(rv.dist);
    const sample = track[i];
    if (hitCones(s, rv.d, rv.speed, Math.atan2(sample.tx, sample.tz), sample, world.cones)) {
        rv.speed *= 0.9;
        if (near) playSound("cone");
    }
    const touching = new Set();
    for (const c of contactsAt(s, rv.d, rv.hop, g.now)) {
        const fresh = !rv.touching.has(c.id);
        touching.add(c.id);
        const at = roadPoint(s, rv.d);
        if (c.kind === "front") {
            rv.dist += c.depth * c.sign;
            if (fresh && rv.speed > 5) {
                rv.stun = 0.6;
                rv.spinV = (Math.random() - 0.5) * 6;
                emitSparks(world.sparks, at.x, at.y + 0.6, at.z, 16, 5);
                if (near) playSound("crash");
            }
            rv.speed = Math.min(rv.speed, 0) - 1;
        } else if (c.kind === "side") {
            rv.d += c.depth * c.sign;
            if (Math.sign(c.push) === c.sign) rv.lv = c.push;
        } else if (c.kind === "hammer") {
            const away = Math.sign(rv.d - c.head.d) || c.head.dir;
            rv.d += (c.depth + 0.05) * away;
            if (fresh) {
                rv.lv = away * 10;
                rv.speed *= 0.3;
                rv.hopV = 5.5;
                rv.stun = 0.9;
                rv.spinV = away * 9;
                emitSparks(world.sparks, at.x, at.y + c.head.y, at.z, 24, 7);
                if (near) playSound("crash");
            }
        } else if (c.kind === "oil" && fresh && rv.speed > 6) {
            rv.stun = 0.8;
            rv.spinV = (Math.random() < 0.5 ? -1 : 1) * 10;
            rv.speed *= 0.6;
        }
    }
    rv.touching = touching;
    if (rv.dist >= LAPS * TRACK_LENGTH && rv.finishedAt === null) rv.finishedAt = g.time;
};

// --- The race -----------------------------------------------------------------

export const Race = () => {
    const active = useArcade((s) => s.active === "race");
    const run = useArcade((s) => s.run);
    const hazard = useMemo(() => makeHazardTexture(), []);
    const player = useRef(newPlayer());
    const rivals = useRef(RIVALS.map(newRival));
    const sparks = useRef([]);
    const game = useRef(null);
    const refs = useRef({ hammers: [], sliders: [], cones: [], cans: [], rivals: [] });
    const coneState = useRef(cones.map(() => ({ hit: false, t: 0, vx: 0, vz: 0, vy: 0 })));
    const canState = useRef(nitroCans.map(() => ({ taken: 0 })));

    useEffect(() => {
        player.current = newPlayer();
        rivals.current = RIVALS.map(newRival);
        sparks.current = [];
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
        game.current = { count: COUNTDOWN, time: 0, published: -1, place: 3, lap: 0, done: false, now: 0 };
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
        const world = { rivals: rivals.current, cones: coneState.current, cans: canState.current, sparks: sparks.current };
        if (g) g.now = t;

        // Rivals sit on the grid until the lights go out.
        const racing = g && store.status !== "countdown";
        rivals.current.forEach((rv, k) => {
            if (racing) driveRival(rv, p, g, dt, world, Math.abs(rv.dist - p.dist) < 30);
            const el = r.rivals[k];
            if (!el) return;
            const pt = roadPoint(rv.dist, rv.d);
            let y = pt.y;
            const sMod = wrap(rv.dist);
            // Rivals always clear the gap, with a hop.
            if (sMod > LIP_S && sMod < GAP_END_S) {
                const f = (sMod - LIP_S) / (GAP_END_S - LIP_S);
                y = heightAt(LIP_S) * (1 - f) + heightAt(GAP_END_S) * f + Math.sin(f * Math.PI) * 2.4;
            }
            el.position.set(pt.x, y + rv.hop, pt.z);
            el.rotation.y = pt.heading + rv.spin;
        });

        // Sparks fly and fade (compacted in place: this frame's hits add to the same list).
        stepSparks(sparks.current, dt);
        sparks.current.forEach((sp, i) => {
            sparkTmp.position.set(sp.x, sp.y, sp.z);
            sparkTmp.scale.setScalar(Math.max(0.02, sp.life * 0.14));
            sparkTmp.updateMatrix();
            r.sparks.setMatrixAt(i, sparkTmp.matrix);
            r.sparks.setColorAt(i, sp.color);
        });
        r.sparks.count = sparks.current.length;
        r.sparks.instanceMatrix.needsUpdate = true;
        if (r.sparks.instanceColor) r.sparks.instanceColor.needsUpdate = true;

        if (!g) return;

        if (store.status === "countdown") {
            // Rev the engine on the grid.
            const rev = input.forward || input.joystick.y < -0.3 ? 1 : 0;
            engineLoop.set(0.05 + rev * 0.04, 55 + rev * 70, 500 + rev * 900);
            engineHum.set(0.03, 28 + rev * 20, 300);
            tickCountdown(g, dt);
        } else {
            g.time += dt;
            drive(p, dt, g, store, world);
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

        // Show the player in the kart, and chase it with the camera. Hits
        // jolt the kart; sideways shoves lean it over.
        const roadPitch = p.grounded ? Math.atan2(heightAt(track[p.idx].s + 1) - heightAt(track[p.idx].s - 1), 2) : clamp(p.vy * 0.04, -0.4, 0.4);
        const jolt = Math.sin(t * 40) * p.jolt * 0.12;
        arcadeLink.lock = {
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.heading,
            pitch: -roadPitch + jolt,
            roll: -p.steer * clamp(p.speed / 20, 0, 1) * 0.12 - clamp(p.lv * 0.03, -0.3, 0.3) + jolt,
        };
        arcadeLink.kart = { speed: p.speed, steer: p.steer, wheel: p.wheel };
        arcadeLink.focus = { x: p.x, z: p.z };
        const dx = Math.sin(p.heading);
        const dz = Math.cos(p.heading);
        // Narrow screens see less of the road sideways, so sit further back and higher.
        const far = Math.max(1, Math.min(1.35, (0.75 * window.innerHeight) / window.innerWidth));
        cam.position.set(p.x - dx * 7 * far, p.y + 2.8 * far, p.z - dz * 7 * far);
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
                <Slider key={i} hazard={hazard} sliderRef={(el) => (r.sliders[i] = el)} />
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
            <instancedMesh
                ref={(el) => {
                    r.sparks = el;
                    if (el) el.count = 0;
                }}
                args={[undefined, undefined, MAX_SPARKS]}
                frustumCulled={false}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial toneMapped={false} />
                <InstanceColors count={MAX_SPARKS} />
            </instancedMesh>
        </group>
    );
};
