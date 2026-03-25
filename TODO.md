# QuickDuel — TODO List

## 2026-03-24

- [ ] Fix animations on small screen (laser offset on player)
- [x] Make it PWA
- [x] Upgrade Vite 8
- [ ] Go over each logic section and see how it can be improved either by code quality (splitting, unifying similar code, etc.) or changing the logic to something simpler — start from `Scene.tsx`
- [x] Add offline gameplay support with PWA
- [ ] Proper tutorial with animations and PixiJS, not just showing a PNG
- [ ] Implement IndexedDB — save tutorial-seen flag, pwa seen, UUID per player, ELO rating
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
  - Posthog
  - Sentry
  - CloudFlare
  - checking

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
