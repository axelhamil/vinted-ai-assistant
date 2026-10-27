export interface ErrorContext {
  level?: "warning" | "error";
  requestId?: string;
  method?: string;
  route?: string;
  userId?: string;
  tags?: Record<string, string>;
}

export interface SpanOptions {
  name: string;
  op?: string;
}

export interface IInstrumentation {
  capture(error: unknown, context?: ErrorContext): void;
  flush(timeoutMs: number): Promise<void>;
  startSpan<T>(options: SpanOptions, work: () => Promise<T>): Promise<T>;
}
