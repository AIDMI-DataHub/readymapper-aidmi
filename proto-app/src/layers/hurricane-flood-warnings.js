import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneFloodWarningsLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/noaa/hurricane-flood-warnings.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))
    return data
  },

}
