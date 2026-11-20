# 吉他维修英语 · 随身课

Static pocket course for a guitar repair bench. Day 1 through Day 31 (Day 31 is Fret Sprout / 品丝端冒出). No login. Lessons are bundled in the page.

Live site: https://vinjam0629.github.io/jam-guitar-english/

This is a GitHub Pages **project** site. The Vite `base` is `/jam-guitar-english/` so scripts and styles load under that path.

## Local

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/jam-guitar-english/`.

## Pages

Pushes to `main` run `.github/workflows/pages.yml`, which builds `dist/` and deploys it with GitHub Actions. The phone remembers the last day in `localStorage` (`jam-guitar-english:lastDay`), and opens Day 31 when nothing is saved yet.
