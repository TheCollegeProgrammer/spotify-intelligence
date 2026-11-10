# Spotify Intelligence

A premium analytics workspace for exploring Spotify streaming data across five markets: Brazil, India, Mexico, the United Kingdom, and the United States.

The project combines a Python scraping and cleaning pipeline, Jupyter notebooks, cleaned CSV datasets, and a React dashboard with six analytical views.

> **Important:** this is a demo/teaching dataset. Yearly totals are mirrored, monthly values repeat a two-level 1.25x pattern, and many tracks appear in only one market. Do not present the values as real organic listening behaviour. See [DATASET.md](DATASET.md) for the full integrity analysis.

---

## Overview

Spotify Intelligence turns 36,000 scraped country/month/track rows into an interactive dashboard for:

- market comparison and track overlap;
- artist and track leaderboards;
- catalogue reach and exclusivity;
- monthly recorded-value patterns;
- data-quality and provenance inspection;
- reproducing the original notebook's growth-analysis bug.

The dashboard is entirely client-side. There is no backend, authentication layer, or external API dependency at runtime.

---

## Dashboard features

### Six views

| View | Purpose |
|---|---|
| **Overview** | Executive KPIs, market trend, distribution, top artists/tracks, market snapshot |
| **Countries** | Market cards, comparative trends, overlap matrix, market-only catalogue |
| **Artists** | Artist cards, searchable leaderboard, reach and catalogue depth |
| **Songs** | Track charts, reach distribution, searchable track leaderboard |
| **Growth & Insights** | What the data can and cannot support, broad-reach analysis, dataset Q&A |
| **Data Quality** | Integrity checks, pipeline health, findings, methodology, notebook replica |

### Interactions

- Global filters: year, countries, months, artist, track, and top-N.
- Search, sorting, and pagination in artist and track tables.
- Country comparison selection and a 5x5 track-overlap matrix.
- Country, artist, and track profile modals.
- Command palette (`Ctrl/Cmd + K`) for navigation and search.
- Dark and light themes with persisted preference.
- Filtered CSV export.
- Chart PNG download and fullscreen chart mode.
- Hash-based routing (`#/overview`, `#/countries`, etc.).
- Responsive sidebar and mobile layout.

---

## Tech stack

### Dashboard

- React 19
- Vite 6
- Chart.js 4
- lucide-react
- Plain CSS design system with dark/light tokens

### Data pipeline

- Python
- pandas
- Jupyter notebooks
- Playwright-based scraping notebooks

### Build behaviour

Vite is configured with `vite-plugin-singlefile`, which inlines JavaScript and CSS into one `dist/index.html` file. This keeps the production dashboard portable as a single file.

---

## Repository layout

```text
.
|-- dashboard/
|   |-- src/
|   |   |-- App.jsx                 # Application orchestration
|   |   |-- main.jsx                # React entry point
|   |   |-- styles.css              # Base design system
|   |   |-- react.css               # React-specific overrides
|   |   |-- components/
|   |   |   |-- layout/             # Sidebar, topbar, filters, command palette
|   |   |   |-- modals/             # Country, artist, track, notebook modals
|   |   |   |-- ui/                 # Charts, tables, cards, entity visuals
|   |   |   `-- views/              # Six dashboard views
|   |   |-- data/
|   |   |   |-- dataset.json        # Vite data source
|   |   |   `-- dataset.js          # Dataset exports and constants
|   |   |-- hooks/                  # Filters, theme, hash routing
|   |   `-- lib/                    # Charts, model aggregation, formatting
|   |-- assets/                     # Fonts and legacy vendor bundles
|   |-- data.js                     # Legacy dashboard data bundle
|   |-- app.js                      # Legacy vanilla dashboard
|   |-- prepare_data.py             # Builds the legacy data bundle from CSVs
|   |-- index.html
|   |-- vite.config.js
|   `-- package.json
|-- Old_CSVs/                       # Pre-cleaning source CSVs
|-- demo testing/                   # Early experimental India samples
|-- 2025-India-Data/                # Empty placeholder
|-- Step_1_Scrapping.ipynb          # Scraping workflow
|-- Step_2_cleaning.ipynb           # Mojibake cleanup and CSV export
|-- Step_3_Transform_&_EDA.ipynb    # Transformations and EDA
|-- making job done.ipynb           # Original six-chart analysis
|-- top5_countries_monthly_2023_clean.csv
|-- top5_countries_monthly_2024_clean.csv
|-- top5_countries_monthly_2025_clean.csv
|-- DATASET.md                      # Detailed dataset documentation
`-- PROJECT.md
```

---

## Dataset at a glance

| Metric | Value |
|---|---:|
| Rows | 36,000 |
| Markets | 5 |
| Months | 36 |
| Unique tracks | 873 |
| Unique artists | 454 |
| Null cells | 0 |
| Duplicate keys | 0 |

Each row represents one track by one artist in one country in one month.

```text
country, month, track, artist, monthly_streams
```

### Critical caveats

- Every yearly file totals exactly **7,340,879,910,728**.
- Every `(country, track)` pair has exactly two distinct monthly values.
- All 1,000 pairs follow the same **1.25x** ratio.
- Only one track appears in all five markets.
- 761 of 873 tracks appear in only one market.
- The original notebook's "highest growth" result compares consecutive rows from different countries, not the same market over time.

These are deliberate parts of the dataset documentation, not rendering bugs.

---

## Run the dashboard locally

Requirements: Node.js and npm.

```bash
cd dashboard
npm install
npm run dev
```

Vite prints the local development URL (typically `http://localhost:5173`).

### Production build

```bash
cd dashboard
npm run build
npm run preview
```

The production build is written to:

```text
dashboard/dist/index.html
```

Because `vite-plugin-singlefile` inlines assets, the built HTML can be opened directly in a browser in most environments.

---

## How the dashboard works

```text
dataset.json
    |
    v
useFilters -> filterRows -> buildModel
    |                         |
    |                         +--> country / artist / track aggregates
    |                         +--> monthly series and reach counts
    v
App.jsx
    |
    +--> layout components (sidebar, topbar, filter bar, command palette)
    +--> six views
    +--> country / artist / track modals
    +--> chart cards and tables
```

Key responsibilities:

- `src/lib/model.js` filters rows and builds all aggregates.
- `src/lib/charts.js` creates themed Chart.js configurations.
- `src/lib/format.js` handles number, percentage, month, CSV, and pagination helpers.
- `src/hooks/useFilters.js` owns the global filter state.
- `src/hooks/useTheme.js` persists dark/light mode.
- `src/hooks/useHashRoute.js` maps hash routes to views.
- `src/App.jsx` connects state, navigation, modals, exports, and toasts.

---

## Rebuilding the data bundle

The legacy bundle is generated from the three cleaned yearly CSVs:

```bash
cd dashboard
python prepare_data.py
```

This writes `dashboard/data.js` for the legacy vanilla dashboard.

The React app reads `dashboard/src/data/dataset.json`. If the source CSVs change, regenerate both the JSON data source and the legacy bundle before rebuilding the dashboard.

---

## Documentation

- [DATASET.md](DATASET.md) — schema, provenance, row counts, data-quality findings, and notebook analysis.
- [PROJECT.md](PROJECT.md) — this project overview, architecture, and run instructions.

---

## Repository

- GitHub: [TheCollegeProgrammer/spotify-intelligence](https://github.com/TheCollegeProgrammer/spotify-intelligence)
- Source data: kworb.net Spotify country charts
