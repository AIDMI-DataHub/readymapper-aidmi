import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";

import * as d3 from 'd3'
import * as turf from '@turf/turf'
import { groupBy } from 'es-toolkit/array'
import { throttle } from 'es-toolkit/function'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'
import { addAcsDataToFeature } from './utils/acsData'
import iso2to3 from '../../constants/iso2to3.json'

const preparePowerOutageData = (counties, powerOutagesTimeseries, disasterDatetimes) => {
  if (!counties?.features || !powerOutagesTimeseries) return counties
  const updated = { ...counties };

  // IMPROVE: should be done in data processing
  // For each datetime, sample data from the power outages time series and write to counties
  let outagesByFIPS = groupBy(powerOutagesTimeseries, row => `${row['CountyFIPS']}`)
  disasterDatetimes.forEach(datetime => {
    let date = helpers.popDensityFilenameToDate(datetime)
    updated.features = updated.features.map(f => {
      let geoID = f.properties['GEOID']
      let outages = outagesByFIPS[geoID]
      if (!outages) {
        // No outage data for this county
        return f
      }

      let percentWithoutPower = 0
      let outagesTimeDomain = d3.extent(outages.map(o => o.date))

      if (date < outagesTimeDomain[0] || date > outagesTimeDomain[1]) {
        // No data for this place on this date
        return f
      }

      let nearestSampleIndexBeforeDate = d3.bisector(d => d.date).right(outages, date) - 1
      let { CustomersOut, CustomersTracked } = outages[nearestSampleIndexBeforeDate]
      return {
        ...f,
        properties: {
          ...f.properties,
          [`percent_without_power_${datetime}`]: CustomersOut / f.properties.totalHouseholds,
          [`customers_without_power_${datetime}`]: CustomersOut,
        },
      }
    })
  })
  return updated;
};

export const countiesLayer = {

  async loadData(store, loadLabel) {
    let disasterConfig = store.state.disasterConfig
    let disasterFgbBbox = store.getters.disasterFgbBbox
    try {
      let countyData = {
        type: 'FeatureCollection',
        features: []
      }

      let bumpLoadBar = throttle(() => store.commit('bumpLoadProgress', { loadLabel }), 200)

      // get flatgeobuf clipped by the disaster's bounding box
      let fgbUrl
      if (disasterConfig?.isInternational) {
        if (store.getters.adminBoundaryLevelType === 'cod-1-and-2') {
          fgbUrl = `${settings.baseUrlData}/COD/adm1_polygons.fgb`
        } else {
          // default is adm2 for the larger boundary and adm3 for the smaller
          fgbUrl = `${settings.baseUrlData}/COD/adm2_polygons.fgb`
        }
      } else {
        let vintage = store.state.disasterConfig.censusVintage
        fgbUrl = `${settings.baseUrlData}/census/${vintage}/all/acs-counties.fgb`
      }
      
      const iter = deserialize(fgbUrl, disasterFgbBbox)
      for await (let feature of iter) {
        addAcsDataToFeature(feature, disasterConfig?.isInternational)

        feature.properties.selectionType = 'county'

        if (disasterConfig?.isInternational) {
          feature.properties.NAME = `${feature.properties.NAME}, ${feature.properties.COUNTRY}`
        }

        countyData.features.push(feature)
        bumpLoadBar()
      }

      if (!disasterConfig.swLat) {
        countyData.features = countyData.features.filter(f => {
          return store.getters.disasterIsoCodes.includes(f.properties.iso_2)
        })
      }

      store.commit('bumpLoadProgress', { loadLabel, complete: true })

      return countyData
    } catch (e) {
      console.error(`error loading counties data: ${e}`);
      return turf.featureCollection([])
    }
  },

  postProcess(data, store) {
    const updated = preparePowerOutageData(data, store.state.countyPowerOutagesTimeseries, store.getters.disasterDatesScaleString)

    store.commit('setData', { counties: updated });

    const polygonSource = store.state.map.getSource('counties');
    if (polygonSource) polygonSource.setData(updated);

    const centroidSource = store.state.map.getSource('counties-centroids');
    if (centroidSource) centroidSource.setData(
      turf.featureCollection(
        updated.features.map(f => turf.centroid(f, { properties: f.properties }))
      )
    );
  },

  addLayer(map, countyData, store, beforeId) {
    const vulnerabilityColorScaleMap = store.getters.vulnerabilityColorScaleMap;
    
    map.addSource('counties', {
      'type': 'geojson',
      'data': countyData,
      'promoteId': 'rm_id'
    })

    let countyCentroids = turf.featureCollection(
      countyData.features.map(f => turf.centerOfMass(f, { properties: f.properties }))
    )

    map.addSource('counties-centroids', {
      'type': 'geojson',
      'data': countyCentroids
    })

    
    map.addLayer({
      'id': 'counties-fill',
      'type': 'fill',
      'source': 'counties',
      'minzoom': 3,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': vulnerabilityColorScaleMap(countyData),
        'fill-opacity': [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.2,
          9,
          0.4
        ]
      }
    }, beforeId)

    // Interaction layer
    map.addLayer({
      'id': 'counties-click-target',
      'type': 'fill',
      'source': 'counties',
      'minzoom': 3,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0)'
      }
    })

    // Thicker stroke
    map.addLayer({
      'id': 'counties-stroke',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'line-color': '#747474',
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.5,
          8, 2
        ],
        'line-opacity': 0.7,
      }
    }, beforeId)

    map.addLayer({
      'id': 'counties-hovered',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'paint': {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          "#0060D0",
          "#878787",
        ],
        'line-width': 4,
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          1,
          0
        ]
      },
    }, beforeId)

    // Selected layer
    map.addLayer({
      'id': 'counties-selected',
      'type': 'fill',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0.1)',
        'fill-opacity': 0.5
      },
      'filter': ['in', 'rm_id', '']
    }, beforeId)

    // Thick stroke when selected
    map.addLayer({
      'id': 'counties-stroke-selected',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          1,
          12,
          2
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'rm_id', '']
    }, beforeId)

    // Thicker stroke when focused
    map.addLayer({
      'id': 'counties-stroke-focused',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          2,
          12,
          4
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'rm_id', '']
    }, beforeId)
  },

  updateLayer(map, store, layerConfig) {
    const regionTypeSelection = store.state.regionTypeSelection;
    const currentTab = store.state.currentTab;
    const counties = store.state.counties;
    const vulnerabilityColorScaleMap = store.getters.vulnerabilityColorScaleMap;
    
    if (regionTypeSelection === 'counties') {
      helpers.showLayers(map, layerConfig.mapLayerIds);
    } else {
      helpers.hideLayers(map, layerConfig.mapLayerIds);
    }

    if (map.getLayer('counties-fill')) {
      const visible = (
        (currentTab === 'people' || currentTab === 'vulnerabilityReport') &&
        regionTypeSelection === 'counties'
      );
      map.setLayoutProperty('counties-fill', 'visibility', visible ? 'visible' : 'none');
      if (visible && vulnerabilityColorScaleMap && counties) {
        map.setPaintProperty('counties-fill', 'fill-color', vulnerabilityColorScaleMap(counties));
      }
    }
  },
}
