// The Sky Circuit's static scenery: road, curbs, barriers, the start gantry
// and its lights, the ramp and the ring over the gap, and floating rocks.
import { useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Object3D, RepeatWrapping, SRGBColorSpace } from "three";
import { seeded } from "../../../data/world";
import { useT } from "../../../i18n";
import { Box, Cyl, FONT, GlowMat, Shadowed } from "../../parts";
import { useArcade } from "../state";
import { CIRCUIT, GAP_LENGTH, LIP_S, RAMP_START_S, ROAD_HALF, SAMPLES, STEP, roadPoint, sampleAt, track } from "./track";

const SKIRT = 0.9;
const TEX_LENGTH = 8;

const makeTexture = (w, h, draw, repeat = true) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    if (repeat) tex.wrapT = RepeatWrapping;
    return tex;
};

const makeRoadTexture = () => {
    const rand = seeded(17);
    return makeTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = "#3A3946";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2500; i++) {
            const v = 40 + rand() * 40;
            ctx.fillStyle = `rgb(${v},${v},${v + 10})`;
            ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
        }
        // Curbs: red and white blocks along both edges.
        const curb = w * 0.06;
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? "#F8FAFC" : "#E11D48";
            ctx.fillRect(0, (i / 4) * h, curb, h / 4);
            ctx.fillRect(w - curb, (i / 4) * h, curb, h / 4);
        }
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(curb + 4, 0, 4, h);
        ctx.fillRect(w - curb - 8, 0, 4, h);
        // Dashed centre line.
        ctx.fillRect(w / 2 - 3, 0, 6, h * 0.45);
    });
};

const makeRampTexture = () =>
    makeTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#FACC15";
        for (let i = -2; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 32);
            ctx.lineTo(w / 2, i * 32 - 28);
            ctx.lineTo(w, i * 32);
            ctx.lineTo(w, i * 32 + 14);
            ctx.lineTo(w / 2, i * 32 - 14);
            ctx.lineTo(0, i * 32 + 14);
            ctx.fill();
        }
    });

// A ribbon along the road between two distances, `half` wide either side.
// `drop` lowers it (for the slab's underside) and `flip` turns it face down.
const ribbon = ({ from = 0, to = SAMPLES, half = ROAD_HALF, lift = 0, drop = 0, flip = false, onRoad = true }) => {
    const pos = [];
    const uv = [];
    const idx = [];
    for (let k = from; k <= to; k++) {
        const p = track[k % SAMPLES];
        for (const side of [1, -1]) {
            pos.push(p.x + p.lx * half * side, p.y + lift - drop, p.z + p.lz * half * side);
            uv.push(side > 0 ? 0 : 1, (k * STEP) / TEX_LENGTH);
        }
    }
    for (let k = 0; k < to - from; k++) {
        const i = from + k;
        if (onRoad && (!track[i % SAMPLES].road || !track[(i + 1) % SAMPLES].road)) continue;
        const a = k * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        if (flip) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

// The vertical edges of the floating slab.
const skirts = () => {
    const pos = [];
    const idx = [];
    for (const side of [1, -1]) {
        const base = pos.length / 3;
        for (let k = 0; k <= SAMPLES; k++) {
            const p = track[k % SAMPLES];
            const x = p.x + p.lx * ROAD_HALF * side;
            const z = p.z + p.lz * ROAD_HALF * side;
            pos.push(x, p.y, z, x, p.y - SKIRT, z);
        }
        for (let k = 0; k < SAMPLES; k++) {
            if (!track[k].road || !track[(k + 1) % SAMPLES].road) continue;
            const a = base + k * 2;
            if (side > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
            else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

const Road = () => {
    const road = useMemo(() => ribbon({}), []);
    const under = useMemo(() => ribbon({ drop: SKIRT, flip: true }), []);
    const sides = useMemo(() => skirts(), []);
    const roadTex = useMemo(() => makeRoadTexture(), []);
    const rampTex = useMemo(() => makeRampTexture(), []);
    const ramp = useMemo(() => {
        const from = Math.floor(RAMP_START_S / STEP);
        const to = Math.floor(LIP_S / STEP);
        return ribbon({ from, to, half: ROAD_HALF - 0.6, lift: 0.02 });
    }, []);
    return (
        <group>
            <mesh geometry={road} receiveShadow>
                <meshStandardMaterial map={roadTex} roughness={0.85} />
            </mesh>
            <mesh geometry={ramp} receiveShadow>
                <meshStandardMaterial map={rampTex} roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
            <mesh geometry={sides}>
                <meshStandardMaterial color="#5B4A7A" flatShading roughness={1} />
            </mesh>
            <mesh geometry={under}>
                <meshStandardMaterial color="#3F3358" roughness={1} />
            </mesh>
        </group>
    );
};

// Red and white barrier blocks along both edges, broken only at the gap.
const Barriers = () => {
    const ref = useRef();
    const spots = useMemo(() => {
        const out = [];
        const every = Math.round(2.4 / STEP);
        for (let i = 0; i < SAMPLES; i += every) {
            const p = track[i];
            if (!p.road || !track[(i + every) % SAMPLES].road) continue;
            for (const side of [1, -1]) {
                out.push({ p, side, white: (i / every + (side > 0 ? 0 : 1)) % 2 === 0 });
            }
        }
        return out;
    }, []);
    useLayoutEffect(() => {
        const d = new Object3D();
        const red = new Color("#E11D48");
        const white = new Color("#F1F5F9");
        spots.forEach(({ p, side, white: w }, k) => {
            d.position.set(p.x + p.lx * (ROAD_HALF + 0.22) * side, p.y + 0.3, p.z + p.lz * (ROAD_HALF + 0.22) * side);
            d.rotation.set(0, Math.atan2(p.tx, p.tz), 0);
            d.updateMatrix();
            ref.current.setMatrixAt(k, d.matrix);
            ref.current.setColorAt(k, w ? white : red);
        });
        ref.current.instanceMatrix.needsUpdate = true;
        ref.current.instanceColor.needsUpdate = true;
        ref.current.computeBoundingSphere();
    }, [spots]);
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.6, 2.3]} />
            <meshStandardMaterial roughness={0.6} />
        </instancedMesh>
    );
};

// The start gantry, its lights counting down the start.
const Gantry = () => {
    const t = useT();
    const status = useArcade((s) => (s.active === "race" ? s.status : null));
    const countdown = useArcade((s) => s.countdown);
    const p = roadPoint(0);
    const lit = status === "countdown" ? 4 - countdown : 0;
    const go = status === "playing";
    return (
        <group position={[p.x, p.y, p.z]} rotation-y={p.heading}>
            <Shadowed>
                {[-1, 1].map((s) => (
                    <Box key={s} args={[0.5, 5, 0.5]} position={[s * (ROAD_HALF + 0.9), 2.5, 0]} color="#1C1730" />
                ))}
                <Box args={[ROAD_HALF * 2 + 2.4, 1.1, 0.5]} position={[0, 5, 0]} color="#1C1730" />
            </Shadowed>
            {[1, -1].map((s) => (
                <Text key={s} font={FONT} fontSize={0.62} position={[0, 5.05, s * 0.27]} rotation-y={s < 0 ? Math.PI : 0} anchorY="middle">
                    {t("race.gp")}
                    <GlowMat color="#F97316" strength={2.2} />
                </Text>
            ))}
            {[-2, -1, 0, 1, 2].map((k, i) => (
                <mesh key={k} position={[k * 0.9, 4.2, -0.3]}>
                    <sphereGeometry args={[0.24, 12, 8]} />
                    <meshStandardMaterial
                        color={go ? "#22C55E" : i < lit + 1 && lit > 0 ? "#EF4444" : "#2A2340"}
                        emissive={go ? "#22C55E" : i < lit + 1 && lit > 0 ? "#EF4444" : "#000000"}
                        emissiveIntensity={2.5}
                        toneMapped={false}
                    />
                </mesh>
            ))}
            {/* Checkered start line */}
            {Array.from({ length: 16 }, (_, i) =>
                [0, 1].map((r) => (
                    <mesh
                        key={`${i}${r}`}
                        rotation-x={-Math.PI / 2}
                        position={[-ROAD_HALF + (i + 0.5) * ((ROAD_HALF * 2) / 16), 0.02, (r - 0.5) * 0.52]}
                    >
                        <planeGeometry args={[(ROAD_HALF * 2) / 16, 0.52]} />
                        <meshBasicMaterial color={(i + r) % 2 ? "#F8FAFC" : "#111827"} />
                    </mesh>
                ))
            )}
        </group>
    );
};

// A neon ring hanging over the gap, and a warning board before the ramp.
const JumpDressing = () => {
    const t = useT();
    const mid = roadPoint(LIP_S + GAP_LENGTH / 2);
    const lip = roadPoint(LIP_S);
    const sign = roadPoint(RAMP_START_S - 14, ROAD_HALF + 2.2);
    return (
        <group>
            <group position={[mid.x, lip.y + 2.6, mid.z]} rotation-y={mid.heading}>
                <mesh>
                    <torusGeometry args={[5.4, 0.22, 10, 48]} />
                    <GlowMat color="#22D3EE" strength={3} />
                </mesh>
            </group>
            <group position={[sign.x, sign.y, sign.z]} rotation-y={sign.heading + Math.PI}>
                <Shadowed>
                    <Box args={[0.18, 2.6, 0.18]} position={[0, 1.3, 0]} color="#1C1730" />
                    <Box args={[2.8, 1.1, 0.14]} position={[0, 2.5, 0]} color="#FACC15" />
                </Shadowed>
                <Text font={FONT} fontSize={0.55} color="#111827" position={[0, 2.5, 0.08]} anchorY="middle">
                    {t("race.jump")}
                </Text>
            </group>
        </group>
    );
};

const Billboard = ({ s, d, text, color }) => {
    const p = roadPoint(s, d);
    return (
        <group position={[p.x, p.y, p.z]} rotation-y={p.heading + Math.PI + (d > 0 ? -0.5 : 0.5)}>
            <Shadowed>
                {[-1.6, 1.6].map((x) => (
                    <Box key={x} args={[0.2, 3.2, 0.2]} position={[x, 1.6, -0.1]} color="#1C1730" />
                ))}
                <Box args={[4.6, 1.5, 0.18]} position={[0, 3.4, 0]} color="#1C1730" />
            </Shadowed>
            <Text font={FONT} fontSize={0.6} position={[0, 3.4, 0.1]} anchorY="middle">
                {text}
                <GlowMat color={color} strength={2.4} />
            </Text>
        </group>
    );
};

// Floating rocks around the circuit, kept clear of the road.
const ROCKS = (() => {
    const rand = seeded(31);
    const out = [];
    for (let tries = 0; tries < 400 && out.length < 16; tries++) {
        const x = CIRCUIT.x + (rand() - 0.5) * 140;
        const z = CIRCUIT.z + (rand() - 0.5) * 110;
        const clear = track.every((p, i) => i % 8 || Math.hypot(p.x - x, p.z - z) > ROAD_HALF + 8);
        if (!clear) continue;
        out.push({ x, z, y: CIRCUIT.y - 4 + rand() * 9, s: 1.5 + rand() * 3, tree: rand() < 0.5 });
    }
    return out;
})();

const Rocks = () =>
    ROCKS.map((r, i) => (
        <group key={i} position={[r.x, r.y, r.z]} scale={r.s}>
            <mesh>
                <dodecahedronGeometry args={[1.2, 0]} />
                <meshStandardMaterial color="#8C6A52" flatShading />
            </mesh>
            <mesh position={[0, 0.85, 0]} scale={[1, 0.3, 1]}>
                <dodecahedronGeometry args={[1.05, 0]} />
                <meshStandardMaterial color="#86BA5F" flatShading />
            </mesh>
            {r.tree && (
                <group position={[0.2, 1, 0.1]} scale={0.6}>
                    <Cyl args={[0.12, 0.18, 1, 6]} position={[0, 0.5, 0]} color="#7D5A3C" />
                    <mesh position={[0, 1.5, 0]}>
                        <coneGeometry args={[0.8, 1.8, 7]} />
                        <meshStandardMaterial color="#4F8F42" flatShading />
                    </mesh>
                </group>
            )}
        </group>
    ));

export const RaceTrack = () => {
    const t = useT();
    const sign = sampleAt(0);
    return (
        <group>
            <Road />
            <Barriers />
            <Gantry />
            <JumpDressing />
            <Billboard s={sign.s + 60} d={ROAD_HALF + 4} text="NEFISE.WORKS" color="#F472B6" />
            <Billboard s={sign.s + 185} d={-(ROAD_HALF + 4)} text={t("arcade.name").toUpperCase()} color="#22D3EE" />
            <Rocks />
        </group>
    );
};
