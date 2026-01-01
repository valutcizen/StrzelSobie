import { Result } from '../result';
import { UserDto } from '../users/dto';
import { CreateEventCommand, EventDetailsDto, EventsListResponseDto, UpdateEventCommand } from './dto';

export interface IEventsService {
  getRangeEvents(rangeSlug: string, user?: UserDto | null): Promise<Result<EventsListResponseDto>>;
  getEventDetails(eventId: number, user?: UserDto | null): Promise<Result<EventDetailsDto>>;
  createEvent(command: CreateEventCommand, user: UserDto): Promise<Result<EventDetailsDto>>;
  updateEvent(eventId: number, command: UpdateEventCommand, user: UserDto): Promise<Result<EventDetailsDto>>;
  cancelEvent(eventId: number, user: UserDto): Promise<Result<void>>;
}
