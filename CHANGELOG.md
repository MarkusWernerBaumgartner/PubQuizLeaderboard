# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Written-answer questions**: a question can be multiple choice (four options) or a written answer with an optional model answer. Written questions show only the question on the big screen; **Reveal answer** then shows the model answer.
- **Penalties & bonuses**: in the Scoring tab, give any team penalty or bonus points with a reason (e.g. penalise a cheat, reward whoever spotted it). They count towards the total and ranking, are announced on the big screen with the reason, can be undone or removed, and are saved with the quiz.
- **Answer media**: attach an image/GIF URL or YouTube link to a question; it expands over the leaderboard when the answer is revealed.

### Fixed
- The `admin-branding.png` documentation screenshot showed the Effects tab; it now shows the Branding tab.

### Changed
- User guide gains a Branding section and Effects screenshot; README describes Save quiz as… / Load quiz… autosave.

## [1.1.0] - 2026-10-02

### Added
- **Effects** tab: every animation, celebration and popup (confetti, banners, pulses, "+N" points, count-up, sliding re-order, rules/question/stat animations, ambient motion, admin motion and success toasts) can be switched off individually, with Party/Calm/Minimal/Off presets, a confetti-amount control, preview buttons, and respect for the system "reduce motion" setting. Errors and confirmation dialogs always stay. See `docs/effects.md`.
- Windows (installer + portable) and macOS (Intel + Apple Silicon `.dmg`/`.zip`) builds, built and tested in CI alongside Linux; releases now publish all of them.
- `npm run dist:local` builds with the icon from a local, gitignored preset; public builds keep the neutral icon.
- `npm run check-syntax`, `npm run ci:smoke`, and end-to-end scenarios proving the effect switches work.
- **Save quiz as…**: choose a file and every change is autosaved to it, with a status chip in Admin (saved time, or a warning if the file can't be written). The link survives restarts; **Stop autosaving to file** removes it.
- Store tests for saving, loading, linking, corruption and failure handling, and an end-to-end test that SIGKILLs the app and verifies nothing is lost.
- GitHub Actions: CI (tests, hygiene and version checks, headless Electron smoke test, AppImage build) and a tag-triggered release workflow.
- Dependabot for npm packages and GitHub Actions.
- App version shown in the launcher footer.
- Documentation in `docs/` (user guide, branding, architecture, development) and README screenshots/GIFs.
- Scenario runner (`scripts/capture-media.sh`) that regenerates the README media from `examples/sample-quiz.json`.

### Changed
- Saving is now immediate: every accepted change is written to disk at once (previously after a 250 ms delay), so a crash or kill can no longer lose the last change.
- **Load quiz…** now keeps autosaving back to the loaded file. Export is now **Export a copy…**.

### Fixed
- CI build job failed trying to publish (electron-builder's implicit publish-on-CI); builds now use `--publish never`.
- `npm start` no longer disables the Chromium sandbox on Windows and macOS (Linux only).
- macOS gets a minimal application menu so copy/paste/quit shortcuts work.
- A failed write (full disk, unplugged drive) no longer risks crashing the app; the error is shown and play continues.

### Removed
- Internal design notes under `docs/superpowers/`.

## [1.0.0] - 2026-10-02

### Added
- **Answer media**: attach an image/GIF URL or YouTube link to a question; it expands over the leaderboard when the answer is revealed.
- Launcher, Admin and Leaderboard windows in one Electron app.
- Persistent quiz state with autosave, export/load, clear scores, reset and automatic backups.
- Animated leaderboard: race board with per-round segments, rank changes, confetti and a "new leader" banner.
- Fun stats: round winners, biggest climber, lead changes, gap at the top, wooden spoon, best/toughest rounds.
- Configurable rules overlay and per-round questions (four options each) presented as a slideshow with answer reveal.
- Configurable branding: name, default title, colours, crest, wordmark and window icon, with preset import/export.
- Sample quiz in `examples/sample-quiz.json`.

[Unreleased]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/releases/tag/v1.0.0
