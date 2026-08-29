import * as d3 from 'd3'
import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { groupBy } from 'es-toolkit/array'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

export const mapboxActivityLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/mapbox-activity/data-normalized.csv`
    let allMapboxData = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    const mapboxDataByDate = groupBy(allMapboxData, (d) => d.agg_day_period)
    const mapboxActivityDates = Object.keys(mapboxDataByDate).sort((a, b) => d3.ascending(a, b))
    return { mapboxActivity: mapboxDataByDate, mapboxActivityDates: mapboxActivityDates }
  },

  postProcess(data, store) {
    const { mapboxActivity, mapboxActivityDates } = data;
    store.commit('setData', { mapboxActivity, mapboxActivityDates });
  },

  addLayer(map, data, store, beforeId) {
    const { mapboxActivity, mapboxActivityDates } = data;
    const colorScale = store.getters.mapboxPopDensityColorScale;
    for (const [date, data] of Object.entries(mapboxActivity)) {
      const mapboxData = turf.featureCollection(
          data
            .map(row => {
              try {
                return turf.point([parseFloat(row.xlon), parseFloat(row.xlat)], row)
              } catch (e) {
                return null
              }
            })
            .filter(point => !!point)
        )

        const id = `mapbox-activity-${date}`

        map.addSource(id, {
          'type': 'geojson',
          'data': mapboxData
        })

        map.addLayer({
          'id': id,
          'type': 'circle',
          'source': id,
          'paint': {
            'circle-color':
            [
              "case",
              [
                "!=",
                ["to-number", ["get", "percent_change"]],
                0
              ],
              [
                "step",
                ["to-number", ["get", "percent_change"]],
                ...colorScale
              ],
              "#adadad",  // set empty tiles to a light gray color
            ],
            'circle-radius': [
              "interpolate",
              ["linear"],
              ["zoom"],

              8, 1,
              9, 2,
              10, 2,
              11, 3,
              13, 4
            ],
            'circle-opacity': 0
          }
        }, beforeId)
    }

  },

  updateLayer(map, store) {
    const mobilityMode = store.state.mobilityMode;
    const currentTab = store.state.currentTab;
    const selectedDateTime = store.state.selectedDateTime;
    const mapboxActivityDates = store.getters.mapboxActivityDates;

    for (const date of mapboxActivityDates) {
      const layerId = `mapbox-activity-${date}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'circle-opacity', 0);
      }
    }

    if (mobilityMode === 'facebook' || !mapboxActivityDates?.length) return;

    const nearestIndex = d3.bisector(dateString => dayjs(dateString, 'YYYY-MM-DD').toDate())
      .center(mapboxActivityDates, selectedDateTime);
    const nearestDate = mapboxActivityDates[nearestIndex];
    const layerId = `mapbox-activity-${nearestDate}`;

    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'circle-opacity', currentTab === 'people' ? 1 : 0);
    }
  },
}
