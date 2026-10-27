import { useEffect, useState } from "react";
import { type PhotoJob, photoFailureMessage } from "@/lib/photos/edit-queue";

export interface PhotoGridProps {
  jobs: PhotoJob[];
}

export interface PhotoTileProps {
  job: PhotoJob;
}

const STATUS_LABELS: Record<PhotoJob["status"], string> = {
  idle: "À retoucher",
  editing: "Retouche en cours",
  done: "Retouchée",
  failed: "Échec",
};

function useObjectUrl(file: File): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

function PhotoTile({ job }: PhotoTileProps) {
  const url = useObjectUrl(job.edited ?? job.source);
  const failed = job.status === "failed" && job.failure;

  return (
    <li className="flex flex-col gap-row">
      <img
        src={url}
        alt={job.source.name}
        className="photo-thumb aspect-square w-full"
      />
      <p className={failed ? "fact-note tone-loss" : "fact-note"}>
        {failed ? photoFailureMessage(failed) : STATUS_LABELS[job.status]}
      </p>
    </li>
  );
}

export function PhotoGrid({ jobs }: PhotoGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-row">
      {jobs.map((job) => (
        <PhotoTile key={job.id} job={job} />
      ))}
    </ul>
  );
}
