import dayjs from 'dayjs'
import { sortBy } from 'es-toolkit/array';
import { helpers } from '../helpers'
import { settings } from '../../constants/settings.js'

export const cityPowerOutagesLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/power-outages/city-power-outages.csv`
    let powerOutages = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

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

  // addLayer(map, powerOutages) {
  //   map.addLayer({
  //     'id': 'acs-places-power-outages',
  //     'type': 'fill',
  //     'source': 'acs-places',
  //     'paint': {
  //       'fill-opacity': 1,
  //       'fill-pattern': 'power-outage'
  //     }
  //   })

  //   map.addLayer({
  //     'id': 'counties-power-outages',
  //     'type': 'fill',
  //     'source': 'ca-counties',
  //     'paint': {
  //       'fill-opacity': 1,
  //       'fill-pattern': 'power-outage'
  //     }
  //   })

  async addLayer(map, powerOutages, store, beforeId) {
    const sourceId = 'acs-places-centroids';
    if (!map.getSource(sourceId)) return;
    map.addLayer({
      'id': 'acs-places-power-outages',
      'type': 'symbol',
      'source': sourceId,
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': 0.75,
        'icon-anchor': 'bottom'
      },
      'paint': {
        'icon-opacity': 0
      }
    }, beforeId)

    await helpers.loadMapboxImage(map, new URL('../assets/img/power-outage.png', import.meta.url).href, 'power-outage')
    map.setLayoutProperty('acs-places-power-outages', 'icon-image', 'power-outage')

  },

  updateLayer(map, store) {
    if (!map.getLayer('acs-places-power-outages')) return;
    const currentTab = store.state.currentTab;
    const regionTypeSelection = store.state.regionTypeSelection;
    const selectedDateString = store.getters.selectedDateString;

    // Always update the expression so it's correct whenever the layer becomes visible
    map.setPaintProperty('acs-places-power-outages', 'icon-opacity', [
      "case",
      ['>=', ['coalesce', ['get', `percent_without_power_${selectedDateString}`], 0], 0.15], 1,
      0
    ]);

    if (currentTab === 'infrastructure' && regionTypeSelection === 'places') {
      map.setLayoutProperty('acs-places-power-outages', 'visibility', 'visible');
    } else {
      map.setLayoutProperty('acs-places-power-outages', 'visibility', 'none');
    }
  },

}
