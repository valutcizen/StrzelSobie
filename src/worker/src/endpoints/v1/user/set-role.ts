import {
  AssignRoleCommand,
  ForbiddenError,
  RangeNotFoundError,
  RoleNotFoundError,
  RoleScopeError,
  UserNotFoundError,
} from "@strzel-sobie/common";
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from "zod";

export class SetUserRoleRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: "Assign a role to a user",
    description: "Assigns a role to a user. This endpoint is restricted to authorized administrators.",
    tags: ["Users"],
    request: {
      params: z.object({
        userId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              roleId: z.number(),
              rangeId: z.number().nullable(),
            }),
          },
        },
      },
    },
    responses: {
      "204": {
        description: "Role assigned successfully",
      },
      "400": {
        description: "Bad Request",
      },
      "401": {
        description: "Unauthorized",
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Not Found",
      },
    },
  };

  async handle(c) {
    const { params, body } = await this.getValidatedData();

    const requester = c.get("user");
    const userService = c.get("userService");

    const result = await userService.assignRoleToUser({
      targetUserId: parseInt(params.userId, 10),
      roleId: body.roleId,
      rangeId: body.rangeId,
      requester,
    });

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.error;
    console.error('Error while assigning role to user', error);
    if (error instanceof UserNotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof RoleNotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof RangeNotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof RoleScopeError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }

    return c.json({ error: "Internal Server Error" }, 500);
  }
}
