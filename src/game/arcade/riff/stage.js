// Where Riff Rush's stage floats, and its layout in stage space (+z towards
// the audience, which faces west, back towards the islands).
export const STAGE = { x: 60, y: 2, z: 30 };
export const STAGE_YAW = Math.PI / 2;
export const DECK = { top: 1.2, front: -6.8, back: -11.2 };
export const PLAYER_SPOT = { x: 0, z: -8.4 };

// Stage space to world space.
export const stageToWorld = (x, y, z) => [
    STAGE.x + z * Math.sin(STAGE_YAW) + x * Math.cos(STAGE_YAW),
    STAGE.y + y,
    STAGE.z + z * Math.cos(STAGE_YAW) - x * Math.sin(STAGE_YAW),
];
