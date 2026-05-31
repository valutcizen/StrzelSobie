<template>
  <div
    class="rich-text-editor"
    :class="{ 'rich-text-editor--error': hasError }"
    :data-testid="dataTestid"
  >
    <v-toolbar
      density="compact"
      color="surface"
      class="rich-text-editor__toolbar"
    >
      <v-btn
        v-for="action in formatActions"
        :key="action.command"
        :icon="action.icon"
        :aria-label="action.label"
        :title="action.label"
        size="small"
        variant="text"
        @mousedown.prevent
        @click="applyCommand(action.command)"
      />
      <v-divider vertical class="mx-1" />
      <v-btn
        icon="mdi-link"
        :aria-label="t('common.richText.link')"
        :title="t('common.richText.link')"
        size="small"
        variant="text"
        @mousedown.prevent
        @click="setLink"
      />
      <v-btn
        icon="mdi-image"
        :aria-label="t('common.richText.image')"
        :title="t('common.richText.image')"
        size="small"
        variant="text"
        @mousedown.prevent
        @click="insertImage"
      />
      <v-divider vertical class="mx-1" />
      <v-btn
        icon="mdi-undo"
        :aria-label="t('common.richText.undo')"
        :title="t('common.richText.undo')"
        size="small"
        variant="text"
        @mousedown.prevent
        @click="applyCommand('undo')"
      />
      <v-btn
        icon="mdi-redo"
        :aria-label="t('common.richText.redo')"
        :title="t('common.richText.redo')"
        size="small"
        variant="text"
        @mousedown.prevent
        @click="applyCommand('redo')"
      />
    </v-toolbar>

    <div
      ref="editorElement"
      class="rich-text-editor__surface"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="label"
      @blur="handleBlur"
      @input="emitCurrentHtml"
      @paste.prevent="handlePaste"
    />

    <div
      v-if="hint || errorMessages.length > 0"
      class="rich-text-editor__messages"
    >
      <p
        v-if="errorMessages.length > 0"
        class="rich-text-editor__error"
      >
        {{ errorMessages[0] }}
      </p>
      <p
        v-else-if="hint"
        class="rich-text-editor__hint"
      >
        {{ hint }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getBrowserSanitizedHtml, setTrustedHtml } from '@/utils/browserSanitizer'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label: string
    hint?: string
    errorMessages?: string | string[]
    dataTestid?: string
  }>(),
  {
    hint: '',
    errorMessages: () => [],
    dataTestid: undefined,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
  (event: 'blur', value: FocusEvent): void
}>()

const { t } = useI18n()
const editorElement = ref<HTMLDivElement | null>(null)

const formatActions = computed(() => [
  { command: 'bold', icon: 'mdi-format-bold', label: t('common.richText.bold') },
  { command: 'italic', icon: 'mdi-format-italic', label: t('common.richText.italic') },
  { command: 'insertUnorderedList', icon: 'mdi-format-list-bulleted', label: t('common.richText.bulletList') },
  { command: 'insertOrderedList', icon: 'mdi-format-list-numbered', label: t('common.richText.numberedList') },
  { command: 'formatBlock:h2', icon: 'mdi-format-header-2', label: t('common.richText.heading2') },
  { command: 'formatBlock:h3', icon: 'mdi-format-header-3', label: t('common.richText.heading3') },
  { command: 'formatBlock:blockquote', icon: 'mdi-format-quote-close', label: t('common.richText.quote') },
])

const errorMessages = computed(() =>
  Array.isArray(props.errorMessages)
    ? props.errorMessages.filter(Boolean)
    : props.errorMessages
      ? [props.errorMessages]
      : [],
)
const hasError = computed(() => errorMessages.value.length > 0)

const focusEditor = async () => {
  await nextTick()
  editorElement.value?.focus()
}

const getEditorHtml = () => {
  const html = editorElement.value?.innerHTML ?? ''
  return html.trim().length > 0 ? html.trim() : null
}

const emitCurrentHtml = () => {
  emit('update:modelValue', getEditorHtml())
}

const applyCommand = async (command: string) => {
  await focusEditor()
  const [name, value] = command.split(':')
  document.execCommand(name, false, value)
  emitCurrentHtml()
}

const setLink = async () => {
  await focusEditor()
  const url = window.prompt(t('common.richText.linkPrompt'))
  if (!url) {
    return
  }
  document.execCommand('createLink', false, url)
  emitCurrentHtml()
}

const insertImage = async () => {
  await focusEditor()
  const url = window.prompt(t('common.richText.imagePrompt'))
  if (!url) {
    return
  }
  document.execCommand('insertImage', false, url)
  emitCurrentHtml()
}

const handlePaste = (event: ClipboardEvent) => {
  const html = event.clipboardData?.getData('text/html')
  const text = event.clipboardData?.getData('text/plain') ?? ''
  const nextHtml = html && html.trim().length > 0 ? getBrowserSanitizedHtml(html) : plainTextToHtml(text)
  document.execCommand('insertHTML', false, nextHtml)
  emitCurrentHtml()
}

const handleBlur = (event: FocusEvent) => {
  emit('update:modelValue', getEditorHtml())
  emit('blur', event)
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const plainTextToHtml = (value: string): string =>
  escapeHtml(value).replace(/\r\n?/g, '\n').replace(/\n/g, '<br>')

watch(
  () => props.modelValue,
  (value) => {
    const html = typeof value === 'string' ? value : ''
    if (editorElement.value && editorElement.value.innerHTML !== html) {
      setTrustedHtml(editorElement.value, html)
    }
  },
  { immediate: true },
)

onMounted(() => {
  const html = typeof props.modelValue === 'string' ? props.modelValue : ''
  if (editorElement.value) {
    setTrustedHtml(editorElement.value, html)
  }
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.rich-text-editor--error {
  border-color: rgb(var(--v-theme-error));
}

.rich-text-editor__toolbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rich-text-editor__surface {
  min-height: 160px;
  padding: 12px 14px;
  outline: none;
}

.rich-text-editor__surface:focus {
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-primary), 0.35);
}

.rich-text-editor__surface :deep(img) {
  max-width: 100%;
  height: auto;
}

.rich-text-editor__messages {
  padding: 0 14px 8px;
  font-size: 0.75rem;
}

.rich-text-editor__hint,
.rich-text-editor__error {
  margin: 0;
}

.rich-text-editor__hint {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.rich-text-editor__error {
  color: rgb(var(--v-theme-error));
}
</style>
