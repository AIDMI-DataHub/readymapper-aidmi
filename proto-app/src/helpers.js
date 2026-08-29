import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import fetchProgress from 'fetch-progress'
import { csvParse } from 'd3-dsv'
import { settings } from '../constants/settings'
import { throttle } from 'es-toolkit/function'
import { deserialize } from "flatgeobuf/lib/mjs/geojson.js"

export const helpers = {

  fetchAndBumpProgress: async (fetcher, path, loadLabel, store, defaultValue) => {
    let data = defaultValue
    try {
      data = await fetcher(path, (p) => {
        store.commit('bumpLoadProgress', { loadLabel, percentage: p?.percentage })
      })
      store.commit('bumpLoadProgress', { loadLabel, complete: true })
    } catch (e) {
      store.commit('bumpLoadProgress', { loadLabel, complete: true, error: true, message: 'Not found' })
      console.warn(`Couldn't find ${loadLabel}. Ignoring.`)
    }

    return data
  },

  fetchFgbAndBumpProgress: async (path, loadLabel, store, defaultValue) => {
    const disasterConfig = store.state.disasterConfig
    const disasterFgbBbox = store.getters.disasterFgbBbox
    try {
      let features = []

      let bumpLoadBar = throttle(() => store.commit('bumpLoadProgress', { loadLabel }), 200)

      // get flatgeobuf clipped by the disaster's bounding box
      for await (let feature of deserialize(path, disasterFgbBbox)) {
        features.push(feature)
        bumpLoadBar()
      }

      // Filter out all features that fall outside of the disaster
      // country polygon
      if (!disasterConfig.swLat) {
        features = features.filter(f => store.getters.geometryInDisasterCountry(f))
      }

      store.commit('bumpLoadProgress', { loadLabel, complete: true })

      return turf.featureCollection(features)
    } catch (e) {
      console.error(`error loading ${loadLabel}: ${e}`)
      return defaultValue
    }
  },

  fetchCsvAndBumpProgress: async (path, loadLabel, store, defaultValue) => {
    return helpers.fetchAndBumpProgress(helpers.fetchCsv, path, loadLabel, store, defaultValue)
  },

  fetchJsonAndBumpProgress: async (path, loadLabel, store, defaultValue) => {
    return helpers.fetchAndBumpProgress(helpers.fetchJson, path, loadLabel, store, defaultValue)
  },

  fetchJson: async (path, onProgress) => {
    return helpers.fetch(path, onProgress).then(res => res.json())
  },

  fetchCsv: async (path, onProgress) => {
    let textData = await helpers.fetch(path, onProgress).then(res => res.text())
    return csvParse(textData)
  },

  fetch: async (path, onProgress) => {
    // FIXME: this could be removed once we start setting a proper way to invalidate the cache after data is updated on the backend
    // clear cache
    const hash = crypto.randomUUID()
    let result = await fetch(`${path}?hash=${hash}`, {cache: "no-cache"})
      .then(fetchProgress({ onProgress, onError: (e) => console.error(e) }))
    if (result.ok) return result
    else throw new Error('Failed to fetch')
  },

  popDensityFilenameToDate: (popDensityFilename) => {
    return dayjs(popDensityFilename, settings.timeFormatFBMobility).toDate()
  },

  loadMapboxImage: (map, path, name, opts={}) => {
    return new Promise((resolve, reject) => {
      map.loadImage(path, (error, image) => {
        if (error) {
          console.error(error)
        } else {
          if (!map.hasImage(name)) map.addImage(name, image, opts)
        }
        resolve()
      })
    })
  },

  showLayers: (map, layerIds) => {
    layerIds.forEach(layerId => {
      if (!map?.getLayer(layerId)) return;
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    });
  },

  hideLayers: (map, layerIds) => {
    layerIds.forEach(layerId => {
      if (!map?.getLayer(layerId)) return;
      map.setLayoutProperty(layerId, 'visibility', 'none');
    });
  },
}
