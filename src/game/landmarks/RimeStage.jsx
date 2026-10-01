// Rime Stream: a concert stage with a live dashboard screen and moving lights.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import { Ball, Box, Cyl, GlowMat, Shadowed } from "../parts";
import { usePoster } from "../textures";
import { loop } from "../utils";

const DARK = "#2B2440";
const DARKER = "#1C1729";
const METAL = "#3D3553";
const PINK = "#FF4F8B";
const PURPLE = "#A970FF";
const CYAN = "#3FD8EC";

const Spotlight = ({ x, color, phase }) => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.45;
        ref.current.rotation.x = -0.45 + Math.sin(t * 0.7 + phase * 2) * 0.15;
    });
    return (
        <group ref={ref} position={[x, 4.3, -2.0]}>
            <Cyl args={[0.16, 0.22, 0.35, 10]} color={METAL} />
            <mesh position={[0, -2.1, 0]} userData={{ noShadow: true }}>
                <coneGeometry args={[0.95, 4, 24, 1, true]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.16}
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={DoubleSide}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
};

const Note = ({ color, offset, x }) => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const p = loop(clock.elapsedTime, 0.18, offset);
        ref.current.position.set(x + Math.sin(p * 8 + offset * 10) * 0.35, 1.2 + p * 4.2, -0.4 + p * 0.6);
        ref.current.scale.setScalar(Math.sin(p * Math.PI) * 1.1);
        ref.current.rotation.z = Math.sin(p * 6) * 0.3;
    });
    return (
        <group ref={ref}>
            <mesh scale={[1.3, 1, 0.6]}>
                <sphereGeometry args={[0.13, 12, 8]} />
                <GlowMat color={color} strength={6} />
            </mesh>
            <Box args={[0.035, 0.5, 0.035]} position={[0.15, 0.25, 0]}>
                <GlowMat color={color} strength={6} />
            </Box>
            <Box args={[0.22, 0.06, 0.035]} position={[0.24, 0.46, 0]} rotation-z={-0.4}>
                <GlowMat color={color} strength={6} />
            </Box>
        </group>
    );
};

export const RimeStage = () => {
    const screen = usePoster("/img/posters/rime-screen.webp");
    return (
        <group>
            <Shadowed>
                <Box args={[6.2, 0.6, 4]} position={[0, 0.3, -0.6]} color={DARK} />
                <Box args={[1.6, 0.3, 0.5]} position={[0, 0.15, 1.65]} color={DARK} />
                <Box args={[5.6, 3.2, 0.3]} position={[0, 2.2, -2.45]} color={DARKER} />

                {/* Truss towers and beam */}
                {[-3.1, 3.1].map((x) => (
                    <Box key={x} args={[0.35, 4.6, 0.35]} position={[x, 2.3, -2.2]} color={METAL} />
                ))}
                <Box args={[6.6, 0.35, 0.35]} position={[0, 4.5, -2.2]} color={METAL} />

                {/* Speakers */}
                {[-3.1, 3.1].map((x) => (
                    <group key={x} position={[x, 0, 0.9]}>
                        <Box args={[1.0, 1.5, 0.8]} position={[0, 0.75, 0]} color={DARKER} />
                        <Cyl args={[0.3, 0.3, 0.06, 16]} position={[0, 0.5, 0.41]} rotation-x={Math.PI / 2} color="#4B4262" />
                        <Cyl args={[0.15, 0.15, 0.06, 16]} position={[0, 1.12, 0.41]} rotation-x={Math.PI / 2} color="#4B4262" />
                    </group>
                ))}

                {/* Microphone */}
                <Cyl args={[0.2, 0.2, 0.04, 12]} position={[0, 0.62, 0.5]} color={METAL} />
                <Cyl args={[0.02, 0.02, 1.2, 6]} position={[0, 1.2, 0.5]} color="#9B97A8" />
                <Ball radius={0.08} detail={1} position={[0, 1.84, 0.5]} color="#2E2A38" />
            </Shadowed>

            {/* Neon edges */}
            <Box args={[6.2, 0.07, 0.07]} position={[0, 0.58, 1.42]}>
                <GlowMat color={PINK} strength={10} />
            </Box>
            {[-3.1, 3.1].map((x) => (
                <Box key={x} args={[0.07, 4.4, 0.07]} position={[x, 2.3, -2.0]}>
                    <GlowMat color={PURPLE} strength={10} />
                </Box>
            ))}

            {/* Live dashboard screen */}
            <mesh position={[0, 2.25, -2.28]}>
                <planeGeometry args={[5.0, 2.8]} />
                <meshBasicMaterial map={screen} toneMapped={false} />
            </mesh>

            <Spotlight x={-2} color={PINK} phase={0} />
            <Spotlight x={0} color={CYAN} phase={2} />
            <Spotlight x={2} color={PURPLE} phase={4} />

            <Note color={PINK} offset={0} x={-1.4} />
            <Note color={CYAN} offset={0.33} x={0.2} />
            <Note color={PURPLE} offset={0.66} x={1.5} />
        </group>
    );
};
