import { format, parseISO } from 'date-fns'

const DATE_ONLY_FORMAT = 'yyyy-MM-dd'
const TIME_ONLY_FORMAT = 'HH:mm'
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm"

export const toDateOnly = (value: Date | string) => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, DATE_ONLY_FORMAT)
}

export const toDateTimeLocalInput = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return ''
  }

  return format(parseISO(isoValue), DATETIME_LOCAL_FORMAT)
}

export const splitDateTimeLocalValue = (value: string) => {
  if (!value.includes('T')) {
    return { date: value, time: '00:00' }
  }

  const [date, timeWithOptionalSeconds] = value.split('T')
  const time = timeWithOptionalSeconds?.slice(0, 5) ?? '00:00'

  return { date, time }
}

export const combineDateAndTime = (date: string, time: string) => {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalizedTime}`
}

export const ensureTimePrecision = (time: string) => (time.length === 5 ? time : time.slice(0, 5))

export const toDateInputValue = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return ''
  }
  try {
    return format(parseISO(isoValue), DATE_ONLY_FORMAT)
  } catch {
    return ''
  }
}

export const toTimeInputValue = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return ''
  }
  try {
    return format(parseISO(isoValue), TIME_ONLY_FORMAT)
  } catch {
    const [, timePart] = isoValue.split('T')
    return ensureTimePrecision(timePart ?? isoValue)
  }
}
