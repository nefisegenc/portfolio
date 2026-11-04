// The arcade island's scenery: the island itself, the rope bridge, the
// entrance arch, the high-score board and the pads that start each game.
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import { MathUtils, Object3D } from "three";
import {
    ARCADE,
    ARCADE_COLOR,
    ARCADE_LAMPS,
    ARCADE_RADIUS,
    ARCADE_TREES,
    BOARD,
    BRIDGE_END,
    BRIDGE_HALF_WIDTH,
    BRIDGE_START,
    ENTRY,
    PAD_RADIUS,
    PARKED_KART,
    RACE_SIGN,
    SIGNPOST,
    bridgeDir,
    bridgePoint,
    games,
} from "../../data/arcade";
import { seeded } from "../../data/world";
import { useStore } from "../../store";
import { useT } from "../../i18n";
import { TopLayer, Underside } from "../Island";
import { Ball, Box, Cyl, FONT, GlowMat, Shadowed } from "../parts";
import { formatScore } from "./format";
import { KartModel } from "./Props";
import { useArcade } from "./state";

const WOOD = "#8B5E3C";
const WOOD_LIGHT = "#B98454";
const ROPE = "#D9C29A";

const PATCHES = (() => {
    const rand = seeded(7);
    return Array.from({ length: 6 }, () => {
        const a = rand() * Math.PI * 2;
        const r = 6 + rand() * 5;
        return { x: Math.sin(a) * r, z: Math.cos(a) * r, radius: 1 + rand() * 1.2 };
    });
})();

// --- Bridge -----------------------------------------------------------------

const PLANK_GAP = 0.42;

const Bridge = () => {
    const ref = useRef();
    const length = BRIDGE_END - BRIDGE_START;
    const count = Math.floor(length / PLANK_GAP);
    const planks = useMemo(() => {
        const rand = seeded(11);
        return Array.from({ length: count }, (_, i) => ({
            z: BRIDGE_START + (i + 0.5) * PLANK_GAP,
            tilt: (rand() - 0.5) * 0.06,
            shift: (rand() - 0.5) * 0.08,
        }));
    }, [count]);
    useLayoutEffect(() => {
        const d = new Object3D();
        planks.forEach((p, i) => {
            d.position.set(p.shift, 0.02, p.z);
            d.rotation.set(0, p.tilt, 0);
            d.updateMatrix();
            ref.current.setMatrixAt(i, d.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
        ref.current.computeBoundingSphere();
    }, [planks]);

    const posts = [];
    for (let z = BRIDGE_START; z <= BRIDGE_END + 0.01; z += length / 6) posts.push(z);
    const side = BRIDGE_HALF_WIDTH + 0.3;
    return (
        <group rotation-y={Math.atan2(bridgeDir.x, bridgeDir.z)}>
            <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
                <boxGeometry args={[side * 2 - 0.1, 0.12, PLANK_GAP - 0.06]} />
                <meshStandardMaterial color={WOOD_LIGHT} flatShading roughness={0.9} />
            </instancedMesh>
            {[-1, 1].map((s) => (
                <group key={s}>
                    <Box args={[0.14, 0.14, length]} position={[s * (side - 0.1), -0.08, BRIDGE_START + length / 2]} color={WOOD} />
                    {posts.map((z) => (
                        <Box key={z} args={[0.14, 1.1, 0.14]} position={[s * side, 0.5, z]} color={WOOD} castShadow />
                    ))}
                    <Cyl args={[0.035, 0.035, length, 5]} position={[s * side, 0.95, BRIDGE_START + length / 2]} rotation-x={Math.PI / 2} color={ROPE} />
                    <Cyl args={[0.025, 0.025, length, 5]} position={[s * side, 0.55, BRIDGE_START + length / 2]} rotation-x={Math.PI / 2} color={ROPE} />
                </group>
            ))}
        </group>
    );
};

// Arrow sign on the main island pointing the way to the bridge.
const Signpost = () => {
    const t = useT();
    const [x, z] = bridgePoint(SIGNPOST.along, SIGNPOST.side);
    return (
        <group position={[x, 0, z]} rotation-y={Math.atan2(-bridgeDir.x, -bridgeDir.z)}>
            <Shadowed>
                <Box args={[0.14, 2.1, 0.14]} position={[0, 1.05, 0]} color={WOOD} />
                <group position={[0, 1.65, 0.1]}>
                    <Box args={[1.9, 0.52, 0.08]} position={[0.15, 0, 0]} color="#2A2340" />
                    <mesh position={[-0.98, 0, 0]} rotation-z={Math.PI / 2}>
                        <coneGeometry args={[0.3, 0.36, 3]} />
                        <meshStandardMaterial color="#2A2340" flatShading />
                    </mesh>
                </group>
            </Shadowed>
            <Text font={FONT} fontSize={0.24} color={ARCADE_COLOR} position={[0.1, 1.66, 0.16]} anchorY="middle">
                {t("arcade.signpost")}
            </Text>
        </group>
    );
};

// --- Arcade island ------------------------------------------------------------

const Arch = () => {
    const t = useT();
    return (
        <group position={[ENTRY.x, 0, ENTRY.z]}>
            <Shadowed>
                {[-1, 1].map((s) => (
                    <group key={s} position={[s * 1.95, 0, 0]}>
                        <Box args={[0.42, 3.1, 0.42]} position={[0, 1.55, 0]} color="#2A2340" />
                        <Ball radius={0.3} detail={1} position={[0, 3.35, 0]}>
                            <GlowMat color={s < 0 ? "#22D3EE" : "#FACC15"} strength={2} />
                        </Ball>
                    </group>
                ))}
                <Box args={[4.6, 0.8, 0.36]} position={[0, 2.75, 0]} color="#2A2340" />
            </Shadowed>
            {[1, -1].map((s) => (
                <Text
                    key={s}
                    font={FONT}
                    fontSize={0.46}
                    position={[0, 2.78, s * 0.2]}
                    rotation-y={s < 0 ? Math.PI : 0}
                    anchorY="middle"
                >
                    {t("arcade.name").toUpperCase()}
                    <GlowMat color={ARCADE_COLOR} strength={2.4} />
                </Text>
            ))}
        </group>
    );
};

const BoardLine = ({ y, color, label, value }) => (
    <group position={[0, y, 0.17]}>
        <Text font={FONT} fontSize={0.27} color="#FFFFFF" anchorX="left" anchorY="middle" position={[-1.45, 0, 0]}>
            {label}
        </Text>
        <Text font={FONT} fontSize={0.3} color={color} anchorX="right" anchorY="middle" position={[1.45, 0, 0]}>
            {value}
        </Text>
    </group>
);

const ScoreBoard = () => {
    const best = useArcade((s) => s.best);
    const t = useT();
    return (
        <group position={[BOARD.x, 0, BOARD.z]}>
            <Shadowed>
                {[-1.45, 1.45].map((x) => (
                    <Box key={x} args={[0.2, 2.4, 0.2]} position={[x, 1.2, -0.05]} color="#3B3350" />
                ))}
                <Box args={[3.5, 2.3, 0.26]} position={[0, 2.95, 0]} color="#1C1730" />
            </Shadowed>
            <Box args={[3.62, 0.08, 0.3]} position={[0, 4.12, 0]}>
                <GlowMat color={ARCADE_COLOR} strength={2} />
            </Box>
            <Text font={FONT} fontSize={0.34} position={[0, 3.75, 0.17]} anchorY="middle">
                {t("arcade.board")}
                <GlowMat color="#FACC15" strength={1.6} />
            </Text>
            {games.map((g, i) => (
                <BoardLine
                    key={g.id}
                    y={3.2 - i * 0.48}
                    color={g.color}
                    label={t(`game.${g.id}`)}
                    value={best[g.id] === undefined ? "—" : formatScore(g.id, best[g.id])}
                />
            ))}
        </group>
    );
};

const Pad = ({ game }) => {
    const ref = useRef();
    const t = useT();
    const active = useArcade((s) => s.nearby === game.id && !s.active);
    // Labels step aside while a game runs so they don't block its camera.
    const gameRunning = useArcade((s) => Boolean(s.active));
    const playing = useStore((s) => s.phase === "playing") && !gameRunning;
    const { x, z } = game.pad;
    useFrame(({ clock }) => {
        const target = active ? 1.12 + Math.sin(clock.elapsedTime * 5) * 0.05 : 1;
        ref.current.scale.setScalar(MathUtils.lerp(ref.current.scale.x, target, 0.15));
    });
    return (
        <group position={[x, 0, z]}>
            <group ref={ref} position-y={0.05}>
                <mesh rotation-x={-Math.PI / 2}>
                    <ringGeometry args={[PAD_RADIUS - 0.25, PAD_RADIUS, 40]} />
                    <meshBasicMaterial color={game.color} transparent opacity={active ? 0.95 : 0.65} toneMapped={false} />
                </mesh>
                <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
                    <circleGeometry args={[PAD_RADIUS - 0.25, 40]} />
                    <meshBasicMaterial color={game.color} transparent opacity={active ? 0.3 : 0.14} depthWrite={false} />
                </mesh>
            </group>
            <Html position={[0, 2.2, 0]} center distanceFactor={18} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                <div className={`landmark-label${active ? " is-active" : ""}${playing ? "" : " is-hidden"}`} style={{ "--c": game.color }}>
                    {t(`game.${game.id}`)}
                </div>
            </Html>
        </group>
    );
};

const Lamp = ({ x, z, color }) => (
    <group position={[x, 0, z]}>
        <Cyl args={[0.06, 0.09, 2.4, 6]} position={[0, 1.2, 0]} color="#3B3350" castShadow />
        <Ball radius={0.2} detail={1} position={[0, 2.5, 0]}>
            <GlowMat color={color} strength={1.8} />
        </Ball>
    </group>
);

const Tree = ({ x, z, s }) => (
    <Shadowed position={[x, 0, z]} scale={s}>
        <Cyl args={[0.14, 0.2, 1.2, 6]} position={[0, 0.6, 0]} color="#7D5A3C" />
        <mesh position={[0, 1.8, 0]}>
            <coneGeometry args={[0.9, 1.7, 7]} />
            <meshStandardMaterial color="#4F8F42" flatShading />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.65, 1.3, 7]} />
            <meshStandardMaterial color="#5E9E47" flatShading />
        </mesh>
    </Shadowed>
);

// Paths across the arcade, from the arch to each game.
const WALKWAYS = [
    [ENTRY.x, ENTRY.z + 1.5, BOARD.x, BOARD.z + 0.6],
    [0, 5.2, games[0].pad.x + 0.8, games[0].pad.z],
    [0, 2.8, games[2].pad.x - 0.6, games[2].pad.z + 0.4],
];

const Walkways = () =>
    WALKWAYS.map(([x1, z1, x2, z2], i) => {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return (
            <mesh
                key={i}
                position={[(x1 + x2) / 2, 0.014 + i * 0.001, (z1 + z2) / 2]}
                rotation={[-Math.PI / 2, 0, -Math.atan2(dx, dz)]}
                receiveShadow
            >
                <planeGeometry args={[1.5, Math.hypot(dx, dz)]} />
                <meshStandardMaterial color="#D6BF95" roughness={1} />
            </mesh>
        );
    });

// The race's kart waits by its pad under a sign pointing to the Sky Circuit.
const RaceCorner = () => {
    const t = useT();
    const racing = useArcade((s) => s.active === "race");
    return (
        <group>
            {!racing && <KartModel position={[PARKED_KART.x, 0, PARKED_KART.z]} rotation-y={PARKED_KART.rot} />}
            <group position={[RACE_SIGN.x, 0, RACE_SIGN.z]} rotation-y={RACE_SIGN.rot}>
                <Shadowed>
                    <Box args={[0.16, 2.6, 0.16]} position={[0, 1.3, 0]} color="#1C1730" />
                    <Box args={[2.4, 0.9, 0.12]} position={[0, 2.4, 0]} color="#1C1730" />
                </Shadowed>
                <Text font={FONT} fontSize={0.42} position={[0, 2.42, 0.07]} anchorY="middle">
                    {t("race.gp")}
                    <GlowMat color="#F97316" strength={2.4} />
                </Text>
            </group>
        </group>
    );
};

// Children are placed in arcade space.
export const ArcadeIsland = ({ children }) => (
    <>
        <Bridge />
        <Signpost />
        <group position={[ARCADE.x, 0, ARCADE.z]} rotation-y={ARCADE.rotY}>
            <TopLayer radius={ARCADE_RADIUS} patches={PATCHES} />
            <Underside radius={ARCADE_RADIUS} />
            <Walkways />
            <Arch />
            <ScoreBoard />
            <RaceCorner />
            {games.map((g) => (
                <Pad key={g.id} game={g} />
            ))}
            {ARCADE_LAMPS.map(([x, z, c]) => (
                <Lamp key={`${x}${z}`} x={x} z={z} color={c} />
            ))}
            {ARCADE_TREES.map(([x, z, s]) => (
                <Tree key={`${x}${z}`} x={x} z={z} s={s} />
            ))}
            {children}
        </group>
    </>
);
