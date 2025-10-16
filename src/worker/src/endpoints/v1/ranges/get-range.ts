import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { Context } from "../../../types";
import { z } from "zod";

export class GetRange extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: "Get Range Details",
    description: "Retrieves public details for a specific shooting range.",
    tags: ["Ranges"],
    request:{
      params: z.object({
        rangeSlug: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Returns range details"
      },
      "404": {
        description: "Range not found"
      },
    },
  };

  async handle(c: Context) {
    const { params } : {params: { rangeSlug: string }} = await this.getValidatedData<{params: { rangeSlug: string }}>();
    const rangesService = c.get("rangesService");
    const result = await rangesService.getRangeDetails(params.rangeSlug);

    if (!result.isSuccess) {
      return c.json(
        {
          success: false,
          error: result.getError()
        },
        404
      );
    }

    return c.json({ success: true, result: result.getValue() });
  }
}
