import { fromHono } from "chanfana";
import { Hono } from "hono";
import { RegisterUser } from "./endpoints/auth/register";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

openapi.post('/api/v1/auth/register', RegisterUser);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
