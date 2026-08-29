<template>
  <div
    :class="`timeslider-wrapper
      ${navbarOpen ? 'nav-open' : 'nav-closed'}
      ${pickMapViewScreen ? 'hidden' : ''}
    `"
  >
    <div class="timeslider-container">
      <div class="playback-controls">
        <button v-on:click="stepBackward">
          <img src="@/assets/img/skip-backward.svg">
        </button>
        <button v-on:click="play">
          <img v-if="!playing" src="@/assets/img/play-icon.svg">
          <img v-if="playing" src="@/assets/img/pause-icon.svg">
        </button>
        <button v-on:click="stepForward">
          <img src="@/assets/img/skip-forward.svg">
        </button>
      </div>

      <input type="range" min="0" :max="maxCurrentDateTimeIndex" v-model.lazy="currentDateTimeIndex" :disabled="playing">

      <p class="date-label">{{displayTime}}</p>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import dayjs from 'dayjs'

dayjs.extend(utc)
dayjs.extend(timezone)

export default {
  name: 'Timeslider',

  components: {
  },

  data() {
    return {
      currentDateTimeIndex: 0,
      autoplayTimeout: null,
    }
  },

  computed: {
    ...mapState([
      'selectedDateTime',
      'dataReportingIntervalHours',
      'navbarOpen',
      'pickMapViewScreen',
      'playing',
    ]),
    ...mapGetters([
      'selectedDateString',
      'disasterDateStart',
      'disasterDateEnd',
      'disasterDatesScale',
      'disasterDatesScaleString',
      'disasterDisplayTimeZone',
    ]),
    displayTime() {
      let datetime = dayjs(this.selectedDateTime)

      if (this.disasterDisplayTimeZone) {
        datetime = datetime.tz(this.disasterDisplayTimeZone)
      }

      return datetime.format('ddd, MMM D, YYYY HH:mm z')
    },
    maxCurrentDateTimeIndex() {
      return this.disasterDatesScale?.length - 1
    },
  },

  watch: {
    currentDateTimeIndex(value) {
      const datetime = this.disasterDatesScale[value]
      this.$store.commit('setSelectedDateTime', datetime)
    },
    selectedDateString(value) {
      this.currentDateTimeIndex = this.disasterDatesScaleString.indexOf(value)
    },
    maxCurrentDateTimeIndex(value) {
      // start disaster from latest date available
      // but only if there's no date in the query string
      if (this.$route.query?.date) return null
      this.currentDateTimeIndex = value

      if (this.autoplayTimeout) clearTimeout(this.autoplayTimeout)
      this.playing = false
      this.autoplayTimeout = setTimeout(() => {
        this.autoplayTimeout = null
        this.currentDateTimeIndex = 0
        this.play()
      }, 2000)
    },
    async playing(playing) {
      if (!playing) return
      
      if (this.currentDateTimeIndex === this.maxCurrentDateTimeIndex) {
        // if at end of timeline, restart to zero
        // (we set to -1 because it will get a +1 in the next lines,
        // and the timer will start counting after that).
        this.currentDateTimeIndex = -1
      }

      while (this.currentDateTimeIndex < this.maxCurrentDateTimeIndex && this.playing) {
        this.currentDateTimeIndex = Number(this.currentDateTimeIndex) + 1
        await new Promise(r => { setTimeout(r, 1000); })
      }
      if (this.currentDateTimeIndex === this.maxCurrentDateTimeIndex) {
        this.stopPlayback()
      }
    }
  },

  beforeUnmount() {
    if (this.autoplayTimeout) clearTimeout(this.autoplayTimeout)
  },

  methods: {
    ...mapMutations([
      'togglePlayback',
      'stopPlayback'
    ]),
    
    play() {
      this.togglePlayback()
    },

    stepForward() {
      if (this.currentDateTimeIndex < this.maxCurrentDateTimeIndex) {
        this.currentDateTimeIndex = Number(this.currentDateTimeIndex) + 1
      }
    },

    stepBackward() {
      if (this.currentDateTimeIndex > 0) {
        this.currentDateTimeIndex = Number(this.currentDateTimeIndex) - 1
      }
    },
  }
}
</script>

<style lang="scss" scoped>
@use '../variables.scss';

.nav-closed {
  left: variables.$nav-bar-closed-width + variables.$map-menu-width + 2 * variables.$nav-bar-gap;
}
.nav-open {
  left: variables.$nav-bar-width + variables.$map-menu-width + 2 * variables.$nav-bar-gap;
}

.timeslider-wrapper {
  position: absolute;
  z-index: 1;
  top: variables.$map-nav-top;
  right: 20px;

  .timeslider-container {
    background: #fff;
    box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
    border-radius: 6px;
    padding: 15px;
    display: flex;
    align-items: center;
    height: 43px;
    box-sizing: border-box;
  }

  input {
    width: 100%;
    margin: 0 16px;
  }

  p {
    margin: 0;
    min-width: 190px;
    white-space: nowrap;
    flex-shrink: 0;
    font-weight: bold;
    font-size: 14px;
  }
}

.playback-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.hidden {
  visibility: hidden;
}
</style>
