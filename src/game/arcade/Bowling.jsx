// Bowling: three frames of up to two rolls. The lane is simulated in 2D
// (u across the lane, v down it towards the pins); pins tip over once they
// are hit hard enough.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { LatheGeometry, Vector2, Vector3 } from "three";
import { LANE, toWorld, worldYaw } from "../../data/arcade";
import { useT } from "../../i18n";
import { input } from "../input";
import { Box, FONT, GlowMat, Shadowed } from "../parts";
import { playSound } from "../sound";
import { arcadeLink, useArcade } from "./state";

const FRAMES = 3;
const BALL_R = 0.14;
const PIN_R = 0.06;
const FALLEN_R = 0.1;
const BALL_MASS = 7;
const PIN_MASS = 1.5;
const BALL_SPEED = 8.2;
const AIM_RANGE = LANE.halfWidth - 0.2;
const SIDE_WALL = LANE.halfWidth + LANE.gutter;
const PURPLE = "#8B5CF6";

// Lane space to arcade space.
const lx = (u) => LANE.x + u;
const lz = (v) => LANE.foulZ - v;
const toWorldLane = (u, v) => toWorld(lx(u), lz(v));

const rackSpots = () => {
    const spots = [];
    for (let row = 0; row < 4; row++) {
        for (let i = 0; i <= row; i++) spots.push({ u: (i - row / 2) * 0.3, v: LANE.headPin + row * 0.26 });
    }
    return spots;
};
const SPOTS = rackSpots();

const freshPin = (spot) => ({ ...spot, home: spot, vu: 0, vv: 0, fallen: false, gone: false, tilt: 0, dir: 0, counted: false });

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

// One physics sub-step of the ball and pins. Reports the first pin hit and
// a ball dropping into the gutter, which the caller turns into sound and text.
const stepLane = (g, b, pins, h) => {
    const events = { hit: false, gutter: false };
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
        const k = 1 - damp(p.fallen ? 3 : 6, h);
        p.vu *= k;
        p.vv *= k;
        if (Math.abs(p.u) > SIDE_WALL) {
            p.u = Math.sign(p.u) * SIDE_WALL;
            p.vu *= -0.5;
        }
        if (p.v > LANE.length - 0.1) {
            p.v = LANE.length - 0.1;
            p.vv *= -0.3;
        }
        if (p.v > LANE.pit + 0.05) {
            p.gone = true;
            p.fallen = true;
        }
    }
    if (b.state === "rolling") {
        for (const p of pins) {
            if (p.gone) continue;
            const hit = collide(b, p, BALL_R, p.fallen ? FALLEN_R : PIN_R, BALL_MASS, PIN_MASS, 0.6);
            if (hit > 0 && !g.hit) {
                g.hit = true;
                events.hit = true;
            }
        }
    }
    for (let a = 0; a < pins.length; a++) {
        if (pins[a].gone) continue;
        for (let c = a + 1; c < pins.length; c++) {
            if (pins[c].gone) continue;
            collide(pins[a], pins[c], pins[a].fallen ? FALLEN_R : PIN_R, pins[c].fallen ? FALLEN_R : PIN_R, PIN_MASS, PIN_MASS, 0.5);
        }
    }
    for (const p of pins) {
        const moved = Math.hypot(p.u - p.home.u, p.v - p.home.v);
        if (!p.fallen && (Math.hypot(p.vu, p.vv) > 0.35 || moved > 0.14)) {
            p.fallen = true;
            p.dir = Math.atan2(p.vu || 0.001, -(p.vv || 0.001));
        }
    }
    return events;
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
        return new LatheGeometry(profile, 14);
    }, []);

const Pin = ({ pinRef, geometry }) => (
    <group ref={pinRef}>
        <group>
            <mesh geometry={geometry} castShadow>
                <meshStandardMaterial color="#FFFFFF" roughness={0.35} />
            </mesh>
            {[0.255, 0.285].map((y) => (
                <mesh key={y} position-y={y}>
                    <cylinderGeometry args={[0.031, 0.031, 0.014, 14, 1, true]} />
                    <meshStandardMaterial color="#E11D48" />
                </mesh>
            ))}
        </group>
    </group>
);

const LaneModel = () => {
    const t = useT();
    const length = LANE.length;
    const mid = -length / 2;
    return (
        <group>
            <Shadowed cast={false}>
                <Box args={[LANE.halfWidth * 2, 0.06, LANE.pit]} position={[0, 0.03, -LANE.pit / 2]} color="#E7C38F" />
                {[-1, 1].map((s) => (
                    <group key={s}>
                        <Box args={[LANE.gutter, 0.02, LANE.pit]} position={[s * (LANE.halfWidth + LANE.gutter / 2), 0.01, -LANE.pit / 2]} color="#3B3350" />
                        <Box args={[0.2, 0.32, length]} position={[s * (SIDE_WALL + 0.1), 0.16, mid]} color="#2A2340" />
                        <Box args={[0.22, 0.05, length]} position={[s * (SIDE_WALL + 0.1), 0.34, mid]}>
                            <GlowMat color={PURPLE} strength={1.6} />
                        </Box>
                    </group>
                ))}
                <Box args={[SIDE_WALL * 2, 0.02, length - LANE.pit]} position={[0, 0.01, -(LANE.pit + length) / 2]} color="#1C1730" />
            </Shadowed>
            {/* Foul line and aiming arrows */}
            <Box args={[LANE.halfWidth * 2, 0.005, 0.05]} position={[0, 0.063, 0]} color="#2A2340" />
            {[-0.3, -0.15, 0, 0.15, 0.3].map((u, i) => (
                <mesh key={u} position={[u, 0.064, -3.2 - Math.abs(i - 2) * 0.25]} rotation-x={-Math.PI / 2}>
                    <circleGeometry args={[0.05, 3]} />
                    <meshBasicMaterial color="#9A6B3A" />
                </mesh>
            ))}
            {/* Back wall with the neon sign */}
            <Shadowed>
                <Box args={[SIDE_WALL * 2 + 0.6, 1.5, 0.3]} position={[0, 0.75, -length - 0.15]} color="#2A2340" />
            </Shadowed>
            <Text font={FONT} fontSize={0.36} position={[0, 1.15, -length + 0.02]} anchorY="middle">
                {t("game.bowling").toUpperCase()}
                <GlowMat color={PURPLE} strength={2.4} />
            </Text>
        </group>
    );
};

// Aiming arrow drawn on the lane in front of the bowler.
const AimArrow = ({ arrowRef }) => (
    <group ref={arrowRef} position-y={0.08}>
        <mesh rotation-x={-Math.PI / 2} position-z={-0.55}>
            <planeGeometry args={[0.08, 1.1]} />
            <meshBasicMaterial color={PURPLE} transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position-z={-1.2}>
            <circleGeometry args={[0.18, 3, Math.PI / 2]} />
            <meshBasicMaterial color={PURPLE} transparent opacity={0.85} toneMapped={false} />
        </mesh>
    </group>
);

export const Bowling = () => {
    const geometry = usePinGeometry();
    const pinRefs = useRef([]);
    const ballRef = useRef();
    const arrowRef = useRef();
    const pins = useRef(SPOTS.map(freshPin));
    const ball = useRef({ u: 0, v: -0.35, vu: 0, vv: 0, spin: 0, state: "rack" });
    const game = useRef(null);
    const cam = useMemo(() => ({ position: new Vector3(), target: new Vector3() }), []);
    const active = useArcade((s) => s.active === "bowling");
    const run = useArcade((s) => s.run);

    useEffect(() => {
        pins.current = SPOTS.map(freshPin);
        ball.current.state = "rack";
        if (!active) {
            game.current = null;
            return;
        }
        game.current = { frame: 1, roll: 1, phase: "aim", timer: 0, aimU: 0, aimT: 0, angle: 0, total: 0, frames: [], hit: false, gutter: false };
        arcadeLink.action = false;
        ball.current.state = "held";
        useArcade.getState().update({ status: "playing", detail: { frame: 1, frames: FRAMES, roll: 1, rolls: [] }, score: 0 });
    }, [active, run]);

    const setCamera = (u, v, y, tu, tv, ty) => {
        const [px, pz] = toWorldLane(u, v);
        const [tx, tz] = toWorldLane(tu, tv);
        cam.position.set(px, y, pz);
        cam.target.set(tx, ty, tz);
        arcadeLink.camera = cam;
    };

    const endRoll = (g) => {
        const store = useArcade.getState();
        const knocked = pins.current.filter((p) => (p.fallen || p.gone) && !p.counted);
        knocked.forEach((p) => (p.counted = true));
        const down = knocked.length;
        g.total += down;
        const frameRolls = [...(g.frames[g.frame - 1] ?? []), down];
        g.frames[g.frame - 1] = frameRolls;
        const allDown = pins.current.every((p) => p.counted);
        if (allDown && g.roll === 1) {
            store.say("game.strike", null, PURPLE);
            playSound("cheer");
        } else if (allDown) {
            store.say("game.spare", null, PURPLE);
            playSound("cheer");
        } else if (!g.gutter) {
            store.say("game.pins", { n: down }, PURPLE);
        }
        const frameOver = allDown || g.roll === 2;
        store.update({ score: g.total, detail: { frame: g.frame, frames: FRAMES, roll: g.roll, rolls: g.frames } });
        if (frameOver && g.frame === FRAMES) {
            g.phase = "over";
            g.timer = 0;
            return;
        }
        if (frameOver) {
            g.frame += 1;
            g.roll = 1;
            pins.current = SPOTS.map(freshPin);
        } else {
            g.roll = 2;
            // Sweep away the fallen pins; standing ones stay where they are.
            pins.current.forEach((p) => {
                if (p.fallen) p.gone = true;
                p.vu = p.vv = 0;
                p.home = { u: p.u, v: p.v };
            });
        }
        g.phase = "aim";
        g.gutter = false;
        g.hit = false;
        arcadeLink.action = false;
        ball.current.state = "held";
        store.update({ detail: { frame: g.frame, frames: FRAMES, roll: g.roll, rolls: g.frames } });
    };

    useFrame(({ clock }, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const g = game.current;
        const b = ball.current;
        const t = clock.elapsedTime;

        if (g) {
            if (g.phase === "aim") {
                const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x;
                g.aimU = Math.max(-AIM_RANGE, Math.min(AIM_RANGE, g.aimU + dir * 1.4 * dt));
                g.aimT += dt;
                // The arrow swings quickly, and a little quicker every frame.
                g.angle = Math.sin(g.aimT * (3.6 + g.frame * 0.7)) * 0.12;
                b.u = g.aimU + 0.22;
                b.v = -0.5;
                const [px, pz] = toWorldLane(g.aimU, -0.85);
                arcadeLink.lock = { x: px, z: pz, rotY: worldYaw(0, -1) };
                // Over the left shoulder, so the bowler doesn't hide the pins.
                setCamera(g.aimU - 0.6, -3.3, 2.4, g.aimU * 0.3, 7, 0.2);
                if (arcadeLink.action) {
                    arcadeLink.action = false;
                    g.phase = "rolling";
                    g.timer = 0;
                    b.state = "rolling";
                    b.u = g.aimU;
                    b.v = 0.05;
                    b.vu = Math.sin(g.angle) * BALL_SPEED;
                    b.vv = Math.cos(g.angle) * BALL_SPEED;
                    playSound("roll");
                }
            } else if (g.phase === "rolling") {
                g.timer += dt;
                for (let i = 0; i < 4; i++) {
                    const events = stepLane(g, b, pins.current, dt / 4);
                    if (events.gutter) useArcade.getState().say("game.gutter", null, "#94A3B8");
                    if (events.hit) playSound("pins");
                }
                const maxSpeed = Math.max(0, ...pins.current.filter((p) => !p.gone).map((p) => Math.hypot(p.vu, p.vv)));
                const ballDone = b.state === "gone" || g.timer > 6;
                if (ballDone && (maxSpeed < 0.08 || g.timer - (g.goneAt ?? g.timer) > 2.5)) {
                    g.phase = "settle";
                    g.timer = 0;
                }
                // Chase the ball once it is well ahead, passing high over the bowler.
                const follow = Math.max(-3.3, b.state === "rolling" ? Math.min(b.v - 4.5, 5.2) : 5.2);
                const height = follow < 0.5 ? 2.7 : 2.7 - (follow - 0.5) * 0.2;
                setCamera(b.u * 0.4, follow, height, b.u * 0.2, b.state === "rolling" ? Math.min(b.v + 4, 9) : 8.8, 0.15);
            } else if (g.phase === "settle") {
                g.timer += dt;
                if (g.timer > 0.6) endRoll(g);
            } else if (g.phase === "over") {
                g.timer += dt;
                if (g.timer > 1.4) {
                    game.current = null;
                    useArcade.getState().finish(g.total);
                }
            }
        }

        // Draw the pins.
        pins.current.forEach((p, i) => {
            const ref = pinRefs.current[i];
            if (!ref) return;
            if (p.fallen && p.tilt < Math.PI / 2) p.tilt = Math.min(Math.PI / 2, p.tilt + dt * 7);
            ref.visible = !(p.gone && (p.counted || p.v <= LANE.pit));
            const sinking = p.gone ? Math.min(0.5, (p.v - LANE.pit) * 2) : 0;
            ref.position.set(p.u, 0.06 + Math.sin(p.tilt) * PIN_R - sinking, -p.v);
            ref.rotation.set(0, p.dir, 0);
            ref.children[0].rotation.x = p.tilt;
        });

        // Ball: in the rack when idle, in hand while aiming, on the lane after.
        const ballMesh = ballRef.current;
        if (b.state === "rack") {
            ballMesh.position.set(SIDE_WALL + 0.55, 0.62, 0.6);
        } else if (b.state === "held") {
            ballMesh.position.set(b.u, 0.72 + Math.sin(t * 3) * 0.02, -b.v);
        } else {
            const sink = b.v > LANE.pit ? Math.min(0.6, (b.v - LANE.pit) * 1.5) : 0;
            ballMesh.position.set(b.u, 0.06 + BALL_R - (g?.gutter ? 0.06 : 0) - sink, -b.v);
            ballMesh.rotation.set(-b.spin, 0, 0);
        }
        ballMesh.visible = !(b.state === "gone" && b.v > LANE.pit + 0.6);

        const arrow = arrowRef.current;
        arrow.visible = g?.phase === "aim";
        if (arrow.visible) {
            arrow.position.x = g.aimU;
            arrow.position.z = -0.15;
            arrow.rotation.y = -g.angle;
        }
    });

    return (
        <group position={[LANE.x, 0, LANE.foulZ]}>
            <LaneModel />
            {SPOTS.map((_, i) => (
                <Pin key={i} geometry={geometry} pinRef={(el) => (pinRefs.current[i] = el)} />
            ))}
            <mesh ref={ballRef} castShadow>
                <sphereGeometry args={[BALL_R, 24, 16]} />
                <meshStandardMaterial color={PURPLE} roughness={0.15} metalness={0.2} emissive="#4C1D95" emissiveIntensity={0.4} />
            </mesh>
            {/* Ball return rack beside the approach */}
            <Shadowed>
                <Box args={[0.5, 0.5, 0.8]} position={[SIDE_WALL + 0.55, 0.25, 0.6]} color="#2A2340" />
            </Shadowed>
            <AimArrow arrowRef={arrowRef} />
        </group>
    );
};
