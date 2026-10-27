import { describe, expect, it } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BaseDomainEvent } from "@packages/ddd-kit";
import { Glob } from "bun";
import { eventRoutes } from "./event-routes";

const EVENTS_DIR = join(
  dirname(
    fileURLToPath(import.meta.resolve("@packages/analysis/analysis.module")),
  ),
  "domain/events",
);

function isEventClass(
  value: unknown,
): value is new (
  ...args: unknown[]
) => BaseDomainEvent {
  return (
    typeof value === "function" && value.prototype instanceof BaseDomainEvent
  );
}

async function recordedEventTypes(): Promise<string[]> {
  const types: string[] = [];

  for await (const file of new Glob("*.event.ts").scan(EVENTS_DIR)) {
    const exported: Record<string, unknown> = await import(
      join(EVENTS_DIR, file)
    );

    for (const value of Object.values(exported)) {
      if (!isEventClass(value)) continue;

      types.push(new value("aggregate-id", {}, new Date()).eventType);
    }
  }

  return types;
}

describe("the api event routes", () => {
  it("handle or ignore every event the analysis module records", async () => {
    const types = await recordedEventTypes();
    const routed = [...eventRoutes.handled, ...eventRoutes.ignored];

    expect(types.length).toBeGreaterThan(0);
    expect(types.filter((type) => !routed.includes(type))).toEqual([]);
  });
});
