import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { sortBy } from 'es-toolkit/array';
import { helpers } from '../helpers'

import { settings } from '../../constants/settings'

// layer containing the difference between two consecutive days of fire,
// so we can render the new burnt area as a fill
export const firePerimeterDifferenceLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/spatial-data/disaster-perimeters/perimeters-difference.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // Parse perimeter dates
    data.features.forEach(f => {
      f.date = dayjs(f.properties['YYYYMMDD'], 'YYYYMMDD').toDate()
    })

    // Sort by date
    data.features = sortBy(data.features, f => f.date)

    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/fire-diff.png', import.meta.url).href, 'fire-diff')

    return data
  },

  addLayer(map, data, store, beforeId) {
    map.addSource('fire-perimeter-difference', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'fire-perimeter-difference',
      'type': 'fill',
      'source': 'fire-perimeter-difference',
      'paint': {
        'fill-pattern': 'fire-diff',
      }
    }, beforeId)
  },

  updateLayer(map, store) {
    const data = store.state.firePerimeter;
    const date = store.state.selectedDateTime;
    if (!(map && data && date)) return null
    if (!map.getLayer('fire-perimeter-difference')) return

    const currentDisasterDate = dayjs(date).format("YYYYMMDD")

    if (dayjs(currentDisasterDate).diff(date, 'day') > 0) {
      map.setPaintProperty('fire-perimeter-difference', 'fill-opacity', 0)
      return
    }

    const filter = [
      "==",
      ["get", "YYYYMMDD"],
      currentDisasterDate
    ]

    map.setFilter('fire-perimeter-difference', filter)

    map.setPaintProperty('fire-perimeter-difference', 'fill-opacity', [
      "match", ['get', 'YYYYMMDD'], currentDisasterDate, 1, 0
    ])
  }

}
