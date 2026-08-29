import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings.js'

export const smokePerimeterLayer = {
	
  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/noaa/smoke-perimeters.geojson`
    let data = await helpers.fetchJsonAndBumpProgress(path, loadLabel, store, turf.featureCollection([]))

    // Filter features by heavy smoke density
    data.features = data.features.filter(f => f.properties['Density'] === 'Heavy');

    await helpers.loadMapboxImage(store.state.map, new URL('../assets/img/smoke.png', import.meta.url).href, 'smoke')

    return data
  },
  
  addLayer(map, data, store, beforeId) {
    map.addSource('smoke-perimeter', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'smoke-fill',
      'type': 'fill',
      'source': 'smoke-perimeter',
      'paint': {
        'fill-pattern': 'smoke',
        'fill-opacity': 1
      }
    }, beforeId)
  },

  updateLayer(map, store) {
    const data = store.state.smokePerimeter;
    const selectedDateTime = store.state.selectedDateTime;
    if (!map || !data) return;
    if (!map.getLayer('smoke-fill')) return;

    const currentDisasterDateTime = dayjs.utc(selectedDateTime).format(settings.timeFormatStandard);
    const smokeDateTimes = Array.from(new Set(data.features.map(f => f.properties?.['Date']))).sort().reverse();
    const nearestSmokeDate = smokeDateTimes.find(date => date <= currentDisasterDateTime);

    if (!nearestSmokeDate) {
      console.log('No smoke date found that is less than or equal to currentDisasterDateTime');
      return;
    }

    const filter = ["==", ["get", "Date"], nearestSmokeDate];
    map.setFilter('smoke-fill', filter);

    map.setPaintProperty('smoke-fill', 'fill-opacity', [
      "match", ['get', 'Date'], nearestSmokeDate, 1, 0
    ]);
  },
}
