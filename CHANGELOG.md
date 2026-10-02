# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Written-answer questions**: a question can be multiple choice (four options) or a written answer with an optional model answer. Written questions show only the question on the big screen; **Reveal answer** then shows the model answer.
- **Penalties & bonuses**: in the Scoring tab, give any team penalty or bonus points with a reason (e.g. penalise a cheat, reward whoever spotted it). They count towards the total and ranking, are announced on the big screen with the reason, can be undone or removed, and are saved with the quiz.
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
- A failed write (full disk, unplugged drive) no longer risks crashing the app; the error is shown and play continues.

### Removed
- Internal design notes under `docs/superpowers/`.

## [1.0.0] - 2026-10-02

### Added
- Launcher, Admin and Leaderboard windows in one Electron app.
- Persistent quiz state with autosave, export/load, clear scores, reset and automatic backups.
- Animated leaderboard: race board with per-round segments, rank changes, confetti and a "new leader" banner.
- Fun stats: round winners, biggest climber, lead changes, gap at the top, wooden spoon, best/toughest rounds.
- Configurable rules overlay and per-round questions (four options each) presented as a slideshow with answer reveal.
- Configurable branding: name, default title, colours, crest, wordmark and window icon, with preset import/export.
- Sample quiz in `examples/sample-quiz.json`.

[Unreleased]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/releases/tag/v1.0.0
