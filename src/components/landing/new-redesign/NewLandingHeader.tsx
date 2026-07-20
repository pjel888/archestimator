import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { pageContract } from "./content";
import { MobileMenu } from "./interactions/MobileMenu.client";
import styles from "./tokens.module.css";
import chrome from "./chrome.module.css";

export function NewLandingHeader() {
  return (
    <div className={chrome.stickyStack}>
      <aside className={chrome.announcement} aria-label="Early access announcement" data-band="01">
        <span aria-hidden="true" className={chrome.signalDot} />
        <span>{pageContract.announcement}</span>
        <Link href={pageContract.cta.href}>{pageContract.cta.label}</Link>
      </aside>
      <header className={chrome.header} data-band="02">
        <div className={`${styles.frame} ${chrome.headerInner}`}>
          <Link href="/" aria-label="Archestimator home" className={chrome.brand}>
            <ArchestimatorLogo tone="dark" markSize={29} priority />
          </Link>
          <nav className={chrome.desktopNav} aria-label="Primary navigation">
            {pageContract.nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className={chrome.actions}>
            <Link className={chrome.compactCta} href={pageContract.cta.href}>{pageContract.cta.label}</Link>
            <MobileMenu items={pageContract.nav} cta={pageContract.cta} />
          </div>
        </div>
      </header>
    </div>
  );
}
