/* Spotify Intelligence - premium analytics workspace */
(function () {
  "use strict";

  var DATA = window.SPOTIFY_DATA;
  var boot = document.getElementById("boot");
  var viewRoot = document.getElementById("viewRoot");

  function hideBoot() {
    if (boot) boot.classList.add("done");
  }

  if (!DATA || !DATA.rows) {
    hideBoot();
    if (viewRoot) {
      viewRoot.innerHTML =
        '<div class="empty-state"><div class="empty-icon"><i data-lucide="database"></i></div>' +
        "<h3>data.js could not be loaded</h3>" +
        "<p>Run <code>python prepare_data.py</code> inside the dashboard folder, then reload this page.</p></div>";
      if (window.lucide) window.lucide.createIcons();
    }
    return;
  }

  var YEARS = DATA.years;
  var COUNTRIES = DATA.countries;
  var MONTHS = DATA.months;
  var TRACKS = DATA.tracks;
  var ARTISTS = DATA.artists;
  var ROWS = DATA.rows;
  var STATS = DATA.stats || {};
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var COUNTRY_CODE = { Brazil: "BR", India: "IN", Mexico: "MX", "United Kingdom": "UK", "United States": "US" };
  var COUNTRY_COLORS = {
    Brazil: "#34d399",
    India: "#fbbf24",
    Mexico: "#22d3ee",
    "United Kingdom": "#a78bfa",
    "United States": "#60a5fa",
  };
  var REACH_COLORS = ["#1db954", "#22d3ee", "#a78bfa", "#fbbf24", "#f472b6"];
  var MONTH_OF_YEAR = MONTHS.map(function (m) { return parseInt(m.slice(5), 10) - 1; });

  var PAGE_META = {
    overview: { title: "Overview", crumb: "Overview", subtitle: "Executive view of recorded streaming values across five markets." },
    countries: { title: "Countries", crumb: "Countries", subtitle: "Market-by-market comparison, overlap and catalogue exclusives." },
    artists: { title: "Artists", crumb: "Artists", subtitle: "Ranking, reach and catalogue depth across 454 artists." },
    songs: { title: "Songs", crumb: "Songs", subtitle: "Track-level performance across markets, months and markets reached." },
    insights: { title: "Growth & Insights", crumb: "Growth & Insights", subtitle: "What this dataset can and cannot support." },
    quality: { title: "Data Quality", crumb: "Data Quality", subtitle: "Integrity checks, methodology, dictionary and the notebook replica." },
  };

  var state = {
    view: "overview",
    year: "all",
    countries: new Set(COUNTRIES),
    months: new Set(MONTH_NAMES.map(function (_, i) { return i; })),
    artist: "",
    track: "",
    topN: 10,
    trendMode: "area",
    compare: new Set(),
    comparePair: null,
    artistSearch: "",
    artistSort: { key: "streams", dir: "desc" },
    artistPage: 1,
    artistPageSize: 12,
    songSearch: "",
    songSort: { key: "streams", dir: "desc" },
    songPage: 1,
    songPageSize: 12,
  };

  var charts = new Map();
  var modalChartIds = new Set();
  var modalPrevOverflow = "";
  var combos = {};

  /* ------------------------------- helpers -------------------------------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function fmtInt(n) { return Math.round(n || 0).toLocaleString("en-US"); }
  function fmtCompact(n) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
  }
  function fmtPct(n) { return (Math.round((n || 0) * 10) / 10).toFixed(1) + "%"; }
  function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "\u2026" : s; }
  function withAlpha(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var num = parseInt(h, 16);
    return "rgba(" + ((num >> 16) & 255) + "," + ((num >> 8) & 255) + "," + (num & 255) + "," + a + ")";
  }
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
  function monthLabel(mi, span) {
    var m = MONTH_OF_YEAR[mi];
    var y = MONTHS[mi].slice(2, 4);
    return span > 12 ? MONTH_NAMES[m] + " '" + y : MONTH_NAMES[m];
  }
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }
  function initials(name) {
    var parts = String(name).replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function hashPair(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
    var palette = [
      ["#1db954", "#22d3ee"], ["#22d3ee", "#60a5fa"], ["#a78bfa", "#f472b6"],
      ["#fbbf24", "#f472b6"], ["#34d399", "#a78bfa"], ["#60a5fa", "#34d399"],
      ["#f472b6", "#fbbf24"], ["#1db954", "#60a5fa"],
    ];
    return palette[h % palette.length];
  }
  function avatarHtml(name, cls) {
    var p = hashPair(name);
    return '<span class="avatar ' + (cls || "") + '" style="--av-a:' + p[0] + ";--av-b:" + p[1] + '">' + esc(initials(name)) + "</span>";
  }
  function trackArtHtml(key, cls) {
    var p = hashPair(String(key));
    return '<span class="track-art ' + (cls || "") + '" style="--av-a:' + p[0] + ";--av-b:" + p[1] + '"><i data-lucide="music"></i></span>';
  }
  function sortMark(sort, key) {
    if (!sort || sort.key !== key) return "";
    return '<span class="sort-mark">' + (sort.dir === "asc" ? "\u2191" : "\u2193") + "</span>";
  }
  function sortRows(rows, sort, nameFn) {
    var dir = sort.dir === "asc" ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var av = sort.key === "name" ? nameFn(a) : a[sort.key];
      var bv = sort.key === "name" ? nameFn(b) : b[sort.key];
      if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv)) * dir;
      return ((av || 0) - (bv || 0)) * dir;
    });
  }

  function flagSvg(name) {
    var svg = "";
    if (name === "Brazil") {
      svg = '<rect width="34" height="24" fill="#009b3a"/><path d="M17 3.4 30.6 12 17 20.6 3.4 12Z" fill="#fedf00"/><circle cx="17" cy="12" r="4.1" fill="#002776"/><path d="M13 11.4c2.5-1 5.4-1 8 .1" stroke="#fff" stroke-width=".9" fill="none"/>';
    } else if (name === "India") {
      svg = '<rect width="34" height="8" fill="#ff9933"/><rect y="8" width="34" height="8" fill="#fff"/><rect y="16" width="34" height="8" fill="#138808"/><circle cx="17" cy="12" r="3" fill="none" stroke="#000080" stroke-width=".8"/><circle cx="17" cy="12" r=".8" fill="#000080"/>';
    } else if (name === "Mexico") {
      svg = '<rect width="11.3" height="24" fill="#006847"/><rect x="11.3" width="11.4" height="24" fill="#fff"/><rect x="22.7" width="11.3" height="24" fill="#ce1126"/><circle cx="17" cy="12" r="2.8" fill="none" stroke="#8b5e34" stroke-width=".8"/><path d="M15.8 12.8c.8-.7 1.6-.7 2.4 0" stroke="#8b5e34" stroke-width=".6" fill="none"/>';
    } else if (name === "United Kingdom") {
      svg = '<rect width="34" height="24" fill="#012169"/><path d="M0 0l34 24M34 0L0 24" stroke="#fff" stroke-width="4.4"/><path d="M0 0l34 24M34 0L0 24" stroke="#c8102e" stroke-width="1.8"/><path d="M17 0v24M0 12h34" stroke="#fff" stroke-width="7"/><path d="M17 0v24M0 12h34" stroke="#c8102e" stroke-width="3.6"/>';
    } else {
      for (var i = 0; i < 13; i++) {
        svg += '<rect y="' + (i * 24 / 13).toFixed(2) + '" width="34" height="' + (24 / 13 + 0.05).toFixed(2) + '" fill="' + (i % 2 === 0 ? "#b22234" : "#fff") + '"/>';
      }
      svg += '<rect width="14" height="11.1" fill="#3c3b6e"/>';
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 4; c++) {
          svg += '<circle cx="' + (2 + c * 3.3) + '" cy="' + (2 + r * 3.3) + '" r=".7" fill="#fff"/>';
        }
      }
    }
    return '<span class="flag" aria-hidden="true"><svg viewBox="0 0 34 24">' + svg + "</svg></span>";
  }

  function sparkSvg(values, color) {
    var nums = values.filter(function (v) { return typeof v === "number" && isFinite(v); });
    if (nums.length < 2) return "";
    var w = 90, h = 32, pad = 3;
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    var span = max - min || 1;
    var pts = nums.map(function (v, i) {
      return [pad + i * (w - pad * 2) / (nums.length - 1), h - pad - ((v - min) / span) * (h - pad * 2)];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + h + " L" + pts[0][0].toFixed(1) + " " + h + " Z";
    return '<svg class="kpi-spark" viewBox="0 0 90 32" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + area + '" fill="' + withAlpha(color, 0.13) + '"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function kpiHtml(opts) {
    var color = opts.color || "#1db954";
    var valueClass = opts.text ? " text" : "";
    var title = opts.title ? ' title="' + esc(opts.title) + '"' : "";
    return '<div class="kpi" style="--kpi-color:' + color + ";--kpi-bg:" + withAlpha(color, 0.13) + '">' +
      '<div class="kpi-head"><span class="kpi-label">' + esc(opts.label) + "</span>" +
      '<span class="kpi-icon"><i data-lucide="' + esc(opts.icon) + '"></i></span></div>' +
      '<div class="kpi-value' + valueClass + '"' + title + ">" + esc(opts.value) + "</div>" +
      '<div class="kpi-sub">' + (opts.sub || "") + "</div>" +
      (opts.spark ? sparkSvg(opts.spark, color) : "") + "</div>";
  }

  function cardTools(chartId, extra) {
    return '<div class="card-tools">' + (extra || "") +
      '<button class="card-tool" type="button" data-chart-tool="png" data-chart="' + esc(chartId) + '" title="Download chart as PNG" aria-label="Download chart as PNG"><i data-lucide="image"></i></button>' +
      '<button class="card-tool" type="button" data-chart-tool="full" data-chart="' + esc(chartId) + '" title="Toggle fullscreen chart" aria-label="Toggle fullscreen chart"><i data-lucide="maximize-2"></i></button></div>';
  }

  function emptyState(title, body) {
    return '<div class="empty-state"><div class="empty-icon"><i data-lucide="scan-eye"></i></div>' +
      "<h3>" + esc(title) + "</h3><p>" + esc(body) + "</p>" +
      '<button class="btn primary" type="button" data-action="reset-filters"><i data-lucide="rotate-ccw"></i>Reset filters</button></div>';
  }

  function noticeHtml(kind, icon, title, body, action) {
    return '<div class="notice ' + kind + '"><div class="notice-icon ' + (kind === "danger" ? "danger" : "") + '"><i data-lucide="' + icon + '"></i></div>' +
      '<div class="notice-body"><strong>' + esc(title) + "</strong><p>" + body + "</p>" + (action || "") + "</div></div>";
  }

  function chipCountry(name) {
    return '<span class="chip-country"><i style="background:' + (COUNTRY_COLORS[name] || "#1db954") + '"></i>' + esc(name) + "</span>";
  }

  /* ------------------------------- data model ------------------------------ */

  function filterRows(opts) {
    opts = opts || {};
    var yi = state.year === "all" ? -1 : YEARS.indexOf(state.year);
    var allowed = opts.countriesOverride ? new Set(opts.countriesOverride) : opts.ignoreCountries ? new Set(COUNTRIES) : state.countries;
    var ai = state.artist ? ARTISTS.indexOf(state.artist) : -1;
    var ti = state.track ? TRACKS.indexOf(state.track) : -1;
    var out = [];
    for (var i = 0; i < ROWS.length; i++) {
      var r = ROWS[i];
      if (yi >= 0 && r[0] !== yi) continue;
      if (!allowed.has(COUNTRIES[r[1]])) continue;
      if (!state.months.has(MONTH_OF_YEAR[r[2]])) continue;
      if (ai >= 0 && r[4] !== ai) continue;
      if (ti >= 0 && r[3] !== ti) continue;
      out.push(r);
    }
    return out;
  }

  function buildModel(rows) {
    var C = COUNTRIES.length, M = MONTHS.length;
    var countryTotals = new Array(C).fill(0);
    var monthTotals = new Array(M).fill(0);
    var countryMonth = [], trackAgg = new Map(), artistAgg = new Map();
    var countryTracks = [], countryArtists = [], monthsSet = new Set();
    var total = 0;

    for (var c0 = 0; c0 < C; c0++) {
      countryMonth.push(new Array(M).fill(0));
      countryTracks.push(new Map());
      countryArtists.push(new Map());
    }

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ci = r[1], mi = r[2], ti = r[3], ai = r[4], v = r[5];
      total += v; countryTotals[ci] += v; monthTotals[mi] += v;
      countryMonth[ci][mi] += v; monthsSet.add(mi);

      var tk = ti + "|" + ai;
      var t = trackAgg.get(tk);
      if (!t) {
        t = { key: tk, ti: ti, ai: ai, name: TRACKS[ti], artistName: ARTISTS[ai], streams: 0,
          months: new Set(), countrySet: new Set(), countryStreams: new Array(C).fill(0), monthly: new Map() };
        trackAgg.set(tk, t);
      }
      t.streams += v; t.months.add(mi); t.countrySet.add(ci);
      t.countryStreams[ci] += v; t.monthly.set(mi, (t.monthly.get(mi) || 0) + v);

      var a = artistAgg.get(ai);
      if (!a) {
        a = { ai: ai, name: ARTISTS[ai], streams: 0, trackKeys: new Set(), months: new Set(),
          countrySet: new Set(), countryStreams: new Array(C).fill(0), monthly: new Map(), topTrack: null };
        artistAgg.set(ai, a);
      }
      a.streams += v; a.trackKeys.add(tk); a.months.add(mi);
      a.countrySet.add(ci); a.countryStreams[ci] += v;
      a.monthly.set(mi, (a.monthly.get(mi) || 0) + v);

      var ct = countryTracks[ci].get(tk);
      if (!ct) {
        ct = { key: tk, ti: ti, ai: ai, streams: 0, months: new Set(), monthly: new Map() };
        countryTracks[ci].set(tk, ct);
      }
      ct.streams += v; ct.months.add(mi);
      ct.monthly.set(mi, (ct.monthly.get(mi) || 0) + v);

      var ca = countryArtists[ci].get(ai);
      if (!ca) { ca = { ai: ai, streams: 0, trackKeys: new Set() }; countryArtists[ci].set(ai, ca); }
      ca.streams += v; ca.trackKeys.add(tk);
    }

    var tracksList = Array.from(trackAgg.values()).sort(function (a, b) { return b.streams - a.streams; });
    for (var tIdx = 0; tIdx < tracksList.length; tIdx++) {
      var tr = tracksList[tIdx];
      tr.share = total ? (tr.streams / total) * 100 : 0;
      tr.avg = tr.months.size ? tr.streams / tr.months.size : 0;
      tr.reach = tr.countrySet.size;
      var bestCi = -1, bestVal = -1;
      for (var ci2 = 0; ci2 < C; ci2++) {
        if (tr.countryStreams[ci2] > bestVal) { bestVal = tr.countryStreams[ci2]; bestCi = ci2; }
      }
      tr.topCountry = bestCi >= 0 ? COUNTRIES[bestCi] : "";
      var owner = artistAgg.get(tr.ai);
      if (owner && !owner.topTrack) owner.topTrack = tr;
    }

    var artistsList = Array.from(artistAgg.values()).sort(function (a, b) { return b.streams - a.streams; });
    for (var aIdx = 0; aIdx < artistsList.length; aIdx++) {
      var ar = artistsList[aIdx];
      ar.share = total ? (ar.streams / total) * 100 : 0;
      ar.trackCount = ar.trackKeys.size;
      ar.marketCount = ar.countrySet.size;
      ar.avg = ar.months.size ? ar.streams / ar.months.size : 0;
    }

    var countryList = [];
    for (var cIdx = 0; cIdx < C; cIdx++) {
      if (countryTotals[cIdx] <= 0) continue;
      var ctList = Array.from(countryTracks[cIdx].values()).sort(function (a, b) { return b.streams - a.streams; });
      for (var x = 0; x < ctList.length; x++) {
        ctList[x].name = TRACKS[ctList[x].ti];
        ctList[x].artistName = ARTISTS[ctList[x].ai];
        ctList[x].share = countryTotals[cIdx] ? (ctList[x].streams / countryTotals[cIdx]) * 100 : 0;
      }
      var caList = Array.from(countryArtists[cIdx].values()).sort(function (a, b) { return b.streams - a.streams; });
      for (var y = 0; y < caList.length; y++) caList[y].name = ARTISTS[caList[y].ai];
      countryList.push({ ci: cIdx, name: COUNTRIES[cIdx], streams: countryTotals[cIdx],
        share: total ? (countryTotals[cIdx] / total) * 100 : 0,
        topTrack: ctList[0] || null, topArtist: caList[0] || null,
        trackCount: ctList.length, artistCount: caList.length,
        monthly: countryMonth[cIdx], tracks: ctList, artists: caList });
    }
    countryList.sort(function (a, b) { return b.streams - a.streams; });

    var activeMonths = Array.from(monthsSet).sort(function (a, b) { return a - b; });
    return { rows: rows.length, total: total, countryTotals: countryTotals,
      countryMonth: countryMonth, monthTotals: monthTotals, trackAgg: trackAgg,
      tracksList: tracksList, artistAgg: artistAgg, artistsList: artistsList,
      countryTracks: countryTracks, countryArtists: countryArtists,
      countryList: countryList, activeMonths: activeMonths };
  }

  function baseFilterSignature(ignore) {
    return [state.year, ignore ? "all" : Array.from(state.countries).sort().join("|"),
      Array.from(state.months).sort(function (a, b) { return a - b; }).join("|"),
      state.artist, state.track].join("::");
  }

  var modelCache = new Map();

  function getModel(ignoreCountries) {
    var key = baseFilterSignature(ignoreCountries);
    if (modelCache.has(key)) return modelCache.get(key);
    var m = buildModel(filterRows({ ignoreCountries: ignoreCountries }));
    if (modelCache.size > 8) modelCache.clear();
    modelCache.set(key, m);
    return m;
  }

  function rowsForYear(year) {
    var yi = YEARS.indexOf(String(year));
    return ROWS.filter(function (r) { return r[0] === yi; });
  }

  function reachDistribution(model) {
    var dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (var i = 0; i < model.tracksList.length; i++) {
      var n = model.tracksList[i].countrySet.size;
      if (n >= 1 && n <= 5) dist[n] += 1;
    }
    return dist;
  }

  /* ------------------------------- chart core ------------------------------ */

  function themeColors() {
    var s = getComputedStyle(document.documentElement);
    return {
      text: s.getPropertyValue("--text").trim(),
      muted: s.getPropertyValue("--muted").trim(),
      faint: s.getPropertyValue("--faint").trim(),
      grid: s.getPropertyValue("--grid").trim(),
      card: s.getPropertyValue("--card").trim(),
      border: s.getPropertyValue("--border").trim(),
      accent: s.getPropertyValue("--accent").trim(),
      isLight: document.documentElement.getAttribute("data-theme") === "light",
    };
  }

  function tooltipStyle(t) {
    return {
      backgroundColor: t.isLight ? "#ffffff" : "#0e1722",
      titleColor: t.text, bodyColor: t.muted, footerColor: t.faint,
      borderColor: t.border, borderWidth: 1, padding: 10, cornerRadius: 8,
      boxWidth: 8, boxHeight: 8, usePointStyle: true,
      titleFont: { size: 11.5, weight: "600" }, bodyFont: { size: 11.5 },
    };
  }

  var crosshairPlugin = {
    id: "crosshair",
    afterDraw: function (chart) {
      if (!chart.tooltip || !chart.tooltip.getActiveElements) return;
      var active = chart.tooltip.getActiveElements();
      if (!active.length) return;
      var x = active[0].element.x;
      var area = chart.chartArea;
      if (!area) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(138,155,178,0.38)";
      ctx.stroke();
      ctx.restore();
    },
  };

  function makePeakPlugin(index, color) {
    return {
      id: "peakMark",
      afterDatasetsDraw: function (chart) {
        if (index < 0 || !chart.scales.x || !chart.chartArea) return;
        var x = chart.scales.x.getPixelForValue(index);
        var area = chart.chartArea;
        if (!isFinite(x)) return;
        var ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, area.top);
        ctx.lineTo(x, area.bottom);
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = withAlpha(color, 0.4);
        ctx.stroke();
        var text = "PEAK";
        ctx.font = "700 9px Inter, system-ui, sans-serif";
        var w = ctx.measureText(text).width + 14;
        var bx = Math.min(Math.max(x - w / 2, area.left + 2), area.right - w - 2);
        var by = area.top + 5;
        ctx.fillStyle = withAlpha(color, 0.16);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, w, 18, 9);
        else ctx.rect(bx, by, w, 18);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, bx + w / 2, by + 9.5);
        ctx.restore();
      },
    };
  }

  function centerTextPlugin(lineOne, lineTwo, color, muted) {
    return {
      id: "centerText",
      afterDraw: function (chart) {
        var meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        var ctx = chart.ctx;
        var area = chart.chartArea;
        var cx = (area.left + area.right) / 2;
        var cy = (area.top + area.bottom) / 2;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.font = "700 21px Inter, system-ui, sans-serif";
        ctx.fillText(lineOne, cx, cy - 7);
        ctx.fillStyle = muted;
        ctx.font = "600 9px Inter, system-ui, sans-serif";
        ctx.letterSpacing = "0.08em";
        ctx.fillText(lineTwo, cx, cy + 13);
        ctx.restore();
      },
    };
  }

  function mountChart(id, config) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (charts.has(id)) {
      charts.get(id).destroy();
      charts.delete(id);
    }
    config.options = config.options || {};
    config.options.responsive = true;
    config.options.maintainAspectRatio = false;
    config.options.animation = config.options.animation === false ? false : {
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520,
      easing: "easeOutQuart",
    };
    var chart = new Chart(el.getContext("2d"), config);
    charts.set(id, chart);
    return chart;
  }

  function destroyAllCharts() {
    charts.forEach(function (chart) {
      try { chart.destroy(); } catch (err) { /* ignore */ }
    });
    charts.clear();
  }

  function resizeCharts() {
    charts.forEach(function (chart) {
      try { chart.resize(); } catch (err) { /* ignore */ }
    });
  }

  function trendMeta(model, countries) {
    var span = model.activeMonths.length;
    var totals = model.activeMonths.map(function (mi) {
      return countries.reduce(function (acc, c) { return acc + (c.monthly[mi] || 0); }, 0);
    });
    var peakIdx = 0;
    var peakVal = -1;
    for (var i = 0; i < totals.length; i++) {
      if (totals[i] > peakVal) { peakVal = totals[i]; peakIdx = i; }
    }
    var avg = totals.length ? sum(totals) / totals.length : 0;
    var latest = totals.length ? totals[totals.length - 1] : 0;
    return {
      totals: totals, peakIdx: peakIdx, peakVal: peakVal, avg: avg, latest: latest,
      peakLabel: span ? monthLabel(model.activeMonths[peakIdx], span) : "-",
      latestLabel: span ? monthLabel(model.activeMonths[span - 1], span) : "-",
    };
  }

  function markPeakPoint(plugin) { return plugin; }

  function trendCardHtml(model, chartId, opts) {
    opts = opts || {};
    var countries = opts.countries || model.countryList;
    var meta = trendMeta(model, countries);
    var span = model.activeMonths.length;
    var modes = [["flow", "Flow"], ["area", "Area"], ["line", "Line"], ["bar", "Bar"]];
    var segmented = opts.segmented === false ? "" :
      '<div class="segmented" role="group" aria-label="Trend style">' +
      modes.map(function (m) {
        return '<button type="button" data-trend-mode="' + m[0] + '" class="' + (state.trendMode === m[0] ? "active" : "") + '">' + m[1] + "</button>";
      }).join("") + "</div>";
    var legend = opts.legend === false ? "" :
      '<div class="pill-row" style="margin-top:10px">' + countries.map(function (c) {
        return '<span class="chip-country"><i style="background:' + (COUNTRY_COLORS[c.name] || "#1db954") + '"></i>' + esc(c.name) + "</span>";
      }).join("") + "</div>";
    return '<div class="card trend-card ' + (opts.span || "span-8") + ' mode-' + state.trendMode + '">' +
      '<div class="card-head"><div><h2>' + esc(opts.title || "Recorded value trend") + "</h2>" +
      "<p>" + esc(opts.sub || "Monthly recorded values across the selected scope.") + "</p></div>" +
      '<div class="card-tools">' + segmented + cardTools(chartId) + "</div></div>" +
      '<div class="chart-wrap ' + (opts.tall === false ? "" : "tall") + '"><canvas id="' + chartId + '"></canvas></div>' +
      '<div class="trend-meta">' +
      '<div class="trend-chip"><span>Peak month</span><strong>' + esc(meta.peakLabel) + "</strong></div>" +
      '<div class="trend-chip"><span>Peak value</span><strong>' + fmtCompact(meta.peakVal) + "</strong></div>" +
      '<div class="trend-chip"><span>Monthly average</span><strong>' + fmtCompact(meta.avg) + "</strong></div>" +
      '<div class="trend-chip"><span>Latest month</span><strong>' + fmtCompact(meta.latest) + "</strong></div>" +
      "</div>" + legend +
      '<div class="card-caption warn"><i data-lucide="triangle-alert"></i>' + esc(opts.caption || "Monthly values follow a two-level 1.25x source pattern. Treat peaks as recorded structure, not organic growth.") + "</div></div>";
  }

  function mountTrendChart(chartId, model, countries, opts) {
    opts = opts || {};
    var t = themeColors();
    var span = model.activeMonths.length;
    if (!span || !document.getElementById(chartId)) return;
    var labels = model.activeMonths.map(function (mi) { return monthLabel(mi, span); });
    var mode = opts.mode || state.trendMode;
    var meta = trendMeta(model, countries);
    var datasets = countries.map(function (c, i) {
      var color = COUNTRY_COLORS[c.name] || REACH_COLORS[i % REACH_COLORS.length];
      if (mode === "bar") {
        return {
          label: c.name,
          data: model.activeMonths.map(function (mi) { return c.monthly[mi] || 0; }),
          backgroundColor: withAlpha(color, 0.74),
          hoverBackgroundColor: color,
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 26,
        };
      }
      var fill = false;
      if (mode === "flow") fill = i === 0 ? "origin" : "-1";
      if (mode === "area") fill = "origin";
      return {
        label: c.name,
        data: model.activeMonths.map(function (mi) { return c.monthly[mi] || 0; }),
        borderColor: color,
        backgroundColor: withAlpha(color, mode === "flow" ? 0.5 : 0.16),
        fill: fill,
        tension: 0.36,
        borderWidth: mode === "line" ? 2.2 : 1.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: t.card,
        pointHoverBorderWidth: 2,
        borderSkipped: false,
      };
    });
    var stacked = mode === "flow" || mode === "bar";
    var config = {
      type: mode === "bar" ? "bar" : "line",
      data: { labels: labels, datasets: datasets },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: {
              title: function (items) { return items.length ? items[0].label : ""; },
              label: function (ctx) {
                if (mode === "flow" || mode === "bar") return ctx.dataset.label + ": " + fmtInt(ctx.parsed.y);
                return ctx.dataset.label + ": " + fmtInt(ctx.parsed.y);
              },
              footer: function (items) {
                var total = items.reduce(function (acc, it) { return acc + (it.parsed.y || 0); }, 0);
                return mode === "flow" || mode === "bar" ? "Total: " + fmtInt(total) : "";
              },
            },
          }),
        },
        scales: {
          x: {
            stacked: stacked,
            grid: { display: false },
            border: { display: false },
            ticks: { color: t.faint, font: { size: 9.5 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
          },
          y: {
            stacked: stacked,
            beginAtZero: true,
            border: { display: false },
            grid: { color: t.grid },
            ticks: { color: t.faint, font: { size: 9.5 }, maxTicksLimit: 5, callback: function (v) { return fmtCompact(v); } },
          },
        },
      },
      plugins: mode === "bar" ? [crosshairPlugin] : [crosshairPlugin, makePeakPlugin(meta.peakIdx, "#fbbf24")],
    };
    mountChart(chartId, config);
  }

  function donutCardHtml(model, span) {
    var colors = model.countryList.map(function (c) { return COUNTRY_COLORS[c.name] || "#1db954"; });
    var legend = model.countryList.map(function (c, i) {
      return '<button class="donut-legend-item" type="button" data-isolate-country="' + esc(c.name) + '" title="Filter to ' + esc(c.name) + '">' +
        '<span class="donut-dot" style="background:' + colors[i] + '"></span>' +
        '<span class="donut-legend-main"><strong>' + esc(c.name) + "</strong><span>" + fmtCompact(c.streams) + "</span></span>" +
        '<span class="donut-legend-value">' + fmtPct(c.share) + "</span></button>";
    }).join("");
    return '<div class="card ' + (span || "span-4") + '">' +
      '<div class="card-head"><div><h2>Market distribution</h2><p>Share of recorded values in scope.</p></div>' + cardTools("countryDonut") + "</div>" +
      '<div class="donut-layout"><div class="donut-canvas"><canvas id="countryDonut"></canvas></div><div class="donut-legend">' + legend + "</div></div>" +
      '<div class="card-caption">Click a legend row to isolate that market. Click a slice to open the market profile.</div></div>';
  }

  function mountDonutChart(model) {
    if (!document.getElementById("countryDonut")) return;
    var t = themeColors();
    var colors = model.countryList.map(function (c) { return COUNTRY_COLORS[c.name] || "#1db954"; });
    mountChart("countryDonut", {
      type: "doughnut",
      data: {
        labels: model.countryList.map(function (c) { return c.name; }),
        datasets: [{
          data: model.countryList.map(function (c) { return c.streams; }),
          backgroundColor: colors.map(function (c) { return withAlpha(c, 0.82); }),
          hoverBackgroundColor: colors,
          borderColor: t.card,
          borderWidth: 2,
          hoverOffset: 5,
        }],
      },
      options: {
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: {
              label: function (ctx) {
                var c = model.countryList[ctx.dataIndex];
                return " " + c.name + ": " + fmtInt(c.streams) + " (" + fmtPct(c.share) + ")";
              },
            },
          }),
        },
        onClick: function (evt, els) {
          if (els && els.length) openCountryModal(model.countryList[els[0].index].name);
        },
      },
      plugins: [centerTextPlugin(fmtCompact(model.total), "RECORDED", t.text, t.faint)],
    });
  }

  function rankRowHtml(opts) {
    var attr = opts.kind === "artist" ? "data-open-artist" : "data-open-track";
    var icon = opts.kind === "artist" ? avatarHtml(opts.name) : trackArtHtml(opts.key);
    return '<button class="rank-row" type="button" ' + attr + '="' + esc(opts.key) + '">' +
      '<span class="rank-no">' + (opts.index + 1) + "</span>" + icon +
      '<span class="rank-main"><strong title="' + esc(opts.name) + '">' + esc(opts.name) + "</strong>" +
      "<span title=\"" + esc(opts.sub) + "\">" + esc(opts.sub) + "</span></span>" +
      '<span class="rank-right"><strong>' + fmtCompact(opts.value) + "</strong><span>" + fmtPct(opts.share) + "</span>" +
      '<span class="rank-bar"><i style="width:' + Math.max(2, opts.pct) + '%"></i></span></span></button>';
  }

  function paginationHtml(total, page, size, table) {
    var pages = Math.max(1, Math.ceil(total / size));
    page = Math.min(Math.max(1, page), pages);
    var start = total ? (page - 1) * size + 1 : 0;
    var end = Math.min(total, page * size);
    return '<div class="pagination"><span>' + start + "\u2013" + end + " of " + fmtInt(total) +
      '</span><button type="button" data-page-table="' + table + '" data-page="prev" ' + (page <= 1 ? "disabled" : "") +
      ' aria-label="Previous page"><i data-lucide="chevron-left"></i></button>' +
      '<span>Page ' + page + " / " + pages + "</span>" +
      '<button type="button" data-page-table="' + table + '" data-page="next" ' + (page >= pages ? "disabled" : "") +
      ' aria-label="Next page"><i data-lucide="chevron-right"></i></button></div>';
  }

  /* -------------------------------- overview ------------------------------- */

  function renderOverview(model) {
    var topC = model.countryList[0];
    var topA = model.artistsList[0];
    var topT = model.tracksList[0];
    var span = model.activeMonths.length;
    var totals = model.activeMonths.map(function (mi) { return model.monthTotals[mi]; });
    var yearLabel = state.year === "all" ? "2023 \u2013 2025" : state.year;

    var artists = model.artistsList.slice(0, state.topN);
    var tracks = model.tracksList.slice(0, state.topN);
    var maxArtist = artists.length ? artists[0].streams : 1;
    var maxTrack = tracks.length ? tracks[0].streams : 1;

    return '<div class="coverage-strip">' +
      '<div class="coverage-item"><strong>' + esc(yearLabel) + "</strong><span>Years</span></div>" +
      '<div class="coverage-item"><strong>' + model.countryList.length + " / 5</strong><span>Markets</span></div>" +
      '<div class="coverage-item"><strong>' + span + "</strong><span>Months</span></div>" +
      '<div class="coverage-item"><strong>' + fmtInt(model.tracksList.length) + "</strong><span>Tracks</span></div>" +
      '<div class="coverage-item"><strong>' + fmtInt(model.artistsList.length) + "</strong><span>Artists</span></div>" +
      '<div class="coverage-item"><strong>' + fmtInt(model.rows) + "</strong><span>Rows</span></div>" +
      '<div class="coverage-note"><i data-lucide="triangle-alert"></i>Demo dataset \u00b7 mirrored source values</div></div>' +

      '<div class="kpi-grid">' +
      kpiHtml({ label: "Recorded values", value: fmtCompact(model.total), sub: "Monthly source values in current scope", icon: "activity", color: "#1db954", spark: totals }) +
      kpiHtml({ label: "Top market", value: topC ? topC.name : "-", sub: topC ? fmtPct(topC.share) + " of recorded values" : "No data", icon: "globe-2", color: "#22d3ee", text: true, title: topC ? topC.name : "" }) +
      kpiHtml({ label: "Top artist", value: topA ? topA.name : "-", sub: topA ? fmtCompact(topA.streams) + " \u00b7 " + fmtPct(topA.share) : "No data", icon: "users", color: "#a78bfa", text: true, title: topA ? topA.name : "" }) +
      kpiHtml({ label: "Top track", value: topT ? topT.name : "-", sub: topT ? esc(topT.artistName) + " \u00b7 " + topT.reach + " market" + (topT.reach === 1 ? "" : "s") : "No data", icon: "music", color: "#fbbf24", text: true, title: topT ? topT.name : "" }) +
      kpiHtml({ label: "Active markets", value: String(model.countryList.length), sub: "Markets represented in scope", icon: "map-pin", color: "#60a5fa" }) +
      kpiHtml({ label: "Distinct tracks", value: fmtInt(model.tracksList.length), sub: fmtInt(model.artistsList.length) + " distinct artists", icon: "disc-3", color: "#f472b6" }) +
      "</div>" +

      '<div class="grid">' +
      trendCardHtml(model, "trendChart", { title: "Recorded value trend", sub: "Monthly recorded values by market across the filtered scope." }) +
      donutCardHtml(model, "span-4") +

      '<div class="card span-7"><div class="card-head"><div><h2>Top artists</h2><p>Ranked by recorded values in scope.</p></div>' +
      '<span class="card-tag">Top ' + state.topN + '</span></div><div class="rank-list">' +
      artists.map(function (a, i) {
        return rankRowHtml({ kind: "artist", index: i, key: String(a.ai), name: a.name,
          sub: a.trackCount + " track" + (a.trackCount === 1 ? "" : "s") + " \u00b7 " + a.marketCount + " market" + (a.marketCount === 1 ? "" : "s"),
          value: a.streams, share: a.share, pct: (a.streams / maxArtist) * 100 });
      }).join("") + "</div>" +
      '<div class="card-caption"><button class="link-btn" type="button" data-goto="artists">Open artist intelligence \u2192</button></div></div>' +

      '<div class="card span-5"><div class="card-head"><div><h2>Top tracks</h2><p>Ranked by recorded values in scope.</p></div>' +
      '<span class="card-tag">Top ' + state.topN + '</span></div><div class="rank-list">' +
      tracks.map(function (t, i) {
        return rankRowHtml({ kind: "track", index: i, key: t.key, name: t.name,
          sub: t.artistName + " \u00b7 " + t.reach + " market" + (t.reach === 1 ? "" : "s"),
          value: t.streams, share: t.share, pct: (t.streams / maxTrack) * 100 });
      }).join("") + "</div>" +
      '<div class="card-caption"><button class="link-btn" type="button" data-goto="songs">Open track intelligence \u2192</button></div></div>' +

      '<div class="card span-12"><div class="card-head"><div><h2>Market snapshot</h2><p>Portfolio view from the selected filters, ignoring any market selection so all five stay comparable.</p></div>' +
      '<span class="card-tag">5 markets</span></div>' + marketTableHtml(model.countryList) + "</div>" +
      "</div>" +

      '<div style="margin-top:14px">' +
      noticeHtml("warning", "triangle-alert", "Demo dataset \u2014 read before citing trends",
        "Every yearly file totals <strong>7,340,879,910,728</strong>, and monthly values repeat a two-level <strong>1.25\u00d7</strong> source pattern. This workspace is for comparison and exploration, not for claiming organic market growth.",
        '<button class="link-btn" type="button" data-goto="quality">Open data quality \u2192</button>') +
      "</div>";
  }

  function marketTableHtml(countryList) {
    return '<div class="table-wrap short"><table class="data-table clickable"><thead><tr>' +
      '<th>#</th><th>Market</th><th class="num">Recorded values</th><th class="num">Share</th>' +
      '<th class="hide-sm">Top artist</th><th class="hide-sm">Top track</th></tr></thead><tbody>' +
      countryList.map(function (c, i) {
        return '<tr data-open-country="' + esc(c.name) + '"><td><span class="rank ' + (i === 0 ? "top" : "") + '">' + (i + 1) + "</span></td>" +
          '<td><span class="cell-flex">' + flagSvg(c.name) + "<strong>" + esc(c.name) + "</strong></span></td>" +
          '<td class="num">' + fmtCompact(c.streams) + "</td>" +
          '<td class="num muted">' + fmtPct(c.share) + "</td>" +
          '<td class="hide-sm muted">' + esc(c.topArtist ? c.topArtist.name : "-") + "</td>" +
          '<td class="hide-sm"><span class="track-name">' + esc(c.topTrack ? c.topTrack.name : "-") + "</span>" +
          '<span class="sub-name">' + esc(c.topTrack ? c.topTrack.artistName : "") + "</span></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* -------------------------------- countries ------------------------------ */

  function countryCardHtml(c, rank) {
    var filtered = state.countries.size < COUNTRIES.length;
    var selected = filtered && state.countries.has(c.name);
    var on = state.compare.has(c.name);
    return '<article class="country-card ' + (selected ? "selected" : "") + '" data-open-country="' + esc(c.name) + '" tabindex="0" role="button" aria-label="Open ' + esc(c.name) + ' profile">' +
      '<button class="country-compare-btn ' + (on ? "on" : "") + '" type="button" data-compare-country="' + esc(c.name) + '" title="' + (on ? "Remove from comparison" : "Add to comparison") + '" aria-label="' + (on ? "Remove from comparison" : "Add to comparison") + '"><i data-lucide="git-compare-arrows"></i></button>' +
      '<div class="country-card-top">' + flagSvg(c.name) + '<span class="badge neutral">#' + rank + "</span></div>" +
      "<h3>" + esc(c.name) + "</h3>" +
      '<div class="country-total">' + fmtCompact(c.streams) + "</div>" +
      '<div class="country-share">' + fmtPct(c.share) + " of recorded values</div>" +
      '<div class="country-mini-stats"><div><strong>' + fmtInt(c.trackCount) + "</strong><span>Tracks</span></div>" +
      "<div><strong>" + fmtInt(c.artistCount) + "</strong><span>Artists</span></div></div>" +
      '<div class="country-leaders"><span>Top artist <strong>' + esc(c.topArtist ? c.topArtist.name : "-") + "</strong></span>" +
      "<span>Top track <strong>" + esc(c.topTrack ? c.topTrack.name : "-") + "</strong></span></div></article>";
  }

  function compareBarHtml() {
    var selected = COUNTRIES.filter(function (c) { return state.compare.has(c); });
    return '<div class="compare-bar"><i data-lucide="git-compare-arrows"></i><span>Compare markets</span>' +
      (selected.length ? selected.map(function (c) {
        return '<span class="compare-chip">' + chipCountry(c) +
          '<button type="button" data-compare-remove="' + esc(c) + '" aria-label="Remove ' + esc(c) + '"><i data-lucide="x"></i></button></span>';
      }).join("") : '<span class="faint">Use the compare icon on a market card, or click an overlap cell.</span>') +
      (selected.length < 2 ? '<span class="faint">Select at least two markets.</span>' : "") +
      (selected.length ? '<button class="clear-compare" type="button" data-action="clear-compare">Clear comparison</button>' : "") +
      "</div>";
  }

  function overlapMatrixHtml(base) {
    var sets = COUNTRIES.map(function (_, ci) { return new Set(base.countryTracks[ci].keys()); });
    var pair = state.comparePair;
    var head = '<div class="overlap-cell head"></div>' + COUNTRIES.map(function (c) {
      return '<div class="overlap-cell head" title="' + esc(c) + '">' + COUNTRY_CODE[c] + "</div>";
    }).join("");
    var cells = "";
    for (var i = 0; i < COUNTRIES.length; i++) {
      cells += '<div class="overlap-cell head" title="' + esc(COUNTRIES[i]) + '">' + COUNTRY_CODE[COUNTRIES[i]] + "</div>";
      for (var j = 0; j < COUNTRIES.length; j++) {
        var count = 0;
        if (i === j) {
          count = sets[i].size;
        } else {
          sets[i].forEach(function (key) { if (sets[j].has(key)) count += 1; });
        }
        var active = pair && ((pair[0] === i && pair[1] === j) || (pair[0] === j && pair[1] === i));
        cells += '<div class="overlap-cell ' + (i === j ? "diag" : "clickable") + (active ? " active" : "") + '"' +
          (i === j ? "" : ' data-overlap="' + i + ":" + j + '"') +
          ' title="' + esc(COUNTRIES[i] + " \u2229 " + COUNTRIES[j] + ": " + count + " shared track" + (count === 1 ? "" : "s")) + '">' + count + "</div>";
      }
    }
    var shared = "";
    if (pair) {
      var list = sharedTracksFor(base, pair[0], pair[1]);
      shared = '<div class="shared-list">' + list.slice(0, 18).map(function (t) {
        return "<span>" + esc(t.name) + " \u00b7 " + esc(t.artistName) + "</span>";
      }).join("") + (list.length > 18 ? "<span>+" + (list.length - 18) + " more</span>" : "") + "</div>";
      if (!list.length) shared = '<div class="shared-list"><span>No shared tracks in this scope.</span></div>';
    }
    return '<div class="overlap-scroll"><div class="overlap-matrix" style="grid-template-columns:82px repeat(5, minmax(48px, 1fr))">' + head + cells + "</div></div>" +
      '<div class="card-caption">' + (pair ? "Shared catalogue between <strong>" + esc(COUNTRIES[pair[0]]) + "</strong> and <strong>" + esc(COUNTRIES[pair[1]]) + "</strong>." : "Select a cell to inspect the shared catalogue for that pair.") + "</div>" + shared;
  }

  function sharedTracksFor(model, ci, cj) {
    var a = model.countryTracks[ci];
    var b = model.countryTracks[cj];
    var out = [];
    a.forEach(function (t, key) {
      if (b.has(key)) {
        var full = model.trackAgg.get(key);
        if (full) out.push(full);
      }
    });
    return out.sort(function (x, y) { return y.streams - x.streams; });
  }

  function onlyMarketTracks(model, ci) {
    return Array.from(model.countryTracks[ci].values()).filter(function (t) {
      for (var j = 0; j < COUNTRIES.length; j++) {
        if (j !== ci && model.countryTracks[j].has(t.key)) return false;
      }
      return true;
    }).sort(function (a, b) { return b.streams - a.streams; });
  }

  function renderCountries(model, base) {
    var ranked = base.countryList;
    var compareCountries = state.compare.size >= 2
      ? ranked.filter(function (c) { return state.compare.has(c.name); })
      : ranked;
    var shareColors = ranked.map(function (c) { return withAlpha(COUNTRY_COLORS[c.name] || "#1db954", 0.78); });
    var exclusiveRows = COUNTRIES.map(function (name) {
      var ci = COUNTRIES.indexOf(name);
      var only = onlyMarketTracks(base, ci);
      var totalInMarket = base.countryTracks[ci].size;
      var share = totalInMarket ? (only.length / totalInMarket) * 100 : 0;
      return '<div class="split-row"><span>' + chipCountry(name) + "</span><strong>" + fmtInt(only.length) +
        " <span class=\"faint\">(" + fmtPct(share) + ")</span></strong></div>";
    }).join("");

    return '<div class="view-head"><div><span class="eyebrow"><i data-lucide="globe-2"></i>Market intelligence</span>' +
      "<h2>Five markets, one recorded catalogue</h2>" +
      "<p>Cards and overlap always retain all five markets so comparisons remain visible. Comparison views follow your picks.</p></div>" +
      '<div class="view-head-actions"><button class="btn" type="button" data-action="export-csv"><i data-lucide="download"></i>Export scope</button></div></div>' +

      '<div class="country-grid">' + ranked.map(function (c) { return countryCardHtml(c, ranked.indexOf(c) + 1); }).join("") + "</div>" +
      compareBarHtml() +

      '<div class="grid">' +
      trendCardHtml(base, "countryTrendChart", {
        title: "Comparative market trend",
        sub: state.compare.size >= 2 ? "Only the markets selected for comparison are shown." : "Monthly recorded values for all five markets.",
        countries: compareCountries,
      }) +
      '<div class="card span-4"><div class="card-head"><div><h2>Share of recorded values</h2><p>All five markets in the current scope.</p></div>' +
      cardTools("countryShareChart") + '</div><div class="chart-wrap"><canvas id="countryShareChart"></canvas></div>' +
      '<div class="card-caption">Click a bar to open the market profile.</div></div>' +

      '<div class="card span-7"><div class="card-head"><div><h2>Track overlap matrix</h2><p>Tracks shared between each pair of markets (track \u00d7 artist keys).</p></div>' +
      '<span class="card-tag">5 \u00d7 5</span></div>' + overlapMatrixHtml(base) + "</div>" +

      '<div class="card span-5"><div class="card-head"><div><h2>Market-only catalogue</h2><p>Tracks that appear in one market only within scope.</p></div>' +
      '<span class="card-tag">Reach = 1</span></div><div class="split-list">' + exclusiveRows + "</div>" +
      '<div class="card-caption">High exclusivity is expected in a demo dataset with 761 of 873 tracks present in a single market.</div></div>' +

      '<div class="card span-12"><div class="card-head"><div><h2>Portfolio detail</h2><p>Market totals, catalogue depth and leaders.</p></div>' +
      '<span class="card-tag">Filtered scope</span></div>' + marketTableHtml(ranked) + "</div>" +
      "</div>";
  }

  function mountCountriesCharts(base) {
    var compareCountries = state.compare.size >= 2
      ? base.countryList.filter(function (c) { return state.compare.has(c.name); })
      : base.countryList;
    mountTrendChart("countryTrendChart", base, compareCountries);

    var t = themeColors();
    var countryList = base.countryList;
    mountChart("countryShareChart", {
      type: "bar",
      data: {
        labels: countryList.map(function (c) { return COUNTRY_CODE[c.name]; }),
        datasets: [{
          data: countryList.map(function (c) { return c.streams; }),
          backgroundColor: countryList.map(function (c) { return withAlpha(COUNTRY_COLORS[c.name] || "#1db954", 0.78); }),
          hoverBackgroundColor: countryList.map(function (c) { return COUNTRY_COLORS[c.name] || "#1db954"; }),
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 30,
        }],
      },
      options: {
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: {
              label: function (ctx) {
                var c = countryList[ctx.dataIndex];
                return " " + c.name + ": " + fmtInt(c.streams) + " (" + fmtPct(c.share) + ")";
              },
            },
          }),
        },
        scales: {
          x: { beginAtZero: true, border: { display: false }, grid: { color: t.grid },
            ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
          y: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 10, weight: "600" } } },
        },
        onClick: function (evt, els) { if (els && els.length) openCountryModal(countryList[els[0].index].name); },
      },
    });
  }

  /* --------------------------------- artists ------------------------------- */

  function pageSlice(list, page, size) {
    var pages = Math.max(1, Math.ceil(list.length / size));
    page = Math.min(Math.max(1, page), pages);
    return list.slice((page - 1) * size, page * size);
  }

  function countryDistHtml(streams, total) {
    return '<div class="country-dist">' + COUNTRIES.map(function (name, i) {
      var pct = total ? ((streams[i] || 0) / total) * 100 : 0;
      if (!pct) return "";
      return '<i style="width:' + pct + "%;background:" + (COUNTRY_COLORS[name] || "#1db954") + '" title="' + esc(name) + ": " + fmtPct(pct) + '"></i>';
    }).join("") + "</div>";
  }

  function artistCardHtml(a) {
    return '<article class="entity-card">' +
      '<div class="entity-top">' + avatarHtml(a.name, "lg") +
      '<button class="card-tool" type="button" data-open-artist="' + a.ai + '" title="Open artist profile" aria-label="Open artist profile"><i data-lucide="arrow-up-right"></i></button></div>' +
      "<h3 title=\"" + esc(a.name) + "\">" + esc(a.name) + "</h3>" +
      '<div class="entity-sub">' + (a.topTrack ? esc(a.topTrack.name) : "No track in scope") + "</div>" +
      '<div class="entity-stats"><div><strong>' + fmtCompact(a.streams) + "</strong><span>Values</span></div>" +
      "<div><strong>" + fmtInt(a.trackCount) + "</strong><span>Tracks</span></div>" +
      "<div><strong>" + a.marketCount + "</strong><span>Markets</span></div></div>" +
      countryDistHtml(a.countryStreams, a.streams) +
      '<div class="entity-actions"><span class="badge">' + fmtPct(a.share) + " share</span>" +
      '<button class="btn" type="button" data-filter-artist="' + esc(a.name) + '"><i data-lucide="filter"></i>Filter</button></div></article>';
  }

  function artistTableHtml(artists, model) {
    var sort = state.artistSort;
    return '<div class="table-wrap"><table class="data-table clickable"><thead><tr>' +
      '<th>#</th><th class="sortable" data-sort-table="artists" data-sort-key="name">Artist' + sortMark(sort, "name") + "</th>" +
      '<th class="num sortable" data-sort-table="artists" data-sort-key="streams">Recorded values' + sortMark(sort, "streams") + "</th>" +
      '<th class="num sortable" data-sort-table="artists" data-sort-key="share">Share' + sortMark(sort, "share") + "</th>" +
      '<th class="num sortable" data-sort-table="artists" data-sort-key="trackCount">Tracks' + sortMark(sort, "trackCount") + "</th>" +
      '<th class="num sortable" data-sort-table="artists" data-sort-key="marketCount">Markets' + sortMark(sort, "marketCount") + "</th>" +
      '<th class="hide-sm">Top track</th></tr></thead><tbody>' +
      artists.map(function (a) {
        var globalRank = model.artistsList.indexOf(a) + 1;
        return '<tr data-open-artist="' + a.ai + '"><td><span class="rank ' + (globalRank <= 3 ? "top" : "") + '">' + globalRank + "</span></td>" +
          '<td><span class="cell-flex">' + avatarHtml(a.name) + "<strong>" + esc(a.name) + "</strong></span></td>" +
          '<td class="num">' + fmtCompact(a.streams) + "</td>" +
          '<td class="num muted">' + fmtPct(a.share) + "</td>" +
          '<td class="num">' + a.trackCount + "</td>" +
          '<td class="num">' + a.marketCount + "</td>" +
          '<td class="hide-sm"><span class="track-name">' + esc(a.topTrack ? a.topTrack.name : "-") + "</span>" +
          '<span class="sub-name">' + esc(a.topTrack ? fmtPct(a.topTrack.share) + " of market values" : "") + "</span></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function renderArtists(model) {
    var q = state.artistSearch.trim().toLowerCase();
    var filtered = model.artistsList.filter(function (a) {
      return !q || a.name.toLowerCase().indexOf(q) !== -1 || (a.topTrack && a.topTrack.name.toLowerCase().indexOf(q) !== -1);
    });
    var sorted = sortRows(filtered, state.artistSort, function (a) { return a.name; });
    var cards = sorted.slice(0, state.topN);
    var pageRows = pageSlice(sorted, state.artistPage, state.artistPageSize);

    return '<div class="view-head"><div><span class="eyebrow"><i data-lucide="users"></i>Artist intelligence</span>' +
      "<h2>" + fmtInt(model.artistsList.length) + " artists in scope</h2>" +
      "<p>Sort the leaderboard, search by artist or top track, and open any profile for market and monthly detail.</p></div>" +
      '<div class="view-head-actions"><button class="btn" type="button" data-goto="songs"><i data-lucide="music"></i>Track view</button></div></div>' +
      '<div class="entity-toolbar"><input class="table-search" id="artistSearchInput" type="search" value="' + esc(state.artistSearch) + '" placeholder="Search artists or tracks\u2026" aria-label="Search artists" />' +
      '<select class="select-mini" data-sort-select="artists" aria-label="Sort artists">' +
      '<option value="streams" ' + (state.artistSort.key === "streams" ? "selected" : "") + ">Most recorded values</option>" +
      '<option value="name" ' + (state.artistSort.key === "name" ? "selected" : "") + ">Artist A\u2013Z</option>" +
      '<option value="trackCount" ' + (state.artistSort.key === "trackCount" ? "selected" : "") + ">Most tracks</option>" +
      '<option value="marketCount" ' + (state.artistSort.key === "marketCount" ? "selected" : "") + ">Widest reach</option></select>" +
      '<span class="faint">' + fmtInt(filtered.length) + " matching</span></div>" +
      '<div class="entity-grid">' + cards.map(artistCardHtml).join("") + "</div>" +
      '<div class="card" style="margin-top:14px"><div class="card-head"><div><h2>Artist leaderboard</h2><p>Paged view of every artist in the current scope.</p></div>' +
      '<div class="table-toolbar"><select class="select-mini" data-page-size="artists" aria-label="Rows per page">' +
      [12, 25, 50].map(function (n) { return '<option value="' + n + '" ' + (state.artistPageSize === n ? "selected" : "") + ">" + n + " / page</option>"; }).join("") +
      "</select></div></div>" + artistTableHtml(pageRows, model) +
      paginationHtml(sorted.length, state.artistPage, state.artistPageSize, "artists") + "</div>";
  }

  /* ---------------------------------- songs -------------------------------- */

  function songTableHtml(tracks, model) {
    var sort = state.songSort;
    return '<div class="table-wrap"><table class="data-table clickable"><thead><tr>' +
      '<th>#</th><th class="sortable" data-sort-table="songs" data-sort-key="name">Track / artist' + sortMark(sort, "name") + "</th>" +
      '<th class="num sortable" data-sort-table="songs" data-sort-key="streams">Recorded values' + sortMark(sort, "streams") + "</th>" +
      '<th class="num sortable" data-sort-table="songs" data-sort-key="share">Share' + sortMark(sort, "share") + "</th>" +
      '<th class="num hide-sm sortable" data-sort-table="songs" data-sort-key="months">Months' + sortMark(sort, "months") + "</th>" +
      '<th class="num sortable" data-sort-table="songs" data-sort-key="reach">Markets' + sortMark(sort, "reach") + "</th>" +
      '<th class="hide-sm">Top market</th></tr></thead><tbody>' +
      tracks.map(function (t) {
        var globalRank = model.tracksList.indexOf(t) + 1;
        return '<tr data-open-track="' + esc(t.key) + '"><td><span class="rank ' + (globalRank <= 3 ? "top" : "") + '">' + globalRank + "</span></td>" +
          '<td><span class="cell-flex">' + trackArtHtml(t.key) + '<span class="cell-flex" style="display:block;min-width:0"><span class="track-name" title="' + esc(t.name) + '">' + esc(t.name) + "</span>" +
          '<span class="sub-name">' + esc(t.artistName) + "</span></span></span></td>" +
          '<td class="num">' + fmtCompact(t.streams) + "</td>" +
          '<td class="num muted">' + fmtPct(t.share) + "</td>" +
          '<td class="num hide-sm">' + t.months.size + "</td>" +
          '<td class="num"><span class="badge ' + (t.reach >= 4 ? "" : "neutral") + '">' + t.reach + " / 5</span></td>" +
          '<td class="hide-sm">' + (t.topCountry ? chipCountry(t.topCountry) : "-") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function renderSongs(model) {
    var q = state.songSearch.trim().toLowerCase();
    var filtered = model.tracksList.filter(function (t) {
      return !q || t.name.toLowerCase().indexOf(q) !== -1 || t.artistName.toLowerCase().indexOf(q) !== -1;
    });
    var sorted = sortRows(filtered, state.songSort, function (t) { return t.name; });
    var chartTracks = sorted.slice(0, state.topN);
    var pageRows = pageSlice(sorted, state.songPage, state.songPageSize);
    var dist = reachDistribution(model);
    var legend = [1, 2, 3, 4, 5].map(function (n) {
      return '<button class="donut-legend-item" type="button" data-reach-filter="' + n + '"><span class="donut-dot" style="background:' + REACH_COLORS[n - 1] + '"></span>' +
        '<span class="donut-legend-main"><strong>' + n + " market" + (n === 1 ? "" : "s") + "</strong><span>" + fmtInt(dist[n]) + " tracks</span></span>" +
        '<span class="donut-legend-value">' + fmtPct(model.tracksList.length ? (dist[n] / model.tracksList.length) * 100 : 0) + "</span></button>";
    }).join("");

    return '<div class="view-head"><div><span class="eyebrow"><i data-lucide="music"></i>Track intelligence</span>' +
      "<h2>" + fmtInt(model.tracksList.length) + " tracks in scope</h2>" +
      "<p>Search, sort and inspect the catalogue. Reach counts how many of the five markets a track appears in.</p></div>" +
      '<div class="view-head-actions"><button class="btn" type="button" data-action="export-csv"><i data-lucide="download"></i>Export scope</button></div></div>' +
      '<div class="entity-toolbar"><input class="table-search" id="songSearchInput" type="search" value="' + esc(state.songSearch) + '" placeholder="Search tracks or artists\u2026" aria-label="Search tracks" />' +
      '<select class="select-mini" data-sort-select="songs" aria-label="Sort tracks">' +
      '<option value="streams" ' + (state.songSort.key === "streams" ? "selected" : "") + ">Most recorded values</option>" +
      '<option value="name" ' + (state.songSort.key === "name" ? "selected" : "") + ">Track A\u2013Z</option>" +
      '<option value="months" ' + (state.songSort.key === "months" ? "selected" : "") + ">Longest run</option>" +
      '<option value="reach" ' + (state.songSort.key === "reach" ? "selected" : "") + ">Widest reach</option></select>" +
      '<span class="faint">' + fmtInt(filtered.length) + " matching</span></div>" +
      '<div class="grid">' +
      '<div class="card span-7"><div class="card-head"><div><h2>Top tracks by recorded values</h2><p>Top ' + Math.min(state.topN, chartTracks.length) + " in the current search scope.</p></div>" +
      cardTools("topSongsChart") + '</div><div class="chart-wrap tall"><canvas id="topSongsChart"></canvas></div>' +
      '<div class="card-caption">Click a bar to open the track profile.</div></div>' +
      '<div class="card span-5"><div class="card-head"><div><h2>Market reach</h2><p>How many markets each track appears in.</p></div>' +
      cardTools("reachDonut") + '</div><div class="donut-layout"><div class="donut-canvas"><canvas id="reachDonut"></canvas></div>' +
      '<div class="donut-legend">' + legend + "</div></div>" +
      '<div class="card-caption">Reach is computed inside the current filters, so a market filter changes the maximum.</div></div>' +
      '<div class="card span-12"><div class="card-head"><div><h2>Track leaderboard</h2><p>Every matching track, with reach, longevity and top market.</p></div>' +
      '<div class="table-toolbar"><select class="select-mini" data-page-size="songs" aria-label="Rows per page">' +
      [12, 25, 50].map(function (n) { return '<option value="' + n + '" ' + (state.songPageSize === n ? "selected" : "") + ">" + n + " / page</option>"; }).join("") +
      "</select></div></div>" + songTableHtml(pageRows, model) +
      paginationHtml(sorted.length, state.songPage, state.songPageSize, "songs") + "</div></div>";
  }

  function mountSongsCharts(model) {
    var q = state.songSearch.trim().toLowerCase();
    var filtered = model.tracksList.filter(function (t) {
      return !q || t.name.toLowerCase().indexOf(q) !== -1 || t.artistName.toLowerCase().indexOf(q) !== -1;
    });
    var sorted = sortRows(filtered, state.songSort, function (t) { return t.name; });
    var chartTracks = sorted.slice(0, state.topN);
    var t = themeColors();

    if (document.getElementById("topSongsChart") && chartTracks.length) {
      mountChart("topSongsChart", {
        type: "bar",
        data: {
          labels: chartTracks.map(function (x) { return truncate(x.name, 26); }),
          datasets: [{
            data: chartTracks.map(function (x) { return x.streams; }),
            backgroundColor: chartTracks.map(function (x) { return withAlpha(REACH_COLORS[(x.reach - 1) % 5], 0.8); }),
            hoverBackgroundColor: chartTracks.map(function (x) { return REACH_COLORS[(x.reach - 1) % 5]; }),
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 22,
          }],
        },
        options: {
          indexAxis: "y",
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(tooltipStyle(t), {
              callbacks: {
                label: function (ctx) {
                  var x = chartTracks[ctx.dataIndex];
                  return " " + fmtInt(x.streams) + " recorded values \u00b7 " + x.reach + " markets";
                },
                afterLabel: function (ctx) { return chartTracks[ctx.dataIndex].artistName; },
              },
            }),
          },
          scales: {
            x: { beginAtZero: true, border: { display: false }, grid: { color: t.grid },
              ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
            y: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 9.5 } } },
          },
          onClick: function (evt, els) { if (els && els.length) openTrackModal(chartTracks[els[0].index].key); },
        },
      });
    }

    if (document.getElementById("reachDonut")) {
      var dist = reachDistribution(model);
      mountChart("reachDonut", {
        type: "doughnut",
        data: {
          labels: ["1 market", "2 markets", "3 markets", "4 markets", "5 markets"],
          datasets: [{
            data: [1, 2, 3, 4, 5].map(function (n) { return dist[n]; }),
            backgroundColor: REACH_COLORS.map(function (c) { return withAlpha(c, 0.82); }),
            hoverBackgroundColor: REACH_COLORS,
            borderColor: t.card,
            borderWidth: 2,
            hoverOffset: 5,
          }],
        },
        options: {
          cutout: "68%",
          plugins: { legend: { display: false }, tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + ctx.label + ": " + fmtInt(ctx.parsed) + " tracks"; } },
          }) },
        },
        plugins: [centerTextPlugin(fmtInt(model.tracksList.length), "TRACKS", t.text, t.faint)],
      });
    }
  }

  /* -------------------------------- insights ------------------------------- */

  function renderInsights(model, base) {
    var dist = reachDistribution(model);
    var topArtistShare = model.artistsList[0] ? model.artistsList[0].share : 0;
    var top5ArtistShare = model.total ? (sum(model.artistsList.slice(0, 5).map(function (a) { return a.streams; })) / model.total) * 100 : 0;
    var top10TrackShare = model.total ? (sum(model.tracksList.slice(0, 10).map(function (t) { return t.streams; })) / model.total) * 100 : 0;
    var oneMarket = dist[1] || 0;
    var wideTracks = base.tracksList.filter(function (t) { return t.reach >= 4; });
    var yearTotals = STATS.yearTotals || {};
    var yearVals = YEARS.map(function (y) { return yearTotals[y] || 0; });
    var totalsEqual = yearVals.length > 1 && yearVals.every(function (v) { return v === yearVals[0]; });
    var high = STATS.highMonths || {};
    var highLabels = YEARS.map(function (y) {
      return y + ": " + (high[y] || []).map(function (m) { return MONTH_NAMES[m]; }).join(", ");
    }).join(" \u00b7 ");

    var reachRows = [1, 2, 3, 4, 5].map(function (n) {
      var pct = model.tracksList.length ? (dist[n] / model.tracksList.length) * 100 : 0;
      return '<div class="hbar-row"><span class="hbar-name">' + n + " market" + (n === 1 ? "" : "s") + "</span>" +
        '<span class="hbar-track"><i style="width:' + Math.max(pct, 0.6) + "%;--bar-color:" + REACH_COLORS[n - 1] + '"></i></span>' +
        '<span class="hbar-value">' + fmtInt(dist[n]) + "</span></div>";
    }).join("");

    var sharedRows = wideTracks.slice(0, 8).map(function (t) {
      return '<div class="split-row"><span>' + esc(t.name) + ' <span class="faint">\u00b7 ' + esc(t.artistName) + "</span></span>" +
        '<strong><span class="badge">' + t.reach + " / 5</span></strong></div>";
    }).join("");
    if (!sharedRows) sharedRows = '<div class="empty">No tracks reach four or more markets in this scope.</div>';

    var marketOnly = COUNTRIES.map(function (name) {
      var ci = COUNTRIES.indexOf(name);
      var only = onlyMarketTracks(base, ci);
      return '<div class="split-row"><span>' + chipCountry(name) + "</span><strong>" + fmtInt(only.length) +
        ' <span class="faint">tracks</span></strong></div>';
    }).join("");

    return '<div class="view-head"><div><span class="eyebrow"><i data-lucide="trending-up"></i>Honest signals</span>' +
      "<h2>What the data can and cannot say</h2>" +
      "<p>This view separates structural facts from claims the source cannot support. No forecasts, no invented momentum.</p></div></div>" +

      noticeHtml("danger", "circle-alert", "There is no measurable year-over-year growth",
        "The three yearly files each total <strong>" + fmtInt(yearVals[0] || 0) + "</strong> recorded values. Monthly values also alternate between two levels in a fixed <strong>1.25\u00d7</strong> ratio. Treat any growth framing as a source artifact.",
        '<button class="link-btn" type="button" data-goto="quality">Inspect the evidence \u2192</button>') +

      '<div class="card" style="margin-top:14px"><div class="stat-tiles">' +
      '<div class="stat-tile"><span>Year-over-year</span><strong>' + (totalsEqual ? "0.0%" : "\u2014") + "</strong><em>" + (totalsEqual ? "identical yearly totals" : "insufficient years") + "</em></div>" +
      '<div class="stat-tile"><span>Top market share</span><strong>' + fmtPct(model.countryList[0] ? model.countryList[0].share : 0) + "</strong><em>" + esc(model.countryList[0] ? model.countryList[0].name : "-") + "</em></div>" +
      '<div class="stat-tile"><span>Top artist share</span><strong>' + fmtPct(topArtistShare) + "</strong><em>single artist concentration</em></div>" +
      '<div class="stat-tile"><span>Top 5 artist share</span><strong>' + fmtPct(top5ArtistShare) + "</strong><em>of recorded values</em></div>" +
      '<div class="stat-tile"><span>Top 10 track share</span><strong>' + fmtPct(top10TrackShare) + "</strong><em>of recorded values</em></div>" +
      '<div class="stat-tile"><span>Single-market tracks</span><strong>' + fmtInt(oneMarket) + "</strong><em>" + fmtPct(model.tracksList.length ? (oneMarket / model.tracksList.length) * 100 : 0) + " of tracks</em></div>" +
      "</div></div>" +

      '<div class="grid" style="margin-top:14px">' +
      '<div class="card span-7"><div class="card-head"><div><h2>Yearly totals are identical</h2><p>Whole dataset, all markets and months.</p></div>' +
      cardTools("yearlyChart") + '</div><div class="chart-wrap"><canvas id="yearlyChart"></canvas></div>' +
      '<div class="card-caption warn"><i data-lucide="triangle-alert"></i>Every bar equals <strong>' + fmtInt(yearVals[0] || 0) + "</strong>. A year-over-year comparison is not informative.</div></div>" +

      '<div class="card span-5"><div class="card-head"><div><h2>Market reach distribution</h2><p>Tracks by number of markets reached.</p></div>' +
      cardTools("reachInsightChart") + '</div><div class="chart-wrap"><canvas id="reachInsightChart"></canvas></div>' +
      '<div class="card-caption">The catalogue is extremely long-tail: most tracks appear in only one market.</div></div>' +

      '<div class="card span-8"><div class="card-head"><div><h2>Monthly pattern, not growth</h2><p>Recorded values across the current time scope.</p></div>' +
      cardTools("patternChart") + '</div><div class="chart-wrap tall"><canvas id="patternChart"></canvas></div>' +
      '<div class="card-caption warn"><i data-lucide="triangle-alert"></i>High months by year \u2014 ' + esc(highLabels) + ". Amber points mark high months; the jump is a fixed source level, not seasonality.</div></div>" +

      '<div class="card span-4"><div class="card-head"><div><h2>Reach profile</h2><p>How broad the catalogue is.</p></div></div>' +
      '<div class="hbar-list">' + reachRows + "</div>" +
      '<div class="divider"></div><div class="stat-tiles">' +
      '<div class="stat-tile"><span>Widest reach</span><strong>' + fmtInt(wideTracks.length) + "</strong><em>tracks in 4\u20135 markets</em></div>" +
      '<div class="stat-tile"><span>All five</span><strong>' + fmtInt(base.tracksList.filter(function (t) { return t.reach === 5; }).length) + "</strong><em>tracks</em></div>" +
      "</div></div>" +

      '<div class="card span-6"><div class="card-head"><div><h2>Broad-reach catalogue</h2><p>Tracks present in four or five markets.</p></div>' +
      '<span class="card-tag">' + wideTracks.length + ' tracks</span></div><div class="split-list">' + sharedRows + "</div></div>" +

      '<div class="card span-6"><div class="card-head"><div><h2>Market-only tracks</h2><p>How much of each market catalogue is unique.</p></div>' +
      '<span class="card-tag">Reach = 1</span></div><div class="split-list">' + marketOnly + "</div>" +
      '<div class="card-caption">This is structural: the source provides 200 track rows per market per month, with limited cross-market repetition.</div></div>' +

      '<div class="card span-12"><div class="card-head"><div><h2>Questions this dataset can answer</h2><p>Use these limits when presenting or extending the analysis.</p></div></div>' +
      '<div class="qa-list">' +
      qaHtml("Did recorded values grow year over year?", "No measurable change. All three years total " + fmtInt(yearVals[0] || 0) + ".")
      + qaHtml("Is the monthly pattern seasonal?", "No. The same two-level 1.25\u00d7 step repeats, with high months fixed by year and shared across markets.")
      + qaHtml("Which market leads?", (model.countryList[0] ? model.countryList[0].name + " with " + fmtPct(model.countryList[0].share) + " of current-scope values." : "No market in scope."))
      + qaHtml("Which artist and track lead?", (model.artistsList[0] && model.tracksList[0] ? model.artistsList[0].name + " leads artists; " + model.tracksList[0].name + " leads tracks in scope." : "No entity in scope."))
      + qaHtml("How broad is the shared catalogue?", fmtInt(wideTracks.length) + " tracks reach four or five markets; " + fmtInt(oneMarket) + " appear in only one.")
      + qaHtml("Can I infer real listening behaviour?", "Not reliably. Values are demo-grade and reproduce a scraper pattern rather than an organic streaming time series.")
      + "</div></div></div>";
  }

  function qaHtml(q, a) {
    return '<div class="qa-item"><div class="qa-q">' + esc(q) + '</div><div class="qa-a">' + a + "</div></div>";
  }

  function mountInsightsCharts(model, base) {
    var t = themeColors();
    var yearTotals = STATS.yearTotals || {};
    var vals = YEARS.map(function (y) { return yearTotals[y] || 0; });

    if (document.getElementById("yearlyChart")) {
      mountChart("yearlyChart", {
        type: "bar",
        data: {
          labels: YEARS.slice(),
          datasets: [{
            data: vals,
            backgroundColor: vals.map(function () { return withAlpha("#1db954", 0.68); }),
            hoverBackgroundColor: "#1db954",
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 46,
          }],
        },
        options: {
          plugins: { legend: { display: false }, tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + fmtInt(ctx.parsed.y) + " recorded values"; } },
          }) },
          scales: {
            x: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 10, weight: "600" } } },
            y: { beginAtZero: true, border: { display: false }, grid: { color: t.grid },
              ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
          },
        },
      });
    }

    if (document.getElementById("reachInsightChart")) {
      var dist = reachDistribution(model);
      mountChart("reachInsightChart", {
        type: "bar",
        data: {
          labels: [1, 2, 3, 4, 5].map(function (n) { return n + " market" + (n === 1 ? "" : "s"); }),
          datasets: [{
            data: [1, 2, 3, 4, 5].map(function (n) { return dist[n]; }),
            backgroundColor: REACH_COLORS.map(function (c) { return withAlpha(c, 0.8); }),
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 26,
          }],
        },
        options: {
          indexAxis: "y",
          plugins: { legend: { display: false }, tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + fmtInt(ctx.parsed.x) + " tracks"; } },
          }) },
          scales: {
            x: { beginAtZero: true, border: { display: false }, grid: { color: t.grid },
              ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
            y: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 9.5 } } },
          },
        },
      });
    }

    if (document.getElementById("patternChart") && model.activeMonths.length > 1) {
      var span = model.activeMonths.length;
      var labels = model.activeMonths.map(function (mi) { return monthLabel(mi, span); });
      var data = model.activeMonths.map(function (mi) { return model.monthTotals[mi]; });
      var high = STATS.highMonths || {};
      var pointColors = model.activeMonths.map(function (mi) {
        var year = MONTHS[mi].slice(0, 4);
        var moy = MONTH_OF_YEAR[mi];
        return (high[year] || []).indexOf(moy) !== -1 ? "#fbbf24" : "#22d3ee";
      });
      mountChart("patternChart", {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            data: data,
            borderColor: "#22d3ee",
            backgroundColor: function (context) {
              var chart = context.chart;
              var area = chart.chartArea;
              if (!area) return withAlpha("#22d3ee", 0.1);
              var g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
              g.addColorStop(0, withAlpha("#22d3ee", 0.26));
              g.addColorStop(1, withAlpha("#22d3ee", 0));
              return g;
            },
            fill: "origin",
            tension: 0.32,
            borderWidth: 2,
            pointRadius: 3.4,
            pointHoverRadius: 5,
            pointBackgroundColor: pointColors,
            pointBorderColor: t.card,
            pointBorderWidth: 1.5,
          }],
        },
        options: {
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(tooltipStyle(t), {
              callbacks: {
                label: function (ctx) { return " " + fmtInt(ctx.parsed.y) + " recorded values"; },
                footer: function (items) { return pointColors[items[0].dataIndex] === "#fbbf24" ? "High month in source data" : "Base month in source data"; },
              },
            }),
          },
          scales: {
            x: { border: { display: false }, grid: { display: false }, ticks: { color: t.faint, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
            y: { beginAtZero: true, border: { display: false }, grid: { color: t.grid }, ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
          },
        },
        plugins: [crosshairPlugin],
      });
    }
  }

  /* -------------------------------- quality -------------------------------- */

  function findingHtml(no, title, body, severity) {
    return '<div class="finding"><span class="severity ' + severity[0] + '">' + severity[1] + "</span>" +
      '<span class="finding-no">' + no + "</span><h4>" + esc(title) + "</h4><p>" + body + "</p></div>";
  }

  function renderQuality() {
    var stats = STATS;
    var yt = stats.yearTotals || {};
    var vals = YEARS.map(function (y) { return yt[y] || 0; });
    var identical = vals.length > 1 && vals.every(function (v) { return v === vals[0]; });
    var rows = stats.rows || ROWS.length;
    var sourceRows = stats.sourceRows || rows;
    var trackAppear = stats.trackAppearances || {};
    var pairCount = stats.pairCount || 0;
    var pairTwo = stats.pairTwoValues || 0;
    var pair125 = stats.pairRatio125 || 0;
    var nulls = stats.nullCells || 0;
    var dupes = stats.duplicateKeys || 0;
    var nb = DATA.notebook && DATA.notebook.highestGrowth;
    var high = stats.highMonths || {};

    var dictionary = [
      ["year", "Derived integer", "Year inferred from the source filename (2023\u20132025)."],
      ["country", "String", "One of five markets: Brazil, India, Mexico, United Kingdom, United States."],
      ["month", "Date / string", "Calendar month in YYYY-MM form; 36 months across three files."],
      ["track", "String", "Track title as scraped from kworb.net."],
      ["artist", "String", "Performing artist as scraped from kworb.net."],
      ["monthly_streams", "Integer", "Recorded monthly value mirrored from the largest numeric cell on the page."],
    ];
    var checks = [
      [rows === 36000, "Row count", fmtInt(rows) + " loaded / 36,000 expected"],
      [COUNTRIES.length === 5, "Market coverage", "5 markets present"],
      [MONTHS.length === 36, "Time coverage", "36 month buckets present"],
      [TRACKS.length === 873, "Track coverage", fmtInt(TRACKS.length) + " distinct tracks"],
      [ARTISTS.length === 454, "Artist coverage", fmtInt(ARTISTS.length) + " distinct artists"],
      [nulls === 0, "Null cells", fmtInt(nulls) + " nulls after source capture"],
      [dupes === 0, "Duplicate keys", fmtInt(dupes) + " duplicate country/month/track/artist keys"],
      [identical, "Year totals", identical ? "All three yearly totals are identical" : "Yearly totals differ"],
      [pairTwo === pairCount, "Two-level pairs", fmtInt(pairTwo) + " / " + fmtInt(pairCount) + " pairs have exactly two values"],
      [pair125 === pairCount, "1.25\u00d7 ratio", fmtInt(pair125) + " / " + fmtInt(pairCount) + " pairs hit exactly 1.25\u00d7"],
    ];

    return '<div class="view-head"><div><span class="eyebrow"><i data-lucide="database"></i>Data trust center</span>' +
      "<h2>Integrity, provenance and limitations</h2>" +
      "<p>Everything is checked against the generated bundle: row counts, uniqueness, source pattern and the original notebook logic.</p></div>" +
      '<div class="view-head-actions"><button class="btn" type="button" data-action="export-csv"><i data-lucide="download"></i>Export filtered CSV</button></div></div>' +

      '<div class="quality-hero"><div class="card"><div class="card-head"><div><h2>Integrity snapshot</h2><p>Pre-cleaning capture versus loaded bundle.</p></div>' +
      '<span class="card-tag">Validated</span></div><div class="quality-stat-grid">' +
      '<div class="qstat ok"><span>Source rows</span><strong>' + fmtInt(sourceRows) + "</strong></div>" +
      '<div class="qstat ok"><span>Loaded rows</span><strong>' + fmtInt(rows) + "</strong></div>" +
      '<div class="qstat ok"><span>Null cells</span><strong>' + fmtInt(nulls) + "</strong></div>" +
      '<div class="qstat ok"><span>Duplicate keys</span><strong>' + fmtInt(dupes) + "</strong></div>" +
      "</div>" +
      '<div class="card-caption"><strong>Structural checks pass.</strong> That does not make the values organic; the source pattern still limits interpretation.</div></div>' +

      '<div class="card"><div class="card-head"><div><h2>Pipeline health</h2><p>Stage-level status from extraction to bundle.</p></div></div><div class="health-list">' +
      healthRow("ok", "download", "Extraction", "Country/month pages captured", "Complete", "100%") +
      healthRow("ok", "sparkles", "Cleaning", "Types normalised, rows parsed", "Stable", "100%") +
      healthRow("ok", "layout-dashboard", "Bundle", "Compact index references generated", "Stable", "100%") +
      healthRow("warn", "triangle-alert", "Value provenance", "Largest numeric cell mirrored", "Review", "75%") +
      "</div></div></div>" +

      '<div class="section-title">Critical findings</div><div class="findings-grid">' +
      findingHtml("01", "Year totals are identical", "2023, 2024 and 2025 each sum to <strong>" + fmtInt(vals[0] || 0) + "</strong>. Any YoY claim is unsupported.", ["danger", "High"]) +
      findingHtml("02", "Two-level monthly pattern", "Every (country, track) pair has exactly two values and <strong>" + (pairCount ? fmtPct((pair125 / pairCount) * 100) : "0%") + "</strong> sit at a 1.25\u00d7 ratio.", ["warn", "Medium"]) +
      findingHtml("03", "Markets move in lockstep", "High months are global, so country curves differ in scale, not in shape.", ["warn", "Medium"]) +
      findingHtml("04", "Notebook growth is a diff artifact", (nb ? "<strong>" + esc(nb.track) + "</strong> (" + esc(nb.country) + ", " + esc(nb.month) + ") shows +" + fmtCompact(nb.diff) + " because consecutive rows are different countries." : "The notebook's growth ranking compares cross-country rows."), ["danger", "High"]) +
      findingHtml("05", "Cumulative-style scrape footprint", "200 rows per country/month and repeated totals suggest the largest cell was captured, not a clean time series.", ["warn", "Medium"]) +
      findingHtml("06", "Structural completeness", fmtInt(rows) + " rows, 0 nulls, 0 duplicate keys, and a full 5 \u00d7 36 month grid.", ["ok", "Pass"]) +
      "</div>" +

      '<div class="grid" style="margin-top:16px">' +
      '<div class="card span-7"><div class="card-head"><div><h2>Methodology</h2><p>From public pages to this bundle.</p></div>' +
      '<span class="card-tag">4 stages</span></div><div class="timeline">' +
      timelineStep("download", "Scrape", "Step 1", "Playwright visits each country/month page on kworb.net and records the visible table.") +
      timelineStep("sparkles", "Clean", "Step 2", "Normalise text, coerce monthly values to integers, remove invalid rows.") +
      timelineStep("activity", "Transform & EDA", "Step 3", "Build rankings, monthly aggregations and the notebook's growth comparison.") +
      timelineStep("database", "Bundle", "prepare_data.py", "Compress rows into index references and attach verified quality stats.") +
      "</div></div>" +

      '<div class="card span-5"><div class="card-head"><div><h2>Data dictionary</h2><p>Six fields explain every row.</p></div></div>' +
      '<div class="table-wrap short"><table class="data-table dict-table"><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>' +
      dictionary.map(function (d) {
        return "<tr><td><code>" + d[0] + "</code></td><td class=\"muted\">" + d[1] + "</td><td class=\"muted\">" + d[2] + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +

      '<div class="card span-7"><div class="card-head"><div><h2>Validation checks</h2><p>Automated facts available to every view.</p></div>' +
      '<span class="card-tag">' + checks.filter(function (c) { return c[0]; }).length + " / " + checks.length + ' pass</span></div><div class="qa-list">' +
      checks.map(function (c) {
        return '<div class="qa-item"><div class="qa-q"><i data-lucide="' + (c[0] ? "circle-check" : "circle-alert") + '" style="width:14px;height:14px;color:var(--' + (c[0] ? "success" : "danger") + ');vertical-align:-3px;margin-right:5px"></i>' + esc(c[1]) + "</div>" +
          '<div class="qa-a">' + c[2] + "</div></div>";
      }).join("") + "</div></div>" +

      '<div class="card span-5 tint-amber"><div class="card-head"><div><h2>Known limitations</h2><p>What to disclose when presenting.</p></div></div>' +
      '<div class="stack">' +
      noticeHtml("warning", "triangle-alert", "No genuine growth signal", "Yearly totals are identical and monthly values step between two levels.") +
      noticeHtml("warning", "triangle-alert", "Not organic seasonality", "High months are fixed globally and shared by every market.") +
      noticeHtml("warning", "triangle-alert", "Demo-grade values", "The scrape captures a repeated pattern; do not present it as real listening behaviour.") +
      "</div></div>" +

      '<div class="card span-12"><div class="card-head"><div><h2>Notebook replica</h2><p>Reproduce the original charts and expose the growth bug.</p></div>' +
      '<span class="card-tag">2025 \u00b7 all markets</span></div>' +
      '<details class="replica" id="notebookReplica"><summary><i data-lucide="notebook-pen"></i>Open notebook analysis <i data-lucide="chevron-down" class="chev"></i></summary>' +
      '<div class="replica-body">' +
      '<div class="replica-note"><strong>Note:</strong> the notebook sorts by track/artist/month and diffs consecutive rows. Because countries share months, the "highest growth" row is a between-country difference, not a time-series gain. The chart below reproduces that exact logic.</div>' +
      '<div class="grid"><div class="card span-6 flat"><div class="card-head"><div><h2>Country totals</h2><p>2025, all markets.</p></div></div><div class="chart-wrap"><canvas id="replicaCountries"></canvas></div></div>' +
      '<div class="card span-6 flat"><div class="card-head"><div><h2>Top tracks</h2><p>2025, all markets.</p></div></div><div class="chart-wrap"><canvas id="replicaTracks"></canvas></div></div>' +
      '<div class="card span-12 flat"><div class="card-head"><div><h2>' + (nb ? esc(nb.track) + " \u00b7 by market" : "Growth artifact") + '</h2><p>Every market series for the notebook\'s top "growth" track.</p></div></div><div class="chart-wrap"><canvas id="replicaGrowth"></canvas></div></div></div>' +
      (nb ? '<div class="qa-list" style="margin-top:12px">' + qaHtml("Notebook headline", esc(nb.country) + " \u00b7 " + esc(nb.month) + " \u00b7 +" + fmtInt(nb.diff) + " recorded values") +
        qaHtml("Why it is misleading", "The positive difference compares two countries in the same month, not one market over time.") +
        qaHtml("Verified dataset fact", "Every (country, track) pair has only two distinct monthly values, in a 1.25\u00d7 ratio.") + "</div>" : "") +
      "</div></details></div></div>";
  }

  function healthRow(kind, icon, title, sub, status, width) {
    return '<div class="health-row"><span class="health-ico ' + (kind === "warn" ? "warn" : "") + '"><i data-lucide="' + icon + '"></i></span>' +
      '<span class="health-main"><strong>' + esc(title) + "</strong><span>" + esc(sub) + "</span>" +
      '<span class="health-bar"><i style="width:' + width + ';background:' + (kind === "warn" ? "var(--amber)" : "linear-gradient(90deg,var(--accent),var(--cyan))") + '"></i></span></span>' +
      '<span class="health-status ' + (kind === "warn" ? "warn" : "") + '">' + esc(status) + "</span></div>";
  }

  function timelineStep(icon, title, tag, body) {
    return '<div class="timeline-step"><span class="timeline-dot"><i data-lucide="' + icon + '"></i></span>' +
      '<div class="timeline-body"><strong>' + esc(title) + "<span>" + esc(tag) + "</span></strong><p>" + esc(body) + "</p></div></div>";
  }

  function mountReplicaCharts() {
    var model = buildModel(rowsForYear("2025"));
    var t = themeColors();
    if (document.getElementById("replicaCountries")) {
      mountChart("replicaCountries", {
        type: "bar",
        data: {
          labels: model.countryList.map(function (c) { return COUNTRY_CODE[c.name]; }),
          datasets: [{ data: model.countryList.map(function (c) { return c.streams; }),
            backgroundColor: model.countryList.map(function (c) { return withAlpha(COUNTRY_COLORS[c.name] || "#1db954", 0.8); }),
            borderRadius: 5, borderSkipped: false, maxBarThickness: 28 }],
        },
        options: {
          plugins: { legend: { display: false }, tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + model.countryList[ctx.dataIndex].name + ": " + fmtInt(ctx.parsed.y); } },
          }) },
          scales: {
            x: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 10 } } },
            y: { beginAtZero: true, border: { display: false }, grid: { color: t.grid }, ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
          },
        },
      });
    }
    if (document.getElementById("replicaTracks")) {
      var top = model.tracksList.slice(0, 8);
      mountChart("replicaTracks", {
        type: "bar",
        data: { labels: top.map(function (x) { return truncate(x.name, 22); }),
          datasets: [{ data: top.map(function (x) { return x.streams; }),
            backgroundColor: top.map(function (x) { return withAlpha(REACH_COLORS[(x.reach - 1) % 5], 0.8); }),
            borderRadius: 4, borderSkipped: false, maxBarThickness: 20 }] },
        options: {
          indexAxis: "y",
          plugins: { legend: { display: false }, tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + fmtInt(ctx.parsed.x) + " recorded values"; } },
          }) },
          scales: {
            x: { beginAtZero: true, border: { display: false }, grid: { color: t.grid }, ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
            y: { border: { display: false }, grid: { display: false }, ticks: { color: t.muted, font: { size: 9 } } },
          },
        },
      });
    }
    var nb = DATA.notebook && DATA.notebook.highestGrowth;
    if (nb && document.getElementById("replicaGrowth")) {
      var names = Object.keys(nb.seriesByCountry);
      var first = names.length ? nb.seriesByCountry[names[0]] : [];
      var labels = first.map(function (p) { return MONTH_NAMES[parseInt(p[0].slice(5), 10) - 1]; });
      var datasets = names.map(function (name) {
        var color = COUNTRY_COLORS[name] || "#1db954";
        var map = new Map(nb.seriesByCountry[name]);
        return {
          label: name,
          data: first.map(function (p) { return map.get(p[0]) || 0; }),
          borderColor: color,
          backgroundColor: withAlpha(color, 0.12),
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2.4,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
        };
      });
      mountChart("replicaGrowth", {
        type: "line",
        data: { labels: labels, datasets: datasets },
        options: {
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { display: true, labels: { color: t.muted, boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 9.5 } } },
            tooltip: Object.assign(tooltipStyle(t), { callbacks: { label: function (ctx) { return ctx.dataset.label + ": " + fmtInt(ctx.parsed.y); } } }) },
          scales: {
            x: { border: { display: false }, grid: { display: false }, ticks: { color: t.faint, font: { size: 9 } } },
            y: { beginAtZero: true, border: { display: false }, grid: { color: t.grid }, ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
          },
        },
      });
    }
  }

  /* --------------------------------- modal --------------------------------- */

  function modalChart(id, config) {
    var chart = mountChart(id, config);
    if (chart) modalChartIds.add(id);
    return chart;
  }

  function destroyModalCharts() {
    modalChartIds.forEach(function (id) {
      if (charts.has(id)) {
        try { charts.get(id).destroy(); } catch (err) { /* ignore */ }
        charts.delete(id);
      }
    });
    modalChartIds.clear();
  }

  function openModal(opts) {
    closeModal();
    var root = document.getElementById("modalRoot");
    if (!root) return;
    modalPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.innerHTML = '<div class="modal-overlay" data-modal-overlay>' +
      '<div class="modal ' + (opts.size || "") + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="modal-head"><div><h2>' + esc(opts.title) + "</h2><p>" + esc(opts.sub || "") + "</p></div>" +
      '<button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog"><i data-lucide="x"></i></button></div>' +
      '<div class="modal-body">' + opts.body + "</div></div></div>";
    if (window.lucide) window.lucide.createIcons();
    requestAnimationFrame(function () { if (opts.onMount) opts.onMount(); });
  }

  function closeModal() {
    destroyModalCharts();
    var root = document.getElementById("modalRoot");
    if (root) root.innerHTML = "";
    document.body.style.overflow = modalPrevOverflow || "";
    modalPrevOverflow = "";
  }

  function modalLineChart(id, labels, data, color, labelText) {
    var t = themeColors();
    modalChart(id, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: color,
          backgroundColor: function (context) {
            var chart = context.chart;
            var area = chart.chartArea;
            if (!area) return withAlpha(color, 0.1);
            var g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, withAlpha(color, 0.25));
            g.addColorStop(1, withAlpha(color, 0));
            return g;
          },
          fill: "origin",
          tension: 0.34,
          borderWidth: 2,
          pointRadius: 2.6,
          pointHoverRadius: 4.5,
          pointBackgroundColor: color,
          pointBorderColor: t.card,
          pointBorderWidth: 1.4,
        }],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: function (ctx) { return " " + fmtInt(ctx.parsed.y) + " recorded values"; } },
          }),
        },
        scales: {
          x: { border: { display: false }, grid: { display: false }, ticks: { color: t.faint, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { beginAtZero: true, border: { display: false }, grid: { color: t.grid }, ticks: { color: t.faint, font: { size: 9 }, maxTicksLimit: 4, callback: function (v) { return fmtCompact(v); } } },
        },
      },
      plugins: [crosshairPlugin],
    });
  }

  function openCountryModal(name) {
    var base = getModel(true);
    var m = buildModel(filterRows({ countriesOverride: [name] }));
    var c = m.countryList[0];
    if (!c) {
      toast("No records for " + name + " in this scope.", "error");
      return;
    }
    var span = m.activeMonths.length;
    var labels = m.activeMonths.map(function (mi) { return monthLabel(mi, span); });
    var share = base.total ? (c.streams / base.total) * 100 : 0;
    var tracks = c.tracks.slice(0, 10);
    var artists = c.artists.slice(0, 8);
    var body = '<div class="modal-profile">' + flagSvg(name) +
      "<div><h3>" + esc(name) + "</h3><p>" + fmtPct(share) + " of recorded values across all markets in scope \u00b7 " + fmtInt(c.trackCount) + " tracks \u00b7 " + fmtInt(c.artistCount) + " artists</p></div></div>" +
      '<div class="modal-kpis">' +
      '<div class="modal-kpi"><span>Recorded values</span><strong>' + fmtCompact(c.streams) + "</strong></div>" +
      '<div class="modal-kpi"><span>Share of scope</span><strong>' + fmtPct(share) + "</strong></div>" +
      '<div class="modal-kpi"><span>Tracks</span><strong>' + fmtInt(c.trackCount) + "</strong></div>" +
      '<div class="modal-kpi"><span>Artists</span><strong>' + fmtInt(c.artistCount) + "</strong></div></div>" +
      '<div class="modal-section"><h4>Monthly recorded values</h4><div class="chart-wrap"><canvas id="modal-country-trend"></canvas></div></div>' +
      '<div class="modal-grid" style="margin-top:14px">' +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Top tracks</h4>' +
      '<div class="table-wrap short"><table class="data-table clickable"><thead><tr><th>#</th><th>Track</th><th class="num">Values</th><th class="num">Share</th></tr></thead><tbody>' +
      tracks.map(function (t, i) {
        return '<tr data-open-track="' + esc(t.key) + '"><td><span class="rank">' + (i + 1) + "</span></td>" +
          '<td><span class="track-name">' + esc(t.name) + '</span><span class="sub-name">' + esc(t.artistName) + "</span></td>" +
          '<td class="num">' + fmtCompact(t.streams) + '</td><td class="num muted">' + fmtPct(t.share) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Top artists</h4>' +
      '<div class="split-list">' + artists.map(function (a) {
        return '<div class="split-row"><span><button class="link-btn" type="button" data-filter-artist="' + esc(a.name) + '">' + esc(a.name) + "</button></span><strong>" + fmtCompact(a.streams) + "</strong></div>";
      }).join("") + "</div></div></div>" +
      '<div class="modal-section" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary" type="button" data-filter-country="' + esc(name) + '"><i data-lucide="filter"></i>Isolate this market</button>' +
      '<button class="btn" type="button" data-action="close-modal">Close</button></div>';

    openModal({
      title: name,
      sub: "Market profile \u00b7 " + (state.year === "all" ? "2023\u20132025" : state.year),
      size: "wide",
      body: body,
      onMount: function () {
        modalLineChart("modal-country-trend", labels, m.activeMonths.map(function (mi) { return c.monthly[mi] || 0; }), COUNTRY_COLORS[name] || "#1db954");
      },
    });
  }

  function openArtistModal(ai) {
    ai = Number(ai);
    var m = getModel(false);
    var a = m.artistAgg.get(ai);
    if (!a) {
      m = getModel(true);
      a = m.artistAgg.get(ai);
    }
    if (!a) {
      toast("Artist not available in this scope.", "error");
      return;
    }
    var span = m.activeMonths.length;
    var labels = m.activeMonths.map(function (mi) { return monthLabel(mi, span); });
    var tracks = Array.from(a.trackKeys).map(function (key) { return m.trackAgg.get(key); }).filter(Boolean)
      .sort(function (x, y) { return y.streams - x.streams; });
    var countryRows = COUNTRIES.map(function (name, i) {
      var pct = a.streams ? ((a.countryStreams[i] || 0) / a.streams) * 100 : 0;
      return { name: name, pct: pct, value: a.countryStreams[i] || 0 };
    }).filter(function (x) { return x.value > 0; }).sort(function (x, y) { return y.value - x.value; });

    var body = '<div class="modal-profile">' + avatarHtml(a.name, "xl") +
      "<div><h3>" + esc(a.name) + "</h3><p>" + fmtPct(a.share) + " of recorded values \u00b7 " + fmtInt(a.trackCount) + " tracks \u00b7 " + a.marketCount + " markets</p></div></div>" +
      '<div class="modal-kpis">' +
      '<div class="modal-kpi"><span>Recorded values</span><strong>' + fmtCompact(a.streams) + "</strong></div>" +
      '<div class="modal-kpi"><span>Share of scope</span><strong>' + fmtPct(a.share) + "</strong></div>" +
      '<div class="modal-kpi"><span>Tracks</span><strong>' + fmtInt(a.trackCount) + "</strong></div>" +
      '<div class="modal-kpi"><span>Markets</span><strong>' + a.marketCount + " / 5</strong></div></div>" +
      '<div class="modal-section"><h4>Monthly recorded values</h4><div class="chart-wrap"><canvas id="modal-artist-trend"></canvas></div></div>' +
      '<div class="modal-grid" style="margin-top:14px">' +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Top tracks</h4>' +
      '<div class="table-wrap short"><table class="data-table clickable"><thead><tr><th>#</th><th>Track</th><th class="num">Values</th><th class="num">Markets</th></tr></thead><tbody>' +
      tracks.slice(0, 12).map(function (t, i) {
        return '<tr data-open-track="' + esc(t.key) + '"><td><span class="rank">' + (i + 1) + "</span></td>" +
          '<td><span class="track-name">' + esc(t.name) + '</span><span class="sub-name">' + t.reach + " markets</span></td>" +
          '<td class="num">' + fmtCompact(t.streams) + "</td><td class=\"num muted\">" + t.reach + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Market distribution</h4><div class="hbar-list">' +
      countryRows.map(function (x) {
        return '<div class="hbar-row"><span class="hbar-name">' + esc(x.name) + "</span>" +
          '<span class="hbar-track"><i style="width:' + x.pct + "%;--bar-color:" + (COUNTRY_COLORS[x.name] || "#1db954") + '"></i></span>' +
          '<span class="hbar-value">' + fmtPct(x.pct) + "</span></div>";
      }).join("") + "</div></div></div>" +
      '<div class="modal-section" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary" type="button" data-filter-artist="' + esc(a.name) + '"><i data-lucide="filter"></i>Filter dashboard by artist</button>' +
      '<button class="btn" type="button" data-action="close-modal">Close</button></div>';

    openModal({
      title: a.name,
      sub: "Artist profile \u00b7 " + (state.year === "all" ? "2023\u20132025" : state.year),
      size: "wide",
      body: body,
      onMount: function () {
        modalLineChart("modal-artist-trend", labels, m.activeMonths.map(function (mi) { return a.monthly.get(mi) || 0; }), "#a78bfa");
      },
    });
  }

  function openTrackModal(key) {
    var m = getModel(false);
    var t = m.trackAgg.get(key);
    if (!t) {
      m = getModel(true);
      t = m.trackAgg.get(key);
    }
    if (!t) {
      toast("Track not available in this scope.", "error");
      return;
    }
    var span = m.activeMonths.length;
    var labels = m.activeMonths.map(function (mi) { return monthLabel(mi, span); });
    var countryRows = COUNTRIES.map(function (name, i) {
      var value = t.countryStreams[i] || 0;
      return { name: name, value: value, pct: t.streams ? (value / t.streams) * 100 : 0 };
    }).filter(function (x) { return x.value > 0; }).sort(function (x, y) { return y.value - x.value; });

    var body = '<div class="modal-profile">' + trackArtHtml(key, "lg") +
      "<div><h3>" + esc(t.name) + "</h3><p>" + esc(t.artistName) + " \u00b7 " + t.reach + " markets \u00b7 " + t.months.size + " month buckets</p></div></div>" +
      '<div class="modal-kpis">' +
      '<div class="modal-kpi"><span>Recorded values</span><strong>' + fmtCompact(t.streams) + "</strong></div>" +
      '<div class="modal-kpi"><span>Share of scope</span><strong>' + fmtPct(t.share) + "</strong></div>" +
      '<div class="modal-kpi"><span>Markets</span><strong>' + t.reach + " / 5</strong></div>" +
      '<div class="modal-kpi"><span>Top market</span><strong>' + esc(t.topCountry || "-") + "</strong></div></div>" +
      '<div class="modal-section"><h4>Monthly recorded values</h4><div class="chart-wrap"><canvas id="modal-track-trend"></canvas></div></div>' +
      '<div class="modal-grid" style="margin-top:14px">' +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Market split</h4><div class="hbar-list">' +
      countryRows.map(function (x) {
        return '<div class="hbar-row"><span class="hbar-name">' + esc(x.name) + "</span>" +
          '<span class="hbar-track"><i style="width:' + x.pct + "%;--bar-color:" + (COUNTRY_COLORS[x.name] || "#1db954") + '"></i></span>' +
          '<span class="hbar-value">' + fmtPct(x.pct) + "</span></div>";
      }).join("") + "</div></div>" +
      '<div><h4 style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Entity</h4>' +
      '<div class="split-list"><div class="split-row"><span>Artist</span><strong><button class="link-btn" type="button" data-filter-artist="' + esc(t.artistName) + '">' + esc(t.artistName) + "</button></strong></div>" +
      '<div class="split-row"><span>Average / active month</span><strong>' + fmtCompact(t.avg) + "</strong></div>" +
      '<div class="split-row"><span>Active month buckets</span><strong>' + t.months.size + "</strong></div>" +
      '<div class="split-row"><span>Markets reached</span><strong>' + t.reach + "</strong></div></div></div></div>" +
      '<div class="modal-section" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn primary" type="button" data-filter-track="' + esc(t.name) + '"><i data-lucide="filter"></i>Filter dashboard by track</button>' +
      '<button class="btn" type="button" data-action="close-modal">Close</button></div>';

    openModal({
      title: t.name,
      sub: "Track profile \u00b7 " + (state.year === "all" ? "2023\u20132025" : state.year),
      size: "wide",
      body: body,
      onMount: function () {
        modalLineChart("modal-track-trend", labels, m.activeMonths.map(function (mi) { return t.monthly.get(mi) || 0; }), "#fbbf24");
      },
    });
  }

  /* ---------------------------- export & tools ----------------------------- */

  function csvEscape(value) {
    var s = String(value == null ? "" : value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportFilteredCsv() {
    var rows = filterRows();
    if (!rows.length) {
      toast("No rows to export for this filter scope.", "error");
      return;
    }
    var lines = ["year,country,month,track,artist,monthly_streams"];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      lines.push([YEARS[r[0]], COUNTRIES[r[1]], MONTHS[r[2]], TRACKS[r[3]], ARTISTS[r[4]], r[5]].map(csvEscape).join(","));
    }
    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "spotify-intel_" + (state.year === "all" ? "2023-2025" : state.year) + "_filtered.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("Exported " + fmtInt(rows.length) + " filtered rows.", "success");
  }

  function toast(message, kind) {
    var root = document.getElementById("toastRoot");
    if (!root) return;
    var el = document.createElement("div");
    el.className = "toast" + (kind === "error" ? " error" : "");
    el.innerHTML = '<i data-lucide="' + (kind === "error" ? "circle-alert" : "circle-check") + '"></i><span>' + esc(message) + "</span>";
    root.appendChild(el);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 220);
    }, 2800);
  }

  function handleChartTool(btn) {
    var id = btn.getAttribute("data-chart");
    var kind = btn.getAttribute("data-chart-tool");
    if (kind === "png") {
      var chart = charts.get(id);
      if (!chart) { toast("Chart is not ready yet.", "error"); return; }
      var a = document.createElement("a");
      a.href = chart.toBase64Image("image/png", 1);
      a.download = id + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Chart PNG downloaded.", "success");
      return;
    }
    if (kind === "full") {
      var card = btn.closest(".card");
      if (!card) return;
      var on = !card.classList.contains("is-fullscreen");
      closeFullscreen();
      if (on) {
        card.classList.add("is-fullscreen");
        document.body.classList.add("chart-focus");
        var closeBtn = document.getElementById("chartFocusClose");
        if (closeBtn) closeBtn.hidden = false;
        setTimeout(resizeCharts, 80);
      }
    }
  }

  function closeFullscreen() {
    $$(".card.is-fullscreen").forEach(function (el) { el.classList.remove("is-fullscreen"); });
    document.body.classList.remove("chart-focus");
    var closeBtn = document.getElementById("chartFocusClose");
    if (closeBtn) closeBtn.hidden = true;
    setTimeout(resizeCharts, 60);
  }

  /* ----------------------------- command palette --------------------------- */

  var ARTIST_CHOICES = null;
  var TRACK_CHOICES = null;
  var commandItems = [];
  var commandActive = 0;

  function buildChoiceIndex() {
    if (ARTIST_CHOICES) return;
    var artistTotals = new Map();
    var trackTotals = new Map();
    for (var i = 0; i < ROWS.length; i++) {
      var r = ROWS[i];
      artistTotals.set(r[4], (artistTotals.get(r[4]) || 0) + r[5]);
      trackTotals.set(r[3], (trackTotals.get(r[3]) || 0) + r[5]);
    }
    ARTIST_CHOICES = Array.from(artistTotals.entries()).map(function (e) {
      return { name: ARTISTS[e[0]], total: e[1], ai: e[0] };
    }).sort(function (a, b) { return b.total - a.total; });
    TRACK_CHOICES = Array.from(trackTotals.entries()).map(function (e) {
      return { name: TRACKS[e[0]], total: e[1], ti: e[0] };
    }).sort(function (a, b) { return b.total - a.total; });
  }

  function viewCommands() {
    return [
      { group: "Views", label: "Overview", meta: "View", icon: "layout-dashboard", action: "view", value: "overview" },
      { group: "Views", label: "Countries", meta: "View", icon: "globe-2", action: "view", value: "countries" },
      { group: "Views", label: "Artists", meta: "View", icon: "users", action: "view", value: "artists" },
      { group: "Views", label: "Songs", meta: "View", icon: "music", action: "view", value: "songs" },
      { group: "Views", label: "Growth & Insights", meta: "View", icon: "trending-up", action: "view", value: "insights" },
      { group: "Views", label: "Data Quality", meta: "View", icon: "database", action: "view", value: "quality" },
      { group: "Actions", label: "Toggle theme", meta: "Appearance", icon: "sun", action: "theme" },
      { group: "Actions", label: "Reset all filters", meta: "Filters", icon: "rotate-ccw", action: "reset" },
      { group: "Actions", label: "Export filtered CSV", meta: "Download", icon: "download", action: "export" },
      { group: "Actions", label: "Isolate a market", meta: "Type a market name", icon: "globe-2", action: "hint" },
    ];
  }

  function buildCommandResults(query) {
    buildChoiceIndex();
    var q = query.trim().toLowerCase();
    var list = viewCommands().filter(function (c) {
      return !q || c.label.toLowerCase().indexOf(q) !== -1 || c.group.toLowerCase().indexOf(q) !== -1;
    });
    if (q) {
      COUNTRIES.forEach(function (c) {
        if (c.toLowerCase().indexOf(q) !== -1) {
          list.push({ group: "Markets", label: c, meta: "Isolate market", icon: "flag", action: "country", value: c });
        }
      });
      ARTIST_CHOICES.slice(0, 180).forEach(function (a) {
        if (list.length < 22 && a.name.toLowerCase().indexOf(q) !== -1) {
          list.push({ group: "Artists", label: a.name, meta: fmtCompact(a.total), icon: "user", action: "artist", value: a.name });
        }
      });
      TRACK_CHOICES.slice(0, 220).forEach(function (t) {
        if (list.length < 26 && t.name.toLowerCase().indexOf(q) !== -1) {
          list.push({ group: "Tracks", label: t.name, meta: fmtCompact(t.total), icon: "music", action: "track", value: t.name });
        }
      });
    }
    return list.slice(0, 26);
  }

  function renderCommandResults() {
    var input = document.getElementById("commandInput");
    var root = document.getElementById("commandResults");
    if (!input || !root) return;
    commandItems = buildCommandResults(input.value);
    commandActive = Math.min(Math.max(0, commandActive), Math.max(0, commandItems.length - 1));
    if (!commandItems.length) {
      root.innerHTML = '<div class="command-empty">No matching views, artists, tracks or actions.</div>';
      return;
    }
    var html = "";
    var lastGroup = "";
    commandItems.forEach(function (item, i) {
      if (item.group !== lastGroup) {
        html += '<div class="command-group-label">' + esc(item.group) + "</div>";
        lastGroup = item.group;
      }
      html += '<button class="command-item ' + (i === commandActive ? "active" : "") + '" type="button" data-cmd-index="' + i + '">' +
        '<i data-lucide="' + item.icon + '"></i><strong>' + esc(item.label) + "</strong><span>" + esc(item.meta) + "</span></button>";
    });
    root.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  function openCommand() {
    var overlay = document.getElementById("commandOverlay");
    var input = document.getElementById("commandInput");
    if (!overlay || !input) return;
    overlay.hidden = false;
    input.value = "";
    commandActive = 0;
    renderCommandResults();
    setTimeout(function () { input.focus(); }, 20);
  }

  function closeCommand() {
    var overlay = document.getElementById("commandOverlay");
    if (overlay) overlay.hidden = true;
  }

  function executeCommandItem(item) {
    if (!item) return;
    closeCommand();
    if (item.action === "view") {
      navigate(item.value);
    } else if (item.action === "country") {
      state.countries = new Set([item.value]);
      state.compare.clear();
      commitFilters();
      toast("Isolated " + item.value + ".", "success");
    } else if (item.action === "artist") {
      state.artist = item.value;
      state.track = "";
      state.artistPage = 1;
      navigate("artists");
      toast("Filtered to " + item.value + ".", "success");
    } else if (item.action === "track") {
      state.track = item.value;
      state.songPage = 1;
      navigate("songs");
      toast("Filtered to " + item.value + ".", "success");
    } else if (item.action === "theme") {
      toggleTheme();
    } else if (item.action === "reset") {
      resetFilters();
    } else if (item.action === "export") {
      exportFilteredCsv();
    } else if (item.action === "hint") {
      toast("Type a market, artist or track name to jump straight to it.", "success");
    }
  }

  /* ------------------------------ filter UI -------------------------------- */

  function summaryCountries() {
    var n = state.countries.size;
    if (n === COUNTRIES.length) return "All countries";
    if (n === 0) return "None";
    if (n === 1) return Array.from(state.countries)[0];
    return n + " countries";
  }

  function summaryMonths() {
    var n = state.months.size;
    if (n === 12) return "All months";
    if (n === 0) return "None";
    if (n === 1) return MONTH_NAMES[Array.from(state.months)[0]];
    return n + " months";
  }

  function renderCountryChecks() {
    var root = document.getElementById("countryOptions");
    if (!root) return;
    root.innerHTML = COUNTRIES.map(function (name, i) {
      return '<label class="check-row"><input type="checkbox" data-country-index="' + i + '" ' + (state.countries.has(name) ? "checked" : "") + ">" +
        '<span style="width:7px;height:7px;border-radius:50%;flex:0 0 7px;background:' + (COUNTRY_COLORS[name] || "#1db954") + '"></span>' +
        "<span>" + esc(name) + "</span></label>";
    }).join("");
  }

  function renderMonthChecks() {
    var root = document.getElementById("monthOptions");
    if (!root) return;
    root.innerHTML = MONTH_NAMES.map(function (name, i) {
      return '<label class="check-row"><input type="checkbox" data-month-index="' + i + '" ' + (state.months.has(i) ? "checked" : "") + "><span>" + name + "</span></label>";
    }).join("");
  }

  function chipHtml(kind, label, value) {
    return '<span class="filter-chip">' + esc(label) +
      '<button type="button" data-remove-filter="' + kind + '"' + (value != null ? ' data-value="' + esc(value) + '"' : "") +
      ' aria-label="Remove ' + esc(label) + ' filter"><i data-lucide="x"></i></button></span>';
  }

  function updateFilterControls(model) {
    var yearSelect = document.getElementById("yearFilter");
    if (yearSelect) yearSelect.value = state.year;
    var topSelect = document.getElementById("topNFilter");
    if (topSelect) topSelect.value = String(state.topN);

    var cs = document.getElementById("countrySummaryText");
    if (cs) cs.textContent = summaryCountries();
    var ms = document.getElementById("monthSummaryText");
    if (ms) ms.textContent = summaryMonths();

    renderCountryChecks();
    renderMonthChecks();

    var artistInput = document.getElementById("artistFilterInput");
    if (artistInput && document.activeElement !== artistInput) artistInput.value = state.artist;
    var trackInput = document.getElementById("trackFilterInput");
    if (trackInput && document.activeElement !== trackInput) trackInput.value = state.track;
    var ac = document.querySelector('[data-clear="artist"]');
    if (ac) ac.hidden = !state.artist;
    var tc = document.querySelector('[data-clear="track"]');
    if (tc) tc.hidden = !state.track;

    var chips = [];
    if (state.year !== "all") chips.push(chipHtml("year", state.year, state.year));
    if (state.countries.size < COUNTRIES.length) {
      Array.from(state.countries).forEach(function (name) { chips.push(chipHtml("country", name, name)); });
    }
    if (state.artist) chips.push(chipHtml("artist", "Artist: " + state.artist, state.artist));
    if (state.track) chips.push(chipHtml("track", "Track: " + truncate(state.track, 28), state.track));
    if (state.months.size < 12) chips.push(chipHtml("months", summaryMonths(), ""));
    var active = document.getElementById("activeFilters");
    if (active) active.innerHTML = chips.join("");

    var cov = document.querySelectorAll("#coverageBtn span:not(.coverage-divider)");
    if (cov.length >= 2) {
      cov[0].textContent = fmtInt(model ? model.rows : ROWS.length) + " rows";
      cov[1].textContent = (model ? model.countryList.length : COUNTRIES.length) + " countries";
    }
  }

  function setupCombos() {
    buildChoiceIndex();
    ["artist", "track"].forEach(function (kind) {
      var input = document.getElementById(kind + "FilterInput");
      var panel = document.getElementById(kind + "Options");
      if (!input || !panel) return;
      combos[kind] = { input: input, panel: panel, active: 0, options: [] };
      input.addEventListener("focus", function () { openCombo(kind); });
      input.addEventListener("input", function () { combos[kind].active = 0; renderCombo(kind); if (panel.hidden) openCombo(kind); });
      input.addEventListener("keydown", function (e) { comboKeydown(e, kind); });
    });
  }

  function comboChoices(kind) {
    return kind === "artist" ? ARTIST_CHOICES : TRACK_CHOICES;
  }

  function renderCombo(kind) {
    var c = combos[kind];
    if (!c) return;
    var q = c.input.value.trim().toLowerCase();
    var choices = comboChoices(kind).filter(function (item) {
      return !q || item.name.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 30);
    c.options = choices;
    c.active = Math.min(Math.max(0, c.active), Math.max(0, choices.length - 1));
    if (!choices.length) {
      c.panel.innerHTML = '<div class="combo-empty">No ' + esc(kind) + " matches.</div>";
      return;
    }
    c.panel.innerHTML = choices.map(function (item, i) {
      return '<button class="combo-option ' + (i === c.active ? "active" : "") + '" type="button" data-combo-option="' + kind + '" data-value="' + esc(item.name) + '">' +
        '<i data-lucide="' + (kind === "artist" ? "user" : "music") + '"></i><strong>' + esc(item.name) + "</strong><span>" + fmtCompact(item.total) + "</span></button>";
    }).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function openCombo(kind) {
    Object.keys(combos).forEach(function (k) {
      if (k !== kind) closeCombo(k);
    });
    var c = combos[kind];
    if (!c) return;
    c.panel.hidden = false;
    c.input.setAttribute("aria-expanded", "true");
    c.active = 0;
    renderCombo(kind);
  }

  function closeCombo(kind) {
    var c = combos[kind];
    if (!c) return;
    c.panel.hidden = true;
    c.input.setAttribute("aria-expanded", "false");
  }

  function closeCombos() {
    Object.keys(combos).forEach(closeCombo);
  }

  function comboKeydown(e, kind) {
    var c = combos[kind];
    if (!c) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (c.panel.hidden) { openCombo(kind); return; }
      c.active = Math.min(c.active + 1, c.options.length - 1);
      renderCombo(kind);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      c.active = Math.max(c.active - 1, 0);
      renderCombo(kind);
    } else if (e.key === "Enter") {
      if (!c.panel.hidden && c.options[c.active]) {
        e.preventDefault();
        comboChoose(kind, c.options[c.active].name);
      }
    } else if (e.key === "Escape") {
      closeCombo(kind);
    }
  }

  function comboChoose(kind, value) {
    if (kind === "artist") {
      state.artist = value;
      state.track = "";
      state.artistPage = 1;
    } else {
      state.track = value;
      state.songPage = 1;
    }
    closeCombos();
    commitFilters();
  }

  /* ------------------------------- app actions ----------------------------- */

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* ignore */ }
  }
  function readStore(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  }

  function resetFilters() {
    state.year = "all";
    state.countries = new Set(COUNTRIES);
    state.months = new Set(MONTH_NAMES.map(function (_, i) { return i; }));
    state.artist = "";
    state.track = "";
    state.topN = 10;
    state.compare.clear();
    state.comparePair = null;
    state.artistSearch = "";
    state.songSearch = "";
    state.artistPage = 1;
    state.songPage = 1;
    closeCombos();
    render();
    toast("All filters reset.", "success");
  }

  function commitFilters() {
    state.artistPage = 1;
    state.songPage = 1;
    closeCombos();
    render();
  }

  function renderWithFocus(selector) {
    render();
    setTimeout(function () {
      var el = document.querySelector(selector);
      if (el) {
        el.focus();
        try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { /* ignore */ }
      }
    }, 0);
  }

  function setIcon(btn, name) {
    if (!btn) return;
    btn.innerHTML = '<i data-lucide="' + name + '"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  function applyTheme(name, skipRender) {
    var light = name === "light";
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#f2f6fb" : "#080d14");
    setIcon(document.getElementById("themeToggle"), light ? "moon" : "sun");
    store("spotify-intel-theme", light ? "light" : "dark");
    if (!skipRender) render();
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    closeCommand();
    applyTheme(current === "light" ? "dark" : "light");
  }

  function setSidebarCollapsed(collapsed) {
    var app = document.getElementById("app");
    if (!app) return;
    app.classList.toggle("sidebar-collapsed", collapsed);
    setIcon(document.getElementById("sidebarToggle"), collapsed ? "panel-left-open" : "panel-left-close");
    store("spotify-intel-sidebar", collapsed ? "collapsed" : "open");
  }

  function toggleSidebar() {
    if (window.innerWidth <= 1100) {
      closeMobileNav();
      return;
    }
    var app = document.getElementById("app");
    setSidebarCollapsed(!app.classList.contains("sidebar-collapsed"));
    setTimeout(resizeCharts, 280);
  }

  function openMobileNav() {
    var app = document.getElementById("app");
    var scrim = document.getElementById("sidebarScrim");
    if (!app) return;
    app.classList.add("nav-open");
    if (scrim) scrim.hidden = false;
  }

  function closeMobileNav() {
    var app = document.getElementById("app");
    var scrim = document.getElementById("sidebarScrim");
    if (app) app.classList.remove("nav-open");
    if (scrim) scrim.hidden = true;
  }

  function navigate(view) {
    if (!PAGE_META[view]) return;
    closeCombos();
    closeMobileNav();
    state.view = view;
    var target = "#/" + view;
    if (location.hash !== target) location.hash = target;
    render();
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (err) { window.scrollTo(0, 0); }
  }

  /* ------------------------------- event flow ------------------------------ */

  function handleClick(e) {
    var comboOpt = e.target.closest("[data-combo-option]");
    if (comboOpt) {
      comboChoose(comboOpt.getAttribute("data-combo-option"), comboOpt.getAttribute("data-value"));
      return;
    }

    if (e.target.matches("[data-modal-overlay]")) { closeModal(); return; }
    if (e.target.id === "commandOverlay") { closeCommand(); return; }

    var cmd = e.target.closest("[data-cmd-index]");
    if (cmd) {
      executeCommandItem(commandItems[Number(cmd.getAttribute("data-cmd-index"))]);
      return;
    }

    var tool = e.target.closest("[data-chart-tool]");
    if (tool) { handleChartTool(tool); return; }

    var action = e.target.closest("[data-action]");
    if (action) {
      var act = action.getAttribute("data-action");
      if (act === "close-modal") { closeModal(); return; }
      if (act === "reset-filters") { resetFilters(); return; }
      if (act === "export-csv") { exportFilteredCsv(); return; }
      if (act === "clear-compare") { state.compare.clear(); state.comparePair = null; render(); return; }
      if (act === "toggle-theme") { toggleTheme(); return; }
      if (act === "open-command") { openCommand(); return; }
      if (act === "exit-fullscreen") { closeFullscreen(); return; }
    }

    var clear = e.target.closest("[data-clear]");
    if (clear) {
      if (clear.getAttribute("data-clear") === "artist") state.artist = "";
      else state.track = "";
      commitFilters();
      return;
    }

    var remove = e.target.closest("[data-remove-filter]");
    if (remove) {
      var kind = remove.getAttribute("data-remove-filter");
      var value = remove.getAttribute("data-value");
      if (kind === "year") state.year = "all";
      else if (kind === "country") state.countries.delete(value);
      else if (kind === "artist") state.artist = "";
      else if (kind === "track") state.track = "";
      else if (kind === "months") state.months = new Set(MONTH_NAMES.map(function (_, i) { return i; }));
      commitFilters();
      return;
    }

    var compareRemove = e.target.closest("[data-compare-remove]");
    if (compareRemove) {
      state.compare.delete(compareRemove.getAttribute("data-compare-remove"));
      state.comparePair = null;
      render();
      return;
    }

    var compareCountry = e.target.closest("[data-compare-country]");
    if (compareCountry) {
      var cname = compareCountry.getAttribute("data-compare-country");
      if (state.compare.has(cname)) state.compare.delete(cname);
      else state.compare.add(cname);
      if (state.compare.size < 2) state.comparePair = null;
      render();
      return;
    }

    var overlap = e.target.closest("[data-overlap]");
    if (overlap) {
      var parts = overlap.getAttribute("data-overlap").split(":");
      var i = Number(parts[0]), j = Number(parts[1]);
      state.comparePair = [i, j];
      state.compare = new Set([COUNTRIES[i], COUNTRIES[j]]);
      render();
      return;
    }

    var isolate = e.target.closest("[data-isolate-country]");
    if (isolate) {
      var only = isolate.getAttribute("data-isolate-country");
      state.countries = new Set([only]);
      state.compare.clear();
      state.comparePair = null;
      commitFilters();
      toast("Isolated " + only + ".", "success");
      return;
    }

    var filterArtist = e.target.closest("[data-filter-artist]");
    if (filterArtist) {
      closeModal();
      state.artist = filterArtist.getAttribute("data-filter-artist");
      state.track = "";
      state.artistPage = 1;
      navigate("artists");
      toast("Filtered to " + state.artist + ".", "success");
      return;
    }

    var filterTrack = e.target.closest("[data-filter-track]");
    if (filterTrack) {
      closeModal();
      state.track = filterTrack.getAttribute("data-filter-track");
      state.artist = "";
      state.songPage = 1;
      navigate("songs");
      toast("Filtered to " + state.track + ".", "success");
      return;
    }

    var filterCountry = e.target.closest("[data-filter-country]");
    if (filterCountry) {
      closeModal();
      state.countries = new Set([filterCountry.getAttribute("data-filter-country")]);
      state.compare.clear();
      state.comparePair = null;
      navigate("countries");
      toast("Isolated " + Array.from(state.countries)[0] + ".", "success");
      return;
    }

    var openTrack = e.target.closest("[data-open-track]");
    if (openTrack) { openTrackModal(openTrack.getAttribute("data-open-track")); return; }
    var openArtist = e.target.closest("[data-open-artist]");
    if (openArtist) { openArtistModal(openArtist.getAttribute("data-open-artist")); return; }
    var openCountry = e.target.closest("[data-open-country]");
    if (openCountry) { openCountryModal(openCountry.getAttribute("data-open-country")); return; }

    var trend = e.target.closest("[data-trend-mode]");
    if (trend) {
      state.trendMode = trend.getAttribute("data-trend-mode");
      render();
      return;
    }

    var pageBtn = e.target.closest("[data-page-table]");
    if (pageBtn) {
      var table = pageBtn.getAttribute("data-page-table");
      var dir = pageBtn.getAttribute("data-page");
      var key = table === "artists" ? "artistPage" : "songPage";
      state[key] = Math.max(1, state[key] + (dir === "next" ? 1 : -1));
      render();
      return;
    }

    var sortTh = e.target.closest("[data-sort-key]");
    if (sortTh) {
      var st = sortTh.getAttribute("data-sort-table");
      var sk = sortTh.getAttribute("data-sort-key");
      var sortKey = st === "artists" ? "artistSort" : "songSort";
      if (state[sortKey].key === sk) {
        state[sortKey] = { key: sk, dir: state[sortKey].dir === "asc" ? "desc" : "asc" };
      } else {
        state[sortKey] = { key: sk, dir: sk === "name" ? "asc" : "desc" };
      }
      state[st === "artists" ? "artistPage" : "songPage"] = 1;
      render();
      return;
    }

    var goto = e.target.closest("[data-goto]");
    if (goto) { navigate(goto.getAttribute("data-goto")); return; }
    var nav = e.target.closest("[data-view]");
    if (nav) { navigate(nav.getAttribute("data-view")); return; }
  }

  function handleChange(e) {
    var sortSelect = e.target.closest("[data-sort-select]");
    if (sortSelect) {
      var table = sortSelect.getAttribute("data-sort-select");
      var key = sortSelect.value;
      if (table === "artists") state.artistSort = { key: key, dir: key === "name" ? "asc" : "desc" };
      else state.songSort = { key: key, dir: key === "name" ? "asc" : "desc" };
      state[table === "artists" ? "artistPage" : "songPage"] = 1;
      render();
      return;
    }
    var pageSize = e.target.closest("[data-page-size]");
    if (pageSize) {
      var table2 = pageSize.getAttribute("data-page-size");
      if (table2 === "artists") {
        state.artistPageSize = Number(pageSize.value);
        state.artistPage = 1;
      } else {
        state.songPageSize = Number(pageSize.value);
        state.songPage = 1;
      }
      render();
    }
  }

  function handleInput(e) {
    if (e.target.id === "artistSearchInput") {
      state.artistSearch = e.target.value;
      state.artistPage = 1;
      debouncedArtistSearch();
    } else if (e.target.id === "songSearchInput") {
      state.songSearch = e.target.value;
      state.songPage = 1;
      debouncedSongSearch();
    }
  }

  function commandKeydown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      commandActive = Math.min(commandActive + 1, commandItems.length - 1);
      renderCommandResults();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      commandActive = Math.max(commandActive - 1, 0);
      renderCommandResults();
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeCommandItem(commandItems[commandActive]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeCommand();
    }
  }

  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      var overlay = document.getElementById("commandOverlay");
      if (overlay && !overlay.hidden) closeCommand();
      else openCommand();
      return;
    }
    if (e.key === "Escape") {
      var overlay2 = document.getElementById("commandOverlay");
      if (overlay2 && !overlay2.hidden) { closeCommand(); return; }
      var modalRoot = document.getElementById("modalRoot");
      if (modalRoot && modalRoot.children.length) { closeModal(); return; }
      if (document.body.classList.contains("chart-focus")) { closeFullscreen(); return; }
      closeCombos();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("country-card")) {
      e.preventDefault();
      openCountryModal(e.target.getAttribute("data-open-country"));
    }
  }

  var debouncedArtistSearch = debounce(function () { renderWithFocus("#artistSearchInput"); }, 220);
  var debouncedSongSearch = debounce(function () { renderWithFocus("#songSearchInput"); }, 220);

  function bindEvents() {
    var sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) sidebarToggle.addEventListener("click", toggleSidebar);
    var menuBtn = document.getElementById("menuBtn");
    if (menuBtn) menuBtn.addEventListener("click", openMobileNav);
    var scrim = document.getElementById("sidebarScrim");
    if (scrim) scrim.addEventListener("click", closeMobileNav);
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    var commandBtn = document.getElementById("commandBtn");
    if (commandBtn) commandBtn.addEventListener("click", openCommand);
    var exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportFilteredCsv);
    var resetBtn = document.getElementById("resetBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetFilters);
    var statusBtn = document.getElementById("datasetStatus");
    if (statusBtn) statusBtn.addEventListener("click", function () { navigate("quality"); });
    var coverageBtn = document.getElementById("coverageBtn");
    if (coverageBtn) coverageBtn.addEventListener("click", function () { navigate("quality"); });
    var focusClose = document.getElementById("chartFocusClose");
    if (focusClose) focusClose.addEventListener("click", closeFullscreen);

    var yearSelect = document.getElementById("yearFilter");
    if (yearSelect) yearSelect.addEventListener("change", function () {
      state.year = yearSelect.value;
      commitFilters();
    });
    var topSelect = document.getElementById("topNFilter");
    if (topSelect) topSelect.addEventListener("change", function () {
      state.topN = Number(topSelect.value);
      state.artistPage = 1;
      state.songPage = 1;
      render();
    });

    var countryOptions = document.getElementById("countryOptions");
    if (countryOptions) countryOptions.addEventListener("change", function (e) {
      var cb = e.target.closest("[data-country-index]");
      if (!cb) return;
      var name = COUNTRIES[Number(cb.getAttribute("data-country-index"))];
      if (cb.checked) state.countries.add(name);
      else state.countries.delete(name);
      commitFilters();
    });
    var monthOptions = document.getElementById("monthOptions");
    if (monthOptions) monthOptions.addEventListener("change", function (e) {
      var cb = e.target.closest("[data-month-index]");
      if (!cb) return;
      var idx = Number(cb.getAttribute("data-month-index"));
      if (cb.checked) state.months.add(idx);
      else state.months.delete(idx);
      commitFilters();
    });

    $$("#countryDropdown [data-country-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-country-action");
        state.countries = act === "all" ? new Set(COUNTRIES) : new Set();
        commitFilters();
      });
    });
    $$("#monthDropdown [data-month-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-month-action");
        state.months = act === "all" ? new Set(MONTH_NAMES.map(function (_, i) { return i; })) : new Set();
        commitFilters();
      });
    });

    setupCombos();

    var commandInput = document.getElementById("commandInput");
    if (commandInput) {
      commandInput.addEventListener("input", function () { commandActive = 0; renderCommandResults(); });
      commandInput.addEventListener("keydown", commandKeydown);
    }

    window.addEventListener("hashchange", function () {
      var match = location.hash.match(/^#\/([a-z]+)$/);
      var view = match && PAGE_META[match[1]] ? match[1] : "overview";
      if (view !== state.view) {
        state.view = view;
        render();
      }
    });
    window.addEventListener("resize", debounce(resizeCharts, 160));
    document.addEventListener("click", handleClick);
    document.addEventListener("click", function (e) {
      $$("details.dropdown[open]").forEach(function (d) {
        if (!d.contains(e.target)) d.open = false;
      });
      if (!e.target.closest(".combo")) closeCombos();
    });
    document.addEventListener("change", handleChange);
    document.addEventListener("input", handleInput);
    document.addEventListener("keydown", handleKeydown);
  }

  /* ------------------------------ render & init ---------------------------- */

  function updateHeader() {
    var meta = PAGE_META[state.view] || PAGE_META.overview;
    var title = document.getElementById("pageTitle");
    var sub = document.getElementById("pageSubtitle");
    var crumb = document.getElementById("crumbView");
    if (title) title.textContent = meta.title;
    if (sub) sub.textContent = meta.subtitle;
    if (crumb) crumb.textContent = meta.crumb;
    $$("#nav .nav-item").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-view") === state.view);
    });
    document.title = "Spotify Intelligence \u00b7 " + meta.title;
  }

  function mountViewCharts(view, model, base) {
    if (view === "overview") {
      mountTrendChart("trendChart", model, model.countryList);
      mountDonutChart(model);
    } else if (view === "countries") {
      mountCountriesCharts(base);
    } else if (view === "songs") {
      mountSongsCharts(model);
    } else if (view === "insights") {
      mountInsightsCharts(model, base);
    }
  }

  function bindReplicaToggle() {
    var rep = document.getElementById("notebookReplica");
    if (!rep) return;
    rep.addEventListener("toggle", function () {
      if (rep.open) {
        mountReplicaCharts();
      } else {
        ["replicaCountries", "replicaTracks", "replicaGrowth"].forEach(function (id) {
          if (charts.has(id)) {
            try { charts.get(id).destroy(); } catch (err) { /* ignore */ }
            charts.delete(id);
          }
        });
      }
    });
  }

  function render() {
    closeFullscreen();
    var modalRoot = document.getElementById("modalRoot");
    if (modalRoot && modalRoot.children.length) closeModal();

    var view = state.view;
    var model = getModel(false);
    var base = getModel(true);
    destroyAllCharts();

    var html = "";
    if (view === "quality") {
      html = renderQuality();
    } else if (!model.rows) {
      html = emptyState("No records match this filter combination", "Widen the year, market, month, artist or track filters and try again.");
    } else if (view === "overview") {
      html = renderOverview(model);
    } else if (view === "countries") {
      html = renderCountries(model, base);
    } else if (view === "artists") {
      html = renderArtists(model);
    } else if (view === "songs") {
      html = renderSongs(model);
    } else if (view === "insights") {
      html = renderInsights(model, base);
    }

    viewRoot.innerHTML = html;
    updateHeader();
    updateFilterControls(model);
    if (window.lucide) window.lucide.createIcons();
    if (view === "quality") bindReplicaToggle();

    requestAnimationFrame(function () {
      if (state.view !== view) return;
      if (view !== "quality" && model.rows) mountViewCharts(view, model, base);
      resizeCharts();
    });
  }

  function init() {
    try {
      var savedTheme = readStore("spotify-intel-theme") || "dark";
      applyTheme(savedTheme, true);
      setSidebarCollapsed(readStore("spotify-intel-sidebar") === "collapsed");
      buildChoiceIndex();

      var yearSelect = document.getElementById("yearFilter");
      if (yearSelect) {
        yearSelect.innerHTML = '<option value="all">All years</option>' + YEARS.map(function (y) {
          return '<option value="' + y + '">' + y + "</option>";
        }).join("");
      }
      var topSelect = document.getElementById("topNFilter");
      if (topSelect) topSelect.value = String(state.topN);

      bindEvents();

      var match = location.hash.match(/^#\/([a-z]+)$/);
      if (match && PAGE_META[match[1]]) state.view = match[1];

      render();
      setTimeout(hideBoot, 320);
    } catch (err) {
      console.error(err);
      hideBoot();
      if (viewRoot) {
        viewRoot.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-alert"></i></div>' +
          "<h3>The workspace could not start</h3><p>" + esc(err && err.message ? err.message : "Unknown error") + "</p></div>";
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
