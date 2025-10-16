import { Result } from '../result';
import { CalendarEventsDto, GetCalendarEventsQuery } from './dto';

export interface IReservationsService {
  getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>>;
}
