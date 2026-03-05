# Turn1Visuals Website

F1 visual content brand website. Built with Astro 5, Tailwind 4, deployed to GitHub Pages.

**Live site:** https://turn1visuals.com

---

## Tech Stack

- **Astro 5** — static site generator
- **Tailwind 4** — layout utilities only
- **astro-icon** + simple-icons — social icons
- **GitHub Actions** — automatic deploy on push to `main`
- **Cloudflare Worker** — Twitch live status proxy

---

## Local Development

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # production build to ./dist/
npm run preview    # preview production build locally
```

---

## Project Structure

```
/
├── public/
│   ├── images/          # hero background, visual images
│   ├── logo/            # icon_white-red.svg, long_white-red.svg, etc.
│   └── fonts/gotham/    # self-hosted Gotham woff2 files
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── MinimalLayout.astro
│   ├── pages/
│   │   ├── index.astro      # homepage
│   │   ├── about.astro
│   │   ├── twitch.astro     # live timing page
│   │   ├── linkinbio.astro  # link-in-bio page
│   │   └── privacy.astro
│   └── styles/
│       └── global.css       # CSS custom properties / design tokens
└── workers/
    ├── twitch-status.js     # Cloudflare Worker source
    └── wrangler.toml
```

---

## Design Tokens

Defined in `src/styles/global.css`:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#111111` | Page background |
| `--color-surface` | `#1a1a1a` | Cards, header, footer |
| `--color-border` | `#2a2a2a` | Borders |
| `--color-text` | `#ffffff` | Primary text |
| `--color-muted` | `#888888` | Secondary text |
| `--color-accent` | `#e10600` | Red accent (F1 red) |
| `--font-display` | Gotham / Oswald | Headings, labels |
| `--font-body` | Inter | Body text |

---

## Deployment — GitHub Pages

### How to push changes and update the live site

Every push to the `main` branch automatically triggers a build and deploy via GitHub Actions. There is no manual deploy step needed.

```sh
# Stage the files you changed
git add src/pages/index.astro src/components/Header.astro   # (list specific files)

# Or stage everything
git add -A

# Commit with a message
git commit -m "Your change description"

# Push — this triggers the GitHub Actions deploy
git push
```

After pushing, go to **GitHub → Actions** tab to watch the build. The live site at https://turn1visuals.com updates within ~1–2 minutes once the workflow completes.

### One-time repo setup (already done)

1. GitHub → Settings → Pages → Source: **GitHub Actions**
2. `public/CNAME` contains `turn1visuals.com`
3. `astro.config.mjs` → `site: 'https://turn1visuals.com'`

### Checking deploy status

```sh
# View recent workflow runs
gh run list --limit 5

# Watch a specific run
gh run watch
```

---

## Cloudflare Worker — Twitch Live Status

The worker proxies Twitch API calls so credentials stay server-side.

**Worker URL:** `https://twitch-status.super-paper-b4d7.workers.dev`

**Deploying the worker:**
```sh
cd workers
npx wrangler deploy
```

**Required secrets** (set once in Cloudflare dashboard → Worker → Settings → Variables → Secrets):
| Secret | Value |
|---|---|
| `TWITCH_CLIENT_ID` | From dev.twitch.tv |
| `TWITCH_CLIENT_SECRET` | From dev.twitch.tv |
| `TWITCH_USER_LOGIN` | `turn1visuals` |

**Allowed origins** (defined in `workers/twitch-status.js`):
- `https://turn1visuals.com`
- `http://localhost:4321`
- `http://localhost:3000`

To add a new allowed origin, edit `ALLOWED_ORIGINS` in `workers/twitch-status.js` and redeploy.

---

## F1 Data — Jolpica API

Session schedule data is fetched client-side from the public Jolpica API (no auth required):

```
https://api.jolpi.ca/ergast/f1/current.json
```

Returns the full season schedule including per-session UTC times (`FirstPractice`, `SecondPractice`, `ThirdPractice`, `SprintQualifying`, `Sprint`, `Qualifying`, and `Race`).

Used on:
- **Homepage** — Next GP section with session cards
- **`/twitch`** — offline state shows next upcoming session

---

## Logos

All logo variants are in `public/logo/`:

| File | Usage |
|---|---|
| `icon_white-red.svg` | Header, footer, favicon |
| `long_white-red.svg` | Hero section |
| `block_white-red.svg` | General use |

White = white text/mark, Red = accent `#e10600`. Black variants available for light backgrounds.

---

## Adding Content

### Hero background image
Replace `public/images/background.png` with a new image. The CSS overlay opacity is set in `src/pages/index.astro` (`.hero` → `linear-gradient(rgba(0,0,0,0.65), ...)`). Adjust the `0.65` value to control darkness.

### Social links
Update URLs in:
- `src/components/Header.astro` (mobile nav)
- `src/components/Footer.astro`
- `src/pages/index.astro` (socials grid)
- `src/pages/linkinbio.astro`

---

## F1 2026 Assets — `/f1-2026-assets`

A viewer for F1 2026 assets (driver portraits, team logos, cars, track outlines, fonts, and more). Live at `https://turn1visuals.com/f1-2026-assets`.

### How it works

The page (`src/pages/f1-2026-assets/index.astro`) reads JSON data files at build time from `public/f1-2026-assets/`. Images are served directly from the F1 media CDN. Fonts and local assets (helmets, flags, logos) are served from `public/f1-2026-assets/assets/` and `public/f1-2026-assets/fonts/`.

### Data files

| File | Contents |
|---|---|
| `public/f1-2026-assets/drivers.json` | Driver profiles, team links, CDN IDs |
| `public/f1-2026-assets/teams.json` | Team names, colours, chassis/PU info |
| `public/f1-2026-assets/schedule.json` | Race calendar with track IDs for CDN images |
| `public/f1-2026-assets/assets.json` | Logos, patterns, misc assets with background colours |
| `public/f1-2026-assets/fonts.json` | F1 font metadata, file paths, weights/styles |

### Updating the data (running the scrapers)

The scrapers live in `public/f1-2026-assets/` and require Python with a local virtual environment.

**One-time setup** (if `.venv` doesn't exist yet):
```sh
cd public/f1-2026-assets
python -m venv .venv
.venv\Scripts\pip install requests beautifulsoup4 fonttools
```

**Run the scrapers** (from `public/f1-2026-assets/`):
```sh
cd public/f1-2026-assets

# Scrape drivers
.venv\Scripts\python.exe scrape_drivers.py

# Scrape teams
.venv\Scripts\python.exe scrape_teams.py

# Scrape schedule
.venv\Scripts\python.exe scrape_schedule.py

# Download fonts  ⚠️ WARNING: this deletes and re-downloads all fonts.
# Only run if fonts are missing or need updating — it can fail mid-way.
.venv\Scripts\python.exe scrape_fonts.py
```

> **Do NOT use `scrape_all.bat`** — it runs `scrape_fonts.py` automatically, which wipes the fonts directory and can leave it incomplete if interrupted. Run the individual scripts instead.

After scraping, commit the updated JSON files:
```sh
git add public/f1-2026-assets/drivers.json public/f1-2026-assets/teams.json public/f1-2026-assets/schedule.json public/f1-2026-assets/assets.json public/f1-2026-assets/fonts.json
git commit -m "Update F1 2026 asset data"
git push
```

### What's NOT committed

The `.gitignore` in `public/f1-2026-assets/` excludes:
- `*.py` — Python scripts
- `*.bat` — batch runner
- `.venv/` — virtual environment

These stay local only. The JSON data files and static assets (fonts, helmets, flags) are committed and served via GitHub Pages.

### Manually correcting data

If a value is missing or wrong (e.g. a track ID), edit the JSON directly:

- **Track ID missing** — set `"track"` in `schedule.json` to the CDN circuit name (e.g. `"melbourne"`, `"shanghai"`, `"silverstone"`)
- **Background colour** — set `"background"` in `assets.json` to a CSS colour value (e.g. `"white"`, `"#ffffff"`, `"#1a1a2e"`)
