<template>
  <div class="loading-bars-button-wrapper">
    <div v-if="showBars" class="loading-bars-panel">
      <LoadingBars />
    </div>
    <button class="toggle-button" @click="showBars = !showBars">
      Data Status
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import LoadingBars from './LoadingBars.vue'

const showBars = ref(true)
const store = useStore()
const dataLoaded = computed(() => store.getters.dataLoaded)

watch(dataLoaded, (loaded) => {
  if (!loaded) {
    showBars.value = true
  } else {
    setTimeout(() => {
      if (dataLoaded.value) {
        showBars.value = false
      }
    }, 3000)
  }
})
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.loading-bars-button-wrapper {
  position: absolute;
  bottom: variables.$action-button-bottom;
  right: variables.$action-button-width + variables.$action-button-right + 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 20;
}

.loading-bars-panel {
  background: white;
  padding: 1rem;
  position: absolute;
  bottom: 3rem;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  border-radius: 6px;
  margin-bottom: 8px;
}

.toggle-button {
  height: variables.$action-button-height;
  background: variables.$orange;
  padding: 0 12px;
  cursor: pointer;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  font-size: 14px;
  white-space: nowrap;
  color: #fff;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 18px;
  font-weight: bold;
  width: 100%;
  border: none;
  border-radius: 6px;
}
</style>
