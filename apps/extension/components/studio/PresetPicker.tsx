import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PresetsDto } from "@/lib/messaging/protocol";

export type Preset = PresetsDto["presets"][number];

export const FREE_INSTRUCTION = "free-instruction";

export interface PresetPickerProps {
  presets: Preset[];
  value: string;
  onChange: (value: string) => void;
}

export function PresetPicker({ presets, value, onChange }: PresetPickerProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Type de retouche" className="w-full">
        <SelectValue placeholder="Choisir une retouche" />
      </SelectTrigger>
      <SelectContent>
        {presets.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
        <SelectItem value={FREE_INSTRUCTION}>Consigne libre</SelectItem>
      </SelectContent>
    </Select>
  );
}
