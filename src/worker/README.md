# Worker Module

This module contains the Cloudflare Worker implementation. It acts as the API gateway and the **composition root** for the backend.

## Dependency Injection and Composition

As the composition root, the worker is responsible for assembling the application. It performs **dependency injection** by connecting the interfaces defined in the `common` module with their concrete implementations from the various business logic modules (e.g., `auth`, `users`, `reservations`).

This means the worker is the only place in the application where modules have direct knowledge of each other's concrete implementations. It "wires up" the different parts of the system.

### Example:

Following the example from the `common` module's documentation, the `worker` would be responsible for creating the `hasRole` function from the `users` module and providing it to the `reservations` module.

```typescript
// In the worker's composition logic

import { createUserModule } from '../users';
import { createReservationsModule } from '../reservations';
import { HasRole } from '../common/ports';

// 1. Instantiate the module that provides the implementation
const users = createUserModule(/* dependencies */);

// 2. Get the concrete function
const hasRole: HasRole = users.hasRole;

// 3. "Inject" the function into the module that needs it
const reservations = createReservationsModule({ hasRole });

// ... now the reservations module can use hasRole without knowing about the users module.
```

This approach keeps the business logic modules decoupled and independently testable.
