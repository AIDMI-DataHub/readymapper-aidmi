import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const dmeLayer = {

  async loadData(store, loadLabel) {
    const path = `${settings.baseUrlData}/dme/dme_all_states_202209.csv`
    let dmeUsers = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])
    return dmeUsers
  },
}
