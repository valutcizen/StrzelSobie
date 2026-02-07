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
  getEventDetails(
    rangeSlug: string,
    eventSlug: string,
    user?: UserDto | null
  ): Promise<Result<EventDetailsDto>>;
  createEvent(
    rangeSlug: string,
    command: CreateEventCommand,
    user: UserDto
  ): Promise<Result<EventDetailsDto>>;
  updateEvent(
    rangeSlug: string,
    eventSlug: string,
    command: UpdateEventCommand,
    user: UserDto
  ): Promise<Result<EventDetailsDto>>;
  cancelEvent(rangeSlug: string, eventSlug: string, user: UserDto): Promise<Result<void>>;
  createSignup(
    rangeSlug: string,
    eventSlug: string,
    command: CreateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>>;
  updateSignup(
    rangeSlug: string,
    eventSlug: string,
    command: UpdateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>>;
  cancelSignup(rangeSlug: string, eventSlug: string, user: UserDto): Promise<Result<void>>;
}
