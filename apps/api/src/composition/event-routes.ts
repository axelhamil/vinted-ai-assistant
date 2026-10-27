import type { EventRoutes } from "@packages/outbox/outbox-relay";

export const eventRoutes: EventRoutes = {
  handled: [],
  ignored: [
    "analysis.completed",
    "analysis.status_changed",
    "analysis.deleted",
  ],
};
