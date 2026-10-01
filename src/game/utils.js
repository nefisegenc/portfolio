// Loops a value between 0 and 1 for simple repeating animations.
export const loop = (t, speed, offset = 0) => (t * speed + offset) % 1;

export const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
