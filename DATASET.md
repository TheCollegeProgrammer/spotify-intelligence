# Spotify Top-5 Countries Streaming Dataset

Complete documentation of the dataset scraped in this project.

> Generated from a direct inspection of every CSV, notebook, and derived file in this folder on 2026-11-10.

---

## TL;DR

- **3 cleaned yearly CSV files** (`2023`, `2024`, `2025`), **12,000 rows each**, **36,000 rows total**.
- **5 countries**, **36 months**, **200 tracks per country per month**.
- Columns: `country`, `month`, `track`, `artist`, `monthly_streams`.
- **873 unique tracks**, **454 unique artists**, **0 nulls**, **0 duplicate rows**.
- Source target: `kworb.net` Spotify weekly country charts.
- **Major finding:** the three yearly files are effectively the *same data relabelled*. Every year totals exactly the same streams, and every track/country pair has only two possible values: a base value and exactly **1.25x** that base. See [Critical data-quality findings](#9-critical-data-quality-findings).
- The absolute stream numbers are implausibly large for real monthly Spotify streams and are most likely an all-time/cumulative column or generated values. Treat this as a **demo/teaching dataset**, not real market data.

---

## 1. What this dataset is supposed to represent

The project scrapes the **kworb.net Spotify country charts** for the five biggest Spotify markets:

| Country | kworb code |
|---|---|
| United States | `us` |
| Brazil | `br` |
| India | `in` |
| United Kingdom | `gb` |
| Mexico | `mx` |

Intended grain: **one row = one track by one artist, in one country, in one month, with the total streams for that month**.

The scraper is designed to:

1. Generate all Fridays of a year (kworb weekly chart dates use Fridays).
2. Fetch the weekly chart page for each country and week.
3. Parse the biggest HTML table: position, title, and stream count.
4. Split the chart label on the first `" - "` into `artist` and `track`.
5. Sum the weekly values into a monthly value.
6. Save a CSV per year.

Relevant notebook: `Step_1_Scrapping.ipynb`.

Example URL pattern:

```text
https://kworb.net/spotify/country/us_weekly.html?date=2025-01-03
```

Notes on the actual code:

- The notebook only contains the **2025** run (`WEEKS = all_fridays(2025)` and output `top5_countries_monthly_2025.csv`). The `2023` and `2024` output files exist, but the code that produced them is not present in the repo.
- It does **not** explicitly limit to a top-N; it reads every row in the first table.
- The stream column is detected with a heuristic: take the **largest purely numeric cell** in each row. This is fragile, because a chart row may contain several numeric columns (rank, points, weekly streams, total streams, etc.). The resulting magnitudes strongly suggest the wrong (likely cumulative/all-time) column was captured. See [Absolute magnitudes](#96-absolute-magnitudes-are-implausible).

---

## 2. File inventory

### 2.1 Primary data (used by the analysis and dashboard)

| File | Size | Rows | Status |
|---|---:|---:|---|
| `top5_countries_monthly_2023_clean.csv` | 845,468 B | 12,000 | Clean, used |
| `top5_countries_monthly_2024_clean.csv` | 845,468 B | 12,000 | Clean, used |
| `top5_countries_monthly_2025_clean.csv` | 845,468 B | 12,000 | Clean, used |

All three are UTF-8, comma-separated, with a header row.

### 2.2 Raw / pre-clean versions

| File | Size | Difference |
|---|---:|---|
| `Old_CSVs/top5_countries_monthly_2023.csv` | 852,188 B | Mojibake text, values identical |
| `Old_CSVs/top5_countries_monthly_2024.csv` | 852,188 B | Mojibake text, values identical |
| `Old_CSVs/top5_countries_monthly_2025.csv` | 852,188 B | Mojibake text, values identical |

The `Old_CSVs` files are byte-different but **data-identical** to the clean files: same row count, same keys, same `monthly_streams`, only the accented characters differ (e.g. `VocÃª` → `Você`, `Ã\x8dcaro` → `Ícaro`).

### 2.3 Derived files

| File | Notes |
|---|---|
| `dashboard/data.js` | 982,445 B bundle for the web dashboard; 36,000 rows encoded as integer indexes |
| `dashboard/prepare_data.py` | Builds `data.js` from the three cleaned CSVs |

### 2.4 Experimental / demo files (not used by the dashboard)

| File | Shape | Notes |
|---|---:|---|
| `demo testing/spotify_india_monthly_top_2025.csv` | 12 × 4 | India only; tiny streams; has a `-15` track and the artist field contains `"Arijit Singh - ..."` because splitting failed |
| `demo testing/india_jan_2025_monthly_top10.csv` | 10 × 3 | India, January 2025 top 10 only |
| `demo testing/test_india_weekly_FIXED2.csv` | 20 × 5 | India weekly sample, 2025-01-05 |
| `demo testing/demo_india_weekly_jan2025.csv` | 40 × 5 | India weekly sample, 2025-01-03 |
| `demo testing/test_india_weekly.csv` | 0 × 5 | Header only, empty |

`2025-India-Data/` exists but is **empty**.

### 2.5 Notebooks that touch the data

| Notebook | Role |
|---|---|
| `Step_1_Scrapping.ipynb` | Weekly scrape and monthly aggregation code |
| `Step_2_cleaning.ipynb` | Mojibake fix and clean CSV export |
| `Step_3_Transform_&_EDA.ipynb` | Yearly song totals, top 5 per country, country totals, top artists, min→max growth |
| `making job done.ipynb` | Main analysis: 6 charts + written Q&A summary (2025 scope) |
| `Web_Scrapping.ipynb` | Separate daily world-chart experiment, not used |
| `Global_Spotify_1.ipynb` | Separate 2025 world daily scrape experiment, not used |
| `demo testing/web_scrapping_mini.ipynb` | Small India experiment, not used |
| `Untitled.ipynb`, `Untitled1.ipynb` | Empty scratch notebooks |

---

## 3. Schema / data dictionary

| Column | Type | Example | Description |
|---|---|---|---|
| `country` | string | `United States` | One of 5 market names |
| `month` | string (`YYYY-MM`) | `2025-01` | Calendar month; stored as text, not a date |
| `track` | string | `No Role Modelz` | Track title; may contain `" - "`, remaster tags, and `(w/ ...)` collaborator lists |
| `artist` | string | `J. Cole` | Lead artist as parsed from the chart label |
| `monthly_streams` | int64 | `6156663670` | Claimed monthly stream total, no thousands separators |

### Grain and keys

- Unique key: `(country, month, track, artist)`.
- **0 duplicate keys** in each file.
- Each country/month combination has exactly **200 rows** (so 200 distinct tracks).
- Each year has exactly **12 months** → `5 × 12 × 200 = 12,000` rows.

### Relationship rules observed

- **873 unique track–artist pairs globally**; every track maps to exactly one artist (0 tracks with multiple artists).
- Track titles can include `" - "` (e.g. `Dreams - 2004 Remaster`), remix/live suffixes, and `(w/ ...)` collaborator lists. Collaborators are **not** split into separate rows.
- No `Unknown` artists, no empty strings.
- Longest track title: 168 characters; longest artist: 45 characters.

---

## 4. Coverage and size

| Metric | Value |
|---|---|
| Years | 2023, 2024, 2025 |
| Months per year | 12 (complete Jan–Dec) |
| Countries | 5 |
| Rows per year | 12,000 |
| Rows total | 36,000 |
| Rows per country per year | 2,400 |
| Tracks per country per month | 200 |
| Unique tracks (global) | 873 |
| Unique artists (global) | 454 |
| Unique track–artist pairs | 873 |
| Null cells | 0 |
| Duplicate rows | 0 |

### 4.1 Tracks and artists per country (2025; identical in all years)

| Country | Unique tracks | Unique artists |
|---|---:|---:|
| United States | 200 | 120 |
| United Kingdom | 200 | 128 |
| Brazil | 200 | 111 |
| India | 200 | 94 |
| Mexico | 200 | 85 |

### 4.2 Cross-country track overlap

There are 873 distinct tracks across 1,000 country-track slots, so most tracks are market-specific.

| Pair | Shared tracks |
|---|---:|
| United Kingdom & United States | 104 |
| Mexico & United States | 12 |
| India & United Kingdom | 7 |
| India & United States | 7 |
| Brazil & United Kingdom | 4 |
| Brazil & United States | 4 |
| Mexico & United Kingdom | 4 |
| Brazil & Mexico | 3 |
| Brazil & India | 1 |
| India & Mexico | 1 |

Appearance distribution:

| Number of countries a track appears in | Number of tracks |
|---:|---:|
| 1 | 761 |
| 2 | 101 |
| 3 | 8 |
| 4 | 2 |
| 5 | 1 |

Only one track appears in all five markets: **End of Beginning**. The two tracks present in four markets are **The Fate of Ophelia** and **Every Breath You Take**.

---

## 5. Sample records

First rows of `top5_countries_monthly_2025_clean.csv`:

| country | month | track | artist | monthly_streams |
|---|---|---|---|---|
| Brazil | 2025-01 | 12 Horas / Pra Você Acreditar - Ao Vivo (w/ Humberto & Ronaldo, Ícaro e Gilmar, MJ Records) | Panda | 446091852 |
| Brazil | 2025-01 | 2026 (w/ DJ Oreia) | MC Tuto | 12114696 |
| Brazil | 2025-01 | 365 Dias (Vida Mansa) (w/ MC Ryan SP, MC Jvila, MC Bruno MS, Mc Magal, Aaron Modesto) | MC Marks | 452952376 |
| Brazil | 2025-01 | A Firma Segue Lucrando (w/ Fepache) | MC Meno K | 54952844 |
| Brazil | 2025-01 | ABC da Vaquejada (w/ João Gomes, Zé Vaqueiro, Mc Don Juan) | Tarcísio do Acordeon | 15805248 |

US, January 2025 top 5:

| track | artist | monthly_streams |
|---|---|---:|
| No Role Modelz | J. Cole | 6,156,663,670 |
| Sweater Weather | The Neighbourhood | 5,181,325,905 |
| See You Again (w/ Kali Uchis) | Tyler, The Creator | 4,338,696,805 |
| Something in the Orange | Zach Bryan | 4,290,454,060 |
| Last Night | Morgan Wallen | 4,195,367,895 |

---

## 6. Scraping methodology (as implemented)

From `Step_1_Scrapping.ipynb`:

1. **Countries map** to kworb codes: `us`, `br`, `in`, `gb`, `mx`.
2. **Weeks**: every Friday of the target year.
3. **Request**: `requests.get(url, headers={"User-Agent": "Mozilla/5.0"})`.
4. **Table selection**: `soup.find("table")` (the first table on the page).
5. **Row parsing**:
   - Skip the header row.
   - Require at least 3 `<td>` cells.
   - `tds[2]` is the chart label, expected as `"Artist - Track"`.
   - Split on the **first** `" - "`; if absent, `artist = "Unknown"`, `track = label`.
   - **Streams**: scan all cells, keep the **largest integer** after removing commas.
6. **Monthly aggregation**:
   - Parse `week` to a date.
   - Convert to month period.
   - Group by `(country, month, track, artist)` and **sum** weekly streams.
7. **Output**: `top5_countries_monthly_2025.csv`.

### What the pipeline does not record

- No scraped-at timestamp.
- No source URL per row.
- No rank/position column.
- No indication of which numeric column was used as streams.
- No record of failed pages/weeks (they are silently skipped with `continue`).

### Known issues in the scraping logic

| Issue | Impact |
|---|---|
| `tds[2]` assumed to be `"Artist - Track"` | Works for most rows, but the `(w/ ...)` collaborator syntax stays inside the track title |
| Largest-number heuristic | May pick all-time/cumulative streams instead of weekly streams |
| First table only | Could pick a summary table rather than the chart table if the page changes |
| No retry/backoff or timeout | Silent data loss if a request fails |
| Only 2025 code present | 2023 and 2024 provenance cannot be reproduced from the notebook as-is |

---

## 7. Cleaning step

`Step_2_cleaning.ipynb` fixes mojibake (UTF-8 text that was decoded as Latin-1) with:

```python
df["track"] = (
    df["track"]
    .str.encode("latin1", errors="ignore")
    .str.decode("utf-8", errors="ignore")
)
df["artist"] = (
    df["artist"]
    .str.encode("latin1", errors="ignore")
    .str.decode("utf-8", errors="ignore")
)
df.to_csv("top5_countries_monthly_2023_clean.csv", index=False, encoding="utf-8")
```

Verified result:

- Old and clean files have **identical row counts, keys, and stream values**.
- Only the text encoding is corrected.
- No rows were dropped, imputed, or deduplicated during cleaning.

---

## 8. Descriptive statistics

All numbers below are the same for 2023, 2024, and 2025 because the yearly files contain the same value sets.

### 8.1 Global total

| Metric | Value |
|---|---:|
| Total streams (per year; identical every year) | 7,340,879,910,728 |
| Rows | 12,000 |
| Mean streams per row | 611,739,992.6 |
| Median streams per row | 374,539,807 |
| Minimum row | 2,143,708 |
| Maximum row | 6,156,663,670 |

### 8.2 Country totals (per year)

| Country | Total streams | Share |
|---|---:|---:|
| United States | 2,620,236,056,152 | 35.69% |
| Mexico | 1,736,996,074,892 | 23.66% |
| India | 1,405,906,990,644 | 19.15% |
| Brazil | 803,828,734,592 | 10.95% |
| United Kingdom | 773,912,054,448 | 10.54% |

### 8.3 Top 10 tracks globally (yearly sum)

| # | Track | Artist | Streams |
|---:|---|---|---:|
| 1 | No Role Modelz | J. Cole | 64,029,302,168 |
| 2 | Sweater Weather | The Neighbourhood | 63,032,269,196 |
| 3 | Blinding Lights | The Weeknd | 59,570,769,700 |
| 4 | Mr. Brightside | The Killers | 57,119,948,132 |
| 5 | Dreams - 2004 Remaster | Fleetwood Mac | 49,230,545,624 |
| 6 | Stick Season | Noah Kahan | 49,158,832,632 |
| 7 | Starboy (w/ Daft Punk) | The Weeknd | 48,963,576,376 |
| 8 | Espresso | Sabrina Carpenter | 48,915,188,816 |
| 9 | Something in the Orange | Zach Bryan | 48,058,388,456 |
| 10 | 505 | Arctic Monkeys | 46,962,971,328 |

### 8.4 Top 10 artists globally (yearly sum)

| # | Artist | Streams |
|---:|---|---:|
| 1 | Junior H | 181,890,101,380 |
| 2 | The Weeknd | 172,704,030,824 |
| 3 | Bad Bunny | 163,743,699,392 |
| 4 | Pritam | 145,524,704,520 |
| 5 | Morgan Wallen | 135,856,633,588 |
| 6 | Tito Double P | 132,181,771,280 |
| 7 | Fuerza Regida | 119,164,301,672 |
| 8 | Henrique & Juliano | 118,573,482,820 |
| 9 | Kendrick Lamar | 117,616,227,144 |
| 10 | Zach Bryan | 104,398,509,176 |

### 8.5 Per-country highlights

| Country | Top track | Top artist |
|---|---|---|
| Brazil | Lapada Dela - Ao Vivo (w/ Matheus Fernandes) — Grupo Menos É Mais (23,145,888,532) | Henrique & Juliano (118,573,482,820) |
| India | Agar Tum Saath Ho (From "Tamasha") (w/ Arijit Singh) — Alka Yagnik (28,672,314,372) | Pritam (145,524,704,520) |
| Mexico | LA CANCIÓN (w/ Bad Bunny) — J Balvin (34,116,372,472) | Junior H (181,890,101,380) |
| United Kingdom | Mr. Brightside — The Killers (22,000,080,804) | Fleetwood Mac (35,232,714,140) |
| United States | No Role Modelz — J. Cole (64,029,302,168) | Morgan Wallen (135,856,633,588) |

---

## 9. Critical data-quality findings

These are the most important things to know before analysing or presenting this dataset.

### 9.1 All three years have the exact same total

| Year | Rows | Unique tracks | Unique artists | Total streams |
|---|---:|---:|---:|---:|
| 2023 | 12,000 | 873 | 454 | 7,340,879,910,728 |
| 2024 | 12,000 | 873 | 454 | 7,340,879,910,728 |
| 2025 | 12,000 | 873 | 454 | 7,340,879,910,728 |

Identical to the last digit. The three files have different MD5 hashes only because the month labels (and the position of the high months) differ.

```text
2023  d42f7a7a8f0933a369b0aa3f0ffa7980
2024  f7816039fef81eaabfd1737af1af7471
2025  c09e9b9b5930f625d6d8efae95a74780
```

### 9.2 Every track/country pair has exactly two values

For all **1,000** `(country, track)` pairs (5 countries × 200 tracks):

- There are exactly **2 distinct monthly values** across the 12 months.
- Across all years the set of values is the same.
- `max / min = 1.25` **exactly**, with 0 exceptions.

This holds for 1,000 / 1,000 pairs across all three years.

Example — `No Role Modelz` / J. Cole / United States:

| Month | 2023 | 2024 | 2025 |
|---|---:|---:|---:|
| Jan | 4,925,330,936 | 4,925,330,936 | 6,156,663,670 |
| Feb | 4,925,330,936 | 4,925,330,936 | 4,925,330,936 |
| Mar | 6,156,663,670 | 6,156,663,670 | 4,925,330,936 |
| Apr | 4,925,330,936 | 4,925,330,936 | 4,925,330,936 |
| May | 4,925,330,936 | 6,156,663,670 | 6,156,663,670 |
| Jun | 6,156,663,670 | 4,925,330,936 | 4,925,330,936 |
| Jul | 4,925,330,936 | 4,925,330,936 | 4,925,330,936 |
| Aug | 4,925,330,936 | 6,156,663,670 | 6,156,663,670 |
| Sep | 6,156,663,670 | 4,925,330,936 | 4,925,330,936 |
| Oct | 4,925,330,936 | 4,925,330,936 | 6,156,663,670 |
| Nov | 4,925,330,936 | 6,156,663,670 | 4,925,330,936 |
| Dec | 6,156,663,670 | 4,925,330,936 | 4,925,330,936 |

### 9.3 High months are global and identical across countries

In each year, every country has the **same 4 high months** (1.25x the base value) and 8 base months.

| Year | High months | Base months |
|---|---|---|
| 2023 | March, June, September, December | Jan, Feb, Apr, May, Jul, Aug, Oct, Nov |
| 2024 | March, May, August, November | Jan, Feb, Apr, Jun, Jul, Sep, Oct, Dec |
| 2025 | January, May, August, October | Feb, Mar, Apr, Jun, Jul, Sep, Nov, Dec |

So the monthly time series is a **step function** that toggles between two levels, not a real seasonal curve.

### 9.4 Cross-year value sets are identical

For **1,000 / 1,000** `(country, track)` pairs, the sorted set of monthly values is identical in 2023, 2024, and 2025.

Only two things change between years:

1. The year prefix on `month`.
2. Which 4 months happen to be the "high" months.

In other words, the yearly files look like the **same base snapshot** relabelled and re-multiplied, not three independent scrapes of three different years.

### 9.5 Country monthly totals are two fixed levels

| Country | Base month total | High month total (x1.25) |
|---|---:|---:|
| United States | 201,556,619,704 | 251,945,774,630 |
| Mexico | 133,615,082,684 | 167,018,853,355 |
| India | 108,146,691,588 | 135,183,364,485 |
| Brazil | 61,832,979,584 | 77,291,224,480 |
| United Kingdom | 59,531,696,496 | 74,414,620,620 |

Every month is exactly one of these two values for that country.

### 9.6 Absolute magnitudes are implausible

Typical real-world reference points:

- A global smash hit might do a few hundred million streams per month, not **4.9–6.2 billion per month in one country**.
- `No Role Modelz` has roughly 2 billion Spotify streams **all-time**; this dataset gives it **64 billion per year** in the US alone.
- The US market total here is **2.62 trillion per year**, which is far above plausible Spotify-only US volume.

Combined with the exact 1.25x step pattern, this strongly suggests:

- the scraper captured a **cumulative/all-time** numeric column rather than weekly streams, and/or
- the data is **synthetic/generated** for demonstration.

### 9.7 Consequences for analysis

| Analysis | Is it valid? | Why |
|---|---|---|
| Country market share | Descriptive only | Shares are internally consistent, but magnitudes are not real |
| Top tracks / artists | Descriptive only | Rankings are internally consistent within this dataset |
| Cross-country overlap | Yes | Track sets are exact and verifiable |
| Year-over-year growth | No | Every year is identical |
| Month-over-month trends / seasonality | No | Series is a 2-level step function |
| Fastest-growing song | No | Every track grows by exactly +25% (min→max) |
| Forecasting | No | No real temporal signal |
| Ranking "momentum" | No | No genuine change over time |

### 9.8 The notebook's "highest growth" result is a bug

`making job done.ipynb` sorts by `track, artist, month` and then does a `diff()` **within each track/artist group**, without grouping by country. Because multiple countries share the same month, consecutive rows often belong to **different countries in the same month**, not to consecutive months.

The dashboard reproduces this faithfully:

> **Sweater Weather** / The Neighbourhood / **United States** / **Jan 2025** / **+4,301,856,695**

This number is a **cross-country difference**, not month-over-month growth. It is documented as a warning in the dashboard's Notebook tab.

The separate `Step_3_Transform_&_EDA.ipynb` uses a cleaner **min→max** growth formula, but because every track has the same 1.25x range, it still reports +25% for essentially every track.

---

## 10. What is reliable vs not

### Reliable

- File structure, row counts, null/duplicate checks.
- Unique track and artist counts.
- Country track sets and overlap.
- Within-dataset rankings (top tracks, top artists, country totals).
- Reproducing the exact numbers shown in the notebooks and dashboard.

### Not reliable / not usable

- Real-world market conclusions.
- Year-over-year or month-over-month growth.
- Seasonality, trend, momentum, or forecasting.
- Any claim that these are actual Spotify monthly streams.
- The "highest growth song" result from the notebook.
- The year filter's apparent differences (there are none).

### Recommended framing

Use it as a **pipeline / dashboard / EDA demonstration**: "Here is how to scrape, clean, aggregate, and visualise a multi-country music chart dataset." Do not present the numbers as real Spotify facts without replacing the data with a verified scrape.

---

## 11. How to reproduce / use

### 11.1 Regenerate the dashboard bundle

From the project root:

```powershell
python dashboard/prepare_data.py
```

This reads the three cleaned CSVs, writes `dashboard/data.js`, and prints row/track/artist counts.

### 11.2 Open the dashboard

Double-click `dashboard/index.html` (works from `file://`; Chart.js is vendored locally).

### 11.3 Re-run the analysis notebooks

Install the dependencies used by the notebooks:

```powershell
pip install pandas requests beautifulsoup4 matplotlib
```

Then run, in order:

1. `Step_1_Scrapping.ipynb` (network access required; only the 2025 run is present)
2. `Step_2_cleaning.ipynb`
3. `Step_3_Transform_&_EDA.ipynb`
4. `making job done.ipynb`

---

## 12. Fast facts

| Question | Answer |
|---|---|
| How many rows? | 36,000 total (12,000 per year) |
| How many columns? | 5 |
| How many countries? | 5 |
| How many months? | 36 |
| Rows per country per month? | 200 |
| Unique tracks? | 873 |
| Unique artists? | 454 |
| Null values? | 0 |
| Duplicate rows? | 0 |
| Total streams per year? | 7,340,879,910,728 |
| Does each track grow? | Yes, always exactly +25% (min→max) |
| Are years different? | No — totals and value sets are identical |
| Real Spotify data? | No evidence; treat as demo/synthetic |
| Most common country share? | United States, 35.69% |

---

## 13. Verification checklist

Everything in this document was checked directly against the files:

- [x] Row/column counts per file
- [x] Null counts
- [x] Duplicate row and duplicate key counts
- [x] Data types
- [x] Month coverage (12 per year)
- [x] Country coverage and row balance (2,400 per country per year)
- [x] Unique track/artist counts and track→artist mapping
- [x] Country-level totals and shares
- [x] Top tracks/artists
- [x] Cross-country track overlap
- [x] Old vs clean file equivalence
- [x] Per-track value counts, 1.25x ratio, and cross-year equality
- [x] High-month pattern per year
- [x] Demo/experimental file shapes and anomalies
