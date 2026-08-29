import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const fbMobilityLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/facebook/mobility/tile/data.csv`
    let tileMobilityData = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])
    
    // Facebook Mobility Data

    //
    // TILE
    //

    // String -> Number
    tileMobilityData.forEach(row => {
      row['percent_change'] = parseFloat(row['percent_change'])
      row['n_crisis'] = parseFloat(row['n_crisis'])
      row['n_baseline'] = parseFloat(row['n_baseline'])
    })

    let tileMobilityDataFeatures = tileMobilityData
      .filter(row => parseFloat(row['length_km']) > 5)
      .map(row => {
        try {
          return turf.lineString([[parseFloat(row.start_lon), parseFloat(row.start_lat)], [parseFloat(row.end_lon), parseFloat(row.end_lat)]], row)
        } catch (e) {
          return null
        }
      })
      .filter(feature => !!feature)

    const tileFBFlows = turf.featureCollection(tileMobilityDataFeatures)

    //
    // ADMIN
    //

    // The historical mobility data does not appear to use county admin boundaries. Maybe zip codes?
    const adminMobilityPath = `${disasterBaseUrlData}/facebook/mobility/admin/data.csv`
    let adminMobilityData = await helpers.fetchCsvAndBumpProgress(adminMobilityPath, 'Facebook mobility admin', store, [])

    const adminMobilityDataFeatures = adminMobilityData
      .map(row => {
        try {
          return turf.lineString([[parseFloat(row.start_lon), parseFloat(row.start_lat)], [parseFloat(row.end_lon), parseFloat(row.end_lat)]], row)
        } catch (e) {
          return null
        }
      })
      .filter(feature => !!feature)

    const adminFBFlows = turf.featureCollection(adminMobilityDataFeatures)

    return { tileFBFlows, adminFBFlows }
  },

  postProcess(data, store) {
    const { tileFBFlows, adminFBFlows } = data;
    store.commit('setData', { tileFBFlows, adminFBFlows });
  },
}
