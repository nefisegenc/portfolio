import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Spherical, Euler } from "three";
import { useStore } from "../store";

export const Player = () => {
    const playerRef = useRef();
    const capeRef = useRef();
    const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false });

    // Camera orbit state - controlled by mouse/touchpad
    const [cameraOrbit, setCameraOrbit] = useState({
        theta: 0,      // Horizontal angle (yaw)
        phi: 0.3       // Vertical angle (pitch) - starts slightly above
    });
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Touch state for two-finger pan
    const lastTouchPos = useRef({ x: 0, y: 0 });
    const touchCount = useRef(0);

    // Update keys
    const handleKeyDown = (e) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            setKeys((k) => ({ ...k, [key]: true }));
        }
    };

    const handleKeyUp = (e) => {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            setKeys((k) => ({ ...k, [key]: false }));
        }
    };

    // Mouse handlers for camera orbit
    const handleMouseDown = (e) => {
        // Right click or middle click for camera rotation
        if (e.button === 2 || e.button === 1) {
            setIsDragging(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };

    const handleMouseUp = (e) => {
        if (e.button === 2 || e.button === 1) {
            setIsDragging(false);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;

        const sensitivity = 0.005;

        setCameraOrbit(prev => ({
            theta: prev.theta - deltaX * sensitivity,
            phi: Math.max(-0.5, Math.min(1.2, prev.phi + deltaY * sensitivity))
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    // Prevent context menu on right click
    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    // Touch handlers for trackpad/mobile
    const handleTouchStart = (e) => {
        touchCount.current = e.touches.length;
        if (e.touches.length === 2) {
            // Two finger touch - use for camera rotation
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            lastTouchPos.current = { x: centerX, y: centerY };
            setIsDragging(true);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && isDragging) {
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            const deltaX = centerX - lastTouchPos.current.x;
            const deltaY = centerY - lastTouchPos.current.y;

            const sensitivity = 0.008;

            setCameraOrbit(prev => ({
                theta: prev.theta - deltaX * sensitivity,
                phi: Math.max(-0.5, Math.min(1.2, prev.phi + deltaY * sensitivity))
            }));

            lastTouchPos.current = { x: centerX, y: centerY };
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length < 2) {
            setIsDragging(false);
        }
        touchCount.current = e.touches.length;
    };

    // Wheel handler for zoom-like camera distance (optional enhancement)
    const handleWheel = (e) => {
        // Two-finger scroll on trackpad
        if (Math.abs(e.deltaX) > 0 || e.ctrlKey) {
            // Horizontal scroll or pinch gesture - rotate camera
            const sensitivity = 0.003;
            setCameraOrbit(prev => ({
                theta: prev.theta - e.deltaX * sensitivity,
                phi: Math.max(-0.5, Math.min(1.2, prev.phi + e.deltaY * sensitivity * 0.5))
            }));
            e.preventDefault();
        }
    };

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("wheel", handleWheel);
        };
    }, [isDragging]);

    const speed = 0.1;
    const rotationSpeed = 0.05;
    const cameraDistance = 4.5;
    const cameraHeight = 2.5;

    useFrame((state) => {
        if (!playerRef.current) return;

        const player = playerRef.current;

        // Camera looks FROM behind the character TOWARDS the character
        // When theta=0, camera is behind (-Z from character), looking at +Z direction
        // Character should move in the direction the camera is pointing
        const cameraForward = new Vector3(
            Math.sin(cameraOrbit.theta),
            0,
            Math.cos(cameraOrbit.theta)
        ).normalize();

        // Camera right direction (perpendicular to forward on horizontal plane)
        const cameraRight = new Vector3(
            -Math.cos(cameraOrbit.theta),
            0,
            Math.sin(cameraOrbit.theta)
        ).normalize();

        // MOVEMENT LOGIC
        // Unified Logic: Character always faces away from camera (Locked Orientation)
        // Controls move character relative to camera (Strafe)

        const { controls } = useStore.getState();

        // Combine Desktop (Keys) and Mobile (Store) inputs
        let inputX = 0;
        let inputZ = 0;

        // Desktop Keys
        if (keys.d) inputX += 1;
        if (keys.a) inputX -= 1;
        if (keys.s) inputZ += 1;
        if (keys.w) inputZ -= 1;

        // Mobile Controls (D-Pad)
        if (controls.x !== 0) inputX += controls.x; // Right/Left
        if (controls.z !== 0) inputZ += controls.z; // Back/Forward (Note: Up is -1 Z in store)

        // Clamp keys
        inputX = Math.max(-1, Math.min(1, inputX));
        inputZ = Math.max(-1, Math.min(1, inputZ));

        const isMoving = inputX !== 0 || inputZ !== 0;

        if (isMoving) {
            const moveDirection = new Vector3();

            // Forward/Back (inputZ)
            // inputZ = -1 (W/Up) -> Move Forward (Add cameraForward)
            // inputZ = 1 (S/Down) -> Move Backward (Sub cameraForward)
            if (inputZ !== 0) {
                moveDirection.add(cameraForward.clone().multiplyScalar(-inputZ));
            }

            // Left/Right (inputX)
            // inputX = 1 (D/Right) -> Move Right (Add cameraRight)
            // inputX = -1 (A/Left) -> Move Left (Sub cameraRight)
            if (inputX !== 0) {
                moveDirection.add(cameraRight.clone().multiplyScalar(inputX));
            }

            // Apply movement
            if (moveDirection.length() > 0) {
                moveDirection.normalize().multiplyScalar(speed);
                player.position.add(moveDirection);
            }
        }

        // ROTATION LOGIC: ALWAYS LOCK TO CAMERA
        // Character faces the same direction the camera is looking
        // When theta=0, camera behind character, so character faces +Z (rotation.y = 0)
        const targetRotation = cameraOrbit.theta;

        // Smoothly rotate player to match camera
        let angleDiff = targetRotation - player.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        player.rotation.y += angleDiff * 0.2;

        // Shared Cape Animation
        if (capeRef.current) {
            const wind = Math.sin(state.clock.elapsedTime * 3) * 0.1;
            const targetCapeRot = isMoving ? 0.6 : 0.1;
            capeRef.current.rotation.x = -targetCapeRot + wind;
        }

        // Boundary Clamp
        player.position.x = Math.max(-9.5, Math.min(9.5, player.position.x));
        player.position.z = Math.max(-9.5, Math.min(9.5, player.position.z));

        // Camera Follow with orbit control
        // Camera orbits around character based on cameraOrbit.theta
        // theta=0 means camera is behind character (-Z offset)
        // We add PI so that when theta=0, camera is at negative Z (behind)
        const cameraTheta = cameraOrbit.theta + Math.PI;

        // Spherical to Cartesian conversion for camera position
        const offsetX = Math.sin(cameraTheta) * cameraDistance * Math.cos(cameraOrbit.phi);
        const offsetZ = Math.cos(cameraTheta) * cameraDistance * Math.cos(cameraOrbit.phi);
        const offsetY = cameraHeight + Math.sin(cameraOrbit.phi) * cameraDistance * 0.5;

        const cameraOffset = new Vector3(offsetX, offsetY, offsetZ);
        const cameraTargetPosition = player.position.clone().add(cameraOffset);

        state.camera.position.lerp(cameraTargetPosition, 0.1);
        state.camera.lookAt(player.position.clone().add(new Vector3(0, 1.5, 0)));
    });

    return (
        <group ref={playerRef} position={[0, 0, 5]}>
            {/* 3D Human Female Character - Facing backwards */}
            <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
                {/* HEAD GROUP */}
                <group position={[0, 1.6, 0]}>
                    {/* Head/Face - slightly oval for feminine look */}
                    <mesh scale={[1, 1.1, 1]}>
                        <sphereGeometry args={[0.18, 32, 32]} />
                        <meshStandardMaterial color="#E8C4B8" roughness={0.4} />
                    </mesh>

                    {/* Neck */}
                    <mesh position={[0, -0.22, 0]}>
                        <cylinderGeometry args={[0.06, 0.08, 0.12, 16]} />
                        <meshStandardMaterial color="#E8C4B8" roughness={0.4} />
                    </mesh>

                    {/* EYES */}
                    <group position={[0, 0.02, 0.14]}>
                        {/* Left Eye White */}
                        <mesh position={[-0.06, 0, 0]} scale={[1, 0.6, 0.3]}>
                            <sphereGeometry args={[0.035, 16, 16]} />
                            <meshStandardMaterial color="#FFFFFF" />
                        </mesh>
                        {/* Left Iris */}
                        <mesh position={[-0.06, 0, 0.012]} scale={[1, 0.6, 0.3]}>
                            <sphereGeometry args={[0.022, 16, 16]} />
                            <meshStandardMaterial color="#4A7C59" /> {/* Green eyes */}
                        </mesh>
                        {/* Left Pupil */}
                        <mesh position={[-0.06, 0, 0.018]}>
                            <sphereGeometry args={[0.008, 8, 8]} />
                            <meshStandardMaterial color="#1a1a1a" />
                        </mesh>
                        {/* Left Eye Highlight */}
                        <mesh position={[-0.052, 0.008, 0.02]}>
                            <sphereGeometry args={[0.004, 8, 8]} />
                            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
                        </mesh>

                        {/* Right Eye White */}
                        <mesh position={[0.06, 0, 0]} scale={[1, 0.6, 0.3]}>
                            <sphereGeometry args={[0.035, 16, 16]} />
                            <meshStandardMaterial color="#FFFFFF" />
                        </mesh>
                        {/* Right Iris */}
                        <mesh position={[0.06, 0, 0.012]} scale={[1, 0.6, 0.3]}>
                            <sphereGeometry args={[0.022, 16, 16]} />
                            <meshStandardMaterial color="#4A7C59" />
                        </mesh>
                        {/* Right Pupil */}
                        <mesh position={[0.06, 0, 0.018]}>
                            <sphereGeometry args={[0.008, 8, 8]} />
                            <meshStandardMaterial color="#1a1a1a" />
                        </mesh>
                        {/* Right Eye Highlight */}
                        <mesh position={[0.068, 0.008, 0.02]}>
                            <sphereGeometry args={[0.004, 8, 8]} />
                            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
                        </mesh>
                    </group>

                    {/* Eyebrows */}
                    <mesh position={[-0.06, 0.08, 0.15]} rotation={[0, 0, 0.15]} scale={[1, 0.3, 0.3]}>
                        <capsuleGeometry args={[0.008, 0.04, 4, 8]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>
                    <mesh position={[0.06, 0.08, 0.15]} rotation={[0, 0, -0.15]} scale={[1, 0.3, 0.3]}>
                        <capsuleGeometry args={[0.008, 0.04, 4, 8]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>

                    {/* Nose */}
                    <mesh position={[0, -0.02, 0.17]} rotation={[-0.3, 0, 0]}>
                        <coneGeometry args={[0.015, 0.04, 8]} />
                        <meshStandardMaterial color="#DDB8A8" roughness={0.5} />
                    </mesh>

                    {/* Lips */}
                    <group position={[0, -0.08, 0.15]}>
                        {/* Upper lip */}
                        <mesh scale={[1, 0.4, 0.5]}>
                            <capsuleGeometry args={[0.012, 0.03, 4, 8]} />
                            <meshStandardMaterial color="#C4706E" roughness={0.3} />
                        </mesh>
                        {/* Lower lip */}
                        <mesh position={[0, -0.012, 0.005]} scale={[1, 0.5, 0.6]}>
                            <capsuleGeometry args={[0.014, 0.025, 4, 8]} />
                            <meshStandardMaterial color="#C4706E" roughness={0.3} />
                        </mesh>
                    </group>

                    {/* Ears */}
                    <mesh position={[-0.17, 0, 0]} rotation={[0, -0.3, 0]} scale={[0.3, 1, 0.8]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshStandardMaterial color="#E0B8A8" roughness={0.5} />
                    </mesh>
                    <mesh position={[0.17, 0, 0]} rotation={[0, 0.3, 0]} scale={[0.3, 1, 0.8]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshStandardMaterial color="#E0B8A8" roughness={0.5} />
                    </mesh>

                    {/* HAIR - Long flowing dark hair */}
                    <group>
                        {/* Hair top/crown */}
                        <mesh position={[0, 0.08, 0]} scale={[1.05, 0.9, 1]}>
                            <sphereGeometry args={[0.2, 32, 32]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        {/* Front bangs */}
                        <mesh position={[0, 0.12, 0.12]} rotation={[-0.4, 0, 0]} scale={[1, 0.8, 0.5]}>
                            <sphereGeometry args={[0.19, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        {/* Side bangs left */}
                        <mesh position={[-0.14, 0.02, 0.08]} rotation={[0, 0.4, 0.2]}>
                            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        {/* Side bangs right */}
                        <mesh position={[0.14, 0.02, 0.08]} rotation={[0, -0.4, -0.2]}>
                            <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        {/* Back hair - long flowing */}
                        <mesh position={[0, -0.1, -0.08]} rotation={[0.2, 0, 0]}>
                            <capsuleGeometry args={[0.16, 0.5, 16, 16]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        {/* Hair strands falling down back */}
                        <mesh position={[-0.08, -0.4, -0.1]} rotation={[0.1, 0, 0.1]}>
                            <capsuleGeometry args={[0.04, 0.3, 8, 8]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        <mesh position={[0.08, -0.4, -0.1]} rotation={[0.1, 0, -0.1]}>
                            <capsuleGeometry args={[0.04, 0.3, 8, 8]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                        <mesh position={[0, -0.45, -0.12]} rotation={[0.15, 0, 0]}>
                            <capsuleGeometry args={[0.05, 0.25, 8, 8]} />
                            <meshStandardMaterial color="#E8C078" roughness={0.7} />
                        </mesh>
                    </group>
                </group>

                {/* BODY GROUP */}
                <group position={[0, 0, 0]}>
                    {/* Upper Torso / Chest */}
                    <mesh position={[0, 1.15, 0]} scale={[1.1, 1, 0.7]}>
                        <capsuleGeometry args={[0.12, 0.25, 10, 16]} />
                        <meshStandardMaterial color="#1E1E1E" />
                    </mesh>

                    {/* Lower Torso / Waist - narrower for feminine shape */}
                    <mesh position={[0, 0.9, 0]} scale={[0.9, 1, 0.7]}>
                        <capsuleGeometry args={[0.1, 0.15, 10, 16]} />
                        <meshStandardMaterial color="#1E1E1E" />
                    </mesh>

                    {/* Hips - wider for feminine shape */}
                    <mesh position={[0, 0.72, 0]} scale={[1.15, 0.8, 0.8]}>
                        <sphereGeometry args={[0.14, 16, 16]} />
                        <meshStandardMaterial color="#1E1E1E" />
                    </mesh>

                    {/* Long Coat/Jacket */}
                    <mesh position={[0, 0.5, 0]}>
                        <coneGeometry args={[0.32, 1.0, 32, 1, true]} />
                        <meshStandardMaterial color="#101014" side={2} roughness={0.6} />
                    </mesh>
                    {/* Coat front panel with glow */}
                    <mesh position={[0, 0.5, 0.16]}>
                        <boxGeometry args={[0.22, 0.8, 0.03]} />
                        <meshStandardMaterial color="#111217" emissive="#3BE8FF" emissiveIntensity={0.5} />
                    </mesh>
                    {/* Coat back panel with glow */}
                    <mesh position={[0, 0.35, -0.16]}>
                        <boxGeometry args={[0.24, 0.7, 0.03]} />
                        <meshStandardMaterial color="#111217" emissive="#7B5CFF" emissiveIntensity={0.4} />
                    </mesh>

                    {/* Collar */}
                    <mesh position={[0, 1.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.1, 0.025, 12, 24]} />
                        <meshStandardMaterial color="#1B1D26" emissive="#1E90FF" emissiveIntensity={0.3} />
                    </mesh>

                    {/* LEFT ARM - Elegant flowing design */}
                    <group position={[-0.16, 1.18, 0]} rotation={[-0.15, 0, 0.25]}>
                        {/* Full arm as single smooth piece */}
                        <mesh position={[0, -0.22, 0]}>
                            <capsuleGeometry args={[0.032, 0.45, 16, 24]} />
                            <meshStandardMaterial color="#E8C4B8" roughness={0.35} />
                        </mesh>
                        {/* Sleeve (upper arm covering) */}
                        <mesh position={[0, -0.08, 0]}>
                            <capsuleGeometry args={[0.038, 0.2, 12, 16]} />
                            <meshStandardMaterial color="#20222B" />
                        </mesh>
                        {/* Elegant hand */}
                        <mesh position={[0, -0.5, 0]} scale={[0.7, 1, 0.5]}>
                            <sphereGeometry args={[0.035, 16, 16]} />
                            <meshStandardMaterial color="#E8C4B8" roughness={0.35} />
                        </mesh>
                    </group>

                    {/* RIGHT ARM - Elegant flowing design */}
                    <group position={[0.16, 1.18, 0]} rotation={[-0.15, 0, -0.25]}>
                        {/* Full arm as single smooth piece */}
                        <mesh position={[0, -0.22, 0]}>
                            <capsuleGeometry args={[0.032, 0.45, 16, 24]} />
                            <meshStandardMaterial color="#E8C4B8" roughness={0.35} />
                        </mesh>
                        {/* Sleeve (upper arm covering) */}
                        <mesh position={[0, -0.08, 0]}>
                            <capsuleGeometry args={[0.038, 0.2, 12, 16]} />
                            <meshStandardMaterial color="#20222B" />
                        </mesh>
                        {/* Elegant hand */}
                        <mesh position={[0, -0.5, 0]} scale={[0.7, 1, 0.5]}>
                            <sphereGeometry args={[0.035, 16, 16]} />
                            <meshStandardMaterial color="#E8C4B8" roughness={0.35} />
                        </mesh>
                    </group>

                    {/* Legs - Thighs */}
                    <group position={[0, 0.55, 0]}>
                        <mesh position={[-0.08, -0.15, 0]}>
                            <capsuleGeometry args={[0.055, 0.25, 8, 16]} />
                            <meshStandardMaterial color="#141414" />
                        </mesh>
                        <mesh position={[0.08, -0.15, 0]}>
                            <capsuleGeometry args={[0.055, 0.25, 8, 16]} />
                            <meshStandardMaterial color="#141414" />
                        </mesh>
                        {/* Legs - Calves */}
                        <mesh position={[-0.08, -0.45, 0]}>
                            <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
                            <meshStandardMaterial color="#141414" />
                        </mesh>
                        <mesh position={[0.08, -0.45, 0]}>
                            <capsuleGeometry args={[0.045, 0.25, 8, 16]} />
                            <meshStandardMaterial color="#141414" />
                        </mesh>
                        {/* Boots */}
                        <mesh position={[-0.08, -0.62, 0.03]}>
                            <boxGeometry args={[0.08, 0.1, 0.15]} />
                            <meshStandardMaterial color="#0A0A0A" />
                        </mesh>
                        <mesh position={[0.08, -0.62, 0.03]}>
                            <boxGeometry args={[0.08, 0.1, 0.15]} />
                            <meshStandardMaterial color="#0A0A0A" />
                        </mesh>
                        {/* Boot heels */}
                        <mesh position={[-0.08, -0.68, -0.02]}>
                            <boxGeometry args={[0.04, 0.04, 0.04]} />
                            <meshStandardMaterial color="#0A0A0A" />
                        </mesh>
                        <mesh position={[0.08, -0.68, -0.02]}>
                            <boxGeometry args={[0.04, 0.04, 0.04]} />
                            <meshStandardMaterial color="#0A0A0A" />
                        </mesh>
                    </group>
                </group>
            </group>
        </group>
    );
};
