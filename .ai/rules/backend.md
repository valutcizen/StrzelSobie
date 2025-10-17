# AI Rules for Strzel Sobie backend modules

## ARCHITECTURE_AND_DESIGN

- Inject all dependencies; never instantiate them directly within a module.
- Communicate between modules exclusively via contracts defined in `src/common`.
- Isolate pure business logic from infrastructure concerns (Ports & Adapters).
- Structure modules internally into `domain`, `application`, and `infrastructure` layers.
- `domain` contain interface for domain objects, `application` uses `domain` by constructor, secyfic implementation for `domain` repositories is in `infrastructure`. This make code easy to mock for testing.
- For `infrastructure` implementation of D1 use `IDatabase` from `src\common\src\db.ts`
- Return domain-specific results (`Result` objects, DTOs) from application services, not HTTP-specific responses. Don't use `Result` for database responses, only in service top level iplementation. The `worker` module is solely responsible for translating these results into HTTP status codes and payloads.

## INTER_MODULE_COMMUNICATION
- All communication between backend modules (e.g., `auth` calling `users`) MUST go through service interfaces defined in `src/common/users/service.ts`.
- A module that provides a service (e.g., `users`) owns its implementation (`src/users/application/user.service.ts`).
- The public contract for that service (e.g., `src/common/users/service.ts`) is shared.
- **CRITICAL**: Before modifying a service interface in `src/common`, you MUST perform a global search to identify all modules that use that interface. You must ensure that any changes (renaming, removing, or changing the signature of a method) are reflected in all consumer modules to prevent breaking changes. Do not remove methods from a shared interface if they are still used by another module.

## TYPESCRIPT_BEST_PRACTICES

- Enforce strong typing by enabling `strict` mode in `tsconfig.json`.
- Forbid the use of `any`; prefer `unknown` with type-safe checks.
- Favor immutability by using `readonly` for properties and arrays.
- Use `interface` for public-facing APIs and `type` for unions, intersections, and utility types.
- Prefer string enums over numeric enums for clarity and debuggability.
- Use ES Modules (`import`/`export`) for all module imports and exports.
- Try to use common packages and not to add new ones.

## TESTING_STANDARDS

- Utilize `vitest` as the exclusive framework for unit and integration tests.
- Write comprehensive unit tests covering all business logic, edge cases, and error states.
- Mock all external dependencies in unit tests using `vi.mock` to ensure isolation.
- Implement integration tests to validate interactions between modules.
- Design code for testability by avoiding static methods and side effects in logic.
- No tests are in module directory. Fe. `users` module tests are in `tests/users` path

## ERROR_HANDLING

- Implement custom error classes extending `Error` for semantic error reporting. Errors are in `src\auth\src\domain\errors.ts`
- On public module interface return a `Result` type for predictable failures instead of throwing exceptions.
- Reserve exceptions for truly unexpected or unrecoverable application errors.
- Inside module (not public interface) use standard `Error` throwing and catching.

## ASYNC_OPERATIONS

- Use `async/await` syntax for all asynchronous operations.
- Ensure every promise is handled with a `.catch()` or a `try/catch` block.
- Use `Promise.all` and `Promise.allSettled` for efficient handling of concurrent operations.

## PERSISTANCE
- Every module has ownersip of DB tables, where name starts from module name
- Every change needed to be done on not owned table, need to be performed by calling module that own the table