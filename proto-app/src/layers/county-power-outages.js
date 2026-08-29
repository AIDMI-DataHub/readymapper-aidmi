import dayjs from 'dayjs'
import { sortBy } from 'es-toolkit/array'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings.js'

export const countyPowerOutagesLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/power-outages/county-power-outages.csv`
    let powerOutages = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, [])

    powerOutages.forEach(row => {
      // IMPROVE: should be done in data processing
      // Zero pad CountyFIPS to 5 digits if necessary.
      row['CountyFIPS'] = row['CountyFIPS'].length == 4 ? "0" + row['CountyFIPS'] : row['CountyFIPS']
      row['CustomersTracked'] = parseInt(row['CustomersTracked'])
      row['CustomersOut'] = parseInt(row['CustomersOut'])
      row['CustomersOutPercent'] = row['CustomersOut']/row['CustomersTracked']
      // Add date property (handle data field typo)
      if (powerOutages[0]['RecordDateTime'] != null) {
        row['RecordedDateTime'] = row['RecordDateTime']
      }
      row.date = dayjs(row['RecordedDateTime']).tz(settings.timezonePowerOutages).toDate()
    })

    // Sort by date
    powerOutages = sortBy(powerOutages, row => row.date)

    return powerOutages
  },

  async addLayer(map, powerOutages, store, beforeId) {
    const sourceId = 'counties-centroids';
    if (!map.getSource(sourceId)) return;
    if (map.getLayer('counties-power-outages')) return;
    map.addLayer({
      'id': 'counties-power-outages',
      'type': 'symbol',
      'source': sourceId,
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': 1,
        'icon-anchor': 'bottom'
      },
      'paint': {
        'icon-opacity': 0
      }
    }, beforeId)

    await helpers.loadMapboxImage(map, new URL('../assets/img/power-outage.png', import.meta.url).href, 'power-outage')
    map.setLayoutProperty('counties-power-outages', 'icon-image', 'power-outage')

  },

  updateLayer(map, store) {
    if (!map.getLayer('counties-power-outages')) return;
    const currentTab = store.state.currentTab;
    const regionTypeSelection = store.state.regionTypeSelection;
    const selectedDateString = store.getters.selectedDateString;

    // Always update the expression so it's correct whenever the layer becomes visible
    map.setPaintProperty('counties-power-outages', 'icon-opacity', [
      "case",
      ['>=', ['coalesce', ['get', `percent_without_power_${selectedDateString}`], 0], 0.15], 1,
      0
    ]);

    if (currentTab === 'infrastructure' && regionTypeSelection === 'counties') {
      map.setLayoutProperty('counties-power-outages', 'visibility', 'visible');
    } else {
      map.setLayoutProperty('counties-power-outages', 'visibility', 'none');
    }
  },

}
