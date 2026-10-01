import { projects } from "../data/projects";
import { useStore } from "../store";
import { usePersonal, useT } from "../i18n";
import { track } from "../analytics";
import { Drawer, Section } from "./Drawer";
import { Avatar, DownloadIcon, GithubIcon, LinkedinIcon, MailIcon, PinIcon } from "./icons";

export const CV_URL = "/cv/Nefise-Nur-Genc-CV.pdf";

export const ContactButtons = ({ className = "" }) => {
    const personal = usePersonal();
    const t = useT();
    return (
        <div className={`flex flex-wrap gap-2.5 ${className}`}>
            <a href={`mailto:${personal.email}`} className="btn" style={{ "--c": "#F07A4A" }}>
                <MailIcon size={18} /> {t("contact.email")}
            </a>
            <a
                href={CV_URL}
                download
                onClick={() => track("CV Downloaded")}
                className="btn"
                style={{ "--c": "#2A2340" }}
            >
                <DownloadIcon size={18} /> {t("contact.cv")}
            </a>
            <a href={personal.linkedin} target="_blank" rel="noopener noreferrer" className="btn" style={{ "--c": "#0A66C2" }}>
                <LinkedinIcon size={17} /> LinkedIn
            </a>
            <a href={personal.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <GithubIcon size={18} /> GitHub
            </a>
        </div>
    );
};

// Vertical timeline used for both work and volunteering.
const Timeline = ({ items, color }) => {
    const t = useT();
    return (
        <ol className="relative space-y-4 border-l-[3px] border-dashed border-line pl-5">
            {items.map((item) => (
                <li key={`${item.company}-${item.title}`} className="relative">
                    <span
                        className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-[3px] border-paper"
                        style={{ background: color, boxShadow: `0 0 0 2px ${color}` }}
                    />
                    <div className="rounded-2xl border-2 border-line bg-white/70 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <h4 className="flex items-center gap-2 font-display text-lg font-bold leading-tight">
                                {item.company}
                                {item.current && (
                                    <span className="rounded-full bg-sun px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-ink">
                                        {t("about.current")}
                                    </span>
                                )}
                            </h4>
                            <span className="text-xs font-bold text-ink-soft">{item.dates}</span>
                        </div>
                        <p className="text-sm font-bold" style={{ color }}>
                            {item.title}
                            <span className="font-semibold text-ink-soft/70"> · {item.location}</span>
                        </p>
                        {item.highlights.length > 0 && (
                            <ul className="mt-2 space-y-1.5 text-sm leading-snug text-ink-soft">
                                {item.highlights.map((h) => (
                                    <li key={h} className="flex gap-2">
                                        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-ink-soft/50" />
                                        {h}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
};

// Shared by the About drawer and the quick view page.
export const AboutContent = () => {
    const personal = usePersonal();
    const t = useT();
    const stats = [
        [String(projects.length), t("about.statProjects")],
        ["2022", t("about.statSince")],
        ["300+", t("about.statStudents")],
    ];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-3 gap-2.5">
                {stats.map(([value, label]) => (
                    <div key={label} className="rounded-2xl border-2 border-line bg-cream/60 px-3 py-3 text-center">
                        <p className="font-display text-2xl font-extrabold leading-none text-coral">{value}</p>
                        <p className="mt-1 text-xs font-bold leading-tight text-ink-soft">{label}</p>
                    </div>
                ))}
            </div>

            <p className="text-[1.02rem] leading-relaxed text-ink-soft">{personal.about}</p>

            <Section eyebrow={t("about.questLog")} title={t("about.experience")}>
                <Timeline items={personal.experience} color="var(--color-coral)" />
            </Section>

            <Section eyebrow={t("about.inventory")} title={t("about.skills")}>
                <div className="space-y-3">
                    {Object.entries(personal.skills).map(([group, items]) => (
                        <div key={group}>
                            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft/70">{group}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {items.map((s) => (
                                    <span key={s} className="chip">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section eyebrow={t("about.sideQuests")} title={t("about.volunteering")}>
                <Timeline items={personal.volunteering} color="#7B4BD1" />
            </Section>

            <Section eyebrow={t("about.trainingGrounds")} title={t("about.training")}>
                <ul className="space-y-2">
                    {personal.training.map((tr) => (
                        <li key={tr.school} className="rounded-2xl border-2 border-line bg-white/70 px-4 py-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <p className="font-display text-base font-bold leading-tight">{tr.school}</p>
                                <span className="text-xs font-bold text-ink-soft">{tr.dates}</span>
                            </div>
                            <p className="text-sm font-semibold text-ink-soft">
                                {tr.name} · {tr.location}
                            </p>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section eyebrow={t("about.achievements")} title={t("about.certificates")}>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                    {personal.certificates.map((c) => (
                        <li key={c.name} className="rounded-xl border-2 border-line bg-white/70 px-3 py-2">
                            <p className="text-sm font-bold leading-snug">{c.name}</p>
                            <p className="text-xs font-semibold text-ink-soft">{c.issuer}</p>
                        </li>
                    ))}
                </ul>
            </Section>

            <div className="grid gap-4 sm:grid-cols-2">
                <Section eyebrow={t("about.origin")} title={t("about.education")}>
                    <div className="rounded-2xl border-2 border-line bg-white/70 p-4">
                        <p className="font-display text-lg font-bold leading-tight">{personal.education.degree}</p>
                        <p className="text-sm font-bold text-ink-soft">{personal.education.university}</p>
                        <p className="text-xs font-semibold text-ink-soft/80">
                            {personal.education.dates} · {personal.education.location}
                        </p>
                    </div>
                </Section>
                <Section eyebrow={t("about.dialogue")} title={t("about.languages")}>
                    <ul className="space-y-1.5">
                        {personal.languages.map((l) => (
                            <li
                                key={l.name}
                                className="flex items-center justify-between rounded-xl border-2 border-line bg-white/70 px-3 py-2"
                            >
                                <span className="font-bold">{l.name}</span>
                                <span className="text-xs font-bold text-ink-soft">{l.level}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>
        </div>
    );
};

export const AboutPanel = () => {
    const closePanel = useStore((s) => s.closePanel);
    const personal = usePersonal();
    const t = useT();
    return (
        <Drawer side="left" label={t("about.label")} onClose={closePanel}>
            <header
                className="px-6 pb-6 pt-7 text-white md:px-8"
                style={{ background: "linear-gradient(135deg, #F07A4A, #D9467A 60%, #7B4BD1)" }}
            >
                <div className="flex items-center gap-4">
                    <div className="rounded-full border-4 border-white/70 shadow-lg">
                        <Avatar size={72} />
                    </div>
                    <div>
                        <p className="eyebrow text-white/75">{t("about.profile")}</p>
                        <h2 className="font-display text-3xl font-extrabold leading-none">{personal.name}</h2>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white/90">
                            {personal.title} · <PinIcon size={14} /> {personal.location}
                        </p>
                    </div>
                </div>
            </header>
            <div className="px-6 py-6 md:px-8">
                <AboutContent />
            </div>
            <div className="sticky bottom-0 border-t-2 border-line bg-paper/95 px-6 py-4 backdrop-blur md:px-8">
                <ContactButtons />
            </div>
        </Drawer>
    );
};
