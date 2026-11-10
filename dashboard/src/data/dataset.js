import raw from "./dataset.json";

export const DATA = raw;
export const YEARS = raw.years;
export const COUNTRIES = raw.countries;
export const MONTHS = raw.months;
export const TRACKS = raw.tracks;
export const ARTISTS = raw.artists;
export const ROWS = raw.rows;
export const STATS = raw.stats;
export const NOTEBOOK = raw.notebook;
export const GENERATED_FROM = raw.generatedFrom;

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_OF_YEAR = MONTHS.map((m) => parseInt(m.slice(5), 10) - 1);

export const COUNTRY_CODE = {
  Brazil: "BR",
  India: "IN",
  Mexico: "MX",
  "United Kingdom": "UK",
  "United States": "US",
};

export const COUNTRY_COLORS = {
  Brazil: "#34d399",
  India: "#fbbf24",
  Mexico: "#22d3ee",
  "United Kingdom": "#a78bfa",
  "United States": "#60a5fa",
};

export const REACH_COLORS = ["#1db954", "#22d3ee", "#a78bfa", "#fbbf24", "#f472b6"];

export const PAGE_META = {
  overview: {
    title: "Overview",
    crumb: "Overview",
    subtitle: "Executive view of recorded streaming values across five markets.",
  },
  countries: {
    title: "Countries",
    crumb: "Countries",
    subtitle: "Market-by-market comparison, overlap and catalogue exclusives.",
  },
  artists: {
    title: "Artists",
    crumb: "Artists",
    subtitle: "Ranking, reach and catalogue depth across 454 artists.",
  },
  songs: {
    title: "Songs",
    crumb: "Songs",
    subtitle: "Track-level performance across markets, months and markets reached.",
  },
  insights: {
    title: "Growth & Insights",
    crumb: "Growth & Insights",
    subtitle: "What this dataset can and cannot support.",
  },
  quality: {
    title: "Data Quality",
    crumb: "Data Quality",
    subtitle: "Integrity checks, methodology, dictionary and the notebook replica.",
  },
};

export const NAV_ITEMS = [
  { view: "overview", label: "Overview", section: "Analytics" },
  { view: "countries", label: "Countries", section: "Analytics" },
  { view: "artists", label: "Artists", section: "Analytics" },
  { view: "songs", label: "Songs", section: "Analytics" },
  { view: "insights", label: "Insights", section: "Analytics" },
  { view: "quality", label: "Data Quality", section: "Data" },
];

export const VIEW_ORDER = ["overview", "countries", "artists", "songs", "insights", "quality"];
