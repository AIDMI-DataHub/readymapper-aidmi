import * as d3 from 'd3'
import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import { keyBy } from 'es-toolkit/array';
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

const ICON_SIZE = 32
const SEVERITY_COLORS = {
  extreme: '#992727',
  danger: '#ed8b52',
  warning: '#eace14',
  normal: '#54BE56',
  nodata: '#cccccc',
}
const TRENDS = ['rising', 'falling', 'constant']

async function generateGaugeIcons(map) {
  const trendImages = {}
  await Promise.all(TRENDS.map(trend => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => { trendImages[trend] = img; resolve() }
    img.onerror = () => resolve()
    img.src = new URL(`../assets/img/flood-gauge-${trend}.png`, import.meta.url).href
  })))

  const combinations = [
    ...Object.keys(SEVERITY_COLORS).filter(s => s !== 'nodata').flatMap(severity =>
      TRENDS.map(trend => ({ severity, trend }))
    ),
    { severity: 'nodata', trend: null },
  ]

  for (const { severity, trend } of combinations) {
    const iconName = `gauge-${severity}-${trend ?? 'nodata'}`
    if (map.hasImage(iconName)) continue

    const canvas = document.createElement('canvas')
    canvas.width = ICON_SIZE
    canvas.height = ICON_SIZE
    const ctx = canvas.getContext('2d')

    const r = ICON_SIZE / 2 - 2
    ctx.beginPath()
    ctx.arc(ICON_SIZE / 2, ICON_SIZE / 2, r, 0, Math.PI * 2)
    ctx.fillStyle = SEVERITY_COLORS[severity]
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2.5
    ctx.stroke()

    if (trend && trendImages[trend]) {
      const arrowW = 14, arrowH = 18
      ctx.drawImage(trendImages[trend], (ICON_SIZE - arrowW) / 2, (ICON_SIZE - arrowH) / 2, arrowW, arrowH)
    }

    map.addImage(iconName, ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE))
  }
}

// Returns a Mapbox expression for the composite icon name at a given forecast array index.
// Higher-severity icons also get a higher symbol-sort-key so they render on top.
function iconImageExpression(forecastIndex) {
  const nv = ['to-number', ['coalesce', ['get', 'normalizedValue', ['at', forecastIndex, ['get', 'forecasts']]], -1]]
  const severity = ['case',
    ['>=', nv, 1.0], 'extreme',
    ['>=', nv, 0.7], 'danger',
    ['>=', nv, 0.3], 'warning',
    ['>=', nv, 0.0], 'normal',
    'nodata',
  ]
  const trend = ['coalesce', ['get', 'trend', ['at', forecastIndex, ['get', 'forecasts']]], 'nodata']
  return ['concat', 'gauge-', severity, '-', trend]
}

function sortKeyExpression(forecastIndex) {
  return ['to-number', ['coalesce', ['get', 'normalizedValue', ['at', forecastIndex, ['get', 'forecasts']]], 0]]
}

export const floodGaugesLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/gauges/gauges.csv`
    let floodGauges = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    const forecastDates = Object.keys(floodGauges[0]).filter(k => k.startsWith('v_'))

    for (let gauge of floodGauges) {
      let normalize = d3.scaleLinear().domain([
        0, gauge.warningThreshold, gauge.dangerThreshold, gauge.extremeDangerThreshold
      ]).range([0, 0.3, 0.7, 1.0])

      gauge.forecasts = forecastDates
        .slice(0, forecastDates.length - 1)
        .map((key, index) => {
          let forecastValue = parseFloat(gauge[key])
          let forecastDate = key.substring(2)
          let nextForecastValue = parseFloat(gauge[forecastDates[index + 1]])
          let trend = 'constant'
          let forecastedPercentChange = (nextForecastValue - forecastValue) / gauge.warningThreshold
          if (forecastedPercentChange > 0.05) trend = 'rising'
          else if (forecastedPercentChange < -0.05) trend = 'falling'
          // if (nextForecastValue > forecastValue) trend = 'rising'
          // else if (nextForecastValue < forecastValue) trend = 'falling'
          return {
            value: forecastValue,
            normalizedValue: normalize(forecastValue),
            startTime: forecastDate,
            trend,
          }
        })

      gauge.isInteresting = gauge.forecasts.map(f => f.normalizedValue).filter(v => v > 0.3).length > 0
    }

    return floodGauges
  },

  async addLayer(map, floodGauges, store, beforeId) {
    if (!floodGauges.length) return

    await generateGaugeIcons(map)

    console.log("Adding flood gauge layer")

    const gaugeData = turf.featureCollection(
      floodGauges
        .map(row => {
          try {
            return turf.point([parseFloat(row.lng), parseFloat(row.lat)], row)
          } catch (e) {
            return null
          }
        })
        .filter(point => !!point)
    )

    const id = 'flood-gauges'

    map.addSource(id, {
      type: 'geojson',
      data: gaugeData,
    })

    map.addLayer({
      id: 'unaffected-flood-gauges',
      type: 'symbol',
      source: id,
      filter: [
        'all',
        ['>=', ['zoom'], 8],
        ['!', ['get', 'isInteresting']],
      ],
      layout: {
        'icon-allow-overlap': true,
        'icon-image': iconImageExpression(0),
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.35,
          8, 0.6,
          13, 1.6,
        ],
        'icon-anchor': 'center',
        'symbol-sort-key': sortKeyExpression(0),
      },
    }, beforeId)

    // Single symbol layer — circle and trend arrow composited into one icon per feature
    // so features stack atomically (a gauge's circle never appears above another gauge's arrow).
    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      filter: ['get', 'isInteresting'],
      layout: {
        'icon-allow-overlap': true,
        'icon-image': iconImageExpression(0),
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.35,
          8, 0.6,
          13, 1.6,
        ],
        'icon-anchor': 'center',
        'symbol-sort-key': sortKeyExpression(0),
      },
    }, beforeId)

    map.addSource('selected-flood-gauge', {
      type: 'geojson',
      data: turf.featureCollection([]),
    })

    map.addLayer({
      id: 'selected-flood-gauge-symbol',
      type: 'symbol',
      source: 'selected-flood-gauge',
      layout: {
        'icon-allow-overlap': true,
        'icon-image': iconImageExpression(0),
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.35,
          8, 0.6,
          13, 1.6,
        ],
        'icon-anchor': 'center',
      },
    })

    map.addLayer({
      id: 'selected-flood-gauge-stroke',
      type: 'circle',
      source: 'selected-flood-gauge',
      paint: {
        'circle-color': 'black',
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          4, 8,
          8, 12,
          13, 28,
        ],
        'circle-stroke-color': 'black',
      },
    }, 'selected-flood-gauge-symbol')
  },

  updateLayer(map, store) {
    const floodGauges = store.state.floodGauges;
    const selectedDateTime = store.state.selectedDateTime;

    if (!map.getLayer('flood-gauges')) return;
    if (!floodGauges?.length) return;

    const gaugeForecastDates = floodGauges[0].forecasts.map(f => f.startTime);
    const nearestGaugeForecastIndex = d3.bisector(dateString => dayjs(dateString).toDate())
      .center(gaugeForecastDates, selectedDateTime);

    map.setLayoutProperty('flood-gauges', 'icon-image', iconImageExpression(nearestGaugeForecastIndex));
    map.setLayoutProperty('unaffected-flood-gauges', 'icon-image', iconImageExpression(nearestGaugeForecastIndex));
    map.setLayoutProperty('selected-flood-gauge-symbol', 'icon-image', iconImageExpression(nearestGaugeForecastIndex));
    map.setLayoutProperty('flood-gauges', 'symbol-sort-key', sortKeyExpression(nearestGaugeForecastIndex));

    if (store.state.selectedGaugeId) {
      const gauge = store.getters.selectedFloodGauge
      map.getSource('selected-flood-gauge').setData(turf.featureCollection([
        turf.point([parseFloat(gauge.lng), parseFloat(gauge.lat)], gauge)
      ]))
    } else {
      map.getSource('selected-flood-gauge').setData(turf.featureCollection([]))
    }

    if (store.state.currentTab === 'disaster') {
      helpers.showLayers(map, ['selected-flood-gauge']);
    } else {
      helpers.hideLayers(map, ['selected-flood-gauge']);
    }
  },
}
