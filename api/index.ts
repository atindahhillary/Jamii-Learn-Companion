import { handle } from "hono/vercel";
import { app } from "../server/app.js";
import { seed } from "../server/seed.js";

await seed();
export default handle(app);
