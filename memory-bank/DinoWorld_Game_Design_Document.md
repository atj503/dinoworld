# DinoWorld - Game Design Document

## Game Title
**DinoWorld**

## Genre
3D Platformer

## Platform
Web (Built with Three.js + JSON, deployable via GitHub Pages or Vercel)

## Objective
Navigate expansive 3D environments, collecting randomly placed rings within a time limit.

---

## Core Mechanics

### Player Movement
- High-speed running
- Jumping
- Shooting lasers (basic raycasting-based attacks)
- Multiplayer support (WebSocket-ready)

### Game Goals
- Collect all rings before the timer runs out
- Avoid enemies and hazards

### Obstacles
- **Enemies**: Basic AI patrol/detect/attack logic
- **Environmental Hazards**: Moving platforms, lava pits, collapsing bridges

---

## Visual Style

- Stylized, low-poly 3D assets
- Bright, saturated color palette
- Vibrant skyboxes and exaggerated terrain

---

## Controls (Keyboard-first)
- `WASD` – Move
- `Space` – Jump
- `Click` – Shoot laser
- `Shift` – Dash / Sprint
- `Esc` – Pause menu

---

## Art & Assets

- Use free low-poly models from sources like:
  - [Poly Pizza](https://poly.pizza)
  - [Kenney.nl](https://kenney.nl/assets)
  - [Sketchfab](https://sketchfab.com)

---

## Code Structure (Vibe Coding Style)

- **/public/assets/** – Models, textures, sounds
- **/src/**  
  - `main.js` – Initializes Three.js scene, camera, lighting  
  - `player.js` – Handles player input, movement, actions  
  - `level.js` – Loads map + ring locations from JSON  
  - `enemy.js` – Basic AI and hazards  
  - `ui.js` – Timer, ring count, and HUD elements  
- **/data/levels/** – JSON files with layout, ring placement, enemy positions  
- **/index.html** – Minimal UI shell

---

## Milestones

### v0.1 – MVP (Goal: Within hours)
- [ ] Load 3D scene with terrain
- [ ] Basic player controller (run + jump)
- [ ] Collectible rings from JSON config
- [ ] Simple UI (timer + ring counter)

### v0.2 – Visual Polish
- [ ] Add skybox, lighting, post-processing
- [ ] Stylized terrain and props

### v0.3 – Enemies & Hazards
- [ ] Add basic AI (e.g., patrolling enemy)
- [ ] Add a lava zone hazard

### v0.4 – Multiplayer Prototype
- [ ] Socket.io sync of positions and ring count

---

## Deployment
- Use [Vercel](https://vercel.com) or [GitHub Pages](https://pages.github.com/) for quick web deployment
- Optimize assets for fast load times

---

## Notes
- Keep it fun. Keep it fast.
- Embrace the "vibe" — simple, readable, moddable.
- Don't overthink — ship early, iterate.

---

## Links
- GitHub Repo: [github.com/yourusername/DinoWorld](https://github.com/yourusername/DinoWorld)
- IDE: Cursor AI
