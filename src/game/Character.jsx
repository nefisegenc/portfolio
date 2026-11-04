// Nefise's avatar, built from primitives. Limbs hang from pivot groups that
// the player controller swings while walking.
const SKIN = "#E8C4B8";
const HAIR = "#E8C078";
const OUTFIT = "#1E1E24";
const COAT = "#15151C";
const BOOTS = "#0E0E12";

const Skin = () => <meshStandardMaterial color={SKIN} roughness={0.45} />;
const Hair = () => <meshStandardMaterial color={HAIR} roughness={0.7} />;

const Eye = ({ x }) => (
    <group position={[x, 0, 0]}>
        <mesh scale={[1, 0.6, 0.3]}>
            <sphereGeometry args={[0.035, 16, 12]} />
            <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position-z={0.012} scale={[1, 0.6, 0.3]}>
            <sphereGeometry args={[0.022, 16, 12]} />
            <meshStandardMaterial color="#4A7C59" />
        </mesh>
        <mesh position-z={0.018}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshStandardMaterial color="#1A1A1A" />
        </mesh>
        <mesh position={[0.008, 0.008, 0.02]}>
            <sphereGeometry args={[0.004, 6, 6]} />
            <meshBasicMaterial color="#FFFFFF" />
        </mesh>
    </group>
);

const Head = () => (
    <group position={[0, 1.6, 0]}>
        <mesh scale={[1, 1.1, 1]}>
            <sphereGeometry args={[0.18, 32, 24]} />
            <Skin />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
            <Skin />
        </mesh>
        <group position={[0, 0.02, 0.14]}>
            <Eye x={-0.06} />
            <Eye x={0.06} />
        </group>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.06, 0.08, 0.15]} rotation-z={-s * 0.15} scale={[1, 0.3, 0.3]}>
                <capsuleGeometry args={[0.008, 0.04, 4, 8]} />
                <meshStandardMaterial color="#6B5236" />
            </mesh>
        ))}
        <mesh position={[0, -0.02, 0.17]} rotation-x={-0.3}>
            <coneGeometry args={[0.015, 0.04, 8]} />
            <meshStandardMaterial color="#DDB8A8" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.085, 0.152]} scale={[1, 0.45, 0.5]}>
            <capsuleGeometry args={[0.013, 0.03, 4, 8]} />
            <meshStandardMaterial color="#C4706E" roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.17, 0, 0]} rotation-y={s * 0.3} scale={[0.3, 1, 0.8]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <Skin />
            </mesh>
        ))}

        {/* Long blonde hair */}
        <mesh position={[0, 0.08, 0]} scale={[1.05, 0.9, 1]}>
            <sphereGeometry args={[0.2, 32, 24]} />
            <Hair />
        </mesh>
        <mesh position={[0, 0.12, 0.12]} rotation-x={-0.4} scale={[1, 0.8, 0.5]}>
            <sphereGeometry args={[0.19, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
            <Hair />
        </mesh>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.14, 0.02, 0.08]} rotation={[0, -s * 0.4, -s * 0.2]}>
                <capsuleGeometry args={[0.03, 0.12, 8, 8]} />
                <Hair />
            </mesh>
        ))}
        <mesh position={[0, -0.12, -0.08]} rotation-x={0.2}>
            <capsuleGeometry args={[0.16, 0.5, 12, 16]} />
            <Hair />
        </mesh>
        {[
            [-0.08, -0.42, -0.1, 0.1],
            [0.08, -0.42, -0.1, -0.1],
            [0, -0.47, -0.12, 0],
        ].map(([x, y, z, rz], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0.12, 0, rz]}>
                <capsuleGeometry args={[0.045, 0.28, 8, 8]} />
                <Hair />
            </mesh>
        ))}
    </group>
);

const Arm = ({ side, rigRef, children }) => (
    <group ref={rigRef} position={[side * 0.17, 1.22, 0]} rotation-z={side * 0.22}>
        {children}
        <mesh position-y={-0.22}>
            <capsuleGeometry args={[0.032, 0.42, 8, 12]} />
            <Skin />
        </mesh>
        <mesh position-y={-0.1}>
            <capsuleGeometry args={[0.04, 0.22, 8, 12]} />
            <meshStandardMaterial color="#22232C" />
        </mesh>
        <mesh position-y={-0.48} scale={[0.7, 1, 0.5]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <Skin />
        </mesh>
    </group>
);

const Leg = ({ side, rigRef }) => (
    <group ref={rigRef} position={[side * 0.08, 0.62, 0]}>
        <mesh position-y={-0.15}>
            <capsuleGeometry args={[0.055, 0.2, 8, 12]} />
            <meshStandardMaterial color={OUTFIT} />
        </mesh>
        <mesh position-y={-0.38}>
            <capsuleGeometry args={[0.046, 0.22, 8, 12]} />
            <meshStandardMaterial color={OUTFIT} />
        </mesh>
        <mesh position={[0, -0.55, 0.03]}>
            <boxGeometry args={[0.09, 0.1, 0.17]} />
            <meshStandardMaterial color={BOOTS} />
        </mesh>
    </group>
);

// `tool` is something held in the right hand (the arcade's blaster).
export const Character = ({ rig, tool }) => {
    const set = (key) => (el) => {
        rig.current[key] = el;
    };
    return (
        <group ref={set("body")}>
            <Head />
            <mesh position={[0, 1.15, 0]} scale={[1.1, 1, 0.7]}>
                <capsuleGeometry args={[0.12, 0.25, 10, 16]} />
                <meshStandardMaterial color={OUTFIT} />
            </mesh>
            <mesh position={[0, 0.9, 0]} scale={[0.9, 1, 0.7]}>
                <capsuleGeometry args={[0.1, 0.15, 10, 16]} />
                <meshStandardMaterial color={OUTFIT} />
            </mesh>
            <mesh position={[0, 1.28, 0]} rotation-x={Math.PI / 2}>
                <torusGeometry args={[0.1, 0.025, 10, 24]} />
                <meshStandardMaterial color="#1B1D26" emissive="#3BA7FF" emissiveIntensity={0.5} />
            </mesh>

            {/* Long coat with glowing trims */}
            <mesh position={[0, 0.74, 0]}>
                <coneGeometry args={[0.32, 0.78, 28, 1, true]} />
                <meshStandardMaterial color={COAT} side={2} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.78, 0.155]} rotation-x={-0.36}>
                <boxGeometry args={[0.05, 0.62, 0.02]} />
                <meshStandardMaterial color="#3BE8FF" emissive="#3BE8FF" emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.72, -0.16]} rotation-x={0.4}>
                <boxGeometry args={[0.2, 0.58, 0.02]} />
                <meshStandardMaterial color="#2A1F55" emissive="#7B5CFF" emissiveIntensity={0.8} />
            </mesh>

            <Arm side={-1} rigRef={set("leftArm")} />
            <Arm side={1} rigRef={set("rightArm")}>
                {tool}
            </Arm>
            <Leg side={-1} rigRef={set("leftLeg")} />
            <Leg side={1} rigRef={set("rightLeg")} />
        </group>
    );
};
