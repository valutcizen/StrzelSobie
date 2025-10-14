import {
  ForbiddenError,
  RangeNotFoundError,
  RoleNotFoundError,
  RoleScopeError,
  UserNotFoundError,
} from "@strzel-sobie/common";
import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from "zod";

export class RemoveUserRoleRoute extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: "Remove a role from a user",
    description: "Removes a role from a user. This endpoint is restricted to authorized administrators.",
    tags: ["Users"],
    request: {
      params: z.object({
        userId: z.string(),
        roleId: z.string(),
      }),
      query: z.object({
        rangeId: z.string().optional(),
      }),
    },
    responses: {
      "204": {
        description: "Role removed successfully",
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
    const { params, query } = await this.getValidatedData();

    const requester = c.get("user");
    const userService = c.get("userService");

    const result = await userService.removeRoleFromUser({
      targetUserId: parseInt(params.userId, 10),
      roleId: parseInt(params.roleId, 10),
      rangeId: query.rangeId ? parseInt(query.rangeId, 10) : null,
      requester,
    });

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.error;
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
