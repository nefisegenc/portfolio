// Mutable input + player state shared between the 3D scene and the HUD.
// Kept outside React so reading it every frame never triggers re-renders.

export const input = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    joystick: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    zoom: 0,
};

export const playerState = { x: 0, z: 0, rotY: 0, speed: 0 };

export const cameraState = { yaw: 0, pitch: 0.36, distance: 9.5 };

const KEY_MAP = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "back",
    ArrowDown: "back",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
    ShiftLeft: "run",
    ShiftRight: "run",
};

const isTyping = (e) => {
    const el = e.target;
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

export const bindKeyboard = () => {
    const down = (e) => {
        if (isTyping(e)) return;
        const key = KEY_MAP[e.code];
        if (key) {
            input[key] = true;
            if (e.code.startsWith("Arrow")) e.preventDefault();
        }
        if (e.code === "Space") {
            input.jump = true;
            e.preventDefault();
        }
    };
    const up = (e) => {
        const key = KEY_MAP[e.code];
        if (key) input[key] = false;
    };
    const reset = () => {
        Object.values(KEY_MAP).forEach((k) => (input[k] = false));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        window.removeEventListener("blur", reset);
    };
};

// Drag anywhere on the canvas to orbit the camera; wheel/pinch to zoom.
export const bindPointerLook = (element) => {
    let lookPointer = null;
    let last = { x: 0, y: 0 };
    const pinch = new Map();
    let pinchDistance = 0;

    const down = (e) => {
        if (e.pointerType === "touch") pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.size === 2) {
            const [a, b] = [...pinch.values()];
            pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
            lookPointer = null;
            return;
        }
        if (lookPointer !== null) return;
        lookPointer = e.pointerId;
        last = { x: e.clientX, y: e.clientY };
        element.setPointerCapture?.(e.pointerId);
        element.style.cursor = "grabbing";
    };
    const move = (e) => {
        if (pinch.has(e.pointerId)) {
            pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch.size === 2) {
                const [a, b] = [...pinch.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                input.zoom -= (d - pinchDistance) * 0.03;
                pinchDistance = d;
                return;
            }
        }
        if (e.pointerId !== lookPointer) return;
        const scale = e.pointerType === "touch" ? 1.5 : 1;
        input.look.dx += (e.clientX - last.x) * scale;
        input.look.dy += (e.clientY - last.y) * scale;
        last = { x: e.clientX, y: e.clientY };
    };
    const up = (e) => {
        pinch.delete(e.pointerId);
        if (e.pointerId !== lookPointer) return;
        lookPointer = null;
        element.style.cursor = "grab";
    };
    const wheel = (e) => {
        e.preventDefault();
        input.zoom += e.deltaY * 0.01;
    };

    element.style.cursor = "grab";
    element.style.touchAction = "none";
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", up);
        element.removeEventListener("wheel", wheel);
    };
};
