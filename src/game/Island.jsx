// The floating island itself: grassy top, earthy cliffs, a rocky underside,
// the plaza and the stepping-stone paths.
import { useLayoutEffect, useMemo, useRef } from "react";
import { Float } from "@react-three/drei";
import { Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Object3D } from "three";
import { ISLAND_RADIUS, PLAZA_RADIUS, paths, seeded } from "../data/world";
import { arcadePath } from "../data/arcade";
import { grassPatches } from "./scenery";
import { usePalette } from "./theme";

const edgeWobble = (a) =>
    1 + 0.022 * Math.sin(3 * a + 0.5) + 0.016 * Math.sin(7 * a + 2) + 0.008 * Math.sin(13 * a + 1);

const wobbleCylinder = (geometry, roughness) => {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (Math.hypot(x, z) < 0.001) continue;
        const a = Math.atan2(z, x);
        const f = edgeWobble(a) + roughness * (Math.sin(a * 23 + y * 4) * 0.6 + Math.sin(a * 41 - y * 7) * 0.4);
        pos.setX(i, x * f);
        pos.setZ(i, z * f);
    }
    geometry.computeVertexNormals();
    return geometry;
};

export const TopLayer = ({ radius = ISLAND_RADIUS, patches = grassPatches }) => {
    const p = usePalette();
    const top = useMemo(() => wobbleCylinder(new CylinderGeometry(radius, radius - 1.1, 2.4, 96, 3), 0.012), [radius]);
    const lip = useMemo(
        () => wobbleCylinder(new CylinderGeometry(radius + 0.25, radius + 0.05, 0.45, 96, 1, true), 0),
        [radius]
    );
    return (
        <group>
            <mesh geometry={top} position-y={-1.2} receiveShadow>
                <meshStandardMaterial attach="material-0" color="#B7834F" flatShading roughness={1} />
                <meshStandardMaterial attach="material-1" color={p.grass} roughness={1} />
                <meshStandardMaterial attach="material-2" color="#8C6445" flatShading roughness={1} />
            </mesh>
            <mesh geometry={lip} position-y={-0.2} receiveShadow>
                <meshStandardMaterial color={p.grassDark} flatShading roughness={1} />
            </mesh>
            {patches.map((g, i) => (
                <mesh key={i} position={[g.x, 0.008, g.z]} rotation-x={-Math.PI / 2} receiveShadow>
                    <circleGeometry args={[g.radius, 10]} />
                    <meshStandardMaterial color={p.grassDark} roughness={1} />
                </mesh>
            ))}
        </group>
    );
};

export const Underside = ({ radius = ISLAND_RADIUS }) => {
    const geometry = useMemo(() => {
        const g = new ConeGeometry(radius - 0.9, 20, 20, 6);
        g.rotateX(Math.PI);
        const pos = g.attributes.position;
        const colors = [];
        const top = new Color("#A77B55");
        const bottom = new Color("#4E3B30");
        const c = new Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);
            const a = Math.atan2(z, x);
            if (y < 9.9 && Math.hypot(x, z) > 0.01) {
                const n = 1 + Math.sin(a * 5 + y * 0.7) * 0.1 + Math.sin(a * 11 - y * 1.3) * 0.06;
                pos.setX(i, x * n);
                pos.setZ(i, z * n);
                pos.setY(i, y + Math.sin(a * 7 + y) * 0.5);
            }
            c.copy(top).lerp(bottom, (10 - y) / 20);
            colors.push(c.r, c.g, c.b);
        }
        g.setAttribute("color", new Float32BufferAttribute(colors, 3));
        g.computeVertexNormals();
        return g;
    }, [radius]);
    return (
        <mesh geometry={geometry} position-y={-2.2 - (10 * radius) / ISLAND_RADIUS} scale-y={radius / ISLAND_RADIUS}>
            <meshStandardMaterial vertexColors flatShading roughness={1} />
        </mesh>
    );
};

const FLOATING_ROCKS = [
    [-31, -6, 8, 1.4],
    [29, -9, -12, 1.8],
    [8, -14, 30, 1.2],
    [-18, -12, -27, 1.6],
    [33, -3, 14, 0.9],
    [-10, -4, 33, 0.8],
    [20, -16, 22, 1.1],
];

const FloatingRocks = () =>
    FLOATING_ROCKS.map(([x, y, z, s], i) => (
        <Float key={i} speed={1 + (i % 3) * 0.4} rotationIntensity={0.4} floatIntensity={2}>
            <group position={[x, y, z]} scale={s}>
                <mesh>
                    <dodecahedronGeometry args={[1.2, 0]} />
                    <meshStandardMaterial color="#8C6A52" flatShading />
                </mesh>
                <mesh position={[0, 0.85, 0]} scale={[1, 0.3, 1]}>
                    <dodecahedronGeometry args={[1.05, 0]} />
                    <meshStandardMaterial color="#86BA5F" flatShading />
                </mesh>
            </group>
        </Float>
    ));

const Plaza = () => (
    <group>
        <mesh position-y={0.05} receiveShadow>
            <cylinderGeometry args={[PLAZA_RADIUS, PLAZA_RADIUS + 0.2, 0.12, 64]} />
            <meshStandardMaterial color="#EADFC9" roughness={0.95} />
        </mesh>
        <mesh position-y={0.115} rotation-x={-Math.PI / 2} receiveShadow>
            <ringGeometry args={[2.9, 3.25, 64]} />
            <meshStandardMaterial color="#D8C8AA" />
        </mesh>
    </group>
);

// The arcade path goes last so the other paths keep their stones.
const allPaths = [...paths, arcadePath];

const useStones = () =>
    useMemo(() => {
        const rand = seeded(42);
        return allPaths.flatMap(({ from, to }) => {
            const dx = to.x - from.x;
            const dz = to.z - from.z;
            const length = Math.hypot(dx, dz);
            const steps = Math.floor(length / 1.05);
            const nx = -dz / length;
            const nz = dx / length;
            return Array.from({ length: steps }, (_, i) => {
                const t = (i + 0.7) / (steps + 0.4);
                const side = (i % 2 ? 1 : -1) * 0.2;
                return {
                    x: from.x + dx * t + nx * side,
                    z: from.z + dz * t + nz * side,
                    r: 0.38 + rand() * 0.14,
                    rot: rand() * Math.PI,
                };
            });
        });
    }, []);

const Paths = () => {
    const stones = useStones();
    const ref = useRef();
    useLayoutEffect(() => {
        const d = new Object3D();
        stones.forEach((s, i) => {
            d.position.set(s.x, 0.05, s.z);
            d.rotation.set(0, s.rot, 0);
            d.scale.set(s.r, 1, s.r * 0.85);
            d.updateMatrix();
            ref.current.setMatrixAt(i, d.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
        ref.current.computeBoundingSphere();
    }, [stones]);
    return (
        <group>
            {allPaths.map(({ from, to }, i) => {
                const dx = to.x - from.x;
                const dz = to.z - from.z;
                const length = Math.hypot(dx, dz);
                return (
                    <group key={i} position={[(from.x + to.x) / 2, 0.012, (from.z + to.z) / 2]} rotation-y={Math.atan2(dx, dz)}>
                        <mesh rotation-x={-Math.PI / 2} receiveShadow>
                            <planeGeometry args={[1.7, length + 0.4]} />
                            <meshStandardMaterial color="#D6BF95" roughness={1} />
                        </mesh>
                    </group>
                );
            })}
            <instancedMesh ref={ref} args={[undefined, undefined, stones.length]} receiveShadow>
                <cylinderGeometry args={[1, 1, 0.1, 7]} />
                <meshStandardMaterial color="#F0E7D6" flatShading />
            </instancedMesh>
        </group>
    );
};

export const Island = () => (
    <group>
        <TopLayer />
        <Underside />
        <FloatingRocks />
        <Plaza />
        <Paths />
    </group>
);
