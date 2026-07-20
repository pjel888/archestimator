import { NewLandingFooter } from "./NewLandingFooter";
import { NewLandingHeader } from "./NewLandingHeader";
import { ConnectedContext } from "./sections/ConnectedContext";
import { Hero } from "./sections/Hero";
import { PlatformWorkflow } from "./sections/PlatformWorkflow";
import { TrustAndClose } from "./sections/TrustAndClose";
import styles from "./tokens.module.css";

export function NewLandingExperience({ fontClassName }: { fontClassName?: string }) {
  return (
    <div className={`${styles.page} ${fontClassName ?? ""}`}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <NewLandingHeader />
      <main id="main-content">
        <Hero />
        <PlatformWorkflow />
        <ConnectedContext />
        <TrustAndClose />
      </main>
      <NewLandingFooter />
    </div>
  );
}
