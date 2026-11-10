import {
  ARTISTS,
  COUNTRIES,
  MONTHS,
  MONTH_OF_YEAR,
  ROWS,
  TRACKS,
  YEARS,
} from "../data/dataset";

export function filterRows(filters, options = {}) {
  const { year, countries, months, artist, track } = filters;
  const yi = year === "all" ? -1 : YEARS.indexOf(String(year));
  const allowed = options.ignoreCountries ? new Set(COUNTRIES) : countries;
  const ai = artist ? ARTISTS.indexOf(artist) : -1;
  const ti = track ? TRACKS.indexOf(track) : -1;
  const out = [];

  for (let i = 0; i < ROWS.length; i += 1) {
    const row = ROWS[i];
    if (yi >= 0 && row[0] !== yi) continue;
    if (!allowed.has(COUNTRIES[row[1]])) continue;
    if (!months.has(MONTH_OF_YEAR[row[2]])) continue;
    if (ai >= 0 && row[4] !== ai) continue;
    if (ti >= 0 && row[3] !== ti) continue;
    out.push(row);
  }
  return out;
}

export function buildModel(rows) {
  const countryCount = COUNTRIES.length;
  const monthCount = MONTHS.length;
  const countryTotals = new Array(countryCount).fill(0);
  const monthTotals = new Array(monthCount).fill(0);
  const countryMonth = [];
  const countryTracks = [];
  const countryArtists = [];
  const trackAgg = new Map();
  const artistAgg = new Map();
  const monthsSet = new Set();
  let total = 0;

  for (let ci = 0; ci < countryCount; ci += 1) {
    countryMonth.push(new Array(monthCount).fill(0));
    countryTracks.push(new Map());
    countryArtists.push(new Map());
  }

  for (let i = 0; i < rows.length; i += 1) {
    const [yearIndex, ci, mi, ti, ai, value] = rows[i];
    total += value;
    countryTotals[ci] += value;
    monthTotals[mi] += value;
    countryMonth[ci][mi] += value;
    monthsSet.add(mi);

    const key = `${ti}|${ai}`;
    let trackItem = trackAgg.get(key);
    if (!trackItem) {
      trackItem = {
        key,
        ti,
        ai,
        name: TRACKS[ti],
        artistName: ARTISTS[ai],
        streams: 0,
        months: new Set(),
        countrySet: new Set(),
        countryStreams: new Array(countryCount).fill(0),
        monthly: new Map(),
        yearIndex,
      };
      trackAgg.set(key, trackItem);
    }
    trackItem.streams += value;
    trackItem.months.add(mi);
    trackItem.countrySet.add(ci);
    trackItem.countryStreams[ci] += value;
    trackItem.monthly.set(mi, (trackItem.monthly.get(mi) || 0) + value);

    let artistItem = artistAgg.get(ai);
    if (!artistItem) {
      artistItem = {
        ai,
        name: ARTISTS[ai],
        streams: 0,
        trackKeys: new Set(),
        months: new Set(),
        countrySet: new Set(),
        countryStreams: new Array(countryCount).fill(0),
        monthly: new Map(),
        topTrack: null,
      };
      artistAgg.set(ai, artistItem);
    }
    artistItem.streams += value;
    artistItem.trackKeys.add(key);
    artistItem.months.add(mi);
    artistItem.countrySet.add(ci);
    artistItem.countryStreams[ci] += value;
    artistItem.monthly.set(mi, (artistItem.monthly.get(mi) || 0) + value);

    let marketTrack = countryTracks[ci].get(key);
    if (!marketTrack) {
      marketTrack = {
        key,
        ti,
        ai,
        name: TRACKS[ti],
        artistName: ARTISTS[ai],
        streams: 0,
        months: new Set(),
        monthly: new Map(),
      };
      countryTracks[ci].set(key, marketTrack);
    }
    marketTrack.streams += value;
    marketTrack.months.add(mi);
    marketTrack.monthly.set(mi, (marketTrack.monthly.get(mi) || 0) + value);

    let marketArtist = countryArtists[ci].get(ai);
    if (!marketArtist) {
      marketArtist = { ai, name: ARTISTS[ai], streams: 0, trackKeys: new Set() };
      countryArtists[ci].set(ai, marketArtist);
    }
    marketArtist.streams += value;
    marketArtist.trackKeys.add(key);
  }

  const tracksList = [...trackAgg.values()].sort((a, b) => b.streams - a.streams);
  for (const item of tracksList) {
    item.share = total ? (item.streams / total) * 100 : 0;
    item.avg = item.months.size ? item.streams / item.months.size : 0;
    item.reach = item.countrySet.size;
    let bestCi = -1;
    let bestValue = -1;
    for (let ci = 0; ci < countryCount; ci += 1) {
      if (item.countryStreams[ci] > bestValue) {
        bestValue = item.countryStreams[ci];
        bestCi = ci;
      }
    }
    item.topCountry = bestCi >= 0 ? COUNTRIES[bestCi] : "";
    const owner = artistAgg.get(item.ai);
    if (owner && !owner.topTrack) owner.topTrack = item;
  }

  const artistsList = [...artistAgg.values()].sort((a, b) => b.streams - a.streams);
  for (const item of artistsList) {
    item.share = total ? (item.streams / total) * 100 : 0;
    item.trackCount = item.trackKeys.size;
    item.marketCount = item.countrySet.size;
    item.avg = item.months.size ? item.streams / item.months.size : 0;
  }

  const countryList = [];
  for (let ci = 0; ci < countryCount; ci += 1) {
    if (countryTotals[ci] <= 0) continue;
    const tracks = [...countryTracks[ci].values()].sort((a, b) => b.streams - a.streams);
    for (const item of tracks) {
      item.share = (item.streams / countryTotals[ci]) * 100;
    }
    const artists = [...countryArtists[ci].values()].sort((a, b) => b.streams - a.streams);
    countryList.push({
      ci,
      name: COUNTRIES[ci],
      streams: countryTotals[ci],
      share: total ? (countryTotals[ci] / total) * 100 : 0,
      topTrack: tracks[0] || null,
      topArtist: artists[0] || null,
      trackCount: tracks.length,
      artistCount: artists.length,
      monthly: countryMonth[ci],
      tracks,
      artists,
    });
  }
  countryList.sort((a, b) => b.streams - a.streams);

  const activeMonths = [...monthsSet].sort((a, b) => a - b);
  return {
    rows: rows.length,
    total,
    countryTotals,
    countryMonth,
    monthTotals,
    trackAgg,
    tracksList,
    artistAgg,
    artistsList,
    countryTracks,
    countryArtists,
    countryList,
    activeMonths,
  };
}

export function filterSignature(filters, ignoreCountries = false) {
  return [
    filters.year,
    ignoreCountries ? "all" : [...filters.countries].sort().join("|"),
    [...filters.months].sort((a, b) => a - b).join("|"),
    filters.artist,
    filters.track,
  ].join("::");
}

export function reachDistribution(model) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const item of model.tracksList) {
    const reach = item.countrySet.size;
    if (reach >= 1 && reach <= 5) dist[reach] += 1;
  }
  return dist;
}

export function sharedTracksFor(model, ci, cj) {
  const a = model.countryTracks[ci];
  const b = model.countryTracks[cj];
  const out = [];
  a.forEach((item, key) => {
    if (b.has(key)) {
      const full = model.trackAgg.get(key);
      if (full) out.push(full);
    }
  });
  return out.sort((x, y) => y.streams - x.streams);
}

export function onlyMarketTracks(model, ci) {
  return [...model.countryTracks[ci].values()]
    .filter((item) => {
      for (let j = 0; j < COUNTRIES.length; j += 1) {
        if (j !== ci && model.countryTracks[j].has(item.key)) return false;
      }
      return true;
    })
    .sort((a, b) => b.streams - a.streams);
}
