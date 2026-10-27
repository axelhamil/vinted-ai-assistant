import { describe, expect, it } from "bun:test";
import { domainEventToOutboxRow, type IDomainEvent } from "../index";

const linkCreated: IDomainEvent<{ slug: string }> = {
  eventType: "link.created",
  dateOccurred: new Date("2026-10-05T10:00:00Z"),
  aggregateId: "link-1",
  payload: { slug: "promo" },
};

describe("domainEventToOutboxRow", () => {
  it("should describe the event as a CloudEvents row scoped to its aggregate", () => {
    const row = domainEventToOutboxRow(linkCreated, {
      id: "outbox-1",
      source: "openup/api",
      aggregateType: "link",
      requestId: "req-1",
    });

    expect(row).toEqual({
      id: "outbox-1",
      eventType: "link.created",
      aggregateId: "link-1",
      aggregateType: "link",
      organizationId: null,
      payload: { slug: "promo" },
      metadata: {
        specversion: "1.0",
        source: "openup/api",
        subject: "link-1",
        traceparent: undefined,
        requestId: "req-1",
        datacontenttype: "application/json",
      },
      occurredAt: new Date("2026-10-05T10:00:00Z"),
    });
  });
});
