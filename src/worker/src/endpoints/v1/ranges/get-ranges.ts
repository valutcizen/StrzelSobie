import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { Context } from '../../../types';

export class GetRangesRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get all shooting ranges',
    tags: ['Ranges'],
    responses: {
      '200': {
        description: 'A list of shooting ranges',
        content: {
          'application/json': {
            schema: undefined,
          },
        },
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    const rangesService = c.get('rangesService');

    const result = await rangesService.getRanges();

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const error = result.getError();
    console.error('Error while fetching ranges', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}
