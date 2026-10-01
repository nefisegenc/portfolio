// Trees, rocks, bushes, flowers and grass, drawn with instancing so hundreds
// of props cost only a handful of draw calls.
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D } from "three";
import { bushes, flowers, grass, lamps, rocks, trees } from "./scenery";
import { GlowMat } from "./parts";

const Instanced = ({ items, place, children, castShadow = true, receiveShadow = true }) => {
    const ref = useRef();
    useLayoutEffect(() => {
        const mesh = ref.current;
        const d = new Object3D();
        const c = new Color();
        items.forEach((item, i) => {
            d.position.set(0, 0, 0);
            d.rotation.set(0, 0, 0);
            d.scale.set(1, 1, 1);
            place(d, item);
            d.updateMatrix();
            mesh.setMatrixAt(i, d.matrix);
            if (item.color) mesh.setColorAt(i, c.set(item.color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items, place]);
    return (
        <instancedMesh
            ref={ref}
            args={[undefined, undefined, items.length]}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
        >
            {children}
        </instancedMesh>
    );
};

const round = trees.filter((t) => t.kind === "round");
const pines = trees.filter((t) => t.kind === "pine");

// Each round tree gets three foliage blobs; each pine three stacked cones.
const BLOBS = [
    [0, 1.95, 0, 1.0],
    [0.5, 1.55, 0.25, 0.7],
    [-0.4, 2.35, -0.15, 0.62],
];
const blobs = round.flatMap((t) =>
    BLOBS.map(([x, y, z, r]) => ({ ...t, bx: x, by: y, bz: z, br: r }))
);
const TIERS = [
    [1.2, 1.0, 1.4],
    [1.95, 0.78, 1.2],
    [2.6, 0.52, 1.0],
];
const tiers = pines.flatMap((t) => TIERS.map(([y, r, h]) => ({ ...t, ty: y, tr: r, th: h })));
const blades = grass.flatMap((g) => [-1, 0, 1].map((k) => ({ ...g, k })));
const flowerStems = flowers.map((f) => ({ x: f.x, z: f.z, scale: f.scale }));
const trunks = trees.map((t) => ({ x: t.x, z: t.z, scale: t.scale }));

const placeTrunk = (d, t) => {
    d.position.set(t.x, 0.7 * t.scale, t.z);
    d.scale.set(t.scale, t.scale, t.scale);
};
const placeBlob = (d, t) => {
    const s = t.scale;
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);
    d.position.set(t.x + (t.bx * cos - t.bz * sin) * s, t.by * s, t.z + (t.bx * sin + t.bz * cos) * s);
    d.rotation.set(t.rotation, t.rotation * 2, 0);
    d.scale.setScalar(t.br * s);
};
const placeTier = (d, t) => {
    d.position.set(t.x, t.ty * t.scale, t.z);
    d.rotation.set(0, t.rotation, 0);
    d.scale.set(t.tr * t.scale, t.th * t.scale, t.tr * t.scale);
};
const placeBush = (d, b) => {
    d.position.set(b.x, b.scale * 0.45, b.z);
    d.scale.set(b.scale, b.scale * 0.8, b.scale);
};
const placeRock = (d, r) => {
    d.position.set(r.x, r.scale * 0.25, r.z);
    d.rotation.set(r.rotation, r.rotation * 1.7, 0);
    d.scale.set(r.scale, r.scale * 0.7, r.scale);
};
const placeFlower = (d, f) => {
    d.position.set(f.x, 0.26 * f.scale, f.z);
    d.scale.setScalar(f.scale);
};
const placeStem = (d, f) => {
    d.position.set(f.x, 0.12 * f.scale, f.z);
    d.scale.setScalar(f.scale);
};
const placeBlade = (d, g) => {
    d.position.set(g.x + g.k * 0.08 * Math.cos(g.rotation), 0.16 * g.scale, g.z + g.k * 0.08 * Math.sin(g.rotation));
    d.rotation.set(0, g.rotation, g.k * 0.35);
    d.scale.setScalar(g.scale);
};

const Lamps = () => (
    <group>
        {lamps.map((l, i) => (
            <group key={i} position={[l.x, 0, l.z]}>
                <mesh position-y={1.1} castShadow>
                    <cylinderGeometry args={[0.06, 0.09, 2.2, 6]} />
                    <meshStandardMaterial color="#3B3350" flatShading />
                </mesh>
                <mesh position-y={2.55}>
                    <coneGeometry args={[0.28, 0.25, 6]} />
                    <meshStandardMaterial color="#3B3350" flatShading />
                </mesh>
                <mesh position-y={2.3}>
                    <sphereGeometry args={[0.18, 12, 8]} />
                    <GlowMat color="#FFD27A" strength={1.6} />
                </mesh>
            </group>
        ))}
    </group>
);

export const Nature = () => {
    const white = useMemo(() => <meshStandardMaterial color="#FFFFFF" flatShading roughness={0.9} />, []);
    return (
        <group>
            <Instanced items={trunks} place={placeTrunk}>
                <cylinderGeometry args={[0.12, 0.19, 1.4, 6]} />
                <meshStandardMaterial color="#8B5A3C" flatShading />
            </Instanced>
            <Instanced items={blobs} place={placeBlob}>
                <icosahedronGeometry args={[1, 0]} />
                {white}
            </Instanced>
            <Instanced items={tiers} place={placeTier}>
                <coneGeometry args={[1, 1, 7]} />
                {white}
            </Instanced>
            <Instanced items={bushes} place={placeBush}>
                <icosahedronGeometry args={[1, 1]} />
                {white}
            </Instanced>
            <Instanced items={rocks} place={placeRock}>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#A9A59C" flatShading />
            </Instanced>
            <Instanced items={flowers} place={placeFlower} castShadow={false}>
                <icosahedronGeometry args={[0.09, 0]} />
                {white}
            </Instanced>
            <Instanced items={flowerStems} place={placeStem} castShadow={false}>
                <cylinderGeometry args={[0.012, 0.012, 0.24, 3]} />
                <meshStandardMaterial color="#4F8F42" />
            </Instanced>
            <Instanced items={blades} place={placeBlade} castShadow={false}>
                <coneGeometry args={[0.05, 0.34, 3]} />
                <meshStandardMaterial color="#6FA84C" flatShading />
            </Instanced>
            <Lamps />
        </group>
    );
};
