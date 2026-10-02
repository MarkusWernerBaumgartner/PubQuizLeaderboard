# Contributing

Thanks for helping! Bug reports and pull requests are welcome.

1. Fork and clone, then `npm install` and `npm start`.
2. Make your change with tests where it touches `src/shared/` (see [Development](docs/development.md)).
3. Run `npm run verify` – this is what CI runs.
4. Add a line under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md) for user-visible changes.
5. Open a pull request describing what changed and why. Screenshots or a short GIF help for UI changes (`npm run media` regenerates the README media).

Please do not commit brand artwork, personal presets or saved quiz data; the hygiene check will fail the build.
