import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Disc3,
  Filter,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import {
  ARTISTS,
  COUNTRIES,
  MONTH_NAMES,
  TRACKS,
  YEARS,
} from "../../data/dataset";

function countrySummary(filters) {
  const count = filters.countries.size;
  if (count === COUNTRIES.length) return "All countries";
  if (count === 0) return "No countries";
  if (count === 1) return [...filters.countries][0];
  return `${count} of ${COUNTRIES.length} countries`;
}

function monthSummary(filters) {
  const count = filters.months.size;
  if (count === 12) return "All months";
  if (count === 0) return "No months";
  if (count === 1) return MONTH_NAMES[[...filters.months][0]];
  return `${count} of 12 months`;
}

function ComboField({ label, icon: Icon, kind, value, options, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery(value || "");
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, value]);

  const needle = query.trim().toLowerCase();
  const matches = options
    .filter((option) => !needle || option.toLowerCase().includes(needle))
    .slice(0, 40);

  return (
    <div className="combo filter-control" ref={wrapRef}>
      <span>{label}</span>
      <div className="combo-input">
        <Icon size={13} />
        <input
          type="text"
          value={query}
          placeholder={`All ${label.toLowerCase()}s`}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-label={`Filter by ${label.toLowerCase()}`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches.length) {
              onSelect(matches[0]);
              setOpen(false);
            }
            if (event.key === "Escape") {
              setOpen(false);
              setQuery(value || "");
            }
          }}
        />
        {value && (
          <button
            type="button"
            className="combo-clear"
            onClick={() => {
              onClear();
              setQuery("");
              setOpen(false);
            }}
            aria-label={`Clear ${kind} filter`}
          >
            <X size={11} />
          </button>
        )}
      </div>
      {open && (
        <div className="combo-panel" role="listbox">
          {matches.map((option) => (
            <button
              key={option}
              className={`combo-option${option === value ? " active" : ""}`}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onSelect(option);
                setQuery(option);
                setOpen(false);
              }}
            >
              <Icon size={13} />
              <strong>{option}</strong>
            </button>
          ))}
          {!matches.length && <div className="combo-empty">No matches</div>}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, actions, activeCount }) {
  const chips = [];
  if (filters.year !== "all") {
    chips.push({ key: "year", label: `Year: ${filters.year}`, clear: () => actions.setYear("all") });
  }
  if (filters.countries.size !== COUNTRIES.length) {
    chips.push({
      key: "countries",
      label: `Country: ${countrySummary(filters)}`,
      clear: () => actions.setAllCountries(true),
    });
  }
  if (filters.months.size !== 12) {
    chips.push({
      key: "months",
      label: `Month: ${monthSummary(filters)}`,
      clear: () => actions.setAllMonths(true),
    });
  }
  if (filters.artist) {
    chips.push({
      key: "artist",
      label: `Artist: ${filters.artist}`,
      clear: () => actions.setArtist(""),
    });
  }
  if (filters.track) {
    chips.push({
      key: "track",
      label: `Track: ${filters.track}`,
      clear: () => actions.setTrack(""),
    });
  }
  if (filters.topN !== 10) {
    chips.push({
      key: "topN",
      label: `Top: ${filters.topN}`,
      clear: () => actions.setTopN(10),
    });
  }

  return (
    <div className="filterbar" id="filterbar">
      <div className="filter-lead">
        <Filter size={14} />
        <span>Filters</span>
      </div>

      <label className="filter-control">
        <span>Year</span>
        <select
          id="yearFilter"
          aria-label="Filter by year"
          value={filters.year}
          onChange={(event) => actions.setYear(event.target.value)}
        >
          <option value="all">All years</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <details className="dropdown" id="countryDropdown">
        <summary className="filter-control">
          <span>Country</span>
          <strong>{countrySummary(filters)}</strong>
          <ChevronDown size={12} />
        </summary>
        <div className="dropdown-panel">
          <div className="dropdown-actions">
            <button type="button" onClick={() => actions.setAllCountries(true)}>
              Select all
            </button>
            <button type="button" onClick={() => actions.setAllCountries(false)}>
              Clear
            </button>
          </div>
          <div className="check-list">
            {COUNTRIES.map((country) => (
              <label className="check-row" key={country}>
                <input
                  type="checkbox"
                  checked={filters.countries.has(country)}
                  onChange={() => actions.toggleCountry(country)}
                />
                {country}
              </label>
            ))}
          </div>
        </div>
      </details>

      <ComboField
        label="Artist"
        icon={User}
        kind="artist"
        value={filters.artist}
        options={ARTISTS}
        onSelect={actions.setArtist}
        onClear={() => actions.setArtist("")}
      />

      <ComboField
        label="Track"
        icon={Disc3}
        kind="track"
        value={filters.track}
        options={TRACKS}
        onSelect={actions.setTrack}
        onClear={() => actions.setTrack("")}
      />

      <details className="dropdown" id="monthDropdown">
        <summary className="filter-control">
          <span>Month</span>
          <strong>{monthSummary(filters)}</strong>
          <ChevronDown size={12} />
        </summary>
        <div className="dropdown-panel">
          <div className="dropdown-actions">
            <button type="button" onClick={() => actions.setAllMonths(true)}>
              Select all
            </button>
            <button type="button" onClick={() => actions.setAllMonths(false)}>
              Clear
            </button>
          </div>
          <div className="check-list month-list">
            {MONTH_NAMES.map((month, index) => (
              <label className="check-row" key={month}>
                <input
                  type="checkbox"
                  checked={filters.months.has(index)}
                  onChange={() => actions.toggleMonth(index)}
                />
                {month}
              </label>
            ))}
          </div>
        </div>
      </details>

      <label className="filter-control narrow">
        <span>Top</span>
        <select
          id="topNFilter"
          aria-label="Top N results"
          value={filters.topN}
          onChange={(event) => actions.setTopN(event.target.value)}
        >
          {[5, 10, 15, 20, 50].map((value) => (
            <option key={value} value={value}>
              Top {value}
            </option>
          ))}
        </select>
      </label>

      <button
        className="reset-btn"
        id="resetBtn"
        type="button"
        onClick={actions.reset}
        title="Reset all filters"
      >
        <RotateCcw size={13} />
        <span>Reset</span>
        {activeCount > 0 && <span className="reset-count">{activeCount}</span>}
      </button>

      <div className="active-filters" id="activeFilters">
        {chips.map((chip) => (
          <span className="filter-chip" key={chip.key}>
            {chip.label}
            <button type="button" onClick={chip.clear} aria-label={`Remove ${chip.label}`}>
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
