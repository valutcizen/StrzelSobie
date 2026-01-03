<template>
  <v-card
    variant="outlined"
    data-testid="event-participant-list"
  >
    <v-card-title class="d-flex align-center justify-space-between">
      <span>{{ t('events.participants.title') }}</span>
      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        data-testid="event-participant-copy-button"
        @click="copyList"
      >
        {{ t('events.participants.copyAction') }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" md="6">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-1">
              {{ t('events.participants.confirmedTitle') }}
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="headers"
              :items="participants"
              density="comfortable"
              data-testid="event-participant-confirmed-table"
            >
              <template #item.person="{ item }">
                {{ formatParticipant(item) }}
              </template>
              <template #item.signupTime="{ item }">
                {{ formatSignupTime(item.signupTime) }}
              </template>
            </v-data-table>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="tonal">
            <v-card-title class="text-subtitle-1">
              {{ t('events.participants.waitlistTitle') }}
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="headers"
              :items="waitlist"
              density="comfortable"
              data-testid="event-participant-waitlist-table"
            >
              <template #item.person="{ item }">
                {{ formatParticipant(item) }}
              </template>
              <template #item.signupTime="{ item }">
                {{ formatSignupTime(item.signupTime) }}
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      timeout="2500"
      data-testid="event-participant-snackbar"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { format, parseISO } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import type { EventParticipantDto } from '@strzel-sobie/common'

const props = defineProps<{
  participants: EventParticipantDto[]
  waitlist: EventParticipantDto[]
}>()

const { t, locale } = useI18n()

const headers = computed(() => [
  { title: t('events.participants.headers.person'), key: 'person', sortable: false },
  { title: t('events.participants.headers.guests'), key: 'guests', sortable: false, width: 100 },
  { title: t('events.participants.headers.signupTime'), key: 'signupTime', sortable: false },
])

const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))

const formatParticipant = (participant: EventParticipantDto) =>
  participant.displayName ||
  participant.email ||
  t('common.labels.userWithId', { id: participant.userId })

const formatSignupTime = (value: string) => {
  try {
    return format(parseISO(value), 'PPpp', { locale: dateLocale.value })
  } catch {
    return value
  }
}

const buildTsv = () => {
  const rows = [
    [
      t('events.participants.headers.status'),
      t('events.participants.headers.person'),
      t('events.participants.headers.email'),
      t('events.participants.headers.guests'),
      t('events.participants.headers.signupTime'),
    ],
  ]

  const pushRow = (status: string, participant: EventParticipantDto) => {
    rows.push([
      status,
      participant.displayName ?? '',
      participant.email ?? '',
      String(participant.guests ?? 0),
      participant.signupTime,
    ])
  }

  props.participants.forEach((participant) =>
    pushRow(t('events.participants.status.confirmed'), participant),
  )
  props.waitlist.forEach((participant) =>
    pushRow(t('events.participants.status.waitlisted'), participant),
  )

  return rows.map((row) => row.join('\t')).join('\n')
}

const copyList = async () => {
  try {
    await navigator.clipboard.writeText(buildTsv())
    snackbar.message = t('events.participants.copySuccess')
    snackbar.color = 'success'
  } catch {
    snackbar.message = t('events.participants.copyFailure')
    snackbar.color = 'error'
  } finally {
    snackbar.open = true
  }
}
</script>
