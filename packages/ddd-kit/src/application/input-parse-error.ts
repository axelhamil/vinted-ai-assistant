export class InputParseError extends Error {
  constructor(
    public override readonly message: string,
    public readonly options: ErrorOptions,
  ) {
    super(message, options);
  }
}
