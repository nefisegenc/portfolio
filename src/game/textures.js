import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";

const prepareTexture = (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
};

// Loads an image as an sRGB texture for posters and screens.
export const usePoster = (url) => useTexture(url, prepareTexture);
