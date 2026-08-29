import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// Bridge damage for the 2026 Nepal GLOF, offered from multiple sources via a
// dropdown (same pattern as building damage / flood extent):
//   - ICIMOD  : 31 bridges, field-reported status (Washed out / Damaged / Spared)
//   - Copernicus EMSR927 : 6 graded bridges from the rapid-mapping AOIs
// Every source is normalised at load to ONE canonical grade vocabulary
// (Destroyed / Damaged / Possibly damaged / No visible damage) with a single
// colour scale, so the sources are directly comparable; the original label is
// kept for the click popup. Rendered as coloured circles on the Disaster tab.
// Only Nepal ships these files; other flood events 404 -> empty, layer no-ops.

// Canonical grade -> colour (shared with the roads layer for cross-kind consistency)
export const GRADE_COLORS = {
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

// map each source's native label onto the canonical grade
const CANON = {
  'washed out': 'Destroyed',
  'destroyed': 'Destroyed',
  'damaged': 'Damaged',
  'highly damaged': 'Damaged',
  'possibly damaged': 'Possibly damaged',
  'moderately damaged': 'Possibly damaged',
  'spared': 'No visible damage',
  'no visible damage': 'No visible damage',
  'no/slight damage': 'No visible damage',
}
const DMG = { 'Destroyed': 1.0, 'Damaged': 0.66, 'Possibly damaged': 0.33, 'No visible damage': 0.0 }
function canon(label) {
  return CANON[String(label || '').trim().toLowerCase()] || null
}

const SOURCES = [
  { key: 'icimod',  file: 'bridge-damage.geojson',    normalize: normalizeIcimod },
  { key: 'emsr927', file: 'transport-emsr927.geojson', normalize: normalizeEmsr927Bridges },
]

function normalizeIcimod(fc) {
  return turf.featureCollection((fc.features || []).map(f => {
    const p = f.properties || {}
    const status = canon(p.damage_status)
    return { type: 'Feature', geometry: f.geometry, properties: {
      source: 'icimod', source_label: p.data_source || 'ICIMOD',
      name: p.bridge_name || 'Bridge', status, orig_label: p.damage_status || 'Unknown',
      dmg: status ? DMG[status] : null,
      location: p.location || null, district: p.district || null,
      length_m: p.length_m ?? null, bridge_type: p.bridge_type || null,
    } }
  }))
}
function normalizeEmsr927Bridges(fc) {
  return turf.featureCollection((fc.features || [])
    .filter(f => f.properties?.kind === 'bridge')
    .map(f => {
      const p = f.properties || {}
      const status = canon(p.dmg_label)
      return { type: 'Feature', geometry: f.geometry, properties: {
        source: 'emsr927', source_label: 'Copernicus EMSR927',
        name: p.name && p.name !== 'Unknown' ? p.name : 'Bridge',
        status, orig_label: p.dmg_label || 'Unknown',
        dmg: typeof p.dmg === 'number' ? p.dmg : (status ? DMG[status] : null),
        location: null, district: null, length_m: null, bridge_type: null,
      } }
    }))
}

let CACHE = {}
let lastKey = null

export const floodBridgeDamageLayer = {

  async loadData(store, loadLabel) {
    CACHE = {}
    lastKey = null
    const base = `${store.getters.disasterBaseUrlData}/flood-impact`
    const meta = await helpers.fetchJsonAndBumpProgress(`${base}/impact-sources.json`, loadLabel, store, {})
    const updatedFor = meta?.bridges || {}
    const available = []
    const summary = {}
    for (const s of SOURCES) {
      const raw = await helpers.fetchJsonAndBumpProgress(`${base}/${s.file}`, loadLabel, store, turf.featureCollection([]))
      if (!raw?.features?.length) continue
      const fc = s.normalize(raw)
      if (!fc.features.length) continue
      CACHE[s.key] = fc
      const m = updatedFor[s.key] || {}
      // publish the grades actually present so the legend only lists real categories
      const grades = [...new Set(fc.features.map(f => f.properties.status).filter(Boolean))]
      available.push({ key: s.key, label: m.label || s.key, updated: m.updated || null, grades })
      // report summary: per-bridge name/status/location + counts by status
      const bridges = fc.features.map(f => ({
        name: f.properties.name, status: f.properties.status,
        location: f.properties.location, orig_label: f.properties.orig_label,
      }))
      const byStatus = {}
      for (const b of bridges) byStatus[b.status] = (byStatus[b.status] || 0) + 1
      summary[s.key] = { updated: m.updated || null, bridges, byStatus }
    }
    store.commit('setBridgeDamageSources', available)
    store.commit('setData', { bridgeDamageBySource: summary })
    return CACHE
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('bridge-damage')) return
    map.addSource('bridge-damage', { type: 'geojson', data: turf.featureCollection([]) })

    map.addLayer({
      id: 'bridge-damage',
      type: 'circle',
      source: 'bridge-damage',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4.5, 11, 9],
        'circle-color': STATUS_MATCH,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.92,
      },
    }, beforeId)

    // NB: adder is invoked as layerConfig.adder(...), so `this` is the layer config,
    // not this module — call the updater by module name.
    floodBridgeDamageLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    if (!map.getLayer('bridge-damage')) return
    const currentTab = store.state.currentTab
    const visible = currentTab === 'disaster' || currentTab === 'disasterReport'

    const sources = store.state.bridgeDamageSources || []
    let key = store.state.bridgeDamageSource
    if (!CACHE[key]) key = sources[0]?.key
    const fc = (key && CACHE[key]) ? CACHE[key] : turf.featureCollection([])
    const src = map.getSource('bridge-damage')
    if (src && key !== lastKey) {
      src.setData(fc)
      lastKey = key
    }

    map.setLayoutProperty('bridge-damage', 'visibility', visible ? 'visible' : 'none')
  },

}
