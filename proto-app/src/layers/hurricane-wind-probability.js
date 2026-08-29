import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { sortBy } from 'es-toolkit/array'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings.js'

export const hurricaneWindProbabilityLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/noaa/wind-probabilities.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // Parse perimeter dates
    data.features.forEach(f => {
      f.date = dayjs(f.properties['dt'], settings.timeFormatStandard).toDate()
    })

    // Sort by date
    data.features = sortBy(data.features, f => f.date)

    return data
  },

}
