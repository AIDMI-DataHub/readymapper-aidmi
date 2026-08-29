import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// Observed flood / mudflow extent for the 2026 Nepal GLOF, offered from multiple
// analyst sources via a source dropdown (mirrors the building-damage pattern):
//   - HOT/HDX     : corridor-wide observed inundation ribbon (27 Aug)
//   - Copernicus EMSR927 : validated extent over the 2 rapid-mapping AOIs
//   - UNOSAT #1052: mudflow/rockflow extent, Rasuwa + Nuwakot
// All render as the SAME translucent blue fill + outline (one source at a time) so
// the legend colour is consistent and the sources are directly comparable; the
// per-source observed date + coverage note are shown as small print in the legend.
// Only Nepal ships these files; other flood events 404 -> empty, so the layer no-ops.
const FLOOD_FILL = '#2b6fb0'

const SOURCES = [
  { key: 'hot',     file: 'flood-extent.geojson' },
  { key: 'emsr927', file: 'flood-extent-emsr927.geojson' },
  { key: 'unosat',  file: 'flood-extent-unosat.geojson' },
]

// module-scoped cache { [key]: FeatureCollection }, repopulated each loadData so
// stale data can't leak across disaster switches.
let CACHE = {}
let lastKey = null

export const floodExtentLayer = {

  async loadData(store, loadLabel) {
    CACHE = {}
    lastKey = null
    const base = `${store.getters.disasterBaseUrlData}/flood-impact`
    const meta = await helpers.fetchJsonAndBumpProgress(`${base}/impact-sources.json`, loadLabel, store, {})
    const updatedFor = meta?.['flood-extent'] || {}
    const available = []
    for (const s of SOURCES) {
      const fc = await helpers.fetchJsonAndBumpProgress(`${base}/${s.file}`, loadLabel, store, turf.featureCollection([]))
      if (!fc?.features?.length) continue
      CACHE[s.key] = fc
      const m = updatedFor[s.key] || {}
      // area for the small-print label: prefer a stamped area_km2, else compute
      let area = null
      for (const f of fc.features) if (f.properties?.area_km2) area = f.properties.area_km2
      if (area == null) {
        try { area = Math.round(turf.area(fc) / 1e6 * 10) / 10 } catch { area = null }
      }
      available.push({ key: s.key, label: m.label || s.key, updated: m.updated || null, note: m.note || null, area })
    }
    store.commit('setFloodExtentSources', available)
    // expose the (small) extent polygons so the report can spatially query
    // infrastructure that falls inside the selected flood perimeter
    store.commit('setData', { floodExtentData: { ...CACHE } })
    // UNOSAT population-exposure table (optional file) for the report
    const exposure = await helpers.fetchJsonAndBumpProgress(`${base}/population-exposure.json`, loadLabel, store, null)
    if (exposure?.rows?.length) store.commit('setData', { floodExposure: exposure })
    return CACHE
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('flood-extent')) return
    map.addSource('flood-extent', { type: 'geojson', data: turf.featureCollection([]) })

    map.addLayer({
      id: 'flood-extent-fill',
      type: 'fill',
      source: 'flood-extent',
      layout: { visibility: 'none' },
      paint: { 'fill-color': FLOOD_FILL, 'fill-opacity': 0.35 },
    }, beforeId)

    map.addLayer({
      id: 'flood-extent-outline',
      type: 'line',
      source: 'flood-extent',
      layout: { visibility: 'none' },
      paint: { 'line-color': FLOOD_FILL, 'line-width': 1.2, 'line-opacity': 0.9 },
    }, beforeId)

    // NB: adder is invoked as layerConfig.adder(...), so `this` is the layer config,
    // not this module — call the updater by module name.
    floodExtentLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    if (!map.getLayer('flood-extent-fill')) return
    const currentTab = store.state.currentTab
    const v = (currentTab === 'disaster' || currentTab === 'disasterReport') ? 'visible' : 'none'

    const sources = store.state.floodExtentSources || []
    let key = store.state.floodExtentSource
    if (!CACHE[key]) key = sources[0]?.key
    const fc = (key && CACHE[key]) ? CACHE[key] : turf.featureCollection([])
    const src = map.getSource('flood-extent')
    if (src && key !== lastKey) {
      src.setData(fc)
      lastKey = key
    }

    map.setLayoutProperty('flood-extent-fill', 'visibility', v)
    map.setLayoutProperty('flood-extent-outline', 'visibility', v)
  },

}
