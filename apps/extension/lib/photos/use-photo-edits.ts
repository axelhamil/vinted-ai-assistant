import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  type EditDeps,
  type EditMode,
  editPhotoJob,
  type PhotoJob,
  runEdits,
} from "./edit-queue";

export interface PhotoEdits {
  jobs: PhotoJob[];
  editing: boolean;
  choose: (files: File[]) => void;
  edit: (mode: EditMode) => void;
}

interface EditRun {
  targets: PhotoJob[];
  mode: EditMode;
}

const toJob = (source: File): PhotoJob => ({
  id: crypto.randomUUID(),
  source,
  status: "idle",
});

const queued = (job: PhotoJob): boolean =>
  job.status === "idle" || job.status === "failed";

export function usePhotoEdits(deps: EditDeps): PhotoEdits {
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const running = useRef(false);
  const update = (next: PhotoJob) =>
    setJobs((current) =>
      current.map((job) => (job.id === next.id ? next : job)),
    );
  const run = useMutation({
    mutationFn: ({ targets, mode }: EditRun) =>
      runEdits(
        targets.map(({ id, source, edited }) => async () => {
          update({ id, source, status: "editing", edited });
          const outcome = await editPhotoJob(source, mode, deps);
          update(
            outcome.ok
              ? { id, source, status: "done", edited: outcome.data }
              : {
                  id,
                  source,
                  status: "failed",
                  failure: outcome.failure,
                  edited,
                },
          );
        }),
      ),
    onSettled: () => {
      running.current = false;
    },
  });

  return {
    jobs,
    editing: run.isPending,
    choose: (files) => {
      if (!running.current) setJobs(files.map(toJob));
    },
    edit: (mode) => {
      const pending = jobs.filter(queued);
      const targets = pending.length > 0 ? pending : jobs;
      if (running.current || targets.length === 0) return;

      running.current = true;
      run.mutate({ targets, mode });
    },
  };
}
