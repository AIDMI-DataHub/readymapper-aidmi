import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneConeLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/noaa/hurricane-cones.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))
    return data
  }

}
