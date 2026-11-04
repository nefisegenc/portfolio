// The 3-2-1 before a timed game. Returns true on the frame it reaches "go".
import { playSound } from "../sound";
import { useArcade } from "./state";

export const COUNTDOWN = 3;

export const tickCountdown = (g, dt) => {
    const before = Math.ceil(g.count);
    g.count -= dt;
    const after = Math.ceil(g.count);
    if (after === before) return false;
    const store = useArcade.getState();
    if (after > 0) {
        store.update({ countdown: after });
        playSound("beep");
        return false;
    }
    store.update({ status: "playing", countdown: 0 });
    store.say("game.go", null, "#22C55E");
    playSound("go");
    return true;
};
