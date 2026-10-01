// İşimiz Var Gücümüz Var: a little shopfront, crowned with a gold star
// because it was the first professional project.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Shape } from "three";
import { Ball, Box, Cyl, FONT, GlowMat, Shadowed, Window } from "../parts";

const DARK = "#2B2F3A";
const AMBER = "#E9A23B";
const CREAM = "#FFF4DE";

const Star = () => {
    const ref = useRef();
    const shape = useMemo(() => {
        const s = new Shape();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 0.26 : 0.6;
            const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) s.moveTo(x, y);
            else s.lineTo(x, y);
        }
        s.closePath();
        return s;
    }, []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.rotation.y = t * 1.2;
        ref.current.position.y = 6.1 + Math.sin(t * 1.6) * 0.15;
    });
    return (
        <mesh ref={ref} position={[0, 6.1, -0.4]} castShadow>
            <extrudeGeometry args={[shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }]} />
            <GlowMat color="#FFC940" strength={3} />
        </mesh>
    );
};

export const FirstOffice = () => (
    <group>
        <Shadowed>
            <Box args={[3.6, 3.8, 3]} position={[0, 1.9, -0.4]} color={DARK} />
            <Box args={[3.75, 0.25, 3.15]} position={[0, 3.9, -0.4]} color={AMBER} />
            <Box args={[3.9, 0.12, 3.3]} position={[0, 4.08, -0.4]} color={DARK} />

            {/* Shop window and door */}
            <Box args={[2.0, 1.4, 0.06]} position={[-0.55, 1.2, 1.12]} color={CREAM} />
            <Box args={[0.85, 1.75, 0.08]} position={[1.15, 0.88, 1.12]} color={AMBER} />
            <Box args={[0.45, 0.5, 0.1]} position={[1.15, 1.3, 1.13]} color={CREAM} />
            {Array.from({ length: 6 }, (_, i) => (
                <Box
                    key={i}
                    args={[0.36, 0.06, 0.9]}
                    position={[-1.45 + i * 0.36, 2.18, 1.5]}
                    rotation-x={0.4}
                    color={i % 2 ? CREAM : AMBER}
                />
            ))}
            <Window w={0.8} h={0.6} position={[-0.9, 2.95, 1.1]} frame={CREAM} />
            <Window w={0.8} h={0.6} position={[0.9, 2.95, 1.1]} frame={CREAM} />

            {/* Rooftop sign */}
            {[-1.2, 1.2].map((x) => (
                <Box key={x} args={[0.08, 0.5, 0.08]} position={[x, 4.35, 0.55]} color={DARK} />
            ))}
            <Box args={[3.3, 0.7, 0.1]} position={[0, 4.85, 0.55]} color={AMBER} />
            <Box args={[3.1, 0.52, 0.12]} position={[0, 4.85, 0.55]} color={CREAM} />

            {/* Plants */}
            {[1.6, 0.4].map((z) => (
                <group key={z} position={[-2.2, 0, z]}>
                    <Cyl args={[0.24, 0.18, 0.4, 8]} position={[0, 0.2, 0]} color="#C9694A" />
                    <Ball radius={0.34} position={[0, 0.62, 0]} color="#5E9E47" />
                </group>
            ))}

            {/* Chalkboard: est. 2022 */}
            <group position={[-2.3, 0, 2.7]} rotation-y={0.4}>
                <Box args={[0.75, 0.95, 0.05]} position={[0, 0.46, 0.14]} rotation-x={-0.25} color="#3A3F4B" />
                <Box args={[0.75, 0.95, 0.05]} position={[0, 0.46, -0.14]} rotation-x={0.25} color="#3A3F4B" />
            </group>
        </Shadowed>

        <Box args={[1.8, 1.2, 0.08]} position={[-0.55, 1.2, 1.14]}>
            <GlowMat color="#FFD89A" strength={1.3} />
        </Box>
        <Text font={FONT} fontSize={0.36} color={DARK} position={[0, 4.85, 0.62]}>
            İŞİMİZ VAR
        </Text>
        <group position={[-2.3, 0, 2.7]} rotation-y={0.4}>
            <Text
                font={FONT}
                fontSize={0.17}
                lineHeight={1}
                textAlign="center"
                color={CREAM}
                position={[0, 0.5, 0.2]}
                rotation-x={-0.25}
            >
                {"EST.\n2022"}
            </Text>
        </group>
        <Star />
    </group>
);
