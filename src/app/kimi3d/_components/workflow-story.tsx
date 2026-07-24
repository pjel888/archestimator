import Image from "next/image";

import componentsFeatureImage from "../../../../public/estimate-feature-components.png";
import rowsFeatureImage from "../../../../public/estimate-feature-rows.png";
import treeFeatureImage from "../../../../public/estimate-feature-tree.png";

import { workflowCopy } from "../_content";
import styles from "../kimi-landing.module.css";

type EstimateFeatureId = (typeof workflowCopy.features)[number]["id"];

const estimateFeatureImages = {
  tree: treeFeatureImage,
  rows: rowsFeatureImage,
  components: componentsFeatureImage,
} as const;

function EstimateFeatureVisual({
  featureId,
}: {
  featureId: EstimateFeatureId;
}) {
  return (
    <div
      className={styles.estimateFeatureMedia}
      data-feature-visual={featureId}
    >
      <Image
        className={styles.estimateFeatureScreenshot}
        src={estimateFeatureImages[featureId]}
        alt=""
        sizes="(max-width: 767px) 78vw, 26vw"
      />
    </div>
  );
}

export function WorkflowStory() {
  return (
    <section
      id="workflow"
      className={styles.story}
      aria-labelledby="workflow-title"
    >
      <div className={styles.container}>
        <header className={styles.estimateFeaturesHead} data-section-reveal>
          <p className={styles.estimateFeaturesEyebrow}>
            {workflowCopy.eyebrow}
          </p>
          <h2 id="workflow-title" className={styles.storyTitle}>
            {workflowCopy.headline}
          </h2>
          <p className={styles.storyIntro}>
            {workflowCopy.intro}
          </p>
        </header>
        <ul className={styles.estimateFeaturesGrid} data-section-reveal>
          {workflowCopy.features.map((feature) => (
            <li key={feature.id} className={styles.estimateFeature}>
              <EstimateFeatureVisual featureId={feature.id} />
              <h3 className={styles.estimateFeatureTitle}>
                {feature.title}
              </h3>
              <p className={styles.estimateFeatureBody}>
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
