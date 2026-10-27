import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnalysisTab } from "@/components/analysis/AnalysisTab";
import { NegotiateTab } from "@/components/analysis/NegotiateTab";
import { ResaleTab } from "@/components/analysis/ResaleTab";
import { SourcesTab } from "@/components/analysis/SourcesTab";
import { Launcher } from "@/components/launcher/Launcher";
import { ActionBar } from "@/components/sidebar/ActionBar";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { ScoreSticker } from "@/components/sidebar/ScoreSticker";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reply } from "@/lib/api/failure";
import { signedEuros } from "@/lib/format";
import {
  type AnalysisDto,
  type AnalyzeInput,
  sendMessage,
} from "@/lib/messaging/protocol";
import { useBackground } from "@/lib/ui/query";
import { verdict } from "@/lib/verdict";
import { fetchSellerProfile } from "@/lib/vinted/seller";

export interface SidebarProps {
  vintedId: string;
  listing: AnalyzeInput;
  sellerProfilePath: string | null;
  autoOpen: boolean;
}

async function withSellerProfile(
  listing: AnalyzeInput,
  profilePath: string | null,
): Promise<AnalyzeInput> {
  const { seller } = listing;
  const complete = seller.rating !== null && seller.salesCount !== null;
  if (complete || !profilePath) return listing;

  const profile = await fetchSellerProfile({
    host: new URL(listing.url).host,
    profilePath,
    fetchImpl: (input, init) => fetch(input, init),
  });

  return {
    ...listing,
    seller: {
      username: seller.username,
      rating: seller.rating ?? profile.rating,
      salesCount: seller.salesCount ?? profile.salesCount,
    },
  };
}

async function analyze(
  listing: AnalyzeInput,
  profilePath: string | null,
): Promise<Reply<AnalysisDto>> {
  return sendMessage("analyze", await withSellerProfile(listing, profilePath));
}

export function App({
  vintedId,
  listing,
  sellerProfilePath,
  autoOpen,
}: SidebarProps) {
  const [open, setOpen] = useState(autoOpen);
  const [started, setStarted] = useState(autoOpen);
  const queryClient = useQueryClient();
  const key = ["analysis", vintedId];
  const analysis = useBackground({
    key,
    request: () => analyze(listing, sellerProfilePath),
    enabled: started,
  });
  const update = (dto: AnalysisDto) => queryClient.setQueryData(key, dto);

  if (!open)
    return (
      <Launcher
        label={analysis.data ? "Voir l'analyse" : "Analyser l'annonce"}
        analysis={analysis.data}
        onOpen={() => {
          setOpen(true);
          setStarted(true);
        }}
      />
    );

  const { data } = analysis;
  const error = analysis.isFetching ? null : analysis.error;

  return (
    <SidebarShell
      onClose={() => setOpen(false)}
      header={
        data ? (
          <div className="flex flex-col gap-stack">
            <ScoreSticker
              score={data.opportunity.score}
              margin={signedEuros(data.opportunity.margin)}
              size="full"
            />
            <p className="verdict">{verdict(data)}</p>
          </div>
        ) : error ? (
          <p className="verdict">Analyse indisponible</p>
        ) : (
          <div
            role="status"
            aria-label="Analyse en cours"
            className="flex flex-1 flex-col gap-stack"
          >
            <Skeleton className="h-16 w-28" />
            <Skeleton className="h-5 w-full" />
          </div>
        )
      }
      actions={data && <ActionBar analysis={data} onChange={update} />}
    >
      {error && (
        <ErrorPanel
          message={error.message}
          onRetry={() => void analysis.refetch()}
        />
      )}
      {data && (
        <Tabs defaultValue="analysis">
          <TabsList variant="line" className="mx-gutter">
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="negotiate">Négocier</TabsTrigger>
            <TabsTrigger value="resale">Revente</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="p-gutter">
            <AnalysisTab analysis={data} />
          </TabsContent>
          <TabsContent value="negotiate" className="p-gutter">
            <NegotiateTab analysis={data} onChange={update} />
          </TabsContent>
          <TabsContent value="resale" className="p-gutter">
            <ResaleTab analysis={data} />
          </TabsContent>
          <TabsContent value="sources" className="p-gutter">
            <SourcesTab analysis={data} />
          </TabsContent>
        </Tabs>
      )}
    </SidebarShell>
  );
}
