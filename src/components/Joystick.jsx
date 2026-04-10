import { useRef } from 'react';
import { useStore } from '../store';

export const Joystick = () => {
    const setControls = useStore((state) => state.setControls);
    const currentProject = useStore((state) => state.currentProject);
    const bioOpen = useStore((state) => state.bioOpen);

    // Track active touches
    const activeDirections = useRef({ up: false, down: false, left: false, right: false });

    // Hide joystick when any modal is open
    if (currentProject || bioOpen) return null;

    const updateControls = () => {
        let x = 0;
        let z = 0; // z is forward/backward (mapped to y axis of controls)

        if (activeDirections.current.up) z = -1;
        if (activeDirections.current.down) z = 1;
        if (activeDirections.current.left) x = -1;
        if (activeDirections.current.right) x = 1;

        // If both pressed, cancel out (or diagonal)
        if (activeDirections.current.up && activeDirections.current.down) z = 0;
        if (activeDirections.current.left && activeDirections.current.right) x = 0;

        // Pass x and z (mapped to y parameter of setControls typically, but let's check store)
        // Store: setControls(x, z) 
        // Player.jsx reads: controls.x, controls.z
        // Wait, standard Joystick sent (x, y). 
        // The store setControls takes (x, z). 
        // Let's verify store.js: setControls: (x, z) => set({ controls: { x, z } }),
        // My previous Joystick.jsx called setControls(deltaX, deltaY).
        // So previous deltaY was actually putting value into z slot of store. 
        // Logic confirms: Up button should send -1 to second arg.

        setControls(x, z);
    };

    const handleTouchStart = (dir) => (e) => {
        e.preventDefault(); // Prevent scroll/selection
        activeDirections.current[dir] = true;
        updateControls();
    };

    const handleTouchEnd = (dir) => (e) => {
        e.preventDefault();
        activeDirections.current[dir] = false;
        updateControls();
    };

    // Button shared styles
    const btnClass = "w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center active:bg-cyan-500/50 active:border-cyan-500 transition-colors pointer-events-auto touch-none select-none";
    const iconClass = "w-6 h-6 text-white";

    return (
        <div className="absolute bottom-8 left-8 z-50 md:hidden flex flex-col items-center gap-2">

            {/* Control Grid */}
            <div className="grid grid-cols-3 gap-2">
                {/* UP (Row 1, Col 2) */}
                <div className="col-start-2">
                    <button
                        className={btnClass}
                        onTouchStart={handleTouchStart('up')}
                        onTouchEnd={handleTouchEnd('up')}
                        onMouseDown={() => { activeDirections.current.up = true; updateControls(); }}
                        onMouseUp={() => { activeDirections.current.up = false; updateControls(); }}
                        onMouseLeave={() => { activeDirections.current.up = false; updateControls(); }}
                    >
                        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>

                {/* LEFT (Row 2, Col 1) */}
                <div className="col-start-1 row-start-2">
                    <button
                        className={btnClass}
                        onTouchStart={handleTouchStart('left')}
                        onTouchEnd={handleTouchEnd('left')}
                        onMouseDown={() => { activeDirections.current.left = true; updateControls(); }}
                        onMouseUp={() => { activeDirections.current.left = false; updateControls(); }}
                        onMouseLeave={() => { activeDirections.current.left = false; updateControls(); }}
                    >
                        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* DOWN (Row 2, Col 2) - Wait, usually cross pattern */}
                {/* Center is empty or maybe action? Empty for now */}

                {/* RIGHT (Row 2, Col 3) */}
                <div className="col-start-3 row-start-2">
                    <button
                        className={btnClass}
                        onTouchStart={handleTouchStart('right')}
                        onTouchEnd={handleTouchEnd('right')}
                        onMouseDown={() => { activeDirections.current.right = true; updateControls(); }}
                        onMouseUp={() => { activeDirections.current.right = false; updateControls(); }}
                        onMouseLeave={() => { activeDirections.current.right = false; updateControls(); }}
                    >
                        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* DOWN (Row 3, Col 2) */}
                <div className="col-start-2 row-start-3">
                    <button
                        className={btnClass}
                        onTouchStart={handleTouchStart('down')}
                        onTouchEnd={handleTouchEnd('down')}
                        onMouseDown={() => { activeDirections.current.down = true; updateControls(); }}
                        onMouseUp={() => { activeDirections.current.down = false; updateControls(); }}
                        onMouseLeave={() => { activeDirections.current.down = false; updateControls(); }}
                    >
                        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Label */}
            <div className="text-white/50 text-xs font-mono tracking-widest pointer-events-none mt-2">
                MOVE
            </div>
        </div>
    );
};
