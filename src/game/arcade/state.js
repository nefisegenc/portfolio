// Arcade game state. The 3D game components own the simulation and push only
// what the HUD shows (score, timer, messages) into this store.
import { create } from "zustand";
import { track } from "../../analytics";
import { useStore } from "../../store";
import { getGame } from "../../data/arcade";
import { setMusicTrack } from "../sound";
import { bowlingMusic, countIn, headMusic, huntMusic, raceMusic, silenceLoops } from "./audio";

// Riff Rush starts its band itself, on the beat.
const MUSIC = { bowling: bowlingMusic, race: raceMusic, bugs: huntMusic, riff: countIn, head: headMusic };
// Games played under black light (or floodlights) switch the island to night while they run.
const NEON = new Set(["bowling", "bugs", "riff", "head"]);
// Games played away from the island, which take the player there and back.
const AWAY = new Set(["race", "bugs", "riff", "head"]);
let restoreDay = false;

// Bumped whenever a game's scoring changes so old records don't carry over
// (v3: five-frame bowling, the Sky Circuit and Bug Hunt).
const BEST_KEY = "nefise-island:arcade-best-v3";

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
    // Set when a game is started from the menu, so the camera cuts straight
    // to the game's own view instead of sweeping over from wherever it was.
    snap: false,
    // The action button (Space, Enter or the touch button): `action` is set on
    // each press until a game reads it, `holding` while it is held down.
    action: false,
    holding: false,
    // A 0–1 gauge the HUD shows while it is set (bowling power).
    meter: null,
    // Where the sun's shadows should centre, for games away from the islands.
    focus: null,
    // The race kart for the player controller: { speed, steer, wheel }.
    kart: null,
    // Live race readouts for the HUD: { speed, nitro, dots }.
    race: null,
    // Games on a raised floor, with their own edges: floor height and a
    // function that pulls a position back inside.
    floor: null,
    bounds: null,
    // Which way the player should face while aiming (Bug Hunt), or null.
    aimYaw: null,
    // Bug Hunt's touch aiming stick, { x, y } in screen terms, while held.
    aimStick: null,
    // A shove for the player ({ x, z } velocity), seconds of blinking after
    // being hurt, and when they were last hurt (for the HUD's red flash).
    push: null,
    blink: 0,
    hurt: 0,
    // Riff Rush: a fret handler for the touch buttons, when the last note was
    // strummed, and where in the beat the music is (0–1), for the player's
    // strumming and bobbing.
    fret: null,
    strum: 0,
    beat: 0,
    // How a game that moves the player itself wants them animated (Head to
    // Head): { speed, air, kick (0–1 through a kick), stun, frozen }.
    pose: null,
};

const releasePlayer = () => {
    arcadeLink.lock = null;
    arcadeLink.camera = null;
    arcadeLink.meter = null;
    arcadeLink.focus = null;
    arcadeLink.kart = null;
    arcadeLink.race = null;
    arcadeLink.floor = null;
    arcadeLink.bounds = null;
    arcadeLink.aimYaw = null;
    arcadeLink.aimStick = null;
    arcadeLink.push = null;
    arcadeLink.blink = 0;
    arcadeLink.snap = false;
    arcadeLink.pose = null;
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
        const island = useStore.getState();
        if (NEON.has(id) && !island.night) {
            island.toggleNight();
            restoreDay = true;
        }
        setMusicTrack(MUSIC[id]);
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
    // Game mode: the game menu opens from anywhere, and choosing a game
    // starts it straight away, wherever the player is (each game takes the
    // player where it's played).
    openMenu: () => useStore.getState().openPanel({ type: "arcade" }),
    play: (id) => {
        const island = useStore.getState();
        island.closePanel();
        // A quick fade hides the jump.
        useStore.setState({ flash: island.flash + 1 });
        if (get().active) get().quit();
        arcadeLink.snap = true;
        get().start(id);
    },
    // Into game mode: over to the arcade island with the menu open. Out of
    // it: back to the plaza.
    enterGameMode: () => {
        const island = useStore.getState();
        if (island.phase !== "playing") island.start();
        if (get().active) get().quit();
        if (get().area === "arcade") {
            get().openMenu();
            return;
        }
        useStore.getState().travelTo("arcade");
        setTimeout(() => get().openMenu(), 550);
    },
    leaveGameMode: () => {
        if (get().active) get().quit();
        useStore.getState().travelTo("plaza");
    },
    quit: () => {
        const { active } = get();
        releasePlayer();
        // Back to the game's pad on the arcade from wherever it was played.
        if (AWAY.has(active)) {
            const game = getGame(active);
            arcadeLink.teleport = { x: game.x, z: game.z, rotY: game.rotY };
        }
        silenceLoops();
        setMusicTrack(null);
        const island = useStore.getState();
        if (restoreDay && island.night) island.toggleNight();
        restoreDay = false;
        set({ active: null, status: "idle", message: null, result: null, detail: null });
    },
    update: (patch) => set(patch),
    // A big pop-up line on the HUD: a translation key plus its variables.
    say: (key, vars, color) => {
        const id = ++messageId;
        set({ message: { id, key, vars, color } });
        setTimeout(() => get().message?.id === id && set({ message: null }), 1300);
    },
    // `extra` carries game-specific results for the HUD (a race position).
    finish: (score, extra) => {
        const { active, best } = get();
        // A run that scored nothing (a show booed off at once) sets no record.
        const record = score > 0 && beats(active, score, best[active]);
        if (record) {
            const next = { ...best, [active]: score };
            saveBest(next);
            set({ best: next });
        }
        track("Game Finished", { game: active });
        // Games away from the island keep the player there behind the results.
        if (!AWAY.has(active)) releasePlayer();
        silenceLoops();
        set({ status: "done", score, result: { score, record, previous: best[active], extra } });
    },
}));
