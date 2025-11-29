import { defineStore } from 'pinia'
import { http } from '@/services/http'
import { clearLastRangeId } from '@/utils/lastRange'
import type {
  CreateRangePayload,
  RangeDetails,
  RangeSummary,
  UpdateRangePayload,
} from '@/types/range'
import type { RangeParkingLocation } from '@strzel-sobie/common'

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
    directory: [] as RangeSummary[],
    isDirectoryLoading: false,
    directoryError: null as string | null,
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
            ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
            ...(payload.type !== undefined ? { type: payload.type } : {}),
            ...(payload.totalTracks !== undefined ? { totalTracks: payload.totalTracks } : {}),
            ...(payload.operatingHours !== undefined ? { operatingHours: payload.operatingHours } : {}),
            ...(payload.publicDescription !== undefined ? { publicDescription: payload.publicDescription } : {}),
            ...(payload.memberDescription !== undefined ? { memberDescription: payload.memberDescription } : {}),
            ...(payload.latitude !== undefined ? { latitude: payload.latitude } : {}),
            ...(payload.longitude !== undefined ? { longitude: payload.longitude } : {}),
            ...(payload.parkingLocation !== undefined ? { parkingLocation: payload.parkingLocation ?? null } : {}),
            ...(payload.parkingLocation !== undefined
              ? {
                  extras: {
                    ...(existing.extras ?? {}),
                    parkingLocation: payload.parkingLocation ?? null,
                  },
                }
              : {}),
          }
          this.directory = this.directory.map((range) =>
            range.slug === rangeSlug
              ? {
                  ...range,
                  ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
                  ...(payload.latitude !== undefined ? { latitude: payload.latitude ?? undefined } : {}),
                  ...(payload.longitude !== undefined ? { longitude: payload.longitude ?? undefined } : {}),
                }
              : range,
          )
        } else {
          await this.fetchRangeDetails(rangeSlug, { force: true })
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'Nie udało się zapisać danych strzelnicy.'
        throw error
      }
    },
    async updateParkingLocation(
      rangeSlug: string,
      parkingLocation: RangeParkingLocation | null,
    ) {
      const payload: UpdateRangePayload = {
        parkingLocation,
      }
      await this.updateRange(rangeSlug, payload)
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
    async fetchDirectory(params?: { sort?: string; types?: string[] }) {
      this.isDirectoryLoading = true
      this.directoryError = null

      try {
        const searchParams = new URLSearchParams()
        if (params?.sort) {
          searchParams.set('sort', params.sort)
        }
        if (params?.types?.length) {
          for (const type of params.types) {
            searchParams.append('type', type)
          }
        }

        const query = searchParams.toString()
        const endpoint = query ? `/ranges?${query}` : '/ranges'
        const { data } = await http.get<RangeSummary[]>(endpoint)
        this.directory = data
      } catch (error) {
        this.directoryError = error instanceof Error ? error.message : 'Failed to load ranges.'
        throw error
      } finally {
        this.isDirectoryLoading = false
      }
    },

    async createRange(payload: CreateRangePayload) {
      if (!payload.slug) {
        throw new Error('slug is required to create range')
      }

      try {
        const { data } = await http.post<RangeDetails>('/ranges', payload)
        this.rangesBySlug[payload.slug] = data
        this.currentRangeSlug = payload.slug
        return data
      } catch (error) {
        const message =
          (error as { response?: { data?: { error?: string } } } | undefined)?.response?.data?.error ??
          (error instanceof Error ? error.message : 'Nie udało się utworzyć strzelnicy.')
        this.lastError = message
        throw error
      }
    },

    async deleteRange(rangeSlug: string) {
      if (!rangeSlug) {
        throw new Error('rangeSlug is required to delete range')
      }

      try {
        await http.delete(`/ranges/${rangeSlug}`)
        delete this.rangesBySlug[rangeSlug]
        this.directory = this.directory.filter((range) => range.slug !== rangeSlug)
        if (this.currentRangeSlug === rangeSlug) {
          this.currentRangeSlug = null
        }
        clearLastRangeId()
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'Nie udało się usunąć strzelnicy.'
        throw error
      }
    },
  },
})
