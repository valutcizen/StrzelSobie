import { Result } from '../result';
import {
  CalendarEventsDto,
  CancelPropositionCommand,
  CreatePropositionCommand,
  CreateReservationOptions,
  CreateReservationPayload,
  CreatedPropositionDto,
  CreatedReservationDto,
  GetCalendarEventsQuery,
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
  cancelProposition(command: CancelPropositionCommand, user: UserDto): Promise<Result<void>>;
}
