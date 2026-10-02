# Architecture

A small Electron app with vanilla HTML/CSS/JS renderers (no framework, no bundler). All game logic is a pure, unit-tested module shared by the main process and the windows.

```
 ┌────────────────────────── main process (main.js) ──────────────────────────┐
 │  Store (src/main/store.js)            BrandingStore (src/main/branding.js)  │
 │   state ← reduce(state, action)        branding.json + branding-assets/      │
 │   quiz.json (atomic, debounced)        images → data URIs                    │
 │        │  IPC (ipcMain.handle / webContents.send)        │                   │
 └────────┼───────────────────────────────────────────────────┼────────────────┘
          ▼                    preload.js (contextBridge → window.quiz)           ▼
   ┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
   │ Launcher     │        │ Admin        │        │ Leaderboard      │
   └──────────────┘        └──────────────┘        └──────────────────┘
     each window loads src/shared/{logic,branding}.js and common/branding.js
```

## Source of truth

The main process owns the quiz state. Windows never mutate it directly: they call `quiz.dispatch(action)`, the `Store` runs the pure reducer, persists the result, and broadcasts `state:changed` to every window, which re-renders. Because Admin and Leaderboard are just two views of the same broadcast state, they cannot drift apart.

If the reducer rejects an action (invalid score, duplicate team name, …) it returns the *same* state object, and `dispatch` replies `{ ok: false }`. Admin uses this to shake the input and show a message.

## Modules

| File | Responsibility |
| --- | --- |
| `src/shared/logic.js` | Default state, `reduce`, `normalizeState`, selectors `standings`, `stats`, `presentationSteps`, `currentQuestion`, `scoredRounds`. No Electron or DOM dependencies; a UMD module loaded by Node and by `<script>` tags |
| `src/shared/branding.js` | Branding defaults, `normalizeBranding`, `cssVars`, `contrastRatio` |
| `src/main/store.js` | Holds state, applies actions, saves after every accepted change (atomic: temp file, fsync, rename) to the working copy and to an optional linked save file, backups before destructive actions, corrupt-file recovery |
| `src/shared/effects.js` | The optional animations/celebrations: flag list, presets, validation, reduced-motion resolution, CSS class names |
| `src/main/settings.js` | Per-machine preferences (`settings.json`): the effects settings |
| `src/main/fsutil.js` | Atomic write and error-capturing helpers shared by the stores |
| `src/main/branding.js` | Branding config and images: validates and copies images, import/export of preset folders, prunes unused files |
| `main.js` | Windows, display placement, fullscreen keys, IPC handlers, file dialogs |
| `preload.js` | The only bridge: exposes a small `window.quiz` API using `contextBridge` |
| `src/renderer/*.{html,js,css}` | The three windows |
| `src/renderer/common/` | Theme CSS, `branding.js` (applies branding live), `effects.js` (applies effect switches live), count-up animation, canvas confetti, ambient background |
| `src/main/dev-capture.js` | Scripted scenario runner for docs media and the CI smoke test; only active when `PUBQUIZ_DEV_SCENARIO` is set |

## State

```
{ version, title,
  rounds:   [{ id, name, maxScore, questions: [{ text, options[4], correct|null }] }],
  teams:    [{ id, name, colour, scores: { [roundId]: number } }],
  rules:    { items: string[], visible: boolean },
  presentation: { step: number, revealAnswer: boolean },
  history:  [{ teamId, roundId, prev, next }],   // for undo, capped at 500
  nextId }
```

Actions: `setTitle`, `setRounds`, `addTeam`, `renameTeam`, `removeTeam`, `setScore`, `undo`, `clearScores`, `resetAll`, `setRules`, `setRulesVisible`, `setQuestions`, `presentNext`, `presentPrev`, `presentGoto`, `presentReveal`, `load`.

`normalizeState` validates anything read from disk or a loaded file and fills in optional fields; bad shapes are rejected without touching the current state.

### Presentation steps
`presentationSteps(state)` derives the slideshow from the rounds' questions: `[board, Q1, Q1+options, board, Q2, Q2+options, board, …]`. `presentation.step` indexes into it and is clamped whenever rounds or questions change.

### Standings and stats
`standings` ranks teams with competition ranking (ties share a rank) and computes each team's rank change relative to the standings before the most recent scored round. `stats` derives round winners, biggest climber, best/worst round per team, lead changes (counting only unique leaders), the gap at the top and the wooden spoon.

## Persistence

- **Working copy** – `<userData>/quiz.json` is rewritten synchronously after every accepted action. There is no debounce, so there is no window in which a crash or `kill -9` can lose a change.
- **Linked save file** – *Save as…* and *Load* set a path (remembered in `session.json`) that is written alongside the working copy on every change, and brought up to date at startup. A failing link (unplugged drive) is reported through `saveStatus()` / `save:changed` but never blocks play or the working copy.
- **Atomic writes** – data goes to `<file>.<pid>.tmp`, is `fsync`ed, then renamed over the target.
- **Backups** – before `clearScores`, `resetAll` and `load`, the previous state is written to `backups/`.
- **Recovery** – an unreadable `quiz.json` is kept as `quiz.corrupt-*.json` and the app starts from defaults. Loaded files go through `normalizeState`; invalid ones are rejected without changing anything.

`test/store.test.js` covers all of this, and `scripts/ci/autosave-e2e.js` verifies it against the real app by SIGKILLing it mid-session.

## IPC surface

| Channel | Direction | Purpose |
| --- | --- | --- |
| `state:get`, `state:dispatch` | renderer → main | read state, apply an action |
| `state:changed` | main → renderers | broadcast new state |
| `window:open`, `window:fullscreen`, `displays:list`, `app:quit`, `app:info` | renderer → main | window management and app info |
| `data:saveAs`, `data:export`, `data:load`, `data:unlink`, `save:get` | renderer → main | quiz file dialogs and autosave link |
| `save:changed` | main → renderers | autosave status (linked file, last saved time, errors) |
| `branding:get`, `branding:set`, `branding:pickImage`, `branding:clearImage`, `branding:reset`, `branding:importPreset`, `branding:exportPreset` | renderer → main | branding changes |
| `branding:changed` | main → renderers | broadcast new branding (config + image data URIs) |
| `settings:get`, `settings:set`, `settings:preset`, `settings:reset` | renderer → main | read and change the effects settings |
| `settings:changed` | main → renderers | broadcast new settings |
| `effects:preview` | renderer → main → leaderboard | play a celebration with the current settings |
| `admin:section` | main → admin | switch Admin tab (e.g. from the launcher) |

## Rendering the leaderboard

Rows are absolutely positioned and moved with `transform: translateY(...)`, so re-ranking animates with a CSS transition rather than re-creating DOM. Bars and per-round segments animate by width. Differences between the previous and new state drive the one-off effects (pulse, "+N" chip, confetti, banner); the initial render triggers none. All sizing uses `rem` derived from the viewport height, so the layout scales from a laptop to a projector.

## Branding at runtime

`common/branding.js` runs in every window. It fetches the branding payload, sets CSS custom properties on `:root` (`--bg`, `--accent-1`, …), fills `[data-brand]` elements (crest, wordmark, app name) and updates the window title. The page stays hidden until the first application to avoid a flash of default colours. Images travel as data URIs, which the Content Security Policy already allows, so no custom protocol is needed.

## Effects

`effects.js` defines every switch once. The renderer's `common/effects.js` resolves the stored settings (applying the OS "reduce motion" request as the *Minimal* preset when followed) and puts `fx-off-<flag>` classes on `<html>`. Visual effects are disabled by CSS rules keyed on those classes; effects created in JavaScript (confetti, banners, "+N" chips, toasts, count-up) ask `Effects.on('flag')` first. `test/effects.test.js` fails if a flag exists that nothing uses, and `scripts/ci/effects-{on,off}.json` run the real app to prove the switches work. Errors and confirmation dialogs are intentionally not switchable. See [Effects](effects.md).

## Platforms

The app is portable Electron code: paths come from `app.getPath('userData')` and Node's `path`, and there are no native modules. Platform differences are small and contained in `main.js`: macOS gets a minimal menu (so ⌘C/⌘V/⌘Q work) and uses "simple" fullscreen so the leaderboard stays on the display it was placed on; `--no-sandbox` is passed on Linux only (see `scripts/start.js`).

## Security notes

- `contextIsolation: true`, `nodeIntegration: false`, renderer `sandbox: true`; the preload exposes a fixed API.
- Each page has a strict CSP (`default-src 'self'`).
- User-supplied images are validated by extension and size (≤ 5 MB), copied under generated names, and never executed; image filenames from preset files must match a safe pattern (no paths).
- Loaded quiz files pass through `normalizeState` before they replace anything.
- On Linux the Chromium sandbox is disabled with `--no-sandbox` (start script and AppImage launcher arguments) because the setuid `chrome-sandbox` helper is not available for locally built Electron apps. Windows and macOS keep it enabled.

## Tests

`test/` uses Node's built-in runner (`npm test`):

- `logic.test.js` – reducer, validation, standings, stats, presentation, persistence shape,
- `branding.test.js` – branding validation, CSS variables, contrast, default-title seeding,
- `settings.test.js` – effects settings persistence and recovery,
- `effects.test.js` – effect model, presets and the dead-switch guard,
- `store.test.js` – quiz saving, loading and autosave link,
- `release.test.js` – version/changelog consistency.

UI behaviour is exercised by the headless smoke scenario in CI (see [Development](development.md)).
