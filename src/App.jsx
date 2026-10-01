import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { useStore } from "./store";
import { Overlay } from "./ui/Overlay";

// The 3D scene (three.js and friends) loads in its own chunk so the title
// screen and quick view appear right away.
const Scene = lazy(() => import("./game/Scene").then((m) => ({ default: m.Scene })));

function App() {
    const webgl = useStore((s) => s.webgl);
    const paused = useStore((s) => s.phase === "quick");
    return (
        <>
            {webgl && (
                <Suspense fallback={null}>
                    <Scene paused={paused} />
                </Suspense>
            )}
            <Overlay />
            <Analytics />
        </>
    );
}

export default App;
