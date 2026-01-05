import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { UpdateEventCommand, UserDto } from '@strzel-sobie/common';
import { IEventsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapEventsError } from '../../../utils/events-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
  eventSlug: z.string().trim().min(1, 'eventSlug is required'),
});

const DateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must match YYYY-MM-DD format');

const TimeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
  .refine(
    (value) => {
      const [, minutes] = value.split(':').map(Number);
      return minutes % 5 === 0;
    },
    { message: 'Times must align to 5-minute increments' }
  );

const BodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    publicDescription: z.string().trim().min(1).optional(),
    memberDescription: z.string().trim().optional().nullable(),
    eventDate: DateSchema.optional(),
    startTime: TimeSchema.optional(),
    endTime: TimeSchema.optional(),
    registrationType: z.enum(['notice', 'registration_required']).optional(),
    audience: z.enum(['public', 'members_only']).optional(),
    capacityType: z.enum(['unlimited', 'limited']).optional(),
    capacityLimit: z.number().int().min(1).optional().nullable(),
    guestPolicy: z.enum(['guests_allowed', 'no_guests']).optional().nullable(),
    waitlistLimit: z.number().int().min(0).optional().nullable(),
    registrationDeadline: z.string().optional().nullable(),
    status: z.enum(['active', 'cancelled']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .superRefine((value, ctx) => {
    if (!value.startTime || !value.endTime) {
      return;
    }
    const [startHours, startMinutes] = value.startTime.split(':').map(Number);
    const [endHours, endMinutes] = value.endTime.split(':').map(Number);
    if (
      Number.isNaN(startHours) ||
      Number.isNaN(startMinutes) ||
      Number.isNaN(endHours) ||
      Number.isNaN(endMinutes)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'Start and end times must contain numeric values',
      });
      return;
    }
    const startsBeforeEnds =
      startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
    if (!startsBeforeEnds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be later than start time',
      });
    }
  });

export class UpdateEvent extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Update event',
    description: 'Updates an existing event for the selected range.',
    tags: ['Events'],
    request: {
      params: ParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: BodySchema,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Event updated successfully',
      },
      '400': {
        description: 'Event validation failed',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'Event not found',
      },
      '500': {
        description: 'Unexpected server error',
      },
    },
  };

  public async handle(c: AppContext) {
    const eventsService: IEventsService = c.get('eventsService');
    const user = c.get('user') as UserDto;
    const { params, body } = await this.getValidatedData<{
      params: z.infer<typeof ParamsSchema>;
      body: UpdateEventCommand;
    }>();

    const result = await eventsService.updateEvent(
      params.rangeSlug,
      params.eventSlug,
      body,
      user
    );

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const error = result.getError();
    const { status, body: errorBody } = mapEventsError(error);

    if (status >= 500 && errorBody.code === 'internal_error') {
      console.error('Error while updating event', error);
    }

    return c.json(errorBody, status);
  }
}
