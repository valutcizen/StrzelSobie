# Testing Guidelines Summary

This document summarizes the rule sets that guide how we write tests across the project, especially for backend application services such as `AuthService`.

## Backend Testing Principles

- **Follow Ports & Adapters**: Application services depend on interfaces defined in `src/common`; tests must mock these dependencies instead of instantiating infrastructure classes.
- **Use Vitest**: All unit tests run on Vitest and live under the `tests` workspace (see `tests/package.json`).
- **Mock External Boundaries**: Replace calls to repositories, other services, cryptography helpers, and logging with spies or stubbed promises to keep tests deterministic.
- **Exercise Result Paths**: Service methods return `Result` objects—tests should assert both successful payloads and failure error types.
- **Isolate Side Effects**: Ensure that stateful utilities (like `bcryptjs` or `console.error`) are spied/mocked and reset between tests to avoid cross-test leakage.
- **Keep Tests Close to Contracts**: Import shared DTOs, errors, and interfaces from `src/common/src` so assertions reflect the public service contracts.

These practices stem from `.ai/rules/backend.md` (architecture, testing standards, and error handling) and ensure our tests remain stable, portable, and aligned with the modular design.

## Codex CLI Agent Rule

- Codex CLI must not execute `npm run` commands directly; always request that the user runs them when needed.
