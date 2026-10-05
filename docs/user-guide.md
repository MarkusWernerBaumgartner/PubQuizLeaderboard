# User guide

This guide walks through running a quiz night from first launch to final scores.

## The three windows

- **Launcher** – appears on start. Choose **Leaderboard** (the big-screen display) or **Admin** (your control panel). If several displays are connected, pick which one the Leaderboard opens on; it defaults to a non-primary screen so it lands on the projector.
- **Admin** – where you configure and score the quiz. Everything you change appears on the Leaderboard immediately.
- **Leaderboard** – the audience-facing display. It needs no interaction; you drive it from Admin.

Both windows belong to the same running app, so there is no server or network setup. **F11** toggles fullscreen in any window and **Esc** leaves fullscreen. **Ctrl +** / **Ctrl −** / **Ctrl 0** (⌘ on Mac) zoom the focused window in, out and back to 100%; Settings → *Screen size* does the same for each window (handy for making the Leaderboard bigger on a large screen). Zoom is saved per window on this computer.

## Before the night: set up

### Setup tab
Set the quiz **title** (shown on the Leaderboard) and the **rounds**: how many, their names, and an optional **max score** per round (`0` means no limit). When a max is set, scores above it are rejected. Removing a round that already has scores asks for confirmation.

### Rules tab
Edit the list of rules shown on the big screen. Add rules with the input at the bottom, reorder with ▲▼, remove with ✕. The **Show rules** switch (also available as the *Rules* button in the bottom bar) covers the Leaderboard with an animated rules screen; turn it off to reveal the scoreboard. A fresh quiz starts with rules showing.

The rules screen shows **5 rules per page** so they can be large: with 6 or more rules you get *Page 1*, *Page 2*, … (numbering carries on, so page 2 starts at 6). While the rules are showing, **Page 1 / Page 2** buttons appear next to *Rules* in the bottom bar, and `[` / `]` switch pages from the keyboard. Switching the rules on always starts at page 1. If a page is still too crowded (very long rules) the text shrinks to fit.

### Questions tab (optional)
The **Edit mode** switch at the top locks all question controls when turned off, so nothing gets changed by accident while you present. It is remembered on this computer and is on by default.

For each round you can add questions of two kinds (use **+ Multiple choice** / **+ Written answer**, or switch a question's type with the buttons under its text):

- **Multiple choice** – the question text and exactly four options (A–D). Tick the radio button next to the correct option if you want to use **Reveal answer**.
- **Written answer** – just the question text, plus an optional model answer that appears when you press **Reveal answer**. Teams write their answers on paper; there is no options step for these.

Questions are shown on the big screen as a slideshow (see below). To skip straight to one, press the **▶ Q1** button at the start of its card: the Leaderboard jumps to that question (hiding the Home page or rules if they were showing). It keeps working when Edit mode is off. Optionally add **Answer media** to either kind of question: an `https://` link to an image or GIF (`.png .jpg .gif .webp …`), a `file:///…` link to an image file on this computer, or a YouTube link. When you press **Reveal answer** the media slides in from the left over the leaderboard (YouTube videos autoplay), with the answer panel still visible on the right; it closes again when you un-reveal or move on. Needs an internet connection.

**Presentation options** (top of the Questions tab):

- **Section page before each round** adds a full-screen page with the round's name (and its question count) before the round's first question, in normal and Answer reveal mode. It is a deliberate stop: nothing is ever revealed on it, so when you flick through answers in Answer reveal mode you pause at each round boundary instead of running straight into the next round's answers. With *Return to the leaderboard between questions* on, the leaderboard follows the section page, so you can read the round's questions out yourself before using any reveal; with it off (or in Answer reveal mode with the option below) the first question follows directly. Press Next to start the round.
- **Answer reveal mode: don't return to the leaderboard** drops the leaderboard steps between questions, but only while Answer reveal mode is on. Normal presenting keeps its usual flow (and the Effects tab's *Return to the leaderboard between questions* switch still applies there).

Switching either option keeps you on the same question.

**Presenter notes** – every question (either kind) has an optional **🗒 Presenter notes** box for things only you should see: a source, a fun fact, a follow-up. When you reveal the answer the notes pop up on the Admin screen (and in present mode), and they go away when you hide the answer or move on. They are never shown on the Leaderboard.

### Teams tab
Add teams one at a time (type a name and press Enter) or paste a list, one name per line. Names must be unique (case-insensitive). Each team gets a colour automatically. Removing a team that has scores asks for confirmation.

### Branding tab: make it yours
Put your event's identity on every screen. Open **Admin → ⚙ Branding** (or the *Branding settings* link on the launcher); changes apply live to all open windows.

![Branding tab](media/admin-branding.png)

- **Identity** – the app/event name (launcher and window titles) and the **default quiz title** used for new and reset quizzes.
- **Images** – a **crest/logo** (Launcher, Leaderboard header, rules screen), an optional wide **wordmark** (launcher and rules screen) and the **window icon**. Use *Use default* or *Remove* to go back.
- **Colours** – background, lines and buttons, four accents, text and muted text. The tab warns about low contrast; a projector washes colours out, so favour strong contrast.
- **Presets** – *Export preset…* saves your identity to a folder, *Import preset…* loads one, so you can swap identities between events. *Reset to default* restores the neutral theme.

Branding is stored separately from the quiz, so *Reset everything* never touches it. All the details (colour tokens, preset format) are in [Branding](branding.md).

![The theme changing live](media/theming.gif)

## During the night

### Scoring tab
Pick a round with the round buttons (a ✓ means every team has a score for it), then type each team's score. **Enter** saves and moves to the next team. Clearing a box removes that score. Invalid input (letters, negatives, above the round's max) is rejected and the box shakes. **Undo** in the header reverts the last score change (up to 500 changes).

### Penalties and bonuses
Below the scores, **Penalties & bonuses** lets you adjust any team's total outside the rounds: choose the team, type the number of points, add a reason, then press **🚨 Penalty** (subtracts) or **🎁 Bonus** (adds). Use it to punish a cheat and reward whoever spotted it. Each adjustment is announced on the big screen with its reason (the screen shakes for a penalty, confetti for a bonus), a penalised team gets a ⚠ beside its name, and bonus points show as a gold block on its bar. Totals may go below zero. Undo reverts the latest adjustment; ✕ next to an entry in the list removes it. **Clear scores** also clears adjustments.

On the Leaderboard, each change animates: the bar grows, the total counts up, teams re-order, a "+N" chip floats up, and when a team takes the lead or a round is completed there is confetti and a banner.

![Score updates](media/score-update.gif)

### Presenting questions
The bar at the bottom of Admin steps through the questions like a slideshow:

`board → question → question + options → board → next question …`

(Written-answer questions skip the options step: `board → question → board → …`.)

The flow is configurable under **Effects → Question presentation** (saved with the quiz): switch off *Return to the leaderboard between questions* to go straight from question to question (the leaderboard still appears after the last one), and/or switch off *Show the question first, then the options* to show each multiple-choice question together with its options in one step.

Use **Prev / Next**, the arrow keys, or Space (when no text box is focused). The dots show your position; click one to jump. On a question step the Leaderboard slides the scoreboard into the left two-thirds and shows the question on the right; the next step reveals the four options. **Reveal answer** highlights the correct option, or, for a written question, shows the model answer on the question step. The Leaderboard window also accepts ← → Space PageUp PageDown if you want to drive it directly.

**Answer reveal mode** (the *Answer reveal mode* button in the bottom bar, or press `R` when no text box is focused) makes every answer appear the moment you reach it: the options step of a multiple-choice question, or the question step of a written one. It is meant for grading a round: switch it on and flick through the questions. **Reveal answer** still hides or shows the current answer by hand, and the mode is saved with the quiz.

### Present mode and the question timer
For the part of the night where you only step through questions and answers, press **🎬 Present** in the Admin header (or `P`). A full-window layer shows the current step and the question (never the answer; that only appears for everyone when you reveal it), and huge buttons: **Prev**, **Start timer**, **Next**, **Reveal answer** and **Answer reveal mode**.

| Key | Action |
| --- | --- |
| `Space` | Start / stop the question timer |
| `→` or `Enter` | Next step |
| `←` or `Backspace` | Previous step |
| `A` | Reveal / hide the answer |
| `R` | Answer reveal mode on / off |
| `H` | Home page on / off |
| `[` / `]` | Rules page back / forward |
| `?` | Show / hide the on-screen shortcut list |
| `Esc` or `P` | Leave present mode |

**Coming up.** A strip under the title lists the next steps by round and question number only (e.g. *R2 · Q3 question*), or *Section · R2* and *Leaderboard*, never the question or answer text, so you can see what is ahead and navigate; click a chip to jump there. Colours: purple = leaderboard, teal = section page, blue = question, gold = the answer appears when you press Reveal, coral = the answer shows by itself (Answer reveal mode). Two pills count the steps until the next leaderboard and the next answer, and say whether that answer shows by itself or needs Reveal.

The same list is always shown at the bottom of present mode (press `?` to collapse it). `H` also works in normal Admin.

The timer counts down on the Leaderboard (big, bottom-right, amber in the last 10 seconds, red in the last 5, "Time!" at zero). Its length (default 45 s, 5–600) is set in the field at the top of present mode and is saved with the quiz. Moving to another step stops the timer. Outside present mode Space still means *Next*.

![Question slideshow](media/question-slideshow.gif)

### Starting the night with the Home page
Switch on **🏠 Home** (bottom bar, or press `H`) to cover the Leaderboard with a full-screen page of your logo (or wordmark) and the quiz title, with the launcher's pop-in and wobble animations over drifting shapes. Show it on the projector while people arrive, then switch it off to reveal whatever is underneath: the rules, or the board. It uses your [branding](branding.md) and is off in a fresh quiz.

### Starting the night with the rules
Turn on **Rules** (header of the Rules tab or the bottom bar) before you begin. The rules appear one by one; turn it off to reveal the leaderboard.

![Rules intro](media/rules-intro.gif)

## Animations and celebrations

Confetti, banners, pulses, sliding bars and the other motion are all optional. Open **Admin → ✨ Effects**, pick a preset (Party, Calm, Minimal, Off) or switch individual effects, and use the Preview buttons to try a celebration on the Leaderboard. The confetti amount is adjustable, and by default the app also follows your computer's "reduce motion" setting. Error messages and "are you sure?" confirmations are always shown. Settings are per computer and are kept when you reset or load a quiz. See [Animations, celebrations & popups](effects.md) for the full list.

![Effects tab](media/admin-effects.png)

## What the Leaderboard shows

- **Race board** – teams ordered by total. Tied teams share a rank (1, 1, 3…). The bar is split into one coloured segment per round. Arrows show places gained or lost since the previous scored round. 👑 marks the leader and 🥄 the wooden spoon (last place, when unique).
- **Stats cards** – rotating every nine seconds: round winners, biggest climber, lead changes, gap between first and second, wooden spoon, and each team's best and toughest rounds.
- **"After Round N"** – a chip showing the most recent round with scores.

## Saving and loading

**You never have to press save.** Every change is written to disk the moment you make it, atomically (a crash can't leave a half-written file), to the app's working copy, `quiz.json` in the app's data folder (below). Close the window, kill the app or lose power: reopen it and the quiz is exactly as you left it.

The **data folder** is:

| System | Location |
| --- | --- |
| Linux | `~/.config/pubquiz-scoring/` |
| macOS | `~/Library/Application Support/pubquiz-scoring/` |
| Windows | `%APPDATA%\pubquiz-scoring\` |

It holds `quiz.json`, `branding.json` and `branding-assets/`, `settings.json` (your [effects](effects.md) preferences), `session.json` and `backups/`.

### Autosaving to a file of your choice
For a file you can keep, back up or move to another machine, use **Data → Save quiz as…**. The quiz is written to the file you choose, and from then on **every change is autosaved to it too**. The same happens when you **Load** a file: afterwards your changes flow back into that file.

The chip at the top of Admin shows what is happening:

| Chip | Meaning |
| --- | --- |
| 💾 Autosaved on this computer | Only the working copy is being saved |
| 💾 friday-quiz.json · saved 19:42:07 (green) | Every change is also written to that file; hover for the full path |
| ⚠ Not saved to friday-quiz.json (red) | The file can't be written (for example a USB stick was removed). The quiz carries on and the working copy still saves; plug it back in and the next change catches the file up |

### The Data menu

| Action | What it does |
| --- | --- |
| Save quiz as… | Write the quiz to a file now and keep it autosaved |
| Load quiz… | Replace the current quiz with a file (validated first; the current quiz is backed up) and autosave back to that file |
| Export a copy… | Write a standalone snapshot; does not change where autosave goes |
| Stop autosaving to file | Unlink the file (the working copy keeps saving) |
| Clear all scores | Remove scores, keep teams, rounds, rules and questions |
| Reset everything | Back to a fresh quiz (your [branding](branding.md) is kept) |

Clearing, resetting and loading first write a timestamped backup to the `backups/` folder in the data folder. A file that isn't a valid quiz is rejected with a message and nothing changes. If the working copy is ever corrupt, the app keeps it as `quiz.corrupt-*.json` and starts fresh.

To try things out, load [`examples/sample-quiz.json`](../examples/sample-quiz.json): eight teams, five rounds (three already scored) and a handful of questions. Files inside the app's own folder, like this sample, are loaded but never written to; use **Save quiz as…** to make your own copy.

## Tips

- Do a dry run: load the sample quiz, open the Leaderboard on the projector, and enter a few scores.
- Keep the Admin window on your laptop and the Leaderboard fullscreen on the projector; the two never need to be on the same screen.
- Set up *Branding* first (see above), then save it as a preset to reuse next time.
- If the venue dislikes flashing or noise, choose the **Calm** or **Minimal** effects preset before the night.
- For a safety copy, use **Save quiz as…** to a USB stick or synced folder and check that the Admin chip stays green.
