import dayjs from 'dayjs'
import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// Meta network-coverage outage layer. process_network_coverage_data.py turns the
// daily coverage snapshots into ~tile-sized squares marking, for each day, the
// baseline-covered tiles that lost coverage that day. We render the squares for
// the day matching the time slider, styled like the power-outage layer (this is
// the international stand-in for power outages, which are US-only). Gated to the
// Infrastructure tab.
const OUTAGE_BLUE = 'rgb(15, 47, 128)'

export const networkCoverageLayer = {

  async loadData(store, loadLabel) {
    const path = `${store.getters.disasterBaseUrlData}/network-coverage/lost-coverage.geojson`
    return await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))
  },

  addLayer(map, data, store, beforeId) {
    if (map.getSource('network-coverage')) return
    map.addSource('network-coverage', { type: 'geojson', data })

    map.addLayer({
      id: 'network-coverage',
      type: 'fill',
      source: 'network-coverage',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': OUTAGE_BLUE,
        'fill-opacity': 0.55,
        'fill-outline-color': OUTAGE_BLUE,
      },
      // start showing nothing; updateLayer sets the day filter
      filter: ['==', ['get', 'date'], ''],
    }, beforeId)
  },

  updateLayer(map, store) {
    if (!map.getLayer('network-coverage')) return
    const currentTab = store.state.currentTab
    const visible = currentTab === 'infrastructure' || currentTab === 'infrastructureReport'
    map.setLayoutProperty('network-coverage', 'visibility', visible ? 'visible' : 'none')

    // coverage snapshots are daily (dataTimeZone); match the slider's calendar day
    const selectedDay = dayjs.utc(store.state.selectedDateTime).format('YYYY-MM-DD')
    map.setFilter('network-coverage', ['==', ['get', 'date'], selectedDay])
  },

}
