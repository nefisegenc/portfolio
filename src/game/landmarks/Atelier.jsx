// My Arts: a wooden studio with easels showing real design work.
import { Ball, Box, Cyl, GlowMat, Shadowed } from "../parts";
import { usePoster } from "../textures";

const WOOD = "#D9A066";
const WOOD_DARK = "#A8703F";
const ROOF = "#3D6FD6";
const BLUE = "#2F8FEF";

const SPLASHES = [
    [-1.7, 2.2, 0.5, "#FF6FA3"],
    [1.1, 1.9, 0.38, "#FFD23F"],
    [-3.4, 2.7, 0.42, "#3FB6FF"],
    [0.5, 3.0, 0.3, "#6FD08C"],
    [-0.6, 1.7, 0.28, "#B388FF"],
];

const Easel = ({ url, ...props }) => {
    const texture = usePoster(url);
    const aspect = texture.image.width / texture.image.height;
    const h = aspect > 1 ? 1.1 / aspect : 1.1;
    const w = h * aspect;
    return (
        <group {...props}>
            <Shadowed>
                <Box args={[0.06, 1.9, 0.06]} position={[-0.38, 0.92, 0.05]} rotation-z={-0.12} color={WOOD_DARK} />
                <Box args={[0.06, 1.9, 0.06]} position={[0.38, 0.92, 0.05]} rotation-z={0.12} color={WOOD_DARK} />
                <Box args={[0.06, 1.8, 0.06]} position={[0, 0.85, -0.32]} rotation-x={0.35} color={WOOD_DARK} />
                <Box args={[0.95, 0.06, 0.14]} position={[0, 0.72, 0.1]} color={WOOD_DARK} />
                <Box args={[w + 0.1, h + 0.1, 0.05]} position={[0, 0.78 + h / 2, 0.1]} rotation-x={-0.1} color="#FFFFFF" />
            </Shadowed>
            <mesh position={[0, 0.78 + h / 2, 0.13]} rotation-x={-0.1}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
        </group>
    );
};

export const Atelier = () => (
    <group>
        <Shadowed>
            <Box args={[4, 2.7, 3.1]} position={[0, 1.35, -0.6]} color={WOOD} />
            {[0.5, 0.95, 1.4, 1.85, 2.3].map((y) => (
                <Box key={y} args={[4.02, 0.05, 3.12]} position={[0, y, -0.6]} color={WOOD_DARK} />
            ))}
            {[
                [-2, 0.95],
                [2, 0.95],
                [-2, -2.15],
                [2, -2.15],
            ].map(([x, z]) => (
                <Box key={`${x}${z}`} args={[0.2, 2.8, 0.2]} position={[x, 1.4, z]} color={WOOD_DARK} />
            ))}
            <Box args={[4, 0.55, 0.2]} position={[0, 2.95, -2.05]} color={WOOD} />
            <Box args={[4.6, 0.22, 3.9]} position={[0, 2.95, -0.6]} rotation-x={0.15} color={ROOF} />

            {/* Studio window and door */}
            <Box args={[2.4, 1.5, 0.06]} position={[-0.5, 1.5, 0.96]} color="#FFFFFF" />
            <Box args={[0.8, 1.7, 0.08]} position={[1.35, 0.85, 0.96]} color={BLUE} />

            {/* Giant pencil leaning on the wall */}
            <group position={[2.85, 0, -0.9]} rotation-z={0.3}>
                <mesh position={[0, 0.2, 0]} rotation-x={Math.PI}>
                    <coneGeometry args={[0.22, 0.4, 6]} />
                    <meshStandardMaterial color="#F2D2A9" flatShading />
                </mesh>
                <Cyl args={[0.22, 0.22, 2.4, 6]} position={[0, 1.6, 0]} color="#FFC83D" />
                <Cyl args={[0.23, 0.23, 0.2, 6]} position={[0, 2.9, 0]} color="#C9CED6" />
                <Cyl args={[0.22, 0.22, 0.3, 12]} position={[0, 3.15, 0]} color="#FF8FAB" />
            </group>

            {/* Paint palette */}
            <group position={[-1.9, 0.05, 2.9]} rotation-y={0.5}>
                <Ball radius={0.5} detail={1} scale={[1.2, 0.08, 0.9]} color="#E8C9A0" />
                {["#FF6FA3", "#FFD23F", "#3FB6FF", "#6FD08C"].map((c, i) => (
                    <Ball key={c} radius={0.08} position={[-0.3 + i * 0.2, 0.05, 0.1 - (i % 2) * 0.2]} color={c} />
                ))}
            </group>
        </Shadowed>

        <Box args={[2.2, 1.3, 0.08]} position={[-0.5, 1.5, 0.97]}>
            <GlowMat color="#CFE8FF" strength={1.2} />
        </Box>
        <Box args={[0.06, 1.3, 0.1]} position={[-0.5, 1.5, 1.0]} color="#FFFFFF" />
        <Box args={[2.2, 0.06, 0.1]} position={[-0.5, 1.5, 1.0]} color="#FFFFFF" />

        {SPLASHES.map(([x, z, r, c]) => (
            <mesh key={`${x}${z}`} position={[x, 0.025, z]} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[r, 9]} />
                <meshStandardMaterial color={c} />
            </mesh>
        ))}

        <Easel url="/img/posters/arts-2.webp" position={[-2.9, 0, 1.5]} rotation-y={0.5} />
        <Easel url="/img/posters/arts-3.webp" position={[2.95, 0, 1.3]} rotation-y={-0.55} />
    </group>
);
