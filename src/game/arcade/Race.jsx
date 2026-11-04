// Kart race: three laps around the arcade's track in the kart, through the
// glowing gates in order. Boost pads on the track give a burst of speed.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { BOOST_ANGLES, BOOST_LENGTH, PARKED_KART, TRACK, gateAngle, toWorld, trackPoint, worldYaw } from "../../data/arcade";
import { playerState } from "../input";
import { Box, GlowMat, Shadowed } from "../parts";
import { playSound } from "../sound";
import { COUNTDOWN, tickCountdown } from "./countdown";
import { KartModel } from "./Props";
import { arcadeLink, useArcade } from "./state";

const ORANGE = "#F97316";
const CHECKPOINTS = TRACK.gates * TRACK.laps;
const GATE_REACH = TRACK.halfWidth + 0.5;

// The gate a checkpoint passes through: 1, 2 … 7, then 0 closes the lap.
const gateOf = (checkpoint) => (checkpoint + 1) % TRACK.gates;

// Lays a group across the track, its x axis pointing outwards.
const acrossTrack = (angle) => {
    const [x, z] = trackPoint(angle);
    return { position: [x, 0, z], "rotation-y": angle - Math.PI / 2 };
};

const Track = () => {
    const inner = TRACK.radius - TRACK.halfWidth;
    const outer = TRACK.radius + TRACK.halfWidth;
    const checks = useMemo(() => {
        const out = [];
        const size = (TRACK.halfWidth * 2) / 8;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 2; j++) {
                if ((i + j) % 2) out.push([-TRACK.halfWidth + size * (i + 0.5), (j - 0.5) * size, size]);
            }
        }
        return out;
    }, []);
    return (
        <group>
            <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
                <ringGeometry args={[inner, outer, 96]} />
                <meshStandardMaterial color="#D2694B" roughness={1} />
            </mesh>
            {[inner + 0.06, TRACK.radius, outer - 0.06].map((r, i) => (
                <mesh key={r} rotation-x={-Math.PI / 2} position-y={0.024}>
                    <ringGeometry args={[r - (i === 1 ? 0.02 : 0.035), r + (i === 1 ? 0.02 : 0.035), 96]} />
                    <meshBasicMaterial color="#FFF3E6" side={DoubleSide} />
                </mesh>
            ))}
            {/* Start and finish line, just before gate 0 */}
            <group {...acrossTrack(gateAngle(0) - 0.09)}>
                <mesh rotation-x={-Math.PI / 2} position-y={0.026}>
                    <planeGeometry args={[TRACK.halfWidth * 2, ((TRACK.halfWidth * 2) / 8) * 2]} />
                    <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                {checks.map(([x, z, s]) => (
                    <mesh key={`${x}${z}`} rotation-x={-Math.PI / 2} position={[x, 0.028, z]}>
                        <planeGeometry args={[s, s]} />
                        <meshBasicMaterial color="#1C1730" />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

const Gate = ({ index, next, finish }) => {
    const marker = useRef();
    const lit = next === index;
    const span = TRACK.halfWidth + 0.2;
    useFrame(({ clock }) => {
        if (!marker.current) return;
        marker.current.rotation.y = clock.elapsedTime * 2.4;
        marker.current.position.y = 3.05 + Math.sin(clock.elapsedTime * 3) * 0.12;
    });
    const color = lit ? ORANGE : finish ? "#FFFFFF" : "#5B5375";
    return (
        <group {...acrossTrack(gateAngle(index))}>
            <Shadowed>
                {[-1, 1].map((s) => (
                    <Box key={s} args={[0.2, 2.5, 0.2]} position={[s * span, 1.25, 0]} color="#2A2340" />
                ))}
            </Shadowed>
            <mesh position={[0, 2.45, 0]}>
                <boxGeometry args={[span * 2 + 0.2, 0.22, 0.24]} />
                <meshStandardMaterial color={color} emissive={lit ? ORANGE : "#000000"} emissiveIntensity={lit ? 1.6 : 0} toneMapped={!lit} />
            </mesh>
            {lit && (
                <mesh ref={marker}>
                    <octahedronGeometry args={[0.28, 0]} />
                    <meshBasicMaterial color={ORANGE} toneMapped={false} />
                </mesh>
            )}
        </group>
    );
};

// A glowing strip of chevrons pointing the way round.
const BoostPad = ({ angle }) => (
    <group {...acrossTrack(angle)}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <planeGeometry args={[TRACK.halfWidth * 1.2, BOOST_LENGTH]} />
            <meshBasicMaterial color="#1C1730" />
        </mesh>
        {[-0.45, 0, 0.45].map((z) => (
            <mesh key={z} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <circleGeometry args={[0.36, 3]} />
                <GlowMat color="#22D3EE" strength={3} />
            </mesh>
        ))}
    </group>
);

export const Race = () => {
    const game = useRef(null);
    const active = useArcade((s) => s.active === "race");
    const run = useArcade((s) => s.run);
    const next = useArcade((s) => (s.active === "race" ? s.detail?.gate ?? gateOf(0) : null));

    useEffect(() => {
        if (!active) {
            game.current = null;
            return;
        }
        const start = gateAngle(0) - 0.22;
        const [lx, lz] = trackPoint(start);
        const [x, z] = toWorld(lx, lz);
        const rotY = worldYaw(Math.cos(start), -Math.sin(start));
        arcadeLink.teleport = { x, z, rotY };
        arcadeLink.lock = { x, z, rotY };
        game.current = { count: COUNTDOWN, time: 0, checkpoint: 0, shown: -1 };
        playSound("beep");
        useArcade.getState().update({ detail: { gate: gateOf(0), checkpoint: 0, total: CHECKPOINTS, lap: 1, laps: TRACK.laps } });
    }, [active, run]);

    useFrame((_, rawDt) => {
        const g = game.current;
        if (!g) return;
        const dt = Math.min(rawDt, 0.1);
        const store = useArcade.getState();
        if (store.status === "countdown") {
            if (tickCountdown(g, dt)) arcadeLink.lock = null;
            return;
        }
        if (store.status !== "playing") return;

        g.time += dt;
        const shown = Math.floor(g.time * 20);
        if (shown !== g.shown) {
            g.shown = shown;
            store.update({ time: g.time });
        }

        const gate = gateOf(g.checkpoint);
        const [gx, gz] = toWorld(...trackPoint(gateAngle(gate)));
        if (Math.hypot(playerState.x - gx, playerState.z - gz) > GATE_REACH) return;

        g.checkpoint += 1;
        const lap = Math.floor(g.checkpoint / TRACK.gates) + 1;
        if (g.checkpoint === CHECKPOINTS) {
            playSound("cheer");
            game.current = null;
            store.finish(Math.round(g.time * 100) / 100);
            return;
        }
        playSound("gate");
        if (g.checkpoint % TRACK.gates === 0) {
            store.say(lap === TRACK.laps ? "game.finalLap" : "game.lap", { n: lap, total: TRACK.laps }, ORANGE);
        }
        store.update({ detail: { gate: gateOf(g.checkpoint), checkpoint: g.checkpoint, total: CHECKPOINTS, lap, laps: TRACK.laps } });
    });

    return (
        <group>
            <Track />
            {Array.from({ length: TRACK.gates }, (_, i) => (
                <Gate key={i} index={i} next={next} finish={i === 0} />
            ))}
            {BOOST_ANGLES.map((a) => (
                <BoostPad key={a} angle={a} />
            ))}
            {!active && <KartModel position={[PARKED_KART.x, 0, PARKED_KART.z]} rotation-y={PARKED_KART.rot} />}
        </group>
    );
};
