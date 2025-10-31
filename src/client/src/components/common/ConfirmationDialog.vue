<template>
  <v-dialog
    :model-value="open"
    max-width="420"
    @update:model-value="onUpdate"
  >
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text v-if="description">
        {{ description }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="emitCancel"
        >
          {{ cancelLabel }}
        </v-btn>
        <v-btn
          :color="color"
          :loading="loading"
          @click="emitConfirm"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  color?: string
}

const props = withDefaults(defineProps<ConfirmationDialogProps>(), {
  loading: false,
  color: 'primary',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const confirmLabel = computed(() => props.confirmText ?? t('common.actions.confirm'))
const cancelLabel = computed(() => props.cancelText ?? t('common.actions.cancel'))

const onUpdate = (value: boolean) => {
  emit('update:open', value)
  if (!value) {
    emit('cancel')
  }
}

const emitConfirm = () => {
  emit('confirm')
}

const emitCancel = () => {
  emit('update:open', false)
  emit('cancel')
}
</script>
