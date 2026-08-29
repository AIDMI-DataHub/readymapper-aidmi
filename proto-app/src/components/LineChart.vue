<template>
  <div class="line-chart" :style="{ 'margin-left': -xPadding + 'px' }">
    <svg
      :width="width + xPadding * 2"
      :height="height"
      v-if="timeseries"
      :class="{ dragging }"
      @mouseenter="plotHovered = true"
      @mouseleave="plotHovered = false; onPointLeave()"
      @mousemove="onPlotMouseMove"
    >
      <defs v-if="gradientStops">
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop v-for="(stop, index) in gradientStops" :key="index"
            :offset="stop.offset"
            :stop-color="stop.stopColor"
            :stop-opacity="stop.stopOpacity" />
        </linearGradient>
      </defs>

      <rect
        :x="0"
        :y="0"
        :height="height - yPadding * 2"
        :width="width"
        class="bg"
      />

      <g class="ticks" v-for="t in tickLabels" :key="t.d.valueOf()" :transform="'translate(' + xScale(t.d) + ','+ height +')'">
        <text class="dates" :dy="-2" text-anchor="middle">
          {{ t.label }}
        </text>
      </g>

      <g>
        <line class="tick-line" v-for="t in dates" :key="t.valueOf()"
              :x1="xScale(t)" :x2="xScale(t)" :y1="0" :y2="height - yPadding * 2 - 2" />
      </g>

      <path v-if="gradientStops" id="area" :d="area" :style="`fill: url(#${gradientId})`" />

      <line
        id="current"
        :x1="xScale(currentMoment)"
        :x2="xScale(currentMoment)"
        :y1="0"
        :y2="height - yPadding * 2 - 2"
      />

      <line
        v-if="displayZeroLine"
        id="zero-line"
        :x1="xScale(minDate)"
        :x2="xScale(maxDate)"
        :y1="yScale(0)"
        :y2="yScale(0)"
      />

      <path id="line" :d="line" :style="'stroke:' + lineColor"/>
      <g
        :key="'clickableDate' + clickableDate"
        v-for="clickableDate in clickableDates"
        :transform="translateDate(clickableDate)"
      >
        <circle v-if="pointStrokeColor"
          :r="circleRadius + 1"
          class="clickableDate"
          :style="'fill:' + pointStrokeColor(y(clickableDate), clickableDate)"
        />
        <circle v-if="hoveredDate && clickableDate.isSame(hoveredDate)"
          :r="circleRadius + 2"
          class="clickableDate"
          :style="'fill: black'"
        />
        <circle
          :r="circleRadius"
          class="clickableDate"
          :style="'fill:' + (pointColor ? pointColor(y(clickableDate)) : lineColor)"
        />
        <circle
          :r="circleRadius * 0.7"
          class="clicktarget"
        />
      </g>

      <g class="yTick" :class="{ visible: plotHovered || displayYTicks }" :key="'yTick' + tick.value" v-for="tick in yTicks" :transform="translateY(tick.value)">
        <text style="font-size: 11px;" x="4" dominant-baseline="middle" v-html="tick.label"></text>
      </g>

    </svg>
  </div>
</template>

<script>
import * as d3 from "d3"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import { mapState, mapGetters, mapMutations } from 'vuex'

dayjs.extend(advancedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export default {
  name: "LineChart",
  props: {
    // v: Object,
    width: Number,
    height: Number,
    data: Object,
    displayData: Object,
    yPadding: Number,
    xPadding: Number,
    dateFormat: String,
    numTicks: Number,
    color: String,
    pointColor: Function,
    pointStrokeColor: Function,
    yMin: Number,
    yMax: Number,
    yTicks: Array,
    displayZeroLine: Boolean,
    customMinDate: Date,
    customMaxDate: Date,
    capMaxDateToDay: Boolean,
    customCurve: Function,
    gradientStops: Array,
    onDateChange: Function,
    displayYTicks: Boolean,
    circleRadius: {
      default: 3.5,
      type: Number,
    },
    tooltipHTML: Function,
    noMouseEvents: Boolean
  },

  data() {
    return {
      dragging: false,
      hovered: false,
      plotHovered: false,
      gradientId: Math.floor(Math.random() * 1000),
      hoveredDate: null
    };
  },

  methods: {
    ...mapMutations([
      'setTooltipHTML',
      'clearTooltipHTML'
    ]),
    handleMouseMove(e) {
      if (!this.dragging) return;
      this.onDateChange(dayjs(this.xScale.invert(e.offsetX)));
    },

    handleTouchMove(e) {
      if (!this.dragging) return;
      const touch = e.targetTouches[0];
      let x = touch.clientX - touch.target.getBoundingClientRect().x;

      const [min, max] = this.xScale.range();
      if (x < min) x = min;
      if (x > max) x = max;
      this.onDateChange(dayjs(this.xScale.invert(x)));
    },

    startDragging(e) {
      this.dragging = true;
      this.onDateChange(dayjs(this.xScale.invert(e.offsetX)));
    },

    stopDragging() {
      this.dragging = false;
    },

    onPointEnter(d) {
      if (!this.tooltipHTML) {
        return
      }
      this.hoveredDate = d
      let displayValue = this.displayData ? this.yRaw(d) : this.y(d)
      this.setTooltipHTML(this.tooltipHTML(displayValue, d))
    },

    onPointLeave() {
      this.hoveredDate = null
      this.clearTooltipHTML()
    },

    onPlotMouseMove(e) {
      if (this.noMouseEvents) return
      let date = this.xScale.invert(e.offsetX)
      let nearestClickableDate = d3.bisectCenter(this.dates, date)
      this.onPointEnter(this.dates[nearestClickableDate])
    },

    parseDate(d) {
      if (typeof d === 'string') {
        return dayjs(d, this.dateFormat)
      } else {
        return dayjs(d)
      }
    },

    translateDate(date) {
      const x = this.xScale(date);
      const y = this.yScale(this.y(date));
      return `translate(${x}, ${y})`;
    },

    translateY(value) {
      return `translate(0, ${this.yScale(value)})`
    },

    y(date) {
      return this.timeseries[date.format(this.dateFormat)]
    },

    yRaw(date) {
      return this.timeseriesRaw[date.format(this.dateFormat)]
    }
  },

  computed: {
    date() {
      return this.$store.state.selectedDateTime
    },

    timeseries() {
      if (!this.data) return null

      if (this.customMinDate && this.customMaxDate) {
        const timeseriesDates = Object.keys(this.data).sort().map(d => this.parseDate(d))
          .filter(d => d.isSameOrAfter(this.customMinDate, 'day') && d.isSameOrBefore(this.customMaxDate, 'day'))
        const timeseriesDatesKeys = timeseriesDates.map(d => d.format(this.dateFormat))
        const filteredData = {}
        for (const key of timeseriesDatesKeys) {
          filteredData[key] = this.data[key]
        }
        return filteredData
      }

      return this.data
    },

    timeseriesRaw() {
      if (!this.displayData) return null
      
      if (this.customMinDate && this.customMaxDate) {
        const timeseriesDates = Object.keys(this.displayData).sort().map(d => this.parseDate(d))
          .filter(d => d.isSameOrAfter(this.customMinDate, 'day') && d.isSameOrBefore(this.customMaxDate, 'day'))
        const timeseriesDatesKeys = timeseriesDates.map(d => d.format(this.dateFormat))
        const filteredData = {}
        for (const key of timeseriesDatesKeys) {
          filteredData[key] = this.displayData[key]
        }
        return filteredData
      }

      return this.displayData
    },

    lineColor() {
      return this.color
    },

    times() {
      return Object.keys(this.timeseries).sort();
    },

    // timeseriesDateField() {
    //   return this.v.timeseriesDateField;
    // },

    currentMoment() {
      return this.parseDate(this.date);
    },

    min() {
      let ts = this.timeseries;
      return d3.min(Object.values(ts).filter((v) => !isNaN(v)));
    },

    max() {
      let ts = this.timeseries;
      return d3.max(Object.values(ts).filter((v) => !isNaN(v)));
    },

    minDate() {
      return this.customMinDate ? this.parseDate(this.customMinDate) : this.parseDate(this.times[0]);
    },

    maxDate() {
      if (this.customMaxDate) {
        // below, we cap the max hour to zero because we only have one fire perimeter per day
        return this.capMaxDateToDay ? this.parseDate(this.customMaxDate).hour(0) : this.parseDate(this.customMaxDate)
      }
      return this.parseDate(this.times.slice(-1)[0]);
    },

    dates() {
      return this.times
        .map(t => this.parseDate(t))
    },

    tickLabels() {
      let formatDates = dates => {
        return dates.map((d, i) => {
          let label = d.format("D")
          if (i > 1 && dates[i - 1].month() !== d.month()) {
            label = d.format("MMM D")
          }
          return { d, label }
        })
      }

      const roundToNearestDay = (d) => {
        // If hour is >= 12, add 1 day to round up, otherwise stay on current day
        const dayToAdd = d.hour() >= 12 ? 1 : 0;
        return d.add(dayToAdd, 'day').startOf('day');
      }
      
      if (this.numTicks) {
        let min = this.minDate.toDate()
        let max = this.maxDate.toDate()
        let rangeMax = this.maxDate.add(1, 'day').toDate()
        let dates = d3.range(min, rangeMax, (max - min) / (this.numTicks - 1))
          .map(d => this.parseDate(d))

        return formatDates(dates)
      } else {
        // return this.dates
        const dates = [...new Set(this.dates.map(d => dayjs(d).format('YYYY-MM-DD')))]
          .map(d => dayjs(d))
        
        return formatDates(dates)
      }
    },

    clickableDates() {
      let dates = this.dates;
      return dates
        .filter(d => !isNaN(this.timeseries[d.format(this.dateFormat)]));
    },

    xScale() {
      let { minDate, maxDate, width, xPadding } = this;
      const scale = d3
        .scaleLinear()
        .domain([minDate, maxDate])
        .range([2 + xPadding, width - 2 + xPadding])
        .clamp(true)
      return scale;
    },

    yScale() {
      let { min, max, height, yPadding } = this;

      const scale = d3
        .scaleLinear()
        .domain([this.yMin !== undefined ? this.yMin : min, this.yMax !== undefined ? this.yMax : max])
        .range([height - yPadding * 2, 4])
        .clamp(true);
      return scale;
    },

    line() {
      let timeseries = this.timeseries;
      let line = d3
        .line()
        .x(d => this.xScale(this.parseDate(d)))
        .y(d => this.yScale(timeseries[d]));

      if (this.customCurve) {
        line.curve(this.customCurve)
      }

      const validDates = Object.keys(timeseries)
        .sort()
        .filter((k) => !isNaN(timeseries[k]));

      return line(validDates);
    },

    area() {
      let { min, max, height, yPadding } = this;
      let timeseries = this.timeseries;
      let area = d3
        .area()
        .x(d => this.xScale(this.parseDate(d)))
        .y1(d => this.yScale(timeseries[d]))
        .y0(height - yPadding * 2)


      if (this.customCurve) {
        area.curve(this.customCurve)
      }

      const validDates = Object.keys(timeseries)
        .sort()
        .filter((k) => !isNaN(timeseries[k]));

      return area(validDates);
    }

  },
};
</script>

<style scoped lang="scss">
@use "../variables.scss";
.line-chart {
  margin-bottom: 0.25em;
}

svg {
  margin-bottom: 0.25em;

  line, path {
    pointer-events: none;
  }

  &.dragging {
    g {
      pointer-events: none;
    }
  }
}

path {
  fill: none;
  stroke-width: 1px;
}

#current {
  stroke: variables.$dark-blue;
  stroke-width: 2px;
}

#zero-line {
  stroke: #adadad;
  stroke-width: 1px;
}

.clickableDate {
  stroke-width: 1px;
  fill: white;
}

.clicktarget {
  fill: rgba(0, 0, 0, 0);
  stroke: rgba(0, 0, 0, 0);
  stroke-width: 10px;
  // cursor: pointer;
}

.navigation {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  padding-left: 1em;
  padding-right: 1em;

  .left,
  .right {
    width: 16px;
    height: 16px;
    cursor: pointer;

    img {
      height: 100%;
    }
  }
}

line.tick-line {
  stroke: #D8D8D8;
  stroke-width: 1px;
  stroke-dasharray: 2px;
}

text.dates {
  font-size: 11px;
  fill: variables.$grey;
  text-transform: uppercase;
  font-weight: medium;
  user-select: none;
}

.bg {
  fill: none;
}

.yTick {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  user-select: none;

  &.visible {
    opacity: 1;
  }
}
</style>
