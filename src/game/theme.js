import { useStore } from "../store";

export const palettes = {
    day: {
        skyTop: "#4FA8E8",
        skyHorizon: "#FFE2C4",
        skyBottom: "#F7C9A8",
        fog: "#F9DCC3",
        hemiSky: "#DDEEFF",
        hemiGround: "#9A845F",
        hemi: 1.15,
        sun: "#FFF0D6",
        sunIntensity: 2.6,
        glow: 0.12,
        lamp: 0.35,
        cloud: "#FFFFFF",
        grass: "#8CC063",
        grassDark: "#76AD50",
    },
    night: {
        skyTop: "#060A22",
        skyHorizon: "#2A2A5E",
        skyBottom: "#171638",
        fog: "#1D1F4B",
        hemiSky: "#6F7FD0",
        hemiGround: "#231E38",
        hemi: 0.55,
        sun: "#AFC0FF",
        sunIntensity: 0.75,
        glow: 2.6,
        lamp: 4,
        cloud: "#3C4178",
        grass: "#4F7A4A",
        grassDark: "#426B40",
    },
};

export const usePalette = () => palettes[useStore((s) => (s.night ? "night" : "day"))];
