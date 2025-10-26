import { Result } from '../result';
import {
  CalendarEventsDto,
  CancelPropositionCommand,
  CancelReservationCommand,
  CreateRecordCommand,
  CreatePropositionCommand,
  CreateReservationOptions,
  CreateReservationPayload,
  CreateRecordResult,
  CreatedPropositionDto,
  CreatedReservationDto,
  GetCalendarEventsQuery,
  PropositionDetailDto,
  ReservationDetailDto,
} from './dto';
import { UserDto } from '../users/dto';

export interface IReservationsService {
  getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto>>;
  createProposition(
    rangeSlug: string,
    command: CreatePropositionCommand,
    user: UserDto
  ): Promise<Result<CreatedPropositionDto>>;
  createReservation(
    rangeSlug: string,
    command: CreateReservationPayload,
    options: CreateReservationOptions,
    user: UserDto
  ): Promise<Result<CreatedReservationDto>>;
  createRecord(
    rangeSlug: string,
    command: CreateRecordCommand,
    user: UserDto
  ): Promise<CreateRecordResult>;
  cancelProposition(command: CancelPropositionCommand, user: UserDto): Promise<Result<void>>;
  cancelReservation(command: CancelReservationCommand, user: UserDto): Promise<Result<void>>;
  getPropositionDetails(
    propositionId: number,
    user: UserDto
  ): Promise<Result<PropositionDetailDto>>;
  getReservationDetails(
    reservationId: number,
    user: UserDto
  ): Promise<Result<ReservationDetailDto>>;
}
