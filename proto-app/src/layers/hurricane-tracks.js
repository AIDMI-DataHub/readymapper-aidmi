import { groupBy } from 'es-toolkit/array';
import * as d3 from 'd3'
import dayjs from 'dayjs'
import * as turf from '@turf/turf'

import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const hurricaneTracksLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/noaa/hurricane-tracks.geojson`
    let forecastHurricaneTracks = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // IMPROVE: should be done in data processing
    const parseADVDATE = (dateString) => {
      // This is possibly the most frustrating date format I have ever encountered
      let [hhmm, A, tz, __, MMM, DD, YYYY] = dateString.split(' ')
      if (hhmm.length === 3) hhmm = '0' + hhmm
      let utcOffsets = {
        'AST': 4,
        'EDT': 4,
        'EST': 5,
        'CDT': 5,
        'CST': 6,
        'MDT': 6,
        'MST': 7,
        'PDT': 7,
        'PST': 8
      }
      let date = dayjs(`${hhmm} ${A} ${MMM} ${DD} ${YYYY}`, 'hhmm A MMM DD YYYY').toDate()

      // Time zone calculation. Blergh.
      let localUTCOffset = date.getTimezoneOffset() / 60
      let targetUTCOffset = utcOffsets[tz]
      date.setUTCHours(date.getUTCHours() - localUTCOffset + targetUTCOffset)

      return date
    }

    forecastHurricaneTracks.features.forEach(f => {
      f.properties.advisoryDate = parseADVDATE(f.properties['ADVDATE'])
      f.properties.maxWindMph = settings.knotToMph(f.properties['MAXWIND'])
    })

    forecastHurricaneTracks.features = d3.sort(forecastHurricaneTracks.features, f => f.properties.advisoryDate.toISOString())

    // Grab the first hurricane position from every forecast -- these are the actual recorded hurricane locations
    let tracksByForecast = groupBy(forecastHurricaneTracks.features, f => f.properties['ADVISNUM'])
    let historicHurricanePositions = turf.featureCollection(
      Object.values(tracksByForecast).map(positions => positions[0])
    )
    historicHurricanePositions.features = d3.sort(historicHurricanePositions.features, f => f.properties.advisoryDate.toISOString())

    historicHurricanePositions.features.forEach(f => {
      f.properties.maxWindMph = settings.knotToMph(f.properties['MAXWIND'])
    })

    return { forecastHurricaneTracks, historicHurricanePositions }
  },

  postProcess(data, store) {
    const { forecastHurricaneTracks, historicHurricanePositions } = data;
    store.commit('setData', { forecastHurricaneTracks, historicHurricanePositions });
  },

}
