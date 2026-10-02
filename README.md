# Pub Quiz Scoring System

A desktop app (Electron, vanilla JS) for running a pub quiz night: configure rounds and teams on your laptop, enter scores live, and show an animated leaderboard on the big screen. Fully brandable: name, colours, logo and icon are settings, not code.

One app, three windows:

- **Launcher** – pick **Leaderboard** (big screen) or **Admin** (your laptop).
- **Admin** – Setup (title, rounds), Rules, Questions, Teams, Scoring, Branding. Changes appear live on the Leaderboard.
- **Leaderboard** – animated race board, per-round stacked bars, fun stats, rules overlay and a question panel.

## Run

```bash
npm install
npm start                 # development
npm test                  # logic + branding tests
npm run dist              # builds dist/*.AppImage
```

In the launcher, choose which display the Leaderboard opens on (it defaults to your non-primary screen).
**F11** toggles fullscreen in any window, **Esc** leaves it.

## Running a quiz

1. Admin → **Setup**: title, number/names of rounds (and an optional max score per round).
2. Admin → **Rules**: edit the list; the toggle (also in the bottom bar) shows/hides the rules overlay on the Leaderboard.
3. Admin → **Questions** (optional): per round, question text + 4 options (A–D) and an optional correct answer.
4. Admin → **Teams**: add names (or paste a list).
5. Admin → **Scoring**: choose a round, type scores, **Enter** moves to the next team. **Undo** reverts the last change.
6. Bottom bar: **Prev / Next** (or ← → / Space) steps `board → question → question + options → board → …`. **Reveal answer** highlights the correct option.

Try it with the sample data: Admin → **Data → Load quiz…** → `examples/sample-quiz.json`.

## Branding

Admin → **Branding** (also linked from the launcher) controls the identity of the app:

- app name and default quiz title (used for new/reset quizzes),
- ten colours (backgrounds, lines/buttons, four accents, text colours) with contrast warnings,
- crest/logo, optional wordmark and window icon (PNG/JPG/SVG/WebP, up to 5 MB),
- **Import / Export preset** – a preset is a folder with `branding.json` and its image files, so you can keep several identities.

Branding is stored separately from quiz data, so *Reset everything* never touches it. The repository ships only a neutral default (indigo palette, generic trophy badge).

## Data & privacy

Everything is stored on your machine, outside the repository, in `~/.config/pubquiz-scoring/`:

| File | Contents |
| --- | --- |
| `quiz.json` | the current quiz (teams, scores, rules, questions) |
| `branding.json`, `branding-assets/` | your branding |
| `backups/` | timestamped backup before any clear/reset/load |

A corrupt save is kept as `quiz.corrupt-*.json` and the app starts fresh. **Data → Export / Load** moves quizzes between machines.

If you fork or publish your own copy, keep personal presets and artwork in the gitignored `local/` folder. `npm run privacy-check` scans everything git would add for the terms listed in `local/privacy-terms.txt` (also gitignored).

## Layout

`main.js`, `preload.js` · `src/main/` (`store.js` quiz state + persistence, `branding.js` branding store) · `src/shared/` (pure, tested: `logic.js` reducer/selectors, `branding.js` model) · `src/renderer/` (launcher/admin/leaderboard pages, shared theme, fonts, default crest) · `examples/` · `test/`.

## Licence

Bundled fonts (Fredoka, Nunito) are licensed under the SIL Open Font License; their licence texts are in `src/renderer/assets/fonts/`.


MIT – see [LICENSE](LICENSE).
