<template>
  <LineChart
    :data="processedData"
    :height="height"
    :width="width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="timeFormat"
    :numTicks="numTicks"
    :displayYTicks="displayYTicks"
    :color="'#1c1b1c'"
    :pointColor="popDensityColorScale"
    :yMin="-75"
    :yMax="75"
    :yTicks="popDensityYTicks"
    :displayZeroLine="true"
    :customMinDate="disasterDateStart"
    :customMaxDate="disasterDateEnd"
    :onDateChange="(dayjsDate) => $store.commit('setSelectedDateTime', dayjsDate.toDate())"
    :circleRadius="circleRadius"
  />
</template>

<script>
import { mapGetters } from 'vuex'

import { settings } from '../../constants/settings.js'
import LineChart from './LineChart.vue'

export default {
  props: {
    data: Object,
    height: Number,
    width: Number,
    numTicks: Number,
    displayYTicks: Boolean,
    circleRadius: Number,
  },

  components: {
    LineChart,
  },

  data() {
    return {
      popDensityColorScale: settings.popDensityColorScale,
      popDensityYTicks: [
        { label: '-75%', value: -65 },
        { label: ' 0%', value: 0 },
        { label: '+75%', value: 65 }
      ],
    }
  },

  computed: {
    ...mapGetters([
      'disasterDateStart',
      'disasterDateEnd',
    ]),

    timeFormat() {
      return settings.timeFormatFBMobility;
    },

    processedData() {
      const obj = {}
      Object.keys(this.data).forEach(key => {
        obj[key] = this.data[key]['percent_change']
      })
      return obj
    },
  },
}
</script>

<style lang="css" scoped>
</style>
