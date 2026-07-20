import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { footerGroups, pageContract } from "./content";
import styles from "./tokens.module.css";
import chrome from "./chrome.module.css";

export function NewLandingFooter() {
  return (
    <footer className={chrome.footer} data-band="18">
      <div className={`${styles.frame} ${chrome.footerGrid}`}>
        <div className={chrome.footerBrand}>
          <Link href="/" aria-label="Archestimator home"><ArchestimatorLogo tone="dark" markSize={30} /></Link>
          <p>{pageContract.descriptor}.</p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.label} aria-label={`${group.label} links`} className={chrome.footerGroup}>
            <strong>{group.label}</strong>
            {group.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </nav>
        ))}
      </div>
      <div className={`${styles.frame} ${chrome.footerBottom}`}>
        <span>Pre-release product</span><span>© 2026 Archestimator</span>
      </div>
    </footer>
  );
}
