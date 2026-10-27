import { useState } from "react";
import { Launcher } from "@/components/launcher/Launcher";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { PhotoStudio } from "@/components/studio/PhotoStudio";
import { SuggestionsPanel } from "@/components/suggestions/SuggestionsPanel";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type EditInput,
  type SuggestInput,
  sendMessage,
} from "@/lib/messaging/protocol";
import { downscale } from "@/lib/photos/downscale";
import { type SuggestDeps, suggestListing } from "@/lib/photos/suggest-listing";
import { usePhotoEdits } from "@/lib/photos/use-photo-edits";
import { detectLanguage } from "@/lib/vinted/language";

export interface ListingFormProps {
  autoOpen: boolean;
}

const EDIT_DEPS = {
  downscale,
  send: (input: EditInput) => sendMessage("editPhoto", input),
};

const SUGGEST_DEPS: SuggestDeps = {
  language: () =>
    detectLanguage({
      hostname: window.location.hostname,
      htmlLang: document.documentElement.lang,
      browserLang: navigator.language,
    }),
  downscale,
  send: (input: SuggestInput) => sendMessage("suggestListing", input),
};

const suggest = (sources: File[]) => suggestListing(sources, SUGGEST_DEPS);

export function App({ autoOpen }: ListingFormProps) {
  const [open, setOpen] = useState(autoOpen);
  const photos = usePhotoEdits(EDIT_DEPS);

  if (!open)
    return <Launcher label="Préparer l'annonce" onOpen={() => setOpen(true)} />;

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
          disabled={photos.editing}
          aria-label="Choisir les photos de l'article"
          onChange={(event) =>
            photos.choose(Array.from(event.currentTarget.files ?? []))
          }
        />
      </section>
      <Tabs defaultValue="photos">
        <TabsList variant="line" className="mx-gutter">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>
        <TabsContent
          value="photos"
          forceMount
          className="p-gutter data-[state=inactive]:hidden"
        >
          <PhotoStudio
            jobs={photos.jobs}
            editing={photos.editing}
            onEdit={photos.edit}
          />
        </TabsContent>
        <TabsContent
          value="suggestions"
          forceMount
          className="p-gutter data-[state=inactive]:hidden"
        >
          <SuggestionsPanel
            sources={photos.jobs.map((job) => job.source)}
            onSuggest={suggest}
          />
        </TabsContent>
      </Tabs>
    </SidebarShell>
  );
}
