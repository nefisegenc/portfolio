// HUD for the arcade games: score card, countdown, pop-up messages, the
// results card and touch buttons for bowling.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getGame } from "../data/arcade";
import { BOWLING_FRAMES, frameTotals, rollMarks } from "../game/arcade/bowlingScore";
import { formatScore } from "../game/arcade/format";
import { FRET_KEYS, LANE_COLORS } from "../game/arcade/riff/song";
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

// A labelled gauge; health bars go from green to red as they empty.
const Bar = ({ label, value, color }) => (
    <div className="flex items-center gap-1.5">
        <span className="w-12 text-[9px] font-extrabold uppercase tracking-wider text-ink-soft">{label}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
            <span
                className="block h-full rounded-full transition-[width] duration-200"
                style={{ width: `${Math.round(value * 100)}%`, background: color ?? (value > 0.5 ? "#22C55E" : value > 0.25 ? "#F59E0B" : "#EF4444") }}
            />
        </span>
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
    } else if (active === "riff" && detail) {
        stats = (
            <>
                <Stat label={t("game.score")} value={score} color={game.color} />
                <Stat label={t("game.mult")} value={`x${detail.mult}`} color={detail.mult > 1 ? "#F59E0B" : undefined} />
                <Stat label={t("game.combo")} value={detail.combo} />
                <div className="w-28 space-y-1">
                    <Bar label={t("game.crowd")} value={detail.rock} />
                    <Bar label={t("game.song")} value={detail.progress} color="#A78BFA" />
                </div>
            </>
        );
    } else if (detail) {
        stats = (
            <>
                <Stat label={t("game.wave")} value={`${detail.wave}/${detail.waves}`} />
                <Stat label={t("game.score")} value={score} color={game.color} />
                <Stat label={t("game.combo")} value={`x${detail.combo}`} color={detail.combo > 1 ? "#F59E0B" : undefined} />
                <div className="w-28 space-y-1">
                    <Bar label={t("game.core")} value={detail.core} />
                    <Bar label={t("game.you")} value={detail.hp} />
                    <Bar label={t("game.heat")} value={detail.heat} color={detail.overheat ? "#EF4444" : detail.heat > 0.7 ? "#F97316" : "#22D3EE"} />
                    {(detail.rapid || detail.triple) && (
                        <p className="flex gap-1 text-[10px] font-extrabold uppercase">
                            {detail.rapid && <span className="rounded bg-[#FACC15] px-1">{t("hunt.rapid")}</span>}
                            {detail.triple && <span className="rounded bg-[#22D3EE] px-1">{t("hunt.triple")}</span>}
                        </p>
                    )}
                </div>
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
            {/* The record stays off small screens to leave room for the game's own stats. */}
            <div className="max-md:hidden">
                <Stat label={t("game.best")} value={best === undefined ? "–" : formatScore(active, best)} />
            </div>
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
            {result.extra?.stars !== undefined && (
                <div className="mt-2">
                    {result.extra.failed ? (
                        <p className="font-display text-lg font-extrabold text-[#EF4444]">{t("riff.booed")}</p>
                    ) : (
                        <p className="font-display text-3xl tracking-widest text-[#F59E0B]" aria-label={`${result.extra.stars}/5`}>
                            {"★".repeat(result.extra.stars)}
                            <span className="text-ink/15">{"★".repeat(5 - result.extra.stars)}</span>
                        </p>
                    )}
                    <p className="text-sm font-bold text-ink-soft">
                        {t("game.accuracy", { n: result.extra.accuracy })} · {t("game.maxCombo", { n: result.extra.maxCombo })}
                    </p>
                </div>
            )}
            {result.extra?.wave && (
                <p className="mt-1 font-display text-lg font-extrabold" style={{ color: result.extra.victory ? "#22C55E" : "#EF4444" }}>
                    {result.extra.victory ? t("hunt.victory") : t("game.reachedWave", { n: result.extra.wave })}
                </p>
            )}
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
                result.previous !== undefined && (
                    <p className="mt-3 text-sm font-bold text-ink-soft">
                        {t("game.best")}: {formatScore(active, result.previous)}
                    </p>
                )
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
                arcadeLink.action = true;
                arcadeLink.holding = true;
                e.currentTarget.setPointerCapture(e.pointerId);
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

// Bug Hunt's second stick on touch screens: drag to aim, and it fires
// while held.
const AimStick = () => {
    const base = useRef();
    const knob = useRef();
    const pointer = useRef(null);
    const t = useT();
    const RANGE = 46;
    const release = () => {
        pointer.current = null;
        if (knob.current) knob.current.style.transform = "";
        arcadeLink.aimStick = null;
    };
    useEffect(() => () => (arcadeLink.aimStick = null), []);
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
        arcadeLink.aimStick = { x: dx / RANGE, y: dy / RANGE };
    };
    return (
        <div className="pointer-events-none fixed bottom-0 right-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div
                ref={base}
                aria-label={t("game.aim")}
                className="pointer-events-auto relative h-[132px] w-[132px] touch-none rounded-full border-[3px] border-[#22C55E]/80 bg-ink/25 shadow-lg backdrop-blur-sm"
                onPointerDown={(e) => {
                    pointer.current = e.pointerId;
                    update(e);
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => e.pointerId === pointer.current && update(e)}
                onPointerUp={release}
                onPointerCancel={release}
            >
                <div
                    ref={knob}
                    className="absolute left-1/2 top-1/2 -ml-8 -mt-8 grid h-16 w-16 place-items-center rounded-full border-[3px] border-white bg-[#22C55E] font-display text-sm font-extrabold text-white shadow-[0_4px_0_rgb(42_35_64/0.25)]"
                >
                    {t("game.aim")}
                </div>
            </div>
        </div>
    );
};

// A red flash round the screen edges when the player gets hurt.
const HurtFlash = () => {
    const ref = useRef();
    useEffect(() => {
        let frame;
        const tick = () => {
            const since = (performance.now() - arcadeLink.hurt) / 1000;
            if (ref.current) ref.current.style.opacity = since < 0.5 ? String(1 - since / 0.5) : "0";
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, []);
    return <div ref={ref} className="pointer-events-none fixed inset-0 z-30 opacity-0 shadow-[inset_0_0_120px_40px_rgba(239,68,68,0.75)]" />;
};

// The game's action button on touch screens, beside the joystick.
const TouchAction = ({ color, label }) => (
    <div className="pointer-events-none fixed bottom-0 right-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <ActionButton color={color}>{label}</ActionButton>
    </div>
);

// Riff Rush's last hit or miss, popping up over the highway.
const RiffJudge = () => {
    const judge = useArcade((s) => (s.active === "riff" ? s.detail?.judge : null));
    const id = useArcade((s) => s.detail?.judgeId);
    const t = useT();
    return (
        <AnimatePresence>
            {judge && (
                <motion.p
                    key={id}
                    className="game-title pointer-events-none fixed inset-x-0 top-[52%] z-20 text-center text-3xl md:text-4xl"
                    style={{ color: judge.color }}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.12 }}
                >
                    {t(judge.key)}
                </motion.p>
            )}
        </AnimatePresence>
    );
};

// Five fret buttons along the bottom on touch screens.
const RiffTouch = () => {
    useEffect(() => () => [0, 1, 2, 3, 4].forEach((lane) => arcadeLink.fret?.(lane, false)), []);
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {LANE_COLORS.map((c, lane) => {
                const up = () => arcadeLink.fret?.(lane, false);
                return (
                    <button
                        key={c}
                        aria-label={`${lane + 1}`}
                        className="pointer-events-auto h-16 flex-1 touch-none rounded-2xl border-[3px] border-white/80 shadow-[0_4px_0_rgb(42_35_64/0.3)] active:translate-y-1 active:brightness-125"
                        style={{ background: c, maxWidth: 76 }}
                        onPointerDown={(e) => {
                            arcadeLink.fret?.(lane, true);
                            e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerUp={up}
                        onPointerCancel={up}
                    />
                );
            })}
        </div>
    );
};

const KEY_HELP = {
    bowling: [["←", "→"], ["key.space"]],
    hook: [["←", "→"]],
    race: [["W", "A", "S", "D"], ["key.space"]],
    bugs: [["W", "A", "S", "D"], ["key.mouse"]],
    riff: [FRET_KEYS],
};
// Riff Rush's keys wear their frets' colours.
const KEY_TINTS = { riff: LANE_COLORS };

const KeyHelp = ({ active }) => {
    const t = useT();
    // Once the ball is rolling, the arrows put hook on it instead.
    const rolling = useArcade((s) => s.active === "bowling" && s.detail?.phase === "rolling");
    const help = rolling ? "hook" : active;
    return (
        <div className="card pointer-events-none fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap px-4 py-2 text-sm font-bold text-ink-soft">
            {KEY_HELP[help].map((keys) => (
                <span key={keys.join()} className="flex gap-1">
                    {keys.map((k, i) => (
                        <span
                            key={k}
                            className="keycap"
                            style={KEY_TINTS[help] && { background: KEY_TINTS[help][i], borderColor: KEY_TINTS[help][i], color: "#fff" }}
                        >
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
    // Riff Rush's frets carry their keys, so its help bar steps aside once
    // the song is under way and the highway needs the room.
    const riffUnderway = useArcade((s) => s.active === "riff" && (s.detail?.progress ?? 0) > 0.1);
    const t = useT();
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
            {active === "race" && status === "playing" && isTouch && <TouchAction color="#2563EB" label={t("game.nitro")} />}
            {active === "bugs" && status === "playing" && isTouch && <AimStick />}
            {active === "bugs" && <HurtFlash />}
            {active === "riff" && <RiffJudge />}
            {active === "riff" && status === "playing" && isTouch && <RiffTouch />}
            {active && status !== "done" && !isTouch && !riffUnderway && <KeyHelp active={active} />}
        </>
    );
};
