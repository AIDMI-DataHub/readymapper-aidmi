import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const heatwaveUnicefLayer = {
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/heatwave_unicef/heatwave_above_40.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/fire.png', import.meta.url).href, 'fire')

    return data
  },

  async addLayer(map, heatwaveUnicef) {
    map.addSource('heatwave-unicef', {
      'type': 'geojson',
      data: heatwaveUnicef,
    })

    map.addLayer({
      'id': 'heatwave-unicef',
      'type': 'fill',
      'source': 'heatwave-unicef',
      'paint': {
        'fill-pattern': 'fire',
        // 'fill-color': 'rgb(233, 105, 63)',
        'fill-opacity': 0.5,
        'fill-outline-color': 'transparent',
      }
    });
  },

  async loadAdmin2Data(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/heatwave_unicef/adm2_mean_heatwave_length.csv`
    let data = (await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, []))
      .map(row => ({
        ...row,
        mean_heatwave_length: +row.mean_heatwave_length,
      }))
    return data
  },

  async loadAdmin3Data(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/heatwave_unicef/adm3_mean_heatwave_length.csv`
    let data = (await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, []))
      .map(row => ({
        ...row,
        mean_heatwave_length: +row.mean_heatwave_length,
      }))
    return data
  },
}
