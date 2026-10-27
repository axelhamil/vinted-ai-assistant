import { Hono } from "hono";
import type { IDatabaseProbe } from "../../ports/database-probe.port";
import { errorBody } from "./error-handler";

export interface HealthRoutesDeps {
  databaseProbe: IDatabaseProbe;
}

export function createHealthRoutes(deps: HealthRoutesDeps) {
  return new Hono()
    .get("/live", (c) => c.json({ status: "ok" }, 200))
    .get("/ready", async (c) => {
      const probed = await deps.databaseProbe.check();
      if (probed.isSuccess) return c.json({ status: "ok" }, 200);

      return c.json(
        errorBody(
          probed.getError(),
          "The database is not answering. Check that Postgres is running and DATABASE_URL points to it.",
          c.get("requestId"),
        ),
        503,
      );
    });
}
