import { PortfolioList } from "@/components/popup/PortfolioList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PORTFOLIO_TABS } from "@/lib/portfolio-tabs";

export function PortfolioTabs() {
  return (
    <Tabs defaultValue="watching" className="min-h-0 flex-1">
      <TabsList variant="line" className="popup-tabs w-full px-gutter">
        {PORTFOLIO_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PORTFOLIO_TABS.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="flex min-h-0 flex-col"
        >
          <PortfolioList tab={tab} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
