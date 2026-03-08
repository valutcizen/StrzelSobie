<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { http } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import type { MessageTemplateDto } from '@strzel-sobie/common'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const rangeStore = useRangeStore()

const ranges = computed(() => rangeStore.directory)
const selectedRangeSlug = ref('')
const templates = ref<MessageTemplateDto[]>([])
const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const createForm = reactive({
  name: '',
  content: '',
})

const editedTemplates = ref<Record<number, { name: string; content: string; isActive: boolean }>>({})

const selectedRangeName = computed(() => {
  const range = ranges.value.find((item) => item.slug === selectedRangeSlug.value)
  return range?.displayName ?? selectedRangeSlug.value
})

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbar.open = true
  snackbar.message = message
  snackbar.color = color
}

const loadRanges = async () => {
  if (rangeStore.directory.length === 0) {
    await rangeStore.fetchDirectory()
  }

  const querySlug = typeof route.query.rangeSlug === 'string' ? route.query.rangeSlug : null
  selectedRangeSlug.value = querySlug ?? authStore.defaultRangeSlug
  if (!ranges.value.some((item) => item.slug === selectedRangeSlug.value)) {
    selectedRangeSlug.value = ranges.value[0]?.slug ?? ''
  }
}

const loadTemplates = async () => {
  if (!selectedRangeSlug.value) {
    templates.value = []
    editedTemplates.value = {}
    return
  }

  loading.value = true
  error.value = null
  try {
    const { data } = await http.get<MessageTemplateDto[]>(
      `/ranges/${selectedRangeSlug.value}/message-templates`,
      { params: { includeInactive: 'true' } },
    )
    templates.value = data
    editedTemplates.value = Object.fromEntries(
      data.map((item) => [item.id, { name: item.name, content: item.content, isActive: item.isActive }]),
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('admin.messageTemplates.errors.load')
    templates.value = []
    editedTemplates.value = {}
  } finally {
    loading.value = false
  }
}

const createTemplate = async () => {
  if (!selectedRangeSlug.value) {
    return
  }

  const name = createForm.name.trim()
  const content = createForm.content.trim()
  if (!name || !content) {
    showSnackbar(t('admin.messageTemplates.errors.create'), 'error')
    return
  }

  creating.value = true
  try {
    await http.post(`/ranges/${selectedRangeSlug.value}/message-templates`, { name, content })
    createForm.name = ''
    createForm.content = ''
    showSnackbar(t('admin.messageTemplates.createSuccess'))
    await loadTemplates()
  } catch (err) {
    showSnackbar(err instanceof Error ? err.message : t('admin.messageTemplates.errors.create'), 'error')
  } finally {
    creating.value = false
  }
}

const saveTemplate = async (templateId: number) => {
  const edited = editedTemplates.value[templateId]
  if (!edited) {
    return
  }

  saving.value = true
  try {
    await http.patch(`/message-templates/${templateId}`, {
      name: edited.name.trim(),
      content: edited.content.trim(),
      isActive: edited.isActive,
    })
    showSnackbar(t('admin.messageTemplates.updateSuccess'))
    await loadTemplates()
  } catch (err) {
    showSnackbar(err instanceof Error ? err.message : t('admin.messageTemplates.errors.update'), 'error')
  } finally {
    saving.value = false
  }
}

watch(selectedRangeSlug, () => {
  void loadTemplates()
})

onMounted(async () => {
  await loadRanges()
  await loadTemplates()
})
</script>

<template>
  <v-container
    fluid
    data-testid="message-templates-view"
  >
    <v-row justify="center">
      <v-col
        cols="12"
        lg="9"
      >
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title>
              {{ t('admin.messageTemplates.title') }}
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-select
              v-model="selectedRangeSlug"
              :items="ranges"
              item-title="displayName"
              item-value="slug"
              :label="t('admin.messageTemplates.rangeLabel')"
              class="mb-4"
              data-testid="message-templates-range-select"
            />

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ error }}
            </v-alert>

            <v-card
              variant="tonal"
              class="mb-6"
              data-testid="message-template-create-card"
            >
              <v-card-title>{{ t('admin.messageTemplates.createTitle') }}</v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="createForm.name"
                  :label="t('admin.messageTemplates.nameLabel')"
                  data-testid="message-template-create-name"
                />
                <v-textarea
                  v-model="createForm.content"
                  :label="t('admin.messageTemplates.contentLabel')"
                  rows="4"
                  auto-grow
                  data-testid="message-template-create-content"
                />
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn
                  color="primary"
                  :loading="creating"
                  :disabled="!selectedRangeSlug"
                  data-testid="message-template-create-submit"
                  @click="createTemplate"
                >
                  {{ t('common.actions.create') }}
                </v-btn>
              </v-card-actions>
            </v-card>

            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <v-alert
              v-else-if="templates.length === 0"
              type="info"
              variant="tonal"
              border="start"
              data-testid="message-template-empty"
            >
              {{ t('admin.messageTemplates.empty', { range: selectedRangeName }) }}
            </v-alert>

            <v-expansion-panels
              v-else
              variant="accordion"
              data-testid="message-template-list"
            >
              <v-expansion-panel
                v-for="template in templates"
                :key="template.id"
              >
                <v-expansion-panel-title>
                  <span>{{ template.name }}</span>
                  <v-chip
                    size="x-small"
                    class="ml-3"
                    :color="editedTemplates[template.id]?.isActive ? 'success' : 'default'"
                  >
                    {{ editedTemplates[template.id]?.isActive ? t('common.labels.active') : t('common.labels.inactive') }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-text-field
                    v-model="editedTemplates[template.id].name"
                    :label="t('admin.messageTemplates.nameLabel')"
                    :disabled="saving"
                    class="mb-2"
                  />
                  <v-textarea
                    v-model="editedTemplates[template.id].content"
                    :label="t('admin.messageTemplates.contentLabel')"
                    :disabled="saving"
                    rows="4"
                    auto-grow
                    class="mb-2"
                  />
                  <v-switch
                    v-model="editedTemplates[template.id].isActive"
                    :label="t('admin.messageTemplates.activeLabel')"
                    color="primary"
                    :disabled="saving"
                  />
                  <div class="d-flex justify-end">
                    <v-btn
                      color="primary"
                      :loading="saving"
                      @click="saveTemplate(template.id)"
                    >
                      {{ t('common.actions.save') }}
                    </v-btn>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
