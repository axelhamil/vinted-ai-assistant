import { Button } from "@/components/ui/button";
import { euros } from "@/lib/format";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export interface SourcesTabProps {
  analysis: AnalysisDto;
}

const isWebLink = (uri: string): boolean =>
  URL.canParse(uri) && ["http:", "https:"].includes(new URL(uri).protocol);

export function SourcesTab({ analysis }: SourcesTabProps) {
  const { sources } = analysis.marketPrice;
  const links = analysis.groundingSources.filter(({ uri }) => isWebLink(uri));

  if (sources.length === 0 && links.length === 0)
    return (
      <p className="fact-note">Aucune source n'a servi à estimer ce prix.</p>
    );

  return (
    <div className="flex flex-col gap-section">
      {sources.length > 0 && (
        <ul className="flex flex-col gap-stack">
          {sources.map((source) => (
            <li
              key={`${source.name}-${source.searchQuery}`}
              className="grid grid-cols-[1fr_auto] gap-x-stack"
            >
              <span className="section-title">{source.name}</span>
              <span className="fact-value">{euros(source.price)}</span>
              <span className="fact-note">
                {source.count} annonces pour « {source.searchQuery} »
              </span>
            </li>
          ))}
        </ul>
      )}
      {links.length > 0 && (
        <section className="flex flex-col items-start gap-row">
          <h3 className="section-title">Pages consultées</h3>
          {links.map((link) => (
            <Button key={link.uri} variant="link" size="xs" asChild>
              <a href={link.uri} target="_blank" rel="noreferrer">
                {link.title}
              </a>
            </Button>
          ))}
        </section>
      )}
    </div>
  );
}
