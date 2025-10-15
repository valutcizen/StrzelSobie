export type PropositionEventDto = {
  id: number;
  userId: number;
  isMember: boolean; // True if the user is a club member, for UI highlighting
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number;
};

export type ReservationEventDto = {
  id: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  tracksRequested: number;
  isPublic: boolean;
  isJoinable: boolean;
  details: {
    coordinatorId: number;
    numParticipants: number;
  } | null;
};

export type CalendarEventsDto = {
  propositions: PropositionEventDto[];
  reservations: ReservationEventDto[];
};

export type GetCalendarEventsQuery = {
  rangeSlug: string;
  startDate: string;
  endDate: string;
  user: {
    id: string;
    roles: string[];
    rangeRoles: Record<string, string[]>;
  };
};