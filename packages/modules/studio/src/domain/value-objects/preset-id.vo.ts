import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";
import { PRESET_IDS, type PresetIdValue } from "../presets";

const presetIdSchema = z.enum(PRESET_IDS);

export class PresetId extends ValueObject<PresetIdValue> {
  static parse(raw: string): Result<PresetId> {
    const result = presetIdSchema.safeParse(raw);
    if (!result.success) return Result.fail(`Unknown preset ${raw}`);

    return PresetId.create(result.data);
  }

  protected validate(value: PresetIdValue): Result<PresetIdValue> {
    const result = presetIdSchema.safeParse(value);
    if (!result.success) return Result.fail(`Unknown preset ${value}`);

    return Result.ok(result.data);
  }
}
