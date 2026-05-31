<template>
  <div
    ref="contentElement"
    class="rich-text-content"
  />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { setBrowserSanitizedHtml } from '@/utils/browserSanitizer'

const props = defineProps<{
  html: string
}>()

const contentElement = ref<HTMLElement | null>(null)

const renderHtml = () => {
  if (contentElement.value) {
    setBrowserSanitizedHtml(contentElement.value, props.html)
  }
}

watch(() => props.html, renderHtml)
onMounted(renderHtml)
</script>

<style scoped>
.rich-text-content :deep(*) {
  max-width: 100%;
}

.rich-text-content :deep(a) {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.rich-text-content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin-block: 12px;
}

.rich-text-content :deep(ul),
.rich-text-content :deep(ol) {
  padding-inline-start: 1.4rem;
}

.rich-text-content :deep(blockquote) {
  border-inline-start: 3px solid rgba(var(--v-theme-primary), 0.5);
  margin-inline: 0;
  padding-inline-start: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
</style>
