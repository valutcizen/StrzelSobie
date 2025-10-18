import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { CreateRecordCommand, CreatedRecordDto, IReservationsService } from '@strzel-sobie/common';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z
    .string()
    .trim()
    .min(1, 'rangeSlug is required'),
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
        required_error: 'numParticipants is required',
        invalid_type_error: 'numParticipants must be a number',
      })
      .int('numParticipants must be an integer')
      .min(1, 'At least one participant is required')
      .max(500, 'numParticipants cannot exceed 500'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const [startHours, startMinutes] = value.startTime.split(':').map(Number);
    const [endHours, endMinutes] = value.endTime.split(':').map(Number);

    if (
      [startHours, startMinutes, endHours, endMinutes].some((timePart) =>
        Number.isNaN(timePart)
      )
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

export class CreateRecord extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Create a manual usage record for a range',
    description:
      'Allows range administrators to log off-system shooting activity so it contributes to reporting without creating a reservation.',
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
        description: 'Record created successfully',
        content: {
          'application/json': {
            schema: z.object({
              id: z.number(),
              rangeId: z.number(),
              adminId: z.number(),
              eventDate: z.string(),
              startTime: z.string(),
              endTime: z.string(),
              numParticipants: z.number(),
              createdAt: z.string(),
            }),
          },
        },
        headers: z.object({
          Location: z
            .string()
            .describe('URL of the created record resource'),
        }),
      },
      '400': {
        description: 'Validation failed for request payload',
      },
      '403': {
        description: 'User not permitted to create records for the requested range',
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

    const command: CreateRecordCommand = {
      eventDate: requestBody.eventDate,
      startTime: requestBody.startTime,
      endTime: requestBody.endTime,
      numParticipants: requestBody.numParticipants,
    };

    const result = await reservationsService.createRecord(params.rangeSlug, command, user);

    if (result.isSuccess) {
      const record: CreatedRecordDto = result.getValue();
      c.header(
        'Location',
        `/api/v1/ranges/${params.rangeSlug}/records/${record.id}`
      );
      return c.json(record, 201);
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    if (status === 500) {
      console.error('Unexpected error during record creation', error);
    }

    return c.json(body, status);
  }
}
