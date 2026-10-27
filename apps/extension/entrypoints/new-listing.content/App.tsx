import { useState } from "react";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { PhotoStudio } from "@/components/studio/PhotoStudio";
import { SuggestionsPanel } from "@/components/suggestions/SuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PhotoJob } from "@/lib/photos/edit-queue";

export interface ListingFormProps {
  autoOpen: boolean;
}

const toJobs = (files: FileList | null): PhotoJob[] =>
  Array.from(files ?? [], (source) => ({
    id: crypto.randomUUID(),
    source,
    status: "idle",
  }));

export function App({ autoOpen }: ListingFormProps) {
  const [open, setOpen] = useState(autoOpen);
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const updateJob = (next: PhotoJob) =>
    setJobs((current) =>
      current.map((job) => (job.id === next.id ? next : job)),
    );

  if (!open)
    return (
      <Button
        size="lg"
        className="fixed right-gutter bottom-gutter z-2147483000"
        onClick={() => setOpen(true)}
      >
        Préparer l'annonce
      </Button>
    );

  return (
    <SidebarShell
      onClose={() => setOpen(false)}
      header={<p className="verdict">Préparer l'annonce</p>}
    >
      <section className="flex flex-col gap-row p-gutter">
        <h2 className="section-title">Vos photos</h2>
        <Input
          type="file"
          accept="image/*"
          multiple
          aria-label="Choisir les photos de l'article"
          onChange={(event) => setJobs(toJobs(event.currentTarget.files))}
        />
      </section>
      <Tabs defaultValue="photos">
        <TabsList variant="line" className="mx-gutter">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="p-gutter">
          <PhotoStudio jobs={jobs} onJobChange={updateJob} />
        </TabsContent>
        <TabsContent value="suggestions" className="p-gutter">
          <SuggestionsPanel sources={jobs.map((job) => job.source)} />
        </TabsContent>
      </Tabs>
    </SidebarShell>
  );
}
