import type { ILogger } from "@packages/ddd-kit";
import { Client } from "pg";
import { OUTBOX_CHANNEL } from "./outbox-table";
import type { RelayWakeSource } from "./relay-loop";

export interface ListenerMessages {
  connected: string;
  lost: string;
  unreachable: string;
  closed: string;
}

const OUTBOX_MESSAGES: ListenerMessages = {
  connected: "outbox listener connected, relays wake on commit",
  lost: "outbox listener lost its connection, relays fall back to their poll until it reconnects",
  unreachable:
    "outbox listener could not connect, relays keep to their fallback poll",
  closed: "outbox listener closed",
};

export interface OutboxListenerOptions {
  connectionString: string;
  logger: Pick<ILogger, "info" | "warn">;
  channel?: string;
  messages?: ListenerMessages;
  onStateChange?: (connected: boolean) => void;
  applicationName?: string;
  minBackoffMs?: number;
  maxBackoffMs?: number;
  heartbeatIntervalMs?: number;
}

const CONNECT_TIMEOUT_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

export class OutboxListener implements RelayWakeSource {
  private readonly connectionString: string;
  private readonly channel: string;
  private readonly messages: ListenerMessages;
  private readonly logger: Pick<ILogger, "info" | "warn">;
  private readonly onStateChange: (connected: boolean) => void;
  private readonly applicationName: string;
  private readonly minBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly wakes = new Map<string, Set<() => void>>();
  private client: Client | undefined;
  private connecting: Promise<void> = Promise.resolve();
  private connected = false;
  private closed = false;
  private failedAttempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  constructor({
    connectionString,
    logger,
    channel = OUTBOX_CHANNEL,
    messages = OUTBOX_MESSAGES,
    onStateChange = () => {},
    applicationName = "vinted-outbox-listener",
    minBackoffMs = 250,
    maxBackoffMs = 15_000,
    heartbeatIntervalMs = 15_000,
  }: OutboxListenerOptions) {
    this.connectionString = connectionString;
    this.channel = channel;
    this.messages = messages;
    this.logger = logger;
    this.onStateChange = onStateChange;
    this.applicationName = applicationName;
    this.minBackoffMs = minBackoffMs;
    this.maxBackoffMs = maxBackoffMs;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  start(): void {
    if (this.closed) return;

    this.connecting = this.connect();
  }

  subscribe(outbox: string, wake: () => void): () => void {
    const wakes = this.wakes.get(outbox) ?? new Set();
    wakes.add(wake);
    this.wakes.set(outbox, wakes);

    return () => {
      wakes.delete(wake);
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.heartbeatTimer);
    await this.connecting;

    const client = this.client;
    this.client = undefined;
    if (!client) return;

    await client.end();
    this.logger.info({}, this.messages.closed);
  }

  private async connect(): Promise<void> {
    const client = new Client({
      connectionString: this.connectionString,
      application_name: this.applicationName,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      query_timeout: HEARTBEAT_TIMEOUT_MS,
      keepAlive: true,
    });
    const lose = (error?: unknown) => this.lose(client, error);
    this.client = client;

    client.on("error", lose);
    client.on("end", () => lose());
    client.on("notification", ({ payload }) => this.wake(payload));

    try {
      await client.connect();
      await client.query(`listen ${this.channel}`);
    } catch (error) {
      lose(error);
      return;
    }

    if (this.closed || this.client !== client) return;

    this.failedAttempts = 0;
    this.connected = true;
    this.heartbeatTimer = setInterval(() => {
      client.query("select 1").catch(lose);
    }, this.heartbeatIntervalMs);
    this.logger.info({}, this.messages.connected);
    this.onStateChange(true);
    this.wakeEveryRelay();
  }

  private lose(client: Client, error?: unknown): void {
    if (this.closed || this.client !== client) return;

    this.client = undefined;
    clearInterval(this.heartbeatTimer);
    client.removeAllListeners();
    client.on("error", () => {});
    client.end().catch(() => {});

    const retryInMs = Math.min(
      this.maxBackoffMs,
      this.minBackoffMs * 2 ** this.failedAttempts,
    );
    const wasConnected = this.connected;
    this.failedAttempts++;
    this.connected = false;
    this.logger.warn(
      { err: error, retryInMs, failedAttempts: this.failedAttempts },
      wasConnected ? this.messages.lost : this.messages.unreachable,
    );
    if (wasConnected) this.onStateChange(false);

    this.retryTimer = setTimeout(() => this.start(), retryInMs);
  }

  private wake(outbox: string | undefined): void {
    for (const wake of this.wakes.get(outbox ?? "") ?? []) wake();
  }

  private wakeEveryRelay(): void {
    for (const wakes of this.wakes.values()) {
      for (const wake of wakes) wake();
    }
  }
}
