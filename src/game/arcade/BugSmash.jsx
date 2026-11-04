// Bug Smash: bugs pop out of nine holes; whack them with the hammer before
// they hide. Golden bugs are worth three. Thirty seconds on the clock.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { BUGS, bugHoles, toLocal, toWorld, worldYaw } from "../../data/arcade";
import { useT } from "../../i18n";
import { playerState } from "../input";
import { Box, Cyl, FONT, GlowMat, Shadowed } from "../parts";
import { playSound } from "../sound";
import { COUNTDOWN, tickCountdown } from "./countdown";
import { arcadeLink, useArcade } from "./state";

const GREEN = "#22C55E";
const RISE = 0.14;
const HIDE = 0.16;
const SQUASH = 0.35;
const HIT_RADIUS = 0.65;

const BugModel = ({ golden }) => {
    const shell = golden ? "#FACC15" : "#EF4444";
    return (
        <group>
            <mesh position={[0, 0.16, -0.02]} scale={[0.22, 0.15, 0.26]} castShadow>
                <sphereGeometry args={[1, 18, 12]} />
                <meshStandardMaterial color={shell} roughness={0.3} emissive={golden ? "#B45309" : "#000000"} emissiveIntensity={golden ? 0.5 : 0} />
            </mesh>
            <Box args={[0.02, 0.02, 0.44]} position={[0, 0.305, -0.02]} color="#1C1730" />
            {[
                [-0.09, 0.27, -0.1],
                [0.1, 0.25, 0.04],
                [-0.06, 0.24, 0.12],
            ].map(([x, y, z]) => (
                <mesh key={`${x}${z}`} position={[x, y, z]} scale={[1, 0.4, 1]}>
                    <sphereGeometry args={[0.04, 8, 6]} />
                    <meshStandardMaterial color="#1C1730" />
                </mesh>
            ))}
            <mesh position={[0, 0.15, 0.24]} castShadow>
                <sphereGeometry args={[0.11, 14, 10]} />
                <meshStandardMaterial color="#1C1730" roughness={0.5} />
            </mesh>
            {[-1, 1].map((s) => (
                <group key={s}>
                    <mesh position={[s * 0.045, 0.19, 0.33]}>
                        <sphereGeometry args={[0.035, 10, 8]} />
                        <meshStandardMaterial color="#FFFFFF" />
                    </mesh>
                    <mesh position={[s * 0.045, 0.19, 0.36]}>
                        <sphereGeometry args={[0.016, 8, 6]} />
                        <meshBasicMaterial color="#111111" />
                    </mesh>
                    <Cyl args={[0.008, 0.008, 0.2, 4]} position={[s * 0.06, 0.32, 0.3]} rotation={[0.6, 0, -s * 0.4]} color="#1C1730" />
                    <mesh position={[s * 0.1, 0.4, 0.36]}>
                        <sphereGeometry args={[0.022, 8, 6]} />
                        <meshStandardMaterial color={shell} />
                    </mesh>
                    {[-0.1, 0, 0.1].map((z) => (
                        <Cyl key={z} args={[0.012, 0.012, 0.16, 4]} position={[s * 0.22, 0.07, z]} rotation-z={s * 1.1} color="#1C1730" />
                    ))}
                </group>
            ))}
        </group>
    );
};

const Field = () => {
    const t = useT();
    const posts = useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2 + Math.PI / 8 + Math.PI / 16;
                return [Math.sin(a) * BUGS.fence, Math.cos(a) * BUGS.fence, a];
            }),
        []
    );
    return (
        <group position={[BUGS.x, 0, BUGS.z]}>
            <mesh rotation-x={-Math.PI / 2} position-y={0.018} receiveShadow>
                <circleGeometry args={[BUGS.fence - 0.1, 40]} />
                <meshStandardMaterial color="#B98C5A" roughness={1} />
            </mesh>
            <Shadowed>
                {posts.map(([x, z]) => (
                    <Cyl key={`${x}${z}`} args={[0.07, 0.09, 0.8, 6]} position={[x, 0.4, z]} color="#8B5E3C" />
                ))}
            </Shadowed>
            {posts.slice(0, -1).map(([x, z, a], i) => {
                const [x2, z2] = posts[i + 1];
                return (
                    <Cyl
                        key={a}
                        args={[0.02, 0.02, Math.hypot(x2 - x, z2 - z), 4]}
                        position={[(x + x2) / 2, 0.62, (z + z2) / 2]}
                        rotation={[Math.PI / 2, Math.atan2(x2 - x, z2 - z), 0]}
                        rotation-order="YXZ"
                        color="#D9C29A"
                    />
                );
            })}
            {/* Sign behind the field */}
            <group position={[0, 0, -BUGS.fence - 0.5]}>
                <Shadowed>
                    {[-1.1, 1.1].map((x) => (
                        <Box key={x} args={[0.12, 1.6, 0.12]} position={[x, 0.8, -0.05]} color="#3B3350" />
                    ))}
                    <Box args={[2.6, 0.8, 0.14]} position={[0, 1.5, 0]} color="#1C1730" />
                </Shadowed>
                <Text font={FONT} fontSize={0.34} position={[0, 1.52, 0.08]} anchorY="middle">
                    {t("game.bugs").toUpperCase()}
                    <GlowMat color={GREEN} strength={2.4} />
                </Text>
            </group>
        </group>
    );
};

const Hole = ({ x, z }) => (
    <group position={[x, 0, z]}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.022}>
            <circleGeometry args={[0.36, 20]} />
            <meshBasicMaterial color="#2B1D14" />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position-y={0.04}>
            <torusGeometry args={[0.4, 0.07, 6, 20]} />
            <meshStandardMaterial color="#8C6445" flatShading />
        </mesh>
    </group>
);

const worldHoles = bugHoles.map((h) => {
    const [x, z] = toWorld(h.x, h.z);
    return { x, z };
});

const emptyHoles = () => bugHoles.map(() => ({ state: "empty", t: 0, life: 0, golden: false }));

export const BugSmash = () => {
    const refs = useRef([]);
    const holes = useRef(emptyHoles());
    const game = useRef(null);
    const active = useArcade((s) => s.active === "bugs");
    const run = useArcade((s) => s.run);
    const local = useMemo(() => bugHoles.map((h) => ({ ...h })), []);

    useEffect(() => {
        holes.current = emptyHoles();
        if (!active) {
            game.current = null;
            return;
        }
        const [x, z] = toWorld(BUGS.x, BUGS.z + BUGS.spacing + 0.9);
        const rotY = worldYaw(0, -1);
        arcadeLink.teleport = { x, z, rotY };
        arcadeLink.lock = { x, z, rotY };
        arcadeLink.hit = null;
        game.current = { count: COUNTDOWN, elapsed: 0, score: 0, spawn: 0.3, shown: -1 };
        playSound("beep");
        useArcade.getState().update({ time: BUGS.duration });
    }, [active, run]);

    useFrame(({ clock }, rawDt) => {
        const dt = Math.min(rawDt, 0.1);
        const g = game.current;
        const store = useArcade.getState();
        const list = holes.current;

        if (g && store.status === "countdown") {
            if (tickCountdown(g, dt)) arcadeLink.lock = null;
        } else if (g && store.status === "playing") {
            g.elapsed += dt;
            const left = Math.max(0, BUGS.duration - g.elapsed);
            const shown = Math.ceil(left * 10);
            if (shown !== g.shown) {
                g.shown = shown;
                store.update({ time: left });
            }
            if (left <= 0) {
                game.current = null;
                list.forEach((h) => h.state !== "empty" && (h.state = "hiding"));
                playSound("cheer");
                store.finish(g.score);
            } else {
                // Spawn: more bugs, shorter peeks as time goes on.
                g.spawn -= dt;
                const up = list.filter((h) => h.state === "rising" || h.state === "up").length;
                const maxUp = g.elapsed < 10 ? 2 : 3;
                const [px, pz] = toLocal(playerState.x, playerState.z);
                if (g.spawn <= 0 && up < maxUp) {
                    // Never right under the player, so camping on a hole doesn't pay.
                    const free = list
                        .map((h, i) => (h.state === "empty" && Math.hypot(px - local[i].x, pz - local[i].z) > 1.1 ? i : -1))
                        .filter((i) => i >= 0);
                    if (free.length) {
                        const i = free[Math.floor(Math.random() * free.length)];
                        const isGolden = Math.random() < 0.12;
                        list[i] = { state: "rising", t: 0, life: Math.max(0.9, 1.7 - g.elapsed * 0.025), golden: isGolden };
                    }
                    g.spawn = 0.35 + Math.random() * 0.45;
                }
                // Where the hammer landed, if it just did.
                const hit = arcadeLink.hit;
                arcadeLink.hit = null;
                if (hit) {
                    const [hx, hz] = toLocal(hit.x, hit.z);
                    let smashed = 0;
                    list.forEach((h, i) => {
                        if (h.state !== "rising" && h.state !== "up") return;
                        if (Math.hypot(hx - local[i].x, hz - local[i].z) > HIT_RADIUS) return;
                        h.state = "squash";
                        h.t = 0;
                        smashed += 1;
                        g.score += h.golden ? 3 : 1;
                        playSound("smash", h.golden);
                        if (h.golden) store.say("game.golden", null, "#FACC15");
                    });
                    if (smashed) store.update({ score: g.score });
                    else playSound("whiff");
                }
                arcadeLink.targets = worldHoles.filter((_, i) => list[i].state === "rising" || list[i].state === "up");
            }
        }

        // Advance and draw every hole's bug.
        const t = clock.elapsedTime;
        const [px, pz] = toLocal(playerState.x, playerState.z);
        list.forEach((h, i) => {
            const ref = refs.current[i];
            if (!ref) return;
            h.t += dt;
            if (h.state === "rising" && h.t > RISE) Object.assign(h, { state: "up", t: 0 });
            if (h.state === "up" && h.t > h.life) Object.assign(h, { state: "hiding", t: 0 });
            if ((h.state === "hiding" && h.t > HIDE) || (h.state === "squash" && h.t > SQUASH)) Object.assign(h, { state: "empty", t: 0 });

            let lift = -0.45;
            let squashY = 1;
            if (h.state === "rising") lift = -0.45 + (h.t / RISE) * 0.45;
            if (h.state === "up") lift = Math.sin(h.t * 18) * 0.015;
            if (h.state === "hiding") lift = -(h.t / HIDE) * 0.45;
            if (h.state === "squash") {
                squashY = Math.max(0.15, 1 - h.t * 6);
                lift = -Math.max(0, h.t - 0.2) * 2;
            }
            // With no game running, one bug peeks out now and then.
            if (!g && h.state === "empty" && !store.active) {
                const slot = Math.floor(t / 2.6) % bugHoles.length;
                const phase = (t / 2.6) % 1;
                if (slot === (i * 4) % bugHoles.length && phase < 0.45) lift = -0.45 + Math.sin((phase / 0.45) * Math.PI) * 0.4;
            }
            ref.visible = lift > -0.44;
            ref.position.y = lift;
            ref.scale.set(1 + (1 - squashY) * 0.6, squashY, 1 + (1 - squashY) * 0.6);
            ref.rotation.y = Math.atan2(px - local[i].x, pz - local[i].z);
            ref.children[0].visible = !h.golden;
            ref.children[1].visible = h.golden;
        });
    });

    return (
        <group>
            <Field />
            {local.map((h, i) => (
                <group key={i}>
                    <Hole x={h.x} z={h.z} />
                    <group position={[h.x, 0, h.z]}>
                        <group ref={(el) => (refs.current[i] = el)}>
                            <BugModel />
                            <BugModel golden />
                        </group>
                    </group>
                </group>
            ))}
        </group>
    );
};
