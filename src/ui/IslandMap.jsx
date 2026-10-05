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

const MARKER_R = 3.1;
const LABEL_SIZE = 2.3;
const LABEL_H = 2.5;
const MAP_EDGE = 31.6;

let measure;
const labelWidth = (text) => {
    measure ??= document.createElement("canvas").getContext("2d");
    measure.font = "800 100px 'Baloo 2', sans-serif";
    return (measure.measureText(text).width * LABEL_SIZE) / 100 + 0.7; // + outline
};

const box = (cx, cy, w) => ({ x0: cx - w / 2, x1: cx + w / 2, y0: cy - LABEL_H / 2, y1: cy + LABEL_H / 2 });
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const touchesCircle = (b, cx, cy, r) =>
    Math.hypot(Math.max(b.x0, Math.min(cx, b.x1)) - cx, Math.max(b.y0, Math.min(cy, b.y1)) - cy) < r;

// Spots around a marker, most natural first: diagonally outward, beside it,
// above/below (then nudged sideways) and finally beside it on the inner side.
const labelSpots = (l, w) => {
    const r = Math.hypot(l.x, l.z);
    const dx = l.x / r;
    const dz = l.z / r;
    const side = dx >= 0 ? 1 : -1;
    const out = dz < 0 ? -1 : 1;
    const near = MARKER_R + 0.6;
    const vertical = (dir, shift) => box(l.x + side * w * shift, l.z + dir * (MARKER_R + 0.35 + LABEL_H / 2), w);
    return [
        box(l.x + dx * (MARKER_R + 1.3) + (Math.abs(dx) > 0.3 ? (side * w) / 2 : 0), l.z + dz * (MARKER_R + 1.3), w),
        box(l.x + side * (near + w / 2), l.z, w),
        vertical(out, 0),
        vertical(-out, 0),
        vertical(out, 0.25),
        vertical(out, 0.5),
        vertical(-out, 0.25),
        vertical(-out, 0.5),
        box(l.x - side * (near + w / 2), l.z, w),
    ];
};

// Gives every label the first spot that stays on the map without touching the
// plaza, a marker or an earlier label. Positions are relative to the marker.
const placeLabels = (lang) => {
    const placed = [];
    const free = (b) =>
        b.x0 > -MAP_EDGE &&
        b.x1 < MAP_EDGE &&
        b.y0 > -MAP_EDGE &&
        b.y1 < MAP_EDGE &&
        !touchesCircle(b, 0, 0, PLAZA_RADIUS + 0.4) &&
        !landmarks.some((m) => touchesCircle(b, m.x, m.z, MARKER_R + 0.25)) &&
        !placed.some((p) => overlaps(b, p));
    return Object.fromEntries(
        landmarks.map((l) => {
            const text = l.shortLabel ?? landmarkLabel(l, lang);
            const spots = labelSpots(l, labelWidth(text));
            const spot = spots.find(free) ?? spots[0];
            placed.push(spot);
            return [l.id, { text, x: (spot.x0 + spot.x1) / 2 - l.x, y: (spot.y0 + spot.y1) / 2 - l.z }];
        })
    );
};

// Top-down SVG of the island; x maps to x and world z maps to y (north is up).
export const IslandMap = ({ detailed = false, onSelect }) => {
    const arrow = useRef();
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    const shape = useMemo(() => outline(ISLAND_RADIUS), []);
    const labels = useMemo(() => (detailed ? placeLabels(lang) : {}), [detailed, lang]);

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
                                x={labels[l.id].x}
                                y={labels[l.id].y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="2.3"
                                fontWeight="800"
                                fill="#2A2340"
                                stroke="#FFFBF4"
                                strokeWidth="0.7"
                                paintOrder="stroke"
                                fontFamily="Baloo 2, sans-serif"
                            >
                                {labels[l.id].text}
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
