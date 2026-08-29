<template>
  <div class="news-panel">
    <div class="banner">{{ banner }}</div>

    <div class="section">
      <div class="title">Fact layer</div>
      <div class="radios">
        <label v-for="t in tables" :key="t.key" class="radio-row" :class="{ active: newsTable === t.key }">
          <input type="radio" name="news-table" :value="t.key" :checked="newsTable === t.key" @change="newsTable = t.key" />
          <span class="rlabel">{{ t.label }}</span>
          <span class="rcount">{{ count(t.key) }}</span>
        </label>
      </div>
      <p class="hint tap">Tap any marker for the source, quote and dates.</p>
    </div>

    <div class="section" v-if="statusLegend.length">
      <div class="title">{{ statusTitle }}</div>
      <div class="swatches">
        <div class="row" v-for="s in statusLegend" :key="s.value">
          <span class="sw" :style="{ background: s.color }"></span>{{ s.label }}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="title">Location certainty</div>
      <div class="swatches">
        <div class="row"><span class="conf high"></span>Exact place</div>
        <div class="row"><span class="conf medium"></span>Approximate</div>
        <div class="row"><span class="conf low"></span>Area only — hover shows the area</div>
      </div>
      <p class="hint">A number in a marker = several reports at that place.</p>
    </div>

    <p class="foot" v-if="withheldNote">{{ withheldNote }}</p>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  NEWS_TABLES, TABLE_LABELS, PALETTES, STATUS_FIELD, prettyStatus, NEWS_BANNER,
} from '../layers/news/palettes.js'

export default {
  name: 'NewsSourcesPanel',

  computed: {
    ...mapState(['newsFactSummary', 'newsUnplaced', 'newsMultiDistrict']),

    banner() { return NEWS_BANNER },

    newsTable: {
      get() { return this.$store.state.newsTable },
      set(v) { this.$store.commit('setNewsTable', v) },
    },

    tables() {
      return NEWS_TABLES.map(key => ({ key, label: TABLE_LABELS[key] }))
    },

    statusTitle() {
      const field = STATUS_FIELD[this.newsTable] || 'status'
      return `Colour — ${field.replace(/_/g, ' ')}`
    },

    // only statuses actually present in the selected table's current data, in palette order
    statusLegend() {
      const pal = PALETTES[this.newsTable] || {}
      const present = this.newsFactSummary?.[this.newsTable]?.statuses
      const values = present && present.length ? present : Object.keys(pal)
      return Object.keys(pal)
        .filter(v => values.includes(v))
        .map(v => ({ value: v, color: pal[v], label: prettyStatus(v) }))
    },

    withheldNote() {
      const u = this.newsUnplaced?.count
      const m = this.newsMultiDistrict?.count
      const parts = []
      if (u) parts.push(`${u} facts could not be placed on the map`)
      if (m) parts.push(`${m} span several districts`)
      return parts.length ? `${parts.join('; ')}.` : ''
    },
  },

  methods: {
    count(key) {
      const t = this.newsFactSummary?.[key]?.total
      return typeof t === 'number' ? t : '·'
    },
  },
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";

.news-panel {
  padding: 10px 15px 16px 15px;
  text-align: left;
  box-sizing: border-box;
  max-width: 100%;
  overflow-x: hidden;
}

.banner {
  font-size: 11.5px;
  line-height: 1.35;
  color: #4a3b00;
  background: #fff6d9;
  border: 1px solid #f0d98a;
  border-radius: 5px;
  padding: 7px 9px;
  margin-bottom: 12px;
}

.section {
  margin-bottom: 14px;

  .title {
    font-weight: bold;
    font-size: 13px;
    color: #000;
    margin-bottom: 7px;
  }
}

.radios {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;

  &:hover { background: #f4f4f4; }
  &.active { background: #f0f0f0; }

  input { cursor: pointer; margin: 0; flex-shrink: 0; }
  .rlabel { flex: 1; color: #222; }
  .rcount {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: variables.$grey;
    background: #ededed;
    border-radius: 9px;
    padding: 1px 7px;
    min-width: 22px;
    text-align: center;
    flex-shrink: 0;
  }
}

.swatches {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #333;
    line-height: 1.3;
  }
}

.sw {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.conf {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  flex-shrink: 0;
  box-sizing: border-box;

  &.high { background: #555; border: 1.5px solid #fff; }
  &.medium { background: radial-gradient(circle at center, #555 0 3px, #fff 3.5px 5px, #555 5.5px 6.5px); }
  &.low { background: #fff; border: 2px solid #555; }
}

.hint {
  font-size: 11px;
  color: variables.$grey;
  line-height: 1.4;
  margin: 7px 0 0 0;

  &.tap { color: #1a6c8c; }
}

.foot {
  font-size: 11px;
  color: variables.$grey;
  line-height: 1.4;
  border-top: 1px solid #eee;
  padding-top: 8px;
  margin: 4px 0 0 0;
}
</style>
