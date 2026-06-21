import { ShareContainer } from "@/components/share/ShareContainer";
import { SHARED_LINK_UNAVAILABLE_COPY } from "@/lib/publication/share-copy";

export default function ShareLinkNotFound() {
  return (
    <main aria-label="Shared proposal unavailable" className="min-h-screen bg-proposalPaper py-8 text-ink">
      <ShareContainer>
        <section className="rounded-xs border border-hairline bg-white p-5">
          <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-tertiary">
            Shared proposal
          </p>
          <h1 className="mt-2 text-[24px] font-medium leading-[30px] tracking-normal text-ink">
            {SHARED_LINK_UNAVAILABLE_COPY.title}
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-[20px] tracking-normal text-secondary">
            {SHARED_LINK_UNAVAILABLE_COPY.body}
          </p>
        </section>
      </ShareContainer>
    </main>
  );
}
