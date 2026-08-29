import * as turf from '@turf/turf'
import { helpers } from '../../helpers'
import {
  STATUS_FIELD, statusColor, prettyStatus, MIXED_COLOR, TABLE_FILE,
} from './palettes.js'

// ============================================================================
// News Sources — one factory for all seven fact tables (2026 Nepal floods).
//
// makeNewsLayer(table) returns a { loadData, addLayer, updateLayer } triple that
// is registered as a thin LayerConfig in ../index.ts. Do NOT copy this file per
// table — the seven differ only by `table`.
//
// DESIGN DOCTRINE — inherited from data_backend/nepal_news/READYMAPPER_BUILD_PROMPT.md.
// The map must never imply more precision or certainty than the source gave:
//
//   BAN choropleth of absolute counts
//   BAN any heatmap / kernel density / graduated symbol of article mentions
//   BAN opacity or marker size as an uncertainty channel
//   BAN numeric "confidence: 85%" displays
//   BAN averaging or midpointing contested figures
//
// The mention-density heatmap is the one to refuse hardest: here COVERAGE IS
// INVERSELY CORRELATED WITH NEED (the worst-hit palikas went dark), so such a map
// would literally invert reality. Encoding is therefore strictly:
//   colour   = substantive status (one vocabulary per table, palettes.js)
//   fill     = confidence in the LOCATION (solid / ring+dot / hollow) — shape, not size
//   ×N badge = independent_origins ONLY (never density / effective_sources)
//   number   = count of facts at a chip (text, never a fill)
//
// TIME is state-of-knowledge-at-D, not events-on-D: for each entity_key show the
// latest record with as_of <= selectedDateTime; a fact is never dropped because it
// stopped being re-reported (that means nobody looked, not that it resolved).
//
// Only Nepal ships these files; every other event 404s -> empty -> the layer no-ops.
// ============================================================================

const CACHE = {}          // table -> { groups: Map<entity_key, sortedFeatures[]>, lines: [] }
const lastRenderKey = {}  // table -> String(selectedDateTime ms) last rendered while visible

const TWO_DAYS_MS = 2 * 24 * 3600 * 1000
const CONF_RANK = { high: 3, medium: 2, low: 1 }

// Infrastructure "what kind of thing is this" label, shown under precise (point)
// markers so a responder can tell a hospital from a hydropower plant at a glance.
const SECTOR_LABEL = {
  health_facility: 'Health', power: 'Power', bridge: 'Bridge', road: 'Road',
  school: 'School', telecom: 'Telecom', water: 'Water', other: '',
}
function sectorLabel(s) { return SECTOR_LABEL[String(s || '').toLowerCase()] ?? '' }

function toInt(v, d = 0) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d }
function truthy(v) { return v === true || v === 1 || /^(true|1|yes|y)$/i.test(String(v || '')) }
function normConf(c) { const s = String(c || '').toLowerCase(); return CONF_RANK[s] ? s : 'low' }
function asOfMs(f) { const t = Date.parse(f?.properties?.as_of || ''); return Number.isFinite(t) ? t : 0 }
function fmtNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : (v == null ? '' : String(v))
}

// ---- the human "fact" line (popup point 2), one grammar per table -----------
function factText(table, p) {
  const S = (x) => (x == null ? '' : String(x).trim())
  switch (table) {
    case 'people_aggregate': {
      let pg = S(p.population_group)
      if (/^(general|all|total|people|persons)$/i.test(pg)) pg = ''
      return `${fmtNum(p.value)}${pg ? ` ${pg}` : ''} ${S(p.metric)}`.trim()
    }
    case 'infrastructure':
      // keep it a one-liner: name + status. The detail/quote lives in the popup fields.
      return `${S(p.asset_name) || prettyStatus(p.sector)} — ${prettyStatus(p.status)}`
    case 'access': {
      const seg = [S(p.segment_from), S(p.segment_to)].filter(Boolean).join(' → ')
      const pass = prettyStatus(p.passability)
      const mode = S(p.mode) ? ` (${S(p.mode)})` : ''
      return seg ? `${seg} — ${pass}${mode}` : `${pass}${mode}`
    }
    case 'shelter_sites': {
      const cnt = [
        S(p.people) ? `${fmtNum(p.people)} people` : '',
        S(p.households) ? `${fmtNum(p.households)} households` : '',
      ].filter(Boolean).join(', ')
      return `${S(p.site_name) || prettyStatus(p.site_function)}` +
        (cnt ? ` — ${cnt} (${S(p.figure_basis) || 'basis n/s'})` : '')
    }
    case 'aid_delivery':
      return `${S(p.actor) || 'Actor n/s'} — ${prettyStatus(p.commodity)}` +
        (S(p.quantity) ? ` ${fmtNum(p.quantity)} ${S(p.unit).replace(/_/g, ' ')}`.trimEnd() : '') +
        (S(p.beneficiaries) ? `, ${fmtNum(p.beneficiaries)} beneficiaries` : '')
    case 'hazard_watch': {
      const action = S(p.action).replace(/_/g, ' ')
      return `${prettyStatus(p.hazard)}${action ? ` — ${action}` : ''}`
    }
    case 'damage_extent':
      return `${prettyStatus(p.metric)}: ` +
        (truthy(p.is_percentage) ? `${fmtNum(p.value)}%` : fmtNum(p.value)) +
        (!truthy(p.is_percentage) && S(p.denominator) ? ` of ${fmtNum(p.denominator)}` : '')
    default:
      return ''
  }
}

// popup payload for one fact (the 7-point contract is assembled in mapInteraction)
function factPopup(table, p) {
  return {
    table,
    // raw location fields so the popup can phrase location plainly (the pipeline's
    // geo_statement — "Matched X to a named OSM place" — reads as internal jargon)
    geo_resolution: p.geo_resolution || '',
    location_raw: p.location_raw || '',
    geo_anchor_name: p.geo_anchor_name || '',
    district: p.district || '',
    province: p.province || '',
    admin_level: p.admin_level || '',
    fact: factText(table, p),
    is_percentage: table === 'damage_extent' ? truthy(p.is_percentage) : undefined,
    as_of: p.as_of || '', as_of_basis: p.as_of_basis || '',
    first_reported: p.first_reported || '', last_reported: p.last_reported || '',
    origin_note: p.origin_note || '',
    confidence: p.confidence || '', confidence_note: p.confidence_note || '',
    evidence_quote: p.evidence_quote || '', evidence_quote_en: p.evidence_quote_en || '',
    source_outlets: p.source_outlets || '', source_outlet_count: toInt(p.source_outlet_count, 0),
    independent_origins: toInt(p.independent_origins, 1),
    contaminated: !!String(p.temporal_contamination_flag || '').trim(),
  }
}

function staleAt(asOf, sel) {
  return Number.isFinite(sel) && sel !== Infinity && (sel - asOf) > TWO_DAYS_MS
}

function makePointFeature(table, f, sel) {
  const p = f.properties || {}
  const status = p[STATUS_FIELD[table]]
  return {
    type: 'Feature', geometry: f.geometry,
    properties: {
      _color: statusColor(table, status),
      _confidence: normConf(p.confidence),
      _n: toInt(p.independent_origins, 1),
      _count: 1,
      _label: '',
      _res: p.geo_resolution || 'point',
      _anchorId: p.geo_anchor_id || '',
      _stale: staleAt(asOfMs(f), sel),
      _contam: !!String(p.temporal_contamination_flag || '').trim(),
      _typeLabel: table === 'infrastructure' ? sectorLabel(p.sector) : '',
      _factsJson: JSON.stringify([factPopup(table, p)]),
    },
  }
}

function makeChipFeature(table, anchorId, arr, sel) {
  const statuses = new Set(arr.map(f => f.properties?.[STATUS_FIELD[table]]).filter(v => v != null && v !== ''))
  const color = statuses.size === 1 ? statusColor(table, [...statuses][0]) : MIXED_COLOR
  // group confidence = LOWEST present (never overstate a mixed group as solid)
  const conf = arr.reduce((lo, f) => {
    const c = normConf(f.properties?.confidence)
    return CONF_RANK[c] < CONF_RANK[lo] ? c : lo
  }, 'high')
  const n = arr.reduce((m, f) => Math.max(m, toInt(f.properties?.independent_origins, 1)), 1)
  const freshest = arr.reduce((m, f) => Math.max(m, asOfMs(f)), 0)
  const label = arr[0].properties?.geo_anchor_name || ''
  // type label only when a district's infra facts all share one sector (else it's mixed)
  let typeLabel = ''
  if (table === 'infrastructure') {
    const sectors = new Set(arr.map(f => f.properties?.sector).filter(Boolean))
    if (sectors.size === 1) typeLabel = sectorLabel([...sectors][0])
  }
  return {
    type: 'Feature', geometry: arr[0].geometry,
    properties: {
      _color: color,
      _confidence: conf,
      _n: n,
      _count: arr.length,
      _label: label,
      _res: arr[0].properties?.geo_resolution || 'district',
      _anchorId: anchorId,
      _stale: staleAt(freshest, sel),
      _contam: arr.some(f => !!String(f.properties?.temporal_contamination_flag || '').trim()),
      _typeLabel: typeLabel,
      _factsJson: JSON.stringify(arr.map(f => factPopup(table, f.properties || {}))),
    },
  }
}

function makeLineFeature(f) {
  const p = f.properties || {}
  return {
    type: 'Feature', geometry: f.geometry,
    properties: {
      _color: statusColor('access', p.passability),
      _stale: false,
      _factsJson: JSON.stringify([{
        ...factPopup('access', p),
        connector: true,
        endpoint_from: p.endpoint_from || '', endpoint_to: p.endpoint_to || '',
        endpoint_from_level: p.endpoint_from_level || '', endpoint_to_level: p.endpoint_to_level || '',
      }]),
    },
  }
}

function buildFeatures(table, cache, sel) {
  const chosen = []
  for (const arr of cache.groups.values()) {
    let pick = null
    for (const f of arr) { if (asOfMs(f) <= sel) pick = f; else break }
    if (pick) chosen.push(pick)
  }
  const points = []
  const anchored = new Map()
  for (const f of chosen) {
    const p = f.properties || {}
    if (p.geo_resolution === 'point' || !p.geo_anchor_id) {
      points.push(makePointFeature(table, f, sel))
    } else {
      if (!anchored.has(p.geo_anchor_id)) anchored.set(p.geo_anchor_id, [])
      anchored.get(p.geo_anchor_id).push(f)
    }
  }
  for (const [anchorId, arr] of anchored) points.push(makeChipFeature(table, anchorId, arr, sel))

  let lines = turf.featureCollection([])
  if (table === 'access') {
    lines = turf.featureCollection((cache.lines || []).filter(f => asOfMs(f) <= sel).map(makeLineFeature))
  }
  return { points: turf.featureCollection(points), lines }
}

function commitSummary(store, table, features) {
  const byRes = { point: 0, palika: 0, district: 0, province: 0 }
  const statusSet = new Set()
  for (const f of features) {
    const r = f.properties?.geo_resolution; if (r in byRes) byRes[r]++
    const s = f.properties?.[STATUS_FIELD[table]]
    if (s != null && s !== '') statusSet.add(s)
  }
  const statuses = [...statusSet]
  const top = features
    .map(f => f.properties || {})
    .sort((a, b) => toInt(b.independent_origins, 0) - toInt(a.independent_origins, 0))
    .slice(0, 8)
    .map(p => ({
      n: toInt(p.independent_origins, 0),
      text: factText(table, p),
      where: p.geo_anchor_name || p.location_raw || '',
      origin_note: p.origin_note || '',
      outlet_count: toInt(p.source_outlet_count, 0),
      as_of: p.as_of || '',
    }))
  store.commit('setNewsFactSummary', { table, summary: { total: features.length, byRes, statuses, top } })
}

export function makeNewsLayer(table) {
  const src = `news-${table}`

  async function loadData(store, loadLabel) {
    CACHE[table] = null
    lastRenderKey[table] = null
    const base = `${store.getters.disasterBaseUrlData}/news`
    const fc = await helpers.fetchJsonAndBumpProgress(
      `${base}/facts-${TABLE_FILE[table]}.geojson`, loadLabel, store, turf.featureCollection([]))
    const features = fc?.features || []
    if (!features.length) return null

    let lines = []
    if (table === 'access') {
      const lfc = await helpers.fetchJsonAndBumpProgress(
        `${base}/facts-access-lines.geojson`, loadLabel, store, turf.featureCollection([]))
      lines = lfc?.features || []
    }

    const groups = new Map()
    for (const f of features) {
      const k = f.properties?.entity_key || f.properties?.record_id
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(f)
    }
    for (const arr of groups.values()) arr.sort((a, b) => asOfMs(a) - asOfMs(b))

    CACHE[table] = { groups, lines }
    commitSummary(store, table, features)
    return CACHE[table]
  }

  function addLayer(map, data, store, beforeId) {
    if (map.getSource(src)) return
    map.addSource(src, { type: 'geojson', data: turf.featureCollection([]) })

    // Access connectors: a SEPARATE dashed-line source, styled deliberately unlike
    // flood-road-damage. These assert "these two places, connection impaired" — not a
    // road alignment. Straight dashed segments can't be mistaken for a surveyed road.
    if (table === 'access') {
      if (!map.getSource('news-access-lines')) {
        map.addSource('news-access-lines', { type: 'geojson', data: turf.featureCollection([]) })
        map.addLayer({
          id: 'news-access-lines', type: 'line', source: 'news-access-lines',
          layout: { visibility: 'none', 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': ['get', '_color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 12, 3.5],
            'line-dasharray': [1.5, 1.4],
            'line-opacity': 0.85,
          },
        }, beforeId)
      }
    }

    // outer disk / ring — confidence: high = solid status disk, medium/low = hollow (white fill, status ring)
    map.addLayer({
      id: `${src}-fill`, type: 'circle', source: src,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'],
          7, ['case', ['>', ['get', '_count'], 1], 8, 5.5],
          12, ['case', ['>', ['get', '_count'], 1], 13, 9]],
        'circle-color': ['case', ['==', ['get', '_confidence'], 'high'], ['get', '_color'], '#ffffff'],
        'circle-stroke-color': ['get', '_color'],
        'circle-stroke-width': 2,
        'circle-opacity': 0.95,
      },
    }, beforeId)

    // medium-confidence inner dot -> ring+dot glyph (◎)
    map.addLayer({
      id: `${src}-inner`, type: 'circle', source: src,
      filter: ['==', ['get', '_confidence'], 'medium'],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 2.2, 12, 3.8],
        'circle-color': ['get', '_color'],
      },
    }, beforeId)

    // count of facts inside a chip (>1 only) — text, never a fill
    map.addLayer({
      id: `${src}-count`, type: 'symbol', source: src,
      layout: {
        visibility: 'none',
        'text-field': ['case', ['>', ['get', '_count'], 1], ['to-string', ['get', '_count']], ''],
        'text-size': 11,
        'text-font': ['literal', ['Noto Sans Bold']],
        'text-allow-overlap': true, 'text-ignore-placement': true,
      },
      paint: {
        'text-color': ['case', ['==', ['get', '_confidence'], 'high'], '#ffffff', ['get', '_color']],
      },
    }, beforeId)

    // "what kind of thing" label under precise infrastructure markers (Hospital /
    // Power / Bridge …). text-optional so it drops rather than pushing the marker off.
    map.addLayer({
      id: `${src}-label`, type: 'symbol', source: src,
      layout: {
        visibility: 'none',
        'text-field': ['get', '_typeLabel'],
        'text-size': 10,
        'text-font': ['literal', ['Noto Sans Regular']],
        'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-optional': true,
      },
      paint: {
        'text-color': '#2a2a2a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.3,
      },
    }, beforeId)

    // adder is invoked as layerConfig.adder(...) so `this` is the config, not this
    // module — the lexical updateLayer closure is the right reference.
    updateLayer(map, store)
  }

  function updateLayer(map, store) {
    if (!map.getLayer(`${src}-fill`)) return
    const tab = store.state.currentTab
    const onNews = tab === 'news'
    const onCustom = tab === 'custom'

    // Build the source data whenever the layer could be shown: the selected table
    // on the News tab, OR any table on the Custom tab (compose shows every active
    // layer). Without this the Custom tab renders empty sources — the layer toggles
    // on but nothing appears.
    const wantData = (onNews && store.state.newsTable === table) || onCustom
    if (wantData) {
      const cache = CACHE[table]
      const sel = store.state.selectedDateTime ? +new Date(store.state.selectedDateTime) : Infinity
      const renderKey = String(sel)
      if (cache && renderKey !== lastRenderKey[table]) {
        const out = buildFeatures(table, cache, sel)
        map.getSource(src)?.setData(out.points)
        if (table === 'access') map.getSource('news-access-lines')?.setData(out.lines)
        lastRenderKey[table] = renderKey
      }
    }

    // News tab shows only the selected table; Custom tab shows all (the controller's
    // show-all + user hides refine it). Reading tabs hide everything.
    const visible = (onNews && store.state.newsTable === table) || onCustom
    const ids = [`${src}-fill`, `${src}-inner`, `${src}-count`, `${src}-label`]
    if (table === 'access') ids.push('news-access-lines')
    ids.forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'))
  }

  return { loadData, addLayer, updateLayer }
}
