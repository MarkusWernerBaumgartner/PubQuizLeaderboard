# Pub Quiz Scoring System: Design Spec (2026-10-02)

## Context
A host needs a native Linux desktop app for running a pub quiz night with two views. **Admin** runs on the host's laptop and is used to configure the quiz, add teams and enter scores live. **Leaderboard** is a fullscreen, animated display for a projector. State must persist across restarts and be clearable and loadable. The app's identity (name, colours, logo, icon) is configurable and kept out of the repository (see Branding).

Decisions made: Electron + vanilla HTML/CSS/JS (no framework or bundler). Logos are user-supplied images configured in the Branding settings. Fun stats: round winners and biggest climber, plus best/worst round per team (plus sensible extras: lead changes, gap to 2nd, wooden spoon).

## Architecture
- **Electron main process** owns the single source of truth (`state`). It persists to `app.getPath('userData')/quiz.json` (atomic write: temp file then rename, debounced). It exposes IPC: `state:get`, `state:dispatch(action)`, and broadcasts `state:changed` to all windows. Both windows run in the same app instance, so there is no server or ports.
- **Launcher window**: title, crest, two big buttons, Leaderboard and Admin. Choosing one opens that window. The user can open both, and the Leaderboard opens fullscreen on a chosen monitor (a `screen.getAllDisplays()` picker; default is a non-primary display if present). F11 and Esc toggle fullscreen in any window.
- **Preload + contextBridge**: a minimal `window.quiz` API (`getState`, `dispatch`, `onChange`, `listSaves`, etc). `contextIsolation` is on and `nodeIntegration` is off.
- **Pure logic module** `src/shared/logic.js`: reducer `(state, action) -> state` and derived selectors (standings, ranks per round, stats). It is unit-testable with `node --test`, with no Electron dependency.

### State shape
```
{ version, title, rounds: [{id,name,maxScore,questions:[{text,options:[4 strings],correct?:0-3}]}], teams: [{id,name,colour,scores:{roundId:number}}], rules: {items:[string], visible:boolean}, presentation: {step:int, revealAnswer:boolean}, settings:{theme tweaks}, history:[...] }
```
(`rules` is admin-configurable; see "Rules screen" below.)
Default title is "Pub Quiz Night" (configurable via branding). Rounds are default-named "Round 1..N". `history` is a log of score events, used for the lead-changes stat and for undo.

### Actions
`setTitle`, `setRounds` (count/names/max), `setRules` (edit rules text/items), `setRulesVisible` (show/hide rules on the leaderboard), `setQuestions(roundId, questions)`, `presentNext`, `presentPrev`, `presentGoto(step)`, `presentReveal`, `addTeam`, `renameTeam`, `removeTeam`, `setScore(teamId, roundId, value)`, `clearScores`, `resetAll`, `load(state)`, `undo`.

### Persistence ("clear / load")
- Autosave on every change. Auto-loads on startup.
- Admin menu: **Export** (save as JSON file), **Load** (open JSON via dialog, with confirm), **Clear scores** (keeps teams), **Reset everything** (confirm). Before any destructive action, an automatic timestamped backup goes to `userData/backups/`.

## Admin UI (laptop)
Tabs/sections: **Setup** (quiz title, number of rounds, round names, optional max score), **Rules** (configurable rules list with add/remove/reorder, plus a prominent "Show rules on screen" toggle), **Questions** (per round: add/remove/reorder questions, each with text and exactly 4 options A–D, optional correct answer; a presentation control bar with Prev/Next, a step list/progress indicator, keyboard arrows/Space, and a "Reveal answer" button on option steps), **Teams** (add/rename/remove, colour auto-assigned), **Scoring** (grid: teams × rounds with a round selector, big numeric inputs, Enter moves to the next team, a "Live" indicator, and an undo button). Entering a score dispatches immediately, and the leaderboard animates. Validation covers numbers only and respects max score. Includes a "preview leaderboard" button and a fullscreen toggle.

## Leaderboard UI (big screen)
- Header with the crest, configurable title, and a "after Round N" indicator.
- **Race board**: rows are teams, sorted by total. Animated bars scale to the leader. Rows reorder with FLIP animation, numbers count up, and the leader gets a crown/glow. Rank-change arrows (↑/↓) are shown.
- **Round breakdown**: stacked segment per round inside each bar (per-round colours), with a hover-free legend.
- **Fun stats panel**, which cycles or sits in a sidebar: round winners, biggest climber, best/worst round per team, lead changes, gap to 1st/2nd, wooden spoon.
- **Event animations**: a score update triggers a pulse on the row, a "+N" floating chip, and confetti (canvas) when the lead changes or a round completes. Idle ambient motion (subtle floating shapes) keeps it lively.
- A configurable palette (default midnight indigo `#1a1b4b`) with bright funky accents (gold, coral, mint, violet), a rounded display font bundled locally (no network dependency), and large type readable from the back of a room.

## Rules screen (added)
- State gains `rules: { items: string[], visible: boolean }`. Default is a sensible set of pub quiz rules (no phones, one answer sheet per team, and so on).
- **Admin**: a **Rules** section to edit the rules as an ordered list (add/remove/reorder items), with a live preview. A **Show rules / Hide rules** toggle sets `rules.visible` (action `setRulesVisible`, plus `setRules`).
- **Leaderboard**: when `visible` is true, a full-screen animated "Rules" overlay (crest, title, rules revealed one by one with staggered animation) covers the board. When hidden, it transitions back to the leaderboard. It is also shown by default on a fresh quiz, before any scores exist. The launcher can also open the Leaderboard straight onto the rules.
- Tested in `logic.test.js` (reducer actions, persistence round-trip).

## Question presentation (added, optional)
Questions are flicked through like a slideshow. The flat step sequence is generated from all rounds' questions in order:
`[board, Q1 text, Q1 + options, board, Q2 text, Q2 + options, board, ...]` (starts and ends on board-only). Step 0 is board-only, so the feature is effectively off until Admin presses Next. `presentation.step` indexes into the derived sequence (selector `presentationSteps(state)` in `logic.js`), clamped when questions are added or removed.
- **Board-only step:** the leaderboard at full width.
- **Question step:** the layout animates to **two-thirds / one-third**. The board compresses into the left two-thirds, and the right third shows the round name and the question text, sliding in.
- **Question + options step:** the same layout, with the four options (A–D) animating in beneath the question. "Reveal answer" (only if a correct option is set) highlights the correct option and dims the rest, with a small celebratory animation.
- Moving back to a board-only step animates the panel out and the board back to full width. Moving between steps of the same question does not re-slide the panel.
- **Controls:** Next/Prev buttons and arrow keys/Space in Admin. The Leaderboard window also accepts arrow keys when focused, so the screen can be driven directly.
- The rules overlay, when shown, takes precedence over the question panel.
- Compact layout must stay legible at 1920×1080: bars shrink and the stats panel collapses to a single rotating card while a question is shown.
- Tested in `logic.test.js` (step sequence generation, next/prev clamping, 4-option validation, persistence round-trip).

## Assets
Crest, wordmark and window icon are user-supplied images held in the branding store (outside the repository). A generic default crest ships as `src/renderer/assets/default-crest.svg`; `build/icon.png` is generated from it.

## Branding (added)
Identity is configuration, not code, and is stored outside the repo (`userData/branding.json` plus `branding-assets/`), separate from quiz data so "Reset everything" never touches it.
- **Fields:** app name, default quiz title, ten colour tokens (backgrounds, line, four accents, text, muted), and optional crest, wordmark and window-icon images.
- **Model:** pure `src/shared/branding.js` (defaults, validation, CSS variable mapping, contrast ratio); main-process `src/main/branding.js` stores it, copies images (PNG/JPG/SVG/WebP, max 5 MB) and serves them to windows as data URIs; `src/renderer/common/branding.js` applies it live to every window.
- **UI:** Admin "Branding" tab and a launcher link: text fields, colour pickers with contrast warnings, image pickers, import/export of preset folders (`branding.json` + images), reset to default.
- **Defaults:** neutral indigo palette and a generic trophy badge. Real identities live in gitignored preset folders under `local/`.

## File layout
```
package.json, main.js, preload.js
src/shared/logic.js        (reducer + selectors)
src/main/store.js          (persistence, backups, IPC)
src/renderer/launcher.{html,js,css}
src/renderer/admin.{html,js,css}
src/renderer/leaderboard.{html,js,css}
src/renderer/common/{theme.css,animations.js,confetti.js}
src/renderer/assets/       (logo svg/png, fonts)
test/logic.test.js
```
Packaging: `electron-builder` AppImage target, plus a `npm start` and a desktop-entry install script.

## Implementation order
1. Scaffold the Electron app and add the default crest/icon.
2. `logic.js` + tests (TDD): reducer, standings with ties, stats.
3. Store/persistence + IPC + launcher.
4. Admin UI (Setup, **Questions editor + presentation controls**, **Rules editor + show/hide toggle**, Teams, Scoring).
5. Leaderboard UI + animations, including the **animated Rules overlay** and the **2/3 + 1/3 question panel layout**.
6. Polish, packaging, README.

## Verification
- `node --test` for logic (ranking, ties, climber, best/worst round, lead changes, persistence round-trip).
- `npm start`, then manually: configure the quiz, add 6+ teams, enter scores for 3 rounds in Admin with the Leaderboard on a second monitor, and confirm animations, reorder and stats update live.
- Quit and relaunch to confirm state persists. Test export, load, clear scores and reset (including backup creation), and undo.
- Test fullscreen on the HDMI/DP display (F11/Esc), and Leaderboard readability at 1920×1080 and 2560×1440.
- Build the AppImage and launch it.
- Dry run with dummy data before the event.

