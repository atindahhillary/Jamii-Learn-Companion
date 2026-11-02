import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { seed } from "./seed.js";

await seed();
serve({ fetch: app.fetch, port: 8787 }, () => console.log("api on http://localhost:8787"));
