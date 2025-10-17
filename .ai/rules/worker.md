# AI Rules for Strzel Sobie Worker (API Gateway)

## CLOUDFLARE_WORKER_BEST_PRACTICES

- Design the worker to be stateless and adhere to a serverless execution model.
- Manage all configurations (secrets, environment-specific settings) via environment variables in the `wrangler.toml` file.
- Avoid global variables for request-scoped data to prevent context leakage between invocations.
- Use Cloudflare Durable Objects only when explicit state management is required, and understand the associated pricing and performance implications.
- Leverage Cloudflare's native APIs (e.g., for caching, KV store) for optimal performance.

## API_GATEWAY_DESIGN

- The worker acts as the primary entry point for all client requests, leveraging Cloudflare's routing capabilities.
- Route incoming requests to the appropriate backend modules (`auth`, `users`, `reservations`, etc.).
- Aggregate and compose responses from multiple backend services when necessary.
- Implement API versioning through URL paths (e.g., `/api/v1/...`).
- Centralize cross-cutting concerns like authentication, rate limiting, and logging.

## ENDPOINT_DESIGN_PRINCIPLES

- Follow RESTful principles for all API endpoints.
- Use nouns for resource names (e.g., `/users`, `/reservations`).
- Use standard HTTP methods for actions: `GET` (retrieve), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (remove).
- Endpoints must be stateless; no session data should be stored on the worker.
- All request and response bodies should use JSON.

## ENDPOINT_IMPLEMENTATION_PATTERN
- **Location and Structure:**
  - All API endpoints MUST be located in `src/worker/src/endpoints/`.
  - The directory structure MUST follow the pattern: `v<version>/<domain>/<endpoint-name>.ts` (e.g., `v1/auth/login.ts`).
- **Implementation:**
  - Typical imports for endpoint starts with:
    ```js
    import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
    import { z } from 'zod';
    import { Context } from '../../../types';
    ```
  - The class MUST contain:
    - A `schema` property defining the `OpenAPIRouteSchema`.
    - An `async handle(c: Context)` method containing the request logic.
- **Request Handling Flow in `handle` method:**
  1.  Parse and validate request data (body, query, params). Validation MUST use `zod` schemas defined locally within the endpoint file.
  2.  Retrieve the required application service(s) from the Hono context (e.g., `const userService = c.get('userService')`).
  3.  Call the appropriate service method with the validated data.
  4.  Inspect the `Result` object returned by the service.
  5.  Return an HTTP response using `c.json(payload, status)`. The worker is solely responsible for mapping the service result to a final HTTP status code and JSON payload.
- **API Documentation:**
  - The `schema` property is the single source of truth for OpenAPI documentation.
  - It MUST define `summary`, `description`, `tags`, `request` (including schemas for body/query/params), and `responses` for all possible outcomes.
  - Request and response body schemas defined with `zod` MUST align with the DTO types from the `@strzel-sobie/common` package.

## MODULE_INTEGRATION

- The worker is the only module that communicates directly with other backend modules.
- Prefer Cloudflare Service Bindings for efficient, zero-cost communication between workers.
- For other services, use `fetch` for HTTP calls.
- All inter-module communication must go through the contracts defined in `src/common`.
- The worker is responsible for orchestrating calls between different services to fulfill a client request.

## PERFORMANCE_AND_CONSTRAINTS

- Write efficient, non-blocking code to minimize CPU time and ensure fast responses.
- Be mindful of Cloudflare's resource limits, including memory usage, subrequest count, and total execution time.
- Optimize for fast cold starts by keeping the worker bundle size small and minimizing complex initialization logic.

## ERROR_HANDLING

- Standardize HTTP error responses across all endpoints.
- Map internal service errors to appropriate HTTP status codes (e.g., 4xx for client errors, 5xx for server errors).
- To send a JSON response with a specific status code, use the `c.json(body, statusCode)` method. Do not call `c.status()` and return a separate object, as this will result in a 200 OK status.
- Return detailed error messages in a consistent JSON format, but avoid exposing sensitive internal details in production.
- Implement a global error handler to catch unhandled exceptions and return a generic 500 Internal Server Error response.

## ASYNC_OPERATIONS

- Use `async/await` syntax for all asynchronous operations.
- Ensure every promise is handled with a `.catch()` or a `try/catch` block.
- Use `Promise.all` and `Promise.allSettled` for efficient handling of concurrent operations when aggregating data from multiple services.

## ENDPOINT_VERIFICATION
- After implementing a new endpoint and adding relevant automated tests (E2E, integration), the final verification process is as follows:
  1.  Run `npm run build:backend` to ensure the entire backend, including the new endpoint, compiles without errors.
  2.  After a successful build, notify user that the endpoint is ready for manual verification.
