"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  JOINERY_ROW_INDEX,
  LIVING_ESTIMATE_OVERLAYS,
  LIVING_ESTIMATE_PROJECT,
  LIVING_ESTIMATE_STATES,
  SCENE_DIMENSIONS,
  SOURCED_ROW_INDICES,
  computeLivingEstimateLayout,
  computeThreadAnchors,
  type LivingEstimateState,
  type PlateTransform,
} from "./living-estimate-model";
import styles from "./living-estimate.module.css";

interface LivingEstimateSceneProps {
  state: LivingEstimateState;
  reducedMotion: boolean;
  onFirstFrame?: () => void;
}

/** Plain tweenable mirror of a plate's transform (gsap animates these). */
interface PlateNode {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
}

const ROW_COUNT = 12;
const HEADER_SLOTS = 4; // 3 group headers + the total band
const CAMERA_BASE = new THREE.Vector3(6, 5, 6);
const CAMERA_TARGET = new THREE.Vector3(0, 0.1, 0.3);
const PARALLAX_YAW = 0.0262; // ~1.5 degrees
const PARALLAX_PITCH = 0.0131; // ~0.75 degrees

const toNode = (t: PlateTransform): PlateNode => ({
  x: t.x,
  y: t.y,
  z: t.z,
  sx: t.sx,
  sy: t.sy,
  sz: t.sz,
  ry: t.ry,
});

/**
 * The Living Estimate — a finite, orthographic, stateful hero scene.
 * Twelve estimate-row plates assemble into an open ledger; the ledger
 * compresses into a proposal; a comment pin lands on the joinery row; a
 * revision lifts that row while a ghost keeps its prior state visible.
 * The Cost Thread (signal orange tube) runs row → total → proposal → pin.
 *
 * Budgets (dev): inspect `renderer.info` — render.calls stays ~10 (< 25),
 * geometries stays ~5 (< 20). No textures, sprites, canvas text,
 * post-processing, particles, physics, or GLTF.
 */
export default function LivingEstimateScene({ state, reducedMotion, onFirstFrame }: LivingEstimateSceneProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const reducedMotionRef = useRef(reducedMotion);
  const onFirstFrameRef = useRef(onFirstFrame);
  const applyStateRef = useRef<((next: LivingEstimateState, entrance: boolean) => void) | null>(null);
  const lastAppliedRef = useRef<LivingEstimateState | null>(null);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    onFirstFrameRef.current = onFirstFrame;
  }, [onFirstFrame]);

  // State-change effect. Declared before the mount effect so first-mount
  // order is: record state -> mount builds scene + applies it (with the
  // entrance). Later changes flow through applyStateRef only.
  useEffect(() => {
    stateRef.current = state;
    if (lastAppliedRef.current === state) return;
    lastAppliedRef.current = state;
    applyStateRef.current?.(state, false);
  }, [state]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    // ---- Renderer (fail silent — the poster beneath carries the hero) ----
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    camera.position.copy(CAMERA_BASE);
    camera.lookAt(CAMERA_TARGET);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ---- Lights --------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xfff3e8, 1.6);
    key.position.set(6, 10, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe6f0, 0.5);
    fill.position.set(-7, 5, -6);
    scene.add(fill);

    // ---- Shared geometries + materials (the whole budget) ---------------
    const disposables: Array<{ dispose: () => void }> = [];
    const unitBox = new THREE.BoxGeometry(1, 1, 1); // rows, headers, markers, doc, backer, ghost, highlight
    const pinGeometry = new THREE.OctahedronGeometry(SCENE_DIMENSIONS.pinRadius);
    const connectorGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
    disposables.push(unitBox, pinGeometry, connectorGeometry);

    const rowMaterial = new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 0.6, metalness: 0.02 });
    const graphiteMaterial = new THREE.MeshStandardMaterial({ color: 0x3f4248, roughness: 0.7, metalness: 0.05 });
    const signalMaterial = new THREE.MeshStandardMaterial({
      color: 0xf24405,
      roughness: 0.45,
      metalness: 0.05,
      emissive: 0xf24405,
      emissiveIntensity: 0.22,
    });
    const ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0efea,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    disposables.push(rowMaterial, graphiteMaterial, signalMaterial, ghostMaterial);

    // ---- Scene objects --------------------------------------------------
    const rowsMesh = new THREE.InstancedMesh(unitBox, rowMaterial, ROW_COUNT);
    const headersMesh = new THREE.InstancedMesh(unitBox, graphiteMaterial, HEADER_SLOTS);
    const markersMesh = new THREE.InstancedMesh(unitBox, signalMaterial, SOURCED_ROW_INDICES.length);
    for (const mesh of [rowsMesh, headersMesh, markersMesh]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      rootGroup.add(mesh);
    }

    const proposalGroup = new THREE.Group();
    const proposalBacker = new THREE.Mesh(unitBox, graphiteMaterial);
    proposalBacker.scale.set(...SCENE_DIMENSIONS.proposalBacker);
    proposalBacker.position.y = -0.045;
    const proposalPaper = new THREE.Mesh(unitBox, rowMaterial);
    proposalPaper.scale.set(...SCENE_DIMENSIONS.proposal);
    proposalGroup.add(proposalBacker, proposalPaper);
    rootGroup.add(proposalGroup);

    const pin = new THREE.Mesh(pinGeometry, signalMaterial);
    const connector = new THREE.Mesh(connectorGeometry, signalMaterial);
    const ghost = new THREE.Mesh(unitBox, ghostMaterial);
    const highlight = new THREE.Mesh(unitBox, signalMaterial);
    highlight.position.set(...SCENE_DIMENSIONS.highlightPosition);
    rootGroup.add(pin, connector, ghost, highlight);

    // Cost Thread — rebuilt per state (old geometry disposed immediately).
    let tubeGeometry: THREE.TubeGeometry | null = null;
    let tubeFullCount = 0;
    const thread = new THREE.Mesh(new THREE.BufferGeometry(), signalMaterial);
    thread.frustumCulled = false;
    disposables.push(thread.geometry);
    rootGroup.add(thread);

    const buildThread = (next: LivingEstimateState, drawProgress: number) => {
      const anchors = computeThreadAnchors(next);
      const curve = new THREE.CatmullRomCurve3(
        anchors.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        "centripetal",
      );
      const nextGeometry = new THREE.TubeGeometry(curve, 96, SCENE_DIMENSIONS.threadRadius, 6, false);
      tubeFullCount = nextGeometry.index ? nextGeometry.index.count : 0;
      nextGeometry.setDrawRange(0, Math.floor((tubeFullCount * drawProgress) / 3) * 3);
      if (tubeGeometry) tubeGeometry.dispose();
      tubeGeometry = nextGeometry;
      thread.geometry = nextGeometry;
    };

    // ---- Tweenable state -------------------------------------------------
    const initial = stateRef.current;
    const animateEntrance = !reducedMotionRef.current && initial === "estimate";
    const seed = computeLivingEstimateLayout(initial);

    const rowNodes: PlateNode[] = seed.rows.map(toNode);
    const headerNodes: PlateNode[] = [...seed.headers.map(toNode), toNode(seed.totalBand)];
    if (animateEntrance) {
      // Seed rows/headers into a flat offset grid; the entrance tweens them
      // up into the ledger with a stagger (deterministic jitter only).
      rowNodes.forEach((node, i) => {
        node.x = ((i % 3) - 1) * 1.35 + (((i * 37) % 11) - 5) * 0.02;
        node.y = -0.42;
        node.z = (Math.floor(i / 3) - 1.5) * 0.8 + (((i * 53) % 7) - 3) * 0.03;
        node.ry = (((i * 29) % 9) - 4) * 0.03;
      });
      headerNodes.forEach((node) => {
        node.y = -0.42;
      });
    }

    const proposalNode = { x: seed.proposal.x, y: seed.proposal.y, z: seed.proposal.z, s: seed.proposal.s, ry: seed.proposal.ry };
    const pinNode = { x: seed.pin.x, y: seed.pin.y, z: seed.pin.z, s: seed.pin.s };
    const highlightNode = { s: seed.highlight.s };
    const pulseNode = { s: 1 };
    const threadProgress = { t: 1 };
    const markerNodes = SOURCED_ROW_INDICES.map(() => ({ s: animateEntrance ? 0 : 1 }));

    const tweenables: object[] = [
      ...rowNodes,
      ...headerNodes,
      proposalNode,
      pinNode,
      highlightNode,
      pulseNode,
      threadProgress,
      ghostMaterial,
      ...markerNodes,
    ];

    // ---- Frame sync ------------------------------------------------------
    const dummy = new THREE.Object3D();
    const attachPoint = new THREE.Vector3();
    const pinBottom = new THREE.Vector3();
    const connectorMid = new THREE.Vector3();
    const connectorDir = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);

    const writePlate = (mesh: THREE.InstancedMesh, index: number, node: PlateNode, dims: readonly [number, number, number], pulse: number) => {
      dummy.position.set(node.x, node.y, node.z);
      dummy.rotation.set(0, node.ry, 0);
      dummy.scale.set(dims[0] * node.sx * pulse, dims[1] * node.sy * pulse, dims[2] * node.sz * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    };

    const syncScene = () => {
      for (let i = 0; i < ROW_COUNT; i++) {
        writePlate(rowsMesh, i, rowNodes[i], SCENE_DIMENSIONS.row, 1);
      }
      rowsMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < HEADER_SLOTS - 1; i++) {
        writePlate(headersMesh, i, headerNodes[i], SCENE_DIMENSIONS.header, 1);
      }
      writePlate(headersMesh, HEADER_SLOTS - 1, headerNodes[HEADER_SLOTS - 1], SCENE_DIMENSIONS.totalBand, pulseNode.s);
      headersMesh.instanceMatrix.needsUpdate = true;

      SOURCED_ROW_INDICES.forEach((rowIndex, i) => {
        const row = rowNodes[rowIndex];
        const markerScale = SCENE_DIMENSIONS.marker * markerNodes[i].s;
        dummy.position.set(row.x + (SCENE_DIMENSIONS.row[0] * row.sx) / 2 + 0.15, row.y + 0.06, row.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(markerScale, markerScale, markerScale);
        dummy.updateMatrix();
        markersMesh.setMatrixAt(i, dummy.matrix);
      });
      markersMesh.instanceMatrix.needsUpdate = true;

      proposalGroup.position.set(proposalNode.x, proposalNode.y, proposalNode.z);
      proposalGroup.rotation.set(0, proposalNode.ry, 0);
      proposalGroup.scale.setScalar(Math.max(proposalNode.s, 0.0001));
      proposalGroup.visible = proposalNode.s > 0.001;

      pin.position.set(pinNode.x, pinNode.y, pinNode.z);
      pin.scale.setScalar(Math.max(pinNode.s, 0.0001));
      pin.visible = pinNode.s > 0.001;

      const joinery = rowNodes[JOINERY_ROW_INDEX];
      attachPoint.set(
        joinery.x + SCENE_DIMENSIONS.row[0] * joinery.sx * 0.36,
        joinery.y + (SCENE_DIMENSIONS.row[1] * joinery.sy) / 2 + 0.02,
        joinery.z,
      );
      pinBottom.set(pinNode.x, pinNode.y - SCENE_DIMENSIONS.pinRadius * Math.max(pinNode.s, 0.0001), pinNode.z);
      connectorMid.addVectors(attachPoint, pinBottom).multiplyScalar(0.5);
      connectorDir.subVectors(pinBottom, attachPoint);
      const connectorLength = Math.max(connectorDir.length(), 0.0001);
      connector.position.copy(connectorMid);
      connector.scale.set(1, connectorLength, 1);
      connector.quaternion.setFromUnitVectors(UP, connectorDir.normalize());
      connector.visible = pinNode.s > 0.02;

      const highlightScale = Math.max(highlightNode.s, 0.0001);
      highlight.scale.set(
        SCENE_DIMENSIONS.highlight[0] * highlightScale,
        SCENE_DIMENSIONS.highlight[1],
        SCENE_DIMENSIONS.highlight[2] * highlightScale,
      );
      highlight.visible = highlightNode.s > 0.001;

      ghost.visible = ghostMaterial.opacity > 0.004;
      thread.visible = threadProgress.t > 0.001;
      if (tubeGeometry) {
        tubeGeometry.setDrawRange(0, Math.floor((tubeFullCount * threadProgress.t) / 3) * 3);
      }
    };

    let firstFrameFired = false;
    const renderFrame = () => {
      syncScene();
      renderer.render(scene, camera);
      if (!firstFrameFired) {
        firstFrameFired = true;
        onFirstFrameRef.current?.();
      }
    };

    // ---- State application ------------------------------------------------
    const applyState = (next: LivingEstimateState, entrance: boolean) => {
      const layout = computeLivingEstimateLayout(next);
      const instant = reducedMotionRef.current;
      const ease = "power3.out";
      gsap.killTweensOf(tweenables);

      const assignPlate = (node: PlateNode, target: PlateTransform, delay: number) => {
        if (instant) {
          Object.assign(node, target);
        } else {
          gsap.to(node, { ...target, duration: 0.75, ease, delay });
        }
      };
      layout.rows.forEach((target, i) => assignPlate(rowNodes[i], target, entrance ? 0.05 + i * 0.045 : 0));
      layout.headers.forEach((target, i) => assignPlate(headerNodes[i], target, entrance ? 0.04 + i * 0.05 : 0));
      assignPlate(headerNodes[HEADER_SLOTS - 1], layout.totalBand, entrance ? 0.3 : 0);

      if (instant) {
        Object.assign(proposalNode, layout.proposal);
        Object.assign(pinNode, layout.pin);
        highlightNode.s = layout.highlight.s;
        ghostMaterial.opacity = layout.ghost.opacity;
        pulseNode.s = 1;
        threadProgress.t = 1;
        markerNodes.forEach((marker) => {
          marker.s = 1;
        });
      } else {
        gsap.to(proposalNode, { ...layout.proposal, duration: 0.85, ease: "expo.out", delay: entrance ? 0 : 0.08 });
        gsap.to(pinNode, {
          ...layout.pin,
          duration: 0.6,
          ease: layout.pin.s > 0 ? "back.out(2)" : "power3.out",
        });
        gsap.to(highlightNode, { s: layout.highlight.s, duration: 0.5, ease });
        gsap.to(ghostMaterial, { opacity: layout.ghost.opacity, duration: 0.65, ease });
        markerNodes.forEach((marker, i) => {
          gsap.to(marker, { s: 1, duration: 0.45, ease: "back.out(2.4)", delay: entrance ? 0.7 + i * 0.09 : 0 });
        });
        pulseNode.s = 1;
        if (next === "revision" && !entrance) {
          // One small scale pulse on the total band — once, not looping.
          gsap.to(pulseNode, { s: 1.05, duration: 0.16, ease: "power2.inOut", yoyo: true, repeat: 1, delay: 0.5 });
        }
      }

      buildThread(next, instant || !entrance ? 1 : 0);
      if (!instant && entrance) {
        threadProgress.t = 0;
        gsap.to(threadProgress, { t: 1, duration: 0.9, delay: 0.55, ease: "power2.inOut" });
      } else {
        threadProgress.t = 1;
      }

      if (instant) renderFrame();
    };
    applyStateRef.current = applyState;

    const ghostSeed = computeLivingEstimateLayout(initial).ghost;
    ghost.position.set(ghostSeed.x, ghostSeed.y, ghostSeed.z);
    ghost.scale.set(
      SCENE_DIMENSIONS.row[0] * ghostSeed.sx,
      SCENE_DIMENSIONS.row[1] * ghostSeed.sy,
      SCENE_DIMENSIONS.row[2] * ghostSeed.sz,
    );

    applyState(initial, animateEntrance);
    lastAppliedRef.current = initial;

    // ---- Sizing (ResizeObserver refits the orthographic frustum) ---------
    const setSize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      const dprCap = width < 768 ? 1.5 : 1.75;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.setSize(width, height, false);
      const aspect = width / height;
      // Framing floor: the composition's widest screen-space half-extent
      // (group headers + markers, ~5.1 world units) must stay inside
      // view * aspect, or the right-most joinery column clips on wide stages.
      const view = Math.max(2.9, 5.2 / aspect);
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
      // Bias the object toward the right of wide stages so the hero copy
      // column on the left stays clear.
      rootGroup.position.x = aspect > 1.55 ? 0.4 : 0;
      if (reducedMotionRef.current) renderFrame();
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(host);
    setSize();

    // ---- Visibility-gated loop -------------------------------------------
    let rafId = 0;
    let running = true;
    let inView = true;

    const pointer = { x: 0, y: 0 };
    const parallax = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      pointer.x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      pointer.y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
    };
    if (!reducedMotionRef.current) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const tick = () => {
      rafId = 0;
      if (running && inView && !document.hidden) {
        const targetX = reducedMotionRef.current ? 0 : pointer.x;
        const targetY = reducedMotionRef.current ? 0 : pointer.y;
        parallax.x += (targetX - parallax.x) * 0.06;
        parallax.y += (targetY - parallax.y) * 0.06;
        rootGroup.rotation.y = parallax.x * PARALLAX_YAW;
        rootGroup.rotation.x = parallax.y * PARALLAX_PITCH;
        renderFrame();
      }
      rafId = requestAnimationFrame(tick);
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(host);

    if (!reducedMotionRef.current) {
      rafId = requestAnimationFrame(tick);
    }

    // ---- Cleanup (strict) --------------------------------------------------
    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      gsap.killTweensOf(tweenables);
      applyStateRef.current = null;
      if (tubeGeometry) tubeGeometry.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Scene is built once; live values (state, reducedMotion, callbacks)
    // flow through refs, so this mount effect intentionally has no deps.
  }, []);

  return (
    <div className={styles.sceneRoot}>
      <div ref={canvasHostRef} className={styles.canvasHost} aria-hidden="true" />
      <div className={styles.overlay} data-reduced={reducedMotion || undefined}>
        <p className={styles.overlayKicker}>{LIVING_ESTIMATE_PROJECT} · Illustrative</p>
        <div className={styles.overlayStack}>
          {LIVING_ESTIMATE_STATES.map((overlayState) => (
            <div
              key={overlayState}
              className={styles.overlayState}
              data-active={overlayState === state || undefined}
              aria-hidden={overlayState === state ? undefined : true}
            >
              <p className={styles.overlayCaption}>{LIVING_ESTIMATE_OVERLAYS[overlayState].caption}</p>
              <p className={styles.overlayDetail}>{LIVING_ESTIMATE_OVERLAYS[overlayState].detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
