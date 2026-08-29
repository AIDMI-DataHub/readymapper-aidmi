import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// HOT "Nepal Flood 2026" analysis corridor — a 1 km buffer around the
// Bhotekoshi/Trishuli centrelines (the area HOT mapped for the response). Drawn
// as a subtle dashed outline to frame the bridge-damage points on the
// Infrastructure tab. Context reference, not an impact measurement. Only Nepal
// ships this file; other flood events 404 -> empty collection, so it no-ops.
const CORRIDOR_BLUE = '#0f6e8c'

export const floodAoiCorridorLayer = {

  async loadData(store, loadLabel) {
    const path = `${store.getters.disasterBaseUrlData}/flood-impact/aoi-corridor.geojson`
    return await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('flood-aoi-corridor')) return
    map.addSource('flood-aoi-corridor', { type: 'geojson', data })

    map.addLayer({
      id: 'flood-aoi-corridor',
      type: 'line',
      source: 'flood-aoi-corridor',
      layout: { visibility: 'none', 'line-join': 'round' },
      paint: {
        'line-color': CORRIDOR_BLUE,
        'line-width': 1.6,
        'line-dasharray': [3, 2],
        'line-opacity': 0.85,
      },
    }, beforeId)
  },

  updateLayer(map, store) {
    if (!map.getLayer('flood-aoi-corridor')) return
    const currentTab = store.state.currentTab
    const visible = currentTab === 'disaster' || currentTab === 'disasterReport'
    map.setLayoutProperty('flood-aoi-corridor', 'visibility', visible ? 'visible' : 'none')
  },

}
