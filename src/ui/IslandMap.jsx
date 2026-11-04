import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ISLAND_RADIUS, PLAZA_RADIUS, landmarks, paths } from "../data/world";
import {
    ARCADE,
    ARCADE_RADIUS,
    BOARD,
    BRIDGE_END,
    BRIDGE_START,
    BUG_PORTAL,
    HEAD_CORNER,
    HEAD_CORNER_ROT,
    RIFF_STAGE,
    LANE,
    arcadePath,
    bridgeDir,
    bridgePoint,
    games,
} from "../data/arcade";
import { formatScore } from "../game/arcade/format";
import { useArcade } from "../game/arcade/state";
import { playerState } from "../game/input";
import { useStore } from "../store";
import { landmarkLabel, useLang, useT } from "../i18n";
import { CloseIcon, GamepadIcon } from "./icons";

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

// The player's arrow, moved every frame without re-rendering React.
const PlayerArrow = ({ scale = 1 }) => {
    const arrow = useRef();
    useEffect(() => {
        let frame;
        const tick = () => {
            if (arrow.current) {
                const deg = (Math.atan2(Math.sin(playerState.rotY), -Math.cos(playerState.rotY)) * 180) / Math.PI;
                arrow.current.setAttribute(
                    "transform",
                    `translate(${playerState.x.toFixed(2)} ${playerState.z.toFixed(2)}) rotate(${deg.toFixed(1)}) scale(${scale})`
                );
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(frame);
    }, [scale]);
    return (
        <g ref={arrow}>
            <path d="M0,-2.6 L2,2 L0,1 L-2,2 Z" fill="#2A2340" stroke="#fff" strokeWidth="0.7" strokeLinejoin="round" />
        </g>
    );
};

const MapLabel = ({ x, y, size = 2.3, children }) => (
    <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size}
        fontWeight="800"
        fill="#2A2340"
        stroke="#FFFBF4"
        strokeWidth={size * 0.3}
        paintOrder="stroke"
        fontFamily="Baloo 2, sans-serif"
    >
        {children}
    </text>
);

const Marker = ({ x, z, r, color, onSelect, children }) => (
    <g
        transform={`translate(${x} ${z})`}
        onClick={onSelect}
        style={{ cursor: onSelect ? "pointer" : "default" }}
        className={onSelect ? "transition-transform hover:scale-110" : undefined}
    >
        <circle r={r} fill={color} stroke="#fff" strokeWidth={r * 0.26} />
        {children}
    </g>
);

const Bridge = ({ width }) => {
    const [x1, z1] = bridgePoint(BRIDGE_START);
    const [x2, z2] = bridgePoint(BRIDGE_END);
    return <line x1={x1} y1={z1} x2={x2} y2={z2} stroke="#B98454" strokeWidth={width} />;
};

// Top-down SVG of the main island; x maps to x and world z maps to y (north is up).
const MainMap = ({ detailed, onSelect }) => {
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    const shape = useMemo(() => outline(ISLAND_RADIUS), []);
    const labels = useMemo(() => (detailed ? placeLabels(lang) : {}), [detailed, lang]);

    return (
        <svg viewBox="-32 -32 64 64" className="block h-full w-full" role="img" aria-label={t("map.aria")}>
            <Bridge width={2.2} />
            <path d={shape} fill="#B7834F" transform="translate(0 1.6)" />
            <path d={shape} fill="#9CCB6B" stroke="#76AD50" strokeWidth="0.8" />
            {[...paths, arcadePath].map((p, i) => (
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
            <PlayerArrow />
        </svg>
    );
};

// The arcade island, drawn in its own space and turned into place.
const ARCADE_VIEW = 36;
const ARCADE_SCALE = ARCADE_VIEW / 64;
const ARCADE_TURN = (-ARCADE.rotY * 180) / Math.PI;
// Where each game's label goes, relative to its marker.
const GAME_LABEL_DY = { bowling: 2.7, race: -2.7, bugs: 2.7, riff: -2.7, head: -3.3 };
const [PLAZA_MARK_X, PLAZA_MARK_Z] = bridgePoint(Math.hypot(ARCADE.x, ARCADE.z) - ARCADE_RADIUS - 1.8);

const ArcadeMap = ({ detailed, onSelect }) => {
    const t = useT();
    const shape = useMemo(() => outline(ARCADE_RADIUS), []);
    const half = ARCADE_VIEW / 2;
    const place = `translate(${ARCADE.x} ${ARCADE.z}) rotate(${ARCADE_TURN})`;
    const s = ARCADE_SCALE;
    return (
        <svg
            viewBox={`${ARCADE.x - half} ${ARCADE.z - half} ${ARCADE_VIEW} ${ARCADE_VIEW}`}
            className="block h-full w-full"
            role="img"
            aria-label={t("map.arcadeAria")}
        >
            <Bridge width={2.2 * s * 1.4} />
            <path d={shape} fill="#B7834F" transform={`translate(${ARCADE.x} ${ARCADE.z + 0.9}) rotate(${ARCADE_TURN})`} />
            <g transform={place}>
                <path d={shape} fill="#9CCB6B" stroke="#76AD50" strokeWidth={0.8 * s} />
                <line x1={0} y1={ARCADE_RADIUS} x2={BOARD.x} y2={BOARD.z} stroke="#E4CFA6" strokeWidth={1.5} strokeLinecap="round" />
                <rect
                    x={LANE.x - LANE.halfWidth - LANE.gutter - 0.2}
                    y={LANE.foulZ - LANE.length}
                    width={(LANE.halfWidth + LANE.gutter + 0.2) * 2}
                    height={LANE.length}
                    rx={0.3}
                    fill="#E7C38F"
                    stroke="#2A2340"
                    strokeWidth={0.3}
                />
                <rect x={BUG_PORTAL.x - 2.2} y={BUG_PORTAL.z - 0.4} width={4.4} height={0.8} rx={0.4} fill="#22C55E" />
                <rect x={RIFF_STAGE.x - 1.9} y={RIFF_STAGE.z - 0.9} width={3.8} height={1.8} rx={0.3} fill="#2A2340" />
                <rect
                    x={-1.3}
                    y={-0.9}
                    width={2.6}
                    height={1}
                    rx={0.2}
                    fill="#0EA5E9"
                    transform={`translate(${HEAD_CORNER.x} ${HEAD_CORNER.z}) rotate(${(-HEAD_CORNER_ROT * 180) / Math.PI})`}
                />
                <rect x={BOARD.x - 1.7} y={BOARD.z - 0.3} width={3.4} height={0.6} rx={0.2} fill="#2A2340" />
            </g>
            {games.map((g) => (
                <Marker key={g.id} x={g.x} z={g.z} r={1.5} color={g.color} onSelect={onSelect ? () => onSelect(g.id) : undefined} />
            ))}
            <Marker x={PLAZA_MARK_X} z={PLAZA_MARK_Z} r={1.4} color="#F07A4A" onSelect={onSelect ? () => onSelect("plaza") : undefined}>
                <path d="M0.55,-0.7 L-0.35,0 L0.55,0.7" transform={`rotate(${(Math.atan2(-bridgeDir.z, -bridgeDir.x) * 180) / Math.PI + 180})`} fill="none" stroke="#fff" strokeWidth="0.35" strokeLinecap="round" strokeLinejoin="round" />
            </Marker>
            {detailed &&
                games.map((g) => (
                    <MapLabel key={g.id} x={g.x} y={g.z + GAME_LABEL_DY[g.id]} size={1.3}>
                        {t(`game.${g.id}`)}
                    </MapLabel>
                ))}
            {detailed && (
                <MapLabel x={PLAZA_MARK_X} y={PLAZA_MARK_Z - 2.5} size={1.3}>
                    {t("map.island")}
                </MapLabel>
            )}
            <PlayerArrow scale={ARCADE_SCALE} />
        </svg>
    );
};

// Shows whichever island the player is on, unless a view is asked for.
export const IslandMap = ({ detailed = false, onSelect, view }) => {
    const area = useArcade((s) => s.area);
    return (view ?? area) === "arcade" ? (
        <ArcadeMap detailed={detailed} onSelect={onSelect} />
    ) : (
        <MainMap detailed={detailed} onSelect={onSelect} />
    );
};

const PlaceButton = ({ color, label, note, onClick }) => (
    <li>
        <button
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-white/70 px-3 py-2 text-left font-bold transition hover:-translate-y-0.5 hover:border-current active:translate-y-0.5"
            style={{ color }}
        >
            <span className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: color }} />
            <span className="flex-1 text-ink">{label}</span>
            <span className="text-xs text-ink-soft">{note}</span>
        </button>
    </li>
);

// Game mode, offered at the top of the island's places.
const GameModeCard = () => {
    const openMenu = useArcade((s) => s.openMenu);
    const t = useT();
    return (
        <button
            onClick={openMenu}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white shadow-[0_4px_0_#831843] transition hover:-translate-y-0.5 active:translate-y-0.5"
            style={{ background: "linear-gradient(120deg, #EC4899, #8B5CF6)" }}
        >
            <GamepadIcon size={26} />
            <span className="flex-1">
                <span className="block font-display text-lg font-extrabold leading-tight">{t("mode.games")}</span>
                <span className="block text-xs font-bold text-white/85">{t("arcade.menuLead")}</span>
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-extrabold">{t("map.games")}</span>
        </button>
    );
};

const IslandPlaces = ({ onSelect }) => {
    const discovered = useStore((s) => s.discovered);
    const lang = useLang();
    const t = useT();
    return (
        <>
            {landmarks.map((l) => {
                const found = l.type !== "project" || discovered.includes(l.id);
                return (
                    <PlaceButton
                        key={l.id}
                        color={l.color}
                        label={landmarkLabel(l, lang)}
                        note={found ? (l.type === "about" ? t("map.home") : t("map.discovered")) : t("map.notVisited")}
                        onClick={() => onSelect(l.id)}
                    />
                );
            })}
        </>
    );
};

const ArcadePlaces = ({ onSelect }) => {
    const best = useArcade((s) => s.best);
    const t = useT();
    return (
        <>
            {games.map((g) => (
                <PlaceButton
                    key={g.id}
                    color={g.color}
                    label={t(`game.${g.id}`)}
                    note={best[g.id] === undefined ? t("game.noBest") : `${t("game.best")}: ${formatScore(g.id, best[g.id])}`}
                    onClick={() => onSelect(g.id)}
                />
            ))}
            <PlaceButton color="#F07A4A" label={t("map.backToPlaza")} note={t("map.island")} onClick={() => onSelect("plaza")} />
        </>
    );
};

export const MapOverlay = () => {
    const closePanel = useStore((s) => s.closePanel);
    const travelTo = useStore((s) => s.travelTo);
    const area = useArcade((s) => s.area);
    const [view, setView] = useState(area);
    const t = useT();
    const tab = (id, label) => (
        <button
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex-1 rounded-xl px-3 py-1.5 font-display text-sm font-bold transition ${view === id ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"}`}
        >
            {label}
        </button>
    );
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
                <div className="mx-auto w-full max-w-[420px] flex-none md:w-[420px]">
                    <div role="tablist" className="mb-2 mr-14 flex gap-1 rounded-2xl border-2 border-line bg-white/70 p-1 md:mr-0">
                        {tab("main", t("map.island"))}
                        {tab("arcade", t("arcade.title"))}
                    </div>
                    <div className="aspect-square w-full rounded-3xl bg-[#BFE3F5] p-2">
                        <IslandMap detailed view={view} onSelect={travelTo} />
                    </div>
                </div>
                <div className="flex-1">
                    <p className="eyebrow text-ink-soft/70">{t("map.fast")}</p>
                    <h2 className="font-display text-3xl font-extrabold leading-tight">
                        {view === "arcade" ? t("arcade.title") : t("map.title")}
                    </h2>
                    <p className="mb-4 text-sm font-semibold text-ink-soft">{view === "arcade" ? t("arcade.intro") : t("map.pick")}</p>
                    {view === "main" && <GameModeCard />}
                    <ul className="grid gap-2">
                        {view === "arcade" ? <ArcadePlaces onSelect={travelTo} /> : <IslandPlaces onSelect={travelTo} />}
                    </ul>
                </div>
            </motion.div>
        </>
    );
};
