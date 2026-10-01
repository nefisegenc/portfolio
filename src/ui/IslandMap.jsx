import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ISLAND_RADIUS, PLAZA_RADIUS, landmarks, paths } from "../data/world";
import { playerState } from "../game/input";
import { useStore } from "../store";
import { landmarkLabel, useLang, useT } from "../i18n";
import { CloseIcon } from "./icons";

const outline = (radius) => {
    const points = [];
    for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const f = 1 + 0.022 * Math.sin(3 * a + 0.5) + 0.016 * Math.sin(7 * a + 2) + 0.008 * Math.sin(13 * a + 1);
        points.push(`${(Math.cos(a) * radius * f).toFixed(2)},${(Math.sin(a) * radius * f).toFixed(2)}`);
    }
    return `M${points.join("L")}Z`;
};

// Map labels sit outside their marker, away from the plaza, so neighbours
// never overlap. East/west labels go underneath to stay on the map.
const labelPlacement = (l) => {
    const r = Math.hypot(l.x, l.z);
    const dx = l.x / r;
    const dz = l.z / r;
    if (Math.abs(dx) > 0.9) return { x: 0, y: 5.4, textAnchor: "middle" };
    return {
        x: dx * 4.4,
        y: dz * 4.4,
        textAnchor: dx > 0.3 ? "start" : dx < -0.3 ? "end" : "middle",
    };
};

// Top-down SVG of the island; x maps to x and world z maps to y (north is up).
export const IslandMap = ({ detailed = false, onSelect }) => {
    const arrow = useRef();
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    const shape = useMemo(() => outline(ISLAND_RADIUS), []);

    useEffect(() => {
        let frame;
        const tick = () => {
            if (arrow.current) {
                const deg = (Math.atan2(Math.sin(playerState.rotY), -Math.cos(playerState.rotY)) * 180) / Math.PI;
                arrow.current.setAttribute(
                    "transform",
                    `translate(${playerState.x.toFixed(2)} ${playerState.z.toFixed(2)}) rotate(${deg.toFixed(1)})`
                );
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <svg viewBox="-32 -32 64 64" className="block h-full w-full" role="img" aria-label={t("map.aria")}>
            <path d={shape} fill="#B7834F" transform="translate(0 1.6)" />
            <path d={shape} fill="#9CCB6B" stroke="#76AD50" strokeWidth="0.8" />
            {paths.map((p, i) => (
                <line key={i} x1={p.from.x} y1={p.from.z} x2={p.to.x} y2={p.to.z} stroke="#E4CFA6" strokeWidth="1.8" strokeLinecap="round" />
            ))}
            <circle r={PLAZA_RADIUS} fill="#EFE5D3" />
            <circle r="2" fill="#7CC8F0" />
            {landmarks.map((l) => {
                const found = l.type !== "project" || discovered.includes(l.id);
                return (
                    <g
                        key={l.id}
                        transform={`translate(${l.x} ${l.z})`}
                        onClick={onSelect ? () => onSelect(l.id) : undefined}
                        style={{ cursor: onSelect ? "pointer" : "default" }}
                        className={onSelect ? "transition-transform hover:scale-110" : undefined}
                    >
                        <circle r={detailed ? 3.1 : 2.7} fill={l.color} stroke="#fff" strokeWidth="0.8" />
                        <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={detailed ? 3.4 : 3}
                            fontWeight="800"
                            fill="#fff"
                            fontFamily="Baloo 2, sans-serif"
                        >
                            {found ? (l.type === "about" ? "♥" : "✓") : "?"}
                        </text>
                        {detailed && (
                            <text
                                {...labelPlacement(l)}
                                dominantBaseline="middle"
                                fontSize="2.3"
                                fontWeight="800"
                                fill="#2A2340"
                                stroke="#FFFBF4"
                                strokeWidth="0.7"
                                paintOrder="stroke"
                                fontFamily="Baloo 2, sans-serif"
                            >
                                {l.shortLabel ?? landmarkLabel(l, lang)}
                            </text>
                        )}
                    </g>
                );
            })}
            <g ref={arrow}>
                <path d="M0,-2.6 L2,2 L0,1 L-2,2 Z" fill="#2A2340" stroke="#fff" strokeWidth="0.7" strokeLinejoin="round" />
            </g>
        </svg>
    );
};

export const MapOverlay = () => {
    const closePanel = useStore((s) => s.closePanel);
    const travelTo = useStore((s) => s.travelTo);
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    return (
        <>
            <motion.div
                className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={t("map.title")}
                className="card fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[min(94vw,880px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto p-5 md:flex-row md:p-7"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
                <button onClick={closePanel} aria-label={t("map.close")} className="icon-btn absolute right-4 top-4 z-10">
                    <CloseIcon />
                </button>
                <div className="mx-auto aspect-square w-full max-w-[420px] flex-none rounded-3xl bg-[#BFE3F5] p-2 md:w-[420px]">
                    <IslandMap detailed onSelect={travelTo} />
                </div>
                <div className="flex-1">
                    <p className="eyebrow text-ink-soft/70">{t("map.fast")}</p>
                    <h2 className="font-display text-3xl font-extrabold leading-tight">{t("map.title")}</h2>
                    <p className="mb-4 text-sm font-semibold text-ink-soft">{t("map.pick")}</p>
                    <ul className="grid gap-2">
                        {landmarks.map((l) => {
                            const found = l.type !== "project" || discovered.includes(l.id);
                            return (
                                <li key={l.id}>
                                    <button
                                        onClick={() => travelTo(l.id)}
                                        className="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-white/70 px-3 py-2 text-left font-bold transition hover:-translate-y-0.5 hover:border-current active:translate-y-0.5"
                                        style={{ color: l.color }}
                                    >
                                        <span className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: l.color }} />
                                        <span className="flex-1 text-ink">{landmarkLabel(l, lang)}</span>
                                        <span className="text-xs text-ink-soft">{found ? (l.type === "about" ? t("map.home") : t("map.discovered")) : t("map.notVisited")}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </motion.div>
        </>
    );
};
