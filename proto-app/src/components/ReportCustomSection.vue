<template>
  <section class="section custom">
    <div class="chunk">
      <div class="main-section-title">Custom View</div>
      <div class="chunk-title">Selected Layers on {{ dateHeader }}</div>
      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['custom']" />
        <div class="map-legend">
          <p class="map-legend-subtitle">
            Custom layer combination<span v-if="zoomLabel"> at zoom {{ zoomLabel }}</span>.
          </p>
          <div v-if="visibleLayers.length">
            <p class="layers-heading">Layers shown</p>
            <ul class="custom-layer-list">
              <li v-for="l in visibleLayers" :key="l">{{ l }}</li>
            </ul>
          </div>
          <div v-if="hiddenInfraTypes.length" class="infra-note">
            Infrastructure types hidden: {{ hiddenInfraTypeLabels.join(', ') }}
          </div>
        </div>
      </div>
    </div>

    <div class="chunk">
      <ReportNotes :id="'custom'"/>
    </div>
  </section>
</template>

<script>
  import { mapState } from 'vuex'

  import { settings } from '../../constants/settings'
  import { layers } from '@/layers/index.ts'

  import ReportNotes from './ReportNotes.vue'

  export default {
    name: 'ReportCustomSection',

    components: {
      ReportNotes,
    },

    props: {
      dateHeader: String,
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages,
      }
    },

    computed: {
      ...mapState([
        'reportMapViews',
        'activeLayerIds',
        'hiddenMapLayerIds',
        'hiddenInfraTypes',
        'map',
      ]),

      visibleLayers() {
        const hidden = new Set(this.hiddenMapLayerIds)
        return layers
          .filter(l => this.activeLayerIds.includes(l.id) && (l.mapLayerIds?.length ?? 0) > 0)
          .filter(l => !l.mapLayerIds.some(id => hidden.has(id)))
          .map(l => l.loadLabel || l.id)
      },

      hiddenInfraTypeLabels() {
        const all = [...settings.globalInfraTypes, ...settings.waterInfraTypes]
        return this.hiddenInfraTypes.map(t => (all.find(x => x.type === t) || {}).label || t)
      },

      zoomLabel() {
        const z = this.map?.getZoom?.()
        return z != null ? z.toFixed(1) : null
      },
    },
  }
</script>

<style lang="scss" scoped>
  .custom-layer-list {
    margin: 0.25em 0 0;
    padding-left: 1.1em;
    font-size: 0.85em;
    li { margin: 0.1em 0; }
  }
  .layers-heading {
    font-weight: bold;
    margin: 0.5em 0 0.1em;
    font-size: 0.85em;
  }
  .infra-note {
    font-size: 0.8em;
    font-style: italic;
    margin-top: 0.5em;
    color: #666;
  }
</style>
