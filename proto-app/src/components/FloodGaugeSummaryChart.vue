<template>
  <LineChart
    :data="this.averageTimeseries"
    :height="this.height"
    :width="this.width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="'YYYY-MM-DD'"
    :numTicks="this.numTicks"
    :displayYTicks="this.maxType === 'local' ? true : chartIndex === 0"
    :yTicks="this.yTicks"
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
    :noMouseEvents="this.noMouseEvents"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import * as d3 from 'd3'

import { settings } from '../../constants/settings'
import { zipObject } from 'es-toolkit/array';
import { mean } from 'es-toolkit/math'

import dayjs from 'dayjs'

import LineChart from './LineChart.vue'

export default {
  props: {
    height: Number,
    width: Number,
    numTicks: Number,
    circleRadius: Number,
    maxValueCustom: Number,
    minValueCustom: Number,
    maxType: String,  // global (all charts), local (this chart), or percentage
    chartIndex: Number,
    floodGauges: Object,
    noMouseEvents: Boolean
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
      'disasterMetadata'
    ]),
    floodGaugeLastDownloadDate() {
      const downloads = this.disasterMetadata?.gauges?.downloads
      if (!downloads?.length) return null
      return dayjs(downloads[downloads.length - 1].date)
    },
    averageTimeseries() {
      // Guard against empty / not-yet-loaded gauges. Throwing here leaves a broken
      // vnode tree, and unmounting that tree on a tab switch then crashes Vue's
      // patcher ("null vnode"), aborting the whole legend update.
      const g0 = this.floodGauges?.[0]
      if (!g0?.forecasts) return {}
      return zipObject(
        g0.forecasts.map(row => dayjs(row.startTime).format('YYYY-MM-DD')),
        Object.keys(g0.forecasts).map(i => {
          return mean(this.floodGauges.map(g => g.forecasts[i].normalizedValue))
        })
      )
    },
    d3() {
      return d3
    },
    maxValue() {
      if (this.maxValueCustom) return this.maxValueCustom
      const vals = Object.values(this.averageTimeseries)
      return vals.length ? Math.max(...vals) + 0.01 : 1
    },
    minValue() {
      return this.minValueCustom !== null ? this.minValueCustom : Math.min(...Object.values(this.averageTimeseries))
    },
    yTicks() {
      // const nearestMax = this.maxValue * 0.8
      // // if (this.maxType === 'percentage') return [ { label: "100%", value: 0.9 } ]
      // // if (nearestMax === 0) return [ { label: "0", value: 10 } ]
      // // return [ { label: `${d3.format(",.2s")(this.maxValue)} acres`, value: nearestMax } ]
      // let unit = "m<tspan dy='-5'>3</tspan><tspan dy='5'>/s</tspan>"
      // if (this.floodGauge.gaugeValueUnit !== "CUBIC_METERS_PER_SECOND") {
      //   console.warn("unknown units", this.floodGauge.gaugeValueUnit)
      //   unit = "unknown units"
      // }
      // return [
      //   { label: `${d3.format(",.0s")(this.floodGauge.extremeDangerThreshold)} ${unit}`, value: nearestMax }
      // ]
    },
  },

  methods: {

    pointColor(y) {
      return settings.floodGaugeColorScale(y)
    },

    tooltipHTML(value, date) {
      let domain = settings.floodGaugeColorScale.domain()
      let severity = 'Normal'
      if (value > domain[1]) {
        severity = 'Warning'
      }
      if (value > domain[2]) {
        severity = 'Danger'
      }
      if (value > domain[3]) {
        severity = 'Extreme danger'
      }

      return `
        <div style="font-size: 12px">
          <span style="font-weight: bold;">${date.format('MMM D')}: </span>${severity}
        </div>
      `
    }

  }
}
</script>

<style lang="css" scoped>
</style>
