// Nature Kahve: an espresso-wood café with a giant steaming cup on the roof,
// coffee beans orbiting it and sacks of beans by the door.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Ball, Box, Cyl, FONT, GlowMat, Mat, Shadowed } from "../parts";
import { loop } from "../utils";

const ESPRESSO = "#1E1612";
const WOOD = "#3A2A20";
const WOOD_LIGHT = "#4A362A";
const CREAM = "#F4EEE6";
const COPPER = "#B8622F";
const COPPER_DARK = "#9E5125";
const OLIVE = "#4F5B3A";
const SAND = "#D9CFC2";
const BURLAP = "#C8A77E";

const Steam = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        ref.current.children.forEach((puff, i) => {
            const p = loop(clock.elapsedTime, 0.28, i / 5);
            puff.position.set(Math.sin(p * 5 + i * 2) * 0.3, p * 2.2, Math.cos(p * 4 + i) * 0.2);
            puff.scale.setScalar(0.25 + p * 0.7);
            puff.material.opacity = 0.7 * Math.sin(p * Math.PI);
        });
    });
    return (
        <group ref={ref} position={[0, 1.45, 0]}>
            {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={i}>
                    <icosahedronGeometry args={[0.3, 1]} />
                    <meshStandardMaterial color="#FFFFFF" flatShading transparent depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
};

// A coffee bean: a flattened ellipsoid with a groove down the middle.
const Bean = () => (
    <group>
        <mesh scale={[1, 0.62, 1.4]} castShadow>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshStandardMaterial color="#5A3421" roughness={0.45} />
        </mesh>
        <Box args={[0.02, 0.02, 0.36]} position={[0, 0.1, 0]} color="#2B170E" />
    </group>
);

const OrbitingBeans = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((bean, i) => {
            const a = t * 0.7 + (i * Math.PI * 2) / 5;
            bean.position.set(Math.cos(a) * 1.9, 0.9 + Math.sin(t * 1.5 + i) * 0.25, Math.sin(a) * 1.9);
            bean.rotation.set(t + i, t * 1.3, i);
        });
    });
    return (
        <group ref={ref}>
            {[0, 1, 2, 3, 4].map((i) => (
                <Bean key={i} />
            ))}
        </group>
    );
};

const GiantCup = (props) => (
    <group {...props}>
        <Shadowed>
            <Cyl args={[1.35, 1.15, 0.14, 28]} position={[0, 0.07, 0]} color={CREAM} />
            <Cyl args={[1.0, 0.72, 1.25, 28]} position={[0, 0.76, 0]} color="#FBF7F1" />
            <Cyl args={[0.98, 0.93, 0.14, 28]} position={[0, 1.08, 0]} color={COPPER} />
            <mesh position={[0.95, 0.78, 0]} rotation-z={-Math.PI / 2}>
                <torusGeometry args={[0.34, 0.09, 8, 18, Math.PI]} />
                <Mat color="#FBF7F1" />
            </mesh>
        </Shadowed>
        <Cyl args={[0.93, 0.93, 0.03, 28]} position={[0, 1.38, 0]} color="#6B4128" />
        <Cyl args={[0.5, 0.5, 0.035, 20]} position={[0, 1.39, 0]} color="#C99A6B" />
        <Steam />
        <OrbitingBeans />
    </group>
);

const SACKS = [
    [-0.35, 0, 0.1, 0.2],
    [0.4, 0, -0.1, -0.3],
    [0, 0.62, 0, 0.1],
];

export const NatureCafe = () => (
    <group>
        <Shadowed>
            <Box args={[4.6, 0.3, 3.6]} position={[0, 0.15, -0.4]} color={SAND} />
            <Box args={[4.2, 2.8, 3.2]} position={[0, 1.7, -0.4]} color={WOOD} />
            {[-1.8, -1.2, 0.35, 0.95, 1.9].map((x) => (
                <Box key={x} args={[0.06, 2.8, 0.04]} position={[x, 1.7, 1.21]} color={WOOD_LIGHT} />
            ))}
            <Box args={[4.35, 0.22, 3.35]} position={[0, 3.2, -0.4]} color={COPPER} />
            <Box args={[4.5, 0.18, 3.6]} position={[0, 3.4, -0.4]} color={ESPRESSO} />

            {/* Café window and door */}
            <Box args={[2.3, 1.45, 0.06]} position={[-0.55, 1.55, 1.22]} color={CREAM} />
            <Box args={[0.85, 1.8, 0.08]} position={[1.45, 1.2, 1.22]} color={COPPER_DARK} />
            <Box args={[0.45, 0.6, 0.1]} position={[1.45, 1.55, 1.23]} color={CREAM} />
            <Ball radius={0.05} position={[1.2, 1.15, 1.28]} color="#E8C170" />
            {Array.from({ length: 7 }, (_, i) => (
                <Box
                    key={i}
                    args={[0.34, 0.06, 0.9]}
                    position={[-1.57 + i * 0.34, 2.55, 1.6]}
                    rotation-x={0.38}
                    color={i % 2 ? CREAM : COPPER}
                />
            ))}

            {/* Rooftop sign */}
            {[-1.3, 1.3].map((x) => (
                <Box key={x} args={[0.08, 0.5, 0.08]} position={[x, 3.7, 0.95]} color={ESPRESSO} />
            ))}
            <Box args={[3.2, 0.6, 0.1]} position={[0, 4.05, 0.95]} color={CREAM} />

            {/* Pedestal lifting the cup above the sign */}
            <Cyl args={[0.45, 0.65, 1.0, 12]} position={[0, 3.99, -0.9]} color={COPPER_DARK} />

            {/* Sacks of beans */}
            <group position={[-3.0, 0, 0.6]}>
                {SACKS.map(([x, y, z, r], i) => (
                    <group key={i} position={[x, y, z]} rotation-y={r}>
                        <Ball radius={0.42} detail={1} position={[0, 0.36, 0]} scale={[1, 0.9, 0.8]} color={BURLAP} />
                        <Cyl args={[0.12, 0.2, 0.22, 8]} position={[0, 0.74, 0]} color="#B08E62" />
                    </group>
                ))}
            </group>

            {/* Café table with umbrella */}
            <group position={[-3.0, 0, 2.3]}>
                <Cyl args={[0.5, 0.5, 0.06, 16]} position={[0, 0.76, 0]} color={ESPRESSO} />
                <Cyl args={[0.05, 0.05, 2.2, 6]} position={[0, 1.1, 0]} color={ESPRESSO} />
                <Cyl args={[0.28, 0.3, 0.05, 12]} position={[0, 0.03, 0]} color={ESPRESSO} />
                <mesh position={[0, 2.25, 0]}>
                    <coneGeometry args={[1.15, 0.45, 8]} />
                    <Mat color={COPPER} />
                </mesh>
                {[-0.7, 0.7].map((x) => (
                    <Cyl key={x} args={[0.2, 0.18, 0.45, 10]} position={[x, 0.23, 0.1]} color={OLIVE} />
                ))}
                <Cyl args={[0.08, 0.06, 0.1, 10]} position={[0.15, 0.84, 0.1]} color="#FBF7F1" />
            </group>

            {/* Potted olive by the door */}
            <Cyl args={[0.24, 0.18, 0.4, 8]} position={[2.45, 0.2, 1.5]} color={COPPER_DARK} />
            <Ball radius={0.36} position={[2.45, 0.66, 1.5]} color={OLIVE} />
        </Shadowed>

        <Box args={[2.1, 1.25, 0.08]} position={[-0.55, 1.55, 1.24]}>
            <GlowMat color="#FFD9A0" strength={1.3} />
        </Box>
        <Text font={FONT} fontSize={0.34} letterSpacing={0.08} color={ESPRESSO} position={[0, 4.05, 1.01]}>
            NATURE KAHVE
        </Text>
        <GiantCup position={[0, 4.49, -0.9]} />
    </group>
);
