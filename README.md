<div align="center">

# 🍻 Pub Quiz Scoring System

**Run a pub quiz that looks like a TV game show.**<br>
Score from your laptop, watch the leaderboard race, confetti and all, on the big screen.

[![CI](https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/MarkusWernerBaumgartner/PubQuizLeaderboard?label=version&color=1a5aa8)](CHANGELOG.md)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-4ecdc4.svg)](LICENSE)
![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20Windows%20%7C%20macOS-ffc83d)
![Electron](https://img.shields.io/badge/built%20with-Electron-a78bfa)

<img src="docs/media/leaderboard.png" alt="The animated leaderboard" width="100%">

</div>

---

## ✨ What it does

### 🏁 A leaderboard that actually races
Type a score on your laptop and the big screen reacts instantly: bars stretch, totals count up, teams swap places, and a 👑 moves to the new leader, with confetti when the lead changes.

<img src="docs/media/score-update.gif" alt="Scores being entered and the leaderboard re-ordering with confetti" width="100%">

### 🧠 Questions, like a slideshow
Add questions with four options per round, then click through them from Admin: **board → question → question + options → board → …** The scoreboard slides aside to make room, and **Reveal answer** lights up the right one.

<img src="docs/media/question-slideshow.gif" alt="Question slideshow with answer reveal" width="100%">

### 📜 Rules that read themselves out
Start the night with an animated rules screen (fully editable), then flip a switch to reveal the scoreboard.

<img src="docs/media/rules-intro.gif" alt="Animated rules screen" width="100%">

### 🎨 Make it yours in 30 seconds
Your name, your logo, your colours, your window icon: all from the **Branding** tab, applied live to every screen. Save the result as a preset and swap identities for different events.

<img src="docs/media/admin-branding.png" alt="The Branding settings tab" width="100%">

<img src="docs/media/theming.gif" alt="The theme changing live" width="100%">

### 🎚️ Dial it up or down
Not every venue wants confetti. Every animation, banner and celebration has its own switch in the **Effects** tab, with one-click presets (Party / Calm / Minimal / Off), a confetti-amount control and preview buttons. It also respects your computer's "reduce motion" setting.

<img src="docs/media/admin-effects.png" alt="The Effects settings tab" width="100%">

### 🛟 Built so you can't lose the night
Every score is saved the instant you type it, so closing the window or pulling the plug loses nothing. Use **Data → Save quiz as…** (or **Load quiz…**) and every change is also autosaved to a file of your choice (a USB stick, a synced folder), with a live status chip showing when it last saved, or a red warning if the file can't be written.

---

## 🖥️ Three windows, one app

| Launcher | Admin |
| :---: | :---: |
| <img src="docs/media/launcher.png" alt="Launcher" width="100%"> | <img src="docs/media/admin-scoring.png" alt="Admin scoring tab" width="100%"> |
| Pick the big-screen **Leaderboard** or the **Admin** panel. The leaderboard can open fullscreen on the projector. | Set up rounds, rules, questions and teams, then enter scores. **Enter** jumps to the next team; **Undo** has your back. |

<details>
<summary><b>More screenshots</b></summary>
<br>

<img src="docs/media/leaderboard-question.png" alt="Leaderboard with a question and revealed answer" width="100%">
<img src="docs/media/rules.png" alt="Rules screen" width="100%">
<img src="docs/media/admin-questions.png" alt="Question editor" width="100%">
</details>

## 🚀 Quick start

**Download** the build for your system from the [Releases](https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard/releases) page:

| System | File | How to run |
| --- | --- | --- |
| 🐧 Linux | `PubQuizScoring-<version>-linux.AppImage` | `chmod +x` it and run it |
| 🪟 Windows | `PubQuizScoring-Setup-<version>.exe` (installer) or `…-portable.exe` | Run it. If SmartScreen warns, choose *More info → Run anyway* |
| 🍎 macOS | `PubQuizScoring-<version>-mac-arm64.dmg` (Apple Silicon) or `…-mac-x64.dmg` (Intel) | Drag to Applications. If macOS blocks it, right-click → *Open* (or run `xattr -dr com.apple.quarantine "/Applications/Pub Quiz Scoring.app"`) |

> The builds are not code-signed, which is why Windows and macOS show a warning the first time.

**Or run from source** (Node.js 20+, any of the three systems):

```bash
git clone https://github.com/MarkusWernerBaumgartner/PubQuizLeaderboard.git
cd PubQuizLeaderboard
npm install
npm start
```

### Try it in 60 seconds
1. Launch the app → **Admin** → **Data → Load quiz…** → choose `examples/sample-quiz.json`.
2. Launch the **Leaderboard** (drag it to your second screen and press **F11** for fullscreen).
3. In Admin → **Scoring**, pick *Science & Nature* and type some scores. Watch the screen. 🎉
4. Use **Next ▶** at the bottom to step through the questions.

## 📚 Documentation

| | |
| --- | --- |
| 📖 [User guide](docs/user-guide.md) | Run a quiz night, step by step |
| 🎨 [Branding](docs/branding.md) | Colours, logos, presets |
| 🎚️ [Effects](docs/effects.md) | Every animation and popup, and how to switch it off |
| 🏗️ [Architecture](docs/architecture.md) | How it's built |
| 🛠️ [Development](docs/development.md) | Tests, CI, regenerating these GIFs, releases |
| 📝 [Changelog](CHANGELOG.md) | What changed in each version |

## 🧰 Under the hood

Electron with plain HTML/CSS/JS (no framework, no bundler). All game logic is a small pure module with a full unit-test suite, and CI runs the real app headlessly, including a test that kills it mid-quiz and checks that nothing was lost. Everything stays on your machine, in the app's data folder (see the [user guide](docs/user-guide.md#saving-and-loading)); there's no server, account or network access.

```bash
npm test          # unit tests
npm run verify    # what CI runs: tests + version + hygiene checks
npm run dist      # build the AppImage
npm run media     # regenerate the screenshots & GIFs above
```

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 Licence

MIT, see [LICENSE](LICENSE). Bundled fonts (Fredoka, Nunito) are under the SIL Open Font Licence; texts in `src/renderer/assets/fonts/`.
