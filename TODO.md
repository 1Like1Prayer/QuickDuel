# QuickDuel — TODO List

## Code Quality

- [ ] **Remove dead code**
  - Remove `laserDebugGfx` debug overlay references and drawing code
  - Remove unused `lastDialResult` ref
  - Remove unused `Sprite` import from pixi.js in game loop
  - Remove unused knockback animations

- [ ] **Export game-loop logic to hooks / util functions**
  - Extract laser beam animation to a `useLaserBeam` hook (generic for red & blue)
  - Extract screen shake to a `useScreenShake` hook
  - Game loop should be composed of smaller, testable pieces

- [ ] **Make functions more generic**
  - `useLaserBeam` should accept config objects so both red and blue beams use the same code
  - Unify phase reset logic between player_win / player_lose

- [x] **Blood splatter removed**
  - Removed `spawnBlood` / `updateBloodParticles` from `particles.ts`
  - Removed blood particle spawning, rendering, and imports from `useGameLoop`
  - Renamed `BloodParticle` → `Particle` in `src/game/types/index.ts`
  - Removed blood particle constants from `src/game/constants/game.ts`

---

## Gameplay

- [ ] **Scoring: +7 / −7 differential system**
  - Single `score` field (range −7 … +7, starts at 0)
  - Each round: `score += playerHit − cpuHit`, clamped to [−7, +7]
  - `score >= +7` → player wins · `score <= −7` → player loses
  - Replace old `playerPoints` / `opponentPoints`

- [ ] **Laser beams move with score**
  - Clash point shifts from the center based on `score / MAX_SCORE`
  - Positive score → player's beam pushes toward the opponent
  - Negative score → opponent's beam pushes toward the player

- [ ] **Tutorial section**
  - [ ] Player positions explained
  - [ ] Gameplay mechanics explanation
  - [ ] Skip-tutorial button
  - [ ] Tutorial button in main menu
  - [ ] "It's your first time" window on first visit (localStorage-backed state)


---

## Future Ideas

- Online multiplayer mode
- Additional characters / selectable skins
- Sound effects & background music
- Mobile touch controls refinement
- Leaderboard / stats tracking
