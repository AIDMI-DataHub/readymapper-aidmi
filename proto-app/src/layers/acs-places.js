import * as d3 from 'd3'
import { groupBy, uniq } from 'es-toolkit/array'
import { throttle } from 'es-toolkit/function'
import { helpers } from '../helpers'
import * as turf from '@turf/turf'
import { deserialize } from "flatgeobuf/lib/mjs/geojson.js"
// import Logger, { LogLevel } from "flatgeobuf/lib/mjs/Logger.js"

// set flatgeobuf logLevel to warnings
// Logger.logLevel = LogLevel.Warn

import { settings } from '../../constants/settings'
import { addAcsDataToFeature } from './utils/acsData'
import iso2to3 from '../../constants/iso2to3.json'

const addHeatwaveAdm3Data = (acsPlaces, heatwaveAdm3) => {
  if (!acsPlaces?.features || !heatwaveAdm3?.length) return acsPlaces
  const byRmId = Object.fromEntries(heatwaveAdm3.map(row => [row.rm_id, row]))
  return {
    ...acsPlaces,
    features: acsPlaces.features.map(f => {
      const match = byRmId[f.properties.rm_id]
      if (!match) return f
      return { ...f, properties: { ...f.properties, ...match } }
    })
  }
}

const addPowerOutageData = (acsPlaces, counties, powerOutagesTimeseries, datetimes) => {
  if (!acsPlaces?.features || !counties?.features || !powerOutagesTimeseries?.length) return acsPlaces
  let updatedData = { ...acsPlaces };

  // IMPROVE: should be done in data processing
  // Validate that all the city names in the power outage data match exactly one city name in the places data
  uniq(powerOutagesTimeseries.map(row => row['CityName']))
    .forEach(cityName => {
      let matchingPlace = updatedData.features.filter(f => f.properties['rm_name'] === cityName)
      if (matchingPlace.length === 0) {
        console.warn(`No matching place for ${cityName}`)
      } else if (matchingPlace.length > 1) {
        console.warn(`${matchingPlace.length} matching cities for ${cityName}`)
      }
    })

  // IMPROVE: should be done in data processing
  // Assign a county to each ACS Place. Strangely, Places are not officially in the County hierarchy,
  // so we calculate this manually. I'm guessing this is because ACS Places do not *always* strictly belong to
  // a single County, but they almost always do as far as I can tell.
  updatedData.features = updatedData.features.map(place => {
    // Already has the county assigned
    if (place.properties['COUNTYFP']) {
      return place
    }

    let placeCentroid = turf.centroid(place.geometry)
    for (let county of counties.features) {
      let intersection
      try {
        intersection = turf.booleanPointInPolygon(placeCentroid, county.geometry)
      } catch (e) {
        console.error(e);
      }
      if (intersection) {
        return {
          ...place,
          properties: {
            ...place.properties,
            COUNTYFP: county.properties['COUNTYFP'],
          },
        }
      }
    }

    return place
  })

  // IMPROVE: should be done in data processing
  // For each datetime, sample data from the power outages time series and write to ACS places
  let outagesByFIPS_City = groupBy(powerOutagesTimeseries, row => `${row['CountyFIPS']}_${row['CityName']}`)
  datetimes.forEach(datetime => {
    let date = helpers.popDensityFilenameToDate(datetime)
    updatedData.features.forEach(f => {
      let placeName = f.properties['rm_name']
      let countyFips = f.properties['COUNTYFP']
      let stateFips = f.properties['STATEFP']
      let outages = outagesByFIPS_City[`${stateFips}${countyFips}_${placeName}`]
      if (!outages) {
        // No outage data for this city
        return
      }
      let outagesTimeDomain = d3.extent(outages.map(o => o.date))

      if (date < outagesTimeDomain[0] || date > outagesTimeDomain[1]) {
        // No data for this place on this date
        return
      }

      let nearestSampleIndexBeforeDate = d3.bisector(d => d.date).right(outages, date) - 1
      const { CustomersOut, CustomersTracked } = outages[nearestSampleIndexBeforeDate]
      const percentWithoutPower = CustomersOut / f.properties.totalHouseholds
      f.properties[`percent_without_power_${datetime}`] = percentWithoutPower
      f.properties[`customers_without_power_${datetime}`] = CustomersOut
    })
  })

  return updatedData;
};

const addHeatApiData = (acsPlaces, heatApiData) => {
  if (!acsPlaces?.features || !heatApiData?.length) return acsPlaces
  // Build lookup: rm_id → { date → daytime_hi_max }
  const byRmId = {}
  heatApiData.forEach(row => {
    if (!byRmId[row.name]) byRmId[row.name] = {}
    byRmId[row.name][row.date] = row.daytime_hi_max
  })
  return {
    ...acsPlaces,
    features: acsPlaces.features.map(f => {
      const dateValues = byRmId[f.properties.rm_id]
      if (!dateValues) return f
      const dateProps = Object.fromEntries(
        Object.entries(dateValues).map(([date, val]) => [`heat_api_hi_${date}`, val])
      )
      return { ...f, properties: { ...f.properties, ...dateProps } }
    })
  }
}

const addSupplementalData = (acsPlaces, store) => {
  let updated = addPowerOutageData(acsPlaces, store.state.counties, store.state.cityPowerOutagesTimeseries, store.getters.disasterDatesScaleString)
  updated = addHeatwaveAdm3Data(updated, store.state.heatwaveUnicefAdm3)
  updated = addHeatApiData(updated, store.state.heatApiData)
  return updated
}

export const acsPlacesLayer = {

  async loadData(store, loadLabel) {
    let disasterConfig = store.state.disasterConfig
    let disasterFgbBbox = store.getters.disasterFgbBbox
    try {
      let acsPlaces = {
        type: 'FeatureCollection',
        features: []
      }

      let bumpLoadBar = throttle(() => store.commit('bumpLoadProgress', { loadLabel }), 200)

      // get flatgeobuf clipped by the disaster's bounding box
      let fgbUrl
      if (disasterConfig?.isInternational) {
        if (store.getters.adminBoundaryLevelType === 'cod-1-and-2') {
          fgbUrl = `${settings.baseUrlData}/COD/adm2_polygons.fgb`
        } else {
          // default is adm2 for the larger boundary and adm3 for the smaller
          fgbUrl = `${settings.baseUrlData}/COD/adm3_polygons.fgb`
        }
      } else {
        let vintage = store.state.disasterConfig.censusVintage
        fgbUrl = `${settings.baseUrlData}/census/${vintage}/all/acs-places.fgb`
      }

      const iter = deserialize(fgbUrl, disasterFgbBbox)
      for await (let feature of iter) {
        addAcsDataToFeature(feature, disasterConfig?.isInternational)

        feature.properties.centroid = turf.centroid(feature).geometry
        feature.properties.selectionType = 'place'

        if (disasterConfig?.isInternational) {
          feature.properties.NAME = `${feature.properties.NAME}, ${feature.properties.COUNTRY}`
        }

        acsPlaces.features.push(feature)
        
        bumpLoadBar()
      }

      // Filter out all features that fall outside of the disaster
      // country polygon
      if (!disasterConfig.swLat) {
        acsPlaces.features = acsPlaces.features.filter(f => {
          return store.getters.disasterIsoCodes.includes(f.properties.iso_2)
        })
      }

      store.commit('bumpLoadProgress', { loadLabel, complete: true })

      return acsPlaces
    } catch (e) {
      console.error(`error loading acs places data: ${e}`);
      return turf.featureCollection([])
    }
  },

  postProcess(data, store) {
    let updated = addSupplementalData(data, store)
    store.commit('setData', { acsPlaces: updated });

    const polygonSource = store.state.map.getSource('acs-places');
    if (polygonSource) polygonSource.setData(updated);

    const centroidSource = store.state.map.getSource('acs-places-centroids');
    if (centroidSource) centroidSource.setData(
      turf.featureCollection(
        updated.features.map(f => turf.centroid(f, { properties: f.properties }))
      )
    );
  },

  addLayer(map, acsPlaces, store, beforeId) {
    const vulnerabilityColorScaleMap = store.getters.vulnerabilityColorScaleMap;
    const data = store.state.acsPlaces;

    const acsPlacesUpdated = addSupplementalData(data, store)

    map.addSource('acs-places', {
      'type': 'geojson',
      'data': acsPlacesUpdated,
      'promoteId': 'rm_id'
    })

    let acsPlacesCentroids = turf.featureCollection(
      acsPlacesUpdated.features.map(f => turf.centroid(f, { properties: f.properties }))
    )

    map.addSource('acs-places-centroids', {
      'type': 'geojson',
      'data': acsPlacesCentroids
    })

    // Data-driven fill, for vulnerability tab
    map.addLayer({
      'id': 'acs-places-fill',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 3,
      'paint': {
        'fill-color': vulnerabilityColorScaleMap(data),
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

    // Thin stroke, makes ACS places visible in every tab
    map.addLayer({
      'id': 'acs-places-click-target',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 3,
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0)'
      }
    })

    map.addLayer({
      'id': 'acs-places-stroke',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.5,
          8, 2
        ],
        'line-blur': 1,
        'line-color': '#747474',
        'line-opacity': 0.7,
      }
    }, beforeId)

    // Dark fill when selected
    map.addLayer({
      'id': 'acs-places-selected',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0.1)'
      },
      'filter': ['in', 'GEOID', '']
    }, beforeId)

    // Thick stroke when selected
    map.addLayer({
      'id': 'acs-places-stroke-selected',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 1.25,
          8, 3
        ],
        'line-color': "#0075FF",
        "line-opacity": 0.7,
      },
      'filter': ['in', 'GEOID', '']
    }, beforeId)

    // Thicker stroke when focused
    map.addLayer({
      'id': 'acs-places-stroke-focused',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 2,
          8, 5
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'GEOID', '']
    }, beforeId)

    map.addLayer({
      'id': 'acs-places-hovered',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'paint': {
        'line-width': 3,
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          "#0060D0",
          "#878787",
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          0.7,
          0
        ]
      },
    })
  },

  updateLayer(map, store) {
    const regionTypeSelection = store.state.regionTypeSelection;
    const currentTab = store.state.currentTab;
    const disasterType = store.getters.disasterType;
    const acsPlaces = store.state.acsPlaces;
    const vulnerabilityColorScaleMap = store.getters.vulnerabilityColorScaleMap;

    const strokeLayerIds = [
      'acs-places-stroke', 'acs-places-stroke-selected',
      'acs-places-stroke-focused', 'acs-places-hovered',
    ];

    if (regionTypeSelection === 'places') {
      helpers.showLayers(map, strokeLayerIds);
    } else {
      helpers.hideLayers(map, strokeLayerIds);
    }

    if (map.getLayer('acs-places-fill')) {
      const visible = (
        (
          currentTab === 'people' ||
          currentTab === 'vulnerabilityReport' ||
          (currentTab === 'disaster' && disasterType === 'heat')
        ) && regionTypeSelection === 'places'
      );
      map.setLayoutProperty('acs-places-fill', 'visibility', visible ? 'visible' : 'none');
      if (visible && vulnerabilityColorScaleMap && acsPlaces) {
        map.setPaintProperty('acs-places-fill', 'fill-color', vulnerabilityColorScaleMap(acsPlaces));
      }
      else if (visible && (currentTab === 'disaster' && disasterType === 'heat') && acsPlaces) {
        // Use heat API data for the selected date when available, fall back to UNICEF heatwave length
        const selectedDateTime = store.state.selectedDateTime
        const dateStr = selectedDateTime ? d3.timeFormat('%Y-%m-%d')(selectedDateTime) : null
        const heatApiProp = dateStr ? `heat_api_hi_${dateStr}` : null
        const heatApiValues = heatApiProp
          ? acsPlaces.features.map(f => f.properties[heatApiProp]).filter(v => v != null && !isNaN(v))
          : []
        const colorProp = heatApiValues.length ? heatApiProp : 'mean_heatwave_length'
        const values = heatApiValues.length
          ? heatApiValues
          : acsPlaces.features.map(f => f.properties.mean_heatwave_length).filter(v => !isNaN(v))
        if (values.length) {
          const colors = ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#d95f0e', '#993404']
          const breaks = Array.from(
            new Set(d3.scaleQuantile().domain(values).range(colors).quantiles())
          )
          const colorBreaks = [colors[0], ...breaks.flatMap((b, i) => [b, colors[i + 1]])]
          map.setPaintProperty('acs-places-fill', 'fill-color', [
            'step',
            ['to-number', ['get', colorProp], 0],
            ...colorBreaks
          ])
        } else {
          map.setPaintProperty('acs-places-fill', 'fill-color', vulnerabilityColorScaleMap(acsPlaces))
        }
      }
    }
  },

}
