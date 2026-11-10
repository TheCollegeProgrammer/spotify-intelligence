"""
Builds a compact data.js bundle for the Spotify dashboard.

Reads the cleaned yearly CSVs produced by Step_2_cleaning.ipynb and writes
window.SPOTIFY_DATA = { years, countries, months, tracks, artists, rows }.

Each row is: [yearIndex, countryIndex, monthIndex, trackIndex, artistIndex, streams]

Run:  python prepare_data.py
"""

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

YEARS = ["2023", "2024", "2025"]
EXPECTED_COUNTRIES = ["Brazil", "India", "Mexico", "United Kingdom", "United States"]

frames = []
for year in YEARS:
    clean = ROOT / f"top5_countries_monthly_{year}_clean.csv"
    old = ROOT / "Old_CSVs" / f"top5_countries_monthly_{year}.csv"
    path = clean if clean.exists() else old
    if not path.exists():
        print(f"[skip] {year}: no csv found")
        continue

    df = pd.read_csv(path, encoding="utf-8")
    df = df[["country", "month", "track", "artist", "monthly_streams"]].copy()
    df["year"] = year
    frames.append(df)
    print(f"[ok]   {year}: {len(df):,} rows <- {path.name}")

if not frames:
    raise SystemExit("No CSV files found. Run the cleaning notebooks first.")

raw = pd.concat(frames, ignore_index=True)
COLS = ["country", "month", "track", "artist", "monthly_streams"]

# Quality figures must be captured before cleaning/coercion.
source_rows = int(len(raw))
null_cells = int(raw[COLS].isna().sum().sum())
duplicate_rows = int(raw.duplicated().sum())
duplicate_keys = int(raw.duplicated(subset=["country", "month", "track", "artist"]).sum())

df = raw.copy()
df["monthly_streams"] = pd.to_numeric(df["monthly_streams"], errors="coerce").fillna(0).astype("int64")
df = df.dropna(subset=["country", "month", "track", "artist"])
df = df[df["monthly_streams"] > 0]

# -------- verified dataset facts used by the Data Quality / Insights views --------
year_totals = {
    str(int(year)): int(total)
    for year, total in df.groupby("year")["monthly_streams"].sum().items()
}

# Each (country, track, artist) pair: how many distinct monthly values, and ratio.
pair = df.groupby(["country", "track", "artist"])["monthly_streams"].agg(["nunique", "min", "max"])
pair_count = int(len(pair))
pair_two_values = int((pair["nunique"] == 2).sum())
pair_ratio_125 = int(((pair["max"] / pair["min"]).round(6) == 1.25).sum())

# High months per year (same high months across every country).
year_month = df.groupby(["year", "month"])["monthly_streams"].sum()
high_months = {}
for year, series in year_month.groupby(level=0):
    series = series.droplevel(0)
    base = series.min()
    high_months[str(year)] = [
        int(str(month)[-2:]) - 1 for month in series.index if series[month] > base
    ]

# Base / high monthly total per country, from the latest year.
latest_year = max(YEARS)
latest = df[df["year"] == latest_year]
levels = latest.groupby(["country", "month"])["monthly_streams"].sum()
month_levels = {}
for country, series in levels.groupby(level=0):
    series = series.droplevel(0)
    month_levels[str(country)] = {
        "base": int(series.min()),
        "high": int(series.max()),
        "ratio": round(float(series.max() / series.min()), 4),
    }

# How many markets each distinct track appears in.
from collections import Counter

country_sets = latest.groupby("country")["track"].apply(set)
appearance_counter = Counter()
for tracks in country_sets:
    for track in tracks:
        appearance_counter[track] += 1
track_appearances = {
    str(k): int(v) for k, v in sorted(Counter(appearance_counter.values()).items())
}

stats = {
    "sourceRows": source_rows,
    "rows": int(len(df)),
    "nullCells": null_cells,
    "duplicateRows": duplicate_rows,
    "duplicateKeys": duplicate_keys,
    "yearTotals": year_totals,
    "pairCount": pair_count,
    "pairTwoValues": pair_two_values,
    "pairRatio125": pair_ratio_125,
    "highMonths": high_months,
    "monthLevels": month_levels,
    "trackAppearances": track_appearances,
}

countries = sorted(df["country"].unique().tolist())
# keep the five chart countries in a stable order when possible
countries = sorted(
    countries,
    key=lambda c: (EXPECTED_COUNTRIES.index(c) if c in EXPECTED_COUNTRIES else 99, c),
)

months = sorted(df["month"].unique().tolist())

tracks = sorted(df["track"].unique().tolist())
artists = sorted(df["artist"].unique().tolist())

year_idx = {y: i for i, y in enumerate(YEARS)}
country_idx = {c: i for i, c in enumerate(countries)}
month_idx = {m: i for i, m in enumerate(months)}
track_idx = {t: i for i, t in enumerate(tracks)}
artist_idx = {a: i for i, a in enumerate(artists)}

rows = [
    [
        year_idx[y],
        country_idx[c],
        month_idx[m],
        track_idx[t],
        artist_idx[a],
        int(s),
    ]
    for y, c, m, t, a, s in zip(
        df["year"],
        df["country"],
        df["month"],
        df["track"],
        df["artist"],
        df["monthly_streams"],
    )
]

def build_notebook_finding(frame):
    """Replicate the exact growth logic used in 'making job done.ipynb'.

    The notebook sorts by track/artist/month, then diffs monthly_streams within
    each track+artist group. Because several countries share the same month,
    the resulting "growth" is actually a difference between consecutive rows
    (often two countries in the same month). We reproduce it faithfully here.
    """
    nb = frame[frame["year"] == "2025"].copy()
    if nb.empty:
        return None
    nb["month_dt"] = pd.to_datetime(nb["month"])
    d = nb.sort_values(by=["track", "artist", "month_dt"]).reset_index(drop=True)
    d["stream_difference"] = d.groupby(["track", "artist"])["monthly_streams"].diff()
    positive = d[d["stream_difference"] > 0]
    if positive.empty:
        return None
    row = positive.loc[positive["stream_difference"].idxmax()]

    series = d[(d["track"] == row["track"]) & (d["artist"] == row["artist"])]
    series_by_country = {}
    for country, grp in series.groupby("country"):
        grp = grp.sort_values("month_dt")
        series_by_country[str(country)] = [
            [str(m)[:7], int(s)] for m, s in zip(grp["month"], grp["monthly_streams"])
        ]

    return {
        "scopeYear": "2025",
        "highestGrowth": {
            "country": str(row["country"]),
            "month": str(row["month"])[:7],
            "track": str(row["track"]),
            "artist": str(row["artist"]),
            "streams": int(row["monthly_streams"]),
            "diff": int(row["stream_difference"]),
            "seriesByCountry": series_by_country,
        },
    }


payload = {
    "generatedFrom": [f"top5_countries_monthly_{y}_clean.csv" for y in YEARS],
    "years": YEARS,
    "countries": countries,
    "months": months,
    "tracks": tracks,
    "artists": artists,
    "rows": rows,
    "stats": stats,
    "notebook": build_notebook_finding(df),
}

out = HERE / "data.js"
with out.open("w", encoding="utf-8") as fh:
    fh.write("/* Auto-generated by prepare_data.py - do not edit by hand. */\n")
    fh.write("window.SPOTIFY_DATA = ")
    json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\n")

size_mb = out.stat().st_size / (1024 * 1024)
print(
    f"\nWrote {out.name}: {len(rows):,} rows, {len(tracks):,} tracks, "
    f"{len(artists):,} artists, {size_mb:.1f} MB"
)
