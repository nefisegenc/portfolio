// Language helpers: interface strings plus localized project and profile data.
import { useMemo } from "react";
import { useStore } from "../store";
import { personalInfo, projects } from "../data/projects";
import { personalTr, projectsTr, termsTr } from "./content.tr";
import { strings } from "./strings";

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : text);

export const translate = (lang, key, vars) => fill(strings[lang]?.[key] ?? strings.en[key] ?? key, vars);

export const useLang = () => useStore((s) => s.lang);

export const useT = () => {
    const lang = useLang();
    return useMemo(() => (key, vars) => translate(lang, key, vars), [lang]);
};

const term = (lang, word) => (lang === "tr" && termsTr[word]) || word;

const localizeProject = (project, lang) => {
    if (lang !== "tr") return project;
    return {
        ...project,
        ...projectsTr[project.id],
        tech: project.tech.map((t) => term(lang, t)),
        designProjects: project.designProjects?.map((d) => ({
            ...d,
            name: term(lang, d.name),
            categories: d.categories.map((c) => ({ ...c, name: term(lang, c.name) })),
        })),
    };
};

export const localizedProjects = (lang) => projects.map((p) => localizeProject(p, lang));

export const useProjects = () => {
    const lang = useLang();
    return useMemo(() => localizedProjects(lang), [lang]);
};

export const useProject = (id) => useProjects().find((p) => p.id === id);

// "Current" is decided on the English dates so it survives translation.
const markCurrent = (items) => items.map((item) => ({ ...item, current: item.dates.endsWith("Present") }));

export const localizedPersonal = (lang) => {
    const base = {
        ...personalInfo,
        experience: markCurrent(personalInfo.experience),
        volunteering: markCurrent(personalInfo.volunteering),
    };
    if (lang !== "tr") return base;
    const tr = personalTr;
    return {
        ...base,
        title: tr.title,
        location: tr.location,
        about: tr.about,
        skills: Object.fromEntries(
            Object.entries(base.skills).map(([group, items]) => [term(lang, group), items.map((i) => term(lang, i))])
        ),
        languages: base.languages.map((l) => ({ name: term(lang, l.name), level: term(lang, l.level) })),
        education: { ...base.education, ...tr.education },
        experience: base.experience.map((e) => ({ ...e, ...tr.experience[e.company] })),
        volunteering: base.volunteering.map((v) => ({ ...v, ...tr.volunteering[v.company] })),
        training: base.training.map((t) => ({ ...t, ...tr.training[t.school] })),
    };
};

export const usePersonal = () => {
    const lang = useLang();
    return useMemo(() => localizedPersonal(lang), [lang]);
};

export const landmarkLabel = (landmark, lang) => (lang === "tr" && landmark.labelTr) || landmark.label;
