// Hypatia: an observatory on a small hill, named after the astronomer,
// with planets orbiting the dome.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cyl, GlowMat, Mat, Shadowed } from "../parts";
import { usePalette } from "../theme";

const WALL = "#F4EEFB";
const PURPLE = "#7E4BD1";
const ORCHID = "#B24BD8";
const PINK = "#F29BD4";

const PLANETS = [
    { color: "#F472B6", size: 0.3, speed: 0.5, ring: false },
    { color: "#FCD34D", size: 0.38, speed: 0.32, ring: true },
    { color: "#67E8F9", size: 0.22, speed: 0.75, ring: false },
];

const Orrery = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((planet, i) => {
            const a = t * PLANETS[i].speed + i * 2.1;
            planet.position.set(Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3);
            planet.rotation.y = t;
        });
    });
    return (
        <group position={[0, 4.4, -0.3]} rotation={[0.28, 0, 0.12]}>
            <mesh rotation-x={Math.PI / 2}>
                <torusGeometry args={[3.3, 0.025, 6, 80]} />
                <GlowMat color="#E9D5FF" strength={3} />
            </mesh>
            <group ref={ref}>
                {PLANETS.map((p, i) => (
                    <group key={i}>
                        <mesh castShadow>
                            <icosahedronGeometry args={[p.size, 1]} />
                            <GlowMat color={p.color} strength={1.2} />
                        </mesh>
                        {p.ring && (
                            <mesh rotation-x={1.2}>
                                <torusGeometry args={[p.size * 1.6, 0.04, 4, 32]} />
                                <Mat color="#FFF1C1" />
                            </mesh>
                        )}
                    </group>
                ))}
            </group>
        </group>
    );
};

const TWINKLE_SPOTS = [
    [-2.2, 6.2, -1],
    [2.4, 6.6, -0.6],
    [0.6, 7.2, -1.8],
    [-1.2, 5.6, 1.4],
    [1.8, 5.4, 1.2],
];

const Twinkles = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((star, i) => {
            star.scale.setScalar(0.6 + Math.sin(t * 3 + i * 1.7) * 0.4);
            star.rotation.y = t + i;
        });
    });
    return (
        <group ref={ref}>
            {TWINKLE_SPOTS.map((p, i) => (
                <mesh key={i} position={p}>
                    <octahedronGeometry args={[0.13]} />
                    <GlowMat color="#FFF3B0" strength={8} />
                </mesh>
            ))}
        </group>
    );
};

export const Observatory = () => {
    const p = usePalette();
    return (
        <group>
            <mesh position={[0, 0, -0.3]} scale={[1, 0.22, 1]} receiveShadow>
                <sphereGeometry args={[3.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Mat color={p.grassDark} />
            </mesh>
            <Shadowed>
                <Cyl args={[2.1, 2.2, 3.2, 20]} position={[0, 1.6, -0.3]} color={WALL} />
                <Cyl args={[2.18, 2.18, 0.3, 20]} position={[0, 3.25, -0.3]} color={ORCHID} />
                <mesh position={[0, 3.4, -0.3]}>
                    <sphereGeometry args={[2.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <Mat color={PURPLE} roughness={0.5} metalness={0.15} />
                </mesh>
                <group position={[0, 4.4, 0.35]} rotation-x={-0.8}>
                    <Cyl args={[0.22, 0.3, 2.4, 12]} position={[0, 0.9, 0]} color={PINK} />
                    <Cyl args={[0.28, 0.28, 0.18, 12]} position={[0, 2.1, 0]} color={WALL} />
                </group>

                {/* Arched door and steps */}
                <Box args={[0.9, 1.45, 0.12]} position={[0, 0.72, 1.82]} color={PURPLE} />
                <mesh position={[0, 1.44, 1.82]} rotation-x={Math.PI / 2}>
                    <cylinderGeometry args={[0.45, 0.45, 0.12, 14, 1, false, Math.PI / 2, Math.PI]} />
                    <Mat color={PURPLE} />
                </mesh>
                <Box args={[1.5, 0.16, 0.55]} position={[0, 0.08, 2.15]} color="#E4DAF2" />
            </Shadowed>

            {[-0.8, 0.8].map((a) => (
                <mesh key={a} position={[Math.sin(a) * 2.14, 2.3, -0.3 + Math.cos(a) * 2.14]} rotation={[Math.PI / 2, 0, -a]}>
                    <cylinderGeometry args={[0.24, 0.24, 0.08, 16]} />
                    <GlowMat color="#FFD89A" strength={1} />
                </mesh>
            ))}

            <Orrery />
            <Twinkles />
        </group>
    );
};
