import type {
  CreateRangeCommand,
  OperatingHours as OperatingHoursDto,
  RangeDetailsDto,
  RangeSummaryDto,
  UpdateRangeCommand,
} from '@strzel-sobie/common'

export type RangeSummary = RangeSummaryDto
export type RangeDetails = RangeDetailsDto
export type UpdateRangePayload = UpdateRangeCommand
export type CreateRangePayload = CreateRangeCommand
export type OperatingHours = OperatingHoursDto
