const LAST_RANGE_KEY = 'lastRangeId'

export const getLastRangeId = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const value = localStorage.getItem(LAST_RANGE_KEY)
  return value && value.trim().length > 0 ? value : null
}

export const setLastRangeId = (rangeSlug: string) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(LAST_RANGE_KEY, rangeSlug)
}

export const clearLastRangeId = () => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(LAST_RANGE_KEY)
}
