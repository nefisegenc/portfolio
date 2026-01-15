import { create } from "zustand";

export const useStore = create((set) => ({
    currentProject: null,
    setCurrentProject: (project) => set({ currentProject: project }),
    closeProject: () => set({ currentProject: null }),

    // Mobile Controls
    controls: { x: 0, z: 0 },
    setControls: (x, z) => set({ controls: { x, z } }),
}));
