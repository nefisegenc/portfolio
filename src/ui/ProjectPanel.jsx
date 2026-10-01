import { useEffect, useState } from "react";
import { track } from "../analytics";
import { AnimatePresence, motion } from "framer-motion";
import { useProject, useT } from "../i18n";
import { getLandmark } from "../data/world";
import { useStore } from "../store";
import { Drawer, Section } from "./Drawer";
import { CheckIcon, ChevronLeft, ChevronRight, CloseIcon, ExternalIcon, GithubIcon } from "./icons";

const Lightbox = ({ images, index, onChange, onClose }) => {
    const t = useT();
    useEffect(() => {
        const onKey = (e) => {
            if (!["Escape", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
            if (e.key === "ArrowRight") onChange((index + 1) % images.length);
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [images.length, index, onChange, onClose]);

    return (
        <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm md:p-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <img
                src={images[index]}
                alt=""
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
            <button onClick={onClose} aria-label={t("panel.closeImage")} className="icon-btn absolute right-4 top-4">
                <CloseIcon />
            </button>
            {images.length > 1 && (
                <>
                    <button
                        aria-label={t("panel.prev")}
                        className="icon-btn absolute left-3 top-1/2 -translate-y-1/2 md:left-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange((index - 1 + images.length) % images.length);
                        }}
                    >
                        <ChevronLeft />
                    </button>
                    <button
                        aria-label={t("panel.next")}
                        className="icon-btn absolute right-3 top-1/2 -translate-y-1/2 md:right-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange((index + 1) % images.length);
                        }}
                    >
                        <ChevronRight />
                    </button>
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
                        {index + 1} / {images.length}
                    </p>
                </>
            )}
        </motion.div>
    );
};

const Gallery = ({ images, color }) => {
    const t = useT();
    const [index, setIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const go = (step) => setIndex((i) => (i + step + images.length) % images.length);
    return (
        <div>
            <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border-2 border-line bg-cream">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                        key={images[index]}
                        src={images[index]}
                        alt=""
                        className="h-full w-full cursor-zoom-in object-contain"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setZoomed(true)}
                    />
                </AnimatePresence>
                {images.length > 1 && (
                    <>
                        <button aria-label={t("panel.prev")} onClick={() => go(-1)} className="icon-btn absolute left-2 top-1/2 h-9 w-9 -translate-y-1/2">
                            <ChevronLeft size={18} />
                        </button>
                        <button aria-label={t("panel.next")} onClick={() => go(1)} className="icon-btn absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2">
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}
            </div>
            {images.length > 1 && (
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                        <button
                            key={src}
                            onClick={() => setIndex(i)}
                            aria-label={t("panel.showImage", { n: i + 1 })}
                            className="h-14 w-20 flex-none overflow-hidden rounded-xl border-[3px] bg-cream transition"
                            style={{ borderColor: i === index ? color : "transparent", opacity: i === index ? 1 : 0.65 }}
                        >
                            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}
            <AnimatePresence>
                {zoomed && <Lightbox images={images} index={index} onChange={setIndex} onClose={() => setZoomed(false)} />}
            </AnimatePresence>
        </div>
    );
};

const Tabs = ({ items, active, onChange, color }) => (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((item, i) => (
            <button
                key={item}
                onClick={() => onChange(i)}
                className="flex-none rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold transition"
                style={
                    i === active
                        ? { background: color, borderColor: color, color: "#fff" }
                        : { borderColor: "var(--color-line)", color: "var(--color-ink)" }
                }
            >
                {item}
            </button>
        ))}
    </div>
);

const DesignGallery = ({ projects, color }) => {
    const [client, setClient] = useState(0);
    const [category, setCategory] = useState(0);
    const [zoomed, setZoomed] = useState(null);
    const categories = projects[client].categories;
    const images = categories[category].images;
    return (
        <div className="space-y-3">
            <Tabs
                items={projects.map((p) => p.name)}
                active={client}
                color={color}
                onChange={(i) => {
                    setClient(i);
                    setCategory(0);
                }}
            />
            <Tabs items={categories.map((c) => c.name)} active={category} onChange={setCategory} color="#2A2340" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {images.map((src, i) => (
                    <button
                        key={src}
                        onClick={() => setZoomed(i)}
                        className="group aspect-square overflow-hidden rounded-xl border-2 border-line bg-cream"
                        aria-label={`${categories[category].name} ${i + 1}`}
                    >
                        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </button>
                ))}
            </div>
            <AnimatePresence>
                {zoomed !== null && (
                    <Lightbox images={images} index={zoomed} onChange={setZoomed} onClose={() => setZoomed(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export const ProjectPanel = ({ id }) => {
    const closePanel = useStore((s) => s.closePanel);
    const project = useProject(id);
    const t = useT();
    useEffect(() => track("Project Opened", { project: id }), [id]);
    const color = getLandmark(id)?.color ?? "#6D4AFF";
    if (!project) return null;
    const images = [...new Set([project.cover, ...project.gallery])];

    return (
        <Drawer side="right" label={project.title} onClose={closePanel}>
            <header
                className="relative px-6 pb-6 pt-7 text-white md:px-8"
                style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #2A2340))` }}
            >
                <div className="flex flex-wrap items-center gap-2 pr-12">
                    <p className="eyebrow text-white/75">
                        {t("panel.project")} · {project.year}
                    </p>
                    {project.status && (
                        <span className="eyebrow rounded-full bg-white/20 px-2.5 py-0.5 text-[0.7rem] text-white">{project.status}</span>
                    )}
                </div>
                <h2 className="mt-1 pr-12 font-display text-3xl font-extrabold leading-tight md:text-[2.1rem]">{project.title}</h2>
                <p className="mt-1 text-[0.95rem] font-semibold text-white/90">{project.tagline}</p>
            </header>

            <div className="space-y-7 px-6 py-6 md:px-8">
                {project.designProjects ? (
                    <DesignGallery projects={project.designProjects} color={color} />
                ) : (
                    <Gallery images={images} color={color} />
                )}

                <p className="text-[1.02rem] leading-relaxed text-ink-soft">{project.description}</p>

                <div className="grid grid-cols-2 gap-3">
                    {[
                        [t("panel.role"), project.role],
                        [t("panel.when"), project.year],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border-2 border-line bg-cream/60 px-4 py-3">
                            <p className="eyebrow text-ink-soft/70">{label}</p>
                            <p className="font-display text-lg font-bold leading-tight">{value}</p>
                        </div>
                    ))}
                </div>

                <Section title={t("panel.highlights")}>
                    <ul className="space-y-2.5">
                        {project.features.map((f) => (
                            <li key={f} className="flex items-start gap-3 font-semibold">
                                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-white" style={{ background: color }}>
                                    <CheckIcon size={14} strokeWidth={3.2} />
                                </span>
                                {f}
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section title={t("panel.builtWith")}>
                    <div className="flex flex-wrap gap-2">
                        {project.tech.map((t) => (
                            <span key={t} className="chip">
                                {t}
                            </span>
                        ))}
                    </div>
                </Section>
            </div>

            {(project.link || project.github) && (
                <div className="sticky bottom-0 flex gap-3 border-t-2 border-line bg-paper/95 px-6 py-4 backdrop-blur md:px-8">
                    {project.link && (
                        <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn flex-1" style={{ "--c": color }}>
                            {t("panel.visit")} <ExternalIcon size={18} />
                        </a>
                    )}
                    {project.github && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1">
                            <GithubIcon size={18} /> GitHub
                        </a>
                    )}
                </div>
            )}
        </Drawer>
    );
};
