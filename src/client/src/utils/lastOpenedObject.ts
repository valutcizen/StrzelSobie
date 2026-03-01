import type { RangeType } from '@strzel-sobie/common'

const LAST_OPENED_OBJECT_KEY = 'lastOpenedObject'

export type LastOpenedObject = {
  slug: string
  type: RangeType
}

const isValidRangeType = (value: unknown): value is RangeType =>
  value === 'club' || value === 'ally' || value === 'coming-soon' || value === 'meetup' || value === 'office'

export const getLastOpenedObject = (): LastOpenedObject | null => {
  if (typeof sessionStorage === 'undefined') {
    return null
  }

  const raw = sessionStorage.getItem(LAST_OPENED_OBJECT_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as { slug?: unknown; type?: unknown }
    if (typeof parsed.slug !== 'string' || parsed.slug.trim().length === 0 || !isValidRangeType(parsed.type)) {
      return null
    }

    return {
      slug: parsed.slug.trim(),
      type: parsed.type,
    }
  } catch {
    return null
  }
}

export const setLastOpenedObject = (value: LastOpenedObject) => {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  sessionStorage.setItem(LAST_OPENED_OBJECT_KEY, JSON.stringify(value))
}

export const clearLastOpenedObject = () => {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  sessionStorage.removeItem(LAST_OPENED_OBJECT_KEY)
}
