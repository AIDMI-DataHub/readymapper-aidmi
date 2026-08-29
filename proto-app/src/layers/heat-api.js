import * as d3 from 'd3'
import { helpers } from '../helpers'

export const heatApiLayer = {
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/heat_api/metrics.csv`
    const rows = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/heat-minor.png', import.meta.url).href, 'heat-minor')
    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/heat-major.png', import.meta.url).href, 'heat-major')
    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/heat-danger.png', import.meta.url).href, 'heat-danger')
    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/heat-extreme.png', import.meta.url).href, 'heat-extreme')

    if (!rows.length) return []
    return rows.map(r => ({ ...r, daytime_hi_max: +r.daytime_hi_max }))
  },

  addLayer(map, heatApiData, store, beforeId) {
    if (!map.getSource('acs-places')) return
    if (map.getLayer('acs-places-heat-hatch')) return

    map.addLayer({
      'id': 'acs-places-heat-hatch',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 3,
      'layout': { 'visibility': 'none' },
      'paint': {
        'fill-pattern': 'heat-extreme',
        'fill-opacity': 0.7,
      },
    }, beforeId)

    heatApiLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    if (!map.getLayer('acs-places-heat-hatch')) return

    const disasterType = store.getters.disasterType
    const regionTypeSelection = store.state.regionTypeSelection

    const visible = disasterType === 'heat' && regionTypeSelection === 'places'
    map.setLayoutProperty('acs-places-heat-hatch', 'visibility', visible ? 'visible' : 'none')

    if (visible) {
      const selectedDateTime = store.state.selectedDateTime
      const dateStr = selectedDateTime ? d3.timeFormat('%Y-%m-%d')(selectedDateTime) : null
      const heatApiProp = dateStr ? `heat_api_hi_${dateStr}` : null
      if (heatApiProp) {
        const val = ['to-number', ['get', heatApiProp], 0]
        map.setFilter('acs-places-heat-hatch', ['has', heatApiProp])
        map.setPaintProperty('acs-places-heat-hatch', 'fill-pattern', [
          'step', val,
          'heat-minor',
          103, 'heat-major',
          110, 'heat-danger',
          120, 'heat-extreme',
        ])
      }
    }
  },
}
