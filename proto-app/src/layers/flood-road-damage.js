import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// Road damage for the 2026 Nepal GLOF, from Copernicus EMSR927 rapid-mapping
// (the Pasang Lhamu Highway and feeder roads along the Bhotekoshi-Trishuli
// corridor). Rendered as coloured lines on the Disaster tab using the SAME
// canonical grade vocabulary + colour scale as the bridge layer, so bridges and
// roads read as one damage picture. Built with the sources-array pattern even
// though only EMSR927 grades roads today, so a second source is a one-line add.
// Only Nepal ships this file; other flood events 404 -> empty, layer no-ops.

const GRADE_COLORS = {
  'Destroyed': '#c0392b',
  'Damaged': '#e08a1e',
  'Possibly damaged': '#f1c40f',
  'No visible damage': '#2e8b57',
}
const STATUS_MATCH = [
  'match', ['get', 'status'],
  'Destroyed', GRADE_COLORS['Destroyed'],
  'Damaged', GRADE_COLORS['Damaged'],
  'Possibly damaged', GRADE_COLORS['Possibly damaged'],
  'No visible damage', GRADE_COLORS['No visible damage'],
  /* other */ '#8a8f98',
]
const CANON = {
  'destroyed': 'Destroyed', 'damaged': 'Damaged',
  'possibly damaged': 'Possibly damaged', 'no visible damage': 'No visible damage',
}
function canon(label) { return CANON[String(label || '').trim().toLowerCase()] || null }

const SOURCES = [
  { key: 'emsr927', file: 'transport-emsr927.geojson', normalize: normalizeEmsr927Roads },
]

function normalizeEmsr927Roads(fc) {
  return turf.featureCollection((fc.features || [])
    .filter(f => f.properties?.kind === 'road')
    .map(f => {
      const p = f.properties || {}
      const status = canon(p.dmg_label)
      return { type: 'Feature', geometry: f.geometry, properties: {
        source: 'emsr927', source_label: 'Copernicus EMSR927',
        name: p.name && p.name !== 'Unknown' ? p.name : null,
        status, orig_label: p.dmg_label || 'Unknown',
        dmg: typeof p.dmg === 'number' ? p.dmg : null,
      } }
    }))
}

let CACHE = {}
let lastKey = null

export const floodRoadDamageLayer = {

  async loadData(store, loadLabel) {
    CACHE = {}
    lastKey = null
    const base = `${store.getters.disasterBaseUrlData}/flood-impact`
    const meta = await helpers.fetchJsonAndBumpProgress(`${base}/impact-sources.json`, loadLabel, store, {})
    const updatedFor = meta?.roads || {}
    const available = []
    const summary = {}
    for (const s of SOURCES) {
      const raw = await helpers.fetchJsonAndBumpProgress(`${base}/${s.file}`, loadLabel, store, turf.featureCollection([]))
      if (!raw?.features?.length) continue
      const fc = s.normalize(raw)
      if (!fc.features.length) continue
      CACHE[s.key] = fc
      const m = updatedFor[s.key] || {}
      const grades = [...new Set(fc.features.map(f => f.properties.status).filter(Boolean))]
      available.push({ key: s.key, label: m.label || s.key, updated: m.updated || null, grades })
      // report summary: length (km) per road name x grade, and per grade
      const byName = {}
      const byGrade = {}
      for (const f of fc.features) {
        let km = 0
        try { km = turf.length(f, { units: 'kilometers' }) } catch { km = 0 }
        const g = f.properties.status || 'Unknown'
        const nm = f.properties.name || 'Unnamed segments'
        byGrade[g] = (byGrade[g] || 0) + km
        byName[nm] = byName[nm] || {}
        byName[nm][g] = (byName[nm][g] || 0) + km
      }
      summary[s.key] = { updated: m.updated || null, byName, byGrade }
    }
    store.commit('setRoadDamageSources', available)
    store.commit('setData', { roadDamageBySource: summary })
    return CACHE
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('road-damage')) return
    map.addSource('road-damage', { type: 'geojson', data: turf.featureCollection([]) })

    map.addLayer({
      id: 'road-damage',
      type: 'line',
      source: 'road-damage',
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': STATUS_MATCH,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 13, 5],
        'line-opacity': 0.9,
      },
    }, beforeId)

    // NB: adder is invoked as layerConfig.adder(...), so `this` is the layer config,
    // not this module — call the updater by module name.
    floodRoadDamageLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    if (!map.getLayer('road-damage')) return
    const currentTab = store.state.currentTab
    const visible = currentTab === 'disaster' || currentTab === 'disasterReport'

    const sources = store.state.roadDamageSources || []
    let key = store.state.roadDamageSource
    if (!CACHE[key]) key = sources[0]?.key
    const fc = (key && CACHE[key]) ? CACHE[key] : turf.featureCollection([])
    const src = map.getSource('road-damage')
    if (src && key !== lastKey) {
      src.setData(fc)
      lastKey = key
    }

    map.setLayoutProperty('road-damage', 'visibility', visible ? 'visible' : 'none')
  },

}
