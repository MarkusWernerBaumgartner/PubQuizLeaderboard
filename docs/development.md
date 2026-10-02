# Development

## Setup

Requirements: Node.js 20+ (CI uses 22) and npm. `ffmpeg` is needed only to regenerate the README GIFs; `inkscape` only to rebuild the icon from the SVG.

```bash
git clone https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard.git
cd PubQuizLeaderboard
npm install
npm start
```

| Script | What it does |
| --- | --- |
| `npm start` | Run the app (`--no-sandbox`, see [security notes](architecture.md#security-notes)) |
| `npm test` | Unit tests (`node --test`) |
| `npm run e2e:autosave` | Starts the real app, links a save file, SIGKILLs it, restarts and checks nothing was lost (needs a display) |
| `npm run verify` | Tests + version/changelog check + repository hygiene check |
| `npm run check-release` | `package.json` version is semver and has a non-empty CHANGELOG entry |
| `npm run check-hygiene` | No brand artwork, personal presets or saved data would be committed |
| `npm run privacy-check` | Scan files git would add for terms in your own gitignored `local/privacy-terms.txt` |
| `npm run dist` | Build `dist/PubQuizScoring-<version>.AppImage` |
| `npm run media` | Regenerate the screenshots and GIFs in `docs/media` |

## Project layout

```
main.js  preload.js                 Electron main process and bridge
src/main/                           store.js, branding.js, dev-capture.js
src/shared/                         logic.js, branding.js (pure, tested)
src/renderer/                       launcher/admin/leaderboard pages, common/, assets/
test/                               unit tests
examples/sample-quiz.json           demo quiz used by docs and CI
scripts/                            check-*.js, privacy-check.js, capture-media.sh, media/ and ci/ scenarios
docs/                               documentation and media
.github/                            workflows and Dependabot
```

## Making changes

- Put game rules in `src/shared/logic.js` as reducer cases or selectors and cover them in `test/logic.test.js` first. The UI should only dispatch actions and render state.
- New window-to-main features need an `ipcMain.handle` in `main.js` and an entry in `preload.js`; never expose Node APIs to renderers.
- Colours in CSS must use the branding variables (`var(--bg)`, `var(--accent-1)`, …), never hard-coded brand colours, so every identity works.
- Update `CHANGELOG.md` under **Unreleased** for user-visible changes.

## Scenario runner

`src/main/dev-capture.js` drives the real app from a JSON script. It is inactive unless `PUBQUIZ_DEV_SCENARIO` is set:

```bash
PUBQUIZ_DEV_SCENARIO=scripts/ci/smoke.json PUBQUIZ_DEV_OUT=out \
  npx electron . --no-sandbox --user-data-dir=/tmp/pubquiz-profile
```

A scenario lists `windows` to open and `actions`: `wait`, `dispatch` (a quiz action; `"@team:N"` / `"@round:N"` resolve to ids), `branding`, `open`, `shot`, `record`, `stop`, plus `linkTo`, `crash`, `expect` and `expectLinked` for persistence tests. It writes PNGs (and frame lists for recordings) plus `report.json` containing any console or renderer errors, and exits non-zero if there were any. Always use a throwaway `--user-data-dir` so your real quiz is untouched.

### Regenerating the README media

```bash
npm run media
```

runs the scenarios in `scripts/media/` against `examples/sample-quiz.json` in a temporary profile and writes `docs/media/*.png` and `*.gif` (frames are joined with `ffmpeg`). It needs a display; on a headless machine use `xvfb-run -a npm run media`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

1. **Tests & checks** – unit tests, `node --check` on every JavaScript file, version/changelog consistency, repository hygiene, and that the sample quiz loads.
2. **Headless app smoke & autosave tests** – starts the real app under Xvfb with `scripts/ci/smoke.json`, takes screenshots of all three windows, and fails on any console error or blank screenshot (`scripts/ci/check-smoke.js`; screenshots are uploaded as an artifact). Then `scripts/ci/autosave-e2e.js` kills the app with SIGKILL mid-session and checks that a restart loses nothing.
3. **Build AppImage** – proves the package builds; the AppImage is uploaded as an artifact.

Dependabot proposes weekly updates for npm packages and GitHub Actions.

## Versioning and releases

The project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** – a change that breaks saved quiz or branding files, or the preset format;
- **MINOR** – new features that keep saved data working;
- **PATCH** – bug fixes and polish.

The single source of truth is `version` in `package.json`; the app shows it in the launcher footer, and the AppImage filename includes it. Release notes live in `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/) format).

To cut a release:

1. Move the **Unreleased** entries in `CHANGELOG.md` into a new `## [X.Y.Z] - YYYY-MM-DD` section and update the compare links at the bottom.
2. Run `npm version <patch|minor|major>`. Its `version` hook runs `check-release` (so a missing changelog entry stops the release), stages `CHANGELOG.md`, and npm creates the commit and the `vX.Y.Z` tag.
3. `git push --follow-tags`.

Pushing the tag triggers `.github/workflows/release.yml`, which re-runs the tests, verifies the tag matches `package.json` and the changelog, builds the AppImage, and publishes a GitHub release whose notes are the changelog section. Tags containing a `-` (e.g. `v1.3.0-rc.1`) are published as pre-releases.

## Keeping personal data out of git

Quiz data and branding are stored in `~/.config/pubquiz-scoring/`, outside the repository. For anything else personal (brand artwork, your own presets, notes):

- put it in `local/` or `private/` (both gitignored);
- list terms that must never be committed (names, organisations, email, home path) in `local/privacy-terms.txt`, one per line, and run `npm run privacy-check` before pushing;
- CI's hygiene check independently rejects EPS artwork, `local/`, saved quiz/branding JSON and build output.

Set a GitHub no-reply address as your commit email if you do not want your address in the history: `git config user.email <id>+<username>@users.noreply.github.com`.
