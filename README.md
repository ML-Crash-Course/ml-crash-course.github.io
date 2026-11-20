# math4.ai

Interactive, Brilliant-style lessons on the mathematics behind machine learning. Static site, no build step.

## Open it

- Double-click `index.html` (works from `file://`), or
- serve the folder: `python3 -m http.server 8000` and open http://localhost:8000

An internet connection is needed once for KaTeX and the Inter font (cdnjs / Google Fonts); without it formulas show as raw text.

## Layout

- `index.html` loads KaTeX, `assets/app.css`, `assets/app.js` (framework, global `M4`), `assets/modules.js` (manifest), then `lessons/<id>.js`.
- Each lesson file calls `M4.lesson({...})` once. A missing lesson file shows as "coming soon".
- Routes: `#/` home, `#/m/<moduleId>` module, `#/l/<lessonId>` lesson player.
- Progress, XP and streak are stored in `localStorage` (key `m4-progress-v1`); "Reset progress" is in the footer.
