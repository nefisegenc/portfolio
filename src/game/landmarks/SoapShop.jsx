// The Soap Opera: a Gaziantep stone house with olive trees and a giant soap bar.
import { RoundedBox, Text } from "@react-three/drei";
import { Ball, Box, Bubbles, FONT, Mat, OliveTree, Shadowed, Window } from "../parts";

const STONE = "#EFE4CF";
const STONE_DARK = "#D8C6A3";
const GREEN = "#5E8C3A";
const GREEN_DARK = "#44692A";
const CREAM = "#F6EFDF";
const SOAP = "#6F9B45";

const STONE_BLOCKS = [
    [-1.7, 0.9],
    [-0.95, 1.45],
    [1.25, 0.8],
    [1.85, 1.5],
    [-1.95, 2.55],
    [0.95, 2.6],
    [-0.55, 0.7],
];

const MINI_SOAPS = [
    [-0.2, 0.66, -0.1, "#7FA653"],
    [0.18, 0.66, 0.05, "#C9B4E6"],
    [0, 0.8, 0, "#EFE3C8"],
];

export const SoapShop = () => (
    <group>
        <Shadowed>
            <Box args={[4.8, 0.4, 3.9]} position={[0, 0.2, -0.4]} color={STONE_DARK} />
            <Box args={[4.4, 2.8, 3.5]} position={[0, 1.8, -0.4]} color={STONE} />
            {STONE_BLOCKS.map(([x, y], i) => (
                <Box key={i} args={[0.55, 0.26, 0.06]} position={[x, y, 1.37]} color={STONE_DARK} />
            ))}

            {/* Flat roof with a low parapet */}
            <Box args={[4.7, 0.22, 3.8]} position={[0, 3.3, -0.4]} color={STONE_DARK} />
            <Box args={[4.7, 0.35, 0.2]} position={[0, 3.55, 1.4]} color={STONE} />
            <Box args={[4.7, 0.35, 0.2]} position={[0, 3.55, -2.2]} color={STONE} />
            <Box args={[0.2, 0.35, 3.8]} position={[-2.25, 3.55, -0.4]} color={STONE} />
            <Box args={[0.2, 0.35, 3.8]} position={[2.25, 3.55, -0.4]} color={STONE} />

            {/* Arched green door */}
            <Box args={[1.4, 2.0, 0.08]} position={[0, 1.2, 1.37]} color={STONE_DARK} />
            <Box args={[1.0, 1.25, 0.1]} position={[0, 1.02, 1.4]} color={GREEN} />
            <mesh position={[0, 1.64, 1.4]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.5, 0.5, 0.1, 16, 1, false, Math.PI / 2, Math.PI]} />
                <Mat color={GREEN} />
            </mesh>
            <Ball radius={0.06} position={[0.32, 1.1, 1.47]} color="#D9B45A" />

            {/* Windows with shutters */}
            {[-1.45, 1.45].map((x) => (
                <group key={x} position={[x, 1.9, 1.36]}>
                    <Window w={0.62} h={0.8} frame={STONE_DARK} />
                    <Box args={[0.22, 0.9, 0.06]} position={[-0.47, 0, 0.04]} color={GREEN} />
                    <Box args={[0.22, 0.9, 0.06]} position={[0.47, 0, 0.04]} color={GREEN} />
                </group>
            ))}

            {/* Striped awning over the door */}
            {Array.from({ length: 6 }, (_, i) => (
                <Box
                    key={i}
                    args={[0.3, 0.06, 0.9]}
                    position={[-0.75 + i * 0.3, 2.42, 1.72]}
                    rotation-x={0.38}
                    color={i % 2 ? CREAM : GREEN}
                />
            ))}

            {/* Shop sign */}
            <Box args={[2.7, 0.5, 0.08]} position={[0, 2.93, 1.4]} color={GREEN_DARK} />

            {/* Giant soap bar on a pedestal */}
            <group position={[-3.1, 0, 1.6]} rotation-y={0.45}>
                <mesh position={[0, 0.25, 0]}>
                    <cylinderGeometry args={[0.72, 0.82, 0.5, 8]} />
                    <Mat color={STONE_DARK} />
                </mesh>
                <RoundedBox args={[1.5, 1.0, 0.55]} radius={0.14} smoothness={3} position={[0, 1.0, 0]}>
                    <meshStandardMaterial color={SOAP} roughness={0.55} />
                </RoundedBox>
                <Box args={[1.18, 0.7, 0.03]} position={[0, 1.0, 0.27]} color="#628C3B" />
            </group>

            {/* Crate of soaps */}
            <group position={[2.9, 0, 1.3]} rotation-y={-0.3}>
                <Box args={[0.9, 0.55, 0.7]} position={[0, 0.28, 0]} color="#B7895A" />
                <Box args={[0.92, 0.08, 0.72]} position={[0, 0.42, 0]} color="#9A6F45" />
                {MINI_SOAPS.map(([x, y, z, color], i) => (
                    <Box key={i} args={[0.3, 0.13, 0.2]} position={[x, y, z]} color={color} />
                ))}
            </group>
        </Shadowed>

        <Text font={FONT} fontSize={0.27} letterSpacing={0.06} color={CREAM} position={[0, 2.93, 1.45]}>
            THE SOAP OPERA
        </Text>
        <group position={[-3.1, 0, 1.6]} rotation-y={0.45}>
            <Text
                font={FONT}
                fontSize={0.2}
                lineHeight={0.95}
                textAlign="center"
                color="#9CC46F"
                position={[0, 1.0, 0.29]}
            >
                {"THE SOAP\nOPERA"}
            </Text>
            <Bubbles position={[0, 1.55, 0]} count={18} spread={1.1} height={4.8} />
        </group>

        <OliveTree position={[-3.4, 0, -2.3]} scale={1.1} rotation-y={0.6} />
        <OliveTree position={[3.3, 0, -2.0]} scale={1.25} rotation-y={2.1} />
        <OliveTree position={[3.6, 0, 0.4]} scale={0.8} rotation-y={4} />
    </group>
);
