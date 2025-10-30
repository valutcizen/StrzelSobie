import { defineStore } from 'pinia'
import { http } from '@/services/http'
import type { RangeDetails, UpdateRangePayload } from '@/types/range'

interface FetchRangeOptions {
  force?: boolean
}

type RangeDictionary = Record<string, RangeDetails>

export const useRangeStore = defineStore('range', {
  state: () => ({
    rangesBySlug: {} as RangeDictionary,
    currentRangeSlug: null as string | null,
    isLoading: false,
    lastError: null as string | null,
  }),
  getters: {
    currentRange(state): RangeDetails | null {
      if (!state.currentRangeSlug) {
        return null
      }

      return state.rangesBySlug[state.currentRangeSlug] ?? null
    },
  },
  actions: {
    async fetchRangeDetails(rangeSlug: string, options: FetchRangeOptions = {}) {
      if (!rangeSlug) {
        throw new Error('rangeSlug is required to fetch range details')
      }

      const { force = false } = options

      if (!force && this.rangesBySlug[rangeSlug]) {
        this.currentRangeSlug = rangeSlug
        this.lastError = null
        return this.rangesBySlug[rangeSlug]
      }

      this.isLoading = true
      this.lastError = null
      this.currentRangeSlug = rangeSlug

      try {
        const { data } = await http.get<RangeDetails>(`/ranges/${rangeSlug}`)
        this.rangesBySlug[rangeSlug] = data
        return data
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'Nie udało się pobrać danych strzelnicy.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async updateRange(rangeSlug: string, payload: UpdateRangePayload) {
      if (!rangeSlug) {
        throw new Error('rangeSlug is required to update range')
      }

      try {
        await http.patch(`/ranges/${rangeSlug}`, payload)

        const existing = this.rangesBySlug[rangeSlug]
        if (existing) {
          this.rangesBySlug[rangeSlug] = {
            ...existing,
            ...(payload.totalTracks !== undefined ? { totalTracks: payload.totalTracks } : {}),
            ...(payload.operatingHours !== undefined ? { operatingHours: payload.operatingHours } : {}),
          }
        } else {
          await this.fetchRangeDetails(rangeSlug, { force: true })
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'Nie udało się zapisać danych strzelnicy.'
        throw error
      }
    },
    clearRange(rangeSlug?: string) {
      if (rangeSlug) {
        delete this.rangesBySlug[rangeSlug]
      } else {
        this.rangesBySlug = {}
      }
      this.currentRangeSlug = null
      this.lastError = null
    },
  },
})
