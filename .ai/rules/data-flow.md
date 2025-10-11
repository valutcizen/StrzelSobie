# AI Rules for Data Flow and Object Modeling

This document outlines the standard data flow and object transformation architecture for the Strzel Sobie application. Adhering to this pattern is crucial for maintaining a clean, layered architecture.

## DATA_OBJECT_HIERARCHY

The application uses a clear hierarchy of data objects, each with a specific purpose and boundary. The flow is as follows:

**`DTO` ↔ `API Layer` → `Domain Entity` ↔ `Service/Persistence Layer` ↔ `DB Model` ↔ `Database`**

1.  **DTO (Data Transfer Object):**
    *   **Location:** `src/common/dto/`
    *   **Purpose:** Plain objects that define the public API contract. They are the single source of truth for the shape of data sent between the client and the backend.
    *   **Usage:** Used as the body for API requests and responses. They should not contain any business logic.

2.  **Domain Entity:**
    *   **Location:** Inside the `domain` directory of a specific module (e.g., `src/reservations/domain/`).
    *   **Purpose:** Rich objects that encapsulate core business logic and rules. They represent the heart of the application's functionality.
    *   **Usage:** Used within the module's service layer to perform operations. An entity can have methods that enforce business rules (e.g., `reservation.cancel()`).

3.  **Database Model:**
    *   **Location:** Inside the `infrastructure/persistence` directory of a specific module.
    *   **Purpose:** A plain object that directly maps to the structure of a database table.
    *   **Usage:** Used exclusively by the persistence layer (repositories) to read from and write to the database.

## DATA_TRANSFORMATION_RULES

- **Client:** The client application (in `src/client`) MUST only interact with DTOs defined in `src/common/dto`.

- **API Layer (`src/worker`):**
    - The worker is responsible for receiving requests, validating the incoming DTOs, and calling the appropriate module's service.
    - It passes the DTOs inward to the service layer. It should NOT be aware of Domain Entities or Database Models.

- **Service Layer (in each module):**
    - This is the primary layer for data transformation.
    - On receiving a DTO for a write operation (create/update), it MUST convert it into a Domain Entity before executing business logic.
    - When data is to be persisted, it passes the Domain Entity to the persistence layer.
    - On receiving a Domain Entity from the persistence layer (read operation), it MUST convert it to a DTO before returning it to the API layer.

- **Persistence Layer (in each module):**
    - This layer's sole responsibility is to map Domain Entities to Database Models (and vice-versa).
    - It contains the logic for database queries and should never leak Database Models outside of its boundary.
