import { useMemo, useState } from "react";
import { Download, GitCompareArrows, X } from "lucide-react";
import {
  COUNTRIES,
  COUNTRY_CODE,
  COUNTRY_COLORS,
} from "../../data/dataset";
import { horizontalBarConfig, trendConfig } from "../../lib/charts";
import { fmtCompact, fmtInt, fmtPct, withAlpha } from "../../lib/format";
import { onlyMarketTracks, sharedTracksFor } from "../../lib/model";
import ChartCard from "../ui/ChartCard";
import { CountryChip, Flag } from "../ui/EntityBits";
import { MarketTable } from "../ui/RankingPanels";
import { ViewHead } from "../ui/Primitives";

function CountryCard({ country, rank, selected, comparing, onOpen, onCompare }) {
  return (
    <article
      className={`country-card${selected ? " selected" : ""}`}
      tabIndex={0}
      role="button"
      aria-label={`Open ${country.name} profile`}
      onClick={() => onOpen(country.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(country.name);
        }
      }}
    >
      <button
        className={`country-compare-btn${comparing ? " on" : ""}`}
        type="button"
        title={comparing ? "Remove from comparison" : "Add to comparison"}
        aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
        onClick={(event) => {
          event.stopPropagation();
          onCompare(country.name);
        }}
      >
        <GitCompareArrows size={13} />
      </button>
      <div className="country-card-top">
        <Flag name={country.name} />
        <span className="badge neutral">#{rank}</span>
      </div>
      <h3>{country.name}</h3>
      <div className="country-total">{fmtCompact(country.streams)}</div>
      <div className="country-share">{fmtPct(country.share)} of recorded values</div>
      <div className="country-mini-stats">
        <div>
          <strong>{fmtInt(country.trackCount)}</strong>
          <span>Tracks</span>
        </div>
        <div>
          <strong>{fmtInt(country.artistCount)}</strong>
          <span>Artists</span>
        </div>
      </div>
      <div className="country-leaders">
        <span>
          Top artist <strong>{country.topArtist ? country.topArtist.name : "-"}</strong>
        </span>
        <span>
          Top track <strong>{country.topTrack ? country.topTrack.name : "-"}</strong>
        </span>
      </div>
    </article>
  );
}

function OverlapMatrix({ model, pair, onSelectPair }) {
  const sets = COUNTRIES.map((_, ci) => new Set(model.countryTracks[ci].keys()));
  const shared = pair ? sharedTracksFor(model, pair[0], pair[1]) : [];

  return (
    <>
      <div className="overlap-scroll">
        <div
          className="overlap-matrix"
          style={{ gridTemplateColumns: "82px repeat(5, minmax(48px, 1fr))" }}
        >
          <div className="overlap-cell head" />
          {COUNTRIES.map((country) => (
            <div className="overlap-cell head" key={`h-${country}`} title={country}>
              {COUNTRY_CODE[country]}
            </div>
          ))}
          {COUNTRIES.map((rowName, i) => (
            <div className="overlap-row" key={rowName} style={{ display: "contents" }}>
              <div className="overlap-cell head" title={rowName}>
                {COUNTRY_CODE[rowName]}
              </div>
              {COUNTRIES.map((colName, j) => {
                let count = 0;
                if (i === j) count = sets[i].size;
                else sets[i].forEach((key) => sets[j].has(key) && (count += 1));
                const active =
                  pair && ((pair[0] === i && pair[1] === j) || (pair[0] === j && pair[1] === i));
                return (
                  <div
                    key={`${rowName}-${colName}`}
                    className={`overlap-cell ${i === j ? "diag" : "clickable"}${active ? " active" : ""}`}
                    title={`${rowName} ∩ ${colName}: ${count} shared track${count === 1 ? "" : "s"}`}
                    onClick={() => i !== j && onSelectPair([i, j])}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="card-caption">
        {pair ? (
          <>
            Shared catalogue between <strong>{COUNTRIES[pair[0]]}</strong> and{" "}
            <strong>{COUNTRIES[pair[1]]}</strong>.
          </>
        ) : (
          "Select a cell to inspect the shared catalogue for that pair."
        )}
      </div>
      {pair && (
        <div className="shared-list">
          {shared.slice(0, 18).map((track) => (
            <span key={track.key}>
              {track.name} · {track.artistName}
            </span>
          ))}
          {shared.length > 18 && <span>+{shared.length - 18} more</span>}
          {!shared.length && <span>No shared tracks in this scope.</span>}
        </div>
      )}
    </>
  );
}

export default function CountriesView({
  model,
  baseModel,
  compare,
  onToggleCompare,
  onClearCompare,
  theme,
  onOpenCountry,
  onExport,
}) {
  const [trendMode, setTrendMode] = useState("area");
  const [pair, setPair] = useState(null);
  const compareCountries =
    compare.size >= 2
      ? baseModel.countryList.filter((country) => compare.has(country.name))
      : baseModel.countryList;

  const trend = useMemo(
    () => trendConfig(baseModel, compareCountries, trendMode, theme),
    [baseModel, compareCountries, trendMode, theme]
  );

  const share = useMemo(
    () =>
      horizontalBarConfig(baseModel.countryList, theme, {
        label: (country) => COUNTRY_CODE[country.name],
        color: (country) => COUNTRY_COLORS[country.name] || "#1db954",
        onClick: (_event, elements) => {
          if (elements?.length) onOpenCountry(baseModel.countryList[elements[0].index].name);
        },
      }),
    [baseModel, theme, onOpenCountry]
  );

  const selected = COUNTRIES.filter((country) => compare.has(country));
  const exclusive = COUNTRIES.map((name) => {
    const ci = COUNTRIES.indexOf(name);
    const only = onlyMarketTracks(baseModel, ci);
    const totalInMarket = baseModel.countryTracks[ci].size;
    return {
      name,
      count: only.length,
      share: totalInMarket ? (only.length / totalInMarket) * 100 : 0,
    };
  });

  return (
    <div className="view-root">
      <ViewHead
        eyebrow="Market intelligence"
        icon={GitCompareArrows}
        title="Five markets, one recorded catalogue"
        subtitle="Cards and overlap always retain all five markets so comparisons remain visible. Comparison views follow your picks."
        actions={
          <button className="btn" type="button" onClick={onExport}>
            <Download size={14} />
            Export scope
          </button>
        }
      />

      <div className="country-grid">
        {baseModel.countryList.map((country) => (
          <CountryCard
            key={country.name}
            country={country}
            rank={baseModel.countryList.indexOf(country) + 1}
            selected={compare.size < COUNTRIES.length && compare.has(country.name)}
            comparing={compare.has(country.name)}
            onOpen={onOpenCountry}
            onCompare={onToggleCompare}
          />
        ))}
      </div>

      <div className="compare-bar">
        <GitCompareArrows size={14} />
        <span>Compare markets</span>
        {selected.length ? (
          selected.map((country) => (
            <span className="compare-chip" key={country}>
              <CountryChip name={country} />
              <button
                type="button"
                onClick={() => onToggleCompare(country)}
                aria-label={`Remove ${country}`}
              >
                <X size={10} />
              </button>
            </span>
          ))
        ) : (
          <span className="faint">Use the compare icon on a market card, or click an overlap cell.</span>
        )}
        {selected.length < 2 && <span className="faint">Select at least two markets.</span>}
        {selected.length > 0 && (
          <button className="clear-compare" type="button" onClick={onClearCompare}>
            Clear comparison
          </button>
        )}
      </div>

      <div className="grid">
        <ChartCard
          title="Comparative market trend"
          subtitle={
            compare.size >= 2
              ? "Only the markets selected for comparison are shown."
              : "Monthly recorded values for all five markets."
          }
          config={trend}
          span="span-8"
          chartLabel="Comparative market trend"
          actions={
            <div className="segmented" role="group" aria-label="Trend style">
              {[["flow", "Flow"], ["area", "Area"], ["line", "Line"], ["bar", "Bar"]].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={trendMode === value ? "active" : ""}
                    onClick={() => setTrendMode(value)}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          }
          caption="Market totals are mirrored across years; compare structure, not claimed growth."
        />

        <ChartCard
          title="Share of recorded values"
          subtitle="All five markets in the current scope."
          config={share}
          span="span-4"
          chartClassName=""
          chartLabel="Share of recorded values by market"
          caption="Click a bar to open the market profile."
        />

        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2>Track overlap matrix</h2>
              <p>Tracks shared between each pair of markets (track × artist keys).</p>
            </div>
            <span className="card-tag">5 × 5</span>
          </div>
          <OverlapMatrix model={baseModel} pair={pair} onSelectPair={setPair} />
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2>Market-only catalogue</h2>
              <p>Tracks that appear in one market only within scope.</p>
            </div>
            <span className="card-tag">Reach = 1</span>
          </div>
          <div className="split-list">
            {exclusive.map((item) => (
              <div className="split-row" key={item.name}>
                <span><CountryChip name={item.name} /></span>
                <strong>
                  {fmtInt(item.count)} <span className="faint">({fmtPct(item.share)})</span>
                </strong>
              </div>
            ))}
          </div>
          <div className="card-caption">
            High exclusivity is expected in a demo dataset with 761 of 873 tracks present
            in a single market.
          </div>
        </div>

        <div className="card span-12">
          <div className="card-head">
            <div>
              <h2>Portfolio detail</h2>
              <p>Market totals, catalogue depth and leaders.</p>
            </div>
            <span className="card-tag">Filtered scope</span>
          </div>
          <MarketTable countries={baseModel.countryList} onOpen={onOpenCountry} />
        </div>
      </div>
    </div>
  );
}
