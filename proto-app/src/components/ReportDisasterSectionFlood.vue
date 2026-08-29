<template>
  <div>
    <div class="chunk">
      <div class="chunk-title">Flood Impact on {{ dateHeader }}</div>

      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['disaster']" />
        <div class="map-legend">
          <MapLegendFlood :reportMode="true" />
          <p class="map-legend-subtitle">On {{ dateHeader }} with place selections.</p>
        </div>
      </div>
    </div>

    <div class="chunk" v-if="extentRows.length">
      <div class="chunk-title">Observed Flood Extent by Source</div>
      <ReportTable
        :titleStyle="'width: 230px !important;'"
        :columnNames="['Source', 'Area (km²)', 'As of', 'Coverage']"
        :rows="extentRows"
      />
    </div>

    <div class="chunk" v-if="exposureRows.length">
      <div class="chunk-title">Population Exposed to the Flood — UNOSAT (WorldPop 2026)</div>
      <ReportTable
        :titleStyle="'width: 210px !important;'"
        :columnNames="['Area', 'Pop. in analysed area', 'Flood extent (km²)', 'Population exposed']"
        :rows="exposureRows"
      />
      <p style="font-style: italic; font-size: 0.8em;">Residents within the observed flood extent (UNOSAT Charter #1052, imagery 26–27 Aug), by municipality.</p>
    </div>

    <div class="chunk" v-if="buildingRows.length">
      <div class="chunk-title">Building Damage by Source</div>
      <ReportTable
        :titleStyle="'width: 190px !important;'"
        :columnNames="['Source', 'As of', 'Buildings', 'Damage breakdown (source classes)']"
        :rows="buildingRows"
      />
      <p style="font-style: italic; font-size: 0.8em;">Map shows: {{ buildingSourceLabel }} · {{ buildingModeLabel }}.</p>
    </div>

    <div class="chunk" v-if="bridgeRows.length">
      <div class="chunk-title">Bridges Damaged — {{ bridgeSourceLabel }}</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="['Bridge', 'Status', 'Location']"
        :rows="bridgeRows"
      />
    </div>

    <div class="chunk" v-if="roadRows.length">
      <div class="chunk-title">Roads Damaged — {{ roadSourceLabel }}</div>
      <ReportTable
        :titleStyle="'width: 230px !important;'"
        :columnNames="roadColumns"
        :rows="roadRows"
      />
      <p style="font-style: italic; font-size: 0.8em;">Damaged length by grade (km). Undamaged segments excluded.</p>
    </div>

    <div class="chunk" v-if="hasInterestingGauges">
      <div class="chunk-title">Average Gauge Severity</div>

      <!-- counties -->
      <h5 class="chunk-subtitle">{{ this.disasterRegionTypes[1].namePlural }}</h5>
      <div class="line-chart-container">
        <div style="width: 150px;" class="line-chart-wrapper" v-for="(county, index) in reportCounties" :key="index">
          <FloodGaugeSummaryChart
            v-if="interestingGaugesInPolygon(county).length > 0"
            :height="80"
            :width="130"
            :numTicks="4"
            :circleRadius="3"
            :minValueCustom="0"
            :maxValueCustom="1"
            :floodGauges="interestingGaugesInPolygon(county)"
            :noMouseEvents="true"
          />
          <div class="no-chart-data" v-if="interestingGaugesInPolygon(county).length === 0">
            No gauges effected
          </div>
          <p>{{county.properties.rm_name}}</p>
        </div>
      </div>

      <!-- places -->
      <div v-if="reportPlaces?.length">
        <h5 class="chunk-subtitle">{{ this.disasterRegionTypes[0].namePlural }}</h5>
        <div class="line-chart-container">
          <div style="width: 150px;" class="line-chart-wrapper" v-for="(place, index) in reportPlaces" :key="index">
            <FloodGaugeSummaryChart
              v-if="interestingGaugesInPolygon(place).length > 0"
              :height="80"
              :width="130"
              :numTicks="4"
              :circleRadius="3"
              :minValueCustom="0"
              :maxValueCustom="1"
              :floodGauges="interestingGaugesInPolygon(place)"
              :noMouseEvents="true"
            />
            <div class="no-chart-data" v-if="interestingGaugesInPolygon(place).length === 0">
              No gauges effected
            </div>
            <p>{{place.properties.rm_name}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import dayjs from 'dayjs'
  import * as turf from '@turf/turf'

  import { settings } from '../../constants/settings'

  import ReportTable from './ReportTable.vue'
  import MapLegendFlood from './MapLegendFlood.vue'
  import FloodGaugeSummaryChart from './FloodGaugeSummaryChart.vue'

  export default {
    name: 'ReportDisasterSectionFlood',

    components: {
      ReportTable,
      MapLegendFlood,
      FloodGaugeSummaryChart
    },

    props: {
      dateHeader: String,
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages
      }
    },

    computed: {
      ...mapGetters([
        'selectedDisasterName',
        'reportPlaces',
        'reportCounties',
        'getPlaceOverlapWithPolygonArea',
        'disasterRegionTypes'
      ]),
      ...mapState([
        'selectedDateTime',
        'reportMapViews',
        'floodGauges',
        'floodExtentSources',
        'floodExtentSource',
        'buildingDamageSummary',
        'buildingDamageSource',
        'buildingDamageMode',
        'bridgeDamageSources',
        'bridgeDamageSource',
        'bridgeDamageBySource',
        'roadDamageSources',
        'roadDamageSource',
        'roadDamageBySource',
        'floodExposure',
      ]),

      hasInterestingGauges() {
        return (this.floodGauges || []).some(g => g.isInteresting)
      },

      // ---- Population exposed to the flood (UNOSAT / WorldPop) ----
      exposureRows() {
        const e = this.floodExposure
        if (!e?.rows?.length) return []
        const rows = e.rows
          .filter(r => r.level === 'municipality')
          .sort((a, b) => (b.pop_exposed || 0) - (a.pop_exposed || 0))
          .map(r => ({ title: r.name, values: [r.total_pop, r.flood_extent_km2, r.pop_exposed] }))
        if (e.total) {
          rows.push({ title: 'Total', values: [
            Math.round(e.total.total_pop), e.total.flood_extent_km2, Math.round(e.total.pop_exposed),
          ] })
        }
        return rows
      },

      // ---- Flood extent by source ----
      extentRows() {
        return (this.floodExtentSources || []).map(s => ({
          title: s.label + (s.key === this.floodExtentSource ? ' (shown on map)' : ''),
          values: [ s.area != null ? s.area : '—', s.updated || '—', s.note || '—' ],
        }))
      },

      // ---- Building damage by source (each source keeps its own honest classes) ----
      buildingRows() {
        const sum = this.buildingDamageSummary || {}
        return Object.keys(sum).map(k => {
          const s = sum[k]
          const breakdown = Object.entries(s.classes || {})
            .sort((a, b) => b[1] - a[1])
            .map(([l, c]) => `${l} ${c.toLocaleString()}`)
            .join(' · ')
          return {
            title: s.label + (k === this.buildingDamageSource ? ' (shown on map)' : ''),
            values: [ s.updated || '—', s.total, breakdown ],
          }
        })
      },
      buildingSourceLabel() {
        return (this.buildingDamageSummary?.[this.buildingDamageSource]?.label) || this.buildingDamageSource
      },
      buildingModeLabel() {
        return this.buildingDamageMode === 'hexagon' ? '0.1-mile hexagons' : 'individual footprints'
      },

      // ---- Bridges damaged (selected source) ----
      bridgeSourceLabel() {
        return (this.bridgeDamageSources || []).find(s => s.key === this.bridgeDamageSource)?.label || 'Bridges'
      },
      bridgeRows() {
        const src = (this.bridgeDamageBySource || {})[this.bridgeDamageSource]
        if (!src) return []
        return src.bridges
          .filter(b => b.status && b.status !== 'No visible damage')
          .sort((a, b) => this.gradeRank(a.status) - this.gradeRank(b.status))
          .map(b => ({
            title: b.name || 'Bridge',
            values: [
              b.status + (b.orig_label && b.orig_label !== b.status ? ` (${b.orig_label})` : ''),
              b.location || '—',
            ],
          }))
      },

      // ---- Roads damaged (selected source): length by grade ----
      roadSourceLabel() {
        return (this.roadDamageSources || []).find(s => s.key === this.roadDamageSource)?.label || 'Roads'
      },
      roadGradesPresent() {
        const src = (this.roadDamageBySource || {})[this.roadDamageSource]
        if (!src) return []
        const set = new Set()
        Object.values(src.byName).forEach(g => Object.keys(g).forEach(k => set.add(k)))
        // damage grades only (a "damaged roads" table shouldn't have a "No visible damage" column)
        return ['Destroyed', 'Damaged', 'Possibly damaged'].filter(g => set.has(g))
      },
      roadColumns() {
        return ['Road', ...this.roadGradesPresent.map(g => `${g} (km)`), 'Total (km)']
      },
      roadRows() {
        const src = (this.roadDamageBySource || {})[this.roadDamageSource]
        if (!src) return []
        const grades = this.roadGradesPresent
        return Object.entries(src.byName)
          .map(([name, byGrade]) => {
            const vals = grades.map(g => (byGrade[g] != null ? Math.round(byGrade[g] * 10) / 10 : 0))
            const total = Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10
            return { name, vals, total }
          })
          .filter(r => r.total > 0)
          .sort((a, b) => b.total - a.total)
          .map(r => ({ title: r.name, values: [...r.vals, r.total] }))
      },
    },

    methods: {
      ...mapMutations([
      ]),
      gradeRank(status) {
        return { 'Destroyed': 0, 'Damaged': 1, 'Possibly damaged': 2, 'No visible damage': 3 }[status] ?? 4
      },
      interestingGaugesInPolygon(feature) {
        return this.floodGauges.filter(g => g.isInteresting).filter(g => {
          return turf.booleanPointInPolygon(turf.point([parseFloat(g.lng), parseFloat(g.lat)]), feature)
        })
      },
    }
  }
</script>

<style lang="scss">
  .no-chart-data {
    height: 80px;
    width: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
</style>
