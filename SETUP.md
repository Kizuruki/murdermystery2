# Murder Mystery v2.0 — Setup & Deployment Guide

## Project Structure

```
murder-mystery/
├── party/
│   └── index.ts          ← PartyKit server (all game logic, WebSockets)
├── public/
│   ├── index.html        ← Landing page (create/join room)
│   ├── lobby.html        ← Character selection, host settings
│   ├── game.html         ← Main game view (journal, tracker, chat, actions)
│   └── rules.html        ← Searchable rules reference
├── package.json
├── partykit.json
└── tsconfig.json
```

---

## Step 1 — Prerequisites

Install Node.js (v18+) from https://nodejs.org if you don't have it.

```bash
node --version   # should be 18+
npm --version    # should be 9+
```

---

## Step 2 — Install Dependencies

```bash
cd murder-mystery
npm install
```

---

## Step 3 — Create a PartyKit Account

Go to https://partykit.io and sign up (free). Note your username.

Then log in from your terminal:

```bash
npx partykit login
```

---

## Step 4 — Update the PartyKit Host URL

In ALL THREE frontend files, find this line and replace with your actual PartyKit host:

```
const PARTYKIT_HOST = "murder-mystery.YOUR-USERNAME.partykit.dev"; // ← replace
```

Files to update:
- `public/index.html`   (line ~130)
- `public/lobby.html`   (line ~155)
- `public/game.html`    (line ~8 in the script section)

Your PartyKit host will be:
```
murder-mystery.YOUR-PARTYKIT-USERNAME.partykit.dev
```

---

## Step 5 — Test Locally

```bash
npm run dev
```

This starts:
- PartyKit server at `localhost:1999`
- Serves your `public/` folder

Open http://localhost:1999 in your browser. Open a second tab/window to test multiplayer.

When testing locally, temporarily change PARTYKIT_HOST in the frontend files to:
```javascript
const PARTYKIT_HOST = "localhost:1999";
```
(Remember to change it back before deploying!)

---

## Step 6 — Deploy the PartyKit Server

```bash
npm run deploy
```

This deploys your server to:
`https://murder-mystery.YOUR-USERNAME.partykit.dev`

Your server is now live and handles all game logic + WebSockets.

---

## Step 7 — Deploy the Frontend

### Option A: GitHub Pages (recommended, free)

1. Create a GitHub repo (e.g. `murder-mystery-game`)
2. Push the contents of your `public/` folder to the repo's `main` branch
3. Go to Settings → Pages → Source: Deploy from branch → `main` → `/ (root)`
4. Your game will be live at `https://YOUR-USERNAME.github.io/murder-mystery-game/`

```bash
# Quick deploy to GitHub Pages
git init
git add public/
git commit -m "Deploy murder mystery"
git remote add origin https://github.com/YOUR-USERNAME/murder-mystery-game.git
git push -u origin main
```

### Option B: Cloudflare Pages (also free)

1. Go to https://pages.cloudflare.com
2. Connect your GitHub repo
3. Set build output directory to `public/`
4. Deploy

Your custom domain from Cloudflare will work here too.

---

## Step 8 — Add a Rules Link to the Game

In `public/game.html`, in the topbar section, you can add a rules button:

```html
<button class="role-btn" onclick="window.open('rules.html','_blank')" title="Rules">📋</button>
```

---

## How to Run a Game Session

### Host (creates room):
1. Go to your deployed URL
2. "Create Room" → enter your name
3. Share the 6-character room code with players
4. Pick your character in the lobby
5. Configure settings (clue mode, chat, jailor/vigilante)
6. Wait for all players to join and pick characters
7. Tap **Start Game**

### Players (join room):
1. Go to the same URL
2. "Join Room" → enter the 6-character code → enter your name
3. Pick a character from the list
4. Wait for the host to start

### During the game:
- **Journal tab** — Your character info, clues, objectives, feedback log, notes
- **Tracker tab** — Mark suspects, guess roles, see the death log
- **Chat tab** — Global town chat, evil team chat, private messages
- **🎭 button** — Quick peek at your role (private modal, not visible to others)
- **⚙️ button** — Host admin panel (pause/resume timer, skip phase, remove player)

---

## Physical Clue Mode Setup

When hosting with physical clues:
1. Set "Clue Mode" to Physical in lobby settings
2. After starting the game, go to the host panel (⚙️)
3. The 3 six-character codes are shown there
4. Write each code on a small slip of paper
5. Hide them around the play area before the game starts
6. Players enter found codes in their Journal tab under "Enter Clue Code"

---

## Troubleshooting

**Players can't connect:**
- Check the PARTYKIT_HOST URL in all 3 HTML files is correct
- Make sure you ran `npm run deploy` for the server
- Open browser console (F12) and check for WebSocket errors

**Game state not syncing:**
- Refresh the page — the client reconnects automatically
- Host can use the admin panel to manually advance or skip a phase

**Timer out of sync:**
- Timer runs server-side; if a player's display looks wrong, a page refresh fixes it
- Host can pause/resume from the admin panel at any time

**Someone's connection dropped mid-game:**
- They can rejoin by going to the same URL and entering the room code again
- Their state is preserved server-side

**Clue codes not working (physical mode):**
- Codes are case-insensitive — players can enter lowercase
- Codes are only valid once — if already found, a different player can't use the same code

---

## Customizing Characters

To add or change character names, edit the `CHARACTERS` array in both:
- `party/index.ts` (line ~50)
- `public/lobby.html` (line ~160)
- `public/game.html` (CHARACTERS array, if referenced)

---

## Adding Cumulative Scoring

The server tracks `cumulativePoints` per player. To display a full leaderboard at the end of a session, the host would tap "End Session" (you can add this button to the admin panel — it would call a `host_end_session` message type that triggers the scoring/leaderboard phase). The scoring logic is partially implemented in the server's `Player` type — you'd need to add the final tally calculation similar to the original `calculateFinalScores()` function.

---

## Key Differences from v1

| Feature | v1 (Organizer App) | v2 (Online) |
|---|---|---|
| Role assignment | Host picks, types to each player | Automatic, server-side |
| Night feedback | Host types manually to each player | Auto-resolved, private push |
| Clue delivery | Host types or shows | Auto (virtual) or code-entry (physical) |
| Voting | Host counts | Players tap, server tallies |
| Randomness | Math.random() (biased) | crypto.getRandomValues() (true random) |
| Multiplayer | Single device | Any device, any location |
| Chat | In person | Built-in with DMs + evil team chat |
