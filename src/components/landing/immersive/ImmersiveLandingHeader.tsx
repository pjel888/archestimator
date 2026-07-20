import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { EARLY_ACCESS_HREF, SIGN_IN_HREF, header, hero } from "./content";
import styles from "./immersive.module.css";

/**
 * Server-first chrome for the immersive `/new` page: logo, a `Sign in`
 * text link, and the single primary CTA. No announcement bar, no anchor
 * navigation.
 */
export function ImmersiveLandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" aria-label="Archestimator home" className={styles.brand}>
          <ArchestimatorLogo tone="dark" markSize={29} priority />
        </Link>
        <nav className={styles.headerNav} aria-label="Account">
          <Link href={SIGN_IN_HREF} className={styles.signIn}>
            {header.signInLabel}
          </Link>
          <Link href={EARLY_ACCESS_HREF} className={styles.cta}>
            {hero.ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
