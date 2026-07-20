import Link from "next/link";
import { pageContract } from "../content";
import { HeroStage } from "../interactions/HeroStage.client";
import { ProductStage } from "./ProductStage";
import tokenStyles from "../tokens.module.css";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="new-hero-title" data-band="03">
      <HeroStage>
        <div className={`${tokenStyles.frame} ${styles.copy}`}>
          <p className={styles.eyebrow}>{pageContract.hero.eyebrow}</p>
          <h1 id="new-hero-title">{pageContract.hero.title}</h1>
          <p className={styles.lead}>{pageContract.hero.lead}</p>
          <Link href={pageContract.cta.href} className={styles.cta}>{pageContract.cta.label}<span aria-hidden="true">↗</span></Link>
          <p className={styles.benefit}>{pageContract.benefit}</p>
        </div>
        <ProductStage />
      </HeroStage>
    </section>
  );
}
