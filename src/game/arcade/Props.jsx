// Props the player uses in the arcade: the race kart and the squeaky hammer.
import { Box, Cyl, Shadowed } from "../parts";

const BODY = "#F97316";
const TRIM = "#1C1730";
const WHEEL_SPOTS = [
    [-0.52, 0.48, true],
    [0.52, 0.48, true],
    [-0.52, -0.52, false],
    [0.52, -0.52, false],
];

const Wheel = () => (
    <group rotation-z={Math.PI / 2}>
        <Cyl args={[0.2, 0.2, 0.16, 14]} color={TRIM} />
        <Cyl args={[0.09, 0.09, 0.17, 8]} color="#E5E7EB" />
    </group>
);

// Low go-kart, nose towards +z. `wheels` collects the wheel groups so the
// controller can spin them and steer the front pair.
export const KartModel = ({ wheels, color = BODY, ...props }) => (
    <Shadowed {...props}>
        <Box args={[0.86, 0.14, 1.45]} position={[0, 0.2, 0]} color={color} />
        <Box args={[0.62, 0.16, 0.5]} position={[0, 0.3, 0.42]} color={color} />
        <Box args={[1.0, 0.12, 0.22]} position={[0, 0.2, 0.8]} color={TRIM} />
        <Box args={[0.54, 0.4, 0.1]} position={[0, 0.45, -0.38]} color={TRIM} />
        <Box args={[0.4, 0.22, 0.3]} position={[0, 0.35, -0.62]} color="#3B3350" />
        {/* Spoiler */}
        {[-0.3, 0.3].map((x) => (
            <Box key={x} args={[0.05, 0.28, 0.05]} position={[x, 0.52, -0.72]} color={TRIM} />
        ))}
        <Box args={[0.95, 0.05, 0.24]} position={[0, 0.67, -0.74]} color={color} />
        {/* Steering column and wheel */}
        <Cyl args={[0.025, 0.025, 0.36, 6]} position={[0, 0.45, 0.32]} rotation-x={-0.9} color={TRIM} />
        <mesh position={[0, 0.58, 0.22]} rotation-x={-0.9}>
            <torusGeometry args={[0.13, 0.025, 6, 16]} />
            <meshStandardMaterial color={TRIM} />
        </mesh>
        {/* Racing number on the nose */}
        <mesh position={[0, 0.385, 0.5]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.13, 20]} />
            <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {WHEEL_SPOTS.map(([x, z, front], i) => (
            <group
                key={i}
                position={[x, 0.2, z]}
                rotation-order="YXZ"
                ref={wheels ? (el) => (wheels.current[i] = el && { el, front }) : undefined}
            >
                <Wheel />
            </group>
        ))}
    </Shadowed>
);

// A rival driver: suit and helmet, sitting where the player's character sits.
export const Driver = ({ color }) => (
    <group position={[0, 0.36, -0.12]}>
        <mesh position-y={0.3}>
            <capsuleGeometry args={[0.17, 0.3, 6, 10]} />
            <meshStandardMaterial color={color} />
        </mesh>
        <mesh position-y={0.78}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.78, 0.12]} scale={[1, 0.55, 0.6]}>
            <sphereGeometry args={[0.16, 14, 10]} />
            <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.4} />
        </mesh>
    </group>
);

// A toy mallet held in the hand: the handle hangs on from the arm, the head
// sits across its end. Drawn in the arm's space (shoulder at the origin).
export const Hammer = () => (
    <group>
        <Cyl args={[0.024, 0.024, 0.58, 6]} position={[0, -0.74, 0]} color="#FACC15" />
        <group position={[0, -1.06, 0]} rotation-x={Math.PI / 2}>
            <Cyl args={[0.11, 0.11, 0.28, 14]} color="#EF4444" />
            {[-0.15, 0.15].map((y) => (
                <Cyl key={y} args={[0.115, 0.115, 0.03, 14]} position-y={y} color="#FACC15" />
            ))}
        </group>
    </group>
);
