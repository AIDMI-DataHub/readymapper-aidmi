import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// Per-building flood damage, shown on the Disaster tab. Multiple source datasets
// (HOT fAIr AI assessment, OSM destroyed, Microsoft/UNOSAT overlay) are offered
// via a source dropdown; a mode radio switches between INDIVIDUAL building
// footprints and 0.5-mile HEXAGON aggregation. Both modes colour a single `dmg`
// property [0..1] on the viridis ramp, so one source + fill/line pair covers
// everything and the Custom tab's show-all shows the selected mode, not both.
//
// Hexagon metric depends on the source:
//   - a graded source (HOT fAIr, classes 0..3) -> MEAN severity per cell
//   - a binary source (OSM destroyed / Microsoft damaged=1) -> DENSITY (count),
//     normalised 0..1, because a mean of an all-damaged set is a flat 1.0.
// The chosen metric is published per source so the legend can label it honestly.

const SOURCES = [
  { key: 'hot-fair',   file: 'buildings-hotfair.geojson',    label: 'HOT fAIr (AI damage)' },
  { key: 'emsr927',    file: 'buildings-emsr927.geojson',    label: 'Copernicus EMSR927' },
  { key: 'microsoft',  file: 'buildings-microsoft.geojson',  label: 'Microsoft / UNOSAT' },
  { key: 'unosat',     file: 'buildings-unosat.geojson',     label: 'UNOSAT (affected)' },
  { key: 'osm',        file: 'buildings-osm.geojson',        label: 'OSM destroyed' },
]

const HEX_SIDE_MILES = 0.1 // hexagon circumradius ~0.1 mile

const VIRIDIS = [
  'interpolate', ['linear'], ['coalesce', ['get', 'dmg'], 0],
  0.0, '#440154',
  0.2, '#414487',
  0.4, '#2a788e',
  0.6, '#22a884',
  0.8, '#7ad151',
  1.0, '#fde725',
]

// module-scoped cache: { [key]: { individual: FC, hexagon: FC, metric } }
// repopulated on every loadData (disaster switch) so stale data can't leak.
let CACHE = {}
// track last (source, mode) rendered so updateLayer skips redundant setData
// (a tab switch / layer toggle re-runs updaters but the data is unchanged).
let lastKey = null
let lastMode = null

function buildHexagons(individualFC) {
  // [x, y, dmg] triples — one centroid per footprint
  const pts = individualFC.features
    .filter(f => f.properties && typeof f.properties.dmg === 'number')
    .map(f => {
      const c = turf.centroid(f).geometry.coordinates
      return [c[0], c[1], f.properties.dmg]
    })
  if (pts.length === 0) return { fc: turf.featureCollection([]), metric: 'severity' }

  // graded (>=2 distinct damage values) -> mean severity; else -> density
  const density = new Set(pts.map(p => p[2])).size <= 1

  // Direct hex-binning (d3-hexbin pointy-top layout) in a local equirectangular
  // metric projection. O(points), so it supports tiny cells (0.1 mi) without
  // building the full grid (which would be ~100k polygons over the Microsoft
  // bbox) and only emits occupied cells.
  let lon0 = Infinity, lat0 = Infinity, latSum = 0
  for (const p of pts) { if (p[0] < lon0) lon0 = p[0]; if (p[1] < lat0) lat0 = p[1]; latSum += p[1] }
  const latC = latSum / pts.length
  const M_LAT = 111320
  const M_LON = 111320 * Math.cos(latC * Math.PI / 180)
  const toLon = x => lon0 + x / M_LON
  const toLat = y => lat0 + y / M_LAT

  const r = HEX_SIDE_MILES * 1609.344 // circumradius, metres
  const dx = r * Math.sqrt(3)
  const dy = r * 1.5

  const bins = new Map()
  for (const p of pts) {
    const x = (p[0] - lon0) * M_LON, y = (p[1] - lat0) * M_LAT
    const pj = Math.round(y / dy)
    const pi = Math.round(x / dx - (pj & 1 ? 0.5 : 0))
    const key = pi + ',' + pj
    let b = bins.get(key)
    if (!b) { b = { pi, pj, sum: 0, n: 0, nDestroyed: 0 }; bins.set(key, b) }
    b.sum += p[2]; b.n++
    if (p[2] === 1) b.nDestroyed++
  }

  // pointy-top hexagon vertex offsets (circumradius r), at 30 + 60k degrees
  const HEX = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (30 + 60 * k)
    HEX.push([Math.cos(a) * r, Math.sin(a) * r])
  }

  const cells = []
  for (const b of bins.values()) {
    const cx = (b.pi + (b.pj & 1 ? 0.5 : 0)) * dx
    const cy = b.pj * dy
    const ring = HEX.map(([hx, hy]) => [toLon(cx + hx), toLat(cy + hy)])
    ring.push(ring[0])
    let props
    if (density) {
      props = { n: b.n, count: b.n, dmg: b.n } // dmg normalised below
    } else {
      const meanSev = b.sum / b.n
      props = {
        n: b.n,
        dmg: meanSev,
        avg_pct: Math.round(meanSev * 100),
        n_destroyed: b.nDestroyed,
        pct_destroyed: Math.round((b.nDestroyed / b.n) * 100),
      }
    }
    cells.push(turf.polygon([ring], props))
  }
  let max = 1
  if (density) {
    max = cells.reduce((m, c) => Math.max(m, c.properties.count), 0) || 1
    cells.forEach(c => { c.properties.dmg = c.properties.count / max })
  }
  return { fc: turf.featureCollection(cells), metric: density ? 'density' : 'severity', max }
}

export const floodBuildingDamageLayer = {

  async loadData(store, loadLabel) {
    CACHE = {}
    lastKey = null
    lastMode = null
    const base = `${store.getters.disasterBaseUrlData}/flood-impact`
    // per-source last-updated dates (small print in the legend); optional file
    const meta = await helpers.fetchJsonAndBumpProgress(`${base}/impact-sources.json`, loadLabel, store, {})
    const updatedFor = meta?.buildings || {}
    const available = []
    const summary = {}
    for (const s of SOURCES) {
      const fc = await helpers.fetchJsonAndBumpProgress(`${base}/${s.file}`, loadLabel, store, turf.featureCollection([]))
      if (!fc?.features?.length) continue
      const individual = turf.featureCollection(
        fc.features.filter(f => f.properties && typeof f.properties.dmg === 'number')
      )
      const hex = buildHexagons(individual)
      CACHE[s.key] = { individual, hexagon: hex.fc, metric: hex.metric }
      // for a binary source, publish the footprints' own damage wording (Affected /
      // Damaged / Destroyed) so the legend states what the source actually asserts
      // rather than a generic "Damaged" — UNOSAT flags "affected", not "damaged".
      let binaryLabel = null
      if (hex.metric === 'density') {
        const counts = {}
        for (const f of individual.features) {
          const l = f.properties?.dmg_label
          if (l) counts[l] = (counts[l] || 0) + 1
        }
        const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'Damaged'
        binaryLabel = top.replace(/\s*\(.*?\)/g, '').split('·')[0].trim() // "Damaged (UNOSAT)"->"Damaged"
      }
      available.push({ key: s.key, label: s.label, metric: hex.metric, binaryLabel, updated: updatedFor[s.key]?.updated || null })
      // report-ready class breakdown using each source's OWN honest labels
      // (strip qualifiers so OSM's "Destroyed · floods"/"(part)" collapse to "Destroyed")
      const classes = {}
      for (const f of individual.features) {
        let l = f.properties?.dmg_label || '(unlabelled)'
        l = l.replace(/\s*\(.*?\)/g, '').split('·')[0].trim()
        classes[l] = (classes[l] || 0) + 1
      }
      summary[s.key] = { label: s.label, updated: updatedFor[s.key]?.updated || null, metric: hex.metric, total: individual.features.length, classes }
    }
    store.commit('setBuildingDamageSources', available)
    store.commit('setData', { buildingDamageSummary: summary })
    return CACHE
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('building-damage')) return
    map.addSource('building-damage', { type: 'geojson', data: turf.featureCollection([]) })

    map.addLayer({
      id: 'building-damage-fill',
      type: 'fill',
      source: 'building-damage',
      layout: { visibility: 'none' },
      paint: { 'fill-color': VIRIDIS, 'fill-opacity': 0.85 },
    }, beforeId)

    map.addLayer({
      id: 'building-damage-line',
      type: 'line',
      source: 'building-damage',
      layout: { visibility: 'none' },
      paint: { 'line-color': VIRIDIS, 'line-width': 1.1, 'line-opacity': 0.9 },
    }, beforeId)

    // NB: adder is invoked as layerConfig.adder(...), so `this` is the layer config,
    // not this module — call the updater by module name.
    floodBuildingDamageLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    if (!map.getLayer('building-damage-fill')) return
    const currentTab = store.state.currentTab
    const visible = (currentTab === 'disaster' || currentTab === 'disasterReport') ? 'visible' : 'none'

    const sources = store.state.buildingDamageSources || []
    let key = store.state.buildingDamageSource
    if (!CACHE[key]) key = sources[0]?.key
    const mode = store.state.buildingDamageMode === 'hexagon' ? 'hexagon' : 'individual'

    const fc = (key && CACHE[key]) ? CACHE[key][mode] : turf.featureCollection([])
    const src = map.getSource('building-damage')
    // only re-parse the (potentially large) FeatureCollection when the selection
    // actually changed — a tab switch / layer toggle re-runs updaters with the
    // same data, and setData forces a full re-render otherwise.
    if (src && (key !== lastKey || mode !== lastMode)) {
      src.setData(fc)
      lastKey = key
      lastMode = mode
    }

    map.setPaintProperty('building-damage-fill', 'fill-opacity', mode === 'hexagon' ? 0.5 : 0.85)
    map.setPaintProperty('building-damage-line', 'line-width', mode === 'hexagon' ? 0.8 : 1.1)

    map.setLayoutProperty('building-damage-fill', 'visibility', visible)
    map.setLayoutProperty('building-damage-line', 'visibility', visible)
  },

}
