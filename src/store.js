import { create } from "zustand";
import { getLandmark, projectLandmarks } from "./data/world";
import { track } from "./analytics";

const STORAGE_KEY = "nefise-island:discovered";
const LANG_KEY = "nefise-island:lang";
const SOUND_KEY = "nefise-island:sound";

const readSetting = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeSetting = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Settings just won't persist.
    }
};

const initialLang = () => {
    const saved = readSetting(LANG_KEY);
    if (saved === "en" || saved === "tr") return saved;
    return navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
};

const loadDiscovered = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const saveDiscovered = (ids) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Private mode or blocked storage: progress just won't persist.
    }
};

const hasWebGL = () => {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
        return false;
    }
};

let toastId = 0;

export const useStore = create((set, get) => ({
    // title -> playing; "quick" is the 2D fallback view
    webgl: hasWebGL(),
    phase: hasWebGL() ? "title" : "quick",
    sceneReady: false,
    loadProgress: 0,
    setLoadProgress: (loadProgress) => set({ loadProgress }),
    startedAt: 0,
    setSceneReady: () => set({ sceneReady: true }),
    start: () => set({ phase: "playing", panel: null, startedAt: performance.now() }),
    openQuickView: () => set({ phase: "quick", panel: null }),
    leaveQuickView: () => {
        const { webgl, startedAt } = get();
        if (!webgl) return;
        set({ phase: startedAt ? "playing" : "title", panel: null });
    },

    // { type: "project", id } | { type: "about" } | { type: "map" }
    panel: null,
    openPanel: (panel) => set({ panel }),
    closePanel: () => set({ panel: null }),
    openLandmark: (id) => {
        const landmark = getLandmark(id);
        if (!landmark) return;
        set({ panel: landmark.type === "about" ? { type: "about" } : { type: "project", id } });
    },

    nearby: null,
    setNearby: (id) => {
        if (get().nearby !== id) set({ nearby: id });
    },

    hasMoved: false,
    markMoved: () => {
        if (!get().hasMoved) set({ hasMoved: true });
    },

    discovered: loadDiscovered(),
    discover: (id) => {
        const { discovered, pushToast } = get();
        const landmark = getLandmark(id);
        if (!landmark || landmark.type !== "project" || discovered.includes(id)) return;
        const next = [...discovered, id];
        const found = projectLandmarks.filter((l) => next.includes(l.id)).length;
        saveDiscovered(next);
        set({ discovered: next });
        pushToast({
            kind: "discovery",
            landmarkId: id,
            color: landmark.color,
            count: found,
            total: projectLandmarks.length,
        });
        if (found === projectLandmarks.length) {
            track("All Projects Discovered");
            setTimeout(() => get().pushToast({ kind: "complete" }), 1200);
        }
    },
    resetProgress: () => {
        saveDiscovered([]);
        set({ discovered: [] });
    },

    lang: initialLang(),
    setLang: (lang) => {
        writeSetting(LANG_KEY, lang);
        document.documentElement.lang = lang;
        set({ lang });
    },

    sound: readSetting(SOUND_KEY) !== "off",
    toggleSound: () => {
        const sound = !get().sound;
        writeSetting(SOUND_KEY, sound ? "on" : "off");
        set({ sound });
    },

    night: false,
    toggleNight: () => set({ night: !get().night, flash: get().flash + 1 }),

    // Bumped to play a short fade that hides scene switches.
    flash: 0,

    toasts: [],
    pushToast: (toast) => {
        const id = ++toastId;
        set({ toasts: [...get().toasts, { ...toast, id }] });
        setTimeout(() => get().dismissToast(id), toast.kind === "complete" ? 7000 : 3800);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

    // Fast travel: the player controller consumes this on the next frame.
    travelTarget: null,
    travelTo: (id) => set({ travelTarget: id, panel: null, flash: get().flash + 1 }),
    clearTravel: () => set({ travelTarget: null }),
}));
