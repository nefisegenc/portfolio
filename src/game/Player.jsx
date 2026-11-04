// Third-person controller: movement relative to the camera, collisions,
// jumping, walk animation, proximity to landmarks and the follow camera.
// In the arcade the player can also drive the race kart or swing a hammer.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { useStore } from "../store";
import { INTERACT_RADIUS, SPAWN, getLandmark, landmarks } from "../data/world";
import {
    BOOST_LENGTH,
    ENTRY,
    PAD_RADIUS,
    boostPads,
    clampToWalkable,
    games,
    getGame,
    isOnArcadeSide,
    toWorld,
    worldYaw,
} from "../data/arcade";
import { Hammer, KartModel } from "./arcade/Props";
import { arcadeLink, useArcade } from "./arcade/state";
import { Character } from "./Character";
import { colliders } from "./scenery";
import { bindKeyboard, bindPointerLook, cameraState, input, playerState } from "./input";
import { playSound } from "./sound";
import { engineLoop } from "./arcade/audio";

const WALK_SPEED = 4.6;
const RUN_SPEED = 8.2;
const PLAYER_RADIUS = 0.35;
const GRAVITY = 22;
const JUMP_VELOCITY = 7;
// Bug Smash is played on foot but quicker.
const HAMMER_SPEED_BOOST = 1.4;

const KART = { accel: 15, brake: 28, coast: 5, max: 13, boost: 19, reverse: 4, steer: 2.4, radius: 0.62 };

// Hammer swing timeline in seconds: wind up, strike (the hit lands at its
// end), recover. Angles are how far the arm swings forward.
const SWING = { windUp: 0.08, strike: 0.16, end: 0.34 };
const ARM = { rest: 0.35, raised: 2.7, struck: 0.45 };
const HAMMER_REACH = 0.55;
const AIM_ASSIST = 1.3;

// Buildings the camera must not sink into (trees are small enough to ignore).
const cameraBlockers = landmarks.flatMap((l) => l.colliders.filter((c) => c.r > 1.5));

const angleLerp = (from, to, t) => {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * t;
};

const damp = (lambda, dt) => 1 - Math.exp(-lambda * dt);

// Pushes the position out of anything solid; true if it touched something.
const resolveCollisions = (pos, radius = PLAYER_RADIUS) => {
    let hit = false;
    for (const c of colliders) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.0001;
            pos.x = c.x + (dx / d) * min;
            pos.z = c.z + (dz / d) * min;
            hit = true;
        }
    }
    const { x, z } = pos;
    clampToWalkable(pos);
    return hit || x !== pos.x || z !== pos.z;
};

const clamp1 = (v) => Math.max(-1, Math.min(1, v));

// Kart driving: throttle and steering relative to the kart, not the camera.
// Returns the kart's speed.
const driveKart = (s, pos, dt, canMove) => {
    const k = s.kart;
    let throttle = 0;
    let steer = 0;
    if (canMove) {
        throttle = clamp1((input.forward ? 1 : 0) - (input.back ? 1 : 0) - input.joystick.y);
        steer = clamp1((input.left ? 1 : 0) - (input.right ? 1 : 0) - input.joystick.x);
    }
    k.boost = Math.max(0, k.boost - dt);
    for (const b of boostPads) {
        if (Math.hypot(pos.x - b.x, pos.z - b.z) < BOOST_LENGTH * 0.6) {
            if (k.boost < 0.4) playSound("boost");
            k.boost = 0.9;
        }
    }
    if (throttle > 0) k.speed += (k.speed < 0 ? KART.brake : KART.accel) * throttle * dt;
    else if (throttle < 0) k.speed += (k.speed > 0 ? KART.brake : KART.accel * 0.5) * throttle * dt;
    else k.speed -= Math.sign(k.speed) * Math.min(Math.abs(k.speed), KART.coast * dt);
    if (k.boost > 0) k.speed = Math.min(KART.boost, k.speed + 30 * dt);
    else if (k.speed > KART.max) k.speed = Math.max(KART.max, k.speed - 10 * dt);
    k.speed = Math.max(-KART.reverse, k.speed);

    k.steer = MathUtils.lerp(k.steer, steer, damp(10, dt));
    // Steering needs some speed, and flips when reversing.
    s.rotY += k.steer * KART.steer * clamp1(k.speed / 5) * dt;
    s.vx = Math.sin(s.rotY) * k.speed;
    s.vz = Math.cos(s.rotY) * k.speed;

    let bumped = false;
    const steps = Math.max(1, Math.ceil((Math.abs(k.speed) * dt) / 0.25));
    for (let i = 0; i < steps; i++) {
        pos.x += (s.vx * dt) / steps;
        pos.z += (s.vz * dt) / steps;
        if (resolveCollisions(pos, KART.radius)) bumped = true;
    }
    if (bumped) {
        if (Math.abs(k.speed) > 4 && !k.bumped) playSound("bump");
        k.speed *= 0.55;
    }
    k.bumped = bumped;
    return Math.abs(k.speed);
};

// Where fast travel drops the player: in front of a landmark, on a game's
// pad, back at the plaza, or under the arcade's arch. `open` is the landmark to show on arrival.
const travelSpot = (id) => {
    const l = getLandmark(id);
    if (l) {
        return {
            x: l.entrance.x + l.toCenter.x * 0.6,
            z: l.entrance.z + l.toCenter.z * 0.6,
            rotY: Math.atan2(-l.toCenter.x, -l.toCenter.z),
            open: l.id,
        };
    }
    if (id === "plaza") return { x: SPAWN.x, z: SPAWN.z, rotY: SPAWN.yaw + Math.PI };
    const g = getGame(id);
    const [x, z] = g ? [g.x, g.z] : toWorld(ENTRY.x, ENTRY.z - 4);
    return { x, z, rotY: worldYaw(0, -1) };
};

// Pull the camera in when a building sits between it and the player.
const clampCameraDistance = (px, pz, dirX, dirZ, distance, height) => {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
        const d = (distance * i) / steps;
        const x = px + dirX * d;
        const z = pz + dirZ * d;
        const y = 1.3 + height * (i / steps);
        if (y > 5.5) continue;
        for (const c of cameraBlockers) {
            if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.3) ** 2) return Math.max(2.2, d - distance / steps);
        }
    }
    return distance;
};

const Controls = () => {
    const gl = useThree((s) => s.gl);
    useEffect(() => bindKeyboard(), []);
    useEffect(() => bindPointerLook(gl.domElement), [gl]);
    return null;
};

export const Player = () => {
    const group = useRef();
    const rig = useRef({});
    const state = useRef({ vx: 0, vz: 0, vy: 0, y: 0, phase: 0, rotY: Math.PI, nearby: null });
    const wheels = useRef([]);
    const game = useArcade((s) => s.active);
    const camera = useThree((s) => s.camera);
    const tmp = useMemo(() => ({ desired: new Vector3(), look: new Vector3(0, 1, 0), goal: new Vector3() }), []);

    useEffect(() => {
        group.current.position.set(SPAWN.x, 0, SPAWN.z);
        cameraState.yaw = SPAWN.yaw;
        // Portrait screens see less sideways, so start further back.
        if (window.innerHeight > window.innerWidth) cameraState.distance = 12.5;
    }, []);

    useFrame(({ clock }, rawDt) => {
        // Allow big steps so slow devices still move at full speed.
        const dt = Math.min(rawDt, 0.1);
        const s = state.current;
        const pos = group.current.position;
        const store = useStore.getState();
        const arcade = useArcade.getState();
        const playing = store.phase === "playing";
        const canMove = playing && !store.panel && !arcadeLink.lock;

        // Fast travel from the map, or a game moving the player to its start.
        let jump = null;
        if (store.travelTarget) {
            if (arcade.active) arcade.quit();
            jump = travelSpot(store.travelTarget);
            store.clearTravel();
            if (jump.open) setTimeout(() => useStore.getState().openLandmark(jump.open), 500);
        } else if (arcadeLink.teleport) {
            jump = arcadeLink.teleport;
            arcadeLink.teleport = null;
        }
        if (jump) {
            pos.set(jump.x, 0, jump.z);
            s.vx = s.vz = s.vy = s.y = 0;
            s.rotY = jump.rotY;
            cameraState.yaw = jump.rotY + Math.PI;
            cameraState.pitch = 0.32;
            s.snapCamera = true;
        }
        // A game can hold the player in place (aiming in bowling, countdowns).
        if (arcadeLink.lock) {
            pos.set(arcadeLink.lock.x, 0, arcadeLink.lock.z);
            s.rotY = arcadeLink.lock.rotY;
            s.vx = s.vz = 0;
        }

        const driving = arcade.active === "race";
        const hammer = arcade.active === "bugs";
        // A fresh kart for every race.
        if (driving && s.kartRun !== arcade.run) {
            s.kartRun = arcade.run;
            s.kart = { speed: 0, steer: 0, boost: 0, spin: 0, bumped: false };
        }

        let moving;
        if (driving) {
            moving = driveKart(s, pos, dt, canMove);
            engineLoop.set(0.035 + Math.min(Math.abs(s.kart.speed), 18) * 0.003, 48 + Math.abs(s.kart.speed) * 7, 520);
            s.engine = true;
        } else {
            if (s.engine) {
                engineLoop.set(0);
                s.engine = false;
            }
            // Movement input, relative to where the camera looks.
            let ix = 0;
            let iz = 0;
            if (canMove) {
                ix = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x;
                iz = (input.back ? 1 : 0) - (input.forward ? 1 : 0) + input.joystick.y;
            }
            const len = Math.hypot(ix, iz);
            if (len > 1) {
                ix /= len;
                iz /= len;
            }
            const yaw = cameraState.yaw;
            const mx = Math.sin(yaw) * iz + Math.cos(yaw) * ix;
            const mz = Math.cos(yaw) * iz - Math.sin(yaw) * ix;
            const speed = (input.run ? RUN_SPEED : WALK_SPEED) * (hammer ? HAMMER_SPEED_BOOST : 1);
            s.vx = MathUtils.lerp(s.vx, mx * speed, damp(12, dt));
            s.vz = MathUtils.lerp(s.vz, mz * speed, damp(12, dt));
            // Sub-step so a long frame can't tunnel through thin colliders.
            const steps = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vz) * dt) / 0.25));
            for (let i = 0; i < steps; i++) {
                pos.x += (s.vx * dt) / steps;
                pos.z += (s.vz * dt) / steps;
                if (!arcadeLink.lock) resolveCollisions(pos);
            }
            moving = Math.hypot(s.vx, s.vz);
        }
        if (moving > 0.5 && canMove) store.markMoved();

        // Jump, or with the hammer in hand, swing it.
        if (input.jump && canMove && hammer) {
            if (!(s.swing >= 0)) {
                s.swing = 0;
                // Aim assist: turn to the nearest bug in reach.
                let best = AIM_ASSIST;
                for (const b of arcadeLink.targets) {
                    const d = Math.hypot(b.x - pos.x, b.z - pos.z);
                    if (d < best) {
                        best = d;
                        s.rotY = Math.atan2(b.x - pos.x, b.z - pos.z);
                    }
                }
            }
        } else if (input.jump && canMove && !driving && s.y === 0) {
            s.vy = JUMP_VELOCITY;
            playSound("jump");
        }
        input.jump = false;
        if (s.swing >= 0) {
            const before = s.swing;
            s.swing += dt;
            if (before < SWING.strike && s.swing >= SWING.strike) {
                arcadeLink.hit = { x: pos.x + Math.sin(s.rotY) * HAMMER_REACH, z: pos.z + Math.cos(s.rotY) * HAMMER_REACH };
            }
            if (s.swing > SWING.end || !hammer) s.swing = -1;
        }
        s.vy -= GRAVITY * dt;
        s.y = Math.max(0, s.y + s.vy * dt);
        if (s.y === 0) s.vy = 0;
        pos.y = s.y;

        // Face the direction of travel (the kart steers itself; a swing holds its aim).
        if (!driving && !(s.swing >= 0) && moving > 0.3) s.rotY = angleLerp(s.rotY, Math.atan2(s.vx, s.vz), damp(12, dt));
        group.current.rotation.y = s.rotY;

        // Walk cycle
        const r = rig.current;
        const stride = Math.min(moving / WALK_SPEED, 1.6);
        s.phase += dt * (4 + moving * 1.6);
        const swing = Math.sin(s.phase) * 0.7 * Math.min(stride, 1.2);
        const airborne = s.y > 0.01;
        // A footstep every half walk cycle.
        const stepIndex = Math.floor(s.phase / Math.PI);
        if (stepIndex !== s.stepIndex) {
            s.stepIndex = stepIndex;
            if (moving > 1 && !airborne && canMove && !driving) playSound("step", input.run);
        }
        const t = clock.elapsedTime;
        if (r.leftLeg && driving) {
            // Seated in the kart, hands on the wheel.
            r.leftLeg.rotation.x = -1.45;
            r.rightLeg.rotation.x = -1.45;
            r.leftArm.rotation.x = -1.05;
            r.rightArm.rotation.x = -1.05;
            r.body.position.y = -0.27;
            r.body.rotation.x = -0.05;
            s.kart.spin += (s.kart.speed * dt) / 0.2;
            for (const w of wheels.current) {
                if (!w) continue;
                w.el.rotation.x = s.kart.spin;
                if (w.front) w.el.rotation.y = s.kart.steer * 0.45;
            }
        } else if (r.leftLeg) {
            r.leftLeg.rotation.x = MathUtils.lerp(r.leftLeg.rotation.x, airborne ? -0.5 : swing, damp(14, dt));
            r.rightLeg.rotation.x = MathUtils.lerp(r.rightLeg.rotation.x, airborne ? 0.3 : -swing, damp(14, dt));
            r.leftArm.rotation.x = MathUtils.lerp(r.leftArm.rotation.x, airborne ? -2.4 : -swing * 0.9, damp(12, dt));
            r.rightArm.rotation.x = MathUtils.lerp(r.rightArm.rotation.x, airborne ? -2.4 : swing * 0.9, damp(12, dt));
            r.body.position.y = airborne ? 0 : Math.abs(Math.sin(s.phase)) * 0.06 * Math.min(stride, 1) + Math.sin(t * 2) * 0.008;
            r.body.rotation.x = MathUtils.lerp(r.body.rotation.x, stride * 0.08, damp(8, dt));
            if (hammer) {
                // The hammer arm: resting forward, or following the swing.
                let reach = ARM.rest;
                if (s.swing >= 0) {
                    const p = s.swing;
                    if (p < SWING.windUp) reach = MathUtils.lerp(ARM.rest, ARM.raised, p / SWING.windUp);
                    else if (p < SWING.strike) reach = MathUtils.lerp(ARM.raised, ARM.struck, (p - SWING.windUp) / (SWING.strike - SWING.windUp));
                    else reach = MathUtils.lerp(ARM.struck, ARM.rest, (p - SWING.strike) / (SWING.end - SWING.strike));
                    r.body.rotation.x = p > SWING.windUp && p < SWING.end ? 0.22 : r.body.rotation.x;
                }
                r.rightArm.rotation.x = -reach;
            }
        }

        // Which landmark are we standing in front of?
        let nearby = null;
        for (const l of landmarks) {
            if (Math.hypot(pos.x - l.entrance.x, pos.z - l.entrance.z) < INTERACT_RADIUS) nearby = l.id;
        }
        if (!playing) nearby = null;
        if (nearby !== s.nearby) {
            s.nearby = nearby;
            store.setNearby(nearby);
            if (nearby) store.discover(nearby);
        }

        // Game pads on the arcade.
        let pad = null;
        if (playing && !arcade.active) {
            for (const g of games) {
                if (Math.hypot(pos.x - g.x, pos.z - g.z) < PAD_RADIUS) pad = g.id;
            }
        }
        arcade.setNearby(pad);
        arcade.setArea(isOnArcadeSide(pos.x, pos.z) ? "arcade" : "main");

        playerState.x = pos.x;
        playerState.z = pos.z;
        playerState.rotY = s.rotY;
        playerState.speed = moving;

        // Camera: in the kart it swings round behind the driver by itself.
        if (driving) {
            cameraState.yaw = angleLerp(cameraState.yaw, s.rotY + Math.PI, damp(3.5, dt));
            // Low enough to pass under the gates' crossbars.
            cameraState.pitch = MathUtils.lerp(cameraState.pitch, 0.2, damp(2, dt));
            cameraState.distance = MathUtils.lerp(cameraState.distance, 7.5, damp(2, dt));
        }
        if (canMove) {
            cameraState.yaw -= input.look.dx * 0.005;
            cameraState.pitch = MathUtils.clamp(cameraState.pitch + input.look.dy * 0.004, 0.05, 1.2);
            cameraState.distance = MathUtils.clamp(cameraState.distance + input.zoom, 4.5, 17);
        }
        input.look.dx = 0;
        input.look.dy = 0;
        input.zoom = 0;

        if (!playing) {
            const a = t * 0.05;
            tmp.goal.set(Math.sin(a) * 48, 25, Math.cos(a) * 48);
            camera.position.lerp(tmp.goal, damp(2, dt));
            tmp.look.lerp(tmp.goal.set(0, 0, 0), damp(2, dt));
            camera.lookAt(tmp.look);
            return;
        }

        // Games with their own camera (bowling) take over here.
        if (arcadeLink.camera) {
            camera.position.lerp(arcadeLink.camera.position, damp(4, dt));
            tmp.look.lerp(arcadeLink.camera.target, damp(5, dt));
            camera.lookAt(tmp.look);
            return;
        }

        const { pitch } = cameraState;
        const dirX = Math.sin(cameraState.yaw) * Math.cos(pitch);
        const dirZ = Math.cos(cameraState.yaw) * Math.cos(pitch);
        const height = Math.sin(pitch) * cameraState.distance;
        const distance = clampCameraDistance(pos.x, pos.z, dirX, dirZ, cameraState.distance, height);
        tmp.desired.set(pos.x + dirX * distance, Math.max(0.6, 1.3 + Math.sin(pitch) * distance), pos.z + dirZ * distance);

        const since = (performance.now() - store.startedAt) / 1000;
        const follow = since < 2.2 ? 2.2 : 10;
        if (s.snapCamera) {
            camera.position.copy(tmp.desired);
            tmp.look.set(pos.x, pos.y + 1.3, pos.z);
            s.snapCamera = false;
        }
        camera.position.lerp(tmp.desired, damp(follow, dt));
        tmp.look.lerp(tmp.goal.set(pos.x, pos.y * 0.5 + 1.3, pos.z), damp(follow * 1.4, dt));
        camera.lookAt(tmp.look);
    });

    return (
        <>
            <Controls />
            <group ref={group}>
                <Character rig={rig} tool={game === "bugs" ? <Hammer /> : null} />
                {game === "race" && <KartModel wheels={wheels} position-z={0.12} />}
                <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
                    <circleGeometry args={[0.4, 24]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
                </mesh>
            </group>
        </>
    );
};
