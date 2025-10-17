import { Result } from '../result';
import {
  CalendarEventsDto,
  CancelPropositionCommand,
  CreatePropositionCommand,
  CreatedPropositionDto,
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
  cancelProposition(command: CancelPropositionCommand, user: UserDto): Promise<Result<void>>;
}
