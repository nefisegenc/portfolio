// The plaza's fountain and the welcome sign next to the spawn point.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Object3D } from "three";
import { Box, Cyl, FONT, Shadowed } from "./parts";
import { loop } from "./utils";
import { WELCOME_SIGN } from "./scenery";
import { useT } from "../i18n";

const STONE = "#E3D6BF";
const WATER = "#7CC8F0";
const DROPS = 28;

const Spray = () => {
    const ref = useRef();
    const dummy = useMemo(() => new Object3D(), []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        for (let i = 0; i < DROPS; i++) {
            const a = (i / DROPS) * Math.PI * 2;
            const p = loop(t, 0.55, (i * 0.37) % 1);
            const r = 0.3 + p * 1.25;
            dummy.position.set(Math.cos(a) * r, 2.15 + p * 0.9 - p * p * 2.5, Math.sin(a) * r);
            dummy.scale.setScalar(0.07 * (1 - p * 0.4));
            dummy.updateMatrix();
            ref.current.setMatrixAt(i, dummy.matrix);
        }
        ref.current.instanceMatrix.needsUpdate = true;
    });
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, DROPS]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#D6F1FF" emissive="#8FD3FF" emissiveIntensity={0.3} transparent opacity={0.85} />
        </instancedMesh>
    );
};

const Fountain = () => (
    <group>
        <Shadowed>
            <Cyl args={[2.1, 2.25, 0.6, 28]} position={[0, 0.3, 0]} color={STONE} />
            <mesh position={[0, 0.62, 0]} rotation-x={Math.PI / 2}>
                <torusGeometry args={[2.0, 0.14, 8, 40]} />
                <meshStandardMaterial color="#F0E6D4" flatShading />
            </mesh>
            <Cyl args={[0.25, 0.38, 1.6, 10]} position={[0, 1.3, 0]} color={STONE} />
            <mesh position={[0, 2.05, 0]}>
                <sphereGeometry args={[0.8, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                <meshStandardMaterial color={STONE} flatShading />
            </mesh>
        </Shadowed>
        <Cyl args={[1.9, 1.9, 0.05, 28]} position={[0, 0.56, 0]}>
            <meshStandardMaterial color={WATER} roughness={0.15} metalness={0.1} emissive="#3A9BD1" emissiveIntensity={0.25} />
        </Cyl>
        <Cyl args={[0.72, 0.72, 0.04, 16]} position={[0, 2.03, 0]}>
            <meshStandardMaterial color={WATER} roughness={0.15} emissive="#3A9BD1" emissiveIntensity={0.25} />
        </Cyl>
        <Spray />
    </group>
);

const WelcomeSign = () => {
    const t = useT();
    return (
        <group position={[WELCOME_SIGN.x, 0, WELCOME_SIGN.z]} rotation-y={WELCOME_SIGN.rot}>
            <Shadowed>
                {[-0.95, 0.95].map((x) => (
                    <Box key={x} args={[0.12, 1.9, 0.12]} position={[x, 0.95, -0.04]} color="#8B5E3C" />
                ))}
                <Box args={[2.3, 1.1, 0.1]} position={[0, 1.4, 0]} color="#C98B55" />
                <Box args={[2.45, 0.14, 0.14]} position={[0, 2.0, 0]} color="#8B5E3C" />
            </Shadowed>
            <Text font={FONT} fontSize={0.2} color="#FFF6E6" position={[0, 1.66, 0.06]} anchorY="middle">
                {t("sign.welcome")}
            </Text>
            <Text font={FONT} fontSize={0.3} color="#FFFFFF" position={[0, 1.4, 0.06]} anchorY="middle">
                {t("sign.island")}
            </Text>
            <Text font={FONT} fontSize={0.12} color="#FFF6E6" position={[0, 1.08, 0.06]} anchorY="middle">
                {t("sign.hint")}
            </Text>
        </group>
    );
};

export const Centerpiece = () => (
    <group>
        <Fountain />
        <WelcomeSign />
    </group>
);
