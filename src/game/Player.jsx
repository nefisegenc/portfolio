// Third-person controller: movement relative to the camera, collisions,
// jumping, walk animation, proximity to landmarks and the follow camera.
// In the arcade the player can also sit in the race kart or carry a blaster.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { useStore } from "../store";
import { INTERACT_RADIUS, SPAWN, getLandmark, landmarks } from "../data/world";
import {
    ENTRY,
    PAD_RADIUS,
    arcadeColliders,
    clampToWalkable,
    games,
    getGame,
    isOnArcadeSide,
    toWorld,
    worldYaw,
} from "../data/arcade";
import { KartModel } from "./arcade/Props";
import { Blaster } from "./arcade/hunt/BugHunt";
import { Guitar } from "./arcade/riff/Riff";
import { arcadeLink, useArcade } from "./arcade/state";
import { Character } from "./Character";
import { colliders } from "./scenery";
import { bindKeyboard, bindPointerLook, cameraState, input, playerState } from "./input";
import { playSound } from "./sound";

const WALK_SPEED = 4.6;
const RUN_SPEED = 8.2;
const PLAYER_RADIUS = 0.35;
const GRAVITY = 22;
const JUMP_VELOCITY = 7;
// Bug Hunt is played on foot but quicker.
const HUNT_SPEED_BOOST = 1.35;



// Buildings the camera must not sink into (trees are small enough to ignore),
// and the arcade's high-score board.
const cameraBlockers = [...landmarks.flatMap((l) => l.colliders), ...arcadeColliders].filter((c) => c.r > 1.5);

// The shortest turn from one angle to another, between -π and π.
const turnBetween = (from, to) => {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
};

const angleLerp = (from, to, t) => from + turnBetween(from, to) * t;

// The follow camera swings round behind the character as it walks: quickest
// when heading away from the camera, gently when walking sideways (so
// sideways keys steer rather than spin), not at all when walking back
// towards it. Looking around by hand pauses it for a moment.
const FOLLOW_RATE = 1.2;
const FOLLOW_PAUSE = 1.6;

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
    // Games away from the islands bring their own edges.
    (arcadeLink.bounds ?? clampToWalkable)(pos);
    return hit || x !== pos.x || z !== pos.z;
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
    if (g) return { x: g.x, z: g.z, rotY: g.rotY };
    const [x, z] = toWorld(ENTRY.x, ENTRY.z - 4);
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
    const tilt = useRef();
    const game = useArcade((s) => s.active);
    const camera = useThree((s) => s.camera);
    const tmp = useMemo(() => ({ desired: new Vector3(), look: new Vector3(0, 1, 0), goal: new Vector3() }), []);

    useEffect(() => {
        group.current.position.set(SPAWN.x, 0, SPAWN.z);
        cameraState.yaw = SPAWN.yaw;
        // Portrait screens see less sideways, so start further back.
        if (window.innerHeight > window.innerWidth) cameraState.distance = 12.5;
    }, []);

    useFrame(({ clock, camera: view }, rawDt) => {
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
            // Leaving a game may have queued a move back to its pad; travel wins.
            arcadeLink.teleport = null;
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
        // A game can hold the player in place, or drive them (the race kart
        // sets height and tilt too).
        const lock = arcadeLink.lock;
        if (lock) {
            pos.set(lock.x, 0, lock.z);
            s.rotY = lock.rotY;
            s.vx = s.vz = 0;
        }

        const driving = arcade.active === "race";
        const hunting = arcade.active === "bugs";

        let moving;
        if (driving) {
            // The race simulates the kart; here it only needs showing.
            moving = Math.abs(arcadeLink.kart?.speed ?? 0);
        } else {
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
            const speed = (input.run ? RUN_SPEED : WALK_SPEED) * (hunting ? HUNT_SPEED_BOOST : 1);
            s.vx = MathUtils.lerp(s.vx, mx * speed, damp(12, dt));
            s.vz = MathUtils.lerp(s.vz, mz * speed, damp(12, dt));
            // A game can shove the player (a bug's bite); it fades on its own.
            if (arcadeLink.push) {
                s.pushX = arcadeLink.push.x;
                s.pushZ = arcadeLink.push.z;
                arcadeLink.push = null;
            }
            const pushX = s.pushX ?? 0;
            const pushZ = s.pushZ ?? 0;
            s.pushX = pushX * (1 - damp(6, dt));
            s.pushZ = pushZ * (1 - damp(6, dt));
            // Sub-step so a long frame can't tunnel through thin colliders.
            const steps = Math.max(1, Math.ceil((Math.hypot(s.vx + pushX, s.vz + pushZ) * dt) / 0.25));
            for (let i = 0; i < steps; i++) {
                pos.x += ((s.vx + pushX) * dt) / steps;
                pos.z += ((s.vz + pushZ) * dt) / steps;
                if (!arcadeLink.lock) resolveCollisions(pos);
            }
            moving = Math.hypot(s.vx, s.vz);
        }
        if (moving > 0.5 && canMove) store.markMoved();

        // Jump (the blaster's trigger shares the key, so not while hunting).
        if (input.jump && canMove && !driving && !hunting && s.y === 0) {
            s.vy = JUMP_VELOCITY;
            playSound("jump");
        }
        input.jump = false;
        s.vy -= GRAVITY * dt;
        s.y = Math.max(0, s.y + s.vy * dt);
        if (s.y === 0) s.vy = 0;
        pos.y = lock?.y ?? (arcadeLink.floor ?? 0) + s.y;
        tilt.current.rotation.x = lock?.pitch ?? 0;
        tilt.current.rotation.z = lock?.roll ?? 0;

        // Face the direction of travel, or the target while aiming (the kart steers itself).
        if (arcadeLink.aimYaw !== null && arcadeLink.aimYaw !== undefined) s.rotY = angleLerp(s.rotY, arcadeLink.aimYaw, damp(20, dt));
        else if (!driving && moving > 0.3) s.rotY = angleLerp(s.rotY, Math.atan2(s.vx, s.vz), damp(12, dt));
        group.current.rotation.y = s.rotY;
        // Blink for a moment after being hurt.
        arcadeLink.blink = Math.max(0, arcadeLink.blink - dt);
        group.current.visible = !arcadeLink.hide && !(arcadeLink.blink > 0 && Math.floor(clock.elapsedTime * 18) % 2 === 0);

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
            const kart = arcadeLink.kart;
            for (const w of wheels.current) {
                if (!w || !kart) continue;
                w.el.rotation.x = kart.wheel;
                if (w.front) w.el.rotation.y = kart.steer * 0.45;
            }
        } else if (r.leftLeg) {
            r.leftLeg.rotation.x = MathUtils.lerp(r.leftLeg.rotation.x, airborne ? -0.5 : swing, damp(14, dt));
            r.rightLeg.rotation.x = MathUtils.lerp(r.rightLeg.rotation.x, airborne ? 0.3 : -swing, damp(14, dt));
            r.leftArm.rotation.x = MathUtils.lerp(r.leftArm.rotation.x, airborne ? -2.4 : -swing * 0.9, damp(12, dt));
            r.rightArm.rotation.x = MathUtils.lerp(r.rightArm.rotation.x, airborne ? -2.4 : swing * 0.9, damp(12, dt));
            r.body.position.y = airborne ? 0 : Math.abs(Math.sin(s.phase)) * 0.06 * Math.min(stride, 1) + Math.sin(t * 2) * 0.008;
            r.body.rotation.x = MathUtils.lerp(r.body.rotation.x, stride * 0.08, damp(8, dt));
            if (hunting) {
                // Blaster held out in front.
                r.rightArm.rotation.x = -1.45;
                r.leftArm.rotation.x = MathUtils.lerp(r.leftArm.rotation.x, -1.1, damp(12, dt));
            }
            // On stage: one hand on the neck, the other strumming each note,
            // nodding along to the beat.
            const playing = arcade.active === "riff";
            if (playing) {
                const since = (performance.now() - arcadeLink.strum) / 1000;
                const strum = since < 0.18 ? Math.sin((since / 0.18) * Math.PI) * 0.45 : 0;
                r.leftArm.rotation.x = -0.6 - strum;
                r.rightArm.rotation.x = -1.2;
                r.rightArm.rotation.z = 0.75;
                r.body.position.y = Math.abs(Math.sin(arcadeLink.beat * Math.PI)) * 0.05;
                r.body.rotation.x = Math.sin(arcadeLink.beat * Math.PI * 2) * 0.05;
            } else if (r.rightArm.rotation.z !== 0.22) {
                r.rightArm.rotation.z = 0.22;
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

        // Camera
        if (canMove) {
            if (input.look.dx || input.look.dy) s.lookedAt = t;
            cameraState.yaw -= input.look.dx * 0.005;
            cameraState.pitch = MathUtils.clamp(cameraState.pitch + input.look.dy * 0.004, 0.05, 1.2);
            cameraState.distance = MathUtils.clamp(cameraState.distance + input.zoom, 4.5, 17);
            if (moving > 0.5 && !arcade.active && t - (s.lookedAt ?? -FOLLOW_PAUSE) > FOLLOW_PAUSE) {
                const diff = turnBetween(cameraState.yaw, s.rotY + Math.PI);
                const ahead = MathUtils.clamp(Math.cos(diff) + 0.35, 0, 1);
                const rate = Math.min(Math.abs(diff) * 1.6, FOLLOW_RATE) * ahead * Math.min(1, moving / WALK_SPEED);
                cameraState.yaw += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
            }
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

        // Games can widen the view (the race does at speed).
        const fov = arcadeLink.camera?.fov ?? 45;
        if (Math.abs(view.fov - fov) > 0.05) {
            view.fov = MathUtils.lerp(view.fov, fov, damp(3, dt));
            view.updateProjectionMatrix();
        }

        // Games with their own camera (bowling, the race) take over here.
        const own = arcadeLink.camera;
        if (own) {
            const k = own.stiffness ?? 4;
            if (s.snapCamera || arcadeLink.snap) {
                camera.position.copy(own.position);
                tmp.look.copy(own.target);
                s.snapCamera = false;
                arcadeLink.snap = false;
            }
            camera.position.lerp(own.position, damp(k, dt));
            tmp.look.lerp(own.target, damp(k * 1.25, dt));
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
                <group ref={tilt} rotation-order="YXZ">
                    <Character rig={rig} tool={game === "bugs" ? <Blaster /> : null}>
                        {game === "riff" && (
                            <group position={[-0.05, 0.95, 0.2]} rotation={[0.1, 0.15, 0.45]}>
                                <Guitar />
                            </group>
                        )}
                    </Character>
                    {game === "race" && <KartModel wheels={wheels} position-z={0.12} />}
                </group>
                <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
                    <circleGeometry args={[0.4, 24]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
                </mesh>
            </group>
        </>
    );
};
