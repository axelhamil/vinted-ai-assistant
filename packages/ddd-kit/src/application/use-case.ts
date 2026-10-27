import type { Result } from "../primitives/result";

export interface UseCase<Input, Output, Failure = string> {
  execute(
    input: Input,
  ): Promise<Result<Output, Failure>> | Result<Output, Failure>;
}
