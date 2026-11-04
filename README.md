# Nefise's Island

Interactive portfolio of Nefise Nur Genç, front-end developer. Visitors walk around a small floating island where every building is one of my projects.

## Features

- Third-person character with walking, running and jumping
- A landmark for each project, each opening a project panel
- Discovery tracker with an achievement once every project is found
- Minimap and a full map with fast travel
- An arcade island across a rope bridge with four games and saved high scores, each with its own synthesised soundtrack:
  - Cosmic bowling: five frames with real scoring, a power gauge, hook and a pin cam
  - Sky GP: a three-lap kart race on a floating circuit with jumps, obstacles, nitro and three rivals
  - Bug Hunt: a twin-stick wave shooter in a neon server room, defending the core (and yourself) from five waves of bugs and a boss
  - Riff Rush: a rhythm game on a floating concert stage, playing the guitar part of a two-minute song over a synthesised band
- Day / night mode
- Turkish / English interface and content
- Generative music and sound effects (Web Audio, no audio files), with a mute toggle
- Joystick controls on touch devices
- "Quick view": a classic scrollable page for visitors who prefer no 3D (also shown automatically when WebGL isn't available)
- Downloadable CV generated from the same data as the site
- Cookie-free Vercel Web Analytics

## Stack

React 19, Vite, React Three Fiber, drei, postprocessing, Zustand, Framer Motion, Tailwind CSS 4.

## Development

```bash
npm install
npm run dev
```

The 3D scene is code-split from the rest of the app, so the title screen and quick view load first.

### Regenerating the CV

`public/cv/Nefise-Nur-Genc-CV.pdf` is built from `src/data/projects.js` with headless Chrome:

```bash
npm run cv
```

## Structure

- `src/data/projects.js` – project content and personal info
- `src/data/world.js` – island layout: landmark positions, entrances, colliders
- `src/data/arcade.js` – arcade island layout: bridge, game areas, walkable ground
- `src/game/` – the 3D scene (island, scenery, landmarks, character, camera)
- `src/game/arcade/` – the arcade games, their state and sound (`race/`, `hunt/` and `riff/` hold the games played off the island)
- `src/ui/` – title screen, HUD, panels, map and quick view
- `src/i18n/` – interface strings and Turkish content
- `scripts/build-cv.mjs` – generates the public CV PDF
- `public/img/` – optimized WebP images (`posters/` holds the 3D textures)
