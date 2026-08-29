import * as turf from '@turf/turf'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const riversLayer = {

  async loadData(store, loadLabel) {
    // const disasterBaseUrlData = store.getters.disasterBaseUrlData

    // let waterLinesPath = `${disasterBaseUrlData}/water-lines.fgb`
    // let waterPolygonsPath = `${disasterBaseUrlData}/water-polygons.fgb`
    const baseUrlData = settings.baseUrlData
    let waterLinesPath = `${baseUrlData}/global_osm/rivers/water-lines.fgb`
    let waterPolygonsPath = `${baseUrlData}/global_osm/rivers/water-polygons.fgb`
    let [waterLines, waterPolygons] = await Promise.all([
      helpers.fetchFgbAndBumpProgress(waterLinesPath, loadLabel, store, turf.featureCollection([])),
      helpers.fetchFgbAndBumpProgress(waterPolygonsPath, loadLabel, store, turf.featureCollection([]))
    ])

    return { waterLines, waterPolygons }
  },

  addLayer(map, { waterLines, waterPolygons }, store, beforeId) {
    // console.log("RIVERS")
    // console.log(waterLines)
    // console.log(waterPolygons)

    map.addSource('rivers-polygons', {
      'type': 'geojson',
      'data': waterPolygons
    })

    map.addLayer({
      'id': `rivers-polygons`,
      'type': 'fill',
      'source': 'rivers-polygons',
      'paint': {
        'fill-color': '#78d2ee',
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.4,
          8, 1
        ],
      },
    }, beforeId)

    map.addSource('rivers-lines', {
      'type': 'geojson',
      'data': waterLines
    })

    map.addLayer({
      'id': `rivers-lines`,
      'type': 'line',
      'source': 'rivers-lines',
      'paint': {
        'line-color': '#78d2ee',
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.4,
          8, 1
        ],
      },
    }, beforeId)
  }

}
