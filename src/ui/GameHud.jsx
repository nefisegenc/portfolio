// HUD for the arcade games: score card, countdown, pop-up messages, the
// results card and touch buttons for bowling.
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getGame } from "../data/arcade";
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

// Strike "X", spare "/", a dash for a miss, as on a bowling score sheet.
const rollMarks = (rolls = []) =>
    rolls.map((n, i) => {
        if (i === 0 && n === 10) return "X";
        if (i === 1 && rolls[0] + n === 10) return "/";
        return n === 0 ? "–" : String(n);
    });

const BowlingSheet = ({ detail }) => (
    <div className="flex gap-1">
        {Array.from({ length: detail.frames }, (_, i) => {
            const marks = rollMarks(detail.rolls[i]);
            const current = i === detail.frame - 1;
            return (
                <div
                    key={i}
                    className={`flex h-7 min-w-11 items-center justify-center gap-1 rounded-lg border-2 px-1.5 font-display text-sm font-extrabold ${current ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-line bg-white/70"}`}
                >
                    {marks.length ? marks.map((m, j) => <span key={j}>{m}</span>) : <span className="text-ink-soft/40">·</span>}
                </div>
            );
        })}
    </div>
);

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
                            {t("game.frame", { n: detail.frame, total: detail.frames })} · {t("game.roll", { n: detail.roll })}
                        </p>
                        <BowlingSheet detail={detail} />
                    </div>
                )}
            </>
        );
    } else if (active === "race") {
        stats = (
            <>
                <Stat label={t("game.time")} value={`${time.toFixed(1)}s`} color={game.color} />
                {detail && (
                    <Stat
                        label={t("game.lapOf", { n: Math.min(detail.lap, detail.laps), total: detail.laps })}
                        value={`${(detail.checkpoint % 8) + 1}/8`}
                    />
                )}
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
            <button
                className="btn pointer-events-auto mb-1 h-16 px-7 text-lg"
                style={{ "--c": "#8B5CF6" }}
                onPointerDown={() => (arcadeLink.action = true)}
            >
                {t("game.throw")}
            </button>
        </div>
    );
};

const KEY_HELP = {
    bowling: [["←", "→"], ["key.space"]],
    race: [["W", "A", "S", "D"], ["Shift"], ["key.space"]],
    bugs: [["W", "A", "S", "D"]],
};

const KeyHelp = ({ active }) => {
    const t = useT();
    return (
        <div className="card pointer-events-none fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap px-4 py-2 text-sm font-bold text-ink-soft">
            {KEY_HELP[active].map((keys) => (
                <span key={keys.join()} className="flex gap-1">
                    {keys.map((k) => (
                        <span key={k} className="keycap">
                            {k.startsWith("key.") ? t(k) : k}
                        </span>
                    ))}
                </span>
            ))}
            <span>{t(`game.help.${active}`)}</span>
        </div>
    );
};

const useGameKeys = () => {
    useEffect(() => {
        const onKey = (e) => {
            const { active, status } = useArcade.getState();
            if (!active || e.repeat) return;
            if (active === "bowling" && status === "playing" && (e.code === "Space" || e.key === "Enter")) {
                e.preventDefault();
                arcadeLink.action = true;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
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
            {active && status !== "done" && !isTouch && <KeyHelp active={active} />}
        </>
    );
};
