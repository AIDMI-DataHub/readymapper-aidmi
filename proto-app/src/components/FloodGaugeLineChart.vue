<template>
  <LineChart
    :data="this.floodGaugeTimeseriesNormalized"
    :displayData="this.floodGaugeTimeseriesRaw"
    :height="this.height"
    :width="this.width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="'YYYY-MM-DD'"
    :numTicks="this.numTicks"
    :color="'#EA3323'"
    :pointColor="(y) => this.pointColor(y)"
    :pointStrokeColor="(y, d) => d.isBefore(floodGaugeLastDownloadDate) ? '#FFFFFF' : '#000000'"
    :yMin="this.minValue"
    :yMax="this.maxValue"
    :displayZeroLine="true"
    :customMinDate="this.disasterDateStart"
    :customMaxDate="this.disasterDateEnd"
    :capMaxDateToDay="true"
    :gradientStops="[
      { offset: '0%', stopColor: '#EA3323', stopOpacity: '0.5' },
      { offset: '100%', stopColor: '#D8D8D8', stopOpacity: '0.3' }
    ]"
    :onDateChange="(dayjsDate) => this.$store.commit('setSelectedDateTime', dayjsDate.toDate())"
    :circleRadius="this.circleRadius"
    :tooltipHTML="(value, date) => this.tooltipHTML(value, date)"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import * as d3 from 'd3'

import { settings } from '../../constants/settings'
import { zipObject } from 'es-toolkit/array';

import dayjs from 'dayjs'

import LineChart from './LineChart.vue'

export default {
  props: {
    data: Object,
    height: Number,
    width: Number,
    numTicks: Number,
    circleRadius: Number,
    maxValueCustom: Number,
    maxType: String,  // global (all charts), local (this chart), or percentage
    chartIndex: Number,
    gaugeId: String
  },

  components: {
    LineChart,
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapGetters([
      'disasterDateStart',
      'disasterDateEnd',
    ]),
    ...mapState([
      'floodGauges',
      'disasterMetadata'
    ]),
    floodGaugeLastDownloadDate() {
      let downloads = this.disasterMetadata.gauges.downloads
      return dayjs(downloads[downloads.length - 1].date)
    },
    floodGaugeTimeseriesNormalized() {
      return zipObject(
        this.floodGauge.forecasts.map(row => dayjs(row.startTime).format('YYYY-MM-DD')),
        this.floodGauge.forecasts.map(row => row.normalizedValue)
      )
    },
    floodGaugeTimeseriesRaw() {
      return zipObject(
        this.floodGauge.forecasts.map(row => dayjs(row.startTime).format('YYYY-MM-DD')),
        this.floodGauge.forecasts.map(row => row.value)
      )
    },
    floodGauge() {
      return this.floodGauges.find(g => g.gauge_id === this.gaugeId)
    },
    d3() {
      return d3
    },
    maxValue() {
      // return Math.max(...Object.values(this.floodGaugeTimeseriesNormalized))
      return 1
    },
    minValue() {
      return 0
      return Math.min(...Object.values(this.floodGaugeTimeseriesNormalized))
    },
    yTicks() {
      const nearestMax = this.maxValue * 0.8
      // if (this.maxType === 'percentage') return [ { label: "100%", value: 0.9 } ]
      // if (nearestMax === 0) return [ { label: "0", value: 10 } ]
      // return [ { label: `${d3.format(",.2s")(this.maxValue)} acres`, value: nearestMax } ]
      let unit = "m<tspan dy='-5'>3</tspan><tspan dy='5'>/s</tspan>"
      if (this.floodGauge.gaugeValueUnit !== "CUBIC_METERS_PER_SECOND") {
        console.warn("unknown units", this.floodGauge.gaugeValueUnit)
        unit = "unknown units"
      }
      return [
        { label: `${d3.format(",.0s")(this.floodGauge.extremeDangerThreshold)} ${unit}`, value: nearestMax }
      ]
    },
  },

  methods: {

    pointColor(y) {
      return settings.floodGaugeColorScale(y)
    },

    tooltipHTML(value, date) {
      let unit = "m<sup>3</sup>/s"
      if (this.floodGauge.gaugeValueUnit !== "CUBIC_METERS_PER_SECOND") {
        console.warn("unknown units", this.floodGauge.gaugeValueUnit)
        unit = "unknown units"
      }
      return `
        <div style="font-size: 12px">
          <span style="font-weight: bold;">${date.format('MMM D')}:</span> ${d3.format(",.3s")(value)} ${unit}
        </div>
      `
    }

  }
}
</script>

<style lang="css" scoped>
</style>
