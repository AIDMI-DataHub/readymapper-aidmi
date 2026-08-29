<template lang="html">
  <div>
    <div class="fb-mobility-legend">
      <div class="color-bar-headers">
        <div>departing</div>
        <div>arriving</div>
      </div>
      <div style="position: relative">
        <div className="color-bar">
          <div v-for="stop in popDensityStops" :key="stop" class="color-key">
            <div :style="{'background': popDensityColorScale(stop)}"></div>
            <div :style="{'background': popDensityColorScale(stop)}"></div>
            <div :style="{'background': popDensityColorScale(stop)}"></div>
            <div :style="{'background': popDensityColorScale(stop)}"></div>
            <div :style="{'background': popDensityColorScale(stop)}"></div>
            &nbsp;
          </div>
        </div>
        <div className="color-bar-labels">
          <div class="label-container" v-for="(label, index) in popDensityStopLabels" :key="label" >
            <span :style="{'background': popDensityColorScale(popDensityStops[index])}">
              {{label}}
            </span>  
          </div>
        </div>
      </div>
    </div>
    <div v-if="mobilityDataNotes" style="font-size: 12px;">
      <p>{{ mobilityDataNotes }}</p>
    </div>
  </div>
</template>

<script>
import { settings } from '../../constants/settings'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'PopDensityLegend',

  props: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'mobilityMode',
    ]),
    ...mapGetters([
      'mobilityDataInfo',
    ]),

    popDensityColorScale() {
      return settings.popDensityColorScale
    },
    popDensityStops() {
      return settings.popDensityStops
    },
    popDensityStopLabels() {
      return settings.popDensityStopLabels
    },
    mobilityDataNotes() {
      return this.mobilityDataInfo?.notes
    }
  }
}
</script>

<style lang="scss" scoped>
.fb-mobility-legend {
  position: relative;
}

.color-bar-headers {
  display: flex;
  gap: 2px;

  div {
    width: 100%;
    text-align: center;
    border-bottom: 1px solid;
    font-size: 10px;
    padding-bottom: 1px;
  }

  padding-bottom: 3px;
}

.color-bar, .color-bar-labels {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 18px;

  span {
    font-size: 12px;
    text-align: center;
  }
}

.color-bar-labels {
  position: absolute;
  width: 100%;
  height: 18px;
  top: 0px;
  font-weight: 500;
  color: white;

  .label-container {
    width: 100%;
    text-align: center;

    span {
      position: relative;
      top: -1px;
    }
  }
}

.color-key {
  width: 100%;
  height: 100%;
  display: flex;;

  div {
    width: 100%;
    height: 100%;
    border-radius: 20px;
  }
}
</style>
