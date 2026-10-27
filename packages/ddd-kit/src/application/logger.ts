export interface ILogger {
  info(context: object, message: string): void;
  warn(context: object, message: string): void;
  error(context: object, message: string): void;
}
