# AI Rules for Strzel Sobie backend modules

## ARCHITECTURE_AND_DESIGN

- Inject all dependencies; never instantiate them directly within a module.
- Communicate between modules exclusively via contracts defined in `src/common`.
- Isolate pure business logic from infrastructure concerns (Ports & Adapters).
- Adhere strictly to the Single Responsibility Principle (SRP) for all classes and functions.
- Structure modules internally into `domain`, `application`, and `infrastructure` layers.

## TYPESCRIPT_BEST_PRACTICES

- Enforce strong typing by enabling `strict` mode in `tsconfig.json`.
- Forbid the use of `any`; prefer `unknown` with type-safe checks.
- Favor immutability by using `readonly` for properties and arrays.
- Use `interface` for public-facing APIs and `type` for unions, intersections, and utility types.
- Prefer string enums over numeric enums for clarity and debuggability.
- Use ES Modules (`import`/`export`) for all module imports and exports.

## TESTING_STANDARDS

- Utilize `vitest` as the exclusive framework for unit and integration tests.
- Write comprehensive unit tests covering all business logic, edge cases, and error states.
- Mock all external dependencies in unit tests using `vi.mock` to ensure isolation.
- Implement integration tests to validate interactions between modules.
- Design code for testability by avoiding static methods and side effects in logic.

## ERROR_HANDLING

- Implement custom error classes extending `Error` for semantic error reporting.
- Return a `Result` or `Either` type for predictable failures instead of throwing exceptions.
- Reserve exceptions for truly unexpected or unrecoverable application errors.
- Avoid returning `null`; use `Option`/`Result` types or return empty collections instead.

## ASYNC_OPERATIONS

- Use `async/await` syntax for all asynchronous operations.
- Ensure every promise is handled with a `.catch()` or a `try/catch` block.
- Use `Promise.all` and `Promise.allSettled` for efficient handling of concurrent operations.

## PERSISTANCE
- Every module has ownersip of DB tables, where name starts from module name
- Every change needed to be done on not owned table, need to be performed by calling module that own the table