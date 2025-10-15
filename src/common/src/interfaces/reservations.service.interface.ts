import { Result } from '../utils/result';
import { CalendarEventsDto, GetCalendarEventsQuery } from '../dto/calendar.dto';

export interface IReservationsService {
  getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>>;
}
