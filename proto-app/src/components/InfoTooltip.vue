<template>
  <span v-if="tooltipText || datasetMetadata" class="info-tooltip" ref="icon" @mouseenter="show" @mouseleave="hideIfUnpinned" @click.stop="pin">
    <span class="info-icon" aria-label="More information">
      <img src="@/assets/img/info-tooltip-icon.svg" />
    </span>
    <Teleport to="body">
      <span
        v-if="visible"
        class="info-tooltip-text"
        role="tooltip"
        :style="tooltipStyle"
      >
        <span v-if="tooltipText">{{ tooltipText }}</span>
        <span v-if="datasetMetadata" class="info-tooltip-metadata">
          <span>Source: <a :href="datasetMetadata.source_url" target="_blank" rel="noopener">{{ datasetMetadata.source_name }}</a></span>
          <span v-if="lastDownloadDate">Last updated: {{ lastDownloadDate }}</span>
        </span>
      </span>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import tooltips from '../tooltips.json'

const props = defineProps<{ tooltipKey: string }>()
const store = useStore()

const icon = ref<HTMLElement | null>(null)
const visible = ref(false)
const pinned = ref(false)
const tooltipStyle = ref<Record<string, string>>({})

const tooltipEntry = computed(() => tooltips[props.tooltipKey as keyof typeof tooltips] as { text?: string; metadataKey?: string } | undefined)
const tooltipText = computed(() => tooltipEntry.value?.text)
const metadataKey = computed(() => tooltipEntry.value?.metadataKey)
const datasetMetadata = computed(() => metadataKey.value ? store.state.disasterMetadata?.[metadataKey.value] : null)
const lastDownloadDate = computed(() => {
  const downloads = datasetMetadata.value?.downloads
  if (!downloads?.length) return null
  const last = downloads[downloads.length - 1].date
  return last ? new Date(last).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null
})

function updatePosition() {
  const rect = icon.value!.getBoundingClientRect()
  tooltipStyle.value = {
    top: `${rect.bottom + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
  }
}

function show() {
  updatePosition()
  visible.value = true
}

function hideIfUnpinned() {
  if (!pinned.value) visible.value = false
}

function pin() {
  updatePosition()
  pinned.value = true
  visible.value = true
  document.addEventListener('click', unpin)
}

function unpin() {
  pinned.value = false
  visible.value = false
  document.removeEventListener('click', unpin)
}

onUnmounted(() => document.removeEventListener('click', unpin))
</script>

<style lang="scss" scoped>
.info-tooltip {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
}

.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  user-select: none;
  flex-shrink: 0;
}

.info-icon img {
  width: 0.8rem;
}
</style>

<style lang="scss">
@use "../variables.scss";
.info-tooltip-text {
  position: absolute;
  background: variables.$dark-blue;
  font-family: var(--font-family-primary);
  color: #fff;
  font-size: 11px;
  line-height: 1.4;
  padding: 0.5rem;
  border-radius: 0.5rem;
  width: 200px;
  pointer-events: auto;
  z-index: 10000;
  font-style: normal;
  font-weight: normal;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-tooltip-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  a {
    color: #fff;
  }
}
</style>
