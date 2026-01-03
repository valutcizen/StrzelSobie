import { Result } from '../result';
import { UserDto } from '../users/dto';
import {
  CreateEventCommand,
  CreateEventSignupCommand,
  EventDetailsDto,
  EventsListResponseDto,
  EventSignupResultDto,
  UpdateEventCommand,
  UpdateEventSignupCommand,
} from './dto';

export interface IEventsService {
  getRangeEvents(rangeSlug: string, user?: UserDto | null): Promise<Result<EventsListResponseDto>>;
  getEventDetails(eventId: number, user?: UserDto | null): Promise<Result<EventDetailsDto>>;
  createEvent(
    rangeSlug: string,
    command: CreateEventCommand,
    user: UserDto
  ): Promise<Result<EventDetailsDto>>;
  updateEvent(eventId: number, command: UpdateEventCommand, user: UserDto): Promise<Result<EventDetailsDto>>;
  cancelEvent(eventId: number, user: UserDto): Promise<Result<void>>;
  createSignup(
    eventId: number,
    command: CreateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>>;
  updateSignup(
    eventId: number,
    command: UpdateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>>;
  cancelSignup(eventId: number, user: UserDto): Promise<Result<void>>;
}
