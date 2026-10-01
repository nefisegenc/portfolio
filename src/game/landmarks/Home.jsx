// About Me: a cozy cottage with a smoking chimney and a mailbox.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Ball, Box, Cyl, Mat, Shadowed, Window } from "../parts";
import { loop } from "../utils";

const WALL = "#FBF3E6";
const ROOF = "#D96C4A";
const BRICK = "#C9694A";
const WOOD = "#B5673E";
const FLOWERS = ["#FF8FAB", "#FFD166", "#B79CFF", "#FF8FAB"];

const Smoke = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        ref.current.children.forEach((puff, i) => {
            const p = loop(clock.elapsedTime, 0.22, i / 4);
            puff.position.set(Math.sin(p * 4 + i) * 0.25 + p * 0.5, p * 2.4, 0);
            puff.scale.setScalar(0.35 + p * 0.9);
            puff.material.opacity = 0.75 * (1 - p);
        });
    });
    return (
        <group ref={ref} position={[1.1, 4.35, -1.0]}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i}>
                    <icosahedronGeometry args={[0.3, 1]} />
                    <meshStandardMaterial color="#F4F1EC" flatShading transparent depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
};

export const Home = () => (
    <group>
        <Shadowed>
            <Box args={[4, 0.3, 3.2]} position={[0, 0.15, -0.4]} color="#D8CBB8" />
            <Box args={[3.8, 2.4, 3]} position={[0, 1.2, -0.4]} color={WALL} />

            {/* Gabled roof: a triangular prism lying along x */}
            <mesh position={[0, 2.9, -0.4]} rotation-z={Math.PI / 2} scale={[0.495, 1, 1]}>
                <cylinderGeometry args={[2.02, 2.02, 4.3, 3, 1, false, Math.PI / 2]} />
                <Mat color={ROOF} />
            </mesh>
            <Box args={[0.45, 1.3, 0.45]} position={[1.1, 3.6, -1.0]} color={BRICK} />
            <Box args={[0.58, 0.16, 0.58]} position={[1.1, 4.25, -1.0]} color="#A9553A" />

            {/* Door and porch */}
            <Box args={[0.9, 1.5, 0.08]} position={[0, 1.05, 1.12]} color={WOOD} />
            <Ball radius={0.05} position={[0.3, 1.0, 1.18]} color="#E8C170" />
            <Box args={[1.4, 0.15, 0.6]} position={[0, 0.075, 1.4]} color="#D8CBB8" />

            {[-1.2, 1.2].map((x) => (
                <group key={x}>
                    <Window w={0.7} h={0.7} position={[x, 1.45, 1.12]} />
                    <Box args={[0.85, 0.18, 0.22]} position={[x, 0.98, 1.24]} color={WOOD} />
                    {FLOWERS.map((c, i) => (
                        <Ball key={i} radius={0.09} position={[x - 0.3 + i * 0.2, 1.12, 1.25]} color={c} />
                    ))}
                </group>
            ))}

            {/* Mailbox */}
            <group position={[2.6, 0, 1.9]} rotation-y={-0.5}>
                <Box args={[0.1, 1, 0.1]} position={[0, 0.5, 0]} color={WOOD} />
                <Box args={[0.5, 0.34, 0.7]} position={[0, 1.15, 0]} color="#F07A4A" />
                <mesh position={[0, 1.32, 0]} rotation-x={Math.PI / 2}>
                    <cylinderGeometry args={[0.25, 0.25, 0.7, 12, 1, false, Math.PI / 2, Math.PI]} />
                    <Mat color="#F07A4A" />
                </mesh>
                <Box args={[0.04, 0.3, 0.12]} position={[0.28, 1.4, 0.1]} color="#E6394F" />
            </group>

            {/* Bench */}
            <group position={[-2.6, 0, 1.3]} rotation-y={0.35}>
                <Box args={[1.3, 0.08, 0.45]} position={[0, 0.45, 0]} color={WOOD} />
                <Box args={[1.3, 0.35, 0.06]} position={[0, 0.7, -0.2]} color={WOOD} />
                {[-0.55, 0.55].map((x) => (
                    <Box key={x} args={[0.08, 0.45, 0.4]} position={[x, 0.22, 0]} color="#8A4F2E" />
                ))}
            </group>
            <Cyl args={[0.22, 0.18, 0.35, 8]} position={[-1.9, 0.18, 1.6]} color="#C9694A" />
            <Ball radius={0.32} position={[-1.9, 0.55, 1.6]} color="#6FB14F" />
        </Shadowed>
        <Smoke />
    </group>
);
