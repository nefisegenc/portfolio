import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { NeutralToneMapping, Object3D, PCFSoftShadowMap } from "three";
import { useStore } from "../store";
import { Arcade } from "./arcade/Arcade";
import { Centerpiece } from "./Centerpiece";
import { Island } from "./Island";
import { Landmarks } from "./Landmarks";
import { Nature } from "./Nature";
import { Player } from "./Player";
import { Sky } from "./Sky";
import { usePalette } from "./theme";
import { isTouch } from "./utils";
import { ARCADE } from "../data/arcade";
import { useArcade } from "./arcade/state";

// Highest device pixel ratio used at each quality level. Even "full" stays at
// 1.5: on Retina screens 2x costs ~80% more pixels for a barely visible gain.
const QUALITY_DPR = [1, 1.25, 1.5];

const SUN_OFFSET = [22, 34, 16];

const Lights = () => {
    const p = usePalette();
    const night = useStore((s) => s.night);
    const size = isTouch ? 1024 : 1536;
    const sun = useRef();
    const target = useMemo(() => new Object3D(), []);
    // The shadow area covers whichever island the player is on.
    const onArcade = useArcade((s) => s.area === "arcade");
    useLayoutEffect(() => {
        const x = onArcade ? ARCADE.x : 0;
        const z = onArcade ? ARCADE.z : 0;
        target.position.set(x, 0, z);
        target.updateMatrixWorld();
        sun.current.position.set(x + SUN_OFFSET[0], SUN_OFFSET[1], z + SUN_OFFSET[2]);
    }, [onArcade, target]);
    return (
        <>
            <color attach="background" args={[p.skyHorizon]} />
            <fog attach="fog" args={[p.fog, 70, 190]} />
            <hemisphereLight color={p.hemiSky} groundColor={p.hemiGround} intensity={p.hemi} />
            <primitive object={target} />
            <directionalLight
                ref={sun}
                target={target}
                castShadow
                position={SUN_OFFSET}
                color={p.sun}
                intensity={p.sunIntensity}
                shadow-mapSize={[size, size]}
                shadow-camera-left={-32}
                shadow-camera-right={32}
                shadow-camera-top={32}
                shadow-camera-bottom={-32}
                shadow-camera-near={1}
                shadow-camera-far={90}
                shadow-bias={-0.0004}
                shadow-normalBias={0.04}
            />
            {night && <pointLight position={[0, 3.5, 0]} color="#FFC477" intensity={40} distance={20} />}
        </>
    );
};

// Mirrors three.js loading progress into the store for the title screen.
// Subscribing (rather than using the hook) keeps loader updates, which fire
// while textures are requested during render, out of this React tree.
const LoadProgress = () => {
    const setLoadProgress = useStore((s) => s.setLoadProgress);
    useEffect(() => useProgress.subscribe((s) => setLoadProgress(s.progress)), [setLoadProgress]);
    return null;
};

const SceneReady = () => {
    const setSceneReady = useStore((s) => s.setSceneReady);
    useEffect(() => setSceneReady(), [setSceneReady]);
    return null;
};

// Steps quality down when the frame rate drops and back up when it recovers;
// if it keeps flip-flopping, settles on the lowest level.
const AdaptiveQuality = () => {
    const stepQuality = useStore((s) => s.stepQuality);
    const setQuality = useStore((s) => s.setQuality);
    return (
        <PerformanceMonitor
            onDecline={() => stepQuality(-1)}
            onIncline={() => stepQuality(1)}
            flipflops={3}
            onFallback={() => setQuality(0)}
        />
    );
};

// Below full quality the shadow map is redrawn every other frame.
const ShadowThrottle = () => {
    const quality = useStore((s) => s.quality);
    const frame = useRef(0);
    useFrame(({ gl }) => {
        const shadows = gl.shadowMap;
        shadows.autoUpdate = quality >= 2;
        if (quality < 2 && frame.current++ % 2 === 0) shadows.needsUpdate = true;
    });
    return null;
};

const Effects = () => {
    const quality = useStore((s) => s.quality);
    return (
        <EffectComposer multisampling={quality >= 1 ? 2 : 0}>
            {quality >= 1 && (
                <Bloom
                    mipmapBlur
                    levels={quality >= 2 ? 6 : 4}
                    luminanceThreshold={1.15}
                    luminanceSmoothing={0.2}
                    intensity={0.9}
                    radius={0.72}
                />
            )}
            {quality >= 1 && <Vignette offset={0.3} darkness={0.42} />}
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
    );
};

export const Scene = ({ paused }) => {
    const quality = useStore((s) => s.quality);
    // On desktop the effect composer does the anti-aliasing, so the canvas skips it.
    return (
        <Canvas
            className="scene"
            frameloop={paused ? "never" : "always"}
            shadows={{ type: PCFSoftShadowMap }}
            dpr={Math.min(window.devicePixelRatio || 1, QUALITY_DPR[quality])}
            camera={{ fov: 45, near: 0.1, far: 900, position: [48, 25, 0] }}
            gl={{ antialias: isTouch, toneMapping: NeutralToneMapping, powerPreference: "high-performance" }}
        >
            <AdaptiveQuality />
            <ShadowThrottle />
            <Lights />
            <LoadProgress />
            <Suspense fallback={null}>
                <Sky />
                <Island />
                <Nature />
                <Centerpiece />
                <Landmarks />
                <Arcade />
                <Player />
                <SceneReady />
            </Suspense>
            {!isTouch && <Effects />}
        </Canvas>
    );
};
