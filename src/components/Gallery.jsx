import { useTexture } from "@react-three/drei";
import { ProjectFrame } from "./ProjectFrame";
import { projects } from "../data/projects";

export const Gallery = () => {
    // Simple Room: Floor, Ceiling, 4 Walls
    const width = 20;
    const length = 20;
    const height = 8;

    return (
        <group>
            {/* Floor */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color="#111" metalness={0.8} roughness={0.1} />
            </mesh>

            {/* Ceiling */}
            <mesh rotation-x={Math.PI / 2} position={[0, height, 0]}>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color="#222" emissive="#111" />
            </mesh>

            {/* Walls */}
            {/* Back Wall */}
            <mesh position={[0, height / 2, -length / 2]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#050505" />
            </mesh>

            {/* Front Wall */}
            <mesh position={[0, height / 2, length / 2]} rotation-y={Math.PI}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#050505" />
            </mesh>

            {/* Left Wall */}
            <mesh position={[-width / 2, height / 2, 0]} rotation-y={Math.PI / 2}>
                <planeGeometry args={[length, height]} />
                <meshStandardMaterial color="#050505" />
            </mesh>

            {/* Right Wall */}
            <mesh position={[width / 2, height / 2, 0]} rotation-y={-Math.PI / 2}>
                <planeGeometry args={[length, height]} />
                <meshStandardMaterial color="#050505" />
            </mesh>

            {/* Decorative Columns / Arches like in the image */}
            {Array.from({ length: 6 }).map((_, i) => (
                <group key={i} position={[-8, 0, -8 + i * 3.5]}>
                    <mesh position={[0, height / 2, 0]}>
                        <cylinderGeometry args={[0.2, 0.4, height, 16]} />
                        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
                    </mesh>
                    {/* Arch connection */}
                    <mesh position={[8, height - 1, 0]} rotation-z={Math.PI / 2}>
                        <cylinderGeometry args={[0.2, 0.2, 16, 8]} />
                        <meshStandardMaterial color="#333" emissive="#333" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[16, height / 2, 0]}>
                        <cylinderGeometry args={[0.2, 0.4, height, 16]} />
                        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
                    </mesh>
                </group>
            ))}

            {/* Project Frames distributed on walls */}
            {/* Back Wall: Hypatia & Rime Stream */}
            <ProjectFrame project={projects[0]} position={[-4, 3, -9.9]} rotation={[0, 0, 0]} />
            <ProjectFrame project={projects[3]} position={[4, 3, -9.9]} rotation={[0, 0, 0]} />

            {/* Left Wall: Param */}
            <ProjectFrame project={projects[1]} position={[-9.9, 3, 0]} rotation={[0, Math.PI / 2, 0]} />

            {/* Right Wall: ParamTech */}
            <ProjectFrame project={projects[2]} position={[9.9, 3, 0]} rotation={[0, -Math.PI / 2, 0]} />

            {/* Front Wall: Isimiz Var & My Arts */}
            <ProjectFrame project={projects[4]} position={[-4, 3, 9.9]} rotation={[0, Math.PI, 0]} />
            <ProjectFrame project={projects[5]} position={[4, 3, 9.9]} rotation={[0, Math.PI, 0]} />

        </group>
    );
};
