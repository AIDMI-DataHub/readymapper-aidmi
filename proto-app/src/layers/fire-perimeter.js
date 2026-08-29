import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { sortBy } from 'es-toolkit/array'
import { helpers } from '../helpers'

export const firePerimeterLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/spatial-data/disaster-perimeters/perimeters.geojson`

    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // Parse perimeter dates
    data.features.forEach(f => {
      f.date = dayjs(String(f.properties['YYYYMMDD']), 'YYYYMMDD').toDate()
    })

    // Sort by date
    data.features = sortBy(data.features, f => f.date)

    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/fire.png', import.meta.url).href, 'fire')

    return data
  },

  addLayer(map, data, store, beforeId) {
    map.addSource('fire-perimeter', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'fire-perimeter-previous-fill',
      'type': 'fill',
      'source': 'fire-perimeter',
      'paint': {
        'fill-pattern': 'fire',
        'fill-opacity': 0
      }
    }, beforeId)

    map.addLayer({
      'id': 'fire-perimeter-previous-outline',
      'type': 'line',
      'source': 'fire-perimeter',
      'paint': {
        'line-color': '#EA3323',
        'line-opacity': 0,
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.5,
          8, 1,
          10, 2
        ]
      }
    }, beforeId)
  },

  updateLayer(map, store) {
    const data = store.state.firePerimeter;
    const date = store.state.selectedDateTime;
    if (!(map && data && date)) return null

    // // get nearest layer in time
    // const nearestLayerIndex = d3.bisector(f => f.date)
    //   .left(this.firePerimeter.features, this.selectedDateTime)
    // let currentFirePerimeterFeature = this.firePerimeter.features[nearestLayerIndex]
    // let currentDisasterDate = currentFirePerimeterFeature.properties['YYYYMMDD']

    // get fire perimeter for current day
    const currentDisasterDate = dayjs(date).format("YYYYMMDD")
    const fireDates = [...new Set(data.features.map(f => f.properties?.['YYYYMMDD']))]
    const firstFireDate = fireDates?.[0]

    // check if nearest date is not in the future, we don't want to
    // display fire perimeters in the future
    if (dayjs(currentDisasterDate).diff(date, 'day') > 0) {
      map.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity', 0)
      map.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity', 0)
      return
    }

    const filter = [
      "==",
      ["get", "YYYYMMDD"],
      currentDisasterDate
    ]
    map.setFilter('fire-perimeter-previous-fill', filter)
    map.setFilter('fire-perimeter-previous-outline', filter)

    if (currentDisasterDate !== firstFireDate) {
      map.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity',  [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        1,
        10,
        0.25
      ])
      map.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity',  [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        0.9,
        10,
        0.15
      ])
    } else if (currentDisasterDate === firstFireDate) {
      map.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity', [
        "match", ['get', 'YYYYMMDD'], currentDisasterDate, 1, 0
      ])
      map.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity', [
        "match", ['get', 'YYYYMMDD'], currentDisasterDate, 0.05, 0])
    }
  },

}
