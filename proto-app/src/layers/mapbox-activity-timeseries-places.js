import { helpers } from '../helpers'

export const mapboxActivityTimeseriesPlacesLayer = {
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/mapbox-activity/place-timeseries.csv`
    const data = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, null)
    return data
  }
};
