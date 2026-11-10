import { useCallback, useMemo, useState } from "react";
import { COUNTRIES } from "../data/dataset";
import { filterRows, filterSignature } from "../lib/model";

export function createDefaultFilters() {
  return {
    year: "all",
    countries: new Set(COUNTRIES),
    months: new Set(Array.from({ length: 12 }, (_, index) => index)),
    artist: "",
    track: "",
    topN: 10,
  };
}

export default function useFilters() {
  const [filters, setFilters] = useState(createDefaultFilters);

  const setYear = useCallback((year) => {
    setFilters((current) => ({ ...current, year }));
  }, []);

  const setTopN = useCallback((topN) => {
    setFilters((current) => ({ ...current, topN: Number(topN) || 10 }));
  }, []);

  const setArtist = useCallback((artist) => {
    setFilters((current) => ({ ...current, artist: artist || "" }));
  }, []);

  const setTrack = useCallback((track) => {
    setFilters((current) => ({ ...current, track: track || "" }));
  }, []);

  const toggleCountry = useCallback((name) => {
    setFilters((current) => {
      const next = new Set(current.countries);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...current, countries: next };
    });
  }, []);

  const setAllCountries = useCallback((selected) => {
    setFilters((current) => ({
      ...current,
      countries: selected ? new Set(COUNTRIES) : new Set(),
    }));
  }, []);

  const isolateCountry = useCallback((name) => {
    setFilters((current) => ({ ...current, countries: new Set([name]) }));
  }, []);

  const toggleMonth = useCallback((index) => {
    setFilters((current) => {
      const next = new Set(current.months);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...current, months: next };
    });
  }, []);

  const setAllMonths = useCallback((selected) => {
    setFilters((current) => ({
      ...current,
      months: selected
        ? new Set(Array.from({ length: 12 }, (_, index) => index))
        : new Set(),
    }));
  }, []);

  const reset = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const rows = useMemo(() => filterRows(filters), [filters]);
  const baseRows = useMemo(
    () => filterRows(filters, { ignoreCountries: true }),
    [filters]
  );
  const signature = useMemo(() => filterSignature(filters), [filters]);
  const baseSignature = useMemo(
    () => filterSignature(filters, true),
    [filters]
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.year !== "all") count += 1;
    if (filters.countries.size !== COUNTRIES.length) count += 1;
    if (filters.months.size !== 12) count += 1;
    if (filters.artist) count += 1;
    if (filters.track) count += 1;
    if (filters.topN !== 10) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    rows,
    baseRows,
    signature,
    baseSignature,
    activeCount,
    setYear,
    setTopN,
    setArtist,
    setTrack,
    toggleCountry,
    setAllCountries,
    isolateCountry,
    toggleMonth,
    setAllMonths,
    reset,
  };
}
