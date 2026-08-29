import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneWindRadiiLayer = {

  async loadData(store, loadLabel) {
    let disasterBaseUrlData = store.getters.disasterBaseUrlData
    const data = await helpers.fetchJsonAndBumpProgress(
      `${disasterBaseUrlData}/noaa/hurricane-wind-radii.geojson`,
      loadLabel,
      store,
      turf.featureCollection([])
    )
    return data
  },
}
