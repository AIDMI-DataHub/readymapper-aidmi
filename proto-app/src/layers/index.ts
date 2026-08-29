import * as turf from '@turf/turf';

import { helpers } from '../helpers'
import { acsPlacesLayer } from './acs-places.js'
import { countiesLayer } from './counties.js'
import { cityPowerOutagesLayer } from './city-power-outages.js'
import { countyPowerOutagesLayer } from './county-power-outages.js'
import { networkCoverageLayer } from './network-coverage.js'
import { dmeLayer } from './dme.js'
import { fbPopDensityLayer } from './fb-pop-density.js'
import { fbMobilityLayer } from './fb-mobility.js'
import { fbPopDensityTimeseriesCountiesLayer } from './fb-pop-density-timeseries-counties.js'
import { fbPopDensityTimeseriesPlacesLayer } from './fb-pop-density-timeseries-places.js'
import { firePerimeterLayer } from './fire-perimeter.js'
import { firePerimeterDifferenceLayer } from './fire-perimeter-difference.js'
import { firePixelsLayer } from './fire-pixels.js'
import { floodGaugesLayer } from './flood-gauges.js'
import { floodInundationsLayer } from './flood-inundations.js'
import { floodBridgeDamageLayer } from './flood-bridge-damage.js'
import { floodRoadDamageLayer } from './flood-road-damage.js'
import { floodAoiCorridorLayer } from './flood-aoi-corridor.js'
import { floodExtentLayer } from './flood-extent.js'
import { floodBuildingDamageLayer } from './flood-building-damage.js'
import { hifldHealthcareFacilitiesLayer } from './hifld-healthcare.js'
import { fqhcHealthcareFacilitiesLayer } from './fqhc-healthcare.js'
import { globalInfrastructureLayer } from './global-infrastructure.js'
import { healthcareFacilitiesLayer } from './healthcare.js'
import { healthcareFacilitiesWithCapacitiesLayer } from './healthcare-with-capacities.js'
import { hurricaneWindProbabilityLayer } from './hurricane-wind-probability.js'
import { hurricaneWindRadiiLayer } from './hurricane-wind-radii.js'
import { hurricaneFloodWarningsLayer } from './hurricane-flood-warnings.js'
import { hurricaneConeLayer } from './hurricane-cone.js'
import { hurricaneTracksLayer } from './hurricane-tracks.js'
import { isochronesLayer } from './isochrones.js'
import { mapboxActivityTimeseriesCountiesLayer } from './mapbox-activity-timeseries-counties.js'
import { mapboxActivityTimeseriesPlacesLayer } from './mapbox-activity-timeseries-places.js'
import { mapboxActivityLayer } from './mapbox-activity.js'
import { smokePerimeterLayer } from './smoke-perimeter.js'
import { heatwaveUnicefLayer } from './heatwave-unicef.js'
import { heatApiLayer } from './heat-api.js'
import { riversLayer } from './rivers.js'
import { makeNewsLayer } from './news/newsFactLayer.js'
import { newsSilenceLayer } from './news/newsSilenceLayer.js'
import { NEWS_TABLES, TABLE_LABELS } from './news/palettes.js'

type DisasterType = 'all' | 'fire' | 'flood' | 'hurricane' | 'heat'

export interface LayerConfig {
  id: string
  disasterType: DisasterType
  loadLabel?: string
  loader?: (store: any, loadLabel?: string) => Promise<any>
  loaders?: Array<(store: any, loadLabel?: string) => Promise<any>>
  loadersCombine?: (datasets: any[]) => any
  postProcess?: (data: any, store: any) => void
  postProcessDependencies?: string[]
  adder?: (map: any, data: any, store: any, beforeId?: string) => void | Promise<void>
  adderDependencies?: string[]
  beforeLayerIdPrefix?: string
  mapLayerId?: string
  mapLayerIds?: string[]
  zIndex?: number
  usOnly?: boolean
  nonUsOnly?: boolean
  usStates?: string[]
  updater?: (map: any, store: any, layerConfig?: LayerConfig) => void
  updaterDependencies?: string[]
  additionalDataLayers?: string[]
  metadataKey?: string
}

// ---- News Sources (2026 Nepal floods): 7 fact tables + the silence layer -----
// One factory, seven thin configs. disasterType 'flood' + graceful 404 keeps them
// Nepal-only. camelCase ids so ComposeTab's `startsWith('news')` branch groups them.
function newsLayerId(table: string): string {
  return 'news' + table.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}
const NEWS_ZINDEX = 63
const newsFactConfigs: LayerConfig[] = NEWS_TABLES.map((table: string) => {
  const L = makeNewsLayer(table)
  const base = `news-${table}`
  const ids = [`${base}-fill`, `${base}-inner`, `${base}-count`, `${base}-label`]
  if (table === 'access') ids.push('news-access-lines')
  return {
    id: newsLayerId(table),
    disasterType: 'flood',
    loadLabel: `News · ${TABLE_LABELS[table]}`,
    loader: L.loadData,
    adder: L.addLayer,
    updater: L.updateLayer,
    mapLayerId: `${base}-fill`,
    mapLayerIds: ids,
    zIndex: NEWS_ZINDEX,
    updaterDependencies: ['currentTab', 'newsTable', 'selectedDateTime'],
  }
})
// Data-only: loads palika/district/province polygons for the hover-outline lookup
// and the report's information-gap table. No visible, user-toggleable map layer
// (mapLayerIds empty -> excluded from the Custom tab), only the transient
// anchor-outline highlight the adder creates.
const newsSilenceConfig: LayerConfig = {
  id: 'newsSilence',
  disasterType: 'flood',
  loadLabel: 'News · map data',
  loader: newsSilenceLayer.loadData,
  adder: newsSilenceLayer.addLayer,
  updater: newsSilenceLayer.updateLayer,
  mapLayerIds: [],
  zIndex: 62,
  updaterDependencies: ['currentTab'],
}

export const layers: LayerConfig[] = [
  {
    id: 'acsPlaces',
    disasterType: 'all',
    loadLabel: 'Places/admin 3 boundaries',
    loader: acsPlacesLayer.loadData,
    postProcess: acsPlacesLayer.postProcess,
    postProcessDependencies: ['counties', 'cityPowerOutagesTimeseries', 'heatwaveUnicefAdm3', 'heatApiData'],
    adder: acsPlacesLayer.addLayer,
    beforeLayerIdPrefix: 'poi',
    mapLayerId: 'acs-places-click-target',
    mapLayerIds: [
      'acs-places-click-target', 'acs-places-stroke', 'acs-places-selected',
      'acs-places-stroke-selected', 'acs-places-stroke-focused', 'acs-places-hovered'
      // 'acs-places-fill' moved to the standalone 'demographicOverlay' toggle
    ],
    zIndex: 50,
    updater: acsPlacesLayer.updateLayer,
    updaterDependencies: ['regionTypeSelection', 'currentTab', 'vulnerabilityMetric', 'selectedDateTime'],
    metadataKey: 'vulnerability'
  },
  {
    id: 'counties',
    disasterType: 'all',
    loadLabel: 'Counties/admin 2 boundaries',
    loader: countiesLayer.loadData,
    postProcess: countiesLayer.postProcess,
    postProcessDependencies: ['countyPowerOutagesTimeseries'],
    adder: countiesLayer.addLayer,
    mapLayerId: 'counties',
    beforeLayerIdPrefix: 'poi',
    mapLayerIds: [
      'counties-click-target', 'counties-stroke', 'counties-hovered',
      'counties-selected', 'counties-stroke-selected', 'counties-stroke-focused'
      // 'counties-fill' moved to the standalone 'demographicOverlay' toggle
    ],
    zIndex: 51,
    updater: countiesLayer.updateLayer,
    updaterDependencies: ['regionTypeSelection', 'currentTab', 'vulnerabilityMetric'],
  },
  {
    // Standalone toggle for the demographic CHOROPLETH fill (vulnerability shading),
    // so it can be hidden independently of the admin boundary OUTLINES (which stay on
    // the counties / acsPlaces layers). No loader/adder — the fills are created by
    // those layers; this entry only controls their visibility in the layer panel.
    id: 'demographicOverlay',
    disasterType: 'all',
    loadLabel: 'Demographic overlay (choropleth)',
    mapLayerId: 'acs-places-fill',
    mapLayerIds: ['acs-places-fill', 'counties-fill'],
    zIndex: 52,
  },
  {
    id: 'cityPowerOutagesTimeseries',
    disasterType: 'all',
    loadLabel: 'Power outages admin 3',
    loader: cityPowerOutagesLayer.loadData,
    adder: cityPowerOutagesLayer.addLayer,
    adderDependencies: ['acsPlaces'],
    mapLayerId: 'acs-places-power-outages',
    mapLayerIds: ['acs-places-power-outages'],
    zIndex: 86,
    usOnly: true,
    updater: cityPowerOutagesLayer.updateLayer,
    updaterDependencies: ['currentTab', 'regionTypeSelection', 'selectedDateTime'],
  },
  {
    id: 'countyPowerOutagesTimeseries',
    disasterType: 'all',
    loadLabel: 'Power outages admin 2',
    loader: countyPowerOutagesLayer.loadData,
    adder: countyPowerOutagesLayer.addLayer,
    adderDependencies: ['counties'],
    mapLayerId: 'counties-power-outages',
    mapLayerIds: ['counties-power-outages'],
    zIndex: 87,
    usOnly: true,
    updater: countyPowerOutagesLayer.updateLayer,
    updaterDependencies: ['currentTab', 'regionTypeSelection', 'selectedDateTime'],
  },
  {
    id: 'networkCoverage',
    disasterType: 'all',
    loadLabel: 'Network outages',
    loader: networkCoverageLayer.loadData,
    adder: networkCoverageLayer.addLayer,
    mapLayerId: 'network-coverage',
    mapLayerIds: ['network-coverage'],
    zIndex: 85,
    updater: networkCoverageLayer.updateLayer,
    updaterDependencies: ['currentTab', 'selectedDateTime'],
  },
  {
    id: 'dmeUsers',
    disasterType: 'all',
    loadLabel: 'DME',
    loader: dmeLayer.loadData,
    usOnly: true,
  },
  {
    id: 'fbMobility',
    disasterType: 'all',
    loadLabel: 'Meta mobility',
    loader: fbMobilityLayer.loadData,
    postProcess: fbMobilityLayer.postProcess,
    additionalDataLayers: ['tileFBFlows', 'adminFBFlows'],
    metadataKey: 'vulnerability'
  },
  {
    id: 'fbPopDensity',
    disasterType: 'all',
    loadLabel: 'Meta population density',
    loader: fbPopDensityLayer.loadData,
    postProcess: fbPopDensityLayer.postProcess,
    adder: fbPopDensityLayer.addLayer,
    beforeLayerIdPrefix: 'poi',
    mapLayerId: 'fb-pop-density',
    mapLayerIds: ['fb-pop-density'],
    zIndex: 82,
    updater: fbPopDensityLayer.updateLayer,
    updaterDependencies: ['mobilityMode', 'selectedDateTime', 'currentTab'],
    additionalDataLayers: ['fbPopDensityData', 'fbPopDensityDates'],
  },
  {
    id: 'fbPopDensityTimeseriesCounties',
    disasterType: 'all',
    loadLabel: 'Meta population density admin 3',
    loader: fbPopDensityTimeseriesCountiesLayer.loadData,
  },
  {
    id: 'fbPopDensityTimeseriesPlaces',
    disasterType: 'all',
    loadLabel: 'Meta population density admin 2',
    loader: fbPopDensityTimeseriesPlacesLayer.loadData,
  },
  {
    id: 'firePerimeter',
    disasterType: 'fire',
    loadLabel: 'Fire perimeters',
    loader: firePerimeterLayer.loadData,
    adder: firePerimeterLayer.addLayer,
    mapLayerId: 'fire-perimeter-previous-fill',
    zIndex: 100,
    mapLayerIds: ['fire-perimeter-previous-fill', 'fire-perimeter-previous-outline'],
    updater: firePerimeterLayer.updateLayer,
    updaterDependencies: ['selectedDateTime'],
  },
  {
    // FIRMS active-fire pixels. Copernicus-perimeter disasters (eg France/Spain) skip
    // these inside firePixelsLayer.loadData; US/Canada fires keep them.
    id: 'firePixels',
    disasterType: 'fire',
    loadLabel: 'Active-fire detections (FIRMS)',
    loader: firePixelsLayer.loadData,
    adder: firePixelsLayer.addLayer,
    mapLayerId: 'fire-pixels',
    mapLayerIds: ['fire-pixels', 'fire-pixels-dots'],
    zIndex: 12,
    updater: firePixelsLayer.updateLayer,
    updaterDependencies: ['selectedDateTime'],
  },
  {
    id: 'firePerimeterDifference',
    disasterType: 'fire',
    loadLabel: 'Fire perimeter deltas',
    loader: firePerimeterDifferenceLayer.loadData,
    adder: firePerimeterDifferenceLayer.addLayer,
    mapLayerId: 'fire-perimeter-difference',
    mapLayerIds: ['fire-perimeter-difference'],
    zIndex: 90,
    updater: firePerimeterDifferenceLayer.updateLayer,
    updaterDependencies: ['selectedDateTime'],
  },
  {
    id: 'floodGauges',
    disasterType: 'flood',
    loadLabel: 'Affected flood gauges',
    loader: floodGaugesLayer.loadData,
    adder: floodGaugesLayer.addLayer,
    mapLayerId: 'flood-gauges',
    mapLayerIds: ['flood-gauges', 'selected-flood-gauge'],
    zIndex: 21,
    updater: floodGaugesLayer.updateLayer,
    updaterDependencies: ['selectedDateTime', 'selectedGaugeId', 'currentTab'],
    metadataKey: 'gauges',
  },
  {
    id: 'unaffectedFloodGauges',
    disasterType: 'flood',
    loadLabel: 'Unaffected flood gauges',
    mapLayerId: 'unaffected-flood-gauges',
    mapLayerIds: ['unaffected-flood-gauges'],
    zIndex: 21,
    hiddenByDefault: true
  },
  {
    id: 'floodInundations',
    disasterType: 'flood',
    loadLabel: 'Inundation forecasts',
    loader: floodInundationsLayer.loadData,
    adder: floodInundationsLayer.addLayer,
    mapLayerId: 'inundation-low-actual',
    mapLayerIds: ['inundation-low-actual', 'inundation-low-forecasted', 'inundation-medium-actual', 'inundation-medium-forecasted', 'inundation-high-actual', 'inundation-high-forecasted'],
    zIndex: 20,
    updater: floodInundationsLayer.updateLayer,
    updaterDependencies: ['selectedDateTime'],
    metadataKey: 'gauges',
  },
  {
    id: 'floodExtent',
    disasterType: 'flood',
    loadLabel: 'Flood extent (observed)',
    loader: floodExtentLayer.loadData,
    adder: floodExtentLayer.addLayer,
    mapLayerId: 'flood-extent-fill',
    mapLayerIds: ['flood-extent-fill', 'flood-extent-outline'],
    zIndex: 18,
    updater: floodExtentLayer.updateLayer,
    updaterDependencies: ['currentTab', 'floodExtentSource'],
  },
  {
    id: 'floodAoiCorridor',
    disasterType: 'flood',
    loadLabel: 'Flood corridor (HOT AOI)',
    loader: floodAoiCorridorLayer.loadData,
    adder: floodAoiCorridorLayer.addLayer,
    mapLayerId: 'flood-aoi-corridor',
    mapLayerIds: ['flood-aoi-corridor'],
    zIndex: 19,
    updater: floodAoiCorridorLayer.updateLayer,
    updaterDependencies: ['currentTab'],
  },
  {
    id: 'floodBuildingDamage',
    disasterType: 'flood',
    loadLabel: 'Building damage',
    loader: floodBuildingDamageLayer.loadData,
    adder: floodBuildingDamageLayer.addLayer,
    mapLayerId: 'building-damage-fill',
    mapLayerIds: ['building-damage-fill', 'building-damage-line'],
    zIndex: 59,
    updater: floodBuildingDamageLayer.updateLayer,
    updaterDependencies: ['currentTab', 'buildingDamageSource', 'buildingDamageMode'],
  },
  {
    id: 'floodBridgeDamage',
    disasterType: 'flood',
    loadLabel: 'Bridge damage (ICIMOD)',
    loader: floodBridgeDamageLayer.loadData,
    adder: floodBridgeDamageLayer.addLayer,
    mapLayerId: 'bridge-damage',
    mapLayerIds: ['bridge-damage'],
    zIndex: 60,
    updater: floodBridgeDamageLayer.updateLayer,
    updaterDependencies: ['currentTab', 'bridgeDamageSource'],
  },
  {
    id: 'floodRoadDamage',
    disasterType: 'flood',
    loadLabel: 'Road damage (EMSR927)',
    loader: floodRoadDamageLayer.loadData,
    adder: floodRoadDamageLayer.addLayer,
    mapLayerId: 'road-damage',
    mapLayerIds: ['road-damage'],
    zIndex: 58,
    updater: floodRoadDamageLayer.updateLayer,
    updaterDependencies: ['currentTab', 'roadDamageSource'],
  },
  {
    id: 'globalInfra',
    disasterType: 'all',
    loadLabel: 'Global infrastructure',
    loader: globalInfrastructureLayer.loadData,
    adder: globalInfrastructureLayer.addLayer,
    nonUsOnly: true,
    mapLayerId: 'global-infra',
    mapLayerIds: ['global-infra'],
    zIndex: 50,
    updater: globalInfrastructureLayer.updateLayer,
    updaterDependencies: ['currentTab'],
  },
  {
    id: 'healthcareFacilities',
    loadLabel: 'Healthcare facilities',
    disasterType: 'all',
    loaders: [
      healthcareFacilitiesLayer.loadData,
      fqhcHealthcareFacilitiesLayer.loadData,
      hifldHealthcareFacilitiesLayer.loadData
    ],
    loadersCombine: (datasets) => {
      return turf.featureCollection(datasets.flatMap(d => d.features));
    },
    postProcess: (data, store) => {
      if (data?.features?.length) store.commit('setData', { healthcareFacilities: data });
    },
    adder: healthcareFacilitiesLayer.addLayer,
    updater: healthcareFacilitiesLayer.updateLayer,
    updaterDependencies: ['currentTab'],
    usOnly: true,
    mapLayerId: 'healthcare-facilities',
    mapLayerIds: ['healthcare-facilities', 'healthcare-clusters', 'healthcare-cluster-count'],
    zIndex: 84,
  },
  {
    id: 'healthcareFacilitiesWithCapacities',
    disasterType: 'all',
    loadLabel: 'HHS bed capacity',
    loader: healthcareFacilitiesWithCapacitiesLayer.loadData,
    adder: healthcareFacilitiesWithCapacitiesLayer.addLayer,
    usOnly: true,
    mapLayerId: 'healthcare-facilities-with-capacities',
    mapLayerIds: ['healthcare-facilities-with-capacities'],
    zIndex: 85,
  },
  {
    id: 'hurricaneWindProbability',
    disasterType: 'hurricane',
    loadLabel: 'Hurricane wind probability',
    loader: hurricaneWindProbabilityLayer.loadData,
    mapLayerIds: ['hurricane-wind-probability'],
  },
  {
    id: 'hurricaneWindRadii',
    disasterType: 'hurricane',
    loadLabel: 'Hurricane wind radii',
    loader: hurricaneWindRadiiLayer.loadData,
    mapLayerIds: ['hurricane-wind-radii'],
  },
  {
    id: 'hurricaneFloodWarnings',
    disasterType: 'hurricane',
    loadLabel: 'Hurricane flood warnings',
    loader: hurricaneFloodWarningsLayer.loadData,
    mapLayerIds: ['hurricane-flood-warnings'],
  },
  {
    id: 'hurricaneCones',
    disasterType: 'hurricane',
    loadLabel: 'Hurricane cones',
    loader: hurricaneConeLayer.loadData,
    mapLayerIds: ['hurricane-cones'],
  },
  {
    id: 'hurricaneTracks',
    disasterType: 'hurricane',
    loadLabel: 'Hurricane tracks',
    loader: hurricaneTracksLayer.loadData,
    postProcess: hurricaneTracksLayer.postProcess,
    additionalDataLayers: ['forecastHurricaneTracks', 'historicHurricanePositions'],
    mapLayerIds: ['hurricane-tracks'],
  },
  {
    id: 'isochrones',
    disasterType: 'all',
    loader: isochronesLayer.loadData,
    adder: isochronesLayer.addLayer,
    usOnly: true,
    beforeLayerIdPrefix: 'water',
    mapLayerId: 'isochrones-fill',
    mapLayerIds: ['isochrones-fill'],
    zIndex: 80,
    updater: isochronesLayer.updateLayer,
    updaterDependencies: ['currentTab'],
  },
  {
    id: 'mapboxActivityData',
    disasterType: 'all',
    loadLabel: 'Mapbox mobility',
    loader: mapboxActivityLayer.loadData,
    postProcess: mapboxActivityLayer.postProcess,
    adder: mapboxActivityLayer.addLayer,
    zIndex: 81,
    updater: mapboxActivityLayer.updateLayer,
    updaterDependencies: ['mobilityMode', 'selectedDateTime', 'currentTab'],
    additionalDataLayers: ['mapboxActivity', 'mapboxActivityDates'],
    metadataKey: 'vulnerability'
  },
  {
    id: 'mapboxActivityTimeseriesCounties',
    disasterType: 'all',
    loadLabel: 'Mapbox mobility admin 2',
    loader: mapboxActivityTimeseriesCountiesLayer.loadData,
    metadataKey: 'vulnerability'
  },
  {
    id: 'mapboxActivityTimeseriesPlaces',
    disasterType: 'all',
    loadLabel: 'Mapbox mobility admin 3',
    loader: mapboxActivityTimeseriesPlacesLayer.loadData,
    metadataKey: 'vulnerability'
  },
  {
    id: 'heatwaveUnicef',
    disasterType: 'heat',
    loadLabel: 'Unicef Heatwave',
    loader: heatwaveUnicefLayer.loadData,
    adder: heatwaveUnicefLayer.addLayer,
  },
  {
    id: 'heatwaveUnicefAdm2',
    disasterType: 'heat',
    loadLabel: 'Unicef Heatwave Admin 2',
    loader: heatwaveUnicefLayer.loadAdmin2Data,
  },
  {
    id: 'heatwaveUnicefAdm3',
    disasterType: 'heat',
    loadLabel: 'Unicef Heatwave Admin 3',
    loader: heatwaveUnicefLayer.loadAdmin3Data,
  },
  {
    id: 'heatApiData',
    disasterType: 'heat',
    loadLabel: 'Heat API',
    loader: heatApiLayer.loadData,
    adder: heatApiLayer.addLayer,
    adderDependencies: ['acsPlaces'],
    mapLayerId: 'acs-places-heat-hatch',
    mapLayerIds: ['acs-places-heat-hatch'],
    updater: heatApiLayer.updateLayer,
    updaterDependencies: ['selectedDateTime', 'regionTypeSelection'],
    beforeLayerIdPrefix: 'poi',
    zIndex: 5,
  },
  {
    id: 'smokePerimeter',
    disasterType: 'fire',
    loadLabel: 'Smoke perimeter',
    loader: smokePerimeterLayer.loadData,
    adder: smokePerimeterLayer.addLayer,
    mapLayerId: 'smoke-fill',
    mapLayerIds: ['smoke-fill'],
    zIndex: 12,
    updater: smokePerimeterLayer.updateLayer,
    updaterDependencies: ['selectedDateTime'],
  },
  {
    id: 'rivers',
    disasterType: 'flood',
    loadLabel: 'Rivers',
    loader: riversLayer.loadData,
    adder: riversLayer.addLayer,
    mapLayerId: 'rivers',
    zIndex: 11
  },
  ...newsFactConfigs,
  newsSilenceConfig,
];

export function getLayerIds(layer: LayerConfig): string[] {
  return layer.mapLayerIds ?? (layer.mapLayerId ? [layer.mapLayerId] : [])
}

export function showLayer(map: any, layer: LayerConfig): void {
  helpers.showLayers(map, getLayerIds(layer))
}

export function hideLayer(map: any, layer: LayerConfig): void {
  helpers.hideLayers(map, getLayerIds(layer))
}

export function setLayerVisibility(map: any, layer: LayerConfig, visible: boolean): void {
  visible ? showLayer(map, layer) : hideLayer(map, layer)
}
