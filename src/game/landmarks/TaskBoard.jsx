// Task Tracker: a giant clipboard in the app's dark teal theme, with tasks
// ticking themselves off, a filling progress bar and floating sticky notes.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import { Box, Cyl, FONT, GlowMat, Mat, Shadowed } from "../parts";
import { loop } from "../utils";

const BOARD = "#0E1A19";
const PAPER = "#132A28";
const TEAL = "#2DD4BF";
const TEAL_DARK = "#0F766E";
const METAL = "#94A3B8";

// [priority colour, is done]
const ROWS = [
    ["#F87171", false],
    ["#34D399", false],
    ["#FBBF24", true],
    ["#F87171", false],
];

const Check = () => (
    <group position={[0, 0, 0.03]}>
        <Box args={[0.05, 0.14, 0.02]} position={[-0.05, -0.02, 0]} rotation-z={0.8} color="#FFFFFF" />
        <Box args={[0.05, 0.26, 0.02]} position={[0.05, 0.02, 0]} rotation-z={-0.6} color="#FFFFFF" />
    </group>
);

// Rows tick themselves off one after another, then the list resets.
const TaskRows = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const p = loop(clock.elapsedTime, 0.12);
        ref.current.children.forEach((row, i) => {
            const done = ROWS[i][1] || p > 0.2 + i * 0.18;
            row.userData.box.material.emissiveIntensity = done ? 1.4 : 0.15;
            row.userData.check.visible = done;
            row.userData.line.scale.x = done ? 0.75 : 1;
        });
    });
    return (
        <group ref={ref}>
            {ROWS.map(([priority], i) => (
                <group
                    key={i}
                    position={[0, 1.05 - i * 0.62, 0]}
                    ref={(g) => {
                        if (!g) return;
                        g.userData.box = g.children[0];
                        g.userData.check = g.children[1];
                        g.userData.line = g.children[2];
                    }}
                >
                    <mesh position={[-1.0, 0, 0.02]}>
                        <boxGeometry args={[0.3, 0.3, 0.04]} />
                        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.15} toneMapped={false} />
                    </mesh>
                    <group position={[-1.0, 0, 0.02]}>
                        <Check />
                    </group>
                    <Box args={[1.2, 0.1, 0.02]} position={[0.0, 0.05, 0.02]} color="#CBD5E1" />
                    <Box args={[0.7, 0.07, 0.02]} position={[-0.25, -0.1, 0.02]} color="#64748B" />
                    <Box args={[0.36, 0.14, 0.03]} position={[0.95, 0.02, 0.02]}>
                        <GlowMat color={priority} strength={2} />
                    </Box>
                </group>
            ))}
        </group>
    );
};

const Progress = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const p = loop(clock.elapsedTime, 0.12);
        const fill = Math.min(1, 0.25 + Math.max(0, p - 0.2) * 1.4);
        ref.current.scale.x = fill;
        ref.current.position.x = -1.1 + 1.1 * fill;
    });
    return (
        <group position={[0, -1.55, 0.02]}>
            <Box args={[2.2, 0.14, 0.02]} color="#1F3A37" />
            <mesh ref={ref} position={[0, 0, 0.015]}>
                <boxGeometry args={[2.2, 0.14, 0.02]} />
                <GlowMat color={TEAL} strength={6} />
            </mesh>
        </group>
    );
};

const NOTES = [
    ["#FDE68A", "HIGH"],
    ["#99F6E4", "TODO"],
    ["#FBCFE8", "DONE"],
];

const StickyNotes = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((note, i) => {
            const a = t * 0.5 + (i * Math.PI * 2) / 3;
            note.position.set(Math.cos(a) * 2.3, 2.4 + i * 0.7 + Math.sin(t * 1.4 + i) * 0.2, -0.5 + Math.sin(a) * 1.5);
            note.rotation.set(Math.sin(t + i) * 0.2, a + Math.PI / 2, Math.sin(t * 0.8 + i) * 0.25);
        });
    });
    return (
        <group ref={ref}>
            {NOTES.map(([color, word]) => (
                <group key={word}>
                    <Box args={[0.6, 0.6, 0.03]} color={color} castShadow />
                    <Text font={FONT} fontSize={0.16} color="#334155" position={[0, 0, 0.02]}>
                        {word}
                    </Text>
                </group>
            ))}
        </group>
    );
};

export const TaskBoard = () => (
    <group>
        <Shadowed>
            <Cyl args={[1.6, 1.75, 0.3, 32]} position={[0, 0.15, -0.5]} color="#1E2B2A" />
            {[-0.9, 0.9].map((x) => (
                <Box key={x} args={[0.14, 1.2, 0.14]} position={[x, 0.85, -0.65]} color={METAL} />
            ))}
        </Shadowed>

        <group position={[0, 3.1, -0.6]} rotation-x={-0.08}>
            <Shadowed>
                <RoundedBox args={[3.1, 4.1, 0.22]} radius={0.18} smoothness={3}>
                    <meshStandardMaterial color={BOARD} roughness={0.5} />
                </RoundedBox>
                <Box args={[1.2, 0.36, 0.3]} position={[0, 2.0, 0.05]} color={METAL} />
                <mesh position={[0, 2.25, 0.05]} rotation-x={Math.PI / 2}>
                    <torusGeometry args={[0.2, 0.05, 8, 20]} />
                    <Mat color={METAL} />
                </mesh>
            </Shadowed>
            <group position={[0, -0.15, 0.12]}>
                <Box args={[2.75, 3.55, 0.02]} color={PAPER} />
                <Text font={FONT} fontSize={0.26} color={TEAL} anchorX="left" position={[-1.2, 1.55, 0.02]}>
                    Task Tracker
                </Text>
                <Box args={[0.5, 0.18, 0.02]} position={[0.95, 1.55, 0.02]} color={TEAL_DARK} />
                <Text font={FONT} fontSize={0.11} color="#CCFBF1" position={[0.95, 1.55, 0.035]}>
                    TR · EN
                </Text>
                <group position={[0, 0.05, 0]}>
                    <TaskRows />
                </group>
                <Progress />
            </group>
        </group>

        <StickyNotes />
    </group>
);
