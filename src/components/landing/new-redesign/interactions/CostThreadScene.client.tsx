"use client";

import { useEffect, useRef } from "react";
import styles from "./cost-thread-scene.module.css";

export function CostThreadScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const section = host?.closest<HTMLElement>("[data-cost-thread-section]");
    if (!host || !section) return;

    const widthQuery = window.matchMedia("(min-width: 1024px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let nearViewport = false;
    let disposed = false;
    let loading = false;
    let teardownScene = () => {};

    const eligible = () => widthQuery.matches && !motionQuery.matches;

    const mountScene = async () => {
      if (disposed || loading || host.childElementCount > 0 || !nearViewport || !eligible()) return;
      loading = true;
      const THREE = await import("three");
      loading = false;
      if (disposed || !nearViewport || !eligible()) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          depth: true,
          failIfMajorPerformanceCaveat: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: false,
          stencil: false,
        });
      } catch {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 30);
      camera.position.set(0, 5.8, 9.2);
      camera.lookAt(0, 0, 0);
      const group = new THREE.Group();
      group.rotation.x = -.08;
      scene.add(group);

      const stationGeometry = new THREE.BoxGeometry(1.72, .16, .86);
      const stationMaterials = Array.from({ length: 4 }, (_, index) => new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x8c919b : 0xc5c8ce,
        opacity: index === 0 ? .72 : .34,
        transparent: true,
      }));
      const stations = stationMaterials.map((material, index) => {
        const station = new THREE.Mesh(stationGeometry, material);
        station.position.set(-3.6 + index * 2.4, 0, index % 2 === 0 ? .12 : -.12);
        group.add(station);
        return station;
      });

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.42, .04, .16),
        new THREE.Vector3(-2.4, .42, .08),
        new THREE.Vector3(0, -.24, -.02),
        new THREE.Vector3(2.4, .34, .08),
        new THREE.Vector3(4.42, .02, -.08),
      ]);
      const threadPoints = curve.getPoints(96);
      const threadGeometry = new THREE.BufferGeometry().setFromPoints(threadPoints);
      const threadMaterial = new THREE.LineBasicMaterial({ color: 0xf24405, transparent: true, opacity: .92 });
      const thread = new THREE.Line(threadGeometry, threadMaterial);
      thread.position.y = .2;
      group.add(thread);

      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = styles.canvas;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      let frameId = 0;
      let inView = true;
      let progress = 0;

      const readProgress = () => {
        const rect = section.getBoundingClientRect();
        const travel = Math.max(rect.height - window.innerHeight, 1);
        return Math.min(1, Math.max(0, -rect.top / travel));
      };

      const render = () => {
        frameId = 0;
        if (!inView || document.hidden) return;
        progress = readProgress();
        const active = Math.min(3, Math.floor(progress * 4));
        stations.forEach((station, index) => {
          const distance = Math.abs(index - active);
          station.position.y = (index === active ? .18 : -.04) + Math.sin((progress + index * .18) * Math.PI) * .035;
          station.rotation.y = (progress - .5) * .045 + (index - 1.5) * .01;
          stationMaterials[index].opacity = distance === 0 ? .78 : distance === 1 ? .42 : .25;
        });
        group.rotation.y = (progress - .5) * .055;
        threadGeometry.setDrawRange(0, Math.max(2, Math.floor(threadPoints.length * (.18 + progress * .82))));
        renderer.render(scene, camera);
        host.setAttribute("data-ready", "");
      };

      const requestRender = () => {
        if (!frameId) frameId = window.requestAnimationFrame(render);
      };

      const resize = () => {
        const hostWidth = Math.max(host.clientWidth, 1);
        const hostHeight = Math.max(host.clientHeight, 1);
        const pixelBudget = 1920 * 1080;
        const budgetDpr = Math.sqrt(pixelBudget / (hostWidth * hostHeight));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25, budgetDpr));
        renderer.setSize(hostWidth, hostHeight, false);
        const aspect = hostWidth / hostHeight;
        const view = Math.max(3, 5 / aspect);
        camera.left = -view * aspect;
        camera.right = view * aspect;
        camera.top = view;
        camera.bottom = -view;
        camera.updateProjectionMatrix();
        requestRender();
      };

      const resizeObserver = new ResizeObserver(resize);
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (inView) requestRender();
      });
      const onVisibility = () => {
        if (!document.hidden) requestRender();
      };
      const onContextLost = (event: Event) => {
        event.preventDefault();
        host.removeAttribute("data-ready");
      };
      const onContextRestored = () => requestRender();

      resizeObserver.observe(host);
      visibilityObserver.observe(section);
      window.addEventListener("scroll", requestRender, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);
      resize();

      teardownScene = () => {
        if (frameId) window.cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        window.removeEventListener("scroll", requestRender);
        document.removeEventListener("visibilitychange", onVisibility);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
        stationGeometry.dispose();
        stationMaterials.forEach((material) => material.dispose());
        threadGeometry.dispose();
        threadMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        host.removeAttribute("data-ready");
      };
    };

    const capabilityChanged = () => {
      if (!eligible()) teardownScene();
      else void mountScene();
    };
    const proximityObserver = new IntersectionObserver(([entry]) => {
      nearViewport = entry?.isIntersecting ?? false;
      if (nearViewport) void mountScene();
    }, { rootMargin: "50% 0px" });
    proximityObserver.observe(section);
    widthQuery.addEventListener("change", capabilityChanged);
    motionQuery.addEventListener("change", capabilityChanged);

    return () => {
      disposed = true;
      proximityObserver.disconnect();
      widthQuery.removeEventListener("change", capabilityChanged);
      motionQuery.removeEventListener("change", capabilityChanged);
      teardownScene();
    };
  }, []);

  return <div ref={hostRef} className={styles.host} aria-hidden="true" />;
}
