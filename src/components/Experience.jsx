import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Gallery } from "./Gallery";
import { Player } from "./Player";
import { useStore } from "../store";

export const Experience = () => {
    // If a project is open, we might want to disable controls or change view.
    // For now we keep it simple.
    return (
        <>
            <ambientLight intensity={0.5} />
            <Environment preset="city" />

            {/* 
        We use OrbitControls for development/debug, but will switch to FirstPerson/PointerLock or 
        Custom Character Controller later. 
        For "Character like in the photo", we'll need a 3rd person setup.
        Player component will handle the camera.
      */}
            {/* <OrbitControls /> */}

            <Player />
            <Gallery />
        </>
    );
};
