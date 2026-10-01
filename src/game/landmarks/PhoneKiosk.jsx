// Mini Catalog App: a giant phone showing the real app, with app icons
// orbiting it and shopping bags at its feet.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Box, Cyl, GlowMat, Mat, Shadowed } from "../parts";
import { usePoster } from "../textures";

const FRAME = "#0C101C";
const NAVY = "#0F172A";
const BLUE = "#1E88E5";
const SKY = "#13B9FD";
const INDIGO = "#6366F1";
const SLATE = "#E2E8F0";

const ICONS = [BLUE, SKY, INDIGO, "#F8FAFC"];

const AppIcons = () => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        ref.current.children.forEach((icon, i) => {
            const a = t * 0.55 + (i * Math.PI) / 2;
            icon.position.set(Math.cos(a) * 2.1, 2.6 + i * 0.55 + Math.sin(t * 1.6 + i) * 0.2, -0.6 + Math.sin(a) * 1.4);
            icon.rotation.set(Math.sin(t + i) * 0.3, t * 0.8 + i, 0);
        });
    });
    return (
        <group ref={ref}>
            {ICONS.map((color, i) => (
                <group key={i}>
                    <RoundedBox args={[0.5, 0.5, 0.14]} radius={0.1} smoothness={3} castShadow>
                        <GlowMat color={color} strength={0.6} />
                    </RoundedBox>
                    <Box args={[0.22, 0.22, 0.02]} position={[0, 0, 0.075]} rotation-z={Math.PI / 4}>
                        <meshStandardMaterial color={i === 3 ? BLUE : "#FFFFFF"} />
                    </Box>
                </group>
            ))}
        </group>
    );
};

const Bag = ({ color, handle, ...props }) => (
    <group {...props}>
        <Box args={[0.6, 0.7, 0.3]} position={[0, 0.35, 0]} color={color} />
        <mesh position={[0, 0.72, 0]}>
            <torusGeometry args={[0.16, 0.025, 6, 16, Math.PI]} />
            <Mat color={handle} />
        </mesh>
    </group>
);

export const PhoneKiosk = () => {
    const screen = usePoster("/img/posters/mobile-screen.webp");
    return (
        <group>
            <Shadowed>
                <Cyl args={[1.7, 1.85, 0.35, 32]} position={[0, 0.175, -0.5]} color={SLATE} />
                <group position={[0, 0.35, -0.6]} rotation-x={-0.06}>
                    <RoundedBox args={[2.1, 4.35, 0.3]} radius={0.3} smoothness={4} position={[0, 2.2, 0]}>
                        <meshStandardMaterial color={FRAME} roughness={0.35} metalness={0.3} />
                    </RoundedBox>
                    <Box args={[0.06, 0.5, 0.08]} position={[1.07, 3.2, 0]} color="#1F2937" />
                </group>
                <Bag color={BLUE} handle={NAVY} position={[-2.6, 0, 1.2]} rotation-y={0.4} />
                <Bag color="#F8FAFC" handle={BLUE} position={[-1.9, 0, 1.9]} rotation-y={-0.3} scale={0.8} />
            </Shadowed>

            {/* Glowing ring around the pedestal */}
            <mesh position={[0, 0.36, -0.5]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[1.55, 1.7, 48]} />
                <GlowMat color={SKY} strength={4} />
            </mesh>

            {/* The app's home screen */}
            <group position={[0, 0.35, -0.6]} rotation-x={-0.06}>
                <mesh position={[0, 2.2, 0.155]}>
                    <planeGeometry args={[1.86, 4.02]} />
                    <meshBasicMaterial map={screen} toneMapped={false} />
                </mesh>
                <mesh position={[0, 4.1, 0.16]} scale={[1, 0.3, 1]}>
                    <circleGeometry args={[0.24, 24]} />
                    <meshBasicMaterial color={FRAME} />
                </mesh>
            </group>

            <AppIcons />
        </group>
    );
};
