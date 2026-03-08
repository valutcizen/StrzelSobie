import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { CreateMessageTemplateCommand, IReservationsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
});

const BodySchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  content: z.string().trim().min(1, 'content is required'),
});

export class CreateMessageTemplate extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Create message template for a range',
    tags: ['Reservations'],
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
      '201': { description: 'Template created' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Range not found' },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');
    const {
      params,
      body,
    } = await this.getValidatedData<{ params: z.infer<typeof ParamsSchema>; body: z.infer<typeof BodySchema> }>();

    const command: CreateMessageTemplateCommand = {
      name: body.name,
      content: body.content,
    };
    const result = await reservationsService.createMessageTemplate(params.rangeSlug, command, user);

    if (result.isSuccess) {
      return c.json(result.getValue(), 201);
    }

    const { status, body: errorBody } = mapReservationsError(result.getError());
    return c.json(errorBody, status);
  }
}

