# Common Module

This module contains shared utilities, types, and constants that are not specific to any business domain.

## Cross-Module Communication Contracts

A key responsibility of the `common` module is to define the contracts (interfaces and types) that enable communication between other modules without creating direct dependencies between them. This promotes loose coupling and modularity.

For example, an interface for a function can be defined here, which other modules can then use. The actual implementation of that function will be "injected" by the composition root (`src/worker`).

### Example:

A feature in the `reservations` module might need to check if a user has a specific role. Instead of depending directly on the `users` module, it can use a function type defined in `common`:

```typescript
// In src/common/ports.ts
export type HasRole = (userId: string, role: string) => Promise<boolean>;
```

The `reservations` module would then declare its need for this function, and the `worker` module would provide the actual implementation from the `users` module during application startup.
