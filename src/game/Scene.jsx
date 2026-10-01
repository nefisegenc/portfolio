import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { NeutralToneMapping, PCFSoftShadowMap } from "three";
import { useStore } from "../store";
import { Centerpiece } from "./Centerpiece";
import { Island } from "./Island";
import { Landmarks } from "./Landmarks";
import { Nature } from "./Nature";
import { Player } from "./Player";
import { Sky } from "./Sky";
import { usePalette } from "./theme";
import { isTouch } from "./utils";


const Lights = () => {
    const p = usePalette();
    const night = useStore((s) => s.night);
    const size = isTouch ? 1024 : 2048;
    return (
        <>
            <color attach="background" args={[p.skyHorizon]} />
            <fog attach="fog" args={[p.fog, 70, 190]} />
            <hemisphereLight color={p.hemiSky} groundColor={p.hemiGround} intensity={p.hemi} />
            <directionalLight
                castShadow
                position={[22, 34, 16]}
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
const LoadProgress = () => {
    const progress = useProgress((s) => s.progress);
    const setLoadProgress = useStore((s) => s.setLoadProgress);
    useEffect(() => setLoadProgress(progress), [progress, setLoadProgress]);
    return null;
};

const SceneReady = () => {
    const setSceneReady = useStore((s) => s.setSceneReady);
    useEffect(() => setSceneReady(), [setSceneReady]);
    return null;
};

const Effects = () => (
    <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1.15} luminanceSmoothing={0.2} intensity={0.9} radius={0.72} />
        <Vignette offset={0.3} darkness={0.42} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
);

export const Scene = ({ paused }) => (
    <Canvas
        className="scene"
        frameloop={paused ? "never" : "always"}
        shadows={{ type: PCFSoftShadowMap }}
        dpr={[1, isTouch ? 1.5 : 2]}
        camera={{ fov: 45, near: 0.1, far: 900, position: [48, 25, 0] }}
        gl={{ antialias: true, toneMapping: NeutralToneMapping }}
    >
        <Lights />
        <LoadProgress />
        <Suspense fallback={null}>
            <Sky />
            <Island />
            <Nature />
            <Centerpiece />
            <Landmarks />
            <Player />
            <SceneReady />
        </Suspense>
        {!isTouch && <Effects />}
    </Canvas>
);
