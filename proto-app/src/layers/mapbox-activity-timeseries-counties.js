import { helpers } from '../helpers'

export const mapboxActivityTimeseriesCountiesLayer = {
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/mapbox-activity/county-timeseries.csv`
    const data = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])
    return data
  }
};
