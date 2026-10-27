export const PRESET_IDS = [
  "preset-white-studio",
  "preset-marble-surface",
  "preset-lifestyle",
  "preset-fashion-editorial",
  "preset-minimalist",
] as const;

export type PresetIdValue = (typeof PRESET_IDS)[number];

export interface SystemPreset {
  id: PresetIdValue;
  name: string;
  description: string;
  background: string;
  sortOrder: number;
}

const DEFINITIONS: Readonly<Record<PresetIdValue, Omit<SystemPreset, "id">>> = {
  "preset-white-studio": {
    name: "White Studio",
    description:
      "Clean white table with subtle texture and soft lighting. Perfect for e-commerce.",
    background:
      "A white table with a subtle matte texture, like painted wood or laminate, lit by soft diffused light from above that casts gentle shadows under the item.",
    sortOrder: 1,
  },
  "preset-marble-surface": {
    name: "Marble Surface",
    description:
      "Elegant marble surface with subtle reflections. Ideal for luxury items.",
    background:
      "An elegant white or light grey marble surface with subtle veining, lit by soft natural light with gentle shadows.",
    sortOrder: 2,
  },
  "preset-lifestyle": {
    name: "Lifestyle Setting",
    description:
      "Cozy lifestyle environment with natural light. Great for casual items.",
    background:
      "A cozy room with a wooden floor and neutral furniture, lit by warm natural daylight.",
    sortOrder: 3,
  },
  "preset-fashion-editorial": {
    name: "Fashion Editorial",
    description:
      "Dramatic editorial style with bold lighting. Perfect for statement pieces.",
    background:
      "A solid charcoal grey or muted backdrop, lit by dramatic studio lighting with defined shadows.",
    sortOrder: 4,
  },
  "preset-minimalist": {
    name: "Minimalist",
    description: "Neutral grey background with clean, balanced lighting.",
    background:
      "A seamless neutral grey (#E5E5E5) backdrop, lit by balanced, even studio lighting.",
    sortOrder: 5,
  },
};

export const SYSTEM_PRESETS: readonly SystemPreset[] = PRESET_IDS.map((id) => ({
  id,
  ...DEFINITIONS[id],
}));

export function presetOf(id: PresetIdValue): SystemPreset {
  return { id, ...DEFINITIONS[id] };
}
