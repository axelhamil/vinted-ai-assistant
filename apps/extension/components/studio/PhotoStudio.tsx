import { useState } from "react";
import { toast } from "sonner";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { PhotoGrid } from "@/components/studio/PhotoGrid";
import {
  FREE_INSTRUCTION,
  PresetPicker,
} from "@/components/studio/PresetPicker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/messaging/protocol";
import type { EditMode, PhotoJob } from "@/lib/photos/edit-queue";
import { useBackground } from "@/lib/ui/query";

export interface PhotoStudioProps {
  jobs: PhotoJob[];
  editing: boolean;
  onEdit: (mode: EditMode) => void;
  onAddToListing: (files: File[]) => boolean;
}

const INSTRUCTION_MIN = 10;

const INSTRUCTION_MAX = 1000;

function editMode(choice: string, instruction: string): EditMode | null {
  if (choice === "") return null;
  if (choice !== FREE_INSTRUCTION) return { presetId: choice };

  const length = instruction.trim().length;
  if (length < INSTRUCTION_MIN || length > INSTRUCTION_MAX) return null;

  return { instruction: instruction.trim() };
}

export function PhotoStudio({
  jobs,
  editing,
  onEdit,
  onAddToListing,
}: PhotoStudioProps) {
  const presets = useBackground({
    key: ["studio", "presets"],
    request: () => sendMessage("listPresets", undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [choice, setChoice] = useState("");
  const [instruction, setInstruction] = useState("");

  if (presets.error)
    return (
      <ErrorPanel
        message={presets.error.message}
        onRetry={() => void presets.refetch()}
      />
    );

  if (!presets.data)
    return (
      <Skeleton
        role="status"
        aria-label="Chargement des retouches"
        className="h-9 w-full"
      />
    );

  const addToListing = (files: File[]) => {
    if (onAddToListing(files)) {
      toast.success("Photos ajoutées à l'annonce");
      return;
    }

    toast.error(
      "Zone de photos introuvable. Ouvrez le formulaire de vente Vinted puis réessayez.",
    );
  };
  const mode = editMode(choice, instruction);
  const edited = jobs.flatMap((job) => (job.edited ? [job.edited] : []));
  const instructionLength = instruction.trim().length;
  const instructionInvalid =
    instructionLength > 0 && instructionLength < INSTRUCTION_MIN;
  const selected = presets.data.presets.find((preset) => preset.id === choice);

  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-row">
        <PresetPicker
          presets={presets.data.presets}
          value={choice}
          onChange={setChoice}
        />
        {selected && <p className="fact-note">{selected.description}</p>}
        {choice === FREE_INSTRUCTION && (
          <>
            <Textarea
              aria-label="Consigne de retouche"
              aria-invalid={instructionInvalid}
              placeholder="Ex. : fond blanc uni, lumière douce, sans le cintre"
              maxLength={INSTRUCTION_MAX}
              value={instruction}
              onChange={(event) => setInstruction(event.currentTarget.value)}
            />
            <p className="fact-note">
              {INSTRUCTION_MIN} à {INSTRUCTION_MAX} caractères.
            </p>
          </>
        )}
      </section>
      {jobs.length === 0 ? (
        <p className="fact-note">
          Choisissez des photos ci-dessus pour les retoucher.
        </p>
      ) : (
        <PhotoGrid jobs={jobs} />
      )}
      <div className="flex flex-wrap gap-row">
        <Button
          className="flex-1"
          disabled={!mode || jobs.length === 0 || editing}
          onClick={() => mode && onEdit(mode)}
        >
          {editing ? "Retouche en cours" : "Retoucher les photos"}
        </Button>
        <Button
          variant="outline"
          disabled={edited.length === 0}
          onClick={() => addToListing(edited)}
        >
          Ajouter à l'annonce
        </Button>
      </div>
    </div>
  );
}
