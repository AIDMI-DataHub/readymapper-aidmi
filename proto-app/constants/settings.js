import * as d3 from 'd3'
import { getConfig } from '../src/config.ts'

const isProductionLike = ['staging', 'production'].includes(import.meta.env.MODE)
export const useLocalBackend = !isProductionLike && import.meta.env.VITE_USE_LOCAL_BACKEND === 'true'
export const useLocalContent = !isProductionLike && import.meta.env.VITE_USE_LOCAL_CONTENT !== 'false'
if (useLocalContent) { console.log("using local disasters.json and about.md") }
if (useLocalBackend) { console.log("using local backend data") }

export const settings = {
  siteTitle: "ReadyMapper",

  get baseUrlData() {
    return useLocalBackend
      ? new URL('../data', import.meta.url).href
      : `${getConfig().s3.cloudfrontBaseUrl}/${getConfig().s3.outputFolder}`
  },

  get disastersUrl() { return `${getConfig().s3.cloudfrontBaseUrl}/disasters.json` },
  get aboutUrl() { return `${getConfig().s3.cloudfrontBaseUrl}/about.md` },

  get mapboxAccessToken() { return getConfig().mapbox.accessToken },
  get mapboxStyleUrl() { return getConfig().mapbox.styleUrl },

  disasterTypes: [
    {
      id: "fire",
      name: "Fire",
      namePlural: "Fires",
      nameFormatter: name => `${name} Fire`,
      icon: new URL('@/assets/img/wildfire-header-icon.svg', import.meta.url).href,
    },
    {
      id: "hurricane",
      name: "Hurricane",
      namePlural: "Hurricanes",
      nameFormatter: name => `Hurricane ${name}`,
      icon: new URL('@/assets/img/hurricane-header-icon.svg', import.meta.url).href,
    },
    {
      id: "cyclone",
      name: "Cyclone",
      namePlural: "Cyclones",
      nameFormatter: name => `Cyclone ${name}`,
      icon: new URL('@/assets/img/cyclone-header-icon.svg', import.meta.url).href,
    },
    {
      id: "earthquake",
      name: "Earthquake",
      namePlural: "Earthquakes",
      nameFormatter: name => `${name} Earthquake`,
      icon: new URL('@/assets/img/earthquake-header-icon.svg', import.meta.url).href,
    },
    {
      id: "flood",
      name: "Flood",
      namePlural: "Floods",
      nameFormatter: name => `${name} Flood`,
      icon: new URL('@/assets/img/flood-header-icon.svg', import.meta.url).href,
    },
    {
      id: "tornado",
      name: "Tornado",
      namePlural: "Tornadoes",
      nameFormatter: name => `${name} Tornado`,
      icon: new URL('@/assets/img/tornado-header-icon.svg', import.meta.url).href,
    },
    {
      id: "volcano",
      name: "Volcano",
      namePlural: "Volcanoes",
      nameFormatter: name => `${name} Volcanic Eruption`,
      icon: new URL('@/assets/img/volcano-header-icon.svg', import.meta.url).href,
    },
    {
      id: "landslide",
      name: "Landslide",
      namePlural: "Landslides",
      nameFormatter: name => `${name} Landslide`,
      icon: new URL('@/assets/img/landslide-header-icon.svg', import.meta.url).href,
    },
    {
      id: "heat",
      name: "Heat",
      namePlural: "Heat",
      nameFormatter: name => `${name} Heat`,
      icon: new URL('@/assets/img/heat-icon.svg', import.meta.url).href,
    },
  ],

  defaultReportSections: [
    {name: "Disaster", display: true},
    {name: "Vulnerability", display: true},
    {name: "Movement", display: true},
    {name: "Infrastructure", display: true},
    {name: "Custom", display: true},
  ],

  vulnerabilityMetrics: [
    {
      id: 'rm_percent_pop_65_and_over',
      name: '>65 years old',
      default: true,
      idAbsolute: 'rm_pop_65_and_over',
      nameAbsolute: 'Pop. > 65 yrs'
    },
    {
      id: 'rm_percent_pop_14_and_under',
      name: 'Children (< 14 years old)',
      default: false,
      idAbsolute: 'rm_pop_14_and_under',
      nameAbsolute: 'Pop. < 14 yrs'
    },
    {
      id: 'percentPopBelowPoverty',
      name: 'Below Poverty Level',
      default: false,
      idAbsolute: 'popBelowPoverty',
      nameAbsolute: 'Pop. Below Poverty Level',
      usOnly: true
    },
  ],

  movementDataSources: [
    {
      id: 'facebook',
      name: '% Pop. Density Change',
      source: 'Facebook Mobility Data',
      layerId: 'fbPopDensity'
    },
    {
      id: 'mapbox',
      name: '% Activity Change',
      source: 'Mapbox Mobility Data',
      notes: "Note: Gray dots represent tiles without any recorded activity for the selected date, but which had activity at other date(s) during or prior to the disaster.",
      layerId: 'mapboxActivityData'
    },
  ],

  acsVariables: [
    { variable: 'S0101_C01_001E', title: 'Total Population' },
    { variable: 'S0101_C01_002E', title: 'Population Under 5' },
    { variable: 'S0101_C01_003E', title: 'Population 5-9' },
    { variable: 'S0101_C01_004E', title: 'Population 10-14' },
    { variable: 'S0101_C01_005E', title: 'Population 15-19' },
    { variable: 'S0101_C01_006E', title: 'Population 20-24' },
    { variable: 'S0101_C01_007E', title: 'Population 25-29' },
    { variable: 'S0101_C01_008E', title: 'Population 30-34' },
    { variable: 'S0101_C01_009E', title: 'Population 35-39' },
    { variable: 'S0101_C01_010E', title: 'Population 40-44' },
    { variable: 'S0101_C01_011E', title: 'Population 45-49' },
    { variable: 'S0101_C01_012E', title: 'Population 50-54' },
    { variable: 'S0101_C01_013E', title: 'Population 55-59' },
    { variable: 'S0101_C01_014E', title: 'Population 60-64' },
    { variable: 'S0101_C01_015E', title: 'Population 65-69' },
    { variable: 'S0101_C01_016E', title: 'Population 70-74' },
    { variable: 'S0101_C01_017E', title: 'Population 75-79' },
    { variable: 'S0101_C01_018E', title: 'Population 80-84' },
    { variable: 'S0101_C01_019E', title: 'Population Over 85' },
    { variable: 'S1701_C02_001E', title: 'Population Below Poverty Level' },
    { variable: 'DP02_0001E', title: 'Total Households' }
  ],

  vulnerabilityColors: [
        '#FCA923',
        '#E9693F',
        '#C4365F',
        '#940085',
        '#210081',
  ],

  isochronesColorScale: isochronesData => {
    // let dataExtent = d3.extent(isochronesData.features, (f) => f.properties['value'])
    let dataExtent = [15, 60]
    return (val) => d3.scaleQuantize()
      .domain([0, 1])
      .range([
        '#fff',  // for zero
        '#FCE51E',
        '#ABDB20',
        '#65CA44',
        '#209473'
      ])(val / dataExtent[1])
  },

  isochronesColorStops: isochronesData => {
    // let dataExtent = d3.extent(isochronesData.features, (f) => f.properties['value'])
    let dataExtent = [15, 60]
    return d3.range(0, dataExtent[1], dataExtent[1] / 5)
  },

  // 0 -> warning
  // warning -> danger
  // danger -> extreme danger+
  floodGaugeColorScale: d3.scaleThreshold().domain([0, 0.3, 0.7, 1.0]).range([
    '#54BE56', '#54BE56', '#eace14', '#ed8b52', '#992727'
  ]),

  popDensityColorScale: d3.scaleThreshold().domain([-50, -10, 0, 10, 50]).range([
    "#EA3323", "#F2A63B", "transparent", "transparent", "#51B8F9", "#276BF6"
  ]),

  popDensityStops: [-50.01, -10.01, 10, 50],

  popDensityStopLabels: ['50%+', '50% to 10%', '10% to 50%', '50%+'],

  powerOutageColorScale: d3.scaleThreshold().domain([0, 0.15, 0.5, 1]).range([
    "rgb(15, 47, 128)", "rgb(15, 47, 128)", "rgb(15, 47, 128)", "rgb(15, 47, 128)"
  ]),

  mapboxActivityColorScale: mapboxActivity => {
    // let extent = d3.extent(mapboxActivity.map(r => r['activity_index_total']))
    return d3.scaleLinear().domain([0, 0.1]).range(["#51B8F9", "#51B8F9"])
  },

  // TODO: Consoldiate slug + general_type. Seems like it must be redundant,
  // but requires some detangling.
  healthcareFacilityTypes: [
    { sort_key: 1, slug: "Hospitals", general_type: "Hospitals", label: "Hospitals" },
    { sort_key: 2, slug: "Long-Term-Other", general_type: "Long Term / Other", label: "Long term / other healthcare" },
    { sort_key: 3, slug: "Outpatient", general_type: "Outpatient", label: "Outpatient healthcare" },
  ],

  globalInfraTypes: [
    { slug: "Schools", type: "school", label: "Schools" },
    { slug: "Airports", type: "airport", label: "Airports" },
    { slug: "Hospitals", type: "hospital", label: "Hospitals" },
  ],

  waterInfraTypes: [
    { slug: "Dams", type: "dam", label: "Dams" },
    { slug: "Hydropower", type: "hydropower", label: "Hydropower plants" }
  ],

  getHealthcareGeneralTypeColor: type => {
    if (type === "Hospitals") return "#F08557"
    if (type === "Outpatient") return "#7AC8FA"
    if (type === "Long Term / Other") return "#C667F3"
    return "#666"
  },

  healthcareFacilitySubtypes: [
    { subtype: "Acute Psychiatric Hospital", general_type: "Long Term / Other" },
    { subtype: "Adult Day Health Care", general_type: "Outpatient" },
    { subtype: "Ambulatory Surgical Center", general_type: "Outpatient" },
    { subtype: "Alternative Birthing Center", general_type: "Outpatient" },
    { subtype: "Chemical Dependency Recovery Hospital", general_type: "Long Term / Other" },
    { subtype: "Chronic Dialysis Clinic", general_type: "Outpatient" },
    { subtype: "Clinic", general_type: "Outpatient" }, // not in new list
    { subtype: "Community Clinic", general_type: "Outpatient" },
    { subtype: "Congregate Living Health Facility", general_type: "Long Term / Other" },
    { subtype: "Correctional Treatment Center", general_type: "Long Term / Other" },
    { subtype: "End Stage Renal Disease", general_type: "Outpatient" },
    { subtype: "Federally Qualified Health Center", general_type: "Outpatient" },
    { subtype: "Free Clinic", general_type: "Outpatient" },
    { subtype: "General Acute Care Hospital", general_type: "Hospitals" },
    { subtype: "Home Health Agency/Hospice", exclude: true },
    { subtype: "Hospice Facility", exclude: true },
    { subtype: "Hospice Facility-License Only", general_type: "Long Term / Other" },
    { subtype: "Hospital", general_type: "Hospitals" }, // not in new list
    { subtype: "Intermediate Care Facility", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled - Habilitative", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled - Nursing", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled", general_type: "Long Term / Other" },
    { subtype: "Intermediate Care Facility/Developmentally Disabled-Continuous Nursing", general_type: "Long Term / Other" },
    { subtype: "Long Term Care Facility", general_type: "Long Term / Other" }, // not in new list
    { subtype: "Outpatient Therapist Independent Practice", general_type: "Outpatient" },
    { subtype: "Outpatient/Speech Pathologist", general_type: "Outpatient" },
    { subtype: "Pediatric Day Health & Respite Care Facility", general_type: "Outpatient" },
    { subtype: "Physical Therapist Independent Practice", general_type: "Outpatient" },
    { subtype: "Psychiatric Health Facility", general_type: "Long Term / Other" },
    { subtype: "Psychology Clinic", general_type: "Outpatient" },
    { subtype: "Referral Agency", exclude: true },
    { subtype: "Rehabilitation Clinic", general_type: "Outpatient" },
    { subtype: "Rural Health Clinic", general_type: "Outpatient" },
    { subtype: "Skilled Nursing Facility", general_type: "Long Term / Other" },
    { subtype: "Surgical Clinic", general_type: "Outpatient" },
    { subtype: "Transplant Center", general_type: "Hospitals" },

    // Healthcare facilities with capacities categories:
    { subtype: "Childrens Hospitals", general_type: "Hospitals" },
    { subtype: "Critical Access Hospitals", general_type: "Hospitals" },
    { subtype: "Intermediate Care Facility-DD/H/N/CN/IID", general_type: "Long Term / Other" },
    { subtype: "Long Term", general_type: "Long Term / Other" },
    // { subtype: "Non Reporting", general_type: "Non-Reporting" },
    { subtype: "Other", general_type: "Long Term / Other" },
    { subtype: "Primary Care Clinic", general_type: "Outpatient" },
    { subtype: "Short Term", general_type: "Hospitals" },

    // HIFLD categories:
    { subtype: "ASSISTED LIVING", general_type: "Long Term / Other" },
    { subtype: "CHILDREN", general_type: "Hospitals" },
    { subtype: "CHRONIC DISEASE", general_type: "Hospitals" },
    { subtype: "CRITICAL ACCESS", general_type: "Hospitals" },
    { subtype: "GENERAL ACUTE CARE", general_type: "Hospitals" },
    { subtype: "LONG TERM CARE", general_type: "Long Term / Other" },
    { subtype: "MILITARY", general_type: "N/A" },
    { subtype: "NURSING HOME", general_type: "Long Term / Other" },
    { subtype: "PSYCHIATRIC", general_type: "Long Term / Other" },
    { subtype: "REHABILITATION", general_type: "N/A" },
    { subtype: "SPECIAL", general_type: "N/A" },
    { subtype: "WOMEN", general_type: "N/A" },
  ],

  reportMapImages: {
    width: '600px',
    height: '400px',
  },

  hurricaneTrackSizeScale: hurricaneTracks => {
    let dataExtent = d3.extent(hurricaneTracks.features, f => f.properties['MAXWIND'])
    return d3.scaleLinear().domain(dataExtent).range([0.5, 1.5])
  },

  knotToMph: (knots) => Math.round(knots * 1.151),

  getHurricaneCategory: (mph) => {
    const hurricaneWindScale = [
      // source: Saffir-Simpson Hurricane Wind Scale
      // https://www.nhc.noaa.gov/aboutsshws.php
      {minMph: 0, maxMph: 74, windSpeed: "Less than 74 mph", name: "-", damage: "N/A", damageDescription: ""},
      {minMph: 74, maxMph: 95, windSpeed: "74-95 mph", name: "Category 1", damage: "Minimal", damageDescription: "No significant structural damage, can uproot trees and cause some flooding in coastal areas."},
      {minMph: 96, maxMph: 110, windSpeed: "96-110 mph", name: "Category 2", damage: "Moderate", damageDescription: "No major destruction to buildings, can uproot trees and signs. Coastal flooding can occur. Secondary effects can include the shortage of water and electricity."},
      {minMph: 111, maxMph: 129, windSpeed: "111-129 mph", name: "Category 3", damage: "Extensive", damageDescription: "Structural damage to small buildings and serious coastal flooding to those on low lying land. Evacuation may be needed."},
      {minMph: 130, maxMph: 156, windSpeed: "130-156 mph", name: "Category 4", damage: "Extreme", damageDescription: "All signs and trees blown down with extensive damage to roofs. Flat land inland may become flooded. Evacuation probable."},
      {minMph: 157, maxMph: 9999, windSpeed: "157 or higher mph", name: "Category 5", damage: "Catastrophic", damageDescription: "Buildings destroyed with small buildings being overturned. All trees and signs blown down. Evacuation of up to 10 miles inland."},
    ]
    const mphRounded = Math.round(mph)
    const category = hurricaneWindScale.find(d => mphRounded >= d.minMph && mphRounded < d.maxMph)
    return category
  },

  timeFormatFBMobility: "YYYY-MM-DD_HHmm",
  timeFormatStandard: "YYYY-MM-DD HH:mm",
}

export const getAcsVariable = (title) => {
  return settings.acsVariables.find(v => v.title === title).variable
}
