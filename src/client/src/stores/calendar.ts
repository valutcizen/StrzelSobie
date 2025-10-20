import { defineStore } from 'pinia'
import { http } from '../services/http'
import type { RangeEvent } from '../types/calendar'
import { mapCalendarEvents, type CalendarEventsResponse } from '../services/mappers/calendar'

interface FetchEventsParams {
  rangeSlug: string
  startDate: string
  endDate: string
  force?: boolean
}

export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    events: [] as RangeEvent[],
    isLoading: false,
    lastUpdatedAt: null as Date | null,
    currentRangeSlug: null as string | null,
    lastError: null as string | null,
    lastQueryKey: null as string | null,
  }),
  getters: {
    hasEvents: (state) => state.events.length > 0,
  },
  actions: {
    async fetchEvents({ rangeSlug, startDate, endDate, force = false }: FetchEventsParams) {
      if (!rangeSlug) {
        throw new Error('rangeSlug is mandatory to fetch events')
      }

      const queryKey = JSON.stringify({ rangeSlug, startDate, endDate })
      if (!force && this.lastQueryKey === queryKey && this.lastUpdatedAt) {
        return
      }

      this.isLoading = true
      this.lastError = null
      this.currentRangeSlug = rangeSlug
      this.lastQueryKey = queryKey

      try {
        const { data } = await http.get<CalendarEventsResponse>(`/ranges/${rangeSlug}/events`, {
          params: {
            startDate,
            endDate,
          },
        })

        this.events = mapCalendarEvents(data)
        this.lastUpdatedAt = new Date()
      } catch (error) {
        this.lastError = (error as Error).message
        throw error
      } finally {
        this.isLoading = false
      }
    },
    clear() {
      this.events = []
      this.lastUpdatedAt = null
      this.currentRangeSlug = null
      this.lastError = null
      this.lastQueryKey = null
    },
  },
})
