import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

const ROW_A = [
  "Cost estimators",
  "Architects",
  "Contractors",
  "Quantity surveyors",
  "Fit-out firms",
  "Suppliers",
] as const;

const ROW_B = [
  "Owners",
  "Project managers",
  "Procurement",
  "Engineers",
  "Interior designers",
  "Design-build studios",
] as const;

function WallRow({ items, direction }: { items: ReadonlyArray<string>; direction: "left" | "right" }) {
  const doubled = [...items, ...items];
  const rowClass = direction === "left" ? styles.wordWallRowLeft : styles.wordWallRowRight;
  return (
    <div className={`${styles.wordWallRow} ${rowClass}`}>
      {doubled.map((item, index) => (
        <span key={`${item}-${index}`} className={styles.wordWallItem}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function WordWallSection() {
  return (
    <section className={styles.wordWall} aria-labelledby="wordwall-title">
      <div className={styles.wordWallHead}>
        <RevealOnScroll>
          <SectionEyebrow label="People around the estimate" />
        </RevealOnScroll>
        <RevealOnScroll as="h2" className={styles.h2} delayMs={60} id="wordwall-title">
          Built for the people around the estimate.
        </RevealOnScroll>
        <RevealOnScroll as="p" className={styles.lede} delayMs={120}>
          Estimators, builders, designers, suppliers, and clients stay connected to the same
          cost record instead of trading disconnected files.
        </RevealOnScroll>
      </div>
      <div className={styles.wordWallTrack}>
        <WallRow items={ROW_A} direction="left" />
        <WallRow items={ROW_B} direction="right" />
      </div>
    </section>
  );
}
