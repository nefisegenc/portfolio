// Head to Head's stadium, the Backend Bot and the bug ball. The match itself
// (physics, the bot's brain, power-ups) lives in field.js; this draws it and
// wires it to the player's avatar, the camera and the HUD.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CanvasTexture, Color, DoubleSide, Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Vector3 } from "three";
import { seeded } from "../../../data/world";
import { Underside } from "../../Island";
import { input } from "../../input";
import { isTouch } from "../../utils";
import { FONT, GlowMat, InstanceColors, Shadowed } from "../../parts";
import { crowdLoop } from "../audio";
import { tickCountdown } from "../countdown";
import { arcadeLink, useArcade } from "../state";
import {
    BALL_R,
    BAR,
    CEILING,
    GOAL_WIDTH,
    HALF,
    HEAD_R,
    HEAD_Y,
    ITEM_COLORS,
    KICK_TIME,
    ROOF_RISE,
    STADIUM,
    STADIUM_YAW,
    TEAMS,
    WALL,
    holdForKickoff,
    kickAngle,
    kickoff,
    newGame,
    publish,
    stadiumToWorld,
    stadiumYaw,
    stepMatch,
} from "./field";

const RADIUS = 15;
const PITCH = { length: 2 * WALL + 1.6, depth: 8, touch: 3 };
// Both players turn a little towards the camera rather than showing it
// their profile.
const TURN = 0.85;
const YOU_YAW = stadiumYaw(Math.cos(TURN), Math.sin(TURN));
const BOT_YAW = Math.atan2(-Math.cos(TURN), Math.sin(TURN));
const TIERS = [0, 1, 2].map((i) => ({ z: -4.6 - i * 1.1, top: 0.55 + i * 0.55 }));
const MAX_FX = 240;
const FOCUS = { x: STADIUM.x, z: STADIUM.z };

// Instance colours tint the emissive glow too, so fans' shirts show at night.
const glowByInstance = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )\ntotalEmissiveRadiance *= vColor;\n#endif"
    );
};

// --- Textures ------------------------------------------------------------------

const canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
};

// Mown stripes and white lines, laid over the whole grass box.
const grassTexture = () => {
    const [c, x] = canvas(1024, 512);
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
        x.fillStyle = i % 2 ? "#2E7D3A" : "#36904A";
        x.fillRect((i * c.width) / stripes, 0, c.width / stripes + 1, c.height);
    }
    const sx = c.width / PITCH.length;
    const sz = c.height / PITCH.depth;
    const u = (px) => (px + PITCH.length / 2) * sx;
    const v = (pz) => (pz + PITCH.depth / 2) * sz;
    x.strokeStyle = "rgba(255,255,255,0.85)";
    x.lineWidth = 5;
    x.strokeRect(u(-HALF), v(-PITCH.touch), 2 * HALF * sx, 2 * PITCH.touch * sz);
    x.beginPath();
    x.moveTo(u(0), v(-PITCH.touch));
    x.lineTo(u(0), v(PITCH.touch));
    x.stroke();
    x.beginPath();
    x.ellipse(u(0), v(0), 1.6 * sx, 1.6 * sz, 0, 0, Math.PI * 2);
    x.stroke();
    for (const s of [-1, 1]) x.strokeRect(s < 0 ? u(-HALF) : u(HALF - 2.2), v(-2.2), 2.2 * sx, 4.4 * sz);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
};

// A net cell, repeated across each net panel (`w` × `h` metres).
let netCanvas = null;
const netTexture = (w, h) => {
    if (!netCanvas) {
        const [c, x] = canvas(64, 64);
        x.strokeStyle = "#FFFFFF";
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(0, 2);
        x.lineTo(64, 2);
        x.moveTo(2, 0);
        x.lineTo(2, 64);
        x.stroke();
        netCanvas = c;
    }
    const tex = new CanvasTexture(netCanvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(w / 0.22, h / 0.22);
    return tex;
};

// The side of a goal: a panel whose top follows the sloping roof.
const sidePanel = (side) => {
    const depth = WALL - HALF;
    const g = new PlaneGeometry(depth, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const top = pos.getY(i) > 0;
        // Fraction of the way from the mouth to the back.
        const back = side > 0 ? lx / depth + 0.5 : 0.5 - lx / depth;
        pos.setY(i, top ? BAR + ROOF_RISE * back : 0);
    }
    g.computeVertexNormals();
    return g;
};

// --- Scenery -------------------------------------------------------------------

const NetMat = ({ map, color }) => (
    <meshBasicMaterial map={map} color={color} transparent opacity={0.55} side={DoubleSide} depthWrite={false} toneMapped={false} />
);

// Frontend's goal is dressed as a browser window, Backend's as a terminal.
const Goal = ({ side }) => {
    const team = side < 0 ? 0 : 1;
    const color = TEAMS[team];
    const depth = WALL - HALF;
    const x0 = side * HALF;
    const x1 = side * WALL;
    const mid = (x0 + x1) / 2;
    const zw = GOAL_WIDTH / 2;
    const roofLen = Math.hypot(depth, ROOF_RISE);
    const tilt = Math.atan2(ROOF_RISE, depth) * side;
    const parts = useMemo(
        () => ({
            panel: sidePanel(side),
            side: netTexture(depth, BAR),
            back: netTexture(GOAL_WIDTH, BAR + ROOF_RISE),
            roof: netTexture(roofLen, GOAL_WIDTH),
        }),
        [side, depth, roofLen]
    );
    return (
        <group>
            {[-zw, zw].map((z) => (
                <mesh key={z} position={[x0, BAR / 2, z]} castShadow>
                    <cylinderGeometry args={[0.07, 0.07, BAR, 10]} />
                    <GlowMat color={color} strength={1.6} />
                </mesh>
            ))}
            <mesh position={[x0, BAR, 0]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.07, 0.07, GOAL_WIDTH + 0.14, 10]} />
                <GlowMat color={color} strength={1.6} />
            </mesh>
            {[-zw, zw].map((z) => (
                <group key={`b${z}`}>
                    <mesh position={[x1, (BAR + ROOF_RISE) / 2, z]}>
                        <cylinderGeometry args={[0.05, 0.05, BAR + ROOF_RISE, 8]} />
                        <meshStandardMaterial color="#CBD5E1" />
                    </mesh>
                    <mesh position={[mid, BAR + ROOF_RISE / 2, z]} rotation-z={Math.PI / 2 + tilt}>
                        <cylinderGeometry args={[0.05, 0.05, roofLen, 8]} />
                        <GlowMat color={color} strength={1.2} />
                    </mesh>
                    <mesh geometry={parts.panel} position={[mid, 0, z]}>
                        <NetMat map={parts.side} color={color} />
                    </mesh>
                </group>
            ))}
            <mesh position={[x1, (BAR + ROOF_RISE) / 2, 0]} rotation-y={Math.PI / 2}>
                <planeGeometry args={[GOAL_WIDTH, BAR + ROOF_RISE]} />
                <NetMat map={parts.back} color={color} />
            </mesh>
            <group position={[mid, BAR + ROOF_RISE / 2, 0]} rotation-z={tilt}>
                <mesh rotation-x={-Math.PI / 2}>
                    <planeGeometry args={[roofLen, GOAL_WIDTH]} />
                    <NetMat map={parts.roof} color={color} />
                </mesh>
            </group>
            {/* The window's title bar along the near side */}
            <group position={[mid, BAR + ROOF_RISE / 2 - 0.2, zw + 0.04]} rotation-z={tilt}>
                <mesh>
                    <boxGeometry args={[roofLen, 0.3, 0.04]} />
                    <meshStandardMaterial color="#1E1B2E" />
                </mesh>
                {team === 0 ? (
                    ["#F87171", "#FACC15", "#4ADE80"].map((c, i) => (
                        <mesh key={c} position={[-side * (roofLen / 2 - 0.18 - i * 0.17), 0, 0.025]}>
                            <circleGeometry args={[0.055, 16]} />
                            <meshBasicMaterial color={c} toneMapped={false} />
                        </mesh>
                    ))
                ) : (
                    <Text font={FONT} fontSize={0.22} position={[0, 0, 0.025]} anchorX="center" anchorY="middle" color={color}>
                        {">_ prod"}
                    </Text>
                )}
            </group>
        </group>
    );
};

// Fans in the stands: Frontend's on the left, Backend's on the right.
const SHIRTS = [
    ["#A855F7", "#C084FC", "#EC4899", "#8B5CF6"],
    ["#22C55E", "#4ADE80", "#14B8A6", "#84CC16"],
].map((list) => list.map((c) => new Color(c)));
const SKIN = ["#F1C7A8", "#D9A07C", "#A86B4C", "#7A4A33", "#F5D3BC"].map((c) => new Color(c));
const CROWD = (() => {
    const rand = seeded(41);
    const out = [];
    TIERS.forEach((tier, row) => {
        for (let x = -10.2 + (row % 2) * 0.45; x <= 10.2; x += 0.9) {
            if (rand() < 0.12) continue;
            const team = x < 0 ? 0 : 1;
            out.push({
                x: x + (rand() - 0.5) * 0.2,
                z: tier.z + (rand() - 0.5) * 0.2,
                y: tier.top,
                team,
                shirt: SHIRTS[team][Math.floor(rand() * 4)],
                skin: SKIN[Math.floor(rand() * SKIN.length)],
                phase: rand() * Math.PI * 2,
                h: 0.85 + rand() * 0.25,
            });
        }
    });
    return out;
})();

// Code scrolling on the advertising boards behind the touchline; each
// board flips between two lines every few seconds.
const BOARDS = [
    { x: -6.2, color: "#E879F9", lines: ['<Goal team="frontend" />', "npm run win"] },
    { x: 0, color: "#FACC15", lines: ["git push --force", "// TODO: blame backend"] },
    { x: 6.2, color: "#4ADE80", lines: ["SELECT * FROM goals;", "HTTP 200 · GOAL OK"] },
];

const Boards = ({ set }) => (
    <group position={[0, 0, -PITCH.touch - 0.55]}>
        <mesh position-y={0.36}>
            <boxGeometry args={[18.8, 0.72, 0.12]} />
            <meshStandardMaterial color="#07060D" />
        </mesh>
        {BOARDS.map((b, i) =>
            b.lines.map((line, j) => (
                <Text
                    key={line}
                    ref={set(`board${i}${j}`)}
                    font={FONT}
                    fontSize={0.36}
                    position={[b.x, 0.38, 0.07]}
                    anchorX="center"
                    anchorY="middle"
                    visible={j === 0}
                >
                    {line}
                    <GlowMat color={b.color} strength={1.8} />
                </Text>
            ))
        )}
    </group>
);

// A floodlight tower at a back corner of the stands.
const Floodlight = ({ x }) => {
    const top = [x, 9.4, -6.6];
    return (
        <group>
            <mesh position={[x, 4.7, -6.6]} castShadow>
                <boxGeometry args={[0.32, 9.4, 0.32]} />
                <meshStandardMaterial color="#2A2340" />
            </mesh>
            <group position={top} rotation={[0.45, -Math.sign(x) * 0.6, 0]}>
                <mesh>
                    <boxGeometry args={[2, 1.1, 0.25]} />
                    <meshStandardMaterial color="#1C1730" />
                </mesh>
                <mesh position-z={0.13}>
                    <planeGeometry args={[1.8, 0.9]} />
                    <GlowMat color="#FFF7D6" strength={2.6} />
                </mesh>
            </group>
        </group>
    );
};

// The cage the ball bounces round: a glass ceiling, and glass walls above
// the goals, edged in neon.
const Glass = () => <meshBasicMaterial color="#22D3EE" transparent opacity={0.07} side={DoubleSide} depthWrite={false} toneMapped={false} />;

const Cage = () => {
    const low = BAR + ROOF_RISE;
    const height = CEILING - low;
    return (
        <group>
            <mesh position-y={CEILING} rotation-x={Math.PI / 2}>
                <planeGeometry args={[2 * WALL, GOAL_WIDTH]} />
                <Glass />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * WALL, low + height / 2, 0]} rotation-y={Math.PI / 2}>
                    <planeGeometry args={[GOAL_WIDTH, height]} />
                    <Glass />
                </mesh>
            ))}
            {[-1, 1].map((side) => (
                <group key={side} position-z={(side * GOAL_WIDTH) / 2}>
                    <mesh position-y={CEILING}>
                        <boxGeometry args={[2 * WALL + 0.06, 0.06, 0.06]} />
                        <GlowMat color="#22D3EE" strength={2} />
                    </mesh>
                    {[-1, 1].map((s) => (
                        <mesh key={s} position={[s * WALL, low + height / 2, 0]}>
                            <boxGeometry args={[0.06, height, 0.06]} />
                            <GlowMat color="#22D3EE" strength={2} />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
};

const Stadium = ({ set }) => {
    const grass = useMemo(() => grassTexture(), []);
    return (
        <group>
            <mesh position-y={-0.65} receiveShadow>
                <cylinderGeometry args={[RADIUS, RADIUS - 0.3, 1, 48]} />
                <meshStandardMaterial color="#1C1730" roughness={0.9} />
            </mesh>
            <mesh position-y={-0.15} rotation-x={Math.PI / 2}>
                <torusGeometry args={[RADIUS - 0.05, 0.06, 6, 64]} />
                <GlowMat color="#22D3EE" strength={1.6} />
            </mesh>
            <Underside radius={RADIUS} />
            {/* Floodlit grass */}
            <mesh position-y={-0.075} receiveShadow>
                <boxGeometry args={[PITCH.length, 0.15, PITCH.depth]} />
                <meshStandardMaterial map={grass} emissiveMap={grass} emissive="#FFFFFF" emissiveIntensity={0.3} roughness={1} />
            </mesh>
            <Goal side={-1} />
            <Goal side={1} />
            <Cage />
            <Boards set={set} />
            {/* Stands: three tiers with neon edges in the teams' colours */}
            <Shadowed>
                {TIERS.map((tier) => (
                    <mesh key={tier.z} position={[0, tier.top / 2, tier.z]}>
                        <boxGeometry args={[21.6, tier.top, 1.1]} />
                        <meshStandardMaterial color="#211B35" roughness={0.9} />
                    </mesh>
                ))}
                <mesh position={[0, 1.8, -7.75]}>
                    <boxGeometry args={[22.4, 3.6, 0.3]} />
                    <meshStandardMaterial color="#14111F" roughness={0.9} />
                </mesh>
            </Shadowed>
            {TIERS.map((tier) =>
                [0, 1].map((team) => (
                    <mesh key={`${tier.z}${team}`} position={[team ? 5.4 : -5.4, tier.top, tier.z + 0.56]}>
                        <boxGeometry args={[10.8, 0.05, 0.05]} />
                        <GlowMat color={TEAMS[team]} strength={1.8} />
                    </mesh>
                ))
            )}
            <Text font={FONT} fontSize={0.6} position={[0, 3.05, -7.58]} anchorY="middle">
                FULL STACK ARENA
                <GlowMat color="#22D3EE" strength={2} />
            </Text>
            {["FRONTEND", "BACKEND"].map((name, team) => (
                <Text key={name} font={FONT} fontSize={0.55} position={[team ? 7.6 : -7.6, 3.05, -7.58]} anchorY="middle">
                    {name}
                    <GlowMat color={TEAMS[team]} strength={2.2} />
                </Text>
            ))}
            <Floodlight x={-11.4} />
            <Floodlight x={11.4} />
        </group>
    );
};

// --- The bug ball ------------------------------------------------------------------

// A bug curled up into a ball: armour bands round its body, its head with
// eyes and feelers poking out of one side.
export const BugBallModel = () => (
    <group>
        <mesh castShadow>
            <sphereGeometry args={[BALL_R, 24, 18]} />
            <meshStandardMaterial color="#E11D48" emissive="#BE123C" emissiveIntensity={0.45} roughness={0.35} />
        </mesh>
        {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
            <mesh key={x} position-x={x} rotation-y={Math.PI / 2}>
                <torusGeometry args={[Math.sqrt(BALL_R * BALL_R - x * x) + 0.004, 0.018, 6, 28]} />
                <meshStandardMaterial color="#4C0519" />
            </mesh>
        ))}
        <group position-x={BALL_R * 0.85}>
            <mesh>
                <sphereGeometry args={[0.13, 14, 10]} />
                <meshStandardMaterial color="#4C0519" roughness={0.4} />
            </mesh>
            {[-1, 1].map((s) => (
                <group key={s}>
                    <mesh position={[0.08, 0.05, s * 0.065]}>
                        <sphereGeometry args={[0.04, 10, 8]} />
                        <meshBasicMaterial color="#FFFFFF" />
                    </mesh>
                    <mesh position={[0.11, 0.05, s * 0.07]}>
                        <sphereGeometry args={[0.02, 8, 6]} />
                        <meshBasicMaterial color="#111827" />
                    </mesh>
                    <mesh position={[0.1, 0.17, s * 0.06]} rotation={[s * 0.5, 0, -0.5]}>
                        <cylinderGeometry args={[0.008, 0.008, 0.2, 5]} />
                        <meshStandardMaterial color="#4C0519" />
                    </mesh>
                    <mesh position={[0.15, 0.26, s * 0.11]}>
                        <sphereGeometry args={[0.022, 8, 6]} />
                        <GlowMat color="#FACC15" strength={2} />
                    </mesh>
                </group>
            ))}
        </group>
    </group>
);

// --- The players: big heads on a single boot ------------------------------------------

// The boot hangs from a pivot inside the bottom of the head and swings
// forward to kick.
const Boot = ({ set, name, color, glow }) => (
    <group ref={set(name)} position={[0, 0.42, 0.05]}>
        <mesh position={[0, -0.24, 0.1]} rotation-x={Math.PI / 2} castShadow>
            <capsuleGeometry args={[0.14, 0.3, 6, 12]} />
            <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.36, 0.12]}>
            <boxGeometry args={[0.3, 0.06, 0.6]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.22, 0.3]}>
            <boxGeometry args={[0.29, 0.04, 0.1]} />
            <GlowMat color={glow} strength={2} />
        </mesh>
    </group>
);

// Stars circling a head knocked silly by a force shot.
const Dizzy = ({ set, name }) => (
    <group ref={set(name)} position-y={HEAD_Y + HEAD_R + 0.25} visible={false}>
        {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.45, 0, Math.sin((i * Math.PI * 2) / 3) * 0.45]}>
                <octahedronGeometry args={[0.09, 0]} />
                <GlowMat color="#FDE047" strength={2.4} />
            </mesh>
        ))}
    </group>
);

// Her colours, as on the island's avatar.
const FACE = "#E8C4B8";
const HairMat = () => <meshStandardMaterial color="#E8C078" roughness={0.7} />;

// Nefise as a big head: long blonde hair, green eyes, a smile and the
// neon collar from her coat.
const NefiseHead = ({ set }) => (
    <group>
        <mesh castShadow>
            <sphereGeometry args={[0.7, 40, 32]} />
            <meshStandardMaterial color={FACE} roughness={0.5} />
        </mesh>
        <mesh rotation-x={-0.25}>
            <sphereGeometry args={[0.74, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.36]} />
            <HairMat />
        </mesh>
        <mesh position={[0, 0.05, -0.2]} scale={[1.02, 1, 0.9]}>
            <sphereGeometry args={[0.72, 32, 24]} />
            <HairMat />
        </mesh>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.6, -0.15, 0.22]} rotation={[0.15, 0, s * 0.12]}>
                <capsuleGeometry args={[0.13, 0.55, 8, 12]} />
                <HairMat />
            </mesh>
        ))}
        <mesh position={[0, -0.38, -0.3]} scale={[1, 1, 0.7]}>
            <capsuleGeometry args={[0.55, 0.3, 12, 20]} />
            <HairMat />
        </mesh>
        <group ref={set("youEyes")} position-y={0.02}>
            {[-1, 1].map((s) => (
                <group key={s} position={[s * 0.25, 0, 0.6]}>
                    <mesh scale={[1, 1.15, 0.45]}>
                        <sphereGeometry args={[0.13, 20, 16]} />
                        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
                    </mesh>
                    <mesh position={[0, -0.01, 0.045]} scale={[1, 1.15, 0.4]}>
                        <sphereGeometry args={[0.085, 18, 14]} />
                        <meshStandardMaterial color="#4A7C59" roughness={0.3} />
                    </mesh>
                    <mesh position={[0, -0.01, 0.07]}>
                        <sphereGeometry args={[0.045, 12, 10]} />
                        <meshBasicMaterial color="#111111" />
                    </mesh>
                    <mesh position={[-0.03, 0.03, 0.09]}>
                        <sphereGeometry args={[0.02, 8, 6]} />
                        <meshBasicMaterial color="#FFFFFF" />
                    </mesh>
                </group>
            ))}
        </group>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.25, 0.22, 0.63]} rotation-z={Math.PI / 2 - s * 0.15}>
                <capsuleGeometry args={[0.022, 0.13, 4, 8]} />
                <meshStandardMaterial color="#8A6A45" />
            </mesh>
        ))}
        <mesh position={[0, -0.1, 0.69]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#DDB8A8" />
        </mesh>
        <mesh position={[0, -0.21, 0.655]} rotation-z={Math.PI}>
            <torusGeometry args={[0.1, 0.022, 8, 20, Math.PI]} />
            <meshStandardMaterial color="#C4706E" />
        </mesh>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.42, -0.12, 0.53]} scale={[1, 0.6, 0.3]}>
                <sphereGeometry args={[0.08, 12, 10]} />
                <meshStandardMaterial color="#F4A3A8" />
            </mesh>
        ))}
        <mesh position-y={-0.66} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.3, 0.035, 8, 32]} />
            <GlowMat color="#3BE8FF" strength={2} />
        </mesh>
    </group>
);

// The Backend Bot: a database for a head (three platters with green status
// lights between them) and a little screen for a face.
const BotHead = ({ set }) => (
    <group>
        {[-0.47, 0, 0.47].map((y) => (
            <mesh key={y} position-y={y} castShadow>
                <cylinderGeometry args={[0.7, 0.7, 0.42, 40]} />
                <meshStandardMaterial color="#64748B" metalness={0.35} roughness={0.35} />
            </mesh>
        ))}
        <mesh position-y={0.7}>
            <cylinderGeometry args={[0.64, 0.7, 0.05, 40]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.35} roughness={0.35} />
        </mesh>
        {[-0.235, 0.235].map((y) => (
            <mesh key={y} position-y={y}>
                <cylinderGeometry args={[0.715, 0.715, 0.05, 40]} />
                <GlowMat color={TEAMS[1]} strength={2.2} />
            </mesh>
        ))}
        <group position={[0, 0.02, 0.66]}>
            <mesh>
                <boxGeometry args={[0.78, 0.36, 0.1]} />
                <meshStandardMaterial color="#052E16" />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} ref={set(s < 0 ? "botEyeL" : "botEyeR")} position={[s * 0.18, 0.03, 0.055]}>
                    <boxGeometry args={[0.12, 0.15, 0.01]} />
                    <GlowMat color={TEAMS[1]} strength={2.6} />
                </mesh>
            ))}
            <mesh ref={set("botMouth")} position={[0, -0.11, 0.055]}>
                <boxGeometry args={[0.2, 0.03, 0.01]} />
                <GlowMat color={TEAMS[1]} strength={2.2} />
            </mesh>
        </group>
        <mesh position-y={0.85}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
            <meshStandardMaterial color="#94A3B8" />
        </mesh>
        <mesh ref={set("botLed")} position-y={1.03}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <GlowMat color={TEAMS[1]} strength={3} />
        </mesh>
    </group>
);

// A player: the root moves and leans with the match, `Turn` faces the
// camera three-quarters on, `Head` bobs and squashes, `Foot` kicks.
const Baller = ({ set, id, boot, glow, children }) => (
    <group ref={set(id)}>
        <group ref={set(`${id}Turn`)}>
            <group ref={set(`${id}Head`)} position-y={HEAD_Y}>
                {children}
            </group>
            <Boot set={set} name={`${id}Foot`} color={boot} glow={glow} />
            <Dizzy set={set} name={`${id}Dizzy`} />
        </group>
    </group>
);

const lerp = (a, b, t) => a + (b - a) * t;
const YAWS = [Math.atan2(Math.cos(TURN), Math.sin(TURN)), BOT_YAW];
const strides = [0, 0.6];

const animatePlayer = (m, i, p, t, dt) => {
    const root = m[`p${i}`];
    const turn = m[`p${i}Turn`];
    const head = m[`p${i}Head`];
    const foot = m[`p${i}Foot`];
    const dizzy = m[`p${i}Dizzy`];
    root.position.set(p.x, p.y, 0);
    turn.rotation.y = YAWS[i];
    dizzy.visible = p.stun > 0;
    if (dizzy.visible) dizzy.rotation.y = t * 6;
    m[`shadow${i}`].position.set(p.x, 0.015, 0);
    m[`shadow${i}`].scale.setScalar(Math.max(0.35, 1 - p.y / 3));
    if (p.frozen > 0) return;
    const speed = Math.abs(p.vx);
    const run = Math.min(1, speed / 4);
    const air = p.y > 0.02;
    const k = Math.min(1, dt * 12);
    strides[i] += dt * (6 + speed * 2);
    // Hops along leaning into the run; squashes on headers and landings,
    // stretches on the way up; rocks back when knocked silly.
    head.position.y = HEAD_Y + (air ? 0 : Math.abs(Math.sin(strides[i])) * 0.08 * run);
    root.rotation.z = lerp(root.rotation.z, (-p.vx / 6) * 0.16, k);
    turn.rotation.x = lerp(turn.rotation.x, p.stun > 0 ? -0.5 : 0, k);
    const squash = p.squash / 0.16;
    const stretch = air && p.vy > 2 ? 0.05 : 0;
    head.scale.set(1 + squash * 0.12 - stretch, 1 - squash * 0.16 + stretch, 1 + squash * 0.12 - stretch);
    foot.rotation.x = p.kick > 0 ? kickAngle(1 - p.kick / KICK_TIME) : lerp(foot.rotation.x, air ? -0.5 : Math.sin(strides[i]) * 0.55 * run, k);
};

// Faces: Nefise blinks now and then; the bot squints when pleased, slants
// its eyes when upset and looks stunned when knocked over.
const animateFaces = (m, [you, them], t) => {
    m.youEyes.scale.y = you.stun > 0 ? 0.3 : t % 3.4 < 0.12 ? 0.15 : 1;
    const tilt = them.mood < 0 ? 0.5 : 0;
    const squint = them.mood > 0 ? 0.35 : them.stun > 0 ? 0.15 : 1;
    m.botEyeL.rotation.z = -tilt;
    m.botEyeR.rotation.z = tilt;
    m.botEyeL.scale.y = m.botEyeR.scale.y = squint;
    m.botMouth.scale.x = them.mood > 0 ? 1.6 : them.mood < 0 ? 0.5 : 1;
    m.botLed.visible = Math.floor(t * 3) % 2 === 0;
};

// --- Power-ups ---------------------------------------------------------------------

const Coffee = () => (
    <group>
        <mesh>
            <cylinderGeometry args={[0.17, 0.14, 0.3, 18]} />
            <meshStandardMaterial color="#F8FAFC" />
        </mesh>
        <mesh position-y={0.146}>
            <cylinderGeometry args={[0.155, 0.155, 0.01, 18]} />
            <meshStandardMaterial color="#5B3A1E" />
        </mesh>
        <mesh position-x={0.19}>
            <torusGeometry args={[0.08, 0.025, 8, 16]} />
            <meshStandardMaterial color="#F8FAFC" />
        </mesh>
    </group>
);

const Bricks = () => (
    <group>
        {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
                <mesh key={`${row}${col}`} position={[(col - 0.5) * 0.24 + (row % 2) * 0.06, row * 0.13 - 0.13, 0]}>
                    <boxGeometry args={[0.22, 0.11, 0.14]} />
                    <meshStandardMaterial color="#C2410C" />
                </mesh>
            ))
        )}
        <mesh position-y={0.24}>
            <coneGeometry args={[0.13, 0.3, 10]} />
            <GlowMat color="#FB923C" strength={2.4} />
        </mesh>
    </group>
);

const Crystal = () => (
    <group>
        <mesh scale={[0.8, 1.3, 0.8]}>
            <octahedronGeometry args={[0.2, 0]} />
            <GlowMat color="#67E8F9" strength={1.6} />
        </mesh>
        {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.17, -0.06, 0]} scale={[0.5, 0.9, 0.5]} rotation-z={s * 0.5}>
                <octahedronGeometry args={[0.15, 0]} />
                <GlowMat color="#A5F3FC" strength={1.4} />
            </mesh>
        ))}
    </group>
);

// Overclock: a processor chip, gold pins round a glowing core.
const Chip = () => (
    <group rotation-x={0.5}>
        <mesh>
            <boxGeometry args={[0.42, 0.42, 0.06]} />
            <meshStandardMaterial color="#1E1B2E" />
        </mesh>
        <mesh position-z={0.035}>
            <boxGeometry args={[0.22, 0.22, 0.02]} />
            <GlowMat color="#E879F9" strength={2.4} />
        </mesh>
        {[-1, 1].flatMap((s) =>
            [-0.12, 0, 0.12].flatMap((o) => [
                <mesh key={`x${s}${o}`} position={[s * 0.25, o, 0]}>
                    <boxGeometry args={[0.08, 0.04, 0.03]} />
                    <meshStandardMaterial color="#FACC15" metalness={0.6} roughness={0.3} />
                </mesh>,
                <mesh key={`y${s}${o}`} position={[o, s * 0.25, 0]}>
                    <boxGeometry args={[0.04, 0.08, 0.03]} />
                    <meshStandardMaterial color="#FACC15" metalness={0.6} roughness={0.3} />
                </mesh>,
            ])
        )}
    </group>
);

const Item = ({ set }) => (
    <group ref={set("item")} visible={false}>
        <group ref={set("item_coffee")}>
            <Coffee />
        </group>
        <group ref={set("item_wall")}>
            <Bricks />
        </group>
        <group ref={set("item_freeze")}>
            <Crystal />
        </group>
        <group ref={set("item_overclock")}>
            <Chip />
        </group>
        <mesh ref={set("itemBubble")}>
            <sphereGeometry args={[0.45, 24, 16]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
    </group>
);

// --- Effects ------------------------------------------------------------------------

const tmp = new Object3D();
const colors = new Map();
const colorOf = (hex) => {
    let c = colors.get(hex);
    if (!c) {
        c = new Color(hex);
        colors.set(hex, c);
    }
    return c;
};

// Moves, fades and draws the particles, compacting the list in place.
const drawFx = (list, dt, mesh) => {
    let live = 0;
    for (const p of list) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.03) {
            p.y = 0.03;
            p.vy *= -0.3;
            p.vx *= 0.7;
        }
        tmp.position.set(p.x, p.y, p.z);
        tmp.rotation.set(p.life * 9, p.life * 6, 0);
        tmp.scale.setScalar(Math.max(0.02, Math.min(1, p.life * 2.5) * p.size));
        tmp.updateMatrix();
        mesh.setMatrixAt(live, tmp.matrix);
        mesh.setColorAt(live, colorOf(p.color));
        list[live++] = p;
    }
    list.length = live;
    mesh.count = live;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

const puff = (fx, x, y, color, opts) => {
    if (fx.length >= MAX_FX) return;
    fx.push({ x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.5, size: 0.1, gravity: 0, color, ...opts });
};

// --- Wiring ---------------------------------------------------------------------------

const cam = { position: new Vector3(), target: new Vector3(), stiffness: 5, fov: 40 };
const toWorld = (v, x, y, z) => {
    const [wx, wy, wz] = stadiumToWorld(x, y, z);
    v.set(wx, wy, wz);
};

// Far enough back to fit both goals on a wide screen; on a narrow one the
// camera follows the ball along the pitch instead.
// Touch screens fit a band of the pitch between the score card and the
// buttons along the bottom (in pixels; upright phones also show a hint under
// the card). Upright ones fit it floor to ceiling, standing further back to
// show more of the pitch's width; sideways ones are short, so they fit it up
// to just under the ceiling and come in closer, the ceiling going behind the
// card.
const TOUCH_FRAME = {
    upright: { top: 128, bottom: 100, high: CEILING + 0.3, near: 15 },
    wide: { top: 64, bottom: 84, high: CEILING - 1, near: 11 },
};
const FLOOR = -0.3;
const frameTouch = (size, tan, aspect, span) => {
    const { top, bottom, high, near } = TOUCH_FRAME[size.height > size.width ? "upright" : "wide"];
    const free = Math.max(0.3, (size.height - top - bottom) / size.height);
    const dist = Math.max(near, Math.min(30, span / (tan * aspect)), (high - FLOOR) / (free * 2 * tan));
    // Where the free space's middle sits, from the top of the screen (0) to the bottom (1).
    const mid = (top + (free * size.height) / 2) / size.height;
    return { dist, lookY: (FLOOR + high) / 2 + (mid - 0.5) * 2 * dist * tan };
};
const aimCamera = (g, size) => {
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const span = WALL + 0.5;
    const { dist, lookY } = isTouch
        ? frameTouch(size, tan, aspect, span)
        : { dist: Math.max(15, Math.min(22, span / (tan * aspect))), lookY: 3.4 };
    const room = Math.max(0, span - dist * tan * aspect);
    const x = Math.max(-room, Math.min(room, g.ball.x * 0.85));
    const shake = g.shake * 0.4;
    // Level with the crossbars, so the pitch sits low in the frame with the
    // stands and sky above it.
    toWorld(cam.position, x + (Math.random() - 0.5) * shake, 3.6 + (Math.random() - 0.5) * shake, dist);
    toWorld(cam.target, x, lookY, 0);
    arcadeLink.camera = cam;
};

const mine = { move: 0, jump: false, kick: false };
const readControls = () => {
    mine.move = Math.max(-1, Math.min(1, (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x));
    mine.jump = input.forward || input.joystick.y < -0.55;
    mine.kick = arcadeLink.action;
    arcadeLink.action = false;
    return mine;
};

// The stadium draws you as a big head, so the usual avatar is hidden and
// just kept where the match puts you.
const spot = { x: 0, y: 0, z: 0, rotY: YOU_YAW };
const placeAvatar = (p) => {
    const [x, y, z] = stadiumToWorld(p.x, p.y, 0);
    spot.x = x;
    spot.y = y;
    spot.z = z;
    arcadeLink.lock = spot;
    arcadeLink.hide = true;
};

// What the stadium shows between matches: the ball on the centre spot.
const idle = newGame();
idle.ball.y = BALL_R;

export const HeadToHead = () => {
    const active = useArcade((s) => s.active === "head");
    const run = useArcade((s) => s.run);
    const game = useRef(null);
    const fx = useRef([]);
    const refs = useRef({});
    const set = (key) => (el) => (refs.current[key] = el);

    useEffect(() => {
        fx.current = [];
        if (!active) {
            game.current = null;
            return;
        }
        const g = newGame();
        game.current = g;
        const [x, y, z] = stadiumToWorld(g.players[0].x, 0, 0);
        arcadeLink.teleport = { x, z, rotY: YOU_YAW };
        spot.x = x;
        spot.y = y;
        spot.z = z;
        arcadeLink.lock = spot;
        arcadeLink.hide = true;
        arcadeLink.snap = true;
        publish(g, useArcade.getState());
    }, [active, run]);

    useLayoutEffect(() => {
        const m = refs.current;
        m.fx.count = 0;
        CROWD.forEach((c, i) => {
            m.crowd.setColorAt(i, c.shirt);
            m.heads.setColorAt(i, c.skin);
        });
        m.crowd.instanceColor.needsUpdate = true;
        m.heads.instanceColor.needsUpdate = true;
    }, []);

    useFrame(({ clock, size }, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const t = clock.elapsedTime;
        const g = game.current;
        const store = useArcade.getState();
        const m = refs.current;
        const list = fx.current;

        // (The store can end the match a frame before this component hears
        // of it, after which it must leave the player and camera alone.)
        if (g && store.active === "head") {
            if (store.status === "countdown") {
                holdForKickoff(g, dt);
                arcadeLink.action = false;
                if (tickCountdown(g, dt)) kickoff(g, 0);
            } else if (store.status === "playing") {
                stepMatch(g, dt, readControls(), { store, fx: list });
            }
            placeAvatar(g.players[0]);
            aimCamera(g, size);
            arcadeLink.focus = FOCUS;
            const roar = g.cheer.time > 0 ? 0.1 : 0;
            crowdLoop.set(store.status === "done" ? 0 : 0.035 + roar, 700 + roar * 3000);
        }
        const view = g ?? idle;
        const b = view.ball;

        // Ball, its shadow, and its glow and fiery trail during a turbo shot.
        m.ball.position.set(b.x, b.y, 0);
        m.ball.rotation.z = b.spin;
        const shade = Math.max(0.3, 1 - b.y / 7);
        m.ballShadow.position.set(b.x, 0.015, 0);
        m.ballShadow.scale.setScalar(shade);
        m.ballShadow.material.opacity = 0.4 * shade;
        m.ballGlow.visible = b.force > 0;
        if (b.force > 0) {
            const color = TEAMS[b.by?.side > 0 ? 1 : 0];
            m.ballGlow.material.color.set(color);
            m.ballGlow.scale.setScalar(1.15 + Math.sin(t * 40) * 0.12);
            [color, "#FDE047", "#F97316"].forEach((c, k) =>
                puff(list, b.x - b.vx * 0.01 * k, b.y, c, {
                    vx: -b.vx * 0.08 + (Math.random() - 0.5),
                    vy: (Math.random() - 0.5) * 1.2,
                    z: (Math.random() - 0.5) * 0.4,
                    life: 0.4,
                    size: 0.22 - k * 0.04,
                })
            );
        }
        // A shockwave where a turbo shot went off.
        const shock = view.shock;
        m.shock.visible = shock.time > 0;
        if (shock.time > 0) {
            const k = 1 - shock.time / 0.45;
            m.shock.position.set(shock.x, shock.y, 0);
            m.shock.scale.setScalar(0.4 + k * 3.2);
            m.shock.material.color.set(shock.color);
            m.shock.material.opacity = 0.8 * (1 - k);
        }

        view.players.forEach((p, i) => animatePlayer(m, i, p, t, dt));
        animateFaces(m, view.players, t);

        // A ring under each player whose force shot is ready, ice round a
        // frozen one, steam off one full of coffee.
        view.players.forEach((p, i) => {
            const ring = m[`ring${i}`];
            ring.visible = Boolean(g) && p.force >= 1;
            if (ring.visible) {
                ring.position.set(p.x, 0.03, 0);
                ring.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
            }
            const ice = m[`ice${i}`];
            ice.visible = p.frozen > 0;
            if (ice.visible) ice.position.set(p.x, p.y + 0.95, 0);
            // Overclocked: sparks crackling round the head.
            if (p.overclock > 0 && Math.random() < dt * 22) {
                const a = Math.random() * Math.PI * 2;
                puff(list, p.x + Math.cos(a) * 0.8, p.y + HEAD_Y + Math.sin(a) * 0.8, ITEM_COLORS.overclock, {
                    vx: Math.cos(a) * 1.5,
                    vy: Math.sin(a) * 1.5 + 0.5,
                    life: 0.35,
                    size: 0.08,
                });
            }
            if (p.coffee > 0 && Math.random() < dt * 14) {
                puff(list, p.x + (Math.random() - 0.5) * 0.6, p.y + HEAD_Y + HEAD_R + 0.1, "#E2E8F0", {
                    vy: 1.2,
                    vx: (Math.random() - 0.5) * 0.4,
                    life: 0.6,
                    size: 0.09,
                    gravity: -0.5,
                });
            }
        });

        // Firewalls across the goal mouths, flickering.
        view.walls.forEach((left, i) => {
            const wall = m[`wall${i}`];
            wall.visible = left > 0;
            if (wall.visible) wall.material.opacity = (left < 1.5 ? 0.25 + 0.25 * (Math.floor(t * 10) % 2) : 0.45) + Math.sin(t * 20) * 0.05;
        });

        // The floating power-up.
        const it = view.item;
        m.item.visible = Boolean(it);
        if (it) {
            m.item.position.set(it.x, it.y + Math.sin(t * 2.5) * 0.12, 0);
            m.item.rotation.y = t * 1.6;
            ["coffee", "wall", "freeze", "overclock"].forEach((kind) => (m[`item_${kind}`].visible = it.kind === kind));
            m.itemBubble.material.color.set(ITEM_COLORS[it.kind]);
            // Blinks before it goes.
            m.item.scale.setScalar(it.life < 2 && Math.floor(t * 8) % 2 ? 0.85 : 1);
        }

        drawFx(list, dt, m.fx);

        // The crowd bounces, and the scoring side's fans leap.
        const cheer = view.cheer;
        CROWD.forEach((c, i) => {
            const leap = cheer.time > 0 && c.team === cheer.side;
            const jump = Math.max(0, Math.sin(t * (leap ? 9 : 3) + c.phase)) * (leap ? 0.5 : g ? 0.08 : 0.03);
            tmp.position.set(c.x, c.y + jump + c.h * 0.42, c.z);
            tmp.rotation.set(0, 0, 0);
            tmp.scale.set(1, c.h, 1);
            tmp.updateMatrix();
            m.crowd.setMatrixAt(i, tmp.matrix);
            tmp.position.y = c.y + jump + c.h * 0.95;
            tmp.scale.setScalar(1);
            tmp.updateMatrix();
            m.heads.setMatrixAt(i, tmp.matrix);
        });
        m.crowd.instanceMatrix.needsUpdate = true;
        m.heads.instanceMatrix.needsUpdate = true;

        const flip = Math.floor(t / 4) % 2;
        BOARDS.forEach((_, i) => {
            if (m[`board${i}0`]) m[`board${i}0`].visible = flip === 0;
            if (m[`board${i}1`]) m[`board${i}1`].visible = flip === 1;
        });
    });

    return (
        <group position={[STADIUM.x, STADIUM.y, STADIUM.z]} rotation-y={STADIUM_YAW}>
            <Stadium set={set} />
            {/* The floodlights on the players, only while a match is on (the
                stadium switches the island to night then anyway). */}
            {active && <pointLight position={[0, 7, 10]} intensity={230} distance={45} color="#FFF4DD" />}
            <group ref={set("ball")}>
                <BugBallModel />
            </group>
            <mesh ref={set("shock")} visible={false}>
                <ringGeometry args={[0.85, 1, 48]} />
                <meshBasicMaterial transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
            </mesh>
            <mesh ref={set("ballGlow")} visible={false}>
                <sphereGeometry args={[BALL_R * 1.5, 20, 14]} />
                <meshBasicMaterial transparent opacity={0.35} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh ref={set("ballShadow")} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[BALL_R * 1.1, 20]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
            </mesh>
            <Baller set={set} id="p0" boot="#0E0E12" glow="#3BE8FF">
                <NefiseHead set={set} />
            </Baller>
            <Baller set={set} id="p1" boot="#334155" glow={TEAMS[1]}>
                <BotHead set={set} />
            </Baller>
            {[0, 1].map((i) => (
                <mesh key={i} ref={set(`shadow${i}`)} rotation-x={-Math.PI / 2}>
                    <circleGeometry args={[0.7, 24]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
                </mesh>
            ))}
            <Item set={set} />
            {[0, 1].map((i) => (
                <group key={i}>
                    <mesh ref={set(`ring${i}`)} rotation-x={-Math.PI / 2} visible={false}>
                        <ringGeometry args={[0.72, 0.9, 40]} />
                        <meshBasicMaterial color={TEAMS[i]} transparent opacity={0.85} toneMapped={false} />
                    </mesh>
                    <mesh ref={set(`ice${i}`)} visible={false}>
                        <boxGeometry args={[1.8, 2, 1.8]} />
                        <meshStandardMaterial color="#A5F3FC" emissive="#22D3EE" emissiveIntensity={0.4} transparent opacity={0.45} roughness={0.1} />
                    </mesh>
                    <mesh ref={set(`wall${i}`)} position={[(i ? 1 : -1) * (HALF - 0.1), BAR / 2, 0]} visible={false}>
                        <boxGeometry args={[0.12, BAR, GOAL_WIDTH]} />
                        <meshBasicMaterial color="#F97316" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
                    </mesh>
                </group>
            ))}
            <instancedMesh ref={set("fx")} args={[undefined, undefined, MAX_FX]} frustumCulled={false}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial toneMapped={false} />
                <InstanceColors count={MAX_FX} />
            </instancedMesh>
            <instancedMesh ref={set("crowd")} args={[undefined, undefined, CROWD.length]} frustumCulled={false}>
                <capsuleGeometry args={[0.2, 0.45, 4, 8]} />
                <meshStandardMaterial roughness={0.8} emissive="#FFFFFF" emissiveIntensity={0.18} onBeforeCompile={glowByInstance} />
                <InstanceColors count={CROWD.length} />
            </instancedMesh>
            <instancedMesh ref={set("heads")} args={[undefined, undefined, CROWD.length]} frustumCulled={false}>
                <sphereGeometry args={[0.17, 10, 8]} />
                <meshStandardMaterial roughness={0.8} />
                <InstanceColors count={CROWD.length} />
            </instancedMesh>
        </group>
    );
};
