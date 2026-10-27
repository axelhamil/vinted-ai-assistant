import type { AiFailure } from "@packages/ai/failures";
import type { InlineImage } from "@packages/ai/inline-image";
import type { Result } from "@packages/ddd-kit";

export type ImageReader = (
  input: string,
) => Promise<Result<InlineImage, AiFailure>>;
