import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { LandingContainer } from "./NewLandingPrimitives";
import styles from "./new-landing.module.css";
import { BETA_ACCESS_EMAIL, BETA_ACCESS_MAILTO_HREF } from "./new-landing-content";

export function PreReleaseBetaBanner() {
  return (
    <aside className={styles.betaBanner} aria-label="Pre-release beta announcement">
      <LandingContainer className={styles.betaBannerInner}>
        <p className={styles.betaBannerMessage}>
          <span className={styles.betaBannerEyebrow}>Now on pre-release beta</span>
          <span>Access is manually approved. Email {BETA_ACCESS_EMAIL} to request access.</span>
        </p>
        <a href={BETA_ACCESS_MAILTO_HREF} className={styles.betaBannerLink}>
          Request beta access
          <ArrowRight size={15} weight="bold" aria-hidden="true" />
        </a>
      </LandingContainer>
    </aside>
  );
}
