# AI Rules for Strzel Sobie client

## VUE_CODING_STANDARDS

- Use the Composition API instead of the Options API for better type inference and code reuse
- Implement <script setup> for more concise component definitions
- Use Suspense and async components for handling loading states during code-splitting
- Leverage the defineProps and defineEmits macros for type-safe props and events
- Use the new defineOptions for additional component options
- Implement provide/inject for dependency injection instead of prop drilling in deeply nested components
- Use the Teleport component for portal-like functionality to render UI elsewhere in the DOM
- Leverage ref over reactive for primitive values to avoid unintended unwrapping
- Use v-memo for performance optimization in render-heavy list rendering scenarios
- Implement shallow refs for large objects that don't need deep reactivity

## VUE_ROUTER

- Use route guards (beforeEach, beforeEnter) for authentication and authorization checks
- Implement lazy loading with dynamic imports for route components to improve performance
- Use named routes instead of hardcoded paths for better maintainability
- Leverage route meta fields to store additional route information like permissions or layout data
- Implement scroll behavior options to control scrolling between route navigations
- Use navigation duplicates handling to prevent redundant navigation to the current route
- Implement the composition API useRouter and useRoute hooks instead of this.$router
- Use nested routes for complex UIs with parent-child relationships
- Leverage route params validation with sensitive: true for parameters that shouldn't be logged
- Implement dynamic route matching with path parameters and regex patterns for flexible routing

## DATA_CONTRACTS

- Reuse request/response DTOs and service interfaces from `@strzel-sobie/common`; do **not** hand-roll duplicate TypeScript shapes for API calls.
- When checking permissions or building role lists, rely on `UserRoleEnum` exported from the shared package instead of string literals.
- Map incoming data through shared helpers/types before storing it in Pinia to keep the client aligned with backend contracts.

## INTERNATIONALIZATION

- Do not ship user-facing text as literals; pull copy from the shared message catalog in `src/client/src/plugins/i18n.ts` and add keys for both `en` and `pl` when introducing new strings.
- Use the Composition API `useI18n` hook in components and views to access `t`, `locale`, and any other helpers you need; avoid injecting translations via props unless there is a strong reuse case.
- Reuse the existing `common.*` keys (actions, feedback, labels) for standard buttons or alerts instead of creating duplicates in feature-specific namespaces.
- When formatting dates or numbers (e.g., with `date-fns`), derive the locale from `useI18n().locale` so the output matches the active language.
