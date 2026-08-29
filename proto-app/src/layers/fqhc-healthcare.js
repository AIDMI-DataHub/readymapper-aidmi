import * as turf from '@turf/turf'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const fqhcHealthcareFacilitiesLayer = {

  async loadData(store) {
    const path = `${settings.baseUrlData}/fqhc/data.csv`
    const loadLabel = 'FQHC healthcare'

    let healthcareFacilities = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    healthcareFacilities = turf.featureCollection(
      healthcareFacilities.slice(1).map(row => {
        let point
        try {
          return turf.point([parseFloat(row.lon), parseFloat(row.lat)], row)
        } catch (e) {
          return null
        }
      })
      .filter(point => !!point)
    )

    healthcareFacilities.features.forEach(f => {
      let type = f.properties.general_type
      if (type) {
        f.properties.image = type.replaceAll('/', ' ').replaceAll(/\s+/g, '-') + "-Non-Reporting"
        f.properties.image_sort_key = settings.healthcareFacilityTypes.find(d => d.slug === f.properties.image)?.sort_key
      } else {
        console.warn(`Missing category mapping for FQHC healthcare facility type ${f.properties['type']}. Marking as Unknown.`)
        f.properties.general_type = "Unknown"
        // fallback
        f.properties.image = "Unknown"
        f.properties.image_sort_key = 1000
      }
    })

    return healthcareFacilities
  },

}
