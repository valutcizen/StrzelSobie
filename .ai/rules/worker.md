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

## ENDPOINT_CREATION

- Follow RESTful principles for all API endpoints.
- Use nouns for resource names (e.g., `/users`, `/reservations`).
- Use standard HTTP methods for actions: `GET` (retrieve), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (remove).
- Endpoints must be stateless; no session data should be stored on the worker.
- All request and response bodies should use JSON.

## SWAGGER_OPENAPI_DOCUMENTATION

- Every endpoint must be documented using OpenAPI 3.0+ specifications.
- Automatically generate Swagger/OpenAPI documentation from code comments or decorators.
- Use `chanfana`'s `OpenAPIRoute` to define endpoints and their schemas. Schemas should be defined using `zod` to match the DTOs from the `common` module.
- Documentation must include:
  - A clear summary and description of the endpoint's purpose.
  - Detailed descriptions of all request parameters (path, query, header, cookie).
  - Example request and response bodies for all possible status codes.
  - Clear definitions of all data schemas (DTOs).
  - Security scheme requirements (e.g., JWT Bearer token).

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

## TYPESCRIPT_BEST_PRACTICES

- Enforce strong typing by enabling `strict` mode in `tsconfig.json`.
- Forbid the use of `any`; prefer `unknown` with type-safe checks.
- Favor immutability by using `readonly` for properties and arrays.
- Use `interface` for public-facing APIs and `type` for unions, intersections, and utility types.
- Prefer string enums over numeric enums for clarity and debuggability.
- Use ES Modules (`import`/`export`) for all module imports and exports.

## TESTING_STANDARDS

- Utilize `vitest` for all testing.
- Use `miniflare` to run a local environment that accurately simulates the Cloudflare Workers runtime for development and integration testing.
- Focus on end-to-end (E2E) and integration tests to validate the entire request lifecycle.
- E2E tests should simulate real user scenarios from the client's perspective.
- In integration tests, mock external services that are not part of the current flow to ensure isolation.
- Write unit tests for any complex logic or utility functions within the worker itself.

## ERROR_HANDLING

- Standardize HTTP error responses across all endpoints.
- Map internal service errors to appropriate HTTP status codes (e.g., 4xx for client errors, 5xx for server errors).
- Return detailed error messages in a consistent JSON format, but avoid exposing sensitive internal details in production.
- Implement a global error handler to catch unhandled exceptions and return a generic 500 Internal Server Error response.

## ASYNC_OPERATIONS

- Use `async/await` syntax for all asynchronous operations.
- Ensure every promise is handled with a `.catch()` or a `try/catch` block.
- Use `Promise.all` and `Promise.allSettled` for efficient handling of concurrent operations when aggregating data from multiple services.
