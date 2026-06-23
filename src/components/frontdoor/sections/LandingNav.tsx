"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { ArrowRight } from "@/components/frontdoor/icons";
import styles from "../FrontdoorPage.module.css";

type LandingNavProps = {
  isLoggedIn: boolean;
};

const PRIMARY_HREF = "/contact?intent=early-access";
const PRIMARY_LABEL = "Request access";
const SIGNED_IN_HREF = "/workshop";
const SIGNED_IN_LABEL = "Open workspace";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function LandingNav({ isLoggedIn }: LandingNavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const primaryHref = isLoggedIn ? SIGNED_IN_HREF : PRIMARY_HREF;
  const primaryLabel = isLoggedIn ? SIGNED_IN_LABEL : PRIMARY_LABEL;

  return (
    <nav className={styles.nav} data-scrolled={scrolled ? "true" : "false"} aria-label="Primary">
      <div className={styles.navInner}>
        <Link href="/" aria-label="Archestimator home" className={styles.navBrand}>
          <ArchestimatorLogo tone="dark" markSize={22} showWordmark={false} />
        </Link>
        <div className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className={styles.navActions}>
          {!isLoggedIn ? (
            <Link href="/login?next=/workshop/projects" className={styles.navSignIn}>
              Sign in
            </Link>
          ) : null}
          <Link href={primaryHref} className={styles.navCta}>
            <span>{primaryLabel}</span>
            <ArrowRight className={styles.navCtaArrow} />
          </Link>
          <button
            type="button"
            className={styles.navHamburger}
            data-open={open ? "true" : "false"}
            aria-expanded={open}
            aria-controls="nav-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            <span className={styles.navHamburgerIcon} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open ? (
        <div id="nav-mobile-menu" className={styles.navMobileMenu} role="dialog" aria-modal="true">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link
            href={isLoggedIn ? SIGNED_IN_HREF : "/login?next=/workshop/projects"}
            onClick={() => setOpen(false)}
          >
            {isLoggedIn ? SIGNED_IN_LABEL : "Sign in"}
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
