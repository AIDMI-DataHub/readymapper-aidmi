import * as d3 from 'd3'
import * as turf from '@turf/turf'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'
import dayjs from 'dayjs'

export const floodInundationsLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/gauges/inundation_forecasts.json`
    let floodInundations = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    let count = 0
    for (let datePublished in floodInundations) {
      count += floodInundations[datePublished]?.features?.length || 0
      for (let f of floodInundations[datePublished].features) {
        let forecastStart = dayjs(f.properties.time_range.start).format('YYYY-MM-DD')
        let type = forecastStart === datePublished ? 'actual' : 'forecasted'
        f.properties.forecastType = type
      }
    }
    // published so the legend can hide the inundation block when there's nothing to show
    store.commit('setData', { floodInundationCount: count })

    return floodInundations
  },

  async addLayer(map, floodInundations, store, beforeId) {
    if (!floodInundations) return

    const floodInundationSourceId = `flood-inundation-data`

    map.addSource(floodInundationSourceId, {
      'type': 'geojson',
      'data': turf.featureCollection([])
    })

    map.addLayer({
      'id': `inundation-low-actual`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {
      },
      'filter': [
        'all',
        ['==', 'level', 'LOW'],
        ['==', 'forecastType', 'actual']
      ]
    }, beforeId)

    map.addLayer({
      'id': `inundation-low-forecasted`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {
      },
      'filter': [
        'all',
        ['==', 'level', 'LOW'],
        ['==', 'forecastType', 'forecasted']
      ]
    })

    map.addLayer({
      'id': `inundation-medium-actual`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {
      },
      'filter': [
        'all',
        ['==', 'level', 'MEDIUM'],
        ['==', 'forecastType', 'actual']
      ]
    })

    map.addLayer({
      'id': `inundation-medium-forecasted`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {
      },
      'filter': [
        'all',
        ['==', 'level', 'MEDIUM'],
        ['==', 'forecastType', 'forecasted']
      ]
    })

    map.addLayer({
      'id': `inundation-high-actual`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {
      },
      'filter': [
        'all',
        ['==', 'level', 'HIGH'],
        ['==', 'forecastType', 'actual']
      ]
    })

    map.addLayer({
      'id': `inundation-high-forecasted`,
      'type': 'fill',
      'source': floodInundationSourceId,
      'paint': {

      },
      'filter': [
        'all',
        ['==', 'level', 'HIGH'],
        ['==', 'forecastType', 'forecasted']
      ]
    })

    await Promise.all([
      helpers.loadMapboxImage(map, new URL('../assets/img/forecasted-moderate.png', import.meta.url).href, 'forecasted-LOW'),
      helpers.loadMapboxImage(map, new URL('../assets/img/forecasted-high.png', import.meta.url).href, 'forecasted-MEDIUM'),
      helpers.loadMapboxImage(map, new URL('../assets/img/forecasted-veryhigh.png', import.meta.url).href, 'forecasted-HIGH'),
      helpers.loadMapboxImage(map, new URL('../assets/img/actual-moderate.png', import.meta.url).href, 'actual-LOW'),
      helpers.loadMapboxImage(map, new URL('../assets/img/actual-high.png', import.meta.url).href, 'actual-MEDIUM'),
      helpers.loadMapboxImage(map, new URL('../assets/img/actual-veryhigh.png', import.meta.url).href, 'actual-HIGH')
    ])

    map.setPaintProperty(`inundation-low-actual`, 'fill-pattern', 'actual-LOW')
    map.setPaintProperty(`inundation-low-forecasted`, 'fill-pattern', 'forecasted-LOW')
    map.setPaintProperty(`inundation-medium-actual`, 'fill-pattern', 'actual-MEDIUM')
    map.setPaintProperty(`inundation-medium-forecasted`, 'fill-pattern', 'forecasted-MEDIUM')
    map.setPaintProperty(`inundation-high-actual`, 'fill-pattern', 'actual-HIGH')
    map.setPaintProperty(`inundation-high-forecasted`, 'fill-pattern', 'forecasted-HIGH')
  },

  updateLayer(map, store) {
    const floodInundations = store.state.floodInundations;
    const selectedDateTime = store.state.selectedDateTime;
    const sourceId = 'flood-inundation-data';

    if (!map.getLayer('inundation-low-actual')) return;

    const selectedDate = dayjs(selectedDateTime).format('YYYY-MM-DD');
    const selectedInundationLayers = floodInundations[selectedDate];

    if (!selectedInundationLayers) {
      map.getSource(sourceId).setData(turf.featureCollection([]));
      return;
    }

    map.getSource(sourceId).setData(selectedInundationLayers);
  },
}
