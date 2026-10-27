import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import { signedEuros } from "@/lib/format";
import {
  type AnalysisDto,
  type AnalyzeInput,
  sendMessage,
} from "@/lib/messaging/protocol";
import {
  type BackgroundFailure,
  useBackground,
  useBackgroundMutation,
} from "@/lib/ui/query";
import { verdict } from "@/lib/verdict";
import { completeSeller, loadAnalysis } from "@/lib/vinted/seller";
import type { SidebarProps } from "./listing-reader";
import { useSettings } from "./use-settings";

interface AnalysisSidebarProps {
  vintedId: string;
  listing: AnalyzeInput;
  sellerProfilePath: string | null;
  autoOpen: boolean;
}

interface StaleSidebarProps {
  autoOpen: boolean;
}

const STALE_MESSAGE =
  "La page affiche encore l'annonce précédente. Rechargez la page pour analyser celle-ci.";

const ANALYSIS_SENDER = {
  getAnalysis: (vintedId: string) => sendMessage("getAnalysis", vintedId),
  analyze: (input: AnalyzeInput) => sendMessage("analyze", input),
};

const showFailure = (error: BackgroundFailure) => toast.error(error.message);

function StaleSidebar({ autoOpen }: StaleSidebarProps) {
  const [open, setOpen] = useState(autoOpen);

  if (!open)
    return <Launcher label="Analyser l'annonce" onOpen={() => setOpen(true)} />;

  return (
    <SidebarShell
      onClose={() => setOpen(false)}
      header={<p className="verdict">Annonce pas encore chargée</p>}
    >
      <ErrorPanel
        message={STALE_MESSAGE}
        onRetry={() => window.location.reload()}
      />
    </SidebarShell>
  );
}

function AnalysisSidebar({
  vintedId,
  listing,
  sellerProfilePath,
  autoOpen,
}: AnalysisSidebarProps) {
  const [open, setOpen] = useState(autoOpen);
  const [started, setStarted] = useState(autoOpen);
  const queryClient = useQueryClient();
  const key = ["analysis", vintedId];
  const sellerQuery = {
    queryKey: ["seller", vintedId],
    queryFn: () =>
      completeSeller({
        listing,
        profilePath: sellerProfilePath,
        fetchImpl: (input, init) => fetch(input, init),
      }),
    staleTime: Number.POSITIVE_INFINITY,
  };
  const load = (forceRefresh: boolean) =>
    loadAnalysis({
      listing: { ...listing, forceRefresh },
      seller: () => queryClient.fetchQuery(sellerQuery),
      send: ANALYSIS_SENDER,
    });
  const analysis = useBackground({
    key,
    request: () => load(false),
    enabled: started,
  });
  const seller = useQuery({ ...sellerQuery, enabled: analysis.isSuccess });
  const update = (dto: AnalysisDto) => queryClient.setQueryData(key, dto);
  const reanalyze = useBackgroundMutation(
    () => load(true),
    (dto) => {
      update(dto);
      toast.success("Analyse mise à jour");
    },
    showFailure,
  );

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
      actions={
        data && (
          <ActionBar
            analysis={data}
            onChange={update}
            onReanalyze={() => reanalyze.mutate()}
            reanalyzing={reanalyze.isPending}
          />
        )
      }
    >
      {error && (
        <ErrorPanel
          message={error.message}
          onRetry={() => void analysis.refetch()}
        />
      )}
      {data && (
        <Tabs defaultValue="analysis" aria-busy={reanalyze.isPending}>
          <TabsList variant="line" className="mx-gutter">
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="negotiate">Négocier</TabsTrigger>
            <TabsTrigger value="resale">Revente</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="p-gutter">
            <AnalysisTab
              analysis={data}
              seller={seller.data ?? listing.seller}
              shippingCost={listing.shippingCost}
            />
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

export function App({ vintedId, page }: SidebarProps) {
  const current = useSettings();
  if (!current?.enabled) return null;

  if (page.kind === "stale")
    return <StaleSidebar autoOpen={current.autoOpenSidebar} />;

  return (
    <AnalysisSidebar
      vintedId={vintedId}
      listing={page.listing}
      sellerProfilePath={page.sellerProfilePath}
      autoOpen={current.autoOpenSidebar}
    />
  );
}
