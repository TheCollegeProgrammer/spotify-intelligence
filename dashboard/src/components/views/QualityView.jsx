import {
  Activity,
  CircleAlert,
  CircleCheck,
  Database,
  Download,
  LayoutDashboard,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  ARTISTS,
  COUNTRIES,
  MONTHS,
  ROWS,
  STATS,
  TRACKS,
  YEARS,
  NOTEBOOK,
} from "../../data/dataset";
import { fmtCompact, fmtInt, fmtPct } from "../../lib/format";
import { StatTile, ViewHead } from "../ui/Primitives";
import NotebookReplica from "../modals/NotebookReplica";

const STAGES = [
  ["Extraction", "Country/month pages captured", "Complete", "ok", Download],
  ["Cleaning", "Types normalised, rows parsed", "Stable", "ok", Sparkles],
  ["Bundle", "Compact index references generated", "Stable", "ok", LayoutDashboard],
  ["Value provenance", "Largest numeric cell mirrored", "Review", "warn", TriangleAlert],
];

const DICTIONARY = [
  ["year", "Derived integer", "Year inferred from the source filename (2023–2025)."],
  ["country", "String", "One of five markets: Brazil, India, Mexico, United Kingdom, United States."],
  ["month", "Date / string", "Calendar month in YYYY-MM form; 36 months across three files."],
  ["track", "String", "Track title as scraped from kworb.net."],
  ["artist", "String", "Performing artist as scraped from kworb.net."],
  ["monthly_streams", "Integer", "Recorded monthly value mirrored from the largest numeric cell on the page."],
];

const FINDINGS = [
  ["01", "Year totals are identical", "High", "danger", "2023, 2024 and 2025 each sum to the same value. Any YoY claim is unsupported."],
  ["02", "Two-level monthly pattern", "Medium", "warn", "Every (country, track) pair has exactly two values and all pairs sit at a 1.25× ratio."],
  ["03", "Markets move in lockstep", "Medium", "warn", "High months are global, so country curves differ in scale, not in shape."],
  ["04", "Notebook growth is a diff artifact", "High", "danger", NOTEBOOK?.highestGrowth ? `${NOTEBOOK.highestGrowth.track} (${NOTEBOOK.highestGrowth.country}, ${NOTEBOOK.highestGrowth.month}) shows +${fmtCompact(NOTEBOOK.highestGrowth.diff)} because consecutive rows are different countries.` : "The notebook's growth ranking compares cross-country rows."],
  ["05", "Cumulative-style scrape footprint", "Medium", "warn", "200 rows per country/month and repeated totals suggest the largest cell was captured, not a clean time series."],
  ["06", "Structural completeness", "Pass", "ok", `${fmtInt(ROWS.length)} rows, 0 nulls, 0 duplicate keys, and a full 5 × 36 month grid.`],
];

function HealthRow({ stage }) {
  const [title, sub, status, kind, Icon] = stage;
  return (
    <div className="health-row">
      <span className={`health-ico${kind === "warn" ? " warn" : ""}`}>
        <Icon size={14} />
      </span>
      <span className="health-main">
        <strong>{title}</strong>
        <span>{sub}</span>
        <span className="health-bar">
          <i
            style={{
              width: kind === "warn" ? "75%" : "100%",
              background: kind === "warn" ? "var(--amber)" : "linear-gradient(90deg,var(--accent),var(--cyan))",
            }}
          />
        </span>
      </span>
      <span className={`health-status${kind === "warn" ? " warn" : ""}`}>{status}</span>
    </div>
  );
}

function Finding({ finding }) {
  const [number, title, severity, kind, body] = finding;
  return (
    <div className="finding">
      <span className={`severity ${kind}`}>{severity}</span>
      <span className="finding-no">{number}</span>
      <h4>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

function TimelineStep({ icon: Icon, title, tag, body }) {
  return (
    <div className="timeline-step">
      <span className="timeline-dot">
        <Icon size={14} />
      </span>
      <div className="timeline-body">
        <strong>
          {title}
          <span>{tag}</span>
        </strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

export default function QualityView({ theme, onExport }) {
  const yearVals = YEARS.map((year) => STATS.yearTotals?.[year] || 0);
  const identical = yearVals.length > 1 && yearVals.every((value) => value === yearVals[0]);
  const pairCount = STATS.pairCount || 0;
  const pairTwo = STATS.pairTwoValues || 0;
  const pair125 = STATS.pairRatio125 || 0;
  const checks = [
    [ROWS.length === 36000, "Row count", `${fmtInt(ROWS.length)} loaded / 36,000 expected`],
    [COUNTRIES.length === 5, "Market coverage", "5 markets present"],
    [MONTHS.length === 36, "Time coverage", "36 month buckets present"],
    [TRACKS.length === 873, "Track coverage", `${fmtInt(TRACKS.length)} distinct tracks`],
    [ARTISTS.length === 454, "Artist coverage", `${fmtInt(ARTISTS.length)} distinct artists`],
    [STATS.nullCells === 0, "Null cells", `${fmtInt(STATS.nullCells)} nulls after source capture`],
    [STATS.duplicateKeys === 0, "Duplicate keys", `${fmtInt(STATS.duplicateKeys)} duplicate country/month/track/artist keys`],
    [identical, "Year totals", identical ? "All three yearly totals are identical" : "Yearly totals differ"],
    [pairTwo === pairCount, "Two-level pairs", `${fmtInt(pairTwo)} / ${fmtInt(pairCount)} pairs have exactly two values`],
    [pair125 === pairCount, "1.25× ratio", `${fmtInt(pair125)} / ${fmtInt(pairCount)} pairs hit exactly 1.25×`],
  ];

  return (
    <div className="view-root">
      <ViewHead
        eyebrow="Data trust center"
        icon={Database}
        title="Integrity, provenance and limitations"
        subtitle="Everything is checked against the generated bundle: row counts, uniqueness, source pattern and the original notebook logic."
        actions={
          <button className="btn" type="button" onClick={onExport}>
            <Download size={14} />
            Export filtered CSV
          </button>
        }
      />

      <div className="quality-hero">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Integrity snapshot</h2>
              <p>Pre-cleaning capture versus loaded bundle.</p>
            </div>
            <span className="card-tag">Validated</span>
          </div>
          <div className="quality-stat-grid">
            <StatTile label="Source rows" value={fmtInt(STATS.sourceRows)} />
            <StatTile label="Loaded rows" value={fmtInt(STATS.rows)} />
            <StatTile label="Null cells" value={fmtInt(STATS.nullCells)} />
            <StatTile label="Duplicate keys" value={fmtInt(STATS.duplicateKeys)} />
          </div>
          <div className="card-caption">
            <strong>Structural checks pass.</strong> That does not make the values organic;
            the source pattern still limits interpretation.
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Pipeline health</h2>
              <p>Stage-level status from extraction to bundle.</p>
            </div>
          </div>
          <div className="health-list">
            {STAGES.map((stage) => (
              <HealthRow stage={stage} key={stage[0]} />
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">Critical findings</div>
      <div className="findings-grid">
        {FINDINGS.map((finding) => (
          <Finding finding={finding} key={finding[0]} />
        ))}
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2>Methodology</h2>
              <p>From public pages to this bundle.</p>
            </div>
            <span className="card-tag">4 stages</span>
          </div>
          <div className="timeline">
            <TimelineStep icon={Download} title="Scrape" tag="Step 1" body="Playwright visits each country/month page on kworb.net and records the visible table." />
            <TimelineStep icon={Sparkles} title="Clean" tag="Step 2" body="Normalise text, coerce monthly values to integers, remove invalid rows." />
            <TimelineStep icon={Activity} title="Transform & EDA" tag="Step 3" body="Build rankings, monthly aggregations and the notebook's growth comparison." />
            <TimelineStep icon={Database} title="Bundle" tag="prepare_data.py" body="Compress rows into index references and attach verified quality stats." />
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2>Data dictionary</h2>
              <p>Six fields explain every row.</p>
            </div>
          </div>
          <div className="table-wrap short">
            <table className="data-table dict-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {DICTIONARY.map((row) => (
                  <tr key={row[0]}>
                    <td><code>{row[0]}</code></td>
                    <td className="muted">{row[1]}</td>
                    <td className="muted">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2>Validation checks</h2>
              <p>Automated facts available to every view.</p>
            </div>
            <span className="card-tag">
              {checks.filter((item) => item[0]).length} / {checks.length} pass
            </span>
          </div>
          <div className="qa-list">
            {checks.map(([pass, label, detail]) => (
              <div className="qa-item" key={label}>
                <div className="qa-q">
                  {pass ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
                  {label}
                </div>
                <div className="qa-a">{detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card span-5 tint-amber">
          <div className="card-head">
            <div>
              <h2>Known limitations</h2>
              <p>What to disclose when presenting.</p>
            </div>
          </div>
          <div className="stack">
            <div className="notice warning">
              <div className="notice-icon"><TriangleAlert size={16} /></div>
              <div className="notice-body">
                <strong>No genuine growth signal</strong>
                <p>Yearly totals are identical and monthly values step between two levels.</p>
              </div>
            </div>
            <div className="notice warning">
              <div className="notice-icon"><TriangleAlert size={16} /></div>
              <div className="notice-body">
                <strong>Not organic seasonality</strong>
                <p>High months are fixed globally and shared by every market.</p>
              </div>
            </div>
            <div className="notice warning">
              <div className="notice-icon"><TriangleAlert size={16} /></div>
              <div className="notice-body">
                <strong>Demo-grade values</strong>
                <p>The scrape captures a repeated pattern; do not present it as real listening behaviour.</p>
              </div>
            </div>
          </div>
        </div>

        <NotebookReplica theme={theme} />
      </div>

      <div className="quality-footnote">
        Pair coverage {fmtPct(pairCount ? (pair125 / pairCount) * 100 : 0)} at exactly 1.25× ·
        {fmtInt(STATS.sourceRows)} source rows · {fmtInt(STATS.rows)} loaded rows
      </div>
    </div>
  );
}
