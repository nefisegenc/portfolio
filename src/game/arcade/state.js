// Arcade game state. The 3D game components own the simulation and push only
// what the HUD shows (score, timer, messages) into this store.
import { create } from "zustand";
import { track } from "../../analytics";

const BEST_KEY = "nefise-island:arcade-best";

const loadBest = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(BEST_KEY));
        return saved && typeof saved === "object" ? saved : {};
    } catch {
        return {};
    }
};

const saveBest = (best) => {
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(best));
    } catch {
        // Records just won't persist.
    }
};

// Race scores are times, so lower wins there.
export const lowerIsBetter = (id) => id === "race";
const beats = (id, score, best) => best === undefined || (lowerIsBetter(id) ? score < best : score > best);

// Shared with the player controller, outside React like the input state.
export const arcadeLink = {
    // Pins the player in place: { x, z, rotY }.
    lock: null,
    // Takes over the camera: { position: Vector3, target: Vector3 }.
    camera: null,
    // One-off move: { x, z, rotY }.
    teleport: null,
    // Set by the HUD's action button (throw, in bowling) until a game reads it.
    action: false,
};

let messageId = 0;

export const useArcade = create((set, get) => ({
    // Which island the player is on: "main" or "arcade".
    area: "main",
    setArea: (area) => {
        if (get().area !== area) set({ area });
    },

    nearby: null,
    setNearby: (id) => {
        if (get().nearby !== id) set({ nearby: id });
    },

    // The running game, and a counter that restarts it.
    active: null,
    run: 0,
    // countdown -> playing -> done
    status: "idle",
    countdown: 0,
    score: 0,
    time: 0,
    detail: null,
    message: null,
    result: null,
    best: loadBest(),

    start: (id) => {
        track("Game Started", { game: id });
        set({
            active: id,
            run: get().run + 1,
            status: "countdown",
            countdown: 3,
            score: 0,
            time: 0,
            detail: null,
            message: null,
            result: null,
        });
    },
    quit: () => {
        arcadeLink.lock = null;
        arcadeLink.camera = null;
        set({ active: null, status: "idle", message: null, result: null, detail: null });
    },
    update: (patch) => set(patch),
    // A big pop-up line on the HUD: a translation key plus its variables.
    say: (key, vars, color) => {
        const id = ++messageId;
        set({ message: { id, key, vars, color } });
        setTimeout(() => get().message?.id === id && set({ message: null }), 1300);
    },
    finish: (score) => {
        const { active, best } = get();
        const record = beats(active, score, best[active]);
        if (record) {
            const next = { ...best, [active]: score };
            saveBest(next);
            set({ best: next });
        }
        track("Game Finished", { game: active });
        arcadeLink.lock = null;
        arcadeLink.camera = null;
        set({ status: "done", score, result: { score, record, previous: best[active] } });
    },
}));
