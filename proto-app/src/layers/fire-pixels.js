import * as turf from '@turf/turf'
import { helpers } from '../helpers'

// NASA FIRMS active-fire detections (VIIRS/MODIS), produced by
// data_backend/download_fire_pixel_data.py. Module + store getters
// (firePixelsLayerFill / firePixelsLayerFilter) were written in 2022 but never
// registered in the current layer registry (README: FIRMS data "not yet used in the app").
//
// Rendering: the detections are ~375m squares — true-size at high zoom (the original
// look), but ~0.05px at country-overview zoom, i.e. invisible. So we draw TWO layers off
// the same source, both using the original recency fill/filter getters:
//   - fire-pixels        (fill)   : the true-size squares, seen when zoomed in
//   - fire-pixels-dots   (circle) : a min-size dot per detection so the fire footprint is
//                                   visible at overview zoom; fades out by ~zoom 10 where
//                                   the squares become visible on their own.
export const firePixelsLayer = {

  async loadData(store, loadLabel) {
    // Copernicus-perimeter disasters (identified by EMSR activation codes in
    // wfigsIncidentName, eg France/Spain) show fire perimeters instead of FIRMS
    // pixels, so skip loading pixels for them. US/Canada fires keep their pixels.
    const wfigs = store.state.disasterConfig?.wfigsIncidentName
    if (wfigs && wfigs.includes('EMSR')) {
      return turf.featureCollection([])
    }

    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/spatial-data/fire/disaster-pixels/data.geojson`

    const data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // Do not display coarse MODIS detections (original behaviour)
    const features = (data.features || []).filter(f => f.properties?.instrument !== 'MODIS')
    return turf.featureCollection(features)
  },

  addLayer(map, data, store, beforeId) {
    map.addSource('fire-pixels', {
      'type': 'geojson',
      'data': data,
    })

    // true-size squares (visible when zoomed in), solid fill, NIFC red palette
    map.addLayer({
      'id': 'fire-pixels',
      'type': 'fill',
      'source': 'fire-pixels',
      'paint': {
        'fill-color': store.getters.firePixelsLayerFill,
        'fill-opacity': 1,
        'fill-antialias': false,
      },
      'layout': {
        'fill-sort-key': ['get', 'date_time_unix'],
      },
      'filter': store.getters.firePixelsLayerFilter,
    }, beforeId)

    // min-size dots so the fire is visible at country-overview zoom; fade out where
    // the squares become large enough to read on their own.
    map.addLayer({
      'id': 'fire-pixels-dots',
      'type': 'circle',
      'source': 'fire-pixels',
      'paint': {
        'circle-color': store.getters.firePixelsLayerFill,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.6, 6, 2.4, 8, 3.4, 10, 4],
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.9, 11, 0],
        'circle-stroke-width': 0,
      },
      'filter': store.getters.firePixelsLayerFilter,
    }, beforeId)
  },

  updateLayer(map, store) {
    if (!map) return
    const fill = store.getters.firePixelsLayerFill
    const filter = store.getters.firePixelsLayerFilter
    if (map.getLayer('fire-pixels')) {
      map.setPaintProperty('fire-pixels', 'fill-color', fill)
      map.setFilter('fire-pixels', filter)
    }
    if (map.getLayer('fire-pixels-dots')) {
      map.setPaintProperty('fire-pixels-dots', 'circle-color', fill)
      map.setFilter('fire-pixels-dots', filter)
    }
  },

}
