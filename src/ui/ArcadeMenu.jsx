// Game mode's menu: the four arcade games, ready to play from anywhere.
import { motion } from "framer-motion";
import { games } from "../data/arcade";
import { formatScore } from "../game/arcade/format";
import { useArcade } from "../game/arcade/state";
import { isTouch } from "../game/utils";
import { useStore } from "../store";
import { useT } from "../i18n";
import { CloseIcon, PlayIcon } from "./icons";

// Little pictures for each game, drawn in white on its colour.
const BowlingGlyph = () => (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
        <path d="M14 6c-3 0-4.5 3.5-3.6 8l.8 3.2c-3.2 2.8-4.4 7-3.5 13.3L8.6 41h10.8l.9-10.5c.9-6.3-.3-10.5-3.5-13.3l.8-3.2C18.5 9.5 17 6 14 6Z" fill="#fff" />
        <path d="M10.6 14.6h6.8M10.9 17.6h6.2" stroke="#E11D48" strokeWidth="1.8" />
        <circle cx="32" cy="31" r="10" fill="#fff" />
        <circle cx="29" cy="27" r="1.6" fill="#1C1730" />
        <circle cx="33.5" cy="26" r="1.6" fill="#1C1730" />
        <circle cx="31" cy="31.5" r="1.8" fill="#1C1730" />
    </svg>
);

const RaceGlyph = () => (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
        <path d="M11 6v36" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M12.5 8c6-3 10 3 16 0s9 0 9 0v17s-3-3-9 0-10-3-16 0Z" fill="#fff" />
        <path d="M12.5 8c3-1.5 5.3-.9 7.6.1v8.5c-2.3-1-4.6-1.6-7.6-.1Zm7.6 8.6c2.6 1.1 5.2 1.6 8.4.1V8c-3.2 1.6-5.8 1.1-8.4 0ZM12.5 16.6c3-1.5 5.3-.9 7.6.1V25c-2.3-1-4.6-1.6-7.6-.1Zm16 8.5c3.2-1.6 6.6-1.7 9 0v-8.4c-2.4-1.7-5.8-1.6-9 0Z" fill="#1C1730" />
    </svg>
);

const BugGlyph = () => (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M18 9l3 4M30 9l-3 4M12 22l-5-2M12 29H6M13 36l-5 3M36 22l5-2M36 29h6M35 36l5 3" />
        </g>
        <ellipse cx="24" cy="29" rx="11" ry="13" fill="#fff" />
        <circle cx="24" cy="15.5" r="6" fill="#fff" />
        <path d="M24 18v24" stroke="#1C1730" strokeWidth="2" />
        <circle cx="21.5" cy="15" r="1.4" fill="#1C1730" />
        <circle cx="26.5" cy="15" r="1.4" fill="#1C1730" />
    </svg>
);

const RiffGlyph = () => (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
        <path d="M28 20 40.5 7.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <path d="m38.5 5.5 4 4-2.5 2.5-4-4Z" fill="#fff" />
        <path
            d="M24.5 17.5c-3.5-2-8-.8-9.6 2.5-.9 1.8-2.6 2.6-4.6 2.8-3.4.3-5.8 3.6-4.9 7.1.6 2.4 2.5 3.8 3.8 5.8 1.2 1.9 1.6 4.7 3.9 6 3.4 1.8 7.4-.7 7.7-4.5.2-2.1 1.1-3.8 3-4.8 3.3-1.6 4.5-6.1 2.7-9.6-.6-1.3-1.2-3.2-2-5.3Z"
            fill="#fff"
        />
        <circle cx="18" cy="30" r="2.6" fill="#1C1730" />
        <path d="m13 34 4 4" stroke="#1C1730" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

// A big head about to meet the bug ball.
const HeadGlyph = () => (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
        <circle cx="17" cy="30" r="12" fill="#fff" />
        <circle cx="19.5" cy="28" r="1.8" fill="#1C1730" />
        <circle cx="25" cy="28" r="1.8" fill="#1C1730" />
        <path d="M19 34c1.8 1.5 4.4 1.5 6.2 0" stroke="#1C1730" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="13" r="7" fill="#fff" />
        <path d="M31.5 8v10M35 6v14M38.5 8v10" stroke="#0EA5E9" strokeWidth="1.6" />
        <path d="M40.5 8.5l3.5-3.5M41.5 11.5l4.5-1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24.5 17.5c1.5-2.8 3-4.3 5-5.3" stroke="#fff" strokeWidth="1.8" strokeDasharray="2 2.6" fill="none" strokeLinecap="round" />
    </svg>
);

const GLYPHS = { bowling: BowlingGlyph, race: RaceGlyph, bugs: BugGlyph, riff: RiffGlyph, head: HeadGlyph };

// How each game is played on a keyboard ("key." entries are translated).
const CONTROLS = {
    bowling: ["← →", "key.space"],
    race: ["WASD", "key.space"],
    bugs: ["WASD", "key.mouse"],
    riff: ["A S D F"],
    head: ["← →", "↑", "key.space"],
};

const GameCard = ({ game, best, onPlay }) => {
    const t = useT();
    const Glyph = GLYPHS[game.id];
    return (
        <li>
            <button
                onClick={onPlay}
                className="group flex h-full w-full items-center gap-4 rounded-3xl border-2 border-white/10 bg-white/[0.04] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[var(--c)] hover:bg-white/[0.08] focus-visible:border-[var(--c)] md:p-4"
                style={{ "--c": game.color }}
            >
                <span
                    className="grid h-[72px] w-[72px] flex-none place-items-center rounded-2xl transition group-hover:scale-105"
                    style={{ background: `linear-gradient(140deg, ${game.color}, ${game.color}AA)`, boxShadow: `0 0 26px ${game.color}55` }}
                >
                    <Glyph />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-extrabold leading-tight">{t(`game.${game.id}`)}</span>
                    <span className="block text-sm font-semibold leading-snug text-white/70">{t(`game.tagline.${game.id}`)}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold">
                        {!isTouch &&
                            CONTROLS[game.id].map((k) => (
                                <span key={k} className="rounded-md border border-white/20 px-1.5 py-0.5 text-white/80">
                                    {k.startsWith("key.") ? t(k) : k}
                                </span>
                            ))}
                        <span className="rounded-md px-1.5 py-0.5" style={{ background: `${game.color}2E`, color: game.color }}>
                            {best === undefined ? t("game.noBest") : `${t("game.best")}: ${formatScore(game.id, best)}`}
                        </span>
                    </span>
                </span>
                {/* Two to a row the cards are narrow, so the label steps aside for the text. */}
                <span className="btn hidden flex-none px-4 py-2.5 text-base sm:inline-flex md:px-3.5" style={{ "--c": game.color }}>
                    <PlayIcon size={14} /> <span className="md:sr-only">{t("game.play")}</span>
                </span>
            </button>
        </li>
    );
};

export const ArcadeMenu = () => {
    const closePanel = useStore((s) => s.closePanel);
    const travelTo = useStore((s) => s.travelTo);
    const play = useArcade((s) => s.play);
    const leave = useArcade((s) => s.leaveGameMode);
    const best = useArcade((s) => s.best);
    const onArcade = useArcade((s) => s.area === "arcade");
    const t = useT();
    return (
        <>
            <motion.div
                className="fixed inset-0 z-40 bg-[#0B0A14]/70 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={t("arcade.menuTitle")}
                className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(94vw,920px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border-2 border-white/10 bg-[#14111F] p-5 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] md:p-8"
                style={{
                    backgroundImage:
                        "radial-gradient(ellipse at 15% 0%, rgba(236,72,153,0.22), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(34,211,238,0.16), transparent 50%)",
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
                <button
                    onClick={closePanel}
                    aria-label={t("common.close")}
                    className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border-2 border-white/15 bg-white/5 text-white transition hover:bg-white/10"
                >
                    <CloseIcon />
                </button>
                <p className="eyebrow text-[#F472B6]">{t("mode.games")}</p>
                <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">{t("arcade.menuTitle")}</h2>
                <p className="mt-1 max-w-xl text-sm font-semibold text-white/70">{t("arcade.menuLead")}</p>
                {/* Cards share one height, however their text wraps. */}
                <ul className="mt-5 grid gap-3 md:auto-rows-fr md:grid-cols-2">
                    {games.map((g) => (
                        <GameCard key={g.id} game={g} best={best[g.id]} onPlay={() => play(g.id)} />
                    ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                    {onArcade ? (
                        <button className="btn btn-ghost py-2.5 text-base" onClick={leave}>
                            {t("arcade.back")}
                        </button>
                    ) : (
                        <button className="btn btn-ghost py-2.5 text-base" onClick={() => travelTo("arcade")}>
                            {t("arcade.visit")}
                        </button>
                    )}
                </div>
            </motion.div>
        </>
    );
};
