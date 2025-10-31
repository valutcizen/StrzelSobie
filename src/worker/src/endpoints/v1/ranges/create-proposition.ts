import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { CreatePropositionCommand, CreatedPropositionDto } from '@strzel-sobie/common';
import { IReservationsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
});

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
    eventDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must match YYYY-MM-DD format')
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        'Event date must be a valid calendar date'
      ),
    startTime: TimeSchema,
    endTime: TimeSchema,
    numParticipants: z.coerce
      .number({
        invalid_type_error: 'Number of participants must be a number',
      })
      .int('Number of participants must be an integer')
      .min(1, 'At least one participant is required')
      .max(50, 'Number of participants cannot exceed 50'),
    tracksRequested: z.coerce
      .number({
        invalid_type_error: 'Tracks requested must be a number',
      })
      .int('Tracks requested must be an integer')
      .min(1, 'At least one track must be requested'),
  })
  .superRefine((value, ctx) => {
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

    if (
      startHours < 0 ||
      startHours > 23 ||
      endHours < 0 ||
      endHours > 23 ||
      startMinutes < 0 ||
      startMinutes > 59 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'Start and end times must represent valid clock values',
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

export class CreateProposition extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Create a new proposition for a range',
    description:
      'Allows authenticated guests and members to propose a shooting session at a specific range.',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: BodySchema,
          },
        },
        required: true,
      },
    },
    responses: {
      '201': {
        description: 'Proposition created successfully',
        content: {
          'application/json': {
            schema: z.object({
              id: z.number(),
              user_id: z.number(),
              range_id: z.number(),
              status: z.string(),
            }),
          },
        },
      },
      '400': {
        description: 'Validation failed or schedule conflict detected',
      },
      '403': {
        description: 'User not permitted to create propositions',
      },
      '404': {
        description: 'Range not found',
      },
      '500': {
        description: 'Unexpected server error',
      },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');

    const {
      params,
      body: requestBody,
    } = await this.getValidatedData<{
      params: z.infer<typeof ParamsSchema>;
      body: z.infer<typeof BodySchema>;
    }>();

    const command: CreatePropositionCommand = {
      eventDate: requestBody.eventDate,
      startTime: requestBody.startTime,
      endTime: requestBody.endTime,
      numParticipants: requestBody.numParticipants,
      tracksRequested: requestBody.tracksRequested,
    };

    const result = await reservationsService.createProposition(
      params.rangeSlug,
      command,
      user
    );

    if (result.isSuccess) {
      const proposition: CreatedPropositionDto = result.getValue();
      c.header(
        'Location',
        `/api/v1/ranges/${params.rangeSlug}/propositions/${proposition.id}`
      );
      return c.json(proposition, 201);
    }

    const error = result.getError();
    console.error('Error during proposition creation', error);
    const { status, body } = mapReservationsError(error);
    return c.json(body, status);
  }
}
