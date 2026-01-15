import { useRef, useState, useMemo } from "react";
import { useCursor, Text, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../store";

const ProjectPlane = ({ project }) => {
    console.log(`Loading texture for: ${project.title}`);
    const texture = useTexture(project.image);
    console.log(`Texture loaded for: ${project.title}`);

    // Calculate fit dimensions to contain the image within 4x3 area
    const dimensions = useMemo(() => {
        if (!texture || !texture.image) return [4, 3];

        const imgWidth = texture.image.width;
        const imgHeight = texture.image.height;
        const imgAspect = imgWidth / imgHeight;

        const frameWidth = 4;
        const frameHeight = 3;
        const frameAspect = frameWidth / frameHeight;

        let width, height;

        if (imgAspect > frameAspect) {
            // Image is wider relative to frame -> Fit to width
            width = frameWidth;
            height = frameWidth / imgAspect;
        } else {
            // Image is taller -> Fit to height
            height = frameHeight;
            width = frameHeight * imgAspect;
        }

        return [width, height];
    }, [texture]);

    return (
        <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={dimensions} />
            <meshBasicMaterial map={texture} transparent opacity={1} />
        </mesh>
    );
};

export const ProjectFrame = ({ project, position, rotation }) => {
    const [hovered, setHover] = useState(false);
    const { setCurrentProject } = useStore();

    useCursor(hovered);

    const handleClick = (e) => {
        e.stopPropagation();
        setCurrentProject(project);
        setHover(false);
    };

    return (
        <group position={position} rotation={rotation}>
            {/* Frame Border */}
            <mesh position={[0, 0, -0.05]} onClick={handleClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
                <boxGeometry args={[4.2, 3.2, 0.1]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} emissive={hovered ? "#444" : "#000"} />
            </mesh>

            {/* Internal Image - Scaled to Fit */}
            <ProjectPlane project={project} />

            {/* Title Text */}
            <Text
                position={[0, -2, 0]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="top"
                maxWidth={3}
            >
                {project.title.toUpperCase()}
            </Text>
        </group>
    );
};
