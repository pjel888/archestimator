"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import styles from "./new-landing.module.css";

gsap.registerPlugin(ScrollTrigger);

type JourneyContent = {
  label: string;
  disclosure: string;
  chapters: readonly {
    number: string;
    phase: string;
    title: string;
    body: string;
  }[];
};

type BlockState = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
};

const INK = new THREE.Color("#242529");
const MID = new THREE.Color("#74767c");
const ORANGE = new THREE.Color("#f24a16");

function makeStates(count: number) {
  const structure: BlockState[] = [];
  const present: BlockState[] = [];
  const respond: BlockState[] = [];
  const remember: BlockState[] = [];

  for (let index = 0; index < count; index += 1) {
    const centered = index - (count - 1) / 2;
    structure.push({
      x: centered * 0.64,
      y: Math.sin(index * 0.9) * 0.22,
      z: Math.cos(index * 0.7) * 0.42,
      rx: -0.08 + (index % 3) * 0.04,
      ry: centered * 0.035,
      rz: centered * -0.018,
    });
    present.push({
      x: centered * 0.56,
      y: centered * 0.095,
      z: -Math.abs(centered) * 0.08,
      rx: -0.16,
      ry: -0.1 + index * 0.018,
      rz: 0,
    });
    respond.push({
      x: centered * 0.52,
      y: Math.sin(index * 0.62) * 0.34,
      z: index === 5 ? 0.92 : -0.12,
      rx: -0.08,
      ry: index === 5 ? -0.22 : 0.03 * centered,
      rz: index === 5 ? 0.08 : 0,
    });
    remember.push({
      x: centered * 0.48,
      y: index % 2 === 0 ? -0.34 : 0.34,
      z: Math.floor(index / 2) * -0.24,
      rx: -0.12,
      ry: centered * 0.022,
      rz: index % 2 === 0 ? -0.025 : 0.025,
    });
  }

  return { structure, present, respond, remember };
}

export function CostThreadJourney({ content }: { content: JourneyContent }) {
  const rootRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const host = hostRef.current;
    if (!root || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      root.dataset.sceneUnavailable = "";
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0.2, 0.55, 10.4);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x65676d, 2.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.8);
    keyLight.position.set(-4, 7, 8);
    scene.add(keyLight);
    const warmLight = new THREE.PointLight(0xff6a2b, 34, 18, 2);
    warmLight.position.set(4, -1, 5);
    scene.add(warmLight);

    const sculpture = new THREE.Group();
    sculpture.rotation.set(-0.18, -0.24, -0.03);
    scene.add(sculpture);

    const blockCount = 11;
    const states = makeStates(blockCount);
    const blocks: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];

    for (let index = 0; index < blockCount; index += 1) {
      const width = 0.42 + (index % 4) * 0.09;
      const geometry = new THREE.BoxGeometry(width, 2.65 + (index % 3) * 0.22, 0.12);
      const material = new THREE.MeshStandardMaterial({
        color: index % 3 === 0 ? INK : MID,
        roughness: 0.56,
        metalness: 0.16,
      });
      const block = new THREE.Mesh(geometry, material);
      const initial = states.structure[index];
      block.position.set(initial.x, initial.y, initial.z);
      block.rotation.set(initial.rx, initial.ry, initial.rz);
      sculpture.add(block);
      blocks.push(block);
    }

    const threadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.7, -1.1, 0.72),
      new THREE.Vector3(-1.9, 0.7, 0.65),
      new THREE.Vector3(-0.25, -0.45, 0.92),
      new THREE.Vector3(1.75, 0.78, 0.75),
      new THREE.Vector3(3.65, -0.2, 0.7),
    ]);
    const thread = new THREE.Mesh(
      new THREE.TubeGeometry(threadCurve, 96, 0.037, 10, false),
      new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.9, roughness: 0.28 }),
    );
    sculpture.add(thread);

    const focusRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.035, 12, 64),
      new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0 }),
    );
    focusRing.position.set(states.respond[5].x, states.respond[5].y, states.respond[5].z + 0.16);
    focusRing.rotation.x = 0.12;
    sculpture.add(focusRing);

    const historyFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(6.1, 3.6, 0.06)),
      new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0 }),
    );
    historyFrame.position.set(0, 0, -0.9);
    historyFrame.rotation.set(-0.11, 0.08, 0.025);
    sculpture.add(historyFrame);

    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-journey-chapter]"));
    let activeIndex = -1;
    const activate = (nextIndex: number) => {
      const index = Math.max(0, Math.min(nextIndex, chapters.length - 1));
      if (index === activeIndex) return;
      activeIndex = index;
      chapters.forEach((chapter, chapterIndex) => {
        chapter.toggleAttribute("data-active", chapterIndex === index);
      });
      if (phaseRef.current) phaseRef.current.textContent = content.chapters[index]?.phase ?? "";
    };
    activate(0);

    const applyState = (timeline: gsap.core.Timeline, state: BlockState[], position: number) => {
      blocks.forEach((block, index) => {
        const target = state[index];
        timeline.to(block.position, { x: target.x, y: target.y, z: target.z, duration: 1 }, position);
        timeline.to(block.rotation, { x: target.rx, y: target.ry, z: target.rz, duration: 1 }, position);
      });
    };

    const story = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
    applyState(story, states.present, 0);
    story.to(sculpture.rotation, { x: -0.1, y: 0.12, z: 0.02, duration: 1 }, 0);
    applyState(story, states.respond, 1);
    story.to(focusRing.material, { opacity: 1, duration: 0.45 }, 1.35);
    story.to(blocks[5].material.color, { r: ORANGE.r, g: ORANGE.g, b: ORANGE.b, duration: 0.55 }, 1.25);
    applyState(story, states.remember, 2);
    story.to(focusRing.material, { opacity: 0, duration: 0.35 }, 2);
    story.to(historyFrame.material, { opacity: 0.8, duration: 0.7 }, 2.2);
    story.to(sculpture.rotation, { x: -0.2, y: -0.38, z: -0.02, duration: 1 }, 2);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = gsap.matchMedia();
    if (!reducedMotion) {
      media.add("(min-width: 900px)", () => {
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.55,
          animation: story,
          invalidateOnRefresh: true,
          onUpdate: (self) => activate(Math.floor(self.progress * content.chapters.length)),
        });
        return () => trigger.kill();
      });
    }

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 720 ? 1.25 : 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    let frameId = 0;
    let visible = true;
    let destroyed = false;
    const render = () => {
      if (destroyed || !visible || document.hidden) return;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    const start = () => {
      if (destroyed || frameId || !visible || document.hidden) return;
      render();
    };
    const stop = () => {
      if (!frameId) return;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    };
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible) start();
        else stop();
      },
      { rootMargin: "180px 0px" },
    );
    visibilityObserver.observe(root);
    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    renderer.render(scene, camera);
    root.dataset.sceneReady = "";
    if (!reducedMotion) start();

    return () => {
      destroyed = true;
      stop();
      media.revert();
      story.kill();
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      blocks.forEach((block) => {
        block.geometry.dispose();
        block.material.dispose();
      });
      thread.geometry.dispose();
      thread.material.dispose();
      focusRing.geometry.dispose();
      focusRing.material.dispose();
      historyFrame.geometry.dispose();
      historyFrame.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [content]);

  return (
    <section ref={rootRef} className={styles.journey} id="workflow" aria-labelledby="journey-title">
      <div className={styles.journeyVisual}>
        <div ref={hostRef} className={styles.sceneHost} aria-hidden="true" />
        <p className={styles.sceneFallback}>One cost story, carried forward.</p>
        <div className={styles.sceneMeta}>
          <span>{content.disclosure}</span>
          <span ref={phaseRef}>{content.chapters[0]?.phase}</span>
        </div>
      </div>
      <div className={styles.journeyCopy}>
        <header className={styles.journeyHeader}>
          <p className={styles.kicker}>{content.label}</p>
          <h2 id="journey-title">From working number to commercial memory.</h2>
        </header>
        {content.chapters.map((chapter, index) => (
          <article
            key={chapter.number}
            className={styles.journeyChapter}
            data-journey-chapter
            data-active={index === 0 ? "" : undefined}
          >
            <span>{chapter.number}</span>
            <p>{chapter.phase}</p>
            <h3>{chapter.title}</h3>
            <div>{chapter.body}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
