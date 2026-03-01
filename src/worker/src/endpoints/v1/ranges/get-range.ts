import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { RangeNotFoundError } from '@strzel-sobie/common';
import { type UserDto, type Role } from '@strzel-sobie/common/models';
import { getCookie } from 'hono/cookie';
import { Context } from '../../../types';
import { z } from 'zod';

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
        description: "Returns range details",
        content: {
          'application/json': {
            schema: z.object({
              id: z.number(),
              slug: z.string(),
              displayName: z.string(),
              type: z.string(),
              allowsReservations: z.boolean(),
              publicDescription: z.string().nullable().optional(),
              memberDescription: z.string().nullable().optional(),
              latitude: z.number().nullable().optional(),
              longitude: z.number().nullable().optional(),
              totalTracks: z.number().nullable().optional(),
              operatingHours: z.record(z.any()).optional(),
              parkingLocation: z
                .object({
                  latitude: z.number(),
                  longitude: z.number(),
                })
                .nullable()
                .optional(),
              extras: z
                .object({
                  allowMemberEvents: z.boolean().optional(),
                  mapLogoUrl: z.string().nullable().optional(),
                  voivodeship: z.string().nullable().optional(),
                  address: z.string().nullable().optional(),
                  phone: z.string().nullable().optional(),
                  details: z.string().nullable().optional(),
                  parkingLocation: z
                    .object({
                      latitude: z.number(),
                      longitude: z.number(),
                    })
                    .nullable()
                    .optional(),
                })
                .optional(),
            }),
          },
        },
      },
      "404": {
        description: "Range not found"
      },
    },
  };

  async handle(c: Context) {
    const { params }: { params: { rangeSlug: string } } =
      await this.getValidatedData<{ params: { rangeSlug: string } }>();
    const rangesService = c.get('rangesService');
    const authService = c.get('authService');
    const userService = c.get('userService');

    let user: UserDto | null = null;
    const sessionToken = getCookie(c, 'session_token');
    if (sessionToken) {
      const sessionResult = await authService.validateSession(sessionToken);
      if (sessionResult.isSuccess) {
        const session = sessionResult.getValue();
        const userResult = await userService.getFullUserProfile(session.userId);
        const rolesResult = await userService.getRoles();

        if (userResult.isSuccess && rolesResult.isSuccess) {
          const profile = userResult.getValue();
          const allRoles = rolesResult.getValue();
          const roleMap = new Map(allRoles.map((role) => [role.name, role]));

          const rangeRoles = Object.entries(profile.rangeRoles ?? {}).reduce(
            (acc, [rangeId, roleNames]) => {
              acc[rangeId] = roleNames
                .map((roleName) => roleMap.get(roleName))
                .filter((role): role is Role => Boolean(role));
              return acc;
            },
            {} as Record<string, Role[]>
          );

          user = {
            id: profile.id,
            email: profile.email,
            isDeleted: 0,
            createdAt: new Date().toISOString(),
            roles: profile.roles
              .map((roleName) => roleMap.get(roleName))
              .filter((role): role is Role => Boolean(role)),
            rangeRoles,
            range_roles: rangeRoles,
          };
        }
      }
    }

    const result = user
      ? await rangesService.getRangeDetails(params.rangeSlug, user)
      : await rangesService.getRangeDetails(params.rangeSlug);

    if (!result.isSuccess) {
      const error = result.getError();
      console.error('Error while fetching range details', error);

      if (error instanceof RangeNotFoundError) {
        return c.json({ error: error.message }, 404);
      }

      return c.json({ error: 'Failed to fetch range details' }, 500);
    }

    return c.json(result.getValue(), 200);
  }
}
