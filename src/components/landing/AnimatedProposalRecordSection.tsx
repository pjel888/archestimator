"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import styles from "./AnimatedProposalRecordSection.module.css";

type DiagramStepId =
  | "projectWorkflow"
  | "componentLibrary"
  | "estimatingExperience"
  | "estimate"
  | "proposal"
  | "feedback"
  | "approved";

type ProposalRecordStep = {
  id: DiagramStepId;
  label: string;
  /** Explicit whole-word lines for the sketch-circle labels (no mid-word breaks). */
  labelLines?: readonly string[];
  body: string;
  positionClassName: string;
  delay: number;
  color: string;
  fill: string;
  variant?: "input" | "workflow" | "feedback";
  quote?: string;
};

type SketchRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SKETCH_WIDTH = 1000;
const SKETCH_HEIGHT = 320;
const ORANGE = "#a9532d";
const ORANGE_ALT = "#b65f2f";
const BLUE_GREEN = "#083241";
const MUTED_YELLOW = "#d8a84f";
const OLIVE = "#6f7a3d";

const flowSteps: ProposalRecordStep[] = [
  {
    id: "projectWorkflow",
    label: "Project-Shaped Workflow",
    labelLines: ["Project", "Workflow"],
    body: "Scope by area, phase, or package.",
    positionClassName: styles.projectWorkflowCard,
    delay: 160,
    color: BLUE_GREEN,
    fill: "rgba(8, 50, 65, 0.035)",
    variant: "input",
  },
  {
    id: "componentLibrary",
    label: "Reusable Component Library",
    labelLines: ["Reusable", "Components"],
    body: "Use saved costs and assemblies.",
    positionClassName: styles.componentLibraryCard,
    delay: 220,
    color: ORANGE,
    fill: "rgba(169, 83, 45, 0.035)",
    variant: "input",
  },
  {
    id: "estimatingExperience",
    label: "Intuitive Estimating Experience",
    labelLines: ["Estimating"],
    body: "Build and revise without spreadsheet friction.",
    positionClassName: styles.estimatingExperienceCard,
    delay: 280,
    color: MUTED_YELLOW,
    fill: "rgba(216, 168, 79, 0.05)",
    variant: "input",
  },
  {
    id: "estimate",
    label: "Estimate",
    body: "Scope, quantities, rates, and assumptions in one structured estimate tab.",
    positionClassName: styles.estimateCard,
    delay: 720,
    color: ORANGE,
    fill: "rgba(169, 83, 45, 0.035)",
    variant: "workflow",
  },
  {
    id: "proposal",
    label: "Proposal",
    body: "Share a review-ready cost proposal without losing the estimate context.",
    positionClassName: styles.proposalCard,
    delay: 1140,
    color: BLUE_GREEN,
    fill: "rgba(8, 50, 65, 0.035)",
    variant: "workflow",
  },
  {
    id: "feedback",
    label: "Review",
    quote: "Can we revise this?",
    body: "Capture comments, questions, approvals, and revision requests.",
    positionClassName: styles.feedbackCard,
    delay: 1540,
    color: MUTED_YELLOW,
    fill: "rgba(216, 168, 79, 0.05)",
    variant: "feedback",
  },
  {
    id: "approved",
    label: "Decide",
    body: "Keep the decision and next action attached to the proposal.",
    positionClassName: styles.approvedCard,
    delay: 2680,
    color: OLIVE,
    fill: "rgba(111, 122, 61, 0.05)",
    variant: "workflow",
  },
];

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function customProperties(properties: Record<string, string>): CSSProperties {
  return properties as CSSProperties;
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", callback);

  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function sketchOptions(stroke: string, fill: string, seed: number, strokeWidth = 1.15): Options {
  return {
    roughness: 1.16,
    bowing: 1.18,
    stroke,
    strokeWidth,
    fill,
    fillStyle: "hachure",
    hachureGap: 8,
    hachureAngle: -12,
    seed,
  };
}

function prepareSketchGroup(
  group: SVGGElement,
  delay: number,
  prefersReducedMotion: boolean,
  className?: string,
) {
  group.classList.add(styles.roughShape);

  if (className) {
    group.classList.add(className);
  }

  group.querySelectorAll("path").forEach((path, index) => {
    const fill = path.getAttribute("fill");
    const isFill = Boolean(fill && fill !== "none" && fill !== "transparent");

    if (isFill) {
      path.classList.add(styles.fillPath);
      path.style.setProperty("--fill-delay", `${delay + 120}ms`);
      return;
    }

    if (prefersReducedMotion) {
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
      return;
    }

    const length = Math.max(1, path.getTotalLength());
    path.classList.add(styles.drawPath);
    path.style.setProperty("--path-length", `${length}`);
    path.style.setProperty("--draw-delay", `${delay + index * 30}ms`);
  });
}

function measureElementRect(element: HTMLElement, stage: HTMLElement, padX = 0, padY = 0): SketchRect {
  const elementRect = element.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const scaleX = SKETCH_WIDTH / stageRect.width;
  const scaleY = SKETCH_HEIGHT / stageRect.height;

  return {
    x: (elementRect.left - stageRect.left) * scaleX - padX,
    y: (elementRect.top - stageRect.top) * scaleY - padY,
    width: elementRect.width * scaleX + padX * 2,
    height: elementRect.height * scaleY + padY * 2,
  };
}

function drawArrow(
  roughSvg: ReturnType<typeof rough.svg>,
  layer: SVGGElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  delay: number,
  prefersReducedMotion: boolean,
  options: Options,
  className?: string,
) {
  const line = roughSvg.line(fromX, fromY, toX, toY, options);
  layer.appendChild(line);
  prepareSketchGroup(line, delay, prefersReducedMotion, className);

  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = 12;
  const wing = Math.PI / 7;
  const left = roughSvg.line(
    toX,
    toY,
    toX - headLength * Math.cos(angle - wing),
    toY - headLength * Math.sin(angle - wing),
    options,
  );
  const right = roughSvg.line(
    toX,
    toY,
    toX - headLength * Math.cos(angle + wing),
    toY - headLength * Math.sin(angle + wing),
    options,
  );

  layer.append(left, right);
  prepareSketchGroup(left, delay + 100, prefersReducedMotion, className);
  prepareSketchGroup(right, delay + 100, prefersReducedMotion, className);
}

function drawCurvedArrow(
  roughSvg: ReturnType<typeof rough.svg>,
  layer: SVGGElement,
  {
    from,
    to,
    control1,
    control2,
    delay,
    prefersReducedMotion,
    options,
    className,
    dashed = false,
    arrowStart = false,
    arrowEnd = true,
    opacity,
  }: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    control1: { x: number; y: number };
    control2: { x: number; y: number };
    delay: number;
    prefersReducedMotion: boolean;
    options: Options;
    className?: string;
    dashed?: boolean;
    arrowStart?: boolean;
    arrowEnd?: boolean;
    opacity?: number;
  },
) {
  const path = `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`;

  if (dashed) {
    const dashedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    dashedPath.setAttribute("d", path);
    dashedPath.setAttribute("fill", "none");
    dashedPath.setAttribute("stroke", String(options.stroke ?? ORANGE_ALT));
    dashedPath.setAttribute("stroke-width", String(options.strokeWidth ?? 1.35));
    dashedPath.setAttribute("stroke-linecap", "round");
    dashedPath.setAttribute("stroke-linejoin", "round");
    dashedPath.setAttribute("stroke-dasharray", "9 8");
    dashedPath.setAttribute("opacity", String(opacity ?? 0.8));
    dashedPath.classList.add(styles.dashedLoopPath);

    if (className) {
      dashedPath.classList.add(className);
    }

    if (prefersReducedMotion) {
      dashedPath.style.opacity = String(opacity ?? 0.8);
    } else {
      dashedPath.style.setProperty("--draw-delay", `${delay}ms`);
    }

    layer.appendChild(dashedPath);
  } else {
    const curve = roughSvg.path(path, options);
    layer.appendChild(curve);
    prepareSketchGroup(curve, delay, prefersReducedMotion, className);
  }

  const drawArrowHead = (tip: { x: number; y: number }, angle: number) => {
    const headLength = 12;
    const wing = Math.PI / 7;
    const left = roughSvg.line(
      tip.x,
      tip.y,
      tip.x - headLength * Math.cos(angle - wing),
      tip.y - headLength * Math.sin(angle - wing),
      options,
    );
    const right = roughSvg.line(
      tip.x,
      tip.y,
      tip.x - headLength * Math.cos(angle + wing),
      tip.y - headLength * Math.sin(angle + wing),
      options,
    );

    layer.append(left, right);
    prepareSketchGroup(left, delay + 100, prefersReducedMotion, className);
    prepareSketchGroup(right, delay + 100, prefersReducedMotion, className);
  };

  if (arrowStart) {
    drawArrowHead(from, Math.atan2(from.y - control1.y, from.x - control1.x));
  }

  if (arrowEnd) {
    drawArrowHead(to, Math.atan2(to.y - control2.y, to.x - control2.x));
  }
}

function drawBubble(
  roughSvg: ReturnType<typeof rough.svg>,
  layer: SVGGElement,
  rect: SketchRect,
  delay: number,
  prefersReducedMotion: boolean,
  options: Options,
) {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const tailX = rect.x + rect.width * 0.48;
  const path = [
    `M ${rect.x + 18} ${rect.y}`,
    `C ${rect.x + 56} ${rect.y - 10}, ${right - 44} ${rect.y - 8}, ${right - 16} ${rect.y + 8}`,
    `C ${right + 4} ${rect.y + 34}, ${right + 2} ${bottom - 22}, ${right - 20} ${bottom - 8}`,
    `L ${tailX + 30} ${bottom - 8}`,
    `L ${tailX + 10} ${bottom + 28}`,
    `L ${tailX - 5} ${bottom - 8}`,
    `L ${rect.x + 18} ${bottom - 8}`,
    `C ${rect.x - 6} ${bottom - 22}, ${rect.x - 8} ${rect.y + 34}, ${rect.x + 18} ${rect.y}`,
    "Z",
  ].join(" ");
  const bubble = roughSvg.path(path, options);
  layer.appendChild(bubble);
  prepareSketchGroup(bubble, delay, prefersReducedMotion, styles.feedbackSketch);
}

function drawMeasuredSketch(
  svg: SVGSVGElement,
  layer: SVGGElement,
  stage: HTMLElement,
  stepElements: Map<DiagramStepId, HTMLElement>,
  prefersReducedMotion: boolean,
) {
  if (stage.getBoundingClientRect().width <= 0) {
    return;
  }

  layer.replaceChildren();
  const roughSvg = rough.svg(svg);
  const measuredSteps = new Map<DiagramStepId, SketchRect>();

  flowSteps.forEach((step) => {
    const element = stepElements.get(step.id);

    if (!element) {
      return;
    }

    const padX = step.variant === "input" ? 5 : 11;
    const padY = step.variant === "input" ? 5 : 9;
    measuredSteps.set(step.id, measureElementRect(element, stage, padX, padY));
  });

  if (!flowSteps.every((step) => measuredSteps.has(step.id))) {
    return;
  }

  const appendOutline = (step: ProposalRecordStep) => {
    const rect = measuredSteps.get(step.id);

    if (!rect) {
      return;
    }

    const options = sketchOptions(step.color, step.fill, step.delay, step.variant === "input" ? 0.95 : 1.2);

    if (step.id === "feedback") {
      drawBubble(roughSvg, layer, rect, step.delay, prefersReducedMotion, options);
      return;
    }

    if (step.variant === "input") {
      const outline = roughSvg.ellipse(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
        options,
      );
      layer.appendChild(outline);
      prepareSketchGroup(outline, step.delay, prefersReducedMotion, sketchClassNameForStep(step.id));
      return;
    }

    const outline = roughSvg.rectangle(rect.x, rect.y, rect.width, rect.height, options);
    layer.appendChild(outline);
    prepareSketchGroup(outline, step.delay, prefersReducedMotion, sketchClassNameForStep(step.id));
  };

  for (const step of flowSteps) {
    if (step.variant === "input") appendOutline(step);
  }

  const estimate = measuredSteps.get("estimate");
  const proposal = measuredSteps.get("proposal");
  const feedback = measuredSteps.get("feedback");
  const approved = measuredSteps.get("approved");

  if (!estimate || !proposal || !feedback || !approved) {
    return;
  }

  const inputOptionsById = new Map(
    flowSteps.flatMap((step) =>
      step.variant === "input"
        ? [[step.id, sketchOptions(step.color, "transparent", step.delay + 80, 0.95)] as const]
        : [],
    ),
  );

  ["projectWorkflow", "componentLibrary", "estimatingExperience"].forEach((stepId, index) => {
    const input = measuredSteps.get(stepId as DiagramStepId);
    const options = inputOptionsById.get(stepId as DiagramStepId);

    if (!input || !options) {
      return;
    }

    if (stepId === "projectWorkflow") {
      drawCurvedArrow(
        roughSvg,
        layer,
        {
          from: { x: input.x + input.width + 5, y: input.y + input.height * 0.5 },
          control1: { x: input.x + input.width + 54, y: input.y + input.height * 0.42 },
          control2: { x: estimate.x + estimate.width * 0.18, y: estimate.y - 34 },
          to: { x: estimate.x + estimate.width * 0.18, y: estimate.y - 7 },
          delay: 480,
          prefersReducedMotion,
          options,
          className: styles.estimateInputSketch,
        },
      );
      return;
    }

    if (stepId === "componentLibrary") {
      drawArrow(
        roughSvg,
        layer,
        input.x + input.width * 0.28,
        input.y - 8,
        estimate.x + estimate.width * 0.76,
        estimate.y + estimate.height + 7,
        535,
        prefersReducedMotion,
        options,
        styles.estimateInputSketch,
      );
      return;
    }

    if (stepId === "estimatingExperience") {
      drawArrow(
        roughSvg,
        layer,
        input.x + input.width * 0.72,
        input.y - 8,
        estimate.x + estimate.width * 0.22,
        estimate.y + estimate.height + 7,
        590,
        prefersReducedMotion,
        options,
        styles.estimateInputSketch,
      );
      return;
    }

    drawArrow(
      roughSvg,
      layer,
      input.x + input.width / 2,
      input.y - 8,
      estimate.x + estimate.width * (0.24 + index * 0.26),
      estimate.y + estimate.height + 7,
      480 + index * 55,
      prefersReducedMotion,
      options,
      styles.estimateInputSketch,
    );
  });

  appendOutline(flowSteps.find((step) => step.id === "estimate")!);

  drawArrow(
    roughSvg,
    layer,
    estimate.x + estimate.width + 4,
    estimate.y + estimate.height * 0.5,
    proposal.x - 6,
    proposal.y + proposal.height * 0.5,
    980,
    prefersReducedMotion,
    sketchOptions(ORANGE, "transparent", 46, 1),
    styles.mainFlowSketch,
  );

  appendOutline(flowSteps.find((step) => step.id === "proposal")!);

  drawCurvedArrow(
    roughSvg,
    layer,
    {
      from: { x: proposal.x + proposal.width + 6, y: proposal.y + proposal.height * 0.5 },
      control1: { x: proposal.x + proposal.width + 52, y: proposal.y + proposal.height * 0.46 },
      control2: { x: feedback.x + feedback.width * 0.32, y: feedback.y + feedback.height + 34 },
      to: { x: feedback.x + feedback.width * 0.48, y: feedback.y + feedback.height + 24 },
      delay: 1360,
      prefersReducedMotion,
      options: sketchOptions(BLUE_GREEN, "transparent", 48, 1),
      className: styles.proposalToFeedbackSketch,
    },
  );

  appendOutline(flowSteps.find((step) => step.id === "feedback")!);

  drawCurvedArrow(
    roughSvg,
    layer,
    {
      from: { x: feedback.x + feedback.width * 0.16, y: feedback.y + 5 },
      control1: { x: feedback.x - 150, y: Math.max(20, feedback.y - 68) },
      control2: { x: estimate.x + estimate.width + 190, y: Math.max(20, feedback.y - 74) },
      to: { x: estimate.x + estimate.width * 0.78, y: estimate.y - 9 },
      delay: 2020,
      prefersReducedMotion,
      options: sketchOptions(ORANGE_ALT, "transparent", 50, 1.35),
      className: styles.revisionLoopSketch,
      dashed: true,
      arrowStart: true,
      arrowEnd: true,
      opacity: 0.8,
    },
  );

  drawCurvedArrow(
    roughSvg,
    layer,
    {
      from: { x: feedback.x + feedback.width * 0.66, y: feedback.y + feedback.height + 10 },
      control1: { x: feedback.x + feedback.width * 0.76, y: feedback.y + feedback.height + 48 },
      control2: { x: approved.x - 62, y: approved.y + approved.height * 0.5 },
      to: { x: approved.x - 8, y: approved.y + approved.height * 0.5 },
      delay: 2300,
      prefersReducedMotion,
      options: sketchOptions(OLIVE, "transparent", 54, 1),
      className: styles.feedbackToApprovedSketch,
    },
  );

  appendOutline(flowSteps.find((step) => step.id === "approved")!);
}

function sketchClassNameForStep(stepId: DiagramStepId) {
  if (stepId === "estimate") {
    return styles.estimateSketch;
  }

  if (stepId === "proposal") {
    return styles.proposalSketch;
  }

  if (stepId === "feedback") {
    return styles.feedbackSketch;
  }

  if (stepId === "approved") {
    return styles.approvedSketch;
  }

  return styles.estimateInputSketch;
}

export function AnimatedProposalRecordSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const diagramStageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roughLayerRef = useRef<SVGGElement | null>(null);
  const stepRefs = useRef(new Map<DiagramStepId, HTMLElement>());
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const shouldShowSketch = isVisible || prefersReducedMotion;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (prefersReducedMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = roughLayerRef.current;
    const stage = diagramStageRef.current;

    if (!svg || !layer || !stage || !shouldShowSketch) {
      return;
    }

    let animationFrame = 0;
    const redraw = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        drawMeasuredSketch(svg, layer, stage, stepRefs.current, prefersReducedMotion);
      });
    };
    const resizeObserver = new ResizeObserver(redraw);

    redraw();
    resizeObserver.observe(stage);
    stepRefs.current.forEach((element) => resizeObserver.observe(element));
    window.addEventListener("resize", redraw);
    document.fonts?.ready.then(redraw).catch(() => {});

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", redraw);
    };
  }, [prefersReducedMotion, shouldShowSketch]);

  const setStepRef = useCallback(
    (stepId: DiagramStepId) => (node: HTMLElement | null) => {
      if (node) {
        stepRefs.current.set(stepId, node);
        return;
      }

      stepRefs.current.delete(stepId);
    },
    [],
  );

  const estimateInputSteps = useMemo(() => flowSteps.filter((step) => step.variant === "input"), []);
  const mobileWorkflowSteps = useMemo(
    () => [
      flowSteps.find((step) => step.id === "estimate")!,
      flowSteps.find((step) => step.id === "proposal")!,
      flowSteps.find((step) => step.id === "feedback")!,
      {
        id: "back-to-estimate",
        label: "⇄ Estimate Workspace when changes are needed",
        body: "Client review and estimate workspace logic keep talking inside the same workflow.",
      },
      flowSteps.find((step) => step.id === "approved")!,
    ],
    [],
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="proposal-record-heading"
      className="landing-quote-grid-paper bg-white px-6 py-14 before:![background-image:linear-gradient(rgba(118,126,136,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(118,126,136,0.08)_1px,transparent_1px)] before:![background-size:16px_16px] before:!opacity-[0.55] sm:px-8 sm:py-[72px] lg:px-12 lg:py-[59px]"
      data-animated-proposal-record="true"
      style={{ backgroundColor: "rgb(255, 255, 255)" }}
    >
      <div className="relative z-10 grid w-full gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,635px)] lg:items-stretch lg:gap-x-0">
        <div
          data-testid="landing-workflow-diagram-visual"
          className="hidden min-w-0 md:block lg:pr-0"
        >
          <div
            ref={diagramStageRef}
            className={`${styles.diagramStage} ${shouldShowSketch ? styles.isVisible : ""}`}
            aria-label="Diagram showing project workflow, component library, and estimating experience feeding an estimate workspace. The estimate workspace becomes a client proposal. The proposal goes to client review. Client review can loop back to the estimate workspace or move forward to the approval record. Activity History records the full process."
          >
            <svg ref={svgRef} className={styles.sketchSvg} viewBox={`0 0 ${SKETCH_WIDTH} ${SKETCH_HEIGHT}`} aria-hidden="true">
              <g ref={roughLayerRef} />
            </svg>

            {flowSteps.map((step) => (
              <div
                key={step.id}
                ref={setStepRef(step.id)}
                className={`${styles.stepCard} ${step.variant === "input" ? styles.inputCard : ""} ${step.variant === "feedback" ? styles.feedbackCardInner : ""} ${step.positionClassName}`}
                style={customProperties({ "--card-delay": `${step.delay}ms`, "--step-color": step.color })}
              >
                <span className={styles.stepLabel}>
                  {step.labelLines
                    ? step.labelLines.map((line) => (
                        <span key={line} className={styles.labelLine}>
                          {line}
                        </span>
                      ))
                    : step.label}
                </span>
                {step.quote ? <span className={styles.feedbackQuote}>&ldquo;{step.quote}&rdquo;</span> : null}
                {step.variant === "input" ? null : <span className={styles.stepBody}>{step.body}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden">
          <div className={styles.mobileFlow}>
            <section className="rounded-[3px] border border-[#ded2c7] bg-white/72 p-4">
              <p className="text-[12px] font-semibold leading-5 text-[#a9532d]">Estimate engine</p>
              <ul className="mt-3 grid gap-3">
                {estimateInputSteps.map((step) => (
                  <li key={step.id}>
                    <h3 className="text-[16px] font-medium leading-6 tracking-normal text-[#171514]">{step.label}</h3>
                    <p className="mt-1 text-[13px] leading-6 text-[#625950]">{step.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <ol className="grid gap-3">
              {mobileWorkflowSteps.map((step, index) => (
                <li key={step.id} className="rounded-[3px] border border-[#ded2c7] bg-white/72 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-[#eadfd6] bg-white text-[12px] font-semibold text-[#a9532d]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-[18px] font-medium leading-6 tracking-normal text-[#171514]">{step.label}</h3>
                      <p className="mt-1 text-[13px] leading-6 text-[#625950]">{step.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <section className="rounded-[3px] border border-[#b65f2f]/40 bg-white p-4">
              <p className="text-[12px] font-semibold leading-5 text-[#a9532d]">Activity History</p>
              <p className="mt-1 text-[13px] leading-6 text-[#4f463f]">
                Every comment, change, and decision stays on record.
              </p>
            </section>
          </div>
        </div>

        <div
          data-testid="landing-workflow-copy-block"
          className="flex max-w-[635px] flex-col lg:h-full lg:border-l lg:border-[#d6cec5] lg:pl-7"
        >
          <div className="border-b border-[#d9d1c8] pb-7">
            <p
              className="max-w-[440px] text-[13px] font-medium leading-6 text-brand-orange"
            >
              Estimate • Propose • Revise • Decide
            </p>

            <h2
              id="proposal-record-heading"
              className="mt-3 text-[36px] font-normal leading-none tracking-normal text-[#171514] sm:mt-4 sm:text-[48px] lg:text-[58px]"
            >
              One Workflow
            </h2>
            <p className="mt-3 max-w-full whitespace-nowrap text-[16px] font-normal leading-6 tracking-normal text-[#6f6258] sm:text-[18px] lg:text-[18px] lg:leading-7">
              From estimate creation to client decision
            </p>
          </div>

          <div className="mt-7 lg:mt-8">
            <p className="max-w-[420px] border-l border-[#d9d1c8] pl-5 text-[14px] font-normal leading-7 text-[#473f39] text-pretty lg:border-l-0 lg:pl-0">
              Build the estimate and turn it into a clear cost proposal your client can review, comment on, and approve.
            </p>
            <p className="mt-4 max-w-[420px] border-l border-[#d9d1c8] pl-5 text-[14px] font-normal leading-7 text-[#473f39] text-pretty lg:border-l-0 lg:pl-0">
              Keep the pricing, scope, feedback, revisions, and final decision in one place, without stitching together spreadsheets, PDFs, email threads, and scattered comments by hand.
            </p>
          </div>
        </div>
      </div>

      <p className="sr-only">
        Diagram showing project workflow, component library, and estimating experience feeding an estimate workspace. The estimate workspace becomes a client proposal. The proposal goes to client review. Client review can loop back to the estimate workspace or move forward to the approval record. Activity History records the full process.
      </p>
    </section>
  );
}
