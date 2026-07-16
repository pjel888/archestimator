"use client";

import { Button } from "@/components/ui/button";
import {
  findEstimateSystemArea,
  findEstimateSystemPage,
  type EstimateSystemDocumentation,
  type EstimateSystemFeature,
  type EstimateSystemPage,
} from "@/lib/admin/estimate-system-map";

export type EstimateSystemGraphView = "product" | "features" | "pages";

type EstimateSystemGraphProps = Readonly<{
  documentation: EstimateSystemDocumentation;
  view: EstimateSystemGraphView;
  feature: EstimateSystemFeature | null;
  page: EstimateSystemPage | null;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
}>;

function PageLink({
  documentation,
  pageId,
  onOpenPage,
}: {
  documentation: EstimateSystemDocumentation;
  pageId: string;
  onOpenPage: (pageId: string) => void;
}) {
  const page = findEstimateSystemPage(documentation, pageId);
  if (!page) return null;

  return (
    <Button
      variant="plain"
      size="xs"
      className="h-auto min-h-6 min-w-0 justify-start whitespace-normal px-0 py-1 text-left !text-[10px] leading-4 underline decoration-divider underline-offset-2"
      onClick={() => onOpenPage(page.id)}
    >
      {page.title}
    </Button>
  );
}

function ProductJourney({
  documentation,
  onOpenFeature,
  onOpenPage,
}: Pick<EstimateSystemGraphProps, "documentation" | "onOpenFeature" | "onOpenPage">) {
  return (
    <div className="space-y-4">
      <section aria-labelledby="product-journey-steps-heading">
        <h3 id="product-journey-steps-heading" className="mb-2 text-[9px] font-medium text-ink">From project setup to client decision</h3>
        <ol className="divide-y divide-hairline border-y border-hairline" aria-label="Primary product journey">
          {documentation.journey.steps.map((step, index) => (
            <li key={step.id} className="grid gap-2 py-2.5 sm:grid-cols-[28px_minmax(0,1fr)_160px] sm:items-start">
              <span className="pt-0.5 text-[8px] font-medium tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h4 className="text-[10px] font-medium leading-4 text-ink">{step.title}</h4>
                <p className="mt-0.5 text-[10px] leading-4 text-secondary">{step.summary}</p>
              </div>
              <div className="sm:text-right">
                <PageLink documentation={documentation} pageId={step.pageId} onOpenPage={onOpenPage} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {documentation.journey.supportingAreaIds.map((areaId) => {
        const area = findEstimateSystemArea(documentation, areaId);
        if (!area) return null;
        return (
          <section key={area.id} className="flex flex-col gap-2 border-t border-hairline pt-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-[10px] font-medium text-ink">{area.title}</h3>
              <p className="mt-0.5 text-[10px] leading-4 text-secondary">{area.userOutcome}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {area.featureIds.map((featureId) => {
                const feature = documentation.features.find((candidate) => candidate.id === featureId);
                if (!feature) return null;
                return (
                  <Button
                    key={feature.id}
                    variant="outline"
                    size="xs"
                    className="min-w-0"
                    onClick={() => onOpenFeature(feature.id)}
                  >
                    {feature.title}
                  </Button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FeatureFlow({
  documentation,
  feature,
  onOpenPage,
}: Pick<EstimateSystemGraphProps, "documentation" | "feature" | "onOpenPage">) {
  if (!feature) return null;
  const result = feature.steps.findLast((step) => step.result)?.result;

  return (
    <section aria-labelledby="feature-flow-heading">
      <h3 id="feature-flow-heading" className="mb-2 text-[9px] font-medium text-ink">How it works</h3>
      <ol className="divide-y divide-hairline border-y border-hairline" aria-label={`${feature.title} flow`}>
        {feature.steps.map((step, index) => (
          <li key={step.id} className="grid gap-2 py-2.5 sm:grid-cols-[28px_minmax(0,1fr)_160px] sm:items-start">
            <span className="pt-0.5 text-[8px] font-medium tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <h4 className="text-[10px] font-medium leading-4 text-ink">{step.title}</h4>
              <p className="mt-0.5 text-[10px] leading-4 text-secondary">{step.description}</p>
            </div>
            <div className="sm:text-right">
              {step.pageId ? <PageLink documentation={documentation} pageId={step.pageId} onOpenPage={onOpenPage} /> : null}
            </div>
          </li>
        ))}
      </ol>
      {result ? (
        <dl className="grid gap-1 border-b border-hairline py-2.5 sm:grid-cols-[90px_minmax(0,1fr)]">
          <dt className="text-[8px] font-medium text-tertiary">Outcome</dt>
          <dd className="text-[10px] leading-4 text-ink">{result}</dd>
        </dl>
      ) : null}
    </section>
  );
}

function PageMap({
  documentation,
  page,
  onOpenFeature,
  onOpenPage,
}: Pick<EstimateSystemGraphProps, "documentation" | "page" | "onOpenFeature" | "onOpenPage">) {
  if (!page) return null;

  return (
    <div className="grid gap-3 border-y border-hairline py-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <section aria-labelledby="page-regions-heading">
        <h3 id="page-regions-heading" className="text-[9px] font-medium text-ink">Inside this page</h3>
        <ol className="mt-2 divide-y divide-hairline border-y border-hairline">
          {page.regions.map((region, index) => (
            <li key={region.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 px-2 py-2">
              <span className="text-[8px] font-medium tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-[10px] font-medium leading-3 text-ink">{region.title}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-secondary">{region.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="space-y-3 border-t border-hairline pt-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
        <section>
          <h3 className="text-[9px] font-medium text-ink">Features on this page</h3>
          <div className="mt-1.5 flex flex-col items-start gap-1">
            {page.featureIds.map((featureId) => {
              const feature = documentation.features.find((candidate) => candidate.id === featureId);
              if (!feature) return null;
              return (
                <Button
                  key={feature.id}
                  variant="plain"
                  size="xs"
                  className="h-auto min-h-0 min-w-0 justify-start whitespace-normal px-0 py-0 text-left !text-[10px] leading-4 underline decoration-divider underline-offset-2"
                  onClick={() => onOpenFeature(feature.id)}
                >
                  {feature.title}
                </Button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-[9px] font-medium text-ink">Common next pages</h3>
          {page.nextPageIds.length ? (
            <div className="mt-1.5 flex flex-col items-start gap-1">
              {page.nextPageIds.map((pageId) => (
                <PageLink key={pageId} documentation={documentation} pageId={pageId} onOpenPage={onOpenPage} />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[9px] leading-4 text-tertiary">This is the end of the documented journey.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

export function EstimateSystemGraph(props: EstimateSystemGraphProps) {
  if (props.view === "product") {
    return (
      <ProductJourney
        documentation={props.documentation}
        onOpenFeature={props.onOpenFeature}
        onOpenPage={props.onOpenPage}
      />
    );
  }

  if (props.view === "features") {
    return (
      <FeatureFlow
        documentation={props.documentation}
        feature={props.feature}
        onOpenPage={props.onOpenPage}
      />
    );
  }

  if (props.view === "pages") {
    return (
      <PageMap
        documentation={props.documentation}
        page={props.page}
        onOpenFeature={props.onOpenFeature}
        onOpenPage={props.onOpenPage}
      />
    );
  }

  return null;
}
