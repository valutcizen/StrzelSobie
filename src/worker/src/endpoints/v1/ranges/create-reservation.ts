import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import {
  CreateReservationCommand,
  CreateReservationFromPropositionCommand,
  CreateReservationPayload,
  CreatedReservationDto,
  IReservationsService,
} from '@strzel-sobie/common';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
});

const QuerySchema = z.object({
  force: z.enum(['true', 'false']).optional(),
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

const DirectReservationBodySchema = z
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
    isPublic: z.boolean({
      required_error: 'isPublic flag is required',
    }),
    isJoinable: z.boolean({
      required_error: 'isJoinable flag is required',
    }),
  })
  .strict()
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

const FromPropositionBodySchema = z
  .object({
    propositionId: z.coerce
      .number({
        invalid_type_error: 'propositionId must be a number',
      })
      .int('propositionId must be an integer')
      .min(1, 'propositionId must be positive'),
    startTime: TimeSchema.optional(),
    endTime: TimeSchema.optional(),
    tracksRequested: z
      .coerce
      .number({
        invalid_type_error: 'tracksRequested must be a number',
      })
      .int('tracksRequested must be an integer')
      .min(1, 'At least one track must be requested')
      .optional(),
  })
  .strict()
  .refine(
    (value) => {
      if (!value.startTime || !value.endTime) {
        return true;
      }

      const [startHours, startMinutes] = value.startTime.split(':').map(Number);
      const [endHours, endMinutes] = value.endTime.split(':').map(Number);
      if (
        Number.isNaN(startHours) ||
        Number.isNaN(startMinutes) ||
        Number.isNaN(endHours) ||
        Number.isNaN(endMinutes)
      ) {
        return true;
      }

      return startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
    },
    {
      message: 'endTime must be later than startTime when both are provided',
      path: ['endTime'],
    }
  );

const BodySchema = z.union([DirectReservationBodySchema, FromPropositionBodySchema]);

export class CreateReservation extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Create a confirmed reservation for a range',
    description:
      'Allows coordinators and administrators to create a reservation directly or by converting an existing proposition.',
    tags: ['Ranges'],
    request: {
      params: ParamsSchema,
      query: QuerySchema,
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
        description: 'Reservation created successfully',
        content: {
          'application/json': {
            schema: z.object({
              id: z.number(),
              range_id: z.number(),
              coordinator_id: z.number(),
            }),
          },
        },
      },
      '400': {
        description: 'Invalid request payload or conflicting schedule',
      },
      '403': {
        description: 'User not permitted to create reservations',
      },
      '404': {
        description: 'Range or proposition not found',
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
      query,
      body: requestBody,
    } = await this.getValidatedData<{
      params: z.infer<typeof ParamsSchema>;
      query: z.infer<typeof QuerySchema>;
      body: z.infer<typeof BodySchema>;
    }>();

    const force = (query.force ?? 'false') === 'true';

    let command: CreateReservationPayload;
    if ('propositionId' in requestBody) {
      const propositionCommand: CreateReservationFromPropositionCommand = {
        propositionId: requestBody.propositionId,
        startTime: requestBody.startTime,
        endTime: requestBody.endTime,
        tracksRequested: requestBody.tracksRequested,
      };
      command = propositionCommand;
    } else {
      const directCommand: CreateReservationCommand = {
        eventDate: requestBody.eventDate,
        startTime: requestBody.startTime,
        endTime: requestBody.endTime,
        numParticipants: requestBody.numParticipants,
        tracksRequested: requestBody.tracksRequested,
        isPublic: requestBody.isPublic,
        isJoinable: requestBody.isJoinable,
      };
      command = directCommand;
    }

    const result = await reservationsService.createReservation(
      params.rangeSlug,
      command,
      { force },
      user
    );

    if (result.isSuccess) {
      const reservation: CreatedReservationDto = result.getValue();
      c.header(
        'Location',
        `/api/v1/ranges/${params.rangeSlug}/reservations/${reservation.id}`
      );
      return c.json(reservation, 201);
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    if (status === 500) {
      console.error('Unexpected error during reservation creation', error);
    }

    return c.json(body, status);
  }
}
