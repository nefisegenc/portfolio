// Bowling: five frames with proper ten-pin scoring. Slide into position,
// throw when the swinging arrow points where you want, hold to build power
// and steer some hook onto the ball as it rolls. The lane is simulated in 2D
// (u across the lane, v down it towards the pins); pins topple, slide and
// pop into the air when they are hit hard.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CanvasTexture, LatheGeometry, SRGBColorSpace, Vector2, Vector3 } from "three";
import { LANE, toWorld, worldYaw } from "../../data/arcade";
import { seeded } from "../../data/world";
import { useT } from "../../i18n";
import { input } from "../input";
import { Box, FONT, GlowMat, Shadowed } from "../parts";
import { playSound } from "../sound";
import { rollLoop } from "./audio";
import { BOWLING_FRAMES, frameDone, frameTotals } from "./bowlingScore";
import { arcadeLink, useArcade } from "./state";

const BALL_R = 0.14;
const PIN_R = 0.06;
const FALLEN_R = 0.1;
const BALL_MASS = 7;
const PIN_MASS = 1.5;
const MIN_SPEED = 5;
const MAX_SPEED = 12;
const HOOK = 2.6;
const AIM_RANGE = LANE.halfWidth - 0.2;
const AIM_SWING = 0.12;

// The arrow sweeps side to side at a steady pace (no slowing down through
// the middle), with each frame's sweep quicker than the last.
const aimAngle = (t, frame) => {
    const period = 0.62 - frame * 0.06;
    const x = (t / period + 0.25) % 1;
    return AIM_SWING * (x < 0.5 ? 4 * x - 1 : 3 - 4 * x);
};
const SIDE_WALL = LANE.halfWidth + LANE.gutter;
const POWER_PERIOD = 1.1;
const PURPLE = "#8B5CF6";
const CYAN = "#22D3EE";

// Lane space to arcade space.
const toWorldLane = (u, v) => toWorld(LANE.x + u, LANE.foulZ - v);

const SPOTS = (() => {
    const spots = [];
    for (let row = 0; row < 4; row++) {
        for (let i = 0; i <= row; i++) spots.push({ u: (i - row / 2) * 0.3, v: LANE.headPin + row * 0.26 });
    }
    return spots;
})();

const freshPin = (spot) => ({
    ...spot,
    home: spot,
    vu: 0,
    vv: 0,
    y: 0,
    vy: 0,
    flip: 0,
    fallen: false,
    gone: false,
    tilt: 0,
    dir: 0,
    counted: false,
    drop: 0,
});

const collide = (a, b, ra, rb, ma, mb, e) => {
    const du = b.u - a.u;
    const dv = b.v - a.v;
    const d = Math.hypot(du, dv);
    const min = ra + rb;
    if (d >= min || d === 0) return 0;
    const nu = du / d;
    const nv = dv / d;
    // Push apart in proportion to mass.
    const overlap = min - d;
    const total = ma + mb;
    a.u -= nu * overlap * (mb / total);
    a.v -= nv * overlap * (mb / total);
    b.u += nu * overlap * (ma / total);
    b.v += nv * overlap * (ma / total);
    const rel = (a.vu - b.vu) * nu + (a.vv - b.vv) * nv;
    if (rel <= 0) return 0;
    const j = ((1 + e) * rel) / (1 / ma + 1 / mb);
    a.vu -= (j / ma) * nu;
    a.vv -= (j / ma) * nv;
    b.vu += (j / mb) * nu;
    b.vv += (j / mb) * nv;
    return rel;
};

const damp = (lambda, dt) => 1 - Math.exp(-lambda * dt);

// The camera spot this game hands to the player controller.
const cam = { position: new Vector3(), target: new Vector3() };

// A hard hit sends a pin flying and spinning.
const pop = (p, rel) => {
    if (rel > 2.5 && p.y === 0) {
        p.vy = Math.min(3.2, rel * 0.32);
        p.flip = (Math.random() - 0.5) * 18;
    }
};

// One physics sub-step of the ball and pins. Reports the first pin hit, how
// hard, and a ball dropping into the gutter, for the caller's sound and text.
const stepLane = (g, b, pins, h) => {
    const events = { hit: 0, gutter: false };
    if (b.state === "rolling") {
        b.u += b.vu * h;
        b.v += b.vv * h;
        b.spin += (Math.hypot(b.vu, b.vv) * h) / BALL_R;
        if (!g.gutter && b.v < LANE.pit && Math.abs(b.u) > LANE.halfWidth) {
            g.gutter = true;
            events.gutter = true;
            b.u = Math.sign(b.u) * (LANE.halfWidth + LANE.gutter / 2);
            b.vu = 0;
        }
        if (b.v > LANE.pit + 0.3) {
            b.state = "gone";
            g.goneAt = g.timer;
        }
    }
    for (const p of pins) {
        if (p.gone) continue;
        p.u += p.vu * h;
        p.v += p.vv * h;
        const k = 1 - damp(p.y > 0 ? 0.6 : p.fallen ? 3 : 6, h);
        p.vu *= k;
        p.vv *= k;
        if (p.y > 0 || p.vy > 0) {
            p.vy -= 16 * h;
            p.y = Math.max(0, p.y + p.vy * h);
            if (p.y === 0) p.vy = 0;
        }
        if (Math.abs(p.u) > SIDE_WALL) {
            p.u = Math.sign(p.u) * SIDE_WALL;
            p.vu *= -0.5;
        }
        if (p.v > LANE.length - 0.1) {
            p.v = LANE.length - 0.1;
            p.vv *= -0.3;
        }
        if (p.v > LANE.pit + 0.05 && p.y < 0.2) {
            p.gone = true;
            p.fallen = true;
        }
    }
    if (b.state === "rolling") {
        for (const p of pins) {
            if (p.gone) continue;
            const rel = collide(b, p, BALL_R, p.fallen ? FALLEN_R : PIN_R, BALL_MASS, PIN_MASS, 0.6);
            if (rel > 0) {
                pop(p, rel);
                if (!g.hit) {
                    g.hit = true;
                    events.hit = rel;
                }
            }
        }
    }
    for (let a = 0; a < pins.length; a++) {
        if (pins[a].gone) continue;
        for (let c = a + 1; c < pins.length; c++) {
            if (pins[c].gone) continue;
            const rel = collide(pins[a], pins[c], pins[a].fallen ? FALLEN_R : PIN_R, pins[c].fallen ? FALLEN_R : PIN_R, PIN_MASS, PIN_MASS, 0.5);
            if (rel > 0) {
                pop(pins[a], rel * 0.6);
                pop(pins[c], rel * 0.6);
            }
        }
    }
    for (const p of pins) {
        const moved = Math.hypot(p.u - p.home.u, p.v - p.home.v);
        if (!p.fallen && (Math.hypot(p.vu, p.vv) > 0.35 || moved > 0.14 || p.y > 0.05)) {
            p.fallen = true;
            p.dir = Math.atan2(p.vu || 0.001, -(p.vv || 0.001));
        }
    }
    return events;
};

// --- Looks ---------------------------------------------------------------------

const canvas = (w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
};

// Maple boards, with the aiming arrows and dots in neon for the black light.
const makeLaneTextures = () => {
    const rand = seeded(5);
    const W = 128;
    const H = 1024;
    const toY = (v) => H - (v / LANE.pit) * H;
    const marks = (ctx, color) => {
        ctx.fillStyle = color;
        for (let i = 0; i < 7; i++) {
            const x = ((i + 0.5) / 7) * W;
            const v = 3.2 + Math.abs(i - 3) * 0.25;
            ctx.beginPath();
            ctx.moveTo(x, toY(v + 0.32));
            ctx.lineTo(x - 5, toY(v));
            ctx.lineTo(x + 5, toY(v));
            ctx.fill();
        }
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(((i + 1) / 6) * W, toY(1.4), 3, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    const map = canvas(W, H, (ctx) => {
        for (let i = 0; i < 39; i++) {
            const shade = 200 + ((i * 37) % 23);
            ctx.fillStyle = `rgb(${shade}, ${shade * 0.72}, ${shade * 0.45})`;
            ctx.fillRect((i / 39) * W, 0, W / 39 + 1, H);
        }
        ctx.fillStyle = "rgba(60, 30, 10, 0.15)";
        for (let i = 0; i < 300; i++) ctx.fillRect(rand() * W, rand() * H, 1, 8 + rand() * 30);
        ctx.fillStyle = "#3B2A20";
        ctx.fillRect(0, toY(0) - 3, W, 3);
        marks(ctx, "#7A4A2A");
    });
    const glow = canvas(W, H, (ctx) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        marks(ctx, "#FFFFFF");
    });
    return { map, glow };
};

// Swirled urethane, like a real ball.
const makeBallTexture = () => {
    const rand = seeded(9);
    return canvas(256, 128, (ctx, w, h) => {
        ctx.fillStyle = "#4C1D95";
        ctx.fillRect(0, 0, w, h);
        const colors = ["#7C3AED", "#DB2777", "#22D3EE", "#A78BFA"];
        for (let i = 0; i < 40; i++) {
            ctx.strokeStyle = colors[i % colors.length];
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 3 + rand() * 8;
            ctx.beginPath();
            const x = rand() * w;
            const y = rand() * h;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + 40, y - 30, x + 60, y + 40, x + 110, y + rand() * 30 - 15);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#111";
        [
            [0.5, 0.42],
            [0.47, 0.3],
            [0.53, 0.3],
        ].forEach(([u, v]) => {
            ctx.beginPath();
            ctx.arc(u * w, v * h, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    });
};

const usePinGeometry = () =>
    useMemo(() => {
        const profile = [
            [0, 0],
            [0.035, 0],
            [0.05, 0.04],
            [0.06, 0.11],
            [0.055, 0.17],
            [0.032, 0.24],
            [0.026, 0.27],
            [0.036, 0.32],
            [0.033, 0.36],
            [0.016, 0.39],
            [0, 0.4],
        ].map(([r, y]) => new Vector2(r, y));
        return new LatheGeometry(profile, 16);
    }, []);

const Pin = ({ pinRef, geometry }) => (
    <group ref={pinRef}>
        <group>
            <mesh geometry={geometry} castShadow>
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} emissive="#C4B5FD" emissiveIntensity={0.06} />
            </mesh>
            {[0.255, 0.285].map((y) => (
                <mesh key={y} position-y={y}>
                    <cylinderGeometry args={[0.031, 0.031, 0.014, 16, 1, true]} />
                    <meshStandardMaterial color="#E11D48" emissive="#E11D48" emissiveIntensity={0.4} />
                </mesh>
            ))}
        </group>
    </group>
);

// The big screen above the pins: frame and running score.
const ScoreScreen = () => {
    const t = useT();
    const score = useArcade((s) => (s.active === "bowling" ? s.score : null));
    const frame = useArcade((s) => (s.active === "bowling" ? s.detail?.frame : null));
    return (
        <group position={[0, 2.35, -LANE.length + 0.25]}>
            <Box args={[SIDE_WALL * 2 + 0.5, 0.95, 0.12]} color="#0B0A14" />
            <Box args={[SIDE_WALL * 2 + 0.6, 0.05, 0.14]} position-y={0.5}>
                <GlowMat color={PURPLE} strength={1.6} />
            </Box>
            <Text font={FONT} fontSize={0.3} position={[0, 0.16, 0.07]} anchorY="middle">
                {score === null ? t("game.bowling").toUpperCase() : `${score}`}
                <GlowMat color={CYAN} strength={1.8} />
            </Text>
            <Text font={FONT} fontSize={0.13} position={[0, -0.22, 0.07]} anchorY="middle">
                {frame ? t("game.frame", { n: frame, total: BOWLING_FRAMES }).toUpperCase() : "★ STRIKE ZONE ★"}
                <GlowMat color="#F472B6" strength={1.5} />
            </Text>
        </group>
    );
};

const LaneModel = () => {
    const t = useT();
    const { map, glow } = useMemo(() => makeLaneTextures(), []);
    const length = LANE.length;
    const mid = -length / 2;
    return (
        <group>
            <mesh position={[0, 0.03, -LANE.pit / 2]} receiveShadow>
                <boxGeometry args={[LANE.halfWidth * 2, 0.06, LANE.pit]} />
                <meshStandardMaterial attach="material-0" color="#B98454" />
                <meshStandardMaterial attach="material-1" color="#B98454" />
                <meshStandardMaterial
                    attach="material-2"
                    map={map}
                    roughness={0.18}
                    metalness={0.05}
                    emissive={CYAN}
                    emissiveMap={glow}
                    emissiveIntensity={1.2}
                />
                <meshStandardMaterial attach="material-3" color="#B98454" />
                <meshStandardMaterial attach="material-4" color="#B98454" />
                <meshStandardMaterial attach="material-5" color="#B98454" />
            </mesh>
            {/* Approach */}
            <Box args={[SIDE_WALL * 2 + 0.4, 0.04, 2.6]} position={[0, 0.02, 1.3]} color="#2A2340" receiveShadow />
            <Shadowed cast={false}>
                {[-1, 1].map((s) => (
                    <group key={s}>
                        <mesh position={[s * (LANE.halfWidth + LANE.gutter / 2), 0.012, -LANE.pit / 2]} rotation-z={s * 0.3}>
                            <boxGeometry args={[LANE.gutter, 0.02, LANE.pit]} />
                            <meshStandardMaterial color="#1C1730" metalness={0.6} roughness={0.3} />
                        </mesh>
                        <Box args={[0.2, 0.32, length]} position={[s * (SIDE_WALL + 0.1), 0.16, mid]} color="#1C1730" />
                        <Box args={[0.22, 0.05, length]} position={[s * (SIDE_WALL + 0.1), 0.34, mid]}>
                            <GlowMat color={s < 0 ? PURPLE : CYAN} strength={1.3} />
                        </Box>
                        {/* Arches of neon over the lane */}
                        {[1.5, 4.5, 7.5].map((v) => (
                            <Box key={v} args={[0.12, 2.3, 0.12]} position={[s * (SIDE_WALL + 0.35), 1.15, -v]} color="#1C1730" />
                        ))}
                    </group>
                ))}
                <Box args={[SIDE_WALL * 2, 0.02, length - LANE.pit]} position={[0, 0.01, -(LANE.pit + length) / 2]} color="#0B0A14" />
            </Shadowed>
            {[1.5, 4.5, 7.5].map((v, i) => (
                <Box key={v} args={[SIDE_WALL * 2 + 0.82, 0.08, 0.12]} position={[0, 2.3, -v]}>
                    <GlowMat color={i % 2 ? CYAN : "#F472B6"} strength={1.4} />
                </Box>
            ))}
            {/* Pin deck back wall and masking unit */}
            <Shadowed>
                <Box args={[SIDE_WALL * 2 + 0.6, 1.5, 0.3]} position={[0, 0.75, -length - 0.15]} color="#0B0A14" />
                <Box args={[SIDE_WALL * 2 + 0.6, 0.5, 0.5]} position={[0, 1.55, -length + 0.3]} color="#1C1730" />
            </Shadowed>
            <Text font={FONT} fontSize={0.26} position={[0, 1.55, -length + 0.56]} anchorY="middle">
                {t("game.bowling").toUpperCase()}
                <GlowMat color={PURPLE} strength={1.6} />
            </Text>
            <ScoreScreen />
        </group>
    );
};

// Aiming arrow drawn on the lane in front of the bowler.
const AimArrow = ({ arrowRef }) => (
    <group ref={arrowRef} position-y={0.08}>
        <mesh rotation-x={-Math.PI / 2} position-z={-0.75}>
            <planeGeometry args={[0.06, 1.5]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.9} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position-z={-1.6}>
            <circleGeometry args={[0.16, 3, Math.PI / 2]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.9} toneMapped={false} />
        </mesh>
    </group>
);

export const Bowling = () => {
    const geometry = usePinGeometry();
    const ballTexture = useMemo(() => makeBallTexture(), []);
    const pinRefs = useRef([]);
    const ballRef = useRef();
    const arrowRef = useRef();
    const sweepRef = useRef();
    const deckLight = useRef();
    const pins = useRef(SPOTS.map(freshPin));
    const ball = useRef({ u: 0, v: -0.35, vu: 0, vv: 0, spin: 0, state: "rack" });
    const game = useRef(null);
    const active = useArcade((s) => s.active === "bowling");
    const run = useArcade((s) => s.run);

    useEffect(() => {
        pins.current = SPOTS.map(freshPin);
        ball.current.state = "rack";
        arcadeLink.meter = null;
        if (!active) {
            game.current = null;
            rollLoop.set(0);
            return;
        }
        game.current = {
            frame: 1,
            roll: 1,
            phase: "aim",
            timer: 0,
            aimU: 0,
            aimT: 0,
            angle: 0,
            power: 0,
            frames: [[]],
            hit: false,
            gutter: false,
            slow: 0,
            shake: 0,
        };
        arcadeLink.action = false;
        ball.current.state = "held";
        useArcade.getState().update({ status: "playing", score: 0, detail: { frame: 1, roll: 1, frames: [[]], phase: "aim" } });
    }, [active, run]);

    const setCamera = (u, v, y, tu, tv, ty) => {
        const [px, pz] = toWorldLane(u, v);
        const [tx, tz] = toWorldLane(tu, tv);
        cam.position.set(px, y, pz);
        cam.target.set(tx, ty, tz);
        arcadeLink.camera = cam;
    };

    // Over the left shoulder, so the bowler doesn't hide the pins; phones
    // (upright, or too short for much of the lane) look from higher up instead.
    const aimCamera = (g) => {
        const phone = window.innerHeight > window.innerWidth || window.innerHeight <= 520;
        setCamera(g.aimU - 0.6, phone ? -3.6 : -3.3, phone ? 3.1 : 2.4, g.aimU * 0.3, 7, 0.2);
    };

    const publish = (g) => {
        const totals = frameTotals(g.frames);
        const known = totals.filter((n) => n !== null);
        useArcade.getState().update({
            score: known.length ? known[known.length - 1] : 0,
            detail: { frame: g.frame, roll: g.roll, frames: g.frames.map((f) => [...f]), phase: g.phase },
        });
    };

    const endRoll = (g) => {
        const store = useArcade.getState();
        // Whether this roll was thrown at a full rack (a strike, if it clears it).
        const freshRack = pins.current.every((p) => !p.counted);
        const knocked = pins.current.filter((p) => (p.fallen || p.gone) && !p.counted);
        knocked.forEach((p) => (p.counted = true));
        const down = knocked.length;
        const fr = g.frames[g.frame - 1];
        fr.push(down);
        const allDown = pins.current.every((p) => p.counted);
        if (allDown && freshRack) {
            store.say("game.strike", null, "#F472B6");
            playSound("strike");
            g.shake = 0.6;
        } else if (allDown) {
            store.say("game.spare", null, CYAN);
            playSound("spare");
        } else if (!g.gutter) {
            store.say("game.pins", { n: down }, PURPLE);
        }
        const last = g.frame === BOWLING_FRAMES;
        if (frameDone(fr, last)) {
            if (last) {
                g.phase = "over";
                g.timer = 0;
                publish(g);
                return;
            }
            g.frame += 1;
            g.roll = 1;
            g.frames.push([]);
            g.reset = true;
        } else {
            g.roll += 1;
            // A strike or spare in the last frame racks up fresh pins.
            g.reset = allDown;
        }
        g.phase = "sweep";
        g.timer = 0;
        playSound("sweep");
        publish(g);
    };

    useFrame(({ clock }, rawDt) => {
        const realDt = Math.min(rawDt, 0.05);
        const g = game.current;
        const b = ball.current;
        const t = clock.elapsedTime;
        // Slow motion for a moment as the ball crashes into the pins.
        const slowing = g && g.slow > 0;
        const dt = slowing ? realDt * 0.35 : realDt;
        if (slowing) g.slow -= realDt;

        if (g) {
            if (g.phase === "aim" || g.phase === "power") {
                const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x;
                if (g.phase === "aim") {
                    g.aimU = Math.max(-AIM_RANGE, Math.min(AIM_RANGE, g.aimU + dir * 1.4 * dt));
                    g.aimT += dt;
                    g.angle = aimAngle(g.aimT, g.frame);
                    if (arcadeLink.action) {
                        arcadeLink.action = false;
                        g.phase = "power";
                        g.timer = 0;
                        publish(g);
                    }
                } else {
                    // Power swings up and down while the button is held; let go to throw.
                    g.timer += dt;
                    g.power = 0.5 - 0.5 * Math.cos((g.timer / POWER_PERIOD) * Math.PI * 2);
                    arcadeLink.meter = g.power;
                    if (!arcadeLink.holding) {
                        arcadeLink.meter = null;
                        g.phase = "rolling";
                        g.timer = 0;
                        g.gutter = false;
                        g.hit = false;
                        const speed = MIN_SPEED + g.power * (MAX_SPEED - MIN_SPEED);
                        b.state = "rolling";
                        b.u = g.aimU;
                        b.v = 0.05;
                        b.vu = Math.sin(g.angle) * speed;
                        b.vv = Math.cos(g.angle) * speed;
                        playSound("ballDrop");
                        publish(g);
                    }
                }
                b.u = g.aimU + 0.22;
                b.v = -0.5;
                const [px, pz] = toWorldLane(g.aimU, -0.85);
                arcadeLink.lock = { x: px, z: pz, rotY: worldYaw(0, -1) };
                aimCamera(g);
            } else if (g.phase === "rolling") {
                g.timer += dt;
                // Hook: steer the ball's curve until it reaches the pins.
                const hook = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x;
                if (b.state === "rolling" && !g.gutter && b.v < LANE.headPin - 0.8) b.vu += hook * HOOK * dt;
                for (let i = 0; i < 4; i++) {
                    const events = stepLane(g, b, pins.current, dt / 4);
                    if (events.gutter) {
                        useArcade.getState().say("game.gutter", null, "#94A3B8");
                        playSound("gutter");
                    }
                    if (events.hit) {
                        playSound("pins", Math.round(events.hit * 1.2));
                        g.slow = 0.75;
                    }
                }
                rollLoop.set(b.state === "rolling" ? 0.12 + Math.hypot(b.vu, b.vv) * 0.012 : 0, 140 + Math.hypot(b.vu, b.vv) * 18);
                const maxSpeed = Math.max(0, ...pins.current.filter((p) => !p.gone).map((p) => Math.hypot(p.vu, p.vv) + Math.abs(p.vy)));
                const ballDone = b.state === "gone" || g.timer > 7;
                if (ballDone && (maxSpeed < 0.08 || g.timer - (g.goneAt ?? g.timer) > 2.5)) {
                    g.phase = "settle";
                    g.timer = 0;
                    rollLoop.set(0);
                }
                if (g.hit || b.v > 5.5) {
                    // Pin cam: low and close as the pins go down.
                    setCamera(b.u * 0.2, 6.2, 0.95, 0, 9, 0.25);
                } else {
                    const follow = Math.max(-3.3, Math.min(b.v - 4.5, 4));
                    setCamera(b.u * 0.4, follow, follow < 0.5 ? 2.7 : 2.7 - (follow - 0.5) * 0.2, b.u * 0.2, Math.min(b.v + 4, 9), 0.15);
                }
            } else if (g.phase === "settle") {
                g.timer += realDt;
                if (g.timer > 0.7) endRoll(g);
            } else if (g.phase === "sweep") {
                g.timer += realDt;
                // The pinsetter bar drops, sweeps the deck, and lifts; a full
                // rack is set down fresh behind it.
                if (g.timer > 0.55 && !g.swept) {
                    g.swept = true;
                    if (g.reset) {
                        pins.current = SPOTS.map((spot) => ({ ...freshPin(spot), drop: 1 }));
                    } else {
                        pins.current.forEach((p) => {
                            if (p.fallen) p.gone = true;
                            p.vu = p.vv = 0;
                            p.home = { u: p.u, v: p.v };
                        });
                    }
                }
                if (g.timer > 1.2) {
                    g.phase = "aim";
                    g.swept = false;
                    g.aimT = 0;
                    arcadeLink.action = false;
                    b.state = "held";
                    publish(g);
                }
                aimCamera(g);
            } else if (g.phase === "over") {
                g.timer += realDt;
                if (g.timer > 1.6) {
                    game.current = null;
                    const totals = frameTotals(g.frames);
                    useArcade.getState().finish(totals[BOWLING_FRAMES - 1] ?? 0);
                }
            }
            if (g.shake > 0 && arcadeLink.camera) {
                g.shake -= realDt;
                cam.position.x += (Math.random() - 0.5) * g.shake * 0.12;
                cam.position.y += (Math.random() - 0.5) * g.shake * 0.12;
            }
        }

        // Draw the pins.
        pins.current.forEach((p, i) => {
            const ref = pinRefs.current[i];
            if (!ref) return;
            if (p.fallen && p.tilt < Math.PI / 2) p.tilt = Math.min(Math.PI / 2, p.tilt + dt * 7);
            if (p.drop > 0) p.drop = Math.max(0, p.drop - realDt * 2.2);
            ref.visible = !(p.gone && (p.counted || p.v <= LANE.pit));
            const sinking = p.gone ? Math.min(0.5, (p.v - LANE.pit) * 2) : 0;
            ref.position.set(p.u, 0.06 + p.y + Math.sin(p.tilt) * PIN_R - sinking + p.drop * 1.2, -p.v);
            ref.rotation.set(0, p.dir, 0);
            ref.children[0].rotation.x = p.tilt + (p.y > 0 ? (p.flip * t) % (Math.PI * 2) : 0);
        });

        // Ball: in the rack when idle, in hand while aiming, on the lane after.
        const ballMesh = ballRef.current;
        if (b.state === "rack") {
            ballMesh.position.set(SIDE_WALL + 0.55, 0.64, 0.6);
        } else if (b.state === "held") {
            ballMesh.position.set(b.u, 0.72 + Math.sin(t * 3) * 0.02, -b.v);
        } else {
            const sink = b.v > LANE.pit ? Math.min(0.6, (b.v - LANE.pit) * 1.5) : 0;
            ballMesh.position.set(b.u, 0.06 + BALL_R - (g?.gutter ? 0.06 : 0) - sink, -b.v);
            ballMesh.rotation.set(-b.spin, 0, b.vu * 0.3);
        }
        ballMesh.visible = !(b.state === "gone" && b.v > LANE.pit + 0.6);

        const arrow = arrowRef.current;
        arrow.visible = g?.phase === "aim" || g?.phase === "power";
        if (arrow.visible) {
            arrow.position.x = g.aimU;
            arrow.position.z = -0.15;
            arrow.rotation.y = -g.angle;
        }

        // Pinsetter sweep bar.
        const bar = sweepRef.current;
        const st = g?.phase === "sweep" ? g.timer : -1;
        bar.visible = st >= 0;
        if (bar.visible) {
            const down = Math.min(1, st / 0.25);
            const across = Math.max(0, Math.min(1, (st - 0.25) / 0.45));
            const up = Math.max(0, (st - 0.85) / 0.35);
            bar.position.set(0, 1.0 - down * 0.85 + up * 0.85, -(LANE.headPin - 0.45 + across * 1.6));
        }
        deckLight.current.intensity = 6 + Math.sin(t * 2) * 1.5;
    });

    return (
        <group position={[LANE.x, 0, LANE.foulZ]}>
            <LaneModel />
            {SPOTS.map((_, i) => (
                <Pin key={i} geometry={geometry} pinRef={(el) => (pinRefs.current[i] = el)} />
            ))}
            <mesh ref={ballRef} castShadow>
                <sphereGeometry args={[BALL_R, 32, 20]} />
                <meshStandardMaterial map={ballTexture} roughness={0.08} metalness={0.15} emissive="#4C1D95" emissiveIntensity={0.35} />
            </mesh>
            <mesh ref={sweepRef} visible={false}>
                <boxGeometry args={[SIDE_WALL * 2, 0.18, 0.08]} />
                <meshStandardMaterial color="#1C1730" emissive={PURPLE} emissiveIntensity={0.6} />
            </mesh>
            <pointLight ref={deckLight} position={[0, 1.6, -LANE.headPin - 0.3]} color="#C4B5FD" intensity={6} distance={4.5} />
            {/* Ball return beside the approach */}
            <Shadowed>
                <Box args={[0.5, 0.5, 0.8]} position={[SIDE_WALL + 0.55, 0.25, 0.6]} color="#1C1730" />
            </Shadowed>
            <AimArrow arrowRef={arrowRef} />
        </group>
    );
};
