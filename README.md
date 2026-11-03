# PA4 — A-Frame VR Scene

**Student ID:** 241629  
**Project:** Astana EXPO Pavilion

## Overview

This project is an interactive A-Frame scene inspired by the Astana EXPO Pavilion. It contains six animated exhibits arranged in two rows along a central corridor.

## Features

- Six exhibits with custom `x1629-` components.
- Exhibit pulse animation.
- Central gaze reticle with a 1.5-second selection fuse.
- Exhibit selection and status counter.
- SVG textures for the pavilion scene.
- A custom gallery system for scene interaction.

## Project files

- `index.html` — A-Frame scene and assets.
- `components.js` — custom components and gallery system.
- `textures/` — SVG texture assets.
- `README.md` — project overview and run instructions.
- `writeup.pdf` — assignment report.
- `demo.mp4` — project demonstration video.

## Run locally

1. Open the project folder in Visual Studio Code.
2. Open `index.html` with Live Server.
3. Use the browser page to view and interact with the scene.

For desktop WebXR testing, enable the Immersive Web Emulator for the local project page. Its simulated headset and controllers are for emulation; they are not a physical VR headset.

## Interaction

- Aim the cyan reticle at an exhibit and hold it there for about 1.5 seconds to select it.
- Use the `M` and `X` keyboard shortcuts for the gallery interactions.