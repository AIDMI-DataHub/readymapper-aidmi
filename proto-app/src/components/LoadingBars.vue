<template>
  <div class="loading-bars-container">
    <div v-if="selectedDisasterName" class="loading-header">Data layers for {{ selectedDisasterName }}</div>
    <div class="items">
      <div v-for="(progress, name) in loadProgress" :key="name" class="item">
        <div class="item-name">{{ name }}</div>
        <div class="item-progress">
          <div
            class="progress-bar"
            :class="{ complete: progress.complete, error: progress.error }"
            :style="{ width: progress.percentage != null ? `${progress.percentage}%` : `${(progress.count % 10) / 10 * 100}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'LoadingBars',
  computed: {
    ...mapState([
      'loadProgress',
    ]),
    ...mapGetters([
      'selectedDisasterName',
    ])
  },
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.loading-bars-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 300px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8em;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-name {
  flex: 1;
  text-align: left;
}

.item-progress {
  position: relative;
  display: flex;
  flex: 1;
}

.progress-bar {
  height: 4px;
  background: variables.$light-grey;
  transition: background 1s ease, width 0.2s ease;
}

.progress-bar.complete {
  background: variables.$dark-blue;
  width: 100% !important;
}

.progress-bar.error {
  background: #a30f05;
}
</style>
