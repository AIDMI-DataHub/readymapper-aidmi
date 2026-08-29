import { helpers } from '../helpers'
import dayjs from 'dayjs'
import { settings } from '../../constants/settings'

export const fbPopDensityTimeseriesPlacesLayer = {
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/facebook/population-density/tile/place-estimated-timeseries.csv`
    let data = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, null)

    if (data) {
      // 
      // Migrate old column names
      // 
      if (!('rm_id' in data[0])) {
        data.forEach(row => {
          row['rm_id'] = row['GEOID']
          row['rm_name'] = row['NAME']
          delete row['GEOID']
          delete row['NAME']
        })
      }

      // 
      // Convert from PST to UTC
      // 
      data.forEach(row => {
        let utc = dayjs.tz(row['dt'], settings.timeFormatFBMobility, "US/Pacific").tz("UTC").format(settings.timeFormatFBMobility)
        row['dt'] = utc
      })
    }

    return data
  }
};
