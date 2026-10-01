import { motion } from "framer-motion";
import { useStore } from "../store";
import { isTouch } from "../game/utils";
import { usePersonal, useT } from "../i18n";
import { GridIcon, PlayIcon } from "./icons";
import { LangToggle } from "./LangToggle";

export const TitleScreen = () => {
    const progress = useStore((s) => s.loadProgress);
    const ready = useStore((s) => s.sceneReady);
    const start = useStore((s) => s.start);
    const openQuickView = useStore((s) => s.openQuickView);
    const t = useT();
    const personal = usePersonal();
    const shown = ready ? 100 : Math.min(progress, 97);

    const hints = isTouch
        ? [
              ["Joystick", t("hint.move")],
              [t("key.drag"), t("hint.lookAround")],
              [t("key.tap"), t("hint.enterBuildings")],
          ]
        : [
              ["WASD", t("hint.move")],
              ["Shift", t("hint.run")],
              [t("key.drag"), t("hint.look")],
              ["E", t("hint.enter")],
          ];

    return (
        <motion.div
            className="fixed inset-0 z-30 flex items-end md:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-transparent md:bg-gradient-to-r md:from-ink/75 md:via-ink/30" />
            <LangToggle className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] md:right-8 md:top-8" />
            <motion.div
                className="relative w-full max-w-3xl px-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-16 md:pb-0"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 22 }}
            >
                <span className="eyebrow inline-block rounded-full bg-sun px-3 py-1 text-ink shadow-[0_3px_0_#c9951a]">
                    {t("title.badge")}
                </span>
                <h1 className="game-title mt-4 text-[3.2rem] md:text-[5.2rem]">{personal.name}</h1>
                <p className="mt-2 font-display text-xl font-bold text-white/95 md:text-2xl">
                    {personal.title} · {personal.location.split(",")[0]}
                </p>
                <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-white/85 md:text-lg">
                    {t("title.lead")}
                </p>

                <div className="mt-7 min-h-[64px]">
                    {ready ? (
                        <motion.div
                            className="flex flex-wrap items-center gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <button autoFocus onClick={start} className="btn px-7 py-4 text-xl" style={{ "--c": "#F07A4A" }}>
                                <PlayIcon size={20} /> {t("title.start")}
                            </button>
                            <button onClick={openQuickView} className="btn btn-ghost py-4">
                                <GridIcon size={18} /> {t("title.quick")}
                            </button>
                        </motion.div>
                    ) : (
                        <div className="max-w-sm">
                            <div className="h-5 overflow-hidden rounded-full border-[3px] border-white/80 bg-ink/30">
                                <div
                                    className="h-full rounded-full bg-sun transition-[width] duration-300"
                                    style={{ width: `${shown}%` }}
                                />
                            </div>
                            <p className="mt-2 font-display text-sm font-bold text-white/80">
                                {t("title.loading", { p: Math.round(shown) })}
                            </p>
                        </div>
                    )}
                </div>

                <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/80">
                    {hints.map(([key, label]) => (
                        <li key={key} className="flex items-center gap-2">
                            <span className="keycap">{key}</span> {label}
                        </li>
                    ))}
                </ul>
            </motion.div>
        </motion.div>
    );
};
