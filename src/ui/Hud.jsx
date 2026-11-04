// In-game heads-up display.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLandmark, projectLandmarks } from "../data/world";
import { getGame } from "../data/arcade";
import { useArcade } from "../game/arcade/state";
import { input } from "../game/input";
import { isTouch } from "../game/utils";
import { useStore } from "../store";
import { landmarkLabel, useLang, usePersonal, useT } from "../i18n";
import { GameHud } from "./GameHud";
import { IslandMap } from "./IslandMap";
import { LangToggle } from "./LangToggle";
import {
    ArrowUpIcon,
    Avatar,
    CloseIcon,
    GridIcon,
    HelpIcon,
    MapIcon,
    MoonIcon,
    PlayIcon,
    SoundOffIcon,
    SoundOnIcon,
    SunIcon,
} from "./icons";

const PlayerBadge = () => {
    const openPanel = useStore((s) => s.openPanel);
    const personal = usePersonal();
    const t = useT();
    return (
        <button
            onClick={() => openPanel({ type: "about" })}
            aria-label={t("hud.openProfile")}
            className="card pointer-events-auto flex items-center gap-2.5 py-1.5 pl-1.5 pr-3.5 transition hover:-translate-y-0.5 md:gap-3 md:pr-4"
        >
            <span className="overflow-hidden rounded-full border-[3px] border-white shadow">
                <Avatar size={isTouch ? 38 : 46} />
            </span>
            <span className="text-left">
                <span className="block font-display text-base font-bold leading-none md:text-lg">{personal.name}</span>
                <span className="block text-[11px] font-bold text-ink-soft md:text-xs">
                    {personal.title}
                    <span className="hidden md:inline"> · {t("hud.profile")}</span>
                </span>
            </span>
            <span className="keycap ml-1 hidden md:inline-grid">P</span>
        </button>
    );
};

const Progress = () => {
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    const found = projectLandmarks.filter((l) => discovered.includes(l.id)).length;
    return (
        <div className="card px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">{t("hud.found")}</span>
                <span className="font-display text-lg font-extrabold leading-none">
                    {found}
                    <span className="text-ink-soft/60">/{projectLandmarks.length}</span>
                </span>
            </div>
            <div className="mt-1.5 flex gap-1">
                {projectLandmarks.map((l) => (
                    <span
                        key={l.id}
                        title={landmarkLabel(l, lang)}
                        className="h-2 flex-1 rounded-full transition-colors duration-500"
                        style={{ background: discovered.includes(l.id) ? l.color : "rgb(42 35 64 / 0.12)" }}
                    />
                ))}
            </div>
        </div>
    );
};

// During a game, small screens keep only the minimap so the score card fits.
const TopRight = ({ helpOpen, onHelp, gameActive }) => {
    const openPanel = useStore((s) => s.openPanel);
    const night = useStore((s) => s.night);
    const toggleNight = useStore((s) => s.toggleNight);
    const openQuickView = useStore((s) => s.openQuickView);
    const sound = useStore((s) => s.sound);
    const toggleSound = useStore((s) => s.toggleSound);
    const t = useT();
    const btn = "icon-btn h-10 w-full";
    return (
        <div className="pointer-events-auto flex w-[132px] flex-col gap-2 md:w-[168px] md:gap-2.5">
            <button
                onClick={() => openPanel({ type: "map" })}
                aria-label={t("hud.openMap")}
                className="card relative aspect-square overflow-hidden rounded-full bg-[#BFE3F5] p-1.5 transition hover:scale-[1.03]"
            >
                <IslandMap />
                <span className="keycap absolute bottom-2 right-3 hidden md:inline-grid">M</span>
            </button>
            <div className={gameActive ? "max-md:hidden" : undefined}>
                <Progress />
            </div>
            <div className={`grid grid-cols-3 gap-1.5 ${gameActive ? "max-md:hidden" : ""}`}>
                <button className={btn} onClick={() => openPanel({ type: "map" })} aria-label={t("hud.map")} title={`${t("hud.map")} (M)`}>
                    <MapIcon size={19} />
                </button>
                <button
                    className={btn}
                    onClick={toggleNight}
                    aria-label={night ? t("hud.toDay") : t("hud.toNight")}
                    title={`${t("hud.dayNight")} (N)`}
                >
                    {night ? <SunIcon size={19} /> : <MoonIcon size={19} />}
                </button>
                <button className={btn} onClick={openQuickView} aria-label={t("hud.quick")} title={t("hud.quick")}>
                    <GridIcon size={19} />
                </button>
                <button
                    className={btn}
                    onClick={toggleSound}
                    aria-label={sound ? t("hud.soundOff") : t("hud.soundOn")}
                    aria-pressed={sound}
                    title={sound ? t("hud.soundOff") : t("hud.soundOn")}
                >
                    {sound ? <SoundOnIcon size={19} /> : <SoundOffIcon size={19} />}
                </button>
                <LangToggle compact className="h-10 w-full" />
                {!isTouch && (
                    <button
                        className={`${btn} ${helpOpen ? "bg-ink text-white" : ""}`}
                        onClick={onHelp}
                        aria-label={helpOpen ? t("hud.hideControls") : t("hud.showControls")}
                        aria-pressed={helpOpen}
                        title={t("hud.controls")}
                    >
                        <HelpIcon size={19} />
                    </button>
                )}
            </div>
        </div>
    );
};

// What the prompt offers: a building to enter or a game to start.
const usePromptTarget = () => {
    const nearby = useStore((s) => s.nearby);
    const openLandmark = useStore((s) => s.openLandmark);
    const pad = useArcade((s) => (s.active ? null : s.nearby));
    const start = useArcade((s) => s.start);
    const lang = useLang();
    const t = useT();
    const landmark = nearby && getLandmark(nearby);
    if (landmark) {
        return {
            id: landmark.id,
            color: landmark.color,
            verb: landmark.type === "about" ? t("hud.visit") : t("hud.explore"),
            name: landmark.shortLabel ?? landmarkLabel(landmark, lang),
            onClick: () => openLandmark(landmark.id),
        };
    }
    const game = pad && getGame(pad);
    if (game) {
        return { id: game.id, color: game.color, verb: t("game.play"), name: t(`game.${game.id}`), onClick: () => start(game.id) };
    }
    return null;
};

const InteractPrompt = () => {
    const panel = useStore((s) => s.panel);
    const target = usePromptTarget();
    return (
        <AnimatePresence>
            {target && !panel && (
                <motion.button
                    key={target.id}
                    onClick={target.onClick}
                    className="card pointer-events-auto fixed bottom-[176px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap py-2.5 pl-2.5 pr-5 md:bottom-9"
                    style={{ borderColor: target.color }}
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 380 }}
                >
                    {isTouch ? (
                        <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: target.color }}>
                            <PlayIcon size={16} />
                        </span>
                    ) : (
                        <span className="keycap h-9 min-w-9 text-base">E</span>
                    )}
                    <span className="font-display text-lg font-bold">
                        {target.verb} <span style={{ color: target.color }}>{target.name}</span>
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

const KEYS = [
    [["W", "A", "S", "D"], "controls.move"],
    [["Shift"], "controls.run"],
    [["key.space"], "controls.jump"],
    [["key.drag"], "controls.look"],
    [["E"], "controls.enter"],
    [["M"], "controls.map"],
    [["N"], "controls.night"],
];

// Bottom-left on desktop; on narrow windows it drops down under the buttons.
const ControlsHint = ({ open, onClose }) => {
    const t = useT();
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="card pointer-events-auto fixed right-3 top-[330px] z-20 w-64 p-4 md:bottom-6 md:left-6 md:right-auto md:top-auto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                >
                    <div className="mb-2 flex items-center justify-between">
                        <p className="eyebrow text-ink-soft/70">{t("hud.controls")}</p>
                        <button
                            onClick={onClose}
                            aria-label={t("hud.hideControls")}
                            className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition hover:bg-ink/10"
                        >
                            <CloseIcon size={14} />
                        </button>
                    </div>
                    <ul className="space-y-1.5">
                        {KEYS.map(([keys, label]) => (
                            <li key={label} className="flex items-center justify-between gap-2 text-sm font-bold">
                                <span className="flex gap-1">
                                    {keys.map((k) => (
                                        <span key={k} className="keycap">
                                            {k.startsWith("key.") ? t(k) : k}
                                        </span>
                                    ))}
                                </span>
                                <span className="text-ink-soft">{t(label)}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Joystick = () => {
    const base = useRef();
    const knob = useRef();
    const pointer = useRef(null);
    const RANGE = 46;

    const release = () => {
        pointer.current = null;
        if (knob.current) knob.current.style.transform = "";
        input.joystick.x = 0;
        input.joystick.y = 0;
        input.run = false;
    };
    useEffect(() => release, []);

    const update = (e) => {
        const rect = base.current.getBoundingClientRect();
        let dx = e.clientX - (rect.left + rect.width / 2);
        let dy = e.clientY - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy);
        if (d > RANGE) {
            dx *= RANGE / d;
            dy *= RANGE / d;
        }
        knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
        input.joystick.x = dx / RANGE;
        input.joystick.y = dy / RANGE;
        input.run = d > RANGE * 0.95;
    };

    return (
        <div
            ref={base}
            className="pointer-events-auto relative h-[132px] w-[132px] touch-none rounded-full border-[3px] border-white/70 bg-ink/20 shadow-lg backdrop-blur-sm"
            onPointerDown={(e) => {
                pointer.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                update(e);
            }}
            onPointerMove={(e) => e.pointerId === pointer.current && update(e)}
            onPointerUp={release}
            onPointerCancel={release}
        >
            <div
                ref={knob}
                className="absolute left-1/2 top-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full border-[3px] border-white bg-paper shadow-[0_4px_0_rgb(42_35_64/0.25)]"
            />
        </div>
    );
};

const MobileControls = () => {
    const t = useT();
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Joystick />
            <button
                aria-label={t("hud.jump")}
                className="pointer-events-auto mb-4 grid h-16 w-16 touch-none place-items-center rounded-full border-[3px] border-white bg-paper text-ink shadow-[0_4px_0_rgb(42_35_64/0.25)] active:translate-y-1"
                onPointerDown={() => (input.jump = true)}
            >
                <ArrowUpIcon size={26} />
            </button>
        </div>
    );
};

export const Hud = () => {
    const panel = useStore((s) => s.panel);
    const game = useArcade((s) => s.active);
    const bowling = game === "bowling";
    const hasMoved = useStore((s) => s.hasMoved);
    // Shown once on wide screens, then tucked away a few seconds after the
    // first steps, unless the visitor opened or closed it themselves.
    const [helpOpen, setHelpOpen] = useState(() => window.innerWidth >= 768);
    const helpTouched = useRef(false);
    const toggleHelp = (open) => {
        helpTouched.current = true;
        setHelpOpen(open);
    };

    useEffect(() => {
        if (!hasMoved) return;
        const t = setTimeout(() => {
            if (!helpTouched.current) setHelpOpen(false);
        }, 5000);
        return () => clearTimeout(t);
    }, [hasMoved]);

    return (
        <motion.div className="pointer-events-none fixed inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <div className="flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:p-6">
                <div className="pointer-events-auto">
                    <PlayerBadge />
                </div>
                <TopRight helpOpen={helpOpen} onHelp={() => toggleHelp(!helpOpen)} gameActive={Boolean(game)} />
            </div>
            <InteractPrompt />
            {!isTouch && <ControlsHint open={!panel && !game && helpOpen} onClose={() => toggleHelp(false)} />}
            {isTouch && !panel && !bowling && <MobileControls />}
            <GameHud />
        </motion.div>
    );
};
