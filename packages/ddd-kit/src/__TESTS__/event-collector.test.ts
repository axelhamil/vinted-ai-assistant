import { afterEach, describe, expect, it, mock } from "bun:test";
import { EventCollector, type IDomainEvent } from "../index";

const eventOf = (aggregateId: string): IDomainEvent => ({
  eventType: "clip.rendered",
  dateOccurred: new Date("2026-10-05T10:00:00Z"),
  aggregateId,
  payload: {},
});

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("EventCollector", () => {
  afterEach(() => EventCollector.setOutOfContextLogger(null));

  it("collects the events of a unit of work and hands them over once", async () => {
    const { drained, drainedAgain } = await EventCollector.runWithContext(
      async () => {
        EventCollector.add(eventOf("clip-1"));
        EventCollector.add([eventOf("clip-2"), eventOf("clip-3")]);

        return {
          drained: EventCollector.drain(),
          drainedAgain: EventCollector.drain(),
        };
      },
    );

    expect(drained.map((event) => event.aggregateId)).toEqual([
      "clip-1",
      "clip-2",
      "clip-3",
    ]);
    expect(drainedAgain).toEqual([]);
  });

  it("keeps the events of concurrent units of work apart", async () => {
    const slow = EventCollector.runWithContext(async () => {
      EventCollector.add(eventOf("slow-1"));
      await pause(10);
      EventCollector.add(eventOf("slow-2"));

      return EventCollector.drain();
    });
    const fast = EventCollector.runWithContext(async () => {
      EventCollector.add(eventOf("fast-1"));

      return EventCollector.drain();
    });

    const [slowEvents, fastEvents] = await Promise.all([slow, fast]);

    expect(slowEvents.map((event) => event.aggregateId)).toEqual([
      "slow-1",
      "slow-2",
    ]);
    expect(fastEvents.map((event) => event.aggregateId)).toEqual(["fast-1"]);
  });

  it("leaves nothing behind once the unit of work is over", async () => {
    await EventCollector.runWithContext(async () => {
      EventCollector.add(eventOf("clip-1"));
    });

    expect(EventCollector.hasContext()).toBe(false);
    expect(EventCollector.drain()).toEqual([]);
  });

  it("reports an event added outside a unit of work instead of losing it silently", () => {
    const report =
      mock<(message: string, meta?: Record<string, unknown>) => void>();
    EventCollector.setOutOfContextLogger(report);

    EventCollector.add([]);
    EventCollector.add(eventOf("clip-1"));

    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.lastCall?.[1]).toEqual({
      eventTypes: ["clip.rendered"],
      aggregateIds: ["clip-1"],
    });
    expect(EventCollector.drain()).toEqual([]);
  });

  it("collects the events of a saved aggregate once, however often it is saved", async () => {
    const report =
      mock<(message: string, meta?: Record<string, unknown>) => void>();
    EventCollector.setOutOfContextLogger(report);
    const pending = [eventOf("clip-1"), eventOf("clip-1")];
    const clip = { pullDomainEvents: () => pending.splice(0) };
    const untouched = { pullDomainEvents: () => [] };

    const collected = await EventCollector.runWithContext(async () => {
      EventCollector.collectFrom(clip);
      EventCollector.collectFrom([clip, untouched]);

      return EventCollector.drain();
    });
    EventCollector.collectFrom(untouched);

    expect(collected).toHaveLength(2);
    expect(report).not.toHaveBeenCalled();
  });
});
