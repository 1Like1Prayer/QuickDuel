# QuickDuel — TODO List

## Code Quality

- [x] **Remove dead code**
  - ~~Remove `laserDebugGfx` debug overlay references and drawing code~~ ✔ removed
  - ~~Remove unused `lastDialResult` ref~~ ✔ removed
  - ~~Remove unused `Sprite` import from pixi.js in game loop~~ ✔ `Sprite` is actually used (laser tile creation)
  - ~~Remove unused knockback animations~~ ✔ removed

- [ ] **Export game-loop logic to hooks / util functions**
  - Extract laser beam animation to a `useLaserBeam` hook (generic for red & blue)
  - Extract screen shake to a `useScreenShake` hook
  - Game loop should be composed of smaller, testable pieces

- [x] **Make functions more generic**
  - `useLaserBeam` should accept config objects so both red and blue beams use the same code
  - ~~Unify phase reset logic between player_win / player_lose~~ ✔ extracted `resetTransientState()`

- [x] **Blood splatter removed**
  - Removed `spawnBlood` / `updateBloodParticles` from `particles.ts`
  - Removed blood particle spawning, rendering, and imports from `useGameLoop`
  - Renamed `BloodParticle` → `Particle` in `src/game/types/index.ts`
  - Removed blood particle constants from `src/game/constants/game.ts`

---

## Gameplay

- [x] **Scoring: +7 / −7 differential system**
  - Single `score` field (range −7 … +7, starts at 0)
  - Each round: `score += playerHit − cpuHit`, clamped to [−7, +7]
  - `score >= +7` → player wins · `score <= −7` → player loses
  - Replace old `playerPoints` / `opponentPoints`

- [x] **Laser beams move with score**
  - Clash point shifts from the center based on `score / MAX_SCORE`
  - Positive score → player's beam pushes toward the opponent
  - Negative score → opponent's beam pushes toward the player

- [x] **Tutorial section**
  - [x] Player positions explained (Tutorial.jpg image)
  - [x] Gameplay mechanics explanation (Tutorial.jpg image)
  - [x] Skip-tutorial button
  - [x] Tutorial button in main menu
  - [ ] "It's your first time" window — `tutorialSeen` state exists but is **not persisted** to localStorage (resets on page reload)

---

## 2026-03-24

- [ ] Fix animations on small screen (laser offset on player)
- [ ] Make it PWA
- [ ] Upgrade Vite 8
- [ ] Go over each logic section and see how it can be improved either by code quality (splitting, unifying similar code, etc.) or changing the logic to something simpler — start from `Scene.tsx`
- [ ] Add offline gameplay support with PWA
- [ ] Proper tutorial with animations and PixiJS, not just showing a PNG
- [ ] Implement IndexedDB — save tutorial-seen flag, UUID per player, ELO rating
- [ ] Implement BE (backend) gameplay

---

## Backend

- [ ] **Server setup**
  - API server (Node.js / Express or similar)
  - WebSocket server for real-time gameplay
  - Database schema (players, matches, ELO ratings)

- [ ] **Authentication & player identity**
  - Clerk integration for proper user auth (sign-up, login, session management)
  - UUID-based anonymous accounts as fallback (synced via IndexedDB)

- [ ] **Game modes**
  - [ ] **Ranked** — matchmaking by ELO, ELO adjustments after each match
  - [ ] **Casual** — random matchmaking, no ELO impact
  - [ ] **By Room** — create / join room via room code, invite friends

- [ ] **Real-time multiplayer**
  - WebSocket-based turn synchronization
  - Server-authoritative game state (anti-cheat)
  - Reconnection handling / disconnect grace period
  - Latency compensation

- [ ] **Analytics**
  - Screen size / device info tracking
  - Error logging & reporting (client-side errors forwarded to backend)
  - Gameplay metrics (match duration, win rates, popular difficulty, etc.)

- [ ] **Infrastructure & security**
  - Cloudflare CDN & proxy
  - Rate limiting on API endpoints
  - DDoS protection
  - WebSocket connection throttling

- [ ] **Leaderboard & stats**
  - Global ELO leaderboard
  - Per-player match history
  - Win/loss/draw statistics

---

## Future Ideas

- Additional characters / selectable skins
- Sound effects & background music
- Mobile touch controls refinement
