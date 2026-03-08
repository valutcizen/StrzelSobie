import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService, UpdateMessageTemplateCommand } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  templateId: z.coerce.number().int().positive('templateId must be positive'),
});

const BodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.content !== undefined || value.isActive !== undefined, {
    message: 'At least one field must be provided',
  });

export class UpdateMessageTemplate extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Update message template',
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
      '200': { description: 'Template updated' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Template not found' },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');
    const {
      params,
      body,
    } = await this.getValidatedData<{ params: z.infer<typeof ParamsSchema>; body: z.infer<typeof BodySchema> }>();

    const command: UpdateMessageTemplateCommand = {
      name: body.name,
      content: body.content,
      isActive: body.isActive,
    };
    const result = await reservationsService.updateMessageTemplate(params.templateId, command, user);

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const { status, body: errorBody } = mapReservationsError(result.getError());
    return c.json(errorBody, status);
  }
}

