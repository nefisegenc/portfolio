// Param: a violet fintech tower with coins orbiting it.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Box, Cyl, FONT, GlowMat, Shadowed } from "../parts";

const VIOLET = "#4B32C3";
const VIOLET_DARK = "#35228F";
const LILAC = "#B9A8FF";
const PODIUM = "#EAE6F7";
const GOLD = "#F6C445";

const Coins = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((coin, i) => {
            const a = t * 0.45 + (i * Math.PI * 2) / 3;
            coin.position.set(Math.cos(a) * 2.6, 2.6 + i * 2 + Math.sin(t * 1.3 + i) * 0.3, -0.3 + Math.sin(a) * 2.6);
            coin.rotation.y = t * 2 + i;
        });
    });
    return (
        <group ref={ref}>
            {[0, 1, 2].map((i) => (
                <group key={i}>
                    <mesh rotation-x={Math.PI / 2} castShadow>
                        <cylinderGeometry args={[0.45, 0.45, 0.1, 24]} />
                        <meshStandardMaterial color={GOLD} metalness={0.55} roughness={0.3} />
                    </mesh>
                    <mesh rotation-x={Math.PI / 2}>
                        <cylinderGeometry args={[0.32, 0.32, 0.12, 24]} />
                        <meshStandardMaterial color="#E4AC2A" metalness={0.55} roughness={0.35} />
                    </mesh>
                    <Text font={FONT} fontSize={0.34} color="#FFF3C4" position={[0, 0.02, 0.07]}>
                        P
                    </Text>
                    <Text font={FONT} fontSize={0.34} color="#FFF3C4" position={[0, 0.02, -0.07]} rotation-y={Math.PI}>
                        P
                    </Text>
                </group>
            ))}
        </group>
    );
};

const Beacon = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        ref.current.visible = Math.sin(clock.elapsedTime * 3) > -0.2;
    });
    return (
        <mesh ref={ref} position={[0, 10.8, -0.3]}>
            <sphereGeometry args={[0.13, 12, 8]} />
            <GlowMat color="#FF4D6D" strength={20} />
        </mesh>
    );
};

export const ParamTower = () => (
    <group>
        <Shadowed>
            <Box args={[4, 0.5, 4]} position={[0, 0.25, -0.3]} color={PODIUM} />
            <Box args={[1.6, 0.25, 0.5]} position={[0, 0.125, 1.95]} color={PODIUM} />
            <Box args={[2.8, 8.4, 2.8]} position={[0, 4.7, -0.3]} color={VIOLET} />
            <Box args={[3.1, 0.5, 3.1]} position={[0, 9.1, -0.3]} color={VIOLET_DARK} />
            <Cyl args={[0.05, 0.08, 1.4, 6]} position={[0, 10.05, -0.3]} color="#DDDAE8" />

            {/* Entrance canopy */}
            <Box args={[2, 0.12, 1.1]} position={[0, 1.75, 1.6]} color={VIOLET_DARK} />
            {[-0.9, 0.9].map((x) => (
                <Cyl key={x} args={[0.05, 0.05, 1.25, 6]} position={[x, 1.12, 2.05]} color="#DDDAE8" />
            ))}
        </Shadowed>

        {/* Glass floors */}
        {Array.from({ length: 8 }, (_, i) => (
            <Box key={i} args={[2.9, 0.42, 2.9]} position={[0, 1.35 + i * 0.9, -0.3]}>
                <GlowMat color={LILAC} strength={0.8} />
            </Box>
        ))}
        <Box args={[1.2, 1.15, 0.05]} position={[0, 1.08, 1.12]}>
            <GlowMat color="#D6E6FF" strength={1.2} />
        </Box>

        <Text font={FONT} fontSize={0.78} color="#FFFFFF" position={[0, 8.38, 1.13]}>
            param
        </Text>
        <Beacon />
        <Coins />
    </group>
);
