import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Stars } from "@react-three/drei";
import { BackSide, Color, Vector3 } from "three";
import { useStore } from "../store";
import { useArcade } from "./arcade/state";
import { seeded } from "../data/world";
import { usePalette } from "./theme";

const vertexShader = /* glsl */ `
    varying vec3 vDir;
    void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 top;
    uniform vec3 horizon;
    uniform vec3 bottom;
    varying vec3 vDir;
    void main() {
        float h = vDir.y;
        vec3 col = h > 0.0
            ? mix(horizon, top, pow(smoothstep(0.0, 1.0, h), 0.55))
            : mix(horizon, bottom, pow(smoothstep(0.0, 1.0, -h), 0.45));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
    }
`;

const SkyDome = () => {
    const p = usePalette();
    const uniforms = useMemo(
        () => ({ top: { value: new Color() }, horizon: { value: new Color() }, bottom: { value: new Color() } }),
        []
    );
    useEffect(() => {
        uniforms.top.value.set(p.skyTop);
        uniforms.horizon.value.set(p.skyHorizon);
        uniforms.bottom.value.set(p.skyBottom);
    }, [p, uniforms]);
    return (
        <mesh scale={420} renderOrder={-10}>
            <sphereGeometry args={[1, 32, 20]} />
            <shaderMaterial
                side={BackSide}
                depthWrite={false}
                fog={false}
                toneMapped={false}
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </mesh>
    );
};

const Celestial = () => {
    const night = useStore((s) => s.night);
    const color = night ? "#F3F0FF" : "#FFF3D1";
    return (
        <Billboard position={[-150, 62, -190]}>
            <mesh>
                <circleGeometry args={[night ? 7 : 10, 48]} />
                <meshBasicMaterial color={color} fog={false} toneMapped={false} />
            </mesh>
            <mesh position-z={-0.5}>
                <circleGeometry args={[night ? 14 : 22, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.18} fog={false} depthWrite={false} />
            </mesh>
            {night &&
                [
                    [-2, 1.5, 1.4],
                    [2.5, -1, 1],
                    [0.5, -3, 0.8],
                ].map(([x, y, r], i) => (
                    <mesh key={i} position={[x, y, 0.1]}>
                        <circleGeometry args={[r, 20]} />
                        <meshBasicMaterial color="#DAD5F0" fog={false} toneMapped={false} />
                    </mesh>
                ))}
        </Billboard>
    );
};

const CLOUDS = (() => {
    const rand = seeded(99);
    return Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
        const r = 60 + rand() * 40;
        return {
            x: Math.sin(a) * r,
            y: -14 + rand() * 32,
            z: -Math.cos(a) * r,
            scale: 1.6 + rand() * 2.2,
            puffs: Array.from({ length: 4 + Math.floor(rand() * 3) }, (_, j) => [
                (j - 2) * 1.1 + rand() * 0.4,
                rand() * 0.6,
                rand() * 0.8 - 0.4,
                0.8 + rand() * 0.7,
            ]),
        };
    });
})();

const cloudSpot = new Vector3();

const Clouds = () => {
    const p = usePalette();
    const ref = useRef();
    useFrame(({ camera }, dt) => {
        ref.current.rotation.y += dt * 0.006;
        // Head to Head's camera sits out in the ring the clouds drift round,
        // so during a match any cloud drifting near it steps aside rather
        // than covering the pitch.
        const match = useArcade.getState().active === "head";
        for (const cloud of ref.current.children) {
            cloud.visible = !match || cloud.getWorldPosition(cloudSpot).distanceTo(camera.position) > 40;
        }
    });
    return (
        <group ref={ref}>
            {CLOUDS.map((c, i) => (
                <group key={i} position={[c.x, c.y, c.z]} scale={c.scale} rotation-y={i}>
                    {c.puffs.map(([x, y, z, r], j) => (
                        <mesh key={j} position={[x, y, z]}>
                            <icosahedronGeometry args={[r, 1]} />
                            <meshStandardMaterial color={p.cloud} emissive={p.cloud} emissiveIntensity={0.4} flatShading roughness={1} />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
};

export const Sky = () => {
    const night = useStore((s) => s.night);
    return (
        <>
            <SkyDome />
            <Celestial />
            <Clouds />
            {night && <Stars radius={180} depth={80} count={2500} factor={5} saturation={0} fade speed={0.6} />}
        </>
    );
};
