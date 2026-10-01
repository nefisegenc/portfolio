// Builds the public CV (public/cv/Nefise-Nur-Genc-CV.pdf) from the same data
// as the site, so the two never drift apart. The public version leaves out the
// phone number, date of birth and references.
//
// Usage: npm run cv   (needs Google Chrome; set CHROME_PATH if it lives elsewhere)
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { personalInfo as me, projects } from "../src/data/projects.js";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/cv/Nefise-Nur-Genc-CV.pdf", import.meta.url).pathname;
const PORTFOLIO = "https://www.nefise.works";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const entry = ({ title, dates, subtitle, location, highlights = [] }) => `
    <div class="entry">
        <div class="row"><strong>${esc(title)}</strong><span>${esc(dates)}</span></div>
        <div class="row sub"><em>${esc(subtitle)}</em><em>${esc(location)}</em></div>
        ${highlights.length ? `<ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
    </div>`;

const projectLines = [
    `<li><a href="${PORTFOLIO}">nefise.works</a> <b>(React, Vite, Three.js / React Three Fiber, Tailwind CSS, Zustand, Framer Motion)</b></li>`,
    ...projects
        .filter((p) => p.id !== "arts")
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((p) => {
            const url = p.link || p.github;
            const name = p.link ? host(p.link) : p.github ? `${p.title} (${host(p.github)})` : `${p.title}${p.status ? ` (${p.status.toLowerCase()})` : ""}`;
            const label = url ? `<a href="${url}">${esc(name)}</a>` : esc(name);
            return `<li>${label} <b>(${esc(p.tech.join(", "))})</b></li>`;
        }),
];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: "Source Sans 3", sans-serif; font-size: 9.7pt; line-height: 1.32; color: #1d1d1f; margin: 0; }
    a { color: inherit; }
    h1 { font-size: 24pt; margin: 0; line-height: 1.1; }
    .role { font-size: 12pt; font-weight: 600; color: #444; margin: 2px 0 4px; }
    .contact { font-size: 9.5pt; }
    h2 { font-size: 10.5pt; font-weight: 400; font-variant: small-caps; letter-spacing: .04em; border-bottom: 1px solid #222;
         margin: 11px 0 5px; padding-bottom: 2px; text-transform: lowercase; }
    h2::first-letter { text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; gap: 12px; }
    .sub { color: #333; }
    .entry { margin: 0 0 6px 10px; break-inside: avoid; }
    ul { margin: 3px 0 0; padding-left: 16px; }
    li { margin: 1px 0; }
    table { border-collapse: collapse; margin-left: 10px; }
    td { padding: 1.5px 6px 1.5px 0; vertical-align: top; }
    td:first-child { font-weight: 700; white-space: nowrap; }
    .plain { margin-left: 10px; }
    .certs { columns: 2; column-gap: 28px; }
    .certs li { break-inside: avoid; }
</style></head>
<body>
    <h1>${esc(me.name)}</h1>
    <div class="role">${esc(me.title)}</div>
    <div class="contact">
        <a href="${PORTFOLIO}">Portfolio</a> | <a href="${me.linkedin}">LinkedIn</a> | <a href="${me.github}">GitHub</a> |
        Email: <a href="mailto:${me.email}">${esc(me.email)}</a> | Location: ${esc(me.location)}
    </div>

    <h2>About me</h2>
    <p class="plain" style="margin-top:0">${esc(me.about)}</p>

    <h2>Skills</h2>
    <table>${Object.entries(me.skills)
        .map(([group, items]) => `<tr><td>${esc(group)}</td><td>: ${esc(items.join(", "))}</td></tr>`)
        .join("")}</table>

    <h2>Languages</h2>
    <p class="plain" style="margin:0">${me.languages.map((l) => `<b>${esc(l.name)}</b> (${esc(l.level)})`).join(", ")}</p>

    <h2>Education</h2>
    ${entry({ title: me.education.university, dates: me.education.dates, subtitle: me.education.degree, location: me.education.location })}

    <h2>Experience</h2>
    ${me.experience.map((e) => entry({ title: e.title, dates: e.dates, subtitle: e.company, location: e.location, highlights: e.highlights })).join("")}

    <h2>Projects</h2>
    <ul class="plain">${projectLines.join("")}</ul>

    <h2>Volunteer experience</h2>
    ${me.volunteering.map((v) => entry({ title: v.title, dates: v.dates, subtitle: v.company, location: v.location, highlights: v.highlights })).join("")}

    <h2>Trainings</h2>
    ${me.training.map((t) => entry({ title: t.school, dates: t.dates, subtitle: t.name, location: t.location })).join("")}

    <h2>Certifications</h2>
    <ul class="plain certs">${me.certificates.map((c) => `<li>${esc(c.name)}, <b>${esc(c.issuer)}</b></li>`).join("")}</ul>
</body></html>`;

// --- Print with headless Chrome over the DevTools protocol -------------------

const dir = mkdtempSync(join(tmpdir(), "cv-"));
const file = join(dir, "cv.html");
writeFileSync(file, html);

const port = 9450 + Math.floor(Math.random() * 100);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}/profile`, "--no-first-run", "about:blank"]);
chrome.stderr.on("data", () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
    let targets = [];
    for (let i = 0; i < 50 && !targets.some((t) => t.type === "page"); i++) {
        await sleep(200);
        targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => []);
    }
    const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        pending.get(msg.id)?.(msg);
        pending.delete(msg.id);
    };
    const send = (method, params = {}) =>
        new Promise((resolve) => {
            pending.set(++id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

    await send("Page.enable");
    await send("Page.navigate", { url: `file://${file}` });
    await sleep(1500);
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
    const { result } = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
    mkdirSync(new URL("../public/cv/", import.meta.url).pathname, { recursive: true });
    writeFileSync(OUT, Buffer.from(result.data, "base64"));
    console.log("CV written to", OUT);
    ws.close();
} finally {
    chrome.kill();
}
