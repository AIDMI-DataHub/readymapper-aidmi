import { createStore } from 'vuex'

import { flatten, uniq, zip } from 'es-toolkit/array'
import * as turf from '@turf/turf'
import { convertArea } from '@turf/helpers'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import dayjs from 'dayjs'
import * as d3 from 'd3'
import scaleCluster from '../../lib/d3-scale-cluster.esm.js'
import { json } from 'd3-fetch'

import { layers } from '../layers/index.ts'
import { settings, useLocalBackend, useLocalContent } from '../../constants/settings'
import { loadMapData, teardownMapData } from '../views/utils/mapData.ts'
import { toTitleCase } from '../components/utils/toTitleCase'
import { layerEnabled, layerById } from '../views/utils/mapData'
import countryMasks from '../../constants/ne_110m_admin_0_countries_minimal.json'
import disastersJSON from '../../constants/disasters.json'
import aboutMD from '../../constants/about.md?raw'
import adminBoundaryNames from'../../constants/adminBoundaryNames'
import iso2to3 from '../../constants/iso2to3.json'

dayjs.extend(utc)
dayjs.extend(timezone)

// IMPROVE: break up the store into several files
export default createStore({
  state: {
    activeLayerIds: [],
    hiddenMapLayerIds: [],
    hiddenInfraTypes: [], // global-infra rm_type values suppressed via the Custom tab
    buildingDamageSources: [], // [{key,label}] populated by the building-damage layer loader
    buildingDamageSource: 'hot-fair', // selected dataset
    buildingDamageMode: 'individual', // 'individual' | 'hexagon'
    floodExtentSources: [], // [{key,label,updated,note}] populated by the flood-extent layer loader
    floodExtentSource: 'hot', // selected flood-extent dataset (HOT / EMSR927 / UNOSAT)
    bridgeDamageSources: [], // [{key,label,updated}] populated by the bridge-damage layer loader
    bridgeDamageSource: 'icimod', // selected bridge dataset (ICIMOD / EMSR927)
    roadDamageSources: [], // [{key,label,updated}] populated by the road-damage layer loader
    roadDamageSource: 'emsr927', // selected road dataset (EMSR927)
    // compact, report-ready summaries committed by the flood-impact loaders so the
    // Report components (which read Vuex, not the layers' module CACHE) can build tables
    buildingDamageSummary: {}, // { [srcKey]: {label,updated,metric,total,classes:{label:count}} }
    roadDamageBySource: {},    // { [srcKey]: {updated, byName:[{name,grades,total}], byGrade:{grade:km}} }
    bridgeDamageBySource: {},  // { [srcKey]: {updated, bridges:[{name,status,location}], byStatus:{status:count}} }
    floodExtentData: {},       // { [srcKey]: FeatureCollection } — small polygons for the infra-in-perimeter query
    floodExposure: null,       // UNOSAT population-exposure table (per district/municipality)
    floodInundationCount: 0,   // # inundation features (0 for this GLOF) — gates the inundation legend
    // News Sources tab (2026 Nepal floods) — see src/layers/news/
    newsTable: 'infrastructure',  // selected fact table (radio); default per spec
    newsFactSummary: {},          // { [table]: {total, byRes:{point,palika,district,province}, top:[]} }
    newsSilenceList: [],          // top NO-DATA palikas (properties only) for the report info-gap list
    newsCoverageCounts: null,     // { reported, mentioned, no_data } across 471 palikas
    newsUnplaced: null,           // audit.json: withheld/unplaced count + reason breakdown
    newsMultiDistrict: null,      // audit.json: multi-district (panel-only) count
    newsNationalCount: null,      // audit.json: national-level facts (never mapped)
    loadProgress: {},
    headerCollapsed: false,
    map: null,
    dataLoaded: false,
    disasters: [],
    disasterId: null,
    disasterConfig: null,
    fbPopDensityDates: [],
    mapboxActivityDates: [],
    mobilityMode: 'facebook', // mapbox
    sateliteBasemap: false,
    selectedDateTime: null,
    dataReportingIntervalHours: null,
    selectedCountyFips: [],
    focusedCountyFips: null,
    selectedPlaceGeoids: [],
    focusedPlaceGeoid: null,
    selectedLocations: [],
    hoveredZip: null,
    selectedRegion: {
      center: [0, 0],
      radius: 0
    },
    currentLocation: null,
    healthcareFacilities: null,
    dmeDataVisible: false,
    tooltipHTML: null,
    tooltipHTMLHurricane: null,
    currentTab: 'disaster', // disaster, people, infrastructure, news, custom, settings, *Report variants
    regionTypeSelection: 'places', // counties, places
    generateReportModalVisible: false,
    aboutModalVisible: false,
    dataSourcesModalVisible: false,
    pickMapViewScreen: false,
    reportVisible: false,
    reportLoading: false,
    reportNotes: {},
    reportMapViews: {},
    reportSections: settings.defaultReportSections,
    flowsDirection: 'off', // from, to, off
    vulnerabilityMetric: settings.vulnerabilityMetrics.find(d => d.default === true),
    isochronesData: {},
    hoveredCountyId: null,
    hoveredPlaceId: null,
    navbarOpen: false,
    setCurrentHurricanePosition: null,
    reportCreatedOn: null,
    aboutData: null,
    disasterMetadata: null,
    selectedGaugeId: null,
    playing: false
  },

  getters: {
    dataLoaded: (state) => {
      return Object.values(state.loadProgress).every(({ complete }) => complete);
    },

    layerEnabled: (state) => (layerId) => {
      if (!state.disasterConfig) {
        return false
      }
      return layerEnabled(state, layerId)
    },

    layerLoadSuccess: (state, getters) => (layerId) => {
      const progress = getters.getLoadProgress(layerById(layerId)?.loadLabel)
      return !!progress?.complete && !progress?.error
    },

    layerLoadError: (state, getters) => (layerId) => {
      const layer = layerById(layerId)
      if (!layer) return null
      const progress = getters.getLoadProgress(layer.loadLabel)
      if (!progress?.error) return null
      return progress.message || 'Failed to load'
    },

    getLoadProgress: (state) => (loadLabel) => {
      return state.loadProgress[loadLabel]
    },

    selectedDisasterShortName: (state) => {
      return state?.disasterConfig?.name
    },

    selectedDisasterName: (state) => {
      const type = state?.disasterConfig?.type
      const name = state?.disasterConfig?.name
      return settings.disasterTypes.find(({ id }) => id === type)?.nameFormatter(name) ?? name;
    },

    disasterRegionTypes: (state, getters) => {
      const usRegionTypes = [
        {
          id: 'places',
          namePlural: 'Places',
          nameSingular: 'Place',
        },
        {
          id: 'counties',
          namePlural: 'Counties',
          nameSingular: 'County',
        },
      ]

      let capitalize = (someString) => String(someString).charAt(0).toUpperCase() + String(someString).slice(1)
      
      if (state.disasterConfig?.isInternational) {
        let iso3 = iso2to3[getters.disasterPrimaryIsoCode]
        let boundaryNames = adminBoundaryNames[iso3]
        
        if (!boundaryNames) return usRegionTypes
        
        // Column indices into adminBoundaryNames.js
        let bigBoundaryLevel = 2
        let smallBoundaryLevel = 3
        if (getters.adminBoundaryLevelType === "cod-1-and-2") {
          bigBoundaryLevel = 1
          smallBoundaryLevel = 2
        }

        // Default boundary names
        let smallBoundaryName = "Smaller Region"
        let largeBoundaryName = "Larger Region"

        if (boundaryNames[smallBoundaryLevel].trim() !== "") {
          smallBoundaryName = capitalize(boundaryNames[smallBoundaryLevel])
        }
        if (boundaryNames[bigBoundaryLevel].trim() !== "") {
          largeBoundaryName = capitalize(boundaryNames[bigBoundaryLevel])
        }
        
        // TODO: clean up adminBoundaryNames and make it have singular and plural versions
        return [
          {
            id: 'places',
            namePlural: smallBoundaryName,
            nameSingular: smallBoundaryName,
          },
          {
            id: 'counties',
            namePlural: largeBoundaryName,
            nameSingular: largeBoundaryName,
          },
        ]
      } else {
        return usRegionTypes
      }
    },

    disasterType: (state) => {
      return state?.disasterConfig?.type
    },

    disasterIsoCodes: (state, getters) => {
      return getters.parseDisasterIsoCodes(state.disasterConfig)
    },

    disasterPrimaryIsoCode: (state, getters) => {
      return getters.getDisasterPrimaryIsoCode(state.disasterConfig)
    },

    getDisasterPrimaryIsoCode: (state, getters) => (disasterConfig) => {
      return getters.parseDisasterIsoCodes(disasterConfig)?.[0]
    },

    parseDisasterIsoCodes: (state) => (disasterConfig) => {
      return disasterConfig?.isoCodes?.split(',').map(s => s.trim())
    },

    disasterIconByType: (state) => (type) => {
      return settings.disasterTypes.find(({ id }) => id === type)?.icon ?? 
        new URL('@/assets/img/wildfire-header-icon.svg', import.meta.url).href;
    },

    wfigsIncidentName: (state) => {
      return state.disasterConfig?.wfigsIncidentName
    },

    disasterCensusVintage: (state) => {
      return state?.disasterConfig?.censusVintage
    },

    disasterBaseUrlData: (state) => {
      if (!state.disasterConfig) return null
      return `${settings.baseUrlData}/disasters/${state.disasterConfig.id}`
    },

    disasterDateStart: (state) => {
      return dayjs.utc(state?.disasterConfig?.dateStart).toDate()
    },

    disasterDateEnd: (state) => {
      return dayjs.utc(state?.disasterConfig?.dateEnd).toDate()
    },

    disasterDisplayTimeZone: (state) => {
      return state?.disasterConfig?.displayTimeZone
    },

    disasterDatesScale: (state, getters) => {
      if(!getters.disasterDateStart || !getters.disasterDateEnd || !state?.disasterConfig?.dataReportingIntervalHours) return null
      // generates a list with the hours between the start and end dates
      // for the disaster scenario

      const dates = [];
      let timeZone = state.disasterConfig.dataTimeZone ? state.disasterConfig.dataTimeZone : 'UTC'
      let currentDate = dayjs.tz(getters.disasterDateStart, timeZone);
      const end = dayjs.tz(getters.disasterDateEnd, timeZone);

      while (currentDate <= end) {
        const currentDay = currentDate.startOf('day');
        dates.push(currentDay.toDate());
        dates.push(currentDay.add(8, 'hours').toDate());
        dates.push(currentDay.add(16, 'hours').toDate());
        currentDate = currentDay.add(1, 'day');
      }

      return dates
    },

    disasterDatesScaleString: (state, getters) => {
      if (!getters.disasterDatesScale) return null
      const dates = getters.disasterDatesScale.map(d => {
        return d3.timeFormat("%Y-%m-%d_%H%M")(d)
      })
      return dates
    },

    disasterLng: (state, getters) => {
      if (state?.disasterConfig?.lng) {
        return state?.disasterConfig?.lng
      } else {
        let bbox = getters.disasterFgbBbox
        return bbox.minX + (bbox.maxX - bbox.minX) / 2
      }
    },

    disasterLat: (state, getters) => {
      if (state?.disasterConfig?.lat) {
        return state?.disasterConfig?.lat
      } else {
        let bbox = getters.disasterFgbBbox
        return bbox.minY + (bbox.maxY - bbox.minY) / 2
      }
    },

    disasterZoom: (state) => {
      return state?.disasterConfig?.zoom || 5
    },

    adminBoundaryLevelType: (state) => {
      return state.disasterConfig?.adminBoundaryLevels
    },

    // Returns the union of the boundary polygons for the countries
    // associated with the current disaster
    disasterCountryMask: (state, getters) => {
      // Some countries (France, Norway, Kosovo, N. Cyprus, Somaliland) are coded
      // ISO_A2 "-99" in the Natural Earth 110m dataset, so .find() returns undefined.
      // Drop misses and null out rather than feeding undefined into turf.union (which throws).
      const found = getters.disasterIsoCodes
        .map(isoCode => countryMasks.features.find(f => f.properties['ISO_A2'] === isoCode))
        .filter(Boolean)
      // If we can't resolve ALL of the disaster's countries (e.g. France is -99),
      // return null so consumers skip country-filtering rather than mask to a subset
      // (which would drop the unresolved country's features entirely).
      if (found.length < getters.disasterIsoCodes.length) return null
      return found.length > 1 ? turf.union(turf.featureCollection(found)) : found[0]
    },

    disasterFgbBbox: (state, getters) => {
      if (state.disasterConfig.swLat !== null) {
        return {
          minX: state.disasterConfig.swLng,
          maxX: state.disasterConfig.neLng,
          minY: state.disasterConfig.swLat,
          maxY: state.disasterConfig.neLat
        }  
      } else {
        let countryMask = getters.disasterCountryMask
        let bbox = turf.bbox(countryMask)
        return {
          minX: bbox[0],
          minY: bbox[1],
          maxX: bbox[2],
          maxY: bbox[3]
        }
      }
    },

    geometryInDisasterCountry: (state, getters) => geometry => {
      const mask = getters.disasterCountryMask
      if (!mask) return true
      return turf.booleanIntersects(geometry, mask)
    },

    pointInDisasterCountry: (state, getters) => pointFeature => {
      const mask = getters.disasterCountryMask
      if (!mask) return true
      return turf.booleanPointInPolygon(pointFeature, mask)
    },

    fbPopDensityDates: (state) => {
      return state?.fbPopDensityDates
    },

    closestPopDensityDate: (state, getters) => (dateTime) => {
      const nearestIndex = d3.bisector(
        dateString => dayjs.utc(dateString, settings.timeFormatFBMobility).toDate()
      ).center(getters.fbPopDensityDates, dateTime);
      return getters.fbPopDensityDates[nearestIndex];
    },

    mapboxActivityDates: (state) => {
      return state.mapboxActivityDates
    },

    selectedDateString: (state, getters) => {
      if (!getters.disasterDatesScaleString || !state.selectedDateTime) return null
      const nearestDateIndex = d3.bisector(dateString => dayjs(dateString, settings.timeFormatFBMobility).toDate())
        .right(getters.disasterDatesScaleString, state.selectedDateTime) - 1
      return getters.disasterDatesScaleString[nearestDateIndex]
    },

    closestHealthcare: state => {
      if (state.selectedRegion.radius === 0) {
        return []
      }

      return state.healthcareFacilities.features
        .filter(feature => {
          let distance = turf.distance(feature.geometry, state.selectedRegion.center)
          return distance < 50
        })
        .slice(0, 10)
    },

    selectedCounties: state => {
      if (!state.counties) return []
      // do it this way to preserve order
      return state.selectedCountyFips.map(f => state.counties.features.find(c => c.properties['rm_id'] === f))
    },

    focusedCounty: state => {
      if (!state.counties) return []
      return state.counties.features.find(c => c.properties['rm_id'] === state.focusedCountyFips)
    },

    selectedPlaces: state => {
      if (!state.acsPlaces || !state.selectedPlaceGeoids?.length) return []
      // do it this way to preserve order
      return state.selectedPlaceGeoids.map(f => state.acsPlaces.features.find(c => c.properties['rm_id'] === f))
    },

    focusedPlace: (state, getters) => {
      if (!getters.selectedPlaces || !state.selectedPlaceGeoids?.length) return []
      const geoid = state.selectedPlaceGeoids.find(f => f === state.focusedPlaceGeoid)
      return getters.selectedPlaces.find(f => f.properties['rm_id'] === geoid)
    },

    getCountyForPlace: state => place => {
      return state.counties.features.find(c => {
        return turf.booleanPointInPolygon(turf.centerOfMass(place), c)
      })
    },

    numDMEUsers: state => feature => {
      if (feature.properties.selectionType === 'county') {
        let dmeUsers = state.dmeUsers.filter(row => feature.properties['rm_id'] === row['fips_code'])
        return d3.sum(dmeUsers.map(row => row['power_dependent_devices_dme']))
      } else {
        // no DME for places
        return "N/A"
      }
    },

    numTotalPop: state => feature => feature.properties['rm_total_population'],

    numVulnerable: state => feature => feature.properties[state.vulnerabilityMetric?.idAbsolute],

    selectedHealthcare: (state, getters) => (selectedPolygons) => {
      let polygons
      if (selectedPolygons) {
        polygons = selectedPolygons
      } else if (state.regionTypeSelection === 'counties') {
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        polygons = getters.selectedPlaces
      } else {
        return []
      }

      // pointsWithinPolygon is extremely slow if the shapes are all vue proxy objects, so we
      // use this dirty hack to convert it all to a real object before passing to pointsWithinPolygon.
      polygons = JSON.parse(JSON.stringify(polygons));

      let facilities = turf.pointsWithinPolygon(
        turf.featureCollection(state.healthcareFacilities?.features),
        turf.featureCollection(polygons)
      )

      if (state.acsPlaces) {
        // tag facilities with place name
        facilities = turf.tag(facilities, state.acsPlaces, 'rm_name', 'place_name')
      }
      if (state.counties) {
        // tag facilities with county name
        facilities = turf.tag(facilities, state.counties, 'rm_name', 'county_name')
        return facilities.features
      }
    },

    selectedGlobalInfra: (state, getters) => (selectedPolygons) => {
      let polygons
      if (selectedPolygons) {
        polygons = selectedPolygons
      } else if (state.regionTypeSelection === 'counties') {
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        polygons = getters.selectedPlaces
      } else {
        return []
      }

      // pointsWithinPolygon is extremely slow if the shapes are all vue proxy objects, so we
      // use this dirty hack to convert it all to a real object before passing to pointsWithinPolygon.
      polygons = JSON.parse(JSON.stringify(polygons));

      let facilities = turf.pointsWithinPolygon(
        turf.featureCollection(state.globalInfra?.features),
        turf.featureCollection(polygons)
      )

      if (state.acsPlaces) {
        // tag facilities with place name
        facilities = turf.tag(facilities, state.acsPlaces, 'rm_name', 'place_name')
      }
      if (state.counties) {
        // tag facilities with county name
        facilities = turf.tag(facilities, state.counties, 'rm_name', 'county_name')
        return facilities.features
      }
    },

    allInfraTypes: (state) => {
      return [
        ...settings.globalInfraTypes,
        ...settings.waterInfraTypes
      ]
    },

    fbFlows: (state, getters) => (polygon, flowsDirection, selectedDateTime = null) => {
      if (state.currentTab !== 'people') {
        return []
      }

      let fbFlows
      if (state.regionTypeSelection === 'counties') {
        fbFlows = state.adminFBFlows?.features ?? []
      } else if (state.regionTypeSelection === 'places') {
        fbFlows = state.tileFBFlows?.features ?? []
      } else {
        return []
      }

      if (flowsDirection === 'off') {
        return []
      }

      if (!polygon) {
        return []
      }

      // filter out flows with NaN percent change
      fbFlows = fbFlows.filter(f => f.properties.percent_change && (f.properties.percent_change > 0 || f.properties.percent_change < 0))

      // // Filter by selected date, unless we're at the end date.
      // // The end date is a shortcut to show all flows.
      // if (selectedDateTime && (selectedDateTime.getTime() !== getters.disasterDateEnd.getTime())) {
      //   fbFlows = fbFlows.filter(f => {
      //     return (dayjs(f.properties['date_time']).toDate().getTime() === selectedDateTime.getTime())
      //   })
      // }

      // Filter by selected date
      if (selectedDateTime) {
        fbFlows = fbFlows.filter(f => {
          return (dayjs(f.properties['date_time']).toDate().getTime() === selectedDateTime.getTime())
        })
      }

      fbFlows.forEach(f => {
        f.originIntersectsPlace = turf.pointsWithinPolygon(
          turf.point(f.geometry.coordinates[0]),
          polygon
        ).features.length > 0

        f.destinationIntersectsPlace = turf.pointsWithinPolygon(
          turf.point(f.geometry.coordinates[1]),
          polygon
        ).features.length > 0
      })

      // filter out flows that start and end in the same place
      fbFlows = fbFlows.filter(f => !(f.originIntersectsPlace && f.destinationIntersectsPlace))

      if (flowsDirection === 'from') {
        fbFlows = fbFlows
          .filter(f => f.originIntersectsPlace)
          .map(f => {
            let start
            if (state.regionTypeSelection === 'places') {
              start = polygon.properties.centroid.coordinates
            } else if (state.regionTypeSelection === 'counties') {
              start = f.geometry.coordinates[0]
            }

            return {
              start: start,
              end: f.geometry.coordinates[1],
              feature: f
            }
          })
      } else if (flowsDirection === 'to') {
        fbFlows = fbFlows
          .filter(f => f.destinationIntersectsPlace)
          .map(f => {
            let end
            if (state.regionTypeSelection === 'places') {
              end = polygon.properties.centroid.coordinates
            } else if (state.regionTypeSelection === 'counties') {
              end = f.geometry.coordinates[1]
            }

            return {
              start: f.geometry.coordinates[0],
              end: end,
              feature: f
            }
          })
      }

      return fbFlows
    },

    selectedFBFlows: (state, getters) => {
      return getters.fbFlows(state.currentLocation, state.flowsDirection, state.selectedDateTime)
    },

    selectedFBPopFlowsTimeseriesTo: (state, getters) => {
      if (!state?.selectedDateTime) return null

      let polygons

      if (state.regionTypeSelection === 'counties') {
        if (!getters.selectedCounties?.length || !state?.adminFBFlows) return null
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        if (!getters.selectedPlaces?.length || !state?.tileFBFlows) return null
        polygons = getters.selectedPlaces
      }

      const selectedData = polygons.map(polygon => {
        // Filter by selected feature
        let flowsThatIntersectPolygon = getters.fbFlows(polygon, 'to')

        const timeseries = {}
        for (const f of flowsThatIntersectPolygon) {
          const date = f.feature.properties['date_time']
          const value = 0  // we pass a dummy zero value here just to fill the movement dot chart in PointChart
          timeseries[date] = value
        }
        return {'polygon_name': polygon.properties.NAME, data: timeseries}
      })

      return selectedData
    },

    selectedFBPopFlowsTimeseriesFrom: (state, getters) => {
      if (!state?.selectedDateTime) return null

      let polygons

      if (state.regionTypeSelection === 'counties') {
        if (!getters.selectedCounties?.length || !state?.adminFBFlows) return null
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        if (!getters.selectedPlaces?.length || !state?.tileFBFlows) return null
        polygons = getters.selectedPlaces
      }

      const selectedData = polygons.map(polygon => {
        // Filter by selected feature
        let flowsThatIntersectPolygon = getters.fbFlows(polygon, 'from')

        const timeseries = {}
        for (const f of flowsThatIntersectPolygon) {
          const date = f.feature.properties['date_time']
          const value = 0  // we pass a dummy zero value here just to fill the movement dot chart in PointChart
          timeseries[date] = value
        }
        return {'polygon_name': polygon.properties.NAME, data: timeseries}
      })

      return selectedData
    },

    timeseriesCounties: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbPopDensityTimeseriesCounties
      } else if (state.mobilityMode === "mapbox") {
        return state.mapboxActivityTimeseriesCounties
      } else {
        return null
      }
    },

    timeseriesPlaces: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbPopDensityTimeseriesPlaces
      } else if (state.mobilityMode === "mapbox") {
        return state.mapboxActivityTimeseriesPlaces
      } else {
        return null
      }
    },

    selectedPopDensityTimeseriesCounties: (state, getters) => {
      const counties = getters.selectedCounties
      if (!counties?.length || !getters?.timeseriesCounties || !state?.selectedDateTime) return null

      const selectedData = counties.map(c => {
        const selected = getters.timeseriesCounties.filter(s => {
          return c.properties['rm_name'] === s['rm_name']
        })
        const timeseries = {}
        for (const f of selected) {
          const date = f['dt']
          const value = {
            'percent_change': Number(f['percent_change']),
            'n_baseline': Number(f['n_baseline']),
          }
          timeseries[date] = value
        }
        return {'polygon_name': c.properties['rm_name'], data: timeseries}
      })

      return selectedData
    },

    selectedPopDensityTimeseriesPlaces: (state, getters) => {
      const places = getters.selectedPlaces
      if (!places?.length || !getters?.timeseriesPlaces || !state?.selectedDateTime) return null

      const selectedData = places.map(c => {
        const selected = getters.timeseriesPlaces.filter(s => {
          return c.properties['rm_id'] === s['rm_id']
        })
        const timeseries = {}
        for (const f of selected) {
          const date = f['dt']
          const value = {
            'percent_change': Number(f['percent_change']),
            'n_baseline': Number(f['n_baseline']),
          }
          timeseries[date] = value
        }
        return {'polygon_name': c.properties['rm_name'], data: timeseries}
      })

      return selectedData
    },

    selectedPowerOutagesTimeseriesRegions: (state, getters) => (regions, regionType) => {
      // pass it an array of regions plus a region type and it will
      // return timeseries for these regions power outages
      if (!regions?.length || !state?.selectedDateTime || !regionType) return null

      const powerTimeseries = regionType === 'counties' ? state.countyPowerOutagesTimeseries : state.cityPowerOutagesTimeseries

      if (!powerTimeseries) return null

      const selectedData = regions.map(c => {
        const regionTimeseries = powerTimeseries.filter(row => {
          if (regionType === 'counties') {
            return c.properties.GEOID === row['CountyFIPS']
          } else {
            return c.properties.NAME.includes(row['CityName']) && c.properties.COUNTYFP.includes(row['CountyFIPS'].slice(row['CountyFIPS'].length - 3))
          }
        })
        const timeseries = {}
        for (const row of regionTimeseries) {
          const date = row['RecordedDateTime']
          // const value = Number(row['CustomersOut'] / row['CustomersTracked'])
          const value = Number(row?.['CustomersOut'] / c.properties.totalHouseholds)
          timeseries[date] = value
        }
        return {'polygon_name': c.properties.NAME, data: timeseries, max: d3.max(Object.values(timeseries))}
      })

      return selectedData
    },

    currentFirePerimeter: (state, getters) => {
      if (!state?.firePerimeter || !state?.selectedDateTime) return null

      // find the perimeter date nearest the selected time
      const currentLayerIndex = d3.bisector(f => f.date).center(state.firePerimeter.features, state.selectedDateTime)
      const nearest = state.firePerimeter.features[currentLayerIndex]
      if (!nearest) return null

      // multi-fire events (several EMSR activations in one bounding box) have one
      // perimeter feature per fire per date; merge the current date's fires into a
      // single feature so the headline acres + place overlaps cover every fire.
      const currentDate = nearest.properties['YYYYMMDD']
      const sameDate = state.firePerimeter.features.filter(f => f.properties['YYYYMMDD'] === currentDate)
      if (sameDate.length <= 1) return nearest

      const totalAcres = sameDate.reduce((sum, f) => sum + (Number(f.properties['acres']) || 0), 0)
      try {
        const merged = turf.union(turf.featureCollection(sameDate))
        merged.properties = {
          YYYYMMDD: currentDate,
          poly_IncidentName: getters.wfigsIncidentName,
          acres: totalAcres,
        }
        return merged
      } catch (e) {
        console.warn('could not merge multi-fire perimeters', e)
        return nearest
      }
    },

    currentSmokePerimeter: state => {
      if (!state?.smokePerimeter || !state?.selectedDateTime) return null

      const currentLayerIndex = d3.bisector(f => f.date).center(state.smokePerimeter.features, state.selectedDateTime)
      return state.smokePerimeter.features[currentLayerIndex]
    },

    acresBurnedTimeseries: (state, getters) => {
      if (!state?.firePerimeter) return null

      // wfigsIncidentName may name multiple fires (comma separated EMSR codes).
      // Keep only the named fires; if several fires exist and none are named it's
      // ambiguous, so bail (original behaviour).
      const names = (getters.wfigsIncidentName || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      const possibleNames = [...new Set(state.firePerimeter.features.map(f => f.properties?.['poly_IncidentName']))]
      if (possibleNames.length > 1 && names.length === 0) {
        console.warn("There are multiple fires in this bounding box, but no specified wfigsIncidentName");
        return {}
      }
      const matches = f => names.length === 0
        || names.includes((f.properties?.['poly_IncidentName'] || '').toLowerCase())

      // sum acres across all named fires for each date
      const timeseries = {}
      for (const f of state.firePerimeter.features) {
        if (!matches(f)) { continue }
        const date = f.properties['YYYYMMDD']
        const value = Number(f.properties['acres'])
        if (!value) { continue }
        timeseries[date] = (timeseries[date] || 0) + value
      }
      return timeseries
    },

    hurricaneWindSpeedTimeseries: (state) => {
      if (!state?.historicHurricanePositions?.features) return null

      const timeseries = {}
      for (const f of state.historicHurricanePositions.features) {
        const date = dayjs(f.properties['advisoryDate'])?.format("YYYYMMDD HH:mm")
        const value = f.properties["maxWindMph"]
        if (!value) { continue }
        timeseries[date] = Number(value)
      }
      return timeseries
    },

    acresBurnedByPlaceTimeseries: (state, getters) => (place, type = 'acres') => {
      // type can be 'acres' or 'percentage'
      if (!state?.firePerimeter) return null
      // keep only the named fires (comma separated EMSR codes) so a place's overlap
      // isn't overwritten by an unrelated fire on the same date; sum across fires.
      const names = (getters.wfigsIncidentName || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      const matches = f => names.length === 0
        || names.includes((f.properties?.['poly_IncidentName'] || '').toLowerCase())
      const timeseries = {}
      for (const f of state.firePerimeter.features) {
        if (!matches(f)) { continue }
        const date = f.properties['YYYYMMDD']
        const values = getters.getPlaceOverlapWithPolygonArea(place, f)
        timeseries[date] = (timeseries[date] || 0) + values[type]
      }
      return timeseries
    },

    getPlaceOverlapWithPolygonArea: () => (place, polygon) => {
      const zero = {acres: 0, percentage: 0}
      if (!place || !polygon) return zero
      const intersect = turf.intersect(turf.featureCollection([place, polygon]))
      if (!intersect) return zero
      const area = turf.area(intersect)
      if (!area) return zero
      const acres = convertArea(area, 'meters', 'acres')
      const percentage = area / turf.area(place)
      return {acres, percentage}
    },

    sumFeatures: () => (features, columnName) => {
      return features.map(d => Number(d.properties?.[columnName])).reduce((s, a) => s + a, 0)
    },

    vulnerabilityColors: () => {
      return settings.vulnerabilityColors
    },

    vulnerabilityColorBreaks: (state, getters) => (acsPlaces) => {
      if (!acsPlaces) {
        return []
      }

      let vulnerabilityColorBreaks = scaleCluster()
        .domain(acsPlaces.features.map(f => f.properties[state.vulnerabilityMetric?.id]))
        .range(getters.vulnerabilityColors)
        .clusters()
      // When the metric has no spread across features (eg an international
      // disaster whose boundaries lack age-band population), scaleCluster emits
      // NaN/duplicate breaks, which Mapbox rejects in the "step" expression.
      // Keep only finite, strictly-increasing breaks so the fill degrades to a
      // flat color instead of throwing.
      vulnerabilityColorBreaks = [0, ...vulnerabilityColorBreaks]
        .filter(Number.isFinite)
        .filter((v, i, arr) => i === 0 || v > arr[i - 1])
      return vulnerabilityColorBreaks
    },

    vulnerabilityColorScaleMap: (state, getters) => (acsPlaces) => {
      // returns a mapbox style expression for the color scale
      const breaks = getters.vulnerabilityColorBreaks(acsPlaces)
      const colors = getters.vulnerabilityColors
      // Need at least two breaks for a meaningful choropleth. A single break
      // means the metric has no spread (eg an international disaster whose
      // boundaries lack age-band population), so render a transparent fill
      // rather than a flat, misleading wash of the lowest-bucket color.
      if (
        !state.vulnerabilityMetric?.id ||
        !breaks || breaks.length < 2 ||
        !colors
      ) return "transparent"

      // Align colors to the number of breaks. When the metric has no spread (eg
      // an international disaster without age-band population) breaks collapses
      // to a single value; zipping against the full color list would otherwise
      // pad the "step" expression with nulls, which Mapbox rejects.
      const colorBreaks = [
        colors[0],
        ...zip(breaks, colors.slice(0, breaks.length)).flat()
      ]

      return [
        "step",
        ["to-number", ["get", state.vulnerabilityMetric?.id]],
        ...colorBreaks
      ]
    },

    vulnerabilityMetrics: (state) => {
      if (!state.disasterConfig.isInternational) {
        return settings.vulnerabilityMetrics
      } else {
        return settings.vulnerabilityMetrics.filter(l => !l.usOnly)
      }
    },

    isochronesColorScale: () => {
      return settings.isochronesColorScale()
    },

    floodGaugeColorScale: () => {
      return flatten(
        zip(settings.floodGaugeColorScale.domain(), settings.floodGaugeColorScale.range())
      )
    },

    facebookPopDensityColorScale: () => {
      const scale = flatten(
          zip(settings.popDensityColorScale.range(), settings.popDensityColorScale.domain())
        )
        .filter(val => typeof val !== 'undefined')
      return scale
    },

    mapboxPopDensityColorScale: () => {
      const scale = flatten(
          zip(settings.popDensityColorScale.range(), settings.popDensityColorScale.domain())
        )
        .filter(val => typeof val !== 'undefined')
      return scale
    },

    reportPlaces: (state, getters) => {
      return getters.selectedPlaces
    },

    reportCounties: (state, getters) => {
      if (state.regionTypeSelection === 'counties') { return getters.selectedCounties }

      const counties = uniq(getters.selectedPlaces.map(place => {
        return getters.getCountyForPlace(place)
      })).filter(d => d !== undefined)

      const fips = counties.map(d => d?.properties['rm_id'])
      // set selected counties to state, to use in report tables
      if (fips?.length) { state.selectedCountyFips = fips }

      return counties
    },

    firePixelsLayerFilter: (state, getters) => {
      const date = state.selectedDateTime || getters.disasterDateStart
      const currentDate = Number(dayjs(date).format('YYYYMMDDHHMM'))
      // 7 days ago
      const previousDate = Number(dayjs(date).subtract(7, 'day').format('YYYYMMDDHHMM'))
      const filter = [
        "all",
        [
          "<=",
          ["to-number", ["get", "date_time"]],
          currentDate
        ],
        [
          ">",
          ["to-number", ["get", "date_time"]],
          previousDate
        ],
      ]
      return filter
    },

    firePixelsLayerFill: (state, getters) => {
      const date = state.selectedDateTime || getters.disasterDateStart
      const currentTimestamp = Number(dayjs(date).format('X'))
      const fill = [
        'let',
        'time_delta',
        ['-', currentTimestamp, ["to-number", ["get", "date_time_unix"]]],
        [
          "case",
          [
            "<=",
            ['var', 'time_delta'],
            86400
          ],
          "#EA3323",
          "#F1948A"
        ]
      ]
      return fill
    },

    siteTitle: () => {
      return settings.siteTitle
    },

    movementDataSelected: (state) => {
      if (!settings.movementDataSources || !state.mobilityMode) return null
      return settings.movementDataSources?.find(d => d.id === state.mobilityMode)
    },

    mobilityDataInfo: (state) => {
      if (!state.mobilityMode) return null
      return settings.movementDataSources?.find(d => d.id === state.mobilityMode)
    },

    selectedFloodGauge: (state) => {
      if (!state.selectedGaugeId) {
        return null
      }

      return state.floodGauges.find(g => g.gauge_id === state.selectedGaugeId)
    }
  },

  mutations: {

    setActiveLayerIds(state, activeLayerIds) {
      state.activeLayerIds = activeLayerIds
    },

    setHiddenMapLayerIds(state, hiddenMapLayerIds) {
      state.hiddenMapLayerIds = hiddenMapLayerIds
    },

    setMapLayerVisibility(state, { layerId, visible }) {
      if (visible) {
        state.hiddenMapLayerIds = state.hiddenMapLayerIds.filter(id => id !== layerId)
      } else if (!state.hiddenMapLayerIds.includes(layerId)) {
        state.hiddenMapLayerIds = [...state.hiddenMapLayerIds, layerId]
      }
    },

    setInfraTypeVisibility(state, { type, visible }) {
      if (visible) {
        state.hiddenInfraTypes = state.hiddenInfraTypes.filter(t => t !== type)
      } else if (!state.hiddenInfraTypes.includes(type)) {
        state.hiddenInfraTypes = [...state.hiddenInfraTypes, type]
      }
    },

    setHiddenInfraTypes(state, types) {
      state.hiddenInfraTypes = types
    },

    setBuildingDamageSources(state, sources) {
      state.buildingDamageSources = sources
      // keep the selection valid: if the current pick isn't available, use the first
      if (sources.length && !sources.some(s => s.key === state.buildingDamageSource)) {
        state.buildingDamageSource = sources[0].key
      }
    },

    setBuildingDamageSource(state, key) {
      state.buildingDamageSource = key
    },

    setBuildingDamageMode(state, mode) {
      state.buildingDamageMode = mode
    },

    // --- flood-extent / bridge / road source selectors (same pattern as building damage) ---
    setFloodExtentSources(state, sources) {
      state.floodExtentSources = sources
      if (sources.length && !sources.some(s => s.key === state.floodExtentSource)) {
        state.floodExtentSource = sources[0].key
      }
    },
    setFloodExtentSource(state, key) {
      state.floodExtentSource = key
    },
    setBridgeDamageSources(state, sources) {
      state.bridgeDamageSources = sources
      if (sources.length && !sources.some(s => s.key === state.bridgeDamageSource)) {
        state.bridgeDamageSource = sources[0].key
      }
    },
    setBridgeDamageSource(state, key) {
      state.bridgeDamageSource = key
    },
    setRoadDamageSources(state, sources) {
      state.roadDamageSources = sources
      if (sources.length && !sources.some(s => s.key === state.roadDamageSource)) {
        state.roadDamageSource = sources[0].key
      }
    },
    setRoadDamageSource(state, key) {
      state.roadDamageSource = key
    },

    // --- News Sources tab ---
    setNewsTable(state, table) {
      state.newsTable = table
    },
    setNewsFactSummary(state, { table, summary }) {
      state.newsFactSummary = { ...state.newsFactSummary, [table]: summary }
    },

    setData(state, appData) {
      for (let key in appData) {
        state[key] = Object.freeze(appData[key])
      }
    },

    toggleHeaderCollapsed(state) {
      state.headerCollapsed = !state.headerCollapsed
    },

    setDisaster(state, disasterId) {
      if (!state?.disasters) return null
      const disaster = state.disasters.find(d => d.id === disasterId)
      if (!disaster) return null

      state.disasterId = disasterId
      state.disasterConfig = disaster
      state.selectedDateTime = dayjs.utc(disaster.dateStart).toDate()
    },

    toggleMobilityMode(state) {
      state.mobilityMode = state.mobilityMode === 'facebook' ? 'mapbox' : 'facebook'
    },

    setMobilityMode(state, source) {
      state.mobilityMode = source
    },

    toggleSatelliteBasemap(state) {
      state.sateliteBasemap = !state.sateliteBasemap
    },

    toggleFlowsMode(state) {
      state.flowsDirection = state.flowsDirection === 'from' ? 'to' : 'from'
    },

    setFlowsDirection(state, value) {
      state.flowsDirection = value
    },

    setMap(state, map) {
      state.map = map
    },

    setSelectedLocations(state, locations) {
      state.selectedLocations = locations
    },

    setSelectedCountyFips(state, fipsList) {
      // clear previous
      for (const id of state.selectedCountyFips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: false })
      }
      // set new
      for (const id of fipsList) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: true })
      }
      state.selectedCountyFips = fipsList
    },

    addSelectedCountyFips(state, fips) {
      for (const id of fips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: true })
      }
      state.selectedCountyFips = [...state.selectedCountyFips, fips]
    },

    removeSelectedCountyFips(state, fips) {
      for (const id of fips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: false })
      }
      state.selectedCountyFips = state.selectedCountyFips.filter(f => f !== fips)
    },

    focusCounty(state, fips) {
      state.focusedCountyFips = fips
    },

    clearFocusedCounty(state) {
      state.focusedCountyFips = ''
    },

    setHoveredCountyId(state, geoId) {
      state.hoveredCountyId = geoId
    },

    clearHoveredCountyId(state) {
      state.hoveredCountyId = null
    },

    setSelectedPlaceGeoids(state, geoids) {
      // clear previous
      for (const id of state.selectedPlaceGeoids) {
        state.map?.setFeatureState({ id: id, source: 'acs-places' }, { selected: false })
      }
      // set new
      for (const id of geoids) {
        state.map?.setFeatureState({ id: id, source: 'acs-places' }, { selected: true })
      }
      state.selectedPlaceGeoids = geoids
    },

    addSelectedPlaceGeoids(state, geoid) {
      state.map?.setFeatureState({ id: geoid, source: 'acs-places' }, { selected: true })
      state.selectedPlaceGeoids = [...state.selectedPlaceGeoids, geoid]
    },

    removeSelectedPlaceGeoids(state, geoid) {
      state.map?.setFeatureState({ id: geoid, source: 'acs-places' }, { selected: false })
      state.selectedPlaceGeoids = state.selectedPlaceGeoids.filter(f => f !== geoid)
    },

    focusPlace(state, geoid) {
      state.focusedPlaceGeoid = geoid
    },

    clearFocusedPlace(state) {
      state.focusedPlaceGeoid = ''
    },

    setHoveredPlaceId(state, geoId) {
      state.hoveredPlaceId = geoId
    },

    clearHoveredPlaceId(state) {
      state.hoveredPlaceId = null
    },

    setSelectedDateTime(state, datetime) {
      state.selectedDateTime = datetime
    },

    setCurrentLocation(state, location) {
      state.currentLocation = location
    },

    clearCurrentLocation(state) {
      state.currentLocation = null
    },

    setHoveredZip(state, zip) {
      state.hoveredZip = zip
    },

    setDmeDataVisible(state, visible) {
      state.dmeDataVisible = visible
    },

    setTooltipHTML(state, html) {
      state.tooltipHTML = html
    },

    clearTooltipHTML(state) {
      state.tooltipHTML = null
    },

    setTooltipHTMLHurricane(state, html) {
      state.tooltipHTMLHurricane = html
    },

    clearTooltipHTMLHurricane(state) {
      state.tooltipHTMLHurricane = null
    },

    setTab(state, tabName) {
      state.currentTab = tabName
    },

    setRegionTypeSelection(state, regionType) {
      state.regionTypeSelection = regionType
    },

    setGenerateReportModalVisible(state, visible) {
      state.generateReportModalVisible = visible
    },

    setAboutModalVisible(state, visible) {
      state.aboutModalVisible = visible
    },

    setDataSourcesModalVisible(state, visible) {
      state.dataSourcesModalVisible = visible
    },

    setPickMapViewScreen(state, visible) {
      state.pickMapViewScreen = visible
    },

    setReportVisible(state, visible) {
      if (!visible && state.regionTypeSelection === 'places') {
        // clean county selection when returning from places report
        state.selectedCountyFips = []
      }
      state.reportVisible = visible
    },

    setReportNotes(state, {id, mdNotes}) {
      state.reportNotes[id] = mdNotes
    },

    setReportSections(state, sections) {
      state.reportSections = sections
    },

    setReportMapViews(state, {id, image}) {
      state.reportMapViews[id] = image
    },

    setReportLoading(state, visible) {
      state.reportLoading = visible
    },

    setReportCreatedOn(state, date) {
      state.reportCreatedOn = date
    },

    setNavbarOpen(state, open) {
      state.navbarOpen = open
    },

    setVulnerabilityMetric(state, metricId) {
      const metric = settings.vulnerabilityMetrics.find(d => d.id === metricId)
      if (!metric) return null
      state.vulnerabilityMetric = metric
    },

    setDisasters(state, disasters) {
      state.disasters = disasters
    },

    setAboutData(state, aboutData) {
      state.aboutData = aboutData
    },

    setDisasterMetadata(state, metadata) {
      state.disasterMetadata = metadata
    },

    setIsochronesData(state, {placeId, isochrone}) {
      if (!placeId) return
      state.isochronesData[placeId] = isochrone
    },

    setSelectedGaugeId(state, gaugeId) {
      state.selectedGaugeId = gaugeId
    },

    clearSelectedGaugeId(state) {
      state.selectedGaugeId = null
    },

    startPlayback(state) {
      state.playing = true
    },

    stopPlayback(state) {
      state.playing = false
    },

    togglePlayback(state) {
      state.playing = !state.playing
    },

    bumpLoadProgress(state, { loadLabel, complete, percentage, error, message }) {
      if (!state.loadProgress[loadLabel]) {
        // Init new progress state
        state.loadProgress = { ...state.loadProgress, [loadLabel]: { count: 1, complete: complete, percentage } }
      }
      else if (!state.loadProgress[loadLabel].complete) {
        // Update the progress state if it's not already flagged complete
        state.loadProgress[loadLabel].count += 1
        state.loadProgress[loadLabel].complete = complete
        if (percentage != null) {
          state.loadProgress[loadLabel].percentage = percentage
        }
        else {
          delete state.loadProgress[loadLabel].percentage
        }
      }

      if (error) state.loadProgress[loadLabel].error = error
      if (message) state.loadProgress[loadLabel].message = message
    },

    setCurrentHurricanePosition(state, feature) {
      state.currentHurricanePosition = feature
    },

    resetDisasterData(state) {
      for (const id of state.activeLayerIds) {
        state[id] = null

        const layer = layers.find(l => l.id === id)
        if (layer?.additionalDataLayers) {
          for (const additionalId of layer.additionalDataLayers) {
            state[additionalId] = null
          }
        }
      }
      state.activeLayerIds = []
      state.hiddenMapLayerIds = []
      state.hiddenInfraTypes = []
      state.buildingDamageSources = []
      state.floodExtentSources = []
      state.bridgeDamageSources = []
      state.roadDamageSources = []
      state.buildingDamageSummary = {}
      state.roadDamageBySource = {}
      state.bridgeDamageBySource = {}
      state.floodExtentData = {}
      state.floodExposure = null
      state.floodInundationCount = 0
      state.newsTable = 'infrastructure'
      state.newsFactSummary = {}
      state.newsSilenceList = []
      state.newsCoverageCounts = null
      state.newsUnplaced = null
      state.newsMultiDistrict = null
      state.newsNationalCount = null
      state.loadProgress = {}
      state.fbPopDensityDates = []
      state.mapboxActivityDates = []
      state.selectedDateTime = null
      state.selectedCountyFips = []
      state.focusedCountyFips = null
      state.selectedPlaceGeoids = []
      state.focusedPlaceGeoid = null
      state.selectedLocations = []
      state.hoveredZip = null
      state.currentLocation = null
      state.tooltipHTML = null
      state.tooltipHTMLHurricane = null
      state.currentTab = 'disaster'
      state.isochronesData = {}
      state.hoveredCountyId = null
      state.hoveredPlaceId = null
      state.currentHurricanePosition = null
      state.flowsDirection = 'off'
      state.disasterMetadata = null
    },

  },
  actions: {
    setActiveLayerIds({ commit }, { activeLayerIds }) {
      commit('setActiveLayerIds', activeLayerIds);
    },

    async getDisasters({commit}) {
      const disasters = useLocalContent
        ? disastersJSON
        : await fetch(settings.disastersUrl).then(r => r.json())
      commit('setDisasters', disasters)
    },
    async getAboutData({commit}) {
      const about = useLocalContent
        ? aboutMD
        : await fetch(settings.aboutUrl).then(r => r.text())
      commit('setAboutData', about)
    },

    async loadDisasterMetadata({ getters, commit }) {
      const url = `${getters.disasterBaseUrlData}/metadata.json`
      try {
        const r = await fetch(url)
        if (!r.ok) return
        commit('setDisasterMetadata', await r.json())
      } catch (e) {
        // metadata is non-critical
      }
    },

    async switchDisaster({ state, getters, commit, dispatch }, disasterId) {
      if (state.map) {
        teardownMapData(state.map)
      }
      commit('resetDisasterData')
      commit('setDisaster', disasterId)

      const baseUrl = window.location.href.split('?')[0]
      window.history.replaceState({}, '', `${baseUrl}?disasterId=${disasterId}`)

      if (state.map && state.disasterConfig) {
        state.map.flyTo({
          center: [getters.disasterLng, getters.disasterLat],
          zoom: getters.disasterZoom,
        })
      }

      dispatch('loadDisasterMetadata')
      await loadMapData(state.map, { state, getters, commit, dispatch })
    },
  },
  modules: {
  }
})
