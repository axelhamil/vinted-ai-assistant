import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import sharp from "sharp";
import { z } from "zod";
import type { AiFailure } from "../src/failures";
import { createGeminiClient, type GeminiClient } from "../src/gemini-client";
import { IMAGE_MODEL, TEXT_MODEL } from "../src/models";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

function report(step: string, failure: AiFailure) {
  const status = failure.status.map(String).unwrapOr("none");

  process.stderr.write(
    `${step} failed: ${failure.code} (status ${status})\n${failure.detail}\n`,
  );
  process.exitCode = 1;
}

async function timed<T>(run: () => Promise<T>) {
  const startedAt = performance.now();
  const value = await run();

  return { value, ms: Math.round(performance.now() - startedAt) };
}

async function smokeStructured(client: GeminiClient) {
  const structured = await timed(() =>
    client.generateStructured({
      system: "You answer in one short JSON object.",
      prompt: "What is the capital of France? Give its name and population.",
      images: [],
      schema: z.object({ city: z.string(), population: z.number() }),
      search: true,
    }),
  );
  if (structured.value.isFailure) {
    report("generateStructured", structured.value.getError());
    return;
  }

  const answer = structured.value.getValue();
  process.stdout.write(
    `generateStructured ok: model ${TEXT_MODEL}, ${structured.ms} ms, ${answer.sources.length} sources, data ${JSON.stringify(answer.data)}\n`,
  );
}

async function smokeImage(client: GeminiClient) {
  const png = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 30, g: 60, b: 200 },
    },
  })
    .png()
    .toBuffer();

  const edited = await timed(() =>
    client.editImage({
      source: { mimeType: "image/png", base64: png.toString("base64") },
      instruction: "Turn this blue square into a red square.",
    }),
  );
  if (edited.value.isFailure) {
    report("editImage", edited.value.getError());
    return;
  }

  const image = edited.value.getValue();
  process.stdout.write(
    `editImage ok: model ${IMAGE_MODEL}, ${edited.ms} ms, ${image.mimeType}, ${image.bytes.length} bytes\n`,
  );
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    process.stdout.write("skipped: GEMINI_API_KEY not set\n");
    return;
  }

  const client = createGeminiClient({ apiKey });

  await smokeStructured(client);
  await smokeImage(client);
}

await main();
