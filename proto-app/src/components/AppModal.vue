<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" @click="$emit('close')">
          <img src="@/assets/img/close-icon.svg" />
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{ title: string }>()

const emit = defineEmits<{ close: [] }>()

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 47, 128, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  display: flex;
  flex-direction: column;
  max-width: 600px;
  min-width: 300px;
  max-height: 80vh;
  background: #F9FCFE;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  border-radius: 6px;
  text-align: left;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 25px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid #e8eef8;

  h2 {
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
  }
}

.modal-body {
  overflow-y: auto;
  padding: 20px 25px 23px;
}
</style>
