# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Coming up strip in Present mode**: the next steps by round and question number or section header (never any question or answer text), colour coded: purple leaderboard, teal section page, blue question, gold "answer on Reveal", coral "answer shows" (Answer reveal mode). Pills say how many steps until the next leaderboard and the next answer and whether it shows by itself. Click a chip to jump there.

### Changed
- A section page is now followed by the leaderboard when "Return to the leaderboard between questions" is on, so you can read a round's questions out yourself while showing the section header, without using Answer reveal. (With that setting off, or in Answer reveal mode with *don't return to the leaderboard*, the first question follows directly.)

### Fixed
- Pressing `R` (Answer reveal mode) or changing a presentation-flow switch while on a leaderboard step jumped back to the very first step instead of keeping your place (introduced in 1.3.0).

## [1.3.1] - 2026-10-05

### Added
- **Section pages**: an option in the Questions tab that adds a full-screen page with the round's name before each round, in normal and Answer reveal mode. It is a safe stop when flicking through answers: nothing is revealed on it, so you cannot run on into the next round's answers by accident. Shown as a teal marker in the step bar.
- **Answer reveal mode without the leaderboard**: an option in the Questions tab that, only while Answer reveal mode is on, goes straight from one question to the next instead of returning to the leaderboard between them. Other modes are unaffected, and switching reveal mode keeps the same question on screen.
- **Local answer images**: answer media can also be an image file on this computer (a `file:///…` link ending in `.png .jpg .gif .webp …`), e.g. from an extracted quiz folder. Other local file types and network file shares stay blocked.
- **Skip to a question**: every card in the Questions tab has a **▶ Q1** button that jumps the big screen straight to that question (clearing the Home page or rules if they are showing). It still works with Edit mode switched off.

### Changed
- **Rules are paged**: the rules screen shows 5 rules per page ("Page 1 of 2") so they are bigger and never run off the screen; text still shrinks to fit a crowded page. Page buttons in the bottom bar and `[` / `]` switch pages; the page is saved with the quiz.
- Present mode no longer shows the answer to the host (only the question); the answer still appears for everyone on reveal.

### Fixed
- Long rules could run off the bottom of the rules screen.
- The presenter-notes card could cover the bottom bar when the bar wrapped onto two rows.

## [1.3.0] - 2026-10-05

### Added
- **Home page**: a full-screen logo and title page for the start of the night (🏠 Home in the bottom bar, or `H`), with the same entrance and wobble animations as the launcher and drifting background shapes. It sits above the rules and the board, uses your branding, and follows the "Launcher intro" and crest-wobble effect switches.
- **Presenter notes**: an optional private note on every question (Questions tab). It pops up on the Admin screen (and in Present mode) when you reveal the answer, and is never shown on the Leaderboard.
- **Question timer**: a countdown (default 45 s, set per quiz, 5–600 s) that appears on the Leaderboard, turns amber then red in the last 10 and 5 seconds, and ends with "Time!". Start/stop it from Present mode with **Space**; moving to another step stops it.
- **Present mode** (🎬 Present button or `P`): a full-window Admin layer with huge Prev / Timer / Next / Reveal buttons, the current question and answer, and easy keys (Space, →/Enter, ←/Backspace, `A`, `R`, `H`, Esc), all listed on screen in a shortcut cheat-sheet (`?` hides or shows it).
- **Answer reveal mode**: a toggle in the Presentation bar (or press `R`) that shows each answer as soon as you reach it while flicking through questions, handy when grading a round. **Reveal answer** still hides/shows manually. The setting is saved with the quiz.
- **Edit mode** switch in the Questions tab: turn it off during the quiz to lock every question control so nothing is changed by accident (remembered per computer).
- **Question presentation** switches in the Effects tab, saved with the quiz: go straight from question to question instead of returning to the leaderboard each time, and/or show multiple-choice questions together with their options in one step instead of question first, options second. Changing them keeps you on the same question.

### Changed
- The default colour scheme is now navy blue (previously indigo): background, panels, lines, muted text and the default crest. Saved custom branding is unaffected.

### Fixed
- The Confetti amount dropdown in the Effects tab was stretched tall.

## [1.2.0] - 2026-10-02

### Added
- **Written-answer questions**: a question can be multiple choice (four options) or a written answer with an optional model answer. Written questions show only the question on the big screen; **Reveal answer** then shows the model answer.
- **Penalties & bonuses**: in the Scoring tab, give any team penalty or bonus points with a reason (e.g. penalise a cheat, reward whoever spotted it). They count towards the total and ranking, are announced on the big screen with the reason, can be undone or removed, and are saved with the quiz.
- **Answer media**: attach an image/GIF URL or YouTube link to a question; it expands over the leaderboard when the answer is revealed.

### Fixed
- The `admin-branding.png` documentation screenshot showed the Effects tab; it now shows the Branding tab.

### Changed
- Saved quizzes from 1.1.0 and earlier load unchanged: questions without a type are multiple choice, and quizzes without adjustments simply have none.
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
- Launcher, Admin and Leaderboard windows in one Electron app.
- Persistent quiz state with autosave, export/load, clear scores, reset and automatic backups.
- Animated leaderboard: race board with per-round segments, rank changes, confetti and a "new leader" banner.
- Fun stats: round winners, biggest climber, lead changes, gap at the top, wooden spoon, best/toughest rounds.
- Configurable rules overlay and per-round questions (four options each) presented as a slideshow with answer reveal.
- Configurable branding: name, default title, colours, crest, wordmark and window icon, with preset import/export.
- Sample quiz in `examples/sample-quiz.json`.

[Unreleased]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/releases/tag/v1.0.0
