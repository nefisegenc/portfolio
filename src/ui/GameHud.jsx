// HUD for the arcade games: score card, countdown, pop-up messages, the
// results card and touch buttons for bowling.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getGame } from "../data/arcade";
import { BOWLING_FRAMES, frameTotals, rollMarks } from "../game/arcade/bowlingScore";
import { formatScore } from "../game/arcade/format";
import { arcadeLink, useArcade } from "../game/arcade/state";
import { input } from "../game/input";
import { isTouch } from "../game/utils";
import { useT } from "../i18n";
import { ChevronLeft, ChevronRight, CloseIcon, StarIcon } from "./icons";

const Stat = ({ label, value, color }) => (
    <div className="text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">{label}</p>
        <p className="font-display text-2xl font-extrabold leading-none tabular-nums" style={{ color }}>
            {value}
        </p>
    </div>
);

// A score sheet: each frame's marks over its running total.
const BowlingSheet = ({ detail }) => {
    const totals = frameTotals(detail.frames);
    return (
        <div className="flex gap-1">
            {Array.from({ length: BOWLING_FRAMES }, (_, i) => {
                const last = i === BOWLING_FRAMES - 1;
                const marks = rollMarks(detail.frames[i], last);
                const current = i === detail.frame - 1;
                return (
                    <div
                        key={i}
                        className={`flex min-w-9 flex-col items-center rounded-lg border-2 px-1 font-display leading-tight ${current ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-line bg-white/70"} ${last ? "min-w-12" : ""}`}
                    >
                        <span className="flex h-4 gap-1 text-[11px] font-extrabold">
                            {marks.length ? marks.map((m, j) => <span key={j}>{m}</span>) : <span className="text-ink-soft/40">·</span>}
                        </span>
                        <span className="text-sm font-extrabold tabular-nums">{totals[i] ?? "\u00A0"}</span>
                    </div>
                );
            })}
        </div>
    );
};

// Bowling's power gauge, redrawn every frame straight from the game.
const PowerMeter = () => {
    const box = useRef();
    const fill = useRef();
    const t = useT();
    useEffect(() => {
        let frame;
        const tick = () => {
            const value = arcadeLink.meter;
            if (box.current) {
                box.current.style.opacity = value === null ? "0" : "1";
                if (value !== null) {
                    fill.current.style.height = `${Math.round(value * 100)}%`;
                    fill.current.style.background = value > 0.85 ? "#EF4444" : value > 0.55 ? "#FACC15" : "#22D3EE";
                }
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, []);
    return (
        <div
            ref={box}
            className="card pointer-events-none fixed left-6 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 px-2 py-3 opacity-0 transition-opacity max-md:left-3"
        >
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">{t("game.power")}</p>
            <div className="relative h-40 w-5 overflow-hidden rounded-full bg-ink/10">
                <div ref={fill} className="absolute inset-x-0 bottom-0 rounded-full" />
            </div>
        </div>
    );
};

// Takes the game as a prop so it can still render while animating out
// after the store has already cleared the game.
const ScoreCard = ({ active }) => {
    const score = useArcade((s) => s.score);
    const time = useArcade((s) => s.time);
    const detail = useArcade((s) => s.detail);
    const best = useArcade((s) => s.best[active]);
    const quit = useArcade((s) => s.quit);
    const t = useT();
    const game = getGame(active);

    let stats;
    if (active === "bowling") {
        stats = (
            <>
                <Stat label={t("game.score")} value={score} color={game.color} />
                {detail && (
                    <div>
                        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">
                            {t("game.frame", { n: detail.frame, total: BOWLING_FRAMES })} · {t("game.roll", { n: detail.roll })}
                        </p>
                        <BowlingSheet detail={detail} />
                    </div>
                )}
            </>
        );
    } else if (active === "race") {
        stats = (
            <>
                {detail && <Stat label={t("game.place")} value={`${detail.place}/${detail.racers}`} color={game.color} />}
                {detail && <Stat label={t("game.lapOf", { n: detail.lap, total: detail.laps })} value={`${time.toFixed(1)}s`} />}
            </>
        );
    } else {
        stats = (
            <>
                <Stat label={t("game.timeLeft")} value={`${Math.ceil(time)}s`} color={time <= 5 ? "#EF4444" : undefined} />
                <Stat label={t("game.score")} value={score} color={game.color} />
            </>
        );
    }

    return (
        <motion.div
            className="card pointer-events-auto fixed inset-x-3 top-[156px] z-20 flex items-center justify-between gap-4 py-2 pl-4 pr-2 md:inset-x-auto md:left-1/2 md:top-6 md:-translate-x-1/2"
            style={{ borderColor: game.color }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
        >
            <div className="hidden md:block">
                <p className="eyebrow" style={{ color: game.color }}>
                    {t("arcade.name")}
                </p>
                <p className="font-display text-lg font-extrabold leading-tight">{t(`game.${active}`)}</p>
            </div>
            {stats}
            <Stat label={t("game.best")} value={best === undefined ? "–" : formatScore(active, best)} />
            <button
                onClick={quit}
                className="icon-btn h-9 w-9"
                aria-label={t("game.quit")}
                title={isTouch ? t("game.quit") : `${t("game.quit")} (Esc)`}
            >
                <CloseIcon size={16} />
            </button>
        </motion.div>
    );
};

const Countdown = () => {
    const countdown = useArcade((s) => (s.status === "countdown" ? s.countdown : 0));
    return (
        <AnimatePresence>
            {countdown > 0 && (
                <motion.p
                    key={countdown}
                    className="game-title pointer-events-none fixed inset-x-0 top-[30%] z-30 text-center text-8xl"
                    initial={{ opacity: 0, scale: 1.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25 }}
                >
                    {countdown}
                </motion.p>
            )}
        </AnimatePresence>
    );
};

const Message = () => {
    const shown = useArcade((s) => s.message);
    const t = useT();
    return (
        <AnimatePresence>
            {shown && (
                <motion.p
                    key={shown.id}
                    className="game-title pointer-events-none fixed inset-x-0 top-[30%] z-30 px-4 text-center text-5xl md:text-7xl"
                    style={{ color: shown.color }}
                    initial={{ opacity: 0, scale: 0.6, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", damping: 14, stiffness: 300 }}
                >
                    {t(shown.key, shown.vars)}
                </motion.p>
            )}
        </AnimatePresence>
    );
};

const Results = ({ active, result }) => {
    const start = useArcade((s) => s.start);
    const quit = useArcade((s) => s.quit);
    const t = useT();
    const game = getGame(active);
    return (
        <motion.div
            role="dialog"
            aria-label={t("game.result")}
            className="card pointer-events-auto fixed left-1/2 top-1/2 z-40 w-[min(90vw,340px)] -translate-x-1/2 -translate-y-1/2 p-6 text-center"
            style={{ borderColor: game.color }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
        >
            <p className="font-display text-lg font-extrabold leading-tight" style={{ color: game.color }}>
                {t(`game.${active}`)}
            </p>
            <p className="font-display text-sm font-bold text-ink-soft">{t("game.result")}</p>
            <p className="font-display text-6xl font-extrabold leading-none tabular-nums">{formatScore(active, result.score)}</p>
            {result.extra?.place && (
                <p className="mt-1 font-display text-lg font-extrabold" style={{ color: game.color }}>
                    {t("game.finishedPlace", { place: t(`place.${result.extra.place}`) })}
                </p>
            )}
            {result.record ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 font-display font-bold">
                    <StarIcon size={16} /> {t("game.newBest")}
                </p>
            ) : (
                <p className="mt-3 text-sm font-bold text-ink-soft">
                    {t("game.best")}: {formatScore(active, result.previous)}
                </p>
            )}
            <div className="mt-5 flex justify-center gap-2">
                <button className="btn btn-ghost" onClick={quit}>
                    {t("game.close")}
                </button>
                <button className="btn" style={{ "--c": game.color }} onClick={() => start(active)} autoFocus>
                    {t("game.again")}
                </button>
            </div>
        </motion.div>
    );
};

// Hold-to-move buttons share the keyboard's input flags.
const HoldButton = ({ flag, label, children }) => {
    const release = () => (input[flag] = false);
    useEffect(() => () => (input[flag] = false), [flag]);
    return (
        <button
            aria-label={label}
            className="pointer-events-auto grid h-16 w-16 touch-none place-items-center rounded-full border-[3px] border-white bg-paper text-ink shadow-[0_4px_0_rgb(42_35_64/0.25)] active:translate-y-1"
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input[flag] = true;
            }}
            onPointerUp={release}
            onPointerCancel={release}
        >
            {children}
        </button>
    );
};

// The touch version of Space: a press, and held for as long as the finger stays.
const ActionButton = ({ color, children }) => {
    useEffect(() => () => (arcadeLink.holding = false), []);
    const release = () => (arcadeLink.holding = false);
    return (
        <button
            className="btn pointer-events-auto mb-1 h-16 touch-none px-7 text-lg"
            style={{ "--c": color }}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                arcadeLink.action = true;
                arcadeLink.holding = true;
            }}
            onPointerUp={release}
            onPointerCancel={release}
        >
            {children}
        </button>
    );
};

const BowlingTouch = () => {
    const t = useT();
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-3">
                <HoldButton flag="left" label={t("game.left")}>
                    <ChevronLeft size={26} />
                </HoldButton>
                <HoldButton flag="right" label={t("game.right")}>
                    <ChevronRight size={26} />
                </HoldButton>
            </div>
            <ActionButton color="#8B5CF6">{t("game.throw")}</ActionButton>
        </div>
    );
};

// The race's speedometer, nitro tank and a map of the circuit with every
// kart on it, all redrawn every frame straight from the game. (The circuit's
// outline comes from the game too, which keeps three.js out of this bundle.)
const RaceGauges = () => {
    const speed = useRef();
    const nitro = useRef();
    const dots = useRef();
    const [map, setMap] = useState(null);
    const t = useT();
    useEffect(() => {
        let frame;
        const tick = () => {
            const race = arcadeLink.race;
            if (race) setMap((m) => m ?? race.map);
            if (race && speed.current) {
                speed.current.textContent = Math.round(race.speed * 3.6);
                nitro.current.style.width = `${Math.round(race.nitro * 100)}%`;
                race.dots.forEach((d, i) => {
                    const el = dots.current?.children[i];
                    if (el) el.setAttribute("transform", `translate(${d.x.toFixed(1)} ${d.z.toFixed(1)})`);
                });
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, []);
    const colors = ["#22C55E", "#3B82F6", "#EAB308", "#F97316"];
    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-20 flex items-end gap-3 max-md:bottom-[170px] max-md:right-3">
            <div className="card px-4 py-2 text-center">
                <p className="font-display text-4xl font-extrabold leading-none tabular-nums">
                    <span ref={speed}>0</span>
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">{t("game.speed")}</p>
                <div className="mt-2 h-2.5 w-28 overflow-hidden rounded-full bg-ink/10">
                    <div ref={nitro} className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#3B82F6]" />
                </div>
                <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">{t("game.nitro")}</p>
            </div>
            <div className="card hidden p-2 md:block">
                <svg viewBox={map?.viewBox ?? "0 0 1 1"} className="h-28 w-36">
                    {map && <path d={map.d} fill="none" stroke="#2A2340" strokeOpacity="0.25" strokeWidth="7" strokeLinejoin="round" />}
                    <g ref={dots}>
                        {colors.map((c, i) => (
                            <circle key={i} r={i === 3 ? 4.5 : 3.5} fill={c} stroke="#fff" strokeWidth="1.5" />
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
};

const RaceTouch = () => {
    const t = useT();
    return (
        <div className="pointer-events-none fixed bottom-0 right-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <ActionButton color="#2563EB">{t("game.nitro")}</ActionButton>
        </div>
    );
};

const KEY_HELP = {
    bowling: [["←", "→"], ["key.space"]],
    hook: [["←", "→"]],
    race: [["W", "A", "S", "D"], ["key.space"]],
    bugs: [["W", "A", "S", "D"], ["key.space"]],
};

const KeyHelp = ({ active }) => {
    const t = useT();
    // Once the ball is rolling, the arrows put hook on it instead.
    const rolling = useArcade((s) => s.active === "bowling" && s.detail?.phase === "rolling");
    const help = rolling ? "hook" : active;
    return (
        <div className="card pointer-events-none fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap px-4 py-2 text-sm font-bold text-ink-soft">
            {KEY_HELP[help].map((keys) => (
                <span key={keys.join()} className="flex gap-1">
                    {keys.map((k) => (
                        <span key={k} className="keycap">
                            {k.startsWith("key.") ? t(k) : k}
                        </span>
                    ))}
                </span>
            ))}
            <span>{t(`game.help.${help}`)}</span>
        </div>
    );
};

// Space or Enter is each game's action button: pressed, and held.
const isAction = (e) => e.code === "Space" || e.key === "Enter";
const useGameKeys = () => {
    useEffect(() => {
        const down = (e) => {
            const { active, status } = useArcade.getState();
            if (!active || status === "done" || !isAction(e)) return;
            e.preventDefault();
            if (e.repeat) return;
            arcadeLink.action = true;
            arcadeLink.holding = true;
        };
        const up = (e) => {
            if (isAction(e)) arcadeLink.holding = false;
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);
};

export const GameHud = () => {
    const active = useArcade((s) => s.active);
    const status = useArcade((s) => s.status);
    const result = useArcade((s) => s.result);
    useGameKeys();
    return (
        <>
            <AnimatePresence>{active && status !== "done" && <ScoreCard key="card" active={active} />}</AnimatePresence>
            <Countdown />
            <Message />
            <AnimatePresence>{status === "done" && result && <Results key="results" active={active} result={result} />}</AnimatePresence>
            {active === "bowling" && status === "playing" && isTouch && <BowlingTouch />}
            {active === "bowling" && <PowerMeter />}
            {active === "race" && status !== "done" && <RaceGauges />}
            {active === "race" && status === "playing" && isTouch && <RaceTouch />}
            {active && status !== "done" && !isTouch && <KeyHelp active={active} />}
        </>
    );
};
