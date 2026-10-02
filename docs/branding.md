# Branding

The app's identity is configuration, not code. Open **Admin → ⚙ Branding** (or the *Branding settings* link on the launcher). Changes apply instantly in every open window.

![Branding tab](media/admin-branding.png)

## What you can change

| Setting | Where it appears |
| --- | --- |
| **App / event name** | Launcher (as text when there is no wordmark), rules screen, window titles |
| **Default quiz title** | The starting title for new and reset quizzes. The current quiz's title is edited in the *Setup* tab |
| **Crest / logo** | Launcher, Leaderboard header, rules screen, Admin header |
| **Wordmark** (optional) | Wide logo or lettering next to the crest on the launcher and rules screen. If empty, the app name is shown as text |
| **Window icon** | The window/taskbar icon (PNG or JPG) |
| **Colours** | See below |

Images may be PNG, JPG, SVG or WebP up to 5 MB (the window icon must be PNG or JPG). A light-on-transparent wordmark works best on dark backgrounds.

## Colours

| Token | CSS variable | Used for |
| --- | --- | --- |
| Background | `--bg` | Main background |
| Background (dark) | `--bg-deep` | Bar tracks, panels, edges |
| Background (light) | `--bg-mid` | Glow and cards |
| Lines & buttons | `--line` | Borders, buttons, inactive items |
| Accent 1–4 | `--accent-1` … `--accent-4` | Titles and highlights (1), alerts (2), confirmations (3), round colours 1–4 |
| Text | `--text` | Main text |
| Muted text | `--muted` | Secondary text |

The Branding tab warns when text or titles have low contrast against the background. Choose strong contrast: a projector washes colours out.

![Live theming](media/theming.gif)

## Presets

A **preset** is a folder containing `branding.json` and the image files it names. Use **Export preset…** to save your current identity, and **Import preset…** to load one. **Reset to default** returns to the built-in neutral theme.

```json
{
  "version": 1,
  "appName": "My Pub Quiz",
  "defaultTitle": "Friday Quiz Night",
  "colours": {
    "bg": "#1a1b4b", "bgDeep": "#0c0d2b", "bgMid": "#2d2f7a", "line": "#4c54c9",
    "accent1": "#ffc83d", "accent2": "#ff6b6b", "accent3": "#4ecdc4", "accent4": "#a78bfa",
    "text": "#f6f8ff", "muted": "#a9b0e0"
  },
  "images": { "crest": "crest.png", "wordmark": "wordmark.png", "icon": "icon.png" }
}
```

Invalid values never break the app: unknown keys are ignored, bad colours (anything but `#rrggbb`), blank names and unsafe or oversized image files fall back to the defaults.

## Where it is stored

Branding lives in `~/.config/pubquiz-scoring/branding.json` with images in `branding-assets/`, separate from the quiz data. *Reset everything* never touches it, and none of it is part of the repository. If you publish a fork, keep personal presets and artwork in the gitignored `local/` folder (see [Development](development.md#keeping-personal-data-out-of-git)).
