// ParamTech: a tech lab with a honeycomb facade, a satellite dish and
// envelopes flying out of it (the HTML mailing tool).
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { Box, Cyl, GlowMat, Mat, Shadowed } from "../parts";

const WHITE = "#F2F5F9";
const TEAL = "#12B5A5";
const TEAL_LIGHT = "#7DE3D6";
const VIOLET = "#6D4AFF";
const SLATE = "#1F2937";

const HEXES = [
    [0, 1.0, TEAL],
    [0.66, 1.0, VIOLET],
    [1.32, 1.0, TEAL_LIGHT],
    [0.33, 1.57, TEAL_LIGHT],
    [0.99, 1.57, TEAL],
    [1.65, 1.57, VIOLET],
    [0, 2.14, VIOLET],
    [0.66, 2.14, TEAL_LIGHT],
    [1.32, 2.14, TEAL],
];

const Envelopes = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((env, i) => {
            const a = t * 0.5 + (i * Math.PI) / 2;
            env.position.set(Math.sin(a) * 3.5, 3.8 + Math.sin(t * 2 + i) * 0.35, -0.4 + Math.cos(a) * 2.7);
            env.rotation.set(Math.sin(t * 3 + i) * 0.15, a + Math.PI / 2, Math.sin(t * 2 + i) * 0.1);
        });
    });
    return (
        <group ref={ref}>
            {[0, 1, 2, 3].map((i) => (
                <group key={i}>
                    <Box args={[0.5, 0.34, 0.03]} color="#FFFFFF" castShadow />
                    <Box args={[0.3, 0.035, 0.035]} position={[-0.11, 0.06, 0.02]} rotation-z={-0.6} color={TEAL} />
                    <Box args={[0.3, 0.035, 0.035]} position={[0.11, 0.06, 0.02]} rotation-z={0.6} color={TEAL} />
                </group>
            ))}
        </group>
    );
};

const Dish = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 1.2;
    });
    return (
        <group position={[1.2, 3.0, -1.2]}>
            <Cyl args={[0.06, 0.08, 0.5, 6]} position={[0, 0.25, 0]} color="#CBD5E1" />
            <group ref={ref} position={[0, 0.55, 0]}>
                <mesh rotation-x={-0.9} castShadow>
                    <sphereGeometry args={[0.8, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.32]} />
                    <Mat color="#E2E8F0" side={DoubleSide} />
                </mesh>
                <Cyl args={[0.03, 0.03, 0.6, 6]} position={[0, 0.2, 0.2]} rotation-x={0.7} color="#94A3B8" />
            </group>
        </group>
    );
};

export const ParamTechLab = () => (
    <group>
        <Shadowed>
            <Box args={[4.9, 0.25, 3.3]} position={[0, 0.125, -0.4]} color="#CBD5E1" />
            <Box args={[4.8, 2.7, 3.2]} position={[0, 1.35, -0.4]} color={WHITE} />
            <Box args={[4.95, 0.3, 3.35]} position={[0, 2.85, -0.4]} color={TEAL} />
            {HEXES.map(([x, y, color], i) => (
                <Cyl key={i} args={[0.34, 0.34, 0.1, 6]} position={[x - 0.2, y, 1.22]} rotation-x={Math.PI / 2} color={color} />
            ))}
            <Cyl args={[0.04, 0.06, 1.6, 6]} position={[-1.8, 3.8, -1.4]} color="#94A3B8" />
            <Box args={[0.8, 1.7, 0.7]} position={[3.0, 0.85, 0.6]} color={SLATE} />
        </Shadowed>

        <Box args={[1, 1.8, 0.08]} position={[-1.5, 0.9, 1.22]}>
            <GlowMat color="#BFF6EE" strength={1.2} />
        </Box>
        {[0.5, 0.8, 1.1, 1.4].map((y) => (
            <Box key={y} args={[0.5, 0.05, 0.02]} position={[3.0, y, 0.96]}>
                <GlowMat color={TEAL} strength={12} />
            </Box>
        ))}
        <mesh position={[-1.8, 4.65, -1.4]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <GlowMat color={TEAL} strength={16} />
        </mesh>

        <Dish />
        <Envelopes />
    </group>
);
