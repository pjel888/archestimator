import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import { ArrowRight } from "@/components/frontdoor/icons";
import Link from "next/link";
import { ProductSurfacePanel, type ProductSurfaceKind } from "./ProductSurfacePanel";
import styles from "../FrontdoorPage.module.css";

type AspectRatio = "16:10" | "4:5" | "1:1";

type LongFormFeatureSectionProps = {
  idSlug: string;
  eyebrow: string;
  heading: string;
  paragraphs: ReadonlyArray<string>;
  ctaLabel: string;
  ctaHref: string;
  screenshotTag: string;
  surface: ProductSurfaceKind;
  aspect: AspectRatio;
  reverse?: boolean;
};

const aspectClass: Record<AspectRatio, string> = {
  "16:10": styles.longFormScreenshot16x10,
  "4:5": styles.longFormScreenshot4x5,
  "1:1": styles.longFormScreenshot1x1,
};

export function LongFormFeatureSection({
  idSlug,
  eyebrow,
  heading,
  paragraphs,
  ctaLabel,
  ctaHref,
  screenshotTag,
  surface,
  aspect,
  reverse = false,
}: LongFormFeatureSectionProps) {
  const headingId = `lf-${idSlug}-title`;
  const copyNode = (
    <RevealOnScroll className={styles.longFormCopy}>
      <SectionEyebrow label={eyebrow} />
      <RevealOnScroll as="h2" className={styles.h2} delayMs={60} id={headingId}>
        {heading}
      </RevealOnScroll>
      {paragraphs.map((paragraph, index) => (
        <RevealOnScroll as="p" className={styles.bodyText} delayMs={120 + index * 60} key={index}>
          {paragraph}
        </RevealOnScroll>
      ))}
      <RevealOnScroll delayMs={300}>
        <Link href={ctaHref} className={styles.textCta}>
          <span>{ctaLabel}</span>
          <span className={styles.textCtaArrow} aria-hidden="true">
            <ArrowRight />
          </span>
        </Link>
      </RevealOnScroll>
    </RevealOnScroll>
  );

  const screenshotNode = (
    <RevealOnScroll className={`${styles.longFormScreenshot} ${aspectClass[aspect]}`} delayMs={200}>
      <div className={styles.longFormScreenshotInner}>
        <span className={styles.longFormScreenshotTag}>{screenshotTag}</span>
        <ProductSurfacePanel kind={surface} compact />
      </div>
    </RevealOnScroll>
  );

  return (
    <section className={styles.longFormSection} aria-labelledby={headingId}>
      <div className={styles.longForm}>
        {reverse ? (
          <>
            {screenshotNode}
            {copyNode}
          </>
        ) : (
          <>
            {copyNode}
            {screenshotNode}
          </>
        )}
      </div>
    </section>
  );
}
