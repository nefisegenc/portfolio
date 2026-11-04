import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore } from "../store";
import { useArcade } from "../game/arcade/state";
import { AboutPanel } from "./AboutPanel";
import { Hud } from "./Hud";
import { MapOverlay } from "./IslandMap";
import { ProjectPanel } from "./ProjectPanel";
import { QuickView } from "./QuickView";
import { TitleScreen } from "./TitleScreen";
import { Flash, Toasts } from "./Toasts";

const useGlobalKeys = () => {
    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
            const s = useStore.getState();
            const arcade = useArcade.getState();
            if (e.key === "Escape") {
                if (s.panel) s.closePanel();
                else if (arcade.active) arcade.quit();
                return;
            }
            if (s.phase === "title") {
                if (e.key === "Enter" && s.sceneReady && e.target === document.body) s.start();
                return;
            }
            if (s.phase !== "playing") return;
            if (e.code === "KeyM") {
                if (s.panel?.type === "map") s.closePanel();
                else if (!s.panel) s.openPanel({ type: "map" });
                return;
            }
            if (s.panel) return;
            if (arcade.active) return;
            if ((e.code === "KeyE" || e.key === "Enter") && s.nearby) {
                e.preventDefault();
                s.openLandmark(s.nearby);
            } else if ((e.code === "KeyE" || e.key === "Enter") && arcade.nearby) {
                e.preventDefault();
                arcade.start(arcade.nearby);
            }
            if (e.code === "KeyN") s.toggleNight();
            if (e.code === "KeyP") s.openPanel({ type: "about" });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
};

export const Overlay = () => {
    const phase = useStore((s) => s.phase);
    const panel = useStore((s) => s.panel);
    useGlobalKeys();

    return (
        <>
            <AnimatePresence>{phase === "title" && <TitleScreen key="title" />}</AnimatePresence>
            {phase === "playing" && <Hud />}
            <AnimatePresence>{phase === "quick" && <QuickView key="quick" />}</AnimatePresence>
            <AnimatePresence>
                {panel?.type === "project" && <ProjectPanel key={`project-${panel.id}`} id={panel.id} />}
                {panel?.type === "about" && <AboutPanel key="about" />}
                {panel?.type === "map" && <MapOverlay key="map" />}
            </AnimatePresence>
            <Toasts />
            <Flash />
        </>
    );
};
