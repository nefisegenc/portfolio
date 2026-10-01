// A classic, scrollable version of the portfolio: for recruiters in a hurry,
// low-powered devices and browsers without WebGL.
import { useEffect } from "react";
import { motion } from "framer-motion";
import { getLandmark } from "../data/world";
import { useStore } from "../store";
import { track } from "../analytics";
import { usePersonal, useProjects, useT } from "../i18n";
import { AboutContent, ContactButtons } from "./AboutPanel";
import { LangToggle } from "./LangToggle";
import { Avatar, PinIcon, PlayIcon } from "./icons";

const ProjectCard = ({ project }) => {
    const openPanel = useStore((s) => s.openPanel);
    const color = getLandmark(project.id)?.color;
    return (
        <button
            onClick={() => openPanel({ type: "project", id: project.id })}
            className="card group flex flex-col overflow-hidden text-left transition hover:-translate-y-1"
        >
            <div className="aspect-[16/10] overflow-hidden bg-cream">
                <img src={project.cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">{project.year}</span>
                </div>
                <h3 className="font-display text-xl font-bold leading-tight">{project.title}</h3>
                <p className="text-sm font-semibold text-ink-soft">{project.tagline}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {project.tech.slice(0, 3).map((t) => (
                        <span key={t} className="chip text-xs">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </button>
    );
};

export const QuickView = () => {
    const webgl = useStore((s) => s.webgl);
    const leaveQuickView = useStore((s) => s.leaveQuickView);
    const projects = useProjects();
    const personal = usePersonal();
    const t = useT();
    const newestFirst = [...projects].sort((a, b) => b.date.localeCompare(a.date));
    useEffect(() => track("Quick View Opened"), []);
    return (
        <motion.main
            className="fixed inset-0 z-30 overflow-y-auto bg-[#FFF6EA]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 md:px-8 md:pt-10">
                <nav className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="overflow-hidden rounded-full border-[3px] border-white shadow">
                            <Avatar size={44} />
                        </span>
                        <span className="font-display text-lg font-bold leading-tight">{personal.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LangToggle tone="light" />
                        {webgl && (
                            <button onClick={leaveQuickView} className="btn px-4 py-2.5 text-base" style={{ "--c": "#F07A4A" }}>
                                <PlayIcon size={16} />
                                <span className="sm:hidden">{t("quick.play")}</span>
                                <span className="hidden sm:inline">{t("quick.back")}</span>
                            </button>
                        )}
                    </div>
                </nav>

                {!webgl && (
                    <p className="mt-6 rounded-2xl border-2 border-line bg-cream px-4 py-3 text-sm font-bold text-ink-soft">
                        {t("quick.noWebgl")}
                    </p>
                )}

                <header className="mt-12 max-w-3xl md:mt-16">
                    <p className="eyebrow text-coral">{t("quick.portfolio")}</p>
                    <h1 className="mt-2 font-display text-5xl font-extrabold leading-[0.95] md:text-7xl">
                        {t("quick.hello")}
                        <br />
                        {t("quick.tagline")}
                    </h1>
                    <p className="mt-4 flex items-center gap-2 font-bold text-ink-soft">
                        {personal.title} · <PinIcon size={16} /> {personal.location}
                    </p>
                    <ContactButtons className="mt-6" />
                </header>

                <section className="mt-16">
                    <h2 className="mb-5 font-display text-3xl font-extrabold">{t("quick.projects")}</h2>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {newestFirst.map((p) => (
                            <ProjectCard key={p.id} project={p} />
                        ))}
                    </div>
                </section>

                <section className="mt-16 max-w-3xl">
                    <h2 className="mb-5 font-display text-3xl font-extrabold">{t("quick.about")}</h2>
                    <AboutContent />
                </section>
            </div>
        </motion.main>
    );
};
