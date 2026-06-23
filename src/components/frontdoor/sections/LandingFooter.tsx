import Link from "next/link";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import styles from "../FrontdoorPage.module.css";

const FOOTER_NAV = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <Link href="/" aria-label="Archestimator home" className={styles.footerBrand}>
            <ArchestimatorLogo tone="dark" markSize={22} />
            <span>© 2026 &middot; Built for AEC teams in PH and SEA</span>
          </Link>
          <nav className={styles.footerNav} aria-label="Footer">
            {FOOTER_NAV.map((link) => (
              <Link key={link.href} href={link.href} className={styles.footerNavLink}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className={styles.footerMeta}>
          <span className={styles.footerBuiltBy}>
            <span>Built by Philip Lewis</span>
            <span aria-hidden="true">·</span>
            <a href="mailto:hi@archestimator.com">hi@archestimator.com</a>
          </span>
          <span>AEC estimating workspace &middot; Cost records that stay explainable</span>
        </div>
      </div>
    </footer>
  );
}
