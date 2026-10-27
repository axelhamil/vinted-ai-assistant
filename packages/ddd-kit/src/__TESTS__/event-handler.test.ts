import { describe, expect, it, mock } from "bun:test";
import {
  DomainEventHandler,
  type HandlerFailure,
  type IDomainEvent,
  InMemoryEventDispatcher,
  Result,
} from "../index";

interface ClipRenderedPayload {
  clipId: string;
}

type Publish = (clipId: string) => Promise<Result<void, HandlerFailure>>;

class PublishRenderedClip extends DomainEventHandler<ClipRenderedPayload> {
  readonly eventType = "clip.rendered";
  readonly handlerName = "publish-rendered-clip";

  protected readonly payload = (
    payload: unknown,
  ): Result<ClipRenderedPayload> =>
    typeof payload === "object" && payload !== null && "clipId" in payload
      ? Result.ok({ clipId: String(payload.clipId) })
      : Result.fail("clipId is missing");

  constructor(private readonly publish: Publish) {
    super();
  }

  protected react({
    clipId,
  }: ClipRenderedPayload): Promise<Result<void, HandlerFailure>> {
    return this.publish(clipId);
  }
}

function given(published: Result<void, HandlerFailure> = Result.ok()) {
  const publish = mock<Publish>(async () => published);
  const dispatcher = new InMemoryEventDispatcher();
  const handler = new PublishRenderedClip(publish);
  handler.subscribeTo(dispatcher);

  const clipRendered = (payload: unknown) =>
    ({
      eventType: "clip.rendered",
      aggregateId: "clip-1",
      payload,
      dateOccurred: new Date("2026-10-05T10:00:00Z"),
    }) satisfies IDomainEvent;

  return {
    publish,
    deliver: (payload: unknown) =>
      dispatcher.deliver(clipRendered(payload), new Set()),
    handle: (payload: unknown) => handler.handle(clipRendered(payload)),
  };
}

describe("DomainEventHandler", () => {
  it("reacts to the parsed payload of the event type it subscribed to", async () => {
    const { publish, deliver } = given();

    const delivered = await deliver({ clipId: "clip-1" });

    expect(delivered).toEqual([{ name: "publish-rendered-clip", ok: true }]);
    expect(publish.mock.calls).toEqual([["clip-1"]]);
  });

  it("fails on a malformed payload without reacting, so the relay keeps the event", async () => {
    const { publish, handle } = given();

    const delivered = await handle({ clip: 3 });

    expect(delivered.getError()).toContain(
      "clip.rendered has a malformed payload",
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("fails with the code and message of a typed error of its reaction", async () => {
    const { handle } = given(
      Result.fail({
        code: "PUBLISH_UNAVAILABLE",
        message: "The platform is down, retry later",
      }),
    );

    const delivered = await handle({ clipId: "clip-1" });

    expect(delivered.getError()).toContain(
      "PUBLISH_UNAVAILABLE: The platform is down, retry later",
    );
  });
});
