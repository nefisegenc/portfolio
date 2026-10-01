// Small building blocks shared by the landmarks and the island scenery.
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { MathUtils, Object3D } from "three";
import { useStore } from "../store";
import { ENTRANCE_DISTANCE, seeded } from "../data/world";
import { usePalette } from "./theme";
import { usePoster } from "./textures";
import { landmarkLabel, useLang } from "../i18n";

export const FONT = "/fonts/baloo2-700.ttf";

// Turns on shadows for every mesh inside.
export const Shadowed = ({ children, cast = true, receive = true, ...props }) => {
    const ref = useRef();
    useLayoutEffect(() => {
        ref.current.traverse((o) => {
            if (o.isMesh && !o.userData.noShadow) {
                o.castShadow = cast;
                o.receiveShadow = receive;
            }
        });
    });
    return (
        <group ref={ref} {...props}>
            {children}
        </group>
    );
};

export const Mat = ({ color, ...props }) => (
    <meshStandardMaterial color={color} flatShading roughness={0.85} {...props} />
);

// Emissive material that blooms at night.
export const GlowMat = ({ color, strength = 1 }) => {
    const p = usePalette();
    return (
        <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={p.glow * strength}
            toneMapped={false}
        />
    );
};

export const Box = ({ args, color, children, ...props }) => (
    <mesh {...props}>
        <boxGeometry args={args} />
        {children || <Mat color={color} />}
    </mesh>
);

export const Cyl = ({ args, color, children, ...props }) => (
    <mesh {...props}>
        <cylinderGeometry args={args} />
        {children || <Mat color={color} />}
    </mesh>
);

export const Ball = ({ radius = 1, detail = 0, color, children, ...props }) => (
    <mesh {...props}>
        <icosahedronGeometry args={[radius, detail]} />
        {children || <Mat color={color} />}
    </mesh>
);

// Warm window that lights up after dark.
export const Window = ({ w = 0.7, h = 0.8, color = "#FFD89A", frame = "#FFFFFF", ...props }) => (
    <group {...props}>
        <Box args={[w + 0.14, h + 0.14, 0.06]} color={frame} />
        <Box args={[w, h, 0.08]}>
            <GlowMat color={color} strength={1} />
        </Box>
    </group>
);

export const LandmarkLabel = ({ landmark, active, discovered }) => {
    const playing = useStore((s) => s.phase === "playing");
    const lang = useLang();
    return (
        <Html
            position={[0, landmark.labelHeight, 0]}
            center
            distanceFactor={18}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
        >
            <div
                className={`landmark-label${active ? " is-active" : ""}${playing ? "" : " is-hidden"}`}
                style={{ "--c": landmark.color }}
            >
                {!discovered && <span className="landmark-label__new">!</span>}
                {landmarkLabel(landmark, lang)}
            </div>
        </Html>
    );
};

export const EntranceRing = ({ color, active }) => {
    const ref = useRef();
    useFrame(({ clock }) => {
        const target = active ? 1.12 + Math.sin(clock.elapsedTime * 5) * 0.05 : 1;
        ref.current.scale.setScalar(MathUtils.lerp(ref.current.scale.x, target, 0.15));
    });
    return (
        <group ref={ref} position={[0, 0.05, ENTRANCE_DISTANCE]}>
            <mesh rotation-x={-Math.PI / 2}>
                <ringGeometry args={[1.05, 1.32, 48]} />
                <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.6} toneMapped={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
                <circleGeometry args={[1.05, 48]} />
                <meshBasicMaterial color={color} transparent opacity={active ? 0.28 : 0.12} depthWrite={false} />
            </mesh>
        </group>
    );
};

// Framed project cover on two wooden posts.
export const PosterSign = ({ url, height = 1.3, maxWidth = 1.9, ...props }) => {
    const texture = usePoster(url);
    const aspect = texture.image.width / texture.image.height;
    let h = height;
    let w = h * aspect;
    if (w > maxWidth) {
        w = maxWidth;
        h = w / aspect;
    }
    const boardY = 0.9 + h / 2;
    const postHeight = boardY + h / 2 + 0.12;
    return (
        <Shadowed {...props}>
            {[-1, 1].map((s) => (
                <Box key={s} args={[0.1, postHeight, 0.1]} position={[s * (w / 2 + 0.03), postHeight / 2, -0.05]} color="#8B5E3C" />
            ))}
            <Box args={[w + 0.2, h + 0.2, 0.08]} position={[0, boardY, 0]} color="#6E4A2F" />
            <mesh position={[0, boardY, 0.045]}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
        </Shadowed>
    );
};

export const OliveTree = ({ scale = 1, ...props }) => (
    <Shadowed scale={scale} {...props}>
        <Cyl args={[0.12, 0.2, 1.3, 6]} position={[0, 0.6, 0]} rotation-z={0.15} color="#7D6A55" />
        <Cyl args={[0.07, 0.11, 0.8, 6]} position={[0.2, 1.3, 0]} rotation-z={-0.5} color="#7D6A55" />
        {[
            [0, 1.75, 0, 0.75],
            [0.55, 1.55, 0.2, 0.55],
            [-0.45, 1.6, -0.15, 0.6],
            [0.1, 2.15, -0.1, 0.5],
            [0.3, 1.9, 0.45, 0.45],
        ].map(([x, y, z, r], i) => (
            <Ball key={i} radius={r} position={[x, y, z]} color={i % 2 ? "#8FA35E" : "#A6B878"} />
        ))}
    </Shadowed>
);

// Iridescent soap bubbles drifting upwards and popping.
export const Bubbles = ({ count = 16, spread = 0.8, height = 4.5, seed = 1, ...props }) => {
    const ref = useRef();
    const dummy = useMemo(() => new Object3D(), []);
    const bubbles = useMemo(() => {
        const rand = seeded(seed);
        return Array.from({ length: count }, () => ({
            offset: rand(),
            x: (rand() - 0.5) * spread,
            z: (rand() - 0.5) * spread,
            size: 0.07 + rand() * 0.12,
            speed: 0.12 + rand() * 0.12,
            wobble: rand() * 6,
        }));
    }, [count, spread, seed]);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        bubbles.forEach((b, i) => {
            const p = (t * b.speed + b.offset) % 1;
            dummy.position.set(
                b.x + Math.sin(t * 1.4 + b.wobble) * 0.2 * p,
                p * height,
                b.z + Math.cos(t * 1.2 + b.wobble) * 0.2 * p
            );
            const pop = p > 0.92 ? (1 - p) / 0.08 : Math.min(1, p * 6);
            dummy.scale.setScalar(b.size * (0.6 + p * 0.8) * pop);
            dummy.updateMatrix();
            ref.current.setMatrixAt(i, dummy.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
    });
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, count]} {...props}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshPhysicalMaterial
                color="#FFFFFF"
                transparent
                opacity={0.4}
                roughness={0}
                iridescence={1}
                iridescenceIOR={1.4}
                iridescenceThicknessRange={[200, 900]}
                clearcoat={1}
                depthWrite={false}
            />
        </instancedMesh>
    );
};
