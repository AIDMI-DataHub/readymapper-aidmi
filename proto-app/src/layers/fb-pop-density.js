import * as d3 from 'd3'
import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'
import { zip } from 'es-toolkit/array'

export const fbPopDensityLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/facebook/population-density/tile/data-pivot.csv`
    let allFBData = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, null)
    let fbPopDensityDatesUTC = null

    if (allFBData) {
      // 
      // convert fbPopDensityDates from PST to UTC
      // 
      
      let fbPopDensityDatesPST = Object.keys(allFBData[0]).filter(d => !['lat', 'lon'].includes(d)) ?? []
      fbPopDensityDatesUTC = fbPopDensityDatesPST.map(
        dateString => dayjs.tz(dateString, settings.timeFormatFBMobility, "US/Pacific").tz("UTC").format(settings.timeFormatFBMobility)
      )
      let dateMap = zip(fbPopDensityDatesPST, fbPopDensityDatesUTC)
      allFBData.forEach(row => {
        for (const [pst, utc] of dateMap) {
          row[utc] = row[pst]
          delete row[pst]
        }
      })
    }
    
    return { fbPopDensityData: allFBData, fbPopDensityDates: fbPopDensityDatesUTC }
  },

  postProcess(data, store) {
    const { fbPopDensityData, fbPopDensityDates } = data;
    store.commit('setData', { fbPopDensityData, fbPopDensityDates });
  },

  addLayer(map, data, store, beforeId) {
    const { fbPopDensityData, fbPopDensityDates } = data;
    const colorScale = store.getters.facebookPopDensityColorScale;
    if (!fbPopDensityData.length || !fbPopDensityDates.length) return

    // Facebook Population Density Data
    const fbData = turf.featureCollection(
        fbPopDensityData
          .map(row => {
            try {
              return turf.point([parseFloat(row.lon), parseFloat(row.lat)], row)
            } catch (e) {
              return null
            }
          })
          .filter(point => !!point)
      )

      const id = `fb-pop-density`

      map.addSource(id, {
        'type': 'geojson',
        'data': fbData
      })

      const valueCol = fbPopDensityDates?.[0]

      map.addLayer({
        'id': id,
        'type': 'circle',
        'source': id,
        'minzoom': 5,
        'paint': {
          'circle-color': [
            "step",
            ["to-number", ["get", valueCol]],
            ...colorScale
          ],
          'circle-radius': [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.4,
              8, 2,
              9, 3.5,
              10, 6,
              11, 6,
              13, 26
            ],
          'circle-opacity': [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.7,
              8, 1
            ]
          },
        'layout': {
            "visibility": "none"
          }
      }, beforeId)

  },

  updateLayer(map, store) {
    const mobilityMode = store.state.mobilityMode;
    const currentTab = store.state.currentTab;
    const selectedDateTime = store.state.selectedDateTime;
    const fbPopDensityDates = store.getters.fbPopDensityDates;
    const facebookPopDensityColorScale = store.getters.facebookPopDensityColorScale;
    const layerId = 'fb-pop-density';

    if (!map.getLayer(layerId)) return;

    if (mobilityMode !== 'facebook') {
      map.setLayoutProperty(layerId, 'visibility', 'none');
      return;
    }

    let visible = currentTab === 'people' || currentTab === 'movementReport';
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');

    if (!fbPopDensityDates?.length) return;

    const nearestDate = store.getters.closestPopDensityDate(selectedDateTime)
    const hoursSince = Math.abs(dayjs.utc(selectedDateTime).diff(dayjs.utc(nearestDate, settings.timeFormatFBMobility), 'hours'));

    if (hoursSince < 8) {
      map.setPaintProperty(layerId, 'circle-color', [
        "step",
        ["to-number", ["get", nearestDate]],
        ...facebookPopDensityColorScale
      ]);
    } else {
      map.setPaintProperty(layerId, 'circle-color', 'transparent');
    }
  },
}
